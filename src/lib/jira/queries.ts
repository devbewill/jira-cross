// Jira JQL Queries and Constants

export const GLOBAL_EPIC_JQL = `issuetype = Epic AND labels = P0 ORDER BY created DESC`;

export const JIRA_API_FIELDS = [
  'summary',
  'status',
  'assignee',
  'created',
  'updated',
];

export const getEpicFieldsList = (
  startDateFieldId: string,
  storyPointsFieldId: string,
  dueDateFieldId: string
): string => {
  return [
    'summary',
    'status',
    'assignee',
    'created',
    'updated',
    startDateFieldId,
    storyPointsFieldId,
    dueDateFieldId,
  ].join(',');
};

// Default pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_RESULTS = 1000;
