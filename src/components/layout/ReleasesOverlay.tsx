"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ProjectReleases, JiraRelease, IssueStats } from "@/types";

interface ReleasesOverlayProps {
  onClose: () => void;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function releaseStatus(r: JiraRelease): "released" | "overdue" | "upcoming" {
  if (r.released) return "released";
  if (r.overdue)  return "overdue";
  return "upcoming";
}

const STATUS_CONFIG = {
  released: { label: "Released",  color: "#57e51e",           textColor: "#111",    border: "#3aad14" },
  overdue:  { label: "Overdue",   color: "#FF2D55",           textColor: "#fff",    border: "#cc0033" },
  upcoming: { label: "Upcoming",  color: "rgb(255,157,225)",  textColor: "#111",    border: "#e060a0" },
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
  done:       "#57e51e",
  inProgress: "#F5A623",
  todo:       "#E0E0E0",
};

function IssueStatsBar({ stats, loading }: { stats?: IssueStats; loading: boolean }) {
  if (loading) {
    return (
      <div className="mt-2 pt-2" style={{ borderTop: "1.5px solid #f0f0f0" }}>
        <div className="w-full h-1.5 rounded-full bg-[#f0f0f0] animate-pulse" />
        <div className="mt-1.5 h-2.5 w-24 rounded bg-[#f0f0f0] animate-pulse" />
      </div>
    );
  }

  if (!stats || stats.total === 0) return null;

  const pct = (n: number) => `${((n / stats.total) * 100).toFixed(1)}%`;

  return (
    <div className="mt-2 pt-2" style={{ borderTop: "1.5px solid #f0f0f0" }}>
      {/* Segmented bar */}
      <div
        className="w-full h-2 rounded-full overflow-hidden flex"
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
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-[#555]">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: BAR_COLORS.done }} />
            {stats.done} done
          </span>
        )}
        {stats.inProgress > 0 && (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-[#555]">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: BAR_COLORS.inProgress }} />
            {stats.inProgress} in progress
          </span>
        )}
        {stats.todo > 0 && (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-[#999]">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: "#bbb" }} />
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
      className="bg-white rounded-[3px] p-4 flex flex-col gap-2"
      style={{ border: "3px solid #111", boxShadow: "3px 3px 0 #111" }}
    >
      {/* Name + status badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-black uppercase tracking-tight text-[#111] leading-snug">
          {release.name}
        </span>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] leading-none flex-shrink-0"
          style={{ backgroundColor: cfg.color, color: cfg.textColor, border: `1.5px solid ${cfg.border}` }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Description */}
      {release.description && (
        <p className="text-[11px] text-[#666] leading-snug">{release.description}</p>
      )}

      {/* Dates grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
        <div>
          <span className="block text-[9px] font-black uppercase tracking-widest text-[#aaa]">Start</span>
          <span className="text-[11px] font-bold text-[#111]">{formatDate(release.startDate)}</span>
        </div>
        <div>
          <span className="block text-[9px] font-black uppercase tracking-widest text-[#aaa]">Release</span>
          <span className="text-[11px] font-bold text-[#111]">{formatDate(release.releaseDate)}</span>
        </div>
      </div>

      {/* Countdown / delay */}
      {status === "upcoming" && days !== null && (
        <div
          className="text-[10px] font-black uppercase tracking-widest mt-1 px-2 py-1 rounded-[2px]"
          style={{ backgroundColor: "#f5f5f5", color: "#444" }}
        >
          {days > 0 ? `${days}d to release` : days === 0 ? "Due today" : `${Math.abs(days)}d overdue`}
        </div>
      )}
      {status === "overdue" && days !== null && (
        <div
          className="text-[10px] font-black uppercase tracking-widest mt-1 px-2 py-1 rounded-[2px]"
          style={{ backgroundColor: "#FF2D55", color: "#fff" }}
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

export function ReleasesOverlay({ onClose }: ReleasesOverlayProps) {
  const [projects,      setProjects]      = useState<ProjectReleases[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [statusFilter,  setStatusFilter]  = useState<"all" | "released" | "overdue" | "upcoming">("all");
  const [search,        setSearch]        = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [viewMode,      setViewMode]      = useState<"byProject" | "byDate">("byProject");

  // Issue stats: keyed by versionId
  const [statsMap,     setStatsMap]     = useState<Record<string, IssueStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  // Load releases
  useEffect(() => {
    fetch("/api/jira/releases")
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); })
      .then((d) => setProjects(d.projects ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ backgroundColor: "#FAFAFA" }}>

      {/* Header bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-8 py-5 gap-6"
        style={{ borderBottom: "3px solid #111", backgroundColor: "#fff" }}
      >
        {/* Title */}
        <div className="flex-shrink-0">
          <h2 className="text-xl font-black uppercase tracking-tight text-[#111]">
            Release Status
          </h2>
          <p className="text-[11px] text-[#888] font-medium mt-0.5">
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
              className="text-[11px] font-bold placeholder:text-[#bbb] placeholder:font-medium outline-none px-3 py-1.5 rounded-[3px] w-48"
              style={{ border: "2px solid #111", color: "#111", backgroundColor: "#fff" }}
            />

            {/* Project dropdown */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-[11px] font-black uppercase tracking-widest outline-none px-3 py-1.5 rounded-[3px] cursor-pointer"
              style={{ border: "2px solid #111", color: "#111", backgroundColor: "#fff" }}
            >
              <option value="all">All projects</option>
              {projectOptions.map((p) => (
                <option key={p.projectKey} value={p.projectKey}>
                  {p.projectKey} — {p.projectName}
                </option>
              ))}
            </select>

            {/* Divider */}
            <div className="w-px h-6 bg-[#e0e0e0]" />

            {/* View mode toggle */}
            {(["byProject", "byDate"] as const).map((mode) => {
              const active = viewMode === mode;
              const label  = mode === "byProject" ? "By Project" : "By Date";
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-[3px] transition-all"
                  style={{
                    border:          "2px solid #111",
                    backgroundColor: active ? "#111" : "#fff",
                    color:           active ? "#fff" : "#111",
                    boxShadow:       active ? "2px 2px 0 #111" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}

            {/* Divider */}
            <div className="w-px h-6 bg-[#e0e0e0]" />

            {/* Status pills */}
            {(["all", "upcoming", "overdue", "released"] as const).map((f) => {
              const count  = f === "all" ? total : f === "released" ? released : f === "overdue" ? overdue : upcoming;
              const active = statusFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-[3px] transition-all"
                  style={{
                    border:          "2px solid #111",
                    backgroundColor: active ? "#111" : "#fff",
                    color:           active ? "#fff" : "#111",
                    boxShadow:       active ? "2px 2px 0 #111" : "none",
                  }}
                >
                  {f === "all" ? `All (${count})` : `${f} (${count})`}
                </button>
              );
            })}
          </div>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-[3px] font-black text-sm transition-colors"
          style={{ border: "2px solid #111", color: "#111", backgroundColor: "#fff" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#111"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#111"; }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {loading && (
          <div className="flex items-center justify-center h-48">
            <span className="text-xs font-black uppercase tracking-widest animate-pulse text-[#aaa]">
              Fetching releases…
            </span>
          </div>
        )}

        {error && (
          <div
            className="p-4 rounded-[3px] text-sm font-bold"
            style={{ border: "3px solid #FF2D55", backgroundColor: "#fff0f3", color: "#FF2D55" }}
          >
            {error}
          </div>
        )}

        {!loading && !error && (viewMode === "byProject" ? filtered.length === 0 : flatByDate.length === 0) && (
          <div className="flex items-center justify-center h-48">
            <span className="text-xs font-black uppercase tracking-widest text-[#ccc]">
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
                    className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px]"
                    style={{ backgroundColor: "#111", color: "#fff" }}
                  >
                    {project.projectKey}
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-tight text-[#111]">
                    {project.projectName}
                  </h3>
                  <span className="text-[10px] font-bold text-[#aaa]">
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
                  className="flex items-center gap-4 mb-4 pb-2"
                  style={{ borderBottom: "3px solid #111" }}
                >
                  <h3 className="text-base font-black uppercase tracking-tight text-[#111]">
                    {group.label}
                  </h3>
                  <span className="text-[10px] font-bold text-[#aaa]">
                    {group.releases.length} {group.releases.length === 1 ? "release" : "releases"}
                  </span>
                </div>

                {/* Releases grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.releases.map((release) => (
                    <div key={release.id} className="flex flex-col gap-1.5">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] self-start"
                        style={{ backgroundColor: "#111", color: "#fff" }}
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
