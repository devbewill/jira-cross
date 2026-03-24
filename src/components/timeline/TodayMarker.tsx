"use client";

import { differenceInDays, startOfDay } from "date-fns";

interface TodayMarkerProps {
  scrollOrigin: Date;
  pxPerDay:     number;
  today?:       Date;
}

export function TodayMarker({ scrollOrigin, pxPerDay, today: todayProp }: TodayMarkerProps) {
  const today = todayProp ?? new Date();
  const left  = differenceInDays(startOfDay(today), startOfDay(scrollOrigin)) * pxPerDay;

  return (
    <div
      className="absolute top-0 h-full pointer-events-none z-20 opacity-90"
      style={{ left: `${left}px`, width: "2px", backgroundColor: "#EC4899" }}
    >
      <div
        className="absolute text-[9px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-md text-white"
          style={{ backgroundColor: "#EC4899" }}
        style={{ top: "-26px", left: "50%", transform: "translateX(-50%)" }}
      >
        Today
      </div>
    </div>
  );
}
