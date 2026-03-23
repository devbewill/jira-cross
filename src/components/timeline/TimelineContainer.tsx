"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { BoardData, Epic, TimeScale } from "@/types";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { getScrollBounds } from "@/lib/utils/date-utils";
import { TimelineHeader } from "./TimelineHeader";
import { SwimLane, computeSwimLaneHeight } from "./SwimLane";
import { TodayMarker } from "./TodayMarker";
import { StoryPanel } from "./StoryPanel";
import { DOT_DONE, DOT_IN_PROGRESS, DOT_TODO } from "./EpicBlock";
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
  // Toggle: clicking the same epic again closes the panel
  const handleSelectEpic = (epic: Epic) => {
    onSelectEpic(selectedEpic?.key === epic.key ? (null as unknown as Epic) : epic);
  };
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
    <>
    <div className="flex flex-col h-full bg-linear-bg w-full">
      {/* Scale Controls */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-white flex-shrink-0"
        style={{ borderBottom: "1px solid #E8E8EF" }}
      >
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#F4F4F7" }}>
          {SCALES.map((s) => (
            <button
              key={s.key}
              onClick={() => changeScale(s.key)}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150"
              style={scale === s.key ? {
                backgroundColor: "#fff",
                color: "#1A1A1B",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              } : {
                backgroundColor: "transparent",
                color: "#717171",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 pl-4" style={{ borderLeft: "1px solid #E8E8EF" }}>
            {[
              { color: DOT_DONE,        label: "Done"        },
              { color: DOT_IN_PROGRESS, label: "In Progress" },
              { color: DOT_TODO,        label: "Todo"        },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "#717171" }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>

          {!todayVisible && (
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150"
              style={{ backgroundColor: "hsl(43 96% 56%)", color: "#fff", boxShadow: "0 1px 4px hsla(43, 96%, 56%, 0.30)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(43 96% 46%)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "hsl(43 96% 56%)"; }}
            >
              → Today
            </button>
          )}
        </div>
      </div>

      {/* Main layout: fixed label column + scrollable timeline */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Fixed Label Column ──────────────────────────────────────────
            Lives entirely OUTSIDE the horizontal scroll container.
            No z-index tricks needed — it's a separate DOM subtree.        */}
        <div className="w-56 flex-shrink-0 flex flex-col bg-white" style={{ borderRight: "1px solid #E8E8EF" }}>
          {/* Spacer that matches the date-header height */}
          <div className="h-10 flex-shrink-0 bg-white" style={{ borderBottom: "1px solid #E8E8EF" }} />
          {/* Board labels — synced vertical scroll via labelsScrollRef */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            ref={labelsScrollRef}
            style={{ scrollbarWidth: "none" }}
          >
            {boards.map((board, i) => (
              <div
                key={board.key}
                className="flex flex-col justify-center px-4 py-4 transition-colors cursor-default"
                style={{ minHeight: `${swimlaneHeights[i]}px`, borderBottom: "1px solid #E8E8EF" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F8F8FB"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span className="text-[12px] font-semibold break-words mb-0.5" style={{ color: "#1A1A1B" }}>
                  {board.name || board.key}
                </span>
                <span className="text-[11px] font-medium tabular-nums mb-2" style={{ color: "#A0A0A8" }}>
                  {board.epics.length}{" "}
                  {board.epics.length === 1 ? "epic" : "epics"}
                </span>
                <ul className="flex flex-col gap-1">
                  {board.epics.map((epic) => (
                    <li
                      key={epic.key}
                      className="flex items-start gap-1.5 cursor-pointer group"
                      onClick={() => handleSelectEpic(epic)}
                    >
                      <span className="text-[9px] font-semibold flex-shrink-0 mt-[1px] transition-colors" style={{ color: "#A0A0A8" }}>
                        {epic.key}
                      </span>
                      <span className="text-[10px] font-medium leading-tight truncate transition-colors" style={{ color: "#4A4A4A" }}>
                        {epic.summary}
                      </span>
                    </li>
                  ))}
                </ul>
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
          <div className="flex-shrink-0 bg-white z-10" style={{ borderBottom: "1px solid #E8E8EF" }}>
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
                    onSelectEpic={handleSelectEpic}
                    selectedEpic={selectedEpic}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    {/* Story panel — slides in from right when an epic is selected */}
    {selectedEpic && (
      <StoryPanel
        epic={selectedEpic}
        onClose={() => onSelectEpic(null as unknown as Epic)}
      />
    )}
    </>
  );
}
