import { getBadgeColor } from '@/lib/utils/color-utils';

interface BadgeProps {
  label: string;
  variant?: 'status' | 'board';
  statusCategory?: string;
}

export function Badge({ label, variant = 'status', statusCategory = 'todo' }: BadgeProps) {
  const colorClasses = getBadgeColor(statusCategory, variant);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${colorClasses}`}
    >
      {variant === 'status' && (
        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      )}
      {label}
    </span>
  );
}
