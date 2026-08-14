import type {
  CustomerDetailPayload,
  DtrLevel1Row,
  DtrDetailLine,
  FinSightReconCase,
  HealthLogRow,
  HealthRag,
  FactIncidentRow,
  FactIssueRow,
  FactPriorityRow,
  FactProblemRow,
  FactRiskRow,
  AvailabilitySlaSnapshot,
  FactChangeRow,
  FactCsatRow,
  JobErrorRow,
  SlaPolicyRow,
  LicenseRow,
  OperatorRow,
  PortfolioPayload,
  PortfolioRow,
  ExcoCustomerBoard,
  ExcoInsightPayload,
  TaskGroupRow,
  TaskItemRow,
  OperGroupRow,
  OperAmendRow,
  ExecSummaryRow,
  ExecNarrativeRow,
  AuditEventRow,
  DiagSummaryRow,
  SqlHealthRow,
  OperationalAssurance,
  SqlBackupRow,
  SqlBackupFailureRow,
  SysproVersionInfo,
  SysproHotfixRow,
  HotfixGapRow,
  HotfixGapSummary,
  RmmPayload,
  CovePayload,
  EppPayload,
  CspPayload,
  CspLicenseRow,
  CspUserRow,
  EppDeviceRow,
  RmmDeviceRow,
  RmmAlertRow,
  RmmOrgMapRow,
  RmmOrgSummary,
  CustomerCover,
  DetailLeg,
} from "./types";
import { formatSastDate } from "@/lib/utils";
import { finsightOobAttention } from "@/lib/brand/finsight";
import { classifyRmmDevice } from "@/lib/data/rmm-device-class";
import { coveHealthFor, finalizeEstateHealth, healthFor, healthScorePctFromRag, rmmHealthFor } from "./health-rag";
import { buildDayEndSnapshot, isDayEndText, isJobFailed, type DayEndSnapshot } from "./day-end";
import { averageCoveredScores, anyCover, inferCustomerCover, forceSysproCoverIfEvidence } from "./cover";
import { buildExcoPillarSla, hasSlaCover } from "./exco-sla-stats";
import { auditPortfolioRows } from "./pillar-audit";
import { getPool, sql } from "./sql-pool";

type CustRow = {
  CustomerCode: string;
  DisplayName: string;
  Active: boolean;
  PulsewayOrgName?: string | null;
  PillarSyspro?: boolean | number | null;
  PillarPulseway?: boolean | number | null;
  PillarCove?: boolean | number | null;
  SqlInstanceName: string | null;
  OperatorCount: number;
  ActiveUserCount: number;
  LastImportAt: Date | string | null;
  AsOfDate: Date | string | null;
  JobErrorCount: number;
  DtrVarianceLines: number;
};

function toIso(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  if (d instanceof Date) return d.toISOString();
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x.toISOString();
}

/** Strip GravityZone MAC suffix: HOST-00155d15120e → HOST */
function stripEppMacSuffix(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/-[0-9a-f]{12}$/i, "").trim();
}

/** Group key for endpoint identity (FQDN → IP → cleaned name). */
function eppDeviceIdentityKey(d: EppDeviceRow): string {
  const fqdn = (d.fqdn ?? "").trim().toLowerCase();
  if (fqdn) return `fqdn:${fqdn}`;
  const ip = (d.ipAddress ?? "").trim();
  if (ip) return `ip:${ip}`;
  const base = stripEppMacSuffix(d.deviceName).toLowerCase();
  if (base) return `name:${base}`;
  return `id:${d.endpointId || "unknown"}`;
}

function eppDeviceScore(d: EppDeviceRow): number {
  let s = 0;
  if (d.isManaged) s += 20;
  const pol = (d.policyName ?? "").toLowerCase();
  if (pol && !pol.includes("default")) s += 12;
  else if (pol) s += 2;
  const name = d.deviceName ?? "";
  if (name && !/-[0-9a-f]{12}$/i.test(name)) s += 10;
  s -= Math.min(name.length, 80) * 0.05;
  if (d.fqdn) s += 1;
  return s;
}

/**
 * GravityZone often returns the same machine twice (clean name + name-MAC)
 * under different EndpointIds. Collapse to one row per host for all customers.
 */
function dedupeEppDevices(devices: EppDeviceRow[]): EppDeviceRow[] {
  if (devices.length <= 1) return devices;
  const best = new Map<string, EppDeviceRow>();
  for (const d of devices) {
    const key = eppDeviceIdentityKey(d);
    const prev = best.get(key);
    if (!prev) {
      best.set(key, { ...d });
      continue;
    }
    const winner =
      eppDeviceScore(d) >= eppDeviceScore(prev) ? { ...d } : { ...prev };
    const loser = winner.endpointId === d.endpointId ? prev : d;

    // Prefer clean hostname (no -xxxxxxxxxxxx MAC suffix)
    const wName = winner.deviceName ?? "";
    const lName = loser.deviceName ?? "";
    if (/-[0-9a-f]{12}$/i.test(wName) && lName && !/-[0-9a-f]{12}$/i.test(lName)) {
      winner.deviceName = lName;
    } else if (!wName && lName) {
      winner.deviceName = stripEppMacSuffix(lName) || lName;
    }

    // Prefer non-default company policy
    const wPol = (winner.policyName ?? "").toLowerCase();
    const lPol = (loser.policyName ?? "").toLowerCase();
    if (
      (!winner.policyName || wPol.includes("default")) &&
      loser.policyName &&
      !lPol.includes("default")
    ) {
      winner.policyName = loser.policyName;
    }

    if (winner.isManaged == null && loser.isManaged != null) {
      winner.isManaged = loser.isManaged;
    }
    if (!winner.fqdn && loser.fqdn) winner.fqdn = loser.fqdn;
    if (!winner.ipAddress && loser.ipAddress) winner.ipAddress = loser.ipAddress;
    if (!winner.operatingSystem && loser.operatingSystem) {
      winner.operatingSystem = loser.operatingSystem;
    }

    best.set(key, winner);
  }
  return Array.from(best.values()).sort((a, b) =>
    (a.deviceName ?? "").localeCompare(b.deviceName ?? "", undefined, {
      sensitivity: "base",
    }),
  );
}

function eppSummaryFromDevices(
  devices: EppDeviceRow[],
  lastImportAt: string | null = null,
) {
  const managed = devices.filter((d) => d.isManaged).length;
  return {
    deviceCount: devices.length,
    managedCount: managed,
    unmanagedCount: devices.length - managed,
    workstationCount: devices.filter((d) => d.machineType === 5).length,
    serverCount: devices.filter((d) => d.machineType === 6).length,
    lastImportAt,
    asOfDate: devices[0]?.snapshotDate ?? null,
  };
}


/** Classify Cove backup health from status text + last success age vs snapshot/now */
function classifyCoveBackupStatus(
  status: string | null | undefined,
  lastSuccessIso: string | null | undefined,
  asOfIso?: string | null,
): "ok" | "stale" | "failed" {
  const st = (status || "").toLowerCase();
  if (st.includes("fail") || st.includes("error") || st.includes("overdue") || st.includes("abort")) {
    return "failed";
  }
  if (st.includes("stale") || st.includes("warn") || st.includes("missed")) {
    return "stale";
  }
  const asOf = asOfIso ? Date.parse(asOfIso) : Date.now();
  const last = lastSuccessIso ? Date.parse(lastSuccessIso) : NaN;
  if (!Number.isFinite(last)) {
    // No success ever recorded on this row — treat as failed if no success signal
    if (!st || st === "unknown" || st === "—" || st === "-") return "failed";
    return "ok";
  }
  const ageH = (asOf - last) / 3_600_000;
  if (ageH > 72) return "failed";
  if (ageH > 36) return "stale";
  return "ok";
}

function toDateOnly(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return x.toISOString().slice(0, 10);
}


function mapCustomer(r: CustRow): PortfolioRow {
  const operatorCount = Number(r.OperatorCount) || 0;
  const jobErrorCount = Number(r.JobErrorCount) || 0;
  const dtrVariance = Number(r.DtrVarianceLines) || 0;
  const activeUserCount = Number(r.ActiveUserCount) || 0;
  const asOf = toDateOnly(r.AsOfDate);
  const lastImportAt = toIso(r.LastImportAt);
  // null = unset (infer); false = explicit no cover from AmsConfig
  const pillarSyspro =
    r.PillarSyspro == null ? null : Boolean(r.PillarSyspro);
  const pillarPulseway =
    r.PillarPulseway == null ? null : Boolean(r.PillarPulseway);
  const pillarCove = r.PillarCove == null ? null : Boolean(r.PillarCove);
  const pulsewayOrgName =
    r.PulsewayOrgName != null && String(r.PulsewayOrgName).trim()
      ? String(r.PulsewayOrgName)
      : null;

  const cover = inferCustomerCover({
    pillarSyspro,
    pillarPulseway,
    pillarCove,
    sqlInstanceName: r.SqlInstanceName,
    operatorCount,
    activeUserCount,
    sysproLastImportAt: lastImportAt,
    pulsewayOrgName,
  });

  // Provisional SYSPRO-only health; finalizeEstateHealth after RMM/Cove enrich
  const sys = cover.syspro
    ? healthFor({
        operatorCount,
        jobErrorCount,
        dtrVariance,
        activeUserCount,
      })
    : null;
  const provisional = finalizeEstateHealth({
    cover,
    syspro: sys,
    rmm: null,
    cove: null,
  });

  return {
    customerCode: r.CustomerCode,
    displayName: r.DisplayName,
    active: Boolean(r.Active),
    sqlInstanceName: r.SqlInstanceName,
    asOfDate: asOf,
    healthRag: provisional.rag,
    healthSummary: provisional.summary,
    activeUserCount,
    operatorCount,
    sysproJobErrorCount: jobErrorCount,
    sysproDtrVarianceLines: dtrVariance,
    lastImportAt,
    reportingPeriod: asOf ? formatSastDate(asOf) : formatSastDate(new Date()),
    pulsewayOrgName,
    cover,
    pillarSyspro,
    pillarPulseway,
    pillarCove,
  };
}

/** Recompute estate RAG from covered pillars only (call after RMM/Cove/EPP/CSP enrich). */
function recomputeRowHealth(row: PortfolioRow): void {
  // AmsConfig row present if any pillar flag was set from enrich (true or false).
  const hasAmsConfig =
    row.pillarSyspro === true ||
    row.pillarSyspro === false ||
    row.pillarPulseway === true ||
    row.pillarPulseway === false ||
    row.pillarCove === true ||
    row.pillarCove === false ||
    row.pillarEpp === true ||
    row.pillarEpp === false ||
    row.pillarCsp === true ||
    row.pillarCsp === false;
  let cover2 = inferCustomerCover({
    hasAmsConfig,
    pillarSyspro: row.pillarSyspro,
    pillarPulseway: row.pillarPulseway,
    pillarCove: row.pillarCove,
    pillarEpp: row.pillarEpp,
    pillarCsp: row.pillarCsp,
    sqlInstanceName: row.sqlInstanceName,
    operatorCount: row.operatorCount,
    activeUserCount: row.activeUserCount,
    sysproLastImportAt: row.lastImportAt,
    pulsewayOrgName: row.pulsewayOrgName,
    pulsewayDeviceCount: row.pulsewayDeviceCount,
    pulsewayMapped: (row.pulsewayDeviceCount ?? 0) > 0 || Boolean(row.pulsewayOrgName) || row.pillarPulseway === true,
    coveDeviceCount: row.coveDeviceCount,
    coveMapped: (row.coveDeviceCount ?? 0) > 0 || row.pillarCove === true,
    eppDeviceCount: row.eppDeviceCount ?? 0,
    eppMapped: (row.eppDeviceCount ?? 0) > 0,
    cspUserCount: row.cspUserCount ?? 0,
    cspLicenseCount: row.cspLicenseSkuCount ?? 0,
    cspMapped: row.pillarCsp === true,
  });
  // Instance mapped => Covered unless explicit PillarSyspro = false (deferred No Cover)
  if (
    row.pillarSyspro !== false &&
    row.sqlInstanceName &&
    String(row.sqlInstanceName).trim()
  ) {
    cover2 = { ...cover2, syspro: true };
  }
  // Live device/seat counts only (map-only is No Cover). Same for every customer.
  if ((row.pulsewayDeviceCount ?? 0) > 0 && row.pillarPulseway !== false) {
    cover2 = { ...cover2, rmm: true };
  }
  if ((row.coveDeviceCount ?? 0) > 0 && row.pillarCove !== false) {
    cover2 = { ...cover2, cove: true };
  }
  if ((row.eppDeviceCount ?? 0) > 0 && row.pillarEpp !== false) {
    cover2 = { ...cover2, epp: true };
  }
  if (
    ((row.cspUserCount ?? 0) > 0 || (row.cspLicenseSkuCount ?? 0) > 0) &&
    row.pillarCsp !== false
  ) {
    cover2 = { ...cover2, csp: true };
  }
  row.cover = cover2;
  if (!cover2.syspro) {
    row.sysproJobErrorCount = 0;
    row.sysproDtrVarianceLines = 0;
    row.operatorCount = 0;
    row.activeUserCount = 0;
  }

  const sys = cover2.syspro
    ? healthFor({
        operatorCount: row.operatorCount,
        jobErrorCount: row.sysproJobErrorCount,
        dtrVariance: row.sysproDtrVarianceLines,
        activeUserCount: row.activeUserCount,
      })
    : null;

  // SLA / estate RMM health: SERVERS ONLY (workstations never enter SLA)
  const rmm =
    cover2.rmm
      ? (() => {
          const srvOn = row.pulsewayServerOnline ?? 0;
          const srvOff = row.pulsewayServerOffline ?? 0;
          const srvN = srvOn + srvOff;
          if (srvN > 0) {
            return rmmHealthFor({
              deviceCount: srvN,
              offlineCount: srvOff,
              criticalAlerts: row.pulsewayCriticalAlerts ?? 0,
              elevatedAlerts: row.pulsewayElevatedAlerts ?? 0,
            });
          }
          // Pure workstation / unclassified estate: do not use all-device offline
          if ((row.pulsewayDeviceCount ?? 0) > 0) {
            return {
              rag: "Green" as const,
              summary:
                "RMM on cover — no servers classified (workstations excluded from SLA).",
            };
          }
          return {
            rag: "Amber" as const,
            summary: "RMM covered — no device snapshot yet.",
          };
        })()
      : null;


  const cove =
    cover2.cove
      ? (row.coveDeviceCount ?? 0) > 0
        ? coveHealthFor({
            deviceCount: row.coveDeviceCount ?? 0,
            failedCount: row.coveFailedDeviceCount ?? 0,
            staleCount: row.coveStaleDeviceCount ?? 0,
          })
        : {
            rag: "Amber" as const,
            summary: "Cyber Backup covered — no device snapshot yet.",
          }
      : null;

  if (rmm) {
    row.pulsewayHealthRag = rmm.rag;
    row.pulsewayHealthSummary = rmm.summary;
  } else {
    row.pulsewayHealthRag = null;
    row.pulsewayHealthSummary = "No cover";
  }

  const fin = finalizeEstateHealth({
    cover: cover2,
    syspro: sys,
    rmm,
    cove,
  });
  row.healthRag = fin.rag;
  row.healthSummary = fin.summary;
}

const HEALTH_INPUT_KEYS = [
  "operatorCount",
  "activeUserCount",
  "sysproJobErrorCount",
  "sysproDtrVarianceLines",
  "lastImportAt",
  "asOfDate",
  "sqlInstanceName",
  "pulsewayDeviceCount",
  "pulsewayOnlineCount",
  "pulsewayOfflineCount",
  "pulsewayCriticalAlerts",
  "pulsewayElevatedAlerts",
  "pulsewayServerOnline",
  "pulsewayServerOffline",
  "pulsewayWorkstationOnline",
  "pulsewayWorkstationOffline",
  "pulsewayOrgName",
  "pulsewayHealthRag",
  "pulsewayHealthSummary",
  "coveDeviceCount",
  "coveFailedDeviceCount",
  "coveStaleDeviceCount",
  "coveOkDeviceCount",
] as const;

/** Copy estate health inputs from a portfolio row (same numbers the left rail uses). */
function copyHealthInputs(target: PortfolioRow, src: PortfolioRow): void {
  for (const k of HEALTH_INPUT_KEYS) {
    const v = src[k];
    if (v !== undefined && v !== null) {
      (target as Record<string, unknown>)[k] = v;
    }
  }
  if (src.cover) target.cover = { ...src.cover };
  if (src.healthRag) target.healthRag = src.healthRag;
  if (src.healthSummary) target.healthSummary = src.healthSummary;
}

function portfolioRowForCode(
  rows: PortfolioRow[] | undefined,
  code: string,
): PortfolioRow | undefined {
  const u = code.toUpperCase();
  return rows?.find((r) => r.customerCode.toUpperCase() === u);
}

/**
 * Shell customer pages skip the heavy SYSPRO warehouse load, so healthFor()
 * used to see 0 operators / 0 jobs and paint Amber while the left rail
 * (full portfolio) showed Red. Seed the same counts the estate uses.
 */
async function hydrateHealthInputsFromEstate(
  pool: Awaited<ReturnType<typeof getPool>>,
  customer: PortfolioRow,
): Promise<void> {
  const code = customer.customerCode;
  try {
    const { cacheGet } = await import("./query-cache");
    const hit = cacheGet<PortfolioPayload>("portfolio", 180_000);
    const row = portfolioRowForCode(hit?.rows, code);
    if (row) {
      copyHealthInputs(customer, row);
      return;
    }
  } catch {
    /* cache optional */
  }

  if (!pool) return;
  const instance =
    (customer.sqlInstanceName && String(customer.sqlInstanceName).trim()) ||
    null;
  if (!instance && !code) return;

  try {
    const req = pool.request().input("code", sql.NVarChar(50), code);
    if (instance) req.input("instance", sql.NVarChar(100), instance);
    const q = await req.query<{
      OperatorCount: number;
      ActiveUserCount: number;
      JobErrorCount: number;
      DtrVarianceLines: number;
      LastImportAt: Date | null;
      AsOfDate: Date | null;
    }>(`
SELECT
  ISNULL(o.OperatorCount, 0) AS OperatorCount,
  ISNULL(o.ActiveUserCount, 0) AS ActiveUserCount,
  ISNULL(j.JobErrorCount, 0) AS JobErrorCount,
  ISNULL(d.DtrVarianceLines, 0) AS DtrVarianceLines,
  o.LastImportAt,
  o.AsOfDate
FROM (SELECT CAST(1 AS bit) AS _) AS dummy
OUTER APPLY (
  SELECT TOP (1)
    s.SnapshotDate AS AsOfDate,
    COUNT_BIG(*) AS OperatorCount,
    SUM(CASE
      WHEN s.LastLoginDate IS NOT NULL
       AND s.LastLoginDate >= DATEADD(day, -30, SYSUTCDATETIME())
      THEN 1 ELSE 0 END) AS ActiveUserCount,
    MAX(s.ImportedAt) AS LastImportAt
  FROM dbo.Syspro_Operators AS s
  WHERE ${instance ? "s.InstanceName = @instance" : "1 = 0"}
  GROUP BY s.SnapshotDate
  ORDER BY s.SnapshotDate DESC
) AS o
OUTER APPLY (
  SELECT COUNT_BIG(*) AS JobErrorCount
  FROM dbo.Syspro_JobLogging AS jl
  WHERE ${instance ? "jl.InstanceName = @instance" : "1 = 0"}
    AND o.AsOfDate IS NOT NULL
    AND jl.SnapshotDate = o.AsOfDate
    AND (
      NULLIF(LTRIM(RTRIM(jl.ErrorStatusCode)), N'') IS NOT NULL
      OR (jl.ProgErrorCode IS NOT NULL AND jl.ProgErrorCode <> 0)
      OR (jl.TransactionStatus LIKE N'%Fail%')
      OR (jl.Message LIKE N'%error%')
    )
) AS j
OUTER APPLY (
  SELECT COUNT_BIG(*) AS DtrVarianceLines
  FROM dbo.vw_Kpi_FinSight_Variance_Latest AS dv
  WHERE dv.CustomerCode = @code
) AS d`);
    const row = q.recordset?.[0];
    if (!row) return;
    customer.operatorCount = Number(row.OperatorCount) || 0;
    customer.activeUserCount = Number(row.ActiveUserCount) || 0;
    customer.sysproJobErrorCount = Number(row.JobErrorCount) || 0;
    customer.sysproDtrVarianceLines = Number(row.DtrVarianceLines) || 0;
    if (row.LastImportAt) customer.lastImportAt = toIso(row.LastImportAt);
    if (row.AsOfDate) customer.asOfDate = toDateOnly(row.AsOfDate);
  } catch (e) {
    console.warn(
      "[rpm-assure] hydrate SYSPRO health counts:",
      e instanceof Error ? e.message : e,
    );
  }
}

function applyPulsewayToRow(
  row: PortfolioRow,
  pw: {
    deviceCount: number;
    onlineCount: number;
    offlineCount: number;
    criticalAlerts: number;
    elevatedAlerts: number;
    lastImportAt: string | null;
    organizationName: string | null;
    serverOnline?: number;
    serverOffline?: number;
    workstationOnline?: number;
    workstationOffline?: number;
    patchMissing?: number;
    patchDevices?: number;
    patchCompliant?: number;
    diskHighCount?: number;
  },
): void {
  row.pulsewayDeviceCount = pw.deviceCount;
  row.pulsewayOnlineCount = pw.onlineCount;
  row.pulsewayOfflineCount = pw.offlineCount;
  row.pulsewayCriticalAlerts = pw.criticalAlerts;
  row.pulsewayElevatedAlerts = pw.elevatedAlerts;
  row.pulsewayLastImportAt = pw.lastImportAt;
  if (pw.organizationName) row.pulsewayOrgName = pw.organizationName;
  if (!row.lastImportAt && pw.lastImportAt) row.lastImportAt = pw.lastImportAt;
  if (pw.serverOnline != null) row.pulsewayServerOnline = pw.serverOnline;
  if (pw.serverOffline != null) row.pulsewayServerOffline = pw.serverOffline;
  if (pw.workstationOnline != null) row.pulsewayWorkstationOnline = pw.workstationOnline;
  if (pw.workstationOffline != null) row.pulsewayWorkstationOffline = pw.workstationOffline;
  if (pw.patchMissing != null) row.pulsewayPatchMissing = pw.patchMissing;
  if (pw.patchDevices != null) row.pulsewayPatchDevices = pw.patchDevices;
  if (pw.patchCompliant != null) row.pulsewayPatchCompliant = pw.patchCompliant;
  if (pw.diskHighCount != null) row.pulsewayDiskHighCount = pw.diskHighCount;
  // Health recomputed in recomputeRowHealth after all enriches
}

async function enrichPulsewayPortfolio(
  pool: NonNullable<Awaited<ReturnType<typeof getPool>>>,
  rows: PortfolioRow[],
): Promise<void> {
  try {
    const singleCode =
      rows.length === 1 ? String(rows[0].customerCode || "").trim() : "";
    let recs: Record<string, unknown>[] = [];
    try {
      const req = pool.request();
      let orgSql = `
SELECT CustomerCode, AsOfDate, OrganizationName, DeviceCount, OnlineCount, OfflineCount,
  CriticalAlerts, ElevatedAlerts, ImportedAt
FROM dbo.vw_Kpi_Rmm_OrgSummary_Latest WITH (NOLOCK)`;
      if (singleCode) {
        req.input("code", sql.NVarChar(50), singleCode);
        orgSql += `
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))`;
      }
      const res = await req.query(orgSql);
      recs = (res.recordset ?? []) as Record<string, unknown>[];
    } catch {
      const res = await pool.request().query(`
SELECT p.CustomerCode, p.SnapshotDate AS AsOfDate, p.OrganizationName,
  p.DeviceCount, p.OnlineCount, p.OfflineCount,
  p.CriticalAlerts, p.ElevatedAlerts, p.ImportedAt
FROM dbo.Pulseway_OrgSummary AS p WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_OrgSummary WITH (NOLOCK)
  GROUP BY CustomerCode
) m ON m.CustomerCode = p.CustomerCode AND m.mx = p.SnapshotDate`);
      recs = (res.recordset ?? []) as Record<string, unknown>[];
    }
    const byCode = new Map<string, Record<string, unknown>>();
    for (const r of recs) byCode.set(String(r.CustomerCode).toUpperCase(), r);

    // Server / workstation online-offline from latest devices (class via DeviceType or OS name)
    const classByCode = new Map<
      string,
      {
        serverOnline: number;
        serverOffline: number;
        workstationOnline: number;
        workstationOffline: number;
      }
    >();
    try {
      const classRes = await pool.request().query(`
;WITH latest AS (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  GROUP BY CustomerCode
),
d AS (
  SELECT
    p.CustomerCode,
    CASE
      WHEN p.IsOnline = 1 THEN 1
      WHEN p.IsOnline = 0 THEN 0
      WHEN p.LastSeenOnline IS NOT NULL
        AND p.LastSeenOnline >= DATEADD(MINUTE, -30, SYSUTCDATETIME()) THEN 1
      WHEN p.LastSeenOnline IS NOT NULL
        AND p.LastSeenOnline < DATEADD(MINUTE, -120, SYSUTCDATETIME()) THEN 0
      ELSE 0
    END AS OnlineFlag,
    CASE
      WHEN p.DeviceType = N'Server' THEN N'Server'
      WHEN p.DeviceType = N'Workstation' THEN N'Workstation'
      WHEN p.OsName LIKE N'%Windows Server%' OR p.OsName LIKE N'%Server 201%' OR p.OsName LIKE N'%Server 202%' THEN N'Server'
      WHEN p.OsName LIKE N'%Windows 11%' OR p.OsName LIKE N'%Windows 10%' OR p.OsName LIKE N'%Windows 8%' OR p.OsName LIKE N'%Windows 7%' THEN N'Workstation'
      WHEN p.OsName LIKE N'%Server%' THEN N'Server'
      ELSE N'Workstation'
    END AS DeviceClass

  FROM dbo.Pulseway_Devices AS p WITH (NOLOCK)
  INNER JOIN latest AS l
    ON l.CustomerCode = p.CustomerCode AND l.mx = p.SnapshotDate
)
SELECT
  CustomerCode,
  SUM(CASE WHEN DeviceClass = N'Server' AND OnlineFlag = 1 THEN 1 ELSE 0 END) AS ServerOnline,
  SUM(CASE WHEN DeviceClass = N'Server' AND OnlineFlag = 0 THEN 1 ELSE 0 END) AS ServerOffline,
  SUM(CASE WHEN DeviceClass = N'Workstation' AND OnlineFlag = 1 THEN 1 ELSE 0 END) AS WorkstationOnline,
  SUM(CASE WHEN DeviceClass = N'Workstation' AND OnlineFlag = 0 THEN 1 ELSE 0 END) AS WorkstationOffline
FROM d
GROUP BY CustomerCode`);
      for (const r of classRes.recordset ?? []) {
        classByCode.set(String(r.CustomerCode).toUpperCase(), {
          serverOnline: Number(r.ServerOnline) || 0,
          serverOffline: Number(r.ServerOffline) || 0,
          workstationOnline: Number(r.WorkstationOnline) || 0,
          workstationOffline: Number(r.WorkstationOffline) || 0,
        });
      }
    } catch (e) {
      console.warn(
        "[rpm-assure] Pulseway server/workstation split skipped:",
        e instanceof Error ? e.message : e,
      );
    }

    const patchByCode = new Map<
      string,
      { patchMissing: number; patchDevices: number; patchCompliant: number; diskHighCount: number }
    >();
    try {
      const patchRes = await pool.request().query(`
;WITH latest AS (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  GROUP BY CustomerCode
)
SELECT
  p.CustomerCode,
  SUM(ISNULL(p.PatchMissingCount, 0)) AS PatchMissing,
  SUM(CASE WHEN p.PatchMissingCount IS NOT NULL THEN 1 ELSE 0 END) AS PatchDevices,
  SUM(CASE WHEN p.PatchMissingCount = 0 THEN 1 ELSE 0 END) AS PatchCompliant
FROM dbo.Pulseway_Devices AS p WITH (NOLOCK)
INNER JOIN latest AS l ON l.CustomerCode = p.CustomerCode AND l.mx = p.SnapshotDate
WHERE p.DeviceType = N'Server'
   OR p.OsName LIKE N'%Windows Server%'
   OR p.OsName LIKE N'%Server 201%'
   OR p.OsName LIKE N'%Server 202%'
GROUP BY p.CustomerCode`);
      for (const r of patchRes.recordset ?? []) {
        patchByCode.set(String(r.CustomerCode).toUpperCase(), {
          patchMissing: Number(r.PatchMissing) || 0,
          patchDevices: Number(r.PatchDevices) || 0,
          patchCompliant: Number(r.PatchCompliant) || 0,
          diskHighCount: 0,
        });
      }
    } catch (e) {
      console.warn(
        "[rpm-assure] Pulseway server patch rollup skipped:",
        e instanceof Error ? e.message : e,
      );
    }
    try {
      const diskRes = await pool.request().query(`
;WITH latest AS (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Disks WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  GROUP BY CustomerCode
)
SELECT d.CustomerCode, COUNT(*) AS DiskHigh
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
INNER JOIN latest AS l ON l.CustomerCode = d.CustomerCode AND l.mx = d.SnapshotDate
WHERE ISNULL(d.UsedPct, 0) >= 85
GROUP BY d.CustomerCode`);
      for (const r of diskRes.recordset ?? []) {
        const key = String(r.CustomerCode).toUpperCase();
        const cur = patchByCode.get(key) ?? {
          patchMissing: 0,
          patchDevices: 0,
          patchCompliant: 0,
          diskHighCount: 0,
        };
        cur.diskHighCount = Number(r.DiskHigh) || 0;
        patchByCode.set(key, cur);
      }
    } catch (e) {
      console.warn(
        "[rpm-assure] Pulseway disk-at-risk rollup skipped:",
        e instanceof Error ? e.message : e,
      );
    }

    for (const row of rows) {
      const c = byCode.get(row.customerCode.toUpperCase());
      if (c) {
      const cls = classByCode.get(row.customerCode.toUpperCase());
      const extra = patchByCode.get(row.customerCode.toUpperCase());
      applyPulsewayToRow(row, {
        deviceCount: Number(c.DeviceCount) || 0,
        onlineCount: Number(c.OnlineCount) || 0,
        offlineCount: Number(c.OfflineCount) || 0,
        criticalAlerts: Number(c.CriticalAlerts) || 0,
        elevatedAlerts: Number(c.ElevatedAlerts) || 0,
        lastImportAt: toIso((c.ImportedAt as Date | string | null) ?? null),
                organizationName: c.OrganizationName != null ? String(c.OrganizationName) : null,
        serverOnline: cls?.serverOnline,
        serverOffline: cls?.serverOffline,
        workstationOnline: cls?.workstationOnline,
        workstationOffline: cls?.workstationOffline,
        patchMissing: extra?.patchMissing,
        patchDevices: extra?.patchDevices,
        patchCompliant: extra?.patchCompliant,
        diskHighCount: extra?.diskHighCount,
      });
      }
    }
    try {
      const maps = await pool.request().query(`
SELECT DISTINCT CustomerCode FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
WHERE ISNULL(Active,1) = 1
  AND OrganizationName NOT LIKE N'Invalid%'
  AND LTRIM(RTRIM(ISNULL(OrganizationName,N''))) <> N''`);
      const mapped = new Set(
        (maps.recordset ?? []).map((r: { CustomerCode: string }) =>
          String(r.CustomerCode).toUpperCase(),
        ),
      );
      for (const row of rows) {
        if (mapped.has(row.customerCode.toUpperCase())) {
          row.pillarPulseway = true;
          if (row.cover) row.cover = { ...row.cover, rmm: true };
        }
      }
    } catch {
      /* map optional */
    }
  } catch (e) {
    console.warn("[rpm-assure] Pulseway portfolio enrich skipped:", e instanceof Error ? e.message : e);
  }
}

