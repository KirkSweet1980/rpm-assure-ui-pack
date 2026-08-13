import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Top-nav brand lockup: larger cube + RPM Assure wordmark.
 */
export function RpmAssureNavLogo({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g = `navg-${uid}`;
  const g2 = `navf-${uid}`;

  return (
    <span
      className={cn(
        "rpma-nav-logo inline-flex items-center bg-transparent",
        className,
      )}
      aria-label="RPM Assure home"
    >
      <svg
        width={300}
        height={64}
        viewBox="0 0 200 42"
        className="rpma-nav-logo-svg block h-14 w-[min(300px,52vw)] max-w-[300px] bg-transparent sm:h-16 sm:w-[300px]"
        role="img"
      >
        <title>RPM Assure</title>
        <defs>
          <linearGradient id={g} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="40%" stopColor="#1bb8a6" />
            <stop offset="100%" stopColor="#8fce4a" />
          </linearGradient>
          <linearGradient id={g2} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a4d7a" />
            <stop offset="100%" stopColor="#3ecfbf" />
          </linearGradient>
        </defs>

        <circle
          cx="20"
          cy="21"
          r="16"
          fill="none"
          stroke={`url(#${g})`}
          strokeWidth="1.2"
          opacity="0.5"
        >
          <animate attributeName="r" values="14;17;14" dur="2.8s" repeatCount="indefinite" />
          <animate
            attributeName="opacity"
            values="0.28;0.6;0.28"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </circle>

        <g transform="translate(6,5) scale(1.35)">
          <path d="M10 16 L2 11.5 L2 5.5 L10 10 Z" fill={`url(#${g2})`} />
          <path d="M10 16 L18 11.5 L18 5.5 L10 10 Z" fill="#0a2f4a" opacity="0.95" />
          <path d="M10 10 L18 5.5 L10 1 L2 5.5 Z" fill={`url(#${g})`} />
          <path
            d="M10 1 L18 5.5 L18 11.5 L10 16 L2 11.5 L2 5.5 Z"
            fill="none"
            stroke="currentColor"
            className="rpma-nav-logo-stroke"
            strokeWidth="0.75"
            opacity="0.55"
          />
          <circle cx="10" cy="8" r="1.5" fill="#ffffff">
            <animate
              attributeName="opacity"
              values="0.65;1;0.65"
              dur="2.8s"
              repeatCount="indefinite"
            />
          </circle>
        </g>

        <text
          x="48"
          y="26"
          className="rpma-nav-logo-text"
          fill="currentColor"
          fontFamily="Inter, Segoe UI, system-ui, sans-serif"
          fontSize="17"
          fontWeight="700"
          letterSpacing="-0.03em"
        >
          RPM Assure
        </text>
        <rect x="48" y="31" height="2" rx="1" fill={`url(#${g})`}>
          <animate attributeName="width" values="60;100;60" dur="3.2s" repeatCount="indefinite" />
          <animate
            attributeName="opacity"
            values="0.55;0.95;0.55"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </rect>
      </svg>
    </span>
  );
}
