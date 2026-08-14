/**
 * Score RMM / Cove / EPP against the 14 Aug 2026 industry SLA guide.
 * Only lines we can compute from live collect are scored.
 */
import { isRmmServer } from "./rmm-device-class";
import {
  INDUSTRY_MEASURES,
  INDUSTRY_SLA_EXCLUSIONS,
  INDUSTRY_SLA_LINES,
  vsIndustryTone,
  type IndustryPillarKey,
} from "./sla-metrics";
import type { CustomerDetailPayload } from "./types";
import { coverFromDetail } from "./cover";

export type ServiceSlaLine = {
  id: string;
  metric: string;
  targetLabel: string;
  targetPct: number | null;
  actualPct: number | null;
  actualLabel: string;
  tone: "green" | "amber" | "red" | "default";
  measured: boolean;
  contractual: boolean;
  how: string;
};

export type ServiceSlaPack = {
  pillar: IndustryPillarKey;
  title: string;
  covered: boolean;
  overallPct: number | null;
  headline: string;
  lines: ServiceSlaLine[];
  exclusions: string[];
  source: string;
};

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function hoursAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 36e5;
}

function line(
  defId: string,
  pillar: IndustryPillarKey,
  actualPct: number | null,
  actualLabel: string,
  measured: boolean,
): ServiceSlaLine {
  const def = INDUSTRY_SLA_LINES[pillar].find((d) => d.id === defId);
  const targetPct = def?.targetPct ?? null;
  return {
    id: defId,
    metric: def?.metric ?? defId,
    targetLabel: def?.targetLabel ?? "—",
    targetPct,
    actualPct,
    actualLabel,
    tone: !measured
      ? "default"
      : targetPct != null
        ? vsIndustryTone(actualPct, targetPct)
        : actualPct != null && actualPct >= 90
          ? "green"
          : "amber",
    measured,
    contractual: Boolean(def?.contractual),
    how: def?.how ?? "",
  };
}

function unmeasured(defId: string, pillar: IndustryPillarKey): ServiceSlaLine {
  return line(defId, pillar, null, "Not measured", false);
}

function overallOf(lines: ServiceSlaLine[]): number | null {
  const scored = lines.filter((l) => l.measured && l.actualPct != null && l.contractual);
  if (!scored.length) return null;
  return clamp(scored.reduce((s, l) => s + (l.actualPct as number), 0) / scored.length);
}

export function buildRmmServiceSla(data: CustomerDetailPayload): ServiceSlaPack {
  const cover = coverFromDetail(data).rmm;
  const servers = (data.rmm?.devices ?? []).filter((d) => isRmmServer(d));
  const so =
    data.rmm?.summary?.serverOnline ??
    data.customer?.pulsewayServerOnline ??
    servers.filter((d) => d.isOnline === true).length;
  const sf =
    data.rmm?.summary?.serverOffline ??
    data.customer?.pulsewayServerOffline ??
    servers.filter((d) => d.isOnline === false).length;
  const sn = so + sf;
  const critical =
    data.rmm?.summary?.criticalAlerts ?? data.customer?.pulsewayCriticalAlerts ?? 0;

  const with30 = servers.filter((d) => d.offlineHours30d != null);
  let uptime: number | null = null;
  let upLabel = "No servers";
  if (with30.length) {
    const minutes = 30 * 24 * 60;
    const avgOff =
      with30.reduce((s, d) => s + (d.offlineHours30d ?? 0) * 60, 0) / with30.length;
    uptime = clamp(((minutes - avgOff) / minutes) * 100);
    upLabel = `${uptime}% from ${with30.length} server 30-day offline hours`;
  } else if (sn > 0) {
    uptime = clamp((so / sn) * 100);
    upLabel = `${so}/${sn} servers online (snapshot)`;
  }
  if (uptime != null && critical > 0) {
    uptime = clamp(uptime - Math.min(40, critical * 12));
    upLabel += ` · ${critical} critical alert(s)`;
  }

  const reporting = servers.filter((d) => {
    if (d.isOnline === true) return true;
    const age = hoursAgo(d.lastSeenOnline);
    return age != null && age <= 0.25;
  }).length;
  const covPct = servers.length ? clamp((reporting / servers.length) * 100) : null;
  const covLabel = servers.length
    ? `${reporting}/${servers.length} servers reporting`
    : "No classified servers";

  const lines: ServiceSlaLine[] = [
    line("rmm-uptime", "rmm", uptime, upLabel, uptime != null),
    line("rmm-coverage", "rmm", covPct, covLabel, covPct != null),
    unmeasured("rmm-mttd", "rmm"),
    unmeasured("rmm-mttr-p1", "rmm"),
    unmeasured("rmm-mttr-p2", "rmm"),
  ];

  return {
    pillar: "rmm",
    title: INDUSTRY_MEASURES.rmm.label,
    covered: cover,
    overallPct: cover ? overallOf(lines) : null,
    headline: INDUSTRY_MEASURES.rmm.targetLabel,
    lines,
    exclusions: INDUSTRY_SLA_EXCLUSIONS.rmm,
    source: INDUSTRY_MEASURES.rmm.source,
  };
}