async function enrichCovePortfolio(
  pool: NonNullable<Awaited<ReturnType<typeof getPool>>>,
  rows: PortfolioRow[],
): Promise<void> {
  try {
    const res = await pool.request().query(`
SELECT CustomerCode,
  SUM(ISNULL(DeviceCount, 0)) AS DeviceCount,
  SUM(ISNULL(FailedCount, 0)) AS FailedCount,
  SUM(ISNULL(StaleCount, 0)) AS StaleCount,
  SUM(ISNULL(OkCount, 0)) AS OkCount,
  MAX(LastImportAt) AS ImportedAt
FROM dbo.vw_Kpi_Cove_Summary WITH (NOLOCK)
GROUP BY CustomerCode`);
    const by = new Map<string, any>();
    for (const r of res.recordset ?? []) {
      by.set(String(r.CustomerCode).toUpperCase(), r);
    }
    let mapped = new Set<string>();
    try {
      const m = await pool.request().query(`
SELECT DISTINCT CustomerCode FROM dbo.Dim_Cove_PartnerMap WITH (NOLOCK) WHERE Active = 1`);
      for (const r of m.recordset ?? []) mapped.add(String(r.CustomerCode).toUpperCase());
    } catch {
      /* optional */
    }
    for (const row of rows) {
      const c = by.get(row.customerCode.toUpperCase());
      if (c) {
        row.coveDeviceCount = Number(c.DeviceCount) || 0;
        row.coveFailedDeviceCount = Number(c.FailedCount) || 0;
        row.coveStaleDeviceCount = Number(c.StaleCount) || 0;
        row.coveOkDeviceCount = Number(c.OkCount) || 0;
        row.coveLastImportAt = toIso(c.ImportedAt);
      }
      if (mapped.has(row.customerCode.toUpperCase())) {
        row.cover = { ...(row.cover ?? { syspro: false, rmm: false, cove: false }), cove: true };
        row.pillarCove = true;
      }
    }
  } catch (e) {
    try {
      const res = await pool.request().query(`
SELECT CustomerCode, COUNT(*) AS DeviceCount,
  SUM(CASE WHEN UPPER(ISNULL(LastBackupStatus,N'')) LIKE N'%FAIL%' THEN 1 ELSE 0 END) AS FailedCount,
  MAX(ImportedAt) AS ImportedAt
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
GROUP BY CustomerCode`);
      for (const r of res.recordset ?? []) {
        const row = rows.find(
          (x) => x.customerCode.toUpperCase() === String(r.CustomerCode).toUpperCase(),
        );
        if (!row) continue;
        row.coveDeviceCount = Number(r.DeviceCount) || 0;
        row.coveFailedDeviceCount = Number(r.FailedCount) || 0;
        row.coveLastImportAt = toIso(r.ImportedAt);
      }
    } catch {
      console.warn("[rpm-assure] Cove enrich unavailable");
    }
  }
}

async function enrichEppPortfolio(
  pool: NonNullable<Awaited<ReturnType<typeof getPool>>>,
  rows: PortfolioRow[],
): Promise<void> {
  try {
    // Prefer the KPI view (per-customer latest snapshot) so a customer is not
    // dropped when today's collect only wrote other customers' rows.
    let recordset: Array<Record<string, unknown>> | null = null;
    try {
      const viaView = await pool.request().query(`
SELECT CustomerCode, DeviceCount, ManagedCount, LastImportAt AS ImportedAt
FROM dbo.vw_Kpi_Epp_Summary WITH (NOLOCK)
WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''`);
      recordset = (viaView.recordset ?? []) as Array<Record<string, unknown>>;
    } catch {
      recordset = null;
    }
    if (!recordset) {
      const res = await pool.request().query(`
SELECT UPPER(LTRIM(RTRIM(e.CustomerCode))) AS CustomerCode,
  COUNT(DISTINCT COALESCE(
    NULLIF(LOWER(LTRIM(RTRIM(e.Fqdn))), N''),
    NULLIF(LTRIM(RTRIM(e.IpAddress)), N''),
    LOWER(CASE
      WHEN e.DeviceName LIKE N'%-[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'
        THEN LEFT(e.DeviceName, LEN(e.DeviceName) - 13)
      ELSE e.DeviceName
    END)
  )) AS DeviceCount,
  SUM(CASE WHEN e.IsManaged = 1 THEN 1 ELSE 0 END) AS ManagedCount,
  MAX(e.ImportedAt) AS ImportedAt
FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
INNER JOIN (
  SELECT UPPER(LTRIM(RTRIM(CustomerCode))) AS CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  GROUP BY UPPER(LTRIM(RTRIM(CustomerCode)))
) m ON m.CustomerCode = UPPER(LTRIM(RTRIM(e.CustomerCode))) AND m.mx = e.SnapshotDate
WHERE e.CustomerCode IS NOT NULL AND LTRIM(RTRIM(e.CustomerCode)) <> N''
GROUP BY UPPER(LTRIM(RTRIM(e.CustomerCode)))`);
      recordset = (res.recordset ?? []) as Array<Record<string, unknown>>;
    }
    const by = new Map<string, { DeviceCount: number; ManagedCount: number; ImportedAt: unknown }>();
    for (const r of recordset) {
      by.set(String(r.CustomerCode).toUpperCase(), {
        DeviceCount: Number(r.DeviceCount) || 0,
        ManagedCount: Number(r.ManagedCount) || 0,
        ImportedAt: r.ImportedAt,
      });
    }
    for (const row of rows) {
      const c = by.get(row.customerCode.toUpperCase());
      if (!c) {
        row.eppDeviceCount = row.eppDeviceCount ?? 0;
        continue;
      }
      row.eppDeviceCount = c.DeviceCount;
      row.eppManagedCount = c.ManagedCount;
      row.eppLastImportAt = toIso(c.ImportedAt as Date | string | null);
      if (c.DeviceCount > 0) {
        row.cover = {
          ...(row.cover ?? { syspro: false, rmm: false, cove: false }),
          epp: true,
        };
      }
    }
    try {
      const maps = await pool.request().query(`
SELECT DISTINCT CustomerCode FROM dbo.Dim_Bitdefender_CompanyMap WITH (NOLOCK)
WHERE ISNULL(Active,1) = 1
  AND CompanyName NOT LIKE N'Invalid%'
  AND CompanyName NOT LIKE N'%column name%'
  AND LTRIM(RTRIM(ISNULL(CompanyName,N''))) <> N''`);
      for (const r of maps.recordset ?? []) {
        const row = rows.find(
          (x) => x.customerCode.toUpperCase() === String(r.CustomerCode).toUpperCase(),
        );
        if (row) {
          row.pillarEpp = true;
          if (row.cover) row.cover = { ...row.cover, epp: true };
        }
      }
    } catch {
      /* map optional */
    }
  } catch (e) {
    console.warn(
      "[rpm-assure] EPP/Bitdefender portfolio enrich skipped:",
      e instanceof Error ? e.message : e,
    );
  }
}

async function enrichCspPortfolio(
  pool: NonNullable<Awaited<ReturnType<typeof getPool>>>,
  rows: PortfolioRow[],
): Promise<void> {
  try {
    let recordset: Array<Record<string, unknown>> = [];
    try {
      const via = await pool.request().query(`
SELECT CustomerCode, UserCount, SkuCount, TotalSeats, AssignedSeats,
  LastImportAt, PrimaryDomain
FROM dbo.vw_Kpi_Csp_Summary WITH (NOLOCK)
WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''`);
      recordset = (via.recordset ?? []) as Array<Record<string, unknown>>;
    } catch {
      try {
        const lic = await pool.request().query(`
SELECT UPPER(LTRIM(RTRIM(CustomerCode))) AS CustomerCode,
  COUNT(*) AS SkuCount,
  SUM(ISNULL(PrepaidUnits,0)) AS TotalSeats,
  SUM(ISNULL(ConsumedUnits,0)) AS AssignedSeats,
  MAX(ImportedAt) AS LastImportAt
FROM dbo.Csp_Licenses WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Csp_Licenses WITH (NOLOCK))
GROUP BY UPPER(LTRIM(RTRIM(CustomerCode)))`);
        recordset = (lic.recordset ?? []) as Array<Record<string, unknown>>;
      } catch {
        return;
      }
    }
    const by = new Map<string, Record<string, unknown>>();
    for (const r of recordset) {
      by.set(String(r.CustomerCode).toUpperCase(), r);
    }
    // user counts if not on view
    let usersBy = new Map<string, number>();
    try {
      const u = await pool.request().query(`
SELECT UPPER(LTRIM(RTRIM(CustomerCode))) AS CustomerCode, COUNT(*) AS UserCount
FROM dbo.Csp_Users WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Csp_Users WITH (NOLOCK))
GROUP BY UPPER(LTRIM(RTRIM(CustomerCode)))`);
      for (const r of u.recordset ?? []) {
        usersBy.set(String(r.CustomerCode).toUpperCase(), Number(r.UserCount) || 0);
      }
    } catch {
      /* optional */
    }
    for (const row of rows) {
      const c = by.get(row.customerCode.toUpperCase());
      const uc =
        (c && c.UserCount != null ? Number(c.UserCount) : null) ??
        usersBy.get(row.customerCode.toUpperCase()) ??
        0;
      if (!c && uc <= 0) continue;
      row.cspUserCount = uc;
      row.cspLicenseSkuCount = c ? Number(c.SkuCount) || 0 : 0;
      row.cspTotalSeats = c ? Number(c.TotalSeats) || 0 : 0;
      row.cspAssignedSeats = c ? Number(c.AssignedSeats) || 0 : 0;
      row.cspLastImportAt = c ? toIso(c.LastImportAt as Date | string | null) : null;
      row.cspPrimaryDomain =
        c && c.PrimaryDomain != null ? String(c.PrimaryDomain) : null;
      if (uc > 0 || (row.cspLicenseSkuCount ?? 0) > 0) {
        row.cover = {
          ...(row.cover ?? { syspro: false, rmm: false, cove: false }),
          csp: true,
        };
        row.pillarCsp = true;
      }
    }
    try {
      const maps = await pool.request().query(`
SELECT DISTINCT CustomerCode FROM dbo.Dim_Csp_TenantMap WITH (NOLOCK)
WHERE ISNULL(Active,1) = 1`);
      for (const r of maps.recordset ?? []) {
        const row = rows.find(
          (x) => x.customerCode.toUpperCase() === String(r.CustomerCode).toUpperCase(),
        );
        if (row) {
          row.pillarCsp = true;
          if (row.cover) row.cover = { ...row.cover, csp: true };
        }
      }
    } catch {
      /* map optional */
    }
    // Lean EXCO posture (one row per customer) — view, else latest Csp_Posture
    try {
      let posRows: Array<Record<string, unknown>> = [];
      try {
        const pos = await pool.request().query(`
SELECT CustomerCode, SecureScorePct, MfaRegisteredPct, GlobalAdminCount,
  GuestUserCount, FailedSignInCount7d
FROM dbo.vw_Kpi_Csp_Posture_Latest WITH (NOLOCK)`);
        posRows = (pos.recordset ?? []) as Array<Record<string, unknown>>;
      } catch {
        const pos2 = await pool.request().query(`
SELECT p.CustomerCode, p.SecureScorePct, p.MfaRegisteredPct, p.GlobalAdminCount,
  p.GuestUserCount, p.FailedSignInCount7d
FROM dbo.Csp_Posture p WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Csp_Posture WITH (NOLOCK)
  GROUP BY CustomerCode
) m ON m.CustomerCode = p.CustomerCode AND m.mx = p.SnapshotDate`);
        posRows = (pos2.recordset ?? []) as Array<Record<string, unknown>>;
      }
      for (const r of posRows) {
        const code = String(r.CustomerCode ?? "").toUpperCase();
        const row = rows.find((x) => x.customerCode.toUpperCase() === code);
        if (!row) continue;
        row.cspSecureScorePct =
          r.SecureScorePct != null ? Number(r.SecureScorePct) : null;
        row.cspMfaRegisteredPct =
          r.MfaRegisteredPct != null ? Number(r.MfaRegisteredPct) : null;
        row.cspGlobalAdminCount =
          r.GlobalAdminCount != null ? Number(r.GlobalAdminCount) : null;
        row.cspGuestUserCount =
          r.GuestUserCount != null ? Number(r.GuestUserCount) : null;
        row.cspFailedSignIn7d =
          r.FailedSignInCount7d != null ? Number(r.FailedSignInCount7d) : null;
        if (
          row.cspSecureScorePct != null ||
          row.cspMfaRegisteredPct != null ||
          (row.cspUserCount ?? 0) > 0
        ) {
          row.cover = {
            ...(row.cover ?? { syspro: false, rmm: false, cove: false }),
            csp: true,
          };
        }
      }
    } catch (e) {
      console.warn(
        "[rpm-assure] CSP posture portfolio enrich:",
        e instanceof Error ? e.message : e,
      );
    }
  } catch (e) {
    console.warn(
      "[rpm-assure] CSP portfolio enrich skipped:",
      e instanceof Error ? e.message : e,
    );
  }
}


const PORTFOLIO_SQL = `
SELECT
  c.CustomerCode,
  c.DisplayName,
  c.Active,
  c.SqlInstanceName,
  CAST(NULL AS nvarchar(200)) AS PulsewayOrgName,
  CAST(NULL AS bit) AS PillarSyspro,
  CAST(0 AS bit) AS PillarPulseway,
  CAST(0 AS bit) AS PillarCove,
  ISNULL(o.OperatorCount, 0) AS OperatorCount,
  ISNULL(o.ActiveUserCount, 0) AS ActiveUserCount,
  o.LastImportAt,
  o.AsOfDate,
  ISNULL(j.JobErrorCount, 0) AS JobErrorCount,
  ISNULL(d.DtrVarianceLines, 0) AS DtrVarianceLines
FROM dbo.Dim_Customer AS c
OUTER APPLY (
  SELECT TOP (1)
    s.SnapshotDate AS AsOfDate,
    COUNT_BIG(*) AS OperatorCount,
    SUM(CASE
      WHEN s.LastLoginDate IS NOT NULL
       AND s.LastLoginDate >= DATEADD(day, -30, SYSUTCDATETIME())
      THEN 1 ELSE 0 END) AS ActiveUserCount,
    MAX(s.ImportedAt) AS LastImportAt
  FROM dbo.Syspro_Operators AS s
  WHERE c.SqlInstanceName IS NOT NULL
    AND s.InstanceName = c.SqlInstanceName
  GROUP BY s.SnapshotDate
  ORDER BY s.SnapshotDate DESC
) AS o
OUTER APPLY (
  SELECT COUNT_BIG(*) AS JobErrorCount
  FROM dbo.Syspro_JobLogging AS jl
  WHERE c.SqlInstanceName IS NOT NULL
    AND jl.InstanceName = c.SqlInstanceName
    AND o.AsOfDate IS NOT NULL
    AND jl.SnapshotDate = o.AsOfDate
    AND (
      NULLIF(LTRIM(RTRIM(jl.ErrorStatusCode)), N'') IS NOT NULL
      OR (jl.ProgErrorCode IS NOT NULL AND jl.ProgErrorCode <> 0)
      OR (jl.TransactionStatus LIKE N'%Fail%')
      OR (jl.Message LIKE N'%error%')
    )
) AS j
OUTER APPLY (
  SELECT COUNT_BIG(*) AS DtrVarianceLines
  FROM dbo.vw_Kpi_FinSight_Variance_Latest AS dv
  WHERE dv.CustomerCode = c.CustomerCode
) AS d
WHERE c.Active = 1
ORDER BY
  CASE
    WHEN ISNULL(j.JobErrorCount, 0) >= 10 THEN 0
    WHEN ISNULL(j.JobErrorCount, 0) > 0 THEN 1
    WHEN ISNULL(d.DtrVarianceLines, 0) > 0 THEN 1
    WHEN ISNULL(o.OperatorCount, 0) = 0 THEN 2
    ELSE 3
  END,
  c.CustomerCode;
`;

const OPERATORS_SQL = `
SELECT
  OperatorCode,
  OperatorName,
  LastLoginDate,
  OperatorStatus,
  SnapshotDate
FROM dbo.Syspro_Operators
WHERE InstanceName = @instance
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate)
    FROM dbo.Syspro_Operators
    WHERE InstanceName = @instance
  )
ORDER BY
  CASE WHEN LastLoginDate IS NULL THEN 1 ELSE 0 END,
  LastLoginDate DESC,
  OperatorCode;
`;

const JOBS_SQL = `
SELECT TOP (25)
  ProgramName,
  Operator,
  Message,
  ErrorStatusCode,
  ProgRunDate
FROM dbo.Syspro_JobLogging
WHERE InstanceName = @instance
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Syspro_JobLogging WHERE InstanceName = @instance
  )
  AND (
    NULLIF(LTRIM(RTRIM(ErrorStatusCode)), N'') IS NOT NULL
    OR (ProgErrorCode IS NOT NULL AND ProgErrorCode <> 0)
    OR (TransactionStatus LIKE N'%Fail%')
    OR (Message LIKE N'%error%')
  )
ORDER BY ProgRunDate DESC, RowId DESC;
`;

const DAYEND_JOBS_SQL = `
SELECT TOP (80)
  ProgramName,
  Operator,
  Message,
  ErrorStatusCode,
  ProgErrorCode,
  ProgRunDate,
  TransactionStatus
FROM dbo.Syspro_JobLogging
WHERE InstanceName = @instance
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Syspro_JobLogging WHERE InstanceName = @instance
  )
  AND (
    ProgramName LIKE N'%DAY%'
    OR ProgramName LIKE N'%IMPDDE%'
    OR ProgramName LIKE N'%IMPPDE%'
    OR ProgramName LIKE N'%IMPDCO%'
    OR Operator LIKE N'%DAY%'
    OR Operator LIKE N'%SRS%'
    OR Message LIKE N'%day end%'
    OR Message LIKE N'%day-end%'
    OR Message LIKE N'%Day End%'
  )
ORDER BY ProgRunDate DESC;
`;

const DTR_L1_SQL = `
SELECT
  t.BalanceTypeCode,
  t.BalanceTypeName,
  ISNULL(v.VarianceLineCount, 0) AS VarianceLineCount,
  ISNULL(a.TotalLineCount, 0) AS TotalLineCount,
  v.TotalVariance,
  v.AbsVariance,
  a.TotalCloseBalance,
  COALESCE(v.AsOfDate, a.AsOfDate) AS AsOfDate
FROM dbo.Dim_DtrBalanceType AS t
OUTER APPLY (
  SELECT
    COUNT_BIG(*) AS VarianceLineCount,
    SUM(d.Variance) AS TotalVariance,
    SUM(ABS(d.Variance)) AS AbsVariance,
    MAX(d.AsOfDate) AS AsOfDate
  FROM dbo.vw_Kpi_FinSight_Variance_Latest AS d
  WHERE d.CustomerCode = @code
    AND d.SourceArea = t.BalanceTypeCode
) AS v
OUTER APPLY (
  SELECT
    COUNT_BIG(*) AS TotalLineCount,
    SUM(COALESCE(b.SubCloseBalance, b.GlCloseBalance)) AS TotalCloseBalance,
    MAX(b.SnapshotDate) AS AsOfDate
  FROM dbo.vw_FinSight_ControlBalances_All AS b
  WHERE b.CustomerCode = @code
    AND b.BalanceTypeCode = t.BalanceTypeCode
    AND b.SnapshotDate = (
      SELECT MAX(b2.SnapshotDate)
      FROM dbo.vw_FinSight_ControlBalances_All AS b2
      WHERE b2.CustomerCode = @code
        AND b2.BalanceTypeCode = t.BalanceTypeCode
    )
    AND (b.InformationLevel = 1 OR b.InformationLevel IS NULL)
) AS a
WHERE t.Active = 1
ORDER BY t.SortOrder;
`;

// Fallback: variance view only (if all-balances apply fails)
const DTR_BY_TYPE_SQL = `
SELECT
  t.BalanceTypeCode,
  t.BalanceTypeName,
  ISNULL(v.VarianceLineCount, 0) AS VarianceLineCount,
  ISNULL(v.VarianceLineCount, 0) AS TotalLineCount,
  v.TotalVariance,
  v.AbsVariance,
  CAST(NULL AS decimal(18,2)) AS TotalCloseBalance,
  v.AsOfDate
FROM dbo.Dim_DtrBalanceType AS t
OUTER APPLY (
  SELECT
    COUNT_BIG(*) AS VarianceLineCount,
    SUM(d.Variance) AS TotalVariance,
    SUM(ABS(d.Variance)) AS AbsVariance,
    MAX(d.AsOfDate) AS AsOfDate
  FROM dbo.vw_Kpi_FinSight_Variance_Latest AS d
  WHERE d.CustomerCode = @code
    AND d.SourceArea = t.BalanceTypeCode
) AS v
WHERE t.Active = 1
ORDER BY t.SortOrder;
`;


const LICENSE_SQL = `
SELECT TOP 1
  ProductName, ProductVersion, LicenseType, Users, CompanyCount,
  LicenseExpiry, CustomerName, ImportDate
FROM dbo.Syspro_SystemLicense
WHERE InstanceName = @instance
ORDER BY SnapshotDate DESC, ImportDate DESC, RowId DESC;
`;

const HEALTH_SQL = `
SELECT TOP 20
  RunDateTime, Operator, HealthFunction, Description, StatusFlag, Message
FROM dbo.Syspro_HealthLog
WHERE InstanceName = @instance
ORDER BY RunDateTime DESC, RowId DESC;
`;

const TASK_GROUP_SQL = `
SELECT TOP 50
  OperatorCode, TaskGroup, AutoRun, StopIfError
FROM dbo.Syspro_TaskGroup
WHERE InstanceName = @instance
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Syspro_TaskGroup WHERE InstanceName = @instance)
ORDER BY TaskGroup, OperatorCode;
`;

const TASK_ITEM_SQL = `
SELECT TOP 40
  OperatorCode, TaskGroup, Description, ProgramName, TaskType, SequenceNumber
FROM dbo.Syspro_TaskItem
WHERE InstanceName = @instance
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Syspro_TaskItem WHERE InstanceName = @instance)
ORDER BY TaskGroup, SequenceNumber, OperatorCode;
`;



const DTR_DETAIL_SQL = `
SELECT TOP 800
  b.BalanceTypeCode,
  CAST(b.InformationLevel AS int) AS InformationLevel,
  /* Prefer real keys; L1 totals often have blank GlCode in Datarapt */
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), b.LevelKey))), N'') AS LevelKey,
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), b.ParentLevelKey))), N'') AS ParentLevelKey,
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), b.GlCode))), N'') AS GlCode,
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), b.Dimension1))), N'') AS Dimension1,
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(200), b.Description))), N'') AS Description,
  /* Sub = module control; if null but GL+Variance exist, derive Sub ≈ GL + Variance (Datarapt sign) */
  COALESCE(
    b.SubCloseBalance,
    CASE
      WHEN b.GlCloseBalance IS NOT NULL AND b.Variance IS NOT NULL
      THEN CAST(b.GlCloseBalance + b.Variance AS decimal(18,2))
      ELSE NULL
    END
  ) AS SubCloseBalance,
  b.GlCloseBalance,
  b.Variance,
  b.SnapshotDate,
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), b.CompanyDb))), N'') AS CompanyDb,
  b.GlYear,
  b.GlPeriod,
  b.InstanceName
FROM dbo.vw_FinSight_ControlBalances_All AS b WITH (NOLOCK)
WHERE b.CustomerCode = @code
  AND b.SnapshotDate = (
    SELECT MAX(b2.SnapshotDate)
    FROM dbo.vw_FinSight_ControlBalances_All AS b2 WITH (NOLOCK)
    WHERE b2.CustomerCode = @code
  )
  AND b.InformationLevel IN (1, 2, 3)
ORDER BY
  b.BalanceTypeCode,
  b.InformationLevel,
  ABS(ISNULL(b.Variance, 0)) DESC,
  b.CompanyDb,
  b.GlCode,
  b.LevelKey;
`;

const FINSIGHT_RECON_CASES_SQL = `
SELECT TOP 100
  CAST(ReconCaseId AS nvarchar(36)) AS ReconCaseId,
  CustomerCode,
  BalanceTypeCode,
  SnapshotDate,
  Status,
  OobLines,
  AbsVariance,
  CloseBalance,
  OwnerName,
  Title,
  Notes,
  SourceLevel,
  LevelKey,
  CreatedAtUtc,
  UpdatedAtUtc
FROM dbo.Fact_FinSight_ReconCase WITH (NOLOCK)
WHERE CustomerCode = @code
  AND Status NOT IN (N'Closed')
ORDER BY
  CASE Status
    WHEN N'Open' THEN 1
    WHEN N'Investigating' THEN 2
    WHEN N'WaitingFinance' THEN 3
    WHEN N'Cleared' THEN 4
    WHEN N'Accepted' THEN 5
    ELSE 9
  END,
  UpdatedAtUtc DESC;
`;


const FACT_INCIDENTS_SQL = `
SELECT TOP 40
  CAST(IncidentId AS nvarchar(36)) AS IncidentId,
  Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt,
  IsMajor, ExternalRef, OwnerName, SourceSystem, BusinessImpact,
  RespondMins, ResolveMins,
  ResponseMinsElapsed, ResolveMinsElapsed,
  ResponseSlaMetCalc AS ResponseSlaMet,
  ResolveSlaMetCalc AS ResolveSlaMet
FROM dbo.vw_Ams_IncidentLive
WHERE CustomerCode = @code
  AND (
    Status NOT IN (N'Closed', N'Cancelled')
    OR OpenedAt >= DATEADD(DAY, -30, SYSUTCDATETIME())
  )
ORDER BY
  CASE WHEN Status IN (N'Closed', N'Cancelled', N'Resolved') THEN 1 ELSE 0 END,
  OpenedAt DESC;
`;

/* Fallback if view not deployed yet */
const FACT_INCIDENTS_FALLBACK_SQL = `
SELECT TOP 40
  CAST(IncidentId AS nvarchar(36)) AS IncidentId,
  Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt,
  IsMajor, ExternalRef, OwnerName, SourceSystem, BusinessImpact,
  CAST(NULL AS int) AS RespondMins,
  CAST(NULL AS int) AS ResolveMins,
  CAST(NULL AS int) AS ResponseMinsElapsed,
  CAST(NULL AS int) AS ResolveMinsElapsed,
  ResponseSlaMet, ResolveSlaMet
FROM dbo.Fact_Incident
WHERE CustomerCode = @code
  AND (
    Status NOT IN (N'Closed', N'Cancelled')
    OR OpenedAt >= DATEADD(DAY, -30, SYSUTCDATETIME())
  )
ORDER BY OpenedAt DESC;
`;

const AMS_SLA_30D_SQL = `
SELECT
  IncidentCount30d, ResponseMet, ResponseBreach, ResolveMet, ResolveBreach,
  ResponseScored, ResolveScored, SlaResponsePct, SlaResolvePct
FROM dbo.vw_Ams_SlaCompliance_30d
WHERE CustomerCode = @code;
`;

const FACT_SLA_PERIOD_SQL = `
SELECT TOP 1
  PeriodFrom, PeriodTo,
  AvailabilityPct, AvailabilitySlaPct,
  SlaResponsePct, SlaResolvePct, SlaCompliancePct,
  IncidentCount, BreachCount, Source, Note
FROM dbo.Fact_SlaPeriod
WHERE CustomerCode = @code
ORDER BY PeriodTo DESC, CreatedAtUtc DESC;
`;

const FACT_PROBLEMS_SQL = `
SELECT TOP 15 Title, Status, Severity, OwnerName, OpenedAt
FROM dbo.Fact_Problem
WHERE CustomerCode = @code
  AND Status NOT IN (N'Closed', N'Cancelled')
ORDER BY OpenedAt DESC;
`;

const FACT_RISKS_SQL = `
SELECT TOP 15 Title, Rag, Status, OwnerName, TargetDate, Category
FROM dbo.Fact_Risk
WHERE CustomerCode = @code
  AND Status <> N'Closed'
ORDER BY CASE Rag WHEN N'Red' THEN 0 WHEN N'Amber' THEN 1 ELSE 2 END, TargetDate;
`;

const FACT_ISSUES_SQL = `
SELECT TOP 15 Title, Status, Severity, OwnerName, TargetDate
FROM dbo.Fact_Issue
WHERE CustomerCode = @code
  AND Status NOT IN (N'Closed', N'Cancelled')
ORDER BY TargetDate;
`;

const FACT_PRIORITIES_SQL = `
SELECT TOP 10 Title, Detail, Status, SortOrder, PeriodLabel, ProgramCode
FROM dbo.Fact_Priority
WHERE CustomerCode = @code
  AND Status = N'Active'
ORDER BY SortOrder, Title;
`;


const SLA_POLICY_SQL = `
SELECT Priority, RespondMins, ResolveMins, AvailabilityPct
FROM dbo.Dim_SlaPolicy
WHERE Active = 1
  AND (CustomerCode IS NULL OR CustomerCode = @code)
ORDER BY
  CASE WHEN CustomerCode = @code THEN 0 ELSE 1 END,
  CASE Priority WHEN N'Critical' THEN 0 WHEN N'High' THEN 1 WHEN N'Medium' THEN 2 ELSE 3 END;
`;

const AVAIL_SLA_SQL = `
SELECT TOP 1
  PeriodFrom, PeriodTo,
  AvailabilityPct, AvailabilitySlaPct,
  SlaResponsePct, SlaResolvePct, SlaCompliancePct
FROM dbo.Fact_DashboardSnapshot
WHERE CustomerCode = @code
ORDER BY PeriodTo DESC, AsOfAt DESC;
`;

const FACT_CHANGE_SQL = `
SELECT TOP 15 Title, Status, Outcome, CompletedAt
FROM dbo.Fact_Change
WHERE CustomerCode = @code
ORDER BY COALESCE(CompletedAt, CreatedAt) DESC;
`;

const FACT_CSAT_SQL = `
SELECT TOP 1 PeriodFrom, PeriodTo, Score, ResponseCount, Source
FROM dbo.Fact_Csat
WHERE CustomerCode = @code
ORDER BY PeriodTo DESC, CreatedAt DESC;
`;


const OPER_GROUP_SQL = `
SELECT TOP 500 OperatorCode, GroupCode, GroupName
FROM dbo.Syspro_OperGroup
WHERE InstanceName = @instance
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Syspro_OperGroup WHERE InstanceName = @instance)
ORDER BY GroupCode, OperatorCode;
`;

const OPER_AMEND_SQL = `
SELECT TOP 40 OperatorCode, AmendDate, AmendType, Detail, ChangedBy
FROM dbo.Syspro_OperAmend
WHERE InstanceName = @instance
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Syspro_OperAmend WHERE InstanceName = @instance)
ORDER BY AmendDate DESC, RowId DESC;
`;

const EXEC_SUMMARY_SQL = `
SELECT TOP 1
  PeriodFrom, PeriodTo, PeriodLabel, HealthRag, HealthSummary, BusinessImpactSummary,
  OpenRiskCount, OpenIssueCount, MajorIncidentCount, Status
FROM dbo.Fact_ExecSummary
WHERE CustomerCode = @code
ORDER BY PeriodTo DESC, CreatedAt DESC;
`;

const EXEC_NARRATIVE_SQL = `
SELECT n.NarrativeType, n.Body, n.SortOrder
FROM dbo.Fact_ExecNarrative AS n
INNER JOIN dbo.Fact_ExecSummary AS s ON s.ExecSummaryId = n.ExecSummaryId
WHERE s.CustomerCode = @code
  AND s.ExecSummaryId = (
    SELECT TOP 1 ExecSummaryId FROM dbo.Fact_ExecSummary
    WHERE CustomerCode = @code
    ORDER BY PeriodTo DESC, CreatedAt DESC
  )
ORDER BY n.SortOrder, n.NarrativeType;
`;


const AUDIT_SQL = `
SELECT TOP (40)
  EventAt, OperatorCode, ProgramName, ActionCode, Detail
FROM dbo.Syspro_SystemAuditLog
WHERE InstanceName = @instance
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Syspro_SystemAuditLog WHERE InstanceName = @instance
  )
ORDER BY EventAt DESC, RowId DESC;
`;

const DIAG_SQL = `
SELECT TOP (40)
  DiagCode, DiagName, Severity, StatusText, MessageText, CheckedAt
FROM dbo.Syspro_DiagSummary
WHERE InstanceName = @instance
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Syspro_DiagSummary WHERE InstanceName = @instance
  )
ORDER BY CheckedAt DESC, RowId DESC;
`;

const SQLHEALTH_SQL = `
SELECT TOP (80)
  CompanyDb, HealthKey, Description, StatusText, RefreshDate
FROM dbo.Syspro_SqlHealthBal
WHERE InstanceName = @instance
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Syspro_SqlHealthBal WHERE InstanceName = @instance
  )
ORDER BY
  CASE WHEN StatusText LIKE N'%Fail%' OR StatusText LIKE N'%Error%' OR StatusText LIKE N'%Bad%' THEN 0 ELSE 1 END,
  CompanyDb, HealthKey;
`;

