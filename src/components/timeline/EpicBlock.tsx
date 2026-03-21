"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Epic, StoryStats } from "@/types";
import { getStatusColor } from "@/lib/utils/color-utils";
import { EpicTooltip } from "./EpicTooltip";

// ─── Constants (exported — SwimLane uses them for row height) ─────────────────
export const BLOCK_HEIGHT = 80;   // taller to fit text-lg summary + counts row
export const BAR_HEIGHT   = 0;    // no bottom bar anymore
export const BLOCK_MARGIN = 14;

// ─── Gradient background ──────────────────────────────────────────────────────
const DONE_COLOR        = "rgba(13,  212, 86,  0.55)";
const IN_PROGRESS_COLOR = "rgba(255, 92,  220, 0.45)";
const TODO_COLOR        = "rgba(190, 190, 190, 0.40)"; // very light cool gray
const BLEND             = 10; // % softness at each transition boundary

function buildStatsGradient(stats: StoryStats): string | undefined {
  if (stats.total === 0) return undefined;

  type Seg = { color: string; pct: number };
  const segs: Seg[] = [];
  if (stats.done       > 0) segs.push({ color: DONE_COLOR,        pct: (stats.done       / stats.total) * 100 });
  if (stats.inProgress > 0) segs.push({ color: IN_PROGRESS_COLOR, pct: (stats.inProgress / stats.total) * 100 });
  if (stats.todo       > 0) segs.push({ color: TODO_COLOR,        pct: (stats.todo       / stats.total) * 100 });

  if (segs.length === 0) return undefined;
  if (segs.length === 1) return segs[0].color;

  const stops: string[] = [];
  let pos = 0;

  segs.forEach((seg, i) => {
    const isFirst = i === 0;
    const isLast  = i === segs.length - 1;
    const segEnd  = pos + seg.pct;
    const mid     = (pos + segEnd) / 2;

    const entryPct = isFirst ? 0 : Math.min(pos + BLEND / 2, mid);
    stops.push(`${seg.color} ${entryPct.toFixed(1)}%`);

    const exitPct = isLast ? 100 : Math.max(segEnd - BLEND / 2, mid);
    stops.push(`${seg.color} ${exitPct.toFixed(1)}%`);

    pos = segEnd;
  });

  return `linear-gradient(to right, ${stops.join(", ")})`;
}

// ─── Story counts (replaces the bottom bar) ───────────────────────────────────

function StoryCounts({ stats }: { stats: StoryStats }) {
  if (stats.total === 0) return null;
  return (
    <div className="flex items-center gap-2.5">
      {stats.done > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-black leading-none">
          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: "#0dd456" }} />
          {stats.done}
        </span>
      )}
      {stats.inProgress > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-black leading-none">
          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: "#ff5cdc" }} />
          {stats.inProgress}
        </span>
      )}
      {stats.todo > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-black leading-none opacity-50">
          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 bg-black/30" />
          {stats.todo}
        </span>
      )}
    </div>
  );
}

// ─── Epic block ───────────────────────────────────────────────────────────────

interface EpicBlockProps {
  epic: Epic;
  left: number;
  width: number;
  laneIndex: number;
  onClick?: (epic: Epic) => void;
  selected?: boolean;
}

export function EpicBlock({
  epic,
  left,
  width,
  laneIndex,
  onClick,
  selected = false,
}: EpicBlockProps) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const top          = laneIndex * (BLOCK_HEIGHT + BLOCK_MARGIN) + BLOCK_MARGIN;
  const minWidth     = 100;
  const displayWidth = Math.max(width, minWidth);
  const hasStats     = !!(epic.storyStats && epic.storyStats.total > 0);

  const gradient      = hasStats ? buildStatsGradient(epic.storyStats!) : undefined;
  const statusClasses = getStatusColor(epic.statusCategory);

  return (
    <>
      <div
        className="absolute cursor-pointer group"
        style={{
          left:     `${left}px`,
          top:      `${top}px`,
          width:    `${displayWidth}px`,
          minWidth: `${minWidth}px`,
          zIndex:   selected ? 20 : 10,
        }}
        onClick={() => onClick?.(epic)}
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltipPos(null)}
      >
        <div
          className={`
            w-full px-3 py-2.5 rounded-[3px]
            transition-all duration-100 ease-out
            ${statusClasses}
            ${selected
              ? "shadow-linear-hover -translate-x-px -translate-y-px"
              : "shadow-linear-sm group-hover:shadow-linear-hover group-hover:-translate-x-px group-hover:-translate-y-px"
            }
          `}
          style={{
            height:     `${BLOCK_HEIGHT}px`,
            background: gradient ?? undefined,
          }}
        >
          <div className="h-full flex flex-col justify-between overflow-hidden">
            {/* Row 1 — key tag + due date */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-block text-[9px] font-black uppercase tracking-widest bg-black/15 px-1.5 py-0.5 rounded-[2px] leading-none shrink-0">
                {epic.key}
              </span>
              {epic.dueDate && (
                <span className="text-[10px] font-bold opacity-50 shrink-0">
                  {new Date(epic.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>

            {/* Row 2 — summary */}
            <div className="text-lg font-black uppercase leading-tight truncate tracking-tight">
              {epic.summary}
            </div>

            {/* Row 3 — story counts (only when available) */}
            {hasStats && <StoryCounts stats={epic.storyStats!} />}
          </div>
        </div>
      </div>

      {/* Tooltip via portal */}
      {tooltipPos && mounted && createPortal(
        <EpicTooltip epic={epic} x={tooltipPos.x} y={tooltipPos.y} />,
        document.body,
      )}
    </>
  );
}
