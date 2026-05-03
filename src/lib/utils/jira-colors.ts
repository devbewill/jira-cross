export const ISSUE_COLORS = {
  todo: {
    tagBg: 'rgba(74, 74, 106, 0.08)',
    text: '#525270',
    border: 'rgba(74, 74, 106, 0.12)',
    outline: 'rgba(82, 82, 112, 0.6)',
    dot: '#626280',
  },
  inProgress: {
    tagBg: 'rgba(245, 158, 11, 0.12)', // amber-500
    text: '#B45309', // amber-700
    border: 'rgba(245, 158, 11, 0.2)',
    outline: 'rgba(217, 119, 6, 0.6)',
    dot: '#F59E0B',
  },
  done: {
    tagBg: 'rgba(16, 185, 129, 0.12)', // emerald-500
    text: '#047857', // emerald-700
    border: 'rgba(16, 185, 129, 0.2)',
    outline: 'rgba(5, 150, 105, 0.6)',
    dot: '#10B981',
  },
  blocked: {
    tagBg: 'rgba(239, 68, 68, 0.12)', // red-500
    text: '#B91C1C', // red-700
    border: 'rgba(239, 68, 68, 0.2)',
    outline: 'rgba(220, 38, 38, 0.6)',
    dot: '#EF4444',
  },
} as const
