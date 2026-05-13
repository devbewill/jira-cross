import { NextResponse } from 'next/server';
import { JiraClient, JiraVersion } from '@/lib/jira/client';
import { getJiraConfig, hasJiraCredentials } from '@/lib/jira/config';
import { releasesCache } from '@/lib/cache/memory-cache';
import { JiraRelease, ProjectReleases } from '@/types';

export async function GET(): Promise<NextResponse> {
  const cfg = getJiraConfig();
  if (!hasJiraCredentials(cfg)) {
    return NextResponse.json({ error: 'Missing Jira credentials' }, { status: 500 });
  }

  const cacheKey = 'releases:all-projects';
  const cached   = releasesCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cacheHit: true }, { status: 200 });
  }

  try {
    const client   = new JiraClient(cfg.baseUrl, cfg.email, cfg.apiToken);
    const projects = await client.getAllProjects();

    const today  = new Date();
    today.setHours(0, 0, 0, 0);
    const CUTOFF = new Date('2025-01-01');

    const projectReleases: ProjectReleases[] = (
      await Promise.all(
        projects.map(async (project): Promise<ProjectReleases | null> => {
          try {
            const versions = await client.getProjectVersions(project.key);
            const releases: JiraRelease[] = mapVersionsToReleases(versions, project.key, project.name, CUTOFF, today);
            if (releases.length === 0) return null;
            return { projectKey: project.key, projectName: project.name, releases };
          } catch {
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

function mapVersionsToReleases(
  versions: JiraVersion[],
  projectKey: string,
  projectName: string,
  cutoff: Date,
  today: Date,
): JiraRelease[] {
  return versions
    .filter((v) => !v.archived)
    .filter((v) => {
      const relDate   = v.releaseDate ?? v.userReleaseDate;
      const startDate = v.startDate   ?? v.userStartDate;
      if (!relDate && !startDate) return true;
      const relD   = relDate   ? new Date(relDate)   : null;
      const startD = startDate ? new Date(startDate) : null;
      return (relD && relD >= cutoff) || (startD && startD >= cutoff);
    })
    .map((v) => {
      const relDate   = v.releaseDate ?? v.userReleaseDate ?? null;
      const isOverdue = !v.released && !!relDate && new Date(relDate) < today;
      return {
        id:          v.id,
        name:        v.name,
        description: v.description ?? '',
        startDate:   v.startDate ?? v.userStartDate ?? null,
        releaseDate: relDate,
        released:    v.released,
        archived:    v.archived,
        overdue:     v.overdue ?? isOverdue,
        projectKey,
        projectName,
      };
    });
}
