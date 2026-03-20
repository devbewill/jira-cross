"use client";

import { differenceInDays, startOfDay } from "date-fns";

interface TimelineHeaderProps {
  timelineStart: Date;
  timelineEnd: Date;
  pixelsPerDay: number;
}

export function TimelineHeader({
  timelineStart,
  timelineEnd,
  pixelsPerDay,
}: TimelineHeaderProps) {
  const labels = [];
  const current = new Date(
    timelineStart.getFullYear(),
    timelineStart.getMonth(),
    1,
  );

  while (current <= timelineEnd) {
    const left =
      differenceInDays(startOfDay(current), startOfDay(timelineStart)) *
      pixelsPerDay;
    const label = current.toLocaleDateString("it-IT", {
      month: "short",
      year: "2-digit",
    });

    labels.push({ label, left });
    current.setMonth(current.getMonth() + 1);
  }

  return (
    <div className="relative h-12 bg-white border-b-2 border-black">
      <div className="relative h-full">
        {labels.map((item, idx) => (
          <div
            key={idx}
            className="absolute top-0 h-full border-l-2 border-black text-xs font-bold text-black uppercase tracking-wider px-2 py-2 bg-fluo-yellow/10"
            style={{ left: `${item.left}px` }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
