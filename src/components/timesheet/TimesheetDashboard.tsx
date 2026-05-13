"use client";

import { useState, useMemo } from 'react';
import { RefreshCw, ChevronDown, Clock, Users, Briefcase, FileText, ExternalLink } from 'lucide-react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useGroup } from '@/hooks/useGroup';
import { useRefresh } from '@/contexts/RefreshContext';
import { UserTimesheet } from '@/types';

const JIRA_BROWSE = `${process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? ''}/browse`;
// ─── Helpers ──────────────────────────────────────────────────────────────────

const WORK_DAY_S = 8 * 3600

function formatSeconds(s: number): string {
  if (s >= WORK_DAY_S) {
    const days = Math.floor(s / WORK_DAY_S)
    const rem = s % WORK_DAY_S
    const h = Math.floor(rem / 3600)
    const m = Math.floor((rem % 3600) / 60)
    if (h === 0 && m === 0) return `${days}g`
    if (m === 0) return `${days}g ${h}h`
    if (h === 0) return `${days}g ${m}m`
    return `${days}g ${h}h ${m}m`
  }
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const PALETTE = [
  {
    bg: 'rgba(99,102,241,0.18)',
    fill: 'rgba(99,102,241,0.45)',
    text: '#6366F1',
    border: 'rgba(99,102,241,0.3)',
  },
  {
    bg: 'rgba(16,185,129,0.15)',
    fill: 'rgba(16,185,129,0.4)',
    text: '#10B981',
    border: 'rgba(16,185,129,0.3)',
  },
  {
    bg: 'rgba(245,158,11,0.15)',
    fill: 'rgba(245,158,11,0.4)',
    text: '#D97706',
    border: 'rgba(245,158,11,0.3)',
  },
  {
    bg: 'rgba(239,68,68,0.15)',
    fill: 'rgba(239,68,68,0.4)',
    text: '#EF4444',
    border: 'rgba(239,68,68,0.3)',
  },
  {
    bg: 'rgba(139,92,246,0.15)',
    fill: 'rgba(139,92,246,0.4)',
    text: '#8B5CF6',
    border: 'rgba(139,92,246,0.3)',
  },
  {
    bg: 'rgba(236,72,153,0.15)',
    fill: 'rgba(236,72,153,0.4)',
    text: '#EC4899',
    border: 'rgba(236,72,153,0.3)',
  },
  {
    bg: 'rgba(20,184,166,0.15)',
    fill: 'rgba(20,184,166,0.4)',
    text: '#14B8A6',
    border: 'rgba(20,184,166,0.3)',
  },
  {
    bg: 'rgba(249,115,22,0.15)',
    fill: 'rgba(249,115,22,0.4)',
    text: '#F97316',
    border: 'rgba(249,115,22,0.3)',
  },
]

function projectColor(projectKey: string, allKeys: string[]) {
  const idx = allKeys.indexOf(projectKey)
  return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length]
}

// ─── Date presets ─────────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'this-week', label: 'Questa settimana' },
  { key: 'this-month', label: 'Questo mese' },
] as const

type Preset = (typeof PRESETS)[number]['key'] | 'custom'
type GroupFilter =
  | 'all'
  | 'hd-analist'
  | 'hd-developers'
  | 'EXT-BitBoss'
  | 'EXT-DigitWare'
  | 'newesis'

const INTERNAL_GROUPS = [
  { key: 'hd-analist', label: 'HD Analyst' },
  { key: 'hd-developers', label: 'HD Developers' },
] as const

const EXTERNAL_GROUPS = [
  { key: 'EXT-BitBoss', label: 'BitBoss' },
  { key: 'EXT-DigitWare', label: 'DigitWare' },
  { key: 'newesis', label: 'Newesis' },
] as const

function fmt(d: Date) {
  return d.toISOString().split('T')[0]
}

