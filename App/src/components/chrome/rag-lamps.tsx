import type { LiveTone } from "@/lib/data/live-status";
import { StatusRobot } from "@/components/ui/status-robot";

/** Single illuminated RAG disc. Green/Amber glow; Red flashes. */
export function RagLamps({ tone, size = 14 }: { tone?: LiveTone | null; size?: number }) {
  const t = tone ?? "Off";
  return (
    <span className="rpma-emp-rag" aria-label={t} title={t}>
      <StatusRobot rag={t} size={size} />
    </span>
  );
}
