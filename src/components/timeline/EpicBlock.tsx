"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Epic, StoryStats } from "@/types";
import { getStatusColor } from "@/lib/utils/color-utils";
import { EpicTooltip } from "./EpicTooltip";

// ─── Constants (keep in sync with SwimLane.computeSwimLaneHeight) ─────────────
export const BLOCK_HEIGHT = 68;
export const BAR_HEIGHT   = 10;
export const BLOCK_MARGIN = 14;

// ─── Gradient background from story stats ────────────────────────────────────
// Semi-transparent so the colors are soft and text stays readable.
const DONE_COLOR        = "rgba(13,  212, 86,  0.55)";
const IN_PROGRESS_COLOR = "rgba(255, 92,  220, 0.45)";
const TODO_COLOR        = "rgba(80,  80,  80,  0.18)";
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

    // Entry stop: hard start for first segment, soft blend-in for others
    const entryPct = isFirst ? 0 : Math.min(pos + BLEND / 2, mid);
    stops.push(`${seg.color} ${entryPct.toFixed(1)}%`);

    // Exit stop: hard end for last segment, soft blend-out for others
    const exitPct = isLast ? 100 : Math.max(segEnd - BLEND / 2, mid);
    stops.push(`${seg.color} ${exitPct.toFixed(1)}%`);

    pos = segEnd;
  });

  return `linear-gradient(to right, ${stops.join(", ")})`;
}

// ─── Story progress bar (hangs below, numbers for precise data) ───────────────

interface SegmentProps {
  count: number;
  percent: number;
  color: string;
}

function Segment({ count, percent, color }: SegmentProps) {
  if (count === 0 || percent === 0) return null;
  return (
    <div
      className="flex items-center justify-center h-full overflow-hidden"
      style={{ width: `${percent}%`, backgroundColor: color, flexShrink: 0 }}
    >
      {percent >= 12 && (
        <span className="text-[9px] font-black leading-none select-none text-white">
          {count}
        </span>
      )}
    </div>
  );
}

function StoryProgressBar({ stats, width }: { stats: StoryStats; width: number }) {
  if (stats.total === 0) return null;

  const donePct       = (stats.done       / stats.total) * 100;
  const inProgressPct = (stats.inProgress / stats.total) * 100;
  const todoPct       = (stats.todo       / stats.total) * 100;

  return (
    <div
      className="flex overflow-hidden rounded-b-[3px]"
      style={{
        width:        `${width}px`,
        height:       `${BAR_HEIGHT}px`,
        borderLeft:   "3px solid black",
        borderRight:  "3px solid black",
        borderBottom: "3px solid black",
      }}
    >
      <Segment count={stats.done}       percent={donePct}       color="#0dd456" />
      <Segment count={stats.inProgress} percent={inProgressPct} color="#ff5cdc" />
      <Segment count={stats.todo}       percent={todoPct}       color="#444444" />
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

  const top          = laneIndex * (BLOCK_HEIGHT + BAR_HEIGHT + BLOCK_MARGIN) + BLOCK_MARGIN;
  const minWidth     = 100;
  const displayWidth = Math.max(width, minWidth);
  const hasBar       = !!(epic.storyStats && epic.storyStats.total > 0);

  // Background: soft gradient when stats are available, solid status color otherwise
  const gradient     = hasBar ? buildStatsGradient(epic.storyStats!) : undefined;

  // statusClasses carries border + text color; background is overridden by inline style when gradient is set
  const statusClasses = getStatusColor(epic.statusCategory);

  return (
    <>
      {/* Wrapper — positions the block+bar unit in the lane */}
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
        {/* ── Epic block ── */}
        <div
          className={`
            w-full px-3 py-2
            transition-all duration-100 ease-out
            ${statusClasses}
            ${hasBar ? "rounded-t-[3px] rounded-b-none" : "rounded-[3px]"}
            ${selected
              ? "shadow-linear-hover -translate-x-px -translate-y-px"
              : "shadow-linear-sm group-hover:shadow-linear-hover group-hover:-translate-x-px group-hover:-translate-y-px"
            }
          `}
          style={{
            height:     `${BLOCK_HEIGHT}px`,
            // Inline style overrides Tailwind bg-* class — gradient takes precedence
            background: gradient ?? undefined,
          }}
        >
          <div className="h-full flex flex-col justify-between overflow-hidden gap-1">
            {/* Key tag + due date */}
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

            {/* Summary */}
            <div className="text-[13px] font-black leading-tight truncate tracking-tight">
              {epic.summary}
            </div>
          </div>
        </div>

        {/* ── Story bar — hangs below, border continues the block ── */}
        {hasBar && (
          <StoryProgressBar stats={epic.storyStats!} width={displayWidth} />
        )}
      </div>

      {/* Tooltip via portal */}
      {tooltipPos && mounted && createPortal(
        <EpicTooltip epic={epic} x={tooltipPos.x} y={tooltipPos.y} />,
        document.body,
      )}
    </>
  );
}
