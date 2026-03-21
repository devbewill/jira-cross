"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Epic, StoryStats } from "@/types";
import { getStatusColor } from "@/lib/utils/color-utils";
import { EpicTooltip } from "./EpicTooltip";

// ─── Constants (exported — SwimLane uses them for row height) ─────────────────
export const BLOCK_HEIGHT = 80;
export const BAR_HEIGHT   = 0;
export const BLOCK_MARGIN = 14;

// ─── Solid status colors — shared with tooltip and story panel ────────────────
export const DOT_DONE        = "#57e51e";  // bright green
export const DOT_IN_PROGRESS = "#f4d13d";  // golden yellow
export const DOT_TODO        = "#f0f0f0";  // very light gray

/**
 * Expands StoryStats into a flat array of per-story colors.
 * Done stories come first, then in-progress, then todo.
 * Each entry maps 1:1 to a story — used to render individual
 * equal-width segments in the block background.
 */
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
    <div className="flex items-center gap-2.5">
      {stats.done > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-black leading-none">
          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: DOT_DONE }} />
          {stats.done}
        </span>
      )}
      {stats.inProgress > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-black leading-none">
          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: DOT_IN_PROGRESS }} />
          {stats.inProgress}
        </span>
      )}
      {stats.todo > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-black leading-none opacity-60">
          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 border border-gray-300" style={{ backgroundColor: DOT_TODO }} />
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

  // Keep border + text from statusClasses; background is handled by segments or
  // overridden with white when segments are present.
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
            relative w-full px-3 py-2.5 rounded-[3px] overflow-hidden
            transition-all duration-100 ease-out
            ${statusClasses}
            ${selected
              ? "shadow-linear-hover -translate-x-px -translate-y-px"
              : "shadow-linear-sm group-hover:shadow-linear-hover group-hover:-translate-x-px group-hover:-translate-y-px"
            }
          `}
          style={{
            height:          `${BLOCK_HEIGHT}px`,
            // When segments are present, white bg fills the 1px gaps between them
            backgroundColor: hasStats ? "#ffffff" : undefined,
          }}
        >
          {/* ── Per-story segments — absolutely fill the block behind content ── */}
          {hasStats && (
            <div className="absolute inset-0 flex" style={{ gap: "1.5px", padding: "0" }}>
              {segments.map((color, i) => (
                <div
                  key={i}
                  className="h-full flex-1"
                  style={{ backgroundColor: color, minWidth: 0 }}
                />
              ))}
            </div>
          )}

          {/* ── Content — sits above segments ── */}
          <div className="relative z-10 h-full flex flex-col justify-between overflow-hidden">
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

            {/* Row 3 — story counts */}
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
