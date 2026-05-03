"use client";

import { useEffect, useMemo, useState } from "react";
import { Epic, Story, StoryFixVersion } from "@/types";
import {
  fixVersionStatusOf,
  RELEASE_STATUS_CONFIG,
  statusDotClass,
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
          className="w-full sticky top-0 z-10 px-5 py-2 flex items-center gap-3 text-left transition-all duration-200 bg-slate-400"
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={`transition-transform duration-200 text-[10px] font-bold flex-shrink-0 ${
              open ? "rotate-90 text-foreground" : "rotate-0 text-foreground"
            }`}
          >
            ▶
          </span>
          <span className="flex-1 text-[11px] font-bold uppercase tracking-widest leading-none text-muted-foreground">
            No release
          </span>
          <span className="flex-shrink-0 text-[9px] font-semibold  text-muted-foreground/60">
            {group.stories.length}{" "}
            {group.stories.length === 1 ? "item" : "items"}
          </span>
        </button>
        {open && (
          <ul className="hover:bg-muted/50 bg-transparent">
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
        className={`w-full sticky top-0 z-10 px-5 py-2.5 flex items-center gap-3 text-left transition-all duration-200 ${cfg.solidBg}`}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Arrow — always anchored left, aligned to first text line */}
        <span
          className={`transition-transform duration-200 text-[10px] font-bold flex-shrink-0 self-start mt-[2px] ${
            open ? "rotate-90 text-foreground" : "rotate-0 text-foreground"
          }`}
        >
          ▶
        </span>

        {/* Title + description column */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-widest leading-none text-foreground">
            {group.fv.name}
          </span>
          {group.fv.description && (
            <p className="text-[12px] text-foreground leading-snug mt-0.5">
              {group.fv.description}
            </p>
          )}
        </div>

        {/* Date + status + count — right side, stacked vertically */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {group.fv.releaseDate && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md leading-none bg-card text-foreground">
              {formatDate(group.fv.releaseDate)}
            </span>
          )}
          <span
            className={`text-[9px] font-bold uppercase tracking-widest leading-none ${cfg.solidText}`}
          >
            {cfg.label}
          </span>
          <span className="text-[9px] font-semibold text-foreground">
            {group.stories.length}{" "}
            {group.stories.length === 1 ? "item" : "items"}
          </span>
        </div>
      </button>

      {open && (
        <ul className="hover:bg-muted/50 bg-transparent">
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
      className={`flex items-start gap-3 px-5 py-3.5 transition-colors cursor-default hover:hover:bg-muted/50 bg-transparent ${
        isLast ? "" : "border-b border-border/50"
      }`}
    >
      <span
        className={`w-[10px] h-[10px] rounded-full flex-shrink-0 mt-[2px] ${statusDotClass(story.statusCategory)}`}
      />
      <div className="flex-1 min-w-0">
        <span className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">
          {story.key}
        </span>
        <span className="block text-xs font-bold leading-snug text-foreground">
          {story.summary}
        </span>
        <span className="block text-[9px] font-bold mt-0.5 uppercase tracking-wider text-muted-foreground/60">
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

      <div className="fixed right-0 top-0 h-full z-[201] flex flex-col w-[450px] bg-card border-l border-border animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none mb-2 bg-foreground text-slate-500">
                {epic.key}
              </span>
              <h2 className="text-sm font-black uppercase leading-snug tracking-tight truncate">
                {epic.summary}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors border border-border text-muted-foreground bg-card hover:bg-background hover:text-foreground"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          {/* Stats bar + counts */}
          {epic.storyStats && epic.storyStats.total > 0 && (
            <div>
              <div className="flex w-full h-[8px] rounded-full overflow-hidden mb-2.5 bg-slate-400">
                {epic.storyStats.done > 0 && (
                  <div
                    className="bg-emerald-500"
                    style={{
                      width: `${(epic.storyStats.done / epic.storyStats.total) * 100}%`,
                    }}
                  />
                )}
                {epic.storyStats.inProgress > 0 && (
                  <div
                    className="bg-amber-500"
                    style={{
                      width: `${(epic.storyStats.inProgress / epic.storyStats.total) * 100}%`,
                    }}
                  />
                )}
                {epic.storyStats.todo > 0 && (
                  <div
                    className="bg-slate-400"
                    style={{
                      width: `${(epic.storyStats.todo / epic.storyStats.total) * 100}%`,
                    }}
                  />
                )}
              </div>

              <div className="flex gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1">
                  <span className="w-[10px] h-[10px] rounded-full flex-shrink-0 bg-emerald-500" />
                  <span className="text-foreground">
                    {epic.storyStats.done} done
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-[10px] h-[10px] rounded-full flex-shrink-0 bg-amber-500" />
                  <span className="text-foreground">
                    {epic.storyStats.inProgress} in progress
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-[10px] h-[10px] rounded-full flex-shrink-0 bg-slate-400" />
                  <span className="text-muted-foreground/60">
                    {epic.storyStats.todo} todo
                  </span>
                </span>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="flex items-center gap-3 mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {stories.length} {stories.length === 1 ? "story" : "stories"}
              </p>
              {withRelease > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
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
            scrollbarColor: "var(--border) transparent",
          }}
        >
          {loading && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-muted-foreground/60">
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
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                No stories found
              </span>
            </div>
          )}

          {!loading && !error && stories.length > 0 && (
            <div>
              {groups.some((g) => g.fv !== null) && (
                <div className="px-5 py-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
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
