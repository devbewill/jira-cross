"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { Epic } from "@/types";
import { DOT_DONE, DOT_IN_PROGRESS, DOT_TODO } from "./EpicBlock";

interface EpicTooltipProps {
  epic: Epic;
  x: number;
  y: number;
}

const BORDER = "1px solid #e0e0e0";
const MUTED  = "#888888";
const TEXT   = "#111111";
const GAP    = 16; // px between cursor and tooltip edge

export function EpicTooltip({ epic, x, y }: EpicTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Start hidden; after first paint measure the box and compute the
  // correct position so the tooltip never escapes the viewport.
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    translateY: string;
    below: boolean;     // true → arrow points up (tooltip is below cursor)
  } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;

    // Vertical: prefer above cursor, flip below if not enough room
    const below = y - height - GAP < 8;
    const top   = below ? y + GAP : y - GAP - height;

    // Horizontal: centre on cursor, clamp to viewport edges
    let left = x - width / 2;
    left = Math.max(8, Math.min(left, vw - width - 8));

    setPos({ top, left, translateY: "0", below });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] pointer-events-none rounded-[3px] text-sm"
      style={{
        // Hidden until position is computed to avoid a flash of wrong position
        visibility:      pos ? "visible" : "hidden",
        top:             pos ? `${pos.top}px`  : `${y}px`,
        left:            pos ? `${pos.left}px` : `${x}px`,
        minWidth:        "280px",
        backgroundColor: "#ffffff",
        color:           TEXT,
        padding:         "16px",
        border:          "3px solid #111111",
        boxShadow:       "6px 6px 0px #111111",
      }}
    >
      {/* Key + Status */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] leading-none"
          style={{ backgroundColor: "#111111", color: "#ffffff" }}
        >
          {epic.key}
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-[2px]"
          style={{ backgroundColor: "#f0f0f0", color: MUTED }}
        >
          {epic.status}
        </span>
      </div>

      {/* Summary */}
      <div className="mb-4 text-sm font-black leading-snug tracking-tight uppercase" style={{ color: TEXT }}>
        {epic.summary}
      </div>

      {/* Meta */}
      <div className="text-xs space-y-2" style={{ borderTop: BORDER, paddingTop: "12px" }}>
        {epic.startDate && (
          <div className="flex justify-between items-center">
            <span style={{ color: MUTED }}>Start</span>
            <span className="font-bold" style={{ color: TEXT }}>{epic.startDate}</span>
          </div>
        )}
        {epic.dueDate && (
          <div className="flex justify-between items-center">
            <span style={{ color: MUTED }}>Due</span>
            <span className="font-bold" style={{ color: TEXT }}>{epic.dueDate}</span>
          </div>
        )}
        {epic.storyPoints && (
          <div className="flex justify-between items-center">
            <span style={{ color: MUTED }}>Estimate</span>
            <span className="font-black" style={{ color: TEXT }}>{epic.storyPoints} pts</span>
          </div>
        )}

        {/* Story stats */}
        {epic.storyStats && epic.storyStats.total > 0 && (
          <div style={{ borderTop: BORDER, paddingTop: "10px", marginTop: "6px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: MUTED }}>Stories</span>
              <span className="font-black" style={{ color: TEXT }}>{epic.storyStats.total} total</span>
            </div>

            <div className="flex w-full h-[8px] rounded-[2px] overflow-hidden mb-2.5" style={{ border: "1.5px solid #e0e0e0" }}>
              {epic.storyStats.done > 0 && (
                <div style={{ width: `${(epic.storyStats.done / epic.storyStats.total) * 100}%`, backgroundColor: DOT_DONE }} />
              )}
              {epic.storyStats.inProgress > 0 && (
                <div style={{ width: `${(epic.storyStats.inProgress / epic.storyStats.total) * 100}%`, backgroundColor: DOT_IN_PROGRESS }} />
              )}
              {epic.storyStats.todo > 0 && (
                <div style={{ width: `${(epic.storyStats.todo / epic.storyStats.total) * 100}%`, backgroundColor: DOT_TODO }} />
              )}
            </div>

            <div className="flex gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1">
                <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: DOT_DONE }} />
                <span style={{ color: TEXT }}>{epic.storyStats.done} done</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: DOT_IN_PROGRESS }} />
                <span style={{ color: TEXT }}>{epic.storyStats.inProgress} in progress</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-[6px] h-[6px] rounded-full border border-gray-300" style={{ backgroundColor: DOT_TODO }} />
                <span style={{ color: MUTED }}>{epic.storyStats.todo} todo</span>
              </span>
            </div>
          </div>
        )}

        {epic.assignee && (
          <div className="flex justify-between items-center" style={{ borderTop: BORDER, paddingTop: "8px", marginTop: "4px" }}>
            <span style={{ color: MUTED }}>Assignee</span>
            <span className="font-bold flex items-center gap-1.5" style={{ color: TEXT }}>
              <img src={epic.assignee.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
              {epic.assignee.displayName}
            </span>
          </div>
        )}
      </div>

      {/* Arrow — flips with the tooltip */}
      {pos && (
        <div
          className="absolute w-3 h-3"
          style={pos.below ? {
            // Tooltip is below cursor → arrow points up (top edge)
            top:             "-8px",
            left:            `${x - (pos?.left ?? x)}px`,
            transform:       "rotate(45deg)",
            backgroundColor: "#ffffff",
            borderLeft:      "3px solid #111111",
            borderTop:       "3px solid #111111",
          } : {
            // Tooltip is above cursor → arrow points down (bottom edge)
            bottom:          "-8px",
            left:            `${x - (pos?.left ?? x)}px`,
            transform:       "rotate(45deg)",
            backgroundColor: "#ffffff",
            borderRight:     "3px solid #111111",
            borderBottom:    "3px solid #111111",
          }}
        />
      )}
    </div>
  );
}
