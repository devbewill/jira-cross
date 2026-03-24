"use client";

import { useEffect, useMemo, useState } from "react";
import { Epic, Story, StoryFixVersion } from "@/types";
import {
  STATUS_COLORS,
  fixVersionStatusOf,
  RELEASE_STATUS_CONFIG,
  statusDotColor,
} from "@/lib/utils/status-config";
import { formatDate } from "@/lib/utils/format-utils";

interface EpicPanelProps {
  epic: Epic;
  onClose: () => void;
}

// ─── Release group data structure ─────────────────────────────────────────────

interface ReleaseGroup {
  key: string;
  fv: StoryFixVersion | null;
  stories: Story[];
}

function groupStoriesByRelease(stories: Story[]): ReleaseGroup[] {
  const map = new Map<string, ReleaseGroup>();

  for (const story of stories) {
    const fv = story.fixVersions?.[0] ?? null;
    const key = fv?.id ?? "no-release";
    if (!map.has(key)) {
      map.set(key, { key, fv, stories: [] });
    }
    map.get(key)!.stories.push(story);
  }

  const groups = [...map.values()];
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

// ─── Release group (accordion) ────────────────────────────────────────────────

function ReleaseGroupSection({
  group,
  showHeader,
}: {
  group: ReleaseGroup;
  showHeader: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!showHeader) {
    return (
      <ul>
        {group.stories.map((story, si) => (
          <StoryRow
            key={story.key}
            story={story}
            isLast={si === group.stories.length - 1}
          />
        ))}
      </ul>
    );
  }

  if (!group.fv) {
    return (
      <section className="border-b border-neutral-500">
        <button
          className="w-full sticky top-0 z-10 px-5 py-2 flex items-center gap-3 text-left transition-all duration-200 bg-linear-todo"
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className="transition-transform duration-200 text-[10px] font-bold flex-shrink-0"
            style={{
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              color: open ? "var(--color-linear-text)" : "#94A3B8",
            }}
          >
            ▶
          </span>
          <span className="flex-1 text-[11px] font-bold uppercase tracking-widest leading-none text-linear-textSecondary">
            No release
          </span>
          <span className="flex-shrink-0 text-[9px] font-semibold text-linear-textMuted">
            {group.stories.length}{" "}
            {group.stories.length === 1 ? "item" : "items"}
          </span>
        </button>
        {open && (
          <ul className="bg-linear-surfaceHover">
            {group.stories.map((story, si) => (
              <StoryRow
                key={story.key}
                story={story}
                isLast={si === group.stories.length - 1}
              />
            ))}
          </ul>
        )}
      </section>
    );
  }

  const status = fixVersionStatusOf(group.fv);
  const cfg = RELEASE_STATUS_CONFIG[status];

  return (
    <section className="border-b border-neutral-500">
      <button
        className="w-full sticky top-0 z-10 px-5 py-2.5 flex items-center gap-3 text-left transition-all duration-200"
        style={{ backgroundColor: cfg.bgHex }}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Arrow — always anchored left, aligned to first text line */}
        <span
          className="transition-transform duration-200 text-[10px] font-bold flex-shrink-0 self-start mt-[2px]"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            color: open ? "var(--color-linear-text)" : "#94A3B8",
          }}
        >
          ▶
        </span>

        {/* Title + description column */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-widest leading-none text-linear-text">
            {group.fv.name}
          </span>
          {group.fv.description && (
            <p className="text-[12px] text-linear-textMuted leading-snug mt-0.5">
              {group.fv.description}
            </p>
          )}
        </div>

        {/* Date + status + count — right side, stacked vertically */}
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          {group.fv.releaseDate && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md leading-none bg-linear-surface text-linear-text">
              {formatDate(group.fv.releaseDate)}
            </span>
          )}
          <span
            className="text-[9px] font-bold uppercase tracking-widest leading-none"
            style={{ color: cfg.textHex }}
          >
            {cfg.label}
          </span>
          <span className="text-[9px] font-semibold text-linear-textMuted">
            {group.stories.length}{" "}
            {group.stories.length === 1 ? "item" : "items"}
          </span>
        </div>
      </button>

      {open && (
        <ul className="bg-linear-surfaceHover">
          {group.stories.map((story, si) => (
            <StoryRow
              key={story.key}
              story={story}
              isLast={si === group.stories.length - 1}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

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
        <span className="block text-[9px] font-black uppercase tracking-widest text-linear-textDim mb-0.5">
          {story.key}
        </span>
        <span className="block text-xs font-bold leading-snug text-linear-text">
          {story.summary}
        </span>
        <span className="block text-[9px] font-bold mt-0.5 uppercase tracking-wider text-linear-textDim">
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

export function EpicPanel({ epic, onClose }: EpicPanelProps) {
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

  const groups = useMemo(() => groupStoriesByRelease(stories), [stories]);
  const withRelease = stories.filter(
    (s) => (s.fixVersions?.length ?? 0) > 0,
  ).length;

  return (
    <>
      <div
        className="fixed inset-0 z-[200]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed right-0 top-0 h-full z-[201] flex flex-col w-[450px] bg-linear-surface border-l border-linear-border shadow-panel animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-linear-border">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none mb-2 bg-linear-text text-white">
                {epic.key}
              </span>
              <h2 className="text-sm font-black uppercase leading-snug tracking-tight text-linear-text truncate">
                {epic.summary}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors border border-linear-border text-linear-textSecondary bg-linear-surface hover:bg-linear-bg hover:text-linear-text"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          {/* Stats bar + counts */}
          {epic.storyStats && epic.storyStats.total > 0 && (
            <div>
              <div className="flex w-full h-[8px] rounded-full overflow-hidden mb-2.5 bg-linear-todo shadow-inner">
                {epic.storyStats.done > 0 && (
                  <div
                    style={{
                      width: `${(epic.storyStats.done / epic.storyStats.total) * 100}%`,
                      backgroundColor: STATUS_COLORS.done,
                    }}
                  />
                )}
                {epic.storyStats.inProgress > 0 && (
                  <div
                    style={{
                      width: `${(epic.storyStats.inProgress / epic.storyStats.total) * 100}%`,
                      backgroundColor: STATUS_COLORS.inProgress,
                    }}
                  />
                )}
                {epic.storyStats.todo > 0 && (
                  <div
                    style={{
                      width: `${(epic.storyStats.todo / epic.storyStats.total) * 100}%`,
                      backgroundColor: STATUS_COLORS.todo,
                    }}
                  />
                )}
              </div>

              <div className="flex gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1">
                  <span
                    className="w-[10px] h-[10px] rounded-full flex-shrink-0 shadow-sm"
                    style={{
                      backgroundColor: STATUS_COLORS.done,
                      boxShadow: "0 1px 2px rgba(28, 47, 84, 0.3)",
                    }}
                  />
                  <span className="text-linear-text">
                    {epic.storyStats.done} done
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-[10px] h-[10px] rounded-full flex-shrink-0 shadow-sm"
                    style={{
                      backgroundColor: STATUS_COLORS.inProgress,
                      boxShadow: "0 1px 2px rgba(61, 90, 138, 0.4)",
                    }}
                  />
                  <span className="text-linear-text">
                    {epic.storyStats.inProgress} in progress
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-[10px] h-[10px] rounded-full flex-shrink-0 shadow-sm"
                    style={{
                      backgroundColor: STATUS_COLORS.todo,
                      boxShadow: "0 1px 2px rgba(226, 232, 240, 0.3)",
                    }}
                  />
                  <span className="text-linear-textDim">
                    {epic.storyStats.todo} todo
                  </span>
                </span>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="flex items-center gap-3 mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-linear-textDim">
                {stories.length} {stories.length === 1 ? "story" : "stories"}
              </p>
              {withRelease > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-linear-textDim">
                  · {withRelease} in a release
                </p>
              )}
            </div>
          )}
        </div>

        {/* Story list */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#CBD5E1 transparent",
          }}
        >
          {loading && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-linear-textDim">
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
              <span className="text-xs font-bold uppercase tracking-widest text-linear-textDim">
                No stories found
              </span>
            </div>
          )}

          {!loading && !error && stories.length > 0 && (
            <div>
              {groups.some((g) => g.fv !== null) && (
                <div className="px-5 py-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-linear-textDim">
                    RILASCI:
                  </span>
                </div>
              )}
              {groups.map((group) => {
                const showHeader = groups.length > 1 || group.fv !== null;
                return (
                  <ReleaseGroupSection
                    key={group.key}
                    group={group}
                    showHeader={showHeader}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
