import { getCategoryBadgeColor } from "@/lib/utils/color-utils";

interface BadgeProps {
  label: string;
  variant?: "status" | "default";
  statusCategory?: "todo" | "in-progress" | "done";
}

export function Badge({
  label,
  variant = "default",
  statusCategory,
}: BadgeProps) {
  let colorClass = "bg-white text-black border-2 border-black";

  if (variant === "status" && statusCategory) {
    colorClass = getCategoryBadgeColor(statusCategory);
  }

  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-widest leading-none ${colorClass}`}
    >
      {label}
    </span>
  );
}
