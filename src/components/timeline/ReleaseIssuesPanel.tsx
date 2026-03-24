"use client";

import { useEffect, useMemo, useState } from "react";
import { JiraRelease, Story } from "@/types";
import { STATUS_COLORS, releaseStatusOf, RELEASE_STATUS_CONFIG, statusDotColor } from "@/lib/utils/status-config";
import { formatDate, daysLabel } from "@/lib/utils/format-utils";

// ─── Story row ────────────────────────────────────────────────────────────────

function StoryRow({ story, isLast }: { story: Story; isLast: boolean }) {
  return (
    <li
      className={`flex items-start gap-3 px-5 py-3.5 transition-colors cursor-default hover:bg-linear-surfaceHover ${
        isLast ? "" : "border-b border-linear-border/50"
      }`}
    >
      <span
        className="w-[10px] h-[10px] rounded-full flex-shrink-0 mt-[2px]"
        style={{ backgroundColor: statusDotColor(story.statusCategory) }}
      />
      <div className="flex-1 min-w-0">
        <span className="block text-[9px] font-semibold uppercase tracking-widest text-linear-textDim mb-0.5">
          {story.key}
        </span>
        <span className="block text-xs font-semibold leading-snug text-linear-text">
          {story.summary}
        </span>
        <span className="block text-[9px] font-medium mt-0.5 uppercase tracking-wider text-linear-textDim">
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

interface ReleaseIssuesPanelProps {
  release: JiraRelease;
  onClose: () => void;
}

export function ReleaseIssuesPanel({ release, onClose }: ReleaseIssuesPanelProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setStories([]);

    fetch(`/api/jira/version-issues?versionId=${encodeURIComponent(release.id)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((data) => setStories(data.stories ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [release.id]);

  const stats = useMemo(() => {
    const done = stories.filter((s) => s.statusCategory === "done").length;
    const inProgress = stories.filter(
      (s) => s.statusCategory === "in-progress" || s.statusCategory === ("indeterminate" as string),
    ).length;
    const todo = stories.filter((s) => s.statusCategory === "todo").length;
    return { done, inProgress, todo, total: stories.length };
  }, [stories]);

  const status = releaseStatusOf(release);
  const cfg = RELEASE_STATUS_CONFIG[status];
  const label = daysLabel(release.releaseDate, release.released);

  return (
    <>
      <div className="fixed inset-0 z-[200]" onClick={onClose} aria-hidden="true" />

      <div className="fixed right-0 top-0 h-full z-[201] flex flex-col w-[450px] bg-linear-surface border-l border-linear-border shadow-panel animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-linear-border">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none bg-linear-text text-white">
                  {release.projectKey}
                </span>
                <span
                  className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none"
                  style={{ backgroundColor: cfg.bgHex, color: cfg.textHex, border: `1px solid ${cfg.borderHex}` }}
                >
                  {cfg.label}
                </span>
              </div>
              <h2 className="text-sm font-bold leading-snug text-linear-text">
                {release.name}
              </h2>
              {release.description && (
                <p className="text-[11px] text-linear-textSecondary mt-1 leading-snug">
                  {release.description}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors border border-linear-border text-linear-textSecondary bg-linear-surface hover:bg-linear-bg hover:text-linear-text"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          {/* Dates + countdown */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
            <div>
              <span className="block text-[9px] font-semibold uppercase tracking-widest text-linear-textDim">Start</span>
              <span className="text-[11px] font-semibold text-linear-text">{formatDate(release.startDate)}</span>
            </div>
            <div>
              <span className="block text-[9px] font-semibold uppercase tracking-widest text-linear-textDim">Release</span>
              <span className="text-[11px] font-semibold text-linear-text">{formatDate(release.releaseDate)}</span>
            </div>
          </div>
          {label && (
            <div
              className="inline-block text-[9px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md mb-3"
              style={{
                backgroundColor: status === "overdue" ? "#FEE2E2" : "var(--color-linear-bg)",
                color: status === "overdue" ? "#B91C1C" : "var(--color-linear-textMuted)",
              }}
            >
              {label}
            </div>
          )}

          {/* Progress bar */}
          {!loading && stats.total > 0 && (
            <div>
              <div className="flex w-full h-[6px] rounded-full overflow-hidden mb-2 bg-linear-todo">
                {stats.done > 0 && (
                  <div style={{ width: `${(stats.done / stats.total) * 100}%`, backgroundColor: STATUS_COLORS.done }} />
                )}
                {stats.inProgress > 0 && (
                  <div style={{ width: `${(stats.inProgress / stats.total) * 100}%`, backgroundColor: STATUS_COLORS.inProgress }} />
                )}
              </div>
              <div className="flex gap-3 text-[10px] font-semibold flex-wrap">
                {stats.done > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-[8px] h-[8px] rounded-full flex-shrink-0 bg-linear-done" />
                    <span className="text-linear-text">{stats.done} done</span>
                  </span>
                )}
                {stats.inProgress > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-[8px] h-[8px] rounded-full flex-shrink-0 bg-linear-accent" />
                    <span className="text-linear-text">{stats.inProgress} in progress</span>
                  </span>
                )}
                {stats.todo > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-[8px] h-[8px] rounded-full flex-shrink-0 bg-linear-todo" />
                    <span className="text-linear-textDim">{stats.todo} to do</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {!loading && !error && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-linear-textDim mt-3">
              {stats.total} {stats.total === 1 ? "work item" : "work items"}
            </p>
          )}
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#E0E0E0 transparent" }}>
          {loading && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-semibold uppercase tracking-widest animate-pulse text-linear-textDim">Loading…</span>
            </div>
          )}
          {error && (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-red-500">{error}</p>
            </div>
          )}
          {!loading && !error && stories.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-semibold uppercase tracking-widest text-linear-textDim">No issues found</span>
            </div>
          )}
          {!loading && !error && stories.length > 0 && (
            <ul>
              {stories.map((story, i) => (
                <StoryRow key={story.key} story={story} isLast={i === stories.length - 1} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
