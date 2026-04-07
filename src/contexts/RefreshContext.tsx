"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface RefreshContextValue {
  refreshKey: number;
  isRefreshing: boolean;
  triggerRefresh: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextValue>({
  refreshKey: 0,
  isRefreshing: false,
  triggerRefresh: async () => {},
});

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetch("/api/jira/refresh", { method: "POST" });
      setRefreshKey((k) => k + 1);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <RefreshContext.Provider value={{ refreshKey, isRefreshing, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}
