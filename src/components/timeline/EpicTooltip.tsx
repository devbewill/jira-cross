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
      className="fixed bg-linear-surface border border-linear-border text-linear-text p-4 text-sm z-[9999] pointer-events-none shadow-popover rounded-[8px]"
      style={{
        top: `${y - 16}px`,          // 16px sopra il cursore
        left: `${x}px`,
        transform: "translate(-50%, -100%)",  // centrato sul cursore
        minWidth: "260px",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono text-linear-textMuted bg-linear-surfaceActive px-1.5 py-0.5 rounded border border-linear-border shrink-0">
          {epic.key}
        </span>
        <span className="text-[10px] text-linear-textDim px-2 border border-linear-border rounded-full bg-linear-surfaceHover">
          {epic.status}
        </span>
      </div>

      <div className="mb-4 text-sm font-medium leading-snug">{epic.summary}</div>

      <div className="text-xs space-y-2">
        {epic.startDate && (
          <div className="flex justify-between items-center text-linear-textMuted">
            <span>Start date</span>
            <span className="text-linear-text">{epic.startDate}</span>
          </div>
        )}
        {epic.dueDate && (
          <div className="flex justify-between items-center text-linear-textMuted">
            <span>Due date</span>
            <span className="text-linear-text">{epic.dueDate}</span>
          </div>
        )}
        {epic.storyPoints && (
          <div className="flex justify-between items-center text-linear-textMuted pt-1">
            <span>Estimate</span>
            <span className="text-linear-text font-medium">
              {epic.storyPoints} pts
            </span>
          </div>
        )}
        {epic.assignee && (
          <div className="flex justify-between items-center text-linear-textMuted pt-1 border-t border-linear-border mt-2">
            <span>Assignee</span>
            <span className="text-linear-text flex items-center gap-1.5 mt-2">
              <img
                src={epic.assignee.avatarUrl}
                alt=""
                className="w-4 h-4 rounded-full"
              />
              {epic.assignee.displayName}
            </span>
          </div>
        )}
      </div>

      {/* Arrow */}
      <div
        className="absolute w-3 h-3 bg-linear-surface border-r border-b border-linear-border"
        style={{
          bottom: "-7px",
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
        }}
      />
    </div>
  );
}
