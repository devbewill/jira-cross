# Timeline Architecture & Jira Integration

This document explains the design and implementation logic of the horizontal swimlane timeline (Gantt-style view), the Jira API integration layer, and the Releases overlay — so any part can be ported to a new project.

---

## Part 1 — Timeline Architecture

### Overview

The timeline is a horizontal Gantt-style view that renders Jira Epics as colored blocks across a scrollable canvas. It supports four discrete zoom scales and automatically snaps to today on mount and on every scale change.

### Scales

Four named scales are available, each with a fixed visible window:

| Scale      | Visible window              | Tick unit  |
|------------|-----------------------------|------------|
| `today`    | prev week → next week       | Days       |
| `weeks`    | −2 weeks → +3 weeks         | Days       |
| `months`   | −2 months → +3 months       | Months     |
| `quarters` | −1 quarter → +3 quarters    | Quarters   |

Scroll bounds are wider than the visible window so the user can pan. They are computed in `src/lib/utils/date-utils.ts → getScrollBounds(scale, today)`.

### Coordinate System

Every pixel position is relative to a single **scroll origin**, which is the minimum date of the scroll bounds for the current scale:

```
scrollOrigin = getScrollBounds(scale, today).min
```

Converting a date to a pixel offset:
```
pixelX = differenceInDays(date, scrollOrigin) * pxPerDay
```

`pxPerDay` is derived dynamically — never hardcoded:
```
pxPerDay = viewportWidth / visibleDays
```

where `viewportWidth` is the width of the **timeline-only area** (excluding the fixed label column on the left), and `visibleDays` is the number of days in the visible window for the current scale.

This means `pxPerDay` changes whenever the viewport is resized. All components receive `pxPerDay` and `scrollOrigin` as props so they all share the same coordinate space.

### Key Files

```
src/
  types/index.ts                     — Epic, StoryStats, Story, JiraRelease, ProjectReleases, TimeScale, TimelineConfig …
  lib/utils/date-utils.ts            — All date/position math (pure functions)
  hooks/useTimelineScale.ts          — React hook: manages scale state + scroll snap
  components/timeline/
    TimelineContainer.tsx            — Root component: layout, scroll sync, scale buttons
    TimelineHeader.tsx               — Date ruler (ticks)
    SwimLane.tsx                     — One row per board, renders EpicBlocks
    EpicBlock.tsx                    — Epic bar: per-story segments + tooltip trigger
    EpicTooltip.tsx                  — Floating tooltip (portal, light theme, viewport-aware)
    TodayMarker.tsx                  — Red vertical line at today
    StoryPanel.tsx                   — Slide-in right panel listing user stories for an epic
  components/layout/
    Header.tsx                       — App header: title, cache badge, Sync Jira + Status Rilasci buttons
    ReleasesOverlay.tsx              — Fullscreen releases overlay with search, project filter, status pills
  lib/jira/
    client.ts                        — JiraClient: searchIssues, getStoryStatsByEpic
    queries.ts                       — JQL constants
    mapper.ts                        — Maps raw Jira issues → Epic / BoardData
    types.ts                         — Raw Jira API response types
  lib/cache/
    memory-cache.ts                  — In-memory TTL cache (epicsCache + releasesCache)
  app/api/jira/
    epics/route.ts                   — GET /api/jira/epics
    stories/route.ts                 — GET /api/jira/stories?epicKey=XXX
    releases/route.ts                — GET /api/jira/releases
    refresh/route.ts                 — POST /api/jira/refresh (busts both caches)
```

### `date-utils.ts` — Pure Functions

- `getScrollBounds(scale, today)` → `{ min: Date, max: Date }` — hard limits for scrolling
- `getVisibleRange(scale, today)` → `{ start: Date, end: Date }` — initial visible window
- `getPxPerDay(scale, viewportWidth, today)` → `number`
- `buildTimelineConfig(scale, viewportWidth, today)` → `TimelineConfig`
- `dateToPixels(date, scrollOrigin, pxPerDay)` → `number`
- `getScrollLeftForToday(scale, viewportWidth, scrollOrigin, today)` → `number`
- `clampScrollLeft(scrollLeft, ...)` → clamped value within scroll bounds
- `isTodayVisible(scrollLeft, viewportWidth, scrollOrigin, pxPerDay, today)` → `boolean`
- `generateTicks(scale, scrollOrigin, pxPerDay, rangeStart, rangeEnd)` → `TickLabel[]`

