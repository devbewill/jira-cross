"use client";

import { useState, useMemo } from "react";
import { usePSP } from "@/hooks/usePSP";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PSPIssue, PSPRequestType, PSPSla } from "@/types";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; bar: string; dot: string }> = {
  "Aperto": {
    label: "Aperto",
    bg: "bg-blue-500/15",
    text: "text-blue-300",
    bar: "bg-blue-400",
    dot: "bg-blue-400",
  },
  "in attesa di risposta": {
    label: "In attesa",
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
  },
  "in risoluzione": {
    label: "In risoluzione",
    bg: "bg-indigo-400/15",
    text: "text-indigo-300",
    bar: "bg-indigo-400",
    dot: "bg-indigo-400",
  },
  "Riaperto": {
    label: "Riaperto",
    bg: "bg-red-500/15",
    text: "text-red-400",
    bar: "bg-red-400",
    dot: "bg-red-400",
  },
};

const DEFAULT_STATUS_CFG = {
  label: "—",
  bg: "bg-linear-surfaceHover",
  text: "text-linear-textSecondary",
  bar: "bg-linear-textDim",
  dot: "bg-linear-textDim",
};

const STATUS_ORDER = ["Aperto", "Riaperto", "in attesa di risposta", "in risoluzione"];

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  Highest: "bg-red-500",
  High: "bg-orange-400",
  Medium: "bg-yellow-400",
  Low: "bg-blue-400",
  Lowest: "bg-slate-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 30) return `${days}gg fa`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}m fa`;
  return `${Math.floor(months / 12)}a fa`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? DEFAULT_STATUS_CFG;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StackedBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (total === 0) return <div className="h-1.5 rounded-full bg-linear-surfaceActive w-full" />;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-px w-full">
      {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => {
        const cfg = STATUS_CFG[s] ?? DEFAULT_STATUS_CFG;
        return (
          <div
            key={s}
            className={`h-full ${cfg.bar}`}
            style={{ width: `${(counts[s] / total) * 100}%` }}
            title={`${STATUS_CFG[s]?.label ?? s}: ${counts[s]}`}
          />
        );
      })}
    </div>
  );
}

// ─── Request Type Card ────────────────────────────────────────────────────────