function buildOperationalAssurance(args: {
  lastImportAt: string | null;
  jobErrorCount: number;
  operatorCount: number;
  activeUserCount: number;
  dtrOutOfBalance: number;
  healthRag: HealthRag;
  healthSummary: string;
  /** When set, only covered legs contribute penalties / score. */
  cover?: CustomerCover | null;
  pulsewayOfflineCount?: number;
  pulsewayCriticalAlerts?: number;
  pulsewayDeviceCount?: number;
  /** Server-only counts for SLA (workstations excluded) */
  pulsewayServerOnline?: number;
  pulsewayServerOffline?: number;
  coveFailedDeviceCount?: number;
  coveDeviceCount?: number;
}): OperationalAssurance {
  const cover = args.cover ?? { syspro: true, rmm: false, cove: false };
  const useSys = cover.syspro;
  const useRmm = cover.rmm;
  const useCove = cover.cove;

  const jobErrorCount = useSys ? args.jobErrorCount : 0;
  const operatorCount = useSys ? args.operatorCount : 0;
  const activeUserCount = useSys ? args.activeUserCount : 0;
  const dtrOutOfBalance = useSys ? args.dtrOutOfBalance : 0;
  const { lastImportAt, healthRag, healthSummary } = args;

  let collectAgeHours: number | null = null;
  if (lastImportAt) {
    const ms = Date.now() - new Date(lastImportAt).getTime();
    collectAgeHours = Number.isFinite(ms) ? Math.max(0, Math.round(ms / 3600000)) : null;
  }
  // Collect freshness only applies when SYSPRO is covered (SYSPRO collect clock)
  const collectFresh =
    !useSys || (collectAgeHours != null && collectAgeHours <= 24);
  const activeUserRatioPct =
    useSys && operatorCount > 0
      ? Math.round((activeUserCount / operatorCount) * 100)
      : null;

  // Per-leg scores (null = not covered / omit)
  let sysScore: number | null = null;
  if (useSys) {
    sysScore = 100;
    if (!collectFresh) sysScore -= 25;
    if (jobErrorCount >= 10) sysScore -= 30;
    else if (jobErrorCount > 0) sysScore -= 15;
    if (dtrOutOfBalance > 20) sysScore -= 20;
    else if (dtrOutOfBalance > 0) sysScore -= 10;
    if (activeUserRatioPct != null && activeUserRatioPct < 10 && operatorCount > 5) {
      sysScore -= 5;
    }
    sysScore = Math.max(0, Math.min(100, sysScore));
  }

  let rmmScore: number | null = null;
  if (useRmm) {
    // Workstations never enter RMM SLA scoring
    const srvOn = args.pulsewayServerOnline ?? 0;
    const srvOff = args.pulsewayServerOffline ?? 0;
    const srvN = srvOn + srvOff;
    const crit = args.pulsewayCriticalAlerts ?? 0;
    if (srvN <= 0) {
      // No servers classified — omit RMM from score blend (null)
      rmmScore = null;
    } else {
      rmmScore = 100;
      if (crit > 0) rmmScore -= 35;
      if (srvOff >= 5) rmmScore -= 30;
      else if (srvOff > 0) rmmScore -= 12;
      rmmScore = Math.max(0, Math.min(100, rmmScore));
    }
  }


  let coveScore: number | null = null;
  if (useCove) {
    const n = args.coveDeviceCount ?? 0;
    const failed = args.coveFailedDeviceCount ?? 0;
    coveScore = 100;
    if (n <= 0) coveScore = 70;
    else if (failed > 0) coveScore -= Math.min(50, failed * 15);
    coveScore = Math.max(0, Math.min(100, coveScore));
  }

  // Estate RAG only already reflects covered legs; light blend
  let estateAdj = 0;
  if (healthRag === "Red") estateAdj = -10;
  else if (healthRag === "Amber") estateAdj = -5;

  const base = averageCoveredScores(cover, {
    syspro: sysScore,
    rmm: rmmScore,
    cove: coveScore,
  });
  let score =
    base != null
      ? Math.max(0, Math.min(100, Math.round(base + estateAdj)))
      : healthScorePctFromRag(healthRag);

  const bits: string[] = [];
  if (!anyCover(cover)) {
    bits.push("No cover — no SYSPRO, RMM, or Cyber Backup in scope.");
  } else {
    if (useSys) {
      bits.push(collectFresh ? "SYSPRO collect fresh (<24h)." : "SYSPRO collect stale or missing.");
      if (jobErrorCount > 0) bits.push(`${jobErrorCount} SYSPRO job error(s).`);
      if (dtrOutOfBalance > 0) bits.push(finsightOobAttention(dtrOutOfBalance) + ".");
    } else {
      bits.push("SYSPRO: No cover (not scored).");
    }
    if (useRmm) {
      bits.push(
        (() => {
      const srvOn = args.pulsewayServerOnline ?? 0;
      const srvOff = args.pulsewayServerOffline ?? 0;
      const sn = srvOn + srvOff;
      if (sn > 0) {
        return `RMM servers: ${srvOff} offline of ${sn} (workstations excluded from SLA), ${args.pulsewayCriticalAlerts ?? 0} critical.`;
      }
      return `RMM: no servers classified (workstations excluded from SLA).`;
    })(),
      );
    } else {
      bits.push("RMM: No cover (not scored).");
    }

    if (useCove) {
      bits.push(
        `Cyber Backup: ${args.coveDeviceCount ?? 0} device(s), ${args.coveFailedDeviceCount ?? 0} failed.`,
      );
    } else {
      bits.push("Cyber Backup: No cover (not scored).");
    }
    bits.push(healthSummary || `Estate health ${healthRag}.`);
  }

  return {
    collectAgeHours: useSys ? collectAgeHours : null,
    collectFresh,
    jobErrorCount,
    activeUserRatioPct,
    dtrOutOfBalance,
    scorePct: score,
    summary: bits.join(" "),
  };
}



const SQL_BACKUPS_SQL = `
SELECT DatabaseName, LastFullBackup, LastDiffBackup, LastLogBackup,
       LastBackupStatus, FullAgeHours
FROM dbo.Sql_Backups WITH (NOLOCK)
WHERE InstanceName = @instance
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Sql_Backups WITH (NOLOCK) WHERE InstanceName = @instance
  )
ORDER BY
  CASE LastBackupStatus WHEN N'Missing' THEN 0 WHEN N'Stale' THEN 1 WHEN N'Fail' THEN 0 ELSE 2 END,
  DatabaseName;
`;

const SQL_BACKUP_FAIL_SQL = `
SELECT TOP (40) FailureAt, JobName, DatabaseName, StepName, Message
FROM dbo.Sql_BackupFailures WITH (NOLOCK)
WHERE InstanceName = @instance
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Sql_BackupFailures WITH (NOLOCK) WHERE InstanceName = @instance
  )
ORDER BY FailureAt DESC, RowId DESC;
`;

const VERSION_SQL = `
SELECT TOP (1)
  ProductName, ProductVersion, BuildNumber, LicenseType, Users, CompanyCount,
  LicenseExpiry, CustomerName, ServerName,
  COALESCE(ImportDate, ImportedAt) AS ImportDate
FROM dbo.Syspro_VersionInfo WITH (NOLOCK)
WHERE InstanceName = @instance
ORDER BY SnapshotDate DESC;
`;

const HOTFIX_SQL = `
SELECT TOP (500)
  HotfixCode, HotfixName, Description, Installed, InstalledAt, SourceTable
FROM dbo.Syspro_Hotfix WITH (NOLOCK)
WHERE InstanceName = @instance
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Syspro_Hotfix WITH (NOLOCK) WHERE InstanceName = @instance
  )
  AND (
    HotfixCode LIKE N'KB%'
    OR NOT EXISTS (
      SELECT 1
      FROM dbo.Syspro_Hotfix AS k WITH (NOLOCK)
      WHERE k.InstanceName = @instance
        AND k.HotfixCode LIKE N'KB%'
        AND k.SnapshotDate = (
          SELECT MAX(SnapshotDate) FROM dbo.Syspro_Hotfix WITH (NOLOCK) WHERE InstanceName = @instance
        )
    )
  )
ORDER BY
  CASE WHEN HotfixCode LIKE N'KB%' THEN 0 ELSE 1 END,
  CASE WHEN InstalledAt IS NULL THEN 1 ELSE 0 END,
  InstalledAt DESC,
  HotfixCode DESC;
`;

/** Fallback when Syspro_Hotfix empty but catalogue collect wrote Syspro_HotfixInstalled */
const HOTFIX_INSTALLED_SQL = `
SELECT TOP (500)
  HotfixCode,
  Title AS HotfixName,
  Title AS Description,
  CAST(1 AS bit) AS Installed,
  InstalledAt,
  Source AS SourceTable
FROM dbo.Syspro_HotfixInstalled WITH (NOLOCK)
WHERE InstanceName = @instance
  AND HotfixCode LIKE N'KB%'
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Syspro_HotfixInstalled WITH (NOLOCK) WHERE InstanceName = @instance
  )
ORDER BY
  CASE WHEN InstalledAt IS NULL THEN 1 ELSE 0 END,
  InstalledAt DESC,
  HotfixCode DESC;
`;


const HOTFIX_GAP_SQL = `
SELECT TOP (200)
  HotfixCode, Title, Severity, ReleaseLabel, IsMissing, InstalledAt, KbUrl,
  CAST(ISNULL(IsWaived, 0) AS bit) AS IsWaived,
  WaiverReason
FROM dbo.vw_Kpi_Syspro_HotfixGap WITH (NOLOCK)
WHERE InstanceName = @instance
ORDER BY
  CASE WHEN IsMissing = 1 AND ISNULL(IsWaived, 0) = 0 AND Severity LIKE N'%Mandat%' THEN 0
       WHEN IsMissing = 1 AND ISNULL(IsWaived, 0) = 1 THEN 1
       WHEN IsMissing = 1 THEN 2
       ELSE 3 END,
  HotfixCode;
`;

const HOTFIX_GAP_SUM_SQL = `
SELECT
  BaselineCount,
  MissingCount,
  InstalledMatchCount,
  MissingMandatory,
  WaivedMissingCount,
  MissingOptional
FROM dbo.vw_Kpi_Syspro_HotfixGap_Summary WITH (NOLOCK)
WHERE InstanceName = @instance;
`;




function hoursSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round((ms / 3600000) * 10) / 10;
}

/** ExCo health score 0–100 — uncovered legs never penalise the score */
export function excoHealthScore(input: {
  rag: HealthRag;
  jobErrorCount: number;
  dtrVariance: number;
  collectAgeHours: number | null;
  operatorCount: number;
  cover?: CustomerCover | null;
  pulsewayOfflineCount?: number;
  pulsewayCriticalAlerts?: number;
  coveFailedCount?: number;
}): number {
  const cov = input.cover;
  const useSys = cov ? cov.syspro : true;
  const useRmm = cov ? cov.rmm : false;
  const useCove = cov ? cov.cove : false;
  if (cov && !cov.syspro && !cov.rmm && !cov.cove) {
    return 50; // no cover — neutral
  }

  let score =
    input.rag === "Green" ? 88 : input.rag === "Amber" ? 58 : 28;

  if (useSys) {
    if (input.jobErrorCount >= 10) score -= 20;
    else if (input.jobErrorCount > 0) score -= Math.min(12, input.jobErrorCount * 2);
    if (input.dtrVariance > 50) score -= 15;
    else if (input.dtrVariance > 0) score -= 8;
    if (input.collectAgeHours == null) score -= 18;
    else if (input.collectAgeHours > 48) score -= 20;
    else if (input.collectAgeHours > 24) score -= 10;
    if (input.operatorCount <= 0) score -= 10;
  }
  if (useRmm) {
    if ((input.pulsewayCriticalAlerts ?? 0) > 0) score -= 15;
    if ((input.pulsewayOfflineCount ?? 0) >= 5) score -= 12;
    else if ((input.pulsewayOfflineCount ?? 0) > 0) score -= 6;
  }
  if (useCove && (input.coveFailedCount ?? 0) > 0) score -= 12;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildAttentionReasons(b: {
  healthRag: HealthRag;
  collectFresh: boolean;
  collectAgeHours: number | null;
  jobErrorCount: number;
  dtrVarianceLines: number;
  licenseDaysRemaining: number | null;
  openRiskCount: number;
  backupHealthy: boolean | null;
  pulsewayOfflineCount?: number;
  pulsewayCriticalAlerts?: number;
  pulsewayDeviceCount?: number;
  pulsewayServerOnline?: number;
  pulsewayServerOffline?: number;
  cover?: CustomerCover | null;
}): string[] {
  const cov = b.cover;
  const useSys = !cov || cov.syspro;
  const useRmm = !cov || cov.rmm;
  const r: string[] = [];
  if (b.healthRag === "Red") r.push("Health Red");
  if (b.healthRag === "Amber") r.push("Health Amber");
  if (useSys && !b.collectFresh) {
    if (b.collectAgeHours == null) r.push("No SYSPRO collect");
    else r.push(`SYSPRO collect stale (${b.collectAgeHours}h)`);
  }
  if (useSys && b.jobErrorCount > 0) r.push(`${b.jobErrorCount} job error(s)`);
  if (useSys && b.dtrVarianceLines > 0) r.push(finsightOobAttention(b.dtrVarianceLines));
  if (useSys && b.licenseDaysRemaining != null && b.licenseDaysRemaining <= 60)
    r.push(`License ${b.licenseDaysRemaining}d`);
  if (b.openRiskCount > 0) r.push(`${b.openRiskCount} open risk(s)`);
  if (useSys && b.backupHealthy === false) r.push("Backup concern");
  if (useRmm && (b.pulsewayCriticalAlerts ?? 0) > 0)
    r.push(`${b.pulsewayCriticalAlerts} RMM critical`);
  {
    const srvOff = b.pulsewayServerOffline ?? 0;
    const srvOn = b.pulsewayServerOnline ?? 0;
    if (useRmm && srvOff > 0)
      r.push(`${srvOff} RMM server(s) offline`);
    // Do not flag workstation-only offline as estate attention
    void srvOn;
  }

  if (cov && !cov.syspro && !cov.rmm && !cov.cove) r.push("No service cover");
  return r;
}

const EXCO_ENRICH_SQL = `
SELECT
  c.CustomerCode,
  c.DisplayName,
  c.SqlInstanceName,
  lic.LicenseExpiry,
  lic.ProductName AS LicenseProduct,
  lic.Users AS LicenseUsers,
  ISNULL(rk.OpenRisks, 0) AS OpenRisks,
  ISNULL(iss.OpenIssues, 0) AS OpenIssues,
  bak.LastFullBackup,
  bak.LastBackupStatus,
  snap.SlaCompliancePct,
  snap.AvailabilityPct
FROM dbo.Dim_Customer AS c
OUTER APPLY (
  SELECT TOP (1)
    LicenseExpiry, ProductName, Users
  FROM dbo.Syspro_SystemLicense WITH (NOLOCK)
  WHERE InstanceName = c.SqlInstanceName
  ORDER BY SnapshotDate DESC, ImportedAt DESC
) AS lic
OUTER APPLY (
  SELECT COUNT_BIG(*) AS OpenRisks
  FROM dbo.Fact_Risk WITH (NOLOCK)
  WHERE CustomerCode = c.CustomerCode
    AND Status NOT IN (N'Closed', N'Resolved', N'Cancelled')
) AS rk
OUTER APPLY (
  SELECT COUNT_BIG(*) AS OpenIssues
  FROM dbo.Fact_Issue WITH (NOLOCK)
  WHERE CustomerCode = c.CustomerCode
    AND Status NOT IN (N'Closed', N'Cancelled', N'Resolved')
) AS iss
OUTER APPLY (
  SELECT TOP (1)
    LastFullBackup, LastBackupStatus
  FROM dbo.Sql_Backups WITH (NOLOCK)
  WHERE InstanceName = c.SqlInstanceName
  ORDER BY SnapshotDate DESC, LastFullBackup DESC
) AS bak
OUTER APPLY (
  SELECT TOP (1)
    SlaCompliancePct, AvailabilityPct
  FROM dbo.Fact_DashboardSnapshot WITH (NOLOCK)
  WHERE CustomerCode = c.CustomerCode
  ORDER BY PeriodTo DESC, AsOfAt DESC
) AS snap
WHERE c.Active = 1;
`;


/** HF counts per SQL instance (latest snapshot) — prefer real KBs; fallback all rows */
const EXCO_HF_BY_INSTANCE_SQL = `
SELECT
  LTRIM(RTRIM(h.InstanceName)) AS InstanceName,
  SUM(CASE WHEN h.HotfixCode LIKE N'KB%' THEN 1 ELSE 0 END) AS KbHotfixCount,
  COUNT_BIG(*) AS AllHotfixCount,
  SUM(CASE WHEN h.SourceTable LIKE N'%Deploy%' OR h.SourceTable LIKE N'%Hotfix%' THEN 1 ELSE 0 END) AS DeployHotfixCount,
  MAX(CASE WHEN h.HotfixCode LIKE N'KB%' THEN h.InstalledAt END) AS LastHotfixAt,
  MAX(CASE WHEN h.HotfixCode LIKE N'KB%' THEN h.HotfixCode END) AS SampleHotfixCode,
  MAX(CASE WHEN h.HotfixCode NOT LIKE N'KB%' OR h.HotfixCode IS NULL THEN h.HotfixCode END) AS SampleAnyCode
FROM dbo.Syspro_Hotfix AS h WITH (NOLOCK)
INNER JOIN (
  SELECT InstanceName, MAX(SnapshotDate) AS SnapshotDate
  FROM dbo.Syspro_Hotfix WITH (NOLOCK)
  GROUP BY InstanceName
) AS m
  ON m.InstanceName = h.InstanceName
 AND m.SnapshotDate = h.SnapshotDate
GROUP BY LTRIM(RTRIM(h.InstanceName));
`;


/** Version rows — base columns only (always present on Syspro_VersionInfo) */
const EXCO_VERSION_BY_INSTANCE_SQL = `
SELECT
  LTRIM(RTRIM(InstanceName)) AS InstanceName,
  ProductVersion,
  BuildNumber,
  ProductName,
  SnapshotDate,
  ImportedAt
FROM dbo.Syspro_VersionInfo WITH (NOLOCK);
`;

/** License fallback for version/product when VersionInfo empty */
const EXCO_LICENSE_BY_INSTANCE_SQL = `
SELECT
  LTRIM(RTRIM(InstanceName)) AS InstanceName,
  ProductName,
  ProductVersion,
  LicenseExpiry,
  Users,
  SnapshotDate,
  ImportedAt
FROM dbo.Syspro_SystemLicense WITH (NOLOCK);
`;



export async function fetchLivePortfolio(): Promise<PortfolioPayload | null> {
  const pool = await getPool();
  if (!pool) return null;

  const result = await pool.request().query(PORTFOLIO_SQL);
  const rows: PortfolioRow[] = (result.recordset ?? []).map((r: CustRow) => mapCustomer(r));

  // Optional pillars / PulsewayOrgName (missing table/column must never 500)
  try {
    const hasAms = await pool.request().query(
      `SELECT CASE WHEN OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL THEN 1 ELSE 0 END AS ok`,
    );
    if (Number(hasAms.recordset?.[0]?.ok) === 1) {
      // Prefer full pillar set including Bitdefender (EPP). Fall back if column missing.
      let cfgRows: Array<Record<string, unknown>> = [];
      try {
        const cfg = await pool.request().query(`
SELECT CustomerCode,
  PillarSyspro AS PillarSyspro,
  PillarPulseway AS PillarPulseway,
  PillarCove AS PillarCove,
  PillarBitdefender AS PillarEpp
FROM dbo.Dim_Customer_AmsConfig WITH (NOLOCK)`);
        cfgRows = (cfg.recordset ?? []) as Array<Record<string, unknown>>;
      } catch {
        const cfg = await pool.request().query(`
SELECT CustomerCode,
  PillarSyspro AS PillarSyspro,
  PillarPulseway AS PillarPulseway,
  PillarCove AS PillarCove
FROM dbo.Dim_Customer_AmsConfig WITH (NOLOCK)`);
        cfgRows = (cfg.recordset ?? []) as Array<Record<string, unknown>>;
      }
      const by = new Map<string, Record<string, unknown>>();
      for (const r of cfgRows) {
        by.set(String(r.CustomerCode).toUpperCase(), r);
      }
      for (const row of rows) {
        const a = by.get(row.customerCode.toUpperCase());
        if (!a) continue;
        // null/undefined = unset (data will decide); only 0/1 are explicit
        row.pillarSyspro =
          a.PillarSyspro == null ? null : Boolean(a.PillarSyspro);
        row.pillarPulseway =
          a.PillarPulseway == null ? null : Boolean(a.PillarPulseway);
        row.pillarCove = a.PillarCove == null ? null : Boolean(a.PillarCove);
        if ("PillarEpp" in a && a.PillarEpp != null) {
          row.pillarEpp = Boolean(a.PillarEpp);
        }
      }
    }
  } catch (e) {
    console.warn("[rpm-assure] AmsConfig enrich skipped:", e instanceof Error ? e.message : e);
  }
  try {
    const col = await pool.request().query(
      `SELECT CASE WHEN COL_LENGTH(N'dbo.Dim_Customer', N'PulsewayOrgName') IS NOT NULL THEN 1 ELSE 0 END AS ok`,
    );
    if (Number(col.recordset?.[0]?.ok) === 1) {
      const org = await pool.request().query(`
SELECT CustomerCode, PulsewayOrgName
FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE PulsewayOrgName IS NOT NULL AND LTRIM(RTRIM(CAST(PulsewayOrgName AS nvarchar(200)))) <> N''`);
      for (const r of org.recordset ?? []) {
        const row = rows.find(
          (x) => x.customerCode.toUpperCase() === String(r.CustomerCode).toUpperCase(),
        );
        if (row && r.PulsewayOrgName != null) {
          row.pulsewayOrgName = String(r.PulsewayOrgName);
        }
      }
    }
  } catch (e) {
    console.warn("[rpm-assure] PulsewayOrgName enrich skipped:", e instanceof Error ? e.message : e);
  }

  // RMM + Cove + EPP portfolio legs (soft — never block estate load)
  await Promise.all([
    enrichPulsewayPortfolio(pool, rows),
    enrichCovePortfolio(pool, rows),
    enrichEppPortfolio(pool, rows),
    enrichCspPortfolio(pool, rows),
  ]);
  for (const row of rows) {
    recomputeRowHealth(row);
  }

  type EnrichRow = {
    CustomerCode: string;
    DisplayName: string;
    SqlInstanceName: string | null;
    LicenseExpiry: Date | string | null;
    LicenseProduct: string | null;
    LicenseUsers: number | null;
    OpenRisks: number;
    OpenIssues: number;
    LastFullBackup: Date | string | null;
    LastBackupStatus: string | null;
    SlaCompliancePct: number | null;
    AvailabilityPct: number | null;
    SysproVersion?: string | null;
    SysproBuild?: string | null;
    InstalledHotfixCount?: number;
    LastHotfixAt?: Date | string | null;
    SampleHotfixCode?: string | null;
  };
  const enrichMap = new Map<string, EnrichRow>();
  try {
    const enr = await pool.request().query(EXCO_ENRICH_SQL);
    for (const r of enr.recordset ?? []) {
      enrichMap.set(String(r.CustomerCode).toUpperCase(), r as EnrichRow);
    }
  } catch (e) {
    console.warn("[rpm-assure] ExCo full enrich failed, trying core only:", e instanceof Error ? e.message : e);
    try {
      const core = await pool.request().query(`
SELECT
  c.CustomerCode, c.DisplayName, c.SqlInstanceName,
  lic.LicenseExpiry, lic.ProductName AS LicenseProduct, lic.Users AS LicenseUsers,
  ISNULL(rk.OpenRisks, 0) AS OpenRisks,
  ISNULL(iss.OpenIssues, 0) AS OpenIssues,
  bak.LastFullBackup, bak.LastBackupStatus,
  CAST(NULL AS float) AS SlaCompliancePct,
  CAST(NULL AS float) AS AvailabilityPct
FROM dbo.Dim_Customer AS c
OUTER APPLY (
  SELECT TOP (1) LicenseExpiry, ProductName, Users
  FROM dbo.Syspro_SystemLicense WITH (NOLOCK)
  WHERE InstanceName = c.SqlInstanceName
  ORDER BY SnapshotDate DESC, ImportedAt DESC
) AS lic
OUTER APPLY (
  SELECT COUNT_BIG(*) AS OpenRisks FROM dbo.Fact_Risk WITH (NOLOCK)
  WHERE CustomerCode = c.CustomerCode AND Status NOT IN (N'Closed', N'Resolved', N'Cancelled')
) AS rk
OUTER APPLY (
  SELECT COUNT_BIG(*) AS OpenIssues FROM dbo.Fact_Issue WITH (NOLOCK)
  WHERE CustomerCode = c.CustomerCode AND Status NOT IN (N'Closed', N'Cancelled', N'Resolved')
) AS iss
OUTER APPLY (
  SELECT TOP (1) LastFullBackup, LastBackupStatus
  FROM dbo.Sql_Backups WITH (NOLOCK)
  WHERE InstanceName = c.SqlInstanceName
  ORDER BY SnapshotDate DESC, LastFullBackup DESC
) AS bak
WHERE c.Active = 1`);
      for (const r of core.recordset ?? []) {
        enrichMap.set(String(r.CustomerCode).toUpperCase(), r as EnrichRow);
      }
    } catch (e2) {
      console.warn("[rpm-assure] ExCo core enrich skipped:", e2 instanceof Error ? e2.message : e2);
    }
  }

  // Version + hotfixes — always load by InstanceName, then map via Dim_Customer
  type HfEnrich = {
    sysproVersion: string | null;
    sysproBuild: string | null;
    installedHotfixCount: number;
    lastHotfixAt: string | null;
    sampleHotfixCode: string | null;
    missingHotfixCount: number | null;
    missingMandatoryHotfixes: number | null;
  };
  const hfByInstance = new Map<string, HfEnrich>();

  try {
    const hfRes = await pool.request().query(EXCO_HF_BY_INSTANCE_SQL);
    for (const raw of hfRes.recordset ?? []) {
      const r = raw as Record<string, unknown>;
      const inst = String(r.InstanceName ?? "").trim().toUpperCase();
      if (!inst) continue;
      const kb = Number(r.KbHotfixCount) || 0;
      const all = Number(r.AllHotfixCount) || 0;
      const dep = Number(r.DeployHotfixCount) || 0;
      // Prefer real KB patches; else deployment-sourced; else licensed-module rows
      const count = kb > 0 ? kb : dep > 0 ? dep : all;
      const sample =
        (r.SampleHotfixCode ? String(r.SampleHotfixCode) : null) ||
        (r.SampleAnyCode ? String(r.SampleAnyCode) : null);
      hfByInstance.set(inst, {
        sysproVersion: null,
        sysproBuild: null,
        installedHotfixCount: count,
        lastHotfixAt: toIso((r.LastHotfixAt as Date | string | null) ?? null),
        sampleHotfixCode: sample,
        missingHotfixCount: null,
        missingMandatoryHotfixes: null,
      });
    }
    console.info(
      "[rpm-assure] ExCo HF instances:",
      [...hfByInstance.entries()].map(([k, v]) => k + "=" + v.installedHotfixCount).join(", ") ||
        "(none)",
    );
  } catch (e) {
    console.warn(
      "[rpm-assure] ExCo HF-by-instance failed:",
      e instanceof Error ? e.message : e,
    );
  }

  // Gap summary per customer (mandatory missing chips on portfolio)
  try {
    const gapRes = await pool.request().query(`
SELECT CustomerCode, InstanceName, MissingCount, MissingMandatory, BaselineCount
FROM dbo.vw_Kpi_Syspro_HotfixGap_Summary WITH (NOLOCK)`);
    for (const raw of gapRes.recordset ?? []) {
      const r = raw as Record<string, unknown>;
      const inst = String(r.InstanceName ?? "").trim().toUpperCase();
      if (!inst) continue;
      const prev = hfByInstance.get(inst) ?? {
        sysproVersion: null,
        sysproBuild: null,
        installedHotfixCount: 0,
        lastHotfixAt: null,
        sampleHotfixCode: null,
        missingHotfixCount: null,
        missingMandatoryHotfixes: null,
      };
      prev.missingHotfixCount = Number(r.MissingCount ?? 0);
      prev.missingMandatoryHotfixes = Number(r.MissingMandatory ?? 0);
      hfByInstance.set(inst, prev);
    }
  } catch (e) {
    console.warn(
      "[rpm-assure] ExCo HF gap summary skipped:",
      e instanceof Error ? e.message : e,
    );
  }

  try {
    const verRes = await pool.request().query(EXCO_VERSION_BY_INSTANCE_SQL);
    const latest = new Map<string, Record<string, unknown>>();
    for (const raw of verRes.recordset ?? []) {
      const r = raw as Record<string, unknown>;
      const inst = String(r.InstanceName ?? "").trim().toUpperCase();
      if (!inst) continue;
      const prev = latest.get(inst);
      const snap = String(r.SnapshotDate ?? "");
      const prevSnap = prev ? String(prev.SnapshotDate ?? "") : "";
      if (!prev || snap > prevSnap) latest.set(inst, r);
    }
    for (const [inst, r] of latest) {
      const prev = hfByInstance.get(inst) ?? {
        sysproVersion: null,
        sysproBuild: null,
        installedHotfixCount: 0,
        lastHotfixAt: null,
        sampleHotfixCode: null,
        missingHotfixCount: null,
        missingMandatoryHotfixes: null,
      };
      const pv = r.ProductVersion != null ? String(r.ProductVersion).trim() : "";
      let bn = r.BuildNumber != null ? String(r.BuildNumber).trim() : "";
      // Derive build from dotted product version when BuildNumber blank
      if (!bn && pv) {
        const m4 = pv.match(/^\d+(?:\.\d+){2,}\.(\d+)$/);
        const m3 = pv.match(/^\d+\.\d+\.(\d+)$/);
        if (m4) bn = m4[1];
        else if (m3) bn = m3[1];
      }
      prev.sysproVersion = pv || prev.sysproVersion;
      prev.sysproBuild = bn || prev.sysproBuild;
      hfByInstance.set(inst, prev);
    }
  } catch (e) {
    console.warn(
      "[rpm-assure] ExCo version-by-instance failed:",
      e instanceof Error ? e.message : e,
    );
  }

  // SystemLicense fallback when VersionInfo missing/blank (RSS/RSR often land license first)
  try {
    const licRes = await pool.request().query(EXCO_LICENSE_BY_INSTANCE_SQL);
    const latestLic = new Map<string, Record<string, unknown>>();
    for (const raw of licRes.recordset ?? []) {
      const r = raw as Record<string, unknown>;
      const inst = String(r.InstanceName ?? "").trim().toUpperCase();
      if (!inst) continue;
      const prev = latestLic.get(inst);
      const snap = String(r.SnapshotDate ?? r.ImportedAt ?? "");
      const prevSnap = prev ? String(prev.SnapshotDate ?? prev.ImportedAt ?? "") : "";
      if (!prev || snap > prevSnap) latestLic.set(inst, r);
    }
    for (const [inst, r] of latestLic) {
      const prev = hfByInstance.get(inst) ?? {
        sysproVersion: null,
        sysproBuild: null,
        installedHotfixCount: 0,
        lastHotfixAt: null,
        sampleHotfixCode: null,
        missingHotfixCount: null,
        missingMandatoryHotfixes: null,
      };
      const pv = r.ProductVersion != null ? String(r.ProductVersion).trim() : "";
      if (!prev.sysproVersion && pv) {
        prev.sysproVersion = pv;
        if (!prev.sysproBuild) {
          const m4 = pv.match(/^\d+(?:\.\d+){2,}\.(\d+)$/);
          const m3 = pv.match(/^\d+\.\d+\.(\d+)$/);
          if (m4) prev.sysproBuild = m4[1];
          else if (m3) prev.sysproBuild = m3[1];
        }
      }
      hfByInstance.set(inst, prev);
    }
  } catch (e) {
    console.warn(
      "[rpm-assure] ExCo license-version fallback skipped:",
      e instanceof Error ? e.message : e,
    );
  }

  const boards: ExcoCustomerBoard[] = rows.map((row) => {
    const e = enrichMap.get(row.customerCode.toUpperCase());
    const instKey = (row.sqlInstanceName || e?.SqlInstanceName || "")
      .toString()
      .trim()
      .toUpperCase();
    // Match HF/version by SqlInstanceName; also try exact customer code as last resort key
    let hf = instKey ? hfByInstance.get(instKey) : undefined;
    if (!hf && instKey) {
      // fuzzy: instance stored with different casing already uppercased; try contains match
      for (const [k, v] of hfByInstance) {
        if (k === instKey || k.includes(instKey) || instKey.includes(k)) {
          hf = v;
          break;
        }
      }
    }
    const collectAgeHours = hoursSince(row.lastImportAt);
    const collectFresh =
      collectAgeHours != null && collectAgeHours <= 24;
    const licenseExpiry = toIso(e?.LicenseExpiry ?? null);
    let licenseDaysRemaining: number | null = null;
    if (licenseExpiry) {
      const days =
        (new Date(licenseExpiry).getTime() - Date.now()) / 86400000;
      licenseDaysRemaining = Math.round(days);
    }
    const lastFullBackup = toIso(e?.LastFullBackup ?? null);
    const backupStatus = e?.LastBackupStatus ?? null;
    let backupHealthy: boolean | null = null;
    if (lastFullBackup || backupStatus) {
      const age = hoursSince(lastFullBackup);
      const failed =
        backupStatus != null &&
        /fail|error|cancel/i.test(String(backupStatus));
      backupHealthy = !failed && age != null && age <= 48;
    }
    const openRiskCount = Number(e?.OpenRisks) || 0;
    const openIssueCount = Number(e?.OpenIssues) || 0;
    const cov = row.cover ?? inferCustomerCover({
      pillarSyspro: row.pillarSyspro,
      pillarPulseway: row.pillarPulseway,
      pillarCove: row.pillarCove,
      sqlInstanceName: row.sqlInstanceName,
      operatorCount: row.operatorCount,
      activeUserCount: row.activeUserCount,
      sysproLastImportAt: row.lastImportAt,
      sysproJobErrorCount: row.sysproJobErrorCount,
      sysproDtrVarianceLines: row.sysproDtrVarianceLines,
      pulsewayOrgName: row.pulsewayOrgName,
      pulsewayDeviceCount: row.pulsewayDeviceCount,
      pulsewayMapped: (row.pulsewayDeviceCount ?? 0) > 0 || Boolean(row.pulsewayOrgName) || row.pillarPulseway === true,
      coveDeviceCount: row.coveDeviceCount,
      coveMapped: (row.coveDeviceCount ?? 0) > 0 || row.pillarCove === true,
      eppDeviceCount: row.eppDeviceCount ?? 0,
      eppMapped: (row.eppDeviceCount ?? 0) > 0,
    });
    const healthScorePct = excoHealthScore({
      rag: row.healthRag,
      jobErrorCount: row.sysproJobErrorCount,
      dtrVariance: row.sysproDtrVarianceLines,
      collectAgeHours: cov.syspro ? collectAgeHours : 0,
      operatorCount: cov.syspro ? row.operatorCount : 1,
      cover: cov,
      pulsewayOfflineCount: row.pulsewayOfflineCount,
      pulsewayCriticalAlerts: row.pulsewayCriticalAlerts,
      coveFailedCount: row.coveFailedDeviceCount,
    });
    // assurance: only blend signals for covered legs
    const collectPart = cov.syspro
      ? (collectFresh ? 100 : collectAgeHours == null ? 20 : 40)
      : 100; // no SYSPRO collect clock when No cover
    const jobsPart = cov.syspro
      ? (row.sysproJobErrorCount === 0 ? 100 : 40)
      : 100;
    const rmmPart = cov.rmm
      ? (() => {
          const so = row.pulsewayServerOnline ?? 0;
          const sf = row.pulsewayServerOffline ?? 0;
          const sn = so + sf;
          if (sn <= 0) return null; // workstations only — omit from assurance blend
          const offlineBad = sf > 0;
          const critBad = (row.pulsewayCriticalAlerts ?? 0) > 0;
          return !offlineBad && !critBad ? 100 : 55;
        })()
      : null;

    const assuranceScorePct = Math.round(
      rmmPart == null
        ? healthScorePct * 0.55 + collectPart * 0.25 + jobsPart * 0.2
        : healthScorePct * 0.5 + collectPart * 0.2 + jobsPart * 0.15 + rmmPart * 0.15,
    );
    const installedHotfixCount = cov.syspro ? (hf?.installedHotfixCount ?? 0) : 0;
    const sysproVersion = cov.syspro ? (hf?.sysproVersion ?? null) : null;
    const sysproBuild = cov.syspro ? (hf?.sysproBuild ?? null) : null;
    const lastHotfixAt = cov.syspro ? (hf?.lastHotfixAt ?? null) : null;
    const sampleHotfixCode = cov.syspro ? (hf?.sampleHotfixCode ?? null) : null;
    const missingHotfixCount = cov.syspro ? (hf?.missingHotfixCount ?? null) : null;
    const missingMandatoryHotfixes = cov.syspro
      ? (hf?.missingMandatoryHotfixes ?? null)
      : null;
    const attentionReasons = buildAttentionReasons({
      healthRag: row.healthRag,
      collectFresh: cov.syspro ? collectFresh : true,
      collectAgeHours: cov.syspro ? collectAgeHours : 0,
      jobErrorCount: cov.syspro ? row.sysproJobErrorCount : 0,
      dtrVarianceLines: cov.syspro ? row.sysproDtrVarianceLines : 0,
      licenseDaysRemaining: cov.syspro ? licenseDaysRemaining : null,
      openRiskCount,
      backupHealthy: cov.syspro ? backupHealthy : null,
      pulsewayOfflineCount: cov.rmm ? row.pulsewayOfflineCount : 0,
      pulsewayCriticalAlerts: cov.rmm ? row.pulsewayCriticalAlerts : 0,
      pulsewayDeviceCount: row.pulsewayDeviceCount,
      cover: cov,
    });
    // Soft flag only when collect is healthy but HF truly empty
    if (
      cov.syspro &&
      installedHotfixCount === 0 &&
      row.operatorCount > 0 &&
      (row.sqlInstanceName || e?.SqlInstanceName)
    ) {
      attentionReasons.push("No hotfixes collected");
    }
    if (cov.syspro && (missingMandatoryHotfixes ?? 0) > 0) {
      attentionReasons.push(
        `${missingMandatoryHotfixes} mandatory hotfix(es) missing`,
      );
    }
    return {
      customerCode: row.customerCode,
      displayName: row.displayName,
      healthRag: row.healthRag,
      healthSummary: row.healthSummary,
      healthScorePct,
      assuranceScorePct,
      collectAgeHours,
      collectFresh,
      lastImportAt: row.lastImportAt,
      activeUserCount: row.activeUserCount,
      operatorCount: row.operatorCount,
      jobErrorCount: row.sysproJobErrorCount,
      dtrVarianceLines: row.sysproDtrVarianceLines,
      slaCompliancePct:
        e?.SlaCompliancePct != null ? Number(e.SlaCompliancePct) : null,
      availabilityPct:
        e?.AvailabilityPct != null ? Number(e.AvailabilityPct) : null,
      licenseExpiry,
      licenseProduct: e?.LicenseProduct ?? null,
      licenseDaysRemaining,
      openRiskCount,
      openIssueCount,
      lastFullBackup,
      backupStatus,
      backupHealthy,
      sysproVersion,
      sysproBuild,
      installedHotfixCount,
      lastHotfixAt,
      sampleHotfixCode,
      missingHotfixCount,
      missingMandatoryHotfixes,
      sysproCovered: cov.syspro === true,
      attentionReasons,
      pulsewayDeviceCount: row.pulsewayDeviceCount ?? 0,
      pulsewayOnlineCount: row.pulsewayOnlineCount ?? 0,
      pulsewayOfflineCount: row.pulsewayOfflineCount ?? 0,
      pulsewayCriticalAlerts: row.pulsewayCriticalAlerts ?? 0,
      pulsewayElevatedAlerts: row.pulsewayElevatedAlerts ?? 0,
      pulsewayLastImportAt: row.pulsewayLastImportAt ?? null,
      pulsewayOrgName: row.pulsewayOrgName ?? null,
      pulsewayHealthRag: row.pulsewayHealthRag ?? null,
      pulsewayHealthSummary: row.pulsewayHealthSummary ?? null,
      pulsewayServerOnline: row.pulsewayServerOnline ?? 0,
      pulsewayServerOffline: row.pulsewayServerOffline ?? 0,
      pulsewayWorkstationOnline: row.pulsewayWorkstationOnline ?? 0,
      pulsewayWorkstationOffline: row.pulsewayWorkstationOffline ?? 0,
      pulsewayPatchMissing: row.pulsewayPatchMissing ?? 0,
      pulsewayPatchDevices: row.pulsewayPatchDevices ?? 0,
      pulsewayPatchCompliant: row.pulsewayPatchCompliant ?? 0,
      pulsewayDiskHighCount: row.pulsewayDiskHighCount ?? 0,
    };
  });

  // Fill ExCo board gaps — only invent SLA from estate health when at least one leg is covered
  for (const b of boards) {
    const row = rows.find((r) => r.customerCode === b.customerCode);
    const cov = row?.cover ?? inferCustomerCover({
      pillarSyspro: row?.pillarSyspro,
      pillarPulseway: row?.pillarPulseway,
      pillarCove: row?.pillarCove,
      sqlInstanceName: row?.sqlInstanceName,
      operatorCount: row?.operatorCount,
      sysproLastImportAt: row?.lastImportAt,
      pulsewayOrgName: row?.pulsewayOrgName,
      pulsewayDeviceCount: row?.pulsewayDeviceCount,
      coveDeviceCount: row?.coveDeviceCount,
      eppDeviceCount: row?.eppDeviceCount ?? 0,
    });
    (b as { cover?: typeof cov }).cover = cov;
    b.sysproCovered = cov.syspro === true;

    // No SYSPRO cover → never surface hotfixes / version on ExCo
    if (!cov.syspro) {
      b.installedHotfixCount = 0;
      b.missingHotfixCount = null;
      b.missingMandatoryHotfixes = null;
      b.sysproVersion = null;
      b.sysproBuild = null;
      b.lastHotfixAt = null;
      b.sampleHotfixCode = null;
      b.attentionReasons = b.attentionReasons.filter(
        (r) =>
          !/hotfix/i.test(r) &&
          !/SYSPRO collect/i.test(r) &&
          !/job error/i.test(r) &&
          !/FinSight/i.test(r),
      );
    }

    // SLA from covered non-M365 pillars only (CSP never scored; No Cover = null)
    {
      const row2 = row;
      const sla = buildExcoPillarSla({
        cover: cov,
        collectFresh: Boolean(b.collectFresh),
        collectAgeHours: b.collectAgeHours,
        jobErrorCount: b.jobErrorCount ?? 0,
        dtrVarianceLines: b.dtrVarianceLines ?? 0,
        serverOnline: b.pulsewayServerOnline ?? 0,
        serverOffline: b.pulsewayServerOffline ?? 0,
        criticalAlerts: b.pulsewayCriticalAlerts ?? 0,
        backupHealthy: cov.cove ? b.backupHealthy : null,
        coveDeviceCount: row2?.coveDeviceCount ?? 0,
        eppDeviceCount: row2?.eppDeviceCount ?? 0,
        eppManagedCount: row2?.eppManagedCount ?? null,
        healthRag: b.healthRag,
      });
      b.pillarSla = sla.pillars;
      b.slaOverallPct = sla.overallPct;
      // Overall compliance = covered-pillar average (null if only M365 / no cover)
      b.slaCompliancePct = hasSlaCover(cov) ? sla.overallPct : null;
      if (!hasSlaCover(cov)) {
        b.availabilityPct = null;
      } else if (b.availabilityPct == null) {
        const so = b.pulsewayServerOnline ?? 0;
        const sf = b.pulsewayServerOffline ?? 0;
        const sn = so + sf;
        if (cov.rmm && sn > 0) {
          b.availabilityPct = Math.round((so / sn) * 1000) / 10;
        } else if (sla.overallPct != null) {
          b.availabilityPct = sla.overallPct;
        } else {
          b.availabilityPct = null;
        }
      }
    }
    // License is SYSPRO-only — do not invent when SYSPRO is No cover
    if (cov.syspro) {
      if (b.licenseProduct == null && b.operatorCount > 0) b.licenseProduct = "SYSPRO";
      if (b.licenseDaysRemaining == null && b.licenseExpiry == null && b.operatorCount > 0) {
        b.licenseDaysRemaining = 180;
      }
    } else {
      if (b.licenseProduct == null) b.licenseProduct = null;
    }
    if (b.backupHealthy == null && b.lastFullBackup == null) {
      // Unknown backup state is not failure — leave null (UI: No data)
    }
    if (b.openRiskCount === 0 && (b.jobErrorCount > 0 || b.dtrVarianceLines > 0)) {
      b.openRiskCount = (b.jobErrorCount > 0 ? 1 : 0) + (b.dtrVarianceLines > 0 ? 1 : 0);
      if (!b.attentionReasons.some((r) => r.includes("risk"))) {
        b.attentionReasons.push(`${b.openRiskCount} derived risk(s)`);
      }
    }
  }

  const needsAttention = boards.filter((b) => b.attentionReasons.length > 0);
  const estateAssurancePct =
    boards.length === 0
      ? 0
      : Math.round(
          boards.reduce((s, b) => s + b.assuranceScorePct, 0) / boards.length,
        );

  const installedHotfixesTotal = boards.reduce(
    (s, b) => s + (b.sysproCovered ? b.installedHotfixCount || 0 : 0),
    0,
  );
  const customersWithHotfixes = boards.filter(
    (b) => b.sysproCovered && (b.installedHotfixCount || 0) > 0,
  ).length;
  const customersMissingHotfixes = boards.filter(
    (b) =>
      b.sysproCovered &&
      (b.installedHotfixCount || 0) === 0 &&
      b.operatorCount > 0,
  ).length;

  const exco: ExcoInsightPayload = {
    generatedAt: new Date().toISOString(),
    estateAssurancePct,
    customersNeedingAttention: needsAttention.length,
    collectFreshCount: boards.filter((b) => b.collectFresh).length,
    collectStaleCount: boards.filter(
      (b) => !b.collectFresh && b.collectAgeHours != null,
    ).length,
    collectMissingCount: boards.filter((b) => b.lastImportAt == null).length,
    licensesExpiringSoon: boards.filter(
      (b) =>
        b.licenseDaysRemaining != null &&
        b.licenseDaysRemaining >= 0 &&
        b.licenseDaysRemaining <= 90,
    ).length,
    openRisksTotal: boards.reduce((s, b) => s + b.openRiskCount, 0),
    openIssuesTotal: boards.reduce((s, b) => s + b.openIssueCount, 0),
    backupUnhealthyCount: boards.filter((b) => b.backupHealthy === false).length,
    installedHotfixesTotal,
    customersWithHotfixes,
    customersMissingHotfixes,
    rmmDevicesTotal: boards.reduce((s, b) => s + (b.pulsewayDeviceCount || 0), 0),
    rmmOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayOfflineCount || 0), 0),
    rmmCriticalTotal: boards.reduce((s, b) => s + (b.pulsewayCriticalAlerts || 0), 0),
    rmmCustomersWithDevices: boards.filter((b) => (b.pulsewayDeviceCount || 0) > 0).length,
    rmmCustomersUnhealthy: boards.filter(
      (b) =>
        (b.pulsewayDeviceCount || 0) > 0 &&
        (b.pulsewayHealthRag === "Red" || b.pulsewayHealthRag === "Amber"),
    ).length,
    rmmServerOnlineTotal: boards.reduce((s, b) => s + (b.pulsewayServerOnline || 0), 0),
    rmmServerOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayServerOffline || 0), 0),
    rmmWorkstationOnlineTotal: boards.reduce(
      (s, b) => s + (b.pulsewayWorkstationOnline || 0),
      0,
    ),
    rmmWorkstationOfflineTotal: boards.reduce(
      (s, b) => s + (b.pulsewayWorkstationOffline || 0),
      0,
    ),
    rmmServerAvailabilityPct: (() => {
      const on = boards.reduce((s, b) => s + (b.pulsewayServerOnline || 0), 0);
      const off = boards.reduce((s, b) => s + (b.pulsewayServerOffline || 0), 0);
      const n = on + off;
      return n ? Math.round((on / n) * 1000) / 10 : null;
    })(),
    rmmPatchCompliancePct: (() => {
      const devices = boards.reduce((s, b) => s + (b.pulsewayPatchDevices || 0), 0);
      const ok = boards.reduce((s, b) => s + (b.pulsewayPatchCompliant || 0), 0);
      return devices ? Math.round((ok / devices) * 1000) / 10 : null;
    })(),
    rmmDiskHighTotal: boards.reduce((s, b) => s + (b.pulsewayDiskHighCount || 0), 0),
    coveFailedTotal: rows.reduce((s, r) => s + (r.coveFailedDeviceCount || 0), 0),
    coveStaleTotal: rows.reduce((s, r) => s + (r.coveStaleDeviceCount || 0), 0),
    eppEndpointTotal: rows.reduce((s, r) => s + (r.eppDeviceCount || 0), 0),
    eppUnmanagedTotal: rows.reduce((s, r) => {
      const all = r.eppDeviceCount || 0;
      const managed = r.eppManagedCount || 0;
      return s + Math.max(0, all - managed);
    }, 0),
    boards,
  };

  const pillarAudit = auditPortfolioRows(rows);
  exco.pillarAudit = pillarAudit;

  return {
    summary: {
      totalCustomers: rows.length,
      red: rows.filter((r) => r.healthRag === "Red").length,
      amber: rows.filter((r) => r.healthRag === "Amber").length,
      green: rows.filter((r) => r.healthRag === "Green").length,
      totalActiveUsers: rows.reduce((s, r) => s + r.activeUserCount, 0),
      totalOperators: rows.reduce((s, r) => s + r.operatorCount, 0),
      dataMode: "live",
      generatedAt: new Date().toISOString(),
    },
    rows,
    customers: rows,
    dataMode: "live" as const,
    exco,
    pillarAudit,
  };
}

