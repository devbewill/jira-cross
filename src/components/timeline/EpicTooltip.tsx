"use client";

import { Epic } from "@/types";

interface EpicTooltipProps {
  epic: Epic;
  /** Cursor clientX */
  x: number;
  /** Cursor clientY */
  y: number;
}

export function EpicTooltip({ epic, x, y }: EpicTooltipProps) {
  return (
    <div
      className="fixed z-[9999] pointer-events-none rounded-[3px] text-sm"
      style={{
        top: `${y - 16}px`,
        left: `${x}px`,
        transform: "translate(-50%, -100%)",
        minWidth: "280px",
        backgroundColor: "#0C0C08",
        color: "#F2F2EA",
        padding: "16px",
        boxShadow: "6px 6px 0px rgba(0,0,0,0.35)",
      }}
    >
      {/* Key + Status */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px]"
          style={{ backgroundColor: "rgba(242,242,234,0.12)", color: "#F2F2EA" }}
        >
          {epic.key}
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-[2px]"
          style={{ backgroundColor: "rgba(242,242,234,0.10)", color: "rgba(242,242,234,0.6)" }}
        >
          {epic.status}
        </span>
      </div>

      {/* Summary */}
      <div
        className="mb-4 text-sm font-black leading-snug tracking-tight"
        style={{ color: "#F2F2EA" }}
      >
        {epic.summary}
      </div>

      {/* Meta */}
      <div
        className="text-xs space-y-2"
        style={{ borderTop: "1px solid rgba(242,242,234,0.12)", paddingTop: "12px" }}
      >
        {epic.startDate && (
          <div className="flex justify-between items-center">
            <span style={{ color: "rgba(242,242,234,0.5)" }}>Start</span>
            <span className="font-bold" style={{ color: "#F2F2EA" }}>{epic.startDate}</span>
          </div>
        )}
        {epic.dueDate && (
          <div className="flex justify-between items-center">
            <span style={{ color: "rgba(242,242,234,0.5)" }}>Due</span>
            <span className="font-bold" style={{ color: "#F2F2EA" }}>{epic.dueDate}</span>
          </div>
        )}
        {epic.storyPoints && (
          <div className="flex justify-between items-center">
            <span style={{ color: "rgba(242,242,234,0.5)" }}>Estimate</span>
            <span className="font-black" style={{ color: "#DDFF00" }}>{epic.storyPoints} pts</span>
          </div>
        )}
        {epic.assignee && (
          <div
            className="flex justify-between items-center"
            style={{ borderTop: "1px solid rgba(242,242,234,0.12)", paddingTop: "8px", marginTop: "4px" }}
          >
            <span style={{ color: "rgba(242,242,234,0.5)" }}>Assignee</span>
            <span className="font-bold flex items-center gap-1.5" style={{ color: "#F2F2EA" }}>
              <img src={epic.assignee.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
              {epic.assignee.displayName}
            </span>
          </div>
        )}
      </div>

      {/* Arrow */}
      <div
        className="absolute w-3 h-3"
        style={{
          bottom: "-6px",
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          backgroundColor: "#0C0C08",
        }}
      />
    </div>
  );
}
