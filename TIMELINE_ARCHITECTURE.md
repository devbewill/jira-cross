# Timeline Architecture & Jira Integration

This document explains the design and implementation logic of the horizontal swimlane timeline (Gantt-style view) and the Jira API integration layer, so either can be ported to a new project.

---

## Part 1 — Timeline Architecture

### Overview

The timeline is a horizontal Gantt-style view that renders Jira Epics as colored blocks across a scrollable canvas. It supports four discrete zoom scales and automatically snaps to today on mount and on every scale change.

### Scales

Four named scales are available, each with a fixed visible window:

| Scale      | Visible window         | Tick unit  |
|------------|------------------------|------------|
| `today`    | prev week → next week  | Days       |
| `weeks`    | −2 weeks → +3 weeks    | Days       |
| `months`   | −2 months → +3 months  | Months     |
| `quarters` | −1 quarter → +3 quarters | Quarters |

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

This means the same `pxPerDay` value changes whenever the viewport is resized. All components receive `pxPerDay` and `scrollOrigin` as props so they all share the same coordinate space.

### Key Files

```
src/
  types/index.ts                     — TimeScale, ScaleConfig, TimelineConfig types
  lib/utils/date-utils.ts            — All date/position math (pure functions)
  hooks/useTimelineScale.ts          — React hook: manages scale state + scroll snap
  components/timeline/
    TimelineContainer.tsx            — Root component: layout, scroll sync, scale buttons
    TimelineHeader.tsx               — Date ruler (ticks)
    SwimLane.tsx                     — One row per board, renders EpicBlocks
    EpicBlock.tsx                    — Individual epic bar + tooltip trigger
    EpicTooltip.tsx                  — Floating tooltip (portal)
    TodayMarker.tsx                  — Red vertical line at today
```

### `date-utils.ts` — Pure Functions

- `getScrollBounds(scale, today)` → `{ min: Date, max: Date }` — hard limits for scrolling
- `getVisibleRange(scale, today)` → `{ start: Date, end: Date }` — initial visible window
- `getPxPerDay(scale, viewportWidth, today)` → `number`
- `buildTimelineConfig(scale, viewportWidth, today)` → `TimelineConfig`
- `dateToPixels(date, scrollOrigin, pxPerDay)` → `number`
- `getScrollLeftForToday(scale, viewportWidth, scrollOrigin, today)` → `number` — scroll offset so the visible window starts at the right date
- `clampScrollLeft(scrollLeft, ...)` → clamped value within scroll bounds
- `isTodayVisible(scrollLeft, viewportWidth, scrollOrigin, pxPerDay, today)` → `boolean`
- `generateTicks(scale, scrollOrigin, pxPerDay, rangeStart, rangeEnd)` → `TickLabel[]` — drives the date ruler

### `useTimelineScale` Hook

```typescript
const { scale, config, scrollOrigin, scrollContainerRef,
        dateToPosition, changeScale, goToToday,
        checkTodayVisible, today } = useTimelineScale(viewportWidth);
```

- `today` is stabilized with `useMemo(() => startOfDay(new Date()), [])` to avoid millisecond drift breaking `differenceInDays`.
- `scrollOrigin` is `useMemo`-computed from `getScrollBounds(scale, today).min`.
- A snap effect fires on mount and on every `scale` or `viewportWidth` change, using a `snapKey = \`${scale}-${viewportWidth}\`` guard so it only fires once per unique combination.
- The snap is deferred with `requestAnimationFrame` to ensure the DOM has finished measuring before setting `scrollLeft`.
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
Keeping board labels inside the scrollable area (as `position: sticky`) causes z-index bugs in Chrome: `transition-all` on epic blocks promotes them to compositor layers that paint above sticky elements regardless of z-index. Placing the labels in a completely separate DOM tree sidesteps the problem entirely — no stacking context comparison is needed.

**Scroll sync** uses three refs:
- `scrollContainerRef` — the main scrollable content panel
- `headerScrollRef` — the date header (synced via `scrollLeft`)
- `labelsScrollRef` — the label column (synced via `scrollTop`, `scrollbarWidth: none`)

### Row Height Sync

`computeSwimLaneHeight(epics, dateToPosition): number` (exported from `SwimLane.tsx`) is a pure function that calculates how tall a swimlane row needs to be based on how many parallel lanes its epics occupy. It is called once in `TimelineContainer` via `useMemo`, and the result is passed to both the label column row and the `SwimLane` timeline row so they stay the same height.

### Epic Lane Assignment

Epics are sorted by start date. A greedy algorithm assigns each epic to the first lane where its start position doesn't overlap the previous epic's end position (with a 12px gap). This produces compact horizontal stacking without collisions.

### Tooltip

Tooltips use `createPortal(tooltip, document.body)` so they escape all stacking contexts and always render on top of everything (including the date header):

```typescript
// EpicBlock.tsx
const [tooltipPos, setTooltipPos] = useState<{x: number; y: number} | null>(null);

onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
onMouseLeave={() => setTooltipPos(null)}

{tooltipPos && createPortal(
  <EpicTooltip epic={epic} x={tooltipPos.x} y={tooltipPos.y} />,
  document.body
)}
```

