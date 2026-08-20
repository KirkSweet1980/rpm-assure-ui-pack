import type { HTMLAttributes, ReactNode } from "react";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";

export function OrionWidget({
  title,
  helpHref = "/help/eco",
  action,
  children,
  className,
  ...rest
}: {
  title: string;
  helpHref?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rpma-orion-w", className)} {...rest}>
      <header className="rpma-orion-h">
        <h2>{title}</h2>
        <div className="rpma-orion-h-actions">
          {action}
          <SpaLink href={helpHref} className="rpma-orion-help">
            HELP
          </SpaLink>
        </div>
      </header>
      <div className="rpma-orion-b">{children}</div>
    </section>
  );
}

export type OrionSlice = { label: string; value: number; color: string };

export function OrionDonut({
  slices,
  size = 132,
  hole = 0.58,
}: {
  slices: OrionSlice[];
  size?: number;
  hole?: number;
}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const r = size / 2;
  const sw = r * (1 - hole);
  const rr = r - sw / 2;
  const circ = 2 * Math.PI * rr;
  let off = 0;
  return (
    <div className="rpma-orion-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={r} cy={r} r={rr} fill="none" stroke="#ececec" strokeWidth={sw} />
        {slices.map((sl) => {
          if (sl.value <= 0) return null;
          const len = (sl.value / total) * circ;
          const el = (
            <circle
              key={sl.label}
              cx={r}
              cy={r}
              r={rr}
              fill="none"
              stroke={sl.color}
              strokeWidth={sw}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-off}
              transform={`rotate(-90 ${r} ${r})`}
            />
          );
          off += len;
          return el;
        })}
      </svg>
      <ul>
        {slices.map((sl) => (
          <li key={sl.label}>
            <i style={{ background: sl.color }} />
            <span>{sl.label}</span>
            <b>{sl.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrionHBar({
  label,
  pct,
  tone,
  sub,
}: {
  label: string;
  pct: number | null;
  tone: "green" | "amber" | "red" | "muted";
  sub?: string;
}) {
  const color =
    tone === "green" ? "#8bc53f" : tone === "amber" ? "#f0ad4e" : tone === "red" ? "#e74c3c" : "#b0b0b0";
  const w = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="rpma-orion-hbar">
      <span className="rpma-orion-hbar-l" title={label}>
        {label}
      </span>
      <div className="rpma-orion-hbar-t">
        <i style={{ width: `${w}%`, background: color }} />
      </div>
      <b className={cn(tone === "red" && "is-red", tone === "green" && "is-green")}>
        {pct == null ? "—" : `${pct}%`}
      </b>
      {sub ? <em>{sub}</em> : null}
    </div>
  );
}
