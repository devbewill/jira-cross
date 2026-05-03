// ─── Color utilities for status styling ───────────────────────────────────────
// Design System: Based on #FABD22 (Gold) and #1C2F54 (Dark Blue)
// Uses Tailwind classes from the linear color palette defined in tailwind.config.ts

export function getStatusColor(statusCategory: string): string {
  switch (statusCategory?.toLowerCase()) {
    case "new":
    case "to do":
    case "todo":
      return "bg-slate-400 text-foreground border-[3px] border-slate-300";
    case "indeterminate":
    case "in progress":
    case "inprogress":
      // Gold bg — primary brand color for active work
      return "bg-amber-500 text-foreground border-[3px] border-slate-300";
    case "done":
      return "bg-emerald-500 text-foreground border-[3px] border-slate-300";
    default:
      return "bg-slate-400 text-foreground border-[3px] border-slate-300";
  }
}

export function getBadgeColor(
  statusCategory: string,
  variant: "status" | "board" = "status",
): string {
  if (variant === "board") {
    return "bg-card border border-border text-foreground";
  }

  // Status badge — solid pill with modern colors
  switch (statusCategory?.toLowerCase()) {
    case "new":
    case "todo":
    case "to do":
      return "bg-slate-400 text-foreground border-0 font-bold";
    case "indeterminate":
    case "inprogress":
    case "in progress":
      // Gold badge with dark border — primary brand color
      return "bg-amber-500 text-foreground border border-slate-300 font-bold";
    case "done":
      return "bg-emerald-500 text-foreground border-0 font-bold";
    default:
      return "bg-slate-400 text-foreground border-0 font-bold";
  }
}
