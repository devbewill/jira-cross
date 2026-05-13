import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { getJiraConfig, hasJiraCredentials } from '@/lib/jira/config';
import { buildEpicJql } from '@/lib/jira/queries';
import { mapJiraIssueToEpic, groupEpicsByBoard } from '@/lib/jira/mapper';
import { epicsCache } from '@/lib/cache/memory-cache';
import { EpicsApiResponse } from '@/types';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const cfg = getJiraConfig();
  if (!hasJiraCredentials(cfg)) {
    return NextResponse.json(
      { error: 'Missing Jira credentials. Please configure environment variables.' },
      { status: 500 },
    );
  }

  const cacheKey = `epics:global-${cfg.epicLabel}`;
  const cached = epicsCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cacheHit: true }, { status: 200 });
  }

  try {
    const client = new JiraClient(cfg.baseUrl, cfg.email, cfg.apiToken);

    const fieldsList = [
      'summary',
      'status',
      'assignee',
      'created',
      'updated',
      cfg.fields.startDate,
      cfg.fields.storyPoints,
      'duedate',
      'parent',
      'project',
    ];

    const issues = await client.searchIssues(buildEpicJql(), fieldsList);

    const mapperConfig = {
      startDateFieldId:   cfg.fields.startDate,
      storyPointsFieldId: cfg.fields.storyPoints,
      dueDateFieldId:     'duedate',
      baseUrl:            cfg.baseUrl,
    };

    const allEpics = issues.map((issue) => {
      const boardKey = issue.fields?.project?.key || issue.key.split('-')[0];
      return mapJiraIssueToEpic(issue, boardKey, mapperConfig);
    });

    const epicKeys    = allEpics.map((e) => e.key);
    const epicDataMap = await client.getStoryStatsByEpic(epicKeys);

    const allEpicsWithStats = allEpics.map((epic) => {
      const data = epicDataMap.get(epic.key);
      return { ...epic, storyStats: data?.stats, releases: data?.releases ?? [] };
    });

    const uniqueBoards = Array.from(new Set(allEpicsWithStats.map((e) => e.boardKey)));
    const boardsData   = groupEpicsByBoard(allEpicsWithStats, uniqueBoards);

    const response: EpicsApiResponse = {
      boards:    boardsData,
      fetchedAt: new Date().toISOString(),
      cacheHit:  false,
    };

    epicsCache.set(cacheKey, response);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching epics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
