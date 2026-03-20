"use client";

import { differenceInDays, startOfDay } from "date-fns";

interface TodayMarkerProps {
  timelineStart: Date;
  pixelsPerDay: number;
}

export function TodayMarker({ timelineStart, pixelsPerDay }: TodayMarkerProps) {
  const today = new Date();
  const daysDifference = differenceInDays(
    startOfDay(today),
    startOfDay(timelineStart),
  );

  if (daysDifference < 0) return null;

  const leftPosition = daysDifference * pixelsPerDay;

  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${leftPosition}px` }}
    >
      {/* Vertical line */}
      <div className="absolute top-0 w-0.5 h-full bg-red-500 opacity-80" />
      {/* Arrow at the top */}
      <div className="absolute top-0 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500" />
      {/* Label */}
      <div className="absolute top-2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-sm shadow-lg whitespace-nowrap">
        Today
      </div>
    </div>
  );
}
