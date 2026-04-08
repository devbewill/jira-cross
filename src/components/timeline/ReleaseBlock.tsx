"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { JiraRelease } from "@/types";
import {
  releaseStatusOf,
  RELEASE_STATUS_CONFIG,
} from "@/lib/utils/status-config";
import {
  daysLabel,
  formatDateCompact,
  formatDateShort,
} from "@/lib/utils/format-utils";

// ─── Layout constants ─────────────────────────────────────────────────────────
const INFO_H = 22;
const GAP = 4;
const BAR_H = 30;
export const REL_BLOCK_HEIGHT = INFO_H + GAP + BAR_H;
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
    null,
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
        className={`absolute group select-none rounded-[10px] ${
          isSelected ? `outline-2 outline-offset-2 ${cfg.solidOutline}` : ""
        }`}
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${dispW}px`,
          minWidth: `${minW}px`,
          zIndex: 10,
          cursor: onClick ? "pointer" : "default",
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
        {/* Info row */}
        <div
          className="flex items-center justify-between gap-2 overflow-hidden"
          style={{ height: `${INFO_H}px`, marginBottom: `${GAP}px` }}
        >
          <span className="text-[12px] font-semibold leading-none tracking-tight truncate min-w-0 text-linear-text">
            {release.name}
          </span>
          <span
            className={`text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none flex-shrink-0 border ${cfg.solidBg} ${cfg.solidText} ${cfg.solidBorder}`}
          >
            {cfg.label}
          </span>
        </div>

        {/* Colored bar */}
        <div
          className={`relative w-full rounded-lg overflow-hidden transition-all duration-150 border ${cfg.solidBg} ${cfg.solidBorder}`}
          style={{ height: `${BAR_H}px` }}
        >
          <div className="relative z-10 h-full flex items-center justify-between px-2.5">
            <span
              className={`text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none bg-black/[0.08] ${cfg.solidText}`}
            >
              {release.projectKey}
            </span>

            <div className="flex items-center gap-2">
              {label && (
                <span
                  className={`text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none bg-black/[0.08] ${cfg.solidText}`}
                >
                  {label}
                </span>
              )}
              {release.releaseDate && (
                <span
                  className={`text-[9px] font-medium ${cfg.solidText}`}
                >
                  {formatDateCompact(release.releaseDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip via portal */}
      {tooltipPos &&
        mounted &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
          >
            <div
              className="bg-linear-surface rounded-xl px-3 py-2.5 flex flex-col gap-1.5 border border-linear-border"
              style={{ minWidth: "200px" }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none bg-linear-text text-white">
                  {release.projectKey}
                </span>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none border ${cfg.solidBg} ${cfg.solidText} ${cfg.solidBorder}`}
                >
                  {cfg.label}
                </span>
              </div>

              <span className="text-xs font-semibold text-linear-text">
                {release.name}
              </span>

              {release.description && (
                <span className="text-[10px] text-linear-textSecondary leading-snug">
                  {release.description}
                </span>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 pt-1.5 border-t border-linear-border">
                <div>
                  <span className="block text-[8px] font-semibold uppercase tracking-widest text-linear-textDim">
                    Start
                  </span>
                  <span className="text-[10px] font-semibold text-linear-text">
                    {release.startDate
                      ? formatDateShort(release.startDate)
                      : "\u2014"}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-semibold uppercase tracking-widest text-linear-textDim">
                    Release
                  </span>
                  <span className="text-[10px] font-semibold text-linear-text">
                    {formatDateShort(release.releaseDate)}
                  </span>
                </div>
              </div>

              {label && (
                <span
                  className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md text-center ${
                    status === "overdue"
                      ? "bg-linear-overdueLight text-linear-dangerDark"
                      : "bg-linear-bg text-linear-text"
                  }`}
                >
                  {label}
                </span>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
