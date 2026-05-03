"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { differenceInDays } from "date-fns";
import { RefreshCw, GanttChartSquare, LayoutGrid } from "lucide-react";
import { JiraRelease, ProjectReleases, TimeScale } from "@/types";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { getScrollBounds, generateTicks } from "@/lib/utils/date-utils";
import {
  releaseStatusOf,
  RELEASE_STATUS_CONFIG,
} from "@/lib/utils/status-config";
import { TimelineHeader } from "./TimelineHeader";
import { TodayMarker } from "./TodayMarker";
import {
  ReleaseBlock,
  REL_BLOCK_HEIGHT,
  REL_BLOCK_MARGIN,
} from "./ReleaseBlock";
import { ReleaseCardView } from "./ReleaseCardView";
import { ReleasePanel } from "./ReleasePanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReleaseTimelineProps {
  isRefreshing?: boolean;
}

// 'active' = upcoming + overdue combined (default)
type StatusFilter = "active" | "upcoming" | "overdue" | "all" | "released";

const SCALES: { key: TimeScale; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "weeks", label: "Weeks" },
  { key: "months", label: "Months" },
  { key: "quarters", label: "Quarters" },
];

// ─── Lane position calculation ────────────────────────────────────────────────

interface BlockPos {
  left: number;
  width: number;
  laneIndex: number;
}

function getBlockBounds(
  release: JiraRelease,
  dateToPosition: (d: string | null) => number | null,
  pxPerDay: number
): { left: number; endX: number } {
  const endPos = dateToPosition(release.releaseDate);
  let leftPos: number;
  if (release.startDate) {
    leftPos =
      dateToPosition(release.startDate) ??
      (endPos !== null ? endPos - 14 * pxPerDay : 0);
  } else {
    leftPos = endPos !== null ? endPos - 14 * pxPerDay : 0;
  }
  return {
    left: leftPos,
    endX: Math.max(endPos ?? leftPos + 120, leftPos + 120),
  };
}

function calculateReleasePositions(
  releases: JiraRelease[],
  dateToPosition: (d: string | null) => number | null,
  pxPerDay: number
): Map<string, BlockPos> {
  const positions = new Map<string, BlockPos>();
  const lanes: Array<{ endX: number }> = [];
  const withDate = releases.filter((r) => r.releaseDate || r.startDate);
  const sorted = [...withDate].sort(
    (a, b) =>
      getBlockBounds(a, dateToPosition, pxPerDay).left -
      getBlockBounds(b, dateToPosition, pxPerDay).left
  );

  for (const release of sorted) {
    const { left, endX } = getBlockBounds(release, dateToPosition, pxPerDay);
    const width = Math.max(endX - left, 120);
    let assignedLane = 0;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].endX <= left - 12) {
        assignedLane = i;
        break;
      }
      assignedLane = i + 1;
    }
    while (lanes.length <= assignedLane) lanes.push({ endX: 0 });
    lanes[assignedLane].endX = left + width;
    positions.set(release.id, { left, width, laneIndex: assignedLane });
  }
  return positions;
}

