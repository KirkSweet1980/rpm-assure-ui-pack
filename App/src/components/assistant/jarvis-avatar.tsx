import { cn } from "@/lib/utils";

export type JarvisStage = "off" | "entering" | "waving" | "idle" | "leaving";

export function JarvisAvatar({ stage }: { stage: JarvisStage }) {
  if (stage === "off") return null;
  const facingOut = stage === "leaving";
  return (
    <div
      className={cn(
        "rpma-jarvis",
        stage === "entering" && "is-in",
        stage === "waving" && "is-wave",
        stage === "idle" && "is-idle",
        stage === "leaving" && "is-out",
        facingOut && "is-right",
      )}
      aria-hidden
    >
      {stage === "waving" || stage === "idle" ? (
        <div className="rpma-jarvis-hello">Hi Avenger</div>
      ) : null}
      <svg className="rpma-jarvis-svg" viewBox="0 0 140 220" fill="none">
        <ellipse className="rpma-jarvis-shade" cx="70" cy="210" rx="38" ry="7" fill="rgba(15,23,42,.28)" />

        {/* back arm */}
        <g className="jv-arm jv-arm-back">
          <path d="M48 92 L28 128 L34 132 L54 98 Z" fill="#b42318" stroke="#e8b923" strokeWidth="1.4" />
          <rect x="24" y="126" width="14" height="10" rx="3" fill="#f0c14b" />
        </g>

        {/* legs */}
        <g className="jv-legs">
          <g className="jv-leg jv-leg-l">
            <path d="M56 138 L50 188 L62 188 L66 138 Z" fill="#9b1b14" stroke="#e8b923" strokeWidth="1.3" />
            <path d="M46 186 h20 l2 10 h-26 z" fill="#d4a017" />
            <circle cx="56" cy="196" r="3" fill="#3de0ff" opacity=".85" />
          </g>
          <g className="jv-leg jv-leg-r">
            <path d="M78 138 L74 188 L86 188 L90 138 Z" fill="#c6281c" stroke="#e8b923" strokeWidth="1.3" />
            <path d="M70 186 h20 l2 10 h-26 z" fill="#f0c14b" />
            <circle cx="82" cy="196" r="3" fill="#3de0ff" opacity=".85" />
          </g>
        </g>

        {/* torso armor */}
        <path
          d="M44 78 C46 62 56 56 70 56 C84 56 94 62 96 78 L100 132 C88 142 52 142 40 132 Z"
          fill="#d32f2f"
          stroke="#f4d03f"
          strokeWidth="2"
        />
        <path d="M52 86 L70 80 L88 86 L84 126 L70 134 L56 126 Z" fill="#b71c1c" />
        <polygon points="70,90 80,98 70,118 60,98" fill="#1ee0ff" className="jv-core" />
        <polygon points="70,94 76,99 70,112 64,99" fill="#e8fbff" opacity=".7" />
        <path d="M46 78 L70 70 L94 78" stroke="#f4d03f" strokeWidth="2" />

        {/* front waving arm */}
        <g className="jv-arm jv-arm-front">
          <path d="M94 86 L118 70 L124 78 L98 96 Z" fill="#e53935" stroke="#f4d03f" strokeWidth="1.4" />
          <g className="jv-hand">
            <ellipse cx="126" cy="70" rx="9" ry="8" fill="#f3c7a5" />
            <path d="M122 64 q6 -10 10 -2" stroke="#f3c7a5" strokeWidth="3.2" strokeLinecap="round" />
          </g>
        </g>

        {/* helmet + smiling face */}
        <g className="jv-head">
          <path d="M48 40 C50 18 90 18 92 40 L88 52 L52 52 Z" fill="#c62828" stroke="#f4d03f" strokeWidth="1.6" />
          <path d="M50 28 C62 20 78 20 90 28" stroke="#f4d03f" strokeWidth="2" />
          <rect x="52" y="40" width="36" height="28" rx="10" fill="#f6d2b3" />
          <path d="M60 50 q4 -3 8 0" stroke="#2c1810" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M74 50 q4 -3 8 0" stroke="#2c1810" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="64" cy="52" r="1.6" fill="#2c1810" />
          <circle cx="78" cy="52" r="1.6" fill="#2c1810" />
          <path className="jv-smile" d="M62 60 Q70 68 80 60" stroke="#c0392b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M54 42 L86 42" stroke="#f4d03f" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

export function isJarvisWalkOn(q: string) {
  const s = q.toLowerCase();
  return (
    /\b(come here|walk on|come in|enter|appear|jarvis|wave)\b/.test(s) &&
    !isJarvisWalkOff(q)
  );
}

export function isJarvisWalkOff(q: string) {
  const s = q.toLowerCase();
  return /\b(dismiss|goodbye|good bye|walk off|leave|go away|stand down|that will be all)\b/.test(
    s,
  );
}
