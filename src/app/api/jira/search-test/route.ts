import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';

export async function GET() {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    return NextResponse.json(
      { error: 'Missing credentials' },
      { status: 500 }
    );
  }

  try {
    const client = new JiraClient(jiraBaseUrl, jiraEmail, jiraApiToken);
    const results = await client.searchIssues('issuetype = Epic AND project = CEF');
    return NextResponse.json({ success: true, issues: results }, { status: 200 });
  } catch (error) {
    console.error('Search test failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
