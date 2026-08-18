/**
 * Multi-pillar cover model for RPM Assure.
 * Legs: SYSPRO · RMM (Pulseway) · Cloud Backup (Cove) · EPP · M365.
 *
 * ONE RULE for list, rail, modules, reports, and Exco:
 *   live warehouse rows OR an active vendor map (partner / org / tenant)
 *     → Covered
 *   AmsConfig pillar = false is a hard off.
 *   SYSPRO: a live Edge agent is required. Uninstall / silent agent → No Cover.
 *   Leftover operators / last import is not cover after the agent is gone.
 *   M365 (CSP) is visibility only — not scored in assurance / SLA.
 *
 * Uncovered legs stay in the menu and show "No Cover". They do not drive estate health / SLA.
 */

export type PillarId = "syspro" | "rmm" | "cove" | "epp" | "csp" | "tickets";

export type CustomerCover = {
  syspro: boolean;
  rmm: boolean;
  cove: boolean;
  epp?: boolean;
  csp?: boolean;
  tickets?: boolean;
  /** Freshdesk-only / no agent — visible, not scored */
  dormant?: boolean;
};

export const NO_COVER = "No Cover";
export const COVERED = "Cover";

export function coverLabel(on: boolean): string {
  return on ? COVERED : NO_COVER;
}

function hasText(v: string | null | undefined): boolean {
  return Boolean(v != null && String(v).trim());
}

