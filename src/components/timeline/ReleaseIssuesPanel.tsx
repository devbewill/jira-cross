"use client";

import { useEffect, useMemo, useState } from "react";
import { JiraRelease, Story } from "@/types";
import { DOT_DONE, DOT_IN_PROGRESS, DOT_TODO } from "./EpicBlock";
import { releaseStatusOf, RELEASE_STATUS_CFG } from "./ReleaseBlock";

const DOT_BORDER = "none";

function statusDotColor(cat: string): string {
  if (cat === "done") return DOT_DONE;
  if (cat === "indeterminate" || cat === "in-progress") return DOT_IN_PROGRESS;
  return DOT_TODO;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysLabel(release: JiraRelease): string | null {
  if (!release.releaseDate || release.released) return null;
  const diff = Math.ceil(
    (new Date(release.releaseDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );
  if (diff > 0) return `${diff}d to release`;
  if (diff === 0) return "Due today";
  return `${Math.abs(diff)}d overdue`;
}

// ─── Story row ────────────────────────────────────────────────────────────────

function StoryRow({ story, isLast }: { story: Story; isLast: boolean }) {
  return (
    <li
      className="flex items-start gap-3 px-5 py-3.5 transition-colors cursor-default"
      style={{ borderBottom: isLast ? "none" : "1px solid #F0F0F4" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#FAFAFA";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <span
        className="w-[10px] h-[10px] rounded-full flex-shrink-0 mt-[2px]"
        style={{
          backgroundColor: statusDotColor(story.statusCategory),
          border: DOT_BORDER,
        }}
      />
      <div className="flex-1 min-w-0">
        <span className="block text-[9px] font-semibold uppercase tracking-widest text-[#A0A0A8] mb-0.5">
          {story.key}
        </span>
        <span className="block text-xs font-semibold leading-snug text-[#1A1A1B]">
          {story.summary}
        </span>
        <span className="block text-[9px] font-medium mt-0.5 uppercase tracking-wider text-[#A0A0A8]">
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

export function ReleaseIssuesPanel({
  release,
  onClose,
}: ReleaseIssuesPanelProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setStories([]);

    fetch(
      `/api/jira/version-issues?versionId=${encodeURIComponent(release.id)}`,
    )
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
      (s) =>
        s.statusCategory === "in-progress" ||
        s.statusCategory === ("indeterminate" as string),
    ).length;
    const todo = stories.filter((s) => s.statusCategory === "todo").length;
    return { done, inProgress, todo, total: stories.length };
  }, [stories]);

  const status = releaseStatusOf(release);
  const cfg = RELEASE_STATUS_CFG[status];
  const label = daysLabel(release);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-[201] flex flex-col"
        style={{
          width: "450px",
          backgroundColor: "#ffffff",
          borderLeft: "1px solid #E8E8EF",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
          animation: "slideInRight 0.15s ease-out",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid #E8E8EF" }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              {/* Project key + status badge */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none"
                  style={{ backgroundColor: "#1A1A1B", color: "#fff" }}
                >
                  {release.projectKey}
                </span>
                <span
                  className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none"
                  style={{
                    backgroundColor: cfg.bg,
                    color: cfg.text,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  {cfg.label}
                </span>
              </div>
              <h2 className="text-sm font-bold leading-snug text-[#1A1A1B]">
                {release.name}
              </h2>
              {release.description && (
                <p className="text-[11px] text-[#717171] mt-1 leading-snug">
                  {release.description}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors"
              style={{
                border: "1px solid #E8E8EF",
                color: "#717171",
                backgroundColor: "#fff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F4F4F7";
                e.currentTarget.style.color = "#1A1A1B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fff";
                e.currentTarget.style.color = "#717171";
              }}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          {/* Dates + countdown */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
            <div>
              <span className="block text-[9px] font-semibold uppercase tracking-widest text-[#A0A0A8]">
                Start
              </span>
              <span className="text-[11px] font-semibold text-[#1A1A1B]">
                {formatDate(release.startDate)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-semibold uppercase tracking-widest text-[#A0A0A8]">
                Release
              </span>
              <span className="text-[11px] font-semibold text-[#1A1A1B]">
                {formatDate(release.releaseDate)}
              </span>
            </div>
          </div>
          {label && (
            <div
              className="inline-block text-[9px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md mb-3"
              style={{
                backgroundColor: status === "overdue" ? "#FEE2E2" : "#F4F4F7",
                color: status === "overdue" ? "#B91C1C" : "#4A4A4A",
              }}
            >
              {label}
            </div>
          )}

          {/* Progress bar */}
          {!loading && stats.total > 0 && (
            <div>
              <div
                className="flex w-full h-[6px] rounded-full overflow-hidden mb-2"
                style={{ backgroundColor: "#E5E7EB" }}
              >
                {stats.done > 0 && (
                  <div
                    style={{
                      width: `${(stats.done / stats.total) * 100}%`,
                      backgroundColor: DOT_DONE,
                    }}
                  />
                )}
                {stats.inProgress > 0 && (
                  <div
                    style={{
                      width: `${(stats.inProgress / stats.total) * 100}%`,
                      backgroundColor: DOT_IN_PROGRESS,
                    }}
                  />
                )}
              </div>
              <div className="flex gap-3 text-[10px] font-semibold flex-wrap">
                {stats.done > 0 && (
                  <span className="flex items-center gap-1">
                    <span
                      className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: DOT_DONE }}
                    />
                    <span className="text-[#1A1A1B]">{stats.done} done</span>
                  </span>
                )}
                {stats.inProgress > 0 && (
                  <span className="flex items-center gap-1">
                    <span
                      className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: DOT_IN_PROGRESS }}
                    />
                    <span className="text-[#1A1A1B]">
                      {stats.inProgress} in progress
                    </span>
                  </span>
                )}
                {stats.todo > 0 && (
                  <span className="flex items-center gap-1">
                    <span
                      className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: DOT_TODO }}
                    />
                    <span className="text-[#A0A0A8]">{stats.todo} to do</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {!loading && !error && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A0A0A8] mt-3">
              {stats.total} {stats.total === 1 ? "work item" : "work items"}
            </p>
          )}
        </div>

        {/* Issue list */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#E0E0E0 transparent",
          }}
        >
          {loading && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-semibold uppercase tracking-widest animate-pulse text-[#A0A0A8]">
                Loading…
              </span>
            </div>
          )}
          {error && (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-red-500">{error}</p>
            </div>
          )}
          {!loading && !error && stories.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">
                No issues found
              </span>
            </div>
          )}
          {!loading && !error && stories.length > 0 && (
            <ul>
              {stories.map((story, i) => (
                <StoryRow
                  key={story.key}
                  story={story}
                  isLast={i === stories.length - 1}
                />
              ))}
            </ul>
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