### `useTimelineScale` Hook

```typescript
const { scale, config, scrollOrigin, scrollContainerRef,
        dateToPosition, changeScale, goToToday,
        checkTodayVisible, today } = useTimelineScale(viewportWidth);
```

- `today` is stabilized with `useMemo(() => startOfDay(new Date()), [])` to avoid millisecond drift breaking `differenceInDays`.
- `scrollOrigin` is `useMemo`-computed from `getScrollBounds(scale, today).min`.
- A snap effect fires on mount and on every `scale` or `viewportWidth` change, using a `snapKey = \`${scale}-${viewportWidth}\`` guard so it only fires once per unique combination.
- The snap is deferred with `requestAnimationFrame` so the DOM has finished measuring before setting `scrollLeft`.
- `viewportWidth` must be passed in as the **effective timeline width** (just the scrollable panel, not the full page).

### Layout Structure

The layout uses two separate DOM columns to avoid z-index / stacking-context conflicts:

```
┌────────────────────────────────────────────────────────┐
│  Scale buttons (Today / Weeks / Months / Quarters)     │
│  [Go to Today] (shown only when marker is off-screen)  │
├──────────────┬─────────────────────────────────────────┤
│              │  [Fixed date header — synced scrollLeft] │
│  Fixed label │─────────────────────────────────────────│
│  column      │  [Scrollable timeline content]          │
│  (w-56)      │    TodayMarker                          │
│              │    SwimLane × N boards                  │
└──────────────┴─────────────────────────────────────────┘
```

**Why a separate label column?**
Keeping board labels inside the scrollable area (as `position: sticky`) causes z-index bugs in Chrome: `transition-all` on epic blocks promotes them to compositor layers that paint above sticky elements regardless of z-index. Placing the labels in a completely separate DOM tree sidesteps the problem — no stacking context comparison is needed.

**Scroll sync** uses three refs:
- `scrollContainerRef` — the main scrollable content panel
- `headerScrollRef` — the date header (synced via `scrollLeft`)
- `labelsScrollRef` — the label column (synced via `scrollTop`, `scrollbarWidth: none`)

### Row Height Sync

`computeSwimLaneHeight(epics, dateToPosition): number` (exported from `SwimLane.tsx`) is a pure function that calculates how tall a swimlane row needs to be based on how many parallel lanes its epics occupy. It is called once in `TimelineContainer` via `useMemo` and the result is passed to both the label column row and the SwimLane timeline row so they always match.

The formula uses constants exported from `EpicBlock.tsx`:
```typescript
// EpicBlock.tsx
export const BLOCK_HEIGHT = 56;  // INFO_HEIGHT(22) + GAP(4) + BAR_H(32)
export const BLOCK_MARGIN = 14;

// SwimLane.tsx
return (maxLaneIndex + 1) * (BLOCK_HEIGHT + BLOCK_MARGIN) + BLOCK_MARGIN;
```

Changing `BLOCK_HEIGHT` in one place automatically updates both the rendering and the row height calculation.

### Epic Block Visual Structure

Each epic renders as a two-part unit:

```
EPIC SUMMARY IN UPPERCASE          ● 3  ● 4  ○ 5   ← info row (22px, no border)
┌──────────────────────────────────────────────────┐
│ KEY-123                              Mar 21       │ ← bar (32px, segments + border)
└──────────────────────────────────────────────────┘
```

**Info row** (above the bar, no border): summary text + story status counters (dots + numbers), both left-aligned. The summary truncates before the counters overflow.

**Bar** (the bordered block): contains only the epic key badge and due date. The background is divided into **N equal segments**, one per user story, colored by status. This is implemented as absolutely-positioned flex children (`flex: 1`) behind the content (`z-index: 10`):

```typescript
// buildSegments expands StoryStats into a flat color array
function buildSegments(stats: StoryStats): string[] {
  const segs: string[] = [];
  for (let i = 0; i < stats.done;       i++) segs.push(DOT_DONE);        // #57e51e
  for (let i = 0; i < stats.inProgress; i++) segs.push(DOT_IN_PROGRESS); // rgb(255,157,225)
  for (let i = 0; i < stats.todo;       i++) segs.push(DOT_TODO);        // #f0f0f0
  return segs;
}
```

A `0.5px` gap with a black container background creates a hairline black divider between every segment.

