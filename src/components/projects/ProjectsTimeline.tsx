"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { differenceInDays } from "date-fns";
import { RefreshCw, ChevronDown } from "lucide-react";
import { PCEpic, InitiativeGroup, TimeScale } from "@/types";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { getScrollBounds, generateTicks } from "@/lib/utils/date-utils";
import { EPIC_STATUS_CONFIG } from "@/lib/utils/status-config";
import { TimelineHeader } from "@/components/timeline/TimelineHeader";
import { TodayMarker } from "@/components/timeline/TodayMarker";
import {
  EpicTimelineBlock,
  EPIC_BLOCK_HEIGHT,
  EPIC_BLOCK_MARGIN,
} from "./EpicTimelineBlock";
import { EpicDetailPanel } from "./EpicDetailPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectsTimelineProps {
  isRefreshing?: boolean;
}

type EpicStatusFilter = "all" | "todo" | "in-progress" | "done";

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

function getEpicBounds(
  epic: PCEpic,
  dateToPosition: (d: string | null) => number | null,
  pxPerDay: number,
  todayIso: string
): { left: number; endX: number } {
  // Use today as fallback when dates are missing so undated epics are visible
  const effectiveDue = epic.dueDate ?? todayIso;
  const endPos = dateToPosition(effectiveDue) ?? dateToPosition(todayIso) ?? 0;
  let leftPos: number;
  if (epic.startDate) {
    leftPos = dateToPosition(epic.startDate) ?? endPos - 14 * pxPerDay;
  } else {
    leftPos = endPos - 14 * pxPerDay;
  }
  return {
    left: leftPos,
    endX: Math.max(endPos, leftPos + 140),
  };
}

function calculateEpicPositions(
  epics: PCEpic[],
  dateToPosition: (d: string | null) => number | null,
  pxPerDay: number,
  todayIso: string
): Map<string, BlockPos> {
  const positions = new Map<string, BlockPos>();
  const lanes: Array<{ endX: number }> = [];
  const sorted = [...epics].sort(
    (a, b) =>
      getEpicBounds(a, dateToPosition, pxPerDay, todayIso).left -
      getEpicBounds(b, dateToPosition, pxPerDay, todayIso).left
  );

  for (const epic of sorted) {
    const { left, endX } = getEpicBounds(epic, dateToPosition, pxPerDay, todayIso);
    const width = Math.max(endX - left, 140);
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
    positions.set(epic.key, { left, width, laneIndex: assignedLane });
  }
  return positions;
}

function computeGroupLaneHeight(
  epics: PCEpic[],
  dateToPosition: (d: string | null) => number | null,
  pxPerDay: number,
  todayIso: string
): number {
  const positions = calculateEpicPositions(epics, dateToPosition, pxPerDay, todayIso);
  if (positions.size === 0) return EPIC_BLOCK_HEIGHT + 2 * EPIC_BLOCK_MARGIN;
  const maxLane = Math.max(
    0,
    ...Array.from(positions.values()).map((p) => p.laneIndex)
  );
  return (maxLane + 1) * (EPIC_BLOCK_HEIGHT + EPIC_BLOCK_MARGIN) + EPIC_BLOCK_MARGIN;
}

// ─── Initiative Filter Dropdown ───────────────────────────────────────────────

