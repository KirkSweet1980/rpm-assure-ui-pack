import { createFileRoute } from "@tanstack/react-router";
import sql from "mssql";
import { getPool } from "@/lib/data/sql-pool";
import { authorizeIngest, ingestConfigured } from "@/lib/security/ingest-secret";

/**
 * RPM RMM Automation (and Edge Agent) POST disk performance counters here.
 * the RMM API does not return script output or custom-field values —
 * the script on the device must push.
 *
 *   POST https://assure.rpmresources.co.za/api/iops
 *   Header: X-Assure-Secret: <PULSEWAY_WEBHOOK_SECRET or RPM_ASSURE_IOPS_SECRET>
 */

type VolumeIn = {
  driveLetter?: string;
  letter?: string;
  totalGb?: number | null;
  freeGb?: number | null;
  usedPct?: number | null;
  mediaType?: string | null;
  readIops?: number | null;
  writeIops?: number | null;
  totalIops?: number | null;
  queueLen?: number | null;
  readLatencyMs?: number | null;
  writeLatencyMs?: number | null;
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown, max = 128): string {
  return String(v ?? "").trim().slice(0, max);
}

export const Route = createFileRoute("/api/iops")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          accept: "POST disk performance counters from RPM RMM Automation",
          path: "/api/iops",
        }),
      POST: async ({ request }) => {
        if (!ingestConfigured("iops")) {
          return Response.json(
            { ok: false, error: "Ingest secret not configured on Assure (RPM_ASSURE_IOPS_SECRET or PULSEWAY_WEBHOOK_SECRET)." },
            { status: 503 },
          );
        }
        if (!authorizeIngest(request, "iops")) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
        }
        const hostName = str(body.hostName ?? body.hostname ?? body.computerName ?? body.HostName, 128);
        if (!hostName) {
          return Response.json({ ok: false, error: "hostName required" }, { status: 400 });
        }
        const volumesRaw = Array.isArray(body.volumes)
          ? (body.volumes as VolumeIn[])
          : Array.isArray(body.disks)
            ? (body.disks as VolumeIn[])
            : [];
        if (volumesRaw.length === 0) {
          return Response.json({ ok: false, error: "volumes[] required" }, { status: 400 });
        }
        const sampleSec = num(body.sampleSec) ?? 6;
        const pool = await getPool();
        if (!pool) {
          return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });
        }
        let customerCode = str(body.customerCode ?? body.CustomerCode, 32).toUpperCase();
        const org = str(body.organizationName ?? body.organization ?? body.org, 200);
        try {
          if (!customerCode) {
            const mapped = await pool
              .request()
              .input("h", sql.NVarChar(128), hostName)
              .input("org", sql.NVarChar(200), org || null)
              .query(`
DECLARE @code nvarchar(32) = NULL;
DECLARE @short nvarchar(128) = UPPER(LTRIM(RTRIM(@h)));
IF CHARINDEX(N'.', @short) > 1 SET @short = LEFT(@short, CHARINDEX(N'.', @short) - 1);
DECLARE @pfx nvarchar(32) = @short;
IF CHARINDEX(N'-', @pfx) > 1 SET @pfx = LEFT(@pfx, CHARINDEX(N'-', @pfx) - 1);

IF @org IS NOT NULL AND OBJECT_ID(N'dbo.RMM organisation map', N'U') IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.RMM organisation map WITH (NOLOCK)
  WHERE Active = 1 AND LTRIM(RTRIM(OrganizationName)) = LTRIM(RTRIM(@org));

IF @code IS NULL AND OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NOT NULL
  SELECT TOP 1 @code = d.CustomerCode
  FROM dbo.Pulseway_Devices d WITH (NOLOCK)
  WHERE d.CustomerCode IS NOT NULL AND LTRIM(RTRIM(d.CustomerCode)) <> N''
    AND (
      UPPER(LTRIM(RTRIM(d.Name))) = UPPER(@h)
      OR UPPER(LTRIM(RTRIM(d.Name))) = @short
      OR UPPER(LTRIM(RTRIM(d.DeviceId))) = UPPER(@h)
      OR UPPER(LTRIM(RTRIM(d.Name))) LIKE @short + N'.%'
      OR @short LIKE UPPER(LTRIM(RTRIM(d.Name))) + N'.%'
    )
  ORDER BY d.SnapshotDate DESC;

IF @code IS NULL AND OBJECT_ID(N'dbo.Dim_Pulseway_NameMap', N'U') IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.Dim_Pulseway_NameMap WITH (NOLOCK)
  WHERE Active = 1 AND (@h LIKE NameLike OR @short LIKE NameLike)
  ORDER BY Priority;

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
            return Response.json(
              {
                ok: false,
                error: `No customer map for host ${hostName}. Map the RMM device / org first, then retry.`,
              },
              { status: 422 },
            );
          }
          await pool.request().query(`
IF OBJECT_ID(N'dbo.Agent_DiskIops', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_DiskIops (
    SnapshotUtc    datetime2(0)  NOT NULL,
    CustomerCode   nvarchar(32)  NOT NULL,
    HostName       nvarchar(128) NOT NULL,
    DriveLetter    nvarchar(16)  NOT NULL,
    TotalGb        decimal(18,2) NULL,
    FreeGb         decimal(18,2) NULL,
    UsedPct        decimal(6,2)  NULL,
    MediaType      nvarchar(40)  NULL,
    ReadIops       decimal(18,2) NULL,
    WriteIops      decimal(18,2) NULL,
    TotalIops      decimal(18,2) NULL,
    QueueLen       decimal(18,2) NULL,
    ReadLatencyMs  decimal(18,2) NULL,
    WriteLatencyMs decimal(18,2) NULL,
    SampleSec      decimal(6,2)  NULL,
    Source         nvarchar(40)  NULL,
    ImportedAt     datetime2(3)  NOT NULL CONSTRAINT DF_Agent_DiskIops_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Agent_DiskIops PRIMARY KEY (SnapshotUtc, CustomerCode, HostName, DriveLetter)
  );
END
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'TotalGb') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD TotalGb decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'FreeGb') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD FreeGb decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'UsedPct') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD UsedPct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'MediaType') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD MediaType nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'ReadIops') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD ReadIops decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'WriteIops') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD WriteIops decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'TotalIops') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD TotalIops decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'QueueLen') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD QueueLen decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'ReadLatencyMs') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD ReadLatencyMs decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'WriteLatencyMs') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD WriteLatencyMs decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'SampleSec') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD SampleSec decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'Source') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD Source nvarchar(40) NULL;
`);
          const source = str(body.source ?? "pulseway", 40) || "pulseway";
          const snap = new Date();
          snap.setMilliseconds(0);
          let n = 0;
          const dec = (p: number, s: number, v: number | null) =>
            v == null ? null : Number(Number(v).toFixed(s));
          for (const v of volumesRaw) {
            const letter = str(v.driveLetter ?? v.letter, 16).toUpperCase();
            if (!letter) continue;
            const read = num(v.readIops);
            const write = num(v.writeIops);
            let total = num(v.totalIops);
            if (total == null && (read != null || write != null)) total = (read ?? 0) + (write ?? 0);
            const req = pool.request();
            req.input("snap", sql.DateTime2, snap);
            req.input("c", sql.NVarChar(32), customerCode);
            req.input("h", sql.NVarChar(128), hostName);
            req.input("l", sql.NVarChar(16), letter);
            req.input("tot", sql.Float, dec(18, 2, num(v.totalGb)));
            req.input("free", sql.Float, dec(18, 2, num(v.freeGb)));
            req.input("used", sql.Float, dec(6, 2, num(v.usedPct)));
            req.input("media", sql.NVarChar(40), str(v.mediaType, 40) || null);
            req.input("r", sql.Float, dec(18, 2, read));
            req.input("w", sql.Float, dec(18, 2, write));
            req.input("t", sql.Float, dec(18, 2, total));
            req.input("q", sql.Float, dec(18, 2, num(v.queueLen)));
            req.input("lr", sql.Float, dec(18, 2, num(v.readLatencyMs)));
            req.input("lw", sql.Float, dec(18, 2, num(v.writeLatencyMs)));
            req.input("sec", sql.Float, dec(6, 2, sampleSec));
            req.input("src", sql.NVarChar(40), source);
            await req.query(`
