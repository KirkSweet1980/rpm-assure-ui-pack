import { useEffect, useId, useState } from "react";

/** Compact tach — needle hunts like a warm idle, then blips. RPM teal / lime / slate. */
export function RpmRevCounter({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const [rpm, setRpm] = useState(1800);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRpm(3200);
      return;
    }
    let t = 0;
    let raf = 0;
    const tick = () => {
      t += 0.035;
      const idle = 1650 + Math.sin(t * 2.1) * 180 + Math.sin(t * 5.4) * 70;
      const blip = Math.max(0, Math.sin(t * 0.42) - 0.72) * 9200;
      setRpm(Math.max(600, Math.min(7800, idle + blip)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const min = 0;
  const max = 8000;
  const start = -210;
  const sweep = 240;
  const deg = start + ((rpm - min) / (max - min)) * sweep;
  const cx = 32;
  const cy = 34;
  const r = 24;
  const needle = polar(cx, cy, r - 5, deg);
  const shown = Math.round(rpm / 50) * 50;

  return (
    <svg
      className={className}
      width={64}
      height={52}
      viewBox="0 0 64 52"
      role="img"
      aria-label={`Rev counter ${shown} RPM`}
    >
      <defs>
        <linearGradient id={`${uid}-arc`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2d6a8a" />
          <stop offset="45%" stopColor="#1bb8a6" />
          <stop offset="78%" stopColor="#8fce4a" />
          <stop offset="90%" stopColor="#ffa21d" />
          <stop offset="100%" stopColor="#ea4d4d" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r + 3} fill="#0b1a3a" stroke="#1a3a4e" strokeWidth="1" />
      <path
        d={arcPath(cx, cy, r, start, start + sweep)}
        fill="none"
        stroke={`url(#${uid}-arc)`}
        strokeWidth="4.2"
        strokeLinecap="round"
        filter={`url(#${uid}-glow)`}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
        const a = start + (n / 8) * sweep;
        const outer = polar(cx, cy, r - 1, a);
        const inner = polar(cx, cy, r - (n % 2 === 0 ? 6 : 4), a);
        return (
          <line
            key={n}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke={n >= 7 ? "#ea4d4d" : "#d7ece8"}
            strokeWidth={n % 2 === 0 ? 1.4 : 0.8}
          />
        );
      })}
      <circle cx={cx} cy={cy} r="3.4" fill="#1bb8a6" />
      <line
        x1={cx}
        y1={cy}
        x2={needle.x}
        y2={needle.y}
        stroke="#8fce4a"
        strokeWidth="1.8"
        strokeLinecap="round"
        filter={`url(#${uid}-glow)`}
      />
      <circle cx={cx} cy={cy} r="1.6" fill="#e8edf3" />
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="#8fce4a"
        fontFamily="Inter, ui-monospace, monospace"
        fontSize="7"
        fontWeight="800"
      >
        {shown}
      </text>
      <text
        x={cx}
        y={cy + 18.5}
        textAnchor="middle"
        fill="#2d6a8a"
        fontFamily="Inter, sans-serif"
        fontSize="4.2"
        fontWeight="700"
        letterSpacing="0.08em"
      >
        RPM
      </text>
    </svg>
  );
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
}
