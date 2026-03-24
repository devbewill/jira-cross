"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { Epic } from "@/types";
import { STATUS_COLORS } from "@/lib/utils/status-config";

interface EpicTooltipProps {
  epic: Epic;
  x:    number;
  y:    number;
}

const GAP = 16;

export function EpicTooltip({ epic, x, y }: EpicTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw    = window.innerWidth;
    const below = y - height - GAP < 8;
    const top   = below ? y + GAP : y - GAP - height;
    let   left  = x - width / 2;
    left = Math.max(8, Math.min(left, vw - width - 8));
    setPos({ top, left, below });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] pointer-events-none rounded-xl text-sm bg-linear-surface border border-linear-border shadow-popover p-4"
      style={{
        visibility: pos ? "visible" : "hidden",
        top:        pos ? `${pos.top}px`  : `${y}px`,
        left:       pos ? `${pos.left}px` : `${x}px`,
        minWidth:   "280px",
      }}
    >
      {/* Key + Status */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md leading-none bg-linear-text text-white">
          {epic.key}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-linear-bg text-linear-textSecondary">
          {epic.status}
        </span>
      </div>

      {/* Summary */}
      <div className="mb-4 text-[13px] font-semibold leading-snug text-linear-text">
        {epic.summary}
      </div>

      {/* Meta */}
      <div className="text-xs space-y-2 border-t border-linear-border pt-3">
        {epic.startDate && (
          <div className="flex justify-between items-center">
            <span className="text-linear-textSecondary">Start</span>
            <span className="font-semibold text-linear-text">{epic.startDate}</span>
          </div>
        )}
        {epic.dueDate && (
          <div className="flex justify-between items-center">
            <span className="text-linear-textSecondary">Due</span>
            <span className="font-semibold text-linear-text">{epic.dueDate}</span>
          </div>
        )}
        {epic.storyPoints && (
          <div className="flex justify-between items-center">
            <span className="text-linear-textSecondary">Estimate</span>
            <span className="font-semibold text-linear-text">{epic.storyPoints} pts</span>
          </div>
        )}

        {epic.storyStats && epic.storyStats.total > 0 && (
          <div className="border-t border-linear-border pt-2.5 mt-1.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-linear-textSecondary">Stories</span>
              <span className="font-semibold text-linear-text">{epic.storyStats.total} total</span>
            </div>
            <div className="flex w-full h-[6px] rounded-full overflow-hidden mb-2 bg-linear-todo">
              {epic.storyStats.done > 0 && (
                <div style={{ width: `${(epic.storyStats.done / epic.storyStats.total) * 100}%`, backgroundColor: STATUS_COLORS.done }} />
              )}
              {epic.storyStats.inProgress > 0 && (
                <div style={{ width: `${(epic.storyStats.inProgress / epic.storyStats.total) * 100}%`, backgroundColor: STATUS_COLORS.inProgress }} />
              )}
            </div>
            <div className="flex gap-3 text-[10px] font-medium">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-linear-done" />
                <span className="text-linear-text">{epic.storyStats.done} done</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-linear-accent" />
                <span className="text-linear-text">{epic.storyStats.inProgress} in progress</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-linear-todo" />
                <span className="text-linear-textDim">{epic.storyStats.todo} todo</span>
              </span>
            </div>
          </div>
        )}

        {epic.assignee && (
          <div className="flex justify-between items-center border-t border-linear-border pt-2 mt-1">
            <span className="text-linear-textSecondary">Assignee</span>
            <span className="font-medium flex items-center gap-1.5 text-linear-text">
              <img src={epic.assignee.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
              {epic.assignee.displayName}
            </span>
          </div>
        )}
      </div>

      {/* Arrow */}
      {pos && (
        <div
          className="absolute w-2.5 h-2.5 bg-linear-surface"
          style={pos.below ? {
            top: "-6px", left: `${x - pos.left}px`, transform: "rotate(45deg)",
            borderLeft: "1px solid var(--color-linear-border)", borderTop: "1px solid var(--color-linear-border)",
          } : {
            bottom: "-6px", left: `${x - pos.left}px`, transform: "rotate(45deg)",
            borderRight: "1px solid var(--color-linear-border)", borderBottom: "1px solid var(--color-linear-border)",
          }}
        />
      )}
    </div>
  );
}
