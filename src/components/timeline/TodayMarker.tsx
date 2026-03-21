"use client";

import { differenceInDays, startOfDay } from "date-fns";

interface TodayMarkerProps {
  scrollOrigin: Date;
  pxPerDay: number;
  today?: Date;
}

export function TodayMarker({ scrollOrigin, pxPerDay, today: todayProp }: TodayMarkerProps) {
  const today = todayProp ?? new Date();
  const left =
    differenceInDays(startOfDay(today), startOfDay(scrollOrigin)) * pxPerDay;

  return (
    <div
      className="absolute top-0 w-0.5 h-full bg-linear-accent z-20 pointer-events-none"
      style={{ left: `${left}px` }}
    >
      <div className="absolute -top-[26px] left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest whitespace-nowrap bg-linear-accent text-white px-2 py-1 rounded-[2px]">
        Today
      </div>
    </div>
  );
}
