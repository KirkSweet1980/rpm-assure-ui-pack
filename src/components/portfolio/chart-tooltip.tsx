import { cn } from "@/lib/utils";

type PayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
  fill?: string;
};

/** Shared Recharts tooltip — animated, theme-aware, en-ZA numbers */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  nameMap,
  className,
}: {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string | number;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number, name: string) => string;
  nameMap?: Record<string, string>;
  className?: string;
}) {
  if (!active || !payload?.length) return null;

  const title =
    label != null && label !== ""
      ? labelFormatter
        ? labelFormatter(String(label))
        : String(label)
      : null;

  const fmt = (v: number | string, name: string) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return String(v ?? "—");
    if (valueFormatter) return valueFormatter(v, name);
    return v.toLocaleString("en-ZA");
  };

  const displayName = (raw: string) => nameMap?.[raw] ?? raw;

  return (
    <div
      className={cn(
        "rpma-chart-tip min-w-[148px] max-w-[280px] overflow-hidden rounded-xl border border-border/90",
        "bg-surface/95 px-0 py-0 text-xs shadow-[var(--shadow-elevated)] backdrop-blur-md",
        "ring-1 ring-accent/15 animate-in fade-in-0 zoom-in-95 duration-150",
        className,
      )}
      style={{
        background: "color-mix(in srgb, var(--color-surface) 96%, var(--color-accent) 4%)",
        borderColor: "var(--color-border)",
        color: "var(--color-fg)",
      }}
    >
      {title ? (
        <p className="border-b border-border/80 bg-surface-2/50 px-3 py-1.5 text-[11px] font-bold tracking-tight text-fg">
          {title}
        </p>
      ) : null}
      <ul className="space-y-1.5 px-3 py-2">
        {payload.map((p, i) => {
          const name = displayName(String(p.name ?? p.dataKey ?? "value"));
          const val = p.value;
          const color = p.color || p.fill || "var(--color-accent)";
          return (
            <li
              key={i}
              className="flex items-center justify-between gap-3 transition-transform duration-150"
            >
              <span className="inline-flex min-w-0 items-center gap-1.5 text-muted">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-surface"
                  style={{ background: color, boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 25%, transparent)` }}
                  aria-hidden
                />
                <span className="truncate text-[11px]">{name}</span>
              </span>
              <span className="font-mono text-[12px] font-bold tabular-nums text-fg">
                {fmt(val as number, name)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Soft highlight under hovered bars / points */
export const CHART_TOOLTIP_CURSOR = {
  fill: "var(--color-accent)",
  opacity: 0.08,
  radius: 4,
} as const;

/** Active bar style for interactive charts */
export const CHART_ACTIVE_BAR = {
  stroke: "var(--color-fg)",
  strokeWidth: 1,
  strokeOpacity: 0.15,
} as const;
