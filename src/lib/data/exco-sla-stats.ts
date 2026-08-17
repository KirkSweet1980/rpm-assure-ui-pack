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
  /** 30-day uptime % from Pulseway offline hours when present */
  serverUptime30d?: number | null;
  /** Backup health when Cove on cover */
  backupHealthy: boolean | null;
  coveDeviceCount: number;
  coveOkCount?: number;
  coveFailedCount?: number;
  coveStaleCount?: number;
  coveRestorePct?: number | null;
  /** EPP */
  eppDeviceCount: number;
  eppManagedCount?: number | null;
  eppUnmanagedCount?: number | null;
  healthRag?: HealthRag;
  ticketCount?: number | null;
  ticketResponsePct?: number | null;
  ticketResolvePct?: number | null;
  /** Custom SLA % for this customer; only used on covered pillars */
  kpis?: Partial<Record<"syspro" | "rmm" | "cove" | "epp" | "csp" | "tickets", number>>;
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
  if (sn <= 0 && i.serverUptime30d == null) {
    return {
      pct: null,
      note: "No servers (workstations excluded from SLA)",
    };
  }
  let pct =
    i.serverUptime30d != null
      ? i.serverUptime30d
      : (so / Math.max(1, sn)) * 100;
  const notes: string[] = [
    i.serverUptime30d != null
      ? `${clampPct(i.serverUptime30d)}% 30-day uptime`
      : `${so}/${sn} servers online`,
  ];
  if (i.criticalAlerts > 0) {
    pct -= Math.min(40, i.criticalAlerts * 12);
    notes.push(`${i.criticalAlerts} critical alert(s)`);
  }
  return { pct: clampPct(pct), note: notes.join(" · ") };
}

function scoreCove(i: ExcoSlaInput): { pct: number | null; note: string } {
  const ok = i.coveOkCount ?? 0;
  const failed = i.coveFailedCount ?? 0;
  const stale = i.coveStaleCount ?? 0;
  const denom = ok + failed;
  const devices = i.coveDeviceCount || 0;
  if (devices <= 0 && denom <= 0) {
    return { pct: null, note: "No backup devices (not scored)" };
  }
  if (denom > 0) {
    let pct = (ok / denom) * 100;
    const notes = [`${ok}/${denom} jobs OK`];
    if (stale > 0) {
      pct = Math.min(pct, (ok / (ok + stale)) * 100);
      notes.push(`${stale} stale vs 24h RPO`);
    }
    if (i.coveRestorePct != null) {
      pct = pct * 0.7 + i.coveRestorePct * 0.3;
      notes.push(`restore ${i.coveRestorePct}%`);
    }
    return { pct: clampPct(pct), note: notes.join(" · ") };
  }
  if (i.backupHealthy === true) {
    return { pct: 100, note: "Backup healthy · 24h RPO met" };
  }
  if (i.backupHealthy === false) {
    return { pct: 35, note: "Backup failed or stale vs 24h RPO" };
  }
  if (devices > 0) {
    return { pct: null, note: `${devices} device(s) mapped · job outcome not collected (not scored)` };
  }
  return { pct: null, note: "No backup devices (not scored)" };
}

function scoreEpp(i: ExcoSlaInput): { pct: number | null; note: string } {
  const n = i.eppDeviceCount || 0;
  const managed = i.eppManagedCount;
  const unmanaged = i.eppUnmanagedCount ?? (n && managed != null ? Math.max(0, n - managed) : 0);
  const den = (managed ?? 0) + (unmanaged ?? 0) || n;
  if (n <= 0 && den <= 0) {
    return { pct: null, note: "No EPP endpoints (not scored)" };
  }
  if (den > 0 && managed != null) {
    return {
      pct: clampPct((managed / den) * 100),
      note: `${managed}/${den} endpoints managed (target 98%)`,
    };
  }
  if (n <= 0) {
    return { pct: null, note: "No EPP endpoints (not scored)" };
  }
  return { pct: 95, note: `${n} endpoint(s) mapped` };
}

