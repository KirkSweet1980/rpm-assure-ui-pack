import { Sparkline } from "@/components/portfolio/sparkline";
import { cn } from "@/lib/utils";

/**
 * shadcn-style KPI tile (Phase 1)
 * Small label · large value · optional hint / trend · optional sparkline
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
  /** e.g. "+12%" or "2 red" */
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

  return (
    <div
      className={cn(
        "rpma-stat-card group/stat relative flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 text-left shadow-sm",
        "transition-colors duration-150",
        "hover:border-accent/35 hover:bg-surface-2/30",
        "focus-within:border-accent/40",
      )}
      title={tip || hint}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium leading-none text-muted">{label}</p>
        {trend ? (
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
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
      <p
        className={cn(
          "font-mono text-2xl font-bold tabular-nums tracking-tight sm:text-[1.65rem]",
          empty && "text-subtle text-lg",
          !empty && tone === "red" && "text-rag-red",
          !empty && tone === "amber" && "text-rag-amber",
          !empty && tone === "green" && "text-rag-green",
          !empty && tone === "default" && "text-fg",
        )}
      >
        {empty ? "n/a" : value}
      </p>
      {sparkline && sparkline.length >= 2 ? (
        <div className="mt-1 opacity-90">
          <Sparkline values={sparkline} stroke={stroke} fill={stroke} width={96} height={22} />
        </div>
      ) : null}
      {hint ? (
        <p className="text-[11px] leading-snug text-muted">{hint}</p>
      ) : null}
      {tip ? (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute bottom-[calc(100%+0.35rem)] left-2 z-40 w-max max-w-[14rem]",
            "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[10px] font-normal leading-snug text-muted shadow-lg",
            "opacity-0 scale-95 transition duration-150 group-hover/stat:opacity-100 group-hover/stat:scale-100",
          )}
        >
          {tip}
        </span>
      ) : null}
    </div>
  );
}