When `storyStats` is absent the bar falls back to the solid status colour from `getStatusColor()`.

### Status Color Constants

Defined and exported from `EpicBlock.tsx` so they are shared automatically with `EpicTooltip` and `StoryPanel`:

```typescript
export const DOT_DONE        = "#57e51e";           // bright green
export const DOT_IN_PROGRESS = "rgb(255, 157, 225)"; // light pink
export const DOT_TODO        = "#f0f0f0";            // near-white light gray
```

All dots in the UI (timeline info row, tooltip, story panel) are `10×10px` circles with `border: 1px solid #111`.

### Epic Lane Assignment

Epics are sorted by start date. A greedy algorithm assigns each epic to the first lane where its start position doesn't overlap the previous epic's end position (with a 12px gap). This produces compact horizontal stacking without collisions.

### Tooltip

Tooltips use `createPortal(tooltip, document.body)` so they escape all stacking contexts and always render on top of everything (including the date header). A `mounted` state flag (set in `useEffect`) is used instead of `typeof document !== 'undefined'` to avoid SSR hydration mismatches:

```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

{tooltipPos && mounted && createPortal(
  <EpicTooltip epic={epic} x={tooltipPos.x} y={tooltipPos.y} />,
  document.body
)}
```

The tooltip follows the cursor via `onMouseMove` (using `e.clientX / e.clientY`) rather than anchoring to the block center. This keeps the tooltip on-screen even when the epic is wider than the viewport.

**Viewport-aware positioning** (`EpicTooltip.tsx`): after the first render, `useLayoutEffect` measures the actual rendered size with `getBoundingClientRect()` and computes the final position — flipping below the cursor when `y - height - 16 < 8px` (not enough space above), and clamping horizontally within 8px of the viewport edges. The tooltip starts as `visibility: hidden` to prevent a flash of wrong position.

The tooltip is **light-themed**: white background, `3px solid #111` border, `6px 6px 0 #111` flat offset shadow. It includes a story stats mini bar (solid segments, same colors as DOT_*) and counts row.

### Story Panel

Clicking an epic opens a fixed right-side drawer (`StoryPanel`) that fetches and lists all user stories for that epic:

```
GET /api/jira/stories?epicKey=PROJ-42
→ JQL: parent = PROJ-42 ORDER BY status ASC, created ASC
```

The panel is **light-themed** (white bg, 3px solid black left border) and includes:
- Epic key badge + summary in the header
- Story stats mini bar + counts
- Scrollable list: status dot + key + summary + status label + assignee avatar per story

Clicking the same epic again, the backdrop, or the ✕ button closes the panel. The toggle logic lives in `TimelineContainer.handleSelectEpic`.

### Today Marker

`TodayMarker` renders a vertical line at:
```
left = differenceInDays(startOfDay(today), startOfDay(scrollOrigin)) * pxPerDay
```

`startOfDay` normalization on both sides prevents fractional-day errors from `differenceInDays`.

---

## Part 2 — Jira API Integration

### Environment Variables

Create a `.env.local` file (never commit this file) with:

```
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
JIRA_CACHE_TTL=86400   # optional, seconds — defaults to 300 (5 min); set to 86400 for 24h
```

### How to Get a Jira API Token

1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Give it a label (e.g. `jira-cross-dev`)
4. Copy the token immediately — it is shown only once
5. Use your Atlassian account email as `JIRA_EMAIL` and the token as `JIRA_API_TOKEN`

The token is used to build a Basic Auth header:
```typescript
Buffer.from(`${email}:${apiToken}`).toString('base64')
// → Authorization: Basic <base64>
```

### API Endpoints Used

All queries go through **Jira REST API v3**.

#### Epics — `GET /api/jira/epics`

1. Validates env vars, returns cached data if available.
2. Calls `POST /rest/api/3/search/jql` with:
   ```json
   {
     "jql": "issuetype = Epic AND labels = P0 ORDER BY created DESC",
     "fields": ["summary","status","assignee","customfield_10015","customfield_10016","duedate","parent","project"]
   }
   ```
3. Maps issues → `Epic[]` via `mapJiraIssueToEpic()`.
4. Calls `getStoryStatsByEpic(epicKeys)` — **a single extra JQL query** — to get story counts per epic.
5. Attaches `storyStats` to each epic.
6. Groups by board with `groupEpicsByBoard()`, caches, returns `{ boards, fetchedAt, cacheHit }`.

