"use client";

import { useState } from "react";
import { ReleasesOverlay } from "./ReleasesOverlay";
import { ReleaseTimelineOverlay } from "../timeline/ReleaseTimelineOverlay";

export function Header({
  onRefresh,
  isRefreshing,
  cacheHit,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
  cacheHit: boolean;
}) {
  const [showReleases,        setShowReleases]        = useState(false);
  const [showReleaseTimeline, setShowReleaseTimeline] = useState(false);

  return (
    <>
      <header
        className="flex items-center justify-between px-6 py-4 bg-white flex-shrink-0"
        style={{ borderBottom: "1px solid #E8E8EF", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#FEF3E8" }}
          >
            <span className="text-lg leading-none" style={{ color: "#F28C28" }}>◈</span>
          </div>

          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold tracking-tight" style={{ color: "#1A1A1B" }}>
                Jira Epics Cross-Space
              </h1>
              {cacheHit && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: "#F4F4F7", color: "#A0A0A8", border: "1px solid #E8E8EF" }}
                >
                  Cached ✓
                </span>
              )}
            </div>
            <p className="text-[12px]" style={{ color: "#717171" }}>
              All epics tagged{" "}
              <span className="font-semibold" style={{ color: "#1A1A1B" }}>P0</span>{" "}
              across every Jira space, visualised on a single timeline.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReleaseTimeline(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150"
            style={{ border: "1px solid #E8E8EF", backgroundColor: "#fff", color: "#4A4A4A" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FEF3E8"; e.currentTarget.style.borderColor = "#FDBA74"; e.currentTarget.style.color = "#C2590A"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#E8E8EF"; e.currentTarget.style.color = "#4A4A4A"; }}
          >
            <span style={{ color: "#F28C28" }}>▦</span> Timeline Rilasci
          </button>

          <button
            onClick={() => setShowReleases(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150"
            style={{ border: "1px solid #E8E8EF", backgroundColor: "#fff", color: "#4A4A4A" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FEF3E8"; e.currentTarget.style.borderColor = "#FDBA74"; e.currentTarget.style.color = "#C2590A"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#E8E8EF"; e.currentTarget.style.color = "#4A4A4A"; }}
          >
            <span style={{ color: "#F28C28" }}>◈</span> Status Rilasci
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#F28C28", color: "#fff", boxShadow: "0 1px 4px rgba(242,140,40,0.30)" }}
            onMouseEnter={(e) => { if (!isRefreshing) e.currentTarget.style.backgroundColor = "#E07A18"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F28C28"; }}
          >
            {isRefreshing ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Syncing…
              </>
            ) : (
              <>⟲ Sync Jira</>
            )}
          </button>
        </div>
      </header>

      {showReleases        && <ReleasesOverlay        onClose={() => setShowReleases(false)}        />}
      {showReleaseTimeline && <ReleaseTimelineOverlay onClose={() => setShowReleaseTimeline(false)} />}
    </>
  );
}
