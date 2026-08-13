/**
 * Multi-pillar cover model for RPM Assure.
 * Legs: SYSPRO · RMM (Pulseway) · Cyber Backup (Cove) · EPP · M365.
 *
 * SAME RULE for every customer and every pillar:
 *   live warehouse evidence (devices / operators / licenses) → Covered
 *   explicit AmsConfig flag false → No Cover (hard off, even if stray rows exist)
 *   map-only / flag-true / empty snapshot → No Cover until data arrives
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

/** Explicit false = hard No Cover. Otherwise only live evidence counts. */
function resolvePillar(
  evidence: boolean,
  flag: boolean | null | undefined,
): boolean {
  if (flag === false) return false;
  return evidence;
}

/**
 * Infer cover from live data. Same function for every customer.
 */
export function inferCustomerCover(input: {
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
  cspUserCount?: number | null;
  cspLicenseCount?: number | null;
}): CustomerCover {
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

  // Devices / seats only — a map row with zero snapshot is No Cover
  const rmmEvidence = (Number(input.pulsewayDeviceCount) || 0) > 0;
  const coveEvidence = (Number(input.coveDeviceCount) || 0) > 0;
  const eppEvidence = (Number(input.eppDeviceCount) || 0) > 0;
  const cspEvidence =
    (Number(input.cspUserCount) || 0) > 0 ||
    (Number(input.cspLicenseCount) || 0) > 0;

  return {
    syspro: resolvePillar(sysproEvidence, input.pillarSyspro),
    rmm: resolvePillar(rmmEvidence, input.pillarPulseway),
    cove: resolvePillar(coveEvidence, input.pillarCove),
    epp: resolvePillar(eppEvidence, input.pillarEpp),
    csp: resolvePillar(cspEvidence, input.pillarCsp),
  };
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