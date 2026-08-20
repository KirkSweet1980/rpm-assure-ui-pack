/**
 * Score RMM / Cove / EPP against the 14 Aug 2026 industry SLA guide.
 * Only lines we can compute from live collect are scored.
 */
import { coverFromDetail, isDormantCover } from "./cover";
import { scoreTicketSet } from "./ticket-sla";
import { isRmmServer } from "./rmm-device-class";
import {
  INDUSTRY_MEASURES,
  INDUSTRY_SLA_EXCLUSIONS,
  INDUSTRY_SLA_LINES,
  vsIndustryTone,
  type IndustryPillarKey,
} from "./sla-metrics";
import type { CustomerDetailPayload } from "./types";
import { slaKpiFor } from "./apply-sla-kpis";
import { ticketGatedSla } from "./alert-ticket-sla";
import { HELPDESK_TICKET_SLA_ARMED } from "./ui-contract";
export { withSlaKpis, type SlaKpiOverrides } from "./apply-sla-kpis";

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
  excluded?: boolean;
  badge?: string;
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

function ticketLine(pillar: IndustryPillarKey, data: CustomerDetailPayload, defId: string): ServiceSlaLine {
  const def = INDUSTRY_SLA_LINES[pillar].find((d) => d.id === defId);
  if (!HELPDESK_TICKET_SLA_ARMED) {
    return {
      id: defId,
      metric: def?.metric ?? defId,
      targetLabel: def?.targetLabel ?? ">= 90% ticket clocks",
      targetPct: def?.targetPct ?? 90,
      actualPct: null,
      actualLabel: "Helpdesk not armed — Assure does not yet log a ticket when RAG turns Amber/Red. Clock idle.",
      tone: "default",
      measured: false,
      contractual: true,
      how: def?.how ?? "",
      badge: "Helpdesk not armed",
    };
  }
  const g = ticketGatedSla(data, pillar);
  const onContract = pillar !== "csp";
  return {
    id: defId,
    metric: def?.metric ?? defId,
    targetLabel: def?.targetLabel ?? "≥ 90% ticket clocks",
    targetPct: def?.targetPct ?? 90,
    actualPct: onContract ? g.actualPct : null,
    actualLabel: onContract
      ? g.actualLabel
      : "Microsoft 365 is not on the signed SLA — no clock.",
    tone: onContract ? g.tone : "default",
    measured: onContract && g.measured,
    contractual: onContract,
    how: def?.how ?? "",
    badge: onContract ? g.badge : "Not on SLA contract",
    excluded: !onContract,
  };
}

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
  extra?: { excluded?: boolean; badge?: string },
): ServiceSlaLine {
  const def = INDUSTRY_SLA_LINES[pillar].find((d) => d.id === defId);
  const custom = slaKpiFor(pillar);
  const targetPct = custom ?? def?.targetPct ?? null;
  const excluded = Boolean(extra?.excluded);
  return {
    id: defId,
    metric: def?.metric ?? defId,
    targetLabel:
      custom != null ? `Custom SLA ${custom}%` : def?.targetLabel ?? "—",
    targetPct,
    actualPct,
    actualLabel,
    tone: excluded || !measured
      ? "default"
      : targetPct != null
        ? vsIndustryTone(actualPct, targetPct)
        : actualPct != null && actualPct >= 90
          ? "green"
          : "amber",
    measured: measured && !excluded,
    contractual: Boolean(def?.contractual),
    how: def?.how ?? "",
    excluded,
    badge: extra?.badge,
  };
}

function overallOf(lines: ServiceSlaLine[]): number | null {
  const scored = lines.filter((l) => l.measured && l.actualPct != null && l.contractual);
  if (!scored.length) return null;
  return clamp(scored.reduce((s, l) => s + (l.actualPct as number), 0) / scored.length);
}

