"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Epic, StoryStats } from "@/types";
import { EpicTooltip } from "./EpicTooltip";

// ─── Layout constants ─────────────────────────────────────────────────────────
const INFO_HEIGHT = 22;
const GAP         = 4;
const BAR_H       = 30;
export const BLOCK_HEIGHT = INFO_HEIGHT + GAP + BAR_H; // 56px
export const BAR_HEIGHT   = 0; // legacy export
export const BLOCK_MARGIN = 14;

// ─── HD Mango status colors ───────────────────────────────────────────────────
export const DOT_DONE        = "#22C55E"; // clean green
export const DOT_IN_PROGRESS = "#F28C28"; // mango orange
export const DOT_TODO        = "#E5E7EB"; // light gray

function buildSegments(stats: StoryStats): string[] {
  const segs: string[] = [];
  for (let i = 0; i < stats.done;       i++) segs.push(DOT_DONE);
  for (let i = 0; i < stats.inProgress; i++) segs.push(DOT_IN_PROGRESS);
  for (let i = 0; i < stats.todo;       i++) segs.push(DOT_TODO);
  return segs;
}

// ─── Story counts ─────────────────────────────────────────────────────────────

function StoryCounts({ stats }: { stats: StoryStats }) {
  if (stats.total === 0) return null;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {stats.done > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold leading-none" style={{ color: "#1A1A1B" }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOT_DONE }} />
          {stats.done}
        </span>
      )}
      {stats.inProgress > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold leading-none" style={{ color: "#1A1A1B" }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOT_IN_PROGRESS }} />
          {stats.inProgress}
        </span>
      )}
      {stats.todo > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold leading-none" style={{ color: "#A0A0A8" }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOT_TODO }} />
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
          <div className="text-[12px] font-semibold leading-none tracking-tight truncate min-w-0" style={{ color: "#1A1A1B" }}>
            {epic.summary}
          </div>
          {hasStats && <StoryCounts stats={epic.storyStats!} />}
        </div>

        {/* Segments bar */}
        <div
          className="relative w-full rounded-lg overflow-hidden transition-all duration-150"
          style={{
            height:          `${BAR_H}px`,
            backgroundColor: hasStats ? "#1A1A1B" : "#E5E7EB",
            boxShadow: selected
              ? "0 4px 16px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)"
              : "0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
            transform: selected ? "translateY(-1px)" : undefined,
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
            <span
              className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-md leading-none shrink-0"
              style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" }}
            >
              {epic.key}
            </span>
            {epic.dueDate && (
              <span className="text-[9px] font-medium opacity-60 shrink-0" style={{ color: "#fff" }}>
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
