"use client";

import { ProjectsTimeline } from "@/components/projects/ProjectsTimeline";
import { useRefresh } from "@/contexts/RefreshContext";

export default function ProjectsPage() {
  const { isRefreshing } = useRefresh();
  return <ProjectsTimeline isRefreshing={isRefreshing} />;
}
