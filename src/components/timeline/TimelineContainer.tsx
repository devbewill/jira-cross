"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { BoardData, Epic, TimeScale } from "@/types";
import { useTimelineScale } from "@/hooks/useTimelineScale";
import { getScrollBounds } from "@/lib/utils/date-utils";
import { TimelineHeader } from "./TimelineHeader";
import { SwimLane, computeSwimLaneHeight } from "./SwimLane";
import { TodayMarker } from "./TodayMarker";
import { EpicPanel } from "./EpicPanel";
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
  const handleSelectEpic = (epic: Epic) => {
    onSelectEpic(
      selectedEpic?.key === epic.key ? (null as unknown as Epic) : epic,
    );
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [todayVisible, setTodayVisible] = useState(true);
  const [showReleaseBars, setShowReleaseBars] = useState(false);

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

  const bounds = getScrollBounds(scale, today);
  const totalScrollDays = differenceInDays(bounds.max, bounds.min) + 1;
  const totalTimelineWidth = totalScrollDays * config.pxPerDay;

  const swimlaneHeights = useMemo(
    () =>
      boards.map((board) =>
        computeSwimLaneHeight(board.epics, dateToPosition, showReleaseBars),
      ),
    [boards, dateToPosition, showReleaseBars],
  );

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
        <div className="flex items-center justify-between px-5 py-3 bg-linear-surface flex-shrink-0 border-b border-linear-border">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 p-1 rounded-lg bg-linear-bg">
              {SCALES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => changeScale(s.key)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                    scale === s.key
                      ? "bg-linear-surface text-linear-text"
                      : "bg-transparent text-linear-textSecondary"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Release bars toggle */}
            <button
              onClick={() => setShowReleaseBars((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 border ${
                showReleaseBars
                  ? "bg-linear-surface border-linear-border text-linear-text"
                  : "bg-transparent border-transparent text-linear-textSecondary"
              }`}
            >
              {/* Toggle pill */}
              <span
                className={`relative inline-flex w-7 h-4 rounded-full transition-colors duration-200 flex-shrink-0 ${
                  showReleaseBars ? "bg-linear-accent" : "bg-linear-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${
                    showReleaseBars ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </span>
              Releases
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="flex items-center gap-3 pl-4 border-l border-linear-border">
              {[
                { className: "bg-linear-done", label: "Done" },
                { className: "bg-linear-inProgress", label: "In Progress" },
                { className: "bg-linear-todo", label: "Todo" },
              ].map(({ className, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-linear-textSecondary"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${className}`}
                  />
                  {label}
                </span>
              ))}
            </div>

            {!todayVisible && (
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 bg-linear-accent text-white hover:bg-linear-accentHover"
              >
                → Today
              </button>
            )}
          </div>
        </div>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Fixed Label Column */}
          <div className="w-56 flex-shrink-0 flex flex-col bg-linear-secondary border-r border-linear-border">
            <div className="h-10 flex-shrink-0 bg-linear-secondary border-b border-linear-border" />
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden"
              ref={labelsScrollRef}
              style={{ scrollbarWidth: "none" }}
            >
              {boards.map((board, i) => (
                <div
                  key={board.key}
                  className="flex flex-col justify-center px-4 py-4 transition-colors cursor-default border-b border-linear-border hover:bg-linear-surfaceHover"
                  style={{ minHeight: `${swimlaneHeights[i]}px` }}
                >
                  <span className="text-[12px] font-black break-words mb-0.5 text-linear-text">
                    {board.name || board.key}
                  </span>
                  <span className="text-[11px] font-medium tabular-nums mb-2 text-linear-text">
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
                        <span className="text-[9px] font-semibold flex-shrink-0 mt-[1px] transition-colors text-linear-text">
                          {epic.key}
                        </span>
                        <span className="text-[10px] font-medium leading-tight truncate transition-colors text-linear-text">
                          {epic.summary}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Area */}
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
                  {boards.map((board, i) => (
                    <SwimLane
                      key={board.key}
                      board={board}
                      height={swimlaneHeights[i]}
                      dateToPosition={dateToPosition}
                      onSelectEpic={handleSelectEpic}
                      selectedEpic={selectedEpic}
                      showReleaseBars={showReleaseBars}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedEpic && (
        <EpicPanel
          epic={selectedEpic}
          onClose={() => onSelectEpic(null as unknown as Epic)}
        />
      )}
    </>
  );
}
