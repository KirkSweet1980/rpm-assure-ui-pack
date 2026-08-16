import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BLUE = "#1ABC9C";
const ORANGE = "#2ECC71";
const SKY = "#BDC3C7";
const GREEN = "#2ECC71";
const AMBER = "#F1C40F";
const RED = "#E74C3C";
const TRACK = "#2C3E50";

function ChartTipBox({
  title,
  rows,
}: {
  title?: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rpma-chart-tip">
      {title ? <p className="rpma-chart-tip-title">{title}</p> : null}
      {rows.map((r) => (
        <p key={r.label} className="rpma-chart-tip-row">
          {r.color ? (
            <i className="rpma-chart-tip-sw" style={{ background: r.color }} />
          ) : null}
          <span>{r.label}</span>
          <strong>{r.value}</strong>
        </p>
      ))}
    </div>
  );
}

export function Hint({
  text,
  children,
  className,
}: {
  text: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className ? `rpma-tip ${className}` : "rpma-tip"} data-tip={text}>
      {children}
    </span>
  );
}

export function RagDonut({
  green,
  amber,
  red,
}: {
  green: number;
  amber: number;
  red: number;
}) {
  const total = Math.max(1, green + amber + red);
  const healthy = Math.round((green / total) * 100);
  const data = [
    { name: "Green", value: green, fill: GREEN, hint: `${green} customer(s) healthy` },
    { name: "Amber", value: amber, fill: AMBER, hint: `${amber} customer(s) need watch` },
    { name: "Red", value: red, fill: RED, hint: `${red} customer(s) in breach / red` },
  ];
  return (
    <div
      className="relative mx-auto h-40 w-40"
      title={`${healthy}% green. ${green} green, ${amber} amber, ${red} red. Hover a slice.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={3}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip
            wrapperStyle={{ zIndex: 40 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              const name = String(p.name ?? "");
              const n = Number(p.value ?? 0);
              const pct = Math.round((n / total) * 100);
              return (
                <ChartTipBox
                  title="Overall RAG"
                  rows={[
                    {
                      label: name,
                      value: `${n} customer(s) · ${pct}%`,
                      color: String(p.payload?.fill ?? BLUE),
                    },
                    { label: "Click the tile below", value: "to list them" },
                  ]}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold tabular-nums text-fg">{healthy}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
          healthy
        </span>
      </div>
    </div>
  );
}

export function AssuranceGauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const data = [
    { name: "Assurance", value: v },
    { name: "Gap", value: 100 - v },
  ];
  return (
    <div
      className="relative mx-auto h-28 w-full max-w-[220px]"
      title={`Assure Eco-System assurance ${v}%. Blend of health, collect freshness and job errors.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            innerRadius="72%"
            outerRadius="100%"
            stroke="none"
            cy="90%"
          >
            <Cell fill={BLUE} />
            <Cell fill={TRACK} />
          </Pie>
          <Tooltip
            wrapperStyle={{ zIndex: 40 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <ChartTipBox
                  title="Assure Eco-System assurance"
                  rows={[
                    { label: "Score", value: `${v}%`, color: BLUE },
                    {
                      label: "Meaning",
                      value: v >= 80 ? "On track" : v >= 55 ? "Watch" : "Breach risk",
                    },
                  ]}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
        <span className="font-mono text-xl font-bold tabular-nums text-fg">{v}%</span>
      </div>
    </div>
  );
}

export function EstateLine({
  points,
}: {
  points: { name: string; score: number }[];
}) {
  const data = points.length
    ? points
    : [
        { name: "—", score: 0 },
        { name: "—", score: 0 },
      ];
  return (
    <div className="h-36 w-full" title="Assurance score per customer. Hover a dot for the name.">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="excoLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity={0.28} />
              <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            wrapperStyle={{ zIndex: 40 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as { name: string; score: number };
              const s = Number(row.score);
              return (
                <ChartTipBox
                  title={row.name}
                  rows={[
                    { label: "Assurance", value: `${s}%`, color: BLUE },
                    {
                      label: "Band",
                      value: s >= 80 ? "Green" : s >= 55 ? "Amber" : "Red",
                    },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke={BLUE}
            strokeWidth={2.5}
            fill="url(#excoLine)"
            dot={{ r: 3, fill: ORANGE, stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: ORANGE }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CoverBars({
  rows,
}: {
  rows: { name: string; on: number; off: number }[];
}) {
  return (
    <div className="h-36 w-full" title="Blue = on cover. Orange = not on cover. Hover a bar.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} barCategoryGap="28%" margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5f7588" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            wrapperStyle={{ zIndex: 40 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const on = Number(payload.find((p) => p.dataKey === "on")?.value ?? 0);
              const off = Number(payload.find((p) => p.dataKey === "off")?.value ?? 0);
              const t = on + off || 1;
              return (
                <ChartTipBox
                  title={String(label)}
                  rows={[
                    { label: "On cover", value: `${on} · ${Math.round((on / t) * 100)}%`, color: BLUE },
                    { label: "Not on cover", value: `${off} · ${Math.round((off / t) * 100)}%`, color: ORANGE },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="on" stackId="a" fill={BLUE} radius={[0, 0, 0, 0]} />
          <Bar dataKey="off" stackId="a" fill={ORANGE} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IncidentBars({
  rows,
}: {
  rows: { name: string; n: number }[];
}) {
  return (
    <div className="h-36 w-full" title="Customers with this incident type. Hover a bar.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} barCategoryGap="32%" margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5f7588" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            wrapperStyle={{ zIndex: 40 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const n = Number(payload[0].value ?? 0);
              return (
                <ChartTipBox
                  title={String(label)}
                  rows={[
                    { label: "Customers", value: String(n), color: BLUE },
                    { label: "Next", value: "Use the list below to open each one" },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="n" fill={BLUE} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Track({
  label,
  value,
  max = 100,
  tone = "blue",
  hint,
}: {
  label: string;
  value: number;
  max?: number;
  tone?: "blue" | "orange";
  hint?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const tip = hint ?? `${label}: ${value} of ${max} (${pct}%)`;
  return (
    <div className="rpma-tip" data-tip={tip}>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-muted">{label}</span>
        <span className="font-mono tabular-nums text-fg">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#e8eef6]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: tone === "orange" ? ORANGE : BLUE,
          }}
        />
      </div>
    </div>
  );
}

export const EXCO_BLUE = BLUE;
export const EXCO_ORANGE = ORANGE;
export const EXCO_SKY = SKY;
