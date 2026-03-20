// Application Domain Types
export interface Epic {
  key: string;
  boardKey: string;
  summary: string;
  startDate: string | null;
  dueDate: string | null;
  status: string;
  statusCategory: 'todo' | 'in-progress' | 'done';
  assignee: { displayName: string; avatarUrl: string } | null;
  storyPoints: number | null;
  childIssueCount: number;
  completedChildCount: number;
  url: string;
}

export interface BoardData {
  key: string;
  name: string;
  epics: Epic[];
}

export interface EpicsApiResponse {
  boards: BoardData[];
  fetchedAt: string;
  cacheHit: boolean;
}

// Timeline Positioning
export interface TimelinePosition {
  left: number;
  width: number;
  laneIndex: number;
}

export interface TimelineConfig {
  startDate: Date;
  endDate: Date;
  pixelsPerDay: number;
  containerWidth: number;
}
