"use client";

import { useEffect, useMemo, useState } from "react";
import { Epic, Story, StoryFixVersion } from "@/types";
import { DOT_DONE, DOT_IN_PROGRESS, DOT_TODO } from "./EpicBlock";

interface StoryPanelProps {
  epic: Epic;
  onClose: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusDotColor(cat: string): string {
  if (cat === "done")                                   return DOT_DONE;
  if (cat === "indeterminate" || cat === "in-progress") return DOT_IN_PROGRESS;
  return DOT_TODO;
}

const DOT_BORDER = "1px solid #111111";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

type ReleaseStatus = "released" | "overdue" | "upcoming";

function releaseStatus(fv: StoryFixVersion): ReleaseStatus {
  if (fv.released) return "released";
  if (fv.releaseDate && new Date(fv.releaseDate) < new Date()) return "overdue";
  return "upcoming";
}

const STATUS_CFG = {
  released: { label: "Released", bg: "#57e51e",          text: "#111", border: "#3aad14" },
  overdue:  { label: "Overdue",  bg: "#FF2D55",          text: "#fff", border: "#cc0033" },
  upcoming: { label: "Upcoming", bg: "rgb(255,157,225)", text: "#111", border: "#e060a0" },
} as const;

function daysLabel(fv: StoryFixVersion): string | null {
  if (!fv.releaseDate || fv.released) return null;
  const diff = Math.ceil(
    (new Date(fv.releaseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff > 0)  return `${diff}d to release`;
  if (diff === 0) return "Due today";
  return `${Math.abs(diff)}d overdue`;
}

// ─── Release group data structure ─────────────────────────────────────────────

interface ReleaseGroup {
  key: string;                        // versionId or 'no-release'
  fv: StoryFixVersion | null;         // null for "no release" bucket
  stories: Story[];
}

function groupStoriesByRelease(stories: Story[]): ReleaseGroup[] {
  const map = new Map<string, ReleaseGroup>();

  for (const story of stories) {
    const fv  = story.fixVersions?.[0] ?? null;
    const key = fv?.id ?? "no-release";

    if (!map.has(key)) {
      map.set(key, { key, fv, stories: [] });
    }
    map.get(key)!.stories.push(story);
  }

  const groups = [...map.values()];

  // Sort: upcoming by releaseDate asc → overdue → released → no-date → no-release
  groups.sort((a, b) => {
    if (a.key === "no-release" && b.key !== "no-release") return 1;
    if (b.key === "no-release" && a.key !== "no-release") return -1;
    if (a.key === "no-release" && b.key === "no-release") return 0;

    if (!a.fv?.releaseDate && !b.fv?.releaseDate) return 0;
    if (!a.fv?.releaseDate) return 1;
    if (!b.fv?.releaseDate) return -1;

    return (
      new Date(a.fv.releaseDate).getTime() -
      new Date(b.fv.releaseDate).getTime()
    );
  });

  return groups;
}

// ─── Release group header ──────────────────────────────────────────────────────

function ReleaseGroupHeader({ group }: { group: ReleaseGroup }) {
  if (!group.fv) {
    // "No release" bucket
    return (
      <div
        className="sticky top-0 z-10 px-5 py-2 flex items-center gap-2"
        style={{ backgroundColor: "#f8f8f8", borderBottom: "2px solid #e0e0e0" }}
      >
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px]"
          style={{ backgroundColor: "#ddd", color: "#666" }}
        >
          No release
        </span>
        <span className="ml-auto text-[9px] font-bold text-[#aaa]">
          {group.stories.length} {group.stories.length === 1 ? "item" : "items"}
        </span>
      </div>
    );
  }

  const status = releaseStatus(group.fv);
  const cfg    = STATUS_CFG[status];
  const label  = daysLabel(group.fv);

  return (
    <div
      className="sticky top-0 z-10 px-5 py-2.5 flex items-center gap-2 flex-wrap"
      style={{
        backgroundColor: "#f8f8f8",
        borderBottom:    "2px solid #111",
        borderTop:       "2px solid #111",
      }}
    >
      {/* Release name */}
      <span
        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] leading-none"
        style={{ backgroundColor: "#111", color: "#fff" }}
      >
        {group.fv.name}
      </span>

      {/* Status badge */}
      <span
        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] leading-none"
        style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1.5px solid ${cfg.border}` }}
      >
        {cfg.label}
      </span>

      {/* Release date */}
      {group.fv.releaseDate && (
        <span className="text-[9px] font-bold text-[#888]">
          {formatDate(group.fv.releaseDate)}
        </span>
      )}

      {/* Countdown */}
      {label && (
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] leading-none"
          style={{
            backgroundColor: status === "overdue" ? "#FF2D55" : "#efefef",
            color:           status === "overdue" ? "#fff"    : "#555",
          }}
        >
          {label}
        </span>
      )}

      {/* Count */}
      <span className="ml-auto text-[9px] font-bold text-[#aaa]">
        {group.stories.length} {group.stories.length === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

// ─── Story row ────────────────────────────────────────────────────────────────

function StoryRow({ story, isLast }: { story: Story; isLast: boolean }) {
  return (
    <li
      className="flex items-start gap-3 px-5 py-3.5 transition-colors cursor-default"
      style={{
        borderBottom:    isLast ? "none" : "1px solid #f0f0f0",
        backgroundColor: "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      {/* Status dot */}
      <span
        className="w-[10px] h-[10px] rounded-full flex-shrink-0 mt-[2px]"
        style={{
          backgroundColor: statusDotColor(story.statusCategory),
          border:          DOT_BORDER,
        }}
      />

      <div className="flex-1 min-w-0">
        <span className="block text-[9px] font-black uppercase tracking-widest text-[#aaa] mb-0.5">
          {story.key}
        </span>
        <span className="block text-xs font-bold leading-snug text-[#111]">
          {story.summary}
        </span>
        <span className="block text-[9px] font-bold mt-0.5 uppercase tracking-wider text-[#bbb]">
          {story.status}
        </span>
      </div>

      {story.assignee?.avatarUrl && (
        <img
          src={story.assignee.avatarUrl}
          alt={story.assignee.displayName}
          title={story.assignee.displayName}
          className="w-5 h-5 rounded-full flex-shrink-0 opacity-70"
        />
      )}
    </li>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function StoryPanel({ epic, onClose }: StoryPanelProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setStories([]);

    fetch(`/api/jira/stories?epicKey=${encodeURIComponent(epic.key)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((data) => setStories(data.stories ?? []))
      .catch((e)  => setError(e.message))
      .finally(() => setLoading(false));
  }, [epic.key]);

