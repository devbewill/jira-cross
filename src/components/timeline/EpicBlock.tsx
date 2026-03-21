"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Epic } from "@/types";
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

  const blockHeight = 44;
  const blockMargin = 16;
  const top = laneIndex * (blockHeight + blockMargin) + blockMargin;

  const minWidth = 80;
  const displayWidth = Math.max(width, minWidth);

  const statusClasses = getStatusColor(epic.statusCategory);

  // Track the actual cursor position so the tooltip stays inside the
  // viewport even when the epic block is wider than the screen (today/weeks).
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
          absolute px-2 py-1.5 rounded-[6px]
          transition-all duration-200 ease-out
          cursor-pointer
          group
          ${statusClasses}
          ${selected
            ? "z-20 ring-1 ring-linear-accent ring-offset-2 ring-offset-linear-bg scale-[1.01]"
            : "z-10 hover:border-linear-textMuted hover:shadow-linear-hover shadow-linear-sm"
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
        <div className="h-full flex flex-col justify-center gap-[2px] overflow-hidden">
          <div className="flex justify-between items-center w-full">
            <span className="text-[9px] font-medium uppercase tracking-wider text-linear-textDim group-hover:text-linear-textMuted transition-colors">
              {epic.key}
            </span>
            {epic.dueDate && (
              <span className="text-[10px] text-linear-textMuted flex items-center gap-1">
                {new Date(epic.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
          <div className="text-xs text-linear-text font-medium leading-tight truncate">
            {epic.summary}
          </div>
        </div>
      </div>

      {/* Render tooltip via portal so it appears above ALL elements
          (header, board labels, etc.) regardless of stacking context */}
      {tooltipPos &&
        typeof document !== "undefined" &&
        createPortal(
          <EpicTooltip epic={epic} x={tooltipPos.x} y={tooltipPos.y} />,
          document.body,
        )}
    </>
  );
}