export async function fetchLiveCustomerDetail(
  code: string,
  options?: { legs?: DetailLeg[] },
): Promise<CustomerDetailPayload | null> {
  const t0 = Date.now();
  const codeIn = String(code || "").trim();
  if (!codeIn) return null;

  const rawLegs = options?.legs;
  const loadAll =
    !rawLegs ||
    rawLegs.length === 0 ||
    rawLegs.includes("all");
  const legSet = new Set<DetailLeg>(
    loadAll
      ? (["shell", "syspro", "ams", "rmm", "cove", "epp", "csp"] as DetailLeg[])
      : rawLegs,
  );
  // shell is always implied
  legSet.add("shell");
  const want = (leg: DetailLeg) => loadAll || legSet.has(leg);

  // P0: short-lived per-customer cache (pillar tab clicks / back-nav)
  const DETAIL_TTL_MS = 90_000;
  const legKey = loadAll
    ? "all"
    : [...legSet].sort().join("+");
  const detailCacheKey = `customer-detail:${codeIn.toUpperCase()}:${legKey}`;
  try {
    const { cacheGet } = await import("./query-cache");
    const hit = cacheGet<CustomerDetailPayload>(detailCacheKey, DETAIL_TTL_MS);
    if (hit) {
      console.info(
        `[rpm-assure] customer detail ${codeIn} cache-hit ${Date.now() - t0}ms`,
      );
      return hit;
    }
  } catch {
    /* ignore */
  }

  const pool = await getPool();
  if (!pool) return null;

  // Fast path: resolve single customer from Dim_Customer — do NOT load full estate portfolio
  // (fetchLivePortfolio was taking 10–20s and blocked every customer open).
  let customer: PortfolioRow | null = null;
  try {
    const dim = await pool
      .request()
      .input("code", sql.NVarChar(100), codeIn)
      .query(`
SELECT TOP 1
  c.CustomerCode, c.DisplayName, c.Active, c.SqlInstanceName, c.PulsewayOrgName
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
WHERE c.Active = 1
  AND (
    c.CustomerCode = @code
    OR UPPER(LTRIM(RTRIM(c.CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
    OR UPPER(LTRIM(RTRIM(c.DisplayName))) = UPPER(LTRIM(RTRIM(@code)))
  )
ORDER BY CASE WHEN c.CustomerCode = @code THEN 0 ELSE 1 END`);
    const d = dim.recordset?.[0] as
      | {
          CustomerCode: string;
          DisplayName: string;
          Active: boolean;
          SqlInstanceName: string | null;
          PulsewayOrgName: string | null;
        }
      | undefined;
    if (!d) {
      // Optional: try warm portfolio cache only (no rebuild)
      try {
        const { cacheGet } = await import("./query-cache");
        const PORTFOLIO_TTL_MS = 120_000;
        const hit = cacheGet<PortfolioPayload>("portfolio", PORTFOLIO_TTL_MS);
        customer =
          hit?.rows.find(
            (r) => r.customerCode.toUpperCase() === codeIn.toUpperCase(),
          ) ?? null;
      } catch {
        /* ignore */
      }
      if (!customer) return null;
    } else {
      const { rag, summary } = healthFor({
        operatorCount: 0,
        jobErrorCount: 0,
        dtrVariance: 0,
        activeUserCount: 0,
        skipNoOperatorsAmber: true,
      });
      customer = {
        customerCode: String(d.CustomerCode),
        displayName: String(d.DisplayName || d.CustomerCode),
        active: Boolean(d.Active),
        sqlInstanceName: d.SqlInstanceName,
        asOfDate: null,
        healthRag: rag,
        healthSummary: summary,
        activeUserCount: 0,
        operatorCount: 0,
        sysproJobErrorCount: 0,
        sysproDtrVarianceLines: 0,
        lastImportAt: null,
        pulsewayOrgName: d.PulsewayOrgName ? String(d.PulsewayOrgName) : null,
        reportingPeriod: formatSastDate(new Date()),
      };
      // Single-row enrich — only legs requested (shell always needs light cover signals)
      const enrichJobs: Promise<void>[] = [];
      if (want("rmm") || want("shell")) {
        enrichJobs.push(
          enrichPulsewayPortfolio(pool, [customer]).catch((e) => {
            console.warn(
              "[rpm-assure] single-customer pulseway enrich:",
              e instanceof Error ? e.message : e,
            );
          }),
        );
      }
      if (want("cove") || want("shell")) {
        enrichJobs.push(
          enrichCovePortfolio(pool, [customer]).catch((e) => {
            console.warn(
              "[rpm-assure] single-customer cove enrich:",
              e instanceof Error ? e.message : e,
            );
          }),
        );
      }
      if (want("epp") || want("shell")) {
        enrichJobs.push(
          enrichEppPortfolio(pool, [customer]).catch((e) => {
            console.warn(
              "[rpm-assure] single-customer epp enrich:",
              e instanceof Error ? e.message : e,
            );
          }),
        );
      }
      if (want("csp") || want("shell")) {
        enrichJobs.push(
          enrichCspPortfolio(pool, [customer]).catch((e) => {
            console.warn(
              "[rpm-assure] single-customer csp enrich:",
              e instanceof Error ? e.message : e,
            );
          }),
        );
      }
      await Promise.all(enrichJobs);
      await hydrateHealthInputsFromEstate(pool, customer);
      recomputeRowHealth(customer);
    }
  } catch (e) {
    console.warn(
      "[rpm-assure] Dim_Customer resolve failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }

  if (!customer) return null;

  // Canonical code for all child queries
  code = customer.customerCode;

  // Explicit cover flags from AmsConfig (row present = authoritative; 0 = No cover)
  let hasAmsConfig = false;
  try {
    const cfg = await pool
      .request()
      .input("code", sql.NVarChar(50), code)
      .query(`
SELECT TOP 1
  PillarSyspro AS PillarSyspro,
  PillarPulseway AS PillarPulseway,
  PillarCove AS PillarCove,
  PillarBitdefender AS PillarEpp
FROM dbo.Dim_Customer_AmsConfig WITH (NOLOCK)
WHERE CustomerCode = @code`);
    const a = cfg.recordset?.[0] as
      | {
          PillarSyspro?: unknown;
          PillarPulseway?: unknown;
          PillarCove?: unknown;
          PillarEpp?: unknown;
        }
      | undefined;
    if (a) {
      hasAmsConfig = true;
      customer.pillarSyspro =
        a.PillarSyspro == null ? null : Boolean(a.PillarSyspro);
      customer.pillarPulseway =
        a.PillarPulseway == null ? null : Boolean(a.PillarPulseway);
      customer.pillarCove =
        a.PillarCove == null ? null : Boolean(a.PillarCove);
      if (a.PillarEpp != null) {
        customer.pillarEpp = Boolean(a.PillarEpp);
      }
    }
    // PillarCsp optional column
    try {
      const cfgCsp = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT TOP 1 CAST(PillarCsp AS bit) AS PillarCsp
FROM dbo.Dim_Customer_AmsConfig WITH (NOLOCK)
WHERE CustomerCode = @code`);
      const pc = cfgCsp.recordset?.[0] as { PillarCsp?: unknown } | undefined;
      if (pc && pc.PillarCsp != null) {
        customer.pillarCsp = Boolean(pc.PillarCsp);
        hasAmsConfig = true;
      }
    } catch {
      /* PillarCsp column optional until 460 */
    }
  } catch {
    /* optional — try without PillarBitdefender */
    try {
      const cfg2 = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT TOP 1
  PillarSyspro AS PillarSyspro,
  PillarPulseway AS PillarPulseway,
  PillarCove AS PillarCove
FROM dbo.Dim_Customer_AmsConfig WITH (NOLOCK)
WHERE CustomerCode = @code`);
      const a = cfg2.recordset?.[0] as
        | { PillarSyspro?: unknown; PillarPulseway?: unknown; PillarCove?: unknown }
        | undefined;
      if (a) {
        hasAmsConfig = true;
        customer.pillarSyspro =
          a.PillarSyspro == null ? null : Boolean(a.PillarSyspro);
        customer.pillarPulseway =
          a.PillarPulseway == null ? null : Boolean(a.PillarPulseway);
        customer.pillarCove =
          a.PillarCove == null ? null : Boolean(a.PillarCove);
      }
    } catch {
      /* optional */
    }
  }

  let instanceName =
    (customer.sqlInstanceName && String(customer.sqlInstanceName).trim()) ||
    ((
      await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query<{ SqlInstanceName: string | null }>(
          `SELECT SqlInstanceName FROM dbo.Dim_Customer WITH (NOLOCK) WHERE CustomerCode = @code AND Active = 1`,
        )
    ).recordset[0]?.SqlInstanceName ??
      null);
  if (instanceName) instanceName = String(instanceName).trim() || null;

  // If Dim_Customer has no SqlInstanceName, probe warehouse for a matching instance
  // (same rule for every customer). Skip when SYSPRO is explicitly deferred (HYDRA).
  if (!instanceName && customer.pillarSyspro !== false) {
    try {
      const display = String(customer.displayName || code || "");
      const probe = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .input("disp", sql.NVarChar(200), display)
        .query<{ InstanceName: string }>(`
SELECT TOP 1 InstanceName FROM (
  SELECT InstanceName FROM dbo.Syspro_OperGroup WITH (NOLOCK)
  UNION
  SELECT InstanceName FROM dbo.Syspro_License WITH (NOLOCK)
  UNION
  SELECT InstanceName FROM dbo.Syspro_TaskGroup WITH (NOLOCK)
  UNION
  SELECT InstanceName FROM dbo.Syspro_JobLogging WITH (NOLOCK)
) AS i
WHERE InstanceName IS NOT NULL
  AND LTRIM(RTRIM(InstanceName)) <> N''
  AND (
    UPPER(LTRIM(RTRIM(InstanceName))) = UPPER(@code)
    OR UPPER(LTRIM(RTRIM(InstanceName))) LIKE N'%' + UPPER(@code) + N'%'
    OR (
      LEN(@disp) >= 4
      AND UPPER(LTRIM(RTRIM(InstanceName))) LIKE N'%' + UPPER(LEFT(@disp, 12)) + N'%'
    )
  )
ORDER BY
  CASE WHEN UPPER(LTRIM(RTRIM(InstanceName))) = UPPER(@code) THEN 0 ELSE 1 END,
  LEN(InstanceName)`);
      const hit = probe.recordset?.[0]?.InstanceName;
      if (hit && String(hit).trim()) {
        instanceName = String(hit).trim();
        console.info(
          `[rpm-assure] Resolved SqlInstanceName for ${code} via warehouse probe: ${instanceName}`,
        );
      }
    } catch (e) {
      console.warn(
        "[rpm-assure] SYSPRO instance probe:",
        e instanceof Error ? e.message : e,
      );
    }
  }
  customer.sqlInstanceName = instanceName;

  // Load SYSPRO warehouse when instance is known OR config/evidence suggests cover.
  // Cover is finalized AFTER load with loaded-row evidence (all customers same rule).
  // Explicit PillarSyspro = false => do not load/score SYSPRO (HYDRA deferred etc.)
  const earlySysproCover =
    customer.pillarSyspro !== false &&
    (Boolean(instanceName) ||
      customer.pillarSyspro === true ||
      (Number(customer.operatorCount) || 0) > 0 ||
      (Number(customer.activeUserCount) || 0) > 0 ||
      Boolean(customer.lastImportAt) ||
      (Number(customer.sysproJobErrorCount) || 0) > 0);

  let operators: OperatorRow[] = [];
  let jobErrors: JobErrorRow[] = [];
  let dtrLevel1: DtrLevel1Row[] = [];
  let license: LicenseRow | null = null;
  let healthLogs: HealthLogRow[] = [];
  let taskGroups: TaskGroupRow[] = [];
  let taskItems: TaskItemRow[] = [];
  let incidents: FactIncidentRow[] = [];
  let problems: FactProblemRow[] = [];
  let risks: FactRiskRow[] = [];
  let issues: FactIssueRow[] = [];
  let priorities: FactPriorityRow[] = [];
  let slaPolicies: SlaPolicyRow[] = [];
  let availabilitySla: AvailabilitySlaSnapshot | null = null;
  let changes: FactChangeRow[] = [];
  let csat: FactCsatRow | null = null;
  let operGroups: OperGroupRow[] = [];
  let operAmends: OperAmendRow[] = [];
  let execSummary: ExecSummaryRow | null = null;
  let execNarratives: ExecNarrativeRow[] = [];
  let auditEvents: AuditEventRow[] = [];
  let diagSummaries: DiagSummaryRow[] = [];
  let sqlHealthRows: SqlHealthRow[] = [];
  let sqlBackups: SqlBackupRow[] = [];
  let sqlBackupFailures: SqlBackupFailureRow[] = [];
  let sysproVersion: SysproVersionInfo | null = null;
  let sysproHotfixes: SysproHotfixRow[] = [];
  let hotfixGap: HotfixGapRow[] = [];
  let hotfixGapSummary: HotfixGapSummary | null = null;
  let dayEnd: DayEndSnapshot | null = null;

  if (want("syspro") && instanceName && customer.pillarSyspro !== false) { // lazy + hard-off
    const instQ = (q: string) =>
      pool
        .request()
        .input("instance", sql.NVarChar(100), instanceName)
        .query(q)
        .catch(() => null);

    // Parallel SYSPRO instance queries (was sequential — major latency)
    const [
      opsRes,
      licRes,
      hlRes,
      tgRes,
      tiRes,
      ogRes,
      oaRes,
      auRes,
      dgRes,
      shRes,
      bkRes,
      bfRes,
      vrRes,
      hfRes,
      hgRes,
      hsRes,
      jobsRes,
      dayEndRes,
    ] = await Promise.all([
      instQ(OPERATORS_SQL),
      instQ(LICENSE_SQL),
      instQ(HEALTH_SQL),
      instQ(TASK_GROUP_SQL),
      instQ(TASK_ITEM_SQL),
      instQ(OPER_GROUP_SQL),
      instQ(OPER_AMEND_SQL),
      instQ(AUDIT_SQL),
      instQ(DIAG_SQL),
      instQ(SQLHEALTH_SQL),
      instQ(SQL_BACKUPS_SQL),
      instQ(SQL_BACKUP_FAIL_SQL),
      instQ(VERSION_SQL),
      instQ(HOTFIX_SQL),
      instQ(HOTFIX_GAP_SQL),
      instQ(HOTFIX_GAP_SUM_SQL),
      instQ(JOBS_SQL),
      instQ(DAYEND_JOBS_SQL),
    ]);

    operators = ((opsRes?.recordset ?? []) as Array<{
      OperatorCode: string;
      OperatorName: string | null;
      LastLoginDate: Date | null;
      OperatorStatus: string | null;
      SnapshotDate: Date | string;
    }>).map((o) => ({
      operatorCode: o.OperatorCode,
      operatorName: o.OperatorName ?? o.OperatorCode,
      lastLoginDate: toIso(o.LastLoginDate),
      operatorStatus: o.OperatorStatus,
      snapshotDate: toDateOnly(o.SnapshotDate) ?? "",
    }));

    try {
      const lr = licRes?.recordset?.[0];
      if (lr) {
        license = {
          productName: lr.ProductName ?? lr.CustomerName ?? "SYSPRO",
          productVersion: lr.ProductVersion ?? null,
          licenseType: lr.LicenseType ?? null,
          users: lr.Users != null ? Number(lr.Users) : null,
          companyCount: lr.CompanyCount != null ? Number(lr.CompanyCount) : null,
          licenseExpiry: toIso(lr.LicenseExpiry),
          customerName: lr.CustomerName ?? null,
          importDate: toIso(lr.ImportDate),
        };
      }
    } catch { license = null; }

    healthLogs = ((hlRes?.recordset ?? []) as Array<{
      RunDateTime: Date | null;
      Operator: string | null;
      HealthFunction: string | null;
      Description: string | null;
      StatusFlag: string | null;
      Message: string | null;
    }>).map((h) => ({
      runDateTime: toIso(h.RunDateTime),
      operator: h.Operator,
      healthFunction: h.HealthFunction,
      description: h.Description,
      statusFlag: h.StatusFlag,
      message: h.Message,
    }));

    taskGroups = ((tgRes?.recordset ?? []) as Array<{
      OperatorCode: string | null;
      TaskGroup: string | null;
      AutoRun: number | null;
      StopIfError: number | null;
    }>).map((g) => ({
      operatorCode: g.OperatorCode,
      taskGroup: g.TaskGroup,
      autoRun: g.AutoRun != null ? Number(g.AutoRun) : null,
      stopIfError: g.StopIfError != null ? Number(g.StopIfError) : null,
    }));

    taskItems = ((tiRes?.recordset ?? []) as Array<{
      OperatorCode: string | null;
      TaskGroup: string | null;
      Description: string | null;
      ProgramName: string | null;
      TaskType: string | null;
      SequenceNumber: number | null;
    }>).map((i) => ({
      operatorCode: i.OperatorCode,
      taskGroup: i.TaskGroup,
      description: i.Description,
      programName: i.ProgramName,
      taskType: i.TaskType,
      sequenceNumber: i.SequenceNumber != null ? Number(i.SequenceNumber) : null,
    }));

    operGroups = ((ogRes?.recordset ?? []) as Array<{
      OperatorCode: string | null; GroupCode: string | null; GroupName: string | null;
    }>).map((r) => ({
      operatorCode: r.OperatorCode,
      groupCode: r.GroupCode,
      groupName: r.GroupName,
    }));

    operAmends = ((oaRes?.recordset ?? []) as Array<{
      OperatorCode: string | null; AmendDate: Date | null; AmendType: string | null;
      Detail: string | null; ChangedBy: string | null;
    }>).map((r) => ({
      operatorCode: r.OperatorCode,
      amendDate: toIso(r.AmendDate),
      amendType: r.AmendType,
      detail: r.Detail,
      changedBy: r.ChangedBy,
    }));

    auditEvents = ((auRes?.recordset ?? []) as Array<{
      EventAt: Date | null; OperatorCode: string | null; ProgramName: string | null;
      ActionCode: string | null; Detail: string | null;
    }>).map((r) => ({
      eventAt: toIso(r.EventAt),
      operatorCode: r.OperatorCode,
      programName: r.ProgramName,
      actionCode: r.ActionCode,
      detail: r.Detail,
    }));

    diagSummaries = ((dgRes?.recordset ?? []) as Array<{
      DiagCode: string | null; DiagName: string | null; Severity: string | null;
      StatusText: string | null; MessageText: string | null; CheckedAt: Date | null;
    }>).map((r) => ({
      diagCode: r.DiagCode,
      diagName: r.DiagName,
      severity: r.Severity,
      statusText: r.StatusText,
      messageText: r.MessageText,
      checkedAt: toIso(r.CheckedAt),
    }));

    sqlHealthRows = ((shRes?.recordset ?? []) as Array<{
      CompanyDb: string | null; HealthKey: string | null; Description: string | null;
      StatusText: string | null; RefreshDate: Date | null;
    }>).map((r) => ({
      companyDb: r.CompanyDb,
      healthKey: r.HealthKey,
      description: r.Description,
      statusText: r.StatusText,
      refreshDate: toIso(r.RefreshDate),
    }));

    sqlBackups = ((bkRes?.recordset ?? []) as Array<{
      DatabaseName: string; LastFullBackup: Date | null; LastDiffBackup: Date | null;
      LastLogBackup: Date | null; LastBackupStatus: string | null; FullAgeHours: number | null;
    }>).map((r) => ({
      databaseName: r.DatabaseName,
      lastFullBackup: toIso(r.LastFullBackup),
      lastDiffBackup: toIso(r.LastDiffBackup),
      lastLogBackup: toIso(r.LastLogBackup),
      lastBackupStatus: r.LastBackupStatus,
      fullAgeHours: r.FullAgeHours != null ? Number(r.FullAgeHours) : null,
    }));

    sqlBackupFailures = ((bfRes?.recordset ?? []) as Array<{
      FailureAt: Date | null; JobName: string | null; DatabaseName: string | null;
      StepName: string | null; Message: string | null;
    }>).map((r) => ({
      failureAt: toIso(r.FailureAt),
      jobName: r.JobName,
      databaseName: r.DatabaseName,
      stepName: r.StepName,
      message: r.Message,
    }));

    try {
      const row = vrRes?.recordset?.[0];
      if (row) {
        let build = row.BuildNumber != null ? String(row.BuildNumber).trim() : "";
        const pv = row.ProductVersion != null ? String(row.ProductVersion).trim() : "";
        if (!build && pv) {
          const m4 = pv.match(/^\d+(?:\.\d+){2,}\.(\d+)$/);
          const m3 = pv.match(/^\d+\.\d+\.(\d+)$/);
          if (m4) build = m4[1];
          else if (m3) build = m3[1];
        }
        sysproVersion = {
          productName: row.ProductName ?? null,
          productVersion: pv || null,
          buildNumber: build || null,
          licenseType: row.LicenseType ?? null,
          users: row.Users != null ? Number(row.Users) : null,
          companyCount: row.CompanyCount != null ? Number(row.CompanyCount) : null,
          licenseExpiry: toIso(row.LicenseExpiry),
          customerName: row.CustomerName ?? null,
          serverName: row.ServerName ?? null,
          importDate: toIso(row.ImportDate),
        };
      }
    } catch { sysproVersion = null; }

    if (license && (!sysproVersion || !sysproVersion.productVersion || !sysproVersion.buildNumber)) {
      const pv = license.productVersion?.trim() || "";
      let build = sysproVersion?.buildNumber ?? null;
      if (!build && pv) {
        const m4 = pv.match(/^\d+(?:\.\d+){2,}\.(\d+)$/);
        const m3 = pv.match(/^\d+\.\d+\.(\d+)$/);
        if (m4) build = m4[1];
        else if (m3) build = m3[1];
      }
      sysproVersion = {
        productName: sysproVersion?.productName ?? license.productName ?? null,
        productVersion: sysproVersion?.productVersion ?? (pv || null),
        buildNumber: build,
        licenseType: sysproVersion?.licenseType ?? license.licenseType ?? null,
        users: sysproVersion?.users ?? license.users ?? null,
        companyCount: sysproVersion?.companyCount ?? license.companyCount ?? null,
        licenseExpiry: sysproVersion?.licenseExpiry ?? license.licenseExpiry ?? null,
        customerName: sysproVersion?.customerName ?? license.customerName ?? null,
        serverName: sysproVersion?.serverName ?? instanceName ?? null,
        importDate: sysproVersion?.importDate ?? license.importDate ?? null,
      };
    }

    const mapHf = (r: {
      HotfixCode: string; HotfixName: string | null; Description: string | null;
      Installed: boolean | number; InstalledAt: Date | null; SourceTable: string | null;
    }) => ({
      hotfixCode: r.HotfixCode,
      hotfixName: r.HotfixName,
      description: r.Description,
      installed: Boolean(r.Installed),
      installedAt: toIso(r.InstalledAt),
      sourceTable: r.SourceTable,
    });
    sysproHotfixes = ((hfRes?.recordset ?? []) as Parameters<typeof mapHf>[0][]).map(mapHf);
    if (sysproHotfixes.length === 0) {
      try {
        const hi = await pool.request().input("instance", sql.NVarChar(100), instanceName).query(HOTFIX_INSTALLED_SQL);
        sysproHotfixes = ((hi.recordset ?? []) as Parameters<typeof mapHf>[0][]).map((r) => ({
          ...mapHf(r),
          sourceTable: r.SourceTable ?? "CustomerHotfixes",
        }));
      } catch {
        sysproHotfixes = [];
      }
    }

    hotfixGap = ((hgRes?.recordset ?? []) as Array<{
      HotfixCode: string; Title: string | null; Severity: string | null;
      ReleaseLabel: string | null; IsMissing: boolean | number; InstalledAt: Date | null; KbUrl: string | null;
      IsWaived?: boolean | number; WaiverReason?: string | null;
    }>).map((r) => ({
      hotfixCode: r.HotfixCode,
      title: r.Title,
      severity: r.Severity,
      releaseLabel: r.ReleaseLabel,
      isMissing: Boolean(r.IsMissing),
      isWaived: Boolean(r.IsWaived),
      waiverReason: r.WaiverReason ?? null,
      installedAt: toIso(r.InstalledAt),
      kbUrl: r.KbUrl,
    }));

    try {
      const row = hsRes?.recordset?.[0];
      if (row) {
        hotfixGapSummary = {
          baselineCount: Number(row.BaselineCount ?? 0),
          missingCount: Number(row.MissingCount ?? 0),
          installedMatchCount: Number(row.InstalledMatchCount ?? 0),
          missingMandatory: Number(row.MissingMandatory ?? 0),
          waivedMissingCount: Number(row.WaivedMissingCount ?? 0),
          missingOptional: Number(row.MissingOptional ?? 0),
        };
      }
    } catch { hotfixGapSummary = null; }

    jobErrors = ((jobsRes?.recordset ?? []) as Array<{
      ProgramName: string | null;
      Operator: string | null;
      Message: string | null;
      ErrorStatusCode: string | null;
      ProgErrorCode: number | null;
      ProgRunDate: Date | null;
    }>).map((j) => ({
      programName: j.ProgramName,
      operator: j.Operator,
      message: j.Message,
      errorStatusCode: j.ErrorStatusCode,
      progErrorCode: j.ProgErrorCode != null ? Number(j.ProgErrorCode) : null,
      progRunDate: toIso(j.ProgRunDate),
    }));

    const deJobs = ((dayEndRes?.recordset ?? []) as Array<{
      ProgramName: string | null;
      Operator: string | null;
      Message: string | null;
      ErrorStatusCode: string | null;
      ProgErrorCode: number | null;
      ProgRunDate: Date | null;
      TransactionStatus: string | null;
    }>).map((j) => ({
      programName: j.ProgramName,
      operator: j.Operator,
      message: j.Message,
      errorStatusCode: j.ErrorStatusCode,
      progErrorCode: j.ProgErrorCode != null ? Number(j.ProgErrorCode) : null,
      progRunDate: toIso(j.ProgRunDate),
      transactionStatus: j.TransactionStatus,
      failed: isJobFailed({
        errorStatusCode: j.ErrorStatusCode,
        progErrorCode: j.ProgErrorCode != null ? Number(j.ProgErrorCode) : null,
        transactionStatus: j.TransactionStatus,
        message: j.Message,
      }),
    }));
    const extraFromErrors = jobErrors
      .filter((j) => isDayEndText(j.programName, j.operator, j.message))
      .map((j) => ({
        ...j,
        transactionStatus: null as string | null,
        failed: isJobFailed(j),
      }));
    const merged = [...deJobs];
    for (const j of extraFromErrors) {
      const key = `${j.programName}|${j.progRunDate}|${j.message}`;
      if (!merged.some((m) => `${m.programName}|${m.progRunDate}|${m.message}` === key)) {
        merged.push(j);
      }
    }
    dayEnd = buildDayEndSnapshot({
      jobs: merged,
      taskGroups: [
        ...taskGroups,
        ...taskItems.map((i) => ({
          taskGroup: i.taskGroup,
          description: `${i.description ?? ""} ${i.programName ?? ""}`,
        })),
      ],
      lastImportAt: customer.lastImportAt,
    });
  }

  let dtrDetailLines: DtrDetailLine[] = [];
  let finsightReconCases: FinSightReconCase[] = [];

  if (want("syspro") && earlySysproCover) {
  // P0: DTR + FinSight in parallel
  const [dtrPack, detPack, reconPack] = await Promise.all([
    (async () => {
      try {
        let dtr = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(DTR_L1_SQL);
        if (!(dtr.recordset?.length)) {
          dtr = await pool
            .request()
            .input("code", sql.NVarChar(50), code)
            .query(DTR_BY_TYPE_SQL);
        }
        return dtr.recordset ?? [];
      } catch {
        return [];
      }
    })(),
    (async () => {
      try {
        const det = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(DTR_DETAIL_SQL);
        return det.recordset ?? [];
      } catch {
        return [];
      }
    })(),
    (async () => {
      try {
        const rc = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(FINSIGHT_RECON_CASES_SQL);
        return rc.recordset ?? [];
      } catch {
        return [];
      }
    })(),
  ]);

  dtrLevel1 = (dtrPack as Array<{
    BalanceTypeCode: string;
    BalanceTypeName: string;
    VarianceLineCount: number;
    TotalLineCount: number;
    TotalVariance: number | null;
    AbsVariance: number | null;
    TotalCloseBalance: number | null;
    AsOfDate: Date | string | null;
  }>).map((d) => ({
    balanceTypeCode: d.BalanceTypeCode,
    balanceTypeName: d.BalanceTypeName,
    varianceLineCount: Number(d.VarianceLineCount) || 0,
    totalLineCount: Number(d.TotalLineCount) || 0,
    totalVariance: d.TotalVariance != null ? Number(d.TotalVariance) : null,
    absVariance: d.AbsVariance != null ? Number(d.AbsVariance) : null,
    totalCloseBalance:
      d.TotalCloseBalance != null ? Number(d.TotalCloseBalance) : null,
    asOfDate: toDateOnly(d.AsOfDate),
  }));

  dtrDetailLines = (detPack as Array<Record<string, unknown>>).map((raw) => {
    const g = (k: string) => {
      if (raw[k] !== undefined && raw[k] !== null) return raw[k];
      const hit = Object.keys(raw).find((x) => x.toLowerCase() === k.toLowerCase());
      return hit ? raw[hit] : null;
    };
    const str = (k: string) => {
      const v = g(k);
      if (v == null) return null;
      const s = String(v).trim();
      return s.length ? s : null;
    };
    const num = (k: string) => {
      const v = g(k);
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const gl = num("GlCloseBalance");
    const variance = num("Variance");
    let sub = num("SubCloseBalance");
    if (sub == null && gl != null && variance != null) {
      /* Datarapt: Variance ≈ SubClose − GlClose */
      sub = gl + variance;
    }
    const levelKey =
      str("LevelKey") || str("GlCode") || str("Dimension1") || str("Description");
    return {
      balanceTypeCode: str("BalanceTypeCode") || "",
      informationLevel: Number(g("InformationLevel")) || 1,
      levelKey,
      parentLevelKey: str("ParentLevelKey"),
      glCode: str("GlCode") || str("LevelKey"),
      dimension1: str("Dimension1"),
      description: str("Description") || str("LevelKey") || str("GlCode"),
      subCloseBalance: sub,
      glCloseBalance: gl,
      variance,
      snapshotDate: toDateOnly(g("SnapshotDate") as Date | string | null),
      companyDb: str("CompanyDb"),
      glYear: num("GlYear"),
      glPeriod: num("GlPeriod"),
      instanceName: str("InstanceName"),
    };
  });

  finsightReconCases = (reconPack as Array<{
    ReconCaseId: string;
    CustomerCode: string;
    BalanceTypeCode: string;
    SnapshotDate: Date | string | null;
    Status: string;
    OobLines: number;
    AbsVariance: number | null;
    CloseBalance: number | null;
    OwnerName: string | null;
    Title: string;
    Notes: string | null;
    SourceLevel: number | null;
    LevelKey: string | null;
    CreatedAtUtc: Date | string | null;
    UpdatedAtUtc: Date | string | null;
  }>).map((r) => ({
    reconCaseId: r.ReconCaseId,
    customerCode: r.CustomerCode,
    balanceTypeCode: r.BalanceTypeCode,
    snapshotDate: toDateOnly(r.SnapshotDate),
    status: r.Status as FinSightReconCase["status"],
    oobLines: Number(r.OobLines) || 0,
    absVariance: r.AbsVariance != null ? Number(r.AbsVariance) : null,
    closeBalance: r.CloseBalance != null ? Number(r.CloseBalance) : null,
    ownerName: r.OwnerName,
    title: r.Title,
    notes: r.Notes,
    sourceLevel: r.SourceLevel != null ? Number(r.SourceLevel) : null,
    levelKey: r.LevelKey,
    createdAtUtc: toIso(r.CreatedAtUtc),
    updatedAtUtc: toIso(r.UpdatedAtUtc),
  }));
  }

  let amsSlaSummary: CustomerDetailPayload["amsSlaSummary"] = null;

  // P0: AMS / SLA / exec facts in one round-trip fan-out (lazy leg)
  if (want("ams")) {
    const codeQ = async (q: string) => {
      try {
        return await pool.request().input("code", sql.NVarChar(50), code).query(q);
      } catch {
        return null;
      }
    };
    const [
      fiRes,
      fiFb,
      s30Res,
      fpRes,
      frRes,
      fissRes,
      fprRes,
      spRes,
      avRes,
      perRes,
      chRes,
      csRes,
      esRes,
      enRes,
    ] = await Promise.all([
      codeQ(FACT_INCIDENTS_SQL),
      codeQ(FACT_INCIDENTS_FALLBACK_SQL),
      codeQ(AMS_SLA_30D_SQL),
      codeQ(FACT_PROBLEMS_SQL),
      codeQ(FACT_RISKS_SQL),
      codeQ(FACT_ISSUES_SQL),
      codeQ(FACT_PRIORITIES_SQL),
      codeQ(SLA_POLICY_SQL),
      codeQ(AVAIL_SLA_SQL),
      codeQ(FACT_SLA_PERIOD_SQL),
      codeQ(FACT_CHANGE_SQL),
      codeQ(FACT_CSAT_SQL),
      codeQ(EXEC_SUMMARY_SQL),
      codeQ(EXEC_NARRATIVE_SQL),
    ]);

    const fi = fiRes?.recordset?.length ? fiRes : fiFb;
    incidents = ((fi?.recordset ?? []) as Array<Record<string, unknown>>).map((r) => ({
      incidentId: r.IncidentId != null ? String(r.IncidentId) : null,
      title: String(r.Title ?? ""),
      severity: String(r.Severity ?? ""),
      status: String(r.Status ?? ""),
      priority: r.Priority != null ? String(r.Priority) : null,
      openedAt: toIso(r.OpenedAt as Date | null),
      firstResponseAt: toIso(r.FirstResponseAt as Date | null),
      resolvedAt: toIso(r.ResolvedAt as Date | null),
      isMajor: !!r.IsMajor,
      externalRef: r.ExternalRef != null ? String(r.ExternalRef) : null,
      ownerName: r.OwnerName != null ? String(r.OwnerName) : null,
      sourceSystem: r.SourceSystem != null ? String(r.SourceSystem) : null,
      businessImpact: r.BusinessImpact != null ? String(r.BusinessImpact) : null,
      respondMins: r.RespondMins != null ? Number(r.RespondMins) : null,
      resolveMins: r.ResolveMins != null ? Number(r.ResolveMins) : null,
      responseMinsElapsed:
        r.ResponseMinsElapsed != null ? Number(r.ResponseMinsElapsed) : null,
      resolveMinsElapsed:
        r.ResolveMinsElapsed != null ? Number(r.ResolveMinsElapsed) : null,
      responseSlaMet: r.ResponseSlaMet == null ? null : !!r.ResponseSlaMet,
      resolveSlaMet: r.ResolveSlaMet == null ? null : !!r.ResolveSlaMet,
    }));

    const s30row = s30Res?.recordset?.[0];
    if (s30row) {
      amsSlaSummary = {
        incidentCount30d: Number(s30row.IncidentCount30d) || 0,
        openCount: incidents.filter(
          (i) => !/closed|cancelled|resolved/i.test(i.status),
        ).length,
        majorOpenCount: incidents.filter(
          (i) => i.isMajor && !/closed|cancelled/i.test(i.status),
        ).length,
        responsePct:
          s30row.SlaResponsePct != null ? Number(s30row.SlaResponsePct) : null,
        resolvePct:
          s30row.SlaResolvePct != null ? Number(s30row.SlaResolvePct) : null,
        responseBreach: Number(s30row.ResponseBreach) || 0,
        resolveBreach: Number(s30row.ResolveBreach) || 0,
      };
    } else {
      amsSlaSummary = {
        incidentCount30d: incidents.length,
        openCount: incidents.filter(
          (i) => !/closed|cancelled|resolved/i.test(i.status),
        ).length,
        majorOpenCount: incidents.filter(
          (i) => i.isMajor && !/closed|cancelled/i.test(i.status),
        ).length,
        responsePct: null,
        resolvePct: null,
        responseBreach: incidents.filter((i) => i.responseSlaMet === false).length,
        resolveBreach: incidents.filter((i) => i.resolveSlaMet === false).length,
      };
    }

    problems = ((fpRes?.recordset ?? []) as Array<{
      Title: string;
      Status: string;
      Severity: string | null;
      OwnerName: string | null;
      OpenedAt: Date | null;
    }>).map((r) => ({
      title: r.Title,
      status: r.Status,
      severity: r.Severity,
      ownerName: r.OwnerName,
      openedAt: toIso(r.OpenedAt),
    }));

    risks = ((frRes?.recordset ?? []) as Array<{
      Title: string;
      Rag: string;
      Status: string;
      OwnerName: string | null;
      TargetDate: Date | string | null;
      Category: string | null;
    }>).map((r) => ({
      title: r.Title,
      rag: r.Rag,
      status: r.Status,
      ownerName: r.OwnerName,
      targetDate: toDateOnly(r.TargetDate),
      category: r.Category,
    }));

    issues = ((fissRes?.recordset ?? []) as Array<{
      Title: string;
      Status: string;
      Severity: string | null;
      OwnerName: string | null;
      TargetDate: Date | string | null;
    }>).map((r) => ({
      title: r.Title,
      status: r.Status,
      severity: r.Severity,
      ownerName: r.OwnerName,
      targetDate: toDateOnly(r.TargetDate),
    }));

    priorities = ((fprRes?.recordset ?? []) as Array<{
      Title: string;
      Detail: string | null;
      Status: string;
      SortOrder: number;
      PeriodLabel: string | null;
      ProgramCode?: string | null;
    }>).map((r) => ({
      title: r.Title,
      detail: r.Detail,
      status: r.Status,
      sortOrder: Number(r.SortOrder) || 0,
      periodLabel: r.PeriodLabel,
      programCode: r.ProgramCode ? String(r.ProgramCode).trim() : null,
    }));

    {
      const seen = new Set<string>();
      slaPolicies = [];
      for (const r of spRes?.recordset ?? []) {
        const pr = String(r.Priority);
        if (seen.has(pr)) continue;
        seen.add(pr);
        slaPolicies.push({
          priority: pr,
          respondMins: r.RespondMins != null ? Number(r.RespondMins) : null,
          resolveMins: r.ResolveMins != null ? Number(r.ResolveMins) : null,
          availabilityPct:
            r.AvailabilityPct != null ? Number(r.AvailabilityPct) : null,
        });
      }
    }

    {
      const row = avRes?.recordset?.[0];
      if (row) {
        availabilitySla = {
          periodFrom: toDateOnly(row.PeriodFrom),
          periodTo: toDateOnly(row.PeriodTo),
          availabilityPct:
            row.AvailabilityPct != null ? Number(row.AvailabilityPct) : null,
          availabilitySlaPct:
            row.AvailabilitySlaPct != null
              ? Number(row.AvailabilitySlaPct)
              : null,
          slaResponsePct:
            row.SlaResponsePct != null ? Number(row.SlaResponsePct) : null,
          slaResolvePct:
            row.SlaResolvePct != null ? Number(row.SlaResolvePct) : null,
          slaCompliancePct:
            row.SlaCompliancePct != null ? Number(row.SlaCompliancePct) : null,
          source: "snapshot",
        };
      } else {
        availabilitySla = {
          periodFrom: null,
          periodTo: null,
          availabilityPct: null,
          availabilitySlaPct: null,
          slaResponsePct: null,
          slaResolvePct: null,
          slaCompliancePct: null,
          source: "stub",
        };
      }
    }

    {
      const row = perRes?.recordset?.[0];
      if (row) {
        const resp =
          row.SlaResponsePct != null ? Number(row.SlaResponsePct) : null;
        const reso =
          row.SlaResolvePct != null ? Number(row.SlaResolvePct) : null;
        const comp =
          row.SlaCompliancePct != null
            ? Number(row.SlaCompliancePct)
            : resp != null && reso != null
              ? Math.round(((resp + reso) / 2) * 100) / 100
              : (resp ?? reso);
        availabilitySla = {
          periodFrom: toDateOnly(row.PeriodFrom),
          periodTo: toDateOnly(row.PeriodTo),
          availabilityPct:
            row.AvailabilityPct != null ? Number(row.AvailabilityPct) : null,
          availabilitySlaPct:
            row.AvailabilitySlaPct != null
              ? Number(row.AvailabilitySlaPct)
              : null,
          slaResponsePct: resp,
          slaResolvePct: reso,
          slaCompliancePct: comp,
          source: "sla-period",
          note:
            row.Note != null
              ? String(row.Note)
              : "From Fact_SlaPeriod measurement feed",
          incidentCount30d:
            row.IncidentCount != null ? Number(row.IncidentCount) : null,
          responseBreachCount: null,
          resolveBreachCount:
            row.BreachCount != null ? Number(row.BreachCount) : null,
        };
      }
    }

    if (
      (!availabilitySla ||
        availabilitySla.source === "stub" ||
        availabilitySla.source === "derived") &&
      amsSlaSummary &&
      (amsSlaSummary.responsePct != null || amsSlaSummary.resolvePct != null)
    ) {
      const resp = amsSlaSummary.responsePct;
      const reso = amsSlaSummary.resolvePct;
      const comp =
        resp != null && reso != null
          ? Math.round(((resp + reso) / 2) * 100) / 100
          : (resp ?? reso);
      availabilitySla = {
        periodFrom: null,
        periodTo: null,
        availabilityPct: availabilitySla?.availabilityPct ?? null,
        availabilitySlaPct: availabilitySla?.availabilitySlaPct ?? null,
        slaResponsePct: resp,
        slaResolvePct: reso,
        slaCompliancePct: comp,
        source: "live-incident",
        note: `Computed from Fact_Incident clocks (30d): ${amsSlaSummary.incidentCount30d} incident(s), ${amsSlaSummary.responseBreach} response / ${amsSlaSummary.resolveBreach} resolve breach(es).`,
        incidentCount30d: amsSlaSummary.incidentCount30d,
        responseBreachCount: amsSlaSummary.responseBreach,
        resolveBreachCount: amsSlaSummary.resolveBreach,
      };
    }

    changes = ((chRes?.recordset ?? []) as Array<{
      Title: string;
      Status: string;
      Outcome: string | null;
      CompletedAt: Date | null;
    }>).map((r) => ({
      title: r.Title,
      status: r.Status,
      outcome: r.Outcome,
      completedAt: toIso(r.CompletedAt),
    }));

    {
      const row = csRes?.recordset?.[0];
      csat = row
        ? {
            periodFrom: toDateOnly(row.PeriodFrom),
            periodTo: toDateOnly(row.PeriodTo),
            score: Number(row.Score),
            responseCount:
              row.ResponseCount != null ? Number(row.ResponseCount) : null,
            source: row.Source,
          }
        : null;
    }

    {
      const row = esRes?.recordset?.[0];
      execSummary = row
        ? {
            periodFrom: toDateOnly(row.PeriodFrom),
            periodTo: toDateOnly(row.PeriodTo),
            periodLabel: row.PeriodLabel,
            healthRag: row.HealthRag,
            healthSummary: row.HealthSummary,
            businessImpactSummary: row.BusinessImpactSummary,
            openRiskCount:
              row.OpenRiskCount != null ? Number(row.OpenRiskCount) : null,
            openIssueCount:
              row.OpenIssueCount != null ? Number(row.OpenIssueCount) : null,
            majorIncidentCount:
              row.MajorIncidentCount != null
                ? Number(row.MajorIncidentCount)
                : null,
            status: row.Status,
          }
        : null;
    }

    execNarratives = ((enRes?.recordset ?? []) as Array<{
      NarrativeType: string;
      Body: string;
      SortOrder: number;
    }>).map((r) => ({
      narrativeType: r.NarrativeType,
      body: r.Body,
      sortOrder: Number(r.SortOrder) || 0,
    }));
  }

  const recentLogins = operators
    .filter((o) => o.lastLoginDate)
    .slice(0, 15);

  const securitySummary = {
    groupMemberships: operGroups.length,
    distinctOperatorsInGroups: new Set(
      operGroups.map((g) => g.operatorCode).filter(Boolean),
    ).size,
    distinctGroups: new Set(
      operGroups.map((g) => g.groupCode || g.groupName).filter(Boolean),
    ).size,
    amendCount90d: operAmends.length,
  };

  const dtrOut = dtrLevel1.reduce((s, d) => s + (d.varianceLineCount || 0), 0);
  // Provisional — rebuilt after cover finalize so uncovered legs are not scored
  let operationalAssurance = buildOperationalAssurance({
    lastImportAt: customer.lastImportAt,
    jobErrorCount: customer.sysproJobErrorCount,
    operatorCount: customer.operatorCount,
    activeUserCount: customer.activeUserCount,
    dtrOutOfBalance: dtrOut,
    healthRag: customer.healthRag,
    healthSummary: customer.healthSummary,
    cover: { syspro: true, rmm: false, cove: false },
  });

  // D: auto exec summary from live signals when Fact_ExecSummary empty
  if (!execSummary) {
    execSummary = {
      periodFrom: customer.asOfDate,
      periodTo: customer.asOfDate,
      periodLabel: customer.reportingPeriod ?? "Current",
      healthRag: customer.healthRag,
      healthSummary: customer.healthSummary,
      businessImpactSummary: operationalAssurance.summary,
      openRiskCount: risks.filter(
        (r) => (r.status || "").toLowerCase() !== "closed",
      ).length,
      openIssueCount: issues.filter(
        (i) => (i.status || "").toLowerCase() !== "closed",
      ).length,
      majorIncidentCount: incidents.filter((i) => i.isMajor).length,
      status: "Derived",
    };
  }
  if (execNarratives.length === 0) {
    execNarratives = [
      {
        narrativeType: "Priorities",
        body:
          customer.sysproJobErrorCount > 0
            ? `Review ${customer.sysproJobErrorCount} SYSPRO job error(s) on the latest collect.`
            : "No job errors on the latest collect window.",
        sortOrder: 1,
      },
      {
        narrativeType: "Collect",
        body: operationalAssurance.collectFresh
          ? `Collect is fresh (${operationalAssurance.collectAgeHours ?? "?"}h since last import).`
          : "Collect may be stale — check scheduled agent on the customer SQL host.",
        sortOrder: 2,
      },
      {
        narrativeType: "Security",
        body: `Operator groups ${securitySummary.distinctGroups}, amends(90d) ${securitySummary.amendCount90d}, audit events loaded ${auditEvents.length}.`,
        sortOrder: 3,
      },
    ];
  }

  const sqlHealthFailCount = sqlHealthRows.filter((r) => {
    const s = (r.statusText || "").toLowerCase();
    return (
      s.includes("fail") ||
      s.includes("error") ||
      s.includes("bad") ||
      s.includes("mismatch")
    );
  }).length;

  // ---- RMM leg (CustomerCode join — not InstanceName) ----
  let rmm: RmmPayload = {
    enabled: false,
    pillarOn: false,
    pulsewayOrgName: null,
    summary: null,
    devices: [],
    alerts: [],
    mapping: [],
    message: null,
  };
  if (want("rmm")) try {
    const meta = await pool
      .request()
      .input("code", sql.NVarChar(50), code)
      .query(`
SELECT
  c.PulsewayOrgName,
  CAST(ISNULL(a.PillarPulseway, 0) AS bit) AS PillarPulseway
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig AS a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = @code`);
    const m = meta.recordset?.[0] as
      | { PulsewayOrgName?: string | null; PillarPulseway?: boolean | number }
      | undefined;
    rmm.pulsewayOrgName = m?.PulsewayOrgName ? String(m.PulsewayOrgName) : null;
    rmm.pillarOn = Boolean(m?.PillarPulseway);

    try {
      const mapRes = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT OrganizationName, OrganizationId, Active, Notes
FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
WHERE CustomerCode = @code
ORDER BY OrganizationName`);
      rmm.mapping = (mapRes.recordset ?? []).map(
        (r: {
          OrganizationName: string;
          OrganizationId: number | null;
          Active: boolean | number;
          Notes: string | null;
        }): RmmOrgMapRow => ({
          organizationName: String(r.OrganizationName),
          organizationId: r.OrganizationId != null ? Number(r.OrganizationId) : null,
          active: Boolean(r.Active),
          notes: r.Notes != null ? String(r.Notes) : null,
        }),
      );
      if (rmm.mapping.some((m) => m.active && m.organizationName && !/^invalid/i.test(m.organizationName))) {
        customer.pillarPulseway = true;
        rmm.pillarOn = true;
      }
    } catch {
      rmm.mapping = [];
    }

    try {
      const sumRes = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT TOP 1
  AsOfDate, OrganizationName, DeviceCount, OnlineCount, OfflineCount, MaintenanceCount,
  CriticalAlerts, ElevatedAlerts, DiskHighCount, ServerCount, WorkstationCount,
  NotificationCount, HealthRag, HealthSummary, ImportedAt
FROM dbo.vw_Kpi_Rmm_OrgSummary_Latest WITH (NOLOCK)
WHERE CustomerCode = @code`);
      const s = sumRes.recordset?.[0];
      if (s) {
        const ragRaw = String(s.HealthRag || "Green");
        const healthRag: HealthRag =
          ragRaw === "Red" || ragRaw === "Amber" ? ragRaw : "Green";
        rmm.summary = {
          asOfDate: toDateOnly(s.AsOfDate),
          organizationName: s.OrganizationName != null ? String(s.OrganizationName) : null,
          deviceCount: Number(s.DeviceCount) || 0,
          onlineCount: Number(s.OnlineCount) || 0,
          offlineCount: Number(s.OfflineCount) || 0,
          maintenanceCount: Number(s.MaintenanceCount) || 0,
          criticalAlerts: Number(s.CriticalAlerts) || 0,
          elevatedAlerts: Number(s.ElevatedAlerts) || 0,
          diskHighCount: Number(s.DiskHighCount) || 0,
          serverCount: Number(s.ServerCount) || 0,
          workstationCount: Number(s.WorkstationCount) || 0,
          notificationCount: Number(s.NotificationCount) || 0,
          healthRag,
          healthSummary: String(s.HealthSummary || ""),
          lastImportAt: toIso(s.ImportedAt),
          serverOnline: 0,
          serverOffline: 0,
          workstationOnline: 0,
          workstationOffline: 0,
        } satisfies RmmOrgSummary;
      }
    } catch {
      /* view missing until 420 */
    }

    try {
      // Prefer latest devices with optional agent stats columns
      let devRows: any[] = [];
      const deviceSelects = [
        `SELECT TOP 200
  DeviceId, Name, IsOnline, OsName, DeviceType,
  CriticalNotifications, ElevatedNotifications, LastSeenOnline, OrganizationName,
  IpAddress, CpuUsagePct, MemoryUsagePct, OnlinePct,
  UptimeDays, LastBootAt, PatchInstalledCount, PatchMissingCount, PatchPendingCount,
  OfflineHoursCurrent, OfflineHours7d, OfflineHours30d,
  SnapshotDate, ImportedAt
FROM dbo.vw_Kpi_Rmm_Devices_Latest WITH (NOLOCK)
WHERE CustomerCode = @code
ORDER BY CASE WHEN IsOnline = 0 THEN 0 ELSE 1 END, Name`,
        `SELECT TOP 200
  DeviceId, Name, IsOnline, OsName, DeviceType,
  CriticalNotifications, ElevatedNotifications, LastSeenOnline, OrganizationName,
  IpAddress, CpuUsagePct, MemoryUsagePct, OnlinePct,
  UptimeDays, LastBootAt, PatchInstalledCount, PatchMissingCount, PatchPendingCount,
  OfflineHoursCurrent, OfflineHours7d, OfflineHours30d,
  SnapshotDate, ImportedAt
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode = @code
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK) WHERE CustomerCode = @code
  )
ORDER BY CASE WHEN IsOnline = 0 THEN 0 ELSE 1 END, Name`,
        `SELECT TOP 200
  DeviceId, Name, IsOnline, OsName, DeviceType,
  CriticalNotifications, ElevatedNotifications, LastSeenOnline, OrganizationName,
  IpAddress, CpuUsagePct, MemoryUsagePct, OnlinePct,
  UptimeDays, LastBootAt, PatchInstalledCount, PatchMissingCount, PatchPendingCount,
  SnapshotDate, ImportedAt
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode = @code
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK) WHERE CustomerCode = @code
  )
ORDER BY CASE WHEN IsOnline = 0 THEN 0 ELSE 1 END, Name`,
        `SELECT TOP 200
  DeviceId, Name, IsOnline, OsName, DeviceType,
  CriticalNotifications, ElevatedNotifications, LastSeenOnline, OrganizationName,
  SnapshotDate, ImportedAt
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode = @code
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK) WHERE CustomerCode = @code
  )
ORDER BY CASE WHEN IsOnline = 0 THEN 0 ELSE 1 END, Name`,
      ];
      for (const q of deviceSelects) {
        try {
          const devRes = await pool.request().input("code", sql.NVarChar(50), code).query(q);
          if ((devRes.recordset ?? []).length || q === deviceSelects[deviceSelects.length - 1]) {
            devRows = devRes.recordset ?? [];
            if (devRows.length) break;
          }
        } catch {
          /* try next shape */
        }
      }

      rmm.devices = devRows.map((r: any): RmmDeviceRow => {
        let online: boolean | null =
          r.IsOnline == null ? null : Boolean(r.IsOnline);
        const lastSeenIso = toIso(r.LastSeenOnline ?? r.ImportedAt ?? null);
        // Derive online from last-seen when agent flag missing (Pulseway list is often thin)
        if (online == null && lastSeenIso) {
          const ageMin = (Date.now() - new Date(lastSeenIso).getTime()) / 60000;
          if (Number.isFinite(ageMin)) {
            if (ageMin <= 30) online = true;
            else if (ageMin > 120) online = false;
          }
        }
        let onlinePct: number | null =
          r.OnlinePct != null && r.OnlinePct !== ""
            ? Number(r.OnlinePct)
            : null;
        // Do not invent 100/0 OnlinePct from IsOnline — that fakes availability
        let daysSinceReboot: number | null =
          r.UptimeDays != null && r.UptimeDays !== ""
            ? Number(r.UptimeDays)
            : null;

        const lastBootAt = toIso(r.LastBootAt ?? null);
        if (
          (daysSinceReboot == null || !Number.isFinite(daysSinceReboot)) &&
          lastBootAt
        ) {
          const ms = Date.now() - new Date(lastBootAt).getTime();
          if (Number.isFinite(ms) && ms >= 0) {
            daysSinceReboot = Math.round((ms / 86400000) * 10) / 10;
          }
        }
        return {
          deviceId: String(r.DeviceId),
          name: r.Name != null ? String(r.Name) : null,
          isOnline: online,
          osName: r.OsName != null && String(r.OsName).trim() ? String(r.OsName) : null,
          deviceType: r.DeviceType != null ? String(r.DeviceType) : null,
          criticalNotifications: Number(r.CriticalNotifications) || 0,
          elevatedNotifications: Number(r.ElevatedNotifications) || 0,
          lastSeenOnline: lastSeenIso,
          organizationName:
            r.OrganizationName != null ? String(r.OrganizationName) : null,
          ipAddress:
            r.IpAddress != null && String(r.IpAddress).trim()
              ? String(r.IpAddress)
              : null,
          cpuPct: r.CpuUsagePct != null ? Number(r.CpuUsagePct) : null,
          memoryPct: r.MemoryUsagePct != null ? Number(r.MemoryUsagePct) : null,
          onlinePct,
          daysSinceReboot:
            daysSinceReboot != null && Number.isFinite(daysSinceReboot)
              ? daysSinceReboot
              : null,
          lastBootAt,
          patchInstalled:
            r.PatchInstalledCount != null ? Number(r.PatchInstalledCount) : null,
          patchMissing:
            r.PatchMissingCount != null ? Number(r.PatchMissingCount) : null,
          patchPending:
            r.PatchPendingCount != null ? Number(r.PatchPendingCount) : null,
          offlineHoursCurrent:
            r.OfflineHoursCurrent != null && r.OfflineHoursCurrent !== ""
              ? Number(r.OfflineHoursCurrent)
              : null,
          offlineHours7d:
            r.OfflineHours7d != null && r.OfflineHours7d !== ""
              ? Number(r.OfflineHours7d)
              : null,
          offlineHours30d:
            r.OfflineHours30d != null && r.OfflineHours30d !== ""
              ? Number(r.OfflineHours30d)
              : null,
          disks: [],
          diskUsedGb: null,
          diskFreeGb: null,
          diskTotalGb: null,
          diskIopsMax: null,
        };
      });

      // Derive servers vs workstations online/offline for RMM summary cards
      if (rmm.summary && rmm.devices.length) {
        let serverOnline = 0;
        let serverOffline = 0;
        let workstationOnline = 0;
        let workstationOffline = 0;
        for (const d of rmm.devices) {
          const isServer = classifyRmmDevice(d) === "server";
          const online = d.isOnline === true;
          const offline = d.isOnline === false || d.isOnline == null;
          if (isServer) {
            if (online) serverOnline += 1;
            else if (offline) serverOffline += 1;
          } else {
            if (online) workstationOnline += 1;
            else if (offline) workstationOffline += 1;
          }
        }
        rmm.summary.serverOnline = serverOnline;
        rmm.summary.serverOffline = serverOffline;
        rmm.summary.workstationOnline = workstationOnline;
        rmm.summary.workstationOffline = workstationOffline;
        if (!rmm.summary.serverCount)
          rmm.summary.serverCount = serverOnline + serverOffline;
        if (!rmm.summary.workstationCount)
          rmm.summary.workstationCount = workstationOnline + workstationOffline;
      }

      // Disks: match by DeviceId on latest snapshot (CustomerCode optional)
      try {
        const ids = rmm.devices.map((d) => d.deviceId).filter(Boolean);
        if (ids.length) {
          // Load all latest disks then filter in JS (avoids TVP / IN list limits for small estates)
          let diskRows: any[] = [];
          const diskQs = [
            `SELECT DeviceId, DriveLetter, TotalGb, FreeGb, UsedPct, CustomerCode, MediaType, ReadIops, WriteIops, TotalIops
FROM dbo.vw_Kpi_Rmm_Disks_Latest WITH (NOLOCK)`,
            `SELECT d.DeviceId, d.DriveLetter, d.TotalGb, d.FreeGb, d.UsedPct, d.CustomerCode, d.MediaType, d.ReadIops, d.WriteIops, d.TotalIops
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
INNER JOIN (
  SELECT DeviceId, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Disks WITH (NOLOCK)
  GROUP BY DeviceId
) m ON m.DeviceId = d.DeviceId AND m.mx = d.SnapshotDate`,
            `SELECT d.DeviceId, d.DriveLetter, d.TotalGb, d.FreeGb, d.UsedPct, d.CustomerCode, d.MediaType
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
INNER JOIN (
  SELECT DeviceId, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Disks WITH (NOLOCK)
  GROUP BY DeviceId
) m ON m.DeviceId = d.DeviceId AND m.mx = d.SnapshotDate`,
            `SELECT d.DeviceId, d.DriveLetter, d.TotalGb, d.FreeGb, d.UsedPct, d.CustomerCode
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
INNER JOIN (
  SELECT DeviceId, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Disks WITH (NOLOCK)
  GROUP BY DeviceId
) m ON m.DeviceId = d.DeviceId AND m.mx = d.SnapshotDate`,
            `SELECT d.DeviceId, d.DriveLetter, d.TotalGb, d.FreeGb, d.UsedPct, d.CustomerCode
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
WHERE d.CustomerCode = @code
  AND d.SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Disks WITH (NOLOCK) WHERE CustomerCode = @code

  )`,
          ];
          for (const q of diskQs) {
            try {
              const req = pool.request();
              if (q.includes("@code")) req.input("code", sql.NVarChar(50), code);
              const diskRes = await req.query(q);
              diskRows = diskRes.recordset ?? [];
              if (diskRows.length) break;
            } catch {
              /* next (MediaType column may be missing) */
            }
          }
          const idSet = new Set(ids.map((x) => x.toUpperCase()));
          const byDev = new Map<string, NonNullable<RmmDeviceRow["disks"]>>();
          for (const row of diskRows) {
            const id = String(row.DeviceId);
            if (!idSet.has(id.toUpperCase())) {
              if (row.CustomerCode && String(row.CustomerCode).toUpperCase() !== code.toUpperCase())
                continue;
              if (!idSet.has(id.toUpperCase())) continue;
            }
            const key = ids.find((x) => x.toUpperCase() === id.toUpperCase()) ?? id;
            const arr = byDev.get(key) ?? [];
            let totalGb = row.TotalGb != null ? Number(row.TotalGb) : null;
            let freeGb = row.FreeGb != null ? Number(row.FreeGb) : null;
            let usedPct = row.UsedPct != null ? Number(row.UsedPct) : null;
            // Guard NaN
            if (totalGb != null && !Number.isFinite(totalGb)) totalGb = null;
            if (freeGb != null && !Number.isFinite(freeGb)) freeGb = null;
            if (usedPct != null && !Number.isFinite(usedPct)) usedPct = null;
            // Infer missing side from usedPct
            if (totalGb != null && freeGb == null && usedPct != null) {
              freeGb = Math.round(totalGb * (1 - usedPct / 100) * 100) / 100;
            }
            if (freeGb != null && totalGb == null && usedPct != null && usedPct < 100) {
              // free = total * (1 - usedPct/100) => total = free / (1 - usedPct/100)
              const rem = 1 - usedPct / 100;
              if (rem > 0.01) {
                totalGb = Math.round((freeGb / rem) * 100) / 100;
              }
            }
            let usedGb: number | null = null;
            if (totalGb != null && freeGb != null) {
              usedGb = Math.round((totalGb - freeGb) * 100) / 100;
              if (usedPct == null && totalGb > 0) {
                usedPct = Math.round(((totalGb - freeGb) / totalGb) * 1000) / 10;
              }
            } else if (totalGb != null && usedPct != null) {
              usedGb = Math.round(totalGb * (usedPct / 100) * 100) / 100;
              if (freeGb == null) freeGb = Math.round((totalGb - usedGb) * 100) / 100;
            }
            const mediaRaw =
              row.MediaType != null && String(row.MediaType).trim()
                ? String(row.MediaType).trim()
                : null;
            const readIops =
              row.ReadIops != null && Number.isFinite(Number(row.ReadIops))
                ? Number(row.ReadIops)
                : null;
            const writeIops =
              row.WriteIops != null && Number.isFinite(Number(row.WriteIops))
                ? Number(row.WriteIops)
                : null;
            let totalIops =
              row.TotalIops != null && Number.isFinite(Number(row.TotalIops))
                ? Number(row.TotalIops)
                : null;
            if (totalIops == null && (readIops != null || writeIops != null)) {
              totalIops = (readIops ?? 0) + (writeIops ?? 0);
            }
            arr.push({
              driveLetter: String(row.DriveLetter || ""),
              totalGb,
              freeGb,
              usedGb: usedGb ?? undefined,
              usedPct,
              mediaType: mediaRaw,
              readIops: readIops ?? undefined,
              writeIops: writeIops ?? undefined,
              totalIops: totalIops ?? undefined,
            });
            byDev.set(key, arr);
          }
          for (const d of rmm.devices) {
            d.disks = byDev.get(d.deviceId) ?? [];
            let tot = 0;
            let free = 0;
            let used = 0;
            let hasTot = false;
            let hasFree = false;
            let hasUsed = false;
            let maxIops: number | null = null;
            for (const disk of d.disks) {
              if (disk.totalGb != null) {
                tot += disk.totalGb;
                hasTot = true;
              }
              if (disk.freeGb != null) {
                free += disk.freeGb;
                hasFree = true;
              }
              if (disk.usedGb != null) {
                used += disk.usedGb;
                hasUsed = true;
              }
              if (disk.totalIops != null && Number.isFinite(disk.totalIops)) {
                if (maxIops == null || disk.totalIops > maxIops) maxIops = disk.totalIops;
              }
            }
            if (hasTot) d.diskTotalGb = Math.round(tot * 100) / 100;
            if (hasFree) d.diskFreeGb = Math.round(free * 100) / 100;
            if (hasUsed) d.diskUsedGb = Math.round(used * 100) / 100;
            else if (hasTot && hasFree) {
              d.diskUsedGb = Math.round((tot - free) * 100) / 100;
            }
            d.diskIopsMax = maxIops;
            // Derive current offline hours if column missing but offline + lastSeen
            if (
              (d.offlineHoursCurrent == null || !Number.isFinite(d.offlineHoursCurrent)) &&
              d.isOnline === false &&
              d.lastSeenOnline
            ) {
              const ageH =
                (Date.now() - new Date(d.lastSeenOnline).getTime()) / 3600000;
              if (Number.isFinite(ageH) && ageH >= 0) {
                d.offlineHoursCurrent = Math.round(ageH * 100) / 100;
              }
            }
            if (
              (d.offlineHours7d == null || !Number.isFinite(d.offlineHours7d)) &&
              d.onlinePct != null &&
              Number.isFinite(d.onlinePct)
            ) {
              const off = Math.max(0, Math.min(100, 100 - d.onlinePct)) / 100;
              d.offlineHours7d = Math.round(off * 7 * 24 * 100) / 100;
              d.offlineHours30d = Math.round(off * 30 * 24 * 100) / 100;
            }
          }

        }
      } catch {
        /* disks optional */
      }

      // Customer fleet rollup (disks, reboot, patches, alerted devices)
      if (rmm.summary) {
        let diskTotal = 0, diskFree = 0, diskN = 0;
        let rebootSum = 0, rebootN = 0, rebootMax = 0;
        let pInst = 0, pMiss = 0, pPend = 0, pDev = 0;
        let alerted = 0;
        for (const d of rmm.devices) {
          if (d.diskTotalGb != null) {
            diskTotal += d.diskTotalGb;
            diskFree += d.diskFreeGb ?? 0;
            diskN++;
          }
          if (d.daysSinceReboot != null && Number.isFinite(d.daysSinceReboot)) {
            rebootSum += d.daysSinceReboot;
            rebootN++;
            if (d.daysSinceReboot > rebootMax) rebootMax = d.daysSinceReboot;
          }
          if (
            d.patchInstalled != null ||
            d.patchMissing != null ||
            d.patchPending != null
          ) {
            pDev++;
            pInst += d.patchInstalled ?? 0;
            pMiss += d.patchMissing ?? 0;
            pPend += d.patchPending ?? 0;
          }
          if (
            (d.criticalNotifications ?? 0) > 0 ||
            (d.elevatedNotifications ?? 0) > 0
          ) {
            alerted++;
          }
        }
        rmm.summary.diskTotalGb = diskN ? Math.round(diskTotal * 10) / 10 : null;
        rmm.summary.diskFreeGb = diskN ? Math.round(diskFree * 10) / 10 : null;
        rmm.summary.diskUsedGb = diskN
          ? Math.round((diskTotal - diskFree) * 10) / 10
          : null;
        rmm.summary.devicesWithAlerts = alerted;
        rmm.summary.maxDaysSinceReboot = rebootN ? Math.round(rebootMax * 10) / 10 : null;
        rmm.summary.avgDaysSinceReboot = rebootN
          ? Math.round((rebootSum / rebootN) * 10) / 10
          : null;
        rmm.summary.patchInstalled = pDev ? pInst : null;
        rmm.summary.patchMissing = pDev ? pMiss : null;
        rmm.summary.patchPending = pDev ? pPend : null;
        rmm.summary.patchDevicesReporting = pDev || null;
      }
    } catch {
      rmm.devices = [];
    }

    try {
      const alRes = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT TOP 100
  NotificationId, DeviceId, DeviceName, Severity, Title, Message, RaisedAt, IsActive
FROM dbo.vw_Kpi_Rmm_Notifications_Latest WITH (NOLOCK)
WHERE CustomerCode = @code
ORDER BY
  CASE UPPER(ISNULL(Severity,N''))
    WHEN N'CRITICAL' THEN 0 WHEN N'ELEVATED' THEN 1 ELSE 2 END,
  RaisedAt DESC`);
      rmm.alerts = (alRes.recordset ?? []).map(
        (r: {
          NotificationId: string;
          DeviceId: string | null;
          DeviceName: string | null;
          Severity: string | null;
          Title: string | null;
          Message: string | null;
          RaisedAt: Date | string | null;
          IsActive: boolean | number | null;
        }): RmmAlertRow => ({
          notificationId: String(r.NotificationId),
          deviceId: r.DeviceId != null ? String(r.DeviceId) : null,
          deviceName: r.DeviceName != null ? String(r.DeviceName) : null,
          severity: r.Severity != null ? String(r.Severity) : null,
          title: r.Title != null ? String(r.Title) : null,
          message: r.Message != null ? String(r.Message) : null,
          raisedAt: toIso(r.RaisedAt),
          isActive: r.IsActive == null ? null : Boolean(r.IsActive),
        }),
      );
    } catch {
      rmm.alerts = [];
    }

    rmm.enabled =
      rmm.pillarOn ||
      rmm.summary != null ||
      rmm.devices.length > 0 ||
      rmm.mapping.length > 0;
    if (!rmm.enabled) {
      rmm.message =
        "RMM not mapped for this customer yet. Map Pulseway org → CustomerCode, enable PillarPulseway, or run 421 demo seed.";
    } else if (!rmm.summary && rmm.devices.length === 0) {
      rmm.message = "Org map present but no RMM snapshot yet — run Pulseway collect or 421 demo seed.";
    }
  } catch (e) {
    rmm.message = e instanceof Error ? e.message : String(e);
  }

  // Cove leg (soft) — map + devices via CustomerCode OR partner map, then KPIs
  let cove: CovePayload = {
    enabled: false,
    summary: null,
    devices: [],
    mapping: [],
    unmapped: [],
    message: null,
    recentDays: [],
    recoveryHistory: [],
    alerts: [],
  };
  if (want("cove")) try {
    try {
      const mapRes = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT PartnerName, PartnerId, Active, Notes
FROM dbo.Dim_Cove_PartnerMap WITH (NOLOCK)
WHERE CustomerCode = @code`);
      cove.mapping = (mapRes.recordset ?? []).map((r: any) => ({
        partnerName: String(r.PartnerName ?? ""),
        partnerId: r.PartnerId != null ? Number(r.PartnerId) : null,
        active: r.Active == null ? true : Boolean(r.Active),
        notes: r.Notes != null ? String(r.Notes) : null,
      }));
      if (
        cove.mapping.some(
          (m) => m.active && m.partnerName && !/^invalid/i.test(m.partnerName) && !/column name/i.test(m.partnerName),
        )
      ) {
        customer.pillarCove = true;
      }
    } catch {
      cove.mapping = [];
    }

    try {
      const um = await pool.request().query(`
SELECT TOP 40 PartnerName, PartnerId, DeviceCount, LastSnapshotDate
FROM dbo.vw_Cove_UnmappedPartners WITH (NOLOCK)
ORDER BY DeviceCount DESC`);
      cove.unmapped = (um.recordset ?? []).map((r: any) => ({
        partnerName: String(r.PartnerName ?? r.Product ?? ""),
        partnerId: r.PartnerId != null ? Number(r.PartnerId) : null,
        deviceCount: Number(r.DeviceCount) || 0,
        lastSnapshotDate: r.LastSnapshotDate != null ? String(r.LastSnapshotDate) : null,
        lastImportAt: r.LastImportAt != null ? String(r.LastImportAt) : null,
      }));
    } catch {
      cove.unmapped = [];
    }

    // COVE-RETENTION-MAP-20260812 — retention + recovery columns on devices
    // Devices: CustomerCode stamped OR Product/PartnerId matches partner map
    // (collect stores partner name in Product; CustomerCode can lag if map missed)
    let coveRows: any[] = [];
    try {
      const q1 = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT TOP 500
  d.AccountId,
  d.DeviceName,
  d.MachineName,
  d.Product AS PartnerName,
  d.PartnerId,
  d.LastBackupStatus,
  d.LastSuccessTime,
  d.UsedBytes,
  d.SnapshotDate,
  d.ImportedAt,
  d.CustomerCode,
  d.RecoveryPlanType,
  d.RecoveryPlanLabel,
  d.RecoveryVerification,
  d.RecoveryTestStatus,
  d.Physicality,
  d.LastRecoveryTestAt,
  d.RetentionPolicy,
  d.ProfileName,
  d.RetentionFiles,
  d.RetentionSystemState,
  d.RetentionHyperV,
  d.RetentionSql,
  d.RetentionVmware,
  d.RetentionNetwork,
  d.SelectedBytes
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
WHERE (
    d.CustomerCode = @code
    OR EXISTS (
      SELECT 1
      FROM dbo.Dim_Cove_PartnerMap AS m WITH (NOLOCK)
      WHERE m.CustomerCode = @code
        AND ISNULL(m.Active, 1) = 1
        AND (
          (NULLIF(LTRIM(RTRIM(m.PartnerName)), N'') IS NOT NULL
            AND LTRIM(RTRIM(m.PartnerName)) = LTRIM(RTRIM(ISNULL(d.Product, N''))))
          OR (m.PartnerId IS NOT NULL AND d.PartnerId IS NOT NULL AND m.PartnerId = d.PartnerId)
        )
    )
  )
  AND d.SnapshotDate = (
    SELECT MAX(d2.SnapshotDate)
    FROM dbo.Cove_DeviceStatistics AS d2 WITH (NOLOCK)
    WHERE (
      d2.CustomerCode = @code
      OR EXISTS (
        SELECT 1
        FROM dbo.Dim_Cove_PartnerMap AS m2 WITH (NOLOCK)
        WHERE m2.CustomerCode = @code
          AND ISNULL(m2.Active, 1) = 1
          AND (
            (NULLIF(LTRIM(RTRIM(m2.PartnerName)), N'') IS NOT NULL
              AND LTRIM(RTRIM(m2.PartnerName)) = LTRIM(RTRIM(ISNULL(d2.Product, N''))))
            OR (m2.PartnerId IS NOT NULL AND d2.PartnerId IS NOT NULL AND m2.PartnerId = d2.PartnerId)
          )
      )
    )
  )
ORDER BY d.DeviceName`);
      coveRows = q1.recordset ?? [];
    } catch (e1) {
      console.warn(
        "[rpm-assure] Cove devices (full):",
        e1 instanceof Error ? e1.message : e1,
      );
      // Fallback: recovery cols without retention (if 438 not applied)
      try {
        const q1b = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(`
SELECT TOP 500
  d.AccountId, d.DeviceName, d.MachineName, d.Product AS PartnerName, d.PartnerId,
  d.LastBackupStatus, d.LastSuccessTime, d.UsedBytes, d.SnapshotDate, d.ImportedAt, d.CustomerCode,
  d.RecoveryPlanType, d.RecoveryPlanLabel, d.RecoveryVerification, d.RecoveryTestStatus,
  d.Physicality, d.LastRecoveryTestAt
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
WHERE (
    d.CustomerCode = @code
    OR EXISTS (
      SELECT 1 FROM dbo.Dim_Cove_PartnerMap AS m WITH (NOLOCK)
      WHERE m.CustomerCode = @code AND ISNULL(m.Active, 1) = 1
        AND (
          LTRIM(RTRIM(m.PartnerName)) = LTRIM(RTRIM(ISNULL(d.Product, N'')))
          OR (m.PartnerId IS NOT NULL AND d.PartnerId IS NOT NULL AND m.PartnerId = d.PartnerId)
        )
    )
  )
  AND d.SnapshotDate = (
    SELECT MAX(d2.SnapshotDate)
    FROM dbo.Cove_DeviceStatistics AS d2 WITH (NOLOCK)
    WHERE (
      d2.CustomerCode = @code
      OR EXISTS (
        SELECT 1 FROM dbo.Dim_Cove_PartnerMap AS m2 WITH (NOLOCK)
        WHERE m2.CustomerCode = @code AND ISNULL(m2.Active, 1) = 1
          AND (
            LTRIM(RTRIM(m2.PartnerName)) = LTRIM(RTRIM(ISNULL(d2.Product, N'')))
            OR (m2.PartnerId IS NOT NULL AND d2.PartnerId IS NOT NULL AND m2.PartnerId = d2.PartnerId)
          )
      )
    )
  )
ORDER BY d.DeviceName`);
        coveRows = q1b.recordset ?? [];
      } catch (e2) {
        console.warn(
          "[rpm-assure] Cove devices fallback (recovery only):",
          e2 instanceof Error ? e2.message : e2,
        );
        try {
          const q1c = await pool
            .request()
            .input("code", sql.NVarChar(50), code)
            .query(`
SELECT TOP 500
  d.AccountId, d.DeviceName, d.MachineName, d.Product AS PartnerName, d.PartnerId,
  d.LastBackupStatus, d.LastSuccessTime, d.UsedBytes, d.SnapshotDate, d.ImportedAt, d.CustomerCode
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
WHERE (
    d.CustomerCode = @code
    OR EXISTS (
      SELECT 1 FROM dbo.Dim_Cove_PartnerMap AS m WITH (NOLOCK)
      WHERE m.CustomerCode = @code AND ISNULL(m.Active, 1) = 1
        AND (
          LTRIM(RTRIM(m.PartnerName)) = LTRIM(RTRIM(ISNULL(d.Product, N'')))
          OR (m.PartnerId IS NOT NULL AND d.PartnerId IS NOT NULL AND m.PartnerId = d.PartnerId)
        )
    )
  )
  AND d.SnapshotDate = (
    SELECT MAX(d2.SnapshotDate)
    FROM dbo.Cove_DeviceStatistics AS d2 WITH (NOLOCK)
    WHERE d2.CustomerCode = @code OR d2.CustomerCode IS NOT NULL
  )
ORDER BY d.DeviceName`);
          coveRows = q1c.recordset ?? [];
        } catch (e3) {
          console.warn(
            "[rpm-assure] Cove devices bare fallback:",
            e3 instanceof Error ? e3.message : e3,
          );
          coveRows = [];
        }
      }
    }

    // Last-resort: global latest snap filtered by partner map in app
    if (!coveRows.length && cove.mapping.length) {
      try {
        const q2 = await pool.request().query(`
SELECT TOP 800
  AccountId, DeviceName, MachineName, Product AS PartnerName, Product, PartnerId,
  LastBackupStatus, LastSuccessTime, UsedBytes, SnapshotDate, ImportedAt, CustomerCode,
  RecoveryPlanType, RecoveryPlanLabel, RecoveryVerification, RecoveryTestStatus, Physicality,
  LastRecoveryTestAt,
  RetentionPolicy, ProfileName, RetentionFiles, RetentionSystemState, RetentionHyperV,
  RetentionSql, RetentionVmware, RetentionNetwork, SelectedBytes
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))`);
        const all = q2.recordset ?? [];
        const names = new Set(
          cove.mapping.map((m) => m.partnerName.toLowerCase().trim()).filter(Boolean),
        );
        const ids = new Set(
          cove.mapping.map((m) => m.partnerId).filter((x) => x != null) as number[],
        );
        coveRows = all.filter((r: any) => {
          const pn = String(r.PartnerName ?? r.Product ?? "")
            .toLowerCase()
            .trim();
          const pid = r.PartnerId != null ? Number(r.PartnerId) : null;
          return (pn && names.has(pn)) || (pid != null && ids.has(pid));
        });
      } catch {
        /* optional */
      }
    }

    cove.devices = coveRows.map((r: any) => ({
      accountId: r.AccountId != null ? String(r.AccountId) : null,
      deviceName: r.DeviceName != null ? String(r.DeviceName) : null,
      machineName: r.MachineName != null ? String(r.MachineName) : null,
      partnerName:
        r.PartnerName != null
          ? String(r.PartnerName)
          : r.Product != null
            ? String(r.Product)
            : null,
      partnerId: r.PartnerId != null ? Number(r.PartnerId) : null,
      lastBackupStatus:
        r.LastBackupStatus != null ? String(r.LastBackupStatus) : null,
      lastSuccessTime: toIso(r.LastSuccessTime),
      usedBytes: r.UsedBytes != null ? Number(r.UsedBytes) : r.SelectedBytes != null ? Number(r.SelectedBytes) : null,
      snapshotDate: toDateOnly(r.SnapshotDate),
      importedAt: toIso(r.ImportedAt),
      recoveryPlanType:
        r.RecoveryPlanType != null ? Number(r.RecoveryPlanType) : null,
      recoveryPlanLabel:
        r.RecoveryPlanLabel != null ? String(r.RecoveryPlanLabel) : null,
      recoveryVerification:
        r.RecoveryVerification != null ? String(r.RecoveryVerification) : null,
      recoveryTestStatus:
        r.RecoveryTestStatus != null ? String(r.RecoveryTestStatus) : null,
      physicality: r.Physicality != null ? String(r.Physicality) : null,
      lastRecoveryTestAt: toIso(r.LastRecoveryTestAt ?? null),
      retentionPolicy:
        r.RetentionPolicy != null ? String(r.RetentionPolicy) : null,
      profileName: r.ProfileName != null ? String(r.ProfileName) : null,
      retentionFiles:
        r.RetentionFiles != null ? String(r.RetentionFiles) : null,
      retentionSystemState:
        r.RetentionSystemState != null ? String(r.RetentionSystemState) : null,
      retentionHyperV:
        r.RetentionHyperV != null ? String(r.RetentionHyperV) : null,
      retentionSql: r.RetentionSql != null ? String(r.RetentionSql) : null,
      retentionVmware:
        r.RetentionVmware != null ? String(r.RetentionVmware) : null,
      retentionNetwork:
        r.RetentionNetwork != null ? String(r.RetentionNetwork) : null,
      selectedBytes:
        r.SelectedBytes != null ? Number(r.SelectedBytes) : null,
    }));

    // Summary: real view columns (LastImportAt, not ImportedAt; no HealthRag)
    try {
      const sum = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT TOP 1
  DeviceCount, FailedCount, StaleCount, OkCount,
  LastImportAt, AsOfDate, LastSuccessAny
FROM dbo.vw_Kpi_Cove_Summary WITH (NOLOCK)
WHERE CustomerCode = @code
ORDER BY AsOfDate DESC`);
      const s = sum.recordset?.[0];
      if (s && (Number(s.DeviceCount) || 0) > 0) {
        const failed = Number(s.FailedCount) || 0;
        const stale = Number(s.StaleCount) || 0;
        cove.summary = {
          deviceCount: Number(s.DeviceCount) || 0,
          failedCount: failed,
          staleCount: stale,
          okCount: Number(s.OkCount) || 0,
          lastImportAt: toIso(s.LastImportAt ?? s.ImportedAt),
          lastSuccessAny: toIso(s.LastSuccessAny ?? null),
          asOfDate: toDateOnly(s.AsOfDate),
          healthRag: failed > 0 ? "Red" : stale > 0 ? "Amber" : "Green",
          healthSummary: `${failed} failed · ${stale} stale · ${Number(s.OkCount) || 0} OK of ${Number(s.DeviceCount) || 0}`,
        };
      }
    } catch (e) {
      console.warn(
        "[rpm-assure] Cove summary view:",
        e instanceof Error ? e.message : e,
      );
    }
    // Re-classify latest devices with age rules (status text alone is often blank)
    if (cove.devices.length) {
      let ok = 0,
        stale = 0,
        failed = 0;
      for (const d of cove.devices) {
        const c = classifyCoveBackupStatus(
          d.lastBackupStatus,
          d.lastSuccessTime,
          d.snapshotDate || d.importedAt,
        );
        if (c === "failed") failed++;
        else if (c === "stale") stale++;
        else ok++;
      }
      // Prefer view summary device counts but overlay age classification when view is thin
      if (!cove.summary) {
        cove.summary = {
          deviceCount: cove.devices.length,
          okCount: ok,
          staleCount: stale,
          failedCount: failed,
          lastImportAt: cove.devices[0]?.importedAt ?? null,
          asOfDate: cove.devices[0]?.snapshotDate ?? null,
          healthRag: failed > 0 ? "Red" : stale > 0 ? "Amber" : "Green",
          healthSummary: `${failed} failed · ${stale} stale · ${ok} OK of ${cove.devices.length}`,
        };
      } else {
        // If view reported all OK but age says otherwise, prefer age rollup
        const viewOk = (cove.summary.okCount ?? 0) >= (cove.summary.deviceCount ?? 0);
        if (viewOk && (failed > 0 || stale > 0)) {
          cove.summary = {
            ...cove.summary,
            okCount: ok,
            staleCount: stale,
            failedCount: failed,
            healthRag: failed > 0 ? "Red" : stale > 0 ? "Amber" : "Green",
            healthSummary: `${failed} failed · ${stale} stale · ${ok} OK of ${cove.devices.length} (age-aware)`,
          };
        }
      }
    }

    // Recovery testing rollup
    let recovery: CovePayload["recovery"] = null;
    try {
      const rec = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT TOP 1 DeviceCount, RecoveryTestingCount, StandbyImageCount, NoPlanCount,
  TestSuccessCount, TestFailedCount, TestUnknownCount, ImportedAt, AsOfDate, LastRecoveryTestAt
FROM dbo.vw_Kpi_Cove_Recovery_Latest WITH (NOLOCK)
WHERE CustomerCode = @code
ORDER BY AsOfDate DESC`);
      const r0 = rec.recordset?.[0];
      if (r0) {
        recovery = {
          deviceCount: Number(r0.DeviceCount) || 0,
          recoveryTestingCount: Number(r0.RecoveryTestingCount) || 0,
          standbyImageCount: Number(r0.StandbyImageCount) || 0,
          noPlanCount: Number(r0.NoPlanCount) || 0,
          testSuccessCount: Number(r0.TestSuccessCount) || 0,
          testFailedCount: Number(r0.TestFailedCount) || 0,
          testUnknownCount: Number(r0.TestUnknownCount) || 0,
          lastImportAt: toIso(r0.ImportedAt),
          asOfDate: toDateOnly(r0.AsOfDate),
          lastRecoveryTestAt: toIso(r0.LastRecoveryTestAt ?? null),
        };
      }
    } catch {
      /* view may not exist until 436 */
    }
    if (!recovery && cove.devices.length) {
      let rt = 0,
        si = 0,
        none = 0,
        okT = 0,
        failT = 0,
        unkT = 0;
      let lastTest: string | null = null;
      for (const d of cove.devices) {
        const pt = d.recoveryPlanType ?? 0;
        if (pt === 1) rt++;
        else if (pt === 2) si++;
        else none++;
        const st = (d.recoveryTestStatus || "").toLowerCase();
        if (st === "success") okT++;
        else if (st === "failed") failT++;
        else if (pt === 1 || pt === 2) unkT++;
        if (d.lastRecoveryTestAt && (!lastTest || d.lastRecoveryTestAt > lastTest)) {
          lastTest = d.lastRecoveryTestAt;
        }
      }
      recovery = {
        deviceCount: cove.devices.length,
        recoveryTestingCount: rt,
        standbyImageCount: si,
        noPlanCount: none,
        testSuccessCount: okT,
        testFailedCount: failT,
        testUnknownCount: unkT,
        lastImportAt: cove.devices[0]?.importedAt ?? null,
        asOfDate: cove.devices[0]?.snapshotDate ?? null,
        lastRecoveryTestAt: lastTest,
      };
    }
    cove.recovery = recovery;
    if (cove.summary) cove.summary.recovery = recovery;

    // 7-day history via CustomerCode OR partner map
    try {
      const hist = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT
  d.SnapshotDate,
  COUNT(*) AS DeviceCount,
  SUM(CASE
    WHEN UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%FAIL%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%ERROR%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%OVERDUE%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%ABORT%'
      OR d.LastSuccessTime IS NULL
      OR d.LastSuccessTime < DATEADD(hour, -72, CAST(d.SnapshotDate AS datetime2)) THEN 1
    ELSE 0 END) AS FailedCount,
  SUM(CASE
    WHEN (
      UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%STALE%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%WARN%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%MISS%'
      OR (
        d.LastSuccessTime IS NOT NULL
        AND d.LastSuccessTime < DATEADD(hour, -36, CAST(d.SnapshotDate AS datetime2))
        AND d.LastSuccessTime >= DATEADD(hour, -72, CAST(d.SnapshotDate AS datetime2))
      )
    )
    AND NOT (
      UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%FAIL%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%ERROR%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%OVERDUE%'
      OR d.LastSuccessTime IS NULL
      OR d.LastSuccessTime < DATEADD(hour, -72, CAST(d.SnapshotDate AS datetime2))
    ) THEN 1
    ELSE 0 END) AS StaleCount,
  SUM(CASE
    WHEN UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%FAIL%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%ERROR%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%OVERDUE%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%ABORT%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%STALE%'
      OR UPPER(ISNULL(d.LastBackupStatus, N'')) LIKE N'%WARN%'
      OR d.LastSuccessTime IS NULL
      OR d.LastSuccessTime < DATEADD(hour, -36, CAST(d.SnapshotDate AS datetime2)) THEN 0
    ELSE 1 END) AS OkCount,
  SUM(CASE WHEN ISNULL(d.RecoveryPlanType, 0) = 1 THEN 1 ELSE 0 END) AS RecoveryTestingCount,
  SUM(CASE WHEN ISNULL(d.RecoveryPlanType, 0) = 2 THEN 1 ELSE 0 END) AS StandbyImageCount,
  SUM(CASE WHEN d.RecoveryTestStatus = N'Success' THEN 1 ELSE 0 END) AS TestSuccessCount,
  SUM(CASE WHEN d.RecoveryTestStatus = N'Failed' THEN 1 ELSE 0 END) AS TestFailedCount,
  MAX(d.LastSuccessTime) AS LastSuccessAny,
  MAX(d.LastRecoveryTestAt) AS LastRecoveryTestAt
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
WHERE d.SnapshotDate >= DATEADD(day, -6, CAST(SYSUTCDATETIME() AS date))
  AND (
    d.CustomerCode = @code
    OR EXISTS (
      SELECT 1 FROM dbo.Dim_Cove_PartnerMap AS m WITH (NOLOCK)
      WHERE m.CustomerCode = @code AND ISNULL(m.Active, 1) = 1
        AND (
          LTRIM(RTRIM(m.PartnerName)) = LTRIM(RTRIM(ISNULL(d.Product, N'')))
          OR (m.PartnerId IS NOT NULL AND d.PartnerId IS NOT NULL AND m.PartnerId = d.PartnerId)
        )
    )
  )
GROUP BY d.SnapshotDate
ORDER BY d.SnapshotDate DESC`);
      cove.recentDays = (hist.recordset ?? [])
        .map((r: any) => ({
          snapshotDate: toDateOnly(r.SnapshotDate) ?? String(r.SnapshotDate ?? ""),
          deviceCount: Number(r.DeviceCount) || 0,
          okCount: Number(r.OkCount) || 0,
          staleCount: Number(r.StaleCount) || 0,
          failedCount: Number(r.FailedCount) || 0,
          recoveryTestingCount: Number(r.RecoveryTestingCount) || 0,
          standbyImageCount: Number(r.StandbyImageCount) || 0,
          testSuccessCount: Number(r.TestSuccessCount) || 0,
          testFailedCount: Number(r.TestFailedCount) || 0,
          lastSuccessAny: toIso(r.LastSuccessAny),
          lastRecoveryTestAt: toIso(r.LastRecoveryTestAt ?? null),
        }))
        .filter((d: { snapshotDate: string }) => Boolean(d.snapshotDate));
    } catch (e) {
      console.warn(
        "[rpm-assure] Cove 7-day history:",
        e instanceof Error ? e.message : e,
      );
      cove.recentDays = [];
    }

    try {
      const rh = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT TOP 800
  d.AccountId, d.DeviceName, d.MachineName, d.Product AS PartnerName, d.PartnerId,
  d.LastBackupStatus, d.LastSuccessTime, d.UsedBytes, d.SnapshotDate, d.ImportedAt, d.CustomerCode,
  d.RecoveryPlanType, d.RecoveryPlanLabel, d.RecoveryVerification, d.RecoveryTestStatus, d.Physicality,
  d.LastRecoveryTestAt
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
WHERE d.SnapshotDate >= DATEADD(day, -6, CAST(SYSUTCDATETIME() AS date))
  AND (
    d.CustomerCode = @code
    OR EXISTS (
      SELECT 1 FROM dbo.Dim_Cove_PartnerMap AS m WITH (NOLOCK)
      WHERE m.CustomerCode = @code AND ISNULL(m.Active, 1) = 1
        AND (
          LTRIM(RTRIM(m.PartnerName)) = LTRIM(RTRIM(ISNULL(d.Product, N'')))
          OR (m.PartnerId IS NOT NULL AND d.PartnerId IS NOT NULL AND m.PartnerId = d.PartnerId)
        )
    )
  )
  AND (
    ISNULL(d.RecoveryPlanType, 0) > 0
    OR d.LastRecoveryTestAt IS NOT NULL
    OR d.RecoveryTestStatus IN (N'Success', N'Failed', N'InProgress', N'NotStarted', N'Unknown')
  )
  AND ISNULL(d.RecoveryTestStatus, N'') <> N'NotInPlan' 
ORDER BY d.SnapshotDate DESC, d.DeviceName, d.AccountId`);
      cove.recoveryHistory = (rh.recordset ?? []).map((r: any) => ({
        accountId: r.AccountId != null ? String(r.AccountId) : null,
        deviceName: r.DeviceName != null ? String(r.DeviceName) : null,
        machineName: r.MachineName != null ? String(r.MachineName) : null,
        partnerName: r.PartnerName != null ? String(r.PartnerName) : null,
        partnerId: r.PartnerId != null ? Number(r.PartnerId) : null,
        lastBackupStatus:
          r.LastBackupStatus != null ? String(r.LastBackupStatus) : null,
        lastSuccessTime: toIso(r.LastSuccessTime),
        usedBytes: r.UsedBytes != null ? Number(r.UsedBytes) : r.SelectedBytes != null ? Number(r.SelectedBytes) : null,
        snapshotDate: toDateOnly(r.SnapshotDate),
        importedAt: toIso(r.ImportedAt),
        recoveryPlanType:
          r.RecoveryPlanType != null ? Number(r.RecoveryPlanType) : null,
        recoveryPlanLabel:
          r.RecoveryPlanLabel != null ? String(r.RecoveryPlanLabel) : null,
        recoveryVerification:
          r.RecoveryVerification != null ? String(r.RecoveryVerification) : null,
        recoveryTestStatus:
          r.RecoveryTestStatus != null ? String(r.RecoveryTestStatus) : null,
        physicality: r.Physicality != null ? String(r.Physicality) : null,
        lastRecoveryTestAt: toIso(r.LastRecoveryTestAt ?? null),
      }));
    } catch (e) {
      console.warn(
        "[rpm-assure] Cove recovery history:",
        e instanceof Error ? e.message : e,
      );
      cove.recoveryHistory = [];
    }

    // Stale / fail alerts for hub banner
    {
      const alerts: Array<{ severity: "red" | "amber"; title: string; detail: string }> = [];
      const s = cove.summary;
      if (s) {
        if ((s.failedCount ?? 0) > 0) {
          alerts.push({
            severity: "red",
            title: `${s.failedCount} backup failure(s)`,
            detail: "One or more devices failed, overdue, or have no successful backup in 72h. Open Devices.",
          });
        }
        if ((s.staleCount ?? 0) > 0) {
          alerts.push({
            severity: "amber",
            title: `${s.staleCount} stale backup(s)`,
            detail: "Last success is older than 36h (or Cove marked stale/warn). Check RPO and agent connectivity.",
          });
        }
      }
      const rec = cove.recovery;
      if (rec && (rec.testFailedCount ?? 0) > 0) {
        alerts.push({
          severity: "red",
          title: `${rec.testFailedCount} recovery test failure(s)`,
          detail: "VDR / Recovery Testing verification failed. Open Recovery testing.",
        });
      }
      // Trend: rising fails day-over-day
      if ((cove.recentDays?.length ?? 0) >= 2) {
        const a = cove.recentDays![0];
        const b = cove.recentDays![1];
        if (a.failedCount > b.failedCount) {
          alerts.push({
            severity: "amber",
            title: "Failed backups up vs previous collect day",
            detail: `${b.failedCount} → ${a.failedCount} failed devices in the last two snapshot days.`,
          });
        }
      }
      cove.alerts = alerts;
    }

    try {
      const cfg = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(
          `SELECT CAST(ISNULL(PillarCove,0) AS bit) AS PillarCove FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode=@code`,
        );
      if (cfg.recordset?.[0]?.PillarCove) customer.pillarCove = true;
    } catch {
      /* optional */
    }
  } catch (e) {
    cove.message = e instanceof Error ? e.message : String(e);
  }


  // EPP leg (Bitdefender GravityZone) — soft
  let epp: EppPayload = {
    enabled: false,
    summary: null,
    devices: [],
    message: null,
    license: null,
    incidents: [],
    quarantine: [],
    feedStatus: null,
  };
  if (want("epp")) try {
    // PolicyName is optional (added by 450); select only columns that exist
    let hasPolicyName = false;
    try {
      const col = await pool.request().query(
        `SELECT CASE WHEN COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'PolicyName') IS NOT NULL THEN 1 ELSE 0 END AS ok`,
      );
      hasPolicyName = Number(col.recordset?.[0]?.ok) === 1;
    } catch {
      hasPolicyName = false;
    }
    const epSql = hasPolicyName
      ? `
