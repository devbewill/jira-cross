import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { getJiraConfig, hasJiraCredentials } from '@/lib/jira/config';
import { pcEpicsCache } from '@/lib/cache/memory-cache';
import { PCEpic, InitiativeGroup, PCEpicsApiResponse } from '@/types';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const cfg = getJiraConfig();
  if (!hasJiraCredentials(cfg)) {
    return NextResponse.json(
      { error: 'Missing Jira credentials. Please configure environment variables.' },
      { status: 500 },
    );
  }

  const cacheKey = 'pc-epics:all';
  const cached = pcEpicsCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cacheHit: true }, { status: 200 });
  }

  try {
    const client = new JiraClient(cfg.baseUrl, cfg.email, cfg.apiToken);

    // Step 1: fetch all initiatives from the PC project
    const initiatives = await client.searchIssues(
      `project = ${cfg.pcProject} AND issuetype = "${cfg.initiativeType}" ORDER BY created DESC`,
      ['summary'],
    );

    if (initiatives.length === 0) {
      const empty: PCEpicsApiResponse = { groups: [], fetchedAt: new Date().toISOString(), cacheHit: false };
      pcEpicsCache.set(cacheKey, empty);
      return NextResponse.json(empty, { status: 200 });
    }

    // Build a summary map so we always have initiative names even when parent.fields is sparse
    const initiativeSummaryMap = new Map(
      initiatives.map((i) => [i.key, (i.fields?.summary as string | undefined) ?? i.key]),
    );

    const initiativeKeys = initiatives.map((i) => i.key);

    const fields = [
      'summary',
      'status',
      'assignee',
      cfg.fields.startDate,
      'duedate',
      'parent',
      'project',
    ];

    // Step 2: fetch ALL epics across every project whose parent is one of those initiatives
    const issues = await client.searchIssues(
      `issuetype = Epic AND parent in (${initiativeKeys.join(', ')}) ORDER BY created DESC`,
      fields,
    );

    const epics: PCEpic[] = issues.map((issue) => {
      const catKey = issue.fields?.status?.statusCategory?.key ?? 'new';
      const statusCategory: PCEpic['statusCategory'] =
        catKey === 'done'
          ? 'done'
          : catKey === 'indeterminate' || catKey === 'in-progress'
          ? 'in-progress'
          : 'todo';

      const parent = issue.fields?.parent;

      return {
        key: issue.key,
        summary: issue.fields?.summary ?? '',
        startDate: (issue.fields?.[cfg.fields.startDate] as string | null) ?? null,
        dueDate: (issue.fields?.duedate as string | null) ?? null,
        status: issue.fields?.status?.name ?? 'Unknown',
        statusCategory,
        assignee: issue.fields?.assignee
          ? {
              displayName: issue.fields.assignee.displayName,
              avatarUrl: issue.fields.assignee.avatarUrls?.['32x32'] ?? '',
            }
          : null,
        url: `${cfg.baseUrl}/browse/${issue.key}`,
        initiative: parent
          ? { key: parent.key, summary: initiativeSummaryMap.get(parent.key) ?? (parent.fields?.summary as string | undefined) ?? parent.key }
          : null,
      };
    });

    // Fetch story stats for all epics
    const epicKeys = epics.map((e) => e.key);
    const statsMap = await client.getStoryStatsByEpic(epicKeys);
    const epicsWithStats: PCEpic[] = epics.map((e) => ({
      ...e,
      storyStats: statsMap.get(e.key)?.stats,
    }));

    // Group by initiative
    const initiativeMap = new Map<string, InitiativeGroup>();
    for (const epic of epicsWithStats) {
      const iKey = epic.initiative?.key ?? '__none__';
      const iSummary = epic.initiative?.summary ?? 'No Initiative';
      if (!initiativeMap.has(iKey)) {
        initiativeMap.set(iKey, {
          initiativeKey: epic.initiative?.key ?? null,
          initiativeSummary: iSummary,
          epics: [],
        });
      }
      initiativeMap.get(iKey)!.epics.push(epic);
    }

    const groups = Array.from(initiativeMap.values());
    // Groups with an initiative come first, sorted by name; "No Initiative" last
    groups.sort((a, b) => {
      if (!a.initiativeKey) return 1;
      if (!b.initiativeKey) return -1;
      return a.initiativeSummary.localeCompare(b.initiativeSummary);
    });

    const response: PCEpicsApiResponse = {
      groups,
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
    };

    pcEpicsCache.set(cacheKey, response);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching PC epics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
