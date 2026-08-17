import { useEffect, useId, useState } from "react";

/** Animated tach — CSS needle sweep + live readout. RPM teal / lime / redline. */
export function RpmRevCounter({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const [shown, setShown] = useState(1850);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let t = 0;
    const id = window.setInterval(() => {
      t += 0.12;
      const idle = 1700 + Math.sin(t * 1.7) * 220 + Math.sin(t * 4.1) * 90;
      const blip = Math.max(0, Math.sin(t * 0.38) - 0.68) * 7800;
      setShown(Math.round(Math.max(800, Math.min(7600, idle + blip)) / 50) * 50);
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  const cx = 40;
  const cy = 42;
  const r = 30;
  const start = -210;
  const sweep = 240;

  return (
    <svg
      className={className}
      width={84}
      height={68}
      viewBox="0 0 80 66"
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
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r + 4} fill="var(--rev-face, #0b1a3a)" stroke="var(--rev-ring, #1a3a4e)" strokeWidth="1.2" />
      <path
        d={arcPath(cx, cy, r, start, start + sweep)}
        fill="none"
        stroke={`url(#${uid}-arc)`}
        strokeWidth="5"
        strokeLinecap="round"
        filter={`url(#${uid}-glow)`}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
        const a = start + (n / 8) * sweep;
        const outer = polar(cx, cy, r - 1, a);
        const inner = polar(cx, cy, r - (n % 2 === 0 ? 7 : 4.5), a);
        return (
          <line
            key={n}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke={n >= 7 ? "#ea4d4d" : "var(--rev-tick, #d7ece8)"}
            strokeWidth={n % 2 === 0 ? 1.6 : 0.9}
          />
        );
      })}
      <g className="rpma-rev-needle" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <line
          x1={cx}
          y1={cy}
          x2={polar(cx, cy, r - 6, start + 70).x}
          y2={polar(cx, cy, r - 6, start + 70).y}
          stroke="#8fce4a"
          strokeWidth="2.2"
          strokeLinecap="round"
          filter={`url(#${uid}-glow)`}
        />
        <circle cx={cx} cy={cy} r="4" fill="#1bb8a6" />
        <circle cx={cx} cy={cy} r="1.8" fill="#e8edf3" />
      </g>
      <text
        x={cx}
        y={cy + 15}
        textAnchor="middle"
        fill="#8fce4a"
        fontFamily="Inter, ui-monospace, monospace"
        fontSize="8.5"
        fontWeight="800"
      >
        {shown}
      </text>
      <text
        x={cx}
        y={cy + 23}
        textAnchor="middle"
        fill="var(--rev-readout, #2d6a8a)"
        fontFamily="Inter, sans-serif"
        fontSize="5.2"
        fontWeight="800"
        letterSpacing="0.1em"
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
