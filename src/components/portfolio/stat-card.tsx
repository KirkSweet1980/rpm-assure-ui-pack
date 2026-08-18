import { Sparkline } from "@/components/portfolio/sparkline";
import { cn } from "@/lib/utils";

/**
 * Compact Exco KPI tile — same footprint as .rpma-eco-kpi.
 * Hint/tip live in the title tooltip so cards stay one line of value.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  sparkline,
  tip,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "red" | "amber" | "green";
  sparkline?: number[];
  tip?: string;
  trend?: string;
}) {
  const empty =
    value === "n/a" ||
    value === "N/A" ||
    value === "—" ||
    value === "-" ||
    value === "–" ||
    value === "";
  const stroke =
    tone === "red"
      ? "var(--color-rag-red)"
      : tone === "amber"
        ? "var(--color-rag-amber)"
        : tone === "green"
          ? "var(--color-rag-green)"
          : "var(--color-accent)";
  const toneClass =
    tone === "red" ? "is-bad" : tone === "amber" ? "is-warn" : tone === "green" ? "is-ok" : "";

  return (
    <div
      className={cn("rpma-eco-kpi rpma-stat-card", toneClass)}
      title={tip || hint || label}
    >
      <div className="flex items-start justify-between gap-1">
        <em>{label}</em>
        {trend ? (
          <span
            className={cn(
              "shrink-0 rounded px-1 text-[9px] font-semibold tabular-nums",
              tone === "red" && "bg-rag-red-bg text-rag-red",
              tone === "amber" && "bg-rag-amber-bg text-rag-amber",
              tone === "green" && "bg-rag-green-bg text-rag-green",
              tone === "default" && "bg-surface-2 text-muted",
            )}
          >
            {trend}
          </span>
        ) : null}
      </div>
      <strong className={cn(empty && "text-subtle")}>{empty ? "—" : value}</strong>
      {sparkline && sparkline.length >= 2 ? (
        <div className="mt-0.5 opacity-90">
          <Sparkline values={sparkline} stroke={stroke} fill={stroke} width={72} height={14} />
        </div>
      ) : null}
    </div>
  );
}
