import type { ReactNode } from "react";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";

export type EcoKpiItem = {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "amber" | "red";
  warn?: boolean;
  href?: string;
  hint?: string;
};

export function kpiClass(tone?: EcoKpiItem["tone"], warn?: boolean) {
  if (tone === "red") return "is-bad";
  if (tone === "amber" || warn) return "is-warn";
  if (tone === "green") return "is-ok";
  return "";
}

/** One compact Exco KPI row — used on every hub, module and SLA page. */
export function EcoKpis({
  items,
  className,
  cols,
}: {
  items: EcoKpiItem[];
  className?: string;
  cols?: number;
}) {
  if (!items.length) return null;
  const n = cols ?? Math.min(Math.max(items.length, 1), 8);
  return (
    <div
      className={cn("rpma-eco-kpis", className)}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {items.map((k) => {
        const cls = cn("rpma-eco-kpi", kpiClass(k.tone, k.warn));
        const inner = (
          <>
            <em>{k.label}</em>
            <strong>{k.value}</strong>
          </>
        );
        if (k.href) {
          return (
            <SpaLink key={k.label} href={k.href} className={cls} title={k.hint || k.label}>
              {inner}
            </SpaLink>
          );
        }
        return (
          <div key={`${k.label}-${k.value}`} className={cls} title={k.hint || k.label}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export function EcoHead({
  title,
  subtitle,
  icon,
  kpis,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  kpis?: EcoKpiItem[];
  children?: ReactNode;
}) {
  return (
    <header className="rpma-eco-head">
      <div className="rpma-eco-head-row">
        {icon}
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {kpis?.length ? <EcoKpis items={kpis} /> : null}
      {children}
    </header>
  );
}