The tooltip uses `position: fixed` with `transform: translate(-50%, -100%)` to appear centered above the cursor. Following the cursor via `onMouseMove` instead of anchoring to the block center ensures the tooltip stays on-screen even when the epic block is wider than the viewport.

### Today Marker

`TodayMarker` renders a red vertical line at:
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
JIRA_CACHE_TTL=300   # optional, seconds — defaults to 300
```

### How to Get a Jira API Token

1. Log in to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Give it a label (e.g. `jira-cross-dev`)
4. Copy the token immediately — it is shown only once
5. Use your Atlassian account email as `JIRA_EMAIL` and the token as `JIRA_API_TOKEN`

The token is used to build a Basic Auth header:
```typescript
Buffer.from(`${email}:${apiToken}`).toString('base64')
// → Authorization: Basic <base64>
```

### API Endpoint Used

All queries go through **Jira REST API v3**:
```
POST https://<JIRA_BASE_URL>/rest/api/3/search/jql?startAt=<offset>
```

Body:
```json
{
  "jql": "issuetype = Epic AND labels = P0 ORDER BY created DESC",
  "maxResults": 50,
  "fields": ["summary", "status", "assignee", "customfield_10015", "customfield_10016", "duedate", ...]
}
```

### JQL Query

```sql
issuetype = Epic AND labels = P0 ORDER BY created DESC
```

This fetches all Epics labeled `P0` across all projects the authenticated user has access to. The `P0` label is used as a cross-project filter — adjust it to match your labeling conventions.

### Custom Fields

| Field ID            | Meaning               | Notes                                    |
|---------------------|-----------------------|------------------------------------------|
| `customfield_10015` | Start date            | Jira's built-in "Epic Start Date" field  |
| `customfield_10016` | Story points / estimate | May vary by Jira instance               |
| `duedate`           | Due date              | Standard Jira field                      |

> **Note:** Custom field IDs (`customfield_XXXXX`) can differ between Jira instances. To discover your field IDs, call `GET /rest/api/3/field` with your credentials — the `JiraClient.getFields()` method does this.

### Pagination

The client paginates automatically up to 1000 results (configurable via `MAX_RESULTS` in `src/lib/jira/queries.ts`), fetching 50 issues per page:

```typescript
while (hasMore && startAt < MAX_RESULTS) {
  // POST /rest/api/3/search/jql?startAt=<n>
  startAt += response.maxResults;
  hasMore = startAt < response.total;
}
```

### In-Memory Cache

API results are cached in memory by `MemoryCache<T>` (`src/lib/cache/memory-cache.ts`) with a TTL defaulting to 300 seconds (configurable via `JIRA_CACHE_TTL`). The cache key is `epics:global-p0`. The cache lives in the Node.js server process — it resets on server restart.

Responses include a `cacheHit: boolean` field so the UI (or logs) can tell whether data came from Jira or the cache.

A manual cache-bust endpoint is available at `POST /api/jira/refresh`.

### Data Mapping

`mapJiraIssueToEpic(issue, boardKey, config)` converts a raw Jira issue into the app's `Epic` type:

```typescript
interface Epic {
  key: string;           // e.g. "PROJ-42"
  boardKey: string;      // project key, e.g. "PROJ"
  summary: string;
  startDate: string | null;   // ISO date from customfield_10015
  dueDate: string | null;     // ISO date from duedate field
  status: string;             // e.g. "In Progress"
  statusCategory: string;     // "todo" | "inprogress" | "done"
  assignee: { displayName: string; avatarUrl: string } | null;
  storyPoints: number | null;
  url: string;                // self link from Jira API
}
```

`groupEpicsByBoard(epics, boardKeys)` then groups them into `BoardData[]` by project key, which maps to a swimlane row.

### Next.js API Route

`GET /api/jira/epics` is the single entrypoint:

1. Validates that all three env vars are present
2. Returns cached data if available
3. Creates a `JiraClient` instance
4. Calls `searchIssues` with the JQL and field list
5. Maps issues → epics → boards via mapper functions
6. Stores result in cache
7. Returns `{ boards, fetchedAt, cacheHit }` as JSON

---

## Porting Checklist

To reuse this in a new project:

- [ ] Copy `src/lib/utils/date-utils.ts` and `src/hooks/useTimelineScale.ts` — zero Jira dependency, pure timeline logic
- [ ] Copy the `src/components/timeline/` folder
- [ ] Adapt `Epic` and `BoardData` types in `src/types/index.ts` to your data model
- [ ] Replace `src/lib/jira/` with your own data-fetching layer that produces `BoardData[]`
- [ ] Set up the three env vars for Jira if needed
- [ ] Verify your Jira instance's custom field IDs with `GET /rest/api/3/field`
- [ ] Adjust the JQL in `src/lib/jira/queries.ts` to match your epic labeling strategy
