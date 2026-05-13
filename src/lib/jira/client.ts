import { JiraSearchResponse, JiraIssueRaw, JiraFieldResponse } from './types';
import { DEFAULT_PAGE_SIZE, MAX_RESULTS } from './queries';
import { StoryStats, EpicRelease } from '@/types';

export interface JiraSprintRaw {
  id: number;
  name: string;
  state: string;
  startDate: string | null;
  endDate: string | null;
  originBoardId: number;
  goal?: string;
}

export interface JiraBoardRaw {
  id: number;
  name: string;
  location?: { projectName?: string; displayName?: string };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  userStartDate?: string;
  userReleaseDate?: string;
  released: boolean;
  archived: boolean;
  overdue?: boolean;
  projectId: number;
}

export interface ParsedSprint {
  id: number;
  originBoardId: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  state: string;
  goal?: string;
}

export class JiraClient {
  private baseUrl: string;
  private auth: string;

  constructor(baseUrl: string, email: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  }

  // ─── Core request ────────────────────────────────────────────────────────────

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.auth}`,
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[JiraClient] ${response.status} ${response.statusText} — ${url}`, body);
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private api3<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(`${this.baseUrl}/rest/api/3${path}`, options);
  }

  private agile<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(`${this.baseUrl}/rest/agile/1.0${path}`, options);
  }

  private serviceDesk<T>(path: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(`${this.baseUrl}/rest/servicedeskapi${path}`, {
      ...options,
      headers: {
        'X-ExperimentalApi': 'opt-in',
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  }

  // ─── Search ──────────────────────────────────────────────────────────────────

  async searchIssues(jql: string, fields: string[] = []): Promise<JiraIssueRaw[]> {
    const allIssues: JiraIssueRaw[] = [];
    let hasMore = true;
    let nextPageToken: string | undefined;

    while (hasMore && allIssues.length < MAX_RESULTS) {
      const payload: Record<string, unknown> = { jql, maxResults: DEFAULT_PAGE_SIZE };
      if (nextPageToken) payload.nextPageToken = nextPageToken;
      if (fields.length > 0) payload.fields = fields;

      const response = await this.api3<JiraSearchResponse>('/search/jql', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      allIssues.push(...response.issues);

      if (response.isLast || !response.nextPageToken) {
        hasMore = false;
      } else {
        nextPageToken = response.nextPageToken;
      }
    }

    return allIssues;
  }

  async getStoryStatsByEpic(
    epicKeys: string[],
  ): Promise<Map<string, { stats: StoryStats; releases: EpicRelease[] }>> {
    const dataMap = new Map<string, { stats: StoryStats; releases: EpicRelease[] }>();
    if (epicKeys.length === 0) return dataMap;

    epicKeys.forEach((key) => {
      dataMap.set(key, { stats: { done: 0, inProgress: 0, todo: 0, total: 0 }, releases: [] });
    });

    const jql = `parent in (${epicKeys.join(', ')}) ORDER BY status`;
    try {
      const issues = await this.searchIssues(jql, ['status', 'parent', 'fixVersions']);
      for (const issue of issues) {
        const parentKey: string | undefined = issue.fields?.parent?.key;
        if (!parentKey) continue;
        const data = dataMap.get(parentKey);
        if (!data) continue;

        const catKey = issue.fields?.status?.statusCategory?.key ?? 'new';
        data.stats.total++;
        if (catKey === 'done') data.stats.done++;
        else if (catKey === 'indeterminate' || catKey === 'in-progress') data.stats.inProgress++;
        else data.stats.todo++;

        const fvs: any[] = issue.fields?.fixVersions ?? [];
        for (const fv of fvs) {
          if (!data.releases.find((r) => r.id === fv.id)) {
            const releaseDate: string | null = fv.releaseDate ?? null;
            data.releases.push({
              id:          fv.id,
              name:        fv.name,
              startDate:   fv.startDate ?? null,
              releaseDate,
              released:    fv.released ?? false,
              overdue:     !fv.released && !!releaseDate && new Date(releaseDate) < new Date(),
            });
          }
        }
      }
    } catch (err) {
      console.warn('[JiraClient] getStoryStatsByEpic failed:', err);
    }

    return dataMap;
  }

  // ─── Projects & Versions ─────────────────────────────────────────────────────

  async getAllProjects(): Promise<JiraProject[]> {
    const projects: JiraProject[] = [];
    let startAt = 0;
    let isLast = false;

    while (!isLast) {
      const res = await this.api3<{ values: JiraProject[]; isLast: boolean }>(
        `/project/search?maxResults=100&startAt=${startAt}&orderBy=key`,
      );
      projects.push(...(res.values ?? []));
      isLast = res.isLast ?? true;
      startAt += res.values?.length ?? 0;
    }

    return projects;
  }

  async getProjectVersions(projectKey: string): Promise<JiraVersion[]> {
    return this.api3<JiraVersion[]>(`/project/${projectKey}/versions`);
  }

  // ─── Worklog ─────────────────────────────────────────────────────────────────

  async getIssueWorklogs(issueKey: string, startMs: number, endMs: number): Promise<any[]> {
    const res = await this.api3<{ worklogs: any[] }>(
      `/issue/${issueKey}/worklog?startedAfter=${startMs}&startedBefore=${endMs + 1}&maxResults=5000`,
    );
    return res.worklogs ?? [];
  }

  // ─── Group members ───────────────────────────────────────────────────────────

  async getGroupMembers(groupname: string): Promise<string[]> {
    const accountIds: string[] = [];
    let startAt = 0;
    let isLast = false;

    while (!isLast) {
      const res = await this.api3<{ values: any[]; isLast: boolean }>(
        `/group/member?groupname=${encodeURIComponent(groupname)}&maxResults=100&startAt=${startAt}`,
      );
      accountIds.push(...(res.values ?? []).filter((m) => m.active).map((m) => m.accountId));
      isLast = res.isLast ?? true;
      startAt += 100;
    }

    return accountIds;
  }

  // ─── Agile: Sprint & Board ───────────────────────────────────────────────────

  async getSprint(sprintId: number): Promise<JiraSprintRaw> {
    return this.agile<JiraSprintRaw>(`/sprint/${sprintId}`);
  }

  async getBoard(boardId: number): Promise<JiraBoardRaw> {
    return this.agile<JiraBoardRaw>(`/board/${boardId}`);
  }

  // ─── Service Desk ────────────────────────────────────────────────────────────

  async getServiceDeskRequestTypeGroups(deskId: string): Promise<{ values: any[] }> {
    return this.serviceDesk(`/servicedesk/${deskId}/requesttypegroup`);
  }

  async getServiceDeskRequestTypes(deskId: string): Promise<{ values: any[] }> {
    return this.serviceDesk(`/servicedesk/${deskId}/requesttype?limit=100`);
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  async getFields(): Promise<JiraFieldResponse[]> {
    return this.api3('/field');
  }

  async testAuth(): Promise<unknown> {
    return this.api3('/myself');
  }

  // ─── Sprint parsing helper ───────────────────────────────────────────────────

  static parseSprint(raw: unknown): ParsedSprint | null {
    if (raw && typeof raw === 'object') {
      const s = raw as any;
      return {
        id:            s.id,
        originBoardId: s.boardId ?? s.originBoardId ?? 0,
        name:          s.name,
        startDate:     s.startDate ?? null,
        endDate:       s.endDate   ?? null,
        state:         (s.state ?? '').toLowerCase(),
        goal:          s.goal,
      };
    }

    if (typeof raw === 'string') {
      const get = (key: string): string | null => {
        const m = raw.match(new RegExp(`${key}=([^,\\]]+)`));
        const v = m?.[1];
        return !v || v === '<null>' ? null : v;
      };
      const id    = get('id');
      const name  = get('name');
      const state = get('state');
      if (!id || !name || !state) return null;
      const boardId = get('rapidViewId');
      return {
        id:            parseInt(id, 10),
        originBoardId: boardId ? parseInt(boardId, 10) : 0,
        name,
        startDate:     get('startDate'),
        endDate:       get('endDate'),
        state:         state.toLowerCase(),
      };
    }

    return null;
  }
}
