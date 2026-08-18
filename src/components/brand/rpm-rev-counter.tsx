import { useEffect, useId, useRef, useState } from "react";

const CX = 40;
const CY = 40;
const R = 30;
const START = -210;
const SWEEP = 240;
const MAX = 8000;

function degFor(rpm: number) {
  return START + (Math.max(0, Math.min(MAX, rpm)) / MAX) * SWEEP;
}

/** Needle is driven by SVG transform — not CSS — so it always moves. */
export function RpmRevCounter({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const needleRef = useRef<SVGGElement | null>(null);
  const [shown, setShown] = useState(1850);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let t = 0;
    let raf = 0;
    let lastNum = 0;
    const tick = (now: number) => {
      t += 0.028;
      const idle = 1750 + Math.sin(t * 2.2) * 280 + Math.sin(t * 5.6) * 90;
      const blip = Math.max(0, Math.sin(t * 0.55) - 0.55) * 7200;
      const rpm = Math.max(700, Math.min(7600, idle + blip));
      const g = needleRef.current;
      if (g) g.setAttribute("transform", `rotate(${degFor(rpm) - degFor(2000)} ${CX} ${CY})`);
      if (now - lastNum > 90) {
        lastNum = now;
        setShown(Math.round(rpm / 50) * 50);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const rest = polar(CX, CY, R - 6, degFor(2000));

  return (
    <svg
      className={className}
      width={80}
      height={80}
      viewBox="0 0 80 80"
      role="img"
      aria-label={`Rev counter ${shown} RPM`}
      overflow="visible"
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
      <circle cx={CX} cy={CY} r={R + 4} fill="var(--rev-face, #0b1a3a)" stroke="var(--rev-ring, #1a3a4e)" strokeWidth="1.2" />
      <path
        d={arcPath(CX, CY, R, START, START + SWEEP)}
        fill="none"
        stroke={`url(#${uid}-arc)`}
        strokeWidth="5"
        strokeLinecap="round"
        filter={`url(#${uid}-glow)`}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
        const a = START + (n / 8) * SWEEP;
        const outer = polar(CX, CY, R - 1, a);
        const inner = polar(CX, CY, R - (n % 2 === 0 ? 7 : 4.5), a);
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
      <g ref={needleRef}>
        <line
          x1={CX}
          y1={CY}
          x2={rest.x}
          y2={rest.y}
          stroke="#8fce4a"
          strokeWidth="2.4"
          strokeLinecap="round"
          filter={`url(#${uid}-glow)`}
        />
        <circle cx={CX} cy={CY} r="4" fill="#1bb8a6" />
        <circle cx={CX} cy={CY} r="1.8" fill="#e8edf3" />
      </g>
      <text
        x={CX}
        y={CY + 15}
        textAnchor="middle"
        fill="#8fce4a"
        fontFamily='"Segoe UI Variable Text", "Segoe UI", ui-monospace, monospace'
        fontSize="8.5"
        fontWeight="800"
      >
        {shown}
      </text>
      <text
        x={CX}
        y={CY + 23}
        textAnchor="middle"
        fill="var(--rev-readout, #2d6a8a)"
        fontFamily='"Segoe UI Variable Display", "Segoe UI", sans-serif'
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