function scoreTickets(i: ExcoSlaInput): { pct: number | null; note: string } {
  const n = i.ticketCount || 0;
  if (n <= 0 && i.ticketResponsePct == null && i.ticketResolvePct == null) {
    return { pct: null, note: "No tickets (not scored)" };
  }
  const parts: number[] = [];
  const notes: string[] = [];
  if (i.ticketResponsePct != null && Number.isFinite(i.ticketResponsePct)) {
    parts.push(Number(i.ticketResponsePct));
    notes.push(`response ${Math.round(Number(i.ticketResponsePct))}%`);
  }
  if (i.ticketResolvePct != null && Number.isFinite(i.ticketResolvePct)) {
    parts.push(Number(i.ticketResolvePct));
    notes.push(`resolve ${Math.round(Number(i.ticketResolvePct))}%`);
  }
  if (parts.length === 0) {
    return {
      pct: 70,
      note: `${n} ticket(s) on feed · clocks not closed yet (held at 70%)`,
    };
  }
  const pct = parts.reduce((a, b) => a + b, 0) / parts.length;
  if (notes.length === 0) notes.push(`${n} ticket(s)`);
  else notes.unshift(`${n} ticket(s)`);
  return { pct: clampPct(pct), note: notes.join(" · ") };
}

import { INDUSTRY_MEASURES } from "./sla-metrics";
import { scoreTicketSet } from "./ticket-sla";

/**
 * Build per-pillar SLA. Microsoft 365 (csp) is never included.
 * No Cover pillars return covered=false and pct=null.
 */
