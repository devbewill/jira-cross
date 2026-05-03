"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { JiraRelease } from "@/types";
import {
  releaseStatusOf,
  RELEASE_STATUS_CONFIG,
} from "@/lib/utils/status-config";
import { daysLabel, formatDateShort } from "@/lib/utils/format-utils";

// ─── Layout constants ─────────────────────────────────────────────────────────
const BAR_H = 30;
export const REL_BLOCK_HEIGHT = BAR_H;
export const REL_BLOCK_MARGIN = 14;

// ─── Component ────────────────────────────────────────────────────────────────

interface ReleaseBlockProps {
  release: JiraRelease;
  left: number;
  width: number;
  laneIndex: number;
  isSelected?: boolean;
  onClick?: (release: JiraRelease) => void;
}

export function ReleaseBlock({
  release,
  left,
  width,
  laneIndex,
  isSelected = false,
  onClick,
}: ReleaseBlockProps) {
  const [mounted, setMounted] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );
  useEffect(() => setMounted(true), []);

  const top =
    laneIndex * (REL_BLOCK_HEIGHT + REL_BLOCK_MARGIN) + REL_BLOCK_MARGIN;
  const minW = 120;
  const dispW = Math.max(width, minW);
  const status = releaseStatusOf(release);
  const cfg = RELEASE_STATUS_CONFIG[status];
  const label = !release.released ? daysLabel(release.releaseDate) : null;

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
          borderRadius: "5px",
        }}
        onClick={() => onClick?.(release)}
        onMouseMove={(e) => {
          if (!onClick) setTooltipPos({ x: e.clientX, y: e.clientY });
        }}
        onMouseEnter={(e) => {
          if (onClick) e.currentTarget.style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          setTooltipPos(null);
          e.currentTarget.style.opacity = "1";
        }}
      >
        {/* Colored bar — name inside */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            height: `${BAR_H}px`,
            backgroundColor: cfg.solidBg,
            borderRadius: "5px",
          }}
        >
          <div className="absolute inset-0 flex items-center px-2.5">
            <span
              className="text-[11px] font-bold tracking-wide whitespace-nowrap uppercase truncate"
              style={{ color: cfg.solidText }}
            >
              {release.name}
            </span>
          </div>
        </div>
      </div>

      {/* Tooltip via portal */}
      {tooltipPos &&
        mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999]"
            style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
          >
            <div
              className="bg-card border-border flex flex-col gap-1.5 rounded-xs border px-3 py-2.5 shadow-lg"
              style={{ minWidth: "200px" }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-muted text-foreground rounded-xs px-1.5 py-0.5 text-[9px] leading-none tracking-widest uppercase">
                  {release.projectKey}
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
              <span className="text-foreground text-xs">{release.name}</span>
              {release.description && (
                <span className="text-muted-foreground text-[10px] leading-snug">
                  {release.description}
                </span>
              )}
              <div className="border-border mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 border-t pt-1.5">
                <div>
                  <span className="text-muted-foreground block text-[8px] tracking-widest uppercase">
                    Start
                  </span>
                  <span className="text-foreground text-[10px]">
                    {release.startDate
                      ? formatDateShort(release.startDate)
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[8px] tracking-widest uppercase">
                    Release
                  </span>
                  <span className="text-foreground text-[10px]">
                    {formatDateShort(release.releaseDate)}
                  </span>
                </div>
              </div>
              {label && (
                <span
                  className="rounded-xs px-2 py-1 text-center text-[9px] tracking-widest uppercase"
                  style={{
                    backgroundColor:
                      status === "overdue"
                        ? "rgba(192,38,211,0.12)"
                        : "rgba(0,0,0,0.05)",
                    color: status === "overdue" ? "#C026D3" : undefined,
                  }}
                >
                  {label}
                </span>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
