import { ISSUE_COLORS } from './jira-colors'
import type { JiraRelease } from '@/types'

export type ReleaseStatus = 'released' | 'overdue' | 'upcoming'

export const RELEASE_STATUS_CONFIG = {
  // Released = done → green pastel
  released: {
    label: 'Released',
    pillBg: ISSUE_COLORS.done.tagBg,
    pillText: ISSUE_COLORS.done.text,
    pillBorder: ISSUE_COLORS.done.border,
    solidBg: 'rgba(16,185,129,0.5)',
    solidText: ISSUE_COLORS.done.text,
    solidBorder: 'rgba(16,185,129,0.08)',
    solidOutline: ISSUE_COLORS.done.outline,
  },
  // Overdue = blocked/urgent → red pastel
  overdue: {
    label: 'Overdue',
    pillBg: ISSUE_COLORS.blocked.tagBg,
    pillText: ISSUE_COLORS.blocked.text,
    pillBorder: ISSUE_COLORS.blocked.border,
    solidBg: 'rgba(239,68,68,0.5)',
    solidText: ISSUE_COLORS.blocked.text,
    solidBorder: 'rgba(239,68,68,0.08)',
    solidOutline: ISSUE_COLORS.blocked.outline,
  },
  // Upcoming = in progress → amber pastel
  upcoming: {
    label: 'Upcoming',
    pillBg: ISSUE_COLORS.inProgress.tagBg,
    pillText: ISSUE_COLORS.inProgress.text,
    pillBorder: ISSUE_COLORS.inProgress.border,
    solidBg: 'rgba(245,158,11,0.5)',
    solidText: ISSUE_COLORS.inProgress.text,
    solidBorder: 'rgba(245,158,11,0.08)',
    solidOutline: ISSUE_COLORS.inProgress.outline,
  },
} as const

export function releaseStatusOf(r: JiraRelease): ReleaseStatus {
  if (r.released) return 'released'
  if (r.releaseDate && new Date(r.releaseDate) < new Date()) return 'overdue'
  return 'upcoming'
}

export function fixVersionStatusOf(fv: { released: boolean; releaseDate: string | null }): ReleaseStatus {
  if (fv.released) return 'released'
  if (fv.releaseDate && new Date(fv.releaseDate) < new Date()) return 'overdue'
  return 'upcoming'
}

export function statusDotClass(statusCategory: string): string {
  if (statusCategory === 'done') return ISSUE_COLORS.done.dot
  if (statusCategory === 'indeterminate' || statusCategory === 'in-progress')
    return ISSUE_COLORS.inProgress.dot
  return ISSUE_COLORS.todo.dot
}
