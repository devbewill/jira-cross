"use client";

import { useState, useMemo } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { useSprint } from '@/hooks/useSprint';
import { useGroup } from '@/hooks/useGroup';
import { useRefresh } from '@/contexts/RefreshContext';
import { JiraSprint, SprintIssue } from '@/types';



const FILTER_CATS = [
  'Tutti',
  'Scaduti',
  'Con release',
  'Senza release',
] as const
type FilterCat = (typeof FILTER_CATS)[number]

const JIRA_BASE = (
  process.env.NEXT_PUBLIC_JIRA_BASE_URL as string | undefined
)?.replace(/\/$/, '') ?? ''

const NOW = new Date()

function isOverdue(sprint: JiraSprint): boolean {
  return !!sprint.endDate && new Date(sprint.endDate) < NOW
}

function boardUrl(boardId: number) {
  return `${JIRA_BASE}/secure/RapidBoard.jspa?rapidView=${boardId}`
}

function sprintUrl(boardId: number, sprintId: number) {
  return `${JIRA_BASE}/secure/RapidBoard.jspa?rapidView=${boardId}&sprint=${sprintId}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  })
}

function daysLeft(endDate: string | null): { label: string; overdue: boolean } | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  const days = Math.ceil(diff / 86400000)
  if (days < 0) return { label: `${Math.abs(days)}g scaduto`, overdue: true }
  if (days === 0) return { label: 'Scade oggi', overdue: false }
  return { label: `${days}g rimanenti`, overdue: false }
}

function sprintStats(issues: SprintIssue[]) {
  const inSprint = issues  // all issues assigned to this sprint
  const withRelease = inSprint.filter((i) => i.fixVersions.length > 0)
  const withoutRelease = inSprint.filter((i) => i.fixVersions.length === 0)
  const hasAnyRelease = withRelease.length > 0
  return { inSprint, withRelease, withoutRelease, hasAnyRelease }
}

function topReportersForIssues(
  issues: SprintIssue[]
): Array<{ accountId: string; displayName: string; count: number }> {
  const map = new Map<string, { displayName: string; count: number }>()
  for (const issue of issues) {
    if (!issue.reporter) continue
    const { accountId, displayName } = issue.reporter
    const entry = map.get(accountId) ?? { displayName, count: 0 }
    entry.count++
    map.set(accountId, entry)
  }
  return Array.from(map.entries())
    .map(([accountId, { displayName, count }]) => ({ accountId, displayName, count }))
    .sort((a, b) => b.count - a.count)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  sub,
  color,
  info,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
  info?: string
}) {
  return (
    <div className='bg-card flex flex-col gap-1 rounded-2xl border px-5 py-4' title={info}>
      <div className='flex items-center gap-1.5'>
        <span className='text-muted-foreground text-xs font-bold tracking-widest uppercase'>
          {label}
        </span>
        {info && (
          <span
            className='text-muted-foreground/50 hover:text-muted-foreground cursor-help text-xs font-bold leading-none transition-colors'
            title={info}
          >
            ⓘ
          </span>
        )}
      </div>
      <span className='text-4xl leading-none font-bold tabular-nums' style={{ color }}>
        {value}
      </span>
      {sub && (
        <span className='text-muted-foreground text-xs font-bold'>{sub}</span>
      )}
    </div>
  )
}

function ReleaseBadges({ issues }: { issues: SprintIssue[] }) {
  const releases = useMemo(() => {
    const seen = new Map<
      string,
      { id: string; name: string; released: boolean; releaseDate: string | null }
    >()
    for (const issue of issues) {
      for (const v of issue.fixVersions) {
        if (!seen.has(v.id)) seen.set(v.id, v)
      }
    }
    return Array.from(seen.values()).sort((a, b) => {
      if (a.releaseDate && b.releaseDate)
        return a.releaseDate.localeCompare(b.releaseDate)
      return a.name.localeCompare(b.name)
    })
  }, [issues])

  if (releases.length === 0)
    return (
      <span className='text-muted-foreground text-xs italic'>
        Nessuna release collegata
      </span>
    )

  const now = new Date()
  return (
    <div className='flex flex-wrap gap-1.5'>
      {releases.map((r) => {
        const overdue =
          !r.released && !!r.releaseDate && new Date(r.releaseDate) < now
        const style = r.released
          ? {
              backgroundColor: 'rgba(16,185,129,0.10)',
              color: '#047857',
              borderColor: 'rgba(16,185,129,0.25)',
            }
          : overdue
            ? {
                backgroundColor: 'rgba(192,38,211,0.08)',
                color: '#9D174D',
                borderColor: 'rgba(192,38,211,0.20)',
              }
            : {
                backgroundColor: 'rgba(99,102,241,0.08)',
                color: '#4338CA',
                borderColor: 'rgba(99,102,241,0.20)',
              }
        return (
          <span
            key={r.id}
            className='rounded-xs border px-1.5 py-0.5 text-xs font-bold'
            style={style}
            title={
              r.releaseDate
                ? `Release: ${new Date(r.releaseDate).toLocaleDateString('it-IT')}`
                : undefined
            }
          >
            {r.name}
          </span>
        )
      })}
    </div>
  )
}

function SprintCard({
  sprint,
  issues,
  reporterFilter,
  onReporterClick,
}: {
  sprint: JiraSprint
  issues: SprintIssue[]
  reporterFilter: string
  onReporterClick: (accountId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { inSprint, withRelease, withoutRelease, hasAnyRelease } = sprintStats(issues)
  const timeInfo = daysLeft(sprint.endDate)
  const overdue = isOverdue(sprint)

  const reporters = useMemo(() => topReportersForIssues(issues), [issues])

  const reporterIssues = useMemo(() => {
    if (!reporterFilter) return []
    return issues.filter((i) => i.reporter?.accountId === reporterFilter)
  }, [issues, reporterFilter])

  return (
    <div className='bg-card overflow-hidden rounded-2xl border'>
      <div className='border-border border-b px-5 py-4'>
        {/* Sprint title row */}
        <div className='mb-3 flex items-start justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            <div className='mb-1 flex flex-wrap items-center gap-2'>
              {overdue ? (
                <span className='rounded-xs border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-xs font-bold text-orange-600'>
                  SCADUTO
                </span>
              ) : (
                <span className='rounded-xs border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700'>
                  ACTIVE
                </span>
              )}
              {/* Release status badge */}
              {hasAnyRelease ? (
                <span className='rounded-xs border px-1.5 py-0.5 text-xs font-bold' style={{ backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.25)', color: '#047857' }}>
                  con release
                </span>
              ) : (
                <span className='rounded-xs border px-1.5 py-0.5 text-xs font-bold' style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.20)', color: '#DC2626' }}>
                  senza release
                </span>
              )}
              {timeInfo && (
                <span
                  className='text-xs font-bold'
                  style={{ color: timeInfo.overdue ? '#DC2626' : '#6B7280' }}
                >
                  {timeInfo.label}
                </span>
              )}
            </div>
            <h3 className='text-foreground text-sm font-bold'>{sprint.name}</h3>
            {sprint.goal && (
              <p className='text-muted-foreground mt-0.5 line-clamp-2 text-xs'>
                {sprint.goal}
              </p>
            )}
          </div>
          <a
            href={sprintUrl(sprint.boardId, sprint.id)}
            target='_blank'
            rel='noopener noreferrer'
            className='border-border bg-card hover:bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border transition-colors'
            title='Apri sprint in Jira'
          >
            <ExternalLink className='text-muted-foreground h-3.5 w-3.5' />
          </a>
        </div>

        {/* Dates */}
        <div className='mb-3 flex items-center gap-6'>
          <div>
            <span className='text-muted-foreground block text-xs font-bold tracking-widest uppercase'>
              Start
            </span>
            <span className='text-sm font-bold'>{formatDate(sprint.startDate)}</span>
          </div>
          <div>
            <span className='text-muted-foreground block text-xs font-bold tracking-widest uppercase'>
              End
            </span>
            <span
              className='text-sm font-bold'
              style={overdue ? { color: '#DC2626' } : undefined}
            >
              {formatDate(sprint.endDate)}
            </span>
          </div>
        </div>

        {/* Issue counts row */}
        <div className='mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold'>
          <span className='text-muted-foreground'>{inSprint.length} ticket nello sprint</span>
          <span style={{ color: '#10B981' }}>{withRelease.length} con release</span>
          {withoutRelease.length > 0 && (
            <span style={{ color: '#6B7280' }}>{withoutRelease.length} senza release</span>
          )}
        </div>

        {/* Linked releases */}
        <div className='mb-4'>
          <span className='text-muted-foreground mb-1.5 block text-xs font-bold tracking-widest uppercase'>
            Release collegate allo sprint
          </span>
          <ReleaseBadges issues={issues} />
        </div>

        {/* Top reporters */}
        {reporters.length > 0 && (
          <div>
            <span className='text-muted-foreground mb-1.5 block text-xs font-bold tracking-widest uppercase'>
              Chi crea di più
            </span>
            <div className='flex flex-wrap gap-1.5'>
              {reporters.slice(0, 5).map((r) => {
                const isActive = reporterFilter === r.accountId
                return (
                  <button
                    key={r.accountId}
                    onClick={() => onReporterClick(isActive ? '' : r.accountId)}
                    className='inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-xs font-bold transition-colors'
                    style={
                      isActive
                        ? {
                            backgroundColor: 'rgba(124,58,237,0.12)',
                            borderColor: 'rgba(124,58,237,0.35)',
                            color: '#5B21B6',
                          }
                        : {
                            backgroundColor: 'rgba(0,0,0,0.04)',
                            borderColor: 'rgba(0,0,0,0.10)',
                            color: '#374151',
                          }
                    }
                    title={`${r.displayName} — ${r.count} ticket in questo sprint`}
                  >
                    <span className='max-w-[120px] truncate'>{r.displayName}</span>
                    <span
                      className='rounded-xs px-1 tabular-nums'
                      style={{
                        backgroundColor: isActive
                          ? 'rgba(124,58,237,0.15)'
                          : 'rgba(0,0,0,0.08)',
                        fontSize: '10px',
                      }}
                    >
                      {r.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reporter-filtered issue list */}
      {reporterFilter && reporterIssues.length > 0 && (
        <div className='border-border border-b'>
          <div className='bg-violet-50/60 px-5 py-2'>
            <span className='text-xs font-bold text-violet-700'>
              {reporterIssues.length} ticket creati dal creatore selezionato in questo sprint
            </span>
          </div>
          <div className='divide-border divide-y'>
            {reporterIssues.map((issue) => {
              const statusStyle =
                issue.statusCategory === 'in-progress'
                  ? { backgroundColor: 'rgba(245,158,11,0.12)', color: '#B45309' }
                  : issue.statusCategory === 'done'
                    ? { backgroundColor: 'rgba(16,185,129,0.10)', color: '#047857' }
                    : { backgroundColor: 'rgba(0,0,0,0.05)', color: '#6B7280' }
              return (
                <div
                  key={issue.key}
                  className='hover:bg-muted/50 flex items-center gap-3 px-5 py-2.5 transition-colors'
                >
                  <a
                    href={issue.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='shrink-0 font-mono text-xs font-bold text-violet-700 hover:underline'
                  >
                    {issue.key}
                  </a>
                  <span className='text-foreground min-w-0 flex-1 truncate text-sm'>
                    {issue.summary}
                  </span>
                  {issue.fixVersions.length > 0 ? (
                    <span
                      className='shrink-0 rounded-xs px-1.5 py-0.5 text-xs font-bold'
                      style={{ backgroundColor: 'rgba(16,185,129,0.10)', color: '#047857' }}
                    >
                      {issue.fixVersions[0].name}
                    </span>
                  ) : (
                    <span
                      className='shrink-0 rounded-xs px-1.5 py-0.5 text-xs font-bold'
                      style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#DC2626' }}
                    >
                      no release
                    </span>
                  )}
                  <span
                    className='shrink-0 rounded-xs px-1.5 py-0.5 text-xs font-bold'
                    style={statusStyle}
                  >
                    {issue.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expandable: issues without release */}
      {withoutRelease.length > 0 ? (
        <>
          <button
            className='hover:bg-muted/50 flex w-full items-center gap-2 px-5 py-2.5 text-left transition-colors'
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDown className='h-3.5 w-3.5 shrink-0 text-slate-400' />
            ) : (
              <ChevronRight className='h-3.5 w-3.5 shrink-0 text-slate-400' />
            )}
            <span className='text-muted-foreground text-xs font-bold'>
              {withoutRelease.length} ticket senza release collegata
            </span>
          </button>
          {expanded && (
            <div className='border-border divide-border divide-y border-t'>
              {withoutRelease.map((issue) => {
                const statusStyle =
                  issue.statusCategory === 'done'
                    ? { backgroundColor: 'rgba(16,185,129,0.10)', color: '#047857' }
                    : issue.statusCategory === 'in-progress'
                      ? { backgroundColor: 'rgba(245,158,11,0.12)', color: '#B45309' }
                      : { backgroundColor: 'rgba(0,0,0,0.05)', color: '#6B7280' }
                return (
                  <div
                    key={issue.key}
                    className='hover:bg-muted/50 flex items-center gap-3 px-5 py-2.5 transition-colors'
                  >
                    <a
                      href={issue.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='shrink-0 font-mono text-xs font-bold text-violet-700 hover:underline'
                    >
                      {issue.key}
                    </a>
                    <span className='text-foreground min-w-0 flex-1 truncate text-sm'>
                      {issue.summary}
                    </span>
                    <span
                      className='shrink-0 rounded-xs px-1.5 py-0.5 text-xs font-bold'
                      style={statusStyle}
                    >
                      {issue.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : inSprint.length > 0 ? (
        <div className='px-5 py-3'>
          <span className='text-xs font-bold' style={{ color: '#10B981' }}>
            Tutti i ticket dello sprint hanno una release collegata
          </span>
        </div>
      ) : null}
    </div>
  )
}

interface BoardGroup {
  boardId: number
  boardName: string
  sprints: Array<{ sprint: JiraSprint; issues: SprintIssue[] }>
}

function BoardSection({
  group,
  reporterFilter,
  onReporterClick,
}: {
  group: BoardGroup
  reporterFilter: string
  onReporterClick: (accountId: string) => void
}) {
  const sprintsWithRelease = group.sprints.filter(({ issues }) =>
    issues.some((i) => i.fixVersions.length > 0)
  ).length
  const sprintsWithout = group.sprints.length - sprintsWithRelease

  return (
    <div className='bg-card overflow-hidden rounded-2xl border'>
      <div className='bg-muted/40 border-border flex items-center gap-3 border-b px-5 py-3'>
        <a
          href={boardUrl(group.boardId)}
          target='_blank'
          rel='noopener noreferrer'
          className='group inline-flex min-w-0 items-center gap-1.5'
          title='Apri board in Jira'
        >
          <h2 className='text-foreground text-sm font-bold group-hover:underline'>
            {group.boardName}
          </h2>
          <ExternalLink className='text-muted-foreground h-3.5 w-3.5 shrink-0 opacity-40 transition-opacity group-hover:opacity-100' />
        </a>
        <div className='flex-1' />
        <span className='text-muted-foreground text-xs font-bold tabular-nums'>
          {group.sprints.length} sprint
        </span>
        <span className='text-muted-foreground text-xs'>·</span>
        <span className='text-xs font-bold tabular-nums' style={{ color: '#10B981' }}>
          {sprintsWithRelease} con release
        </span>
        {sprintsWithout > 0 && (
          <>
            <span className='text-muted-foreground text-xs'>·</span>
            <span className='text-xs font-bold tabular-nums' style={{ color: '#EF4444' }}>
              {sprintsWithout} senza release
            </span>
          </>
        )}
      </div>

      <div className='divide-border divide-y p-4 flex flex-col gap-3'>
        {group.sprints.map(({ sprint, issues }) => (
          <SprintCard
            key={sprint.id}
            sprint={sprint}
            issues={issues}
            reporterFilter={reporterFilter}
            onReporterClick={onReporterClick}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function SprintDashboard() {

  const { data, loading, error, cacheHit, refetch } = useSprint();

  const handleRefresh = () => {
    refetch();
  };

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<FilterCat>('Tutti')
  const [reporterFilter, setReporterFilter] = useState('')

  const handleReporterClick = (accountId: string) => {
    setReporterFilter((prev) => (prev === accountId ? '' : accountId))
  }

  const allIssues = useMemo(
    () => (data ? Object.values(data.issuesBySprint).flat() : []),
    [data]
  )

  const allReporters = useMemo(() => {
    const map = new Map<string, { displayName: string; count: number }>()
    for (const issue of allIssues) {
      if (!issue.reporter) continue
      const { accountId, displayName } = issue.reporter
      const entry = map.get(accountId) ?? { displayName, count: 0 }
      entry.count++
      map.set(accountId, entry)
    }
    return Array.from(map.entries())
      .map(([accountId, { displayName, count }]) => ({ accountId, displayName, count }))
      .sort((a, b) => b.count - a.count)
  }, [allIssues])

  const activeReporter = allReporters.find((r) => r.accountId === reporterFilter)

  const sprintStatsList = useMemo(
    () =>
      data
        ? data.sprints.map((s) => ({
            sprint: s,
            ...sprintStats(data.issuesBySprint[s.id] ?? []),
          }))
        : [],
    [data]
  )

  const countWithRelease = sprintStatsList.filter((s) => s.hasAnyRelease).length
  const countWithoutRelease = sprintStatsList.filter((s) => !s.hasAnyRelease).length
  const countScaduti = useMemo(
    () => (data ? data.sprints.filter(isOverdue).length : 0),
    [data]
  )

  const boardGroups = useMemo((): BoardGroup[] => {
    if (!data) return []

    const matched = sprintStatsList.filter(({ sprint, compliance, hasAnyRelease }) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !sprint.name.toLowerCase().includes(q) &&
          !sprint.boardName.toLowerCase().includes(q)
        )
          return false
      }
      if (filterCat === 'Scaduti') return isOverdue(sprint)
      if (filterCat === 'Con release') return hasAnyRelease
      if (filterCat === 'Senza release') return !hasAnyRelease
      if (reporterFilter) {
        const issues = data.issuesBySprint[sprint.id] ?? []
        return issues.some((i) => i.reporter?.accountId === reporterFilter)
      }
      return true
    })

    const map = new Map<number, BoardGroup>()
    for (const { sprint } of matched) {
      if (!map.has(sprint.boardId)) {
        map.set(sprint.boardId, {
          boardId: sprint.boardId,
          boardName: sprint.boardName,
          sprints: [],
        })
      }
      map.get(sprint.boardId)!.sprints.push({
        sprint,
        issues: data.issuesBySprint[sprint.id] ?? [],
      })
    }

    return Array.from(map.values()).sort((a, b) =>
      a.boardName.localeCompare(b.boardName)
    )
  }, [data, sprintStatsList, search, filterCat, reporterFilter])

  const totalFiltered = boardGroups.reduce((n, g) => n + g.sprints.length, 0)

  // ─── Render states ────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className='flex flex-1 items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <RefreshCw className='text-muted-foreground h-8 w-8 animate-spin' />
          <p className='text-muted-foreground text-sm'>Caricamento sprint&hellip;</p>
        </div>
      </div>
    )

  if (!data && error)
    return (
      <div className='flex flex-1 items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <p className='text-destructive text-sm font-semibold'>
            {(error as Error).message}
          </p>
          <button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' onClick={() => refetch()}>Riprova</button>
        </div>
      </div>
    )

  if (!data) return null

  const fetchedTime = data.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''
  const ttlMinutes = Math.round((parseInt(process.env.NEXT_PUBLIC_JIRA_CACHE_TTL || '300', 10)) / 60)
  const ttlLabel =
    ttlMinutes >= 60 ? `${Math.round(ttlMinutes / 60)}h` : `${ttlMinutes}m`

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='flex flex-col gap-4 px-6 py-5'>
        {/* Header */}
        <div className='mb-1 flex items-center justify-between'>
          <div>
            <p className='text-muted-foreground mb-1.5 text-xs font-bold tracking-widest uppercase'>
              Jira &middot; Agile
            </p>
            <h1 className='text-2xl leading-none font-bold tracking-tight'>Sprint</h1>
          </div>
          <div className='flex items-center gap-3'>
            {error && data && (
              <span className='text-xs font-bold text-red-600'>
                Aggiornamento fallito
              </span>
            )}
            {loading ? (
              <span className='text-muted-foreground inline-flex items-center gap-1.5 text-xs font-bold'>
                <RefreshCw className='h-3 w-3 animate-spin' />
                Aggiornamento&hellip;
              </span>
            ) : (
              <span className='text-muted-foreground inline-flex items-center gap-1.5 text-xs font-bold'>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${cacheHit ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
                Dati delle {fetchedTime}
                <span className='opacity-50'>&middot; cache {ttlLabel}</span>
              </span>
            )}
            <button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading} onClick={handleRefresh}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Ricarica</button>
          </div>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-3 gap-3'>
          <StatBox label='Sprint attivi' value={data.sprints.length} />
          <StatBox
            label='Sprint con release'
            value={countWithRelease}
            sub={`su ${data.sprints.length} sprint hanno almeno una release collegata`}
            color={countWithRelease === data.sprints.length ? '#10B981' : undefined}
          />
          <StatBox
            label='Sprint senza release'
            value={countWithoutRelease}
            sub='sprint senza nessuna release collegata'
            color={countWithoutRelease > 0 ? '#EF4444' : '#10B981'}
          />
        </div>

        {/* Alert if any sprint has zero releases */}
        {countWithoutRelease > 0 && (
          <div
            className='flex items-center gap-3 rounded-2xl border px-5 py-3'
            style={{
              backgroundColor: 'rgba(239,68,68,0.05)',
              borderColor: 'rgba(239,68,68,0.20)',
            }}
          >
            <AlertTriangle className='h-5 w-5 shrink-0 text-red-500' />
            <p className='text-sm font-bold text-red-700'>
              {countWithoutRelease}{' '}
              {countWithoutRelease === 1 ? 'sprint non ha' : 'sprint non hanno'} nessuna
              release collegata ai propri ticket.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className='bg-card flex flex-col gap-3 rounded-2xl border px-5 py-3'>
          <div className='flex flex-wrap items-center gap-3'>
            <div className='relative'>
              <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
                &#x2315;
              </span>
              <input
                type='text'
                placeholder='Cerca sprint o board…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='bg-muted/50 text-foreground placeholder:text-muted-foreground/60 w-52 rounded-lg border-0 py-1.5 pr-3 pl-7 text-xs font-bold outline-none placeholder:font-bold focus:ring-2 focus:ring-violet-600'
              />
            </div>

            <div className='ml-auto flex items-center gap-1'>
              {FILTER_CATS.map((cat) => {
                const active = filterCat === cat
                const count =
                  cat === 'Scaduti'
                    ? countScaduti
                    : cat === 'Con release'
                      ? countWithRelease
                      : cat === 'Senza release'
                        ? countWithoutRelease
                        : null
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    className='inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-bold transition-colors'
                    style={
                      active
                        ? cat === 'Scaduti'
                          ? { backgroundColor: '#EA580C', color: '#fff' }
                          : { backgroundColor: '#111', color: '#fff' }
                        : { backgroundColor: 'rgba(0,0,0,0.06)', color: '#555' }
                    }
                  >
                    {cat}
                    {count !== null && (
                      <span style={{ opacity: active ? 0.6 : 0.5 }}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {(search || filterCat !== 'Tutti' || reporterFilter) && (
              <span className='text-muted-foreground text-xs font-bold tabular-nums'>
                {totalFiltered} / {data.sprints.length}
              </span>
            )}
          </div>

          {/* Reporter filter chips */}
          {allReporters.length > 0 && (
            <div className='border-border flex flex-wrap items-center gap-2 border-t pt-3'>
              <span className='text-muted-foreground text-xs font-bold tracking-widest uppercase'>
                Creatore
              </span>
              {allReporters.map((r) => {
                const isActive = reporterFilter === r.accountId
                return (
                  <button
                    key={r.accountId}
                    onClick={() => handleReporterClick(r.accountId)}
                    className='inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-xs font-bold transition-colors'
                    style={
                      isActive
                        ? {
                            backgroundColor: 'rgba(124,58,237,0.12)',
                            borderColor: 'rgba(124,58,237,0.35)',
                            color: '#5B21B6',
                          }
                        : {
                            backgroundColor: 'rgba(0,0,0,0.04)',
                            borderColor: 'rgba(0,0,0,0.10)',
                            color: '#374151',
                          }
                    }
                  >
                    <span className='max-w-[140px] truncate'>{r.displayName}</span>
                    <span
                      className='rounded-xs px-1 tabular-nums'
                      style={{
                        backgroundColor: isActive
                          ? 'rgba(124,58,237,0.15)'
                          : 'rgba(0,0,0,0.08)',
                        fontSize: '10px',
                      }}
                    >
                      {r.count}
                    </span>
                  </button>
                )
              })}
              {reporterFilter && (
                <button
                  onClick={() => setReporterFilter('')}
                  className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-bold transition-colors'
                >
                  <X className='h-3 w-3' />
                  Rimuovi filtro
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active reporter banner */}
        {activeReporter && (
          <div
            className='flex items-center gap-3 rounded-2xl border px-5 py-3'
            style={{
              backgroundColor: 'rgba(124,58,237,0.05)',
              borderColor: 'rgba(124,58,237,0.20)',
            }}
          >
            <span className='text-sm font-bold' style={{ color: '#5B21B6' }}>
              Filtro attivo:{' '}
              <span className='font-extrabold'>{activeReporter.displayName}</span>{' '}
              &mdash; {activeReporter.count} ticket totali negli sprint attivi
            </span>
            <button
              onClick={() => setReporterFilter('')}
              className='ml-auto inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-bold'
              style={{ backgroundColor: 'rgba(124,58,237,0.12)', color: '#5B21B6' }}
            >
              <X className='h-3 w-3' />
              Rimuovi
            </button>
          </div>
        )}

        {/* Warn if board names haven't been resolved */}
        {data.sprints.length > 0 &&
          data.sprints.every((s) => s.boardId === 0) && (
            <div className='flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3'>
              <AlertTriangle className='h-4 w-4 shrink-0 text-amber-600' />
              <p className='text-sm font-bold text-amber-800'>
                I nomi delle board non sono ancora stati risolti. Premi{' '}
                <button onClick={handleRefresh} className='underline underline-offset-2'>
                  Aggiorna
                </button>{' '}
                per caricare il raggruppamento per board.
              </p>
            </div>
          )}

        {/* Content */}
        {boardGroups.length === 0 ? (
          <div className='bg-card flex items-center justify-center rounded-2xl border py-16'>
            <p className='text-muted-foreground text-sm font-bold'>
              {filterCat === 'Scaduti'
                ? 'Nessuno sprint attivo ha la data di fine nel passato.'
                : 'Nessuno sprint corrisponde ai filtri selezionati.'}
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-8'>
            {boardGroups.map((group) => (
              <BoardSection
                key={group.boardId}
                group={group}
                reporterFilter={reporterFilter}
                onReporterClick={handleReporterClick}
              />
            ))}
          </div>
        )}

        <div className='h-2' />
      </div>
    </div>
  )
}
