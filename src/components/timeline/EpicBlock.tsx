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

// ─── Fixed gradient background (user-defined) ────────────────────────────────
const BLOCK_GRADIENT =
  "linear-gradient(to right, rgb(32 255 149) 0%, rgba(13,212,86,0.55) 5.5%, rgb(255 251 0 / 45%) 15.5%, rgb(255 92 160 / 45%) 73.9%, rgb(201 196 196 / 40%) 83.9%, rgb(255 255 255 / 40%) 100%)";

// Dot colors matched to gradient landmarks
export const DOT_DONE        = "rgb(32, 255, 149)";   // gradient start — bright green
export const DOT_IN_PROGRESS = "rgb(255, 92, 160)";   // gradient 73.9% — pink
export const DOT_TODO        = "rgb(201, 196, 196)";  // gradient 83.9% — light gray

// ─── Story counts (replaces the bottom bar) ───────────────────────────────────

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
          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: DOT_TODO }} />
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
            background: BLOCK_GRADIENT,
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
