import { createFileRoute } from "@tanstack/react-router";
import sql from "mssql";
import { getPool } from "@/lib/data/sql-pool";

/**
 * Pulseway notification webhook (push).
 * Configure in Pulseway → Notifications → Webhooks:
 *   URL: https://<assure-host>/api/pulseway/webhook
 *   Header: X-Assure-Secret: <same as PULSEWAY_WEBHOOK_SECRET>
 */
export const Route = createFileRoute("/api/pulseway/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PULSEWAY_WEBHOOK_SECRET ?? "";
        if (secret) {
          const got =
            request.headers.get("x-assure-secret") ||
            request.headers.get("x-pulseway-secret") ||
            "";
          if (got !== secret) {
            return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
          }
        }
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
        }
        const pool = await getPool();
        if (!pool) {
          return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });
        }
        const pick = (...keys: string[]) => {
          for (const k of keys) {
            const v = body[k];
            if (v != null && String(v).trim() !== "") return String(v);
          }
          return null;
        };
        const nid =
          pick("Id", "NotificationId", "id", "notificationId") ??
          `wh-${Date.now()}`;
        const deviceId = pick("DeviceId", "InstanceId", "device_id", "deviceId");
        const deviceName = pick("DeviceName", "ComputerName", "device_name");
        const severity = pick("Priority", "Severity", "priority", "severity") ?? "Normal";
        const title = (pick("Message", "Title", "Subject", "title") ?? "Pulseway alert").slice(0, 300);
        const message = pick("Details", "Body", "Text", "details");
        const org = pick("OrganizationName", "Organization", "organization_name");
        try {
          await pool.request()
            .input("nid", sql.NVarChar(100), nid)
            .input("did", sql.NVarChar(100), deviceId)
            .input("dname", sql.NVarChar(200), deviceName)
            .input("sev", sql.NVarChar(40), severity)
            .input("title", sql.NVarChar(300), title)
            .input("msg", sql.NVarChar(sql.MAX), message)
            .input("org", sql.NVarChar(200), org)
            .query(`
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Pulseway_Notifications', N'U') IS NULL RETURN;
DECLARE @snap date = CAST(SYSUTCDATETIME() AS date);
DECLARE @code nvarchar(50) = NULL;
IF @org IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
  WHERE Active = 1 AND LTRIM(RTRIM(OrganizationName)) = LTRIM(RTRIM(@org));
IF @code IS NULL AND @dname IS NOT NULL AND OBJECT_ID(N'dbo.Dim_Pulseway_NameMap', N'U') IS NOT NULL
  SELECT TOP 1 @code = CustomerCode FROM dbo.Dim_Pulseway_NameMap WITH (NOLOCK)
  WHERE Active = 1 AND @dname LIKE NameLike
  ORDER BY Priority;
INSERT INTO dbo.Pulseway_Notifications (
  SnapshotDate, NotificationId, CustomerCode, DeviceId, DeviceName,
  Severity, Title, Message, RaisedAt, IsActive, OrganizationName, ImportedAt
) VALUES (
  @snap, @nid, @code, @did, @dname,
  @sev, @title, @msg, SYSUTCDATETIME(), 1, @org, SYSUTCDATETIME()
);`);
          return Response.json({ ok: true, notificationId: nid });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
