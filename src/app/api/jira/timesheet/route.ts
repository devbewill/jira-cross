import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { getJiraConfig, hasJiraCredentials } from '@/lib/jira/config';
import { timesheetCache } from '@/lib/cache/memory-cache';
import { TimesheetData, TimesheetEntry, UserTimesheet } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startDate = request.nextUrl.searchParams.get('startDate');
  const endDate   = request.nextUrl.searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Missing startDate or endDate' }, { status: 400 });
  }

  const cacheKey = `timesheet:${startDate}:${endDate}`;
  const cached   = timesheetCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cacheHit: true }, { status: 200 });
  }

  const cfg = getJiraConfig();
  if (!hasJiraCredentials(cfg)) {
    return NextResponse.json(
      { error: 'Missing Jira credentials. Please configure environment variables.' },
      { status: 500 },
    );
  }

  try {
    const client  = new JiraClient(cfg.baseUrl, cfg.email, cfg.apiToken);
    const startMs = new Date(startDate).getTime();
    const endMs   = new Date(endDate).getTime() + 86400000 - 1;

    const jql      = `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}" ORDER BY updated DESC`;
    const rawIssues = await client.searchIssues(jql, ['summary', 'project', 'worklog']);

    const userMap = new Map<string, UserTimesheet>();

    await Promise.all(
      rawIssues.map(async (issue) => {
        const f           = issue.fields;
        const projectKey  = (f?.project as any)?.key ?? '';
        const projectName = (f?.project as any)?.name ?? projectKey;
        const summary     = (f?.summary as string) ?? '';

        const wlPage   = f?.worklog as any;
        let worklogs: any[] = wlPage?.worklogs ?? [];

        if (wlPage?.total > worklogs.length) {
          worklogs = await client.getIssueWorklogs(issue.key, startMs, endMs);
        }

        for (const wl of worklogs) {
          const t = new Date(wl.started).getTime();
          if (t < startMs || t > endMs) continue;

          const { accountId, displayName, avatarUrls } = wl.author;
          const avatarUrl = avatarUrls['48x48'] ?? avatarUrls['32x32'] ?? avatarUrls['24x24'] ?? '';

          let user = userMap.get(accountId);
          if (!user) {
            user = { accountId, displayName, avatarUrl, totalSeconds: 0, byProject: {} };
            userMap.set(accountId, user);
          }

          user.totalSeconds += wl.timeSpentSeconds;

          if (!user.byProject[projectKey]) {
            user.byProject[projectKey] = { projectName, seconds: 0, entries: [] };
          }
          const proj = user.byProject[projectKey];
          proj.seconds += wl.timeSpentSeconds;

          const existing = proj.entries.find((e) => e.issueKey === issue.key);
          if (existing) {
            existing.timeSpentSeconds += wl.timeSpentSeconds;
          } else {
            proj.entries.push({
              issueKey:         issue.key,
              issueSummary:     summary,
              projectKey,
              timeSpentSeconds: wl.timeSpentSeconds,
              started:          wl.started,
            } satisfies TimesheetEntry);
          }
        }
      }),
    );

    const users = Array.from(userMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);

    const result: TimesheetData = {
      users,
      totalSeconds: users.reduce((s, u) => s + u.totalSeconds, 0),
      fetchedAt:    new Date().toISOString(),
    };

    timesheetCache.set(cacheKey, result);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching Timesheet data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
