import { getSysproProgram, formatProgramLabel } from "@/lib/data/syspro-programs";
import { cn } from "@/lib/utils";

/** Code + friendly name; full description on hover/title */
export function ProgramLabel({
  code,
  className,
  showDescription = false,
  size = "md",
}: {
  code: string | null | undefined;
  className?: string;
  showDescription?: boolean;
  size?: "sm" | "md";
}) {
  const p = getSysproProgram(code);
  if (!p) {
    return <span className={cn("text-subtle", className)}>—</span>;
  }

  const known = p.name !== "SYSPRO program";

  return (
    <span className={cn("inline-flex min-w-0 flex-col gap-0.5", className)} title={p.description}>
      <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-md border border-accent/25 bg-accent-soft font-mono font-semibold text-accent",
            size === "sm" ? "px-1 py-0 text-[10px]" : "px-1.5 py-0.5 text-[11px]",
          )}
        >
          {p.code}
        </span>
        <span
          className={cn(
            "font-medium text-fg",
            size === "sm" ? "text-[11px]" : "text-xs sm:text-sm",
            !known && "text-muted",
          )}
        >
          {known ? p.name : "SYSPRO program"}
        </span>
      </span>
      {showDescription && known ? (
        <span className="text-[10px] leading-snug text-muted sm:text-[11px]">{p.description}</span>
      ) : null}
    </span>
  );
}

export function programChartLabel(code: string): string {
  return formatProgramLabel(code);
}
