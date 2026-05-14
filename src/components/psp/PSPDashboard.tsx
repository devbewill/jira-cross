"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, TableIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { usePSP } from "@/hooks/usePSP";
import { useRefresh } from "@/contexts/RefreshContext";
import { PSPIssue, PSPRequestTypeGroup } from "@/types";

const C = {
  bg: "#F5F5F5",
  card: "#FFFFFF",
  text: "#1F2937",
  text2: "#6B7280",
  text3: "#A1A1AA",
  surface: "#E5E7EB",
};

const STATUS_CFG: Record<
  string,
  { label: string; color: string; bg: string; accent: string }
> = {
  Aperto: {
    label: "Aperti",
    color: "#93C5FD",
    bg: "#93C5FD",
    accent: "#2563EB",
  },
  Riaperto: {
    label: "Ri aperti",
    color: "#FCA5A5",
    bg: "#FCA5A5",
    accent: "#DC2626",
  },
  "in attesa di risposta": {
    label: "In attesa",
    color: "#FCD34D",
    bg: "#FCD34D",
    accent: "#D97706",
  },
  "in risoluzione": {
    label: "In risoluzione",
    color: "#C4B5FD",
    bg: "#C4B5FD",
    accent: "#7C3AED",
  },
  Risolto: {
    label: "Risolti",
    color: "#86EFAC",
    bg: "#86EFAC",
    accent: "#16A34A",
  },
  Annullato: {
    label: "Annullati",
    color: "#D4D4D8",
    bg: "#D4D4D8",
    accent: "#71717A",
  },
};

const STATUS_ORDER = [
  "Aperto",
  "Riaperto",
  "in attesa di risposta",
  "in risoluzione",
  "Risolto",
  "Annullato",
];

const DONUT_PAL = [
  "#93C5FD",
  "#C4B5FD",
  "#FCD34D",
  "#86EFAC",
  "#FCA5A5",
  "#67E8F9",
  "#D8B4FE",
  "#D4D4D8",
  "#FDA4AF",
  "#5EEAD4",
];

// ── helpers ──────────────────────────────────────────────────────────────

function statusKey(i: PSPIssue): string {
  if (STATUS_CFG[i.status]) return i.status;
  return i.statusCategory === "done" ? "Risolto" : i.status;
}

function countBy(
  issues: PSPIssue[],
  fn: (i: PSPIssue) => string,
): Record<string, number> {
  const m: Record<string, number> = {};
  issues.forEach((i) => {
    const k = fn(i);
    m[k] = (m[k] ?? 0) + 1;
  });
  return m;
}

function statusCounts(issues: PSPIssue[]): Record<string, number> {
  return countBy(issues, statusKey);
}

function rawCounts(issues: PSPIssue[]): Record<string, number> {
  return countBy(issues, (i) => i.status);
}

// ── tooltip ─────────────────────────────────────────────────────────────

