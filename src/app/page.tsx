"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { TimelineContainer } from "@/components/timeline/TimelineContainer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useEpics } from "@/hooks/useEpics";
import { useSelectedEpic } from "@/hooks/useSelectedEpic";

export default function Page() {
  const { data, loading, error, cacheHit, refetch } = useEpics();
  const { selectedEpic, select, deselect } = useSelectedEpic();
  const [errorDismissed, setErrorDismissed] = useState(false);

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
      <div className="h-screen flex flex-col bg-white">
        <Header
          onRefresh={async () => {}}
          isRefreshing={false}
          cacheHit={false}
        />
        <div className="flex-1 flex items-center justify-center bg-timeline-grid">
          <div className="text-center bg-white p-12 border-4 border-black max-w-md shadow-hard relative">
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-fluo-red border-2 border-black rotate-12" />
            <h2 className="text-3xl font-black text-black mb-4 uppercase tracking-widest drop-shadow-[2px_2px_0px_rgba(0,195,255,1)]">
              Configuration Missing
            </h2>
            <p className="text-black font-medium mb-6">
              Jira credentials are not configured. Please ensure the following
              environment variables are set in .env.local:
            </p>
            <ul className="text-left bg-fluo-yellow p-4 border-2 border-black mb-6 font-mono text-sm font-bold text-black shadow-hard-sm">
              <li className="mb-2">👉 JIRA_BASE_URL</li>
              <li className="mb-2">👉 JIRA_EMAIL</li>
              <li>👉 JIRA_API_TOKEN</li>
            </ul>
            <p className="text-text-secondary text-sm font-bold border-t-2 border-black pt-4">
              After updating .env.local, restart the dev server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white font-sans text-black overflow-hidden">
      {/* Header */}
      <Header
        onRefresh={handleRefresh}
        isRefreshing={loading}
        cacheHit={cacheHit}
      />

      {/* Error Banner */}
      {error && !errorDismissed && (
        <ErrorBanner
          message={error.message}
          onDismiss={() => setErrorDismissed(true)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative p-4 sm:p-6 lg:p-8 bg-[#f5f5f5] gap-4 sm:gap-6 lg:gap-8">
        {loading && data === null ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <LoadingSpinner message="Loading epics from Jira..." />
          </div>
        ) : data?.boards ? (
          <>
            {/* Timeline */}
            <div className="flex-1 overflow-hidden border-2 border-black shadow-hard flex flex-col relative bg-white">
              <TimelineContainer
                boards={data.boards}
                selectedEpic={selectedEpic}
                onSelectEpic={select}
              />
            </div>

            {/* Sidebar */}
            <Sidebar epic={selectedEpic} onClose={deselect} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-timeline-grid border-2 border-black shadow-hard bg-white">
            <div className="text-center bg-white border-2 border-black p-8 shadow-hard">
              <p className="text-black font-bold mb-6 text-lg">No epics found</p>
              <button
                onClick={handleRefresh}
                className="btn-fluo px-8 py-4 bg-fluo-cyan text-black font-black uppercase tracking-widest text-lg hover:bg-fluo-lime"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