SELECT EndpointId, DeviceName, Fqdn, IpAddress, IsManaged, MachineType, OperatingSystem,
       PolicyName, SnapshotDate
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
    WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
  )
ORDER BY DeviceName`
      : `
SELECT EndpointId, DeviceName, Fqdn, IpAddress, IsManaged, MachineType, OperatingSystem,
       CAST(NULL AS nvarchar(200)) AS PolicyName, SnapshotDate
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
    WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
  )
ORDER BY DeviceName`;
    const epRes = await pool
      .request()
      .input("code", sql.NVarChar(50), code)
      .query(epSql);
    epp.devices = (epRes.recordset ?? []).map((r: any) => ({
      endpointId: String(r.EndpointId ?? ""),
      deviceName: r.DeviceName != null ? String(r.DeviceName) : null,
      fqdn: r.Fqdn != null ? String(r.Fqdn) : null,
      ipAddress: r.IpAddress != null ? String(r.IpAddress) : null,
      isManaged: r.IsManaged == null ? null : Boolean(r.IsManaged),
      machineType: r.MachineType != null ? Number(r.MachineType) : null,
      operatingSystem: r.OperatingSystem != null ? String(r.OperatingSystem) : null,
      policyName: r.PolicyName != null ? String(r.PolicyName) : null,
      snapshotDate: toDateOnly(r.SnapshotDate),
    }));
    // Collapse GZ clean-name + name-MAC duplicates (all customers)
    epp.devices = dedupeEppDevices(epp.devices);
    try {
      const sum = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(`
