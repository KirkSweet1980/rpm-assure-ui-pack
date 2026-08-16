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

/** Per-service and per-module live RAG + where an amber click should land. */
export function customerLiveStatus(
  code: string,
  row: PortfolioRow | null | undefined,
  cover: CustomerCover | null | undefined,
  extra?: Pick<CustomerDetailPayload, "incidents" | "risks" | "issues" | "amsSlaSummary"> | null,
): { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> } {
  const base = `/customers/${encodeURIComponent(code)}`;
  const c = cover ?? { syspro: false, rmm: false, cove: false, epp: false, csp: false };
  const jobs = row?.sysproJobErrorCount ?? 0;
  const dtr = row?.sysproDtrVarianceLines ?? 0;
  const stale =
    c.syspro &&
    (!row?.lastImportAt ||
      (Date.now() - new Date(row.lastImportAt).getTime()) / 3600000 > 24);
  const srvOff = row?.pulsewayServerOffline ?? 0;
  const crit = row?.pulsewayCriticalAlerts ?? 0;
  const rmmOff = row?.pulsewayOfflineCount ?? 0;
  const coveFail = row?.coveFailedDeviceCount ?? 0;
  const coveStale = row?.coveStaleDeviceCount ?? 0;
  const eppAll = row?.eppDeviceCount ?? 0;
  const eppManaged = row?.eppManagedCount ?? 0;
  const eppUnmanaged = Math.max(0, eppAll - eppManaged);
  const infected = row?.bdInfectedCount ?? 0;
  const mfa = row?.cspMfaRegisteredPct;
  const ga = row?.cspGlobalAdminCount;
  const score = row?.cspSecureScorePct;
  const openInc =
    extra?.amsSlaSummary?.openCount ??
    extra?.incidents?.filter((i) => String((i as { status?: string }).status ?? "").toLowerCase() !== "closed").length ??
    0;
  const openRisk = extra?.risks?.length ?? 0;
  const openIssue = extra?.issues?.length ?? 0;

  const sysproRag: LiveTone = !c.syspro
    ? "Off"
    : jobs >= 10
      ? "Red"
      : jobs > 0 || dtr > 0 || stale
        ? "Amber"
        : "Green";
  const rmmRag: LiveTone = !c.rmm
    ? "Off"
    : crit > 0
      ? "Red"
      : srvOff > 0 || rmmOff > 0
        ? "Amber"
        : "Green";
  const coveRag: LiveTone = !c.cove
    ? "Off"
    : coveFail > 0
      ? "Red"
      : coveStale > 0
        ? "Amber"
        : "Green";
  const eppRag: LiveTone = !c.epp
    ? "Off"
    : infected > 0
      ? "Red"
      : eppUnmanaged > 0
        ? "Amber"
        : "Green";
  const cspRag: LiveTone = !c.csp
    ? "Off"
    : (mfa != null && mfa < 80) || (ga != null && ga > 5)
      ? "Red"
      : (mfa != null && mfa < 90) || (ga != null && ga > 2) || (score != null && score < 50)
        ? "Amber"
        : "Green";
  const amsRag: LiveTone =
    openInc > 0 && (extra?.amsSlaSummary?.majorOpenCount ?? 0) > 0
      ? "Red"
      : openInc > 0 || openRisk > 0 || openIssue > 0
        ? "Amber"
        : "Green";
  const ecoRag = [sysproRag, rmmRag, coveRag, eppRag, cspRag, amsRag].reduce(worse, "Green");

  const pillars: Record<string, LiveFlag> = {
    eco: {
      rag: ecoRag === "Off" ? "Green" : ecoRag,
      cover: true,
      href: `${base}/ams`,
      hint: `Tenant live ${ecoRag}`,
    },
    syspro: {
      rag: sysproRag,
      cover: Boolean(c.syspro),
      href: jobs > 0 ? `${base}/syspro/jobs` : dtr > 0 ? `${base}/syspro/dtr` : `${base}/syspro`,
      hint: !c.syspro
        ? "SYSPRO not on cover"
        : jobs
          ? `${jobs} job error(s)`
          : dtr
            ? `${dtr} FinSight OOB`
            : stale
              ? "Collect stale"
              : "SYSPRO live Green",
    },
    rmm: {
      rag: rmmRag,
      cover: Boolean(c.rmm),
      href: crit > 0 ? `${base}/rmm/alerts` : `${base}/rmm/devices`,
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
      href: infected > 0 ? `${base}/epp/incidents` : `${base}/epp/endpoints`,
      hint: !c.epp
        ? "Endpoint Security not on cover"
        : infected
          ? `${infected} infected`
          : eppUnmanaged
            ? `${eppUnmanaged} unmanaged`
            : "EPP live Green",
    },
    csp: {
      rag: cspRag,
      cover: Boolean(c.csp),
      href: mfa != null && mfa < 90 ? `${base}/csp/mfa` : `${base}/csp`,
      hint: !c.csp ? "Microsoft 365 not on cover" : "Microsoft 365 live status",
    },
    ams: {
      rag: amsRag,
      cover: true,
      href: openInc > 0 ? `${base}/ams/incidents` : openRisk > 0 ? `${base}/ams/risks` : `${base}/ams`,
      hint: openInc || openRisk || openIssue ? "Open assurance items" : "Assurance clear",
    },
  };

  const modules: Record<string, LiveFlag> = {
    "": pillars.eco,
    "/ams": pillars.ams,
    "/ams/incidents": {
      rag: openInc > 0 ? (extra?.amsSlaSummary?.majorOpenCount ? "Red" : "Amber") : "Green",
      cover: true,
      href: `${base}/ams/incidents`,
      hint: openInc ? `${openInc} open incident(s)` : "No open incidents",
    },
    "/ams/risks": {
      rag: openRisk > 0 ? "Amber" : "Green",
      cover: true,
      href: `${base}/ams/risks`,
      hint: openRisk ? `${openRisk} open risk(s)` : "No open risks",
    },
    "/ams/sla": { rag: amsRag, cover: true, href: `${base}/ams/sla`, hint: "Customer SLA" },
    "/syspro": pillars.syspro,
    "/syspro/dtr": {
      rag: !c.syspro ? "Off" : dtr > 0 ? "Amber" : "Green",
      cover: Boolean(c.syspro),
      href: `${base}/syspro/dtr`,
      hint: dtr ? `${dtr} FinSight OOB line(s)` : "FinSight clear",
    },
    "/syspro/jobs": {
      rag: !c.syspro ? "Off" : jobs >= 10 ? "Red" : jobs > 0 ? "Amber" : "Green",
      cover: Boolean(c.syspro),
      href: `${base}/syspro/jobs`,
      hint: jobs ? `${jobs} job error(s)` : "No job errors",
    },
    "/syspro/health": {
      rag: !c.syspro ? "Off" : stale ? "Amber" : "Green",
      cover: Boolean(c.syspro),
      href: `${base}/syspro/health`,
      hint: stale ? "Collect stale" : "Health collect fresh",
    },
    "/syspro/day-end": { rag: sysproRag, cover: Boolean(c.syspro), href: `${base}/syspro/day-end`, hint: "Day end" },
    "/syspro/license": { rag: sysproRag === "Off" ? "Off" : "Green", cover: Boolean(c.syspro), href: `${base}/syspro/license`, hint: "Licence" },
    "/syspro/hotfixes": { rag: sysproRag === "Off" ? "Off" : "Green", cover: Boolean(c.syspro), href: `${base}/syspro/hotfixes`, hint: "Hotfixes" },
    "/syspro/operators": { rag: sysproRag === "Off" ? "Off" : "Green", cover: Boolean(c.syspro), href: `${base}/syspro/operators`, hint: "Operators" },
    "/syspro/security": { rag: sysproRag === "Off" ? "Off" : "Green", cover: Boolean(c.syspro), href: `${base}/syspro/security`, hint: "Security" },
    "/syspro/sql": { rag: sysproRag === "Off" ? "Off" : "Green", cover: Boolean(c.syspro), href: `${base}/syspro/sql`, hint: "SQL" },
    "/rmm": pillars.rmm,
    "/rmm/devices": {
      rag: !c.rmm ? "Off" : srvOff > 0 ? (crit > 0 ? "Red" : "Amber") : "Green",
      cover: Boolean(c.rmm),
      href: `${base}/rmm/devices`,
      hint: srvOff ? `${srvOff} server(s) offline` : "Servers online",
    },
    "/rmm/workstations": {
      rag: !c.rmm ? "Off" : (row?.pulsewayWorkstationOffline ?? 0) > 0 ? "Amber" : "Green",
      cover: Boolean(c.rmm),
      href: `${base}/rmm/workstations`,
      hint: "Workstations",
    },
    "/rmm/patch": {
      rag: !c.rmm ? "Off" : (row?.pulsewayPatchMissing ?? 0) > 0 ? "Amber" : "Green",
      cover: Boolean(c.rmm),
      href: `${base}/rmm/patch`,
      hint: "Patch compliance",
    },
    "/rmm/alerts": {
      rag: !c.rmm ? "Off" : crit > 0 ? "Red" : "Green",
      cover: Boolean(c.rmm),
      href: `${base}/rmm/alerts`,
      hint: crit ? `${crit} critical` : "No critical alerts",
    },
    "/rmm/sla": { rag: rmmRag, cover: Boolean(c.rmm), href: `${base}/rmm/sla`, hint: "RMM SLA" },
    "/cove": pillars.cove,
    "/cove/devices": pillars.cove,
    "/cove/recovery": { rag: coveRag, cover: Boolean(c.cove), href: `${base}/cove/recovery`, hint: "Recovery" },
    "/cove/retention": { rag: coveRag, cover: Boolean(c.cove), href: `${base}/cove/retention`, hint: "Retention" },
    "/cove/sla": { rag: coveRag, cover: Boolean(c.cove), href: `${base}/cove/sla`, hint: "Backup SLA" },
    "/epp": pillars.epp,
    "/epp/endpoints": {
      rag: eppRag,
      cover: Boolean(c.epp),
      href: `${base}/epp/endpoints`,
      hint: "Endpoints",
    },
    "/epp/modules": { rag: eppRag === "Off" ? "Off" : "Green", cover: Boolean(c.epp), href: `${base}/epp/modules`, hint: "Policies" },
    "/epp/incidents": {
      rag: !c.epp ? "Off" : infected > 0 ? "Red" : "Green",
      cover: Boolean(c.epp),
      href: `${base}/epp/incidents`,
      hint: "Security incidents",
    },
    "/epp/quarantine": { rag: eppRag === "Off" ? "Off" : "Green", cover: Boolean(c.epp), href: `${base}/epp/quarantine`, hint: "Quarantine" },
    "/epp/sla": { rag: eppRag, cover: Boolean(c.epp), href: `${base}/epp/sla`, hint: "EPP SLA" },
    "/csp": pillars.csp,
    "/csp/secure-score": {
      rag: !c.csp ? "Off" : score != null && score < 50 ? "Amber" : "Green",
      cover: Boolean(c.csp),
      href: `${base}/csp/secure-score`,
      hint: "Secure Score",
    },
    "/csp/global-admins": {
      rag: !c.csp ? "Off" : ga != null && ga > 2 ? "Amber" : "Green",
      cover: Boolean(c.csp),
      href: `${base}/csp/global-admins`,
      hint: "Global Admins",
    },
    "/csp/mfa": {
      rag: !c.csp ? "Off" : mfa != null && mfa < 90 ? "Amber" : "Green",
      cover: Boolean(c.csp),
      href: `${base}/csp/mfa`,
      hint: "MFA",
    },
    "/csp/users": { rag: cspRag === "Off" ? "Off" : "Green", cover: Boolean(c.csp), href: `${base}/csp/users`, hint: "Users" },
    "/csp/licenses": { rag: cspRag === "Off" ? "Off" : "Green", cover: Boolean(c.csp), href: `${base}/csp/licenses`, hint: "Licences" },
  };

  return { pillars, modules };
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
