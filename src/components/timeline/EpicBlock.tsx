"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Epic, EpicRelease, StoryStats } from "@/types";
import { STATUS_COLORS, RELEASE_STATUS_CONFIG } from "@/lib/utils/status-config";
import { EpicTooltip } from "./EpicTooltip";

// ─── Layout constants ─────────────────────────────────────────────────────────
const INFO_HEIGHT       = 22;
const GAP               = 4;
const BAR_H             = 30;
export const BLOCK_HEIGHT = INFO_HEIGHT + GAP + BAR_H; // 56px
export const BAR_HEIGHT   = 0; // legacy export

// Space below each block: gap (3px) + up to 3 release rows (each 10px bar + 2px gap)
const REL_BAR_H      = 10;
const REL_BAR_GAP    = 2;
const REL_BAR_OFFSET = 3; // gap between block bottom and first release row

export const BLOCK_MARGIN_BASE     = 14;  // no release bars
export const BLOCK_MARGIN_RELEASES = REL_BAR_OFFSET + 3 * (REL_BAR_H + REL_BAR_GAP) + 4; // ≈ 43px
/** @deprecated use BLOCK_MARGIN_BASE or BLOCK_MARGIN_RELEASES */
export const BLOCK_MARGIN = BLOCK_MARGIN_RELEASES;

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

// ─── Release bar colors — same palette as the side panel ──────────────────────
const releaseBarColors = (r: EpicRelease) => {
  const key = r.released ? "released" : r.overdue ? "overdue" : "upcoming";
  return RELEASE_STATUS_CONFIG[key];
};

// ─── Release bar lane-packing ──────────────────────────────────────────────────
// Assigns each bar to the first row where it doesn't overlap with existing bars.
interface RelBar { rel: EpicRelease; barLeft: number; barWidth: number }
interface PackedBar extends RelBar { rowIndex: number }

function packReleaseBars(bars: RelBar[]): PackedBar[] {
  // row → array of [left, right] intervals already placed
  const rowIntervals: Array<Array<[number, number]>> = [];

  return bars.map((bar) => {
    const l = bar.barLeft;
    const r = bar.barLeft + bar.barWidth;
    const rowIdx = rowIntervals.findIndex((intervals) =>
      intervals.every(([a, b]) => r <= a || l >= b)   // no overlap with any in this row
    );
    if (rowIdx === -1) {
      rowIntervals.push([[l, r]]);
      return { ...bar, rowIndex: rowIntervals.length - 1 };
    }
    rowIntervals[rowIdx].push([l, r]);
    return { ...bar, rowIndex: rowIdx };
  });
}

// ─── Epic block ───────────────────────────────────────────────────────────────

interface EpicBlockProps {
  epic:             Epic;
  left:             number;
  width:            number;
  laneIndex:        number;
  onClick?:         (epic: Epic) => void;
  selected?:        boolean;
  dateToPosition?:  (date: string | null) => number | null;
  showReleaseBars?: boolean;
}

export function EpicBlock({ epic, left, width, laneIndex, onClick, selected = false, dateToPosition, showReleaseBars = true }: EpicBlockProps) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted,    setMounted]    = useState(false);
  useEffect(() => setMounted(true), []);

  const top       = laneIndex * (BLOCK_HEIGHT + BLOCK_MARGIN) + BLOCK_MARGIN;
  const minWidth  = 100;
  const dispWidth = Math.max(width, minWidth);
  const hasStats  = !!(epic.storyStats && epic.storyStats.total > 0);
  const segments  = hasStats ? buildSegments(epic.storyStats!) : [];

  // Overdue: dueDate is in the past AND there are incomplete tasks
  const isOverdue = !!(
    epic.dueDate &&
    new Date(epic.dueDate) < new Date() &&
    epic.storyStats &&
    (epic.storyStats.inProgress + epic.storyStats.todo) > 0
  );

  // Release span bars below the epic block — pack into rows to avoid overlap
  const releaseBars: PackedBar[] = useMemo(() => {
    if (!dateToPosition) return [];
    const raw: RelBar[] = (epic.releases ?? []).flatMap((rel) => {
      if (!rel.releaseDate) return [];
      const endAbsX = dateToPosition(rel.releaseDate);
      if (endAbsX === null) return [];
      // startDate: prefer release's own startDate → epic's startDate → bar left edge
      const startAbsX = rel.startDate
        ? (dateToPosition(rel.startDate) ?? left)
        : (epic.startDate ? (dateToPosition(epic.startDate) ?? left) : left);
      const barLeft  = startAbsX - left;
      const barWidth = Math.max(endAbsX - startAbsX, 40);
      return [{ rel, barLeft, barWidth }];
    });
    return packReleaseBars(raw);
  }, [epic.releases, epic.startDate, dateToPosition, left]);

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
            border:          isOverdue ? "2px solid #EF4444" : "none",
            boxSizing:       "border-box",
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
              <span className={`text-[9px] leading-none shrink-0 ${isOverdue ? "font-bold text-red-400" : "font-bold text-white"}`}>
                {new Date(epic.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>

        {/* Release span bars — packed into rows so non-overlapping bars share a row */}
        {showReleaseBars && releaseBars.map(({ rel, barLeft, barWidth, rowIndex }) => {
          const cfg   = releaseBarColors(rel);
          const topPx = BLOCK_HEIGHT + REL_BAR_OFFSET + rowIndex * (REL_BAR_H + REL_BAR_GAP);
          return (
            <div
              key={rel.id}
              className="absolute flex items-center justify-center overflow-hidden pointer-events-none"
              style={{
                top:             `${topPx}px`,
                left:            `${barLeft}px`,
                width:           `${barWidth}px`,
                height:          `${REL_BAR_H}px`,
                border:          `1px solid ${cfg.borderHex}`,
                borderLeft:      `2px solid ${cfg.borderHex}`,
                borderRight:     `2px solid ${cfg.borderHex}`,
                borderRadius:    "2px",
                backgroundColor: cfg.bgHex,
              }}
            >
              <span
                className="text-[8px] font-bold leading-none truncate px-1"
                style={{ color: cfg.textHex }}
              >
                {rel.name}
              </span>
            </div>
          );
        })}
      </div>

      {tooltipPos && mounted && createPortal(
        <EpicTooltip epic={epic} x={tooltipPos.x} y={tooltipPos.y} />,
        document.body,
      )}
    </>
  );
}
