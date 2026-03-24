// ─── Centralized release/issue status configuration ──────────────────────────
// Single source of truth for status colors, labels, and helpers.
// Used by: ReleaseBlock, ReleaseTimeline, ReleasesOverlay, EpicPanel, ReleasePanel

import { JiraRelease, StoryFixVersion } from "@/types";

// ─── Story status dot colors — actual hex/hsl values for use in inline styles ─
// Use Tailwind classes (bg-linear-done etc.) when possible, these are for
// cases where inline style={{ backgroundColor }} is unavoidable (canvas math,
// dynamic segment bars, etc.)

export const STATUS_COLORS = {
  done:       "#22C55E",
  inProgress: "hsl(43 96% 56%)",
  todo:       "#E5E7EB",
} as const;

// ─── Release status types & config ───────────────────────────────────────────

export type ReleaseStatus = "released" | "overdue" | "upcoming";

export const RELEASE_STATUS_CONFIG = {
  released: {
    label: "Released",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-300",
    bgHex: "#DCFCE7",
    textHex: "#15803D",
    borderHex: "#86EFAC",
  },
  overdue: {
    label: "Overdue",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
    bgHex: "#FEE2E2",
    textHex: "#B91C1C",
    borderHex: "#FCA5A5",
  },
  upcoming: {
    label: "Upcoming",
    bg: "bg-linear-accentLight",
    text: "text-orange-700",
    border: "border-orange-300",
    bgHex: "#FEF3E8",
    textHex: "#C2590A",
    borderHex: "#FDBA74",
  },
} as const;

// ─── Status resolvers ────────────────────────────────────────────────────────

export function releaseStatusOf(r: JiraRelease): ReleaseStatus {
  if (r.released) return "released";
  if (r.releaseDate && new Date(r.releaseDate) < new Date()) return "overdue";
  return "upcoming";
}

export function fixVersionStatusOf(fv: StoryFixVersion): ReleaseStatus {
  if (fv.released) return "released";
  if (fv.releaseDate && new Date(fv.releaseDate) < new Date()) return "overdue";
  return "upcoming";
}

// ─── Status dot color for story status categories ────────────────────────────

export function statusDotColor(statusCategory: string): string {
  if (statusCategory === "done") return STATUS_COLORS.done;
  if (statusCategory === "indeterminate" || statusCategory === "in-progress")
    return STATUS_COLORS.inProgress;
  return STATUS_COLORS.todo;
}
