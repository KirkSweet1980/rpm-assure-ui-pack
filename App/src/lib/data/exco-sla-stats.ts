/**
 * EXCO SLA stats — covered pillars only, Microsoft 365 excluded.
 * No Cover pillars must not contribute a score.
 */
import type { CustomerCover } from "./cover";
import type { CustomerDetailPayload, ExcoPillarSla, HealthRag } from "./types";

export type ExcoSlaInput = {
  cover: CustomerCover;
  collectFresh: boolean;
  collectAgeHours: number | null;
  jobErrorCount: number;
  dtrVarianceLines: number;
  /** RMM servers online / offline (workstations excluded from SLA) */
  serverOnline: number;
  serverOffline: number;
  criticalAlerts: number;
  /** Backup health when Cove on cover */
  backupHealthy: boolean | null;
  coveDeviceCount: number;
  /** EPP */
  eppDeviceCount: number;
  eppManagedCount?: number | null;
  healthRag?: HealthRag;
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function scoreSyspro(i: ExcoSlaInput): { pct: number; note: string } {
  let pct = 100;
  const notes: string[] = [];
  if (!i.collectFresh) {
    pct -= i.collectAgeHours == null ? 50 : 35;
    notes.push(
      i.collectAgeHours == null
        ? "No recent SYSPRO collect"
        : `Collect ${i.collectAgeHours}h old`,
    );
  }
  if (i.jobErrorCount > 0) {
    pct -= Math.min(40, 15 + i.jobErrorCount * 5);
    notes.push(`${i.jobErrorCount} job error(s)`);
  }
  if (i.dtrVarianceLines > 0) {
    pct -= Math.min(35, 10 + i.dtrVarianceLines * 2);
    notes.push(`${i.dtrVarianceLines} FinSight OOB`);
  }
  if (notes.length === 0) notes.push("SYSPRO controls clear");
  return { pct: clampPct(pct), note: notes.join(" · ") };
}

function scoreRmm(i: ExcoSlaInput): { pct: number | null; note: string } {
  const so = i.serverOnline || 0;
  const sf = i.serverOffline || 0;
  const sn = so + sf;
  // Workstations are never part of RMM SLA
  if (sn <= 0) {
    return {
      pct: null,
      note: "No servers (workstations excluded from SLA)",
    };
  }
  let pct = (so / sn) * 100;
  const notes: string[] = [`${so}/${sn} servers online`];
  if (i.criticalAlerts > 0) {
    pct -= Math.min(40, i.criticalAlerts * 12);
    notes.push(`${i.criticalAlerts} critical alert(s)`);
  }
  return { pct: clampPct(pct), note: notes.join(" · ") };
}


function scoreCove(i: ExcoSlaInput): { pct: number; note: string } {
  if (i.backupHealthy === true) {
    return { pct: 100, note: "Backup healthy" };
  }
  if (i.backupHealthy === false) {
    return { pct: 35, note: "Backup failed or stale" };
  }
  if (i.coveDeviceCount > 0) {
    return { pct: 70, note: `${i.coveDeviceCount} device(s) · status unknown` };
  }
  return { pct: 80, note: "Cove on cover · no backup signal yet" };
}

function scoreEpp(i: ExcoSlaInput): { pct: number; note: string } {
  const n = i.eppDeviceCount || 0;
  if (n <= 0) {
    return { pct: 80, note: "EPP on cover · no endpoint rows yet" };
  }
  const managed = i.eppManagedCount;
  if (managed != null && n > 0) {
    const pct = clampPct((managed / n) * 100);
    return {
      pct,
      note: `${managed}/${n} endpoints managed`,
    };
  }
  return { pct: 95, note: `${n} endpoint(s) mapped` };
}

import { INDUSTRY_MEASURES } from "./sla-metrics";

/**
 * Build per-pillar SLA. Microsoft 365 (csp) is never included.
 * No Cover pillars return covered=false and pct=null.
 */
export function buildExcoPillarSla(input: ExcoSlaInput): {
  pillars: ExcoPillarSla[];
  overallPct: number | null;
} {
  const cov = input.cover;
  const pillars: ExcoPillarSla[] = [];

  // SYSPRO
  if (cov.syspro) {
    const s = scoreSyspro(input);
    pillars.push({
      pillar: "syspro",
      label: "SYSPRO",
      covered: true,
      pct: s.pct,
      note: s.note,
      industryTargetPct: 100,
      industryMetric: "AMS health (jobs, FinSight, collect) — Section 4, not ticket clocks",
    });
  } else {
    pillars.push({
      pillar: "syspro",
      label: "SYSPRO",
      covered: false,
      pct: null,
      note: "No Cover",
      industryTargetPct: 100,
      industryMetric: "AMS health (jobs, FinSight, collect) — Section 4, not ticket clocks",
    });
  }

  // RMM
  if (cov.rmm) {
    const s = scoreRmm(input);
    pillars.push({
      pillar: "rmm",
      label: "RMM",
      covered: true,
      pct: s.pct,
      note: s.note,
      industryTargetPct: INDUSTRY_MEASURES.rmm.targetPct,
      industryMetric: INDUSTRY_MEASURES.rmm.targetLabel,
    });
  } else {
    pillars.push({
      pillar: "rmm",
      label: "RMM",
      covered: false,
      pct: null,
      note: "No Cover",
      industryTargetPct: INDUSTRY_MEASURES.rmm.targetPct,
      industryMetric: INDUSTRY_MEASURES.rmm.targetLabel,
    });
  }

  // Cove / Backup
  if (cov.cove) {
    const s = scoreCove(input);
    pillars.push({
      pillar: "cove",
      label: "Backup",
      covered: true,
      pct: s.pct,
      note: s.note,
      industryTargetPct: INDUSTRY_MEASURES.cove.targetPct,
      industryMetric: INDUSTRY_MEASURES.cove.targetLabel,
    });
  } else {
    pillars.push({
      pillar: "cove",
      label: "Backup",
      covered: false,
      pct: null,
      note: "No Cover",
      industryTargetPct: INDUSTRY_MEASURES.cove.targetPct,
      industryMetric: INDUSTRY_MEASURES.cove.targetLabel,
    });
  }

  // EPP
  if (cov.epp) {
    const s = scoreEpp(input);
    pillars.push({
      pillar: "epp",
      label: "EPP",
      covered: true,
      pct: s.pct,
      note: s.note,
      industryTargetPct: INDUSTRY_MEASURES.epp.targetPct,
      industryMetric: INDUSTRY_MEASURES.epp.targetLabel,
    });
  } else {
    pillars.push({
      pillar: "epp",
      label: "EPP",
      covered: false,
      pct: null,
      note: "No Cover",
      industryTargetPct: INDUSTRY_MEASURES.epp.targetPct,
      industryMetric: INDUSTRY_MEASURES.epp.targetLabel,
    });
  }

  // M365 intentionally omitted from SLA

  const scored = pillars.filter((p) => p.covered && p.pct != null);
  const overallPct =
    scored.length === 0
      ? null
      : clampPct(
          scored.reduce((sum, p) => sum + (p.pct as number), 0) / scored.length,
        );

  return { pillars, overallPct };
}

/** True if any non-M365 pillar is on cover (SLA can be computed). */
export function hasSlaCover(c: CustomerCover | null | undefined): boolean {
  if (!c) return false;
  return Boolean(c.syspro || c.rmm || c.cove || c.epp);
}

export function slaInputFromDetail(
  cover: CustomerCover,
  data: CustomerDetailPayload,
): ExcoSlaInput {
  const last = data.customer?.lastImportAt;
  let collectAgeHours: number | null = null;
  if (last) {
    const t = new Date(last).getTime();
    if (Number.isFinite(t)) collectAgeHours = (Date.now() - t) / 36e5;
  }
  const cove = data.cove?.summary;
  const failed = cove?.failedCount ?? 0;
  const stale = cove?.staleCount ?? 0;
  const coveN = cove?.deviceCount ?? data.cove?.devices?.length ?? 0;
  let backupHealthy: boolean | null = null;
  if (cover.cove) {
    if (coveN > 0 && failed === 0 && stale === 0) backupHealthy = true;
    else if (failed > 0 || stale > 0) backupHealthy = false;
  }
  return {
    cover,
    collectFresh: collectAgeHours != null && collectAgeHours <= 24,
    collectAgeHours,
    jobErrorCount: data.jobErrors?.length ?? data.customer?.sysproJobErrorCount ?? 0,
    dtrVarianceLines:
      data.customer?.sysproDtrVarianceLines ?? data.dtrLevel1?.length ?? 0,
    serverOnline: data.rmm?.summary?.serverOnline ?? 0,
    serverOffline: data.rmm?.summary?.serverOffline ?? 0,
    criticalAlerts: data.rmm?.summary?.criticalAlerts ?? 0,
    backupHealthy,
    coveDeviceCount: coveN,
    eppDeviceCount: data.epp?.summary?.deviceCount ?? data.epp?.devices?.length ?? 0,
    eppManagedCount: data.epp?.summary?.managedCount ?? null,
    healthRag: data.customer?.healthRag,
  };
}