function stamp(pack: ServiceSlaPack): ServiceSlaPack {
  const c = slaKpiFor(pack.pillar);
  if (c != null) pack.headline = `Custom SLA ${c}% · this customer, on-cover only`;
  return pack;
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

  const hasServers = servers.length > 0 || sn > 0;
  const slaCover = cover && hasServers;

  const with30 = servers.filter((d) => d.offlineHours30d != null);
  let uptime: number | null = null;
  let upLabel = "No Cover for Devices — servers not scored in SLA";
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
    : "No Cover for Devices";

  const patchRep = servers.filter((d) => d.patchMissing != null || d.patchInstalled != null);
  const patchClean = patchRep.filter((d) => (d.patchMissing ?? 0) === 0).length;
  const patchPct = patchRep.length ? clamp((patchClean / patchRep.length) * 100) : null;
  const patchLabel = patchRep.length
    ? `${patchClean}/${patchRep.length} servers with no outstanding updates`
    : "No patch counts on this collect";

  const diskHigh = data.rmm?.summary?.diskHighCount ?? data.customer?.rmmDiskHighTotal ?? 0;
  const diskPct = slaCover ? (diskHigh === 0 ? 100 : clamp(100 - diskHigh * 15)) : null;
  const diskLabel = slaCover ? `${diskHigh} volume(s) at ≥85% used` : "No Cover for Devices";

  const lines: ServiceSlaLine[] = [
    ticketLine("rmm", data, "rmm-ticket"),
    line("rmm-uptime", "rmm", uptime, upLabel, slaCover && uptime != null),
    line("rmm-coverage", "rmm", covPct, covLabel, slaCover && covPct != null),
    line("rmm-patch", "rmm", patchPct, patchLabel, slaCover && patchPct != null),
    line("rmm-disk", "rmm", diskPct, diskLabel, slaCover && diskPct != null),
  ];

  return stamp({
    pillar: "rmm",
    title: INDUSTRY_MEASURES.rmm.label,
    covered: slaCover,
    overallPct: slaCover ? overallOf(lines) : null,
    headline: INDUSTRY_MEASURES.rmm.targetLabel,
    lines,
    exclusions: INDUSTRY_SLA_EXCLUSIONS.rmm,
    source: INDUSTRY_MEASURES.rmm.source,
  });
}

export function buildCoveServiceSla(data: CustomerDetailPayload): ServiceSlaPack {
  const cover = coverFromDetail(data).cove;
  const s = data.cove?.summary;
  const devices = data.cove?.devices ?? [];
  let ok = s?.okCount ?? 0;
  let failed = s?.failedCount ?? 0;
  let stale = s?.staleCount ?? 0;
  const n = (s?.deviceCount && s.deviceCount > 0 ? s.deviceCount : null) ?? devices.length ?? data.customer?.coveDeviceCount ?? 0;
  if (ok + failed + stale === 0 && devices.length) {
    ok = 0;
    failed = 0;
    stale = 0;
    for (const d of devices) {
      const st = (d.lastBackupStatus || "").toLowerCase();
      const last = d.lastSuccessTime ? Date.parse(d.lastSuccessTime) : NaN;
      if (st.includes("fail") || st.includes("error") || st.includes("overdue")) failed++;
      else if (st.includes("stale") || st.includes("warn")) stale++;
      else if (Number.isFinite(last) && (Date.now() - last) / 36e5 > 72) failed++;
      else if (Number.isFinite(last) && (Date.now() - last) / 36e5 > 36) stale++;
      else ok++;
    }
  }
  const slaCover = cover && n > 0;
  const denom = ok + failed;
  const success = slaCover && denom > 0 ? clamp((ok / denom) * 100) : null;
  const successLabel =
    denom > 0
      ? `${ok}/${denom} jobs OK (${failed} failed)`
      : n > 0
        ? `${n} device(s) · job outcome unknown`
        : "No Cover for Devices — not scored in SLA";

  const rpoDenom = ok + stale;
  const rpo = slaCover && rpoDenom > 0 ? clamp((ok / rpoDenom) * 100) : slaCover && n > 0 && stale === 0 ? 100 : null;
  const rpoLabel =
    rpoDenom > 0
      ? `${ok}/${rpoDenom} within 24h RPO (${stale} stale)`
      : n > 0
        ? "No stale flag · RPO assumed met"
        : "No devices";

  const rec = data.cove?.recovery ?? data.cove?.summary?.recovery ?? null;
  const recOk = rec?.testSuccessCount ?? 0;
  const recFail = rec?.testFailedCount ?? 0;
  const recDenom = recOk + recFail;
  const recPct = slaCover && recDenom > 0 ? clamp((recOk / recDenom) * 100) : null;
  const recLabel =
    recDenom > 0
      ? `${recOk}/${recDenom} recovery tests passed`
      : rec?.recoveryTestingCount
        ? `${rec.recoveryTestingCount} on Recovery Testing · no completed session on last collect`
        : "No completed recovery tests on last collect";

  const lines: ServiceSlaLine[] = [
    ticketLine("cove", data, "cove-ticket"),
    line("cove-success", "cove", success, successLabel, slaCover && success != null),
    line("cove-rpo", "cove", rpo, rpoLabel, slaCover && rpo != null),
    line("cove-recover", "cove", recPct, recLabel, slaCover && recPct != null),
  ];

  return stamp({
    pillar: "cove",
    title: INDUSTRY_MEASURES.cove.label,
    covered: slaCover,
    overallPct: slaCover ? overallOf(lines) : null,
    headline: INDUSTRY_MEASURES.cove.targetLabel,
    lines,
    exclusions: INDUSTRY_SLA_EXCLUSIONS.cove,
    source: INDUSTRY_MEASURES.cove.source,
  });
}

