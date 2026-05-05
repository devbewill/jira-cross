"use client";

import { useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { usePSP } from "@/hooks/usePSP";
import { useRefresh } from "@/contexts/RefreshContext";
import { PSPIssue, PSPSla } from "@/types";

const ISSUE_COLORS = {
  done: {
    dot: "#10B981",
    text: "#047857",
    tagBg: "rgba(16,185,129,0.14)",
    border: "rgba(16,185,129,0.30)",
    outline: "rgba(16,185,129,0.6)",
  },
  inProgress: {
    dot: "#F59E0B",
    text: "#B45309",
    tagBg: "rgba(245,158,11,0.14)",
    border: "rgba(245,158,11,0.30)",
    outline: "rgba(245,158,11,0.6)",
  },
  todo: {
    dot: "#94A3B8",
    text: "#475569",
    tagBg: "rgba(148,163,184,0.14)",
    border: "rgba(148,163,184,0.30)",
    outline: "rgba(148,163,184,0.6)",
  },
  open: {
    dot: "#3B82F6",
    text: "#1D4ED8",
    tagBg: "rgba(59,130,246,0.14)",
    border: "rgba(59,130,246,0.30)",
    outline: "rgba(59,130,246,0.6)",
  },
  blocked: {
    dot: "#EF4444",
    text: "#B91C1C",
    tagBg: "rgba(239,68,68,0.14)",
    border: "rgba(239,68,68,0.30)",
    outline: "rgba(239,68,68,0.6)",
  },
} as const;

const STATUS: Record<
  string,
  {
    label: string;
    dot: string;
    text: string;
    tagBg: string;
    fill: string;
    trackBg: string;
  }
> = {
  Aperto: {
    label: "Aperto",
    dot: "#3B82F6",
    text: "#1D4ED8",
    tagBg: "rgba(59,130,246,0.14)",
    fill: "rgba(59,130,246,0.55)",
    trackBg: "rgba(59,130,246,0.10)",
  },
  "in attesa di risposta": {
    label: "In attesa",
    dot: "#F59E0B",
    text: "#B45309",
    tagBg: "rgba(245,158,11,0.14)",
    fill: "rgba(245,158,11,0.55)",
    trackBg: "rgba(245,158,11,0.10)",
  },
  "in risoluzione": {
    label: "In risoluzione",
    dot: "#A855F7",
    text: "#7E22CE",
    tagBg: "rgba(168,85,247,0.14)",
    fill: "rgba(168,85,247,0.55)",
    trackBg: "rgba(168,85,247,0.14)",
  },
  Riaperto: {
    label: "Riaperto",
    dot: "#EF4444",
    text: "#B91C1C",
    tagBg: "rgba(239,68,68,0.14)",
    fill: "rgba(239,68,68,0.55)",
    trackBg: "rgba(239,68,68,0.10)",
  },
  Risolto: {
    label: "Risolto",
    dot: "#10B981",
    text: "#047857",
    tagBg: "rgba(16,185,129,0.14)",
    fill: "rgba(16,185,129,0.55)",
    trackBg: "rgba(16,185,129,0.10)",
  },
  Annullato: {
    label: "Annullato",
    dot: "#9CA3AF",
    text: "#4B5563",
    tagBg: "rgba(156,163,175,0.14)",
    fill: "rgba(156,163,175,0.45)",
    trackBg: "rgba(156,163,175,0.10)",
  },
};

const STATUS_DONE_FALLBACK = STATUS["Risolto"];
const STATUS_ORDER = [
  "Aperto",
  "Riaperto",
  "in attesa di risposta",
  "in risoluzione",
  "Risolto",
  "Annullato",
];

function issueStatusKey(issue: PSPIssue): string {
  if (STATUS[issue.status]) return issue.status;
  if (issue.statusCategory === "done") return "Risolto";
  return issue.status;
}

function getStatusCfg(issue: PSPIssue) {
  if (STATUS[issue.status]) return STATUS[issue.status];
  if (issue.statusCategory === "done") return STATUS_DONE_FALLBACK;
  return {
    label: "—",
    dot: "#A855F7",
    text: "#7E22CE",
    tagBg: "rgba(168,85,247,0.14)",
  };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 30) return `${days}g fa`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}m fa` : `${Math.floor(months / 12)}a fa`;
}

const EIGHT_H = 8 * 3600_000;
const TWO_H = 2 * 3600_000;

function SlaBadge({ sla }: { sla: PSPSla | null }) {
  if (!sla) return <span className="text-[11px] text-[#767676]">—</span>;
  if (sla.paused)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F5F5] px-2 py-[2px] text-[10px] font-bold text-[#555555]">
        Pausa
      </span>
    );
  if (sla.breached) {
    const ms = Date.now() - new Date(sla.breachTime).getTime();
    const days = Math.floor(ms / 86400000),
      hrs = Math.floor(ms / 3600000);
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-bold"
        style={{
          backgroundColor: ISSUE_COLORS.blocked.tagBg,
          color: ISSUE_COLORS.blocked.text,
        }}
        title={`Scaduto il ${new Date(sla.breachTime).toLocaleString("it-IT")}`}
      >
        +{days >= 1 ? `${days}g` : `${hrs}h`} fa
      </span>
    );
  }
  const { remainingMs: ms, remainingFriendly: rem, goalFriendly: goal } = sla;
  const urgency =
    ms <= TWO_H
      ? ISSUE_COLORS.blocked
      : ms <= EIGHT_H
        ? ISSUE_COLORS.inProgress
        : ISSUE_COLORS.done;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-bold tabular-nums"
      style={{ backgroundColor: urgency.tagBg, color: urgency.text }}
      title={`Goal: ${goal} · Scade: ${new Date(sla.breachTime).toLocaleString("it-IT")}`}
    >
      {rem}
    </span>
  );
}

function StatusTag({ issue }: { issue: PSPIssue }) {
  const cfg = getStatusCfg(issue);
  return (
    <span
      className="inline-flex items-center gap-[5px] rounded-full px-2 py-[2px] text-[10px] font-bold"
      style={{ backgroundColor: cfg.tagBg, color: cfg.text }}
    >
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}

const STOP_WORDS = new Set([
  // Italian
  'di','il','la','le','gli','un','una','dei','del','della','delle','degli',
  'al','alla','alle','agli','nel','nella','nelle','nei','negli','con','per','su','da',
  'in','a','e','o','non','si','lo','ci','è','ha','ho','che','chi','cui','come',
  'dove','quando','dopo','prima','ma','se','anche','già','più','meno','molto','poco',
  'tutto','tutti','tutte','ogni','altri','altra','altro','altre','questo','questa',
  'questi','queste','quello','quella','quelli','quelle','sono','tra','fra','sui',
  'sulle','sulla','sugli','dello','col','via','ora','poi','suo','sua','suoi','sue',
  'dal','dalla','dai','dalle','dallo','dagli','ed','od','né','col','coi','tra',
  'sempre','fare','fatto','fatta','fatti','fatte','avere','avuto','essere','stato',
  // English
  'the','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','are','was','were','be','been','has','have','had','do','does','did',
  'will','would','could','should','may','might','not','no','nor','if','then',
  'than','that','this','these','those','it','its','we','our','you','your',
  'they','their','he','she','his','her','new','get','set','all','any','can',
]);

function computeKeywordClusters(issues: PSPIssue[], topN = 5) {
  const freq: Record<string, number> = {};
  const byPhrase: Record<string, PSPIssue[]> = {};

  for (const issue of issues) {
    const tokens = issue.summary
      .toLowerCase()
      .replace(/[^a-zàèìòùáéíóú0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3);

    const seen = new Set<string>();
    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i <= tokens.length - n; i++) {
        const gram = tokens.slice(i, i + n);
        if (gram.some(w => STOP_WORDS.has(w))) continue;
        const phrase = gram.join(' ');
        if (!seen.has(phrase)) {
          freq[phrase] = (freq[phrase] ?? 0) + 1;
          if (!byPhrase[phrase]) byPhrase[phrase] = [];
          byPhrase[phrase].push(issue);
          seen.add(phrase);
        }
      }
    }
  }

  // Boost multi-word phrases so "account manager" (×1.6) batte "account" (×1)
  const candidates = Object.entries(freq)
    .filter(([, c]) => c >= 2)
    .map(([phrase, count]) => ({
      phrase,
      count,
      score: count * Math.pow(phrase.split(' ').length, 0.7),
      words: phrase.split(' '),
    }))
    .sort((a, b) => b.score - a.score);

  // Selezione greedy: una volta scelto "account manager", sopprime "account" e "manager" singoli
  const result: { word: string; count: number; issues: PSPIssue[] }[] = [];
  const used = new Set<string>();
  for (const c of candidates) {
    if (result.length >= topN) break;
    if (c.words.some(w => used.has(w))) continue;
    result.push({ word: c.phrase, count: c.count, issues: byPhrase[c.phrase] });
    c.words.forEach(w => used.add(w));
  }
  return result.sort((a, b) => b.count - a.count);
}

const PRIORITY_ORDER: Record<string, number> = {
  Highest: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Lowest: 4,
};
const PRIORITY_DOT: Record<string, string> = {
  Highest: "#6D28D9",
  High: "#8B5CF6",
  Medium: "#C084FC",
  Low: "#DDD6FE",
  Lowest: "#EDE9FE",
};

const TABLE_HEADERS = [
  "Chiave",
  "Titolo",
  "Request Type",
  "Stato",
  "Assegnato a",
  "Aperto da",
  "Apertura",
] as const;
const COLUMN_WIDTH: Partial<Record<(typeof TABLE_HEADERS)[number], string>> = {
  Chiave: "5%",
  Titolo: "50%",
  "Request Type": "10%",
  Stato: "10%",
  "Assegnato a": "5%",
  "Aperto da": "5%",
  Apertura: "5%",
};

function IssueRow({ issue }: { issue: PSPIssue }) {
  return (
    <tr className="border-border hover:bg-muted/50 border-b transition-colors">
      <td className="py-1 whitespace-nowrap">
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] font-bold text-blue-700 hover:underline"
        >
          {issue.key}
        </a>
      </td>
      <td className=" py-1">
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground text-[12px] font-bold transition-colors hover:text-blue-700"
          title={issue.summary}
        >
          {issue.summary}
        </a>
      </td>
      <td className=" py-1">
        <span className="text-muted-foreground text-[11px] font-bold">
          {issue.requestType ?? issue.issueType}
        </span>
      </td>
      <td className=" py-1">
        <StatusTag issue={issue} />
      </td>
      <td className=" py-1 whitespace-nowrap">
        <span className="text-muted-foreground text-[11px] font-bold">
          {issue.assignee?.displayName ?? "—"}
        </span>
      </td>
      <td className="py-1 whitespace-nowrap">
        <span className="text-muted-foreground text-[11px] font-bold">
          {issue.reporter?.displayName ?? "—"}
        </span>
      </td>
      <td className=" py-1 whitespace-nowrap">
        <span className="text-muted-foreground text-[11px] font-bold tabular-nums">
          {timeAgo(issue.created)}
        </span>
      </td>
    </tr>
  );
}

const SORT_FN: Record<string, (a: PSPIssue, b: PSPIssue) => number> = {
  Chiave: (a, b) => a.key.localeCompare(b.key),
  Titolo: (a, b) => a.summary.localeCompare(b.summary),
  "Request Type": (a, b) =>
    (a.requestType ?? a.issueType).localeCompare(b.requestType ?? b.issueType),
  Stato: (a, b) => a.status.localeCompare(b.status),
  Priorità: (a, b) =>
    (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  "Assegnato a": (a, b) =>
    (a.assignee?.displayName ?? "").localeCompare(
      b.assignee?.displayName ?? "",
    ),
  "Aperto da": (a, b) =>
    (a.reporter?.displayName ?? "").localeCompare(
      b.reporter?.displayName ?? "",
    ),
  Apertura: (a, b) =>
    new Date(a.created).getTime() - new Date(b.created).getTime(),
  "Time to Res.": (a, b) =>
    (a.sla?.remainingMs ?? Infinity) - (b.sla?.remainingMs ?? Infinity),
};

const SELECT_STYLE: React.CSSProperties = {
  height: 32,
  paddingLeft: 10,
  paddingRight: 28,
  borderRadius: 8,
  border: "1px solid #E8E8E8",
  backgroundColor: "transparent",
  fontSize: 11,
  fontWeight: 700,
  color: "#555555",
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23767676' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
  minWidth: 0,
};

export function PSPTickets() {
  const { data, loading, error } = usePSP();
  const { isRefreshing, triggerRefresh } = useRefresh();

  const [search, setSearch] = useState("");
  const [selectedRT, setSelectedRT] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [sortKey, setSortKey] = useState<string>("Apertura");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const requestTypes = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    data.issues.forEach((i) => set.add(i.requestType ?? i.issueType));
    return Array.from(set).sort();
  }, [data]);

  const presentStatuses = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    data.issues.forEach((i) => set.add(issueStatusKey(i)));
    return STATUS_ORDER.filter((s) => set.has(s));
  }, [data]);

  const clusters = useMemo(() => {
    if (!data) return [];
    const cutoff = Date.now() - 60 * 24 * 3600_000;
    const recent = data.issues.filter(i => new Date(i.created).getTime() >= cutoff);
    return computeKeywordClusters(recent);
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [] as PSPIssue[];
    const base = data.issues.filter((i) => {
      if (selectedRT && (i.requestType ?? i.issueType) !== selectedRT)
        return false;
      if (selectedStatus && issueStatusKey(i) !== selectedStatus) return false;
      if (selectedKeyword && !i.summary.toLowerCase().includes(selectedKeyword))
        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          i.summary.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)
        );
      }
      return true;
    });
    const fn = SORT_FN[sortKey];
    if (!fn) return base;
    const sorted = [...base].sort(fn);
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [data, selectedRT, selectedStatus, selectedKeyword, search, sortKey, sortDir]);

  const hasFilters = search || selectedRT || selectedStatus || selectedKeyword;

  if (loading)
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">
            Caricamento PSP&hellip;
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-destructive text-sm font-semibold">
            {error.message}
          </p>
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
            disabled={isRefreshing}
            onClick={triggerRefresh}
          >
            <RefreshCw
              className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Ricarica
          </button>
        </div>
      </div>
    );

  if (!data) return null;

  const cacheHit = (data as any).cacheHit ?? false;
  const fetchedTime = data.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const ttlMinutes = Math.round(
    parseInt(process.env.NEXT_PUBLIC_JIRA_CACHE_TTL || "300", 10) / 60,
  );
  const ttlLabel =
    ttlMinutes >= 60 ? `${Math.round(ttlMinutes / 60)}h` : `${ttlMinutes}m`;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground mb-1.5 text-[10px] font-bold tracking-widest uppercase">
              PSP &middot; Service Desk SA
            </p>
            <h1 className="text-2xl leading-none font-bold tracking-tight">
              Tutti i ticket
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {loading ? (
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-bold">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Aggiornamento&hellip;
              </span>
            ) : (
              <span className="text-muted-foreground text-[11px] font-bold">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${cacheHit ? "bg-amber-500" : "bg-emerald-500"}`}
                  />
                  Dati delle {fetchedTime}
                  <span className="opacity-50">&middot; cache {ttlLabel}</span>
                </span>
                {" · ultimi 90g"}
              </span>
            )}
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              disabled={loading || isRefreshing}
              onClick={triggerRefresh}
            >
              <RefreshCw
                className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? "animate-spin" : ""}`}
              />
              Ricarica
            </button>
          </div>
        </div>

        {clusters.length > 0 && (() => {
          const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];
          const maxCount = clusters[0]?.count ?? 1;
          const BAR_MAX_H = 88;
          return (
            <div className="bg-card rounded-2xl border px-5 pt-4 pb-3">
              <p className="text-muted-foreground mb-4 text-[10px] font-bold tracking-widest uppercase">
                Topic ricorrenti · ultimi 60gg
              </p>
              <div className="flex items-end gap-2" style={{ height: BAR_MAX_H + 24 }}>
                {clusters.map(({ word, count }, i) => {
                  const active = selectedKeyword === word;
                  const color = active ? '#0b1d7b' : COLORS[i % COLORS.length];
                  const barH = Math.max(4, Math.round((count / maxCount) * BAR_MAX_H));
                  return (
                    <button
                      key={word}
                      title={word}
                      onClick={() => setSelectedKeyword(active ? '' : word)}
                      className="flex flex-1 flex-col items-center gap-1 focus:outline-none"
                    >
                      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>
                        {count}
                      </span>
                      <div
                        className="w-full transition-all duration-500"
                        style={{
                          height: barH,
                          backgroundColor: color,
                          opacity: active ? 1 : 0.55,
                          boxShadow: active ? `0 0 0 2px ${color}` : 'none',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                {clusters.map(({ word }, i) => {
                  const active = selectedKeyword === word;
                  const color = active ? '#0b1d7b' : COLORS[i % COLORS.length];
                  return (
                    <button
                      key={word}
                      title={word}
                      onClick={() => setSelectedKeyword(active ? '' : word)}
                      className="flex-1 truncate text-center text-[10px] font-bold capitalize"
                      style={{ color }}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="bg-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b px-2 py-2">
            {/* Ricerca libera */}
            <div
              className="relative"
              style={{ minWidth: 300, flex: "1 1 220px" }}
            >
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px]">
                &#x2315;
              </span>
              <input
                type="text"
                placeholder="Cerca per chiave o titolo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-muted/50 placeholder:text-muted-foreground/60 w-full rounded-xs py-1.5 pr-3 pl-7 text-sm font-bold transition-all outline-none placeholder:font-bold focus:ring-1 "
              />
            </div>

            {/* Dropdown Request Type */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <select
                value={selectedRT}
                onChange={(e) => setSelectedRT(e.target.value)}
                style={{
                  ...SELECT_STYLE,
                  color: selectedRT ? "#111111" : "#767676",
                  borderColor: selectedRT ? "#a78bfa" : "#E8E8E8",
                }}
              >
                <option value="">Tutti i tipi</option>
                {requestTypes.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Stato */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  ...SELECT_STYLE,
                  color: selectedStatus ? "#111111" : "#767676",
                  borderColor: selectedStatus ? "#a78bfa" : "#E8E8E8",
                }}
              >
                <option value="">Tutti gli stati</option>
                {presentStatuses.map((s) => (
                  <option key={s} value={s}>
                    {STATUS[s]?.label ?? s}
                  </option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedRT("");
                  setSelectedStatus("");
                  setSelectedKeyword("");
                }}
                className="text-muted-foreground hover:text-foreground shrink-0 text-[11px] font-bold transition-colors"
              >
                Azzera
              </button>
            )}

            <span className="text-muted-foreground ml-auto shrink-0 text-[11px] font-bold tabular-nums">
              {filtered.length}
              <span className="text-muted-foreground/60">
                /{data.issues.length} totali
              </span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <colgroup>
                {TABLE_HEADERS.map((h) => (
                  <col key={h} style={{ width: COLUMN_WIDTH[h] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/30 border-border border-b">
                  {TABLE_HEADERS.map((h) => {
                    const sortable = h in SORT_FN;
                    const active = sortKey === h;
                    return (
                      <th
                        key={h}
                        onClick={() => {
                          if (!sortable) return;
                          if (active)
                            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                          else {
                            setSortKey(h);
                            setSortDir("asc");
                          }
                        }}
                        className="py-2 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase select-none"
                        style={{ cursor: sortable ? "pointer" : "default" }}
                      >
                        <span className="inline-flex items-center gap-1">
                          {h}
                          {sortable && (
                            <span
                              style={{
                                opacity: active ? 1 : 0.25,
                                fontSize: 9,
                              }}
                            >
                              {active && sortDir === "desc" ? "↓" : "↑"}
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
                    <td
                      colSpan={9}
                      className="text-muted-foreground py-16 text-center text-[13px] font-bold"
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

        <div className="h-2" />
      </div>
    </div>
  );
}