export function buildCoveServiceSla(data: CustomerDetailPayload): ServiceSlaPack {
  const cover = coverFromDetail(data).cove;
  const s = data.cove?.summary;
  const rec = s?.recovery ?? data.cove?.recovery;
  const ok = s?.okCount ?? 0;
  const failed = s?.failedCount ?? 0;
  const stale = s?.staleCount ?? 0;
  const n = s?.deviceCount ?? data.cove?.devices?.length ?? 0;
  const denom = ok + failed;
  const success = denom > 0 ? clamp((ok / denom) * 100) : n > 0 ? 70 : null;
  const successLabel =
    denom > 0
      ? `${ok}/${denom} jobs OK (${failed} failed)`
      : n > 0
        ? `${n} device(s) · job outcome unknown`
        : "No backup jobs on collect";

  const rpoDenom = ok + stale;
  const rpo = rpoDenom > 0 ? clamp((ok / rpoDenom) * 100) : n > 0 && stale === 0 ? 100 : null;
  const rpoLabel =
    rpoDenom > 0
      ? `${ok}/${rpoDenom} within 24h RPO (${stale} stale)`
      : n > 0
        ? "No stale flag · RPO assumed met"
        : "No devices";

  const tOk = rec?.testSuccessCount ?? 0;
  const tFail = rec?.testFailedCount ?? 0;
  const tDen = tOk + tFail;
  const restore = tDen > 0 ? clamp((tOk / tDen) * 100) : null;
  const restoreLabel =
    tDen > 0 ? `${tOk}/${tDen} test restores passed` : "No completed recovery tests";

  const lastTest = rec?.lastRecoveryTestAt ?? s?.recovery?.lastRecoveryTestAt ?? null;
  const ageH = hoursAgo(lastTest);
  let freq: number | null = null;
  let freqLabel = "No recovery test on record";
  if (ageH != null) {
    const days = ageH / 24;
    freq = days <= 31 ? 100 : days <= 93 ? 70 : 35;
    freqLabel = `Last test ${Math.round(days)} day(s) ago`;
  }

  const lines: ServiceSlaLine[] = [
    line("cove-success", "cove", success, successLabel, success != null),
    line("cove-rpo", "cove", rpo, rpoLabel, rpo != null),
    line("cove-restore", "cove", restore, restoreLabel, restore != null),
    line("cove-test-freq", "cove", freq, freqLabel, freq != null),
    unmeasured("cove-rto", "cove"),
  ];

  return {
    pillar: "cove",
    title: INDUSTRY_MEASURES.cove.label,
    covered: cover,
    overallPct: cover ? overallOf(lines) : null,
    headline: INDUSTRY_MEASURES.cove.targetLabel,
    lines,
    exclusions: INDUSTRY_SLA_EXCLUSIONS.cove,
    source: INDUSTRY_MEASURES.cove.source,
  };
}

export function buildEppServiceSla(data: CustomerDetailPayload): ServiceSlaPack {
  const cover = Boolean(coverFromDetail(data).epp);
  const s = data.epp?.summary;
  const managed = s?.managedCount ?? 0;
  const unmanaged = s?.unmanagedCount ?? 0;
  const n = s?.deviceCount ?? data.epp?.devices?.length ?? 0;
  const den = managed + unmanaged || n;
  const cov = den > 0 ? clamp((managed / den) * 100) : null;
  const covLabel = den > 0 ? `${managed}/${den} endpoints managed` : "No endpoint rows";

  const incidents = data.epp?.incidents ?? [];
  const openCrit = incidents.filter((i) => {
    const st = (i.status || "").toLowerCase();
    const sev = (i.severity || "").toLowerCase();
    const open = st !== "closed" && st !== "resolved" && st !== "ignored";
    return open && (sev.includes("crit") || sev.includes("high"));
  }).length;
  const openPct = openCrit === 0 ? 100 : clamp(100 - openCrit * 20);
  const openLabel = `${openCrit} open critical / high incident(s)`;

  const lines: ServiceSlaLine[] = [
    line("epp-coverage", "epp", cov, covLabel, cov != null),
    unmeasured("epp-update", "epp"),
    unmeasured("epp-mttd", "epp"),
    unmeasured("epp-respond", "epp"),
    line("epp-open", "epp", openPct, openLabel, true),
  ];

  return {
    pillar: "epp",
    title: INDUSTRY_MEASURES.epp.label,
    covered: cover,
    overallPct: cover ? overallOf(lines) : null,
    headline: INDUSTRY_MEASURES.epp.targetLabel,
    lines,
    exclusions: INDUSTRY_SLA_EXCLUSIONS.epp,
    source: INDUSTRY_MEASURES.epp.source,
  };
}

export function buildServiceSla(
  pillar: IndustryPillarKey,
  data: CustomerDetailPayload,
): ServiceSlaPack {
  if (pillar === "rmm") return buildRmmServiceSla(data);
  if (pillar === "cove") return buildCoveServiceSla(data);
  return buildEppServiceSla(data);
}
