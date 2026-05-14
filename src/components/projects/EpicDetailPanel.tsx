"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { PCEpic, Story } from "@/types";
import {
  EPIC_STATUS_CONFIG,
  statusDotClass,
} from "@/lib/utils/status-config";
import { ISSUE_COLORS } from "@/lib/utils/jira-colors";
import { formatDate } from "@/lib/utils/format-utils";

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
        {story.status && (
          <span className="text-muted-foreground block text-[10px] mt-0.5">
            {story.status}
          </span>
        )}
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

interface EpicDetailPanelProps {
  epic: PCEpic;
  onClose: () => void;
}

export function EpicDetailPanel({ epic, onClose }: EpicDetailPanelProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [epic.key]);

  const stats = useMemo(() => {
    const st = epic.storyStats;
    if (st) return st;
    const done = stories.filter((s) => s.statusCategory === "done").length;
    const inProgress = stories.filter(
      (s) => s.statusCategory === "in-progress" || (s.statusCategory as string) === "indeterminate"
    ).length;
    const todo = stories.filter((s) => s.statusCategory === "todo").length;
    return { done, inProgress, todo, total: stories.length };
  }, [epic.storyStats, stories]);

  const cfg = EPIC_STATUS_CONFIG[epic.statusCategory];

  const doneW = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
  const ipW = stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0;
  const todoW = stats.total > 0 ? (stats.todo / stats.total) * 100 : 0;

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
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground text-[9px] leading-none font-bold tracking-widest uppercase">
                  {epic.key}
                </span>
                <span
                  className="rounded-xs border px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-widest uppercase"
                  style={{
                    backgroundColor: cfg.solidBg,
                    color: cfg.solidText,
                    borderColor: cfg.solidBorder,
                  }}
                >
                  {epic.status}
                </span>
              </div>
              <h2 className="text-foreground text-sm leading-snug font-bold">
                {epic.summary}
              </h2>
              {epic.initiative && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[9px] font-bold tracking-widest uppercase">
                    Initiative:
                  </span>
                  <span className="text-foreground text-[10px] font-semibold">
                    {epic.initiative.summary}
                  </span>
                  <span className="text-muted-foreground text-[9px]">
                    ({epic.initiative.key})
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={epic.url}
                target="_blank"
                rel="noreferrer"
                className="border-border text-muted-foreground bg-card hover:bg-muted flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xs border transition-colors"
                aria-label="Open in Jira"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={onClose}
                className="border-border text-muted-foreground bg-card hover:bg-muted flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xs border text-xs transition-colors"
                aria-label="Close panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Dates + assignee */}
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <span className="text-muted-foreground block text-[9px] font-bold tracking-widest uppercase">
                Start
              </span>
              <span className="text-foreground text-sm font-bold">
                {formatDate(epic.startDate)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[9px] font-bold tracking-widest uppercase">
                Due
              </span>
              <span className="text-foreground text-sm font-bold">
                {formatDate(epic.dueDate)}
              </span>
            </div>
            {epic.assignee && (
              <div className="col-span-2 mt-1 flex items-center gap-2">
                <span className="text-muted-foreground block text-[9px] font-bold tracking-widest uppercase">
                  Assignee:
                </span>
                {epic.assignee.avatarUrl && (
                  <img
                    src={epic.assignee.avatarUrl}
                    alt={epic.assignee.displayName}
                    className="h-5 w-5 rounded-full"
                  />
                )}
                <span className="text-foreground text-xs font-semibold">
                  {epic.assignee.displayName}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div>
              <div className="bg-muted mb-1.5 flex h-2 gap-[2px] overflow-hidden rounded-full">
                {doneW > 0 && (
                  <div
                    className="rounded-l-full"
                    style={{ width: `${doneW}%`, backgroundColor: ISSUE_COLORS.done.dot }}
                  />
                )}
                {ipW > 0 && (
                  <div
                    style={{ width: `${ipW}%`, backgroundColor: ISSUE_COLORS.inProgress.dot }}
                  />
                )}
                {todoW > 0 && (
                  <div
                    className="rounded-r-full"
                    style={{ width: `${todoW}%`, backgroundColor: ISSUE_COLORS.todo.dot }}
                  />
                )}
              </div>
              <div className="text-muted-foreground flex justify-between text-xs font-bold tabular-nums">
                <span style={{ color: ISSUE_COLORS.done.text }}>{stats.done} done</span>
                <span style={{ color: ISSUE_COLORS.inProgress.text }}>{stats.inProgress} in progress</span>
                <span style={{ color: ISSUE_COLORS.todo.text }}>{stats.todo} to do</span>
              </div>
            </div>
          )}
        </div>

        {/* Child tickets */}
        <div className="border-border border-b px-5 py-2.5 flex-shrink-0">
          <span className="text-muted-foreground text-[9px] font-bold tracking-widest uppercase">
            Child Tickets
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="text-muted-foreground animate-pulse text-[11px] font-bold tracking-widest uppercase">
                Loading tickets&hellip;
              </span>
            </div>
          )}
          {error && (
            <div className="px-5 py-4">
              <span className="text-destructive text-xs font-semibold">{error}</span>
            </div>
          )}
          {!loading && !error && stories.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
                No child tickets
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
