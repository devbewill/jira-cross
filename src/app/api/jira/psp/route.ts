import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';
import { getJiraConfig, hasJiraCredentials } from '@/lib/jira/config';
import { buildPspJql } from '@/lib/jira/queries';
import { pspCache } from '@/lib/cache/memory-cache';
import { PSPIssue, PSPSla, PSPApiResponse, PSPRequestType, PSPRequestTypeGroup } from '@/types';
import { JiraIssueRaw } from '@/lib/jira/types';

const PSP_CACHE_KEY = 'psp:sa-all-v4';

function mapSla(raw: any): PSPSla | null {
  const cycle = raw?.ongoingCycle;
  if (!cycle) return null;
  return {
    breachTime:      cycle.breachTime?.iso8601 ?? '',
    breached:        cycle.breached ?? false,
    paused:          cycle.paused ?? false,
    remainingMs:     cycle.remainingTime?.millis ?? 0,
    remainingFriendly: cycle.remainingTime?.friendly ?? '',
    goalFriendly:    cycle.goalDuration?.friendly ?? '',
  };
}

function mapRawToPSPIssue(raw: JiraIssueRaw, cfg: { baseUrl: string; fields: { sla: string } }): PSPIssue {
  const f = raw.fields;
  const catKey: string = f?.status?.statusCategory?.key ?? 'todo';
  const statusCategory: PSPIssue['statusCategory'] =
    catKey === 'done' ? 'done'
      : catKey === 'indeterminate' || catKey === 'in-progress' ? 'in-progress'
      : 'todo';

  return {
    key:      raw.key,
    summary:  f?.summary ?? '',
    status:   f?.status?.name ?? '',
    statusCategory,
    issueType:   f?.issuetype?.name ?? '',
    requestType: (f?.customfield_10010 as any)?.requestType?.name ?? null,
    priority:    f?.priority?.name ?? 'Medium',
    assignee: f?.assignee
      ? { displayName: f.assignee.displayName, avatarUrl: f.assignee.avatarUrls?.['24x24'] ?? '' }
      : null,
    reporter: f?.reporter
      ? { displayName: f.reporter.displayName, avatarUrl: f.reporter.avatarUrls?.['24x24'] ?? '' }
      : null,
    created:        f?.created ?? '',
    resolutionDate: f?.resolutiondate ?? (statusCategory === 'done' ? (f?.updated ?? null) : null),
    sla: mapSla(f?.[cfg.fields.sla]),
    url: `${cfg.baseUrl}/browse/${raw.key}`,
  };
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const cfg = getJiraConfig();
  if (!hasJiraCredentials(cfg)) {
    return NextResponse.json(
      { error: 'Missing Jira credentials. Please configure environment variables.' },
      { status: 500 },
    );
  }

  const cached = pspCache.get(PSP_CACHE_KEY);
  if (cached) {
    return NextResponse.json({ ...cached, cacheHit: true }, { status: 200 });
  }

  try {
    const client = new JiraClient(cfg.baseUrl, cfg.email, cfg.apiToken);

    const [rawIssues, groupsData, typesData] = await Promise.all([
      client.searchIssues(buildPspJql(), [
        'summary', 'status', 'issuetype', 'priority',
        'assignee', 'reporter', 'created', 'updated', 'resolutiondate',
        'customfield_10010', cfg.fields.sla,
      ]),
      client.getServiceDeskRequestTypeGroups(cfg.serviceDeskId),
      client.getServiceDeskRequestTypes(cfg.serviceDeskId),
    ]);

    const allTypes: PSPRequestType[] = (typesData.values ?? []).map((t: any) => ({
      id:      t.id,
      name:    t.name,
      groupId: t.groupIds?.[0] ?? '',
    }));

    const groups: PSPRequestTypeGroup[] = (groupsData.values ?? []).map((g: any) => ({
      id:   g.id,
      name: g.name,
      requestTypes: allTypes
        .filter((t) => t.groupId === g.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));

    const issues: PSPIssue[] = rawIssues.map((r) => mapRawToPSPIssue(r, cfg));

    const response: PSPApiResponse = {
      issues,
      groups,
      fetchedAt: new Date().toISOString(),
      cacheHit:  false,
    };

    pspCache.set(PSP_CACHE_KEY, response);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching PSP issues:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
