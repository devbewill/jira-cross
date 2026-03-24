// ─── Centralized release/issue status configuration ──────────────────────────
// Single source of truth for status colors, labels, and helpers.
// Used by: ReleaseBlock, ReleaseTimeline, ReleasesOverlay, EpicPanel, ReleasePanel
// Design System: Fluid & Disruptive - Based on #FABD22 (Gold) and #1C2F54 (Dark Blue)

import { JiraRelease, StoryFixVersion } from "@/types";

// ─── Story status dot colors — actual hex/hsl values for use in inline styles ─
// Use Tailwind classes (bg-linear-done etc.) when possible, these are for
// cases where inline style={{ backgroundColor }} is unavoidable (canvas math,
// dynamic segment bars, etc.)

export const STATUS_COLORS = {
  done: "#1C2F54", // Dark blue - completed (primary brand color)
  inProgress: "#FABD22", // Gold - active work (main accent)
  todo: "#1E293B", // Dark gray - neutral for pending
} as const;

// ─── Release status types & config ───────────────────────────────────────────
// Using the gold (#FABD22) and dark blue (#1C2F54) palette

export type ReleaseStatus = "released" | "overdue" | "upcoming";

export const RELEASE_STATUS_CONFIG = {
  released: {
    label: "Released",
    bg: "bg-linear-secondaryLight",
    text: "text-linear-secondaryDark",
    border: "border-linear-secondary",
    bgHex: "#1C2F54",
    textHex: "#FFFFFF",
    borderHex: "#3D5A8A",
  },
  overdue: {
    label: "Overdue",
    bg: "bg-linear-dangerLight",
    text: "text-linear-dangerDark",
    border: "border-linear-danger",
    bgHex: "#DC2626",
    textHex: "#FFFFFF",
    borderHex: "#EF4444",
  },
  upcoming: {
    label: "Upcoming",
    bg: "bg-linear-primaryLight",
    text: "text-linear-primaryDark",
    border: "border-linear-primary",
    bgHex: "#FABD22",
    textHex: "#FFFFFF",
    borderHex: "#FFD700",
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