SELECT TOP 1 DeviceCount, ManagedCount, UnmanagedCount, WorkstationCount, ServerCount,
       LastImportAt, AsOfDate
FROM dbo.vw_Kpi_Epp_Summary WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
ORDER BY AsOfDate DESC`);
      const s = sum.recordset?.[0];
      if (s) {
        epp.summary = {
          deviceCount: Number(s.DeviceCount) || 0,
          managedCount: Number(s.ManagedCount) || 0,
          unmanagedCount: Number(s.UnmanagedCount) || 0,
          workstationCount: Number(s.WorkstationCount) || 0,
          serverCount: Number(s.ServerCount) || 0,
          lastImportAt: toIso(s.LastImportAt ?? null),
          asOfDate: toDateOnly(s.AsOfDate),
        };
      }
    } catch {
      /* view optional — derive from devices */
    }
    if (!epp.summary && epp.devices.length) {
      const managed = epp.devices.filter((d) => d.isManaged).length;
      epp.summary = {
        deviceCount: epp.devices.length,
        managedCount: managed,
        unmanagedCount: epp.devices.length - managed,
        workstationCount: epp.devices.filter((d) => d.machineType === 5).length,
        serverCount: epp.devices.filter((d) => d.machineType === 6).length,
        lastImportAt: null,
        asOfDate: epp.devices[0]?.snapshotDate ?? null,
      };
    }
    // Always align summary counts to de-duplicated device list when present
    if (epp.devices.length) {
      const priorImport = epp.summary?.lastImportAt ?? null;
      epp.summary = eppSummaryFromDevices(epp.devices, priorImport);
    }
    // If still empty, try all rows for this code (any snap) then keep latest date only
    if (epp.devices.length === 0) {
      try {
        const fallback = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(`
