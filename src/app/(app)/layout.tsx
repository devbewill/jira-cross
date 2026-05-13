"use client";

import { useState } from "react";
import { RefreshProvider } from "@/contexts/RefreshContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useRefresh } from "@/contexts/RefreshContext";

function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  useRefresh();

  return (
    <div className="h-screen flex bg-background font-sans text-foreground overflow-hidden selection:bg-primary/20 selection:text-primary">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
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
