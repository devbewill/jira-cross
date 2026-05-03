"use client";

import { useState, useMemo } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { usePSP } from '@/hooks/usePSP';
import { useRefresh } from '@/contexts/RefreshContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PSPIssue, PSPRequestTypeGroup, PSPSla } from '@/types';

const ISSUE_COLORS = {
  done: {
    dot: '#10B981', // emerald-500
    text: '#047857', // emerald-700
    tagBg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.25)',
    outline: 'rgba(16,185,129,0.6)',
  },
  inProgress: {
    dot: '#F59E0B', // amber-500
    text: '#B45309', // amber-700
    tagBg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.25)',
    outline: 'rgba(245,158,11,0.6)',
  },
  todo: {
    dot: '#94A3B8', // slate-400
    text: '#475569', // slate-600
    tagBg: 'rgba(148,163,184,0.12)',
    border: 'rgba(148,163,184,0.25)',
    outline: 'rgba(148,163,184,0.6)',
  },
  open: {
    dot: '#3B82F6', // blue-500
    text: '#1D4ED8', // blue-700
    tagBg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.25)',
    outline: 'rgba(59,130,246,0.6)',
  },
  blocked: {
    dot: '#EF4444', // red-500
    text: '#B91C1C', // red-700
    tagBg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.25)',
    outline: 'rgba(239,68,68,0.6)',
  },
} as const;

const STATUS: Record<
  {
    label: string
    dot: string
    text: string
    tagBg: string
    fill: string
    trackBg: string
  }
> = {
  Aperto: {
    label: 'Aperto',
    dot: '#3B82F6',
    text: '#1D4ED8',
    tagBg: 'rgba(59,130,246,0.10)',
    fill: 'rgba(59,130,246,0.5)',
    trackBg: 'rgba(59,130,246,0.08)',
  },
  'in attesa di risposta': {
    label: 'In attesa',
    dot: '#F59E0B',
    text: '#B45309',
    tagBg: 'rgba(245,158,11,0.10)',
    fill: 'rgba(245,158,11,0.5)',
    trackBg: 'rgba(245,158,11,0.08)',
  },
  'in risoluzione': {
    label: 'In risoluzione',
    dot: '#94A3B8',
    text: 'rgb(202 40 186)',
    tagBg: 'rgba(255,184,247,0.15)',
    fill: 'rgba(255,184,247,0.5)',
    trackBg: 'rgba(255,184,247,0.12)',
  },
  Riaperto: {
    label: 'Riaperto',
    dot: '#EF4444',
    text: '#B91C1C',
    tagBg: 'rgba(239,68,68,0.10)',
    fill: 'rgba(239,68,68,0.5)',
    trackBg: 'rgba(239,68,68,0.08)',
  },
  Risolto: {
    label: 'Risolto',
    dot: '#10B981',
    text: '#047857',
    tagBg: 'rgba(16,185,129,0.10)',
    fill: 'rgba(16,185,129,0.5)',
    trackBg: 'rgba(16,185,129,0.08)',
  },
}

const STATUS_DONE_FALLBACK = STATUS['Risolto']
const STATUS_ORDER = [
  'Aperto',
  'Riaperto',
  'in attesa di risposta',
  'in risoluzione',
  'Risolto',
]
const PEOPLE_STATUSES = STATUS_ORDER

function issueStatusKey(issue: PSPIssue): string {
  if (STATUS[issue.status]) return issue.status
  if (issue.statusCategory === 'done') return 'Risolto'
  return issue.status
}

