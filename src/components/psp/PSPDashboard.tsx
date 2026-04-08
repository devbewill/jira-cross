"use client";

import { useState, useMemo } from "react";
import { usePSP } from "@/hooks/usePSP";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PSPIssue, PSPRequestTypeGroup, PSPSla } from "@/types";

// ─── Status config — palette viola/fucsia monocromatica ───────────────────────
// dot/text/tagBg usati SOLO su elementi grafici (barre, badge, tag).

const STATUS: Record<string, { label: string; dot: string; text: string; tagBg: string }> = {
  "Aperto":                { label: "Aperto",        dot: "#A78BFA", text: "#5B21B6", tagBg: "rgba(167,139,250,0.12)" },
  "in attesa di risposta": { label: "In attesa",      dot: "#C084FC", text: "#6B21A8", tagBg: "rgba(192,132,252,0.12)" },
  "in risoluzione":        { label: "In risoluzione", dot: "#E879F9", text: "#86198F", tagBg: "rgba(232,121,249,0.12)" },
  "Riaperto":              { label: "Riaperto",       dot: "#C026D3", text: "#701A75", tagBg: "rgba(192,38,211,0.12)"  },
  "Risolto":               { label: "Risolto",        dot: "#6D28D9", text: "#4C1D95", tagBg: "rgba(109,40,217,0.12)"  },
};
const STATUS_DONE_FALLBACK = STATUS["Risolto"];
const STATUS_ORDER = ["Aperto", "Riaperto", "in attesa di risposta", "in risoluzione", "Risolto"];

