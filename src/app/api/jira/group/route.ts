import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const groupname = searchParams.get('groupname');

  if (!groupname) {
    return NextResponse.json({ error: 'Missing groupname' }, { status: 400 });
  }

  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    return NextResponse.json(
      { error: 'Missing Jira credentials. Please configure environment variables.' },
      { status: 500 }
    );
  }

  try {
    const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
    const accountIds: string[] = [];
    let startAt = 0;
    let isLast = false;

    while (!isLast) {
      const res = await fetch(`${jiraBaseUrl}/rest/api/3/group/member?groupname=${encodeURIComponent(groupname)}&maxResults=100&startAt=${startAt}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch group members');
      }
      const data = await res.json();
      accountIds.push(...(data.values || []).filter((m: any) => m.active).map((m: any) => m.accountId));
      isLast = data.isLast;
      startAt += 100;
    }

    return NextResponse.json(accountIds, { status: 200 });
  } catch (error) {
    console.error('Error fetching Group members:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
