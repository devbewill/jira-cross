"use client";

import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePSP } from '@/hooks/usePSP';
import { useRefresh } from '@/contexts/RefreshContext';
import { PSPIssue, PSPSla } from '@/types';

const ISSUE_COLORS = {
  done: { dot: '#10B981', text: '#047857', tagBg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', outline: 'rgba(16,185,129,0.6)' },
  inProgress: { dot: '#F59E0B', text: '#B45309', tagBg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', outline: 'rgba(245,158,11,0.6)' },
  todo: { dot: '#94A3B8', text: '#475569', tagBg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', outline: 'rgba(148,163,184,0.6)' },
  open: { dot: '#3B82F6', text: '#1D4ED8', tagBg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)', outline: 'rgba(59,130,246,0.6)' },
  blocked: { dot: '#EF4444', text: '#B91C1C', tagBg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', outline: 'rgba(239,68,68,0.6)' },
} as const;

const STATUS: Record<string, { label: string; dot: string; text: string; tagBg: string; fill: string; trackBg: string }> = {
  Aperto: { label: 'Aperto', dot: '#3B82F6', text: '#1D4ED8', tagBg: 'rgba(59,130,246,0.10)', fill: 'rgba(59,130,246,0.5)', trackBg: 'rgba(59,130,246,0.08)' },
  'in attesa di risposta': { label: 'In attesa', dot: '#F59E0B', text: '#B45309', tagBg: 'rgba(245,158,11,0.10)', fill: 'rgba(245,158,11,0.5)', trackBg: 'rgba(245,158,11,0.08)' },
  'in risoluzione': { label: 'In risoluzione', dot: '#94A3B8', text: 'rgb(202 40 186)', tagBg: 'rgba(255,184,247,0.15)', fill: 'rgba(255,184,247,0.5)', trackBg: 'rgba(255,184,247,0.12)' },
  Riaperto: { label: 'Riaperto', dot: '#EF4444', text: '#B91C1C', tagBg: 'rgba(239,68,68,0.10)', fill: 'rgba(239,68,68,0.5)', trackBg: 'rgba(239,68,68,0.08)' },
  Risolto: { label: 'Risolto', dot: '#10B981', text: '#047857', tagBg: 'rgba(16,185,129,0.10)', fill: 'rgba(16,185,129,0.5)', trackBg: 'rgba(16,185,129,0.08)' },
  Annullato: { label: 'Annullato', dot: '#9CA3AF', text: '#4B5563', tagBg: 'rgba(156,163,175,0.10)', fill: 'rgba(156,163,175,0.45)', trackBg: 'rgba(156,163,175,0.08)' },
};

const STATUS_DONE_FALLBACK = STATUS['Risolto'];
const STATUS_ORDER = ['Aperto', 'Riaperto', 'in attesa di risposta', 'in risoluzione', 'Risolto', 'Annullato'];

function issueStatusKey(issue: PSPIssue): string {
  if (STATUS[issue.status]) return issue.status;
  if (issue.statusCategory === 'done') return 'Risolto';
  return issue.status;
}

function getStatusCfg(issue: PSPIssue) {
  if (STATUS[issue.status]) return STATUS[issue.status];
  if (issue.statusCategory === 'done') return STATUS_DONE_FALLBACK;
  return { label: '—', dot: '#C4B5FD', text: '#5B21B6', tagBg: 'rgba(196,181,253,0.10)' };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'oggi';
  if (days === 1) return 'ieri';
  if (days < 30) return `${days}g fa`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}m fa` : `${Math.floor(months / 12)}a fa`;
}

const EIGHT_H = 8 * 3600_000;
const TWO_H = 2 * 3600_000;

function SlaBadge({ sla }: { sla: PSPSla | null }) {
  if (!sla) return <span className='text-[11px] text-[#767676]'>—</span>;
  if (sla.paused)
    return <span className='inline-flex items-center gap-1 rounded-full bg-[#F5F5F5] px-2 py-[2px] text-[10px] font-bold text-[#555555]'>Pausa</span>;
  if (sla.breached) {
    const ms = Date.now() - new Date(sla.breachTime).getTime();
    const days = Math.floor(ms / 86400000), hrs = Math.floor(ms / 3600000);
    return (
      <span className='inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-bold'
        style={{ backgroundColor: ISSUE_COLORS.blocked.tagBg, color: ISSUE_COLORS.blocked.text }}
        title={`Scaduto il ${new Date(sla.breachTime).toLocaleString('it-IT')}`}>
        +{days >= 1 ? `${days}g` : `${hrs}h`} fa
      </span>
    );
  }
  const { remainingMs: ms, remainingFriendly: rem, goalFriendly: goal } = sla;
  const urgency = ms <= TWO_H ? ISSUE_COLORS.blocked : ms <= EIGHT_H ? ISSUE_COLORS.inProgress : ISSUE_COLORS.done;
  return (
    <span className='inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-bold tabular-nums'
      style={{ backgroundColor: urgency.tagBg, color: urgency.text }}
      title={`Goal: ${goal} · Scade: ${new Date(sla.breachTime).toLocaleString('it-IT')}`}>
      {rem}
    </span>
  );
}

function StatusTag({ issue }: { issue: PSPIssue }) {
  const cfg = getStatusCfg(issue);
  return (
    <span className='inline-flex items-center gap-[5px] rounded-full px-2 py-[2px] text-[10px] font-bold'
      style={{ backgroundColor: cfg.tagBg, color: cfg.text }}>
      <span className='h-1.5 w-1.5 flex-shrink-0 rounded-full' style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

const PRIORITY_ORDER: Record<string, number> = { Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 };
const PRIORITY_DOT: Record<string, string> = { Highest: '#6D28D9', High: '#8B5CF6', Medium: '#C084FC', Low: '#DDD6FE', Lowest: '#EDE9FE' };

const TABLE_HEADERS = ['Chiave', 'Titolo', 'Request Type', 'Stato', 'Priorità', 'Assegnato a', 'Aperto da', 'Apertura', 'Time to Res.'] as const;

function IssueRow({ issue }: { issue: PSPIssue }) {
  return (
    <tr className='border-border hover:bg-muted/50 border-b transition-colors'>
      <td className='px-4 py-2 whitespace-nowrap'>
        <a href={issue.url} target='_blank' rel='noopener noreferrer'
          className='font-mono text-[11px] font-bold text-violet-700 hover:underline'>
          {issue.key}
        </a>
      </td>
      <td className='max-w-[260px] px-4 py-2'>
        <a href={issue.url} target='_blank' rel='noopener noreferrer'
          className='text-foreground block truncate text-[12px] font-bold transition-colors hover:text-violet-700'
          title={issue.summary}>
          {issue.summary}
        </a>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='text-muted-foreground text-[11px] font-bold'>{issue.requestType ?? issue.issueType}</span>
      </td>
      <td className='px-4 py-2'><StatusTag issue={issue} /></td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='flex items-center gap-1.5'>
          <span className='h-1.5 w-1.5 flex-shrink-0 rounded-full' style={{ backgroundColor: PRIORITY_DOT[issue.priority] ?? '#EDE9FE' }} />
          <span className='text-muted-foreground text-[11px] font-bold'>{issue.priority}</span>
        </span>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='text-muted-foreground text-[11px] font-bold'>{issue.assignee?.displayName ?? '—'}</span>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='text-muted-foreground text-[11px] font-bold'>{issue.reporter?.displayName ?? '—'}</span>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'>
        <span className='text-muted-foreground text-[11px] font-bold tabular-nums'>{timeAgo(issue.created)}</span>
      </td>
      <td className='px-4 py-2 whitespace-nowrap'><SlaBadge sla={issue.sla} /></td>
    </tr>
  );
}

const SORT_FN: Record<string, (a: PSPIssue, b: PSPIssue) => number> = {
  Chiave: (a, b) => a.key.localeCompare(b.key),
  Titolo: (a, b) => a.summary.localeCompare(b.summary),
  'Request Type': (a, b) => (a.requestType ?? a.issueType).localeCompare(b.requestType ?? b.issueType),
  Stato: (a, b) => a.status.localeCompare(b.status),
  Priorità: (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  'Assegnato a': (a, b) => (a.assignee?.displayName ?? '').localeCompare(b.assignee?.displayName ?? ''),
  'Aperto da': (a, b) => (a.reporter?.displayName ?? '').localeCompare(b.reporter?.displayName ?? ''),
  Apertura: (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
  'Time to Res.': (a, b) => (a.sla?.remainingMs ?? Infinity) - (b.sla?.remainingMs ?? Infinity),
};

const SELECT_STYLE: React.CSSProperties = {
  height: 32,
  paddingLeft: 10,
  paddingRight: 28,
  borderRadius: 8,
  border: '1px solid #E8E8E8',
  backgroundColor: 'transparent',
  fontSize: 11,
  fontWeight: 700,
  color: '#555555',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23767676' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  minWidth: 0,
};

export function PSPTickets() {
  const { data, loading, error } = usePSP();
  const { isRefreshing, triggerRefresh } = useRefresh();

  const [search, setSearch] = useState('');
  const [selectedRT, setSelectedRT] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortKey, setSortKey] = useState<string>('Apertura');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const requestTypes = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    data.issues.forEach(i => set.add(i.requestType ?? i.issueType));
    return Array.from(set).sort();
  }, [data]);

  const presentStatuses = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    data.issues.forEach(i => set.add(issueStatusKey(i)));
    return STATUS_ORDER.filter(s => set.has(s));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [] as PSPIssue[];
    const base = data.issues.filter(i => {
      if (selectedRT && (i.requestType ?? i.issueType) !== selectedRT) return false;
      if (selectedStatus && issueStatusKey(i) !== selectedStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return i.summary.toLowerCase().includes(q) || i.key.toLowerCase().includes(q);
      }
      return true;
    });
    const fn = SORT_FN[sortKey];
    if (!fn) return base;
    const sorted = [...base].sort(fn);
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [data, selectedRT, selectedStatus, search, sortKey, sortDir]);

  const hasFilters = search || selectedRT || selectedStatus;

  if (loading)
    return (
      <div className='flex flex-1 items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <RefreshCw className='text-muted-foreground h-8 w-8 animate-spin' />
          <p className='text-muted-foreground text-sm'>Caricamento PSP&hellip;</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className='flex flex-1 items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <p className='text-destructive text-sm font-semibold'>{error.message}</p>
          <button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3'
            disabled={isRefreshing} onClick={triggerRefresh}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />Ricarica
          </button>
        </div>
      </div>
    );

  if (!data) return null;

  const cacheHit = (data as any).cacheHit ?? false;
  const fetchedTime = data.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : '';
  const ttlMinutes = Math.round((parseInt(process.env.NEXT_PUBLIC_JIRA_CACHE_TTL || '300', 10)) / 60);
  const ttlLabel = ttlMinutes >= 60 ? `${Math.round(ttlMinutes / 60)}h` : `${ttlMinutes}m`;

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='flex flex-col gap-4 px-6 py-5'>
        <div className='mb-1 flex items-center justify-between'>
          <div>
            <p className='text-muted-foreground mb-1.5 text-[10px] font-bold tracking-widest uppercase'>
              PSP &middot; Service Desk SA
            </p>
            <h1 className='text-2xl leading-none font-bold tracking-tight'>Tutti i ticket</h1>
          </div>
          <div className='flex items-center gap-3'>
            {loading ? (
              <span className='text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-bold'>
                <RefreshCw className='h-3 w-3 animate-spin' />Aggiornamento&hellip;
              </span>
            ) : (
              <span className='text-muted-foreground text-[11px] font-bold'>
                <span className='inline-flex items-center gap-1.5'>
                  <span className={`h-1.5 w-1.5 rounded-full ${cacheHit ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  Dati delle {fetchedTime}
                  <span className='opacity-50'>&middot; cache {ttlLabel}</span>
                </span>
                {' · ultimi 90g'}
              </span>
            )}
            <button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3'
              disabled={loading || isRefreshing} onClick={triggerRefresh}>
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />Ricarica
            </button>
          </div>
        </div>

        <div className='bg-card overflow-hidden rounded-2xl border'>
          <div className='flex flex-wrap items-center gap-2 border-b px-4 py-2.5'>
            {/* Ricerca libera */}
            <div className='relative' style={{ minWidth: 220, flex: '1 1 220px' }}>
              <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px]'>&#x2315;</span>
              <input
                type='text'
                placeholder='Cerca per chiave o titolo…'
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='bg-muted/50 text-foreground placeholder:text-muted-foreground/60 w-full rounded-lg border-0 py-1.5 pr-3 pl-7 text-[12px] font-bold transition-all outline-none placeholder:font-bold focus:ring-2 focus:ring-violet-600'
              />
            </div>

            {/* Dropdown Request Type */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <select
                value={selectedRT}
                onChange={e => setSelectedRT(e.target.value)}
                style={{
                  ...SELECT_STYLE,
                  color: selectedRT ? '#111111' : '#767676',
                  borderColor: selectedRT ? '#a78bfa' : '#E8E8E8',
                }}
              >
                <option value=''>Tutti i tipi</option>
                {requestTypes.map(rt => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>

            {/* Dropdown Stato */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{
                  ...SELECT_STYLE,
                  color: selectedStatus ? '#111111' : '#767676',
                  borderColor: selectedStatus ? '#a78bfa' : '#E8E8E8',
                }}
              >
                <option value=''>Tutti gli stati</option>
                {presentStatuses.map(s => (
                  <option key={s} value={s}>{STATUS[s]?.label ?? s}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setSelectedRT(''); setSelectedStatus(''); }}
                className='text-muted-foreground hover:text-foreground shrink-0 text-[11px] font-bold transition-colors'
              >
                Azzera
              </button>
            )}

            <span className='text-muted-foreground ml-auto shrink-0 text-[11px] font-bold tabular-nums'>
              {filtered.length}
              <span className='text-muted-foreground/60'>/{data.issues.length} totali</span>
            </span>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-left'>
              <thead>
                <tr className='bg-muted/30 border-border border-b'>
                  {TABLE_HEADERS.map(h => {
                    const sortable = h in SORT_FN;
                    const active = sortKey === h;
                    return (
                      <th
                        key={h}
                        onClick={() => {
                          if (!sortable) return;
                          if (active) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                          else { setSortKey(h); setSortDir('asc'); }
                        }}
                        className='px-4 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase select-none'
                        style={{ cursor: sortable ? 'pointer' : 'default' }}
                      >
                        <span className='inline-flex items-center gap-1'>
                          {h}
                          {sortable && (
                            <span style={{ opacity: active ? 1 : 0.25, fontSize: 9 }}>
                              {active && sortDir === 'desc' ? '↓' : '↑'}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className='text-muted-foreground py-16 text-center text-[13px] font-bold'>
                      Nessun risultato.
                    </td>
                  </tr>
                ) : (
                  filtered.map(i => <IssueRow key={i.key} issue={i} />)
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className='h-2' />
      </div>
    </div>
  );
}
