"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { PCEpic } from "@/types";
import { EPIC_STATUS_CONFIG } from "@/lib/utils/status-config";
import { formatDateShort } from "@/lib/utils/format-utils";

const BAR_H = 30;
export const EPIC_BLOCK_HEIGHT = BAR_H;
export const EPIC_BLOCK_MARGIN = 10;

interface EpicTimelineBlockProps {
  epic: PCEpic;
  left: number;
  width: number;
  laneIndex: number;
  isSelected?: boolean;
  onClick?: (epic: PCEpic) => void;
}

export function EpicTimelineBlock({
  epic,
  left,
  width,
  laneIndex,
  isSelected = false,
  onClick,
}: EpicTimelineBlockProps) {
  const [mounted, setMounted] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => setMounted(true), []);

  const top = laneIndex * (EPIC_BLOCK_HEIGHT + EPIC_BLOCK_MARGIN) + EPIC_BLOCK_MARGIN;
  const minW = 140;
  const dispW = Math.max(width, minW);
  const cfg = EPIC_STATUS_CONFIG[epic.statusCategory];

  return (
    <>
      <div
        className="group absolute select-none"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${dispW}px`,
          minWidth: `${minW}px`,
          zIndex: 10,
          cursor: onClick ? "pointer" : "default",
          outline: isSelected ? `2px solid ${cfg.solidOutline}` : "none",
          outlineOffset: "2px",
          borderRadius: "6px",
        }}
        onClick={() => onClick?.(epic)}
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseEnter={(e) => {
          if (onClick) e.currentTarget.style.opacity = "0.82";
        }}
        onMouseLeave={(e) => {
          setTooltipPos(null);
          e.currentTarget.style.opacity = "1";
        }}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{
            height: `${BAR_H}px`,
            backgroundColor: cfg.solidBg,
            borderRadius: "6px",
            border: `1px solid ${cfg.solidBorder}`,
          }}
        >
          <div className="absolute inset-0 flex items-center px-2.5">
            <span
              className="text-[11px] font-bold tracking-wide whitespace-nowrap truncate"
              style={{ color: cfg.solidText }}
            >
              {epic.summary}
            </span>
          </div>
        </div>
      </div>

      {tooltipPos && mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999]"
            style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
          >
            <div
              className="bg-card border-border flex flex-col gap-1.5 rounded-xs border px-3 py-2.5 shadow-lg"
              style={{ minWidth: "240px", maxWidth: "320px" }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-muted text-foreground rounded-xs px-1.5 py-0.5 text-[9px] leading-none tracking-widest uppercase">
                  {epic.key}
                </span>
                <span
                  className="rounded-xs border px-1.5 py-0.5 text-[9px] leading-none tracking-widest uppercase"
                  style={{
                    backgroundColor: cfg.solidBg,
                    color: cfg.solidText,
                    borderColor: cfg.solidBorder,
                  }}
                >
                  {cfg.label}
                </span>
              </div>
              <span className="text-foreground text-xs leading-snug">{epic.summary}</span>
              {epic.initiative && (
                <span className="text-muted-foreground text-[10px] leading-snug">
                  Initiative: {epic.initiative.summary}
                </span>
              )}
              <div className="border-border mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 border-t pt-1.5">
                <div>
                  <span className="text-muted-foreground block text-[8px] tracking-widest uppercase">Start</span>
                  <span className="text-foreground text-[10px]">
                    {epic.startDate ? formatDateShort(epic.startDate) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[8px] tracking-widest uppercase">Due</span>
                  <span className="text-foreground text-[10px]">
                    {epic.dueDate ? formatDateShort(epic.dueDate) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
