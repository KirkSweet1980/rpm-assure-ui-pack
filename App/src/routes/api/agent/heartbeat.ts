import { createFileRoute } from "@tanstack/react-router";
import sql from "mssql";
import { getPool } from "@/lib/data/sql-pool";

function pickSecret(request: Request): string {
  return (
    request.headers.get("x-assure-secret") ||
    request.headers.get("x-agent-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

function expectedSecret(): string {
  return (
    process.env.RPM_ASSURE_AGENT_SECRET ||
    process.env.RPM_ASSURE_IOPS_SECRET ||
    process.env.RPM_ASSURE_INGEST_SECRET ||
    process.env.PULSEWAY_WEBHOOK_SECRET ||
    ""
  );
}

function str(v: unknown, max = 128): string {
  return String(v ?? "").trim().slice(0, max);
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const Route = createFileRoute("/api/agent/heartbeat")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          accept: "POST Edge Agent heartbeat over HTTPS (Let's Encrypt)",
          path: "/api/agent/heartbeat",
        }),
      POST: async ({ request }) => {
        const want = expectedSecret();
        if (!want) {
          return Response.json({ ok: false, error: "Agent secret not configured (RPM_ASSURE_AGENT_SECRET or RPM_ASSURE_IOPS_SECRET)." }, { status: 503 });
        }
        if (pickSecret(request).trim() !== want) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
        }
        const hostName = str(body.hostName ?? body.HostName, 128);
        const customerCode = str(body.customerCode ?? body.CustomerCode, 32).toUpperCase();
        if (!hostName || !customerCode) {
          return Response.json({ ok: false, error: "hostName and customerCode required" }, { status: 400 });
        }
        const pool = await getPool();
        if (!pool) return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });
        try {
          await pool.request().query(`
IF COL_LENGTH(N'dbo.Agent_Registry', N'LastHttpsUtc') IS NULL
  ALTER TABLE dbo.Agent_Registry ADD LastHttpsUtc datetime2(0) NULL;
IF COL_LENGTH(N'dbo.Agent_Registry', N'HeartbeatVia') IS NULL
  ALTER TABLE dbo.Agent_Registry ADD HeartbeatVia nvarchar(16) NULL;`);
          const ver = str(body.agentVersion ?? body.AgentVersion, 32) || "https";
          const roles = str(body.roleTags ?? body.RoleTags, 256);
          const inst = str(body.instanceName ?? body.InstanceName, 128);
          const path = str(body.installPath ?? body.InstallPath, 512);
          const os = str(body.osCaption ?? body.OsCaption, 256);
          const mem = num(body.memFreeMb ?? body.MemFreeMb);
          const disk = num(body.diskFreeGb ?? body.DiskFreeGb);
          const detail = str(body.detailJson ?? body.DetailJson, 4000) || "{}";
          await pool
            .request()
            .input("c", sql.NVarChar(32), customerCode)
            .input("h", sql.NVarChar(128), hostName)
            .input("v", sql.NVarChar(32), ver)
            .input("r", sql.NVarChar(256), roles || null)
            .input("i", sql.NVarChar(128), inst || null)
            .input("p", sql.NVarChar(512), path || null)
            .input("os", sql.NVarChar(256), os || null)
            .input("mem", sql.Int, mem)
            .input("disk", sql.Decimal(12, 2), disk)
            .input("d", sql.NVarChar(sql.MAX), detail)
            .query(`
MERGE dbo.Agent_Registry AS t
USING (SELECT @c CustomerCode, @h HostName) s
ON t.CustomerCode = s.CustomerCode AND t.HostName = s.HostName
WHEN MATCHED THEN UPDATE SET
  LastHeartbeatUtc = SYSUTCDATETIME(),
  LastHttpsUtc = SYSUTCDATETIME(),
  HeartbeatVia = N'https',
  AgentVersion = @v,
  RoleTags = COALESCE(@r, t.RoleTags),
  InstanceName = COALESCE(@i, t.InstanceName),
  InstallPath = COALESCE(@p, t.InstallPath),
  LastStatus = CASE
    WHEN t.LastStatus IN (N'UPDATE', N'UPDATING', N'QUEUED', N'SYNCING') THEN t.LastStatus
    ELSE N'ONLINE'
  END,
  LastMessage = CASE
    WHEN t.LastStatus IN (N'UPDATE', N'UPDATING', N'QUEUED', N'SYNCING') THEN t.LastMessage
    ELSE N'https heartbeat ok'
  END
WHEN NOT MATCHED THEN INSERT (
  CustomerCode, HostName, InstanceName, AgentVersion, RoleTags, InstallPath,
  LastHeartbeatUtc, LastHttpsUtc, HeartbeatVia, LastStatus, LastMessage
) VALUES (
  @c, @h, @i, @v, @r, @p, SYSUTCDATETIME(), SYSUTCDATETIME(), N'https', N'ONLINE', N'https registered'
);

INSERT INTO dbo.Agent_Heartbeat (CustomerCode, HostName, AgentVersion, OsCaption, MemFreeMb, DiskFreeGb, DetailJson)
VALUES (@c, @h, @v, @os, @mem, @disk, @d);

SELECT TOP 1 LastStatus, LastMessage, RequestSyncUtc
FROM dbo.Agent_Registry WITH (NOLOCK)
WHERE CustomerCode = @c AND HostName = @h;`);
          const row = (
            await pool
              .request()
              .input("c", sql.NVarChar(32), customerCode)
              .input("h", sql.NVarChar(128), hostName)
              .query(`SELECT TOP 1 LastStatus, LastMessage, RequestSyncUtc FROM dbo.Agent_Registry WITH (NOLOCK) WHERE CustomerCode=@c AND HostName=@h`)
          ).recordset?.[0] as { LastStatus?: string; LastMessage?: string; RequestSyncUtc?: Date } | undefined;
          const status = String(row?.LastStatus ?? "");
          const msg = String(row?.LastMessage ?? "");
          const requestSync = status === "QUEUED" || /^sync requested/i.test(msg) || !!row?.RequestSyncUtc;
          const requestUpdate = status === "UPDATE" || status === "UPDATING" || /^update requested/i.test(msg);
          return Response.json({
            ok: true,
            customerCode,
            hostName,
            via: "https",
            requestSync,
            requestUpdate,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