function InitiativeDropdown({
  initiatives,
  selected,
  onChange,
}: {
  initiatives: Array<{ key: string | null; label: string }>;
  selected: string | null;
  onChange: (key: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = initiatives.find((i) => i.key === selected) ?? { label: "Tutti i Progetti" };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xs border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
      >
        {current.label}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] max-w-[320px] rounded-xs border border-border bg-card shadow-lg overflow-hidden">
          <button
            className={`w-full px-3 py-2 text-left text-[11px] font-semibold transition-colors hover:bg-muted ${
              selected === null ? "text-foreground bg-muted/60" : "text-muted-foreground"
            }`}
            onClick={() => { onChange(null); setOpen(false); }}
          >
            Tutti i Progetti
          </button>
          {initiatives.map((i) => (
            <button
              key={i.key ?? "__none__"}
              className={`w-full px-3 py-2 text-left text-[11px] font-semibold transition-colors hover:bg-muted truncate ${
                selected === i.key ? "text-foreground bg-muted/60" : "text-muted-foreground"
              }`}
              onClick={() => { onChange(i.key); setOpen(false); }}
            >
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectsTimeline({ isRefreshing: isRefreshingProp = false }: ProjectsTimelineProps) {
  const { isRefreshing: isRefreshingCtx } = useRefresh();
  const isRefreshing = isRefreshingProp || isRefreshingCtx;
  const [statusFilter, setStatusFilter] = useState<EpicStatusFilter>("in-progress");
  const [initiativeFilter, setInitiativeFilter] = useState<string | null>(null);

  const [groups, setGroups] = useState<InitiativeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    setIsLoading(groups.length === 0);
    setIsFetching(true);
    setError(null);
    fetch("/api/jira/pc-epics")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => setGroups(d.groups ?? []))
      .catch((e) => setError(e.message))
      .finally(() => {
        setIsLoading(false);
        setIsFetching(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  const prevRefreshing = useRef(false);
  useEffect(() => {
    if (prevRefreshing.current && !isRefreshing) {
      setFetchKey((k) => k + 1);
    }
    prevRefreshing.current = isRefreshing;
  }, [isRefreshing]);

  const [viewportWidth, setViewportWidth] = useState(1200);
  const [todayVisible, setTodayVisible] = useState(true);
  const [selectedEpic, setSelectedEpic] = useState<PCEpic | null>(null);

  const handleSelectEpic = (epic: PCEpic) => {
    setSelectedEpic((prev) => (prev?.key === epic.key ? null : epic));
  };

  // Callback ref: re-runs the observer every time the timeline div mounts or unmounts.
  // A plain useRef + [isLoading] dep would let the observer fire with width=0 on unmount
  // (empty-filter state) and never re-attach to the new element on remount.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.contentRect.width > 0) setViewportWidth(e.contentRect.width);
      }
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  }, [containerEl]);

  const {
    scale,
    config,
    scrollOrigin,
    scrollContainerRef,
    dateToPosition,
    changeScale,
    goToToday,
    snapToToday,
    checkTodayVisible,
    today,
  } = useTimelineScale(viewportWidth);

  // When the timeline div remounts after an empty-filter state, viewportWidth hasn't
  // changed so the hook's snap effect is skipped. Force a snap here instead.
  useEffect(() => {
    if (!containerEl) return;
    const id = requestAnimationFrame(() => snapToToday('instant'));
    return () => cancelAnimationFrame(id);
  }, [containerEl]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Build list of available initiatives for dropdown
  const initiatives = useMemo(
    () =>
      groups.map((g) => ({
        key: g.initiativeKey,
        label: g.initiativeSummary,
      })),
    [groups]
  );

  const todayIso = today.toISOString().split("T")[0];

  // Apply filters — no date constraint, all epics are shown (undated ones anchor to today)
  const filteredGroups = useMemo(
    () =>
      groups
        .filter((g) => initiativeFilter === null || g.initiativeKey === initiativeFilter)
        .map((g) => ({
          ...g,
          epics: g.epics.filter((e) => {
            if (statusFilter === "all") return true;
            return e.statusCategory === statusFilter;
          }),
        }))
        .filter((g) => g.epics.length > 0),
    [groups, initiativeFilter, statusFilter]
  );

  // Counts per status across all epics (no date filter)
  const counts = useMemo(() => {
    const flat = groups.flatMap((g) => g.epics);
    return {
      all: flat.length,
      todo: flat.filter((e) => e.statusCategory === "todo").length,
      "in-progress": flat.filter((e) => e.statusCategory === "in-progress").length,
      done: flat.filter((e) => e.statusCategory === "done").length,
    };
  }, [groups]);

  const laneHeights = useMemo(
    () =>
      filteredGroups.map((g) =>
        computeGroupLaneHeight(g.epics, dateToPosition, config.pxPerDay, todayIso)
      ),
    [filteredGroups, dateToPosition, config.pxPerDay, todayIso]
  );

  const gridTicks = useMemo(
    () =>
      generateTicks(scale, scrollOrigin, config.pxPerDay, bounds.min, bounds.max),
    [scale, scrollOrigin, config.pxPerDay, bounds.min, bounds.max]
  );

  const statusOptions: { key: EpicStatusFilter; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "todo", label: `To Do (${counts.todo})` },
    { key: "in-progress", label: `In Progress (${counts["in-progress"]})` },
    { key: "done", label: `Done (${counts.done})` },
  ];

  return (
    <>
      <div className="flex flex-col h-full bg-background w-full">
        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 bg-card flex-shrink-0 flex-wrap gap-3 border-b border-border">
          {/* Left: scale + initiative filter */}
          <div className="flex items-center gap-3 flex-wrap">
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

            {/* Initiative filter */}
            <InitiativeDropdown
              initiatives={initiatives}
              selected={initiativeFilter}
              onChange={setInitiativeFilter}
            />
          </div>

          {/* Right: status filters + today + refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            {statusOptions.map(({ key, label }) => {
              const active = statusFilter === key;
              const cfg = key !== "all" ? EPIC_STATUS_CONFIG[key] : null;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
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

            {isFetching && (
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Updating&hellip;
              </span>
            )}
          </div>
        </div>

        {/* ── States ──────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-muted-foreground animate-pulse text-xs tracking-widest uppercase">
              Fetching epics&hellip;
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

        {!isLoading && !error && filteredGroups.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-muted-foreground text-xs tracking-widest uppercase">
              No epics found
            </span>
          </div>
        )}

        {/* ── Timeline view ───────────────────────────────────────────── */}
        {!isLoading && !error && filteredGroups.length > 0 && (
          <div className="flex flex-1 overflow-hidden">
            {/* Fixed label column */}
            <div className="border-border flex w-48 flex-shrink-0 flex-col border-r">
              <div className="border-border h-10 border-b" />
              <div
                ref={labelsScrollRef}
                className="flex-1 overflow-x-hidden overflow-y-auto"
                style={{ scrollbarWidth: "none" }}
                onScroll={onLabelsScroll}
              >
                {filteredGroups.map((group, i) => (
                  <div
                    key={group.initiativeKey ?? "__none__"}
                    className="hover:bg-muted/50 flex cursor-default flex-col justify-center border-b border-border px-4 py-4 transition-colors"
                    style={{ minHeight: `${laneHeights[i]}px` }}
                  >
                    <span className="text-foreground mb-0.5 break-words text-[12px] font-semibold leading-snug">
                      {group.initiativeSummary}
                    </span>
                    {group.initiativeKey && (
                      <span className="text-muted-foreground text-[10px] font-medium">
                        {group.initiativeKey}
                      </span>
                    )}
                    <span className="text-muted-foreground text-[11px] font-medium tabular-nums mt-0.5">
                      {group.epics.length}{" "}
                      {group.epics.length === 1 ? "epic" : "epics"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline area */}
            <div
              className="flex flex-1 flex-col overflow-hidden"
              ref={setContainerEl}
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
                    {filteredGroups.map((group, i) => {
                      const positions = calculateEpicPositions(
                        group.epics,
                        dateToPosition,
                        config.pxPerDay,
                        todayIso
                      );
                      return (
                        <div
                          key={group.initiativeKey ?? "__none__"}
                          className="relative border-b border-border"
                          style={{ minHeight: `${laneHeights[i]}px` }}
                        >
                          {group.epics.map((epic) => {
                            const pos = positions.get(epic.key);
                            if (!pos) return null;
                            return (
                              <EpicTimelineBlock
                                key={epic.key}
                                epic={epic}
                                left={pos.left}
                                width={pos.width}
                                laneIndex={pos.laneIndex}
                                isSelected={selectedEpic?.key === epic.key}
                                onClick={handleSelectEpic}
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

      {selectedEpic && (
        <EpicDetailPanel
          epic={selectedEpic}
          onClose={() => setSelectedEpic(null)}
        />
      )}
    </>
  );
}
