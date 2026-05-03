"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { JiraRelease, Story } from "@/types";
import {
  releaseStatusOf,
  RELEASE_STATUS_CONFIG,
  statusDotClass,
} from "@/lib/utils/status-config";
import { ISSUE_COLORS } from "@/lib/utils/jira-colors";
import { formatDate, daysLabel } from "@/lib/utils/format-utils";

// ─── Story row ────────────────────────────────────────────────────────────────

function StoryRow({ story, isLast }: { story: Story; isLast: boolean }) {
  return (
    <li
      className={`hover:bg-muted/50 flex cursor-default items-start gap-3 px-5 py-3.5 transition-colors ${
        isLast ? "" : "border-border/50 border-b"
      }`}
    >
      <span
        className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: statusDotClass(story.statusCategory) }}
      />
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground mb-0.5 block text-[9px] font-bold tracking-widest uppercase">
          {story.key}
        </span>
        <span className="text-foreground block text-xs leading-snug">
          {story.summary}
        </span>
      </div>
      {story.assignee?.avatarUrl && (
        <img
          src={story.assignee.avatarUrl}
          alt={story.assignee.displayName}
          title={story.assignee.displayName}
          className="h-5 w-5 flex-shrink-0 rounded-full opacity-70"
        />
      )}
    </li>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface ReleasePanelProps {
  release: JiraRelease;
  onClose: () => void;
}

export function ReleasePanel({ release, onClose }: ReleasePanelProps) {
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
      (s) =>
        s.statusCategory === "in-progress" ||
        s.statusCategory === ("indeterminate" as string)
    ).length;
    const todo = stories.filter((s) => s.statusCategory === "todo").length;
    return { done, inProgress, todo, total: stories.length };
  }, [stories]);

  const status = releaseStatusOf(release);
  const cfg = RELEASE_STATUS_CONFIG[status];
  const label = daysLabel(release.releaseDate, release.released);
  const jiraBase =
    (process.env.NEXT_PUBLIC_JIRA_BASE_URL as string | undefined)?.replace(
      /\/$/,
      ""
    ) ?? "";
  const releaseUrl = jiraBase
    ? `${jiraBase}/projects/${release.projectKey}/versions/${release.id}`
    : null;

  const barWidth = stats.total > 0 ? 100 : 0;
  const doneW = stats.total > 0 ? (stats.done / stats.total) * barWidth : 0;
  const ipW =
    stats.total > 0 ? (stats.inProgress / stats.total) * barWidth : 0;
  const todoW = stats.total > 0 ? (stats.todo / stats.total) * barWidth : 0;

  return (
    <>
      <div
        className="fixed inset-0 z-[200]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="bg-card border-border animate-slide-in-right fixed top-0 right-0 z-[201] flex h-full w-[40vw] flex-col overflow-hidden border-l">
        {/* Header */}
        <div className="border-border flex-shrink-0 border-b px-5 pt-5 pb-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-muted-foreground text-[9px] leading-none font-bold tracking-widest uppercase">
                  {release.projectKey}
                </span>
                <span
                  className="rounded-xs border px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-widest uppercase"
                  style={{
                    backgroundColor: cfg.solidBg,
                    color: cfg.solidText,
                    borderColor: cfg.solidBorder,
                  }}
                >
                  {cfg.label}
                </span>
              </div>
              <h2 className="text-foreground truncate text-sm leading-snug font-bold uppercase">
                {release.name}
              </h2>
              {release.description && (
                <p className="text-muted-foreground mt-1 text-xs leading-snug">
                  {release.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {releaseUrl && (
                <a
                  href={releaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border-border text-muted-foreground bg-card hover:bg-muted flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xs border transition-colors"
                  aria-label="Open in Jira"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={onClose}
                className="border-border text-muted-foreground bg-card hover:bg-muted flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xs border text-xs transition-colors"
                aria-label="Close panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <span className="text-muted-foreground block text-[9px] font-bold tracking-widest uppercase">
                Start
              </span>
              <span className="text-foreground text-sm font-bold">
                {formatDate(release.startDate)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[9px] font-bold tracking-widest uppercase">
                Release
              </span>
              <span className="text-foreground text-sm font-bold">
                {formatDate(release.releaseDate)}
              </span>
            </div>
          </div>

          {label && (
            <span
              className="mb-3 inline-block rounded-xs px-2 py-1 text-center text-[9px] font-bold tracking-widest uppercase"
              style={{
                backgroundColor:
                  status === "overdue"
                    ? "rgba(192,38,211,0.12)"
                    : "rgba(0,0,0,0.05)",
                color: status === "overdue" ? "#C026D3" : undefined,
              }}
            >
              {label}
            </span>
          )}

          {/* Progress bar */}
          {stats.total > 0 && (
            <div>
              <div className="bg-muted mb-1.5 flex h-2 gap-[2px] overflow-hidden rounded-full">
                {doneW > 0 && (
                  <div
                    className="rounded-l-full"
                    style={{
                      width: `${doneW}%`,
                      backgroundColor: ISSUE_COLORS.done.dot,
                    }}
                  />
                )}
                {ipW > 0 && (
                  <div
                    style={{
                      width: `${ipW}%`,
                      backgroundColor: ISSUE_COLORS.inProgress.dot,
                    }}
                  />
                )}
                {todoW > 0 && (
                  <div
                    className="rounded-r-full"
                    style={{
                      width: `${todoW}%`,
                      backgroundColor: ISSUE_COLORS.todo.dot,
                    }}
                  />
                )}
              </div>
              <div className="text-muted-foreground flex justify-between text-xs font-bold tabular-nums">
                <span style={{ color: ISSUE_COLORS.done.text }}>
                  {stats.done} done
                </span>
                <span style={{ color: ISSUE_COLORS.inProgress.text }}>
                  {stats.inProgress} in progress
                </span>
                <span style={{ color: ISSUE_COLORS.todo.text }}>
                  {stats.todo} to do
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="text-muted-foreground animate-pulse text-[11px] font-bold tracking-widest uppercase">
                Loading issues&hellip;
              </span>
            </div>
          )}
          {error && (
            <div className="px-5 py-4">
              <span className="text-destructive text-xs font-semibold">
                {error}
              </span>
            </div>
          )}
          {!loading && !error && stories.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
                No issues found
              </span>
            </div>
          )}
          {!loading && stories.length > 0 && (
            <ul className="py-2">
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
    </>
  );
}
