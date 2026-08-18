import { DEFAULT_RAG } from "@/lib/settings/types";
import { isJobFailed } from "./day-end";
import {
  countCoveDevices,
  countEppDevices,
  countRmmServers,
  countRmmWorkstations,
} from "./device-cover";
import { isDormantCover } from "./cover";
import type { CustomerCover, CustomerDetailPayload, HealthRag, PortfolioRow } from "./types";

export type LiveTone = HealthRag | "Off";

export type LiveFlag = {
  rag: LiveTone;
  cover: boolean;
  href: string;
  hint: string;
};

function worse(a: LiveTone, b: LiveTone): LiveTone {
  if (a === "Red" || b === "Red") return "Red";
  if (a === "Amber" || b === "Amber") return "Amber";
  if (a === "Off" && b === "Off") return "Off";
  if (a === "Off") return b;
  if (b === "Off") return a;
  return "Green";
}

function isClosedStatus(status: string | null | undefined): boolean {
  return /closed|cancelled|canceled|resolved|mitigated|accepted|done/i.test(String(status ?? ""));
}

function realOpenIncidents(extra?: Partial<CustomerDetailPayload> | null) {
  return (extra?.incidents ?? []).filter((i) => {
    if (isClosedStatus(i.status)) return false;
    const ref = String((i as { externalRef?: string }).externalRef ?? "");
    if (/^AUTO-/i.test(ref)) return false;
    if (/^no p1 incidents/i.test(String(i.title ?? ""))) return false;
    return true;
  });
}

function realOpenRisks(extra?: Partial<CustomerDetailPayload> | null) {
  return (extra?.risks ?? []).filter((r) => String(r.status ?? "").trim() && !isClosedStatus(r.status));
}

function realOpenIssues(extra?: Partial<CustomerDetailPayload> | null) {
  return (extra?.issues ?? []).filter((r) => String(r.status ?? "").trim() && !isClosedStatus(r.status));
}

function jobFailCount(row?: PortfolioRow | null, extra?: Partial<CustomerDetailPayload> | null): number {
  const fromRow = Math.max(0, Number(row?.sysproJobErrorCount) || 0);
  if (fromRow > 0) return fromRow;
  if (Array.isArray(extra?.jobErrors) && extra.jobErrors.length > 0) {
    return extra.jobErrors.filter((j) => isJobFailed(j)).length;
  }
  return 0;
}

function dtrOobCount(row?: PortfolioRow | null, extra?: Partial<CustomerDetailPayload> | null): number {
  const fromRow = Math.max(0, Number(row?.sysproDtrVarianceLines) || 0);
  if (fromRow > 0) return fromRow;
  if (Array.isArray(extra?.dtrLevel1) && extra.dtrLevel1.length > 0) {
    return extra.dtrLevel1.reduce((s, d) => s + (Number(d.varianceLineCount) || 0), 0);
  }
  return 0;
}

function collectStale(sysproOn: boolean, row?: PortfolioRow | null, extra?: Partial<CustomerDetailPayload> | null): boolean {
  if (!sysproOn) return false;
  const ts = extra?.customer?.lastImportAt ?? row?.lastImportAt;
  if (!ts) {
    const ops = extra?.operators?.length ?? row?.operatorCount ?? 0;
    return ops === 0;
  }
  const ageH = (Date.now() - new Date(ts).getTime()) / 3600000;
  return Number.isFinite(ageH) && ageH > 24;
}

function eppUnmanagedCount(row?: PortfolioRow | null, extra?: Partial<CustomerDetailPayload> | null): number {
  const devices = extra?.epp?.devices;
  if (Array.isArray(devices) && devices.length > 0) {
    return devices.filter((d) => d.isManaged === false).length;
  }
  const listed = extra?.epp?.summary?.unmanagedCount;
  if (listed != null && Number.isFinite(listed)) return Math.max(0, listed);
  const all = row?.eppDeviceCount;
  const managed = row?.eppManagedCount;
  if (all == null || managed == null || managed === 0) return 0;
  return Math.max(0, all - managed);
}

