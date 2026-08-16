import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small (i) with a hover / focus tooltip. For Exco and staff KPIs. */
export function HelpTip({
  text,
  className,
  side = "bottom",
}: {
  text: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <span
      className={cn("rpma-help", className)}
      tabIndex={0}
      role="note"
      aria-label={text}
    >
      <Info className="rpma-help-ico" aria-hidden />
      <span
        role="tooltip"
        className={cn(
          "rpma-help-bubble",
          side === "top" && "is-top",
          side === "left" && "is-left",
          side === "right" && "is-right",
        )}
      >
        {text}
      </span>
    </span>
  );
}

export function PaneHead({
  children,
  tip,
}: {
  children: React.ReactNode;
  tip: string;
}) {
  return (
    <h2 className="rpma-pane-head">
      <span className="rpma-pane-head-inner">
        {children}
        <HelpTip text={tip} />
      </span>
    </h2>
  );
}

export function HoverTip({
  text,
  children,
  className,
  side = "top",
}: {
  text: string;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  if (!text) return <>{children}</>;
  return (
    <span className={cn("rpma-hovertip", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "rpma-help-bubble",
          side === "top" && "is-top",
          side === "left" && "is-left",
          side === "right" && "is-right",
        )}
      >
        {text}
      </span>
    </span>
  );
}

export function MetricLabel({
  children,
  tip,
  showIcon = true,
}: {
  children: React.ReactNode;
  tip: string;
  showIcon?: boolean;
}) {
  return (
    <p className="rpma-metric-label">
      <span className="truncate">{children}</span>
      {showIcon ? <HelpTip text={tip} side="top" /> : null}
    </p>
  );
}
