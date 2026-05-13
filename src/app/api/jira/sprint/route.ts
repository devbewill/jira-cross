import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { getJiraConfig, hasJiraCredentials } from '@/lib/jira/config';
import { sprintCache } from '@/lib/cache/memory-cache';
import { JiraSprint, SprintIssue, SprintDashboardData } from '@/types';

const SPRINT_CACHE_KEY = 'sprint-dashboard';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const cfg = getJiraConfig();
  if (!hasJiraCredentials(cfg)) {
    return NextResponse.json(
      { error: 'Missing Jira credentials. Please configure environment variables.' },
      { status: 500 },
    );
  }

  const cached = sprintCache.get(SPRINT_CACHE_KEY);
  if (cached) {
    return NextResponse.json({ ...cached, cacheHit: true }, { status: 200 });
  }

  try {
    const client = new JiraClient(cfg.baseUrl, cfg.email, cfg.apiToken);

    const rawIssues = await client.searchIssues(
      'sprint in openSprints() ORDER BY sprint ASC, created ASC',
      ['summary', 'status', 'fixVersions', 'issuetype', cfg.fields.sprint, 'reporter'],
    );

    const sprintMap   = new Map<number, Omit<JiraSprint, 'boardName'>>();
    const issuesBySprint: Record<number, SprintIssue[]> = {};

    for (const raw of rawIssues) {
      const f          = raw.fields;
      const sprintArr  = (f?.[cfg.fields.sprint] as unknown[]) ?? [];
      const activeSprint = sprintArr
        .map((s) => JiraClient.parseSprint(s))
        .find((s) => s?.state === 'active');

      if (!activeSprint) continue;

      const sprintId = activeSprint.id;
      if (!sprintMap.has(sprintId)) {
        sprintMap.set(sprintId, {
          id:        sprintId,
          name:      activeSprint.name,
          startDate: activeSprint.startDate,
          endDate:   activeSprint.endDate,
          boardId:   activeSprint.originBoardId,
          goal:      activeSprint.goal ?? '',
          state:     'active',
        });
      }

      const catKey: string = f?.status?.statusCategory?.key ?? 'todo';
      const statusCategory: SprintIssue['statusCategory'] =
        catKey === 'done' ? 'done'
          : catKey === 'indeterminate' || catKey === 'in-progress' ? 'in-progress'
          : 'todo';

      const fvList     = f['fixVersions'] as any[];
      const rawReporter = f['reporter'] as any;

      const issue: SprintIssue = {
        key:    raw.key,
        summary: (f.summary as string) ?? '',
        status:  f?.status?.name ?? '',
        statusCategory,
        issueType: (f['issuetype'] as any)?.name ?? '',
        fixVersions: (fvList ?? []).map((v) => ({
          id:          v.id,
          name:        v.name,
          released:    v.released,
          releaseDate: v.releaseDate ?? null,
        })),
        reporter: rawReporter?.accountId && rawReporter?.displayName
          ? { accountId: rawReporter.accountId, displayName: rawReporter.displayName }
          : null,
        sprintId,
        url: `${cfg.baseUrl}/browse/${raw.key}`,
      };

      if (!issuesBySprint[sprintId]) issuesBySprint[sprintId] = [];
      issuesBySprint[sprintId].push(issue);
    }

    // Resolve missing board IDs via Agile API
    const sprintsWithoutBoard = Array.from(sprintMap.entries())
      .filter(([, s]) => s.boardId === 0)
      .map(([id]) => id);

    if (sprintsWithoutBoard.length > 0) {
      await Promise.all(
        sprintsWithoutBoard.map(async (sprintId) => {
          try {
            const data    = await client.getSprint(sprintId);
            const entry   = sprintMap.get(sprintId);
            if (entry && data.originBoardId > 0) entry.boardId = data.originBoardId;
          } catch {
            // leave boardId = 0, will be handled in naming step
          }
        }),
      );
    }

    // Resolve board names via Agile API
    const uniqueBoardIds = [
      ...new Set(Array.from(sprintMap.values()).map((s) => s.boardId).filter((id) => id > 0)),
    ];
    const boardNames: Record<number, string> = {};

    await Promise.all(
      uniqueBoardIds.map(async (boardId) => {
        try {
          const board = await client.getBoard(boardId);
          const projectName = board.location?.projectName ?? board.location?.displayName ?? '';
          boardNames[boardId] = projectName && projectName !== board.name
            ? `${board.name} — ${projectName}`
            : board.name;
        } catch {
          boardNames[boardId] = `Board ${boardId}`;
        }
      }),
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
      cacheHit:  false,
    };

    sprintCache.set(SPRINT_CACHE_KEY, response);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching Sprint dashboard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
