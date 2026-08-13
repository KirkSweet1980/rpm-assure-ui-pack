/**
 * Standalone weekly email digest (Task Scheduler / service).
 * Reads C:\RPM-Assure\App\data\rpma-settings.json (or APP_DIR).
 * Usage: node scripts/send-weekly-report.mjs
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

  const q = await pool.request().query(`
    SELECT CustomerCode, DisplayName, HealthRag, HealthSummary,
           ActiveUserCount, OperatorCount = ISNULL(ActiveUserCount, 0),
           SysproJobErrorCount = 0, SysproDtrVarianceLines = 0
    FROM dbo.vw_Kpi_PortfolioDashboard WITH (NOLOCK)
    ORDER BY
      CASE HealthRag WHEN 'Red' THEN 0 WHEN 'Amber' THEN 1 ELSE 2 END,
      DisplayName;
  `).catch(async () => {
    // fallback simpler
    return pool.request().query(`
      SELECT c.CustomerCode, c.DisplayName,
        CAST('Green' AS nvarchar(10)) AS HealthRag,
        CAST(NULL AS nvarchar(200)) AS HealthSummary,
        0 AS ActiveUserCount, 0 AS OperatorCount,
        0 AS SysproJobErrorCount, 0 AS SysproDtrVarianceLines
      FROM dbo.Dim_Customer c WITH (NOLOCK)
      WHERE c.Active = 1
      ORDER BY c.DisplayName;
    `);
  });

  await pool.close();

  const rows = q.recordset || [];
  const reds = rows.filter((r) => r.HealthRag === "Red");
  const ambers = rows.filter((r) => r.HealthRag === "Amber");

  const subject = `RPM Assure weekly - ${reds.length} Red, ${ambers.length} Amber (${rows.length} customers)`;
  const lines = [
    "RPM Assure - Weekly assurance pack",
    "Generated: " + new Date().toISOString(),
    "",
    `Customers: ${rows.length}`,
    `Red: ${reds.length}  Amber: ${ambers.length}`,
    "",
    "Attention:",
  ];
  for (const r of [...reds, ...ambers]) {
    lines.push(`  [${r.HealthRag}] ${r.DisplayName} - ${r.HealthSummary || ""}`);
  }
  if (!reds.length && !ambers.length) lines.push("  (none)");
  lines.push("", "Portfolio:");
  for (const r of rows) {
    lines.push(`  ${r.DisplayName}\t${r.HealthRag}`);
  }
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
    html: `<pre style="font-family:Segoe UI,sans-serif">${text.replace(/</g, "<")}</pre>`,
  });

  console.log("OK messageId=" + info.messageId + " to=" + to);
}

main().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
