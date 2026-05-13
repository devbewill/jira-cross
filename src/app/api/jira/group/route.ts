import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { getJiraConfig, hasJiraCredentials } from '@/lib/jira/config';
import { groupCache } from '@/lib/cache/memory-cache';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const groupname = request.nextUrl.searchParams.get('groupname');
  if (!groupname) {
    return NextResponse.json({ error: 'Missing groupname' }, { status: 400 });
  }

  const cfg = getJiraConfig();
  if (!hasJiraCredentials(cfg)) {
    return NextResponse.json(
      { error: 'Missing Jira credentials. Please configure environment variables.' },
      { status: 500 },
    );
  }

  const cacheKey = `group:${groupname}`;
  const cached = groupCache.get(cacheKey);
  if (cached) return NextResponse.json(cached, { status: 200 });

  try {
    const client     = new JiraClient(cfg.baseUrl, cfg.email, cfg.apiToken);
    const accountIds = await client.getGroupMembers(groupname);
    groupCache.set(cacheKey, accountIds);
    return NextResponse.json(accountIds, { status: 200 });
  } catch (error) {
    console.error('Error fetching Group members:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
