// Application Domain Types

export interface StoryStats {
  done: number;
  inProgress: number;
  todo: number;
  total: number;
}

export interface IssueStats {
  done: number;
  inProgress: number;
  todo: number;
  total: number;
  components?: string[];
  description?: string;
}

export interface JiraRelease {
  id: string;
  name: string;
  description: string;
  startDate: string | null;
  releaseDate: string | null;
  released: boolean;
  archived: boolean;
  overdue: boolean; // releaseDate passed and not yet released
  projectKey: string;
  projectName: string;
}

export interface ProjectReleases {
  projectKey: string;
  projectName: string;
  releases: JiraRelease[];
}

export interface StoryFixVersion {
  id: string;
  name: string;
  description?: string;
  releaseDate: string | null;
  released: boolean;
}

export interface Story {
  key: string;
  epicKey: string;
  summary: string;
  status: string;
  statusCategory: "todo" | "in-progress" | "done";
  assignee: { displayName: string; avatarUrl: string } | null;
  fixVersions?: StoryFixVersion[];
}

export interface EpicRelease {
  id: string;
  name: string;
  startDate: string | null;
  releaseDate: string | null;
  released: boolean;
  overdue: boolean;
}

export interface Epic {
  key: string;
  boardKey: string;
  summary: string;
  startDate: string | null;
  dueDate: string | null;
  status: string;
  statusCategory: "todo" | "in-progress" | "done";
  assignee: { displayName: string; avatarUrl: string } | null;
  storyPoints: number | null;
  childIssueCount: number;
  completedChildCount: number;
  url: string;
  storyStats?: StoryStats;
  releases?: EpicRelease[];
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

// PSP (Service Desk) Types

export interface PSPSla {
  breachTime: string;       // ISO 8601
  breached: boolean;
  paused: boolean;
  remainingMs: number;
  remainingFriendly: string;
  goalFriendly: string;
}

export interface PSPIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: "todo" | "in-progress" | "done";
  issueType: string;
  requestType: string | null;
  priority: string;
  assignee: { displayName: string; avatarUrl: string } | null;
  reporter: { displayName: string; avatarUrl: string } | null;
  created: string;
  sla: PSPSla | null;
  url: string;
}

export interface PSPRequestType {
  id: string;
  name: string;
  groupId: string;
}

export interface PSPRequestTypeGroup {
  id: string;
  name: string;
  requestTypes: PSPRequestType[];
}

export interface PSPApiResponse {
  issues: PSPIssue[];
  groups: PSPRequestTypeGroup[];
  fetchedAt: string;
  cacheHit: boolean;
}

// Timeline Scale & Config
export type TimeScale = "today" | "weeks" | "months" | "quarters";

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
  tickUnit: "day" | "month" | "quarter";
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
  tickUnit: "day" | "month" | "quarter";
}

// Timeline Positioning
export interface TimelinePosition {
  left: number;
  width: number;
  laneIndex: number;
}

// Sprint Types
export interface JiraSprint {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  boardId: number;
  boardName: string;
  goal: string;
  state: "active" | "closed";
}

export interface SprintIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: "todo" | "in-progress" | "done";
  issueType: string;
  fixVersions: Array<{
    id: string;
    name: string;
    released: boolean;
    releaseDate: string | null;
  }>;
  reporter: { accountId: string; displayName: string } | null;
  sprintId: number;
  url: string;
}

export interface SprintDashboardData {
  sprints: JiraSprint[];
  issuesBySprint: Record<number, SprintIssue[]>;
  fetchedAt: string;
  cacheHit: boolean;
}

// Timesheet Types
export interface TimesheetEntry {
  issueKey: string;
  issueSummary: string;
  projectKey: string;
  timeSpentSeconds: number;
  started: string;
}

export interface ProjectSummary {
  projectName: string;
  seconds: number;
  entries: TimesheetEntry[];
}

export interface UserTimesheet {
  accountId: string;
  displayName: string;
  avatarUrl: string;
  totalSeconds: number;
  byProject: Record<string, ProjectSummary>;
}

export interface TimesheetData {
  users: UserTimesheet[];
  totalSeconds: number;
  fetchedAt: string;
}
