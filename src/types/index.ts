// Application Domain Types

export interface StoryStats {
  done: number;
  inProgress: number;
  todo: number;
  total: number;
}

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
  storyStats?: StoryStats;
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

// Timeline Scale & Config
export type TimeScale = 'today' | 'weeks' | 'months' | 'quarters';

export interface ScaleConfig {
  /** Pixels per day at this scale */
  pxPerDay: number;
  /** Number of units before today to show */
  unitsBefore: number;
  /** Number of units after today to show (including current) */
  unitsAfter: number;
  /** Total visible days (computed from the range rule) */
  visibleDays: number;
  /** Tick unit displayed in the header */
  tickUnit: 'day' | 'month' | 'quarter';
}

export interface TimelineConfig {
  scale: TimeScale;
  /** First visible date (left edge of viewport) */
  visibleStart: Date;
  /** Last visible date (right edge of viewport) */
  visibleEnd: Date;
  /** Pixels per day for current scale */
  pxPerDay: number;
  /** Total scrollable width in pixels */
  totalWidth: number;
  /** Tick unit for the header */
  tickUnit: 'day' | 'month' | 'quarter';
}

// Timeline Positioning
export interface TimelinePosition {
  left: number;
  width: number;
  laneIndex: number;
}
