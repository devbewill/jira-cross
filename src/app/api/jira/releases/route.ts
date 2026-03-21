import { NextResponse } from 'next/server';
import { JiraRelease, ProjectReleases } from '@/types';
import { releasesCache } from '@/lib/cache/memory-cache';

interface JiraProject {
  id: string;
  key: string;
  name: string;
}

interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  userStartDate?: string;
  userReleaseDate?: string;
  released: boolean;
  archived: boolean;
  overdue?: boolean;
  projectId: number;
}

async function jiraFetch<T>(url: string, auth: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Jira API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function GET(): Promise<NextResponse> {
  const base      = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
  const email     = process.env.JIRA_EMAIL;
  const apiToken  = process.env.JIRA_API_TOKEN;

  if (!base || !email || !apiToken) {
    return NextResponse.json({ error: 'Missing Jira credentials' }, { status: 500 });
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

  // Check cache first
  const cacheKey = 'releases:all-projects';
  const cached = releasesCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cacheHit: true }, { status: 200 });
  }

  try {
    // 1. Fetch ALL projects with pagination (50 per page until isLast)
    const projects: JiraProject[] = [];
    let startAt = 0;
    let isLast  = false;

    let totalDeclared = 0;
    while (!isLast) {
      const url = `${base}/rest/api/3/project/search?maxResults=100&startAt=${startAt}&orderBy=key`;
      const res = await jiraFetch<{ values: JiraProject[]; isLast: boolean; total: number }>(url, auth);
      if (startAt === 0) totalDeclared = res.total ?? 0;
      projects.push(...(res.values ?? []));
      isLast  = res.isLast ?? true;
      startAt += res.values?.length ?? 0;
    }

    console.log(`[releases] Jira declares ${totalDeclared} total projects, fetched ${projects.length}`);
    console.log(`[releases] project keys:`, projects.map(p => p.key).join(', '));

    // Debug: try to fetch PILLARS directly regardless of project search
    try {
      const pillars = await jiraFetch<JiraProject>(`${base}/rest/api/3/project/PILLARS`, auth);
      const inList  = projects.some(p => p.key === 'PILLARS');
      console.log(`[releases] PILLARS direct fetch OK: id=${pillars.id}, in project list: ${inList}`);
    } catch (e) {
      console.log(`[releases] PILLARS direct fetch failed:`, e instanceof Error ? e.message : e);
    }

    // 2. Fetch versions for every project in parallel
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const projectReleases: ProjectReleases[] = (
      await Promise.all(
        projects.map(async (project): Promise<ProjectReleases | null> => {
          try {
            const versionsUrl = `${base}/rest/api/3/project/${project.key}/versions`;
            const versions    = await jiraFetch<JiraVersion[]>(versionsUrl, auth);

            const releases: JiraRelease[] = versions
              .filter((v) => !v.archived) // hide archived by default
              .map((v) => {
                const relDate = v.releaseDate ?? v.userReleaseDate ?? null;
                const isOverdue =
                  !v.released &&
                  !!relDate &&
                  new Date(relDate) < today;

                return {
                  id:          v.id,
                  name:        v.name,
                  description: v.description ?? '',
                  startDate:   v.startDate ?? v.userStartDate ?? null,
                  releaseDate: relDate,
                  released:    v.released,
                  archived:    v.archived,
                  overdue:     v.overdue ?? isOverdue,
                  projectKey:  project.key,
                  projectName: project.name,
                };
              });

            // Skip projects with no active versions
            console.log(`[releases] ${project.key}: ${versions.length} total versions, ${releases.length} active (non-archived)`);
            if (releases.length === 0) return null;

            return {
              projectKey:  project.key,
              projectName: project.name,
              releases,
            };
          } catch (err) {
            // Non-fatal: some projects may deny version access
            console.log(`[releases] ${project.key}: skipped — ${err instanceof Error ? err.message : err}`);
            return null;
          }
        }),
      )
    ).filter((p): p is ProjectReleases => p !== null);

    const result = { projects: projectReleases, fetchedAt: new Date().toISOString(), cacheHit: false };
    releasesCache.set(cacheKey, result);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching releases:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
