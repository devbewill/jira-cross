"use client";

import { Epic } from "@/types";

interface EpicTooltipProps {
  epic: Epic;
  top: number;
  left: number;
}

export function EpicTooltip({ epic, top, left }: EpicTooltipProps) {
  return (
    <div
      className="absolute bg-white border-2 border-black text-black p-6 text-sm z-50 pointer-events-none shadow-hard"
      style={{
        top: `${top - 60}px`,
        left: `${left}px`,
        transform: "translateX(-50%)",
        minWidth: "220px",
      }}
    >
      <div className="font-black text-lg mb-2 text-black uppercase tracking-wider bg-fluo-yellow inline-block px-1 border-2 border-black shadow-hard-sm">
        {epic.key}
      </div>
      <div className="mb-3 truncate text-black font-medium">{epic.summary}</div>
      <div className="text-xs text-black space-y-2 uppercase tracking-wider font-bold">
        <div className="flex justify-between border-b-2 border-black pb-1">
          <span>Status:</span>
          <span>{epic.status}</span>
        </div>
        {epic.startDate && (
          <div className="flex justify-between border-b border-gray-300 pb-1">
            <span>Start:</span>
            <span>{epic.startDate}</span>
          </div>
        )}
        {epic.dueDate && (
          <div className="flex justify-between border-b border-gray-300 pb-1">
            <span>Due:</span>
            <span>{epic.dueDate}</span>
          </div>
        )}
        {epic.storyPoints && (
          <div className="flex justify-between border-b border-gray-300 pb-1 text-fluo-lime drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
            <span className="text-black drop-shadow-none">Points:</span>
            <span>{epic.storyPoints}</span>
          </div>
        )}
        {epic.assignee && (
          <div className="flex justify-between pt-1">
            <span>Assignee:</span>
            <span>{epic.assignee.displayName}</span>
          </div>
        )}
      </div>

      {/* Tooltip arrow */}
      <div
        className="absolute w-4 h-4 bg-white border-b-2 border-r-2 border-black"
        style={{
          bottom: "-9px",
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
        }}
      />
    </div>
  );
}
