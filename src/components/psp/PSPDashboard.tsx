"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, RefreshCw, TableIcon } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, AreaChart, Area, Legend } from 'recharts';
import { usePSP } from '@/hooks/usePSP';
import { useRefresh } from '@/contexts/RefreshContext';
import { PSPIssue, PSPRequestTypeGroup } from '@/types';


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
  Annullato: {
    label: 'Annullato',
    dot: '#9CA3AF',
    text: '#4B5563',
    tagBg: 'rgba(156,163,175,0.10)',
    fill: 'rgba(156,163,175,0.45)',
    trackBg: 'rgba(156,163,175,0.08)',
  },
}

const STATUS_DONE_FALLBACK = STATUS['Risolto']
const STATUS_ORDER = [
  'Aperto',
  'Riaperto',
  'in attesa di risposta',
  'in risoluzione',
  'Risolto',
  'Annullato',
]
// Colors aligned with existing STATUS palette
const DONUT_COLORS = [
  '#3B82F6', // blue   (Aperto)
  '#10B981', // green  (Risolto)
  '#F59E0B', // amber  (In attesa)
  '#06B6D4', // cyan
  '#EF4444', // red    (Riaperto)
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#9CA3AF', // gray   (Annullato)
  '#6366F1', // indigo
]

const STATUS_LEGEND_COLOR: Record<string, string> = {
  'Aperto': '#3B82F6',
  'Riaperto': '#EF4444',
  'in attesa di risposta': '#F59E0B',
  'in risoluzione': '#FFB8F7',
  'Risolto': '#10B981',
  'Annullato': '#9CA3AF',
}