function firstPositive(
  ...vals: Array<number | null | undefined>
): number {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/** Vendor pillars: live rows or an active map. Flag false is a hard off. */
function resolveVendor(
  evidence: boolean,
  mapped: boolean | null | undefined,
  flag: boolean | null | undefined,
): boolean {
  if (flag === false) return false;
  return evidence || mapped === true;
}

export type CoverInput = {
  pillarSyspro?: boolean | null;
  pillarPulseway?: boolean | null;
  pillarCove?: boolean | null;
  pillarEpp?: boolean | null;
  pillarCsp?: boolean | null;
  hasAmsConfig?: boolean | null;
  sqlInstanceName?: string | null;
  operatorCount?: number | null;
  activeUserCount?: number | null;
  sysproLastImportAt?: string | null;
  sysproJobErrorCount?: number | null;
  sysproDtrVarianceLines?: number | null;
  sysproHasLicense?: boolean | null;
  sysproHasVersion?: boolean | null;
  sysproHotfixCount?: number | null;
  pulsewayOrgName?: string | null;
  pulsewayDeviceCount?: number | null;
  pulsewayMapped?: boolean | null;
  rmmIopsCount?: number | null;
  rmmEventCount?: number | null;
  coveDeviceCount?: number | null;
  coveMapped?: boolean | null;
  covePartnerName?: string | null;
  eppDeviceCount?: number | null;
  eppMapped?: boolean | null;
  eppPolicyCount?: number | null;
  eppIncidentCount?: number | null;
  cspUserCount?: number | null;
  cspLicenseCount?: number | null;
  cspMapped?: boolean | null;
  ticketCount?: number | null;
  ticketsMapped?: boolean | null;
  /** Registered Assure agents — wakes a tickets-only tenant */
  agentCount?: number | null;
  /**
   * Live SYSPRO Edge agent (heartbeat recent, not UNINSTALLED).
   * false = drop SYSPRO cover even if warehouse leftovers remain.
   * true  = SYSPRO is in scope.
   * unset = not queried — fall back to warehouse evidence.
   */
  sysproAgentLive?: boolean | null;
};

/**
 * Infer cover from live data + maps. Same function for every customer and every surface.
 */
export function inferCustomerCover(input: CoverInput): CustomerCover {
  const sysproEvidence =
    hasText(input.sqlInstanceName) ||
    (Number(input.operatorCount) || 0) > 0 ||
    (Number(input.activeUserCount) || 0) > 0 ||
    hasText(input.sysproLastImportAt) ||
    (Number(input.sysproJobErrorCount) || 0) > 0 ||
    (Number(input.sysproDtrVarianceLines) || 0) > 0 ||
    Boolean(input.sysproHasLicense) ||
    Boolean(input.sysproHasVersion) ||
    (Number(input.sysproHotfixCount) || 0) > 0;

  const rmmEvidence =
    (Number(input.pulsewayDeviceCount) || 0) > 0 ||
    (Number(input.rmmIopsCount) || 0) > 0 ||
    (Number(input.rmmEventCount) || 0) > 0 ||
    (Number(input.agentCount) || 0) > 0;
  const coveEvidence = (Number(input.coveDeviceCount) || 0) > 0;
  const eppEvidence =
    (Number(input.eppDeviceCount) || 0) > 0 ||
    (Number(input.eppPolicyCount) || 0) > 0 ||
    (Number(input.eppIncidentCount) || 0) > 0;
  const cspEvidence =
    (Number(input.cspUserCount) || 0) > 0 ||
    (Number(input.cspLicenseCount) || 0) > 0;

  const sysproFromData = sysproEvidence || input.pillarSyspro === true;
  const syspro =
    input.pillarSyspro === false
      ? false
      : input.sysproAgentLive === false
        ? false
        : input.sysproAgentLive === true
          ? true
          : sysproFromData;

  const out: CustomerCover = {
    syspro,
    rmm: resolveVendor(rmmEvidence, input.pulsewayMapped, input.pillarPulseway),
    cove: resolveVendor(coveEvidence, input.coveMapped, input.pillarCove),
    epp: resolveVendor(eppEvidence, input.eppMapped, input.pillarEpp),
    csp: resolveVendor(cspEvidence, input.cspMapped, input.pillarCsp),
    tickets: false,
  };
  const dormant = isDormantCover(out);
  out.dormant = dormant;
  out.tickets = !dormant;
  return out;
}

/** Portfolio / list row → same cover rule as the customer page. */
export function coverFromRow(row: {
  pillarSyspro?: boolean | null;
  pillarPulseway?: boolean | null;
  pillarCove?: boolean | null;
  pillarEpp?: boolean | null;
  pillarCsp?: boolean | null;
  sqlInstanceName?: string | null;
  operatorCount?: number | null;
  activeUserCount?: number | null;
  lastImportAt?: string | null;
  sysproJobErrorCount?: number | null;
  sysproDtrVarianceLines?: number | null;
  pulsewayOrgName?: string | null;
  pulsewayDeviceCount?: number | null;
  pulsewayMapped?: boolean | null;
  coveDeviceCount?: number | null;
  coveMapped?: boolean | null;
  eppDeviceCount?: number | null;
  eppMapped?: boolean | null;
  cspUserCount?: number | null;
  cspLicenseSkuCount?: number | null;
  cspLicenseCount?: number | null;
  cspMapped?: boolean | null;
  ticketCount?: number | null;
  ticketsMapped?: boolean | null;
  agentCount?: number | null;
  sysproAgentLive?: boolean | null;
}): CustomerCover {
  return inferCustomerCover({
    pillarSyspro: row.pillarSyspro,
    pillarPulseway: row.pillarPulseway,
    pillarCove: row.pillarCove,
    pillarEpp: row.pillarEpp,
    pillarCsp: row.pillarCsp,
    sqlInstanceName: row.sqlInstanceName,
    operatorCount: row.operatorCount,
    activeUserCount: row.activeUserCount,
    sysproLastImportAt: row.lastImportAt,
    sysproJobErrorCount: row.sysproJobErrorCount,
    sysproDtrVarianceLines: row.sysproDtrVarianceLines,
    pulsewayOrgName: row.pulsewayOrgName,
    pulsewayDeviceCount: row.pulsewayDeviceCount,
    pulsewayMapped: row.pulsewayMapped,
    coveDeviceCount: row.coveDeviceCount,
    coveMapped: row.coveMapped,
    eppDeviceCount: row.eppDeviceCount,
    eppMapped: row.eppMapped,
    cspUserCount: row.cspUserCount,
    cspLicenseCount: row.cspLicenseSkuCount ?? row.cspLicenseCount,
    cspMapped: row.cspMapped,
    ticketCount: row.ticketCount,
    ticketsMapped: row.ticketsMapped,
    agentCount: row.agentCount,
    sysproAgentLive: row.sysproAgentLive,
  });
}

/** Detail payload → same cover rule as the customer list. */
export function coverFromDetail(data: {
  customer?: {
    pillarSyspro?: boolean | null;
    pillarPulseway?: boolean | null;
    pillarCove?: boolean | null;
    pillarEpp?: boolean | null;
    pillarCsp?: boolean | null;
    sqlInstanceName?: string | null;
    operatorCount?: number | null;
    activeUserCount?: number | null;
    lastImportAt?: string | null;
    sysproJobErrorCount?: number | null;
    sysproDtrVarianceLines?: number | null;
    pulsewayOrgName?: string | null;
    pulsewayDeviceCount?: number | null;
    pulsewayMapped?: boolean | null;
    coveDeviceCount?: number | null;
    coveMapped?: boolean | null;
    covePartnerName?: string | null;
    eppDeviceCount?: number | null;
    eppMapped?: boolean | null;
    cspUserCount?: number | null;
    cspLicenseSkuCount?: number | null;
    cspLicenseCount?: number | null;
    cspMapped?: boolean | null;
    ticketCount?: number | null;
    ticketsMapped?: boolean | null;
    agentCount?: number | null;
    sysproAgentLive?: boolean | null;
  } | null;
  license?: unknown;
  sysproVersion?: unknown;
  hotfixes?: unknown[] | null;
  rmm?: {
    summary?: { deviceCount?: number | null } | null;
    devices?: unknown[] | null;
    mapping?: unknown[] | null;
    pulsewayOrgName?: string | null;
  } | null;
  cove?: {
    summary?: { deviceCount?: number | null } | null;
    devices?: unknown[] | null;
    mapping?: unknown[] | null;
  } | null;
  epp?: {
    summary?: { deviceCount?: number | null } | null;
    devices?: unknown[] | null;
  } | null;
  csp?: {
    summary?: { licensedUserCount?: number | null } | null;
    users?: unknown[] | null;
    licenses?: unknown[] | null;
    enabled?: boolean | null;
  } | null;
  incidents?: unknown[] | null;
}): CustomerCover {
  const c = data.customer;
  const rmmCount = firstPositive(
    data.rmm?.summary?.deviceCount,
    data.rmm?.devices?.length,
    c?.pulsewayDeviceCount,
  );
  const coveCount = firstPositive(
    data.cove?.summary?.deviceCount,
    data.cove?.devices?.length,
    c?.coveDeviceCount,
  );
  const eppCount = firstPositive(
    data.epp?.summary?.deviceCount,
    data.epp?.devices?.length,
    c?.eppDeviceCount,
  );
  const cspUsers = firstPositive(
    data.csp?.summary?.licensedUserCount,
    data.csp?.users?.length,
    c?.cspUserCount,
  );
  return inferCustomerCover({
    pillarSyspro: c?.pillarSyspro,
    pillarPulseway: c?.pillarPulseway,
    pillarCove: c?.pillarCove,
    pillarEpp: c?.pillarEpp,
    pillarCsp: c?.pillarCsp,
    sqlInstanceName: c?.sqlInstanceName,
    operatorCount: c?.operatorCount,
    activeUserCount: c?.activeUserCount,
    sysproLastImportAt: c?.lastImportAt,
    sysproJobErrorCount: c?.sysproJobErrorCount,
    sysproDtrVarianceLines: c?.sysproDtrVarianceLines,
    sysproHasLicense: Boolean(data.license),
    sysproHasVersion: Boolean(data.sysproVersion),
    sysproHotfixCount: (data as { sysproHotfixes?: unknown[] | null }).sysproHotfixes?.length ?? data.hotfixes?.length ?? 0,
    pulsewayOrgName: data.rmm?.pulsewayOrgName ?? c?.pulsewayOrgName,
    pulsewayDeviceCount: rmmCount,
    pulsewayMapped: Boolean(c?.pulsewayMapped) || (data.rmm?.mapping?.length ?? 0) > 0,
    rmmIopsCount: (data.rmm as { agentIops?: unknown[] } | null | undefined)?.agentIops?.length ?? 0,
    rmmEventCount: (data.rmm as { windowsEvents?: unknown[] } | null | undefined)?.windowsEvents?.length ?? 0,
    coveDeviceCount: coveCount,
    coveMapped: Boolean(c?.coveMapped) || (data.cove?.mapping?.length ?? 0) > 0,
    covePartnerName: c?.covePartnerName,
    eppDeviceCount: eppCount,
    eppMapped: Boolean(c?.eppMapped) || (data.epp?.devices?.length ?? 0) > 0,
    eppPolicyCount: (data.epp as { policies?: unknown[] } | null | undefined)?.policies?.length ?? 0,
    eppIncidentCount: (data.epp as { incidents?: unknown[] } | null | undefined)?.incidents?.length ?? 0,
    cspUserCount: cspUsers,
    cspLicenseCount: data.csp?.licenses?.length ?? c?.cspLicenseSkuCount ?? c?.cspLicenseCount ?? 0,
    cspMapped: Boolean(c?.cspMapped) || data.csp?.enabled === true,
    ticketCount: firstPositive(data.incidents?.length, c?.ticketCount),
    ticketsMapped: Boolean(c?.ticketsMapped) || (data.incidents?.length ?? 0) > 0,
    agentCount: firstPositive(
      (data as { agents?: unknown[] | null }).agents?.length,
      c?.agentCount,
    ),
    sysproAgentLive: c?.sysproAgentLive ?? null,
  });
}

export function isPillarCovered(
  cover: CustomerCover | null | undefined,
  pillar: PillarId,
): boolean {
  if (!cover) return false;
  return cover[pillar] === true;
}

export const DORMANT_SUMMARY =
  "Dormant — Freshdesk only. No agent and no service cover. Tickets stay visible. SLA and RAG stay off until an agent or a covered service lands.";

export function isDormantCover(c: CustomerCover | null | undefined): boolean {
  if (!c) return true;
  return !anyCover(c);
}

export function applyDormantCover(cover: CustomerCover): CustomerCover {
  const dormant = isDormantCover(cover);
  return { ...cover, dormant, tickets: !dormant };
}

export function anyCover(c: CustomerCover): boolean {
  return c.syspro || c.rmm || c.cove || Boolean(c.epp) || Boolean(c.csp);
}

export function forceSysproCoverIfEvidence(
  cover: CustomerCover,
  evidence: boolean,
  sysproAgentLive?: boolean | null,
): CustomerCover {
  if (sysproAgentLive === false) return { ...cover, syspro: false };
  if (evidence && !cover.syspro) return { ...cover, syspro: true };
  return cover;
}

export function coverSummary(c: CustomerCover): string {
  const on: string[] = [];
  if (c.syspro) on.push("SYSPRO");
  if (c.rmm) on.push("RMM");
  if (c.cove) on.push("Backup");
  if (c.epp) on.push("EPP");
  if (c.csp) on.push("M365");
  if (c.tickets) on.push("Tickets");
  if (on.length === 0) return "No service cover configured";
  return `Cover: ${on.join(" · ")}`;
}

export function coveredLegCount(c: CustomerCover): number {
  return (
    (c.syspro ? 1 : 0) +
    (c.rmm ? 1 : 0) +
    (c.cove ? 1 : 0) +
    (c.epp ? 1 : 0) +
    (c.csp ? 1 : 0)
  );
}

export function averageCoveredScores(
  cover: CustomerCover,
  scores: {
    syspro?: number | null;
    rmm?: number | null;
    cove?: number | null;
    epp?: number | null;
    tickets?: number | null;
  },
): number | null {
  const parts: number[] = [];
  if (cover.syspro && scores.syspro != null && Number.isFinite(scores.syspro)) {
    parts.push(Number(scores.syspro));
  }
  if (cover.rmm && scores.rmm != null && Number.isFinite(scores.rmm)) {
    parts.push(Number(scores.rmm));
  }
  if (cover.cove && scores.cove != null && Number.isFinite(scores.cove)) {
    parts.push(Number(scores.cove));
  }
  if (cover.epp && scores.epp != null && Number.isFinite(scores.epp)) {
    parts.push(Number(scores.epp));
  }
  if (cover.tickets && scores.tickets != null && Number.isFinite(scores.tickets)) {
    parts.push(Number(scores.tickets));
  }
  if (parts.length === 0) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
}
