/**
 * Multi-pillar cover model for RPM Assure.
 * Legs: SYSPRO · RMM (Pulseway) · Cloud Backup (Cove) · EPP · M365.
 *
 * ONE RULE for list, rail, modules, reports, and Exco:
 *   live warehouse evidence OR an active vendor map OR explicit pillar flag
 *     → Covered (green)
 *   none of the above → No Cover
 * Exceptions:
 *   SYSPRO: PillarSyspro = false is a hard deferred off.
 *   EPP: endpoints only (a map with 0 endpoints is No Cover).
 *
 * Uncovered legs stay in the menu and show "No Cover". They do not drive estate health / SLA.
 */

export type PillarId = "syspro" | "rmm" | "cove" | "epp" | "csp";

export type CustomerCover = {
  syspro: boolean;
  rmm: boolean;
  cove: boolean;
  epp?: boolean;
  csp?: boolean;
};

export const NO_COVER = "No Cover";
export const COVERED = "Covered";

export function coverLabel(on: boolean): string {
  return on ? COVERED : NO_COVER;
}

function hasText(v: string | null | undefined): boolean {
  return Boolean(v != null && String(v).trim());
}

/** Vendor pillars: evidence or flag-true = Covered. Stale AmsConfig false cannot hide a map or live rows. */
function resolveVendor(
  evidence: boolean,
  flag: boolean | null | undefined,
): boolean {
  if (evidence) return true;
  return flag === true;
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
  coveDeviceCount?: number | null;
  coveMapped?: boolean | null;
  covePartnerName?: string | null;
  eppDeviceCount?: number | null;
  eppMapped?: boolean | null;
  cspUserCount?: number | null;
  cspLicenseCount?: number | null;
  cspMapped?: boolean | null;
};

/**
 * Infer cover from live data + maps. Same function for every customer and every surface.
 */
export function inferCustomerCover(input: CoverInput): CustomerCover {
  const sysproEvidence =
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
    Boolean(input.pulsewayMapped) ||
    hasText(input.pulsewayOrgName);
  const coveEvidence =
    (Number(input.coveDeviceCount) || 0) > 0 ||
    Boolean(input.coveMapped) ||
    hasText(input.covePartnerName);
  const eppEvidence = (Number(input.eppDeviceCount) || 0) > 0;
  const cspEvidence =
    (Number(input.cspUserCount) || 0) > 0 ||
    (Number(input.cspLicenseCount) || 0) > 0 ||
    Boolean(input.cspMapped);

  return {
    syspro: input.pillarSyspro === false ? false : sysproEvidence || input.pillarSyspro === true,
    rmm: resolveVendor(rmmEvidence, input.pillarPulseway),
    cove: resolveVendor(coveEvidence, input.pillarCove),
    epp: eppEvidence,
    csp: resolveVendor(cspEvidence, input.pillarCsp),
  };
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
}): CustomerCover {
  const c = data.customer;
  const rmmCount =
    data.rmm?.summary?.deviceCount ?? data.rmm?.devices?.length ?? c?.pulsewayDeviceCount ?? 0;
  const coveCount =
    data.cove?.summary?.deviceCount ?? data.cove?.devices?.length ?? c?.coveDeviceCount ?? 0;
  const eppCount =
    data.epp?.summary?.deviceCount ?? data.epp?.devices?.length ?? c?.eppDeviceCount ?? 0;
  const cspUsers =
    data.csp?.summary?.licensedUserCount ?? data.csp?.users?.length ?? c?.cspUserCount ?? 0;
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
    coveDeviceCount: coveCount,
    coveMapped: Boolean(c?.coveMapped) || (data.cove?.mapping?.length ?? 0) > 0,
    covePartnerName: c?.covePartnerName,
    eppDeviceCount: eppCount,
    eppMapped: false,
    cspUserCount: cspUsers,
    cspLicenseCount: data.csp?.licenses?.length ?? c?.cspLicenseSkuCount ?? c?.cspLicenseCount ?? 0,
    cspMapped: Boolean(c?.cspMapped) || data.csp?.enabled === true,
  });
}

export function isPillarCovered(
  cover: CustomerCover | null | undefined,
  pillar: PillarId,
): boolean {
  if (!cover) return false;
  return cover[pillar] === true;
}

export function anyCover(c: CustomerCover): boolean {
  return c.syspro || c.rmm || c.cove || Boolean(c.epp) || Boolean(c.csp);
}

export function forceSysproCoverIfEvidence(
  cover: CustomerCover,
  evidence: boolean,
): CustomerCover {
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
  scores: { syspro?: number | null; rmm?: number | null; cove?: number | null },
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
  if (parts.length === 0) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
}
