export function getStatusColor(statusCategory: string): string {
  switch (statusCategory?.toLowerCase()) {
    case 'new':
    case 'to do':
    case 'todo':
      // Solid acid chartreuse — flat, no border
      return 'bg-linear-todo text-linear-text border-0';
    case 'indeterminate':
    case 'in progress':
    case 'inprogress':
      // Solid hot magenta — flat, no border
      return 'bg-linear-inProgress text-linear-text border-0';
    case 'done':
      // Solid neon mint — flat, no border
      return 'bg-linear-done text-linear-text border-0';
    default:
      return 'bg-linear-todo text-linear-text border-0';
  }
}
 

export function getBadgeColor(
  statusCategory: string,
  variant: 'status' | 'board' = 'status'
): string {
  if (variant === 'board') {
    return 'bg-linear-surface border border-linear-border text-linear-text';
  }

  // Status badge — solid fluo pill
  switch (statusCategory?.toLowerCase()) {
    case 'new':
    case 'todo':
    case 'to do':
      return 'bg-linear-todo text-linear-text border-0 font-bold';
    case 'indeterminate':
    case 'inprogress':
    case 'in progress':
      return 'bg-linear-inProgress text-linear-text border-0 font-bold';
    case 'done':
      return 'bg-linear-done text-linear-text border-0 font-bold';
    default:
      return 'bg-linear-todo text-linear-text border-0 font-bold';
  }
}
