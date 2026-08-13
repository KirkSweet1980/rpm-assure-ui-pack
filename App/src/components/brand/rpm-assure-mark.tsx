import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * RPM Assure cube mark — pure vector SVG (never a bitmap).
 * Keep display size modest (~96–128px); large sizes look “blown up” because
 * paths are simple, not photoreal art.
 */
export function RpmAssureMark({
  className,
  size = 112,
  showWordmark = true,
  /** Static = no SMIL animation (sharper, no GPU-layer blur) */
  staticMark = false,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  staticMark?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const gCube = `gc-${uid}`;
  const gFace = `gf-${uid}`;

  // Whole-pixel size only (fractional CSS size softens edges)
  const px = Math.max(48, Math.round(size));

  return (
    <div
      className={cn(
        "mx-auto flex flex-col items-center justify-center text-center",
        className,
      )}
      style={{ width: "max-content", maxWidth: "100%" }}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: px, height: px }}
      >
        <svg
          width={px}
          height={px}
          viewBox="0 0 120 120"
          className="block h-auto w-auto max-w-none"
          role="img"
          aria-label="RPM Assure"
          style={{
            display: "block",
            width: px,
            height: px,
            maxWidth: "none",
            shapeRendering: "geometricPrecision",
          }}
        >
          <defs>
            <linearGradient id={gCube} x1="15%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#2b6fae" />
              <stop offset="55%" stopColor="#1bb8a6" />
              <stop offset="100%" stopColor="#8fce4a" />
            </linearGradient>
            <linearGradient id={gFace} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3ecfbf" />
              <stop offset="100%" stopColor="#2b6fae" />
            </linearGradient>
          </defs>

          {/* subtle rings — static only when staticMark */}
          <circle
            cx="60"
            cy="56"
            r="48"
            fill="none"
            stroke="#1bb8a6"
            strokeWidth="1.25"
            opacity="0.35"
          >
            {!staticMark ? (
              <>
                <animate attributeName="r" values="46;52;46" dur="3.2s" repeatCount="indefinite" />
                <animate
                  attributeName="opacity"
                  values="0.2;0.45;0.2"
                  dur="3.2s"
                  repeatCount="indefinite"
                />
              </>
            ) : null}
          </circle>
          <circle
            cx="60"
            cy="56"
            r="42"
            fill="none"
            stroke={`url(#${gCube})`}
            strokeWidth="1.5"
            opacity="0.5"
          />

          {/* cube body — no animateTransform when static (keeps raster sharp) */}
          <g>
            <path d="M60 80 L30 63 L30 37 L60 54 Z" fill={`url(#${gFace})`} />
            <path d="M60 80 L90 63 L90 37 L60 54 Z" fill="#1a4d7a" />
            <path d="M60 54 L90 37 L60 20 L30 37 Z" fill={`url(#${gCube})`} />
            <path
              d="M60 20 L90 37 L90 63 L60 80 L30 63 L30 37 Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.4"
              opacity="0.7"
            />
            <path d="M60 54 L60 80" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
            <path d="M60 54 L90 37" stroke="#ffffff" strokeWidth="1.2" opacity="0.45" />
            <path d="M60 54 L30 37" stroke="#ffffff" strokeWidth="1.2" opacity="0.45" />
            <circle cx="60" cy="47" r="4.2" fill="#ffffff" />
            <circle
              cx="60"
              cy="47"
              r="7.5"
              fill="none"
              stroke="#1bb8a6"
              strokeWidth="1.5"
              opacity="0.85"
            />
          </g>

          {/* corner ticks */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 42 H28 M14 42 V32" stroke="#8fce4a" strokeWidth="2" />
            <path d="M106 70 H92 M106 70 V80" stroke="#1bb8a6" strokeWidth="2" />
            <path d="M20 88 H38 L44 82" stroke="#2b6fae" strokeWidth="2" />
            <path d="M100 28 H82 L76 34" stroke="#3ecfbf" strokeWidth="2" />
            <circle cx="14" cy="42" r="2.5" fill="#8fce4a" />
            <circle cx="106" cy="70" r="2.5" fill="#1bb8a6" />
            <circle cx="20" cy="88" r="2.2" fill="#2b6fae" />
            <circle cx="100" cy="28" r="2.2" fill="#3ecfbf" />
          </g>
        </svg>
      </div>

      {showWordmark ? (
        <div className="mt-5 w-full text-center">
          {/* Solid white — no gradient clip (that looks soft/stretched) */}
          <p
            className="rpma-login-wordmark m-0 text-[1.5rem] font-bold leading-none tracking-tight text-white sm:text-[1.65rem]"
            style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
          >
            RPM Assure
          </p>
          <p className="rpma-login-tagline mt-2 m-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Assurance Delivered
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function RpmAssureMarkIcon({
  className,
  size = 36,
  /** Match login: animated rings / pulse */
  animated = false,
}: {
  className?: string;
  size?: number;
  animated?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        animated && "rpma-mark-pulse",
        className,
      )}
    >
      <RpmAssureMark size={size} showWordmark={false} staticMark={!animated} />
    </div>
  );
}
