import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Interactive help chip with CSS hover tooltip (not native title) */
export function InfoTag({
  title,
  children,
  className,
  side = "bottom",
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <span
      className={cn("rpma-tip group/tip relative inline-flex max-w-full", className)}
      tabIndex={0}
      role="button"
      aria-label={typeof children === "string" ? `${children}: ${title}` : title}
    >
      <span
        className={cn(
          "rpma-tip-trigger inline-flex max-w-full items-center gap-1 rounded-full border border-border/60",
          "bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent",
          "transition duration-200 ease-out",
          "hover:border-accent/50 hover:bg-accent hover:text-accent-fg hover:shadow-md hover:shadow-accent/20",
          "group-focus-visible/tip:border-accent/50 group-focus-visible/tip:bg-accent group-focus-visible/tip:text-accent-fg",
          "group-hover/tip:-translate-y-px",
        )}
      >
        <Info
          className="h-3 w-3 shrink-0 opacity-80 transition group-hover/tip:scale-110 group-hover/tip:opacity-100"
          aria-hidden
        />
        <span className="truncate">{children ?? "More info"}</span>
      </span>

      <span
        role="tooltip"
        className={cn(
          "rpma-tip-bubble pointer-events-none absolute z-50 w-max max-w-[min(18rem,calc(100vw-2rem))]",
          "rounded-xl border border-border/90 bg-surface px-3 py-2.5 text-left text-[11px] font-normal leading-snug text-fg",
          "shadow-[var(--shadow-elevated)] ring-1 ring-accent/10",
          "opacity-0 scale-95 transition duration-200 ease-out",
          "group-hover/tip:pointer-events-auto group-hover/tip:opacity-100 group-hover/tip:scale-100",
          "group-focus-visible/tip:pointer-events-auto group-focus-visible/tip:opacity-100 group-focus-visible/tip:scale-100",
          side === "bottom" &&
            "top-[calc(100%+0.45rem)] left-1/2 origin-top -translate-x-1/2",
          side === "top" &&
            "bottom-[calc(100%+0.45rem)] left-1/2 origin-bottom -translate-x-1/2",
          side === "left" &&
            "right-[calc(100%+0.45rem)] top-1/2 origin-right -translate-y-1/2",
          side === "right" &&
            "left-[calc(100%+0.45rem)] top-1/2 origin-left -translate-y-1/2",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute h-2 w-2 rotate-45 border border-border/90 bg-surface",
            side === "bottom" &&
              "top-[-5px] left-1/2 -translate-x-1/2 border-r-0 border-b-0",
            side === "top" &&
              "bottom-[-5px] left-1/2 -translate-x-1/2 border-t-0 border-l-0",
            side === "left" &&
              "right-[-5px] top-1/2 -translate-y-1/2 border-b-0 border-l-0",
            side === "right" &&
              "left-[-5px] top-1/2 -translate-y-1/2 border-t-0 border-r-0",
          )}
          aria-hidden
        />
        <span className="relative block text-muted">{title}</span>
      </span>
    </span>
  );
}

export function SectionLabel({
  title,
  blurb,
  info,
}: {
  title: string;
  /** Always-visible plain-language line */
  blurb?: string;
  info?: string;
}) {
  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
          {title}
        </h2>
        {info ? <InfoTag title={info}>What is this?</InfoTag> : null}
      </div>
      {blurb ? (
        <p className="mt-1 max-w-3xl text-[12px] leading-snug text-muted">{blurb}</p>
      ) : null}
    </div>
  );
}