function getRange(preset: Preset, cs: string, ce: string) {
  const today = new Date()
  switch (preset) {
    case 'this-week': {
      const d = new Date(today)
      const day = d.getDay()
      d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
      return { start: fmt(d), end: fmt(today) }
    }
    case 'this-month':
      return {
        start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: fmt(today),
      }
    case 'custom':
      return { start: cs, end: ce }
  }
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className='flex items-center gap-3'>
      <div className='bg-muted flex h-8 w-8 items-center justify-center rounded-lg'>
        <Icon className='text-muted-foreground h-4 w-4' />
      </div>
      <div>
        <div className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase'>
          {label}
        </div>
        <div className='text-foreground text-sm font-bold tabular-nums'>
          {value}
        </div>
      </div>
    </div>
  )
}

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  maxSeconds,
  projectKeys,
  expanded,
  onToggle,
}: {
  user: UserTimesheet
  maxSeconds: number
  projectKeys: string[]
  expanded: boolean
  onToggle: () => void
}) {
  const pct = maxSeconds > 0 ? (user.totalSeconds / maxSeconds) * 100 : 0
  const projects = Object.entries(user.byProject).sort(
    (a, b) => b[1].seconds - a[1].seconds
  )
  const totalIssues = projects.reduce((s, [, p]) => s + p.entries.length, 0)

  return (
    <div className='border-border border-b last:border-0'>
      <div
        className='hover:bg-muted/30 flex cursor-pointer items-center gap-5 px-5 py-4 transition-colors'
        onClick={onToggle}
      >
        {/* Avatar + name */}
        <div className='flex w-48 flex-shrink-0 items-center gap-3'>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className='h-8 w-8 flex-shrink-0 rounded-full'
            />
          ) : (
            <div className='bg-muted text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase'>
              {user.displayName.charAt(0)}
            </div>
          )}
          <div className='min-w-0'>
            <div className='text-foreground truncate text-sm font-bold'>
              {user.displayName}
            </div>
            <div className='text-muted-foreground text-[10px]'>
              {totalIssues} ticket · {projects.length} progett
              {projects.length === 1 ? 'o' : 'i'}
            </div>
          </div>
        </div>

        {/* Multi-color bar */}
        <div className='bg-muted relative h-5 flex-1 overflow-hidden rounded-xs'>
          <div
            className='absolute inset-y-0 left-0 flex'
            style={{ width: `${pct}%` }}
          >
            {projects.map(([key, proj]) => {
              const col = projectColor(key, projectKeys)
              return (
                <div
                  key={key}
                  style={{
                    width: `${(proj.seconds / user.totalSeconds) * 100}%`,
                    backgroundColor: col.fill,
                  }}
                  title={`${key}: ${formatSeconds(proj.seconds)}`}
                />
              )
            })}
          </div>
        </div>

        {/* Total */}
        <div className='w-20 flex-shrink-0 text-right'>
          <span className='text-foreground text-sm font-bold tabular-nums'>
            {formatSeconds(user.totalSeconds)}
          </span>
        </div>

        <ChevronDown
          className={`text-muted-foreground h-4 w-4 flex-shrink-0 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded: project → issues */}
      {expanded && (
        <div className='bg-muted/20 border-border border-t px-5 py-4'>
          <div className='space-y-5'>
            {projects.map(([projectKey, proj]) => {
              const col = projectColor(projectKey, projectKeys)
              const sorted = [...proj.entries].sort(
                (a, b) => b.timeSpentSeconds - a.timeSpentSeconds
              )
              return (
                <div key={projectKey}>
                  <div className='mb-2 flex items-center gap-2'>
                    <span
                      className='rounded-xs border px-1.5 py-0.5 text-xs leading-none font-bold tracking-widest uppercase'
                      style={{
                        backgroundColor: col.bg,
                        color: col.text,
                        borderColor: col.border,
                      }}
                    >
                      {projectKey}
                    </span>
                    <span className='text-foreground text-sm font-bold'>
                      {proj.projectName}
                    </span>
                    <span className='text-muted-foreground ml-auto text-sm font-bold tabular-nums'>
                      {formatSeconds(proj.seconds)}
                    </span>
                  </div>
                  <ul className='space-y-1.5'>
                    {sorted.map((entry) => (
                      <li key={entry.issueKey} className='group flex items-center gap-3'>
                        <a
                          href={`${JIRA_BROWSE}/${entry.issueKey}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          onClick={(e) => e.stopPropagation()}
                          className='flex min-w-0 flex-1 items-center gap-3 rounded-xs hover:bg-muted/50 -mx-1 px-1 py-0.5 transition-colors'
                        >
                          <span className='text-muted-foreground w-24 flex-shrink-0 text-xs font-bold tracking-widest uppercase'>
                            {entry.issueKey}
                          </span>
                          <span className='text-foreground min-w-0 flex-1 truncate text-sm'>
                            {entry.issueSummary}
                          </span>
                          <ExternalLink className='text-muted-foreground h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-60' />
                        </a>
                        <span className='text-muted-foreground flex-shrink-0 text-sm font-bold tabular-nums'>
                          {formatSeconds(entry.timeSpentSeconds)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────



export function TimesheetDashboard() {
  const [preset, setPreset] = useState<Preset>('this-month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)



  const { start, end } = useMemo(
    () => getRange(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  )

  const { isRefreshing, triggerRefresh } = useRefresh();

  const { data, loading, error } = useTimesheet(start, end);

  const analystQuery = useGroup('hd-analist');
  const devQuery = useGroup('hd-developers');
  const bitBossQuery = useGroup('EXT-BitBoss');
  const digitWareQuery = useGroup('EXT-DigitWare');
  const nesesisQuery = useGroup('newesis');

  const groupSets = useMemo(() => {
    const toSet = (d: unknown) => new Set<string>(Array.isArray(d) ? d : [])
    return {
      'hd-analist': toSet(analystQuery.data),
      'hd-developers': toSet(devQuery.data),
      'EXT-BitBoss': toSet(bitBossQuery.data),
      'EXT-DigitWare': toSet(digitWareQuery.data),
      newesis: toSet(nesesisQuery.data),
    }
  }, [
    analystQuery.data,
    devQuery.data,
    bitBossQuery.data,
    digitWareQuery.data,
    nesesisQuery.data,
  ])

  const groupFilteredUsers = useMemo(() => {
    if (!data) return []
    if (groupFilter === 'all') return data.users
    const set = groupSets[groupFilter]
    return data.users.filter((u) => set.has(u.accountId))
  }, [data, groupFilter, groupSets])

  const projects = useMemo(() => {
    const map = new Map<string, string>()
    groupFilteredUsers.forEach((u) =>
      Object.entries(u.byProject).forEach(([key, proj]) => {
        if (!map.has(key)) map.set(key, proj.projectName)
      })
    )
    return [...map.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [groupFilteredUsers])

  const projectKeys = useMemo(() => projects.map((p) => p.key), [projects])

  const visibleUsers = useMemo(() => {
    if (projectFilter === 'all') return groupFilteredUsers
    return groupFilteredUsers
      .filter((u) => !!u.byProject[projectFilter])
      .map((u) => ({ ...u, totalSeconds: u.byProject[projectFilter]!.seconds }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
  }, [groupFilteredUsers, projectFilter])

  const totalIssues = useMemo(
    () =>
      visibleUsers.reduce(
        (s, u) =>
          s +
          Object.values(u.byProject).reduce(
            (ps, p) => ps + p.entries.length,
            0
          ),
        0
      ),
    [visibleUsers]
  )

  const totalSeconds = useMemo(
    () => visibleUsers.reduce((s, u) => s + u.totalSeconds, 0),
    [visibleUsers]
  )

  const maxSeconds = visibleUsers[0]?.totalSeconds ?? 0

  return (
    <div className='bg-background flex h-full w-full flex-col'>
      {/* Topbar */}
      <div className='bg-card border-border flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3'>
        <div className='flex flex-wrap items-center gap-2'>
          {/* Date presets */}
          <div className='bg-muted flex gap-1 rounded-xs p-1'>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`rounded-xs px-3 py-1.5 text-sm transition-all duration-150 ${
                  preset === p.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground bg-transparent'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setPreset('custom')}
              className={`rounded-xs px-3 py-1.5 text-sm transition-all duration-150 ${
                preset === 'custom'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground bg-transparent'
              }`}
            >
              Custom
            </button>
          </div>

          {preset === 'custom' && (
            <div className='flex items-center gap-2'>
              <input
                type='date'
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className='border-border text-foreground bg-card h-8 rounded-xs border px-2 text-sm outline-none'
              />
              <span className='text-muted-foreground text-sm'>→</span>
              <input
                type='date'
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className='border-border text-foreground bg-card h-8 rounded-xs border px-2 text-sm outline-none'
              />
            </div>
          )}

          <div className='bg-border h-6 w-px' />

          {/* Group filters */}
          <div className='bg-muted flex gap-1 rounded-xs p-1'>
            <button
              onClick={() => setGroupFilter('all')}
              className={`rounded-xs px-3 py-1.5 text-sm transition-all duration-150 ${
                groupFilter === 'all'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground bg-transparent'
              }`}
            >
              Tutti
            </button>
          </div>

          <select
            value={
              INTERNAL_GROUPS.some((g) => g.key === groupFilter)
                ? groupFilter
                : ''
            }
            onChange={(e) =>
              setGroupFilter((e.target.value || 'all') as GroupFilter)
            }
            className={`border-border bg-muted h-8 cursor-pointer rounded-xs border-0 px-3 text-sm transition-all outline-none ${
              INTERNAL_GROUPS.some((g) => g.key === groupFilter)
                ? 'text-foreground font-bold'
                : 'text-muted-foreground'
            }`}
          >
            <option value=''>Interni</option>
            {INTERNAL_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>

          <select
            value={
              EXTERNAL_GROUPS.some((g) => g.key === groupFilter)
                ? groupFilter
                : ''
            }
            onChange={(e) =>
              setGroupFilter((e.target.value || 'all') as GroupFilter)
            }
            className={`border-border bg-muted h-8 cursor-pointer rounded-xs border-0 px-3 text-sm transition-all outline-none ${
              EXTERNAL_GROUPS.some((g) => g.key === groupFilter)
                ? 'text-foreground font-bold'
                : 'text-muted-foreground'
            }`}
          >
            <option value=''>Esterni</option>
            {EXTERNAL_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>

          {projects.length > 0 && (
            <>
              <div className='bg-border h-6 w-px' />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className='border-border text-foreground bg-muted h-8 cursor-pointer rounded-xs border-0 px-3 text-sm outline-none'
              >
                <option value='all'>Tutti i progetti</option>
                {projects.map(({ key, name }) => (
                  <option key={key} value={key}>
                    {name === key ? key : `${name} (${key})`}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className='flex items-center gap-2'>
          {loading ? (
            <span className='text-muted-foreground inline-flex items-center gap-1.5 text-sm'>
              <RefreshCw className='h-3 w-3 animate-spin' />
              Aggiornamento&hellip;
            </span>
          ) : data ? (
            <span className='text-muted-foreground text-sm'>
              {new Date(data.fetchedAt).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          ) : null}
          <button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading || isRefreshing} onClick={triggerRefresh}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />JIRA</button>
        </div>
      </div>

      {/* KPI row */}
      {data && (
        <div className='bg-card border-border flex flex-shrink-0 flex-wrap items-center gap-6 border-b px-5 py-3'>
          <KpiCard
            icon={Clock}
            label='Giorni totali'
            value={formatSeconds(totalSeconds)}
          />
          <div className='bg-border h-6 w-px' />
          <KpiCard
            icon={Users}
            label='Contributor'
            value={String(visibleUsers.length)}
          />
          <div className='bg-border h-6 w-px' />
          <KpiCard
            icon={Briefcase}
            label='Progetti'
            value={String(projectKeys.length)}
          />
          <div className='bg-border h-6 w-px' />
          <KpiCard icon={FileText} label='Ticket' value={String(totalIssues)} />
          <div className='ml-auto flex items-center gap-3'>
            <span
              className='border-border text-muted-foreground rounded-xs border px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase'
              title='1 giorno lavorativo = 8 ore'
            >
              1g = 8h lavorative
            </span>
            <span className='text-muted-foreground text-sm'>
              {start} → {end}
            </span>
          </div>
        </div>
      )}

      {/* States */}
      {loading && (
        <div className='flex flex-1 items-center justify-center'>
          <span className='text-muted-foreground animate-pulse text-xs tracking-widest uppercase'>
            Caricamento worklogs&hellip;
          </span>
        </div>
      )}

      {error && (
        <div className='flex flex-1 items-center justify-center px-8'>
          <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm font-semibold'>
            {(error as Error).message}
          </div>
        </div>
      )}

      {!loading && !error && data && visibleUsers.length === 0 && (
        <div className='flex flex-1 items-center justify-center'>
          <span className='text-muted-foreground text-xs tracking-widest uppercase'>
            Nessun utente trovato per il filtro selezionato
          </span>
        </div>
      )}

      {/* User list */}
      {!loading && !error && data && visibleUsers.length > 0 && (
        <div className='flex-1 overflow-y-auto'>
          <div className='bg-card'>
            {visibleUsers.map((user) => (
              <UserRow
                key={user.accountId}
                user={user}
                maxSeconds={maxSeconds}
                projectKeys={projectKeys}
                expanded={expandedUser === user.accountId}
                onToggle={() =>
                  setExpandedUser(
                    expandedUser === user.accountId ? null : user.accountId
                  )
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
