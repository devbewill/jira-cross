"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRefresh } from "@/contexts/RefreshContext";

// ─── Colori sidebar — pastel theme ──────────────────────────────────────────
const S = {
  bg:          "#FFFFFF",
  border:      "#E5E7EB",
  text:        "#1F2937",
  textSub:     "#6B7280",
  textMuted:   "#A1A1AA",
  divider:     "#E5E7EB",
  hover:       "#F3F4F6",
  activeBg:    "#F3F4F6",
  activeText:  "#111827",
  syncBg:      "#FFFFFF",
  syncText:    "#111827",
};

function IconTimeline() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="3.5" width="8"  height="2" rx="1" fill="currentColor"/>
      <rect x="1" y="7"   width="13" height="2" rx="1" fill="currentColor" opacity=".5"/>
      <rect x="1" y="10.5" width="5" height="2" rx="1" fill="currentColor" opacity=".3"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="4"   y="1"   width="1.2" height="3.5" rx=".6" fill="currentColor"/>
      <rect x="9.8" y="1"   width="1.2" height="3.5" rx=".6" fill="currentColor"/>
      <rect x="1.5" y="6"   width="12" height="1.2" fill="currentColor" opacity=".25"/>
      <rect x="3.5" y="8.5" width="2"  height="2"   rx=".5" fill="currentColor" opacity=".6"/>
      <rect x="6.5" y="8.5" width="2"  height="2"   rx=".5" fill="currentColor" opacity=".6"/>
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1"   y="1"   width="5.5" height="5.5" rx="1.5" fill="currentColor"/>
      <rect x="8.5" y="1"   width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".4"/>
      <rect x="1"   y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".4"/>
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.75" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 4.5v3.25l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconSprint() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M8 1L2 8h5l-1 6 6-7H7l1-6z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconTimesheet() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 3.5C2 2.67157 2.67157 2 3.5 2H11.5C12.3284 2 13 2.67157 13 3.5V11.5C13 12.3284 12.3284 13 11.5 13H3.5C2.67157 13 2 12.3284 2 11.5V3.5Z" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2 6H13M6 2V13" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}
function IconSync({ spinning }: { spinning: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      className={spinning ? "animate-spin" : ""}
      style={spinning ? { animationDuration: "0.8s" } : {}}>
      <path d="M11.5 7A4.5 4.5 0 1 1 9.1 3.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M9 1l2.5 2.5-2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconChevron({ flipped }: { flipped: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      className={`transition-transform duration-300 ${flipped ? "rotate-180" : ""}`}>
      <path d="M9 2.5L5 7l4 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  sub?: { href: string; label: string }[];
};

const NAV: NavItem[] = [
  { href: "/",          label: "Epics",    icon: <IconTimeline /> },
  { href: "/releases",  label: "Releases", icon: <IconCalendar /> },
  {
    href: "/psp",       label: "PSP",      icon: <IconGrid />,
    sub: [
      { href: "/psp",          label: "Dashboard" },
      { href: "/psp/tickets",  label: "Tutti i ticket" },
    ],
  },
  { href: "/sprint",    label: "Sprint",   icon: <IconSprint />   },
  { href: "/timesheet", label: "Timesheet",icon: <IconTimesheet />},
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function NavBtn({
  active, collapsed, title, onClick, children,
}: {
  active?: boolean;
  collapsed: boolean;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        height: 36,
        padding: collapsed ? "0 13px" : "0 12px",
        justifyContent: collapsed ? "center" : undefined,
        borderRadius: 8,
        cursor: "pointer",
        backgroundColor: active ? S.activeBg : "transparent",
        color: active ? S.activeText : S.text,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        userSelect: "none",
        transition: "background-color 120ms, color 120ms",
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = S.hover;
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
        }
      }}
    >
      {children}
    </div>
  );
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const { isRefreshing, triggerRefresh } = useRefresh();

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        width: collapsed ? 56 : 250,
        backgroundColor: S.bg,
        borderRight: `1px solid ${S.border}`,
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", height: 56, flexShrink: 0,
        padding: collapsed ? "0 16px" : "0 16px",
        justifyContent: collapsed ? "center" : undefined,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            backgroundColor: "#EBF3FF",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 11, color: "#111827", fontWeight: 700, lineHeight: 1 }}>◈</span>
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden", lineHeight: "1.25" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: S.text, whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>Jira Cross</p>
              <p style={{ fontSize: 11, color: S.textMuted, whiteSpace: "nowrap" }}>HD Group</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ margin: "0 12px", height: 1, backgroundColor: S.divider, flexShrink: 0 }} />

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "10px 8px", overflow: "hidden" }}>
        {NAV.map(({ href, label, icon, sub }) => {
          const groupActive = sub
            ? pathname === href || pathname.startsWith(href + "/")
            : pathname === href;
          return (
            <div key={href}>
              <Link href={href} style={{ textDecoration: "none" }}>
                <NavBtn active={groupActive} collapsed={collapsed} title={collapsed ? label : undefined}>
                  <span style={{ flexShrink: 0 }}>{icon}</span>
                  {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
                </NavBtn>
              </Link>
              {!collapsed && sub && groupActive && (
                <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 1, paddingLeft: 12 }}>
                  {sub.map(s => {
                    const subActive = pathname === s.href;
                    return (
                      <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
                        <div
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            height: 30, paddingLeft: 14, paddingRight: 8,
                            cursor: "pointer",
                            backgroundColor: "transparent",
                            color: subActive ? "#111827" : S.textSub,
                            fontSize: 12, fontWeight: subActive ? 700 : 500,
                            transition: "color 120ms",
                          }}
                          onMouseEnter={e => {
                            if (!subActive) (e.currentTarget as HTMLDivElement).style.color = S.text;
                          }}
                          onMouseLeave={e => {
                            if (!subActive) (e.currentTarget as HTMLDivElement).style.color = S.textSub;
                          }}
                        >
                          {s.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ margin: "6px 4px", height: 1, backgroundColor: S.divider }} />
      </nav>

      {/* ── Bottom ───────────────────────────────────────────────────── */}
      <div style={{ padding: "8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ margin: "0 4px 4px", height: 1, backgroundColor: S.divider }} />

        {/* Sync */}
        <button
          onClick={triggerRefresh}
          disabled={isRefreshing}
          title={collapsed ? "Sync Jira" : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            height: 36, padding: collapsed ? "0 13px" : "0 12px",
            justifyContent: collapsed ? "center" : undefined,
            borderRadius: 8, border: "1px solid #E5E7EB", cursor: isRefreshing ? "not-allowed" : "pointer",
            backgroundColor: S.syncBg, color: S.syncText,
            fontSize: 13, fontWeight: 700,
            opacity: isRefreshing ? 0.5 : 1,
            width: "100%",
          }}
        >
          <span style={{ flexShrink: 0 }}><IconSync spinning={isRefreshing} /></span>
          {!collapsed && <span>{isRefreshing ? "Syncing…" : "Sync Jira"}</span>}
        </button>

        {/* Collapse */}
        <button
          onClick={onToggle}
          title={collapsed ? "Espandi" : "Comprimi"}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            height: 36, padding: collapsed ? "0 13px" : "0 12px",
            justifyContent: collapsed ? "center" : undefined,
            borderRadius: 8, border: "none", cursor: "pointer",
            backgroundColor: "transparent", color: S.textMuted,
            fontSize: 13, fontWeight: 500, width: "100%",
            transition: "background-color 120ms",
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = S.hover)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <span style={{ flexShrink: 0 }}><IconChevron flipped={collapsed} /></span>
          {!collapsed && <span>Comprimi</span>}
        </button>
      </div>
    </aside>
  );
}
