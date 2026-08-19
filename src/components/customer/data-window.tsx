import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Right-pane data window — heading bar stays put, body scrolls. */
export function DataWindow({
  title,
  subtitle,
  fill,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  subtitle?: string;
  fill?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rpma-win", fill && "is-fill", className)}>
      <header className="rpma-win-head">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div className={cn("rpma-win-body", bodyClassName)}>{children}</div>
    </section>
  );
}
