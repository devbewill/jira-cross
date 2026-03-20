import { JiraIssueRaw } from './types';
import { Epic, BoardData } from '@/types';

export interface MapperConfig {
  startDateFieldId: string;
  storyPointsFieldId: string;
  dueDateFieldId: string;
  baseUrl: string;
}

export function mapJiraIssueToEpic(
  issue: JiraIssueRaw,
  boardKey: string,
  config: MapperConfig
): Epic {
  const {
    key,
    fields,
    self,
  } = issue;

  const startDate = fields[config.startDateFieldId] || null;
  const dueDate = fields[config.dueDateFieldId] || null;
  const storyPoints = fields[config.storyPointsFieldId] || null;

  // Count child issues from changelog or from custom field
  const childIssueCount = 0; // TODO: implement if needed
  const completedChildCount = 0; // TODO: implement if needed

  return {
    key,
    boardKey,
    summary: fields.summary || '',
    startDate,
    dueDate,
    status: fields.status?.name || 'Unknown',
    statusCategory: fields.status?.statusCategory?.key || 'todo',
    assignee: fields.assignee
      ? {
          displayName: fields.assignee.displayName,
          avatarUrl:
            fields.assignee.avatarUrls['48x48'] || fields.assignee.avatarUrls['32x32'] || '',
        }
      : null,
    storyPoints: typeof storyPoints === 'number' ? storyPoints : null,
    childIssueCount,
    completedChildCount,
    url: self,
  };
}

export function groupEpicsByBoard(
  epics: Epic[],
  boardKeys: string[]
): BoardData[] {
  const boardMap = new Map<string, Epic[]>();

  // Initialize board map
  boardKeys.forEach((key) => {
    boardMap.set(key, []);
  });

  // Group epics by board
  epics.forEach((epic) => {
    const board = boardMap.get(epic.boardKey);
    if (board) {
      board.push(epic);
    }
  });

  // Convert to BoardData array
  return boardKeys.map((key) => ({
    key,
    name: key, // In a real scenario, you'd fetch board names from Jira
    epics: boardMap.get(key) || [],
  }));
}