const STATUS_LABEL_COLOR: Record<string, string> = {
  'Aperto': '#fff',
  'Riaperto': '#fff',
  'in attesa di risposta': '#78350F',
  'in risoluzione': '#86198F',
  'Risolto': '#fff',
  'Annullato': '#fff',
}

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

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p: any) => p.dataKey !== '_total' && Number(p.value) > 0)
  if (!items.length) return null
  const label = payload[0]?.payload?.full ?? payload[0]?.payload?.name ?? ''
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: '8px 12px', backgroundColor: '#fff' }}>
      <p style={{ color: '#111', marginBottom: 6, fontWeight: 700, fontSize: 11 }}>{label}</p>
      {items.map((item: any) => (
        <div key={item.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, backgroundColor: STATUS_LEGEND_COLOR[item.dataKey] ?? item.fill }} />
          <span style={{ color: '#555', fontSize: 11, fontWeight: 700 }}>
            {STATUS[item.dataKey]?.label ?? item.name}: {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function statusCounts(issues: PSPIssue[]): Record<string, number> {
  return issues.reduce<Record<string, number>>((acc, i) => {
    const key = issueStatusKey(i)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

function rawStatusCounts(issues: PSPIssue[]): Record<string, number> {
  return issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1
    return acc
  }, {})
}

function StackedBar({ counts, total, h = 6 }: { counts: Record<string, number>; total: number; h?: number }) {
  const present = STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0)
  return (
    <div className='relative w-full overflow-hidden rounded-full' style={{ height: h, backgroundColor: '#F0F0F0' }}>
      <div className='absolute inset-0 flex' style={{ gap: 1 }}>
        {present.map((s) => (
          <div
            key={s}
            style={{ height: '100%', width: `${(counts[s] / total) * 100}%`, backgroundColor: STATUS_LEGEND_COLOR[s] }}
            title={`${STATUS[s].label}: ${counts[s]}`}
          />
        ))}
      </div>
    </div>
  )
}

function StatsOverview({
  counts, total, openTotal, selected, onSelect,
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
              style={{ opacity: selected && !active ? 0.3 : 1, backgroundColor: active ? '#F7F7F7' : undefined }}
            >
              <span className='text-[28px] leading-none font-bold tabular-nums' style={{ color: STATUS_LEGEND_COLOR[s] }}>{counts[s]}</span>
              <span className='text-muted-foreground text-[11px] font-bold'>{cfg.label}</span>
            </button>
          )
        })}
        <div className='ml-auto flex items-baseline gap-2 px-5 py-3'>
          <span className='text-foreground text-[36px] leading-none font-bold tabular-nums'>{total}</span>
          <div>
            <p className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>totali</p>
            <p className='text-muted-foreground mt-0.5 text-[11px] font-bold'>
              <span className='text-foreground'>{openTotal}</span> aperti
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RequestTypeChart({
  groups, issuesByRT, selectedRT, onSelect,
}: {
  groups: PSPRequestTypeGroup[]
  issuesByRT: Record<string, PSPIssue[]>
  selectedRT: string | null
  onSelect: (rt: string | null) => void
}) {
  const presentGroups = groups
    .map(g => ({
      ...g,
      requestTypes: g.requestTypes.filter(rt => (issuesByRT[rt.name]?.length ?? 0) > 0),
    }))
    .filter(g => g.requestTypes.length > 0)

  if (presentGroups.length === 0) return null

  return (
    <div className='bg-card overflow-hidden rounded-2xl border'>
      <div className='border-border border-b px-5 py-2.5'>
        <span className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>Tipo di richiesta</span>
      </div>
      <div className='flex flex-col divide-y divide-border'>
        {presentGroups.map(group => {
          const data = group.requestTypes
            .map(rt => {
              const issues = issuesByRT[rt.name] ?? []
              const raw = rawStatusCounts(issues)
              const entry: Record<string, string | number> = {
                name: rt.name.length > 22 ? rt.name.slice(0, 20) + '…' : rt.name,
                full: rt.name,
                _total: issues.length,
              }
              STATUS_ORDER.forEach(s => { entry[s] = raw[s] ?? 0 })
              return entry as Record<string, string | number> & { _total: number }
            })
            .sort((a, b) => b._total - a._total)

          const activeStatuses = STATUS_ORDER.filter(s => data.some(d => (d[s] as number) > 0))

          return (
            <div key={group.id} className='px-5 pt-4 pb-5'>
              <p className='text-muted-foreground mb-3 text-[10px] font-bold tracking-widest uppercase'>{group.name}</p>
              <div style={{ position: 'relative' }}>
                <ResponsiveContainer width='100%' height={data.length * 38 + 8}>
                  <BarChart
                    data={data}
                    layout='vertical'
                    barSize={24}
                    margin={{ left: 0, right: 44, top: 0, bottom: 0 }}
                    onClick={(e) => {
                      if (e?.activePayload?.[0]) {
                        const name = e.activePayload[0].payload.full
                        onSelect(selectedRT === name ? null : name)
                      }
                    }}
                  >
                    <XAxis type='number' hide />
                    <YAxis
                      type='category'
                      dataKey='name'
                      width={180}
                      tick={{ fontSize: 11, fontWeight: 700, fill: '#555555', cursor: 'pointer' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    {activeStatuses.map(s => (
                      <Bar
                        key={s}
                        dataKey={s}
                        stackId='a'
                        fill={STATUS_LEGEND_COLOR[s]}
                        style={{ cursor: 'pointer' }}
                        label={{
                          content: (props: any) => {
                            const n = props.value as number
                            if (!n) return null
                            const w = Number(props.width)
                            if (w < 18) return null
                            return (
                              <text
                                x={Number(props.x) + w / 2}
                                y={Number(props.y) + Number(props.height) / 2}
                                dominantBaseline='middle'
                                textAnchor='middle'
                                fill={STATUS_LABEL_COLOR[s] ?? '#fff'}
                                fontSize={10}
                                fontWeight={700}
                              >
                                {n}
                              </text>
                            )
                          },
                        }}
                      >
                        {selectedRT
                          ? data.map((entry, idx) => (
                              <Cell key={idx} fill={STATUS_LEGEND_COLOR[s]} opacity={entry.full === selectedRT ? 1 : 0.15} />
                            ))
                          : null}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {data.map((entry, idx) => {
                    const bandH = (data.length * 38 + 8) / data.length
                    const centerY = idx * bandH + bandH / 2
                    return (
                      <div key={idx} style={{
                        position: 'absolute', right: 4, top: centerY,
                        transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700,
                        color: '#555555', lineHeight: 1, whiteSpace: 'nowrap',
                      }}>
                        {entry._total}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ─── Donut helpers ────────────────────────────────────────────────────────────
function buildDonutData(issues: PSPIssue[], field: 'reporter' | 'assignee') {
  const map = new Map<string, number>()
  issues.forEach(i => {
    const name = i[field]?.displayName ?? 'Non assegnato'
    map.set(name, (map.get(name) ?? 0) + 1)
  })
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
}

function DonutHalf({ data, title, total }: {
  data: { name: string; value: number }[]
  title: string
  total: number
}) {
  return (
    <div className='flex flex-col gap-4 px-5 py-4'>
      <p className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>{title}</p>
      <div className='flex items-start gap-5'>
        <div style={{ position: 'relative', flexShrink: 0, width: 160, height: 160 }}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={data} dataKey='value' innerRadius={48} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                {data.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [v, name]}
                contentStyle={{ ...TOOLTIP_STYLE, backgroundColor: '#fff', padding: '6px 10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: '#111' }}>{total}</span>
            <span style={{ fontSize: 10, color: '#767676', fontWeight: 700, marginTop: 2 }}>aperti</span>
          </div>
        </div>
        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          {data.map((d, i) => (
            <div key={d.name} className='flex min-w-0 items-center gap-2'>
              <span className='h-2 w-2 flex-shrink-0 rounded-full' style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className='text-foreground min-w-0 flex-1 truncate text-[11px] font-bold'>{d.name}</span>
              <span className='text-muted-foreground flex-shrink-0 text-[11px] font-bold tabular-nums'>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DonutCard({ issues }: { issues: PSPIssue[] }) {
  const open = issues.filter(i => i.statusCategory !== 'done')
  const reporterData = buildDonutData(open, 'reporter')
  const assigneeData = buildDonutData(open, 'assignee')
  return (
    <div className='bg-card overflow-hidden rounded-2xl border'>
      <div className='border-border border-b px-5 py-2.5'>
        <span className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
          Distribuzione ticket aperti
        </span>
      </div>
      <div className='divide-border grid grid-cols-2 divide-x'>
        <DonutHalf data={reporterData} title='Chi apre' total={open.length} />
        <DonutHalf data={assigneeData} title='A chi sono assegnati' total={open.length} />
      </div>
    </div>
  )
}

// ─── Trend helpers ────────────────────────────────────────────────────────────
type TrendInterval = 'weekly' | 'monthly' | 'quarterly' | 'custom'

function mondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function groupKey(date: Date, interval: TrendInterval): string {
  const y = date.getFullYear()
  const m = date.getMonth()
  if (interval === 'monthly') return `${y}-${String(m + 1).padStart(2, '0')}`
  if (interval === 'quarterly') return `${y}-Q${Math.floor(m / 3) + 1}`
  return mondayOfWeek(date)
}

function formatKey(key: string, interval: TrendInterval): string {
  if (interval === 'monthly') {
    const [y, mo] = key.split('-')
    return new Date(+y, +mo - 1, 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
  }
  if (interval === 'quarterly') return key.replace('-', ' ')
  return new Date(key).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

function buildKeys(interval: TrendInterval, customStart: string, customEnd: string): string[] {
  const now = new Date()
  const keys: string[] = []

  if (interval === 'weekly') {
    for (let i = 12; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7)
      keys.push(mondayOfWeek(d))
    }
  } else if (interval === 'monthly') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear(), m = d.getMonth()
      keys.push(`${y}-${String(m + 1).padStart(2, '0')}`)
    }
  } else if (interval === 'quarterly') {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
      const y = d.getFullYear(), m = d.getMonth()
      keys.push(`${y}-Q${Math.floor(m / 3) + 1}`)
    }
  } else {
    // custom: weekly buckets between start and end
    if (!customStart || !customEnd) return []
    const startD = new Date(customStart), endD = new Date(customEnd)
    const cur = new Date(mondayOfWeek(startD))
    while (cur <= endD) {
      keys.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 7)
    }
  }
  return [...new Set(keys)]
}

function buildTrendData(issues: PSPIssue[], interval: TrendInterval, customStart: string, customEnd: string) {
  const keys = buildKeys(interval, customStart, customEnd)
  const keySet = new Set(keys)

  const opened: Record<string, number> = {}
  const resolved: Record<string, number> = {}
  const resTimeSums: Record<string, number> = {}
  const resTimeCounts: Record<string, number> = {}

  issues.forEach(i => {
    const ok = groupKey(new Date(i.created), interval)
    if (keySet.has(ok)) opened[ok] = (opened[ok] ?? 0) + 1

    if (i.resolutionDate) {
      const rk = groupKey(new Date(i.resolutionDate), interval)
      if (keySet.has(rk)) {
        resolved[rk] = (resolved[rk] ?? 0) + 1
        const days = (new Date(i.resolutionDate).getTime() - new Date(i.created).getTime()) / 86_400_000
        if (days <= 30) {
          resTimeSums[rk] = (resTimeSums[rk] ?? 0) + days
          resTimeCounts[rk] = (resTimeCounts[rk] ?? 0) + 1
        }
      }
    }
  })

  return keys.map(k => ({
    label: formatKey(k, interval),
    aperti: opened[k] ?? 0,
    risolti: resolved[k] ?? 0,
    tempoMedio: resTimeCounts[k]
      ? Math.round((resTimeSums[k] / resTimeCounts[k]) * 10) / 10
      : null,
  }))
}

const INTERVAL_LABELS: Record<TrendInterval, string> = {
  weekly: 'Sett.',
  monthly: 'Mese',
  quarterly: 'Trim.',
  custom: 'Custom',
}

function TrendCard({ issues }: { issues: PSPIssue[] }) {
  const [interval, setInterval] = useState<TrendInterval>('weekly')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const data = useMemo(
    () => buildTrendData(issues, interval, customStart, customEnd),
    [issues, interval, customStart, customEnd],
  )

  const hasResData = data.some(d => d.tempoMedio !== null)

  return (
    <div className='bg-card overflow-hidden rounded-2xl border'>
      {/* Header */}
      <div className='border-border flex flex-wrap items-center gap-3 border-b px-5 py-2.5'>
        <span className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
          Andamento nel tempo
        </span>
        <div className='ml-auto flex items-center gap-1'>
          {(['weekly', 'monthly', 'quarterly', 'custom'] as TrendInterval[]).map(iv => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className='rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors'
              style={{
                backgroundColor: interval === iv ? '#111' : 'transparent',
                color: interval === iv ? '#fff' : '#767676',
              }}
            >
              {INTERVAL_LABELS[iv]}
            </button>
          ))}
        </div>
        {interval === 'custom' && (
          <div className='flex w-full items-center gap-2 pt-1'>
            <input
              type='date'
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className='rounded-lg border border-[#E8E8E8] bg-transparent px-2.5 py-1 text-[11px] font-bold text-[#111] outline-none focus:ring-1 focus:ring-[#3B82F6]'
            />
            <span className='text-muted-foreground text-[11px]'>→</span>
            <input
              type='date'
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className='rounded-lg border border-[#E8E8E8] bg-transparent px-2.5 py-1 text-[11px] font-bold text-[#111] outline-none focus:ring-1 focus:ring-[#3B82F6]'
            />
          </div>
        )}
      </div>

      <div className='flex flex-col gap-6 p-5'>
        {/* Volume — area chart */}
        <div>
          <p className='text-muted-foreground mb-3 text-[10px] font-bold tracking-widest uppercase'>
            Ticket aperti e risolti
          </p>
          {data.length === 0 ? (
            <p className='text-muted-foreground py-8 text-center text-[12px] font-bold'>Seleziona un intervallo di date.</p>
          ) : (
            <ResponsiveContainer width='100%' height={180}>
              <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id='gradAperti' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#3B82F6' stopOpacity={0.18} />
                    <stop offset='95%' stopColor='#3B82F6' stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id='gradRisolti' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#10B981' stopOpacity={0.18} />
                    <stop offset='95%' stopColor='#10B981' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey='label' tick={{ fontSize: 10, fontWeight: 700, fill: '#767676' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#767676' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ ...TOOLTIP_STYLE, backgroundColor: '#fff', padding: '6px 10px' }}
                  cursor={{ stroke: '#E8E8E8', strokeWidth: 1 }}
                  formatter={(v: number, name: string) => [v, name === 'aperti' ? 'Aperti' : 'Risolti']}
                />
                <Legend
                  iconType='circle' iconSize={7}
                  formatter={(v) => (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>
                      {v === 'aperti' ? 'Aperti' : 'Risolti'}
                    </span>
                  )}
                />
                <Area dataKey='aperti' name='aperti' stroke='#3B82F6' strokeWidth={2} fill='url(#gradAperti)' dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area dataKey='risolti' name='risolti' stroke='#10B981' strokeWidth={2} fill='url(#gradRisolti)' dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Avg resolution time — area line */}
        <div>
          <div className='mb-3 flex items-baseline gap-2'>
            <p className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
              Tempo medio di risoluzione (giorni)
            </p>
            <span className='text-muted-foreground text-[10px] font-bold opacity-50'>· eccezioni &gt;30gg escluse</span>
          </div>
          {!hasResData ? (
            <p className='text-muted-foreground py-8 text-center text-[12px] font-bold'>
              Nessun dato di risoluzione disponibile per questo periodo.
            </p>
          ) : (
            <ResponsiveContainer width='100%' height={140}>
              <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id='gradTempo' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#F59E0B' stopOpacity={0.2} />
                    <stop offset='95%' stopColor='#F59E0B' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey='label' tick={{ fontSize: 10, fontWeight: 700, fill: '#767676' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#767676' }}
                  axisLine={false} tickLine={false} width={36}
                  tickFormatter={(v) => `${v}g`}
                />
                <Tooltip
                  contentStyle={{ ...TOOLTIP_STYLE, backgroundColor: '#fff', padding: '6px 10px' }}
                  cursor={{ stroke: '#E8E8E8', strokeWidth: 1 }}
                  formatter={(v: number | null) => v !== null ? [`${v} giorni`, 'Tempo medio'] : ['—', 'Tempo medio']}
                />
                <Area
                  dataKey='tempoMedio'
                  name='tempoMedio'
                  stroke='#F59E0B'
                  strokeWidth={2}
                  fill='url(#gradTempo)'
                  dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Platform trend ───────────────────────────────────────────────────────────
function buildPlatformTrendData(
  issues: PSPIssue[],
  interval: TrendInterval,
  customStart: string,
  customEnd: string,
) {
  const keys = buildKeys(interval, customStart, customEnd)
  const keySet = new Set(keys)

  // Collect all distinct requestType names sorted by total volume desc
  const totals = new Map<string, number>()
  issues.forEach(i => {
    const name = i.requestType ?? i.issueType
    totals.set(name, (totals.get(name) ?? 0) + 1)
  })
  const platformNames = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)

  const counts: Record<string, Record<string, number>> = {}
  keys.forEach(k => { counts[k] = {} })

  issues.forEach(i => {
    const ok = groupKey(new Date(i.created), interval)
    if (!keySet.has(ok)) return
    const name = i.requestType ?? i.issueType
    counts[ok][name] = (counts[ok][name] ?? 0) + 1
  })

  const data = keys.map(k => ({ label: formatKey(k, interval), ...counts[k] }))
  return { data, platformNames }
}

function PlatformTrendCard({ issues }: { issues: PSPIssue[] }) {
  const [interval, setInterval] = useState<TrendInterval>('weekly')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { data, platformNames } = useMemo(
    () => buildPlatformTrendData(issues, interval, customStart, customEnd),
    [issues, interval, customStart, customEnd],
  )

  return (
    <div className='bg-card overflow-hidden rounded-2xl border'>
      <div className='border-border flex flex-wrap items-center gap-3 border-b px-5 py-2.5'>
        <span className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
          Ticket per piattaforma nel tempo
        </span>
        <div className='ml-auto flex items-center gap-1'>
          {(['weekly', 'monthly', 'quarterly', 'custom'] as TrendInterval[]).map(iv => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className='rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors'
              style={{ backgroundColor: interval === iv ? '#111' : 'transparent', color: interval === iv ? '#fff' : '#767676' }}
            >
              {INTERVAL_LABELS[iv]}
            </button>
          ))}
        </div>
        {interval === 'custom' && (
          <div className='flex w-full items-center gap-2 pt-1'>
            <input type='date' value={customStart} onChange={e => setCustomStart(e.target.value)}
              className='rounded-lg border border-[#E8E8E8] bg-transparent px-2.5 py-1 text-[11px] font-bold text-[#111] outline-none focus:ring-1 focus:ring-[#3B82F6]' />
            <span className='text-muted-foreground text-[11px]'>→</span>
            <input type='date' value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className='rounded-lg border border-[#E8E8E8] bg-transparent px-2.5 py-1 text-[11px] font-bold text-[#111] outline-none focus:ring-1 focus:ring-[#3B82F6]' />
          </div>
        )}
      </div>

      <div className='p-5'>
        {/* Legend */}
        <div className='mb-4 flex flex-wrap gap-x-4 gap-y-1.5'>
          {platformNames.map((name, i) => (
            <span key={name} className='flex items-center gap-1.5'>
              <span className='h-2 w-2 flex-shrink-0 rounded-sm' style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className='text-muted-foreground text-[11px] font-bold'>{name}</span>
            </span>
          ))}
        </div>

        {data.length === 0 ? (
          <p className='text-muted-foreground py-8 text-center text-[12px] font-bold'>Seleziona un intervallo di date.</p>
        ) : (
          <ResponsiveContainer width='100%' height={240}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={18}>
              <XAxis dataKey='label' tick={{ fontSize: 10, fontWeight: 700, fill: '#767676' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#767676' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip
                contentStyle={{ ...TOOLTIP_STYLE, backgroundColor: '#fff', padding: '8px 12px' }}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const items = payload.filter(p => Number(p.value) > 0).reverse()
                  const total = items.reduce((s, p) => s + Number(p.value), 0)
                  return (
                    <div style={{ ...TOOLTIP_STYLE, padding: '8px 12px', backgroundColor: '#fff' }}>
                      <p style={{ color: '#111', marginBottom: 6, fontWeight: 700, fontSize: 11 }}>{label} · {total} ticket</p>
                      {items.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, backgroundColor: p.fill as string }} />
                          <span style={{ flex: 1, color: '#555', fontSize: 11, fontWeight: 700 }}>{p.dataKey}</span>
                          <span style={{ color: '#111', fontSize: 11, fontWeight: 700, tabularNums: true } as React.CSSProperties}>{p.value}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              {platformNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId='a'
                  fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                  radius={i === platformNames.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export function PSPDashboard() {
  
  const { data, loading, error, cacheHit, refetch } = usePSP();
  const { isRefreshing, triggerRefresh } = useRefresh();

  const handleRefresh = () => {
    refetch();
  };

  const [selectedRT, setSelectedRT] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

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
            <Link href='/psp/tickets' className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-1.5'>
              <TableIcon className='h-3.5 w-3.5' />Tutti i ticket
            </Link>
            <button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading || isRefreshing} onClick={triggerRefresh}>
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />Ricarica
            </button>
            <a
              href='https://hd-group.atlassian.net/jira/servicedesk/projects/SA/queues/custom/218'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-1.5'
            >
              <ExternalLink className='h-3.5 w-3.5' />Jira
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

        <DonutCard issues={data.issues} />
        <TrendCard issues={data.issues} />
        <PlatformTrendCard issues={data.issues} />

      </div>
    </div>
  )
}
