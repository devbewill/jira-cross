// ─── Centralized release/issue status configuration ──────────────────────────
// Single source of truth for status labels and Tailwind class mappings.
// All colors are defined in tailwind.config.ts — this file only references them
// via Tailwind class names.
// Used by: ReleaseBlock, ReleaseTimeline, ReleasesOverlay, EpicPanel, ReleasePanel

import { JiraRelease, StoryFixVersion } from "@/types";

// ─── Release status types & config ───────────────────────────────────────────

export type ReleaseStatus = "released" | "overdue" | "upcoming";

// Palette monocromatica viola/fucsia per tutti gli stati release
export const RELEASE_STATUS_CONFIG = {
  released: {
    label: "Released",
    bg: "bg-linear-secondaryLight",
    text: "text-linear-secondaryDark",      // #4A4A6A su #EEEEF8 — leggibile
    border: "border-linear-secondary",
    solidBg: "bg-linear-done",              // violet-700 (#6D28D9) — visibile
    solidText: "text-white",
    solidBorder: "border-linear-done",
    solidOutline: "outline-linear-done",
  },
  overdue: {
    label: "Overdue",
    bg: "bg-linear-overdueLight/10",
    text: "text-linear-overdueSolid",       // fuchsia-600 (#C026D3)
    border: "border-linear-overdueSolid",
    solidBg: "bg-linear-overdueSolid",      // fuchsia-600
    solidText: "text-white",
    solidBorder: "border-linear-overdueSolid",
    solidOutline: "outline-linear-overdueSolid",
  },
  upcoming: {
    label: "Upcoming",
    bg: "bg-linear-secondaryLight",
    text: "text-linear-accentDark",
    border: "border-linear-accent",
    solidBg: "bg-linear-inProgress",        // violet-500 (#8B5CF6)
    solidText: "text-white",
    solidBorder: "border-linear-inProgress",
    solidOutline: "outline-linear-inProgress",
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

// ─── Status dot class for story status categories ─────────────────────────────

export function statusDotClass(statusCategory: string): string {
  if (statusCategory === "done") return "bg-linear-done";
  if (statusCategory === "indeterminate" || statusCategory === "in-progress")
    return "bg-linear-inProgress";
  return "bg-linear-todo";
}
