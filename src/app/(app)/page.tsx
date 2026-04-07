"use client";

import { useState } from "react";
import { TimelineContainer } from "@/components/timeline/TimelineContainer";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useEpics } from "@/hooks/useEpics";
import { useSelectedEpic } from "@/hooks/useSelectedEpic";

export default function EpicsPage() {
  const { data, loading, error } = useEpics();
  const { selectedEpic, select, deselect } = useSelectedEpic();
  const [errorDismissed, setErrorDismissed] = useState(false);

  const isConfigMissing = error?.message?.toLowerCase().includes("credentials");

  if (isConfigMissing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-timeline-grid p-6">
        <div className="bg-linear-surface border border-linear-border rounded-[12px] p-8 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-3 text-linear-text">Configuration Missing</h2>
          <p className="text-linear-text text-sm mb-6 leading-relaxed">
            Jira credentials are not configured. Please ensure the following environment variables are set in{" "}
            <code className="bg-linear-surfaceActive px-1 py-0.5 rounded">.env.local</code>:
          </p>
          <ul className="text-left bg-linear-surfaceHover p-4 rounded-[6px] border border-linear-border font-mono text-xs text-linear-text space-y-2">
            {["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"].map((v) => (
              <li key={v} className="flex items-center gap-2">
                <span className="text-linear-accent">→</span> {v}
              </li>
            ))}
          </ul>
          <p className="text-linear-textDim text-xs pt-4 border-t border-linear-border mt-4">
            After updating .env.local, restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && !errorDismissed && (
        <ErrorBanner message={error.message} onDismiss={() => setErrorDismissed(true)} />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {loading && data === null ? (
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
              className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden h-full shrink-0 border-l border-linear-border z-30 ${
                selectedEpic ? "w-80 opacity-100" : "w-0 opacity-0 border-none"
              }`}
            >
              <Sidebar epic={selectedEpic} onClose={deselect} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center bg-linear-surface border border-linear-border rounded-[12px] p-8 max-w-sm">
              <p className="text-linear-text font-medium mb-6">
                No epics found in this project view.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
