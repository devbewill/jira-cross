"use client";

import { ReleaseTimeline } from "@/components/timeline/ReleaseTimeline";
import { useRefresh } from "@/contexts/RefreshContext";

export default function ReleasesPage() {
  const { isRefreshing } = useRefresh();
  return <ReleaseTimeline isRefreshing={isRefreshing} />;
}
