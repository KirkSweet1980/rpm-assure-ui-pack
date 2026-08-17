import { createFileRoute } from "@tanstack/react-router";
import sql from "mssql";
import { getPool } from "@/lib/data/sql-pool";
import { authorizeIngest, ingestConfigured } from "@/lib/security/ingest-secret";

/**
 * Pulseway Automation POSTs named Windows updates here.
 * Pulseway REST v3 only has Critical/Important counts — titles come from the endpoint.
 *
 *   POST https://assure.rpmresources.co.za/api/patches
 *   Header: X-Assure-Secret: <RPM_ASSURE_IOPS_SECRET>
 */

type PatchIn = {
  title?: string;
  kb?: string | null;
  status?: string;
  classification?: string | null;
  installedAt?: string | null;
};

function str(v: unknown, max = 128): string {
  return String(v ?? "").trim().slice(0, max);
}

export const Route = createFileRoute("/api/patches")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          accept: "POST named Windows updates from Pulseway Automation",
          path: "/api/patches",
        }),
      POST: async ({ request }) => {
        if (!ingestConfigured("iops")) {
          return Response.json({ ok: false, error: "Ingest secret not configured." }, { status: 503 });
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
        if (!hostName) return Response.json({ ok: false, error: "hostName required" }, { status: 400 });
        const patchesRaw = Array.isArray(body.patches) ? (body.patches as PatchIn[]) : [];
        if (!patchesRaw.length) {
          return Response.json({ ok: false, error: "patches[] required" }, { status: 400 });
        }
        const pool = await getPool();
        if (!pool) return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });

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
IF @org IS NOT NULL AND OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
  WHERE Active = 1 AND LTRIM(RTRIM(OrganizationName)) = LTRIM(RTRIM(@org));
IF @code IS NULL AND OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NOT NULL
  SELECT TOP 1 @code = d.CustomerCode
  FROM dbo.Pulseway_Devices d WITH (NOLOCK)
  WHERE d.CustomerCode IS NOT NULL AND LTRIM(RTRIM(d.CustomerCode)) <> N''
    AND (UPPER(LTRIM(RTRIM(d.Name))) = UPPER(@h) OR UPPER(LTRIM(RTRIM(d.Name))) = @short)
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
          if (!customerCode) {
            return Response.json({ ok: false, error: `No customer map for host ${hostName}` }, { status: 422 });
          }

          const idRow = await pool
            .request()
            .input("h", sql.NVarChar(128), hostName)
            .query(`
SELECT TOP 1 DeviceId
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(Name))) = UPPER(LTRIM(RTRIM(@h)))
   OR UPPER(LTRIM(RTRIM(Name))) = UPPER(LEFT(@h, CHARINDEX(N'.', @h + N'.') - 1))
ORDER BY SnapshotDate DESC;`);
          const deviceId = str((idRow.recordset?.[0] as { DeviceId?: string } | undefined)?.DeviceId, 80) || hostName;

          const exists = await pool.request().query(`
SELECT CASE WHEN OBJECT_ID(N'dbo.Pulseway_DevicePatches', N'U') IS NULL THEN 0 ELSE 1 END AS Ok;`);
          if (!Number((exists.recordset?.[0] as { Ok?: number })?.Ok)) {
            return Response.json({ ok: false, error: "Pulseway_DevicePatches missing — run 462 as sysadmin." }, { status: 503 });
          }

          await pool
            .request()
            .input("did", sql.NVarChar(80), deviceId)
            .input("h", sql.NVarChar(200), hostName)
            .query(`
DELETE FROM dbo.Pulseway_DevicePatches
WHERE SnapshotDate = CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS date)
  AND (DeviceId = @did OR DeviceId = @h OR DeviceName = @h);`);

          let n = 0;
          const seen = new Set<string>();
          for (const p of patchesRaw) {
            const title = str(p.title, 390);
            if (!title) continue;
            const key = title.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            let status = str(p.status, 40).toLowerCase() || "unknown";
            if (!["installed", "missing", "pending", "unknown"].includes(status)) status = "unknown";
            let installed: Date | null = null;
            if (p.installedAt) {
              const d = new Date(String(p.installedAt));
              if (!Number.isNaN(d.getTime())) installed = d;
            }
            const req = pool.request();
            req.input("did", sql.NVarChar(80), deviceId);
            req.input("title", sql.NVarChar(400), title);
            req.input("kb", sql.NVarChar(40), str(p.kb, 40) || null);
            req.input("st", sql.NVarChar(40), status);
            req.input("when", sql.DateTime2, installed);
            req.input("cls", sql.NVarChar(80), str(p.classification, 80) || null);
            req.input("c", sql.NVarChar(50), customerCode);
            req.input("nm", sql.NVarChar(200), hostName);
            await req.query(`
INSERT INTO dbo.Pulseway_DevicePatches
  (SnapshotDate, DeviceId, Title, KbArticle, Status, InstalledUtc, Classification, CustomerCode, DeviceName)
VALUES (
  CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS date),
  @did, @title, @kb, @st, @when, @cls, @c, @nm
);`);
            n++;
            if (n >= 200) break;
          }
          return Response.json({ ok: true, customerCode, hostName, deviceId, patches: n });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
