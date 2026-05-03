import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { sprintCache } from '@/lib/cache/memory-cache';
import { JiraSprint, SprintIssue, SprintDashboardData } from '@/types';
import { JiraIssueRaw } from '@/lib/jira/types';

const SPRINT_CACHE_KEY = 'sprint-dashboard';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    return NextResponse.json(
      { error: 'Missing Jira credentials. Please configure environment variables.' },
      { status: 500 }
    );
  }

  const cached = sprintCache.get(SPRINT_CACHE_KEY);
  if (cached) {
    return NextResponse.json({ ...cached, cacheHit: true }, { status: 200 });
  }

  try {
    const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
    const client = new JiraClient(jiraBaseUrl, jiraEmail, jiraApiToken);

    // Get issues
    const rawIssues = await client.searchIssues(
      'sprint in openSprints() ORDER BY sprint ASC, created ASC',
      ['summary', 'status', 'fixVersions', 'issuetype', 'customfield_10020', 'reporter']
    );

    const sprintMap = new Map<number, Omit<JiraSprint, 'boardName'>>();
    const issuesBySprint: Record<number, SprintIssue[]> = {};

    for (const raw of rawIssues) {
      const f = raw.fields;
      const sprintArr = (f?.customfield_10020 as any[]) || [];
      
      let parsedSprints: any[] = [];
      if (sprintArr.length > 0 && typeof sprintArr[0] === 'string') {
        parsedSprints = sprintArr.map((str: string) => {
          const match = str.match(/id=(\d+),rapidViewId=(\d+).*name=([^,]+).*startDate=([^,]*),endDate=([^,]*).*state=([^,]+)/);
          if (match) {
            return {
              id: parseInt(match[1]),
              originBoardId: parseInt(match[2]),
              name: match[3],
              startDate: match[4] === '<null>' ? null : match[4],
              endDate: match[5] === '<null>' ? null : match[5],
              state: match[6].toLowerCase()
            };
          }
          return null;
        }).filter(Boolean);
      } else {
        parsedSprints = sprintArr.map((s: any) => ({
          id: s.id,
          originBoardId: s.boardId,
          name: s.name,
          startDate: s.startDate,
          endDate: s.endDate,
          state: s.state,
          goal: s.goal
        }));
      }

      const activeSprint = parsedSprints.find((s) => s.state === 'active');
      if (!activeSprint) continue;

      const sprintId = activeSprint.id;
      if (!sprintMap.has(sprintId)) {
        sprintMap.set(sprintId, {
          id: sprintId,
          name: activeSprint.name,
          startDate: activeSprint.startDate ?? null,
          endDate: activeSprint.endDate ?? null,
          boardId: activeSprint.originBoardId ?? 0,
          goal: activeSprint.goal ?? '',
          state: 'active',
        });
      }

      const catKey: string = f?.status?.statusCategory?.key ?? 'todo';
      const statusCategory: SprintIssue['statusCategory'] =
        catKey === 'done' ? 'done' : (catKey === 'indeterminate' || catKey === 'in-progress') ? 'in-progress' : 'todo';

      const fvList = f['fixVersions'] as any[];
      const rawReporter = f['reporter'] as any;

      const issue: SprintIssue = {
        key: raw.key,
        summary: (f.summary as string) ?? '',
        status: f?.status?.name ?? '',
        statusCategory,
        issueType: (f['issuetype'] as any)?.name ?? '',
        fixVersions: (fvList ?? []).map((v) => ({
          id: v.id,
          name: v.name,
          released: v.released,
          releaseDate: v.releaseDate ?? null,
        })),
        reporter:
          rawReporter?.accountId && rawReporter?.displayName
            ? { accountId: rawReporter.accountId, displayName: rawReporter.displayName }
            : null,
        sprintId,
        url: `${jiraBaseUrl.replace(/\/$/, '')}/browse/${raw.key}`,
      };

      if (!issuesBySprint[sprintId]) issuesBySprint[sprintId] = [];
      issuesBySprint[sprintId].push(issue);
    }

    // Resolve missing board IDs
    const sprintsWithoutBoard = Array.from(sprintMap.entries()).filter(([, s]) => s.boardId === 0).map(([id]) => id);
    if (sprintsWithoutBoard.length > 0) {
      await Promise.all(
        sprintsWithoutBoard.map(async (sprintId) => {
          try {
            const res = await fetch(`${jiraBaseUrl}/rest/agile/1.0/sprint/${sprintId}`, {
              headers: { Authorization: `Basic ${auth}` },
            });
            if (res.ok) {
              const data = await res.json();
              const boardId = data.originBoardId;
              const entry = sprintMap.get(Number(sprintId));
              if (entry && boardId > 0) entry.boardId = boardId;
            }
          } catch {}
        })
      );
    }

    // Resolve board names
    const uniqueBoardIds = [...new Set(Array.from(sprintMap.values()).map((s) => s.boardId).filter((id) => id > 0))];
    const boardNames: Record<number, string> = {};
    
    await Promise.all(
      uniqueBoardIds.map(async (boardId) => {
        try {
          const res = await fetch(`${jiraBaseUrl}/rest/agile/1.0/board/${boardId}`, {
            headers: { Authorization: `Basic ${auth}` },
          });
          if (res.ok) {
            const board = await res.json();
            const projectName = board.location?.projectName ?? board.location?.displayName ?? '';
            boardNames[boardId] = projectName && projectName !== board.name ? `${board.name} — ${projectName}` : board.name;
          } else {
            boardNames[boardId] = `Board ${boardId}`;
          }
        } catch {
          boardNames[boardId] = `Board ${boardId}`;
        }
      })
    );

    const sprints: JiraSprint[] = Array.from(sprintMap.values())
      .map((s) => ({
        ...s,
        boardName: boardNames[s.boardId] ?? (s.boardId > 0 ? `Board ${s.boardId}` : '—'),
      }))
      .sort((a, b) => a.boardName.localeCompare(b.boardName) || a.name.localeCompare(b.name));

    const response: SprintDashboardData = {
      sprints,
      issuesBySprint,
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
    };

    sprintCache.set(SPRINT_CACHE_KEY, response);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching Sprint dashboard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
