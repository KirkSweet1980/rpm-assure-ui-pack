import { createServerFn } from "@tanstack/react-start";
import { getPool, getLastPoolError } from "@/lib/data/sql-pool";

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
    WHEN r.LastStatus IN (N'QUEUED', N'SYNCING') THEN r.LastStatus
    ELSE N'ONLINE'
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
    const rows: InfraAgentRow[] = (r.recordset ?? []).map((row: Record<string, unknown>) => {
      const sysproFlag = row.PillarSyspro;
      const syspro =
        sysproFlag === false || sysproFlag === 0 || sysproFlag === "0"
          ? false
          : bitOn(sysproFlag) || Boolean(row.SqlInstanceName && String(row.SqlInstanceName).trim());
      return {
        customerCode: String(row.CustomerCode ?? ""),
        displayName: String(row.DisplayName ?? row.CustomerCode ?? ""),
        hostName: row.HostName != null ? String(row.HostName) : null,
        agentVersion: row.AgentVersion != null ? String(row.AgentVersion) : null,
        healthStatus: String(row.HealthStatus ?? "NOT_INSTALLED"),
        lastStatus: row.LastStatus != null ? String(row.LastStatus) : null,
        lastHeartbeatUtc: row.LastHeartbeatUtc
          ? new Date(row.LastHeartbeatUtc as string).toISOString()
          : null,
        cover: {
          syspro,
          rmm: bitOn(row.PillarPulseway),
          cove: bitOn(row.PillarCove),
          epp: bitOn(row.PillarBitdefender),
          csp: bitOn(row.PillarCsp),
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
