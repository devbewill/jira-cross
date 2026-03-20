// Jira REST API v3 Response Types

export interface JiraFieldValue {
  [key: string]: any;
}

export interface JiraIssueRaw {
  key: string;
  id: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: {
        key: 'todo' | 'in-progress' | 'done';
        name: string;
        colorName: string;
      };
    };
    assignee: {
      displayName: string;
      avatarUrls: {
        '16x16': string;
        '24x24': string;
        '32x32': string;
        '48x48': string;
      };
    } | null;
    [customFieldKey: string]: any;
  };
  self: string;
}

export interface JiraSearchResponse {
  issues: JiraIssueRaw[];
  total: number;
  maxResults: number;
  startAt: number;
}

export interface JiraBoardResponse {
  id: number;
  key: string;
  name: string;
  type: string;
}

export interface JiraFieldResponse {
  id: string;
  name: string;
  custom: boolean;
  orderable: boolean;
  searchable: boolean;
  schema: {
    type: string;
    custom: string;
    customId: number;
  };
}
