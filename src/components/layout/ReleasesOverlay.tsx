"use client";

import { useEffect, useState, useCallback } from "react";
import { ProjectReleases, JiraRelease } from "@/types";

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

// ─── Release card ─────────────────────────────────────────────────────────────

function ReleaseCard({ release }: { release: JiraRelease }) {
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
    </div>
  );
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

export function ReleasesOverlay({ onClose }: ReleasesOverlayProps) {
  const [projects, setProjects] = useState<ProjectReleases[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState<"all" | "released" | "overdue" | "upcoming">("all");

  useEffect(() => {
    fetch("/api/jira/releases")
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); })
      .then((d) => setProjects(d.projects ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Close on Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Filtered counts
  const filtered = projects.map((p) => ({
    ...p,
    releases: p.releases.filter((r) => filter === "all" || releaseStatus(r) === filter),
  })).filter((p) => p.releases.length > 0);

  const total     = projects.reduce((s, p) => s + p.releases.length, 0);
  const released  = projects.reduce((s, p) => s + p.releases.filter((r) =>  r.released).length, 0);
  const overdue   = projects.reduce((s, p) => s + p.releases.filter((r) =>  r.overdue && !r.released).length, 0);
  const upcoming  = total - released - overdue;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ backgroundColor: "#FAFAFA" }}>

      {/* Header bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "3px solid #111", backgroundColor: "#fff" }}
      >
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-[#111]">
            Release Status
          </h2>
          <p className="text-[11px] text-[#888] font-medium mt-0.5">
            All versions across every Jira project — excluding archived
          </p>
        </div>

        {/* Summary pills */}
        {!loading && !error && (
          <div className="flex items-center gap-2">
            {(["all", "upcoming", "overdue", "released"] as const).map((f) => {
              const count = f === "all" ? total : f === "released" ? released : f === "overdue" ? overdue : upcoming;
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
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

        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-[3px] font-black text-sm transition-colors ml-6"
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

        {!loading && !error && filtered.length === 0 && (
          <div className="flex items-center justify-center h-48">
            <span className="text-xs font-black uppercase tracking-widest text-[#ccc]">
              No releases found
            </span>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-10">
            {filtered.map((project) => (
              <section key={project.projectKey}>
                {/* Project heading */}
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

                {/* Release cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {project.releases.map((release) => (
                    <ReleaseCard key={release.id} release={release} />
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