export function buildExcoPillarSla(input: ExcoSlaInput): {
  pillars: ExcoPillarSla[];
  overallPct: number | null;
} {
  const cov = input.cover;
  const k = input.kpis ?? {};
  const pillars: ExcoPillarSla[] = [];
  const tgt = (pillar: keyof typeof INDUSTRY_MEASURES, fallback: number) =>
    k[pillar] != null && Number.isFinite(k[pillar]) ? Number(k[pillar]) : fallback;

  // SYSPRO
  if (cov.syspro) {
    const s = scoreSyspro(input);
    pillars.push({
      pillar: "syspro",
      label: "SYSPRO",
      covered: true,
      pct: s.pct,
      note: s.note,
      industryTargetPct: tgt("syspro", 100),
      industryMetric: "AMS health (jobs, FinSight, collect) — Section 4, not ticket clocks",
    });
  } else {
    pillars.push({
      pillar: "syspro",
      label: "SYSPRO",
      covered: false,
      pct: null,
      note: "No Cover",
      industryTargetPct: tgt("syspro", 100),
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
      industryTargetPct: tgt("rmm", INDUSTRY_MEASURES.rmm.targetPct),
      industryMetric: INDUSTRY_MEASURES.rmm.targetLabel,
    });
  } else {
    pillars.push({
      pillar: "rmm",
      label: "RMM",
      covered: false,
      pct: null,
      note: "No Cover",
      industryTargetPct: tgt("rmm", INDUSTRY_MEASURES.rmm.targetPct),
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
      industryTargetPct: tgt("cove", INDUSTRY_MEASURES.cove.targetPct),
      industryMetric: INDUSTRY_MEASURES.cove.targetLabel,
    });
  } else {
    pillars.push({
      pillar: "cove",
      label: "Backup",
      covered: false,
      pct: null,
      note: "No Cover",
      industryTargetPct: tgt("cove", INDUSTRY_MEASURES.cove.targetPct),
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
      industryTargetPct: tgt("epp", INDUSTRY_MEASURES.epp.targetPct),
      industryMetric: INDUSTRY_MEASURES.epp.targetLabel,
    });
  } else {
    pillars.push({
      pillar: "epp",
      label: "EPP",
      covered: false,
      pct: null,
      note: "No Cover",
      industryTargetPct: tgt("epp", INDUSTRY_MEASURES.epp.targetPct),
      industryMetric: INDUSTRY_MEASURES.epp.targetLabel,
    });
  }

  // Customer Tickets (Layer A — Freshdesk clocks)
  if (cov.tickets && (cov.syspro || cov.rmm || cov.cove || cov.epp)) {
    const s = scoreTickets(input);
    pillars.push({
      pillar: "tickets",
      label: "Tickets",
      covered: true,
      pct: s.pct,
      note: s.note,
      industryTargetPct: tgt("tickets", 90),
      industryMetric: "Response + restore met % vs Dim_SlaPolicy (90% monthly target)",
    });
  } else {
    pillars.push({
      pillar: "tickets",
      label: "Tickets",
      covered: false,
      pct: null,
      note: "No Cover",
      industryTargetPct: tgt("tickets", 90),
      industryMetric: "Response + restore met % vs Dim_SlaPolicy (90% monthly target)",
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
  const ok = cove?.okCount ?? 0;
  const coveN = cove?.deviceCount ?? data.cove?.devices?.length ?? 0;
  let backupHealthy: boolean | null = null;
  if (cover.cove) {
    if (coveN > 0 && failed === 0 && stale === 0) backupHealthy = true;
    else if (failed > 0 || stale > 0) backupHealthy = false;
  }
  const rec = cove?.recovery ?? data.cove?.recovery;
  const tOk = rec?.testSuccessCount ?? 0;
  const tFail = rec?.testFailedCount ?? 0;
  const coveRestorePct = tOk + tFail > 0 ? (tOk / (tOk + tFail)) * 100 : null;
  const servers = (data.rmm?.devices ?? []).filter((d) => {
    const t = (d.deviceType || "").toLowerCase();
    const os = (d.osName || "").toLowerCase();
    return t.includes("server") || os.includes("windows server") || os.includes("server 20");
  });
  const with30 = servers.filter((d) => d.offlineHours30d != null);
  let serverUptime30d: number | null = null;
  if (with30.length) {
    const minutes = 30 * 24 * 60;
    const avgOff =
      with30.reduce((s, d) => s + (d.offlineHours30d ?? 0) * 60, 0) / with30.length;
    serverUptime30d = Math.max(0, Math.min(100, ((minutes - avgOff) / minutes) * 100));
  }
  const tix = scoreTicketSet(data.incidents);
  return {
    cover,
    collectFresh: collectAgeHours != null && collectAgeHours <= 24,
    collectAgeHours,
    jobErrorCount: (data.jobErrors?.length || data.customer?.sysproJobErrorCount) ?? 0,
    dtrVarianceLines:
      data.customer?.sysproDtrVarianceLines ?? data.dtrLevel1?.length ?? 0,
    serverOnline:
      data.rmm?.summary?.serverOnline ?? data.customer?.pulsewayServerOnline ?? 0,
    serverOffline:
      data.rmm?.summary?.serverOffline ?? data.customer?.pulsewayServerOffline ?? 0,
    criticalAlerts:
      data.rmm?.summary?.criticalAlerts ?? data.customer?.pulsewayCriticalAlerts ?? 0,
    serverUptime30d,
    backupHealthy,
    coveDeviceCount:
      coveN || data.customer?.coveDeviceCount || 0,
    coveOkCount: ok,
    coveFailedCount: failed,
    coveStaleCount: stale,
    coveRestorePct,
    eppDeviceCount:
      data.epp?.summary?.deviceCount ??
      data.epp?.devices?.length ??
      data.customer?.eppDeviceCount ??
      0,
    eppManagedCount: data.epp?.summary?.managedCount ?? null,
    eppUnmanagedCount: data.epp?.summary?.unmanagedCount ?? null,
    healthRag: data.customer?.healthRag,
    ticketCount: tix.total || data.customer?.ticketCount || 0,
    ticketResponsePct: tix.responsePct ?? data.amsSlaSummary?.responsePct ?? data.customer?.ticketResponsePct ?? null,
    ticketResolvePct: tix.resolvePct ?? data.amsSlaSummary?.resolvePct ?? data.customer?.ticketResolvePct ?? null,
  };
}