function eppOpenIncidents(extra?: Partial<CustomerDetailPayload> | null): number {
  return (extra?.epp?.incidents ?? []).filter((i) => !isClosedStatus(i.status)).length;
}

function dayEndRag(extra?: Partial<CustomerDetailPayload> | null): LiveTone {
  const st = extra?.dayEnd?.status;
  if (st === "failed") return "Red";
  if (st === "awaiting") return "Amber";
  return "Green";
}

function hotfixRag(extra?: Partial<CustomerDetailPayload> | null): LiveTone {
  const n = extra?.hotfixGapSummary?.missingMandatory ?? 0;
  if (n > 0) return "Amber";
  return "Green";
}

function slaTone(pct: number | null | undefined, target: number): LiveTone {
  if (pct == null || !Number.isFinite(pct)) return "Green";
  if (pct < target - 5) return "Red";
  if (pct < target) return "Amber";
  return "Green";
}

/** Per-service and per-module live RAG. A module is only amber/red when THAT page has rows to show. */
export function customerLiveStatus(
  code: string,
  row: PortfolioRow | null | undefined,
  cover: CustomerCover | null | undefined,
  extra?: Partial<CustomerDetailPayload> | null,
): { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> } {
  const base = `/customers/${encodeURIComponent(code)}`;
  const c = cover ?? { syspro: false, rmm: false, cove: false, epp: false, csp: false };
  const jobs = c.syspro ? jobFailCount(row, extra) : 0;
  const dtr = c.syspro ? dtrOobCount(row, extra) : 0;
  const stale = collectStale(Boolean(c.syspro), row, extra);
  const srvN = countRmmServers(row, extra);
  const wsN = countRmmWorkstations(row, extra);
  const coveN = countCoveDevices(row, extra);
  const eppN = countEppDevices(row, extra);
  const srvCover = Boolean(c.rmm) && srvN > 0;
  const wsCover = Boolean(c.rmm) && wsN > 0;
  const coveDevCover = Boolean(c.cove) && coveN > 0;
  const eppDevCover = Boolean(c.epp) && eppN > 0;
  const srvOff = srvCover ? row?.pulsewayServerOffline ?? 0 : 0;
  const crit = c.rmm ? row?.pulsewayCriticalAlerts ?? 0 : 0;
  const wsOff = wsCover ? row?.pulsewayWorkstationOffline ?? 0 : 0;
  const patchMiss = c.rmm ? row?.pulsewayPatchMissing ?? 0 : 0;
  const patchDevices =
    Number(
      row?.pulsewayPatchDevices ??
        extra?.rmm?.summary?.patchDevicesReporting ??
        extra?.customer?.pulsewayPatchDevices ??
        0,
    ) || 0;
  const hasPatchSnap = patchDevices > 0 || patchMiss > 0;
  const evRows = extra?.rmm?.windowsEvents ?? [];
  const evN = evRows.length;
  const evCrit = evRows.some((e) => /crit/i.test(String(e.levelName ?? "")));
  const iopsN = extra?.rmm?.agentIops?.length ?? 0;
  const rmmAlerts = extra?.rmm?.alerts ?? [];
  const alertCrit =
    crit > 0 ||
    rmmAlerts.some((a) => /crit/i.test(String(a.severity ?? "")));
  const alertN = rmmAlerts.length || crit;
  const coveFail = c.cove
    ? extra?.cove?.summary?.failedCount ?? row?.coveFailedDeviceCount ?? 0
    : 0;
  const coveStale = c.cove
    ? extra?.cove?.summary?.staleCount ?? row?.coveStaleDeviceCount ?? 0
    : 0;
  const infected = c.epp ? row?.bdInfectedCount ?? 0 : 0;
  const unmanaged = c.epp ? eppUnmanagedCount(row, extra) : 0;
  const eppInc = c.epp ? eppOpenIncidents(extra) : 0;
  const mfa = c.csp ? row?.cspMfaRegisteredPct : null;
  const ga = c.csp ? row?.cspGlobalAdminCount : null;
  const score = c.csp ? row?.cspSecureScorePct : null;
  const openInc = realOpenIncidents(extra);
  const openRisk = realOpenRisks(extra);
  const openIssue = realOpenIssues(extra);
  const majorOpen = openInc.filter((i) => i.isMajor).length;
  const slaOpen = extra?.amsSlaSummary
    ? Math.max(0, Number(extra.amsSlaSummary.openCount) || 0)
    : openInc.length;
  const trueOpenInc = extra?.incidents ? openInc.length : slaOpen;

  const redAt = Math.max(1, Number(DEFAULT_RAG.jobErrorsRedAt) || 10);
  const jobsRag: LiveTone = !c.syspro
    ? "Off"
    : jobs >= redAt
      ? "Red"
      : jobs > 0
        ? "Amber"
        : "Green";
  const dtrRag: LiveTone = !c.syspro ? "Off" : dtr > 0 ? "Amber" : "Green";
  const healthRag: LiveTone = !c.syspro ? "Off" : stale ? "Amber" : "Green";
  const dayRag: LiveTone = !c.syspro ? "Off" : dayEndRag(extra);
  const hfRag: LiveTone = !c.syspro ? "Off" : hotfixRag(extra);
  const sysproRag = [jobsRag, dtrRag, healthRag, dayRag, hfRag].reduce(worse, c.syspro ? "Green" : "Off");

  const devicesRag: LiveTone = !srvCover ? "Off" : srvOff > 0 ? "Amber" : "Green";
  const alertsRag: LiveTone = !c.rmm ? "Off" : alertCrit ? "Red" : "Off";
  const wsRag: LiveTone = !wsCover ? "Off" : wsOff > 0 ? "Amber" : "Green";
  const patchRag: LiveTone =
    !c.rmm || srvN <= 0 || !hasPatchSnap ? "Off" : patchMiss > 0 ? "Amber" : "Green";
  const iopsRag: LiveTone = iopsN > 0 ? "Green" : "Off";
  const eventsRag: LiveTone = evN <= 0 ? "Off" : evCrit ? "Red" : "Green";
  const rmmRag = [devicesRag, alertsRag, patchRag].reduce(worse, c.rmm && srvN > 0 ? "Green" : "Off");

  const coveDevRag: LiveTone = !coveDevCover ? "Off" : coveFail > 0 ? "Red" : coveStale > 0 ? "Amber" : "Green";
  const coveRag = coveDevRag;

  const eppEndRag: LiveTone = !eppDevCover ? "Off" : infected > 0 ? "Red" : unmanaged > 0 ? "Amber" : "Green";
  const eppIncRag: LiveTone = !eppDevCover ? "Off" : infected > 0 || eppInc > 0 ? "Red" : "Green";
  const eppRag = [eppEndRag, eppIncRag].reduce(worse, eppDevCover ? "Green" : "Off");

  const mfaRag: LiveTone = !c.csp ? "Off" : mfa != null && mfa < 80 ? "Red" : mfa != null && mfa < 90 ? "Amber" : "Green";
  const gaRag: LiveTone = !c.csp ? "Off" : ga != null && ga > 5 ? "Red" : ga != null && ga > 2 ? "Amber" : "Green";
  const scoreRag: LiveTone = !c.csp ? "Off" : score != null && score < 50 ? "Amber" : "Green";

  const dormant = isDormantCover(c);
  const incRag: LiveTone = dormant ? "Off" : trueOpenInc > 0 ? (majorOpen > 0 ? "Red" : "Amber") : "Green";
  const riskRag: LiveTone = dormant ? "Off" : openRisk.length > 0 ? "Amber" : "Green";
  const issueRag: LiveTone = dormant ? "Off" : openIssue.length > 0 ? "Amber" : "Green";
  const ticketResp =
    extra?.amsSlaSummary?.responsePct ??
    (row as { ticketResponsePct?: number | null } | null | undefined)?.ticketResponsePct ??
    null;
  const ticketReso =
    extra?.amsSlaSummary?.resolvePct ??
    (row as { ticketResolvePct?: number | null } | null | undefined)?.ticketResolvePct ??
    null;
  const ticketPct =
    ticketResp != null && ticketReso != null
      ? Math.min(Number(ticketResp), Number(ticketReso))
      : ticketReso ?? ticketResp;
  const ticketSlaRag = dormant ? "Off" : slaTone(ticketPct, 90);
  const amsSlaRag = dormant ? "Off" : slaTone(ticketPct, 90);
  const amsRag = dormant ? "Off" : [incRag, riskRag, issueRag, amsSlaRag].reduce(worse, "Green");
  const ticketRag = dormant ? "Off" : [incRag, ticketSlaRag].reduce(worse, "Green");
  // Microsoft 365 is posture only — never rolls into tenant RAG, assurance, or SLA.
  const ecoRag = dormant
    ? "Off"
    : [sysproRag, rmmRag, coveRag, eppRag, amsRag, ticketRag].reduce(worse, "Green");

  const off = (on: boolean): LiveTone => (on ? "Green" : "Off");

  const pillars: Record<string, LiveFlag> = {
    eco: {
      rag: dormant ? "Off" : ecoRag === "Off" ? "Green" : ecoRag,
      cover: !dormant,
      href: `${base}/ams`,
      hint: dormant
        ? "Dormant — Freshdesk only. No agent / no service cover. Not scored."
        : `Tenant live ${ecoRag === "Off" ? "Green" : ecoRag}`,
    },
    syspro: {
      rag: sysproRag,
      cover: Boolean(c.syspro),
      href: jobs > 0 ? `${base}/syspro/jobs` : dtr > 0 ? `${base}/syspro/dtr` : stale ? `${base}/syspro/health` : `${base}/syspro`,
      hint: !c.syspro
        ? "SYSPRO not on cover"
        : jobs
          ? `${jobs} failed job(s) on Job Logging`
          : dtr
            ? `${dtr} FinSight OOB line(s)`
            : stale
              ? "Collect older than 24h"
              : "SYSPRO live Green",
    },
    rmm: {
      rag: rmmRag,
      cover: Boolean(c.rmm),
      href: crit > 0 ? `${base}/rmm/alerts` : srvOff > 0 ? `${base}/rmm/devices` : `${base}/rmm`,
      hint: !c.rmm
        ? "RMM not on cover"
        : crit
          ? `${crit} critical alert(s)`
          : srvOff
            ? `${srvOff} server(s) offline`
            : "RMM live Green",
    },
    cove: {
      rag: coveRag,
      cover: Boolean(c.cove),
      href: `${base}/cove/devices`,
      hint: !c.cove
        ? "Backup not on cover"
        : coveFail
          ? `${coveFail} failed backup(s)`
          : coveStale
            ? `${coveStale} stale backup(s)`
            : "Backup live Green",
    },
    epp: {
      rag: eppRag,
      cover: Boolean(c.epp),
      href: infected > 0 || eppInc > 0 ? `${base}/epp/incidents` : `${base}/epp/endpoints`,
      hint: !c.epp
        ? "RPM EPP not on cover"
        : infected
          ? `${infected} infected`
          : unmanaged
            ? `${unmanaged} unmanaged endpoint(s)`
            : "EPP live Green",
    },
    csp: {
      rag: off(Boolean(c.csp)),
      cover: Boolean(c.csp),
      href: `${base}/csp`,
      hint: !c.csp
        ? "Microsoft 365 not on cover"
        : "Microsoft 365 posture (not scored in assurance / SLA)",
    },
    tickets: {
      rag: ticketRag,
      cover: !dormant && Boolean(c.tickets),
      href: trueOpenInc > 0 ? `${base}/tickets/open` : `${base}/tickets`,
      hint: dormant
        ? "Dormant — tickets on file, not on SLA until an agent or service is on cover"
        : ticketSlaRag === "Red"
        ? "Ticket SLA miss"
        : trueOpenInc
        ? `${trueOpenInc} open ticket(s)`
        : extra?.incidents?.length
          ? `${extra.incidents.length} ticket(s) on feed`
          : "No tickets for this customer",
    },
    ams: {
      rag: amsRag,
      cover: !dormant,
      href: trueOpenInc > 0 ? `${base}/ams/incidents` : openRisk.length > 0 ? `${base}/ams/risks` : `${base}/ams`,
      hint: dormant
        ? "Dormant — assurance not scored"
        : trueOpenInc
        ? `${trueOpenInc} open incident(s)`
        : openRisk.length
          ? `${openRisk.length} open risk(s)`
          : "Assurance clear",
    },
  };

  const modules: Record<string, LiveFlag> = {
    "": pillars.eco,
    "/ams": pillars.ams,
    "/ams/incidents": {
      rag: incRag,
      cover: true,
      href: `${base}/ams/incidents`,
      hint: trueOpenInc ? `${trueOpenInc} open incident(s)` : "No open incidents",
    },
    "/ams/risks": {
      rag: riskRag,
      cover: true,
      href: `${base}/ams/risks`,
      hint: openRisk.length ? `${openRisk.length} open risk(s)` : "No open risks",
    },
    "/ams/sla": {
      rag: amsSlaRag,
      cover: true,
      href: `${base}/ams/sla`,
      hint: "Customer SLA clocks only — not incidents",
    },
    "/tickets": {
      rag: trueOpenInc > 0 ? "Amber" : "Green",
      cover: true,
      href: `${base}/tickets`,
      hint: extra?.incidents?.length ? `${extra.incidents.length} ticket(s)` : "No tickets for this customer",
    },
    "/tickets/open": {
      rag: trueOpenInc > 0 ? "Amber" : "Green",
      cover: true,
      href: `${base}/tickets/open`,
      hint: trueOpenInc ? `${trueOpenInc} open ticket(s)` : "No open tickets",
    },
    "/tickets/resolved": {
      rag: "Green",
      cover: true,
      href: `${base}/tickets/resolved`,
      hint: "Resolved tickets",
    },
    "/tickets/closed": {
      rag: "Green",
      cover: true,
      href: `${base}/tickets/closed`,
      hint: "Closed tickets",
    },
    "/tickets/sla": {
      rag: extra?.amsSlaSummary && (extra.amsSlaSummary.responsePct ?? 100) < 90 ? "Amber" : "Green",
      cover: true,
      href: `${base}/tickets/sla`,
      hint: "Ticket response and restore clocks",
    },
    "/syspro": { rag: off(Boolean(c.syspro)), cover: Boolean(c.syspro), href: `${base}/syspro`, hint: "SYSPRO overview" },
    "/syspro/dtr": {
      rag: dtrRag,
      cover: Boolean(c.syspro),
      href: `${base}/syspro/dtr`,
      hint: dtr ? `${dtr} FinSight OOB line(s) on this page` : "FinSight clear",
    },
    "/syspro/jobs": {
      rag: jobsRag,
      cover: Boolean(c.syspro),
      href: `${base}/syspro/jobs`,
      hint: jobs ? `${jobs} failed job(s) on this page` : "No failed jobs",
    },
    "/syspro/health": {
      rag: healthRag,
      cover: Boolean(c.syspro),
      href: `${base}/syspro/health`,
      hint: stale ? "Collect older than 24h" : "Health collect fresh",
    },
    "/syspro/day-end": {
      rag: dayRag,
      cover: Boolean(c.syspro),
      href: `${base}/syspro/day-end`,
      hint: extra?.dayEnd?.label || "Day end",
    },
    "/syspro/license": { rag: off(Boolean(c.syspro)), cover: Boolean(c.syspro), href: `${base}/syspro/license`, hint: "Licence" },
    "/syspro/hotfixes": { rag: hfRag, cover: Boolean(c.syspro), href: `${base}/syspro/hotfixes`, hint: "Hotfixes" },
    "/syspro/operators": { rag: off(Boolean(c.syspro)), cover: Boolean(c.syspro), href: `${base}/syspro/operators`, hint: "Operators" },
    "/syspro/security": { rag: off(Boolean(c.syspro)), cover: Boolean(c.syspro), href: `${base}/syspro/security`, hint: "Security" },
    "/syspro/sql": { rag: off(Boolean(c.syspro)), cover: Boolean(c.syspro), href: `${base}/syspro/sql`, hint: "SQL" },
    "/syspro/sla": { rag: sysproRag === "Off" ? off(Boolean(c.syspro)) : sysproRag, cover: Boolean(c.syspro), href: `${base}/syspro/sla`, hint: "SYSPRO SLA" },
    "/rmm": { rag: off(Boolean(c.rmm)), cover: Boolean(c.rmm), href: `${base}/rmm`, hint: c.rmm ? (srvN > 0 ? "RMM overview" : "RMM on cover") : "RMM not on cover" },
    "/rmm/devices": {
      rag: devicesRag,
      cover: srvCover,
      href: `${base}/rmm/devices`,
      hint: !srvCover ? "No Cover for Devices" : srvOff ? `${srvOff} server(s) offline` : "Servers online",
    },
    "/rmm/workstations": {
      rag: wsRag,
      cover: wsCover,
      href: `${base}/rmm/workstations`,
      hint: !wsCover ? "No Cover — no workstations" : wsOff ? `${wsOff} workstation(s) offline` : "Workstations online",
    },
    "/rmm/patch": {
      rag: patchRag,
      cover: Boolean(c.rmm) && srvN > 0,
      href: `${base}/rmm/patch`,
      hint: !hasPatchSnap
        ? "No patch snapshot — not scored"
        : patchMiss
          ? `${patchMiss} missing patch(es)`
          : "Patch compliance",
    },
    "/rmm/alerts": {
      rag: alertsRag,
      cover: Boolean(c.rmm),
      href: `${base}/rmm/alerts`,
      hint: alertCrit ? `${crit || alertN} critical` : "No alerts on file",
    },
    "/rmm/sla": { rag: off(Boolean(c.rmm)), cover: Boolean(c.rmm), href: `${base}/rmm/sla`, hint: "RMM SLA" },
    "/rmm/iops": {
      rag: iopsRag,
      cover: Boolean(c.rmm) || iopsN > 0,
      href: `${base}/rmm/iops`,
      hint: iopsN > 0 ? `${iopsN} IOPS volume(s)` : "No IOPS on file",
    },
    "/rmm/events": {
      rag: eventsRag,
      cover: Boolean(c.rmm) || evN > 0,
      href: `${base}/rmm/events`,
      hint: evN > 0 ? `${evN} event(s)` : "No events on file",
    },
    "/cove": { rag: off(Boolean(c.cove)), cover: Boolean(c.cove), href: `${base}/cove`, hint: c.cove ? "Backup overview" : "Backup not on cover" },
    "/cove/devices": {
      rag: coveDevRag,
      cover: coveDevCover,
      href: `${base}/cove/devices`,
      hint: !coveDevCover ? "No Cover for Devices" : coveFail || coveStale ? "Failed or stale backups on this page" : "Backups healthy",
    },
    "/cove/recovery": { rag: off(Boolean(c.cove)), cover: Boolean(c.cove), href: `${base}/cove/recovery`, hint: "Recovery" },
    "/cove/retention": { rag: off(Boolean(c.cove)), cover: Boolean(c.cove), href: `${base}/cove/retention`, hint: "Retention" },
    "/cove/sla": { rag: off(Boolean(c.cove)), cover: Boolean(c.cove), href: `${base}/cove/sla`, hint: "Backup SLA" },
    "/epp": { rag: off(Boolean(c.epp)), cover: Boolean(c.epp), href: `${base}/epp`, hint: c.epp ? "EPP overview" : "EPP not on cover" },
    "/epp/endpoints": {
      rag: eppEndRag,
      cover: eppDevCover,
      href: `${base}/epp/endpoints`,
      hint: !eppDevCover ? "No Cover for Devices" : unmanaged ? `${unmanaged} unmanaged on this page` : "Endpoints managed",
    },
    "/epp/modules": { rag: off(Boolean(c.epp)), cover: Boolean(c.epp), href: `${base}/epp/modules`, hint: "Policies" },
    "/epp/incidents": {
      rag: eppIncRag,
      cover: Boolean(c.epp),
      href: `${base}/epp/incidents`,
      hint: infected || eppInc ? "Open security incidents" : "No EPP incidents",
    },
    "/epp/quarantine": { rag: off(Boolean(c.epp)), cover: Boolean(c.epp), href: `${base}/epp/quarantine`, hint: "Quarantine" },
    "/epp/sla": { rag: off(Boolean(c.epp)), cover: Boolean(c.epp), href: `${base}/epp/sla`, hint: "EPP SLA" },
    "/csp": { rag: off(Boolean(c.csp)), cover: Boolean(c.csp), href: `${base}/csp`, hint: "Microsoft 365 overview" },
    "/csp/secure-score": {
      rag: scoreRag,
      cover: Boolean(c.csp),
      href: `${base}/csp/secure-score`,
      hint: score != null ? `Secure Score ${score}%` : "Secure Score",
    },
    "/csp/global-admins": {
      rag: gaRag,
      cover: Boolean(c.csp),
      href: `${base}/csp/global-admins`,
      hint: ga != null ? `${ga} global admin(s)` : "Global Admins",
    },
    "/csp/mfa": {
      rag: mfaRag,
      cover: Boolean(c.csp),
      href: `${base}/csp/mfa`,
      hint: mfa != null ? `MFA ${mfa}%` : "MFA",
    },
    "/csp/users": { rag: off(Boolean(c.csp)), cover: Boolean(c.csp), href: `${base}/csp/users`, hint: "Users" },
    "/csp/licenses": { rag: off(Boolean(c.csp)), cover: Boolean(c.csp), href: `${base}/csp/licenses`, hint: "Licences" },
    "/csp/sla": { rag: off(Boolean(c.csp)), cover: Boolean(c.csp), href: `${base}/csp/sla`, hint: "Microsoft 365 SLA" },
  };

  return { pillars, modules };
}

