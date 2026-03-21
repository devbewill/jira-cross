export function getStatusColor(statusCategory: string): string {
  switch (statusCategory?.toLowerCase()) {
    case 'new':
    case 'to do':
    case 'todo':
      // Fluorescent soft lavender
      return 'bg-linear-todo/15 border border-linear-todo text-linear-text';
    case 'indeterminate':
    case 'in progress':
    case 'inprogress':
      // Fluorescent amber
      return 'bg-linear-inProgress/20 border border-linear-inProgress text-linear-text';
    case 'done':
      // Fluorescent green
      return 'bg-linear-done/20 border border-linear-done text-linear-text';
    default:
      return 'bg-linear-todo/15 border border-linear-todo text-linear-text';
  }
}
 

export function getBadgeColor(
  statusCategory: string,
  variant: 'status' | 'board' = 'status'
): string {
  if (variant === 'board') {
    return 'bg-linear-surface border border-linear-border text-linear-text';
  }

  // Status badge
  switch (statusCategory?.toLowerCase()) {
    case 'new':
    case 'todo':
    case 'to do':
      return 'bg-linear-todo/10 border border-linear-todo/60 text-linear-todo';
    case 'indeterminate':
    case 'inprogress':
    case 'in progress':
      return 'bg-linear-inProgress/15 border border-linear-inProgress text-linear-warning';
    case 'done':
      return 'bg-linear-done/15 border border-linear-done text-linear-success';
    default:
      return 'bg-linear-todo/10 border border-linear-todo/60 text-linear-todo';
  }
}
