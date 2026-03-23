"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ProjectReleases, JiraRelease, IssueStats } from "@/types";

interface ReleasesOverlayProps {
  onClose:      () => void;
  onRefresh?:   () => void;
  isRefreshing?: boolean;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function releaseStatus(r: JiraRelease): "released" | "overdue" | "upcoming" {
  if (r.released) return "released";
  if (r.overdue)  return "overdue";
  return "upcoming";
}

const STATUS_CONFIG = {
  released: { label: "Released", color: "#DCFCE7", textColor: "#15803D", border: "#86EFAC" },
  overdue:  { label: "Overdue",  color: "#FEE2E2", textColor: "#B91C1C", border: "#FCA5A5" },
  upcoming: { label: "Upcoming", color: "#FEF3E8", textColor: "#C2590A", border: "#FDBA74" },
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Issue Stats Bar ──────────────────────────────────────────────────────────

const BAR_COLORS = {
  done:       "#22C55E",
  inProgress: "hsl(43 96% 56%)",
  todo:       "#E5E7EB",
};

function IssueStatsBar({ stats, loading }: { stats?: IssueStats; loading: boolean }) {
  if (loading) {
    return (
      <div className="mt-2 pt-2" style={{ borderTop: "1px solid #E8E8EF" }}>
        <div className="w-full h-[6px] rounded-full bg-[#E5E7EB] animate-pulse" />
        <div className="mt-1.5 h-2.5 w-24 rounded-md bg-[#E5E7EB] animate-pulse" />
      </div>
    );
  }

  if (!stats || stats.total === 0) return null;

  const pct = (n: number) => `${((n / stats.total) * 100).toFixed(1)}%`;

  return (
    <div className="mt-2 pt-2" style={{ borderTop: "1px solid #E8E8EF" }}>
      {/* Segmented bar */}
      <div
        className="w-full h-[6px] rounded-full overflow-hidden flex"
        style={{ backgroundColor: BAR_COLORS.todo }}
      >
        {stats.done > 0 && (
          <div
            style={{ width: pct(stats.done), backgroundColor: BAR_COLORS.done, flexShrink: 0 }}
          />
        )}
        {stats.inProgress > 0 && (
          <div
            style={{ width: pct(stats.inProgress), backgroundColor: BAR_COLORS.inProgress, flexShrink: 0 }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        {stats.done > 0 && (
          <span className="flex items-center gap-1 text-[9px] font-semibold text-[#555]">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: BAR_COLORS.done }} />
            {stats.done} done
          </span>
        )}
        {stats.inProgress > 0 && (
          <span className="flex items-center gap-1 text-[9px] font-semibold text-[#555]">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: BAR_COLORS.inProgress }} />
            {stats.inProgress} in progress
          </span>
        )}
        {stats.todo > 0 && (
          <span className="flex items-center gap-1 text-[9px] font-semibold text-[#A0A0A8]">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: BAR_COLORS.todo }} />
            {stats.todo} to do
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Release card ─────────────────────────────────────────────────────────────

function ReleaseCard({
  release,
  issueStats,
  statsLoading,
}: {
  release: JiraRelease;
  issueStats?: IssueStats;
  statsLoading: boolean;
}) {
  const status = releaseStatus(release);
  const cfg    = STATUS_CONFIG[status];
  const days   = daysUntil(release.releaseDate);

  return (
    <div
      className="bg-white rounded-xl p-4 flex flex-col gap-2"
      style={{
        border:    "1px solid #E8E8EF",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Name + status badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#1A1A1B] leading-snug">
          {release.name}
        </span>
        <span
          className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md leading-none flex-shrink-0"
          style={{ backgroundColor: cfg.color, color: cfg.textColor, border: `1px solid ${cfg.border}` }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Description */}
      {release.description && (
        <p className="text-[11px] text-[#717171] leading-snug">{release.description}</p>
      )}

      {/* Dates grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
        <div>
          <span className="block text-[9px] font-semibold uppercase tracking-widest text-[#A0A0A8]">Start</span>
          <span className="text-[11px] font-semibold text-[#1A1A1B]">{formatDate(release.startDate)}</span>
        </div>
        <div>
          <span className="block text-[9px] font-semibold uppercase tracking-widest text-[#A0A0A8]">Release</span>
          <span className="text-[11px] font-semibold text-[#1A1A1B]">{formatDate(release.releaseDate)}</span>
        </div>
      </div>

      {/* Countdown / delay */}
      {status === "upcoming" && days !== null && (
        <div
          className="text-[9px] font-semibold uppercase tracking-widest mt-1 px-2 py-1 rounded-md"
          style={{ backgroundColor: "#F4F4F7", color: "#4A4A4A" }}
        >
          {days > 0 ? `${days}d to release` : days === 0 ? "Due today" : `${Math.abs(days)}d overdue`}
        </div>
      )}
      {status === "overdue" && days !== null && (
        <div
          className="text-[9px] font-semibold uppercase tracking-widest mt-1 px-2 py-1 rounded-md"
          style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
        >
          {Math.abs(days)}d overdue
        </div>
      )}

      {/* Issue stats bar */}
      <IssueStatsBar stats={issueStats} loading={statsLoading} />
    </div>
  );
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

export function ReleasesOverlay({ onClose, onRefresh, isRefreshing = false }: ReleasesOverlayProps) {
  const [projects,      setProjects]      = useState<ProjectReleases[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [statusFilter,  setStatusFilter]  = useState<"all" | "released" | "overdue" | "upcoming">("all");
  const [search,        setSearch]        = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [viewMode,      setViewMode]      = useState<"byProject" | "byDate">("byProject");
  const [fetchKey,      setFetchKey]      = useState(0);

  // Issue stats: keyed by versionId
  const [statsMap,     setStatsMap]     = useState<Record<string, IssueStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  // Re-fetch after sync completes (isRefreshing: true → false)
  const prevRefreshing = useRef(false);
  useEffect(() => {
    if (prevRefreshing.current && !isRefreshing) {
      setFetchKey((k) => k + 1);
    }
    prevRefreshing.current = isRefreshing;
  }, [isRefreshing]);

  // Load releases
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/jira/releases")
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); })
      .then((d) => setProjects(d.projects ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchKey]);

  // After releases load, fetch issue stats for every project in parallel
  useEffect(() => {
    if (projects.length === 0) return;
    setStatsLoading(true);

    const uniqueKeys = [...new Set(projects.map((p) => p.projectKey))];

    Promise.allSettled(
      uniqueKeys.map((key) =>
        fetch(`/api/jira/release-issues?projectKey=${key}`)
          .then((r) => (r.ok ? r.json() : { stats: {} }))
          .then((data: { stats: Record<string, IssueStats> }) => data.stats ?? {})
      )
    )
      .then((results) => {
        const merged: Record<string, IssueStats> = {};
        for (const result of results) {
          if (result.status === "fulfilled") {
            Object.assign(merged, result.value);
          }
        }
        setStatsMap(merged);
      })
      .finally(() => setStatsLoading(false));
  }, [projects]);

  // Close on Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Counts (on raw data, unaffected by search/project filter)
  const total    = projects.reduce((s, p) => s + p.releases.length, 0);
  const released = projects.reduce((s, p) => s + p.releases.filter((r) =>  r.released).length, 0);
  const overdue  = projects.reduce((s, p) => s + p.releases.filter((r) =>  r.overdue && !r.released).length, 0);
  const upcoming = total - released - overdue;

  // Sorted project list for the dropdown
  const projectOptions = useMemo(() =>
    [...projects].sort((a, b) => a.projectName.localeCompare(b.projectName)),
  [projects]);

  // Flat list sorted by releaseDate descending (furthest future first)
  const flatByDate = useMemo(() => {
    const all = projects
      .filter((p) => projectFilter === "all" || p.projectKey === projectFilter)
      .flatMap((p) =>
        p.releases
          .filter((r) => {
            const matchStatus = statusFilter === "all" || releaseStatus(r) === statusFilter;
            const matchSearch = search.trim() === "" || r.name.toLowerCase().includes(search.trim().toLowerCase());
            return matchStatus && matchSearch;
          })
          .map((r) => ({ ...r, projectKey: p.projectKey, projectName: p.projectName }))
      );
    return all.sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0;
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    });
  }, [projects, statusFilter, search, projectFilter]);

  // Group flatByDate by year-month, preserving order (desc)
  const byMonth = useMemo(() => {
    const groups: { key: string; label: string; releases: typeof flatByDate }[] = [];
    const seen = new Map<string, number>();
    for (const r of flatByDate) {
      let key: string;
      let label: string;
      if (r.releaseDate) {
        const d = new Date(r.releaseDate);
        key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } else {
        key   = "no-date";
        label = "No date";
      }
      if (!seen.has(key)) {
        seen.set(key, groups.length);
        groups.push({ key, label, releases: [] });
      }
      groups[seen.get(key)!].releases.push(r);
    }
    return groups;
  }, [flatByDate]);

  // Apply all three filters: status + search + project
  const filtered = useMemo(() =>
    projects
      .filter((p) => projectFilter === "all" || p.projectKey === projectFilter)
      .map((p) => ({
        ...p,
        releases: p.releases.filter((r) => {
          const matchStatus  = statusFilter === "all" || releaseStatus(r) === statusFilter;
          const matchSearch  = search.trim() === "" || r.name.toLowerCase().includes(search.trim().toLowerCase());
          return matchStatus && matchSearch;
        }),
      }))
      .filter((p) => p.releases.length > 0),
  [projects, statusFilter, search, projectFilter]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ backgroundColor: "#F4F4F7" }}>

      {/* Header bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-8 py-4 gap-6"
        style={{ borderBottom: "1px solid #E8E8EF", backgroundColor: "#fff" }}
      >
        {/* Title */}
        <div className="flex-shrink-0">
          <h2 className="text-lg font-bold text-[#1A1A1B]">
            Release Status
          </h2>
          <p className="text-[11px] text-[#A0A0A8] font-medium mt-0.5">
            All versions across every Jira project — excluding archived
          </p>
        </div>

        {/* Controls */}
        {!loading && !error && (
          <div className="flex items-center gap-3 flex-1 justify-center flex-wrap">

            {/* Search input */}
            <input
              type="text"
              placeholder="Search releases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-[11px] font-medium placeholder:text-[#A0A0A8] outline-none px-3 py-1.5 rounded-lg w-48 transition-colors"
              style={{ border: "1px solid #E8E8EF", color: "#1A1A1B", backgroundColor: "#fff" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "hsl(43 96% 56%)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8E8EF"; }}
            />

            {/* Project dropdown */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-[11px] font-medium outline-none px-3 py-1.5 rounded-lg cursor-pointer"
              style={{ border: "1px solid #E8E8EF", color: "#1A1A1B", backgroundColor: "#fff" }}
            >
              <option value="all">All projects</option>
              {projectOptions.map((p) => (
                <option key={p.projectKey} value={p.projectKey}>
                  {p.projectKey} — {p.projectName}
                </option>
              ))}
            </select>

            {/* Divider */}
            <div className="w-px h-6 bg-[#E8E8EF]" />

            {/* View mode toggle — pill group */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#F4F4F7" }}>
              {(["byProject", "byDate"] as const).map((mode) => {
                const active = viewMode === mode;
                const label  = mode === "byProject" ? "By Project" : "By Date";
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150"
                    style={active ? {
                      backgroundColor: "#fff",
                      color:           "#1A1A1B",
                      boxShadow:       "0 1px 3px rgba(0,0,0,0.08)",
                    } : {
                      backgroundColor: "transparent",
                      color:           "#717171",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-[#E8E8EF]" />

            {/* Status pills */}
            {(["all", "upcoming", "overdue", "released"] as const).map((f) => {
              const count  = f === "all" ? total : f === "released" ? released : f === "overdue" ? overdue : upcoming;
              const active = statusFilter === f;
              const cfg    = f !== "all" ? STATUS_CONFIG[f] : null;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150"
                  style={active ? {
                    backgroundColor: cfg ? cfg.color       : "hsl(43 96% 56%)",
                    color:           cfg ? cfg.textColor   : "#fff",
                    border:          cfg ? `1px solid ${cfg.border}` : "1px solid hsl(43 96% 46%)",
                    boxShadow:       "0 1px 3px rgba(0,0,0,0.06)",
                  } : {
                    backgroundColor: "#fff",
                    color:           "#717171",
                    border:          "1px solid #E8E8EF",
                  }}
                >
                  {f === "all" ? `All (${count})` : `${STATUS_CONFIG[f].label} (${count})`}
                </button>
              );
            })}
          </div>
        )}

        {/* Sync + Close */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "hsl(43 96% 56%)", color: "#fff", boxShadow: "0 1px 4px hsla(43, 96%, 56%, 0.30)" }}
              onMouseEnter={(e) => { if (!isRefreshing) e.currentTarget.style.backgroundColor = "hsl(43 96% 46%)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "hsl(43 96% 56%)"; }}
            >
              {isRefreshing ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Syncing…
                </>
              ) : (
                <>⟲ Sync Jira</>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors"
            style={{ border: "1px solid #E8E8EF", color: "#717171", backgroundColor: "#fff" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F4F4F7"; e.currentTarget.style.color = "#1A1A1B"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff";    e.currentTarget.style.color = "#717171"; }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {loading && (
          <div className="flex items-center justify-center h-48">
            <span className="text-xs font-semibold uppercase tracking-widest animate-pulse text-[#A0A0A8]">
              Fetching releases…
            </span>
          </div>
        )}

        {error && (
          <div
            className="p-4 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2", color: "#B91C1C" }}
          >
            {error}
          </div>
        )}

        {!loading && !error && (viewMode === "byProject" ? filtered.length === 0 : flatByDate.length === 0) && (
          <div className="flex items-center justify-center h-48">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#A0A0A8]">
              No releases found
            </span>
          </div>
        )}

        {/* By Project view */}
        {!loading && !error && viewMode === "byProject" && filtered.length > 0 && (
          <div className="space-y-10">
            {filtered.map((project) => (
              <section key={project.projectKey}>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: "#1A1A1B", color: "#fff" }}
                  >
                    {project.projectKey}
                  </span>
                  <h3 className="text-sm font-semibold text-[#1A1A1B]">
                    {project.projectName}
                  </h3>
                  <span className="text-[10px] font-medium text-[#A0A0A8]">
                    {project.releases.length} {project.releases.length === 1 ? "release" : "releases"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {project.releases.map((release) => (
                    <ReleaseCard
                      key={release.id}
                      release={release}
                      issueStats={statsMap[release.id]}
                      statsLoading={statsLoading}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* By Date view — grouped by month, sorted releaseDate desc */}
        {!loading && !error && viewMode === "byDate" && flatByDate.length > 0 && (
          <div className="space-y-10">
            {byMonth.map((group) => (
              <section key={group.key}>
                {/* Month heading */}
                <div
                  className="flex items-center gap-4 mb-4 pb-3"
                  style={{ borderBottom: "1px solid #E8E8EF" }}
                >
                  <h3 className="text-base font-semibold text-[#1A1A1B]">
                    {group.label}
                  </h3>
                  <span className="text-[10px] font-medium text-[#A0A0A8]">
                    {group.releases.length} {group.releases.length === 1 ? "release" : "releases"}
                  </span>
                </div>

                {/* Releases grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.releases.map((release) => (
                    <div key={release.id} className="flex flex-col gap-1.5">
                      <span
                        className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md self-start"
                        style={{ backgroundColor: "#1A1A1B", color: "#fff" }}
                      >
                        {release.projectKey}
                      </span>
                      <ReleaseCard
                        release={release}
                        issueStats={statsMap[release.id]}
                        statsLoading={statsLoading}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