function RequestTypeCard({
  requestType,
  issues,
  isSelected,
  onClick,
}: {
  requestType: PSPRequestType;
  issues: PSPIssue[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const total = issues.length;
  const counts = issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});
  const isEmpty = total === 0;

  return (
    <button
      onClick={onClick}
      disabled={isEmpty}
      className={`text-left w-full p-4 rounded-xl border transition-all duration-150 ${
        isEmpty
          ? "border-linear-border/40 bg-linear-surface/50 opacity-50 cursor-default"
          : isSelected
          ? "border-linear-accent bg-linear-accentLight/10 shadow-accent-glow ring-1 ring-linear-accent/30"
          : "border-linear-border bg-linear-surface hover:border-linear-borderHover hover:bg-linear-surfaceHover cursor-pointer"
      }`}
    >
      {/* Name + count */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`text-[12px] font-semibold leading-tight ${isSelected ? "text-linear-accent" : "text-linear-text"}`}>
          {requestType.name}
        </span>
        <span className={`text-[26px] font-bold leading-none shrink-0 ${isEmpty ? "text-linear-textDim" : "text-linear-text"}`}>
          {total}
        </span>
      </div>

      {/* Stacked bar */}
      <StackedBar counts={counts} total={total} />

      {/* Status breakdown */}
      {!isEmpty && (
        <div className="mt-3 flex flex-col gap-1.5">
          {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => {
            const cfg = STATUS_CFG[s] ?? DEFAULT_STATUS_CFG;
            return (
              <div key={s} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                <span className={`text-[10px] flex-1 truncate ${cfg.text}`}>{cfg.label}</span>
                <span className="text-[11px] font-semibold text-linear-text tabular-nums">{counts[s]}</span>
                <span className="text-[10px] text-linear-textDim tabular-nums w-6 text-right">
                  {Math.round((counts[s] / total) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {isEmpty && (
        <p className="mt-2 text-[10px] text-linear-textDim">Nessun ticket aperto</p>
      )}
    </button>
  );
}

// ─── SLA Badge ────────────────────────────────────────────────────────────────

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const TWO_HOURS_MS   = 2 * 60 * 60 * 1000;

function SlaBadge({ sla }: { sla: PSPSla | null }) {
  if (!sla) return <span className="text-[11px] text-linear-textDim">—</span>;

  if (sla.paused) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-linear-surfaceHover text-linear-textSecondary border border-linear-border">
        ⏸ In pausa
      </span>
    );
  }

  if (sla.breached) {
    const overdueMs = Date.now() - new Date(sla.breachTime).getTime();
    const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
    const overdueDays = Math.floor(overdueHours / 24);
    const overdueLabel = overdueDays >= 1
      ? `+${overdueDays}g fa`
      : `+${overdueHours}h fa`;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30"
        title={`Scaduto il ${new Date(sla.breachTime).toLocaleString("it-IT")}`}
      >
        ✕ Scaduto {overdueLabel}
      </span>
    );
  }

  // Color by remaining time
  const { remainingMs, remainingFriendly, goalFriendly } = sla;
  const { bg, text, border, icon } =
    remainingMs <= TWO_HOURS_MS
      ? { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30",    icon: "⚠" }
      : remainingMs <= EIGHT_HOURS_MS
      ? { bg: "bg-amber-500/15",  text: "text-amber-300",  border: "border-amber-500/30",  icon: "◷" }
      : { bg: "bg-green-500/15",  text: "text-green-400",  border: "border-green-500/30",  icon: "◷" };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${bg} ${text} border ${border}`}
      title={`Goal: ${goalFriendly} · Scade: ${new Date(sla.breachTime).toLocaleString("it-IT")}`}
    >
      {icon} {remainingFriendly}
    </span>
  );
}

// ─── Issue Row ────────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: PSPIssue }) {
  const priorityDot = PRIORITY_DOT[issue.priority] ?? "bg-slate-400";
  return (
    <tr className="border-b border-linear-border/50 hover:bg-linear-surfaceHover/50 transition-colors">
      <td className="py-2.5 px-3">
        <a href={issue.url} target="_blank" rel="noopener noreferrer"
          className="text-[11px] font-mono text-linear-accent hover:underline whitespace-nowrap">
          {issue.key}
        </a>
      </td>
      <td className="py-2.5 px-3 max-w-[280px]">
        <a href={issue.url} target="_blank" rel="noopener noreferrer"
          className="text-[12px] text-linear-text truncate block hover:text-linear-accent transition-colors"
          title={issue.summary}>
          {issue.summary}
        </a>
      </td>
      <td className="py-2.5 px-3 whitespace-nowrap">
        <span className="text-[11px] text-linear-textSecondary">
          {issue.requestType ?? issue.issueType}
        </span>
      </td>
      <td className="py-2.5 px-3">
        <StatusBadge status={issue.status} />
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${priorityDot}`} />
          <span className="text-[11px] text-linear-textSecondary">{issue.priority}</span>
        </div>
      </td>
      <td className="py-2.5 px-3 whitespace-nowrap">
        <span className="text-[11px] text-linear-textSecondary">
          {issue.assignee?.displayName ?? "—"}
        </span>
      </td>
      <td className="py-2.5 px-3 text-right whitespace-nowrap">
        <span className="text-[11px] text-linear-textDim">{timeAgo(issue.created)}</span>
      </td>
      <td className="py-2.5 px-3 whitespace-nowrap">
        <SlaBadge sla={issue.sla} />
      </td>
    </tr>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function PSPDashboard() {
  const { data, loading, error } = usePSP();
  const [selectedRequestType, setSelectedRequestType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Map requestType name → issues
  const issuesByRequestType = useMemo(() => {
    if (!data) return {} as Record<string, PSPIssue[]>;
    return data.issues.reduce<Record<string, PSPIssue[]>>((acc, issue) => {
      const key = issue.requestType ?? issue.issueType;
      (acc[key] ??= []).push(issue);
      return acc;
    }, {});
  }, [data]);

  const globalStatusCounts = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    return data.issues.reduce<Record<string, number>>((acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [data]);

  const filteredIssues = useMemo(() => {
    if (!data) return [];
    return data.issues.filter((i) => {
      const rt = i.requestType ?? i.issueType;
      if (selectedRequestType && rt !== selectedRequestType) return false;
      if (selectedStatus && i.status !== selectedStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!i.summary.toLowerCase().includes(q) && !i.key.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, selectedRequestType, selectedStatus, search]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner message="Caricamento PSP…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-linear-danger text-sm">{error.message}</span>
      </div>
    );
  }

  if (!data) return null;

  const total = data.issues.length;

  return (
    <div className="flex-1 overflow-y-auto bg-linear-secondary px-6 py-5 space-y-6">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-linear-text">PSP — SA Service Desk</h2>
          <p className="text-[11px] text-linear-textSecondary mt-0.5">
            {total} work item{total !== 1 ? "s" : ""} aperti ·{" "}
            <span className="text-linear-textDim">
              sync {new Date(data.fetchedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
        </div>
        <a
          href="https://hd-group.atlassian.net/jira/servicedesk/projects/SA/queues/custom/218"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-linear-border bg-linear-surface text-linear-textSecondary hover:text-linear-text hover:border-linear-borderHover transition-all"
        >
          ↗ Apri in Jira
        </a>
      </div>

      {/* ── Request type groups — PRIMARY ────────────────────────────────── */}
      {(data.groups ?? []).map((group) => (
        <div key={group.id}>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[11px] font-semibold text-linear-textSecondary uppercase tracking-widest">
              {group.name}
            </p>
            <div className="flex-1 h-px bg-linear-border/50" />
            <span className="text-[10px] text-linear-textDim font-mono">
              {group.requestTypes.reduce((sum, rt) => sum + (issuesByRequestType[rt.name]?.length ?? 0), 0)} aperti
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {group.requestTypes.map((rt) => (
              <RequestTypeCard
                key={rt.id}
                requestType={rt}
                issues={issuesByRequestType[rt.name] ?? []}
                isSelected={selectedRequestType === rt.name}
                onClick={() => setSelectedRequestType(selectedRequestType === rt.name ? null : rt.name)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Status summary — secondary ──────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[11px] font-semibold text-linear-textSecondary uppercase tracking-widest">
            Per Stato
          </p>
          <div className="flex-1 h-px bg-linear-border/50" />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.filter((s) => globalStatusCounts[s] > 0).map((s) => {
            const cfg = STATUS_CFG[s] ?? DEFAULT_STATUS_CFG;
            const count = globalStatusCounts[s];
            const pct = Math.round((count / total) * 100);
            const isActive = selectedStatus === s;
            return (
              <button
                key={s}
                onClick={() => setSelectedStatus(isActive ? null : s)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150 ${
                  isActive
                    ? "border-linear-accent bg-linear-accentLight/10"
                    : "border-linear-border bg-linear-surface hover:bg-linear-surfaceHover"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                <span className="text-[13px] font-bold text-linear-text tabular-nums">{count}</span>
                <span className="text-[10px] text-linear-textDim">({pct}%)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Issue table ──────────────────────────────────────────────────── */}
      <div className="bg-linear-surface border border-linear-border rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-linear-border">
          <input
            type="text"
            placeholder="Cerca per chiave o titolo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-linear-surfaceHover border border-linear-border rounded-lg px-3 py-1.5 text-[12px] text-linear-text placeholder-linear-textDim outline-none focus:border-linear-accent transition-colors"
          />
          {(selectedRequestType || selectedStatus || search) && (
            <button
              onClick={() => { setSelectedRequestType(null); setSelectedStatus(null); setSearch(""); }}
              className="text-[11px] text-linear-textSecondary hover:text-linear-text px-2 py-1 rounded-md hover:bg-linear-surfaceHover transition-colors shrink-0"
            >
              Azzera filtri
            </button>
          )}
          <span className="text-[11px] text-linear-textDim font-mono shrink-0">{filteredIssues.length} / {total}</span>
        </div>

        {/* Active filter chips */}
        {(selectedRequestType || selectedStatus) && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-linear-border/50 bg-linear-surfaceHover/30">
            {selectedRequestType && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-linear-accentLight/15 text-linear-accent border border-linear-accent/30 px-2 py-0.5 rounded-full">
                {selectedRequestType}
                <button onClick={() => setSelectedRequestType(null)} className="ml-1 hover:opacity-70">×</button>
              </span>
            )}
            {selectedStatus && (
              <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${STATUS_CFG[selectedStatus]?.bg ?? ""} ${STATUS_CFG[selectedStatus]?.text ?? ""} border-current/30`}>
                {STATUS_CFG[selectedStatus]?.label ?? selectedStatus}
                <button onClick={() => setSelectedStatus(null)} className="ml-1 hover:opacity-70">×</button>
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-linear-border/60">
                {["Chiave", "Titolo", "Request Type", "Stato", "Priorità", "Assegnato a", "Apertura", "Time to Resolution"].map((h) => (
                  <th key={h} className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-linear-textDim whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[12px] text-linear-textSecondary">
                    Nessun issue trovato con i filtri applicati.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => <IssueRow key={issue.key} issue={issue} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
