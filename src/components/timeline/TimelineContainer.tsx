
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { BoardData, Epic, TimeScale } from "@/types";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { getScrollBounds } from "@/lib/utils/date-utils";
import { TimelineHeader } from "./TimelineHeader";
import { SwimLane } from "./SwimLane";
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

// w-56 = 14rem = 224px
const LABEL_WIDTH = 224;

export function TimelineContainer({
  boards,
  selectedEpic,
  onSelectEpic,
}: TimelineContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [todayVisible, setTodayVisible] = useState(true);

  // Measure viewport width
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

  // Effective timeline width = viewport minus the sticky board label column
  const timelineWidth = Math.max(viewportWidth - LABEL_WIDTH, 200);

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
  } = useTimelineScale(timelineWidth);

  // Scroll bounds for total scrollable width
  const bounds = getScrollBounds(scale, today);
  const totalScrollDays = differenceInDays(bounds.max, bounds.min) + 1;
  const totalTimelineWidth = totalScrollDays * config.pxPerDay;
  // Full content width = sticky label + timeline
  const totalContentWidth = LABEL_WIDTH + totalTimelineWidth;

  // Track today visibility on scroll
  const handleScroll = useCallback(() => {
    setTodayVisible(checkTodayVisible());
  }, [checkTodayVisible]);

  // Sync header scroll with content scroll
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const onContentScroll = useCallback(() => {
    handleScroll();
    const content = scrollContainerRef.current;
    const header = headerScrollRef.current;
    if (content && header) {
      header.scrollLeft = content.scrollLeft;
    }
  }, [handleScroll, scrollContainerRef]);

  return (
    <div className="flex flex-col h-full bg-linear-bg w-full">
      {/* Scale Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-linear-border bg-linear-surface">
        <div className="flex gap-1">
          {SCALES.map((s) => (
            <button
              key={s.key}
              onClick={() => changeScale(s.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-[4px] transition-all duration-150 ${
                scale === s.key
                  ? "bg-linear-surfaceActive text-linear-text shadow-linear-sm"
                  : "text-linear-textMuted hover:text-linear-text hover:bg-linear-surfaceHover"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Go to Today button — only visible when today is off-screen */}
        {!todayVisible && (
          <button
            onClick={goToToday}
            className="px-3 py-1.5 bg-linear-accent text-white text-sm font-medium rounded-[4px] hover:bg-linear-accentHover transition-colors duration-150 shadow-linear-sm"
          >
            Go to Today
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 flex flex-col overflow-hidden bg-linear-bg" ref={containerRef}>
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-linear-surface border-b border-linear-border z-10">
          <div className="flex">
            <div className="w-56 flex-shrink-0 border-r border-linear-border/50 bg-linear-surface" />
            <div
              className="flex-1 overflow-hidden"
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
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-auto"
          ref={scrollContainerRef}
          onScroll={onContentScroll}
        >
          <div className="relative" style={{ width: `${totalContentWidth}px` }}>
            {/* Today Marker — offset by LABEL_WIDTH to align with timeline area */}
            <TodayMarker
              scrollOrigin={scrollOrigin}
              pxPerDay={config.pxPerDay}
              today={today}
              leftOffset={LABEL_WIDTH}
            />

            {/* Swim Lanes */}
            <div className="flex flex-col">
              {boards.map((board) => (
                <SwimLane
                  key={board.key}
                  board={board}
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
  );
}
