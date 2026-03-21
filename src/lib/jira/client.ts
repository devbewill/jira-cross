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

    while (hasMore && startAt < MAX_RESULTS) {
      const payload: Record<string, unknown> = {
        jql,
        maxResults: DEFAULT_PAGE_SIZE,
        startAt,
      };

      // Only include fields if provided, as an array
      if (fields.length > 0) {
        payload.fields = fields;
      }

      const endpoint = `/search/jql`;

      const response = await this.request<JiraSearchResponse>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      allIssues.push(...response.issues);

      hasMore = startAt + response.maxResults < response.total;
      startAt += response.maxResults;
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

    const keyList = epicKeys.join(', ');
    const jql = `parent in (${keyList}) ORDER BY status`;

    try {
      const issues = await this.searchIssues(jql, ['status', 'parent']);
      console.log(`[storyStats] JQL returned ${issues.length} child issues for ${epicKeys.length} epics`);

      issues.forEach((issue) => {
        const parentKey: string | undefined = issue.fields?.parent?.key;
        if (!parentKey) return;

        // Initialise on first encounter so only epics that actually have stories get stats
        if (!statsMap.has(parentKey)) {
          statsMap.set(parentKey, { done: 0, inProgress: 0, todo: 0, total: 0 });
        }

        const stats = statsMap.get(parentKey)!;

        // Jira statusCategory.key values: "new" | "indeterminate" | "done"
        const catKey: string = issue.fields?.status?.statusCategory?.key ?? 'new';

        stats.total++;
        if (catKey === 'done') stats.done++;
        else if (catKey === 'indeterminate' || catKey === 'in-progress') stats.inProgress++;
        else stats.todo++;
      });
    } catch (err) {
      // Non-fatal: return whatever we managed to populate (may be empty)
      // Returning an empty map means storyStats will be undefined on epics,
      // which correctly triggers the status-colour fallback in EpicBlock.
      console.error('[storyStats] bulk JQL failed — epics will show status-colour fallback:', err);
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
