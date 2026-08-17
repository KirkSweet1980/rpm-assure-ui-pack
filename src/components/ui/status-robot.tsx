import { cn } from "@/lib/utils";
import type { HealthRag } from "@/lib/data/types";

const STATE_COPY: Record<"green" | "amber" | "red" | "off", string> = {
  green: "Live Green — service is clear on the latest collect.",
  amber: "Live Amber — watch item. Click to open the issue.",
  red: "Live Red — breach or critical. Click to open the issue.",
  off: "No live status — service is No RPM Cloud Backupr, so it is not scored.",
};

/** Compact robot glyph — visor is live RAG. Not used for Cover. */
export function StatusRobot({
  rag,
  title,
  size = 16,
}: {
  rag: HealthRag | "Off" | null | undefined;
  title?: string;
  size?: number;
}) {
  const state =
    rag === "Green" ? "green" : rag === "Amber" ? "amber" : rag === "Red" ? "red" : "off";
  const label = title ? `${title}. ${STATE_COPY[state]}` : STATE_COPY[state];
  return (
    <span
      className={cn("rpma-bot rpma-hovertip", `is-${state}`)}
      aria-label={label}
      role="img"
    >
      <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
        <g className="rpma-bot-ant-g">
          <rect className="rpma-bot-ant" x="7.15" y="0.6" width="1.7" height="2.4" rx="0.6" />
          <circle className="rpma-bot-ant-tip" cx="8" cy="0.85" r="1.05" />
        </g>
        <rect className="rpma-bot-head" x="2.1" y="3.2" width="11.8" height="11.2" rx="2.4" />
        <rect className="rpma-bot-visor" x="3.6" y="6.1" width="8.8" height="3.6" rx="1.3" />
        <rect className="rpma-bot-gleam" x="4.3" y="6.6" width="2.6" height="1.1" rx="0.5" />
        <circle className="rpma-bot-dot" cx="5.7" cy="12.2" r="0.65" />
        <circle className="rpma-bot-dot" cx="10.3" cy="12.2" r="0.65" />
      </svg>
      <span role="tooltip" className="rpma-help-bubble is-left">
        {label}
      </span>
    </span>
  );
}

export function CoverTag({
  on,
  coverOn = "Cover",
  noCover = "No RPM Cloud Backupr",
}: {
  on: boolean;
  coverOn?: string;
  noCover?: string;
}) {
  const text = on
    ? `${coverOn} — this service is in scope and collecting. Live health is the robot, not this chip.`
    : `${noCover} — not in scope. The robot stays grey and this service does not move RAG.`;
  return (
    <span className={cn("rpma-cover-tag rpma-hovertip", on ? "is-on" : "is-off")}>
      {on ? coverOn : noCover}
      <span role="tooltip" className="rpma-help-bubble is-left">
        {text}
      </span>
    </span>
  );
}
