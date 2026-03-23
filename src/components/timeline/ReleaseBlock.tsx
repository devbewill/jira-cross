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
  released: { bg: "#57e51e",          text: "#111", border: "#3aad14", label: "Released" },
  overdue:  { bg: "#FF2D55",          text: "#fff", border: "#cc0033", label: "Overdue"  },
  upcoming: { bg: "rgb(255,157,225)", text: "#111", border: "#e060a0", label: "Upcoming" },
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
}

export function ReleaseBlock({ release, left, width, laneIndex }: ReleaseBlockProps) {
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
        className="absolute group cursor-default select-none"
        style={{ left: `${left}px`, top: `${top}px`, width: `${dispW}px`, minWidth: `${minW}px`, zIndex: 10 }}
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltipPos(null)}
      >
        {/* ── Info row ── */}
        <div
          className="flex items-center justify-between gap-2 overflow-hidden"
          style={{ height: `${INFO_H}px`, marginBottom: `${GAP}px` }}
        >
          <span className="text-[12px] font-black uppercase leading-none tracking-tight truncate min-w-0 text-linear-text">
            {release.name}
          </span>
          <span
            className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] leading-none flex-shrink-0"
            style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1.5px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
        </div>

        {/* ── Colored bar ── */}
        <div
          className="relative w-full rounded-[3px] overflow-hidden transition-all duration-100 group-hover:-translate-x-px group-hover:-translate-y-px"
          style={{
            height:          `${BAR_H}px`,
            backgroundColor: cfg.bg,
            border:          "2px solid #111",
            boxShadow:       "2px 2px 0 #111",
          }}
        >
          <div className="relative z-10 h-full flex items-center justify-between px-2.5">
            <span
              className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] leading-none"
              style={{ backgroundColor: "rgba(0,0,0,0.18)", color: cfg.text }}
            >
              {release.projectKey}
            </span>

            <div className="flex items-center gap-2">
              {label && (
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] leading-none"
                  style={{ backgroundColor: "rgba(0,0,0,0.18)", color: cfg.text }}
                >
                  {label}
                </span>
              )}
              {release.releaseDate && (
                <span className="text-[9px] font-bold opacity-60" style={{ color: cfg.text }}>
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
            className="bg-white rounded-[3px] px-3 py-2.5 flex flex-col gap-1.5"
            style={{ border: "2px solid #111", boxShadow: "3px 3px 0 #111", minWidth: "200px" }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] leading-none"
                style={{ backgroundColor: "#111", color: "#fff" }}
              >
                {release.projectKey}
              </span>
              <span
                className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] leading-none"
                style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1.5px solid ${cfg.border}` }}
              >
                {cfg.label}
              </span>
            </div>

            <span className="text-xs font-black uppercase tracking-tight text-[#111]">
              {release.name}
            </span>

            {release.description && (
              <span className="text-[10px] text-[#888] leading-snug">{release.description}</span>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 border-t border-[#f0f0f0] pt-1.5">
              <div>
                <span className="block text-[8px] font-black uppercase tracking-widest text-[#bbb]">Start</span>
                <span className="text-[10px] font-bold text-[#111]">{release.startDate ? fmtShort(release.startDate) : "—"}</span>
              </div>
              <div>
                <span className="block text-[8px] font-black uppercase tracking-widest text-[#bbb]">Release</span>
                <span className="text-[10px] font-bold text-[#111]">{fmtShort(release.releaseDate)}</span>
              </div>
            </div>

            {label && (
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[2px] text-center"
                style={{
                  backgroundColor: status === "overdue" ? "#FF2D55" : "#f0f0f0",
                  color:           status === "overdue" ? "#fff"    : "#555",
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
