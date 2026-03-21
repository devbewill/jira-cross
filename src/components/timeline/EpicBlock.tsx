"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Epic, StoryStats } from "@/types";
import { getStatusColor } from "@/lib/utils/color-utils";
import { EpicTooltip } from "./EpicTooltip";

interface EpicBlockProps {
  epic: Epic;
  left: number;
  width: number;
  laneIndex: number;
  onClick?: (epic: Epic) => void;
  selected?: boolean;
}

// ─── Segmented progress bar ───────────────────────────────────────────────────

interface SegmentProps {
  count: number;
  percent: number;
  color: string;
  textColor: string;
}

function Segment({ count, percent, color, textColor }: SegmentProps) {
  if (count === 0 || percent === 0) return null;
  return (
    <div
      className="flex items-center justify-center h-full overflow-hidden"
      style={{ width: `${percent}%`, backgroundColor: color }}
    >
      {/* Only render label when segment is wide enough to fit */}
      {percent >= 12 && (
        <span
          className={`text-[9px] font-black leading-none select-none ${textColor}`}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function StoryProgressBar({ stats }: { stats: StoryStats }) {
  if (stats.total === 0) return null;

  const donePct = (stats.done / stats.total) * 100;
  const inProgressPct = (stats.inProgress / stats.total) * 100;
  const todoPct = (stats.todo / stats.total) * 100;

  return (
    <div className="flex w-full h-[13px] rounded-[2px] overflow-hidden gap-px bg-black/[0.08]">
      {/* Done — green */}
      <Segment
        count={stats.done}
        percent={donePct}
        color="#16A34A"
        textColor="text-white"
      />
      {/* In progress — amber */}
      <Segment
        count={stats.inProgress}
        percent={inProgressPct}
        color="#D97706"
        textColor="text-white"
      />
      {/* Todo — subtle dark */}
      <Segment
        count={stats.todo}
        percent={todoPct}
        color="rgba(0,0,0,0.18)"
        textColor="text-black/60"
      />
    </div>
  );
}

// ─── Epic block ───────────────────────────────────────────────────────────────

export function EpicBlock({
  epic,
  left,
  width,
  laneIndex,
  onClick,
  selected = false,
}: EpicBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const blockHeight = 68;
  const blockMargin = 14;
  const top = laneIndex * (blockHeight + blockMargin) + blockMargin;

  const minWidth = 100;
  const displayWidth = Math.max(width, minWidth);

  const statusClasses = getStatusColor(epic.statusCategory);

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setTooltipPos(null);
  };

  return (
    <>
      <div
        ref={blockRef}
        className={`
          absolute px-3 py-2 rounded-[3px]
          transition-all duration-100 ease-out
          cursor-pointer group
          ${statusClasses}
          ${selected
            ? "z-20 outline outline-2 outline-linear-text outline-offset-2 shadow-linear-hover"
            : "z-10 shadow-linear-sm hover:shadow-linear-hover hover:-translate-x-px hover:-translate-y-px"
          }
        `}
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${displayWidth}px`,
          height: `${blockHeight}px`,
          minWidth: `${minWidth}px`,
        }}
        onClick={() => onClick?.(epic)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="h-full flex flex-col justify-between overflow-hidden gap-1.5">
          {/* Top row: key tag + due date */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-block text-[9px] font-black uppercase tracking-widest bg-black/15 px-1.5 py-0.5 rounded-[2px] leading-none shrink-0">
              {epic.key}
            </span>
            {epic.dueDate && (
              <span className="text-[10px] font-bold opacity-50 shrink-0">
                {new Date(epic.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Summary */}
          <div className="text-[13px] font-black leading-tight truncate tracking-tight">
            {epic.summary}
          </div>

          {/* Story progress bar — only when we have story data */}
          {epic.storyStats && epic.storyStats.total > 0 && (
            <StoryProgressBar stats={epic.storyStats} />
          )}
        </div>
      </div>

      {/* Tooltip via portal — above all other elements */}
      {tooltipPos &&
        mounted &&
        createPortal(
          <EpicTooltip epic={epic} x={tooltipPos.x} y={tooltipPos.y} />,
          document.body,
        )}
    </>
  );
}
