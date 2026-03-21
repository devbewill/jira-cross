"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Epic, StoryStats } from "@/types";
import { getStatusColor } from "@/lib/utils/color-utils";
import { EpicTooltip } from "./EpicTooltip";

// ─── Layout constants (exported — SwimLane uses BLOCK_HEIGHT for row height) ──
const  INFO_HEIGHT   = 22;  // px — summary + counts row above the bar
const  GAP           = 4;   // px — space between info row and bar
const  BAR_H         = 32;  // px — the colored segments bar (≈60% reduction from 80)
export const BLOCK_HEIGHT = INFO_HEIGHT + GAP + BAR_H; // 56px total
export const BAR_HEIGHT   = 0;   // legacy export — no longer used
export const BLOCK_MARGIN = 14;

// ─── Solid status colors — shared with tooltip and story panel ────────────────
export const DOT_DONE        = "#57e51e";          // bright green
export const DOT_IN_PROGRESS = "rgb(255, 157, 225)"; // light pink
export const DOT_TODO        = "#f0f0f0";           // very light gray

/** Expands StoryStats into one color entry per story (done → inProgress → todo). */
function buildSegments(stats: StoryStats): string[] {
  const segs: string[] = [];
  for (let i = 0; i < stats.done;       i++) segs.push(DOT_DONE);
  for (let i = 0; i < stats.inProgress; i++) segs.push(DOT_IN_PROGRESS);
  for (let i = 0; i < stats.todo;       i++) segs.push(DOT_TODO);
  return segs;
}

// ─── Story counts row ─────────────────────────────────────────────────────────

function StoryCounts({ stats }: { stats: StoryStats }) {
  if (stats.total === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {stats.done > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-black leading-none">
          <span className="w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ backgroundColor: DOT_DONE, border: "1px solid #111" }} />
          {stats.done}
        </span>
      )}
      {stats.inProgress > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-black leading-none">
          <span className="w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ backgroundColor: DOT_IN_PROGRESS, border: "1px solid #111" }} />
          {stats.inProgress}
        </span>
      )}
      {stats.todo > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-black leading-none opacity-50">
          <span className="w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ backgroundColor: DOT_TODO, border: "1px solid #111" }} />
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
  const segments     = hasStats ? buildSegments(epic.storyStats!) : [];
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
        {/* ── Info row above the bar — summary left, counts immediately after ── */}
        <div
          className="flex items-center gap-2 overflow-hidden"
          style={{ height: `${INFO_HEIGHT}px`, marginBottom: `${GAP}px` }}
        >
          <div className="text-[13px] font-black uppercase leading-none tracking-tight truncate min-w-0 text-linear-text">
            {epic.summary}
          </div>
          {hasStats && <StoryCounts stats={epic.storyStats!} />}
        </div>

        {/* ── Colored segments bar — only key inside ── */}
        <div
          className={`
            relative w-full rounded-[3px] overflow-hidden
            transition-all duration-100 ease-out
            ${statusClasses}
            ${selected
              ? "shadow-linear-hover -translate-x-px -translate-y-px"
              : "shadow-linear-sm group-hover:shadow-linear-hover group-hover:-translate-x-px group-hover:-translate-y-px"
            }
          `}
          style={{
            height:          `${BAR_H}px`,
            backgroundColor: hasStats ? "#000000" : undefined,
          }}
        >
          {/* Per-story segments */}
          {hasStats && (
            <div className="absolute inset-0 flex" style={{ gap: "0.5px", backgroundColor: "#000000" }}>
              {segments.map((color, i) => (
                <div key={i} className="h-full flex-1" style={{ backgroundColor: color, minWidth: 0 }} />
              ))}
            </div>
          )}

          {/* Key + due date */}
          <div className="relative z-10 h-full flex items-center justify-between px-2.5">
            <span className="inline-block text-[9px] font-black uppercase tracking-widest bg-black/15 px-1.5 py-0.5 rounded-[2px] leading-none shrink-0">
              {epic.key}
            </span>
            {epic.dueDate && (
              <span className="text-[9px] font-bold opacity-40 shrink-0">
                {new Date(epic.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
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
