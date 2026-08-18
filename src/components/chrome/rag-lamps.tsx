import type { LiveTone } from "@/lib/data/live-status";

/** Three-lamp RAG button: Red / Amber / Green. Active lamp glows. */
export function RagLamps({ tone }: { tone?: LiveTone | null }) {
  const t = tone ?? "Off";
  return (
    <span className="rpma-emp-rag" aria-label={t} title={t}>
      <i className={t === "Red" ? "is-red is-on" : "is-red"} />
      <i className={t === "Amber" ? "is-amber is-on" : "is-amber"} />
      <i className={t === "Green" ? "is-green is-on" : "is-green"} />
    </span>
  );
}
