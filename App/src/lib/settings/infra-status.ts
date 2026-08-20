import { createServerFn } from "@tanstack/react-start";
import { getPool, getLastPoolError } from "@/lib/data/sql-pool";
import { inferCustomerCover } from "@/lib/data/cover";

export type InfraAgentRow = {
  customerCode: string;
  displayName: string;
  hostName: string | null;
  agentVersion: string | null;
  healthStatus: string;
  lastStatus: string | null;
  lastHeartbeatUtc: string | null;
  cover: {
    syspro: boolean;
    rmm: boolean;
    cove: boolean;
    epp: boolean;
    csp: boolean;
  };
};

function bitOn(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

async function countMap(
  pool: NonNullable<Awaited<ReturnType<typeof getPool>>>,
  queries: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const q of queries) {
    try {
      const r = await pool.request().query(q);
      for (const row of r.recordset ?? []) {
        const rec = row as Record<string, unknown>;
        const code = String(rec.CustomerCode ?? "").trim().toUpperCase();
        const n = Number(rec.DeviceCount);
        if (code && Number.isFinite(n) && n > 0) out.set(code, n);
      }
      if (out.size > 0) return out;
    } catch {
      /* view / table may be missing on older warehouses */
    }
  }
  return out;
}

export const fetchInfraAgents = createServerFn({ method: "GET" }).handler(async () => {
  const pool = await getPool();
  if (!pool) {
    return {
      ok: false as const,
      message: getLastPoolError() ?? "SQL not connected",
      rows: [] as InfraAgentRow[],
    };
  }
  try {
    const r = await pool.request().query(`
SELECT
  c.CustomerCode,
  ISNULL(c.DisplayName, c.CustomerCode) AS DisplayName,
  c.SqlInstanceName,
  a.PillarSyspro,
  a.PillarPulseway,
  a.PillarCove,
  a.PillarBitdefender,
  ISNULL(a.PillarCsp, a.PillarMicrosoftCsp) AS PillarCsp,
  r.HostName,
  r.AgentVersion,
  r.LastHeartbeatUtc,
  r.LastStatus,
  CASE
    WHEN r.CustomerCode IS NULL THEN N'NOT_INSTALLED'
    WHEN r.LastHeartbeatUtc IS NULL THEN N'NEVER'
    WHEN r.LastHeartbeatUtc < DATEADD(minute, -45, SYSUTCDATETIME()) THEN N'STALE'
    WHEN r.LastStatus IN (N'QUEUED', N'SYNCING')
      AND r.LastHeartbeatUtc >= DATEADD(minute, -12, SYSUTCDATETIME())
      THEN r.LastStatus
    WHEN r.LastHeartbeatUtc >= DATEADD(minute, -45, SYSUTCDATETIME()) THEN N'ONLINE'
  END AS HealthStatus
FROM dbo.Dim_Customer c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
OUTER APPLY (
  SELECT TOP 1 rr.CustomerCode, rr.HostName, rr.AgentVersion, rr.LastHeartbeatUtc, rr.LastStatus
  FROM dbo.Agent_Registry rr WITH (NOLOCK)
  WHERE rr.CustomerCode = c.CustomerCode
  ORDER BY rr.LastHeartbeatUtc DESC
) r
WHERE ISNULL(c.Active, 1) = 1
ORDER BY ISNULL(c.DisplayName, c.CustomerCode)`);
    const rmmBy = await countMap(pool, [
      `SELECT UPPER(LTRIM(RTRIM(CustomerCode))) AS CustomerCode, ISNULL(DeviceCount, 0) AS DeviceCount
       FROM dbo.vw_Kpi_Rmm_OrgSummary_Latest WITH (NOLOCK)
       WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''`,
      `;WITH latest AS (
         SELECT CustomerCode, MAX(SnapshotDate) AS mx
         FROM dbo.Pulseway_Devices WITH (NOLOCK)
         WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
         GROUP BY CustomerCode
       )
       SELECT UPPER(LTRIM(RTRIM(p.CustomerCode))) AS CustomerCode, COUNT(*) AS DeviceCount
       FROM dbo.Pulseway_Devices AS p WITH (NOLOCK)
       INNER JOIN latest AS l ON l.CustomerCode = p.CustomerCode AND l.mx = p.SnapshotDate
       GROUP BY UPPER(LTRIM(RTRIM(p.CustomerCode)))`,
    ]);
    const coveBy = await countMap(pool, [
      `SELECT UPPER(LTRIM(RTRIM(CustomerCode))) AS CustomerCode, SUM(ISNULL(DeviceCount, 0)) AS DeviceCount
       FROM dbo.vw_Kpi_Cove_Summary WITH (NOLOCK)
       WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
       GROUP BY UPPER(LTRIM(RTRIM(CustomerCode)))`,
      `;WITH latest AS (
         SELECT CustomerCode, MAX(SnapshotDate) AS mx
         FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
         WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
         GROUP BY CustomerCode
       )
       SELECT UPPER(LTRIM(RTRIM(d.CustomerCode))) AS CustomerCode, COUNT(*) AS DeviceCount
       FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
       INNER JOIN latest AS l ON l.CustomerCode = d.CustomerCode AND l.mx = d.SnapshotDate
       GROUP BY UPPER(LTRIM(RTRIM(d.CustomerCode)))`,
    ]);
    const eppBy = await countMap(pool, [
      `SELECT UPPER(LTRIM(RTRIM(CustomerCode))) AS CustomerCode, ISNULL(DeviceCount, 0) AS DeviceCount
       FROM dbo.vw_Kpi_Epp_Summary WITH (NOLOCK)
       WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''`,
      `;WITH latest AS (
         SELECT CustomerCode, MAX(SnapshotDate) AS mx
         FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
         WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
         GROUP BY CustomerCode
       )
       SELECT UPPER(LTRIM(RTRIM(e.CustomerCode))) AS CustomerCode, COUNT(*) AS DeviceCount
       FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
       INNER JOIN latest AS l ON l.CustomerCode = e.CustomerCode AND l.mx = e.SnapshotDate
       GROUP BY UPPER(LTRIM(RTRIM(e.CustomerCode)))`,
    ]);
    const cspUsersBy = await countMap(pool, [
      `SELECT UPPER(LTRIM(RTRIM(CustomerCode))) AS CustomerCode, ISNULL(UserCount, 0) AS DeviceCount
       FROM dbo.vw_Kpi_Csp_Summary WITH (NOLOCK)
       WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''`,
      `;WITH latest AS (
         SELECT CustomerCode, MAX(SnapshotDate) AS mx
         FROM dbo.Csp_Users WITH (NOLOCK)
         WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
         GROUP BY CustomerCode
       )
       SELECT UPPER(LTRIM(RTRIM(u.CustomerCode))) AS CustomerCode, COUNT(*) AS DeviceCount
       FROM dbo.Csp_Users AS u WITH (NOLOCK)
       INNER JOIN latest AS l ON l.CustomerCode = u.CustomerCode AND l.mx = u.SnapshotDate
       GROUP BY UPPER(LTRIM(RTRIM(u.CustomerCode)))`,
    ]);
    const cspLicBy = await countMap(pool, [
      `SELECT UPPER(LTRIM(RTRIM(CustomerCode))) AS CustomerCode, ISNULL(SkuCount, 0) AS DeviceCount
       FROM dbo.vw_Kpi_Csp_Summary WITH (NOLOCK)
       WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''`,
      `;WITH latest AS (
         SELECT CustomerCode, MAX(SnapshotDate) AS mx
         FROM dbo.Csp_Licenses WITH (NOLOCK)
         WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
         GROUP BY CustomerCode
       )
       SELECT UPPER(LTRIM(RTRIM(l.CustomerCode))) AS CustomerCode, COUNT(*) AS DeviceCount
       FROM dbo.Csp_Licenses AS l WITH (NOLOCK)
       INNER JOIN latest AS l2 ON l2.CustomerCode = l.CustomerCode AND l2.mx = l.SnapshotDate
       GROUP BY UPPER(LTRIM(RTRIM(l.CustomerCode)))`,
    ]);
    const rows: InfraAgentRow[] = (r.recordset ?? []).map((row: Record<string, unknown>) => {
      const code = String(row.CustomerCode ?? "").trim().toUpperCase();
      const cover = inferCustomerCover({
        pillarSyspro: bitOn(row.PillarSyspro)
          ? true
          : row.PillarSyspro === false || row.PillarSyspro === 0 || row.PillarSyspro === "0"
            ? false
            : null,
        pillarPulseway: bitOn(row.PillarPulseway) ? true : null,
        pillarCove: bitOn(row.PillarCove) ? true : null,
        pillarEpp: bitOn(row.PillarBitdefender) ? true : null,
        pillarCsp: bitOn(row.PillarCsp) ? true : null,
        sqlInstanceName: row.SqlInstanceName != null ? String(row.SqlInstanceName) : null,
        pulsewayDeviceCount: rmmBy.get(code) ?? 0,
        coveDeviceCount: coveBy.get(code) ?? 0,
        eppDeviceCount: eppBy.get(code) ?? 0,
        cspUserCount: cspUsersBy.get(code) ?? 0,
        cspLicenseCount: cspLicBy.get(code) ?? 0,
      });
      const needsAgent = cover.syspro;
      return {
        customerCode: String(row.CustomerCode ?? ""),
        displayName: String(row.DisplayName ?? row.CustomerCode ?? ""),
        hostName: needsAgent && row.HostName != null ? String(row.HostName) : null,
        agentVersion: needsAgent && row.AgentVersion != null ? String(row.AgentVersion) : null,
        healthStatus: needsAgent ? String(row.HealthStatus ?? "NOT_INSTALLED") : "NOT_INSTALLED",
        lastStatus: needsAgent && row.LastStatus != null ? String(row.LastStatus) : null,
        lastHeartbeatUtc:
          needsAgent && row.LastHeartbeatUtc
            ? new Date(row.LastHeartbeatUtc as string).toISOString()
            : null,
        cover: {
          syspro: cover.syspro,
          rmm: cover.rmm,
          cove: cover.cove,
          epp: Boolean(cover.epp),
          csp: Boolean(cover.csp),
        },
      };
    });
    return { ok: true as const, message: null as string | null, rows };
  } catch (e) {
    return {
      ok: false as const,
      message: e instanceof Error ? e.message : String(e),
      rows: [] as InfraAgentRow[],
    };
  }
});

