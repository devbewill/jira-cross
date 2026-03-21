import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { GLOBAL_EPIC_JQL } from '@/lib/jira/queries';
import { mapJiraIssueToEpic, groupEpicsByBoard } from '@/lib/jira/mapper';
import { epicsCache } from '@/lib/cache/memory-cache';
import { EpicsApiResponse } from '@/types';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;

  console.log('Epics endpoint called');
  console.log('JIRA_BASE_URL present:', !!jiraBaseUrl);
  console.log('JIRA_EMAIL present:', !!jiraEmail);
  console.log('JIRA_API_TOKEN present:', !!jiraApiToken);

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    console.error('Missing Jira credentials');
    return NextResponse.json(
      { error: 'Missing Jira credentials. Please configure environment variables.' },
      { status: 500 }
    );
  }

  // Check cache first
  const cacheKey = `epics:global-p0`;
  const cached = epicsCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(
      { ...cached, cacheHit: true },
      { status: 200 }
    );
  }

  try {
    const client = new JiraClient(jiraBaseUrl, jiraEmail, jiraApiToken);

    const fieldsList = [
      'summary',
      'status',
      'assignee',
      'created',
      'updated',
      'customfield_10015',
      'customfield_10016',
      'duedate',
      'parent',
      'project',
    ];

    const issues = await client.searchIssues(GLOBAL_EPIC_JQL, fieldsList);

    const mapperConfig = {
      startDateFieldId: 'customfield_10015',
      storyPointsFieldId: 'customfield_10016',
      dueDateFieldId: 'duedate',
      baseUrl: jiraBaseUrl,
    };

    console.log(`[epics] total issues from Jira: ${issues.length}`);
    console.log(`[epics] keys:`, issues.map((i) => i.key).join(', '));

    const allEpics = issues.map((issue) => {
      const boardKey = issue.fields?.project?.key || issue.key.split('-')[0];
      return mapJiraIssueToEpic(issue, boardKey, mapperConfig);
    });

    // Fetch story counts for all epics in a single JQL query
    const epicKeys = allEpics.map((e) => e.key);
    const storyStatsMap = await client.getStoryStatsByEpic(epicKeys);

    // Attach story stats to each epic
    const allEpicsWithStats = allEpics.map((epic) => ({
      ...epic,
      storyStats: storyStatsMap.get(epic.key),
    }));

    const uniqueBoards = Array.from(new Set(allEpicsWithStats.map((e) => e.boardKey)));
    const boardsData = groupEpicsByBoard(allEpicsWithStats, uniqueBoards);

    const response: EpicsApiResponse = {
      boards: boardsData,
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
    };

    // Cache the result
    epicsCache.set(cacheKey, response);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching epics:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
