/**
 * Ticket-gated SLA clocks.
 *
 * Assure is live: robots follow collect (offline, failed backup, outdated scan).
 * SLA counters do NOT start on telemetry alone. A clock starts only when:
 *   1. the service / module is Amber or Red in the app, AND
 *   2. a matching ticket exists in Assure (Fact_Incident / Freshdesk).
 * Clock start = ticket OpenedAt (when it landed in Assure), not first collect blip.
 * Amber/red with no ticket = not a miss — badge "No ticket — clock not started".
 */
import { coverFromDetail } from "./cover";
import { scoreTicketSet, type TicketSlaPack } from "./ticket-sla";
import type { IndustryPillarKey } from "./sla-metrics";
import type { CustomerDetailPayload, FactIncidentRow } from "./types";

export const SLA_CLOCK_RULE =
  "SLA clocks start only when an amber/red alert has a ticket in Assure. Telemetry without a ticket is live status, not an SLA miss.";

const PILLAR_RE: Record<Exclude<IndustryPillarKey, "tickets">, RegExp> = {
  rmm: /\b(rmm|pulseway|server|workstation|offline|uptime|downtime|patch|iops|event log|windows event|disk|cpu)\b/i,
  cove: /\b(cove|backup|rpo|rto|recover|datto|cloud backup|restore)\b/i,
  epp: /\b(epp|bitdefender|gravityzone|malware|infect|endpoint protect|quarantine|signature|scan|antivirus|edr)\b/i,
  syspro: /\b(syspro|finsight|job log|day.?end|hotfix)\b/i,
  csp: /\b(microsoft 365|office 365|m365|o365|exchange|sharepoint|teams|azure ad|entra|outlook)\b/i,
};

export function classifyTicketPillar(row: FactIncidentRow): IndustryPillarKey {
  const code = String(row.moduleCode ?? "").toUpperCase().replace(/\s+/g, "");
  if (code === "RMM" || code === "PULSEWAY" || code === "INFRA") return "rmm";
  if (code === "COVE" || code === "BACKUP") return "cove";
  if (code === "EPP" || code === "BITDEFENDER" || code === "SECURITY") return "epp";
  if (code === "CSP" || code === "M365" || code === "O365" || code === "MICROSOFT365") return "csp";
  if (code === "SYSPRO") return "syspro";
  const blob = `${row.title ?? ""} ${row.businessImpact ?? ""} ${row.sourceSystem ?? ""}`;
  if (PILLAR_RE.cove.test(blob)) return "cove";
  if (PILLAR_RE.epp.test(blob)) return "epp";
  if (PILLAR_RE.csp.test(blob)) return "csp";
  if (PILLAR_RE.syspro.test(blob)) return "syspro";
  if (PILLAR_RE.rmm.test(blob)) return "rmm";
  return "tickets";
}

export function ticketsForPillar(
  data: CustomerDetailPayload,
  pillar: IndustryPillarKey,
): FactIncidentRow[] {
  const all = data.incidents ?? [];
  if (pillar === "tickets") return all;
  return all.filter((t) => classifyTicketPillar(t) === pillar);
}

/** True when this pillar currently has an amber/red live alert in the app. */
export function pillarHasLiveAlert(data: CustomerDetailPayload, pillar: IndustryPillarKey): boolean {
  const c = coverFromDetail(data);
  if (pillar === "rmm") {
    if (!c.rmm) return false;
    const off = data.rmm?.summary?.serverOffline ?? data.customer?.pulsewayServerOffline ?? 0;
    const ws = data.rmm?.summary?.workstationOffline ?? data.customer?.pulsewayWorkstationOffline ?? 0;
    const crit = data.rmm?.summary?.criticalAlerts ?? data.customer?.pulsewayCriticalAlerts ?? 0;
    const patch = data.customer?.pulsewayPatchMissing ?? 0;
    return off > 0 || ws > 0 || crit > 0 || patch > 0;
  }
  if (pillar === "cove") {
    if (!c.cove) return false;
    const fail = data.cove?.summary?.failedCount ?? data.customer?.coveFailedDeviceCount ?? 0;
    const stale = data.cove?.summary?.staleCount ?? data.customer?.coveStaleDeviceCount ?? 0;
    const rec = data.cove?.recovery?.testFailedCount ?? 0;
    return fail > 0 || stale > 0 || rec > 0;
  }
  if (pillar === "epp") {
    if (!c.epp) return false;
    const infected = data.customer?.bdInfectedCount ?? 0;
    const unmanaged = data.epp?.summary?.unmanagedCount ?? 0;
    const outdated = (data.epp?.devices ?? []).some(
      (d) => d.productOutdated === true || d.signatureOutdated === true,
    );
    return infected > 0 || unmanaged > 0 || outdated;
  }
  if (pillar === "syspro") {
    if (!c.syspro) return false;
    return (data.customer?.sysproJobErrorCount ?? 0) > 0 || (data.customer?.sysproDtrVarianceLines ?? 0) > 0;
  }
  if (pillar === "csp") {
    // M365 robots stay Green from posture. A ticket in Assure is the alert.
    return false;
  }
  return (data.incidents ?? []).some((i) => !/closed|cancelled|resolved/i.test(String(i.status ?? "")));
}

export type TicketGatedSla = {
  liveAlert: boolean;
  ticketed: boolean;
  waitingForTicket: boolean;
  clockStarted: boolean;
  tickets: FactIncidentRow[];
  pack: TicketSlaPack;
  actualPct: number | null;
  actualLabel: string;
  measured: boolean;
  tone: "green" | "amber" | "red" | "default";
  badge?: string;
};

export function ticketGatedSla(
  data: CustomerDetailPayload,
  pillar: IndustryPillarKey,
): TicketGatedSla {
  const liveAlert = pillarHasLiveAlert(data, pillar);
  const tickets = ticketsForPillar(data, pillar);
  const pack = scoreTicketSet(tickets, data.slaPolicies);
  const ticketed = tickets.length > 0;
  const waitingForTicket = liveAlert && !ticketed;
  const clockStarted = ticketed && (liveAlert || pack.last30d > 0 || pack.open > 0);

  if (waitingForTicket) {
    return {
      liveAlert,
      ticketed: false,
      waitingForTicket: true,
      clockStarted: false,
      tickets,
      pack,
      actualPct: null,
      actualLabel: "Amber/red live — no matching ticket in Assure. Clock not started.",
      measured: false,
      tone: "default",
      badge: "No ticket — clock not started",
    };
  }

  if (!ticketed) {
    return {
      liveAlert,
      ticketed: false,
      waitingForTicket: false,
      clockStarted: false,
      tickets,
      pack,
      actualPct: null,
      actualLabel: "No ticketed alert — SLA clock idle.",
      measured: false,
      tone: "default",
    };
  }

  const pct = pack.overallPct;
  const breaches = pack.breaches;
  const tone: TicketGatedSla["tone"] =
    breaches > 0 || (pct != null && pct < 90) ? "red" : "green";
  const label = [
    `${pack.last30d || pack.total} ticket(s) in Assure`,
    pack.open ? `${pack.open} open` : null,
    pack.responsePct != null ? `ack ${pack.responsePct}%` : null,
    pack.resolvePct != null ? `restore ${pack.resolvePct}%` : null,
    breaches ? `${breaches} breach` : "inside clock",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    liveAlert,
    ticketed: true,
    waitingForTicket: false,
    clockStarted: true,
    tickets,
    pack,
    actualPct: pct ?? (breaches > 0 ? 0 : 100),
    actualLabel: label,
    measured: true,
    tone,
  };
}
