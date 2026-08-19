import { createFileRoute } from "@tanstack/react-router";
import sql from "mssql";
import { getPool } from "@/lib/data/sql-pool";
import { authorizeIngest, ingestConfigured } from "@/lib/security/ingest-secret";

type PortIn = { port?: string; proto?: string; name?: string };
type ProfileIn = {
  name?: string;
  enabled?: boolean;
  active?: boolean;
  ports?: PortIn[];
};

function str(v: unknown, max = 128): string {
  return String(v ?? "").trim().slice(0, max);
}

const PROFILES = new Set(["Domain", "Private", "Public"]);

export const Route = createFileRoute("/api/firewall")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          accept: "POST Windows Firewall profiles + inbound exposed ports",
          path: "/api/firewall",
        }),
      POST: async ({ request }) => {
        if (!ingestConfigured("iops") && !ingestConfigured("agent")) {
          return Response.json({ ok: false, error: "Ingest secret not configured." }, { status: 503 });
        }
        if (!authorizeIngest(request, "iops") && !authorizeIngest(request, "agent")) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
        }
        const hostName = str(body.hostName ?? body.hostname ?? body.HostName, 128);
        if (!hostName) return Response.json({ ok: false, error: "hostName required" }, { status: 400 });
        const profilesRaw = Array.isArray(body.profiles) ? (body.profiles as ProfileIn[]) : [];
        if (profilesRaw.length === 0) {
          return Response.json({ ok: false, error: "profiles[] required" }, { status: 400 });
        }
        const pool = await getPool();
        if (!pool) return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });

        let customerCode = str(body.customerCode ?? body.CustomerCode, 32).toUpperCase();
        try {
          if (!customerCode) {
            const mapped = await pool
              .request()
              .input("h", sql.NVarChar(128), hostName)
              .query(`
DECLARE @code nvarchar(32) = NULL;
DECLARE @short nvarchar(128) = UPPER(LTRIM(RTRIM(@h)));
IF CHARINDEX(N'.', @short) > 1 SET @short = LEFT(@short, CHARINDEX(N'.', @short) - 1);
DECLARE @pfx nvarchar(32) = @short;
IF CHARINDEX(N'-', @pfx) > 1 SET @pfx = LEFT(@pfx, CHARINDEX(N'-', @pfx) - 1);

IF @code IS NULL AND OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NOT NULL
  SELECT TOP 1 @code = d.CustomerCode
  FROM dbo.Pulseway_Devices d WITH (NOLOCK)
  WHERE d.CustomerCode IS NOT NULL AND LTRIM(RTRIM(d.CustomerCode)) <> N''
    AND (UPPER(LTRIM(RTRIM(d.Name))) IN (UPPER(@h), @short) OR UPPER(LTRIM(RTRIM(d.DeviceId))) = UPPER(@h))
  ORDER BY d.SnapshotDate DESC;

IF @code IS NULL AND OBJECT_ID(N'dbo.Agent_Registry', N'U') IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.Agent_Registry WITH (NOLOCK)
  WHERE UPPER(LTRIM(RTRIM(HostName))) IN (UPPER(@h), @short)
  ORDER BY LastHeartbeatUtc DESC;

IF @code IS NULL AND @pfx IS NOT NULL AND LEN(@pfx) BETWEEN 2 AND 16
   AND OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.Dim_Customer WITH (NOLOCK)
  WHERE UPPER(LTRIM(RTRIM(CustomerCode))) = @pfx;

SELECT @code AS CustomerCode;`);
            customerCode = str((mapped.recordset?.[0] as { CustomerCode?: string } | undefined)?.CustomerCode, 32).toUpperCase();
          }
          if (customerCode === "PCNS" || customerCode === "PNCS") customerCode = "BHF";
          if (!customerCode) {
            return Response.json({ ok: false, error: `No customer map for host ${hostName}` }, { status: 422 });
          }

          await pool.request().query(`
IF OBJECT_ID(N'dbo.Agent_HostFirewall', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_HostFirewall (
    SnapshotUtc    datetime2(0)  NOT NULL,
    CustomerCode   nvarchar(32)  NOT NULL,
    HostName       nvarchar(128) NOT NULL,
    ProfileName    nvarchar(16)  NOT NULL,
    Enabled        bit           NOT NULL CONSTRAINT DF_Api_HostFw_En DEFAULT (0),
    Active         bit           NOT NULL CONSTRAINT DF_Api_HostFw_Act DEFAULT (0),
    PortsJson      nvarchar(max) NULL,
    Source         nvarchar(40)  NULL,
    ImportedAt     datetime2(3)  NOT NULL CONSTRAINT DF_Api_HostFw_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Agent_HostFirewall PRIMARY KEY (SnapshotUtc, CustomerCode, HostName, ProfileName)
  );
END`);

          const source = str(body.source ?? "pulseway", 40) || "pulseway";
          const snap = new Date();
          snap.setMilliseconds(0);
          let n = 0;
          for (const p of profilesRaw) {
            const name = str(p.name, 16);
            const canon = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            if (!PROFILES.has(canon)) continue;
            const ports = Array.isArray(p.ports) ? p.ports : [];
            const clean = ports
              .map((x) => ({
                port: str(x.port, 40),
                proto: str(x.proto ?? "TCP", 12) || "TCP",
                name: str(x.name, 80),
              }))
              .filter((x) => x.port)
              .slice(0, 80);
            const req = pool.request();
            req.input("snap", sql.DateTime2, snap);
            req.input("c", sql.NVarChar(32), customerCode);
            req.input("h", sql.NVarChar(128), hostName);
            req.input("p", sql.NVarChar(16), canon);
            req.input("en", sql.Bit, p.enabled === true);
            req.input("ac", sql.Bit, p.active === true);
            req.input("j", sql.NVarChar(sql.MAX), JSON.stringify(clean));
            req.input("src", sql.NVarChar(40), source);
            await req.query(`
MERGE dbo.Agent_HostFirewall AS tgt
USING (SELECT @snap SnapshotUtc, @c CustomerCode, @h HostName, @p ProfileName) AS src
ON tgt.SnapshotUtc = src.SnapshotUtc AND tgt.CustomerCode = src.CustomerCode
 AND tgt.HostName = src.HostName AND tgt.ProfileName = src.ProfileName
WHEN MATCHED THEN UPDATE SET
  Enabled=@en, Active=@ac, PortsJson=@j, Source=@src, ImportedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (
  SnapshotUtc, CustomerCode, HostName, ProfileName, Enabled, Active, PortsJson, Source
) VALUES (@snap, @c, @h, @p, @en, @ac, @j, @src);`);
            n++;
          }
          await pool.request().query(`
DELETE FROM dbo.Agent_HostFirewall WHERE SnapshotUtc < DATEADD(day, -14, SYSUTCDATETIME());`);
          return Response.json({ ok: true, customerCode, hostName, profiles: n, source });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