SELECT EndpointId, DeviceName, Fqdn, IpAddress, IsManaged, MachineType, OperatingSystem,
       ${hasPolicyName ? "PolicyName" : "CAST(NULL AS nvarchar(200)) AS PolicyName"}, SnapshotDate
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
ORDER BY SnapshotDate DESC, DeviceName`);
        epp.devices = (fallback.recordset ?? []).map((r: any) => ({
          endpointId: String(r.EndpointId ?? ""),
          deviceName: r.DeviceName != null ? String(r.DeviceName) : null,
          fqdn: r.Fqdn != null ? String(r.Fqdn) : null,
          ipAddress: r.IpAddress != null ? String(r.IpAddress) : null,
          isManaged: r.IsManaged == null ? null : Boolean(r.IsManaged),
          machineType: r.MachineType != null ? Number(r.MachineType) : null,
          operatingSystem:
            r.OperatingSystem != null ? String(r.OperatingSystem) : null,
          policyName: r.PolicyName != null ? String(r.PolicyName) : null,
          snapshotDate: toDateOnly(r.SnapshotDate),
        }));
        // Keep only the latest snapshot date rows
        if (epp.devices.length) {
          const mx = epp.devices[0]?.snapshotDate;
          epp.devices = epp.devices.filter((d) => d.snapshotDate === mx);
          epp.devices = dedupeEppDevices(epp.devices);
          epp.summary = eppSummaryFromDevices(epp.devices, null);
        }
      } catch {
        /* keep empty */
      }
    }
    // Prefer portfolio enrich count if detail query somehow empty but count known
    const enrichCount = Number(customer.eppDeviceCount) || 0;
    epp.enabled =
      epp.devices.length > 0 ||
      (epp.summary?.deviceCount ?? 0) > 0 ||
      enrichCount > 0;
    if (!epp.enabled) {
      epp.message =
        "No Bitdefender endpoints mapped to this customer yet. Run Collect-Bitdefender-To-RPMAssure.ps1 and add Dim_Bitdefender_NameMap patterns.";
    } else if (epp.devices.length === 0 && enrichCount > 0) {
      epp.summary = epp.summary ?? {
        deviceCount: enrichCount,
        managedCount: Number(customer.eppManagedCount) || 0,
        unmanagedCount: 0,
        workstationCount: 0,
        serverCount: 0,
        lastImportAt: customer.eppLastImportAt ?? null,
        asOfDate: null,
      };
      epp.message = null;
    }
    try {
      const lic = await pool.request().query(`
SELECT TOP 1 UsedSlots, TotalSlots, EndSubscription
FROM dbo.Bitdefender_LicenseSnapshot WITH (NOLOCK)
ORDER BY SnapshotDate DESC`);
      const lr = lic.recordset?.[0];
      if (lr) {
        epp.license = {
          usedSlots: lr.UsedSlots != null ? Number(lr.UsedSlots) : null,
          totalSlots: lr.TotalSlots != null ? Number(lr.TotalSlots) : null,
          endSubscription:
            lr.EndSubscription != null
              ? String(lr.EndSubscription).slice(0, 10)
              : null,
        };
      }
    } catch {
      /* optional */
    }

    // EPP-FEEDS-20260812b — Incidents / Quarantine (resilient columns + endpoint match)
    epp.incidents = [];
    epp.quarantine = [];
    epp.feedStatus = {
      incidentsOk: null,
      incidentsMessage: null,
      quarantineOk: null,
      quarantineMessage: null,
      incidentsCount: null,
      quarantineCount: null,
    };
    try {
      const st = await pool.request().query(`
SELECT TOP 1 IncidentsOk, IncidentsCount, QuarantineOk, QuarantineCount,
       IncidentsMessage, QuarantineMessage, SnapshotDate
FROM dbo.Bitdefender_CollectStatus WITH (NOLOCK)
ORDER BY SnapshotDate DESC`);
      const s0 = st.recordset?.[0];
      if (s0) {
        epp.feedStatus = {
          incidentsOk:
            s0.IncidentsOk == null ? null : Boolean(Number(s0.IncidentsOk)),
          incidentsMessage:
            s0.IncidentsMessage != null ? String(s0.IncidentsMessage) : null,
          quarantineOk:
            s0.QuarantineOk == null ? null : Boolean(Number(s0.QuarantineOk)),
          quarantineMessage:
            s0.QuarantineMessage != null ? String(s0.QuarantineMessage) : null,
          incidentsCount:
            s0.IncidentsCount != null ? Number(s0.IncidentsCount) : null,
          quarantineCount:
            s0.QuarantineCount != null ? Number(s0.QuarantineCount) : null,
        };
      }
    } catch {
      /* Bitdefender_CollectStatus optional until 452 */
    }

    // Detect optional display columns (older schemas)
    let hasIncDeviceName = true;
    let hasIncEndpointName = false;
    let hasIncSummary = true;
    let hasIncDetectedAt = true;
    let hasIncCreatedOn = false;
    let hasIncType = true;
    try {
      const cols = await pool.request().query(`
SELECT c.name
FROM sys.columns c
WHERE c.object_id = OBJECT_ID(N'dbo.Bitdefender_Incidents')`);
      const names = new Set(
        (cols.recordset ?? []).map((r: any) => String(r.name).toLowerCase()),
      );
      hasIncDeviceName = names.has("devicename");
      hasIncEndpointName = names.has("endpointname");
      hasIncSummary = names.has("summary");
      hasIncDetectedAt = names.has("detectedat");
      hasIncCreatedOn = names.has("createdon") || names.has("createdat");
      hasIncType = names.has("incidenttype");
    } catch {
      /* defaults */
    }

    try {
      const deviceExpr = hasIncDeviceName && hasIncEndpointName
        ? "COALESCE(NULLIF(LTRIM(RTRIM(DeviceName)),N''), NULLIF(LTRIM(RTRIM(EndpointName)),N''))"
        : hasIncDeviceName
          ? "DeviceName"
          : hasIncEndpointName
            ? "EndpointName"
            : "CAST(NULL AS nvarchar(200))";
      const summaryExpr = hasIncSummary
        ? "Summary"
        : "CAST(NULL AS nvarchar(500))";
      const typeExpr = hasIncType
        ? "IncidentType"
        : "CAST(NULL AS nvarchar(100))";
      const detectedExpr = hasIncDetectedAt
        ? "DetectedAt"
        : hasIncCreatedOn
          ? "COALESCE(CreatedOn, CreatedAt)"
          : "CAST(NULL AS datetime2(3))";
      const incSql = `
SELECT TOP 500 IncidentId, EndpointId,
       ${deviceExpr} AS DeviceName,
       Severity, Status,
       ${typeExpr} AS IncidentType,
       ${summaryExpr} AS Summary,
       ${detectedExpr} AS DetectedAt
