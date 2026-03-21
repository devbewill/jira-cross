import { JiraSearchResponse, JiraIssueRaw } from './types';
import { DEFAULT_PAGE_SIZE, MAX_RESULTS } from './queries';
import { StoryStats } from '@/types';

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

    console.log('Jira API request:', {
      method: options.method || 'GET',
      url,
      hasAuth: !!this.auth,
    });

    if (options.body) {
      console.log('Request body:', options.body);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('Jira API response:', {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Jira API error body:', errorBody);
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
    let startAt = 0;
    let hasMore = true;

    // /search/jql uses cursor-based pagination: nextPageToken instead of startAt
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

      // isLast=true or no nextPageToken means we're done
      if (response.isLast || !response.nextPageToken) {
        hasMore = false;
      } else {
        nextPageToken = response.nextPageToken;
      }
    }

    return allIssues;
  }

  /**
   * Fetches all child issues (stories/tasks/bugs) belonging to a list of epic keys
   * in a SINGLE JQL query, then aggregates status counts per epic.
   *
   * Uses `parent in (KEY-1, KEY-2, ...)` which works for both next-gen and classic
   * Jira projects (classic projects may also need `"Epic Link" in (...)` — both
   * syntaxes are equivalent for team-managed and company-managed next-gen projects).
   */
  async getStoryStatsByEpic(epicKeys: string[]): Promise<Map<string, StoryStats>> {
    const statsMap = new Map<string, StoryStats>();
    if (epicKeys.length === 0) return statsMap;

    // Initialise every epic with zero stats so callers always get a value
    epicKeys.forEach((key) => {
      statsMap.set(key, { done: 0, inProgress: 0, todo: 0, total: 0 });
    });

    const keyList = epicKeys.join(', ');
    const jql = `parent in (${keyList}) ORDER BY status`;

    try {
      const issues = await this.searchIssues(jql, ['status', 'parent']);

      console.log(`[storyStats] JQL returned ${issues.length} child issues for ${epicKeys.length} epics`);

      // Log distribution of statusCategory.key values across all returned issues
      const catKeyDist: Record<string, number> = {};
      issues.forEach((issue) => {
        const k = issue.fields?.status?.statusCategory?.key ?? '(undefined)';
        catKeyDist[k] = (catKeyDist[k] ?? 0) + 1;
      });
      console.log('[storyStats] statusCategory.key distribution:', catKeyDist);

      // Log how many issues have a parent key that matches an epic vs not
      let matched = 0; let unmatched = 0;
      issues.forEach((issue) => {
        const parentKey: string | undefined = issue.fields?.parent?.key;
        if (!parentKey) { unmatched++; return; }
        const stats = statsMap.get(parentKey);
        if (!stats) { unmatched++; console.log(`[storyStats] unmatched parentKey: "${parentKey}"`); return; }
        matched++;

        const catKey: string = issue.fields?.status?.statusCategory?.key ?? 'new';
        stats.total++;
        if (catKey === 'done') stats.done++;
        else if (catKey === 'indeterminate' || catKey === 'in-progress') stats.inProgress++;
        else stats.todo++;
      });
      console.log(`[storyStats] matched: ${matched}, unmatched: ${unmatched}`);

      // Log final stats per epic
      const summary: Record<string, object> = {};
      statsMap.forEach((v, k) => { summary[k] = v; });
      console.log('[storyStats] final per-epic stats:', JSON.stringify(summary));

    } catch (err) {
      // Non-fatal: story stats are optional — log and return empty-initialised map
      console.warn('getStoryStatsByEpic: could not fetch child issues:', err);
    }

    return statsMap;
  }

  async getFields() {
    return this.request(`/field`, { method: 'GET' });
  }

  async testAuth() {
    return this.request(`/myself`, { method: 'GET' });
  }
}
