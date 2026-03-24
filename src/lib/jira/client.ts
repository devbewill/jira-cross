import { JiraSearchResponse, JiraIssueRaw } from './types';
import { DEFAULT_PAGE_SIZE, MAX_RESULTS } from './queries';
import { StoryStats, EpicRelease } from '@/types';

export class JiraClient {
  private baseUrl: string;
  private auth: string;

  constructor(baseUrl: string, email: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${this.auth}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[JiraClient] ${response.status} ${response.statusText} — ${url}`, errorBody);
      throw new Error(
        `Jira API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  async searchIssues(
    jql: string,
    fields: string[] = []
  ): Promise<JiraIssueRaw[]> {
    const allIssues: JiraIssueRaw[] = [];
    let hasMore = true;
    let nextPageToken: string | undefined = undefined;

    while (hasMore && allIssues.length < MAX_RESULTS) {
      const payload: Record<string, unknown> = {
        jql,
        maxResults: DEFAULT_PAGE_SIZE,
      };

      if (nextPageToken) payload.nextPageToken = nextPageToken;
      if (fields.length > 0) payload.fields = fields;

      const response = await this.request<JiraSearchResponse>(
        '/search/jql',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      allIssues.push(...response.issues);

      if (response.isLast || !response.nextPageToken) {
        hasMore = false;
      } else {
        nextPageToken = response.nextPageToken;
      }
    }

    return allIssues;
  }

  /**
   * Fetches all child issues belonging to a list of epic keys in a SINGLE JQL query,
   * then aggregates status counts AND distinct fix versions per epic.
   */
  async getStoryStatsByEpic(
    epicKeys: string[],
  ): Promise<Map<string, { stats: StoryStats; releases: EpicRelease[] }>> {
    const dataMap = new Map<string, { stats: StoryStats; releases: EpicRelease[] }>();
    if (epicKeys.length === 0) return dataMap;

    epicKeys.forEach((key) => {
      dataMap.set(key, { stats: { done: 0, inProgress: 0, todo: 0, total: 0 }, releases: [] });
    });

    const keyList = epicKeys.join(', ');
    const jql = `parent in (${keyList}) ORDER BY status`;

    try {
      const issues = await this.searchIssues(jql, ['status', 'parent', 'fixVersions']);

      for (const issue of issues) {
        const parentKey: string | undefined = issue.fields?.parent?.key;
        if (!parentKey) continue;
        const data = dataMap.get(parentKey);
        if (!data) continue;

        // Story stats
        const catKey: string = issue.fields?.status?.statusCategory?.key ?? 'new';
        data.stats.total++;
        if (catKey === 'done') data.stats.done++;
        else if (catKey === 'indeterminate' || catKey === 'in-progress') data.stats.inProgress++;
        else data.stats.todo++;

        // Distinct fix versions
        const fvs: any[] = issue.fields?.fixVersions ?? [];
        for (const fv of fvs) {
          if (!data.releases.find((r) => r.id === fv.id)) {
            const releaseDate: string | null = fv.releaseDate ?? null;
            data.releases.push({
              id:          fv.id,
              name:        fv.name,
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

  async getFields() {
    return this.request(`/field`, { method: 'GET' });
  }

  async testAuth() {
    return this.request(`/myself`, { method: 'GET' });
  }
}