function getStatusCfg(issue: PSPIssue) {
  if (STATUS[issue.status]) return STATUS[issue.status];
  if (issue.statusCategory === "done") return STATUS_DONE_FALLBACK;
  return { label: "—", dot: "#C4B5FD", text: "#5B21B6", tagBg: "rgba(196,181,253,0.10)" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 30) return `${days}g fa`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}m fa` : `${Math.floor(months / 12)}a fa`;
}

function statusCounts(issues: PSPIssue[]): Record<string, number> {
  return issues.reduce<Record<string, number>>((acc, i) => {
    const key = STATUS[i.status] ? i.status : i.statusCategory === "done" ? "Risolto" : i.status;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

// ─── StackedBar ───────────────────────────────────────────────────────────────

function StackedBar({ counts, total, h = 6 }: { counts: Record<string, number>; total: number; h?: number }) {
  const present = STATUS_ORDER.filter(s => (counts[s] ?? 0) > 0);
  return (
    <div className="relative rounded-full overflow-hidden w-full" style={{ height: h, backgroundColor: "#F0F0F0" }}>
      <div className="absolute inset-0 flex" style={{ gap: 1 }}>
        {present.map(s => (
          <div key={s} style={{ height: "100%", width: `${(counts[s] / total) * 100}%`, backgroundColor: STATUS[s].dot }}
            title={`${STATUS[s].label}: ${counts[s]}`} />
        ))}
      </div>
    </div>
  );
}

// ─── SLA badge ────────────────────────────────────────────────────────────────

const EIGHT_H = 8 * 3600_000, TWO_H = 2 * 3600_000;

function SlaBadge({ sla }: { sla: PSPSla | null }) {
  if (!sla) return <span className="text-[11px] text-[#767676]">—</span>;
  if (sla.paused) return (
    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] font-extrabold bg-[#F5F5F5] text-[#555555]">
      ⏸ Pausa
    </span>
  );
  if (sla.breached) {
    const ms = Date.now() - new Date(sla.breachTime).getTime();
    const days = Math.floor(ms / 86400000), hrs = Math.floor(ms / 3600000);
    const cfg = STATUS["Riaperto"];
    return (
      <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] font-extrabold"
        style={{ backgroundColor: cfg.tagBg, color: cfg.text }}
        title={`Scaduto il ${new Date(sla.breachTime).toLocaleString("it-IT")}`}>
        ✕ +{days >= 1 ? `${days}g` : `${hrs}h`} fa
      </span>
    );
  }
  const { remainingMs: ms, remainingFriendly: rem, goalFriendly: goal } = sla;
  const key = ms <= TWO_H ? "Riaperto" : ms <= EIGHT_H ? "in attesa di risposta" : "Risolto";
  const cfg = STATUS[key];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] font-extrabold tabular-nums"
      style={{ backgroundColor: cfg.tagBg, color: cfg.text }}
      title={`Goal: ${goal} · Scade: ${new Date(sla.breachTime).toLocaleString("it-IT")}`}>
      ◷ {rem}
    </span>
  );
}

// ─── StatusTag ────────────────────────────────────────────────────────────────

function StatusTag({ issue }: { issue: PSPIssue }) {
  const cfg = getStatusCfg(issue);
  return (
    <span className="inline-flex items-center gap-[5px] px-2 py-[2px] rounded-full text-[10px] font-extrabold"
      style={{ backgroundColor: cfg.tagBg, color: cfg.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── StatsOverview ────────────────────────────────────────────────────────────

function StatsOverview({ counts, total, openTotal, selected, onSelect }: {
  counts: Record<string, number>;
  total: number;
  openTotal: number;
  selected: string | null;
  onSelect: (s: string | null) => void;
}) {
  const present = STATUS_ORDER.filter(s => (counts[s] ?? 0) > 0);
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
      <div className="flex items-center divide-x divide-[#EBEBEB]">
        {present.map(s => {
          const cfg = STATUS[s];
          const active = selected === s;
          return (
            <button key={s} onClick={() => onSelect(active ? null : s)}
              className="flex items-baseline gap-2 px-5 py-3 transition-colors hover:bg-[#FAFAFA]"
              style={{ opacity: selected && !active ? 0.3 : 1, backgroundColor: active ? "#F7F7F7" : undefined }}>
              <span className="text-[28px] font-extrabold leading-none tabular-nums text-[#111111]">{counts[s]}</span>
              <span className="text-[11px] font-extrabold text-[#555555]">{cfg.label}</span>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 translate-y-[-1px]" style={{ backgroundColor: cfg.dot }} />
            </button>
          );
        })}
        <div className="flex items-baseline gap-2 px-5 py-3 ml-auto">
          <span className="text-[36px] font-extrabold leading-none tabular-nums text-[#111111]">{total}</span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#767676]">totali</p>
            <p className="text-[11px] font-extrabold text-[#555555] mt-0.5">
              <span className="text-[#111111]">{openTotal}</span> aperti
            </p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-3">
        <StackedBar counts={selected ? { [selected]: counts[selected] ?? 0 } : counts}
          total={selected ? (counts[selected] ?? 0) : total} h={6} />
      </div>
    </div>
  );
}

// ─── RequestTypeChart ─────────────────────────────────────────────────────────

function RequestTypeChart({ groups, issuesByRT, maxTotal, selectedRT, onSelect }: {
  groups: PSPRequestTypeGroup[];
  issuesByRT: Record<string, PSPIssue[]>;
  maxTotal: number;
  selectedRT: string | null;
  onSelect: (rt: string | null) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-5 px-5 py-2 border-b border-[#F0F0F0]">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#767676] mr-1">Legenda</span>
        {STATUS_ORDER.map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[3px] flex-shrink-0" style={{ backgroundColor: STATUS[s].dot }} />
            <span className="text-[11px] font-extrabold text-[#555555]">{STATUS[s].label}</span>
          </span>
        ))}
      </div>

      {/* Chart rows */}
      <div className="px-5 py-2 pb-3">
        {groups.map((group, gi) => {
          const groupTotal = group.requestTypes.reduce((sum, rt) => sum + (issuesByRT[rt.name]?.length ?? 0), 0);
          return (
            <div key={group.id} className={gi > 0 ? "mt-3" : ""}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#767676] mt-1 mb-1.5">
                {group.name} <span className="text-[#AAAAAA]">{groupTotal}</span>
              </p>
              {group.requestTypes.map(rt => {
                const issues = issuesByRT[rt.name] ?? [];
                const total = issues.length;
                const counts = statusCounts(issues);
                const active = selectedRT === rt.name;
                const present = STATUS_ORDER.filter(s => (counts[s] ?? 0) > 0);

                return (
                  <button key={rt.id} onClick={() => total > 0 && onSelect(active ? null : rt.name)}
                    className="flex items-center gap-3 w-full h-8 px-2 -mx-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: active ? "rgba(0,0,0,0.04)" : undefined,
                      opacity: total === 0 ? 0.3 : 1,
                      cursor: total === 0 ? "default" : "pointer",
                    }}>
                    <span className="w-0.5 h-4 rounded-full flex-shrink-0 transition-colors"
                      style={{ backgroundColor: active ? "#111111" : "transparent" }} />
                    <span className="text-[11px] font-extrabold flex-shrink-0 truncate text-left w-44"
                      style={{ color: active ? "#111111" : "#555555" }}>
                      {rt.name}
                    </span>
                    {/* Bar */}
                    <div className="flex-1 relative rounded-full overflow-hidden" style={{ height: 8, backgroundColor: "#F0F0F0" }}>
                      {total > 0 && (
                        <div className="absolute left-0 top-0 bottom-0 flex" style={{ width: `${(total / maxTotal) * 100}%`, gap: 1, transition: "width .25s ease" }}>
                          {present.map(s => (
                            <div key={s} style={{ height: "100%", width: `${(counts[s] / total) * 100}%`, backgroundColor: STATUS[s].dot }} />
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] font-extrabold tabular-nums w-6 text-right flex-shrink-0"
                      style={{ color: active ? "#111111" : total === 0 ? "#CCCCCC" : "#333333" }}>
                      {total > 0 ? total : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── IssueRow ─────────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: PSPIssue }) {
  const priorityDot: Record<string, string> = {
    Highest: "#6D28D9", High: "#8B5CF6", Medium: "#C084FC", Low: "#DDD6FE", Lowest: "#EDE9FE",
  };
  return (
    <tr className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA] transition-colors">
      <td className="py-2 px-4 whitespace-nowrap">
        <a href={issue.url} target="_blank" rel="noopener noreferrer"
          className="text-[11px] font-extrabold font-mono text-[#5B21B6] hover:underline">
          {issue.key}
        </a>
      </td>
      <td className="py-2 px-4 max-w-[260px]">
        <a href={issue.url} target="_blank" rel="noopener noreferrer"
          className="text-[12px] font-extrabold text-[#111111] block truncate hover:text-[#5B21B6] transition-colors"
          title={issue.summary}>{issue.summary}</a>
      </td>
      <td className="py-2 px-4 whitespace-nowrap">
        <span className="text-[11px] font-extrabold text-[#555555]">{issue.requestType ?? issue.issueType}</span>
      </td>
      <td className="py-2 px-4"><StatusTag issue={issue} /></td>
      <td className="py-2 px-4 whitespace-nowrap">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: priorityDot[issue.priority] ?? "#EDE9FE" }} />
          <span className="text-[11px] font-extrabold text-[#555555]">{issue.priority}</span>
        </span>
      </td>
      <td className="py-2 px-4 whitespace-nowrap">
        <span className="text-[11px] font-extrabold text-[#555555]">{issue.assignee?.displayName ?? "—"}</span>
      </td>
      <td className="py-2 px-4 whitespace-nowrap">
        <span className="text-[11px] font-extrabold tabular-nums text-[#767676]">{timeAgo(issue.created)}</span>
      </td>
      <td className="py-2 px-4 whitespace-nowrap"><SlaBadge sla={issue.sla} /></td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PSPDashboard() {
  const { data, loading, error } = usePSP();
  const [selectedRT, setSelectedRT] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const issuesByRT = useMemo(() => {
    if (!data) return {} as Record<string, PSPIssue[]>;
    return data.issues.reduce<Record<string, PSPIssue[]>>((acc, i) => {
      const k = i.requestType ?? i.issueType;
      (acc[k] ??= []).push(i);
      return acc;
    }, {});
  }, [data]);

  const allStatusCounts = useMemo(() => data ? statusCounts(data.issues) : {}, [data]);
  const openTotal = useMemo(() => data?.issues.filter(i => i.statusCategory !== "done").length ?? 0, [data]);
  const maxRTTotal = useMemo(() => {
    if (!data?.groups) return 1;
    return Math.max(1, ...data.groups.flatMap(g => g.requestTypes.map(rt => issuesByRT[rt.name]?.length ?? 0)));
  }, [data, issuesByRT]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.issues.filter(i => {
      if (i.statusCategory === "done") return false;
      if (selectedRT && (i.requestType ?? i.issueType) !== selectedRT) return false;
      if (selectedStatus && i.status !== selectedStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return i.summary.toLowerCase().includes(q) || i.key.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, selectedRT, selectedStatus, search]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#F5F5F5]">
      <LoadingSpinner message="Caricamento PSP…" />
    </div>
  );
  if (error) return (
    <div className="flex-1 flex items-center justify-center bg-[#F5F5F5]">
      <p className="text-sm text-red-600">{error.message}</p>
    </div>
  );
  if (!data) return null;

  const total = data.issues.length;
  const activeStatusCfg = selectedStatus ? STATUS[selectedStatus] : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F5F5]">
      <div className="flex flex-col gap-2 px-6 py-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#767676] mb-1.5">Service Desk · SA</p>
            <h1 className="text-2xl font-extrabold text-[#111111] tracking-tight leading-none">PSP</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-extrabold text-[#767676]">
              sync {new Date(data.fetchedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} · ultimi 90g
            </span>
            <a href="https://hd-group.atlassian.net/jira/servicedesk/projects/SA/queues/custom/218"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold bg-[#111111] text-white hover:bg-[#333333] transition-colors">
              ↗ Apri in Jira
            </a>
          </div>
        </div>

        {/* Stats */}
        <StatsOverview counts={allStatusCounts} total={total} openTotal={openTotal}
          selected={selectedStatus} onSelect={setSelectedStatus} />

        {/* Chart */}
        {(data.groups ?? []).length > 0 && (
          <RequestTypeChart groups={data.groups} issuesByRT={issuesByRT}
            maxTotal={maxRTTotal} selectedRT={selectedRT} onSelect={setSelectedRT} />
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F0F0F0]">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#767676] text-[13px] pointer-events-none">⌕</span>
              <input type="text" placeholder="Cerca per chiave o titolo…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#F7F7F7] rounded-lg pl-7 pr-3 py-1.5 text-[12px] font-extrabold text-[#111111] placeholder:text-[#AAAAAA] placeholder:font-extrabold outline-none transition-all"
                style={{ boxShadow: search ? "0 0 0 2px #6D28D9" : undefined }}
              />
            </div>
            {selectedRT && (
              <button onClick={() => setSelectedRT(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-[#111111] text-white">
                {selectedRT} <span className="opacity-50">×</span>
              </button>
            )}
            {selectedStatus && activeStatusCfg && (
              <button onClick={() => setSelectedStatus(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold"
                style={{ backgroundColor: activeStatusCfg.tagBg, color: activeStatusCfg.text }}>
                {activeStatusCfg.label} <span className="opacity-50">×</span>
              </button>
            )}
            {(selectedRT || selectedStatus || search) && (
              <button onClick={() => { setSelectedRT(null); setSelectedStatus(null); setSearch(""); }}
                className="text-[11px] font-extrabold text-[#767676] hover:text-[#555555] transition-colors shrink-0">
                Azzera
              </button>
            )}
            <span className="text-[11px] font-extrabold tabular-nums text-[#555555] shrink-0 ml-auto">
              {filtered.length}<span className="text-[#AAAAAA]">/{openTotal} aperti</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#F0F0F0]">
                  {["Chiave","Titolo","Request Type","Stato","Priorità","Assegnato a","Apertura","Time to Res."].map(h => (
                    <th key={h} className="py-2 px-4 text-[10px] font-extrabold uppercase tracking-wider text-[#767676] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8} className="py-16 text-center text-[13px] font-extrabold text-[#767676]">Nessun risultato.</td></tr>
                  : filtered.map(i => <IssueRow key={i.key} issue={i} />)
                }
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}
