"use client";

import { differenceInDays, startOfDay } from "date-fns";

interface TodayMarkerProps {
  timelineStart: Date;
  pixelsPerDay: number;
}

export function TodayMarker({ timelineStart, pixelsPerDay }: TodayMarkerProps) {
  const today = new Date();
  const daysFromStart = differenceInDays(
    startOfDay(today),
    startOfDay(timelineStart),
  );
  const left = daysFromStart * pixelsPerDay;

  return (
    <div
      className="absolute top-0 w-1 h-full bg-black z-10"
      style={{
        left: `${left}px`,
      }}
    >
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[10px] font-black text-black bg-fluo-yellow border-2 border-black px-2 py-0.5 uppercase tracking-widest whitespace-nowrap shadow-hard-sm">
        Today
      </div>
    </div>
  );
}
