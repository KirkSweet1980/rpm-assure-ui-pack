import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function Gauge({
  value,
  label,
  targetLabel,
  color = "#1bb8a6",
}: {
  value: number;
  label: string;
  targetLabel?: string;
  color?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const data = [
    { name: "v", value: v },
    { name: "r", value: 100 - v },
  ];
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[140px]" style={{ height: "var(--gauge-h)" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="100%"
              stroke="none"
              cy="75%"
            >
              <Cell fill={color} />
              <Cell fill="var(--color-border)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-0.5">
          <span className="font-mono text-sm font-semibold tabular-nums text-fg sm:text-lg">{v}%</span>
        </div>
      </div>
      <p className="mt-0.5 text-center text-[10px] font-medium text-fg sm:text-xs">{label}</p>
      {targetLabel ? <p className="text-[9px] text-subtle sm:text-[10px]">{targetLabel}</p> : null}
    </div>
  );
}

export function HealthBarRow({
  red,
  amber,
  green,
  total,
}: {
  red: number;
  amber: number;
  green: number;
  total: number;
}) {
  const t = total || 1;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-2 sm:h-2.5">
        <div className="bg-rag-red" style={{ width: `${(red / t) * 100}%` }} />
        <div className="bg-rag-amber" style={{ width: `${(amber / t) * 100}%` }} />
        <div className="bg-rag-green" style={{ width: `${(green / t) * 100}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted sm:text-xs">
        <span>
          <span className="font-mono font-semibold text-rag-red">{red}</span> Red
        </span>
        <span>
          <span className="font-mono font-semibold text-rag-amber">{amber}</span> Amber
        </span>
        <span>
          <span className="font-mono font-semibold text-rag-green">{green}</span> Green
        </span>
      </div>
    </div>
  );
}