export function buildEppServiceSla(data: CustomerDetailPayload): ServiceSlaPack {
  const cover = Boolean(coverFromDetail(data).epp);
  const s = data.epp?.summary;
  const eppDevices = data.epp?.devices ?? [];
  const managed = s?.managedCount ?? eppDevices.filter((d) => d.isManaged !== false).length;
  const unmanaged = s?.unmanagedCount ?? Math.max(0, eppDevices.length - managed);
  const n = (s?.deviceCount && s.deviceCount > 0 ? s.deviceCount : null) ?? eppDevices.length ?? data.customer?.eppDeviceCount ?? 0;
  const slaCover = cover && n > 0;
  const den = managed + unmanaged || n;
  const cov = slaCover && den > 0 ? clamp((managed / den) * 100) : null;
  const covLabel = den > 0 ? `${managed}/${den} endpoints managed` : "No Cover for Devices — not scored in SLA";

  const incidents = data.epp?.incidents ?? [];
  const openCrit = incidents.filter((i) => {
    const st = (i.status || "").toLowerCase();
    const sev = (i.severity || "").toLowerCase();
    const open = st !== "closed" && st !== "resolved" && st !== "ignored";
    return open && (sev.includes("crit") || sev.includes("high"));
  }).length;
  const openPct = slaCover ? (openCrit === 0 ? 100 : clamp(100 - openCrit * 20)) : null;
  const openLabel = slaCover ? `${openCrit} open critical / high incident(s)` : "No Cover for Devices";

  const devices = data.epp?.devices ?? [];
  let current = 0;
  let scoredN = 0;
  let outdatedN = 0;
  let scanFreshN = 0;
  const pool = devices.filter((d) => d.isManaged !== false);
  const scorePool = pool.length ? pool : devices;
  function flagOn(v: unknown): boolean {
    return v === true || v === 1 || v === "1" || v === "true";
  }
  for (const d of scorePool) {
    scoredN += 1;
    const scanH = hoursAgo(d.lastSuccessfulScanAt);
    const scanFresh = scanH != null && scanH <= 24;
    if (scanFresh) scanFreshN += 1;
    const outdated = flagOn(d.productOutdated) || flagOn(d.signatureOutdated);
    if (outdated && !scanFresh) {
      outdatedN += 1;
      continue;
    }
    current += 1;
  }
  let updLabel = "No EndPoint Agents to score";
  let updMeasurable = false;
  if (scoredN > 0) {
    updMeasurable = true;
    updLabel =
      outdatedN > 0
        ? `${current}/${scoredN} current · ${outdatedN} product / signature outdated`
        : scanFreshN
          ? `${current}/${scoredN} current (${scanFreshN} last scan ≤ 24h)`
          : `${current}/${scoredN} current — missing outdated flags counted as current`;
  }
  const upd = updMeasurable && scoredN > 0 ? clamp((current / scoredN) * 100) : null;

  const lines: ServiceSlaLine[] = [
    ticketLine("epp", data, "epp-ticket"),
    line("epp-coverage", "epp", cov, covLabel, slaCover && cov != null),
    line("epp-update", "epp", upd, updLabel, slaCover && upd != null),
    line("epp-open", "epp", openPct, openLabel, slaCover && openPct != null),
  ];

  return stamp({
    pillar: "epp",
    title: INDUSTRY_MEASURES.epp.label,
    covered: slaCover,
    overallPct: slaCover ? overallOf(lines) : null,
    headline: INDUSTRY_MEASURES.epp.targetLabel,
    lines,
    exclusions: INDUSTRY_SLA_EXCLUSIONS.epp,
    source: INDUSTRY_MEASURES.epp.source,
  });
}

export function buildSysproServiceSla(data: CustomerDetailPayload): ServiceSlaPack {
  const cover = Boolean(coverFromDetail(data).syspro);
  const c = data.customer;
  const errors = c.sysproJobErrorCount ?? 0;
  const oob = c.sysproDtrVarianceLines ?? 0;
  const jobPct = cover ? clamp(100 - errors * 8) : null;
  const finPct = cover ? clamp(100 - oob * 10) : null;
  const age = hoursAgo(c.lastImportAt);
  let collectPct: number | null = null;
  let collectLabel = "No collect timestamp";
  if (age != null) {
    collectPct = age <= 24 ? 100 : age <= 48 ? 70 : 35;
    collectLabel = `Last collect ${age < 2 ? `${Math.round(age * 60)} min` : `${age.toFixed(1)} h`} ago`;
  }
  const lines: ServiceSlaLine[] = [
    ticketLine("syspro", data, "syspro-ticket"),
    line("syspro-jobs", "syspro", jobPct, `${errors} job error(s)`, cover && jobPct != null),
    line("syspro-finsight", "syspro", finPct, `${oob} FinSight OOB line(s)`, cover && finPct != null),
    line("syspro-collect", "syspro", collectPct, collectLabel, cover && collectPct != null),
  ];
  return stamp({
    pillar: "syspro",
    title: INDUSTRY_MEASURES.syspro.label,
    covered: cover,
    overallPct: cover ? overallOf(lines) : null,
    headline: INDUSTRY_MEASURES.syspro.targetLabel,
    lines,
    exclusions: INDUSTRY_SLA_EXCLUSIONS.syspro,
    source: INDUSTRY_MEASURES.syspro.source,
  });
}