MERGE dbo.Agent_DiskIops AS tgt
USING (SELECT @snap SnapshotUtc, @c CustomerCode, @h HostName, @l DriveLetter) AS src
ON tgt.SnapshotUtc = src.SnapshotUtc AND tgt.CustomerCode = src.CustomerCode
 AND tgt.HostName = src.HostName AND tgt.DriveLetter = src.DriveLetter
WHEN MATCHED THEN UPDATE SET
  TotalGb=@tot, FreeGb=@free, UsedPct=@used, MediaType=@media,
  ReadIops=@r, WriteIops=@w, TotalIops=@t, QueueLen=@q,
  ReadLatencyMs=@lr, WriteLatencyMs=@lw, SampleSec=@sec, Source=@src, ImportedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (
  SnapshotUtc, CustomerCode, HostName, DriveLetter,
  TotalGb, FreeGb, UsedPct, MediaType, ReadIops, WriteIops, TotalIops, QueueLen,
  ReadLatencyMs, WriteLatencyMs, SampleSec, Source
) VALUES (
  @snap, @c, @h, @l, @tot, @free, @used, @media, @r, @w, @t, @q, @lr, @lw, @sec, @src
);`);
            n++;
          }
          await pool.request().query(`
DELETE FROM dbo.Agent_DiskIops WHERE SnapshotUtc < DATEADD(day, -14, SYSUTCDATETIME());`);
          return Response.json({
            ok: true,
            customerCode,
            hostName,
            volumes: n,
            source,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
