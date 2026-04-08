"use client";

import { useState } from "react";
import { RefreshProvider } from "@/contexts/RefreshContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ReleasesOverlay } from "@/components/layout/ReleasesOverlay";
import { useRefresh } from "@/contexts/RefreshContext";

function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showReleases, setShowReleases] = useState(false);
  const { isRefreshing, triggerRefresh } = useRefresh();

  return (
    <div className="h-screen flex bg-linear-bg font-sans text-linear-text overflow-hidden selection:bg-linear-accent/20 selection:text-linear-accent">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onOpenReleases={() => setShowReleases(true)}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
      {showReleases && (
        <ReleasesOverlay
          onClose={() => setShowReleases(false)}
          onRefresh={triggerRefresh}
          isRefreshing={isRefreshing}
        />
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RefreshProvider>
      <AppShell>{children}</AppShell>
    </RefreshProvider>
  );
}
