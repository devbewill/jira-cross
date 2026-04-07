"use client";

import { useState } from "react";
import { ReleasesOverlay } from "./ReleasesOverlay";

type ViewMode = "epics" | "releases" | "psp";

export function Header({
  onRefresh,
  isRefreshing,
  cacheHit,
  viewMode,
  onViewModeChange,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
  cacheHit: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const [showReleases, setShowReleases] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 bg-linear-surface flex-shrink-0 border-b border-linear-border shadow-linear-sm">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-linear-accentLight">
            <span className="text-lg leading-none text-linear-accent">◈</span>
          </div>

          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold tracking-tight text-linear-text">
                Jira HD Cross-Space
              </h1>
              {cacheHit && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-linear-bg text-linear-textDim border border-linear-border">
                  Cached ✓
                </span>
              )}
            </div>
            <p className="text-[12px] text-linear-textSecondary">
              All epics tagged{" "}
              <span className="font-semibold text-linear-text">P0</span> across
              every Jira space, visualised on a single timeline.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Epics / Releases view toggle */}
          <div className="flex gap-1 p-1 rounded-lg mr-1 bg-linear-bg">
            {(["epics", "releases", "psp"] as const).map((mode) => {
              const active = viewMode === mode;
              const label = mode === "epics" ? "Epics" : mode === "releases" ? "Releases" : "PSP";
              return (
                <button
                  key={mode}
                  onClick={() => onViewModeChange(mode)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                    active
                      ? "bg-linear-surface text-linear-text shadow-btn-active"
                      : "bg-transparent text-linear-textSecondary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowReleases(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 border border-linear-border bg-linear-surface text-linear-text hover:bg-linear-accentLight hover:border-orange-300 hover:text-orange-700"
          >
            <span className="text-linear-accent">◈</span> Status Releases
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex  bg-linear-accent text-linear-secondary hover:bg-linear-secondaryHover items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Syncing…
              </>
            ) : (
              <>Sync Jira</>
            )}
          </button>
        </div>
      </header>

      {showReleases && (
        <ReleasesOverlay
          onClose={() => setShowReleases(false)}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}
    </>
  );
}
