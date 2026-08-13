import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

/** Minimal SVG sparkline — no chart lib weight */
export function Sparkline({
  values,
  className,
  stroke = "var(--color-accent)",
  fill = "var(--color-accent-soft)",
  height = 28,
  width = 96,
}: {
  values: number[];
  className?: string;
  stroke?: string;
  fill?: string;
  height?: number;
  width?: number;
}) {
  const id = useId();
  const path = useMemo(() => {
    const pts = values.filter((v) => Number.isFinite(v));
    if (pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const coords = pts.map((v, i) => {
      const x = pad + (i / (pts.length - 1)) * w;
      const y = pad + h - ((v - min) / span) * h;
      return [x, y] as const;
    });
    const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area =
      line +
      ` L${coords[coords.length - 1][0].toFixed(1)},${(height - pad).toFixed(1)}` +
      ` L${coords[0][0].toFixed(1)},${(height - pad).toFixed(1)} Z`;
    return { line, area };
  }, [values, width, height]);

  if (!path) {
    return (
      <div
        className={cn("inline-block opacity-40", className)}
        style={{ width, height }}
        aria-hidden
      />
    );
  }

  return (
    <svg
      className={cn("overflow-visible", className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${id}-g)`} />
      <path d={path.line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
