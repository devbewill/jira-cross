import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { Story } from '@/types';

/**
 * GET /api/jira/version-issues?versionId=12345
 *
 * Returns all issues belonging to a specific fixVersion (Jira release).
 * No cache — always fetches live so the panel reflects the latest state.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const versionId = request.nextUrl.searchParams.get('versionId');
  if (!versionId) {
    return NextResponse.json({ error: 'Missing versionId' }, { status: 400 });
  }

  const base     = process.env.JIRA_BASE_URL;
  const email    = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!base || !email || !apiToken) {
    return NextResponse.json({ error: 'Missing Jira credentials' }, { status: 500 });
  }

  try {
    const client = new JiraClient(base, email, apiToken);
    const jql    = `fixVersion = ${versionId} ORDER BY status ASC, created ASC`;
    const raw    = await client.searchIssues(jql, ['summary', 'status', 'assignee', 'fixVersions']);

    const stories: Story[] = raw.map((issue) => ({
      key:            issue.key,
      epicKey:        '',
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
    console.error('[version-issues]', versionId, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
