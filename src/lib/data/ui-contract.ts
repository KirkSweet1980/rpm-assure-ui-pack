/**
 * Production UI paint rules. Chrome, SLA lamps, and the tenant header
 * must call these — do not re-infer cover or coerce Off to Green in the view.
 *
 * 1. Payload.cover from live-portfolio is the only cover (AmsConfig false = hard off).
 * 2. No Cover → RAG Off (grey, no flash). Never invent Green.
 * 3. Microsoft 365 on cover is always Green until it is on a signed SLA.
 * 5. Agent Status = heartbeat. Agent Sync = last job. Do not mix them.
 * 6. Helpdesk auto-ticket-on-RAG is not live. Ticketed SLA clocks stay Off until armed.
 */
import type { CustomerCover } from "./cover";

/** Flip to true when Assure logs a Freshdesk ticket on Amber/Red. Until then, no ticket SLA RAG. */
export const HELPDESK_TICKET_SLA_ARMED = false;

export type PaintTone = "Green" | "Amber" | "Red" | "Off";

export function preferPayloadCover<T extends { cover?: CustomerCover | null }>(
  payload: T | null | undefined,
  fallback: () => CustomerCover,
): CustomerCover {
  const c = payload?.cover;
  if (c && typeof c.syspro === "boolean" && typeof c.rmm === "boolean") return c;
  return fallback();
}

/** Module / service lamp. Uncovered is always Off. */
export function paintRag(
  cover: boolean,
  rag: PaintTone | string | null | undefined,
  opts?: { csp?: boolean },
): PaintTone {
  if (!cover) return "Off";
  if (opts?.csp) return "Green";
  const t = String(rag ?? "Off");
  if (t === "Red" || t === "Amber" || t === "Green") return t;
  return "Green";
}

export function tenantHeaderRag(dormant: boolean, ecoRag: PaintTone | string | undefined): PaintTone {
  if (dormant) return "Off";
  const t = String(ecoRag ?? "Off");
  if (t === "Red" || t === "Amber" || t === "Green" || t === "Off") return t as PaintTone;
  return "Off";
}
