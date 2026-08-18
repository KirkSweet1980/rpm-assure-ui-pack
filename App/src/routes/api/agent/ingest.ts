import { createFileRoute } from "@tanstack/react-router";
import sql from "mssql";
import { getPool } from "@/lib/data/sql-pool";
import { authorizeIngest, ingestConfigured } from "@/lib/security/ingest-secret";

function str(v: unknown, max = 256): string {
  return String(v ?? "").trim().slice(0, max);
}

export const Route = createFileRoute("/api/agent/ingest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!ingestConfigured("agent")) {
          return Response.json({ ok: false, error: "Agent secret not configured" }, { status: 503 });
        }
        if (!authorizeIngest(request, "agent")) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
        const url = new URL(request.url);
        const kind = (url.searchParams.get("kind") || "cover").toLowerCase();
        const customerCode = str(url.searchParams.get("customerCode"), 32).toUpperCase();
        if (kind !== "cover") {
          return Response.json({ ok: false, error: "GET kind=cover only" }, { status: 400 });
        }
        if (!customerCode) {
          return Response.json({ ok: false, error: "customerCode required" }, { status: 400 });
        }
        const pool = await getPool();
        if (!pool) return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });
        const rs = await pool
          .request()
          .input("c", sql.NVarChar(32), customerCode)
          .query(`
SELECT
  ISNULL(CAST(a.PillarSyspro AS int), -1) AS syspro,
  ISNULL(CAST(a.PillarPulseway AS int), -1) AS rmm,
  ISNULL(CAST(a.PillarCove AS int), -1) AS cove,
  ISNULL(CAST(a.PillarBitdefender AS int), -1) AS epp,
  ISNULL(CAST(ISNULL(a.PillarCsp, 0) AS int), -1) AS csp,
  ISNULL(c.SqlInstanceName, N'') AS instanceName
FROM dbo.Dim_Customer c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = @c;`);
        const row = rs.recordset?.[0] as Record<string, unknown> | undefined;
        if (!row) return Response.json({ ok: false, error: "unknown customer" }, { status: 404 });
        const bit = (v: unknown) => (v === 0 ? false : v === 1 ? true : null);
        return Response.json({
          ok: true,
          via: "https",
          customerCode,
          syspro: bit(row.syspro),
          rmm: bit(row.rmm),
          cove: bit(row.cove),
          epp: bit(row.epp),
          csp: bit(row.csp),
          instanceName: String(row.instanceName ?? ""),
        });
      },
      POST: async ({ request }) => {
        if (!ingestConfigured("agent")) {
          return Response.json({ ok: false, error: "Agent secret not configured" }, { status: 503 });
        }
        if (!authorizeIngest(request, "agent")) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
        }
        const kind = str(body.kind ?? body.Kind, 32).toLowerCase();
        const hostName = str(body.hostName ?? body.HostName, 128);
        const customerCode = str(body.customerCode ?? body.CustomerCode, 32).toUpperCase();
        const pool = await getPool();
        if (!pool) return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });

        if (kind === "uninstall") {
          if (!hostName || !customerCode) {
            return Response.json({ ok: false, error: "hostName and customerCode required" }, { status: 400 });
          }
          await pool
            .request()
            .input("h", sql.NVarChar(128), hostName)
            .input("c", sql.NVarChar(32), customerCode)
            .query(`
UPDATE dbo.Agent_Registry
SET LastStatus = N'UNINSTALLED',
    LastMessage = N'uninstalled from host'
WHERE HostName = @h AND CustomerCode = @c;`);
          const liveRs = await pool
            .request()
            .input("c", sql.NVarChar(32), customerCode)
            .query(`
SELECT COUNT(*) AS LiveAgents
FROM dbo.Agent_Registry WITH (NOLOCK)
WHERE CustomerCode = @c
  AND LastStatus NOT IN (N'UNINSTALLED', N'REMOVED')
  AND LastHeartbeatUtc >= DATEADD(hour, -2, SYSUTCDATETIME())
  AND (
    RoleTags IS NULL
    OR LTRIM(RTRIM(RoleTags)) = N''
    OR LOWER(RoleTags) LIKE N'%syspro%'
  )`);
          const live = Number(liveRs.recordset?.[0]?.LiveAgents) || 0;
          return Response.json({
            ok: true,
            via: "https",
            kind: "uninstall",
            customerCode,
            hostName,
            liveSysproAgents: live,
            sysproCover: live > 0,
          });
        }

        if (kind === "status") {
          if (!hostName) return Response.json({ ok: false, error: "hostName required" }, { status: 400 });
          const status = str(body.status ?? body.LastStatus, 32) || "ONLINE";
          const message = str(body.message ?? body.LastMessage, 400) || "https";
          await pool
            .request()
            .input("h", sql.NVarChar(128), hostName)
            .input("c", sql.NVarChar(32), customerCode || null)
            .input("s", sql.NVarChar(32), status)
            .input("m", sql.NVarChar(400), message)
            .query(`
UPDATE dbo.Agent_Registry
SET LastStatus = @s, LastMessage = @m, LastHeartbeatUtc = SYSUTCDATETIME()
WHERE HostName = @h AND (@c IS NULL OR CustomerCode = @c);`);
          return Response.json({ ok: true, via: "https", kind: "status", hostName });
        }

        if (kind === "events") {
          if (!hostName || !customerCode) {
            return Response.json({ ok: false, error: "hostName and customerCode required" }, { status: 400 });
          }
          const events = Array.isArray(body.events) ? (body.events as Record<string, unknown>[]) : [];
          await pool.request().query(`
IF OBJECT_ID(N'dbo.Agent_EventLog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_EventLog (
    SnapshotUtc datetime2(0) NOT NULL,
    CustomerCode nvarchar(32) NOT NULL,
    HostName nvarchar(128) NOT NULL,
    TimeCreatedUtc datetime2(0) NULL,
    LogName nvarchar(40) NULL,
    EventId int NULL,
    LevelName nvarchar(16) NULL,
    ProviderName nvarchar(200) NULL,
    MessageText nvarchar(1800) NULL
  );
END`);
          let n = 0;
          for (const ev of events.slice(0, 400)) {
            const when = str(ev.timeCreatedUtc ?? ev.TimeCreatedUtc, 32);
            if (!when) continue;
            await pool
              .request()
              .input("c", sql.NVarChar(32), customerCode)
              .input("h", sql.NVarChar(128), hostName)
              .input("t", sql.DateTime2, new Date(when))
              .input("l", sql.NVarChar(40), str(ev.logName ?? ev.LogName, 40) || null)
              .input("id", sql.Int, Number(ev.eventId ?? ev.EventId) || 0)
              .input("lv", sql.NVarChar(16), str(ev.levelName ?? ev.LevelName, 16) || null)
              .input("p", sql.NVarChar(200), str(ev.providerName ?? ev.ProviderName, 200) || null)
              .input("msg", sql.NVarChar(1800), str(ev.message ?? ev.MessageText, 1800) || null)
              .query(`
IF NOT EXISTS (
  SELECT 1 FROM dbo.Agent_EventLog WITH (NOLOCK)
  WHERE CustomerCode=@c AND HostName=@h AND TimeCreatedUtc=@t AND LogName=@l AND EventId=@id
)
INSERT INTO dbo.Agent_EventLog (
  SnapshotUtc, CustomerCode, HostName, TimeCreatedUtc, LogName, EventId, LevelName, ProviderName, MessageText
) VALUES (SYSUTCDATETIME(), @c, @h, @t, @l, @id, @lv, @p, @msg);`);
            n++;
          }
          await pool.request().query(`
DELETE FROM dbo.Agent_EventLog WHERE TimeCreatedUtc < DATEADD(day, -14, SYSUTCDATETIME());`);
          return Response.json({ ok: true, via: "https", kind: "events", rows: n });
        }

        return Response.json({ ok: false, error: "unknown kind" }, { status: 400 });
      },
    },
  },
});
