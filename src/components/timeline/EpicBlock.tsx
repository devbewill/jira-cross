"use client";

import { useState, useRef, useEffect } from "react";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const blockHeight = 58;
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
          absolute px-3 py-2.5 rounded-[3px]
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
        <div className="h-full flex flex-col justify-between overflow-hidden">
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
        </div>
      </div>

      {/* Render tooltip via portal so it appears above ALL elements */}
      {tooltipPos &&
        mounted &&
        createPortal(
          <EpicTooltip epic={epic} x={tooltipPos.x} y={tooltipPos.y} />,
          document.body,
        )}
    </>
  );
}
