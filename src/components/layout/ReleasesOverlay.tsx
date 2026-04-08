"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ProjectReleases, JiraRelease, IssueStats } from "@/types";
import {
  releaseStatusOf,
  RELEASE_STATUS_CONFIG,
} from "@/lib/utils/status-config";
import { formatDate, daysUntilDate } from "@/lib/utils/format-utils";

interface ReleasesOverlayProps {
  onClose: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// ─── Issue Stats Bar ──────────────────────────────────────────────────────────

function IssueStatsBar({
  stats,
  loading,
}: {
  stats?: IssueStats;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-2 pt-2 border-t border-linear-border">
        <div className="w-full h-[6px] rounded-full bg-linear-todo animate-pulse" />
        <div className="mt-1.5 h-2.5 w-24 rounded-md bg-linear-todo animate-pulse" />
      </div>
    );
  }

  if (!stats || stats.total === 0) return null;

  const pct = (n: number) => `${((n / stats.total) * 100).toFixed(1)}%`;

  return (
    <div className="mt-2 pt-2 border-t border-linear-border">
      <div className="w-full h-[6px] rounded-full overflow-hidden flex bg-linear-todo">
        {stats.done > 0 && (
          <div
            className="bg-linear-done"
            style={{
              width: pct(stats.done),
              flexShrink: 0,
            }}
          />
        )}
        {stats.inProgress > 0 && (
          <div
            className="bg-linear-inProgress"
            style={{
              width: pct(stats.inProgress),
              flexShrink: 0,
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        {stats.done > 0 && (
          <span className="flex items-center gap-1 text-[9px] font-extrabold text-linear-text">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-linear-done" />
            {stats.done} done
          </span>
        )}
        {stats.inProgress > 0 && (
          <span className="flex items-center gap-1 text-[9px] font-extrabold text-linear-text">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-linear-accent" />
            {stats.inProgress} in progress
          </span>
        )}
        {stats.todo > 0 && (
          <span className="flex items-center gap-1 text-[9px] font-extrabold text-linear-text">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-linear-todo" />
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
  const status = releaseStatusOf(release);
  const cfg = RELEASE_STATUS_CONFIG[status];
  const days = daysUntilDate(release.releaseDate);

  return (
    <div className="bg-linear-surface rounded-xl p-4 flex flex-col gap-2 border border-linear-border">
      {/* Name + status badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-extrabold text-linear-text leading-snug">
          {release.name}
        </span>
        <span
          className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md leading-none flex-shrink-0 border ${cfg.solidBg} ${cfg.solidText} ${cfg.solidBorder}`}
        >
          {cfg.label}
        </span>
      </div>

      {/* Description */}
      {release.description && (
        <p className="text-[11px] text-linear-textSecondary leading-snug">
          {release.description}
        </p>
      )}

      {/* Components */}
      {issueStats?.components && issueStats.components.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {issueStats.components.map((component) => (
            <span
              key={component}
              className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-linear-surface text-linear-accent border border-linear-accent"
            >
              {component}
            </span>
          ))}
        </div>
      )}

      {/* Dates grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
        <div>
          <span className="block text-[9px] font-semibold uppercase tracking-widest text-linear-textDim">
            Start
          </span>
          <span className="text-[11px] font-extrabold text-linear-text">
            {formatDate(release.startDate)}
          </span>
        </div>
        <div>
          <span className="block text-[9px] font-semibold uppercase tracking-widest text-linear-textDim">
            Release
          </span>
          <span className="text-[11px] font-extrabold text-linear-text">
            {formatDate(release.releaseDate)}
          </span>
        </div>
      </div>

      {/* Countdown / delay */}
      {status === "upcoming" && days !== null && (
        <div className="text-[9px] font-semibold uppercase tracking-widest mt-1 px-2 py-1 rounded-md bg-linear-bg text-linear-text">
          {days > 0
            ? `${days}d to release`
            : days === 0
              ? "Due today"
              : `${Math.abs(days)}d overdue`}
        </div>
      )}
      {status === "overdue" && days !== null && (
        <div className="text-[9px] font-semibold uppercase tracking-widest mt-1 px-2 py-1 rounded-md bg-red-100 text-red-700">
          {Math.abs(days)}d overdue
        </div>
      )}

      <IssueStatsBar stats={issueStats} loading={statsLoading} />
    </div>
  );
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

export function ReleasesOverlay({
  onClose,
  onRefresh,
  isRefreshing = false,
}: ReleasesOverlayProps) {
  const [projects, setProjects] = useState<ProjectReleases[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "released" | "overdue" | "upcoming"
  >("all");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"byProject" | "byDate">("byProject");
  const [fetchKey, setFetchKey] = useState(0);

  const [statsMap, setStatsMap] = useState<Record<string, IssueStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  const prevRefreshing = useRef(false);
  useEffect(() => {
    if (prevRefreshing.current && !isRefreshing) {
      setFetchKey((k) => k + 1);
    }
    prevRefreshing.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/jira/releases")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => setProjects(d.projects ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchKey]);

  useEffect(() => {
    if (projects.length === 0) return;
    setStatsLoading(true);

    const uniqueKeys = [...new Set(projects.map((p) => p.projectKey))];

    Promise.allSettled(
      uniqueKeys.map((key) =>
        fetch(`/api/jira/release-issues?projectKey=${key}`)
          .then((r) => (r.ok ? r.json() : { stats: {} }))
          .then(
            (data: { stats: Record<string, IssueStats> }) => data.stats ?? {},
          ),
      ),
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

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const total = projects.reduce((s, p) => s + p.releases.length, 0);
  const released = projects.reduce(
    (s, p) => s + p.releases.filter((r) => r.released).length,
    0,
  );
  const overdue = projects.reduce(
    (s, p) => s + p.releases.filter((r) => r.overdue && !r.released).length,
    0,
  );
  const upcoming = total - released - overdue;

  const projectOptions = useMemo(
    () =>
      [...projects].sort((a, b) => a.projectName.localeCompare(b.projectName)),
    [projects],
  );

  const flatByDate = useMemo(() => {
    const all = projects
      .filter((p) => projectFilter === "all" || p.projectKey === projectFilter)
      .flatMap((p) =>
        p.releases
          .filter((r) => {
            const matchStatus =
              statusFilter === "all" || releaseStatusOf(r) === statusFilter;
            const matchSearch =
              search.trim() === "" ||
              r.name.toLowerCase().includes(search.trim().toLowerCase());
            return matchStatus && matchSearch;
          })
          .map((r) => ({
            ...r,
            projectKey: p.projectKey,
            projectName: p.projectName,
          })),
      );
    return all.sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0;
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return (
        new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      );
    });
  }, [projects, statusFilter, search, projectFilter]);

  const byMonth = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      releases: typeof flatByDate;
    }[] = [];
    const seen = new Map<string, number>();
    for (const r of flatByDate) {
      let key: string;
      let label: string;
      if (r.releaseDate) {
        const d = new Date(r.releaseDate);
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("it-IT", {
          month: "long",
          year: "numeric",
        });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } else {
        key = "no-date";
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

  const filtered = useMemo(
    () =>
      projects
        .filter(
          (p) => projectFilter === "all" || p.projectKey === projectFilter,
        )
        .map((p) => ({
          ...p,
          releases: p.releases.filter((r) => {
            const matchStatus =
              statusFilter === "all" || releaseStatusOf(r) === statusFilter;
            const matchSearch =
              search.trim() === "" ||
              r.name.toLowerCase().includes(search.trim().toLowerCase());
            return matchStatus && matchSearch;
          }),
        }))
        .filter((p) => p.releases.length > 0),
    [projects, statusFilter, search, projectFilter],
  );

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-linear-bg">
      {/* Header bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 gap-6 border-b border-linear-border bg-linear-surface">
        {/* Title */}
        <div className="flex-shrink-0">
          <h2 className="text-lg font-extrabold text-linear-text">Release Status</h2>
          <p className="text-[11px] text-linear-textDim font-medium mt-0.5">
            All versions across every Jira project — excluding archived
          </p>
        </div>

        {/* Controls */}
        {!loading && !error && (
          <div className="flex items-center gap-3 flex-1 justify-center flex-wrap">
            <input
              type="text"
              placeholder="Search releases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-[11px] font-medium placeholder:text-linear-textDim outline-none px-3 py-1.5 rounded-lg w-48 transition-colors border border-linear-border text-linear-text bg-linear-surface focus:border-linear-accent"
            />

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-[11px] font-medium outline-none px-3 py-1.5 rounded-lg cursor-pointer border border-linear-border text-linear-text bg-linear-surface"
              style={{ maxWidth: "200px" }}
            >
              <option value="all">All projects</option>
              {projectOptions.map((p) => (
                <option key={p.projectKey} value={p.projectKey}>
                  {p.projectKey} — {p.projectName}
                </option>
              ))}
            </select>

            <div className="w-px h-6 bg-linear-border" />

            {/* View mode toggle */}
            <div className="flex gap-1 p-1 rounded-lg bg-linear-bg">
              {(["byProject", "byDate"] as const).map((mode) => {
                const active = viewMode === mode;
                const label = mode === "byProject" ? "By Project" : "By Date";
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                      active
                        ? "bg-linear-surface text-linear-text"
                        : "bg-transparent text-linear-textSecondary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-6 bg-linear-border" />

            {/* Status pills */}
            {(["all", "upcoming", "overdue", "released"] as const).map((f) => {
              const count =
                f === "all"
                  ? total
                  : f === "released"
                    ? released
                    : f === "overdue"
                      ? overdue
                      : upcoming;
              const active = statusFilter === f;
              const cfg = f !== "all" ? RELEASE_STATUS_CONFIG[f] : null;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 border ${
                    active
                      ? cfg
                        ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-linear-xs`
                        : "bg-linear-accent text-white border-linear-accentHover"
                      : "bg-linear-surface text-linear-textSecondary border-linear-border"
                  }`}
                >
                  {f === "all"
                    ? `All (${count})`
                    : `${RELEASE_STATUS_CONFIG[f].label} (${count})`}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-linear-accent text-white hover:bg-linear-accentHover"
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
            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors border border-linear-border text-linear-textSecondary bg-linear-surface hover:bg-linear-bg hover:text-linear-text"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <span className="text-xs font-semibold uppercase tracking-widest animate-pulse text-linear-textDim">
              Fetching releases…
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl text-sm font-semibold border border-red-300 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          (viewMode === "byProject"
            ? filtered.length === 0
            : flatByDate.length === 0) && (
            <div className="flex items-center justify-center h-48">
              <span className="text-xs font-semibold uppercase tracking-widest text-linear-textDim">
                No releases found
              </span>
            </div>
          )}

        {/* By Project view */}
        {!loading &&
          !error &&
          viewMode === "byProject" &&
          filtered.length > 0 && (
            <div className="space-y-10">
              {filtered.map((project) => (
                <section key={project.projectKey}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md bg-linear-inProgress text-white">
                      {project.projectKey}
                    </span>
                    <h3 className="text-sm font-extrabold text-linear-text">
                      {project.projectName}
                    </h3>
                    <span className="text-[10px] font-medium text-linear-textDim">
                      {project.releases.length}{" "}
                      {project.releases.length === 1 ? "release" : "releases"}
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

        {/* By Date view */}
        {!loading &&
          !error &&
          viewMode === "byDate" &&
          flatByDate.length > 0 && (
            <div className="space-y-10">
              {byMonth.map((group) => (
                <section key={group.key}>
                  <div className="flex items-center gap-4 mb-4 pb-3 border-b border-linear-border">
                    <h3 className="text-base font-extrabold text-linear-text">
                      {group.label}
                    </h3>
                    <span className="text-[10px] font-medium text-linear-textDim">
                      {group.releases.length}{" "}
                      {group.releases.length === 1 ? "release" : "releases"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.releases.map((release) => (
                      <div key={release.id} className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md self-start bg-linear-inProgress text-white">
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