export type EstateIopsRow = {
  customerCode: string;
  displayName: string;
  hostName: string;
  driveLetter: string;
  usedPct: number | null;
  readIops: number | null;
  writeIops: number | null;
  totalIops: number | null;
  totalGb: number | null;
  freeGb: number | null;
  queueLen: number | null;
  mediaType: string | null;
  snapshotUtc: string | null;
};

export type EstateEventRow = {
  customerCode: string;
  displayName: string;
  hostName: string;
  timeCreatedUtc: string | null;
  logName: string;
  eventId: number;
  levelName: string;
  providerName: string;
  message: string;
};

export const fetchEstateTelemetry = createServerFn({ method: "GET" }).handler(async () => {
  const pool = await getPool();
  if (!pool) {
    return {
      ok: false as const,
      message: getLastPoolError() ?? "SQL not connected",
      iops: [] as EstateIopsRow[],
      events: [] as EstateEventRow[],
    };
  }
  const iops: EstateIopsRow[] = [];
  const events: EstateEventRow[] = [];
  try {
    const r = await pool.request().query(`
SELECT d.CustomerCode,
       ISNULL(c.DisplayName, d.CustomerCode) AS DisplayName,
       d.HostName, d.DriveLetter, d.UsedPct, d.ReadIops, d.WriteIops, d.TotalIops, d.MediaType, d.SnapshotUtc,
       d.TotalGb, d.FreeGb, d.QueueLen
FROM dbo.Agent_DiskIops d WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer c WITH (NOLOCK) ON c.CustomerCode = d.CustomerCode
INNER JOIN (
  SELECT CustomerCode, HostName, MAX(SnapshotUtc) AS mx
  FROM dbo.Agent_DiskIops WITH (NOLOCK)
  WHERE SnapshotUtc >= DATEADD(day, -7, SYSUTCDATETIME())
  GROUP BY CustomerCode, HostName
) m ON m.CustomerCode = d.CustomerCode AND m.HostName = d.HostName AND m.mx = d.SnapshotUtc
ORDER BY DisplayName, d.HostName, d.DriveLetter`);
    for (const row of r.recordset ?? []) {
      const rec = row as Record<string, unknown>;
      const hostName = String(rec.HostName ?? "").trim();
      if (!hostName || /^(DEMO[-_]?|SAMPLE[-_]?|TEST[-_]?|FAKE[-_])/i.test(hostName)) continue;
      iops.push({
        customerCode: String(rec.CustomerCode ?? ""),
        displayName: String(rec.DisplayName ?? rec.CustomerCode ?? ""),
        hostName: String(rec.HostName ?? ""),
        driveLetter: String(rec.DriveLetter ?? ""),
        usedPct: rec.UsedPct != null ? Number(rec.UsedPct) : null,
        readIops: rec.ReadIops != null ? Number(rec.ReadIops) : null,
        writeIops: rec.WriteIops != null ? Number(rec.WriteIops) : null,
        totalIops: rec.TotalIops != null ? Number(rec.TotalIops) : null,
        mediaType: rec.MediaType && !/unspecified|unknown|fixed hard disk/i.test(String(rec.MediaType))
          ? String(rec.MediaType)
          : null,
        totalGb: rec.TotalGb != null ? Number(rec.TotalGb) : null,
        freeGb: rec.FreeGb != null ? Number(rec.FreeGb) : null,
        queueLen: rec.QueueLen != null ? Number(rec.QueueLen) : null,
        snapshotUtc: rec.SnapshotUtc ? new Date(rec.SnapshotUtc as string).toISOString() : null,
      });
    }
  } catch {
    /* table missing until first agent cycle */
  }
  try {
    const r = await pool.request().query(`
SELECT TOP 400
  e.CustomerCode,
  ISNULL(c.DisplayName, e.CustomerCode) AS DisplayName,
  e.HostName, e.TimeCreatedUtc, e.LogName, e.EventId, e.LevelName, e.ProviderName, e.MessageText
FROM dbo.Agent_EventLog e WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer c WITH (NOLOCK) ON c.CustomerCode = e.CustomerCode
WHERE e.TimeCreatedUtc >= DATEADD(day, -7, SYSUTCDATETIME())
ORDER BY
  CASE WHEN e.LevelName = N'Critical' THEN 0 ELSE 1 END,
  e.TimeCreatedUtc DESC`);
    for (const row of r.recordset ?? []) {
      const rec = row as Record<string, unknown>;
      events.push({
        customerCode: String(rec.CustomerCode ?? ""),
        displayName: String(rec.DisplayName ?? rec.CustomerCode ?? ""),
        hostName: String(rec.HostName ?? ""),
        timeCreatedUtc: rec.TimeCreatedUtc ? new Date(rec.TimeCreatedUtc as string).toISOString() : null,
        logName: String(rec.LogName ?? ""),
        eventId: Number(rec.EventId ?? 0),
        levelName: String(rec.LevelName ?? "Error"),
        providerName: String(rec.ProviderName ?? ""),
        message: String(rec.MessageText ?? ""),
      });
    }
  } catch {
    /* table missing until first agent cycle */
  }
  return { ok: true as const, message: null as string | null, iops, events };
});
