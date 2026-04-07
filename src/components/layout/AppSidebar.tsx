"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRefresh } from "@/contexts/RefreshContext";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Epics",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="9" height="2.5" rx="1.25" fill="currentColor" opacity=".9"/>
        <rect x="1" y="8" width="14" height="2.5" rx="1.25" fill="currentColor" opacity=".9"/>
        <rect x="1" y="12" width="6" height="2.5" rx="1.25" fill="currentColor" opacity=".9"/>
      </svg>
    ),
  },
  {
    href: "/releases",
    label: "Releases",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="4" y="1" width="1.5" height="4" rx=".75" fill="currentColor"/>
        <rect x="10.5" y="1" width="1.5" height="4" rx=".75" fill="currentColor"/>
        <rect x="1" y="6" width="14" height="1.5" fill="currentColor" opacity=".4"/>
        <rect x="3.5" y="9" width="2" height="2" rx=".5" fill="currentColor"/>
        <rect x="7" y="9" width="2" height="2" rx=".5" fill="currentColor"/>
        <rect x="10.5" y="9" width="2" height="2" rx=".5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: "/psp",
    label: "PSP",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
      </svg>
    ),
  },
] as const;

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onOpenReleases: () => void;
}

export function AppSidebar({ collapsed, onToggle, onOpenReleases }: AppSidebarProps) {
  const pathname = usePathname();
  const { isRefreshing, triggerRefresh } = useRefresh();

  return (
    <aside
      className={`flex flex-col h-full bg-linear-surface border-r border-linear-border flex-shrink-0 transition-all duration-200 ${
        collapsed ? "w-14" : "w-52"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-3.5 h-14 border-b border-linear-border flex-shrink-0 overflow-hidden`}>
        <span className="text-[18px] text-linear-accent flex-shrink-0">◈</span>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[13px] font-bold text-linear-text whitespace-nowrap truncate leading-tight">
              Jira Cross-Space
            </p>
            <p className="text-[10px] text-linear-textSecondary whitespace-nowrap truncate leading-tight">
              HD Group
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2 pt-3 overflow-hidden">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-100 whitespace-nowrap overflow-hidden ${
                active
                  ? "bg-linear-accentLight/15 text-linear-accent"
                  : "text-linear-textSecondary hover:bg-linear-surfaceHover hover:text-linear-text"
              }`}
            >
              <span className="flex-shrink-0">{icon}</span>
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-1 h-px bg-linear-border/50 mx-1" />

        {/* Status Releases */}
        <button
          onClick={onOpenReleases}
          title={collapsed ? "Status Releases" : undefined}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium text-linear-textSecondary hover:bg-linear-surfaceHover hover:text-linear-text transition-all duration-100 whitespace-nowrap overflow-hidden w-full text-left"
        >
          <span className="flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 4.5v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          {!collapsed && <span className="truncate">Status Releases</span>}
        </button>
      </nav>

      {/* Bottom: Sync + Collapse */}
      <div className="p-2 border-t border-linear-border flex flex-col gap-0.5">
        <button
          onClick={triggerRefresh}
          disabled={isRefreshing}
          title={collapsed ? "Sync Jira" : undefined}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-semibold bg-linear-accent text-linear-secondary hover:bg-linear-accentHover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-100 whitespace-nowrap overflow-hidden w-full"
        >
          <span className="flex-shrink-0">
            {isRefreshing ? (
              <span className="w-4 h-4 border-2 border-linear-secondary border-t-transparent rounded-full animate-spin block" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 1l3 2-3 2" fill="currentColor"/>
              </svg>
            )}
          </span>
          {!collapsed && <span>{isRefreshing ? "Syncing…" : "Sync Jira"}</span>}
        </button>

        <button
          onClick={onToggle}
          title={collapsed ? "Espandi sidebar" : "Comprimi sidebar"}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-linear-textSecondary hover:bg-linear-surfaceHover hover:text-linear-text transition-all duration-100 w-full"
        >
          <span className={`flex-shrink-0 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          {!collapsed && <span className="truncate">Comprimi</span>}
        </button>
      </div>
    </aside>
  );
}