export function buildCspServiceSla(data: CustomerDetailPayload): ServiceSlaPack {
  const cover = Boolean(coverFromDetail(data).csp);
  const p = data.csp?.posture;
  const s = data.csp?.summary;
  const score = p?.secureScorePct ?? (p?.secureScore != null && p.secureScoreMax ? (p.secureScore / p.secureScoreMax) * 100 : null);
  const scorePct = score != null ? clamp(score) : null;
  const mfa = p?.mfaRegisteredPct != null ? clamp(p.mfaRegisteredPct) : null;
  const seats = s?.totalSeats ? clamp(((s.assignedSeats ?? 0) / s.totalSeats) * 100) : null;
  const slaCover = cover;
  const notOnSla = { excluded: true, badge: "Posture — no clock" };
  const lines: ServiceSlaLine[] = [
    ticketLine("csp", data, "csp-ticket"),
    line(
      "csp-score",
      "csp",
      scorePct,
      scorePct != null ? `${scorePct}% Secure Score` : "No Secure Score on collect",
      false,
      notOnSla,
    ),
    line(
      "csp-mfa",
      "csp",
      mfa,
      mfa != null
        ? `${p?.mfaRegisteredCount ?? "—"}/${p?.mfaCapableCount ?? "—"} registered`
        : "No MFA counts on collect",
      false,
      notOnSla,
    ),
    line(
      "csp-seats",
      "csp",
      seats,
      s?.totalSeats ? `${s.assignedSeats}/${s.totalSeats} seats assigned` : "No seat counts",
      false,
      notOnSla,
    ),
  ];
  return stamp({
    pillar: "csp",
    title: INDUSTRY_MEASURES.csp.label,
    covered: slaCover,
    overallPct: slaCover ? overallOf(lines) : null,
    headline: INDUSTRY_MEASURES.csp.targetLabel,
    lines,
    exclusions: INDUSTRY_SLA_EXCLUSIONS.csp,
    source: INDUSTRY_MEASURES.csp.source,
  });
}

export function buildTicketsServiceSla(data: CustomerDetailPayload): ServiceSlaPack {
  const rows = data.incidents ?? [];
  const ops = coverFromDetail(data);
  const cover = !isDormantCover(ops) && (rows.length > 0 || Boolean(ops.tickets));
  const pack = scoreTicketSet(rows, data.slaPolicies);
  const openPct = cover ? clamp(Math.max(40, 100 - pack.open * 5)) : null;
  const lines: ServiceSlaLine[] = [
    line(
      "tickets-response",
      "tickets",
      pack.responsePct,
      pack.responseScored
        ? `${pack.responseMet}/${pack.responseScored} met · ${pack.responseBreach} breach`
        : "No closed response clocks in 30 days",
      cover && pack.responsePct != null,
    ),
    line(
      "tickets-restore",
      "tickets",
      pack.resolvePct,
      pack.resolveScored
        ? `${pack.resolveMet}/${pack.resolveScored} met · ${pack.resolveBreach} breach`
        : "No closed restore clocks in 30 days",
      cover && pack.resolvePct != null,
    ),
    line("tickets-open", "tickets", openPct, `${pack.open} open now`, cover && openPct != null),
  ];
  return stamp({
    pillar: "tickets",
    title: INDUSTRY_MEASURES.tickets.label,
    covered: cover && rows.length > 0,
    overallPct: cover && rows.length > 0 ? overallOf(lines) : null,
    headline: INDUSTRY_MEASURES.tickets.targetLabel,
    lines,
    exclusions: INDUSTRY_SLA_EXCLUSIONS.tickets,
    source: INDUSTRY_MEASURES.tickets.source,
  });
}

export function buildServiceSla(
  pillar: IndustryPillarKey,
  data: CustomerDetailPayload,
): ServiceSlaPack {
  if (pillar === "rmm") return buildRmmServiceSla(data);
  if (pillar === "cove") return buildCoveServiceSla(data);
  if (pillar === "epp") return buildEppServiceSla(data);
  if (pillar === "syspro") return buildSysproServiceSla(data);
  if (pillar === "csp") return buildCspServiceSla(data);
  return buildTicketsServiceSla(data);
}
