import { createFileRoute } from "@tanstack/react-router";
import sql from "mssql";
import { getPool } from "@/lib/data/sql-pool";
import { authorizeIngest, ingestConfigured } from "@/lib/security/ingest-secret";

function str(v: unknown, max = 128): string {
  return String(v ?? "").trim().slice(0, max);
}

function bit(v: unknown): number {
  if (v === true || v === 1 || v === "1" || /^y|yes|true$/i.test(String(v ?? ""))) return 1;
  return 0;
}

export const Route = createFileRoute("/api/agent/onboard")({
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
        const code = str(url.searchParams.get("customerCode"), 32).toUpperCase();
        if (!code) return Response.json({ ok: false, error: "customerCode required" }, { status: 400 });
        const pool = await getPool();
        if (!pool) return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });
        const r = await pool
          .request()
          .input("c", sql.NVarChar(32), code)
          .query(`
SELECT TOP 1 c.CustomerCode, c.DisplayName, c.Active,
       a.PillarSyspro, a.PillarPulseway, a.PillarCove, a.PillarBitdefender, a.PillarCsp, a.PillarMicrosoftCsp
FROM dbo.Dim_Customer c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = @c`);
        const row = r.recordset?.[0] as Record<string, unknown> | undefined;
        if (!row) return Response.json({ ok: true, exists: false, customerCode: code });
        return Response.json({
          ok: true,
          exists: true,
          customerCode: row.CustomerCode,
          displayName: row.DisplayName,
          active: Boolean(row.Active),
          pillars: {
            syspro: Boolean(row.PillarSyspro),
            rmm: Boolean(row.PillarPulseway),
            cove: Boolean(row.PillarCove),
            epp: Boolean(row.PillarBitdefender),
            csp: Boolean(row.PillarCsp ?? row.PillarMicrosoftCsp),
            tickets: true,
          },
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
        const customerCode = str(body.customerCode ?? body.CustomerCode, 32).toUpperCase();
        const displayName = str(body.displayName ?? body.DisplayName, 200) || customerCode;
        const hostName = str(body.hostName ?? body.HostName, 128);
        if (!customerCode) {
          return Response.json({ ok: false, error: "customerCode required" }, { status: 400 });
        }
        const syspro = bit(body.syspro ?? body.PillarSyspro);
        const rmm = bit(body.rmm ?? body.PillarPulseway);
        const cove = bit(body.cove ?? body.PillarCove);
        const epp = bit(body.epp ?? body.PillarBitdefender);
        const csp = bit(body.csp ?? body.PillarCsp);
        const pool = await getPool();
        if (!pool) return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });
        const existed = (
          await pool
            .request()
            .input("c", sql.NVarChar(32), customerCode)
            .query(`SELECT 1 AS n FROM dbo.Dim_Customer WITH (NOLOCK) WHERE CustomerCode = @c`)
        ).recordset?.[0];
        await pool
          .request()
          .input("c", sql.NVarChar(32), customerCode)
          .input("n", sql.NVarChar(200), displayName)
          .input("h", sql.NVarChar(128), hostName || null)
          .input("sys", sql.Bit, syspro)
          .input("rmm", sql.Bit, rmm)
          .input("cove", sql.Bit, cove)
          .input("epp", sql.Bit, epp)
          .input("csp", sql.Bit, csp)
          .query(`
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @c)
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, Notes, CreatedAt, UpdatedAt)
  VALUES (@c, @n, 1, @h, N'created by agent onboard', SYSUTCDATETIME(), SYSUTCDATETIME());
ELSE
  UPDATE dbo.Dim_Customer
    SET DisplayName = CASE WHEN DisplayName IS NULL OR DisplayName = CustomerCode THEN @n ELSE DisplayName END,
        Active = 1,
        SqlInstanceName = COALESCE(SqlInstanceName, @h),
        UpdatedAt = SYSUTCDATETIME()
  WHERE CustomerCode = @c;

IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = @c)
  UPDATE dbo.Dim_Customer_AmsConfig
    SET AmsEnabled = 1,
        PillarSyspro = @sys,
        PillarPulseway = @rmm,
        PillarCove = @cove,
        PillarBitdefender = @epp,
        PillarCsp = @csp,
        PillarMicrosoftCsp = @csp,
        UpdatedAt = SYSUTCDATETIME(),
        UpdatedBy = N'agent-onboard'
  WHERE CustomerCode = @c;
ELSE
  INSERT INTO dbo.Dim_Customer_AmsConfig
    (CustomerCode, AmsEnabled, PillarSyspro, PillarPulseway, PillarCove, PillarBitdefender, PillarCsp, PillarMicrosoftCsp, UpdatedAt, UpdatedBy)
  VALUES (@c, 1, @sys, @rmm, @cove, @epp, @csp, @csp, SYSUTCDATETIME(), N'agent-onboard');
`);
        return Response.json({
          ok: true,
          created: !existed,
          customerCode,
          displayName,
          hostName,
          pillars: { syspro: Boolean(syspro), rmm: Boolean(rmm), cove: Boolean(cove), epp: Boolean(epp), csp: Boolean(csp), tickets: true },
        });
      },
    },
  },
});
