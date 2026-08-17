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

export const Route = createFileRoute("/api/agent/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const want = expectedSecret();
        if (!want) return Response.json({ ok: false, error: "Agent secret not configured" }, { status: 503 });
        if (pickSecret(request).trim() !== want) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
        const url = new URL(request.url);
        const hostName = (url.searchParams.get("hostName") || "").trim();
        if (!hostName) return Response.json({ ok: false, error: "hostName required" }, { status: 400 });
        const pool = await getPool();
        if (!pool) return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });
        const rs = await pool
          .request()
          .input("h", sql.NVarChar(128), hostName)
          .query(`
SELECT CustomerCode, LastStatus, LastMessage, RequestSyncUtc
FROM dbo.Agent_Registry WITH (NOLOCK)
WHERE HostName = @h`);
        const rows = (rs.recordset || []) as Array<{
          CustomerCode?: string;
          LastStatus?: string;
          LastMessage?: string;
          RequestSyncUtc?: Date;
        }>;
        const sync = rows.filter((r) => {
          const s = String(r.LastStatus ?? "");
          const m = String(r.LastMessage ?? "");
          return s === "QUEUED" || s === "SYNCING" || /^sync requested/i.test(m) || /^recheck/i.test(m);
        });
        const upd = rows.filter((r) => {
          const s = String(r.LastStatus ?? "");
          const m = String(r.LastMessage ?? "");
          return s === "UPDATE" || s === "UPDATING" || /^update requested/i.test(m);
        });
        return Response.json({
          ok: true,
          hostName,
          requestSync: sync.map((r) => String(r.CustomerCode ?? "")),
          requestUpdate: upd.length > 0,
          via: "https",
        });
      },
    },
  },
});
