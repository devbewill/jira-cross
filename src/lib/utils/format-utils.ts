// ─── Centralized date formatting & helpers ───────────────────────────────────
// Single source of truth for date formatting across all components.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Format ISO date string to "01 Mar 2025" style */
export function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format ISO date string to "Mar 1, 2025" style */
export function formatDateShort(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format ISO date string to "Mar 1" style (no year) */
export function formatDateCompact(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Returns days until a date (positive = future, negative = past, 0 = today) */
export function daysUntilDate(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / MS_PER_DAY);
}

/** Returns a human-readable label like "5d to release", "Due today", "3d overdue" */
export function daysLabel(iso: string | null, released?: boolean): string | null {
  if (!iso || released) return null;
  const diff = daysUntilDate(iso);
  if (diff === null) return null;
  if (diff > 0) return `${diff}d to release`;
  if (diff === 0) return "Due today";
  return `${Math.abs(diff)}d overdue`;
}
