"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { Epic } from "@/types";
import { DOT_DONE, DOT_IN_PROGRESS, DOT_TODO } from "./EpicBlock";

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
      className="fixed z-[9999] pointer-events-none rounded-xl text-sm"
      style={{
        visibility:      pos ? "visible" : "hidden",
        top:             pos ? `${pos.top}px`  : `${y}px`,
        left:            pos ? `${pos.left}px` : `${x}px`,
        minWidth:        "280px",
        backgroundColor: "#ffffff",
        border:          "1px solid #E8E8EF",
        boxShadow:       "0 8px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
        padding:         "16px",
      }}
    >
      {/* Key + Status */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-md leading-none"
          style={{ backgroundColor: "#1A1A1B", color: "#fff" }}
        >
          {epic.key}
        </span>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-md"
          style={{ backgroundColor: "#F4F4F7", color: "#717171" }}
        >
          {epic.status}
        </span>
      </div>

      {/* Summary */}
      <div className="mb-4 text-[13px] font-semibold leading-snug" style={{ color: "#1A1A1B" }}>
        {epic.summary}
      </div>

      {/* Meta */}
      <div className="text-xs space-y-2" style={{ borderTop: "1px solid #E8E8EF", paddingTop: "12px" }}>
        {epic.startDate && (
          <div className="flex justify-between items-center">
            <span style={{ color: "#717171" }}>Start</span>
            <span className="font-semibold" style={{ color: "#1A1A1B" }}>{epic.startDate}</span>
          </div>
        )}
        {epic.dueDate && (
          <div className="flex justify-between items-center">
            <span style={{ color: "#717171" }}>Due</span>
            <span className="font-semibold" style={{ color: "#1A1A1B" }}>{epic.dueDate}</span>
          </div>
        )}
        {epic.storyPoints && (
          <div className="flex justify-between items-center">
            <span style={{ color: "#717171" }}>Estimate</span>
            <span className="font-semibold" style={{ color: "#1A1A1B" }}>{epic.storyPoints} pts</span>
          </div>
        )}

        {epic.storyStats && epic.storyStats.total > 0 && (
          <div style={{ borderTop: "1px solid #E8E8EF", paddingTop: "10px", marginTop: "6px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: "#717171" }}>Stories</span>
              <span className="font-semibold" style={{ color: "#1A1A1B" }}>{epic.storyStats.total} total</span>
            </div>
            <div className="flex w-full h-[6px] rounded-full overflow-hidden mb-2" style={{ backgroundColor: "#E5E7EB" }}>
              {epic.storyStats.done > 0 && (
                <div style={{ width: `${(epic.storyStats.done / epic.storyStats.total) * 100}%`, backgroundColor: DOT_DONE }} />
              )}
              {epic.storyStats.inProgress > 0 && (
                <div style={{ width: `${(epic.storyStats.inProgress / epic.storyStats.total) * 100}%`, backgroundColor: DOT_IN_PROGRESS }} />
              )}
            </div>
            <div className="flex gap-3 text-[10px] font-medium">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_DONE }} />
                <span style={{ color: "#1A1A1B" }}>{epic.storyStats.done} done</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_IN_PROGRESS }} />
                <span style={{ color: "#1A1A1B" }}>{epic.storyStats.inProgress} in progress</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_TODO }} />
                <span style={{ color: "#A0A0A8" }}>{epic.storyStats.todo} todo</span>
              </span>
            </div>
          </div>
        )}

        {epic.assignee && (
          <div className="flex justify-between items-center" style={{ borderTop: "1px solid #E8E8EF", paddingTop: "8px", marginTop: "4px" }}>
            <span style={{ color: "#717171" }}>Assignee</span>
            <span className="font-medium flex items-center gap-1.5" style={{ color: "#1A1A1B" }}>
              <img src={epic.assignee.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
              {epic.assignee.displayName}
            </span>
          </div>
        )}
      </div>

      {/* Arrow */}
      {pos && (
        <div
          className="absolute w-2.5 h-2.5"
          style={pos.below ? {
            top: "-6px", left: `${x - pos.left}px`, transform: "rotate(45deg)",
            backgroundColor: "#fff", borderLeft: "1px solid #E8E8EF", borderTop: "1px solid #E8E8EF",
          } : {
            bottom: "-6px", left: `${x - pos.left}px`, transform: "rotate(45deg)",
            backgroundColor: "#fff", borderRight: "1px solid #E8E8EF", borderBottom: "1px solid #E8E8EF",
          }}
        />
      )}
    </div>
  );
}