const TOOLTIP_STYLE = {
  border: '1px solid #E8E8E8',
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 700,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

function getStatusCfg(issue: PSPIssue) {
  if (STATUS[issue.status]) return STATUS[issue.status]
  if (issue.statusCategory === 'done') return STATUS_DONE_FALLBACK
  return {
    label: '—',
    dot: '#C4B5FD',
    text: '#5B21B6',
    tagBg: 'rgba(196,181,253,0.10)',
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 30) return `${days}g fa`
  const months = Math.floor(days / 30)
  return months < 12 ? `${months}m fa` : `${Math.floor(months / 12)}a fa`
}

function statusCounts(issues: PSPIssue[]): Record<string, number> {
  return issues.reduce<Record<string, number>>((acc, i) => {
    const key = issueStatusKey(i)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

function StackedBar({
  counts,
  total,
  h = 6,
}: {
  counts: Record<string, number>
  total: number
  h?: number
}) {
  const present = STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0)
  return (
    <div
      className='relative w-full overflow-hidden rounded-full'
      style={{ height: h, backgroundColor: '#F0F0F0' }}
    >
      <div className='absolute inset-0 flex' style={{ gap: 1 }}>
        {present.map((s) => (
          <div
            key={s}
            style={{
              height: '100%',
              width: `${(counts[s] / total) * 100}%`,
              backgroundColor: STATUS[s].fill,
            }}
            title={`${STATUS[s].label}: ${counts[s]}`}
          />
        ))}
      </div>
    </div>
  )
}



const EIGHT_H = 8 * 3600_000
const TWO_H = 2 * 3600_000

function SlaBadge({ sla }: { sla: PSPSla | null }) {
  if (!sla) return <span className='text-[11px] text-[#767676]'>\u2014</span>
  if (sla.paused)
    return (
      <span className='inline-flex items-center gap-1 rounded-full bg-[#F5F5F5] px-2 py-[2px] text-[10px] font-bold text-[#555555]'>
        Pausa
      </span>
    )
  if (sla.breached) {
    const ms = Date.now() - new Date(sla.breachTime).getTime()
    const days = Math.floor(ms / 86400000),
      hrs = Math.floor(ms / 3600000)
    return (
      <span
        className='inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-bold'
        style={{
          backgroundColor: ISSUE_COLORS.blocked.tagBg,
          color: ISSUE_COLORS.blocked.text,
        }}
        title={`Scaduto il ${new Date(sla.breachTime).toLocaleString('it-IT')}`}
      >
        +{days >= 1 ? `${days}g` : `${hrs}h`} fa
      </span>
    )
  }
  const { remainingMs: ms, remainingFriendly: rem, goalFriendly: goal } = sla
  const urgency =
    ms <= TWO_H
      ? ISSUE_COLORS.blocked
      : ms <= EIGHT_H
        ? ISSUE_COLORS.inProgress
        : ISSUE_COLORS.done
  const cfg = urgency
  return (
    <span
      className='inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-bold tabular-nums'
      style={{ backgroundColor: cfg.tagBg, color: cfg.text }}
      title={`Goal: ${goal} \u00b7 Scade: ${new Date(sla.breachTime).toLocaleString('it-IT')}`}
    >
      {rem}
    </span>
  )
}

function StatusTag({ issue }: { issue: PSPIssue }) {
  const cfg = getStatusCfg(issue)
  return (
    <span
      className='inline-flex items-center gap-[5px] rounded-full px-2 py-[2px] text-[10px] font-bold'
      style={{ backgroundColor: cfg.tagBg, color: cfg.text }}
    >
      <span
        className='h-1.5 w-1.5 flex-shrink-0 rounded-full'
        style={{ backgroundColor: cfg.dot }}
      />
      {cfg.label}
    </span>
  )
}

function StatsOverview({
  counts,
  total,
  openTotal,
  selected,
  onSelect,
}: {
  counts: Record<string, number>
  total: number
  openTotal: number
  selected: string | null
  onSelect: (s: string | null) => void
}) {
  const present = STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0)
  return (
    <div className='bg-card overflow-hidden rounded-2xl border'>
      <div className='divide-border flex items-center divide-x'>
        {present.map((s) => {
          const cfg = STATUS[s]
          const active = selected === s
          return (
            <button
              key={s}
              onClick={() => onSelect(active ? null : s)}
              className='hover:bg-muted/50 flex items-baseline gap-2 px-5 py-3 transition-colors'
              style={{
                opacity: selected && !active ? 0.3 : 1,
                backgroundColor: active ? '#F7F7F7' : undefined,
              }}
            >
              <span className='text-foreground text-[28px] leading-none font-bold tabular-nums'>
                {counts[s]}
              </span>
              <span className='text-muted-foreground text-[11px] font-bold'>
                {cfg.label}
              </span>
              <span
                className='h-1.5 w-1.5 flex-shrink-0 translate-y-[-1px] rounded-full'
                style={{ backgroundColor: cfg.dot }}
              />
            </button>
          )
        })}
        <div className='ml-auto flex items-baseline gap-2 px-5 py-3'>
          <span className='text-foreground text-[36px] leading-none font-bold tabular-nums'>
            {total}
          </span>
          <div>
            <p className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
              totali
            </p>
            <p className='text-muted-foreground mt-0.5 text-[11px] font-bold'>
              <span className='text-foreground'>{openTotal}</span> aperti
            </p>
          </div>
        </div>
      </div>
      <div className='px-5 pb-3'>
        <StackedBar
          counts={selected ? { [selected]: counts[selected] ?? 0 } : counts}
          total={selected ? (counts[selected] ?? 0) : total}
          h={6}
        />
      </div>
    </div>
  )
}

function RequestTypeChart({
  groups,
  issuesByRT,
  selectedRT,
  onSelect,
}: {
  groups: PSPRequestTypeGroup[]
  issuesByRT: Record<string, PSPIssue[]>
  selectedRT: string | null
  onSelect: (rt: string | null) => void
}) {
  const maxCount = Math.max(
    1,
    ...groups.flatMap((g) =>
      g.requestTypes.flatMap((rt) => {
        const c = statusCounts(issuesByRT[rt.name] ?? [])
        return STATUS_ORDER.map((s) => c[s] ?? 0)
      })
    )
  )

  return (
    <div className='bg-card w-full overflow-hidden rounded-2xl border'>
      {groups.map((group, gi) => {
        const groupTotal = group.requestTypes.reduce(
          (sum, rt) => sum + (issuesByRT[rt.name]?.length ?? 0),
          0
        )
        return (
          <div
            key={group.id}
            className={`px-5 py-3 ${gi > 0 ? 'border-border border-t' : ''}`}
          >
            <p className='text-muted-foreground mb-3 text-[10px] tracking-widest uppercase'>
              {group.name} <span className='text-[#AAAAAA]'>{groupTotal}</span>
            </p>

            <div className='grid grid-cols-2 gap-x-5 gap-y-4'>
              {group.requestTypes.map((rt) => {
                const issues = issuesByRT[rt.name] ?? []
                const total = issues.length
                const counts = statusCounts(issues)
                const active = selectedRT === rt.name

                return (
                  <div key={rt.id} style={{ opacity: total === 0 ? 0.3 : 1 }}>
                    <div
                      className='mb-1.5 flex min-w-0 cursor-pointer items-center gap-1.5 font-bold'
                      onClick={() =>
                        total > 0 && onSelect(active ? null : rt.name)
                      }
                    >
                      <span
                        className='h-3 w-0.5 shrink-0 rounded-full transition-colors'
                        style={{
                          backgroundColor: active ? '#111111' : 'transparent',
                        }}
                      />
                      <span
                        className='text-md min-w-0 transition-colors'
                        style={{ color: active ? '#111111' : '#555555' }}
                      >
                        {rt.name}
                      </span>
                      <span className='text-md shrink-0 text-gray-400 tabular-nums'>
                        {total > 0 ? total : '\u2014'}
                      </span>
                    </div>

                    <div className='flex flex-col gap-1'>
                      {STATUS_ORDER.map((s) => {
                        const count = counts[s] ?? 0
                        const pct = (count / maxCount) * 100
                        const cfg = STATUS[s]
                        return (
                          <div key={s} className='flex items-center gap-2'>
                            <div
                              className='relative h-6 flex-1 overflow-hidden rounded-xs'
                              style={{ backgroundColor: cfg.trackBg }}
                            >
                              {count > 0 && (
                                <div
                                  className='absolute inset-y-0 left-0 rounded-xs'
                                  style={{
                                    width: `${pct.toFixed(1)}%`,
                                    backgroundColor: cfg.fill,
                                    transition: 'width .25s ease',
                                  }}
                                />
                              )}
                              <div className='absolute inset-0 flex items-center px-2'>
                                <span
                                  className='text-xs whitespace-nowrap'
                                  style={{
                                    color:
                                      count > 0 ? cfg.text : 'rgba(0,0,0,0.25)',
                                  }}
                                >
                                  {cfg.label}
                                </span>
                              </div>
                            </div>
                            <span
                              className='w-6 shrink-0 text-right text-[13px] tabular-nums'
                              style={{
                                color: count > 0 ? '#1a1a1a' : '#CCCCCC',
                              }}
                            >
                              {count > 0 ? count : '\u2014'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
function buildPeopleData(
  issues: PSPIssue[],
  key: 'reporter' | 'assignee',
  top = 10
) {
  const map: Record<string, Record<string, number>> = {}

  issues.forEach((i) => {
    const person = i[key]?.displayName ?? 'Non assegnato'
    if (!map[person]) map[person] = {}
    const s = issueStatusKey(i)
    map[person][s] = (map[person][s] ?? 0) + 1
  })

  return Object.entries(map)
    .map(([name, counts]) => {
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      const entry: Record<string, string | number> = {
        name,
        full: name,
        _total: total,
      }
      PEOPLE_STATUSES.forEach((s) => {
        entry[s] = counts[s] ?? 0
      })
      return entry as Record<string, string | number> & { _total: number }
    })
    .sort((a, b) => b._total - a._total)
    .slice(0, top)
}

function PeopleChart({
  data,
  title,
}: {
  data: ReturnType<typeof buildPeopleData>
  title: string
}) {
  return (
    <div className='flex min-w-0 flex-1 flex-col'>
      <p className='text-muted-foreground mb-3 text-[10px] font-bold tracking-widest uppercase'>
        {title}
      </p>
      <ResponsiveContainer width='100%' height={data.length * 34 + 8}>
        <BarChart
          data={data}
          layout='vertical'
          barSize={12}
          margin={{ left: 0, right: 36, top: 0, bottom: 0 }}
        >
          <XAxis type='number' hide />
          <YAxis
            type='category'
            dataKey='name'
            width={180}
            tick={{
              fontSize: 11,
              fontWeight: 700,
              fill: '#555555',
              fontFamily: 'inherit',
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ''}
            labelStyle={{ color: '#111111', marginBottom: 4 }}
            itemStyle={{ color: '#555555' }}
          />
          {PEOPLE_STATUSES.map((s, i) => (
            <Bar
              key={s}
              dataKey={s}
              stackId='p'
              fill={STATUS[s].fill}
              name={STATUS[s].label}
              radius={
                i === PEOPLE_STATUSES.length - 1 ? [0, 3, 3, 0] : [0, 0, 0, 0]
              }
              label={
                i === PEOPLE_STATUSES.length - 1
                  ? {
                      position: 'right',
                      fontSize: 11,
                      fontWeight: 700,
                      fill: '#555555',
                      formatter: (
                        _: unknown,
                        entry?: { payload?: { _total?: number } }
                      ) => entry?.payload?._total ?? '',
                    }
                  : undefined
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PeopleStatsBox({ issues }: { issues: PSPIssue[] }) {
  const reporterData = buildPeopleData(issues, 'reporter')
  const assigneeData = buildPeopleData(issues, 'assignee')

  const legendStatuses = PEOPLE_STATUSES.filter((s) =>
    [...reporterData, ...assigneeData].some((d) => (d[s] as number) > 0)
  )

  return (
    <div className='bg-card overflow-hidden rounded-2xl border'>
      <div className='border-border flex items-center justify-between border-b px-5 py-2.5'>
        <span className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
          Persone
        </span>
        <div className='flex items-center gap-4'>
          {legendStatuses.map((s) => (
            <span key={s} className='flex items-center gap-1.5'>
              <span
                className='h-2 w-2 rounded-[3px]'
                style={{ backgroundColor: STATUS[s].dot }}
              />
              <span className='text-muted-foreground text-[10px] font-bold'>
                {STATUS[s].label}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className='divide-border grid grid-cols-2 divide-x'>
        <div className='px-5 pt-4 pb-2'>
          <PeopleChart data={reporterData} title='Chi apre i ticket' />
        </div>
        <div className='px-5 pt-4 pb-2'>
          <PeopleChart data={assigneeData} title='A chi sono assegnati' />
        </div>
      </div>
    </div>
  )
}

const PRIORITY_ORDER: Record<string, number> = {
  Highest: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Lowest: 4,
}

const PRIORITY_DOT: Record<string, string> = {
  Highest: '#6D28D9',
  High: '#8B5CF6',
  Medium: '#C084FC',
  Low: '#DDD6FE',
  Lowest: '#EDE9FE',
}

const TABLE_HEADERS = [
  'Chiave',
  'Titolo',
  'Request Type',
  'Stato',
  'Priorit\u00e0',
  'Assegnato a',
  'Aperto da',
  'Apertura',
  'Time to Res.',
] as const

function IssueRow({ issue }: { issue: PSPIssue }) {
  return (
    <tr className='border-border hover:bg-muted/50 border-b transition-colors'>
      <td className='px-4 py-2 whitespace-nowrap'>
        <a
          href={issue.url}
          target='_blank'
          rel='noopener noreferrer'
          className='font-mono text-[11px] font-bold text-violet-700 hover:underline'
        >
          {issue.key}
        </a>
      </td>
      <td className='max-w-[260px] px-4 py-2'>
        <a
          href={issue.url}
          target='_blank'
          rel='noopener noreferrer'
          className='text-foreground block truncate text-[12px] font-bold transition-colors hover:text-violet-700'
          title={issue.summary}
        >
          {issue.summary}
        </a>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='text-muted-foreground text-[11px] font-bold'>
          {issue.requestType ?? issue.issueType}
        </span>
      </td>
      <td className='px-4 py-2'>
        <StatusTag issue={issue} />
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='flex items-center gap-1.5'>
          <span
            className='h-1.5 w-1.5 flex-shrink-0 rounded-full'
            style={{
              backgroundColor: PRIORITY_DOT[issue.priority] ?? '#EDE9FE',
            }}
          />
          <span className='text-muted-foreground text-[11px] font-bold'>
            {issue.priority}
          </span>
        </span>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='text-muted-foreground text-[11px] font-bold'>
          {issue.assignee?.displayName ?? '\u2014'}
        </span>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='text-muted-foreground text-[11px] font-bold'>
          {issue.reporter?.displayName ?? '\u2014'}
        </span>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='text-muted-foreground text-[11px] font-bold tabular-nums'>
          {timeAgo(issue.created)}
        </span>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <SlaBadge sla={issue.sla} />
      </td>
    </tr>
  )
}

const SORT_FN: Record<string, (a: PSPIssue, b: PSPIssue) => number> = {
  Chiave: (a, b) => a.key.localeCompare(b.key),
  Titolo: (a, b) => a.summary.localeCompare(b.summary),
  'Request Type': (a, b) =>
    (a.requestType ?? a.issueType).localeCompare(b.requestType ?? b.issueType),
  Stato: (a, b) => a.status.localeCompare(b.status),
  Priorità: (a, b) =>
    (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  'Assegnato a': (a, b) =>
    (a.assignee?.displayName ?? '').localeCompare(
      b.assignee?.displayName ?? ''
    ),
  'Aperto da': (a, b) =>
    (a.reporter?.displayName ?? '').localeCompare(
      b.reporter?.displayName ?? ''
    ),
  Apertura: (a, b) =>
    new Date(a.created).getTime() - new Date(b.created).getTime(),
  'Time to Res.': (a, b) =>
    (a.sla?.remainingMs ?? Infinity) - (b.sla?.remainingMs ?? Infinity),
}

export function PSPDashboard() {
  
  const { data, loading, error, cacheHit, refetch } = usePSP();
  const { isRefreshing, triggerRefresh } = useRefresh();

  const handleRefresh = () => {
    refetch();
  };

  const [selectedRT, setSelectedRT] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string>('Apertura')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const issuesByRT = useMemo(() => {
    if (!data) return {} as Record<string, PSPIssue[]>
    return data.issues.reduce<Record<string, PSPIssue[]>>((acc, i) => {
      const k = i.requestType ?? i.issueType
      ;(acc[k] ??= []).push(i)
      return acc
    }, {})
  }, [data])

  const allStatusCounts = useMemo(
    () => (data ? statusCounts(data.issues) : {}),
    [data]
  )

  const openTotal = useMemo(
    () => data?.issues.filter((i) => i.statusCategory !== 'done').length ?? 0,
    [data]
  )

  const filtered = useMemo(() => {
    if (!data) return []
    const base = data.issues.filter((i) => {
      if (i.statusCategory === 'done') return false
      if (selectedRT && (i.requestType ?? i.issueType) !== selectedRT)
        return false
      if (selectedStatus && issueStatusKey(i) !== selectedStatus) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          i.summary.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)
        )
      }
      return true
    })
    const fn = SORT_FN[sortKey]
    if (!fn) return base
    const sorted = [...base].sort(fn)
    return sortDir === 'desc' ? sorted.reverse() : sorted
  }, [data, selectedRT, selectedStatus, search, sortKey, sortDir])

  if (loading)
    return (
      <div className='flex flex-1 items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <RefreshCw className='text-muted-foreground h-8 w-8 animate-spin' />
          <p className='text-muted-foreground text-sm'>
            Caricamento PSP&hellip;
          </p>
        </div>
      </div>
    )

  if (error)
    return (
      <div className='flex flex-1 items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <p className='text-destructive text-sm font-semibold'>
            {error.message}
          </p>
          <button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading || isRefreshing} onClick={triggerRefresh}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />Ricarica</button>
        </div>
      </div>
    )

  if (!data) return null

  const total = data.issues.length
  const activeStatusCfg = selectedStatus ? STATUS[selectedStatus] : null
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
        <div className='mb-1 flex items-center justify-between'>
          <div>
            <p className='text-muted-foreground mb-1.5 text-[10px] font-bold tracking-widest uppercase'>
              Service Desk &middot; SA
            </p>
            <h1 className='text-2xl leading-none font-bold tracking-tight'>
              PSP
            </h1>
          </div>
          <div className='flex items-center gap-3'>
            {loading ? (
              <span className='text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-bold'>
                <RefreshCw className='h-3 w-3 animate-spin' />
                Aggiornamento&hellip;
              </span>
            ) : (
              <span className='text-muted-foreground text-[11px] font-bold'>
                <span className='inline-flex items-center gap-1.5'>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${cacheHit ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  />
                  Dati delle {fetchedTime}
                  <span className='opacity-50'>&middot; cache {ttlLabel}</span>
                </span>
                {' \u00b7 ultimi 90g'}
              </span>
            )}
            <button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading || isRefreshing} onClick={triggerRefresh}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />Ricarica</button>
            <a
              href='https://hd-group.atlassian.net/jira/servicedesk/projects/SA/queues/custom/218'
              target='_blank'
              rel='noopener noreferrer'
            >
              <button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading || isRefreshing} onClick={triggerRefresh}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />Ricarica</button>
            </a>
          </div>
        </div>

        <StatsOverview
          counts={allStatusCounts}
          total={total}
          openTotal={openTotal}
          selected={selectedStatus}
          onSelect={setSelectedStatus}
        />

        {(data.groups ?? []).length > 0 && (
          <RequestTypeChart
            groups={data.groups}
            issuesByRT={issuesByRT}
            selectedRT={selectedRT}
            onSelect={setSelectedRT}
          />
        )}

        <PeopleStatsBox issues={data.issues} />

        <div className='bg-card overflow-hidden rounded-2xl border'>
          <div className='flex items-center gap-2 border-b px-4 py-2.5'>
            <div className='relative flex-1'>
              <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px]'>
                &#x2315;
              </span>
              <input
                type='text'
                placeholder='Cerca per chiave o titolo\u2026'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='bg-muted/50 text-foreground placeholder:text-muted-foreground/60 w-full rounded-lg border-0 py-1.5 pr-3 pl-7 text-[12px] font-bold transition-all outline-none placeholder:font-bold focus:ring-2 focus:ring-violet-600'
              />
            </div>
            {selectedRT && (
              <button
                onClick={() => setSelectedRT(null)}
                className='bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold'
              >
                {selectedRT} <span className='opacity-50'>&times;</span>
              </button>
            )}
            {selectedStatus && activeStatusCfg && (
              <button
                onClick={() => setSelectedStatus(null)}
                className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold'
                style={{
                  backgroundColor: activeStatusCfg.tagBg,
                  color: activeStatusCfg.text,
                }}
              >
                {activeStatusCfg.label}{' '}
                <span className='opacity-50'>&times;</span>
              </button>
            )}
            {(selectedRT || selectedStatus || search) && (
              <button
                onClick={() => {
                  setSelectedRT(null)
                  setSelectedStatus(null)
                  setSearch('')
                }}
                className='text-muted-foreground hover:text-foreground shrink-0 text-[11px] font-bold transition-colors'
              >
                Azzera
              </button>
            )}
            <span className='text-muted-foreground ml-auto shrink-0 text-[11px] font-bold tabular-nums'>
              {filtered.length}
              <span className='text-muted-foreground/60'>
                /{openTotal} aperti
              </span>
            </span>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-left'>
              <thead>
                <tr className='bg-muted/30 border-border border-b'>
                  {TABLE_HEADERS.map((h) => {
                    const sortable = h in SORT_FN
                    const active = sortKey === h
                    return (
                      <th
                        key={h}
                        onClick={() => {
                          if (!sortable) return
                          if (active)
                            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                          else {
                            setSortKey(h)
                            setSortDir('asc')
                          }
                        }}
                        className='px-4 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase select-none'
                        style={{
                          color: active ? 'foreground' : 'muted-foreground',
                          cursor: sortable ? 'pointer' : 'default',
                        }}
                      >
                        <span className='inline-flex items-center gap-1'>
                          {h}
                          {sortable && (
                            <span
                              style={{
                                opacity: active ? 1 : 0.25,
                                fontSize: 9,
                              }}
                            >
                              {active && sortDir === 'desc'
                                ? '\u2193'
                                : '\u2191'}
                            </span>
                          )}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className='text-muted-foreground py-16 text-center text-[13px] font-bold'
                    >
                      Nessun risultato.
                    </td>
                  </tr>
                ) : (
                  filtered.map((i) => <IssueRow key={i.key} issue={i} />)
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className='h-2' />
      </div>
    </div>
  )
}
