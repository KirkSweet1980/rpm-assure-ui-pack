/**
 * Production UI paint rules. Chrome, SLA lamps, and the tenant header
 * must call these — do not re-infer cover or coerce Off to Green in the view.
 *
 * 1. Payload.cover from live-portfolio is the only cover (AmsConfig false = hard off).
 * 2. No Cover → RAG Off (grey, no flash). Never invent Green.
 * 3. Microsoft 365 on cover is always Green until it is on a signed SLA.
 * 4. SLA is unmeasured until a ticket exists for that alert. Do not score 100%.
 * 5. Agent Status = heartbeat. Agent Sync = last job. Do not mix them.
 */
import type { CustomerCover } from "./cover";

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
