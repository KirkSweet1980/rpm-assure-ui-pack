import { createFileRoute } from "@tanstack/react-router";
import { getPool } from "@/lib/data/sql-pool";
import { authorizeIngest, ingestConfigured } from "@/lib/security/ingest-secret";

const FORBIDDEN =
  /\b(DROP\s+DATABASE|DROP\s+LOGIN|DROP\s+USER|TRUNCATE\s+TABLE|SHUTDOWN|RECONFIGURE|XP_|SP_CONFIGURE|OPENROWSET|OPENDATASOURCE|BULK\s+INSERT|INTO\s+OUTFILE|sp_executesql|EXECUTE\s*\(|EXEC\s*\(|;\s*EXEC\b)/i;

const TABLE_OP =
  /(?:\bINTO\b|\bFROM\b|\bUPDATE\b|\bTABLE\b|\bJOIN\b|\bMERGE\b)\s+(?:\[?dbo\]?\.)?\[?([A-Za-z_][A-Za-z0-9_]*)\]?/gi;

const ALLOWED_TABLE = /^(Syspro_|Agent_|Dim_FinSight_|Dim_Customer|Dim_Customer_AmsConfig|Dim_Connection|Fact_Incident)/i;

function str(v: unknown, max = 64): string {
  return String(v ?? "").trim().slice(0, max);
}

function sqlAllowed(sqlText: string): string | null {
  if (!sqlText || sqlText.length > 1_500_000) return "sql too large or empty";
  if (FORBIDDEN.test(sqlText)) return "forbidden keyword";
  let m: RegExpExecArray | null;
  TABLE_OP.lastIndex = 0;
  while ((m = TABLE_OP.exec(sqlText))) {
    const name = m[1] || "";
    if (/^(sys|INFORMATION_SCHEMA)$/i.test(name)) continue;
    if (ALLOWED_TABLE.test(name)) continue;
    if (/^(DB_NAME|SUSER_SNAME)$/i.test(name)) continue;
    return `table not allowed: ${name}`;
  }
  return null;
}

function formatTsv(rows: Record<string, unknown>[]): string {
  return rows
    .map((row) =>
      Object.values(row)
        .map((v) => (v == null ? "" : String(v)))
        .join("|"),
    )
    .join("\n");
}

export const Route = createFileRoute("/api/agent/sql")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          accept: "POST allowlisted SYSPRO/Agent SQL over HTTPS so 14333 can stay closed",
          path: "/api/agent/sql",
        }),
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
        const statements = Array.isArray(body.statements)
          ? (body.statements as unknown[]).map((s) => String(s ?? "").trim()).filter(Boolean)
          : [];
        const one = String(body.sql ?? body.SqlText ?? "").trim();
        const batches = statements.length ? statements : one ? [one] : [];
        if (!batches.length) return Response.json({ ok: false, error: "sql required" }, { status: 400 });
        const joined = batches.join("\n");
        const deny = sqlAllowed(joined);
        if (deny) return Response.json({ ok: false, error: deny }, { status: 400 });

        const pool = await getPool();
        if (!pool) return Response.json({ ok: false, error: "sql unavailable" }, { status: 503 });
        const tsv = Boolean(body.tsv ?? body.Tsv);
        const customerCode = str(body.customerCode ?? body.CustomerCode, 32).toUpperCase();
        const hostName = str(body.hostName ?? body.HostName, 128);
        let text = "";
        try {
          for (const batch of batches) {
            const parts = batch.split(/^\s*GO\s*$/im).map((p) => p.trim()).filter(Boolean);
            for (const part of parts) {
              const rs = await pool.request().query(part);
              if (tsv && rs.recordset?.length) text = formatTsv(rs.recordset as Record<string, unknown>[]);
            }
          }
          return Response.json({
            ok: true,
            via: "https",
            exitCode: 0,
            text,
            customerCode: customerCode || undefined,
            hostName: hostName || undefined,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: msg, exitCode: 1, text: msg }, { status: 500 });
        }
      },
    },
  },
});
