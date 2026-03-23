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
      className="absolute top-0 h-full pointer-events-none"
      style={{ left: `${left}px`, width: "2px", backgroundColor: "hsl(43 96% 56%)", zIndex: 20, opacity: 0.9 }}
    >
      <div
        className="absolute text-[9px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-md"
        style={{
          top: "-26px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: "hsl(43 96% 56%)", color: "#fff",
          boxShadow: "0 1px 4px hsla(43, 96%, 56%, 0.4)",
        }}
      >
        Today
      </div>
    </div>
  );
}
