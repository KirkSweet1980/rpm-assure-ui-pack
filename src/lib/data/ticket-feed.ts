import type { FactIncidentRow } from "./types";

export type TicketPillar = "syspro" | "rmm" | "cove" | "epp" | "csp" | "ams" | "eco";

export function isOpenIncident(i: FactIncidentRow): boolean {
  return !/closed|cancelled/i.test(i.status || "");
}

export function ticketsForPillar(
  incidents: FactIncidentRow[] | null | undefined,
  pillar: TicketPillar,
): FactIncidentRow[] {
  const rows = incidents ?? [];
  if (pillar === "eco" || pillar === "ams") return rows;
  const key = pillar.toUpperCase();
  const hit = rows.filter((i) => (i as { moduleCode?: string | null }).moduleCode?.toUpperCase() === key);
  return hit.length ? hit : rows;
}

export function ticketStats(incidents: FactIncidentRow[] | null | undefined) {
  const rows = incidents ?? [];
  const open = rows.filter(isOpenIncident);
  return {
    total: rows.length,
    open: open.length,
    major: open.filter((i) => i.isMajor).length,
    closed: rows.length - open.length,
    breaches:
      rows.filter((i) => i.responseSlaMet === false || i.resolveSlaMet === false).length,
  };
}
