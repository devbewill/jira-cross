"use client";

import { useRef } from "react";
import { BoardData, Epic } from "@/types";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { TimelineHeader } from "./TimelineHeader";
import { SwimLane } from "./SwimLane";
import { TodayMarker } from "./TodayMarker";

interface TimelineContainerProps {
  boards: BoardData[];
  selectedEpic: Epic | null;
  onSelectEpic: (epic: Epic) => void;
  pixelsPerDay?: number;
}

export function TimelineContainer({
  boards,
  selectedEpic,
  onSelectEpic,
}: TimelineContainerProps) {
  const allEpics = boards.flatMap((b) => b.epics);
  const { config, dateToPosition, zoom, resetZoom } =
    useTimelineScale(allEpics);

  const containerRef = useRef<HTMLDivElement>(null);

  const totalWidth = Math.max(
    1200,
    (Math.max(...allEpics.map((e) => dateToPosition(e.dueDate) ?? 0)) || 1200) +
      100,
  );

  return (
    <div className="flex flex-col h-full bg-white w-full">
      {/* Controls */}
      <div className="flex items-center justify-between p-8 border-b-2 border-black bg-white">
        <div className="text-sm font-bold text-black uppercase tracking-wider">
          <span className="text-text-secondary">Scale:</span>{" "}
          <span className="text-black bg-fluo-yellow px-2 py-1 border-2 border-black ml-2 shadow-hard-sm">
            {config.pixelsPerDay.toFixed(1)}px/day
          </span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => zoom("in")}
            className="btn-fluo px-4 py-2 bg-fluo-cyan text-black font-bold uppercase tracking-wider text-sm hover:bg-fluo-cyan/90 transition-all duration-100"
          >
            🔍+ Zoom In
          </button>
          <button
            onClick={() => zoom("out")}
            className="btn-fluo px-4 py-2 bg-fluo-magenta text-black font-bold uppercase tracking-wider text-sm hover:bg-fluo-magenta/90 transition-all duration-100"
          >
            🔍- Zoom Out
          </button>
          <button
            onClick={resetZoom}
            className="btn-fluo px-4 py-2 bg-white text-black font-bold uppercase tracking-wider text-sm hover:bg-gray-100 transition-all duration-100"
          >
            ⟲ Reset
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white border-b-2 border-black z-10">
          <div className="flex">
            <div className="w-56 flex-shrink-0 border-r-2 border-black bg-white" />
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
        <div className="flex-1 overflow-auto bg-timeline-grid" ref={containerRef}>
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
