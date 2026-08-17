import type { FactIncidentRow } from "./types";
import { scoreTicketSet } from "./ticket-sla";

export type TicketPillar = "syspro" | "rmm" | "cove" | "epp" | "csp" | "ams" | "eco" | "tickets";
export type TicketBucket = "open" | "resolved" | "closed";

export function isOpenIncident(i: FactIncidentRow): boolean {
  return ticketBucket(i) === "open";
}

export function ticketBucket(i: FactIncidentRow): TicketBucket {
  const s = String(i.status ?? "").toLowerCase();
  if (/closed|cancelled|canceled/.test(s)) return "closed";
  if (/resolved/.test(s)) return "resolved";
  return "open";
}

export function ticketsInBucket(
  incidents: FactIncidentRow[] | null | undefined,
  bucket: TicketBucket,
): FactIncidentRow[] {
  return (incidents ?? []).filter((i) => ticketBucket(i) === bucket);
}

export function ticketsForPillar(
  incidents: FactIncidentRow[] | null | undefined,
  pillar: TicketPillar,
): FactIncidentRow[] {
  const rows = incidents ?? [];
  if (pillar === "eco" || pillar === "ams" || pillar === "tickets") return rows;
  const key = pillar.toUpperCase();
  const hit = rows.filter((i) => (i as { moduleCode?: string | null }).moduleCode?.toUpperCase() === key);
  return hit.length ? hit : rows;
}

export function ticketStats(incidents: FactIncidentRow[] | null | undefined) {
  const rows = incidents ?? [];
  const open = rows.filter((i) => ticketBucket(i) === "open");
  const resolved = rows.filter((i) => ticketBucket(i) === "resolved");
  const closed = rows.filter((i) => ticketBucket(i) === "closed");
  const sla = scoreTicketSet(rows);
  return {
    total: rows.length,
    open: open.length,
    resolved: resolved.length,
    closed: closed.length,
    major: open.filter((i) => i.isMajor).length,
    breaches: sla.breaches,
    sla,
  };
}

export function ticketHref(code: string, bucket?: TicketBucket): string {
  const base = `/customers/${encodeURIComponent(code)}/tickets`;
  if (!bucket) return base;
  return `${base}/${bucket}`;
}
