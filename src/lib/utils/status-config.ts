// ─── Centralized release/issue status configuration ──────────────────────────
// Single source of truth for status labels and Tailwind class mappings.
// All colors are defined in tailwind.config.ts — this file only references them
// via Tailwind class names.
// Used by: ReleaseBlock, ReleaseTimeline, ReleasesOverlay, EpicPanel, ReleasePanel

import { JiraRelease, StoryFixVersion } from "@/types";

// ─── Release status types & config ───────────────────────────────────────────

export type ReleaseStatus = "released" | "overdue" | "upcoming";

export const RELEASE_STATUS_CONFIG = {
  released: {
    label: "Released",
    // Filter button style (light)
    bg: "bg-linear-secondaryLight",
    text: "text-linear-secondaryDark",
    border: "border-linear-secondary",
    // Solid bar/badge style
    solidBg: "bg-linear-secondary",
    solidText: "text-white",
    solidBorder: "border-linear-secondaryLight",
    solidOutline: "outline-linear-secondaryLight",
  },
  overdue: {
    label: "Overdue",
    bg: "bg-linear-dangerLight",
    text: "text-linear-dangerDark",
    border: "border-linear-danger",
    solidBg: "bg-linear-overdueSolid",
    solidText: "text-white",
    solidBorder: "border-linear-danger",
    solidOutline: "outline-linear-danger",
  },
  upcoming: {
    label: "Upcoming",
    bg: "bg-linear-inProgress",
    text: "text-linear-accentDark",
    border: "border-linear-accent",
    solidBg: "bg-linear-inProgress",
    solidText: "text-white",
    solidBorder: "border-linear-upcomingGold",
    solidOutline: "outline-linear-upcomingGold",
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
