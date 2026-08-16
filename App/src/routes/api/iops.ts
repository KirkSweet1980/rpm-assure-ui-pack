import { createFileRoute } from "@tanstack/react-router";
import sql from "mssql";
import { getPool } from "@/lib/data/sql-pool";

/**
 * Pulseway Automation (and Edge Agent) POST disk performance counters here.
 * Pulseway REST v3 does not return script output or custom-field values —
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

function pickSecret(request: Request): string {
  return (
    request.headers.get("x-assure-secret") ||
    request.headers.get("x-pulseway-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

function expectedSecret(): string {
  return (
    process.env.RPM_ASSURE_IOPS_SECRET ||
    process.env.PULSEWAY_WEBHOOK_SECRET ||
    process.env.RPM_ASSURE_INGEST_SECRET ||
    ""
  );
}

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
          accept: "POST disk performance counters from Pulseway Automation",
          path: "/api/iops",
        }),
      POST: async ({ request }) => {
        const want = expectedSecret();
        if (!want) {
          return Response.json(
            { ok: false, error: "Ingest secret not configured on Assure (RPM_ASSURE_IOPS_SECRET or PULSEWAY_WEBHOOK_SECRET)." },
            { status: 503 },
          );
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
IF @org IS NOT NULL AND OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
  WHERE Active = 1 AND LTRIM(RTRIM(OrganizationName)) = LTRIM(RTRIM(@org));
IF @code IS NULL AND OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NOT NULL
  SELECT TOP 1 @code = d.CustomerCode
  FROM dbo.Pulseway_Devices d WITH (NOLOCK)
  WHERE d.CustomerCode IS NOT NULL AND LTRIM(RTRIM(d.CustomerCode)) <> N''
    AND (
      UPPER(LTRIM(RTRIM(d.Name))) = UPPER(@h)
      OR UPPER(LTRIM(RTRIM(d.DeviceId))) = UPPER(@h)
    )
  ORDER BY d.SnapshotDate DESC;
IF @code IS NULL AND OBJECT_ID(N'dbo.Dim_Pulseway_NameMap', N'U') IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.Dim_Pulseway_NameMap WITH (NOLOCK)
  WHERE Active = 1 AND @h LIKE NameLike
  ORDER BY Priority;
IF @code IS NULL AND OBJECT_ID(N'dbo.Agent_Registry', N'U') IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.Agent_Registry WITH (NOLOCK)
  WHERE UPPER(LTRIM(RTRIM(HostName))) = UPPER(@h)
  ORDER BY LastHeartbeatUtc DESC;
SELECT @code AS CustomerCode;`);
            customerCode = str((mapped.recordset?.[0] as { CustomerCode?: string } | undefined)?.CustomerCode, 32).toUpperCase();
          }
          if (!customerCode) {
            return Response.json(
              {
                ok: false,
                error: `No customer map for host ${hostName}. Map the Pulseway device / org first, then retry.`,
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
    ImportedAt     datetime2(3)  NOT NULL CONSTRAINT DF_Agent_DiskIops_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Agent_DiskIops PRIMARY KEY (SnapshotUtc, CustomerCode, HostName, DriveLetter)
  );
END`);
          const snap = new Date();
          snap.setMilliseconds(0);
          let n = 0;
          for (const v of volumesRaw) {
            const letter = str(v.driveLetter ?? v.letter, 16).toUpperCase();
            if (!letter) continue;
            const read = num(v.readIops);
            const write = num(v.writeIops);
            let total = num(v.totalIops);
            if (total == null && (read != null || write != null)) total = (read ?? 0) + (write ?? 0);
            await pool
              .request()
              .input("snap", sql.DateTime2, snap)
              .input("c", sql.NVarChar(32), customerCode)
              .input("h", sql.NVarChar(128), hostName)
              .input("l", sql.NVarChar(16), letter)
              .input("tot", sql.Decimal(18, 2), num(v.totalGb))
              .input("free", sql.Decimal(18, 2), num(v.freeGb))
              .input("used", sql.Decimal(6, 2), num(v.usedPct))
              .input("media", sql.NVarChar(40), str(v.mediaType, 40) || null)
              .input("r", sql.Decimal(18, 2), read)
              .input("w", sql.Decimal(18, 2), write)
              .input("t", sql.Decimal(18, 2), total)
              .input("q", sql.Decimal(18, 2), num(v.queueLen))
              .input("lr", sql.Decimal(18, 2), num(v.readLatencyMs))
              .input("lw", sql.Decimal(18, 2), num(v.writeLatencyMs))
              .input("sec", sql.Decimal(6, 2), sampleSec)
              .query(`
MERGE dbo.Agent_DiskIops AS tgt
USING (SELECT @snap SnapshotUtc, @c CustomerCode, @h HostName, @l DriveLetter) AS src
ON tgt.SnapshotUtc = src.SnapshotUtc AND tgt.CustomerCode = src.CustomerCode
 AND tgt.HostName = src.HostName AND tgt.DriveLetter = src.DriveLetter
WHEN MATCHED THEN UPDATE SET
  TotalGb=@tot, FreeGb=@free, UsedPct=@used, MediaType=@media,
  ReadIops=@r, WriteIops=@w, TotalIops=@t, QueueLen=@q,
  ReadLatencyMs=@lr, WriteLatencyMs=@lw, SampleSec=@sec, ImportedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (
  SnapshotUtc, CustomerCode, HostName, DriveLetter,
  TotalGb, FreeGb, UsedPct, MediaType, ReadIops, WriteIops, TotalIops, QueueLen,
  ReadLatencyMs, WriteLatencyMs, SampleSec
) VALUES (
  @snap, @c, @h, @l, @tot, @free, @used, @media, @r, @w, @t, @q, @lr, @lw, @sec
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
            source: str(body.source ?? "pulseway", 40),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
