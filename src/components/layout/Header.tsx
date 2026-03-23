"use client";

import { useState } from "react";
import { ReleasesOverlay } from "./ReleasesOverlay";

type ViewMode = "epics" | "releases";

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
      <header
        className="flex items-center justify-between px-6 py-4 bg-white flex-shrink-0"
        style={{
          borderBottom: "1px solid #E8E8EF",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#FEF3E8" }}
          >
            <span
              className="text-lg leading-none"
              style={{ color: "hsl(43 96% 56%)" }}
            >
              ◈
            </span>
          </div>

          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-2">
              <h1
                className="text-[15px] font-bold tracking-tight"
                style={{ color: "#1A1A1B" }}
              >
                Jira Epics Cross-Space
              </h1>
              {cacheHit && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: "#F4F4F7",
                    color: "#A0A0A8",
                    border: "1px solid #E8E8EF",
                  }}
                >
                  Cached ✓
                </span>
              )}
            </div>
            <p className="text-[12px]" style={{ color: "#717171" }}>
              All epics tagged{" "}
              <span className="font-semibold" style={{ color: "#1A1A1B" }}>
                P0
              </span>{" "}
              across every Jira space, visualised on a single timeline.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Epics / Releases view toggle */}
          <div
            className="flex gap-1 p-1 rounded-lg mr-1"
            style={{ backgroundColor: "#F4F4F7" }}
          >
            {(["epics", "releases"] as const).map((mode) => {
              const active = viewMode === mode;
              const label = mode === "epics" ? "Epics" : "Releases";
              return (
                <button
                  key={mode}
                  onClick={() => onViewModeChange(mode)}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150"
                  style={
                    active
                      ? {
                          backgroundColor: "#fff",
                          color: "#1A1A1B",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        }
                      : {
                          backgroundColor: "transparent",
                          color: "#717171",
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowReleases(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150"
            style={{
              border: "1px solid #E8E8EF",
              backgroundColor: "#fff",
              color: "#4A4A4A",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#FEF3E8";
              e.currentTarget.style.borderColor = "#FDBA74";
              e.currentTarget.style.color = "#C2590A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#fff";
              e.currentTarget.style.borderColor = "#E8E8EF";
              e.currentTarget.style.color = "#4A4A4A";
            }}
          >
            <span style={{ color: "hsl(43 96% 56%)" }}>◈</span> Status Releases
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex bg-[#0b1c3b] text-white hover:bg-[#1e395c] items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            // style={{
            //   backgroundColor: "#0b1c3b",
            //   color: "#fff",
            //   boxShadow: "0 1px 4px hsla(43, 96%, 56%, 0.30)",
            // }}
            // onMouseEnter={(e) => {
            //   if (!isRefreshing)
            //     e.currentTarget.style.backgroundColor = "hsl(43 96% 46%)";
            // }}
            // onMouseLeave={(e) => {
            //   e.currentTarget.style.backgroundColor = "hsl(43 96% 56%)";
            // }}
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
