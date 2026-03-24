// ─── Color utilities for status styling ───────────────────────────────────────
// Design System: Based on #FABD22 (Gold) and #1C2F54 (Dark Blue)
// Uses Tailwind classes from the linear color palette defined in tailwind.config.ts

export function getStatusColor(statusCategory: string): string {
  switch (statusCategory?.toLowerCase()) {
    case "new":
    case "to do":
    case "todo":
      return "bg-linear-todo text-linear-text border-[3px] border-linear-secondary";
    case "indeterminate":
    case "in progress":
    case "inprogress":
      // Gold bg — primary brand color for active work
      return "bg-linear-inProgress text-linear-text border-[3px] border-linear-secondary";
    case "done":
      return "bg-linear-done text-linear-text border-[3px] border-linear-secondary";
    default:
      return "bg-linear-todo text-linear-text border-[3px] border-linear-secondary";
  }
}

export function getBadgeColor(
  statusCategory: string,
  variant: "status" | "board" = "status",
): string {
  if (variant === "board") {
    return "bg-linear-surface border border-linear-border text-linear-text";
  }

  // Status badge — solid pill with modern colors
  switch (statusCategory?.toLowerCase()) {
    case "new":
    case "todo":
    case "to do":
      return "bg-linear-todo text-linear-text border-0 font-bold";
    case "indeterminate":
    case "inprogress":
    case "in progress":
      // Gold badge with dark border — primary brand color
      return "bg-linear-inProgress text-linear-text border border-linear-secondary font-bold";
    case "done":
      return "bg-linear-done text-linear-text border-0 font-bold";
    default:
      return "bg-linear-todo text-linear-text border-0 font-bold";
  }
}
