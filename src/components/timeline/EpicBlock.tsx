"use client";

import { useState } from "react";
import { Epic } from "@/types";
import { getStatusColor, getStatusTextColor } from "@/lib/utils/color-utils";
import { EpicTooltip } from "./EpicTooltip";

interface EpicBlockProps {
  epic: Epic;
  left: number;
  width: number;
  laneIndex: number;
  onClick?: (epic: Epic) => void;
  selected?: boolean;
}

export function EpicBlock({
  epic,
  left,
  width,
  laneIndex,
  onClick,
  selected = false,
}: EpicBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const blockHeight = 64;
  const blockMargin = 16;
  const top = laneIndex * (blockHeight + blockMargin) + blockMargin;

  const minWidth = 60;
  const displayWidth = Math.max(width, minWidth);

  const statusColor = getStatusColor(epic.statusCategory);
  const textColor = getStatusTextColor(epic.statusCategory);

  return (
    <>
      <div
        className={`
          absolute border-2 px-3 py-1
          transition-all duration-100 ease-out
          cursor-pointer
          ${statusColor}
          ${textColor}
          ${selected ? "z-20 scale-[1.02]" : "z-10 hover:-translate-y-1 hover:-translate-x-1"}
        `}
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${displayWidth}px`,
          height: `${blockHeight}px`,
          minWidth: `${minWidth}px`,
          boxShadow: selected ? "6px 6px 0px 0px rgba(0,0,0,1)" : "4px 4px 0px 0px rgba(0,0,0,1)",
        }}
        onClick={() => onClick?.(epic)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="h-full flex flex-col justify-center overflow-hidden gap-1">
          <div className="flex justify-between items-start w-full">
            <div className="text-[10px] font-black uppercase tracking-widest leading-none bg-white px-1 py-0.5 inline-block border-2 border-black text-black shadow-hard-sm">
              {epic.key}
            </div>
            {epic.dueDate && (
              <div className="text-[9px] font-black px-1 border-2 border-black text-black bg-white shadow-hard-sm whitespace-nowrap shrink-0 ml-2">
                ⏳ {epic.dueDate}
              </div>
            )}
          </div>
          <div className="text-xs font-bold leading-tight" style={{ 
            display: "-webkit-box", 
            WebkitLineClamp: "2", 
            WebkitBoxOrient: "vertical", 
            overflow: "hidden" 
          }}>
            {epic.summary}
          </div>
        </div>
      </div>

      {showTooltip && (
        <EpicTooltip epic={epic} top={top} left={left + displayWidth / 2} />
      )}
    </>
  );
}
