"use client";

import {
  useRef, useState, useEffect, useCallback, useMemo
} from "react";
import { differenceInDays } from "date-fns";
import { JiraRelease, ProjectReleases, TimeScale } from "@/types";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { getScrollBounds } from "@/lib/utils/date-utils";
import { TimelineHeader } from "./TimelineHeader";
import { TodayMarker } from "./TodayMarker";
import {
  ReleaseBlock,
  REL_BLOCK_HEIGHT,
  REL_BLOCK_MARGIN,
  releaseStatusOf,
  RELEASE_STATUS_CFG,
} from "./ReleaseBlock";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReleaseTimelineOverlayProps {
  onClose: () => void;
}

type StatusFilter = "all" | "upcoming" | "overdue" | "released";

// ─── Scale config ─────────────────────────────────────────────────────────────

const SCALES: { key: TimeScale; label: string }[] = [
  { key: "today",    label: "Today"    },
  { key: "weeks",    label: "Weeks"    },
  { key: "months",   label: "Months"   },
  { key: "quarters", label: "Quarters" },
];

// ─── Lane position calculation ────────────────────────────────────────────────

interface BlockPos { left: number; width: number; laneIndex: number }

/** Synthetic start for releases without a startDate: releaseDate - 14 days. */
function getBlockBounds(
  release: JiraRelease,
  dateToPosition: (d: string | null) => number | null,
  pxPerDay: number,
): { left: number; endX: number } {
  const endPos = dateToPosition(release.releaseDate);

  let leftPos: number;
  if (release.startDate) {
    leftPos = dateToPosition(release.startDate) ?? (endPos !== null ? endPos - 14 * pxPerDay : 0);
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
  const sorted   = [...withDate].sort((a, b) => {
    const aL = getBlockBounds(a, dateToPosition, pxPerDay).left;
    const bL = getBlockBounds(b, dateToPosition, pxPerDay).left;
    return aL - bL;
  });

  for (const release of sorted) {
    const { left, endX } = getBlockBounds(release, dateToPosition, pxPerDay);
    const width = Math.max(endX - left, 120);

    let assignedLane = 0;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].endX <= left - 12) { assignedLane = i; break; }
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
  const positions = calculateReleasePositions(releases, dateToPosition, pxPerDay);
  if (positions.size === 0) return REL_BLOCK_HEIGHT + 2 * REL_BLOCK_MARGIN;
  const maxLane = Math.max(0, ...Array.from(positions.values()).map((p) => p.laneIndex));
  return (maxLane + 1) * (REL_BLOCK_HEIGHT + REL_BLOCK_MARGIN) + REL_BLOCK_MARGIN;
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

export function ReleaseTimelineOverlay({ onClose }: ReleaseTimelineOverlayProps) {
  const [allProjects,   setAllProjects]   = useState<ProjectReleases[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("all");
  // Start with a real default so pxPerDay > 0 before the ResizeObserver fires
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [todayVisible,  setTodayVisible]  = useState(true);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch releases — DEBUG: filter to CEF only
  useEffect(() => {
    fetch("/api/jira/releases")
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); })
      .then((d) => setAllProjects(d.projects ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Timeline scale
  const containerRef = useRef<HTMLDivElement>(null);
  // Re-run after loading so the containerRef div is in the DOM
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setViewportWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]); // ← re-run when loading flips to false

  const {
    scale, config, scrollOrigin, scrollContainerRef,
    dateToPosition, changeScale, goToToday, checkTodayVisible, today,
  } = useTimelineScale(viewportWidth);

  const bounds            = getScrollBounds(scale, today);
  const totalScrollDays   = differenceInDays(bounds.max, bounds.min) + 1;
  const totalTimelineWidth = totalScrollDays * config.pxPerDay;

  // Header + label scroll sync refs
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const labelsScrollRef = useRef<HTMLDivElement>(null);

  const onContentScroll = useCallback(() => {
    const c = scrollContainerRef.current;
    if (c && headerScrollRef.current) headerScrollRef.current.scrollLeft = c.scrollLeft;
    if (c && labelsScrollRef.current) labelsScrollRef.current.scrollTop  = c.scrollTop;
    setTodayVisible(checkTodayVisible());
  }, [checkTodayVisible, scrollContainerRef]);

  // ── Filtered projects ──────────────────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    return allProjects
      .map((p) => ({
        ...p,
        releases: p.releases.filter((r) => {
          if (!(r.releaseDate || r.startDate)) return false; // skip undated
          if (statusFilter === "all") return true;
          return releaseStatusOf(r) === statusFilter;
        }),
      }))
      .filter((p) => p.releases.length > 0);
  }, [allProjects, statusFilter]);

  // ── Counts for filter badges ───────────────────────────────────────────────

  const counts = useMemo(() => {
    const flat = allProjects.flatMap((p) => p.releases.filter((r) => r.releaseDate || r.startDate));
    return {
      all:      flat.length,
      upcoming: flat.filter((r) => releaseStatusOf(r) === "upcoming").length,
      overdue:  flat.filter((r) => releaseStatusOf(r) === "overdue").length,
      released: flat.filter((r) => releaseStatusOf(r) === "released").length,
    };
  }, [allProjects]);

  // ── Pre-compute lane heights (for label column row sync) ───────────────────

  const laneHeights = useMemo(
    () => filteredProjects.map((p) =>
      computeReleaseLaneHeight(p.releases, dateToPosition, config.pxPerDay)
    ),
    [filteredProjects, dateToPosition, config.pxPerDay],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ backgroundColor: "#FAFAFA" }}>

      {/* ── Top header bar ──────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-6 py-4 flex-wrap"
        style={{ borderBottom: "3px solid #111", backgroundColor: "#fff" }}
      >
        {/* Title */}
        <div className="flex-shrink-0">
          <h2 className="text-xl font-black uppercase tracking-tight text-[#111]">
            Timeline Rilasci
          </h2>
          <p className="text-[11px] text-[#888] font-medium mt-0.5">
            Tutti i rilasci pianificati, ordinati sulla timeline per data
          </p>
        </div>

        <div className="flex-1" />

        {!loading && !error && (
          <>
            {/* Scale buttons */}
            <div className="flex gap-1">
              {SCALES.map((s) => {
                const active = scale === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => changeScale(s.key)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-[3px] transition-all"
                    style={{
                      border:          "2px solid #111",
                      backgroundColor: active ? "#111" : "#fff",
                      color:           active ? "#fff" : "#111",
                      boxShadow:       active ? "2px 2px 0 #111" : "none",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-6 bg-[#e0e0e0]" />

            {/* Status filters */}
            {(["all", "upcoming", "overdue", "released"] as const).map((f) => {
              const active = statusFilter === f;
              const count  = counts[f];
              const cfg    = f !== "all" ? RELEASE_STATUS_CFG[f] : null;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-[3px] transition-all"
                  style={{
                    border:          `2px solid #111`,
                    backgroundColor: active ? (cfg ? cfg.bg : "#111") : "#fff",
                    color:           active ? (cfg ? cfg.text : "#fff") : "#111",
                    boxShadow:       active ? "2px 2px 0 #111" : "none",
                  }}
                >
                  {f === "all" ? `All (${count})` : `${f} (${count})`}
                </button>
              );
            })}

            <div className="w-px h-6 bg-[#e0e0e0]" />

            {/* Go to today */}
            {!todayVisible && (
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-[3px] transition-all"
                style={{ border: "2px solid #111", backgroundColor: "#111", color: "#fff", boxShadow: "2px 2px 0 #111" }}
              >
                → Today
              </button>
            )}
          </>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-[3px] font-black text-sm"
          style={{ border: "2px solid #111", color: "#111", backgroundColor: "#fff" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#111"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#111"; }}
        >
          ✕
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs font-black uppercase tracking-widest animate-pulse text-[#aaa]">
            Fetching releases…
          </span>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center px-8">
          <div
            className="p-4 rounded-[3px] text-sm font-bold"
            style={{ border: "3px solid #FF2D55", backgroundColor: "#fff0f3", color: "#FF2D55" }}
          >
            {error}
          </div>
        </div>
      )}

      {!loading && !error && filteredProjects.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs font-black uppercase tracking-widest text-[#ccc]">
            No releases found
          </span>
        </div>
      )}

      {!loading && !error && filteredProjects.length > 0 && (
        <div className="flex flex-1 overflow-hidden">

          {/* ── Fixed label column ──────────────────────────────────────────── */}
          <div className="w-56 flex-shrink-0 flex flex-col border-r-2 border-linear-border bg-linear-bg">
            {/* Spacer matching date-header height */}
            <div className="h-10 flex-shrink-0 bg-linear-surface border-b-2 border-linear-border" />

            {/* Project labels — vertically synced */}
            <div
              ref={labelsScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{ scrollbarWidth: "none" }}
            >
              {filteredProjects.map((project, i) => (
                <div
                  key={project.projectKey}
                  className="flex flex-col justify-center px-4 py-4 border-b border-linear-border"
                  style={{ minHeight: `${laneHeights[i]}px` }}
                >
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] self-start mb-1"
                    style={{ backgroundColor: "#111", color: "#fff" }}
                  >
                    {project.projectKey}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-tight text-linear-text break-words leading-snug mb-1">
                    {project.projectName}
                  </span>
                  <span className="text-[10px] text-linear-textDim font-bold tabular-nums">
                    {project.releases.length}{" "}
                    {project.releases.length === 1 ? "release" : "releases"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Timeline area ────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden" ref={containerRef}>

            {/* Fixed date header */}
            <div className="flex-shrink-0 bg-linear-surface border-b-2 border-linear-border z-10">
              <div className="overflow-hidden" ref={headerScrollRef} style={{ pointerEvents: "none" }}>
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

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-auto"
              ref={scrollContainerRef}
              onScroll={onContentScroll}
            >
              <div className="relative" style={{ width: `${totalTimelineWidth}px` }}>
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
                        className="relative border-b border-linear-border/30"
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
  );
}
