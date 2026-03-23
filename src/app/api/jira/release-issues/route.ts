import { NextRequest, NextResponse } from 'next/server';
import { IssueStats } from '@/types';
import { releaseIssuesCache } from '@/lib/cache/memory-cache';

async function jiraFetch<T>(url: string, auth: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Jira API error: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * GET /api/jira/release-issues?projectKey=XXX
 *
 * Returns issue counts grouped by fixVersion id and Jira status category.
 * Response: { stats: Record<versionId, IssueStats> }
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const projectKey = req.nextUrl.searchParams.get('projectKey');
  if (!projectKey) {
    return NextResponse.json({ error: 'Missing projectKey' }, { status: 400 });
  }

  const base     = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
  const email    = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!base || !email || !apiToken) {
    return NextResponse.json({ error: 'Missing Jira credentials' }, { status: 500 });
  }

  // Serve from cache if available
  const cacheKey = `release-issues:${projectKey}`;
  const cached   = releaseIssuesCache.get(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cacheHit: true });

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

  try {
    const statsMap: Record<string, IssueStats> = {};

    // Fetch all issues in the project that belong to at least one fixVersion
    const jql = encodeURIComponent(
      `project = "${projectKey}" AND fixVersion is not EMPTY ORDER BY fixVersion ASC`
    );

    let startAt = 0;
    let total   = Infinity;

    while (startAt < total && startAt < 2000) {
      const url = `${base}/rest/api/3/search?jql=${jql}&fields=status,fixVersions&maxResults=100&startAt=${startAt}`;

      const res = await jiraFetch<{
        issues: Array<{
          fields: {
            status: { statusCategory: { key: string } };
            fixVersions: Array<{ id: string }>;
          };
        }>;
        total: number;
      }>(url, auth);

      if (total === Infinity) total = res.total;
      if (res.issues.length === 0) break;

      for (const issue of res.issues) {
        // Jira status category keys: 'new' = To Do, 'indeterminate' = In Progress, 'done' = Done
        const catKey = issue.fields.status?.statusCategory?.key ?? 'new';

        for (const fv of issue.fields.fixVersions ?? []) {
          const vid = fv.id;
          if (!statsMap[vid]) statsMap[vid] = { todo: 0, inProgress: 0, done: 0, total: 0 };

          if (catKey === 'done')          { statsMap[vid].done++;       }
          else if (catKey === 'indeterminate') { statsMap[vid].inProgress++; }
          else                            { statsMap[vid].todo++;       }

          statsMap[vid].total++;
        }
      }

      startAt += res.issues.length;
    }

    const result = { stats: statsMap, fetchedAt: new Date().toISOString(), cacheHit: false };
    releaseIssuesCache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[release-issues] ${projectKey}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
