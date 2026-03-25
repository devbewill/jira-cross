"use client";

import { useMemo } from "react";
import { generateTicks } from "@/lib/utils/date-utils";
import { TimeScale } from "@/types";

interface TimelineHeaderProps {
  scale: TimeScale;
  scrollOrigin: Date;
  pxPerDay: number;
  rangeStart: Date;
  rangeEnd: Date;
  totalWidth: number;
}

export function TimelineHeader({
  scale,
  scrollOrigin,
  pxPerDay,
  rangeStart,
  rangeEnd,
  totalWidth,
}: TimelineHeaderProps) {
  const ticks = useMemo(
    () => generateTicks(scale, scrollOrigin, pxPerDay, rangeStart, rangeEnd),
    [scale, scrollOrigin, pxPerDay, rangeStart, rangeEnd],
  );

  const isDayScale = scale === "today" || scale === "weeks";

  return (
    <div
      className="relative bg-linear-surface"
      style={{ width: `${totalWidth}px`, height: "40px" }}
    >
      {ticks.map((tick, idx) => (
        <div
          key={idx}
          className="absolute top-0 h-full border-l border-linear-border flex flex-col justify-center px-2 overflow-hidden"
          style={{
            left: `${tick.leftPx}px`,
            width: tick.widthPx ? `${tick.widthPx}px` : undefined,
          }}
        >
          {tick.sublabel && (
            <span className="text-[8px] font-black uppercase tracking-widest text-linear-textDim leading-none">
              {tick.sublabel}
            </span>
          )}
          <span
            className={`font-black uppercase tracking-widest leading-none ${
              isDayScale ? "text-[9px]" : "text-[10px]"
            } text-linear-text`}
          >
            {tick.label}
          </span>
        </div>
      ))}
    </div>
  );
}