/** Worst covered service/module RAG — same function the rails use. */
export function worstLiveRag(
  code: string,
  row: PortfolioRow | null | undefined,
  cover: CustomerCover | null | undefined,
  extra?: Partial<CustomerDetailPayload> | null,
): HealthRag {
  const r = customerLiveStatus(code, row, cover, extra).pillars.eco.rag;
  if (r === "Red") return "Red";
  if (r === "Amber") return "Amber";
  if (r === "Off") return "Off";
  return "Green";
}

export function issueHrefForDrill(code: string, drill: string | null): string {
  const base = `/customers/${encodeURIComponent(code)}`;
  if (drill === "finsight") return `${base}/syspro/dtr`;
  if (drill === "jobs") return `${base}/syspro/jobs`;
  if (drill === "rmm-offline") return `${base}/rmm/devices`;
  if (drill === "rmm-critical") return `${base}/rmm/alerts`;
  if (drill === "backup") return `${base}/cove/devices`;
  if (drill === "stale") return `${base}/syspro/health`;
  if (drill === "risks") return `${base}/ams/risks`;
  if (drill === "incidents" || drill === "rag-amber" || drill === "rag-red" || drill === "attention")
    return `${base}/ams`;
  if (drill === "sla") return `${base}/ams/sla`;
  return `${base}/ams`;
}
