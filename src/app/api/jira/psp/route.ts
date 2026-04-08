import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { PSP_OPEN_JQL } from '@/lib/jira/queries';
import { pspCache } from '@/lib/cache/memory-cache';
import { PSPIssue, PSPSla, PSPApiResponse, PSPRequestType, PSPRequestTypeGroup } from '@/types';
import { JiraIssueRaw } from '@/lib/jira/types';

const PSP_CACHE_KEY = 'psp:sa-all-v1';
const SERVICE_DESK_ID = '30';

function mapSla(raw: any): PSPSla | null {
  const cycle = raw?.ongoingCycle;
  if (!cycle) return null;
  return {
    breachTime: cycle.breachTime?.iso8601 ?? '',
    breached: cycle.breached ?? false,
    paused: cycle.paused ?? false,
    remainingMs: cycle.remainingTime?.millis ?? 0,
    remainingFriendly: cycle.remainingTime?.friendly ?? '',
    goalFriendly: cycle.goalDuration?.friendly ?? '',
  };
}

function mapRawToPSPIssue(raw: JiraIssueRaw, baseUrl: string): PSPIssue {
  const f = raw.fields;
  const catKey: string = f?.status?.statusCategory?.key ?? 'todo';
  const statusCategory: PSPIssue['statusCategory'] =
    catKey === 'done' ? 'done' : (catKey === 'indeterminate' || catKey === 'in-progress') ? 'in-progress' : 'todo';

  return {
    key: raw.key,
    summary: f?.summary ?? '',
    status: f?.status?.name ?? '',
    statusCategory,
    issueType: f?.issuetype?.name ?? '',
    requestType: (f?.customfield_10010 as any)?.requestType?.name ?? null,
    priority: f?.priority?.name ?? 'Medium',
    assignee: f?.assignee
      ? { displayName: f.assignee.displayName, avatarUrl: f.assignee.avatarUrls?.['24x24'] ?? '' }
      : null,
    reporter: f?.reporter
      ? { displayName: f.reporter.displayName, avatarUrl: f.reporter.avatarUrls?.['24x24'] ?? '' }
      : null,
    created: f?.created ?? '',
    sla: mapSla(f?.customfield_10060),
    url: `${baseUrl}/browse/${raw.key}`,
  };
}

async function fetchServiceDeskData(
  baseUrl: string,
  auth: string,
): Promise<PSPRequestTypeGroup[]> {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${auth}`,
    'X-ExperimentalApi': 'opt-in',
  };

  const [groupsRes, typesRes] = await Promise.all([
    fetch(`${baseUrl}/rest/servicedeskapi/servicedesk/${SERVICE_DESK_ID}/requesttypegroup`, { headers }),
    fetch(`${baseUrl}/rest/servicedeskapi/servicedesk/${SERVICE_DESK_ID}/requesttype?limit=100`, { headers }),
  ]);

  if (!groupsRes.ok || !typesRes.ok) {
    throw new Error('Failed to fetch service desk request types');
  }

  const groupsData = await groupsRes.json();
  const typesData = await typesRes.json();

  const allTypes: PSPRequestType[] = (typesData.values ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    groupId: t.groupIds?.[0] ?? '',
  }));

  return (groupsData.values ?? []).map((g: any): PSPRequestTypeGroup => ({
    id: g.id,
    name: g.name,
    requestTypes: allTypes.filter((t) => t.groupId === g.id).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

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

  const cached = pspCache.get(PSP_CACHE_KEY);
  if (cached) {
    return NextResponse.json({ ...cached, cacheHit: true }, { status: 200 });
  }

  try {
    const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
    const client = new JiraClient(jiraBaseUrl, jiraEmail, jiraApiToken);

    const [rawIssues, groups] = await Promise.all([
      client.searchIssues(PSP_OPEN_JQL, [
        'summary', 'status', 'issuetype', 'priority',
        'assignee', 'reporter', 'created', 'customfield_10010', 'customfield_10060',
      ]),
      fetchServiceDeskData(jiraBaseUrl, auth),
    ]);

    const issues: PSPIssue[] = rawIssues.map((r) => mapRawToPSPIssue(r, jiraBaseUrl));

    const response: PSPApiResponse = {
      issues,
      groups,
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
    };

    pspCache.set(PSP_CACHE_KEY, response);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching PSP issues:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
