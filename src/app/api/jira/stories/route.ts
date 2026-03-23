import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { Story } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const epicKey = request.nextUrl.searchParams.get('epicKey');

  if (!epicKey) {
    return NextResponse.json({ error: 'epicKey query param is required' }, { status: 400 });
  }

  const jiraBaseUrl  = process.env.JIRA_BASE_URL;
  const jiraEmail    = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    return NextResponse.json({ error: 'Missing Jira credentials' }, { status: 500 });
  }

  try {
    const client = new JiraClient(jiraBaseUrl, jiraEmail, jiraApiToken);

    // Works for both next-gen and classic Jira projects
    const jql = `parent = ${epicKey} ORDER BY status ASC, created ASC`;
    const issues = await client.searchIssues(jql, ['summary', 'status', 'assignee', 'parent', 'fixVersions']);

    const stories: Story[] = issues.map((issue) => ({
      key:            issue.key,
      epicKey,
      summary:        issue.fields?.summary ?? '',
      status:         issue.fields?.status?.name ?? 'Unknown',
      statusCategory: issue.fields?.status?.statusCategory?.key ?? 'todo',
      assignee: issue.fields?.assignee
        ? {
            displayName: issue.fields.assignee.displayName,
            avatarUrl:   issue.fields.assignee.avatarUrls?.['32x32'] ?? '',
          }
        : null,
      fixVersions: Array.isArray(issue.fields?.fixVersions)
        ? issue.fields.fixVersions.map((fv: { id: string; name: string; releaseDate?: string; released?: boolean }) => ({
            id:          fv.id,
            name:        fv.name,
            releaseDate: fv.releaseDate ?? null,
            released:    fv.released ?? false,
          }))
        : [],
    }));

    return NextResponse.json({ stories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
