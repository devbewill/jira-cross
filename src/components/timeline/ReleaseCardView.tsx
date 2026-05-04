"use client";

import { formatDate, daysLabel } from "@/lib/utils/format-utils";
import {
  releaseStatusOf,
  RELEASE_STATUS_CONFIG,
} from "@/lib/utils/status-config";
import type { JiraRelease, ProjectReleases } from "@/types";

function ReleaseCard({
  release,
  isSelected,
  onClick,
}: {
  release: JiraRelease;
  isSelected: boolean;
  onClick: (r: JiraRelease) => void;
}) {
  const status = releaseStatusOf(release);
  const cfg = RELEASE_STATUS_CONFIG[status];
  const label = daysLabel(release.releaseDate, release.released);

  return (
    <div
      className="bg-card hover:bg-muted/30 flex h-full cursor-pointer flex-col gap-2 rounded-xs border-4 border-black p-4 transition-all select-none"
      style={
        isSelected
          ? { outline: `2px solid ${cfg.solidOutline}`, outlineOffset: "2px" }
          : undefined
      }
      onClick={() => onClick(release)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-foreground min-w-0 flex-1 text-sm font-bold uppercase leading-snug tracking-wide">
          {release.name}
        </span>
        <span
          className="flex-shrink-0 rounded-xs border px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-widest uppercase"
          style={{
            backgroundColor: cfg.solidBg,
            color: cfg.solidText,
            borderColor: cfg.solidBorder,
          }}
        >
          {cfg.label}
        </span>
      </div>

      {release.description && (
        <p className="text-muted-foreground font-normal text-sm leading-snug">
          {release.description}
        </p>
      )}

      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <span className="text-muted-foreground block text-[9px] font-bold tracking-widest uppercase">
            Start
          </span>
          <span className="text-foreground text-[11px] font-bold">
            {formatDate(release.startDate)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[9px] font-bold tracking-widest uppercase">
            Release
          </span>
          <span className="text-foreground text-[11px] font-bold">
            {formatDate(release.releaseDate)}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-2">
        {label && (
          <span
            className="inline-block rounded-xs px-2 py-1 text-center text-[9px] font-bold tracking-widest uppercase"
            style={{
              backgroundColor:
                status === "overdue"
                  ? "rgba(192,38,211,0.12)"
                  : "rgba(0,0,0,0.05)",
              color: status === "overdue" ? "#C026D3" : undefined,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

interface ReleaseCardViewProps {
  projects: ProjectReleases[];
  selectedRelease: JiraRelease | null;
  onSelectRelease: (release: JiraRelease) => void;
}

function groupByMonth(releases: JiraRelease[]) {
  const groups: { key: string; label: string; releases: JiraRelease[] }[] = [];
  const idx = new Map<string, number>();

  for (const r of releases) {
    let key: string;
    let label: string;
    if (r.releaseDate) {
      const d = new Date(r.releaseDate);
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      label = d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    } else {
      key = "no-date";
      label = "Senza data";
    }
    if (!idx.has(key)) {
      idx.set(key, groups.length);
      groups.push({ key, label, releases: [] });
    }
    groups[idx.get(key)!].releases.push(r);
  }

  return groups;
}

export function ReleaseCardView({
  projects,
  selectedRelease,
  onSelectRelease,
}: ReleaseCardViewProps) {
  const sorted = projects
    .flatMap((p) => p.releases)
    .sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0;
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return (
        new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      );
    });

  const months = groupByMonth(sorted);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="space-y-8">
        {months.map((group) => (
          <section key={group.key}>
            <div className="border-border mb-3 flex items-center gap-3 border-b pb-2">
              <h3 className="text-foreground text-sm font-bold">
                {group.label}
              </h3>
              <span className="text-muted-foreground text-[10px] font-medium">
                {group.releases.length}{" "}
                {group.releases.length === 1 ? "release" : "releases"}
              </span>
            </div>
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.releases.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  isSelected={selectedRelease?.id === release.id}
                  onClick={onSelectRelease}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
