"use client";

import { differenceInDays, startOfDay } from "date-fns";

interface TodayMarkerProps {
  scrollOrigin: Date;
  pxPerDay: number;
  today?: Date;
  /** Pixel offset to align with the timeline area (e.g. board label width) */
  leftOffset?: number;
}

export function TodayMarker({
  scrollOrigin,
  pxPerDay,
  today: todayProp,
  leftOffset = 0,
}: TodayMarkerProps) {
  const today = todayProp ?? new Date();
  const timelinePx =
    differenceInDays(startOfDay(today), startOfDay(scrollOrigin)) * pxPerDay;
  const left = leftOffset + timelinePx;

  return (
    <div
      className="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none"
      style={{ left: `${left}px` }}
    >
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[10px] font-black text-white bg-red-500 border-2 border-red-700 px-2 py-0.5 uppercase tracking-widest whitespace-nowrap rounded-sm shadow-md">
        Today
      </div>
    </div>
  );
}
