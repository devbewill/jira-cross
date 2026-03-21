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
    // 1. Fetch all accessible projects (paginated, up to 200)
    const projectsUrl = `${base}/rest/api/3/project/search?maxResults=200&orderBy=key`;
    const projectsRes = await jiraFetch<{ values: JiraProject[] }>(projectsUrl, auth);
    const projects    = projectsRes.values ?? [];

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
            if (releases.length === 0) return null;

            return {
              projectKey:  project.key,
              projectName: project.name,
              releases,
            };
          } catch {
            // Non-fatal: some projects may deny version access
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
