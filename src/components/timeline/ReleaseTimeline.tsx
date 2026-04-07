"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { differenceInDays } from "date-fns";
import { JiraRelease, ProjectReleases, TimeScale } from "@/types";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { getScrollBounds } from "@/lib/utils/date-utils";
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
import { ReleasePanel } from "./ReleasePanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReleaseTimelineProps {
  isRefreshing?: boolean;
}

type StatusFilter = "all" | "upcoming" | "overdue" | "released";

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
  pxPerDay: number,
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
  pxPerDay: number,
): Map<string, BlockPos> {
  const positions = new Map<string, BlockPos>();
  const lanes: Array<{ endX: number }> = [];

  const withDate = releases.filter((r) => r.releaseDate || r.startDate);
  const sorted = [...withDate].sort((a, b) => {
    const aL = getBlockBounds(a, dateToPosition, pxPerDay).left;
    const bL = getBlockBounds(b, dateToPosition, pxPerDay).left;
    return aL - bL;
  });

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
  pxPerDay: number,
): number {
  const positions = calculateReleasePositions(
    releases,
    dateToPosition,
    pxPerDay,
  );
  if (positions.size === 0) return REL_BLOCK_HEIGHT + 2 * REL_BLOCK_MARGIN;
  const maxLane = Math.max(
    0,
    ...Array.from(positions.values()).map((p) => p.laneIndex),
  );
  return (
    (maxLane + 1) * (REL_BLOCK_HEIGHT + REL_BLOCK_MARGIN) + REL_BLOCK_MARGIN
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReleaseTimeline({
  isRefreshing = false,
}: ReleaseTimelineProps) {
  const [allProjects, setAllProjects] = useState<ProjectReleases[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [fetchKey, setFetchKey] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [todayVisible, setTodayVisible] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState<JiraRelease | null>(
    null,
  );

  const handleSelectRelease = (release: JiraRelease) => {
    setSelectedRelease((prev) => (prev?.id === release.id ? null : release));
  };

  const prevRefreshing = useRef(false);
  useEffect(() => {
    if (prevRefreshing.current && !isRefreshing) {
      setFetchKey((k) => k + 1);
    }
    prevRefreshing.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/jira/releases")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => setAllProjects(d.projects ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchKey]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setViewportWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

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
  }, []);

  const filteredProjects = useMemo(
    () =>
      allProjects
        .map((p) => ({
          ...p,
          releases: p.releases.filter((r) => {
            if (!(r.releaseDate || r.startDate)) return false;
            if (statusFilter === "all") return true;
            return releaseStatusOf(r) === statusFilter;
          }),
        }))
        .filter((p) => p.releases.length > 0),
    [allProjects, statusFilter],
  );

  const counts = useMemo(() => {
    const flat = allProjects.flatMap((p) =>
      p.releases.filter((r) => r.releaseDate || r.startDate),
    );
    return {
      all: flat.length,
      upcoming: flat.filter((r) => releaseStatusOf(r) === "upcoming").length,
      overdue: flat.filter((r) => releaseStatusOf(r) === "overdue").length,
      released: flat.filter((r) => releaseStatusOf(r) === "released").length,
    };
  }, [allProjects]);

  const laneHeights = useMemo(
    () =>
      filteredProjects.map((p) =>
        computeReleaseLaneHeight(p.releases, dateToPosition, config.pxPerDay),
      ),
    [filteredProjects, dateToPosition, config.pxPerDay],
  );

  return (
    <>
      <div className="flex flex-col h-full bg-linear-bg w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-linear-surface flex-shrink-0 flex-wrap gap-3 border-b border-linear-border">
          {/* Scale buttons */}
          <div className="flex gap-1 p-1 rounded-lg bg-linear-bg">
            {SCALES.map((s) => {
              const active = scale === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => changeScale(s.key)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                    active
                      ? "bg-linear-surface text-linear-text"
                      : "bg-transparent text-linear-textSecondary"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Status filters + today button */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "upcoming", "overdue", "released"] as const).map((f) => {
              const active = statusFilter === f;
              const count = counts[f];
              const cfg = f !== "all" ? RELEASE_STATUS_CONFIG[f] : null;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 border ${
                    active
                      ? cfg
                        ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                        : "bg-linear-accent text-white border-linear-accentHover"
                      : "bg-linear-surface text-linear-textSecondary border-linear-border"
                  }`}
                >
                  {f === "all"
                    ? `All (${count})`
                    : `${RELEASE_STATUS_CONFIG[f].label} (${count})`}
                </button>
              );
            })}

            {!todayVisible && (
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 bg-linear-accent text-white border border-linear-accentHover hover:bg-linear-accentHover"
              >
                → Today
              </button>
            )}
          </div>
        </div>

        {/* Loading / Error / Empty */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-widest animate-pulse text-linear-textDim">
              Fetching releases…
            </span>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="p-4 rounded-xl text-sm font-semibold border border-red-300 bg-red-50 text-red-700">
              {error}
            </div>
          </div>
        )}

        {!loading && !error && filteredProjects.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-linear-textDim">
              No releases found
            </span>
          </div>
        )}

        {/* Timeline body */}
        {!loading && !error && filteredProjects.length > 0 && (
          <div className="flex flex-1 overflow-hidden">
            {/* Fixed label column */}
            <div className="w-56 flex-shrink-0 flex flex-col bg-linear-surface border-r border-linear-border">
              <div className="h-10 flex-shrink-0 bg-linear-surface border-b border-linear-border" />
              <div
                ref={labelsScrollRef}
                className="flex-1 overflow-y-auto overflow-x-hidden"
                style={{ scrollbarWidth: "none" }}
                onScroll={onLabelsScroll}
              >
                {filteredProjects.map((project, i) => (
                  <div
                    key={project.projectKey}
                    className="flex flex-col justify-center px-4 py-4 transition-colors cursor-default border-b border-linear-border hover:bg-linear-surfaceHover"
                    style={{ minHeight: `${laneHeights[i]}px` }}
                  >
                    <span className="text-[12px] font-black break-words mb-0.5 text-linear-text">
                      {project.projectName || project.projectKey}
                    </span>
                    <span className="text-[11px] font-medium tabular-nums text-linear-text">
                      {project.releases.length}{" "}
                      {project.releases.length === 1 ? "release" : "releases"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline area */}
            <div
              className="flex-1 flex flex-col overflow-hidden"
              ref={containerRef}
            >
              <div className="flex-shrink-0 bg-linear-surface z-10 border-b border-linear-border">
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
                        config.pxPerDay,
                      );
                      return (
                        <div
                          key={project.projectKey}
                          className="relative border-b border-linear-border"
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