const tip = {
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600 as const,
  padding: "8px 12px",
  backgroundColor: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

function StatusTip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const items = payload.filter(
    (p) => p.dataKey !== "_t" && Number(p.value) > 0,
  );
  if (!items.length) return null;
  const label = payload[0]?.payload?.full ?? payload[0]?.payload?.name ?? "";
  return (
    <div style={tip}>
      <p style={{ color: C.text, marginBottom: 3, fontWeight: 700 }}>{label}</p>
      {items.map((p: any) => (
        <div
          key={p.dataKey}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 1,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 1,
              backgroundColor: p.fill,
            }}
          />
          <span style={{ color: C.text2 }}>
            {STATUS_CFG[p.dataKey]?.label ?? p.dataKey}: {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── KPI strip (horizontal pill metrics) ──────────────────────────────────

function StatusCard({
  status,
  count,
  active,
  onClick,
}: {
  status: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        background: cfg.bg,
        border: "none",
        borderRadius: 12,
        padding: "16px 18px 14px",
        cursor: "pointer",
        transition: "all 150ms",
        outline: active ? `2px solid ${cfg.accent}` : "2px solid transparent",
        textAlign: "left",
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: active ? cfg.accent : C.text2,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}
      >
        {cfg.label}
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1,
          color: active ? cfg.accent : C.text,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </span>
      <span
        style={{
          position: "absolute",
          top: 12,
          right: 14,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: cfg.color,
        }}
      />
    </button>
  );
}

function TotalCard({ total, openTotal }: { total: number; openTotal: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        background: C.text,
        borderRadius: 12,
        padding: "16px 18px 14px",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#FFFFFF60",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}
      >
        Totali
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1,
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {total}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#FFFFFF40",
          marginTop: 4,
        }}
      >
        {openTotal} aperti
      </span>
    </div>
  );
}

function KpiStrip({
  counts,
  total,
  openTotal,
  selected,
  onSelect,
}: {
  counts: Record<string, number>;
  total: number;
  openTotal: number;
  selected: string | null;
  onSelect: (s: string | null) => void;
}) {
  const present = STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${present.length + 1}, 1fr)`,
        gap: 8,
      }}
    >
      {present.map((s) => (
        <StatusCard
          key={s}
          status={s}
          count={counts[s]}
          active={selected === s}
          onClick={() => onSelect(selected === s ? null : s)}
        />
      ))}
      <TotalCard total={total} openTotal={openTotal} />
    </div>
  );
}

// ── Request type horizontal bars ────────────────────────────────────────

function RequestTypes({
  groups,
  issuesByRT,
}: {
  groups: PSPRequestTypeGroup[];
  issuesByRT: Record<string, PSPIssue[]>;
}) {
  const [iv, setIv] = useState<TrendInterval>("weekly");
  const [cs, setCs] = useState("");
  const [ce, setCe] = useState("");

  const allIssues = useMemo(
    () => Object.values(issuesByRT).flat(),
    [issuesByRT],
  );
  const filtered = useMemo(
    () => filterByTimeRange(allIssues, iv, cs, ce),
    [allIssues, iv, cs, ce],
  );
  const filteredByRT = useMemo(() => {
    const m: Record<string, PSPIssue[]> = {};
    filtered.forEach((i) => {
      const k = i.requestType ?? i.issueType;
      (m[k] ??= []).push(i);
    });
    return m;
  }, [filtered]);

  const present = groups
    .map((g) => ({
      ...g,
      requestTypes: g.requestTypes.filter(
        (rt) => (filteredByRT[rt.name]?.length ?? 0) > 0,
      ),
    }))
    .filter((g) => g.requestTypes.length > 0);

  if (!present.length) return null;

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: C.text,
              letterSpacing: "-0.01em",
            }}
          >
            Tipi di richiesta
          </h2>
          <p style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
            Per stato &middot; {filtered.length} ticket
          </p>
        </div>
        <IvToggle value={iv} onChange={setIv} />
      </div>
      {iv === "custom" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="date"
            value={cs}
            onChange={(e) => setCs(e.target.value)}
            style={dateInputStyle}
          />
          <span style={{ color: C.text3, fontSize: 11 }}>&rarr;</span>
          <input
            type="date"
            value={ce}
            onChange={(e) => setCe(e.target.value)}
            style={dateInputStyle}
          />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {present.map((group) => {
          const data = group.requestTypes
            .map((rt) => {
              const issues = filteredByRT[rt.name] ?? [];
              const raw = rawCounts(issues);
              const entry: Record<string, string | number> = {
                name:
                  rt.name.length > 24
                    ? rt.name.slice(0, 22) + "\u2026"
                    : rt.name,
                full: rt.name,
                _t: issues.length,
              };
              STATUS_ORDER.forEach((s) => {
                entry[s] = raw[s] ?? 0;
              });
              return entry as Record<string, string | number> & { _t: number };
            })
            .sort((a, b) => b._t - a._t);

          const active = STATUS_ORDER.filter((s) =>
            data.some((d) => (d[s] as number) > 0),
          );

          return (
            <div key={group.id}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.text3,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {group.name}
              </p>
              <div style={{ position: "relative" }}>
                <ResponsiveContainer width="100%" height={data.length * 32 + 4}>
                  <BarChart
                    data={data}
                    layout="vertical"
                    barSize={40}
                    margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={170}
                      tick={{ fontSize: 11, fontWeight: 600, fill: C.text2 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<StatusTip />}
                      cursor={{ fill: "transparent" }}
                    />
                    {active.map((s) => (
                      <Bar
                        key={s}
                        dataKey={s}
                        stackId="a"
                        fill={STATUS_CFG[s].color}
                        radius={[2, 2, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                  }}
                >
                  {data.map((entry, idx) => {
                    const bandH = (data.length * 32 + 4) / data.length;
                    const cy = idx * bandH + bandH / 2;
                    return (
                      <div
                        key={idx}
                        style={{
                          position: "absolute",
                          right: 4,
                          top: cy,
                          transform: "translateY(-50%)",
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.text2,
                        }}
                      >
                        {entry._t}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────

function donutData(issues: PSPIssue[], field: "reporter" | "assignee") {
  const m = new Map<string, number>();
  issues.forEach((i) => {
    const n = i[field]?.displayName ?? "N/D";
    m.set(n, (m.get(n) ?? 0) + 1);
  });
  return Array.from(m.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function DonutChart({
  data,
  label,
}: {
  data: { name: string; value: number }[];
  label: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.text3,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      <div style={{ position: "relative", width: 120, height: 120 }}>
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={36}
              outerRadius={54}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT_PAL[i % DONUT_PAL.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [v as number, n as string]}
              contentStyle={tip}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: C.text,
              lineHeight: 1,
            }}
          >
            {total}
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          width: "100%",
        }}
      >
        {data.map((d, i) => (
          <div
            key={d.name}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 1,
                flexShrink: 0,
                backgroundColor: DONUT_PAL[i % DONUT_PAL.length],
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 10,
                fontWeight: 500,
                color: C.text2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {d.name}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.text,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Distribution({ issues }: { issues: PSPIssue[] }) {
  const [iv, setIv] = useState<TrendInterval>("weekly");
  const [cs, setCs] = useState("");
  const [ce, setCe] = useState("");

  const filtered = useMemo(
    () => filterByTimeRange(issues, iv, cs, ce),
    [issues, iv, cs, ce],
  );
  const open = filtered.filter((i) => i.statusCategory !== "done");

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: C.text,
              letterSpacing: "-0.01em",
            }}
          >
            Distribuzione
          </h2>
          <p style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
            Solo ticket aperti ({open.length})
          </p>
        </div>
        <IvToggle value={iv} onChange={setIv} />
      </div>
      {iv === "custom" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="date"
            value={cs}
            onChange={(e) => setCs(e.target.value)}
            style={dateInputStyle}
          />
          <span style={{ color: C.text3, fontSize: 11 }}>&rarr;</span>
          <input
            type="date"
            value={ce}
            onChange={(e) => setCe(e.target.value)}
            style={dateInputStyle}
          />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <DonutChart data={donutData(open, "reporter")} label="Chi apre" />
        <DonutChart
          data={donutData(open, "assignee")}
          label="A chi assegnati"
        />
      </div>
    </section>
  );
}

// ── Trend ───────────────────────────────────────────────────────────────

type TrendInterval = "weekly" | "monthly" | "quarterly" | "custom";

function mondayOfWeek(d: Date): string {
  const c = new Date(d);
  const day = c.getDay();
  c.setDate(c.getDate() + (day === 0 ? -6 : 1 - day));
  c.setHours(0, 0, 0, 0);
  return c.toISOString().slice(0, 10);
}
function groupKey(d: Date, iv: TrendInterval): string {
  const y = d.getFullYear(),
    m = d.getMonth();
  if (iv === "monthly") return `${y}-${String(m + 1).padStart(2, "0")}`;
  if (iv === "quarterly") return `${y}-Q${Math.floor(m / 3) + 1}`;
  return mondayOfWeek(d);
}
function fmtKey(k: string, iv: TrendInterval): string {
  if (iv === "monthly") {
    const [y, mo] = k.split("-");
    return new Date(+y, +mo - 1, 1).toLocaleDateString("it-IT", {
      month: "short",
      year: "2-digit",
    });
  }
  if (iv === "quarterly") return k.replace("-", " ");
  return new Date(k).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}
function buildKeys(iv: TrendInterval, cs: string, ce: string): string[] {
  const now = new Date();
  const keys: string[] = [];
  if (iv === "weekly") {
    for (let i = 12; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      keys.push(mondayOfWeek(d));
    }
  } else if (iv === "monthly") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
  } else if (iv === "quarterly") {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      keys.push(`${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`);
    }
  } else {
    if (!cs || !ce) return [];
    const s = new Date(mondayOfWeek(new Date(cs))),
      e = new Date(ce);
    while (s <= e) {
      keys.push(s.toISOString().slice(0, 10));
      s.setDate(s.getDate() + 7);
    }
  }
  return [...new Set(keys)];
}
function buildTrend(
  issues: PSPIssue[],
  iv: TrendInterval,
  cs: string,
  ce: string,
) {
  const keys = buildKeys(iv, cs, ce);
  const ks = new Set(keys);
  const opened: Record<string, number> = {},
    resolved: Record<string, number> = {},
    rSum: Record<string, number> = {},
    rCnt: Record<string, number> = {};
  issues.forEach((i) => {
    const ok = groupKey(new Date(i.created), iv);
    if (ks.has(ok)) opened[ok] = (opened[ok] ?? 0) + 1;
    if (i.resolutionDate) {
      const rk = groupKey(new Date(i.resolutionDate), iv);
      if (ks.has(rk)) {
        resolved[rk] = (resolved[rk] ?? 0) + 1;
        const days =
          (new Date(i.resolutionDate).getTime() -
            new Date(i.created).getTime()) /
          86_400_000;
        if (days <= 30) {
          rSum[rk] = (rSum[rk] ?? 0) + days;
          rCnt[rk] = (rCnt[rk] ?? 0) + 1;
        }
      }
    }
  });
  return keys.map((k) => ({
    label: fmtKey(k, iv),
    aperti: opened[k] ?? 0,
    risolti: resolved[k] ?? 0,
    tempoMedio: rCnt[k] ? Math.round((rSum[k] / rCnt[k]) * 10) / 10 : null,
  }));
}

function getTimeRangeStart(iv: TrendInterval, cs: string): Date | null {
  const now = new Date();
  if (iv === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 13 * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (iv === "monthly") {
    return new Date(now.getFullYear(), now.getMonth() - 12, 1);
  }
  if (iv === "quarterly") {
    return new Date(now.getFullYear(), now.getMonth() - 8 * 3, 1);
  }
  if (iv === "custom" && cs) {
    const d = new Date(cs);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

function filterByTimeRange(
  issues: PSPIssue[],
  iv: TrendInterval,
  cs: string,
  ce: string,
): PSPIssue[] {
  const start = getTimeRangeStart(iv, cs);
  if (!start) return issues;
  const end = iv === "custom" && ce ? new Date(ce + "T23:59:59") : new Date();
  return issues.filter((i) => {
    const d = new Date(i.created);
    return d >= start && d <= end;
  });
}

const IV_LABELS: Record<TrendInterval, string> = {
  weekly: "Sett.",
  monthly: "Mese",
  quarterly: "Trim.",
  custom: "Custom",
};

function IvToggle({
  value,
  onChange,
}: {
  value: TrendInterval;
  onChange: (v: TrendInterval) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        background: C.surface,
        borderRadius: 8,
        padding: 3,
      }}
    >
      {(["weekly", "monthly", "quarterly", "custom"] as TrendInterval[]).map(
        (iv) => (
          <button
            key={iv}
            onClick={() => onChange(iv)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 700,
              background: value === iv ? "#fff" : "transparent",
              color: value === iv ? C.text : C.text3,
              transition: "all 120ms",
            }}
          >
            {IV_LABELS[iv]}
          </button>
        ),
      )}
    </div>
  );
}

function Trend({ issues }: { issues: PSPIssue[] }) {
  const [iv, setIv] = useState<TrendInterval>("weekly");
  const [cs, setCs] = useState("");
  const [ce, setCe] = useState("");
  const data = useMemo(
    () => buildTrend(issues, iv, cs, ce),
    [issues, iv, cs, ce],
  );
  const hasRes = data.some((d) => d.tempoMedio !== null);

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: C.text,
              letterSpacing: "-0.01em",
            }}
          >
            Andamento
          </h2>
          <p style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
            Aperti vs risolti &middot; tempo medio risoluzione
          </p>
        </div>
        <IvToggle value={iv} onChange={setIv} />
      </div>

      {iv === "custom" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="date"
            value={cs}
            onChange={(e) => setCs(e.target.value)}
            style={dateInputStyle}
          />
          <span style={{ color: C.text3, fontSize: 11 }}>&rarr;</span>
          <input
            type="date"
            value={ce}
            onChange={(e) => setCe(e.target.value)}
            style={dateInputStyle}
          />
        </div>
      )}

      {!data.length ? (
        <p
          style={{
            padding: 32,
            textAlign: "center",
            fontSize: 11,
            color: C.text3,
          }}
        >
          Seleziona un intervallo.
        </p>
      ) : (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
        >
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={data}
                margin={{ top: 2, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#93C5FD" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#86EFAC" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#86EFAC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fontWeight: 600, fill: C.text3 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fontWeight: 600, fill: C.text3 }}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tip}
                  cursor={{
                    stroke: C.text3,
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                  formatter={(v, n) => [
                    v as number,
                    (n as string) === "aperti" ? "Aperti" : "Risolti",
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={5}
                  formatter={(v) => (
                    <span
                      style={{ fontSize: 10, fontWeight: 600, color: C.text2 }}
                    >
                      {v === "aperti" ? "Aperti" : "Risolti"}
                    </span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="aperti"
                  name="aperti"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#gA)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="risolti"
                  name="risolti"
                  stroke="#16A34A"
                  strokeWidth={2}
                  fill="url(#gR)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: C.text3,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Tempo medio risoluzione
            </p>
            {!hasRes ? (
              <p
                style={{
                  padding: 32,
                  textAlign: "center",
                  fontSize: 11,
                  color: C.text3,
                }}
              >
                Nessun dato.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={data}
                  margin={{ top: 2, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4B5FD" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C4B5FD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fontWeight: 600, fill: C.text3 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fontWeight: 600, fill: C.text3 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                    tickFormatter={(v) => `${v}g`}
                  />
                  <Tooltip
                    contentStyle={tip}
                    cursor={{
                      stroke: C.text3,
                      strokeWidth: 1,
                      strokeDasharray: "3 3",
                    }}
                    formatter={(v) =>
                      (v as number | null) !== null
                        ? [`${v as number}g`, "Tempo medio"]
                        : ["\u2014", "Tempo medio"]
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="tempoMedio"
                    name="tempoMedio"
                    stroke="#7C3AED"
                    strokeWidth={1.5}
                    fill="url(#gT)"
                    dot={{ r: 2, fill: "#7C3AED", strokeWidth: 0 }}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Platform trend ──────────────────────────────────────────────────────

function buildPlatformTrend(
  issues: PSPIssue[],
  iv: TrendInterval,
  cs: string,
  ce: string,
) {
  const keys = buildKeys(iv, cs, ce);
  const ks = new Set(keys);
  const totals = new Map<string, number>();
  issues.forEach((i) => {
    const n = i.requestType ?? i.issueType;
    totals.set(n, (totals.get(n) ?? 0) + 1);
  });
  const names = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([n]) => n);
  const counts: Record<string, Record<string, number>> = {};
  keys.forEach((k) => {
    counts[k] = {};
  });
  issues.forEach((i) => {
    const ok = groupKey(new Date(i.created), iv);
    if (!ks.has(ok)) return;
    const n = i.requestType ?? i.issueType;
    counts[ok][n] = (counts[ok][n] ?? 0) + 1;
  });
  return {
    data: keys.map((k) => ({ label: fmtKey(k, iv), ...counts[k] })),
    platformNames: names,
  };
}

function PlatformTrend({ issues }: { issues: PSPIssue[] }) {
  const [iv, setIv] = useState<TrendInterval>("weekly");
  const [cs, setCs] = useState("");
  const [ce, setCe] = useState("");
  const { data, platformNames } = useMemo(
    () => buildPlatformTrend(issues, iv, cs, ce),
    [issues, iv, cs, ce],
  );

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: C.text,
              letterSpacing: "-0.01em",
            }}
          >
            Per piattaforma
          </h2>
          <p style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
            Ticket nel tempo per tipo di richiesta
          </p>
        </div>
        <IvToggle value={iv} onChange={setIv} />
      </div>

      {iv === "custom" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="date"
            value={cs}
            onChange={(e) => setCs(e.target.value)}
            style={dateInputStyle}
          />
          <span style={{ color: C.text3, fontSize: 11 }}>&rarr;</span>
          <input
            type="date"
            value={ce}
            onChange={(e) => setCe(e.target.value)}
            style={dateInputStyle}
          />
        </div>
      )}

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}
      >
        {platformNames.map((name, i) => (
          <span
            key={name}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 1,
                backgroundColor: DONUT_PAL[i % DONUT_PAL.length],
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 600, color: C.text2 }}>
              {name}
            </span>
          </span>
        ))}
      </div>

      {!data.length ? (
        <p
          style={{
            padding: 32,
            textAlign: "center",
            fontSize: 11,
            color: C.text3,
          }}
        >
          Seleziona un intervallo.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 2, right: 8, left: 0, bottom: 0 }}
            barSize={28}
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fontWeight: 600, fill: C.text3 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fontWeight: 600, fill: C.text3 }}
              axisLine={false}
              tickLine={false}
              width={20}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tip}
              cursor={{ fill: "rgba(0,0,0,0.02)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const items = payload
                  .filter((p) => Number(p.value) > 0)
                  .reverse();
                const t = items.reduce((s, p) => s + Number(p.value), 0);
                return (
                  <div style={tip}>
                    <p
                      style={{
                        color: C.text,
                        marginBottom: 3,
                        fontWeight: 700,
                      }}
                    >
                      {label} &middot; {t}
                    </p>
                    {items.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginBottom: 1,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 1,
                            backgroundColor: p.fill as string,
                          }}
                        />
                        <span style={{ flex: 1, color: C.text2, fontSize: 11 }}>
                          {String(p.dataKey ?? '')}
                        </span>
                        <span
                          style={{
                            color: C.text,
                            fontSize: 11,
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {platformNames.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="a"
                fill={DONUT_PAL[i % DONUT_PAL.length]}
                radius={
                  i === platformNames.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

const dateInputStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "none",
  background: C.surface,
  padding: "6px 10px",
  fontSize: 10,
  fontWeight: 600,
  outline: "none",
  color: C.text,
};

// ── Section card wrapper ────────────────────────────────────────────────

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 12,
        padding: "20px 24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════

export function PSPDashboard() {
  const { data, loading, error, cacheHit, refetch } = usePSP();
  const { isRefreshing, triggerRefresh } = useRefresh();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedRT] = useState<string | null>(null);

  const issuesByRT = useMemo(() => {
    if (!data) return {} as Record<string, PSPIssue[]>;
    return data.issues.reduce<Record<string, PSPIssue[]>>((acc, i) => {
      const k = i.requestType ?? i.issueType;
      (acc[k] ??= []).push(i);
      return acc;
    }, {});
  }, [data]);

  const allStatusCounts = useMemo(
    () => (data ? statusCounts(data.issues) : {}),
    [data],
  );
  const openTotal = useMemo(
    () => data?.issues.filter((i) => i.statusCategory !== "done").length ?? 0,
    [data],
  );

  if (loading)
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: `2px solid ${C.text3}`,
              borderTopColor: "#2563EB",
              borderRadius: "50%",
              animation: "spin .6s linear infinite",
            }}
          />
          <span style={{ fontSize: 11, color: C.text3, fontWeight: 500 }}>
            Caricamento&hellip;
          </span>
        </div>
      </div>
    );

  if (error)
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "#D45A56" }}>
            {error.message}
          </span>
          <button
            onClick={triggerRefresh}
            disabled={loading || isRefreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: C.surface,
              fontSize: 11,
              fontWeight: 600,
              color: C.text2,
              cursor: "pointer",
            }}
          >
            <RefreshCw
              className={`h-3 w-3 ${loading || isRefreshing ? "animate-spin" : ""}`}
            />{" "}
            Ricarica
          </button>
        </div>
      </div>
    );

  if (!data) return null;

  const total = data.issues.length;
  const fetchedTime = data.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const ttlMinutes = Math.round(
    parseInt(process.env.NEXT_PUBLIC_JIRA_CACHE_TTL || "300", 10) / 60,
  );
  const ttlLabel =
    ttlMinutes >= 60 ? `${Math.round(ttlMinutes / 60)}h` : `${ttlMinutes}m`;

  const openIssues = selectedStatus
    ? data.issues.filter((i) => statusKey(i) === selectedStatus)
    : null;
  const filteredByRT =
    selectedRT && data.groups?.length
      ? data.issues.filter((i) => (i.requestType ?? i.issueType) === selectedRT)
      : null;
  const filteredIssues = filteredByRT ?? openIssues;

  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "30px 10px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: C.text,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Portale supporto piattaforme
          </h1>
          <p
            style={{
              fontSize: 10,
              color: C.text3,
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            Service Desk &middot; SA
            {fetchedTime && (
              <span>
                {" "}
                &middot; aggiornato {fetchedTime} &middot; cache {ttlLabel}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: cacheHit ? C.text3 : "#86EFAC",
            }}
          />
          <Link href="/psp/tickets" style={headerBtn}>
            <TableIcon className="h-3 w-3" /> <span>Ticket</span>
          </Link>
          <a
            href="https://hd-group.atlassian.net/jira/servicedesk/projects/SA/queues/custom/218"
            target="_blank"
            rel="noopener noreferrer"
            style={headerBtn}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div
        style={{
          padding: "10px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* ── KPI strip ──────────────────────────────────────────────── */}
        <KpiStrip
          counts={allStatusCounts}
          total={total}
          openTotal={openTotal}
          selected={selectedStatus}
          onSelect={setSelectedStatus}
        />

        {/* ── Active filter ──────────────────────────────────────────── */}
        {selectedStatus && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: C.text3, fontWeight: 600 }}>
              Filtro:
            </span>
            <button
              onClick={() => setSelectedStatus(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 12px",
                borderRadius: 20,
                background: STATUS_CFG[selectedStatus]?.bg ?? C.surface,
                border: "none",
                fontSize: 10,
                fontWeight: 700,
                color: STATUS_CFG[selectedStatus]?.accent ?? C.text,
                cursor: "pointer",
              }}
            >
              {STATUS_CFG[selectedStatus]?.label ?? selectedStatus} (
              {(filteredIssues ?? data.issues).length})
              <span style={{ fontSize: 12, color: C.text3, marginLeft: 2 }}>
                &times;
              </span>
            </button>
          </div>
        )}

        {/* ── Request Types + Distribution ───────────────────────────── */}
        {(data.groups ?? []).length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 16,
            }}
          >
            <Card>
              <RequestTypes groups={data.groups} issuesByRT={issuesByRT} />
            </Card>
            <Card>
              <Distribution issues={filteredIssues ?? data.issues} />
            </Card>
          </div>
        )}

        {/* ── Trend ──────────────────────────────────────────────────── */}
        <Card>
          <Trend issues={filteredIssues ?? data.issues} />
        </Card>

        {/* ── Platform Trend ─────────────────────────────────────────── */}
        <Card>
          <PlatformTrend issues={filteredIssues ?? data.issues} />
        </Card>
      </div>
    </div>
  );
}

const headerBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: "none",
  background: C.surface,
  color: C.text2,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  transition: "background 120ms",
};
