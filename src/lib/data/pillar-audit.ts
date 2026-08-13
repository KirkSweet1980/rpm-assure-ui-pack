/**
 * P1 — Pillar cover consistency audit.
 * Compares cover flags (UI "Covered" / "No Cover") to warehouse evidence.
 * mismatch = UI would lie (Covered with no data, or No Cover with data).
 */

import type { CustomerCover, PortfolioRow } from "./types";
import { inferCustomerCover } from "./cover";

export type PillarKey = "syspro" | "rmm" | "cove" | "epp" | "csp";

export type PillarAuditCell = {
  covered: boolean;
  evidence: boolean;
  /** covered XOR evidence — needs ops attention */
  mismatch: boolean;
  note: string;
};

export type PillarAuditRow = {
  customerCode: string;
  displayName: string;
  syspro: PillarAuditCell;
  rmm: PillarAuditCell;
  cove: PillarAuditCell;
  epp: PillarAuditCell;
  csp: PillarAuditCell;
  mismatchCount: number;
};

export type PillarAuditSummary = {
  generatedAt: string;
  customerCount: number;
  mismatchCustomerCount: number;
  mismatchCellCount: number;
  byPillar: Record<
    PillarKey,
    { covered: number; evidence: number; mismatch: number }
  >;
  rows: PillarAuditRow[];
};

function cell(covered: boolean, evidence: boolean, okNote: string, badCover: string, badNone: string): PillarAuditCell {
  const mismatch = covered !== evidence;
  let note = okNote;
  if (covered && !evidence) note = badCover;
  if (!covered && evidence) note = badNone;
  if (!covered && !evidence) note = "No Cover (no data)";
  if (covered && evidence) note = okNote;
  return { covered, evidence, mismatch, note };
}

export function evidenceFromRow(row: PortfolioRow): Record<PillarKey, boolean> {
  const syspro =
    Boolean(row.sqlInstanceName?.trim()) ||
    (row.operatorCount ?? 0) > 0 ||
    (row.activeUserCount ?? 0) > 0 ||
    Boolean(row.lastImportAt) ||
    (row.sysproJobErrorCount ?? 0) > 0 ||
    (row.sysproDtrVarianceLines ?? 0) > 0;

  const rmm =
    (row.pulsewayDeviceCount ?? 0) > 0 ||
    Boolean(row.pulsewayOrgName?.trim()) ||
    (row.pulsewayOnlineCount ?? 0) > 0 ||
    (row.pulsewayOfflineCount ?? 0) > 0;

  const cove = (row.coveDeviceCount ?? 0) > 0;

  const epp = (row.eppDeviceCount ?? 0) > 0;

  // CSP: warehouse evidence (users / SKUs / seats) or explicit cover flags
  const csp =
    (row.cspUserCount ?? 0) > 0 ||
    (row.cspLicenseSkuCount ?? 0) > 0 ||
    (row.cspTotalSeats ?? 0) > 0 ||
    row.cover?.csp === true ||
    row.pillarCsp === true;

  return { syspro, rmm, cove, epp, csp };
}

export function resolveCoverForRow(row: PortfolioRow): CustomerCover {
  if (row.cover) return row.cover;
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
    pulsewayMapped: (row.pulsewayDeviceCount ?? 0) > 0 || Boolean(row.pulsewayOrgName),
    coveDeviceCount: row.coveDeviceCount,
    coveMapped: (row.coveDeviceCount ?? 0) > 0,
    eppDeviceCount: row.eppDeviceCount ?? 0,
  });
}

export function auditPortfolioRows(rows: PortfolioRow[]): PillarAuditSummary {
  const auditRows: PillarAuditRow[] = [];
  const byPillar: PillarAuditSummary["byPillar"] = {
    syspro: { covered: 0, evidence: 0, mismatch: 0 },
    rmm: { covered: 0, evidence: 0, mismatch: 0 },
    cove: { covered: 0, evidence: 0, mismatch: 0 },
    epp: { covered: 0, evidence: 0, mismatch: 0 },
    csp: { covered: 0, evidence: 0, mismatch: 0 },
  };

  for (const row of rows) {
    const cov = resolveCoverForRow(row);
    const ev = evidenceFromRow(row);

    // SYSPRO hard-off is intentional No Cover even if residual data exists
    const sysproEvidence =
      row.pillarSyspro === false ? false : ev.syspro;

    const syspro = cell(
      cov.syspro === true,
      sysproEvidence,
      "Covered + data",
      "Covered flag but no SYSPRO warehouse data",
      "Data present but No Cover (check PillarSyspro / mapping)",
    );
    if (row.pillarSyspro === false && ev.syspro) {
      syspro.mismatch = false;
      syspro.note = "No Cover (hard-off) — residual data ignored";
    }

    const rmm = cell(
      cov.rmm === true,
      ev.rmm,
      "Covered + RMM devices",
      "Covered but 0 Pulseway devices",
      "Pulseway devices but No Cover",
    );
    const cove = cell(
      cov.cove === true,
      ev.cove,
      "Covered + Cove devices",
      "Covered but 0 Cove devices",
      "Cove devices but No Cover",
    );
    const epp = cell(
      cov.epp === true,
      ev.epp,
      "Covered + EPP endpoints",
      "Covered but 0 EPP endpoints",
      "EPP endpoints but No Cover",
    );
    const csp = cell(
      cov.csp === true,
      ev.csp,
      "Covered (M365)",
      "Covered but no CSP signal",
      "CSP signal but No Cover",
    );

    const cells = { syspro, rmm, cove, epp, csp };
    let mismatchCount = 0;
    (Object.keys(cells) as PillarKey[]).forEach((k) => {
      const c = cells[k];
      if (c.covered) byPillar[k].covered++;
      if (c.evidence) byPillar[k].evidence++;
      if (c.mismatch) {
        byPillar[k].mismatch++;
        mismatchCount++;
      }
    });

    auditRows.push({
      customerCode: row.customerCode,
      displayName: row.displayName,
      ...cells,
      mismatchCount,
    });
  }

  auditRows.sort(
    (a, b) =>
      b.mismatchCount - a.mismatchCount ||
      a.displayName.localeCompare(b.displayName),
  );

  return {
    generatedAt: new Date().toISOString(),
    customerCount: rows.length,
    mismatchCustomerCount: auditRows.filter((r) => r.mismatchCount > 0).length,
    mismatchCellCount: auditRows.reduce((s, r) => s + r.mismatchCount, 0),
    byPillar,
    rows: auditRows,
  };
}
