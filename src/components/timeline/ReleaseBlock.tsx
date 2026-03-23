"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { JiraRelease } from "@/types";

// ─── Layout constants ─────────────────────────────────────────────────────────
const INFO_H = 22;
const GAP    = 4;
const BAR_H  = 30;
export const REL_BLOCK_HEIGHT = INFO_H + GAP + BAR_H; // 56 px  (same as EpicBlock)
export const REL_BLOCK_MARGIN = 14;

// ─── Status helpers ───────────────────────────────────────────────────────────

type ReleaseStatus = "released" | "overdue" | "upcoming";

export function releaseStatusOf(r: JiraRelease): ReleaseStatus {
  if (r.released) return "released";
  if (r.releaseDate && new Date(r.releaseDate) < new Date()) return "overdue";
  return "upcoming";
}

export const RELEASE_STATUS_CFG = {
  released: { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", label: "Released" },
  overdue:  { bg: "#FEE2E2", text: "#B91C1C", border: "#FCA5A5", label: "Overdue"  },
  upcoming: { bg: "#FEF3E8", text: "#C2590A", border: "#FDBA74", label: "Upcoming" },
} as const;

function fmtShort(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (diff > 0)   return `${diff}d to release`;
  if (diff === 0) return "Due today";
  return `${Math.abs(diff)}d overdue`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ReleaseBlockProps {
  release: JiraRelease;
  left: number;
  width: number;
  laneIndex: number;
  isSelected?: boolean;
  onClick?: (release: JiraRelease) => void;
}

export function ReleaseBlock({ release, left, width, laneIndex, isSelected = false, onClick }: ReleaseBlockProps) {
  const [mounted,    setMounted]    = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => setMounted(true), []);

  const top    = laneIndex * (REL_BLOCK_HEIGHT + REL_BLOCK_MARGIN) + REL_BLOCK_MARGIN;
  const minW   = 120;
  const dispW  = Math.max(width, minW);
  const status = releaseStatusOf(release);
  const cfg    = RELEASE_STATUS_CFG[status];
  const label  = !release.released ? daysUntil(release.releaseDate) : null;

  return (
    <>
      <div
        className="absolute group select-none"
        style={{
          left: `${left}px`, top: `${top}px`, width: `${dispW}px`, minWidth: `${minW}px`, zIndex: 10,
          cursor: onClick ? "pointer" : "default",
          outline: isSelected ? `2px solid ${cfg.border}` : "none",
          outlineOffset: "2px",
          borderRadius: "10px",
        }}
        onClick={() => onClick?.(release)}
        onMouseMove={(e) => { if (!onClick) setTooltipPos({ x: e.clientX, y: e.clientY }); }}
        onMouseEnter={(e) => { if (onClick) e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={(e) => { setTooltipPos(null); e.currentTarget.style.opacity = "1"; }}
      >
        {/* ── Info row ── */}
        <div
          className="flex items-center justify-between gap-2 overflow-hidden"
          style={{ height: `${INFO_H}px`, marginBottom: `${GAP}px` }}
        >
          <span className="text-[12px] font-semibold leading-none tracking-tight truncate min-w-0 text-[#1A1A1B]">
            {release.name}
          </span>
          <span
            className="text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none flex-shrink-0"
            style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
        </div>

        {/* ── Colored bar ── */}
        <div
          className="relative w-full rounded-lg overflow-hidden transition-all duration-150"
          style={{
            height:          `${BAR_H}px`,
            backgroundColor: cfg.bg,
            border:          `1px solid ${cfg.border}`,
            boxShadow:       "0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <div className="relative z-10 h-full flex items-center justify-between px-2.5">
            <span
              className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none"
              style={{ backgroundColor: "rgba(0,0,0,0.08)", color: cfg.text }}
            >
              {release.projectKey}
            </span>

            <div className="flex items-center gap-2">
              {label && (
                <span
                  className="text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none"
                  style={{ backgroundColor: "rgba(0,0,0,0.08)", color: cfg.text }}
                >
                  {label}
                </span>
              )}
              {release.releaseDate && (
                <span className="text-[9px] font-medium opacity-70" style={{ color: cfg.text }}>
                  {new Date(release.releaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tooltip via portal ── */}
      {tooltipPos && mounted && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
        >
          <div
            className="bg-white rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
            style={{
              border:    "1px solid #E8E8EF",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
              minWidth:  "200px",
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none"
                style={{ backgroundColor: "#1A1A1B", color: "#fff" }}
              >
                {release.projectKey}
              </span>
              <span
                className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none"
                style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
              >
                {cfg.label}
              </span>
            </div>

            <span className="text-xs font-semibold text-[#1A1A1B]">
              {release.name}
            </span>

            {release.description && (
              <span className="text-[10px] text-[#717171] leading-snug">{release.description}</span>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 pt-1.5" style={{ borderTop: "1px solid #E8E8EF" }}>
              <div>
                <span className="block text-[8px] font-semibold uppercase tracking-widest text-[#A0A0A8]">Start</span>
                <span className="text-[10px] font-semibold text-[#1A1A1B]">{release.startDate ? fmtShort(release.startDate) : "—"}</span>
              </div>
              <div>
                <span className="block text-[8px] font-semibold uppercase tracking-widest text-[#A0A0A8]">Release</span>
                <span className="text-[10px] font-semibold text-[#1A1A1B]">{fmtShort(release.releaseDate)}</span>
              </div>
            </div>

            {label && (
              <span
                className="text-[9px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md text-center"
                style={{
                  backgroundColor: status === "overdue" ? "#FEE2E2" : "#F4F4F7",
                  color:           status === "overdue" ? "#B91C1C" : "#4A4A4A",
                }}
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
