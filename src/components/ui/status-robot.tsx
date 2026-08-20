import { cn } from "@/lib/utils";
import type { HealthRag } from "@/lib/data/types";
import ragGreen from "@/assets/status/rag-green.png";
import ragRed from "@/assets/status/rag-red.png";
import ragAmber from "@/assets/status/rag-amber.png";

const STATE_COPY: Record<"green" | "amber" | "red" | "off", string> = {
  green: "Live Green — service is clear on the latest collect.",
  amber: "Live Amber — watch item. Click to open the issue.",
  red: "Live Red — breach or critical. Click to open the issue.",
  off: "No live status — service is No Cover, so it is not scored.",
};

const SRC = {
  green: ragGreen,
  amber: ragAmber,
  red: ragRed,
  off: ragGreen,
} as const;

/** Glossy RAG disc. Green/Amber stay lit and still. Red flashes. */
export function StatusRobot({
  rag,
  title,
  size = 20,
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
      style={{ width: size, height: size }}
    >
      <img
        className="rpma-bot-img"
        src={SRC[state]}
        alt=""
        width={size * 2}
        height={size * 2}
        draggable={false}
      />
      <span role="tooltip" className="rpma-help-bubble is-left">
        {label}
      </span>
    </span>
  );
}

export function CoverTag({
  on,
  coverOn = "Cover",
  noCover = "No Cover",
}: {
  on: boolean;
  coverOn?: string;
  noCover?: string;
}) {
  const text = on
    ? `${coverOn} — this service is in scope and collecting. Live health is the status lamp, not this chip.`
    : `${noCover} — not in scope. The status lamp stays dim and this service does not move RAG.`;
  return (
    <span className={cn("rpma-cover-tag rpma-hovertip", on ? "is-on" : "is-off")}>
      {on ? coverOn : noCover}
      <span role="tooltip" className="rpma-help-bubble is-left">
        {text}
      </span>
    </span>
  );
}
