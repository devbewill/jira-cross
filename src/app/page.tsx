"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { TimelineContainer } from "@/components/timeline/TimelineContainer";
import { ReleaseTimeline } from "@/components/timeline/ReleaseTimeline";
import { PSPDashboard } from "@/components/psp/PSPDashboard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useEpics } from "@/hooks/useEpics";
import { useSelectedEpic } from "@/hooks/useSelectedEpic";

type ViewMode = "epics" | "releases" | "psp";

export default function Page() {
  const { data, loading, error, cacheHit, refetch } = useEpics();
  const { selectedEpic, select, deselect } = useSelectedEpic();
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("epics");

  const handleRefresh = async () => {
    try {
      await fetch("/api/jira/refresh", { method: "POST" });
      await refetch();
      setErrorDismissed(false);
    } catch (error) {
      console.error("Error refreshing:", error);
    }
  };

  const isConfigMissing = error?.message?.toLowerCase().includes("credentials");

  if (isConfigMissing) {
    return (
      <div className="h-screen flex flex-col bg-white text-linear-text font-sans selection:bg-linear-accent selection:text-white">
        <Header
          onRefresh={async () => {}}
          isRefreshing={false}
          cacheHit={false}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="flex-1 flex items-center justify-center bg-timeline-grid p-6">
          <div className="bg-linear-surface border border-linear-border rounded-[12px] p-8 max-w-md relative w-full">
            <h2 className="text-xl font-semibold mb-3">
              Configuration Missing
            </h2>
            <p className="text-linear-text text-sm mb-6 leading-relaxed">
              Jira credentials are not configured. Please ensure the following
              environment variables are set in{" "}
              <code className="bg-linear-surfaceActive px-1 py-0.5 rounded">
                .env.local
              </code>
              :
            </p>
            <ul className="text-left bg-linear-surfaceHover p-4 rounded-[6px] border border-linear-border mb-6 font-mono text-xs text-linear-text space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-linear-accent">→</span> JIRA_BASE_URL
              </li>
              <li className="flex items-center gap-2">
                <span className="text-linear-accent">→</span> JIRA_EMAIL
              </li>
              <li className="flex items-center gap-2">
                <span className="text-linear-accent">→</span> JIRA_API_TOKEN
              </li>
            </ul>
            <p className="text-linear-textDim text-xs pt-4 border-t border-linear-border">
              After updating .env.local, restart the dev server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white font-sans text-linear-text overflow-hidden selection:bg-linear-accent selection:text-white">
      {/* Header */}
      <Header
        onRefresh={handleRefresh}
        isRefreshing={loading}
        cacheHit={cacheHit}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Error Banner */}
      {error && !errorDismissed && (
        <ErrorBanner
          message={error.message}
          onDismiss={() => setErrorDismissed(true)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ── PSP dashboard view ────────────────────────────────────────── */}
        {viewMode === "psp" && <PSPDashboard />}

        {/* ── Releases timeline view ────────────────────────────────────── */}
        {viewMode === "releases" && (
          <div className="flex-1 overflow-hidden">
            <ReleaseTimeline isRefreshing={loading} />
          </div>
        )}

        {/* ── Epics timeline view ───────────────────────────────────────── */}
        {viewMode === "epics" &&
          (loading && data === null ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <LoadingSpinner message="Syncing timeline..." />
            </div>
          ) : data?.boards ? (
            <>
              <div className="flex-1 overflow-hidden relative bg-white">
                <TimelineContainer
                  boards={data.boards}
                  selectedEpic={selectedEpic}
                  onSelectEpic={select}
                />
              </div>
              <div
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden h-full shrink-0 border-l border-linear-border z-30 ${selectedEpic ? "w-80 opacity-100" : "w-0 opacity-0 border-none"}`}
              >
                <Sidebar epic={selectedEpic} onClose={deselect} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-timeline-grid bg-white">
              <div className="text-center bg-linear-surface border border-linear-border rounded-[12px] p-8 max-w-sm">
                <p className="text-linear-text font-medium mb-6">
                  No epics found in this project view.
                </p>
                <button
                  onClick={handleRefresh}
                  className="px-6 py-2 bg-linear-accent text-white font-medium rounded-[6px] text-sm hover:bg-linear-accentHover transition-colors"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
