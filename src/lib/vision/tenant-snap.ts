import { getPool } from "@/lib/data/sql-pool";

export type VisionTenantSnap = {
  code: string;
  name: string;
  ticketsOpen: number | null;
  ticketsTotal: number | null;
  serversOnline: number | null;
  serversOffline: number | null;
  coveDevices: number | null;
  coveFailed: number | null;
  eppEndpoints: number | null;
  sysproAgeHours: number | null;
};

function n(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export function formatVisionSnap(s: VisionTenantSnap): string {
  const bits = [
    s.ticketsOpen != null || s.ticketsTotal != null
      ? `Tickets ${s.ticketsOpen ?? "—"} open · ${s.ticketsTotal ?? "—"} on file`
      : "",
    s.serversOnline != null || s.serversOffline != null
      ? `RMM servers ${s.serversOnline ?? 0} online · ${s.serversOffline ?? 0} offline`
      : "",
    s.coveDevices != null
      ? `Cloud Backup ${s.coveDevices} device(s) · ${s.coveFailed ?? 0} failed`
      : "",
    s.eppEndpoints != null ? `EPP ${s.eppEndpoints} endpoint(s)` : "",
    s.sysproAgeHours != null
      ? `SYSPRO collect ${s.sysproAgeHours < 1 ? "<1h" : `${Math.round(s.sysproAgeHours)}h`} ago`
      : "",
  ].filter(Boolean);
  if (!bits.length) {
    return `Live now · ${s.name || s.code}: no warehouse rows yet for this tenant.`;
  }
  return `Live now · ${s.name || s.code}\n${bits.join("\n")}`;
}

export async function loadVisionTenantSnap(codeRaw?: string): Promise<VisionTenantSnap | null> {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  if (!code) return null;
  const pool = await getPool();
  if (!pool) return { code, name: code, ticketsOpen: null, ticketsTotal: null, serversOnline: null, serversOffline: null, coveDevices: null, coveFailed: null, eppEndpoints: null, sysproAgeHours: null };

  const snap: VisionTenantSnap = {
    code,
    name: code,
    ticketsOpen: null,
    ticketsTotal: null,
    serversOnline: null,
    serversOffline: null,
    coveDevices: null,
    coveFailed: null,
    eppEndpoints: null,
    sysproAgeHours: null,
  };

  try {
    const r = await pool.request().input("c", code).query(`
SELECT TOP 1 DisplayName FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = @c`);
    const nm = String(r.recordset?.[0]?.DisplayName ?? "").trim();
    if (nm) snap.name = nm;
  } catch {
    /* */
  }

  try {
    const r = await pool.request().input("c", code).query(`
SELECT
  COUNT(*) AS TotalN,
  SUM(CASE
    WHEN StatusName IN (N'Closed', N'Resolved', N'Resolved - Closed') THEN 0
    WHEN ClosedAtUtc IS NOT NULL THEN 0
    ELSE 1
  END) AS OpenN
FROM dbo.Freshdesk_Tickets WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = @c
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Freshdesk_Tickets WITH (NOLOCK))`);
    snap.ticketsTotal = n(r.recordset?.[0]?.TotalN);
    snap.ticketsOpen = n(r.recordset?.[0]?.OpenN);
  } catch {
    try {
      const r = await pool.request().input("c", code).query(`
SELECT
  COUNT(*) AS TotalN,
  SUM(CASE
    WHEN StatusName IN (N'Closed', N'Resolved', N'Resolved - Closed') THEN 0
    WHEN ClosedAtUtc IS NOT NULL THEN 0
    ELSE 1
  END) AS OpenN
FROM dbo.Fact_Incident WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = @c`);
      snap.ticketsTotal = n(r.recordset?.[0]?.TotalN);
      snap.ticketsOpen = n(r.recordset?.[0]?.OpenN);
    } catch {
      /* */
    }
  }

  try {
    const r = await pool.request().input("c", code).query(`
;WITH latest AS (
  SELECT MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = @c
)
SELECT
  SUM(CASE WHEN (p.DeviceType = N'Server' OR p.OsName LIKE N'%Server%') AND ISNULL(p.IsOnline,0) = 1 THEN 1 ELSE 0 END) AS OnN,
  SUM(CASE WHEN (p.DeviceType = N'Server' OR p.OsName LIKE N'%Server%') AND ISNULL(p.IsOnline,0) = 0 THEN 1 ELSE 0 END) AS OffN
FROM dbo.Pulseway_Devices AS p WITH (NOLOCK)
CROSS JOIN latest
WHERE UPPER(LTRIM(RTRIM(p.CustomerCode))) = @c AND p.SnapshotDate = latest.mx`);
    snap.serversOnline = n(r.recordset?.[0]?.OnN) ?? 0;
    snap.serversOffline = n(r.recordset?.[0]?.OffN) ?? 0;
  } catch {
    /* */
  }

  try {
    const r = await pool.request().input("c", code).query(`
SELECT
  COUNT(*) AS N,
  SUM(CASE WHEN UPPER(ISNULL(LastBackupStatus,N'')) LIKE N'%FAIL%' THEN 1 ELSE 0 END) AS FailN
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = @c
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))`);
    snap.coveDevices = n(r.recordset?.[0]?.N);
    snap.coveFailed = n(r.recordset?.[0]?.FailN);
  } catch {
    /* */
  }

  try {
    const r = await pool.request().input("c", code).query(`
SELECT COUNT(*) AS N
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = @c
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))`);
    snap.eppEndpoints = n(r.recordset?.[0]?.N);
  } catch {
    /* */
  }

  try {
    const r = await pool.request().input("c", code).query(`
SELECT MAX(ImportedAt) AS LastAt
FROM dbo.Fact_Syspro_CollectStatus WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = @c`);
    const at = r.recordset?.[0]?.LastAt;
    if (at) {
      const hrs = (Date.now() - new Date(at).getTime()) / 36e5;
      if (Number.isFinite(hrs) && hrs >= 0) snap.sysproAgeHours = hrs;
    }
  } catch {
    /* */
  }

  return snap;
}
