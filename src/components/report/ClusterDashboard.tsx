// @ts-nocheck — file to be removed with /report/ section
"use client";

import React, { useState, useMemo } from "react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { MACRO_CATEGORIES, TicketInfo } from "@/lib/data/cluster-data";
import { ExternalLink, Info, AlertCircle } from "lucide-react";

// ── Costanti di stile (allineate a PSPDashboard con font +2px) ──────────────────────────
const C = {
  bg: "#F5F5F5",
  card: "#FFFFFF",
  text: "#1F2937",
  text2: "#6B7280",
  text3: "#A1A1AA",
  surface: "#E5E7EB",
};

const tooltipStyle = {
  borderRadius: 8,
  fontSize: 13, // +2px
  fontWeight: 600 as const,
  padding: "8px 12px",
  backgroundColor: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  border: "none",
};

// ── Sottocomponenti ───────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: "20px 24px", ...style }}>
      {children}
    </div>
  );
}

function KpiCard({ 
  label, 
  value, 
  subValue, 
  color, 
  active, 
  onClick 
}: { 
  label: string; 
  value: number; 
  subValue?: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        background: active ? color : C.card,
        border: active ? "none" : `1px solid ${C.surface}`,
        borderRadius: 12,
        padding: "16px 18px 14px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 150ms",
        textAlign: "left",
        minWidth: 0,
        flex: 1,
      }}
    >
      <span style={{
        fontSize: 11, // +2px
        fontWeight: 700,
        color: active ? "#FFFFFFCC" : C.text2,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 6,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 30, // +2px
        fontWeight: 800,
        lineHeight: 1,
        color: active ? "#FFFFFF" : C.text,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </span>
      {subValue && (
        <span style={{
          fontSize: 12, // +2px
          fontWeight: 600,
          color: active ? "#FFFFFF99" : C.text3,
          marginTop: 4,
        }}>
          {subValue}
        </span>
      )}
    </button>
  );
}

function TicketRow({ ticket, categoryColor }: { ticket: TicketInfo, categoryColor: string }) {
  return (
    <div className="group flex items-center justify-between border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <a 
          href={`https://hd-group.atlassian.net/browse/${ticket.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[13px] font-bold transition-colors shrink-0"
          style={{ color: categoryColor }}
        >
          {ticket.id}
        </a>
        <a 
          href={`https://hd-group.atlassian.net/browse/${ticket.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-bold text-gray-700 truncate hover:text-blue-600 transition-colors"
          title={ticket.summary}
        >
          {ticket.summary}
        </a>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${ 
          ticket.status === 'Aperto' ? 'bg-red-100 text-red-600' : 
          ticket.status === 'in risoluzione' ? 'bg-orange-100 text-orange-600' :
          'bg-blue-100 text-blue-600'
        }`}>
          {ticket.status}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════

export default function ClusterDashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (!selectedId) return MACRO_CATEGORIES;
    return MACRO_CATEGORIES.filter(c => c.id === selectedId);
  }, [selectedId]);

  const pieData = MACRO_CATEGORIES.map(c => ({
    name: c.name,
    value: c.total,
    color: c.color,
    id: c.id
  }));

  const barData = MACRO_CATEGORIES.map(c => ({
    name: c.name,
    aperti: c.open,
    totali: c.total
  }));

  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "30px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: "-0.02em", lineHeight: 1 }}>
            Report Clusterizzazione Ticket
          </h1>
          <p style={{ fontSize: 12, color: C.text3, marginTop: 4, fontWeight: 500 }}>
            Analisi cause sistemiche &middot; Maggio 2026 &middot; 543 ticket totali
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <a href="https://hd-group.atlassian.net/jira" target="_blank" rel="noreferrer" style={headerBtn}>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div style={{ padding: "10px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* ── KPI Strip ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8 }}>
          {MACRO_CATEGORIES.map(c => (
            <KpiCard 
              key={c.id}
              label={c.name}
              value={c.total}
              subValue={`${c.open} ticket aperti`}
              color={c.color}
              active={selectedId === c.id}
              onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
            />
          ))}
          <KpiCard 
            label="Totale Analizzati"
            value={543}
            subValue="32 aperti (tot)"
            color={C.text}
          />
        </div>

        {/* ── Charts ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: 16 }}>
          <Card>
            <h2 style={sectionTitle}>Impatto Distribuzione</h2>
            <p style={sectionSub}>Percentuale ticket per macro-categoria</p>
            <div style={{ height: 220, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    strokeWidth={0}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 style={sectionTitle}>Aperti vs Totali</h2>
            <p style={sectionSub}>Confronto criticità per categoria</p>
            <div style={{ height: 220, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: C.text2 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: C.text2 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="totali" fill="#60A5FA" radius={[4, 4, 0, 0]} name="Totali" />
                  <Bar dataKey="aperti" fill="#f87171" radius={[4, 4, 0, 0]} name="Aperti" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ── Detailed Categorie List ────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredCategories.map((category) => (
            <Card key={category.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: category.color }} />
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-0.01em" }}>{category.name}</h2>
                  </div>
                  <p style={{ fontSize: 14, color: C.text2, marginTop: 4, maxWidth: "80%" }}>{category.description}</p>
                </div>
                <div style={{ display: "flex", gap: 16, flexShrink: 0, marginLeft: 24, textAlign: "right" }}>
                   <div style={miniStat}>
                      <span style={miniStatLabel}>Totale</span>
                      <span style={miniStatValue}>{category.total}</span>
                   </div>
                   <div style={miniStat}>
                      <span style={{...miniStatLabel, color: "#f87171"}}>Aperti</span>
                      <span style={{...miniStatValue, color: "#ef4444"}}>{category.open}</span>
                   </div>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${C.bg}`, paddingTop: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: C.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                  Ticket di riferimento (Jira)
                </h3>
                <div className="grid grid-cols-1 gap-1">
                  {category.tickets.map(ticket => (
                    <TicketRow key={ticket.id} ticket={ticket} categoryColor={category.color} />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const headerBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "none",
  background: C.surface,
  color: C.text2,
  cursor: "pointer",
  transition: "background 120ms",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: C.text,
  letterSpacing: "-0.01em",
};

const sectionSub: React.CSSProperties = {
  fontSize: 12,
  color: C.text3,
  marginTop: 2,
  fontWeight: 500,
};

const miniStat: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  minWidth: 60,
};

const miniStatLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.text3,
  textTransform: "uppercase",
};

const miniStatValue: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: C.text,
  lineHeight: 1.2,
};
