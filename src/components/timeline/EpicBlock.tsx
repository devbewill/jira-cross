"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Epic, StoryStats } from "@/types";
import { STATUS_COLORS } from "@/lib/utils/status-config";
import { EpicTooltip } from "./EpicTooltip";

// ─── Layout constants ─────────────────────────────────────────────────────────
const INFO_HEIGHT = 22;
const GAP         = 4;
const BAR_H       = 30;
export const BLOCK_HEIGHT = INFO_HEIGHT + GAP + BAR_H; // 56px
export const BAR_HEIGHT   = 0; // legacy export
export const BLOCK_MARGIN = 14;

function buildSegments(stats: StoryStats): string[] {
  const segs: string[] = [];
  for (let i = 0; i < stats.done;       i++) segs.push(STATUS_COLORS.done);
  for (let i = 0; i < stats.inProgress; i++) segs.push(STATUS_COLORS.inProgress);
  for (let i = 0; i < stats.todo;       i++) segs.push(STATUS_COLORS.todo);
  return segs;
}

// ─── Story counts ─────────────────────────────────────────────────────────────

function StoryCounts({ stats }: { stats: StoryStats }) {
  if (stats.total === 0) return null;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {stats.done > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold leading-none text-linear-text">
          <span className="w-2 h-2 rounded-full shrink-0 bg-linear-done" />
          {stats.done}
        </span>
      )}
      {stats.inProgress > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold leading-none text-linear-text">
          <span className="w-2 h-2 rounded-full shrink-0 bg-linear-accent" />
          {stats.inProgress}
        </span>
      )}
      {stats.todo > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold leading-none text-linear-textDim">
          <span className="w-2 h-2 rounded-full shrink-0 bg-linear-todo" />
          {stats.todo}
        </span>
      )}
    </div>
  );
}

// ─── Epic block ───────────────────────────────────────────────────────────────

interface EpicBlockProps {
  epic:      Epic;
  left:      number;
  width:     number;
  laneIndex: number;
  onClick?:  (epic: Epic) => void;
  selected?: boolean;
}

export function EpicBlock({ epic, left, width, laneIndex, onClick, selected = false }: EpicBlockProps) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted,    setMounted]    = useState(false);
  useEffect(() => setMounted(true), []);

  const top       = laneIndex * (BLOCK_HEIGHT + BLOCK_MARGIN) + BLOCK_MARGIN;
  const minWidth  = 100;
  const dispWidth = Math.max(width, minWidth);
  const hasStats  = !!(epic.storyStats && epic.storyStats.total > 0);
  const segments  = hasStats ? buildSegments(epic.storyStats!) : [];

  return (
    <>
      <div
        className="absolute cursor-pointer group"
        style={{ left: `${left}px`, top: `${top}px`, width: `${dispWidth}px`, minWidth: `${minWidth}px`, zIndex: selected ? 20 : 10 }}
        onClick={() => onClick?.(epic)}
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltipPos(null)}
      >
        {/* Info row */}
        <div
          className="flex items-center gap-2 overflow-hidden"
          style={{ height: `${INFO_HEIGHT}px`, marginBottom: `${GAP}px` }}
        >
          <div className="text-[12px] font-semibold leading-none tracking-tight truncate min-w-0 text-linear-text">
            {epic.summary}
          </div>
          {hasStats && <StoryCounts stats={epic.storyStats!} />}
        </div>

        {/* Segments bar */}
        <div
          className={`relative w-full rounded-lg overflow-hidden transition-all duration-150 ${
            selected ? "shadow-linear-hover -translate-y-px" : "shadow-linear-sm"
          }`}
          style={{
            height:          `${BAR_H}px`,
            backgroundColor: hasStats ? "#1A1A1B" : "#E5E7EB",
          }}
        >
          {hasStats && (
            <div className="absolute inset-0 flex" style={{ gap: "0.5px", backgroundColor: "#1A1A1B" }}>
              {segments.map((color, i) => (
                <div key={i} className="h-full flex-1" style={{ backgroundColor: color, minWidth: 0 }} />
              ))}
            </div>
          )}

          <div className="relative z-10 h-full flex items-center justify-between px-2.5">
            <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-md leading-none shrink-0 bg-white/18 text-white">
              {epic.key}
            </span>
            {epic.dueDate && (
              <span className="text-[9px] font-medium opacity-60 shrink-0 text-white">
                {new Date(epic.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>

      {tooltipPos && mounted && createPortal(
        <EpicTooltip epic={epic} x={tooltipPos.x} y={tooltipPos.y} />,
        document.body,
      )}
    </>
  );
}
