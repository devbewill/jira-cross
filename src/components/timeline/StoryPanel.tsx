"use client";

import { useEffect, useState } from "react";
import { Epic, Story } from "@/types";
import { DOT_DONE, DOT_IN_PROGRESS, DOT_TODO } from "./EpicBlock";

interface StoryPanelProps {
  epic: Epic;
  onClose: () => void;
}

function statusDotColor(cat: string): string {
  if (cat === "done")                                       return DOT_DONE;
  if (cat === "indeterminate" || cat === "in-progress")     return DOT_IN_PROGRESS;
  return DOT_TODO;
}

export function StoryPanel({ epic, onClose }: StoryPanelProps) {
  const [stories, setStories]   = useState<Story[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);

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
        className="fixed right-0 top-0 h-full z-[201] flex flex-col overflow-hidden"
        style={{
          width: "380px",
          backgroundColor: "#111111",
          borderLeft: "3px solid black",
          boxShadow: "-6px 0 0 rgba(0,0,0,0.18)",
          animation: "slideInRight 0.15s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span
                className="inline-block text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] leading-none mb-2"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
              >
                {epic.key}
              </span>
              <h2
                className="text-sm font-black uppercase leading-snug tracking-tight"
                style={{ color: "#ffffff" }}
              >
                {epic.summary}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-[3px] text-sm font-black transition-colors"
              style={{ color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          {/* Story count */}
          {!loading && !error && (
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
              {stories.length} {stories.length === 1 ? "story" : "stories"}
            </p>
          )}
        </div>

        {/* Story list */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
          {loading && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-bold uppercase tracking-widest animate-pulse" style={{ color: "rgba(255,255,255,0.3)" }}>
                Loading…
              </span>
            </div>
          )}

          {error && (
            <div className="px-5 py-4">
              <p className="text-xs font-bold" style={{ color: "rgba(255,92,160,0.9)" }}>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && stories.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
                No stories found
              </span>
            </div>
          )}

          {!loading && !error && stories.length > 0 && (
            <ul className="py-2">
              {stories.map((story, i) => (
                <li
                  key={story.key}
                  className="flex items-start gap-3 px-5 py-3 transition-colors"
                  style={{
                    borderBottom: i < stories.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {/* Status dot */}
                  <span
                    className="w-[8px] h-[8px] rounded-full flex-shrink-0 mt-[4px]"
                    style={{ backgroundColor: statusDotColor(story.statusCategory) }}
                  />

                  <div className="flex-1 min-w-0">
                    {/* Story key */}
                    <span
                      className="block text-[9px] font-black uppercase tracking-widest mb-0.5"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {story.key}
                    </span>
                    {/* Summary */}
                    <span
                      className="block text-xs font-bold leading-snug"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {story.summary}
                    </span>
                    {/* Status label */}
                    <span
                      className="block text-[9px] font-bold mt-1 uppercase tracking-wider"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {story.status}
                    </span>
                  </div>

                  {/* Assignee avatar */}
                  {story.assignee?.avatarUrl && (
                    <img
                      src={story.assignee.avatarUrl}
                      alt={story.assignee.displayName}
                      title={story.assignee.displayName}
                      className="w-5 h-5 rounded-full flex-shrink-0 opacity-60"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