function computeReleaseLaneHeight(
  releases: JiraRelease[],
  dateToPosition: (d: string | null) => number | null,
  pxPerDay: number
): number {
  const positions = calculateReleasePositions(
    releases,
    dateToPosition,
    pxPerDay
  );
  if (positions.size === 0) return REL_BLOCK_HEIGHT + 2 * REL_BLOCK_MARGIN;
  const maxLane = Math.max(
    0,
    ...Array.from(positions.values()).map((p) => p.laneIndex)
  );
  return (
    (maxLane + 1) * (REL_BLOCK_HEIGHT + REL_BLOCK_MARGIN) + REL_BLOCK_MARGIN
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReleaseTimeline({ isRefreshing = false }: ReleaseTimelineProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [viewMode, setViewMode] = useState<"timeline" | "cards">("timeline");

  // Single data source — API returns all releases; filtering is client-side
  const [projects, setProjects] = useState<ProjectReleases[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    setIsLoading(projects.length === 0);
    setIsFetching(true);
    setError(null);
    fetch("/api/jira/releases")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => setProjects(d.projects ?? []))
      .catch((e) => setError(e.message))
      .finally(() => {
        setIsLoading(false);
        setIsFetching(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  // Re-fetch on external refresh signal
  const prevRefreshing = useRef(false);
  useEffect(() => {
    if (prevRefreshing.current && !isRefreshing) {
      setFetchKey((k) => k + 1);
    }
    prevRefreshing.current = isRefreshing;
  }, [isRefreshing]);

  const handleRefresh = () => {
    setFetchKey((k) => k + 1);
  };

  // Use projects for all filter states
  const mergedProjects = projects;

  const [viewportWidth, setViewportWidth] = useState(1200);
  const [todayVisible, setTodayVisible] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState<JiraRelease | null>(
    null
  );

  const handleSelectRelease = (release: JiraRelease) => {
    setSelectedRelease((prev) => (prev?.id === release.id ? null : release));
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setViewportWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading]);

  const {
    scale,
    config,
    scrollOrigin,
    scrollContainerRef,
    dateToPosition,
    changeScale,
    goToToday,
    checkTodayVisible,
    today,
  } = useTimelineScale(viewportWidth);

  const bounds = getScrollBounds(scale, today);
  const totalScrollDays = differenceInDays(bounds.max, bounds.min) + 1;
  const totalTimelineWidth = totalScrollDays * config.pxPerDay;

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const labelsScrollRef = useRef<HTMLDivElement>(null);

  const onContentScroll = useCallback(() => {
    const c = scrollContainerRef.current;
    if (c && headerScrollRef.current)
      headerScrollRef.current.scrollLeft = c.scrollLeft;
    if (c && labelsScrollRef.current)
      labelsScrollRef.current.scrollTop = c.scrollTop;
    setTodayVisible(checkTodayVisible());
  }, [checkTodayVisible, scrollContainerRef]);

  const onLabelsScroll = useCallback(() => {
    const l = labelsScrollRef.current;
    if (l && scrollContainerRef.current)
      scrollContainerRef.current.scrollTop = l.scrollTop;
  }, [scrollContainerRef]);

  const filteredProjects = useMemo(
    () =>
      mergedProjects
        .map((p) => ({
          ...p,
          releases: p.releases.filter((r) => {
            if (!(r.releaseDate || r.startDate)) return false;
            const s = releaseStatusOf(r);
            if (statusFilter === "all") return true;
            if (statusFilter === "active")
              return s === "upcoming" || s === "overdue";
            return s === statusFilter;
          }),
        }))
        .filter((p) => p.releases.length > 0),
    [mergedProjects, statusFilter]
  );

  // Counts from all available data
  const counts = useMemo(() => {
    const flat = projects.flatMap((p) =>
      p.releases.filter((r) => r.releaseDate || r.startDate)
    );
    const upcoming = flat.filter((r) => releaseStatusOf(r) === "upcoming").length;
    const overdue = flat.filter((r) => releaseStatusOf(r) === "overdue").length;
    const released = flat.filter((r) => releaseStatusOf(r) === "released").length;
    return {
      active: upcoming + overdue,
      upcoming,
      overdue,
      released,
      all: flat.length,
    };
  }, [projects]);

  const laneHeights = useMemo(
    () =>
      filteredProjects.map((p) =>
        computeReleaseLaneHeight(p.releases, dateToPosition, config.pxPerDay)
      ),
    [filteredProjects, dateToPosition, config.pxPerDay]
  );

  const gridTicks = useMemo(
    () =>
      generateTicks(scale, scrollOrigin, config.pxPerDay, bounds.min, bounds.max),
    [scale, scrollOrigin, config.pxPerDay, bounds.min, bounds.max]
  );

  return (
    <>
      <div className="flex flex-col h-full bg-background w-full">
        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 bg-card flex-shrink-0 flex-wrap gap-3 border-b border-border">
          {/* Left: scale + view-mode toggle */}
          <div className="flex items-center gap-3">
            {/* Scale buttons */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted">
              {SCALES.map((s) => {
                const active = scale === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => changeScale(s.key)}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* View-mode toggle */}
            <div className="flex gap-0.5 p-1 rounded-lg bg-muted">
              <button
                onClick={() => setViewMode("timeline")}
                title="Timeline view"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                  viewMode === "timeline"
                    ? "bg-card text-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <GanttChartSquare className="h-3.5 w-3.5" />
                Timeline
              </button>
              <button
                onClick={() => setViewMode("cards")}
                title="Cards view"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                  viewMode === "cards"
                    ? "bg-card text-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
            </div>
          </div>

          {/* Right: status filters + today + refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            {(
              [
                "active",
                "upcoming",
                "overdue",
                "released",
                "all",
              ] as const
            ).map((f) => {
              const active = statusFilter === f;
              const count = counts[f];
              const cfg =
                f !== "active" && f !== "all"
                  ? RELEASE_STATUS_CONFIG[f]
                  : null;

              const label =
                f === "active"
                  ? `Active (${counts.active})`
                  : f === "all"
                  ? `All (${count === null ? "…" : count})`
                  : `${RELEASE_STATUS_CONFIG[f].label} (${count === null ? "…" : count})`;

              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className="rounded-xs border px-3 py-1.5 text-[11px] font-semibold transition-all duration-150"
                  style={
                    active
                      ? cfg
                        ? {
                            backgroundColor: cfg.pillBg,
                            color: cfg.pillText,
                            borderColor: cfg.pillBorder,
                          }
                        : {
                            backgroundColor: "hsl(var(--primary))",
                            color: "hsl(var(--primary-foreground))",
                            borderColor: "hsl(var(--primary))",
                          }
                      : {
                          backgroundColor: "transparent",
                          color: "hsl(var(--muted-foreground))",
                          borderColor: "hsl(var(--border))",
                        }
                  }
                >
                  {label}
                </button>
              );
            })}

            {!todayVisible && (
              <button
                onClick={goToToday}
                className="rounded-xs border border-violet-600 bg-violet-500 px-3 py-1.5 text-[11px] text-white transition-all duration-150 hover:bg-violet-600"
              >
                → Today
              </button>
            )}

            <div className="ml-1 flex items-center gap-2">
              {isFetching ? (
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Updating&hellip;
                </span>
              ) : null}
              <button
                onClick={handleRefresh}
                disabled={isFetching || isLoading}
                className="border-border bg-card hover:bg-muted flex h-7 w-7 items-center justify-center rounded-xs border transition-colors disabled:opacity-50"
                aria-label="Refresh releases"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ── States ──────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-muted-foreground animate-pulse text-xs tracking-widest uppercase">
              Fetching releases&hellip;
            </span>
          </div>
        )}

        {error && (
          <div className="flex flex-1 items-center justify-center px-8">
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xs border p-4 text-sm font-semibold">
              {error}
            </div>
          </div>
        )}

        {!isLoading && !error && filteredProjects.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-muted-foreground text-xs tracking-widest uppercase">
              No releases found
            </span>
          </div>
        )}

        {/* ── Card view ───────────────────────────────────────────────── */}
        {!isLoading && !error && filteredProjects.length > 0 && viewMode === "cards" && (
          <ReleaseCardView
            projects={filteredProjects}
            selectedRelease={selectedRelease}
            onSelectRelease={handleSelectRelease}
          />
        )}

        {/* ── Timeline view ───────────────────────────────────────────── */}
        {!isLoading && !error && filteredProjects.length > 0 && viewMode === "timeline" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Fixed label column */}
            <div className="border-border flex w-32 flex-shrink-0 flex-col border-r">
              <div className="border-border h-10 border-b" />
              <div
                ref={labelsScrollRef}
                className="flex-1 overflow-x-hidden overflow-y-auto"
                style={{ scrollbarWidth: "none" }}
                onScroll={onLabelsScroll}
              >
                {filteredProjects.map((project, i) => (
                  <div
                    key={project.projectKey}
                    className="hover:bg-muted/50 flex cursor-default flex-col justify-center border-b border-border px-4 py-4 transition-colors"
                    style={{ minHeight: `${laneHeights[i]}px` }}
                  >
                    <span className="text-foreground mb-0.5 break-words text-[12px]">
                      {project.projectName || project.projectKey}
                    </span>
                    <span className="text-muted-foreground text-[11px] font-medium tabular-nums">
                      {project.releases.length}{" "}
                      {project.releases.length === 1 ? "release" : "releases"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline area */}
            <div
              className="flex flex-1 flex-col overflow-hidden"
              ref={containerRef}
            >
              <div className="bg-card border-border z-10 shrink-0 border-b">
                <div
                  className="overflow-hidden"
                  ref={headerScrollRef}
                  style={{ pointerEvents: "none" }}
                >
                  <TimelineHeader
                    scale={scale}
                    scrollOrigin={scrollOrigin}
                    pxPerDay={config.pxPerDay}
                    rangeStart={bounds.min}
                    rangeEnd={bounds.max}
                    totalWidth={totalTimelineWidth}
                  />
                </div>
              </div>

              <div
                className="flex-1 overflow-auto"
                ref={scrollContainerRef}
                onScroll={onContentScroll}
              >
                <div
                  className="relative"
                  style={{ width: `${totalTimelineWidth}px` }}
                >
                  {/* Grid lines */}
                  {gridTicks.map((tick, idx) => (
                    <div
                      key={idx}
                      className="pointer-events-none absolute top-0 bottom-0 border-l border-border/40"
                      style={{ left: `${tick.leftPx}px` }}
                    />
                  ))}
                  <TodayMarker
                    scrollOrigin={scrollOrigin}
                    pxPerDay={config.pxPerDay}
                    today={today}
                  />
                  <div className="flex flex-col">
                    {filteredProjects.map((project, i) => {
                      const positions = calculateReleasePositions(
                        project.releases,
                        dateToPosition,
                        config.pxPerDay
                      );
                      return (
                        <div
                          key={project.projectKey}
                          className="relative border-b border-border"
                          style={{ minHeight: `${laneHeights[i]}px` }}
                        >
                          {project.releases.map((release) => {
                            const pos = positions.get(release.id);
                            if (!pos) return null;
                            return (
                              <ReleaseBlock
                                key={release.id}
                                release={release}
                                left={pos.left}
                                width={pos.width}
                                laneIndex={pos.laneIndex}
                                isSelected={selectedRelease?.id === release.id}
                                onClick={handleSelectRelease}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedRelease && (
        <ReleasePanel
          release={selectedRelease}
          onClose={() => setSelectedRelease(null)}
        />
      )}
    </>
  );
}
