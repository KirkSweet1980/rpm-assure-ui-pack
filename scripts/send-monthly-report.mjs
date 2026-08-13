/**
 * Monthly board pack email (estate summary).
 * Task Scheduler: 1st of month 07:15 local.
 * Usage: node scripts/send-monthly-report.mjs
 * Env: RPM_ASSURE_APP=C:\RPM-Assure\App  RPM_ASSURE_REPORT_TO=override@x.com
 */
import fs from "node:fs";
import path from "node:path";
import sql from "mssql";
import nodemailer from "nodemailer";

const appDir = process.env.RPM_ASSURE_APP || process.cwd();
const settingsPath =
  process.env.RPM_ASSURE_SETTINGS ||
  path.join(appDir, "data", "rpma-settings.json");

function loadSettings() {
  if (!fs.existsSync(settingsPath)) {
    throw new Error("Missing settings: " + settingsPath);
  }
  return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
}

function pickSql(settings) {
  const list = settings.sqlConnections || [];
  const primary = list.find((c) => c.isPrimary) || list[0];
  if (!primary) throw new Error("No SQL connection in settings");
  return {
    server: primary.server,
    port: primary.port || 14333,
    database: primary.database || "RPMAssure_App",
    user: primary.user,
    password: primary.password,
    options: {
      encrypt: Boolean(primary.encrypt),
      trustServerCertificate: primary.trustServerCertificate !== false,
    },
  };
}

async function main() {
  const settings = loadSettings();
  const smtp = settings.smtp || {};
  if (!smtp.enabled) throw new Error("SMTP disabled in settings");
  if (!smtp.host) throw new Error("SMTP host empty");

  const sqlCfg = pickSql(settings);
  const pool = await sql.connect(sqlCfg);

  const customers = await pool.request().query(`
    SELECT CustomerCode, DisplayName, SqlInstanceName
    FROM dbo.Dim_Customer WITH (NOLOCK)
    WHERE Active = 1
    ORDER BY DisplayName;
  `);

  let risks = { recordset: [] };
  try {
    risks = await pool.request().query(`
      SELECT CustomerCode, Title, Rag, Status, OwnerName, TargetDate
      FROM dbo.Fact_Risk WITH (NOLOCK)
      WHERE Status NOT IN (N'Closed', N'Resolved', N'Cancelled')
      ORDER BY CASE Rag WHEN N'Red' THEN 0 WHEN N'Amber' THEN 1 ELSE 2 END, TargetDate;
    `);
  } catch {
    /* optional */
  }

  let pri = { recordset: [] };
  try {
    pri = await pool.request().query(`
      SELECT CustomerCode, Title, Status, SortOrder, PeriodLabel
      FROM dbo.Fact_Priority WITH (NOLOCK)
      WHERE Status = N'Active'
      ORDER BY CustomerCode, SortOrder;
    `);
  } catch {
    /* optional */
  }

  let sla = { recordset: [] };
  try {
    sla = await pool.request().query(`
      ;WITH x AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY CustomerCode ORDER BY PeriodTo DESC, AsOfAt DESC) rn
        FROM dbo.Fact_DashboardSnapshot WITH (NOLOCK)
      )
      SELECT CustomerCode, PeriodLabel, AvailabilityPct, SlaCompliancePct, SlaResponsePct, SlaResolvePct
      FROM x WHERE rn = 1;
    `);
  } catch {
    /* optional */
  }

  await pool.close();

  const month = new Date().toLocaleString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
  const rows = customers.recordset || [];
  const riskRows = risks.recordset || [];
  const priRows = pri.recordset || [];
  const slaMap = new Map((sla.recordset || []).map((r) => [r.CustomerCode, r]));

  const subject = `RPM Assure monthly board pack — ${month} (${rows.length} customers)`;
  const lines = [
    "RPM Assure — Monthly board pack (estate)",
    "Period: " + month,
    "Generated: " + new Date().toISOString(),
    "",
    "=== Customers ===",
  ];
  for (const c of rows) {
    const s = slaMap.get(c.CustomerCode);
    lines.push(
      `  ${c.DisplayName} (${c.CustomerCode})  instance=${c.SqlInstanceName || "—"}` +
        (s
          ? `  avail=${s.AvailabilityPct ?? "—"}  sla=${s.SlaCompliancePct ?? "—"}`
          : "  sla=n/a"),
    );
  }
  lines.push("", "=== Open risks ===");
  if (!riskRows.length) lines.push("  (none)");
  for (const r of riskRows.slice(0, 40)) {
    lines.push(`  [${r.Rag}] ${r.CustomerCode}: ${r.Title} — ${r.OwnerName || ""}`);
  }
  lines.push("", "=== Active priorities ===");
  if (!priRows.length) lines.push("  (none)");
  for (const p of priRows.slice(0, 40)) {
    lines.push(`  ${p.CustomerCode}: ${p.Title}`);
  }
  lines.push(
    "",
    "Full per-customer AMS HTML packs: open Reports in RPM Assure (ams-monthly).",
    "Replace seed narratives with real ExCo notes before board circulation.",
  );
  const text = lines.join("\n");

  const to =
    process.env.RPM_ASSURE_REPORT_TO ||
    smtp.reportTo ||
    smtp.fromEmail;
  if (!to) throw new Error("No report recipients");

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: Boolean(smtp.secure),
    auth: smtp.user ? { user: smtp.user, pass: smtp.password || "" } : undefined,
  });

  const info = await transporter.sendMail({
    from: smtp.fromName
      ? `"${smtp.fromName}" <${smtp.fromEmail}>`
      : smtp.fromEmail,
    replyTo: smtp.replyTo || undefined,
    to: String(to)
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", "),
    subject,
    text,
    html: `<pre style="font-family:Segoe UI,sans-serif;white-space:pre-wrap">${text
      .replace(/&/g, "&")
      .replace(/</g, "<")}</pre>`,
  });

  console.log("OK messageId=" + info.messageId + " to=" + to);
}

main().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
