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
      const agentOn = Boolean(row.HostName && String(row.HostName).trim());
      const syspro =
        sysproFlag === false || sysproFlag === 0 || sysproFlag === "0"
          ? false
          : agentOn && (bitOn(sysproFlag) || Boolean(row.SqlInstanceName && String(row.SqlInstanceName).trim()));
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
    return { ok: true as const, message: `${rows.length} customers`, rows };
  } catch (e) {
    try {
      const r2 = await pool.request().query(`
SELECT
  c.CustomerCode,
  ISNULL(c.DisplayName, c.CustomerCode) AS DisplayName,
  c.SqlInstanceName,
  a.PillarSyspro,
  a.PillarPulseway,
  a.PillarCove,
  a.PillarBitdefender,
  CAST(NULL AS bit) AS PillarCsp,
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
LEFT JOIN dbo.Agent_Registry r WITH (NOLOCK) ON r.CustomerCode = c.CustomerCode
WHERE ISNULL(c.Active, 1) = 1
ORDER BY ISNULL(c.DisplayName, c.CustomerCode)`);
      const rows: InfraAgentRow[] = (r2.recordset ?? []).map((row: Record<string, unknown>) => {
        const sysproFlag = row.PillarSyspro;
        const agentOn = Boolean(row.HostName && String(row.HostName).trim());
        const syspro =
          sysproFlag === false || sysproFlag === 0 || sysproFlag === "0"
            ? false
            : agentOn && (bitOn(sysproFlag) || Boolean(row.SqlInstanceName && String(row.SqlInstanceName).trim()));
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
            csp: false,
          },
        };
      });
      return { ok: true as const, message: `${rows.length} customers`, rows };
    } catch (e2) {
      return {
        ok: false as const,
        message: e2 instanceof Error ? e2.message : e instanceof Error ? e.message : "Could not load customers",
        rows: [] as InfraAgentRow[],
      };
    }
  }
});
