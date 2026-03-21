"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { BoardData, Epic, TimeScale } from "@/types";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { getScrollBounds } from "@/lib/utils/date-utils";
import { TimelineHeader } from "./TimelineHeader";
import { SwimLane, computeSwimLaneHeight } from "./SwimLane";
import { TodayMarker } from "./TodayMarker";
import { differenceInDays } from "date-fns";

interface TimelineContainerProps {
  boards: BoardData[];
  selectedEpic: Epic | null;
  onSelectEpic: (epic: Epic) => void;
}

const SCALES: { key: TimeScale; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "weeks", label: "Weeks" },
  { key: "months", label: "Months" },
  { key: "quarters", label: "Quarters" },
];

export function TimelineContainer({
  boards,
  selectedEpic,
  onSelectEpic,
}: TimelineContainerProps) {
  // containerRef wraps only the timeline area (excludes the label column),
  // so viewportWidth = effective timeline width directly.
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [todayVisible, setTodayVisible] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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

  // Scroll bounds → total scrollable width
  const bounds = getScrollBounds(scale, today);
  const totalScrollDays = differenceInDays(bounds.max, bounds.min) + 1;
  const totalTimelineWidth = totalScrollDays * config.pxPerDay;

  // Pre-compute swimlane heights so the label column rows match exactly
  const swimlaneHeights = useMemo(
    () => boards.map((board) => computeSwimLaneHeight(board.epics, dateToPosition)),
    [boards, dateToPosition],
  );

  // Refs for scroll sync
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const labelsScrollRef = useRef<HTMLDivElement>(null);

  const onContentScroll = useCallback(() => {
    const content = scrollContainerRef.current;
    const header = headerScrollRef.current;
    const labels = labelsScrollRef.current;
    if (content && header) header.scrollLeft = content.scrollLeft;
    if (content && labels) labels.scrollTop = content.scrollTop;
    setTodayVisible(checkTodayVisible());
  }, [checkTodayVisible, scrollContainerRef]);

  return (
    <div className="flex flex-col h-full bg-linear-bg w-full">
      {/* Scale Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-linear-border bg-linear-surface flex-shrink-0">
        <div className="flex gap-1">
          {SCALES.map((s) => (
            <button
              key={s.key}
              onClick={() => changeScale(s.key)}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest rounded-[3px] transition-all duration-100 ${
                scale === s.key
                  ? "bg-linear-text text-linear-bg shadow-linear-sm"
                  : "text-linear-textMuted hover:text-linear-text hover:bg-linear-surfaceActive"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {!todayVisible && (
          <button
            onClick={goToToday}
            className="px-3 py-1.5 bg-linear-accent text-white text-xs font-black uppercase tracking-widest rounded-[3px] hover:bg-linear-accentHover transition-colors duration-100 shadow-linear-sm hover:shadow-linear-hover"
          >
            → Today
          </button>
        )}
      </div>

      {/* Main layout: fixed label column + scrollable timeline */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Fixed Label Column ──────────────────────────────────────────
            Lives entirely OUTSIDE the horizontal scroll container.
            No z-index tricks needed — it's a separate DOM subtree.        */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r-2 border-linear-border bg-linear-bg">
          {/* Spacer that matches the date-header height */}
          <div className="h-10 flex-shrink-0 bg-linear-surface border-b-2 border-linear-border" />
          {/* Board labels — synced vertical scroll via labelsScrollRef */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            ref={labelsScrollRef}
            style={{ scrollbarWidth: "none" }}
          >
            {boards.map((board, i) => (
              <div
                key={board.key}
                className="flex flex-col justify-center px-4 py-4 border-b border-linear-border hover:bg-linear-surfaceHover transition-colors"
                style={{ minHeight: `${swimlaneHeights[i]}px` }}
              >
                <span className="text-linear-text text-xs font-black uppercase tracking-widest break-words mb-1">
                  {board.name || board.key}
                </span>
                <span className="text-[10px] text-linear-textDim font-bold tabular-nums">
                  {board.epics.length}{" "}
                  {board.epics.length === 1 ? "epic" : "epics"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Timeline Area ────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          ref={containerRef}
        >
          {/* Fixed date-header (synced via headerScrollRef) */}
          <div className="flex-shrink-0 bg-linear-surface border-b-2 border-linear-border z-10">
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

          {/* Scrollable timeline content */}
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
                {boards.map((board, i) => (
                  <SwimLane
                    key={board.key}
                    board={board}
                    height={swimlaneHeights[i]}
                    dateToPosition={dateToPosition}
                    onSelectEpic={onSelectEpic}
                    selectedEpic={selectedEpic}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