#### Story Stats — `getStoryStatsByEpic(epicKeys)`

Fetches all child issues for all epics **in one query** to avoid N+1:

```typescript
const jql = `parent in (KEY-1, KEY-2, ...) ORDER BY status`;
// fields: ["status", "parent"]
```

Results are aggregated into a `Map<epicKey, StoryStats>` by reading `fields.status.statusCategory.key`:
- `"done"` → `stats.done++`
- `"indeterminate"` → `stats.inProgress++`
- anything else → `stats.todo++`

Works for both **team-managed** (next-gen) and **company-managed** (classic) Jira projects.

#### Stories — `GET /api/jira/stories?epicKey=PROJ-42`

Fetches individual story titles for the StoryPanel:

```typescript
const jql = `parent = ${epicKey} ORDER BY status ASC, created ASC`;
// fields: ["summary", "status", "assignee", "parent"]
```

Returns `Story[]` with `key`, `summary`, `status`, `statusCategory`, `assignee`.

#### Releases — `GET /api/jira/releases`

Fetches all non-archived versions across every accessible Jira project:

1. **Paginates through all projects** via `GET /rest/api/3/project/search` (100 per page, loops until `isLast: true`). Projects that don't appear in the search but are still accessible (e.g. due to Jira permission model differences) are fetched directly by key as a fallback.
2. For each project, calls `GET /rest/api/3/project/{key}/versions` in **parallel** via `Promise.all`.
3. Filters out archived versions (`archived: true`).
4. Computes `overdue` locally: `!released && releaseDate < today` (uses Jira's `overdue` flag if present, falls back to local computation).
5. Skips projects with no active versions.
6. Returns `{ projects: ProjectReleases[], fetchedAt, cacheHit }`.

Release status classification:
- `released` → `r.released === true`
- `overdue` → `r.overdue === true && !r.released`
- `upcoming` → everything else

### Custom Fields

| Field ID            | Meaning               | Notes                                    |
|---------------------|-----------------------|------------------------------------------|
| `customfield_10015` | Start date            | Jira's built-in "Epic Start Date" field  |
| `customfield_10016` | Story points          | May vary by Jira instance                |
| `duedate`           | Due date              | Standard Jira field                      |

> To discover your field IDs call `GET /rest/api/3/field` — `JiraClient.getFields()` does this.

### Data Types

```typescript
interface StoryStats {
  done: number;
  inProgress: number;
  todo: number;
  total: number;
}

interface Epic {
  key: string;           // "PROJ-42"
  boardKey: string;      // "PROJ"
  summary: string;
  startDate: string | null;
  dueDate: string | null;
  status: string;
  statusCategory: 'todo' | 'in-progress' | 'done';
  assignee: { displayName: string; avatarUrl: string } | null;
  storyPoints: number | null;
  url: string;
  storyStats?: StoryStats;  // attached after the child-issues query
}

interface Story {
  key: string;
  epicKey: string;
  summary: string;
  status: string;
  statusCategory: 'todo' | 'in-progress' | 'done';
  assignee: { displayName: string; avatarUrl: string } | null;
}

interface JiraRelease {
  id: string;
  name: string;
  description: string;
  startDate: string | null;
  releaseDate: string | null;
  released: boolean;
  archived: boolean;
  overdue: boolean;
  projectKey: string;
  projectName: string;
}

interface ProjectReleases {
  projectKey: string;
  projectName: string;
  releases: JiraRelease[];
}
```

### Pagination

#### Issue search — `/search/jql` cursor-based pagination

`/rest/api/3/search` was removed by Atlassian (410 Gone). The only supported endpoint is `/rest/api/3/search/jql`, which uses **cursor-based pagination** via `nextPageToken` — `startAt` is silently ignored and always returns the first page.

The client paginates automatically up to 1000 results (`MAX_RESULTS`), fetching 50 issues per page:

```typescript
let nextPageToken: string | undefined = undefined;
while (hasMore && allIssues.length < MAX_RESULTS) {
  const payload = { jql, maxResults: 50, ...(nextPageToken && { nextPageToken }) };
  const response = await POST('/search/jql', payload);
  allIssues.push(...response.issues);
  if (response.isLast || !response.nextPageToken) {
    hasMore = false;
  } else {
    nextPageToken = response.nextPageToken;
  }
}
```

> **Important**: using `?startAt=N` on `/search/jql` is silently ignored — the API always returns the first page. This caused a subtle bug where story stats were truncated to the first 50 results when a large epic (e.g. 34+ stories) was included, making `done` counts appear as 0 for all epics.

The releases route paginates project discovery via `GET /rest/api/3/project/search` (100 per page) until `isLast: true`.

### In-Memory Cache

`MemoryCache<T>` (`src/lib/cache/memory-cache.ts`) is a simple TTL cache backed by a `Map` in the Node.js process. It resets on server restart.

Two global instances are exported:

| Instance        | Cache key               | Populated by                 |
|-----------------|-------------------------|------------------------------|
| `epicsCache`    | `epics:global-p0`       | `GET /api/jira/epics`        |
| `releasesCache` | `releases:all-projects` | `GET /api/jira/releases`     |

TTL is configured via `JIRA_CACHE_TTL` (default 300 s, recommended 86400 for 24 h).

`POST /api/jira/refresh` clears **both** caches simultaneously. Responses include `cacheHit: boolean` to indicate whether data came from cache or a live Jira fetch.

#### `globalThis` singleton pattern (dev mode)

In Next.js development mode, hot module reloading can create multiple instances of a module, meaning `epicsCache` in `refresh/route.ts` and `epics/route.ts` could be different objects — so clearing one would not affect the other. To prevent this, the cache instances are anchored to `globalThis`:

```typescript
const g = globalThis as typeof globalThis & {
  __epicsCache?: MemoryCache<EpicsApiResponse>;
};
if (!g.__epicsCache) g.__epicsCache = new MemoryCache(TTL_MS);
export const epicsCache = g.__epicsCache;
```

This ensures a single cache instance survives hot reloads across all route handlers.

---

## Part 3 — Releases Overlay

### Overview

Clicking **"◈ Status Rilasci"** in the header opens a fullscreen overlay (`ReleasesOverlay`) showing all Jira releases grouped by project.

### UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Release Status   [search…] [All projects ▼] | All Upcoming …  ✕ │  ← header bar
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ■ PROJ  Project Name  N releases                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ v1.0     │ │ v1.1     │ │ v2.0     │ …                      │
│  │ RELEASED │ │ OVERDUE  │ │ UPCOMING │                         │
│  └──────────┘ └──────────┘ └──────────┘                         │
│                                                                  │
│  ■ OTHER  Other Project  …                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Filters (combinable)

| Control          | Behaviour                                                        |
|------------------|------------------------------------------------------------------|
| Search input     | Case-insensitive match on release name, updates in real time     |
| Project dropdown | Shows all projects sorted A–Z; selecting one hides all others   |
| Status pills     | All / Upcoming / Overdue / Released — counts reflect raw totals |

All three filters are applied together via `useMemo` on the `filtered` array.

### Release Card

Each release shows: name, status badge, description (if any), start/release dates grid, and a countdown chip:
- **Upcoming**: `Xd to release` / `Due today`
- **Overdue**: `Xd overdue` (red chip)
- **Released**: no chip

### Status Colors

| Status   | Background          | Border     |
|----------|---------------------|------------|
| Released | `#57e51e`           | `#3aad14`  |
| Overdue  | `#FF2D55`           | `#cc0033`  |
| Upcoming | `rgb(255,157,225)`  | `#e060a0`  |

### Closing

- Click the **✕** button
- Press **Escape**

---

## Porting Checklist

To reuse this in a new project:

- [ ] Copy `src/lib/utils/date-utils.ts` and `src/hooks/useTimelineScale.ts` — zero Jira dependency, pure timeline logic
- [ ] Copy the `src/components/timeline/` folder
- [ ] Adapt `Epic`, `StoryStats`, `Story`, `BoardData`, `JiraRelease`, `ProjectReleases` types in `src/types/index.ts` to your data model
- [ ] Replace `src/lib/jira/` with your own data-fetching layer that produces `BoardData[]` with optional `storyStats` on each epic
- [ ] Set up the three env vars for Jira; set `JIRA_CACHE_TTL=86400` for 24h caching
- [ ] Verify your Jira instance's custom field IDs with `GET /rest/api/3/field`
- [ ] Adjust the JQL in `src/lib/jira/queries.ts` to match your epic labeling strategy
- [ ] If you use `parent in (...)` for story stats and your Jira is classic (not next-gen), you may need `"Epic Link" in (...)` instead
- [ ] If you have more than 100 Jira projects, ensure the releases route pagination loop is intact