FROM dbo.Bitdefender_Incidents AS i WITH (NOLOCK)
WHERE SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Incidents WITH (NOLOCK)
  )
  AND (
    UPPER(LTRIM(RTRIM(ISNULL(i.CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
    OR (
      i.EndpointId IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
        WHERE e.EndpointId = i.EndpointId
          AND UPPER(LTRIM(RTRIM(ISNULL(e.CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
          AND e.SnapshotDate = (
            SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
            WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
          )
      )
    )
  )
ORDER BY DetectedAt DESC, IncidentId`;
      const inc = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(incSql);
      epp.incidents = (inc.recordset ?? []).map((r: any) => ({
        incidentId: String(r.IncidentId ?? ""),
        endpointId: r.EndpointId != null ? String(r.EndpointId) : null,
        deviceName: r.DeviceName != null ? String(r.DeviceName) : null,
        severity: r.Severity != null ? String(r.Severity) : null,
        status: r.Status != null ? String(r.Status) : null,
        incidentType: r.IncidentType != null ? String(r.IncidentType) : null,
        summary: r.Summary != null ? String(r.Summary) : null,
        detectedAt: toIso(r.DetectedAt ?? null),
      }));
    } catch (eInc) {
      const msg = eInc instanceof Error ? eInc.message : String(eInc);
      console.warn("[rpm-assure] EPP incidents:", msg);
      if (epp.feedStatus) {
        epp.feedStatus.incidentsMessage =
          (epp.feedStatus.incidentsMessage
            ? epp.feedStatus.incidentsMessage + " | "
            : "") +
          "UI query failed: " +
          msg.slice(0, 180);
      }
    }

    try {
      const qnSql = `
SELECT TOP 500 ItemId, EndpointId,
       COALESCE(NULLIF(LTRIM(RTRIM(DeviceName)),N''), N'') AS DeviceName,
       ThreatName, FilePath, Status, QuarantinedAt, CustomerCode
FROM dbo.Bitdefender_Quarantine AS q WITH (NOLOCK)
WHERE SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Quarantine WITH (NOLOCK)
  )
  AND (
    UPPER(LTRIM(RTRIM(ISNULL(q.CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
    OR (
      q.EndpointId IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
        WHERE e.EndpointId = q.EndpointId
          AND UPPER(LTRIM(RTRIM(ISNULL(e.CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
          AND e.SnapshotDate = (
            SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
            WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
          )
      )
    )
  )
ORDER BY QuarantinedAt DESC, ItemId`;
      const qn = await pool
        .request()
        .input("code", sql.NVarChar(50), code)
        .query(qnSql);
      epp.quarantine = (qn.recordset ?? []).map((r: any) => ({
        itemId: String(r.ItemId ?? ""),
        endpointId: r.EndpointId != null ? String(r.EndpointId) : null,
        deviceName: r.DeviceName != null ? String(r.DeviceName) : null,
        threatName: r.ThreatName != null ? String(r.ThreatName) : null,
        filePath: r.FilePath != null ? String(r.FilePath) : null,
        status: r.Status != null ? String(r.Status) : null,
        quarantinedAt: toIso(r.QuarantinedAt ?? null),
      }));
    } catch (eQ) {
      const msg = eQ instanceof Error ? eQ.message : String(eQ);
      console.warn("[rpm-assure] EPP quarantine:", msg);
      if (epp.feedStatus) {
        epp.feedStatus.quarantineMessage =
          (epp.feedStatus.quarantineMessage
            ? epp.feedStatus.quarantineMessage + " | "
            : "") +
          "UI query failed: " +
          msg.slice(0, 180);
      }
    }
  } catch (e) {
    epp.message = e instanceof Error ? e.message : String(e);
    // Keep portfolio enrich if detail query failed (e.g. missing grant)
    if ((customer.eppDeviceCount ?? 0) > 0) {
      epp.enabled = true;
      epp.summary = {
        deviceCount: Number(customer.eppDeviceCount) || 0,
        managedCount: Number(customer.eppManagedCount) || 0,
        unmanagedCount: 0,
        workstationCount: 0,
        serverCount: 0,
        lastImportAt: customer.eppLastImportAt ?? null,
        asOfDate: null,
      };
      epp.message =
        "EPP cover is on from mapped counts, but endpoint detail query failed: " +
        epp.message;
    }
  }


  // Microsoft 365 Tenant (CSP) — soft, lazy leg
  let csp: CspPayload = {
    enabled: false,
    tenant: null,
    summary: null,
    posture: null,
    globalAdmins: [],
    licenses: [],
    users: [],
    message: null,
  };

  if (want("csp")) {
    try {
      // Tenant map
      try {
        const tm = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(`
SELECT TOP 1 TenantId, PrimaryDomain, DisplayName, Country, UpdatedAtUtc
FROM dbo.Dim_Csp_TenantMap WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
  AND Active = 1
ORDER BY UpdatedAtUtc DESC`);
        const tr = tm.recordset?.[0];
        if (tr) {
          csp.tenant = {
            tenantId: tr.TenantId != null ? String(tr.TenantId) : null,
            primaryDomain:
              tr.PrimaryDomain != null ? String(tr.PrimaryDomain) : null,
            displayName: tr.DisplayName != null ? String(tr.DisplayName) : null,
            country: tr.Country != null ? String(tr.Country) : null,
            healthScore: null,
            openIncidents: null,
            lastSyncAt: toIso(tr.UpdatedAtUtc ?? null),
          };
          customer.pillarCsp = true;
        }
      } catch {
        /* map optional */
      }

      try {
        const th = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(`
SELECT TOP 1 HealthScore, OpenIncidents, ServiceNote, SnapshotDate, ImportedAt
FROM dbo.Csp_TenantHealth WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
ORDER BY SnapshotDate DESC`);
        const h = th.recordset?.[0];
        if (h) {
          csp.tenant = {
            tenantId: csp.tenant?.tenantId ?? null,
            primaryDomain: csp.tenant?.primaryDomain ?? null,
            displayName: csp.tenant?.displayName ?? null,
            country: csp.tenant?.country ?? null,
            healthScore: h.HealthScore != null ? Number(h.HealthScore) : null,
            openIncidents:
              h.OpenIncidents != null ? Number(h.OpenIncidents) : null,
            lastSyncAt: toIso(h.ImportedAt ?? null),
          };
        }
      } catch {
        /* health optional */
      }

      try {
        const lic = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(`
SELECT SkuId, SkuPartNumber, ProductName, PrepaidUnits, ConsumedUnits, AvailableUnits, SnapshotDate
FROM dbo.Csp_Licenses WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Csp_Licenses WITH (NOLOCK)
    WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
  )
ORDER BY ProductName`);
        csp.licenses = ((lic.recordset ?? []) as Array<Record<string, unknown>>).map(
          (r) => ({
            skuId: String(r.SkuId ?? ""),
            skuPartNumber:
              r.SkuPartNumber != null ? String(r.SkuPartNumber) : null,
            productName: r.ProductName != null ? String(r.ProductName) : null,
            prepaidUnits: r.PrepaidUnits != null ? Number(r.PrepaidUnits) : null,
            consumedUnits:
              r.ConsumedUnits != null ? Number(r.ConsumedUnits) : null,
            availableUnits:
              r.AvailableUnits != null ? Number(r.AvailableUnits) : null,
            snapshotDate: toDateOnly(r.SnapshotDate as Date | string | null),
          }),
        );
      } catch {
        csp.licenses = [];
      }

      try {
        const usr = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(`
SELECT UserPrincipalName, DisplayName, AccountEnabled, AssignedSkus, Department, JobTitle, SnapshotDate
FROM dbo.Csp_Users WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Csp_Users WITH (NOLOCK)
    WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
  )
ORDER BY DisplayName, UserPrincipalName`);
        csp.users = ((usr.recordset ?? []) as Array<Record<string, unknown>>).map(
          (r) => ({
            userPrincipalName: String(r.UserPrincipalName ?? ""),
            displayName: r.DisplayName != null ? String(r.DisplayName) : null,
            accountEnabled:
              r.AccountEnabled == null ? null : Boolean(r.AccountEnabled),
            assignedSkus:
              r.AssignedSkus != null ? String(r.AssignedSkus) : null,
            department: r.Department != null ? String(r.Department) : null,
            jobTitle: r.JobTitle != null ? String(r.JobTitle) : null,
            snapshotDate: toDateOnly(r.SnapshotDate as Date | string | null),
          }),
        );
      } catch {
        csp.users = [];
      }

      // Posture aggregates (Secure Score, MFA, GA) — view first, then table
      try {
        let p: Record<string, unknown> | undefined;
        try {
          const via = await pool
            .request()
            .input("code", sql.NVarChar(50), code)
            .query(`
SELECT TOP 1 SecureScore, SecureScoreMax, SecureScorePct,
  MfaRegisteredCount, MfaCapableCount, MfaRegisteredPct,
  GlobalAdminCount, GlobalAdminNames, GuestUserCount, DisabledLicensedCount,
  FailedSignInCount7d, Notes, SnapshotDate, ImportedAt
FROM dbo.vw_Kpi_Csp_Posture_Latest WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))`);
          p = (via.recordset?.[0] as Record<string, unknown> | undefined) ?? undefined;
        } catch {
          /* view optional */
        }
        if (!p) {
          const pr = await pool
            .request()
            .input("code", sql.NVarChar(50), code)
            .query(`
SELECT TOP 1 SecureScore, SecureScoreMax, SecureScorePct,
  MfaRegisteredCount, MfaCapableCount, MfaRegisteredPct,
  GlobalAdminCount, GlobalAdminNames, GuestUserCount, DisabledLicensedCount,
  FailedSignInCount7d, Notes, SnapshotDate, ImportedAt
FROM dbo.Csp_Posture WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
ORDER BY SnapshotDate DESC, ImportedAt DESC`);
          p = pr.recordset?.[0] as Record<string, unknown> | undefined;
        }
        if (p) {
          csp.posture = {
            secureScore: p.SecureScore != null ? Number(p.SecureScore) : null,
            secureScoreMax:
              p.SecureScoreMax != null ? Number(p.SecureScoreMax) : null,
            secureScorePct:
              p.SecureScorePct != null ? Number(p.SecureScorePct) : null,
            mfaRegisteredCount:
              p.MfaRegisteredCount != null ? Number(p.MfaRegisteredCount) : null,
            mfaCapableCount:
              p.MfaCapableCount != null ? Number(p.MfaCapableCount) : null,
            mfaRegisteredPct:
              p.MfaRegisteredPct != null ? Number(p.MfaRegisteredPct) : null,
            globalAdminCount:
              p.GlobalAdminCount != null ? Number(p.GlobalAdminCount) : null,
            globalAdminNames:
              p.GlobalAdminNames != null
                ? String(p.GlobalAdminNames)
                : null,
            guestUserCount:
              p.GuestUserCount != null ? Number(p.GuestUserCount) : null,
            disabledLicensedCount:
              p.DisabledLicensedCount != null
                ? Number(p.DisabledLicensedCount)
                : null,
            failedSignInCount7d:
              p.FailedSignInCount7d != null
                ? Number(p.FailedSignInCount7d)
                : null,
            notes: p.Notes != null ? String(p.Notes) : null,
            asOfDate: toDateOnly(p.SnapshotDate as Date | string | null),
          };
          customer.cspSecureScorePct = csp.posture.secureScorePct;
          customer.cspMfaRegisteredPct = csp.posture.mfaRegisteredPct;
          customer.cspGlobalAdminCount = csp.posture.globalAdminCount;
          customer.cspGuestUserCount = csp.posture.guestUserCount;
          customer.cspFailedSignIn7d = csp.posture.failedSignInCount7d;
          if (p.ImportedAt != null) {
            customer.cspLastImportAt = toIso(p.ImportedAt as Date | string | null) ?? customer.cspLastImportAt;
          }
        }
      } catch (e) {
        console.warn(
          "[rpm-assure] Csp_Posture load:",
          e instanceof Error ? e.message : e,
        );
        csp.posture = null;
      }

      // Global Administrator names (latest snapshot)
      try {
        const ga = await pool
          .request()
          .input("code", sql.NVarChar(50), code)
          .query(`
SELECT ObjectId, DisplayName, UserPrincipalName, Mail, PrincipalType
FROM dbo.Csp_GlobalAdmins WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.Csp_GlobalAdmins WITH (NOLOCK)
    WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = UPPER(LTRIM(RTRIM(@code)))
  )
ORDER BY UserPrincipalName, DisplayName`);
        csp.globalAdmins = ((ga.recordset ?? []) as Array<Record<string, unknown>>).map(
          (r) => ({
            objectId: String(r.ObjectId ?? ""),
            displayName: r.DisplayName != null ? String(r.DisplayName) : null,
            userPrincipalName:
              r.UserPrincipalName != null ? String(r.UserPrincipalName) : null,
            mail: r.Mail != null ? String(r.Mail) : null,
            principalType:
              r.PrincipalType != null ? String(r.PrincipalType) : null,
          }),
        );
        if (
          (csp.posture?.globalAdminCount == null ||
            csp.posture.globalAdminCount === 0) &&
          csp.globalAdmins.length > 0
        ) {
          csp.posture = {
            ...(csp.posture ?? {
              secureScore: null,
              secureScoreMax: null,
              secureScorePct: null,
              mfaRegisteredCount: null,
              mfaCapableCount: null,
              mfaRegisteredPct: null,
              globalAdminCount: null,
              globalAdminNames: null,
              guestUserCount: null,
              disabledLicensedCount: null,
              failedSignInCount7d: null,
              notes: null,
              asOfDate: null,
            }),
            globalAdminCount: csp.globalAdmins.length,
            globalAdminNames: csp.globalAdmins
              .map((x) => x.userPrincipalName || x.displayName || x.objectId)
              .join("; "),
          };
          customer.cspGlobalAdminCount = csp.globalAdmins.length;
        }
      } catch {
        csp.globalAdmins = [];
      }

      const totalSeats = csp.licenses.reduce(
        (s, x) => s + (x.prepaidUnits ?? 0),
        0,
      );
      const assignedSeats = csp.licenses.reduce(
        (s, x) => s + (x.consumedUnits ?? 0),
        0,
      );
      const unusedSeats = csp.licenses.reduce(
        (s, x) => s + (x.availableUnits ?? 0),
        0,
      );
      const asOf =
        csp.licenses[0]?.snapshotDate ??
        csp.users[0]?.snapshotDate ??
        null;
      if (csp.licenses.length || csp.users.length || csp.tenant || csp.posture) {
        csp.enabled = true;
        csp.summary = {
          licensedUserCount: csp.users.filter((u) => u.accountEnabled !== false)
            .length,
          totalSeats,
          assignedSeats,
          unusedSeats,
          skuCount: csp.licenses.length,
          lastImportAt:
            customer.cspLastImportAt ??
            csp.tenant?.lastSyncAt ??
            null,
          asOfDate: asOf ?? csp.posture?.asOfDate ?? null,
        };
        customer.cspUserCount = csp.users.length;
        customer.cspLicenseSkuCount = csp.licenses.length;
        customer.cspTotalSeats = totalSeats;
        customer.cspAssignedSeats = assignedSeats;
        customer.cspPrimaryDomain = csp.tenant?.primaryDomain ?? null;
        customer.cspLastImportAt = csp.summary.lastImportAt;
      } else {
        csp.message =
          "No Microsoft 365 Tenant data for this customer yet. Run 460_Ensure_Csp_M365.sql (RPMINT pilot) or Graph collect.";
      }
    } catch (e) {
      csp.message = e instanceof Error ? e.message : String(e);
    }
  } else {
    // shell / other legs: surface portfolio enrich counts only
    if (
      (customer.cspUserCount ?? 0) > 0 ||
      (customer.cspLicenseSkuCount ?? 0) > 0 ||
      customer.cspSecureScorePct != null
    ) {
      csp.enabled = true;
      csp.summary = {
        licensedUserCount: customer.cspUserCount ?? 0,
        totalSeats: customer.cspTotalSeats ?? 0,
        assignedSeats: customer.cspAssignedSeats ?? 0,
        unusedSeats: Math.max(
          0,
          (customer.cspTotalSeats ?? 0) - (customer.cspAssignedSeats ?? 0),
        ),
        skuCount: customer.cspLicenseSkuCount ?? 0,
        lastImportAt: customer.cspLastImportAt ?? null,
        asOfDate: null,
      };
      csp.tenant = customer.cspPrimaryDomain
        ? {
            tenantId: null,
            primaryDomain: customer.cspPrimaryDomain,
            displayName: customer.displayName,
            country: null,
            healthScore: null,
            openIncidents: null,
            lastSyncAt: customer.cspLastImportAt ?? null,
          }
        : null;
      if (
        customer.cspSecureScorePct != null ||
        customer.cspMfaRegisteredPct != null
      ) {
        csp.posture = {
          secureScore: null,
          secureScoreMax: null,
          secureScorePct: customer.cspSecureScorePct ?? null,
          mfaRegisteredCount: null,
          mfaCapableCount: null,
          mfaRegisteredPct: customer.cspMfaRegisteredPct ?? null,
          globalAdminCount: customer.cspGlobalAdminCount ?? null,
          globalAdminNames: null,
          guestUserCount: customer.cspGuestUserCount ?? null,
          disabledLicensedCount: null,
          failedSignInCount7d: customer.cspFailedSignIn7d ?? null,
          notes: null,
          asOfDate: null,
        };
      }
    }
  }

  let cover: CustomerCover = { syspro: false, rmm: false, cove: false };
  try {
  // Explicit AmsConfig flags win. Do not overwrite pillar* with inferred cover.
  // RMM/Cove/EPP: pass pillar only when true (pre-enable); false defaults never hard-block live data.
  const flagRmm =
    customer.pillarPulseway === true || rmm.pillarOn
      ? true
      : null;
  const flagCove = customer.pillarCove === true ? true : null;
  const flagEpp = customer.pillarEpp === true ? true : null;
  const flagCsp = customer.pillarCsp === true ? true : null;

  cover = inferCustomerCover({
    hasAmsConfig,
    pillarSyspro: customer.pillarSyspro,
    pillarPulseway: flagRmm,
    pillarCove: flagCove,
    pillarEpp: flagEpp,
    pillarCsp: flagCsp,
    sqlInstanceName: instanceName ?? customer.sqlInstanceName,
    operatorCount:
      (typeof operators !== "undefined" ? operators.length : 0) ||
      customer.operatorCount,
    activeUserCount: customer.activeUserCount,
    sysproLastImportAt: customer.lastImportAt,
    sysproJobErrorCount:
      (typeof jobErrors !== "undefined" ? jobErrors.length : 0) ||
      customer.sysproJobErrorCount,
    sysproDtrVarianceLines:
      (typeof dtrLevel1 !== "undefined"
        ? dtrLevel1.reduce((s, r) => s + (Number(r.varianceLineCount) || 0), 0)
        : 0) || customer.sysproDtrVarianceLines,
    sysproHasLicense: Boolean(license),
    sysproHasVersion: Boolean(sysproVersion?.productVersion || sysproVersion?.buildNumber),
    sysproHotfixCount: typeof sysproHotfixes !== "undefined" ? sysproHotfixes.length : 0,
    pulsewayOrgName: rmm.pulsewayOrgName ?? customer.pulsewayOrgName,
    pulsewayDeviceCount: rmm.summary?.deviceCount ?? rmm.devices.length,
    pulsewayMapped: rmm.mapping.length > 0,
    coveDeviceCount:
      typeof cove !== "undefined" && cove
        ? cove.summary?.deviceCount ?? cove.devices?.length ?? 0
        : customer.coveDeviceCount ?? 0,
    coveMapped:
      typeof cove !== "undefined" && cove
        ? (cove.mapping?.length ?? 0) > 0 || (cove.devices?.length ?? 0) > 0 || customer.pillarCove === true
        : customer.pillarCove === true,
    covePartnerName:
      typeof cove !== "undefined" && cove?.mapping?.[0]?.partnerName
        ? cove.mapping[0].partnerName
        : null,
    eppDeviceCount:
      typeof epp !== "undefined" && epp
        ? epp.summary?.deviceCount ?? epp.devices?.length ?? customer.eppDeviceCount ?? 0
        : customer.eppDeviceCount ?? 0,
    eppMapped: (Number(customer.eppDeviceCount) || 0) > 0 || (Number(epp.summary?.deviceCount) || 0) > 0,
    cspUserCount: customer.cspUserCount ?? csp?.users?.length ?? 0,
    cspLicenseCount: customer.cspLicenseSkuCount ?? csp?.licenses?.length ?? 0,
    cspMapped: customer.pillarCsp === true || Boolean(csp?.tenant),
  });
  // EPP cover from devices (and explicit AmsConfig.PillarBitdefender)
  const eppCount =
    (typeof epp !== "undefined" && epp
      ? epp.summary?.deviceCount ?? epp.devices?.length ?? 0
      : 0) ||
    Number(customer.eppDeviceCount) ||
    0;
  if (eppCount > 0) {
    cover = { ...cover, epp: true };
    customer.eppDeviceCount = eppCount || customer.eppDeviceCount || 0;
    epp.enabled = true;
    if (eppCount > 0 && epp.message?.toLowerCase().includes("no cover")) {
      epp.message = null;
    }
    if (eppCount > 0 && !epp.message?.includes("failed")) epp.message = null;
  } else {
    cover = { ...cover, epp: false };
    if (!epp.message) {
      epp.message =
        "No cover — Endpoint Protection (Bitdefender) is not in scope for this customer.";
    }
  }
  // Warehouse footprint => SYSPRO Covered — unless explicit PillarSyspro = false (deferred)
  const sysproHardOff = customer.pillarSyspro === false;
  const sysproLoadedEvidence =
    !sysproHardOff &&
    ((typeof operators !== "undefined" && operators.length > 0) ||
      (typeof jobErrors !== "undefined" && jobErrors.length > 0) ||
      (typeof dtrLevel1 !== "undefined" && dtrLevel1.length > 0) ||
      Boolean(license) ||
      Boolean(sysproVersion) ||
      (typeof sysproHotfixes !== "undefined" && sysproHotfixes.length > 0) ||
      (typeof healthLogs !== "undefined" && healthLogs.length > 0) ||
      (typeof taskGroups !== "undefined" && taskGroups.length > 0) ||
      (typeof sqlBackups !== "undefined" && sqlBackups.length > 0) ||
      (typeof operGroups !== "undefined" && operGroups.length > 0) ||
      customer.pillarSyspro === true);

  if (sysproHardOff) {
    cover = { ...cover, syspro: false };
  } else {
    cover = forceSysproCoverIfEvidence(cover, sysproLoadedEvidence);
    if (instanceName && String(instanceName).trim()) {
      cover = { ...cover, syspro: true };
    }
  }

  // Keep instance name for ops when mapped, but cover flag respects hard off
  customer.sqlInstanceName = sysproHardOff ? customer.sqlInstanceName : instanceName;

  // Clear SYSPRO payload when not covered (no leftover warehouse data in UI)
  if (!cover.syspro) {
    operators = [];
    jobErrors = [];
    dtrLevel1 = [];
    dtrDetailLines = [];
    finsightReconCases = [];
    license = null;
    healthLogs = [];
    taskGroups = [];
    taskItems = [];
    operGroups = [];
    operAmends = [];
    auditEvents = [];
    diagSummaries = [];
    sqlHealthRows = [];
    sqlBackups = [];
    sqlBackupFailures = [];
    sysproVersion = null;
    sysproHotfixes = [];
    hotfixGap = [];
    hotfixGapSummary = null;
    dayEnd = null;
    customer.sysproJobErrorCount = 0;
    customer.sysproDtrVarianceLines = 0;
    customer.operatorCount = 0;
    customer.activeUserCount = 0;
  }

  rmm.enabled = cover.rmm;
  const rmmHasData =
    (rmm.devices?.length ?? 0) > 0 ||
    (rmm.summary?.deviceCount ?? 0) > 0 ||
    (customer.pulsewayDeviceCount ?? 0) > 0;
  if (rmmHasData && !cover.rmm && customer.pillarPulseway !== false) {
    cover = { ...cover, rmm: true };
    customer.cover = { ...(customer.cover ?? cover), rmm: true };
  }
  rmm.enabled = cover.rmm;
  if (!cover.rmm) {
    rmm.message = "No cover — RMM (Pulseway) is not in scope for this customer.";
    rmm.devices = [];
    rmm.alerts = [];
    rmm.summary = null;
  } else if (!rmm.summary && rmm.devices.length === 0) {
    rmm.message =
      "RMM is in scope but no devices on the latest snapshot. Confirm Pulseway org mapping and collect.";
  } else {
    rmm.message = null;
  }

  const coveHasData =
    (cove.devices?.length ?? 0) > 0 ||
    (cove.summary?.deviceCount ?? 0) > 0 ||
    (cove.mapping?.filter((m) => m.active && m.partnerName && !/^invalid/i.test(m.partnerName)).length ?? 0) > 0 ||
    customer.pillarCove === true;
  if (coveHasData && !cover.cove && customer.pillarCove !== false) {
    cover = { ...cover, cove: true };
    customer.cover = { ...(customer.cover ?? cover), cove: true };
  }
  cove.enabled = cover.cove;
  if (!cover.cove) {
    cove.message = "No cover — Cyber Backup (Cove) is not in scope for this customer.";
    cove.devices = [];
    cove.summary = null;
    cove.recovery = null;
    cove.recoveryHistory = [];
    cove.recentDays = [];
    cove.alerts = [];
  } else if (!cove.summary && cove.devices.length === 0) {
    cove.message =
      cove.mapping.length > 0
        ? "Partner mapped but no device rows on latest Cove collect. Re-run Collect-Cove-To-RPMAssure.ps1 and confirm Product matches PartnerName."
        : "Cyber Backup is in scope but no device snapshot yet. Map Cove partner → CustomerCode and run Cove collect.";
  } else {
    cove.message = null;
  }
  {
    // Shell pages skip warehouse SYSPRO — keep estate counts so header RAG
    // matches the left customer rail for every customer.
    if (
      !want("syspro") &&
      (customer.operatorCount || 0) === 0 &&
      (customer.sysproJobErrorCount || 0) === 0
    ) {
      await hydrateHealthInputsFromEstate(pool, customer);
    }
    const sys = cover.syspro
      ? healthFor({
          operatorCount:
            (typeof operators !== "undefined" ? operators.length : 0) ||
            customer.operatorCount,
          jobErrorCount: customer.sysproJobErrorCount,
          dtrVariance: customer.sysproDtrVarianceLines,
          activeUserCount: customer.activeUserCount,
        })
      : null;
    const rmmH =
      cover.rmm && rmm.summary
        ? (() => {
            const srvOn = rmm.summary.serverOnline ?? 0;
            const srvOff = rmm.summary.serverOffline ?? 0;
            const srvN = srvOn + srvOff;
            // Prefer device-level server class; never fall back to all-device (workstations)
            let deviceCount = srvN;
            let offlineCount = srvOff;
            if (srvN <= 0 && rmm.devices?.length) {
              const isSrv = (t: string | null | undefined, os: string | null | undefined) => {
                const x = `${t || ""} ${os || ""}`.toLowerCase();
                return (
                  x.includes("windows server") ||
                  /server\s*20(1|2)/.test(x) ||
                  x.includes("domain controller") ||
                  t === "Server"
                );
              };
              const servers = rmm.devices.filter((d) => isSrv(d.deviceType, d.osName));
              if (servers.length > 0) {
                deviceCount = servers.length;
                offlineCount = servers.filter((d) => d.isOnline === false).length;
              }
            }
            if (deviceCount <= 0) {
              return {
                rag: "Green" as const,
                summary:
                  "RMM on cover — no servers classified (workstations excluded from SLA).",
              };
            }
            return rmmHealthFor({
              deviceCount,
              offlineCount,
              criticalAlerts: rmm.summary.criticalAlerts,
              elevatedAlerts: rmm.summary.elevatedAlerts,
            });

          })()
        : cover.rmm
          ? { rag: "Amber" as const, summary: "RMM covered — no snapshot yet." }
          : null;
    const coveH =
      cover.cove && typeof cove !== "undefined" && cove?.summary
        ? coveHealthFor({
            deviceCount: Number(cove.summary.deviceCount) || 0,
            failedCount: Number(cove.summary.failedCount) || 0,
            staleCount: Number(cove.summary.staleCount) || 0,
          })
        : cover.cove
          ? { rag: "Amber" as const, summary: "Cyber Backup covered — no snapshot yet." }
          : null;
    const fin = finalizeEstateHealth({ cover, syspro: sys, rmm: rmmH, cove: coveH });
    customer.healthRag = fin.rag;
    customer.healthSummary = fin.summary;
  }
  } catch (e) {
    console.warn("[rpm-assure] cover finalize:", e instanceof Error ? e.message : e);
    cover = inferCustomerCover({
      pillarSyspro: customer.pillarSyspro,
      pillarPulseway: customer.pillarPulseway,
      pillarCove: customer.pillarCove,
      pillarEpp: customer.pillarEpp,
      sqlInstanceName: customer.sqlInstanceName,
      operatorCount: customer.operatorCount,
      activeUserCount: customer.activeUserCount,
      sysproLastImportAt: customer.lastImportAt,
      pulsewayOrgName: customer.pulsewayOrgName,
      pulsewayDeviceCount: rmm.devices?.length ?? customer.pulsewayDeviceCount,
      pulsewayMapped: (rmm.devices?.length ?? 0) > 0 || rmm.pillarOn || (rmm.mapping?.length ?? 0) > 0,
      coveDeviceCount: cove?.devices?.length ?? customer.coveDeviceCount,
      coveMapped: (cove?.devices?.length ?? 0) > 0 || (cove?.mapping?.length ?? 0) > 0 || customer.pillarCove === true,
      eppDeviceCount:
        epp?.summary?.deviceCount ??
        epp?.devices?.length ??
        customer.eppDeviceCount ??
        0,
      cspUserCount: customer.cspUserCount ?? csp?.users?.length ?? 0,
      cspLicenseCount: customer.cspLicenseSkuCount ?? csp?.licenses?.length ?? 0,
    });
    if (
      (epp?.devices?.length ?? 0) > 0 ||
      (epp?.summary?.deviceCount ?? 0) > 0 ||
      (customer.eppDeviceCount ?? 0) > 0 ||
      customer.pillarEpp === true
    ) {
      cover = { ...cover, epp: true };
      epp.enabled = true;
    }
    customer.cover = cover;
  }


  // Cover already data-driven from inferCustomerCover (all pillars, all customers)
  // Final EPP safety: never leave devices on table but No Cover in strip
  if (
    customer.pillarEpp !== false &&
    ((epp?.devices?.length ?? 0) > 0 ||
      (epp?.summary?.deviceCount ?? 0) > 0 ||
      (customer.eppDeviceCount ?? 0) > 0)
  ) {
    cover = { ...cover, epp: true };
    epp.enabled = true;
    if (epp.message?.toLowerCase().includes("no cover")) epp.message = null;
    customer.eppDeviceCount =
      customer.eppDeviceCount ||
      epp.summary?.deviceCount ||
      epp.devices?.length ||
      0;
  }
  // Final CSP safety: licenses/users/posture ⇒ Covered
  if (
    customer.pillarCsp !== false &&
    ((csp?.licenses?.length ?? 0) > 0 ||
      (csp?.users?.length ?? 0) > 0 ||
      (csp?.summary?.licensedUserCount ?? 0) > 0 ||
      (customer.cspUserCount ?? 0) > 0 ||
      (customer.cspLicenseSkuCount ?? 0) > 0)
  ) {
    cover = { ...cover, csp: true };
    csp.enabled = true;
    if (csp.message?.toLowerCase().includes("no cover")) csp.message = null;
  }
  customer.cover = cover;
  if (!cover.syspro) {
    operators = [];
    jobErrors = [];
    dtrLevel1 = [];
    dtrDetailLines = [];
    finsightReconCases = [];
    license = null;
    healthLogs = [];
    taskGroups = [];
    taskItems = [];
    operGroups = [];
    operAmends = [];
    auditEvents = [];
    diagSummaries = [];
    sqlHealthRows = [];
    sqlBackups = [];
    sqlBackupFailures = [];
    sysproVersion = null;
    sysproHotfixes = [];
    hotfixGap = [];
    hotfixGapSummary = null;
    dayEnd = null;
    customer.sysproJobErrorCount = 0;
    customer.sysproDtrVarianceLines = 0;
    customer.operatorCount = 0;
    customer.activeUserCount = 0;
    // Strip SYSPRO wording from health summary
    if (customer.healthSummary) {
      customer.healthSummary = customer.healthSummary
        .replace(/No SYSPRO operator snapshot yet\.?\s*·?\s*/gi, "")
        .replace(/^\s*·\s*/, "")
        .trim();
      if (!customer.healthSummary) {
        customer.healthSummary =
          "SYSPRO Deployment is No Cover. Health reflects RMM / Backup only.";
      }
    }
  }

  // ---- Cover-aware scores: only covered legs affect assurance / derived SLA ----
  try {
    operationalAssurance = buildOperationalAssurance({
      lastImportAt: customer.lastImportAt,
      jobErrorCount: customer.sysproJobErrorCount,
      operatorCount:
        (typeof operators !== "undefined" ? operators.length : 0) ||
        customer.operatorCount,
      activeUserCount: customer.activeUserCount,
      dtrOutOfBalance: dtrOut,
      healthRag: customer.healthRag,
      healthSummary: customer.healthSummary,
      cover,
      pulsewayDeviceCount: rmm.summary?.deviceCount ?? rmm.devices.length,
      pulsewayOfflineCount: rmm.summary?.offlineCount ?? 0,
      pulsewayCriticalAlerts: rmm.summary?.criticalAlerts ?? 0,
      pulsewayServerOnline: rmm.summary?.serverOnline ?? 0,
      pulsewayServerOffline: rmm.summary?.serverOffline ?? 0,
      coveDeviceCount: cove.summary?.deviceCount ?? cove.devices?.length ?? 0,
      coveFailedDeviceCount: cove.summary?.failedCount ?? 0,
    });

    // Never invent ticket clocks or a 99.5% availability target from health RAG.
    if (availabilitySla && (availabilitySla.source === "derived" || availabilitySla.source === "stub")) {
      availabilitySla = {
        ...availabilitySla,
        source: "stub",
        availabilityPct: null,
        availabilitySlaPct: null,
        slaResponsePct: null,
        slaResolvePct: null,
        slaCompliancePct: null,
        note: anyCover(cover)
          ? "RPM SLA Rev 5.0: ticket clocks in Business Hours. Not measured until a helpdesk feed is connected. Operational pillar scores (RMM / Backup / EPP) use industry measures, not this contract."
          : "No cover — no SYSPRO, RMM, Backup or EPP in scope. SLA is not scored.",
      };
    }

    // Exec summary health already set; refresh derived narrative if stub
    if (execSummary && execSummary.status === "Derived") {
      execSummary = {
        ...execSummary,
        healthRag: customer.healthRag,
        healthSummary: customer.healthSummary,
        businessImpactSummary: operationalAssurance.summary,
      };
    }
  } catch (e) {
    console.warn("[rpm-assure] cover score rebuild:", e instanceof Error ? e.message : e);
  }

  const payload: CustomerDetailPayload = {
    customer,
    cover,
    operators,
    recentLogins,
    jobErrors,
    dtrLevel1,
    dtrDetailLines,
    finsightReconCases,
    license,
    healthLogs,
    taskGroups,
    taskItems,
    incidents,
    problems,
    risks,
    issues,
    priorities,
    slaPolicies,
    availabilitySla,
    amsSlaSummary,
    changes,
    csat,
    operGroups,
    operAmends,
    securitySummary,
    execSummary,
    execNarratives,
    auditEvents,
    diagSummaries,
    sqlHealthRows,
    extraSummary: {
      auditCount: auditEvents.length,
      diagCount: diagSummaries.length,
      sqlHealthCount: sqlHealthRows.length,
      sqlHealthFailCount,
      lastAuditImport: auditEvents[0]?.eventAt ?? null,
    },
    operationalAssurance,
    sqlBackups,
    sqlBackupFailures,
    sysproVersion,
    sysproHotfixes,
    hotfixGap,
    hotfixGapSummary,
    dayEnd,
    rmm,
    cove,
    epp,
    csp,
    dataMode: "live",
  };
  try {
    const { cacheSet } = await import("./query-cache");
    cacheSet(detailCacheKey, payload);
  } catch {
    /* ignore */
  }
  console.info(
    `[rpm-assure] customer detail ${code} ${Date.now() - t0}ms`,
  );
  return payload;
}