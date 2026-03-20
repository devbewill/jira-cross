import { JiraSearchResponse, JiraIssueRaw } from './types';
import { DEFAULT_PAGE_SIZE, MAX_RESULTS } from './queries';

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
      };

      // Only include fields if provided, as an array
      if (fields.length > 0) {
        payload.fields = fields;
      }

      const endpoint = `/search/jql?startAt=${startAt}`;

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

  async getFields() {
    return this.request(`/field`, { method: 'GET' });
  }

  async testAuth() {
    return this.request(`/myself`, { method: 'GET' });
  }
}