  const groups = useMemo(() => groupStoriesByRelease(stories), [stories]);

  // Count how many stories actually have a release assigned
  const withRelease = stories.filter((s) => (s.fixVersions?.length ?? 0) > 0).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200]" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-[201] flex flex-col"
        style={{
          width:           "380px",
          backgroundColor: "#ffffff",
          borderLeft:      "3px solid #111111",
          boxShadow:       "-6px 0 0 rgba(0,0,0,0.08)",
          animation:       "slideInRight 0.15s ease-out",
          overflow:        "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4"
          style={{ borderBottom: "2px solid #111111" }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <span
                className="inline-block text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] leading-none mb-2"
                style={{ backgroundColor: "#111111", color: "#ffffff" }}
              >
                {epic.key}
              </span>
              <h2 className="text-sm font-black uppercase leading-snug tracking-tight text-[#111111] truncate">
                {epic.summary}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-[3px] text-xs font-black transition-colors border-2 border-black"
              style={{ color: "#111111", backgroundColor: "#ffffff" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#111111"; e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; e.currentTarget.style.color = "#111111"; }}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          {/* Stats bar + counts */}
          {epic.storyStats && epic.storyStats.total > 0 && (
            <div>
              <div className="flex w-full h-[6px] rounded-[2px] overflow-hidden mb-2" style={{ border: "1.5px solid #e0e0e0" }}>
                {epic.storyStats.done > 0 && (
                  <div style={{ width: `${(epic.storyStats.done / epic.storyStats.total) * 100}%`, backgroundColor: DOT_DONE }} />
                )}
                {epic.storyStats.inProgress > 0 && (
                  <div style={{ width: `${(epic.storyStats.inProgress / epic.storyStats.total) * 100}%`, backgroundColor: DOT_IN_PROGRESS }} />
                )}
                {epic.storyStats.todo > 0 && (
                  <div style={{ width: `${(epic.storyStats.todo / epic.storyStats.total) * 100}%`, backgroundColor: DOT_TODO }} />
                )}
              </div>

              <div className="flex gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1">
                  <span className="w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ backgroundColor: DOT_DONE, border: DOT_BORDER }} />
                  <span className="text-[#111]">{epic.storyStats.done} done</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ backgroundColor: DOT_IN_PROGRESS, border: DOT_BORDER }} />
                  <span className="text-[#111]">{epic.storyStats.inProgress} in progress</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ backgroundColor: DOT_TODO, border: DOT_BORDER }} />
                  <span className="text-[#888]">{epic.storyStats.todo} todo</span>
                </span>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="flex items-center gap-3 mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">
                {stories.length} {stories.length === 1 ? "story" : "stories"}
              </p>
              {withRelease > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">
                  · {withRelease} in a release
                </p>
              )}
            </div>
          )}
        </div>

        {/* Story list */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e0e0e0 transparent" }}
        >
          {loading && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-[#aaa]">
                Loading…
              </span>
            </div>
          )}

          {error && (
            <div className="px-5 py-4">
              <p className="text-xs font-bold text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && stories.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ccc]">
                No stories found
              </span>
            </div>
          )}

          {!loading && !error && stories.length > 0 && (
            <div>
              {groups.map((group, gi) => (
                <section key={group.key}>
                  {/* Show header only if there are multiple groups, or the single group is a named release */}
                  {(groups.length > 1 || group.fv !== null) && (
                    <ReleaseGroupHeader group={group} />
                  )}
                  <ul>
                    {group.stories.map((story, si) => (
                      <StoryRow
                        key={story.key}
                        story={story}
                        isLast={
                          si === group.stories.length - 1 &&
                          gi === groups.length - 1
                        }
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
