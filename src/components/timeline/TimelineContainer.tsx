"use client";

import { useRef, useEffect, useState } from "react";
import { differenceInDays, startOfDay } from "date-fns";
import { BoardData, Epic } from "@/types";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { TimelineHeader } from "./TimelineHeader";
import { SwimLane } from "./SwimLane";
import { TodayMarker } from "./TodayMarker";

interface TimelineContainerProps {
  boards: BoardData[];
  selectedEpic: Epic | null;
  onSelectEpic: (epic: Epic) => void;
}

export function TimelineContainer({
  boards,
  selectedEpic,
  onSelectEpic,
}: TimelineContainerProps) {
  const allEpics = boards.flatMap((b) => b.epics);
  const { config, dateToPosition, setZoomLevel, pixelsPerDay } =
    useTimelineScale(allEpics);

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [visibleWidth, setVisibleWidth] = useState(1000);

  // Calculate today's position in pixels from the start of the timeline
  const today = startOfDay(new Date());
  const daysFromStart = differenceInDays(today, startOfDay(config.startDate));
  const todayPosition = daysFromStart * pixelsPerDay;

  // Update visible width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (timelineContainerRef.current) {
        // Subtract sidebar width (224px)
        setVisibleWidth(timelineContainerRef.current.clientWidth - 224);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Calculate total width based on the timeline range
  const totalWidth =
    differenceInDays(config.endDate, config.startDate) * pixelsPerDay;

  // Calculate scroll position to keep Today at 20%
  const calculateScrollPosition = () => {
    const targetTodayPosition = visibleWidth * 0.2; // Today at 20% position
    const scrollPosition = todayPosition - targetTodayPosition;
    return Math.max(0, scrollPosition);
  };

  // Scroll to keep Today at 20% when zoom level changes
  useEffect(() => {
    if (containerRef.current) {
      const scrollPosition = calculateScrollPosition();
      containerRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  }, [pixelsPerDay, todayPosition, visibleWidth]);

  // Initial scroll to Today on mount
  useEffect(() => {
    if (containerRef.current) {
      const scrollPosition = calculateScrollPosition();
      containerRef.current.scrollTo({
        left: scrollPosition,
        behavior: "auto",
      });
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-linear-bg w-full font-sans">
      {/* Controls */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-linear-border bg-linear-surface">
        <div className="flex items-center gap-3">
          <div className="text-sm text-linear-textMuted tracking-tight">
            Timeline view
          </div>
          <div className="h-4 w-px bg-linear-border"></div>
          <span className="text-xs text-linear-textDim bg-linear-surfaceHover px-1.5 py-0.5 rounded border border-linear-border">
            {config.pixelsPerDay.toFixed(1)}x
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setZoomLevel("weeks")}
            className="px-3 py-1.5 bg-linear-surfaceHover text-linear-textMuted hover:text-linear-text border border-linear-border rounded-[4px] text-xs font-medium hover:bg-linear-surfaceActive transition-all shadow-linear-sm"
          >
            Weeks
          </button>
          <button
            onClick={() => setZoomLevel("months")}
            className="px-3 py-1.5 bg-linear-surfaceHover text-linear-textMuted hover:text-linear-text border border-linear-border rounded-[4px] text-xs font-medium hover:bg-linear-surfaceActive transition-all shadow-linear-sm"
          >
            Months
          </button>
          <button
            onClick={() => setZoomLevel("quarters")}
            className="px-3 py-1.5 bg-linear-surfaceHover text-linear-textMuted hover:text-linear-text border border-linear-border rounded-[4px] text-xs font-medium hover:bg-linear-surfaceActive transition-all shadow-linear-sm"
          >
            Quarters
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div
        className="flex-1 flex flex-col overflow-hidden bg-linear-bg relative"
        ref={timelineContainerRef}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-linear-surface border-b border-linear-border z-10 shadow-sm relative">
          <div className="flex">
            <div className="w-56 flex-shrink-0 border-r border-linear-border bg-linear-surface" />
            <div className="flex-1 overflow-hidden" ref={containerRef}>
              <div style={{ width: `${totalWidth}px` }}>
                <TimelineHeader
                  timelineStart={config.startDate}
                  timelineEnd={config.endDate}
                  pixelsPerDay={config.pixelsPerDay}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-auto bg-timeline-grid scroll-smooth custom-scrollbar"
          ref={containerRef}
          style={
            { "--grid-size": `${config.pixelsPerDay}px` } as React.CSSProperties
          }
        >
          <div className="relative" style={{ width: `${totalWidth}px` }}>
            {/* Today Marker */}
            <TodayMarker
              timelineStart={config.startDate}
              pixelsPerDay={config.pixelsPerDay}
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
