import { createServerFn } from "@tanstack/react-start";
import sql from "mssql";
import { getPool, getLastPoolError, sql as sqlTypes } from "@/lib/data/sql-pool";
import { getDataMode, hasSqlConfig, sqlConfigDebug } from "@/lib/data/sql-config";
import {
  applyPasswordKeep,
  maskPassword,
  readSettingsFile,
  writeSettingsFile,
  syncPrimarySqlToEnvLocal,
  getSmtpConfig,
  getRagConfig,
  getAlertConfig,
  getDashboardConfig,
  getUiLabels,
} from "./settings-store";
import {
  DEFAULT_ALERTS,
  DEFAULT_DASHBOARD,
  DEFAULT_UI_LABELS,
  DEFAULT_RAG,
  DEFAULT_SMTP,
  DEFAULT_SSL,
  emptySqlConnection,
  type AlertRulesConfig,
  type DashboardConfig,
  type UiLabelsConfig,
  type RagThresholdConfig,
  type SmtpConfig,
  type SqlConnectionConfig,
  type SslConfig,
} from "./types";
import { appendAdminAudit, readAdminAudit } from "./admin-audit";
import { type StaffRole, isStaffRole } from "@/lib/auth/roles";
import { sendMailWithSmtp } from "@/lib/mail/send";
import { sendWeeklyReportEmail } from "@/lib/mail/weekly-report";
import {
  buildApplicationsAmsHtml,
  buildDayEndFinSightHtml,
  buildMonthlyAmsPackHtml,
  buildPeriodEndFinSightHtml,
  buildPortfolioAmsHtml,
} from "@/lib/mail/ams-report-html";
import { fetchLiveCustomerDetail, fetchLivePortfolio } from "@/lib/data/live-portfolio";
import { getDemoCustomerDetail, getDemoPortfolio } from "@/lib/data/demo-portfolio";
import { fillCustomerPanels } from "@/lib/data/fill-customer-panels";
import { healthFor } from "@/lib/data/health-rag";
import { suggestRagFromSamples } from "@/lib/data/rag-tune";
import { cacheInvalidate } from "@/lib/data/query-cache";

function publicSql(c: SqlConnectionConfig): SqlConnectionConfig {
  // Never send real password or mask string to the client (mask confuses save)
  return {
    ...c,
    password: "",
    passwordConfigured: Boolean(c.password && c.password.length > 0),
  };
}

export const fetchSettingsBundle = createServerFn({ method: "GET" }).handler(async () => {
  const file = readSettingsFile();
  const dbg = sqlConfigDebug();
  let liveTest: { ok: boolean; message: string } = { ok: false, message: "Not tested" };
  if (hasSqlConfig()) {
    try {
      const pool = await getPool();
      if (pool) {
        const r = await pool.request().query("SELECT DB_NAME() AS db, @@SERVERNAME AS srv");
        const row = r.recordset[0] as { db: string; srv: string };
        liveTest = { ok: true, message: `Connected ${row.srv} / ${row.db}` };
      } else {
        liveTest = { ok: false, message: getLastPoolError() ?? "No pool" };
      }
    } catch (e) {
      liveTest = { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  }
  const primary = file.sqlConnections.find((c) => c.isPrimary) ?? file.sqlConnections[0];
  const pwdLen = primary?.password?.length ?? 0;
  if (!liveTest.ok && pwdLen === 0) {
    liveTest = {
      ok: false,
      message: (liveTest.message || "SQL issue") + " · No password stored in settings file yet.",
    };
  } else if (!liveTest.ok && pwdLen > 0) {
    liveTest = {
      ok: false,
      message:
        (liveTest.message || "SQL issue") +
        ` · Password on file length=${pwdLen} (not shown). If wrong, re-type password and Save, then Reset Application Service.`,
    };
  }

  return {
    sqlConnections: file.sqlConnections.map(publicSql),
    smtp: {
      ...file.smtp,
      password: file.smtp.password ? maskPassword(file.smtp.password) : "",
    },
    rag: { ...DEFAULT_RAG, ...(file.rag ?? {}) },
    alerts: {
      ...DEFAULT_ALERTS,
      ...(file.alerts ?? {}),
      lastFiredAt: file.alerts?.lastFiredAt ?? null,
    },
    dashboard: { ...DEFAULT_DASHBOARD, ...(file.dashboard ?? {}) },
    uiLabels: getUiLabels(),
    runtime: {
      dataMode: getDataMode(),
      hasSqlConfig: hasSqlConfig(),
      debug: dbg,
      liveTest,
      passwordLength: pwdLen,
    },
    updatedAt: file.updatedAt,
  };
});

export const saveSqlConnections = createServerFn({ method: "POST" })
  .validator((data: { connections: SqlConnectionConfig[] }) => data)
  .handler(async ({ data }) => {
    const prev = readSettingsFile();
    const prevById = new Map(prev.sqlConnections.map((c) => [c.id, c]));
    const next: SqlConnectionConfig[] = data.connections.map((c, i) => {
      const old = prevById.get(c.id);
      const id = c.id || crypto.randomUUID();
      return {
        ...emptySqlConnection({ ...c, id }),
        password: applyPasswordKeep(c.password, old?.password ?? ""),
        isPrimary: c.isPrimary,
        name: c.name || `Connection ${i + 1}`,
      };
    });
    // Ensure one primary
    if (next.length && !next.some((c) => c.isPrimary)) next[0].isPrimary = true;
    const primaries = next.filter((c) => c.isPrimary);
    if (primaries.length > 1) {
      next.forEach((c, i) => {
        c.isPrimary = i === next.findIndex((x) => x.isPrimary);
      });
    }
    writeSettingsFile({ ...prev, sqlConnections: next });
    const primary = next.find((c) => c.isPrimary) ?? next[0];
    if (primary?.server && primary.user && primary.password) {
      syncPrimarySqlToEnvLocal({
        server: primary.server.trim(),
        port: primary.port || 14333,
        database: primary.database || "RPMAssure_App",
        user: primary.user.trim(),
        password: primary.password,
        trustServerCertificate: primary.trustServerCertificate,
        encrypt: primary.encrypt,
        dataMode: primary.dataMode,
      });
      // refresh process.env for this process
      process.env.RPM_ASSURE_SQL_SERVER = primary.server.trim();
      process.env.RPM_ASSURE_SQL_PORT = String(primary.port || 14333);
      process.env.RPM_ASSURE_SQL_DATABASE = primary.database || "RPMAssure_App";
      process.env.RPM_ASSURE_SQL_USER = primary.user.trim();
      process.env.RPM_ASSURE_SQL_PASSWORD = primary.password;
      process.env.RPM_ASSURE_SQL_TRUST_CERT =
        primary.trustServerCertificate === false ? "false" : "true";
      process.env.RPM_ASSURE_SQL_ENCRYPT = primary.encrypt ? "true" : "false";
      process.env.RPM_ASSURE_DATA_MODE = primary.dataMode || "auto";
    }
    try {
      const { resetPool } = await import("@/lib/data/sql-pool");
      const { invalidateEnvCache } = await import("@/lib/data/sql-config");
      invalidateEnvCache?.();
      resetPool?.();
    } catch {
      /* optional */
    }
    return { ok: true as const, count: next.length, passwordSaved: Boolean(primary?.password) };
  });

export const saveSmtpSettings = createServerFn({ method: "POST" })
  .validator((data: { smtp: SmtpConfig }) => data)
  .handler(async ({ data }) => {
    const prev = readSettingsFile();
    const smtp: SmtpConfig = {
      ...DEFAULT_SMTP,
      ...data.smtp,
      password: applyPasswordKeep(data.smtp.password, prev.smtp.password),
    };
    writeSettingsFile({ ...prev, smtp });
    return { ok: true as const };
  });

export const testSqlConnection = createServerFn({ method: "POST" })
  .validator((data: { connection: SqlConnectionConfig }) => data)
  .handler(async ({ data }) => {
    const prev = readSettingsFile();
    const old = prev.sqlConnections.find((c) => c.id === data.connection.id);
    const password = applyPasswordKeep(data.connection.password, old?.password ?? "");
    const c = data.connection;
    if (!c.server?.trim() || !c.user?.trim()) {
      return { ok: false as const, message: "Server and user required" };
    }
    if (!password) {
      return {
        ok: false as const,
        message:
          "No password on file. Type the full password in the Password field (leave blank only after it was saved once), then Test or Save.",
      };
    }

    const server = c.server.trim();
    const port = Number(c.port) || 14333;
    const database = (c.database || "RPMAssure_App").trim();
    const user = c.user.trim();
    const trust = c.trustServerCertificate !== false;

    async function tryConnect(encrypt: boolean) {
      const pool = await new sql.ConnectionPool({
        server,
        port,
        database,
        user,
        password,
        options: {
          encrypt,
          trustServerCertificate: trust,
          enableArithAbort: true,
        },
        connectionTimeout: 12000,
        requestTimeout: 12000,
      }).connect();
      const r = await pool.request().query(
        "SELECT 1 AS ok, @@SERVERNAME AS srv, DB_NAME() AS db, SUSER_SNAME() AS who",
      );
      await pool.close();
      const row = r.recordset[0] as { srv: string; db: string; who: string };
      return row;
    }

    // Prefer user encrypt setting; on Login failed / TLS issues retry opposite encrypt
    const preferEncrypt = Boolean(c.encrypt);
    try {
      const row = await tryConnect(preferEncrypt);
      return {
        ok: true as const,
        message: `OK — ${row.srv} / ${row.db} as ${row.who} (encrypt=${preferEncrypt})`,
      };
    } catch (e1) {
      const m1 = e1 instanceof Error ? e1.message : String(e1);
      try {
        const row = await tryConnect(!preferEncrypt);
        return {
          ok: true as const,
          message: `OK — ${row.srv} / ${row.db} as ${row.who} (encrypt=${!preferEncrypt}; toggled after first attempt failed)`,
        };
      } catch (e2) {
        const m2 = e2 instanceof Error ? e2.message : String(e2);
        return {
          ok: false as const,
          message:
            `Login/connect failed for ${user} @ ${server},${port} / ${database}. ` +
            `encrypt=${preferEncrypt}: ${m1} | encrypt=${!preferEncrypt}: ${m2}. ` +
            `Verify with: sqlcmd -S "${server},${port}" -d "${database}" -U "${user}" -P "***" -C -Q "SELECT 1"`,
        };
      }
    }
  });

/** Read-only SQL explorer — SELECT/WITH only, single batch, row cap */
export type SqlQueryResult = {
  ok: boolean;
  message: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  rowCount: number;
};

export const runSqlQuery = createServerFn({ method: "POST" })
  .validator((data: { sqlText: string; maxRows?: number }) => data)
  .handler(async ({ data }): Promise<SqlQueryResult> => {
    const empty = (message: string): SqlQueryResult => ({
      ok: false,
      message,
      columns: [],
      rows: [],
      rowCount: 0,
    });
    const text = (data.sqlText ?? "").trim();
    if (!text) return empty("Empty query");

    const stripped = text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ").trim();
    const upper = stripped.toUpperCase();
    if (!/^(SELECT|WITH)\b/.test(upper)) {
      return empty("Only SELECT / WITH (CTE) queries are allowed.");
    }
    if (/\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|GRANT|REVOKE|DENY|xp_)\b/i.test(stripped)) {
      return empty("Query contains a blocked keyword.");
    }
    if (stripped.includes(";") && stripped.replace(/;+\s*$/, "").includes(";")) {
      return empty("Multiple statements are not allowed.");
    }

    const maxRows = Math.min(Math.max(data.maxRows ?? 200, 1), 1000);
    const pool = await getPool();
    if (!pool) return empty(getLastPoolError() ?? "SQL not connected");

    try {
      const wrapped = `
SET NOCOUNT ON;
SET ROWCOUNT ${maxRows};
${stripped.replace(/;+\s*$/, "")};
SET ROWCOUNT 0;
`;
      const result = await pool.request().query(wrapped);
      const recordset = (result.recordset ?? []) as Array<Record<string, unknown>>;
      const columns = recordset.length > 0 ? Object.keys(recordset[0]) : [];
      const rows = recordset.map((r) => {
        const o: Record<string, string | number | boolean | null> = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          if (v == null) o[k] = null;
          else if (v instanceof Date) o[k] = v.toISOString();
          else if (typeof v === "bigint") o[k] = v.toString();
          else if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") o[k] = v;
          else o[k] = String(v);
        }
        return o;
      });
      return {
        ok: true,
        message: rows.length + " row(s)",
        columns: columns.length ? columns : rows[0] ? Object.keys(rows[0]) : [],
        rows,
        rowCount: rows.length,
      };
    } catch (e) {
      return empty(e instanceof Error ? e.message : String(e));
    }
  });

export type AppUserRow = {
  appUserId: string;
  userName: string;
  email: string;
  displayName: string;
  staffRole: string;
  isPlatformAdmin: boolean;
  isActive: boolean;
  customerCount: number;
};

async function ensureStaffRoleColumn(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF COL_LENGTH(N'dbo.App_User', N'StaffRole') IS NULL
      ALTER TABLE dbo.App_User ADD StaffRole nvarchar(30) NULL;
  `);
}

export const fetchAppUsers = createServerFn({ method: "GET" }).handler(async () => {
  const pool = await getPool();
  if (!pool) {
    return { ok: false as const, message: getLastPoolError() ?? "SQL not connected", users: [] as AppUserRow[] };
  }
  try {
    await ensureStaffRoleColumn(pool);
    const r = await pool.request().query(`
      SELECT
        CONVERT(nvarchar(36), u.AppUserId) AS appUserId,
        u.UserName AS userName,
        u.Email AS email,
        u.DisplayName AS displayName,
        COALESCE(u.StaffRole, CASE WHEN u.IsPlatformAdmin = 1 THEN N'PlatformAdmin' ELSE N'TechnicalReadOnly' END) AS staffRole,
        CAST(u.IsPlatformAdmin AS bit) AS isPlatformAdmin,
        CAST(u.IsActive AS bit) AS isActive,
        (SELECT COUNT(*) FROM dbo.App_UserCustomer c WHERE c.AppUserId = u.AppUserId) AS customerCount
      FROM dbo.App_User u
      ORDER BY u.DisplayName, u.Email
    `);
    const users: AppUserRow[] = (r.recordset ?? []).map((row: Record<string, unknown>) => ({
      appUserId: String(row.appUserId),
      userName: String(row.userName ?? ""),
      email: String(row.email ?? ""),
      displayName: String(row.displayName ?? ""),
      staffRole: String(row.staffRole ?? "TechnicalReadOnly"),
      isPlatformAdmin: Boolean(row.isPlatformAdmin),
      isActive: Boolean(row.isActive),
      customerCount: Number(row.customerCount) || 0,
    }));
    return { ok: true as const, message: `${users.length} user(s)`, users };
  } catch (e) {
    return {
      ok: false as const,
      message: e instanceof Error ? e.message : String(e),
      users: [] as AppUserRow[],
    };
  }
});

export const upsertAppUser = createServerFn({ method: "POST" })

  .validator(
    (data: {
      appUserId?: string | null;
      email: string;
      displayName: string;
      userName?: string;
      staffRole: string;
      isActive: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const pool = await getPool();
    if (!pool) return { ok: false as const, message: getLastPoolError() ?? "SQL not connected" };
    const email = data.email.trim().toLowerCase();
    const displayName = data.displayName.trim() || email;
    const userName = (data.userName?.trim() || email.split("@")[0] || "user").slice(0, 100);
    let role: StaffRole = "TechnicalReadOnly";
    if (isStaffRole(data.staffRole)) role = data.staffRole;
    const isAdmin = role === "PlatformAdmin";

    try {
      await ensureStaffRoleColumn(pool);
      if (data.appUserId) {
        await pool
          .request()
          .input("id", sqlTypes.UniqueIdentifier, data.appUserId)
          .input("email", sqlTypes.NVarChar(256), email)
          .input("dn", sqlTypes.NVarChar(200), displayName)
          .input("un", sqlTypes.NVarChar(100), userName)
          .input("role", sqlTypes.NVarChar(30), role)
          .input("admin", sqlTypes.Bit, isAdmin)
          .input("active", sqlTypes.Bit, data.isActive)
          .query(`
            UPDATE dbo.App_User
            SET Email = @email,
                DisplayName = @dn,
                UserName = @un,
                StaffRole = @role,
                IsPlatformAdmin = @admin,
                IsActive = @active,
                UpdatedAt = SYSUTCDATETIME()
            WHERE AppUserId = @id
          `);
      } else {
        await pool
          .request()
          .input("email", sqlTypes.NVarChar(256), email)
          .input("dn", sqlTypes.NVarChar(200), displayName)
          .input("un", sqlTypes.NVarChar(100), userName)
          .input("role", sqlTypes.NVarChar(30), role)
          .input("admin", sqlTypes.Bit, isAdmin)
          .input("active", sqlTypes.Bit, data.isActive)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.App_User WHERE LOWER(Email) = @email)
              UPDATE dbo.App_User
              SET DisplayName = @dn, UserName = @un, StaffRole = @role,
                  IsPlatformAdmin = @admin, IsActive = @active, UpdatedAt = SYSUTCDATETIME()
              WHERE LOWER(Email) = @email;
            ELSE
              INSERT INTO dbo.App_User (UserName, Email, DisplayName, StaffRole, IsPlatformAdmin, IsActive)
              VALUES (@un, @email, @dn, @role, @admin, @active);
          `);
      }
      return { ok: true as const, message: "User saved" };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : String(e) };
    }
  });

/** Restart app process / Windows service (admin only path — caller must be signed in as staff) */
export const restartApplicationService = createServerFn({ method: "POST" }).handler(async () => {
  const { spawn } = await import("node:child_process");
  const path = await import("node:path");
  const fs = await import("node:fs");

  const appRoot = process.cwd();
  const script = path.join(appRoot, "scripts", "Restart-RpmAssure.ps1");
  const alt = "C:\\RPM-Assure\\App\\scripts\\Restart-RpmAssure.ps1";
  const target = fs.existsSync(script) ? script : alt;

  if (!fs.existsSync(target)) {
    return {
      ok: false as const,
      message: `Restart script not found at ${script}. Deploy scripts/Restart-RpmAssure.ps1`,
    };
  }

  // Fire-and-forget: script stops this process and starts a new one
  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", target],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      cwd: appRoot,
    },
  );
  child.unref();

  // Give spawn a moment, then exit this process so port frees cleanly
  setTimeout(() => {
    try {
      process.exit(0);
    } catch {
      /* ignore */
    }
  }, 800);

  return {
    ok: true as const,
    message:
      "Restart requested. Wait 10–15 seconds, then refresh the page. If the app does not come back, run Start-Dev.ps1 on the server.",
  };
});

export const sendTestEmail = createServerFn({ method: "POST" })
  .validator((data: { to?: string }) => data)
  .handler(async ({ data }) => {
    const smtp = getSmtpConfig();
    const to = (data.to?.trim() || smtp.reportTo?.trim() || smtp.fromEmail?.trim() || "");
    if (!to) return { ok: false as const, error: "Enter a test recipient (or set From / Report To)." };
    return sendMailWithSmtp(smtp, {
      to: to.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean),
      subject: "RPM Assure — SMTP test",
      text: "This is a test message from RPM Assure SMTP settings.",
      html: "<p>This is a <b>test message</b> from RPM Assure SMTP settings.</p>",
    });
  });

export const sendWeeklyReportNow = createServerFn({ method: "POST" })
  .validator((data: { to?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return sendWeeklyReportEmail(data?.to);
  });

async function loadPortfolioForReport() {
  const mode = getDataMode();
  if (mode !== "demo" && hasSqlConfig()) {
    try {
      const live = await fetchLivePortfolio();
      if (live?.rows?.length) return live;
    } catch (e) {
      console.warn(
        "[rpm-assure] report portfolio live failed:",
        e instanceof Error ? e.message : e,
      );
    }
  }
  return getDemoPortfolio();
}

function emptyCustomerDetail(row: import("@/lib/data/types").PortfolioRow): import("@/lib/data/types").CustomerDetailPayload {
  return {
    customer: row,
    operators: [],
    recentLogins: [],
    jobErrors: [],
    dtrLevel1: [],
    license: null,
    healthLogs: [],
    taskGroups: [],
    taskItems: [],
    incidents: [],
    problems: [],
    risks: [],
    issues: [],
    priorities: [],
    slaPolicies: [],
    availabilitySla: null,
    changes: [],
    csat: null,
    operGroups: [],
    operAmends: [],
    securitySummary: {
      groupMemberships: 0,
      distinctOperatorsInGroups: 0,
      distinctGroups: 0,
      amendCount90d: 0,
    },
    execSummary: null,
    execNarratives: [],
    auditEvents: [],
    diagSummaries: [],
    sqlHealthRows: [],
    extraSummary: {
      auditCount: 0,
      diagCount: 0,
      sqlHealthCount: 0,
      sqlHealthFailCount: 0,
      lastAuditImport: null,
    },
    operationalAssurance: {
      collectAgeHours: null,
      collectFresh: false,
      jobErrorCount: row.sysproJobErrorCount,
      activeUserRatioPct: null,
      dtrOutOfBalance: row.sysproDtrVarianceLines,
      scorePct: row.healthRag === "Green" ? 80 : row.healthRag === "Amber" ? 55 : 30,
      summary: row.healthSummary || "Portfolio row only — detail collect incomplete.",
    },
    sqlBackups: [],
    sqlBackupFailures: [],
    sysproVersion: null,
    sysproHotfixes: [],
    hotfixGap: [],
    hotfixGapSummary: null,
    rmm: {
      enabled: false,
      pillarOn: false,
      pulsewayOrgName: null,
      summary: null,
      devices: [],
      alerts: [],
      mapping: [],
      message: null,
    },
    cove: {
      enabled: false,
      summary: null,
      devices: [],
      mapping: [],
      unmapped: [],
      message: null,
      recovery: null,
      recoveryHistory: [],
      recentDays: [],
      alerts: [],
    },
    epp: null,
    csp: null,
    dataMode: "live",
  };
}

async function loadCustomerForReport(code: string) {
  const mode = getDataMode();
  let lastErr: string | null = null;
  if (mode !== "demo" && hasSqlConfig()) {
    try {
      const live = await fetchLiveCustomerDetail(code);
      if (live) {
        try {
          return { customer: fillCustomerPanels(live), source: "live" as const, warning: null as string | null };
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
          console.warn("[rpm-assure] fillCustomerPanels failed:", lastErr);
          return { customer: live, source: "live" as const, warning: lastErr };
        }
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      console.warn("[rpm-assure] report customer live failed:", lastErr);
    }
  }
  try {
    const demo = getDemoCustomerDetail(code);
    if (demo) {
      return {
        customer: fillCustomerPanels(demo),
        source: "demo" as const,
        warning: lastErr ? `Live detail failed (${lastErr}); showing demo/fallback.` : null,
      };
    }
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
  }
  // Last resort: portfolio row only
  try {
    const pf = await loadPortfolioForReport();
    const row = pf.rows.find((r) => r.customerCode.toUpperCase() === code.toUpperCase());
    if (row) {
      const raw = emptyCustomerDetail(row);
      return {
        customer: fillCustomerPanels(raw),
        source: "portfolio" as const,
        warning: lastErr
          ? `Detail load failed (${lastErr}); preview built from portfolio metrics only.`
          : "Preview built from portfolio metrics only.",
      };
    }
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
  }
  return { customer: null, source: "none" as const, warning: lastErr };
}

function buildPack(
  format: "day-end" | "ams-full" | "ams-weekly" | "ams-monthly" | "estate" | "custom-pack",
  customer: import("@/lib/data/types").CustomerDetailPayload | null,
  portfolio: import("@/lib/data/types").PortfolioPayload,
) {
  if (format === "estate") return buildPortfolioAmsHtml(portfolio);
  if (!customer) throw new Error("Customer required for this format");
  if (format === "day-end") return buildDayEndFinSightHtml({ customer, portfolio });
  if (format === "ams-monthly") return buildMonthlyAmsPackHtml({ customer, portfolio });
  if (format === "ams-weekly") {
    return buildApplicationsAmsHtml({ customer, portfolio, variant: "weekly" });
  }
  return buildApplicationsAmsHtml({ customer, portfolio, variant: "full" });
}

/** Minimal always-safe HTML when a full pack builder throws */
function fallbackReportPack(
  format: string,
  customer: import("@/lib/data/types").CustomerDetailPayload | null,
  err: string,
): { subject: string; html: string; text: string } {
  const name = customer?.customer?.displayName || customer?.customer?.customerCode || "Customer";
  const code = customer?.customer?.customerCode || "—";
  const rag = customer?.customer?.healthRag || "—";
  const subject = `RPM Assure — ${format} — ${name} (partial)`;
  const text = `${subject}\n\nPreview builder error: ${err}\nHealth: ${rag}\nJobs: ${customer?.customer?.sysproJobErrorCount ?? "—"}\nDTR OOB: ${customer?.customer?.sysproDtrVarianceLines ?? "—"}`;
  const html = `<!DOCTYPE html><html lang="en-ZA"><head><meta charset="utf-8"/><title>${subject.replace(/</g, "")}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#1a1a1a}h1{color:#12365a}.err{background:#fff4f4;border:1px solid #e8b4b4;padding:12px;border-radius:8px;margin:16px 0}.ok{color:#1a8f4a}</style></head><body>
<h1>RPM Assure — ${format}</h1>
<p><strong>${name}</strong> (${code}) · Health ${rag}</p>
<div class="err"><strong>Full pack could not be built.</strong><br/>${err.replace(/</g, "<")}<br/><span class="ok">Showing fallback metrics so you can still print / email a stub.</span></div>
<ul>
<li>Job errors: ${customer?.customer?.sysproJobErrorCount ?? "—"}</li>
<li>DTR Out of Balance lines: ${customer?.customer?.sysproDtrVarianceLines ?? "—"}</li>
<li>Active users: ${customer?.customer?.activeUserCount ?? "—"}</li>
<li>Last collect: ${customer?.customer?.lastImportAt ?? "—"}</li>
<li>DTR modules in payload: ${customer?.dtrLevel1?.length ?? 0}</li>
<li>Backup rows: ${customer?.sqlBackups?.length ?? 0}</li>
</ul>
<p style="color:#666;font-size:12px">If this persists, check server log for [rpm-assure] previewAmsReportHtml and apply the latest crash/report fix pack.</p>
</body></html>`;
  return { subject, html, text };
}

export const sendAmsReportEmail = createServerFn({ method: "POST" })
  .validator(
    (data: {
      to?: string;
      format: "day-end" | "ams-full" | "ams-weekly" | "ams-monthly" | "estate" | "custom-pack";
      customerCode?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const smtp = getSmtpConfig();
      const toRaw =
        data.to?.trim() || smtp.reportTo?.trim() || smtp.fromEmail?.trim() || "";
      if (!toRaw) {
        return { ok: false as const, error: "No recipients — set To or SMTP Weekly report To." };
      }
      const recipients = toRaw.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean);
      const portfolio = await loadPortfolioForReport();
      let customer = null as import("@/lib/data/types").CustomerDetailPayload | null;
      if (data.format !== "estate") {
        const code = data.customerCode?.trim();
        if (!code) return { ok: false as const, error: "Select a customer for this report format." };
        const loaded = await loadCustomerForReport(code);
        customer = loaded.customer;
        if (!customer) return { ok: false as const, error: "Customer not found: " + code };
      }
      let pack: { subject: string; html: string; text: string };
      try {
        pack = buildPack(data.format, customer, portfolio);
      } catch (be) {
        const msg = be instanceof Error ? be.message : String(be);
        console.error("[rpm-assure] sendAmsReportEmail buildPack failed:", msg);
        pack = fallbackReportPack(data.format, customer, msg);
      }
      const result = await sendMailWithSmtp(smtp, {
        to: recipients,
        subject: pack.subject,
        text: pack.text,
        html: pack.html,
      });
      if (!result.ok) return { ok: false as const, error: result.error };
      return {
        ok: true as const,
        recipients: recipients.join(", "),
        messageId: result.messageId,
        subject: pack.subject,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[rpm-assure] sendAmsReportEmail failed:", msg);
      return { ok: false as const, error: msg };
    }
  });

export const previewAmsReportHtml = createServerFn({ method: "POST" })
  .validator(
    (data: {
      format?: "day-end" | "ams-full" | "ams-weekly" | "ams-monthly" | "estate" | "custom-pack";
      customerCode?: string;
    }) => data ?? {},
  )
  .handler(async ({ data }) => {
    try {
      const format = (data?.format || "ams-full") as
        | "day-end"
        | "ams-full"
        | "estate"
        | "custom-pack";
      let portfolio: import("@/lib/data/types").PortfolioPayload;
      try {
        portfolio = await loadPortfolioForReport();
      } catch (pe) {
        const msg = pe instanceof Error ? pe.message : String(pe);
        console.error("[rpm-assure] preview portfolio load failed:", msg);
        return {
          ok: false as const,
          error: "Could not load portfolio for report: " + msg,
        };
      }

      if (format === "estate") {
        try {
          const pack = buildPortfolioAmsHtml(portfolio);
          return {
            ok: true as const,
            subject: pack.subject,
            html: pack.html,
            source: portfolio.summary?.dataMode ?? "demo",
            warning: null as string | null,
          };
        } catch (ee) {
          const msg = ee instanceof Error ? ee.message : String(ee);
          const pack = fallbackReportPack("estate", null, msg);
          return {
            ok: true as const,
            subject: pack.subject,
            html: pack.html,
            source: "fallback",
            warning: msg,
          };
        }
      }

      const code = (data?.customerCode || "").trim();
      if (!code) {
        return {
          ok: false as const,
          error: "Select a customer (or wait for the list to load).",
        };
      }

      let loaded: Awaited<ReturnType<typeof loadCustomerForReport>>;
      try {
        loaded = await loadCustomerForReport(code);
      } catch (ce) {
        const msg = ce instanceof Error ? ce.message : String(ce);
        console.error("[rpm-assure] preview customer load failed:", msg);
        return {
          ok: false as const,
          error: "Could not load customer " + code + ": " + msg,
        };
      }

      if (!loaded.customer) {
        return {
          ok: false as const,
          error:
            "Customer not found: " +
            code +
            (loaded.warning ? " — " + loaded.warning : "") +
            ". Check Dim_Customer is Active and collect has run.",
        };
      }

      try {
        const pack = buildPack(format, loaded.customer, portfolio);
        if (!pack?.html) {
          throw new Error("Report builder returned empty HTML");
        }
        return {
          ok: true as const,
          subject: pack.subject || `RPM Assure — ${format}`,
          html: pack.html,
          source: loaded.source,
          warning: loaded.warning,
        };
      } catch (be) {
        const msg = be instanceof Error ? be.message : String(be);
        console.error("[rpm-assure] previewAmsReportHtml buildPack failed:", msg);
        const pack = fallbackReportPack(format, loaded.customer, msg);
        return {
          ok: true as const,
          subject: pack.subject,
          html: pack.html,
          source: loaded.source,
          warning: "Builder error (fallback pack): " + msg,
        };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[rpm-assure] previewAmsReportHtml failed:", msg);
      return {
        ok: false as const,
        error: "Preview failed: " + msg,
      };
    }
  });

export const saveRagSettings = createServerFn({ method: "POST" })
  .validator((data: { rag: RagThresholdConfig }) => data)
  .handler(async ({ data }) => {
    const prev = readSettingsFile();
    writeSettingsFile({ ...prev, rag: data.rag });
    try { cacheInvalidate(); } catch { /* */ }
    appendAdminAudit({
      actorEmail: "platform-admin",
      action: "settings.rag.save",
      detail: JSON.stringify(data.rag),
      ok: true,
    });
    return { ok: true as const, rag: getRagConfig() };
  });

export const saveAlertSettings = createServerFn({ method: "POST" })
  .validator((data: { alerts: AlertRulesConfig }) => data)
  .handler(async ({ data }) => {
    const prev = readSettingsFile();
    const keepLast = prev.alerts?.lastFiredAt ?? null;
    writeSettingsFile({ ...prev, alerts: { ...data.alerts, lastFiredAt: keepLast } });
    appendAdminAudit({
      actorEmail: "platform-admin",
      action: "settings.alerts.save",
      detail: JSON.stringify({ ...data.alerts, lastFiredAt: keepLast }),
      ok: true,
    });
    return { ok: true as const, alerts: getAlertConfig() };
  });

export const saveDashboardSettings = createServerFn({ method: "POST" })
  .validator((data: { dashboard: DashboardConfig }) => data)
  .handler(async ({ data }) => {
    const prev = readSettingsFile();
    writeSettingsFile({ ...prev, dashboard: data.dashboard });
    appendAdminAudit({
      actorEmail: "platform-admin",
      action: "settings.dashboard.save",
      detail: JSON.stringify(data.dashboard),
      ok: true,
    });
    return { ok: true as const, dashboard: getDashboardConfig() };
  });


export const saveUiLabels = createServerFn({ method: "POST" })
  .validator((data: { labels: UiLabelsConfig }) => data)
  .handler(async ({ data }) => {
    const prev = readSettingsFile();
    const next = {
      ...prev,
      labels: { ...DEFAULT_UI_LABELS, ...(data.labels ?? {}) },
      updatedAt: new Date().toISOString(),
    };
    writeSettingsFile(next);
    try {
      appendAdminAudit({
        actorEmail: "admin",
        action: "settings.uiLabels",
        detail: "UI labels updated",
        ok: true,
      });
    } catch {}
    return { ok: true as const, labels: getUiLabels() };
  });

export type CollectInventoryRow = {
  customerCode: string;
  displayName: string;
  sqlInstanceName: string;
  active: boolean;
  /** Explicit or inferred SYSPRO cover — only then is Stale meaningful */
  sysproCovered: boolean;
  lastOpsUtc: string | null;
  opsCount: number;
  lastJobsUtc: string | null;
  jobsCount: number;
  jobErrors: number;
  lastLicenseUtc: string | null;
  lastDtrUtc: string | null;
  dtrVarLines: number;
  hoursSinceOps: number | null;
  stale: boolean;
  healthRag: string;
  healthSummary: string;
};

export const fetchCollectInventory = createServerFn({ method: "GET" }).handler(async () => {
  const rag = getRagConfig();
  const pool = await getPool();
  if (!pool) {
    return {
      ok: false as const,
      message: getLastPoolError() ?? "SQL not connected",
      rows: [] as CollectInventoryRow[],
      staleHours: rag.collectStaleHours,
    };
  }
  try {
    const r = await pool.request().query(`
SET NOCOUNT ON;
;WITH Cust AS (
  SELECT
    c.CustomerCode,
    c.DisplayName,
    ISNULL(c.SqlInstanceName, N'') AS SqlInstanceName,
    CAST(c.Active AS bit) AS Active,
    a.PillarSyspro
  FROM dbo.Dim_Customer c WITH (NOLOCK)
  LEFT JOIN dbo.Dim_Customer_AmsConfig a WITH (NOLOCK)
    ON a.CustomerCode = c.CustomerCode
),
Ops AS (
  SELECT InstanceName, MAX(ImportedAt) AS LastOps, COUNT(*) AS OpsCnt
  FROM dbo.Syspro_Operators WITH (NOLOCK)
  GROUP BY InstanceName
),
Jobs AS (
  SELECT j.InstanceName,
         MAX(j.ImportedAt) AS LastJobs,
         COUNT(*) AS JobsCnt,
         SUM(CASE WHEN j.ProgErrorCode IS NOT NULL AND j.ProgErrorCode <> 0 THEN 1 ELSE 0 END) AS JobErrors
  FROM dbo.Syspro_JobLogging j WITH (NOLOCK)
  WHERE j.SnapshotDate = (
    SELECT MAX(j2.SnapshotDate) FROM dbo.Syspro_JobLogging j2 WITH (NOLOCK)
    WHERE j2.InstanceName = j.InstanceName
  )
  GROUP BY j.InstanceName
),
Lic AS (
  SELECT InstanceName, MAX(ImportedAt) AS LastLicense
  FROM dbo.Syspro_SystemLicense WITH (NOLOCK)
  GROUP BY InstanceName
),
Dtr AS (
  SELECT InstanceName, MAX(ImportedAt) AS LastDtr,
         SUM(CASE WHEN ISNULL(Variance, 0) <> 0 THEN 1 ELSE 0 END) AS VarLines
  FROM (
    SELECT InstanceName, ImportedAt, Variance FROM dbo.Syspro_DtrInvBalances WITH (NOLOCK)
    UNION ALL SELECT InstanceName, ImportedAt, Variance FROM dbo.Syspro_DtrApBalances WITH (NOLOCK)
    UNION ALL SELECT InstanceName, ImportedAt, Variance FROM dbo.Syspro_DtrArBalances WITH (NOLOCK)
  ) x
  GROUP BY InstanceName
)
SELECT c.CustomerCode, c.DisplayName, c.SqlInstanceName, c.Active, c.PillarSyspro,
       o.LastOps, ISNULL(o.OpsCnt, 0) AS OpsCnt,
       j.LastJobs, ISNULL(j.JobsCnt, 0) AS JobsCnt, ISNULL(j.JobErrors, 0) AS JobErrors,
       l.LastLicense, d.LastDtr, ISNULL(d.VarLines, 0) AS VarLines
FROM Cust c
LEFT JOIN Ops o ON o.InstanceName = c.SqlInstanceName AND c.SqlInstanceName <> N''
LEFT JOIN Jobs j ON j.InstanceName = c.SqlInstanceName AND c.SqlInstanceName <> N''
LEFT JOIN Lic l ON l.InstanceName = c.SqlInstanceName AND c.SqlInstanceName <> N''
LEFT JOIN Dtr d ON d.InstanceName = c.SqlInstanceName AND c.SqlInstanceName <> N''
ORDER BY c.DisplayName;
`);
    const now = Date.now();
    const rows: CollectInventoryRow[] = (r.recordset ?? []).map((row: Record<string, unknown>) => {
      const instance = String(row.SqlInstanceName ?? "").trim();
      const pillarRaw = row.PillarSyspro;
      let sysproCovered = false;
      if (pillarRaw === false || pillarRaw === 0 || pillarRaw === "0") {
        sysproCovered = false;
      } else if (pillarRaw === true || pillarRaw === 1 || pillarRaw === "1") {
        sysproCovered = true;
      } else {
        sysproCovered = instance.length > 0;
      }

      const lastOps = row.LastOps ? new Date(row.LastOps as string | Date) : null;
      const hours =
        lastOps && !Number.isNaN(lastOps.getTime())
          ? (now - lastOps.getTime()) / 3600000
          : null;
      const opsCount = Number(row.OpsCnt) || 0;
      const jobErrors = Number(row.JobErrors) || 0;
      const dtrVar = Number(row.VarLines) || 0;

      if (!sysproCovered) {
        return {
          customerCode: String(row.CustomerCode ?? ""),
          displayName: String(row.DisplayName ?? ""),
          sqlInstanceName: instance,
          active: Boolean(row.Active),
          sysproCovered: false,
          lastOpsUtc: null,
          opsCount: 0,
          lastJobsUtc: null,
          jobsCount: 0,
          jobErrors: 0,
          lastLicenseUtc: null,
          lastDtrUtc: null,
          dtrVarLines: 0,
          hoursSinceOps: null,
          stale: false,
          healthRag: "None",
          healthSummary: "No Cover — not a SYSPRO collect customer",
        };
      }

      const { rag: healthRag, summary } = healthFor(
        { operatorCount: opsCount, jobErrorCount: jobErrors, dtrVariance: dtrVar },
        rag,
      );
      const stale = hours == null || hours > rag.collectStaleHours;
      return {
        customerCode: String(row.CustomerCode ?? ""),
        displayName: String(row.DisplayName ?? ""),
        sqlInstanceName: instance,
        active: Boolean(row.Active),
        sysproCovered: true,
        lastOpsUtc: lastOps ? lastOps.toISOString() : null,
        opsCount,
        lastJobsUtc: row.LastJobs ? new Date(row.LastJobs as string | Date).toISOString() : null,
        jobsCount: Number(row.JobsCnt) || 0,
        jobErrors,
        lastLicenseUtc: row.LastLicense
          ? new Date(row.LastLicense as string | Date).toISOString()
          : null,
        lastDtrUtc: row.LastDtr ? new Date(row.LastDtr as string | Date).toISOString() : null,
        dtrVarLines: dtrVar,
        hoursSinceOps: hours == null ? null : Math.round(hours * 10) / 10,
        stale,
        healthRag: stale && healthRag === "Green" ? "Amber" : healthRag,
        healthSummary: stale
          ? `Stale collect (>${rag.collectStaleHours}h)${summary ? ` · ${summary}` : ""}`
          : summary,
      };
    });
    const covered = rows.filter((x) => x.sysproCovered).length;
    const staleN = rows.filter((x) => x.stale).length;
    return {
      ok: true as const,
      message: `${rows.length} customer(s) · ${covered} on SYSPRO cover · ${staleN} stale`,
      rows,
      staleHours: rag.collectStaleHours,
    };
  } catch (e) {
    return {
      ok: false as const,
      message: e instanceof Error ? e.message : String(e),
      rows: [] as CollectInventoryRow[],
      staleHours: rag.collectStaleHours,
    };
  }
});

export type IntegrationConnectionRow = {
  connectionCode: string;
  displayName: string;
  sourceKind: string;
  status: string;
  notes: string | null;
  lastSyncAt: string | null;
};

export const fetchIntegrations = createServerFn({ method: "GET" }).handler(async () => {
  const pool = await getPool();
  if (!pool) {
    return {
      ok: false as const,
      message: getLastPoolError() ?? "SQL not connected — run 410_Ensure_Integration_Connections.sql after SQL is up",
      rows: [] as IntegrationConnectionRow[],
    };
  }
  try {
    const r = await pool.request().query(`
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NULL
BEGIN
  SELECT CAST(NULL AS nvarchar(40)) AS ConnectionCode WHERE 1 = 0;
  RETURN;
END
SELECT ConnectionCode, DisplayName, SourceKind, Status, Notes, LastSyncAt
FROM dbo.Dim_Connection WITH (NOLOCK)
ORDER BY
  CASE SourceKind WHEN N'Erp' THEN 0 WHEN N'Rmm' THEN 1 WHEN N'Epp' THEN 2
    WHEN N'Backup' THEN 3 WHEN N'Licensing' THEN 4 ELSE 9 END,
  DisplayName;
`);
    const rows: IntegrationConnectionRow[] = (r.recordset ?? [])
      .filter((row: { ConnectionCode?: string | null }) => row.ConnectionCode)
      .map((row: {
        ConnectionCode: string;
        DisplayName: string;
        SourceKind: string;
        Status: string;
        Notes: string | null;
        LastSyncAt: Date | string | null;
      }) => ({
        connectionCode: String(row.ConnectionCode),
        displayName: String(row.DisplayName ?? row.ConnectionCode),
        sourceKind: String(row.SourceKind ?? ""),
        status: String(row.Status ?? "Planned"),
        notes: row.Notes != null ? String(row.Notes) : null,
        lastSyncAt: row.LastSyncAt
          ? new Date(row.LastSyncAt as string | Date).toISOString()
          : null,
      }));
    return {
      ok: true as const,
      message:
        rows.length === 0
          ? "Dim_Connection empty — run central 410_Ensure_Integration_Connections.sql"
          : `${rows.length} connection(s)`,
      rows,
    };
  } catch (e) {
    return {
      ok: false as const,
      message: e instanceof Error ? e.message : String(e),
      rows: [] as IntegrationConnectionRow[],
    };
  }
});

export const fetchAdminAuditLog = createServerFn({ method: "GET" })
  .validator((data?: { limit?: number }) => data ?? {})
  .handler(async ({ data }) => {
    const limit = Math.min(Math.max(data?.limit ?? 200, 1), 500);
    return { ok: true as const, entries: readAdminAudit(limit) };
  });

export const runAlertEvaluation = createServerFn({ method: "POST" })
  .validator((data?: { force?: boolean; to?: string }) => data ?? {})
  .handler(async ({ data }) => {
    const alerts = getAlertConfig();
    const force = Boolean(data?.force);
    if (!alerts.enabled && !force) {
      return {
        ok: false as const,
        fired: false,
        message: "Alerts disabled — enable in Settings → Alerts, or use Force send.",
        matches: [] as string[],
      };
    }
    const inv = await fetchCollectInventory();
    if (!inv.ok) {
      return { ok: false as const, fired: false, message: inv.message, matches: [] as string[] };
    }
    const matches: string[] = [];
    for (const row of inv.rows) {
      if (!row.active) continue;
      if (alerts.alertOnRed && row.healthRag === "Red") {
        matches.push(`${row.displayName} (${row.customerCode}): RED — ${row.healthSummary}`);
      }
      if (alerts.jobErrorMin > 0 && row.jobErrors >= alerts.jobErrorMin) {
        matches.push(
          `${row.displayName}: ${row.jobErrors} job error(s) (threshold ≥ ${alerts.jobErrorMin})`,
        );
      }
      if (
        alerts.collectStaleHours > 0 &&
        (row.hoursSinceOps == null || row.hoursSinceOps > alerts.collectStaleHours)
      ) {
        matches.push(
          `${row.displayName}: collect stale (${row.hoursSinceOps ?? "never"} h; threshold ${alerts.collectStaleHours} h)`,
        );
      }
    }
    const uniq = [...new Set(matches)];
    if (uniq.length === 0) {
      return { ok: true as const, fired: false, message: "No alert conditions matched.", matches: [] };
    }
    if (!force && alerts.lastFiredAt) {
      const last = new Date(alerts.lastFiredAt).getTime();
      const minMs = alerts.minIntervalMinutes * 60_000;
      if (Date.now() - last < minMs) {
        return {
          ok: true as const,
          fired: false,
          message: `Matched ${uniq.length} condition(s) but within debounce (${alerts.minIntervalMinutes} min). Use Force send.`,
          matches: uniq,
        };
      }
    }
    const smtp = getSmtpConfig();
    const toRaw =
      data?.to?.trim() ||
      alerts.emailTo?.trim() ||
      smtp.reportTo?.trim() ||
      smtp.fromEmail?.trim() ||
      "";
    if (!toRaw) {
      return {
        ok: false as const,
        fired: false,
        message: "No recipients — set Alerts email To or SMTP report To.",
        matches: uniq,
      };
    }
    const bodyText = "RPM Assure alert evaluation\n\n" + uniq.map((m) => "• " + m).join("\n");
    const bodyHtml =
      "<h2>RPM Assure — alert evaluation</h2><ul>" +
      uniq.map((m) => `<li>${m.replace(/</g, "<")}</li>`).join("") +
      "</ul>";
    const send = await sendMailWithSmtp(smtp, {
      to: toRaw.split(/[;,]/).map((s) => s.trim()).filter(Boolean),
      subject: `RPM Assure ALERT — ${uniq.length} condition(s)`,
      text: bodyText,
      html: bodyHtml,
    });
    if (!send.ok) {
      appendAdminAudit({ actorEmail: "system", action: "alerts.evaluate", detail: send.error, ok: false });
      return { ok: false as const, fired: false, message: "Email failed: " + send.error, matches: uniq };
    }
    const prev = readSettingsFile();
    writeSettingsFile({
      ...prev,
      alerts: { ...getAlertConfig(), lastFiredAt: new Date().toISOString() },
    });
    appendAdminAudit({
      actorEmail: "system",
      action: "alerts.evaluate",
      detail: `fired ${uniq.length} to ${toRaw}`,
      ok: true,
    });
    return {
      ok: true as const,
      fired: true,
      message: `Alert email sent (${uniq.length} condition(s)).`,
      matches: uniq,
      messageId: send.messageId,
    };
  });


export const suggestRagFromLive = createServerFn({ method: "GET" }).handler(async () => {
  const inv = await fetchCollectInventory();
  if (!inv.ok) {
    return {
      ok: false as const,
      message: inv.message,
      result: null as null,
    };
  }
  const samples = inv.rows.map((r) => ({
    customerCode: r.customerCode,
    displayName: r.displayName,
    active: r.active,
    jobErrors: r.jobErrors,
    dtrVarLines: r.dtrVarLines,
    opsCount: r.opsCount,
    hoursSinceOps: r.hoursSinceOps,
  }));
  const current = getRagConfig();
  const result = suggestRagFromSamples(samples, current);
  return {
    ok: true as const,
    message: `Tuned from ${result.estate.activeCount} active customer(s); max job errors=${result.estate.maxJobErrors}, max DTR=${result.estate.maxDtr}.`,
    result,
    current,
  };
});

// ─── SSL / HTTPS ────────────────────────────────────────────────────────────

export const fetchSslSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { getSslConfig, sslFileStatus, buildCaddyfile, caddyfilePath } = await import(
    "./ssl-store"
  );
  const ssl = getSslConfig();
  const status = sslFileStatus();
  let existingCaddy = "";
  try {
    const fs = await import("node:fs");
    if (fs.existsSync(caddyfilePath())) {
      existingCaddy = fs.readFileSync(caddyfilePath(), "utf8");
    }
  } catch {
    /* */
  }
  return {
    ssl: { ...DEFAULT_SSL, ...ssl },
    status,
    caddyPreview: buildCaddyfile(ssl),
    existingCaddy,
  };
});

export const saveSslSettings = createServerFn({ method: "POST" })
  .validator((data: { ssl: SslConfig }) => data)
  .handler(async ({ data }) => {
    const { saveSslConfig, buildCaddyfile } = await import("./ssl-store");
    const ssl = saveSslConfig(data.ssl);
    return {
      ok: true as const,
      ssl,
      caddyPreview: buildCaddyfile(ssl),
    };
  });

export const uploadSslCertificate = createServerFn({ method: "POST" })
  .validator(
    (data: {
      certPem: string;
      keyPem: string;
      certFileName?: string;
      keyFileName?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { writeSslPemFiles, sslFileStatus, getSslConfig, buildCaddyfile } = await import(
      "./ssl-store"
    );
    const r = writeSslPemFiles({
      certPem: data.certPem,
      keyPem: data.keyPem,
      certFileName: data.certFileName,
      keyFileName: data.keyFileName,
    });
    if (!r.ok) return { ok: false as const, error: r.error };
    try {
      const { appendAdminAudit } = await import("./admin-audit");
      appendAdminAudit({
        actorEmail: "platform",
        action: "ssl.cert_upload",
        detail: `Uploaded PEM cert (${data.certFileName || "fullchain.pem"})`,
        ok: true,
      });
    } catch {
      /* */
    }
    const ssl = getSslConfig();
    return {
      ok: true as const,
      status: sslFileStatus(),
      ssl,
      caddyPreview: buildCaddyfile(ssl),
    };
  });

export const applySslConfig = createServerFn({ method: "POST" })
  .validator((data: { ssl?: SslConfig } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const { saveSslConfig, applySslToDisk, getSslConfig } = await import("./ssl-store");
    if (data?.ssl) saveSslConfig(data.ssl);
    const result = applySslToDisk(data?.ssl ?? getSslConfig());
    if (result.ok) {
      try {
        appendAdminAudit({
          actorEmail: "platform",
          action: "ssl.apply_caddyfile",
          detail: `Wrote Caddyfile mode=${(data?.ssl ?? getSslConfig()).mode} host=${(data?.ssl ?? getSslConfig()).hostname}`,
          ok: true,
        });
      } catch {
        /* */
      }
    }
    return result;
  });

export const clearSslCertificate = createServerFn({ method: "POST" }).handler(async () => {
  const fs = await import("node:fs");
  const { certPaths, deployCertPaths, sslFileStatus, saveSslConfig, getSslConfig } = await import(
    "./ssl-store"
  );
  for (const p of [certPaths(), deployCertPaths()]) {
    try {
      if (fs.existsSync(p.cert)) fs.unlinkSync(p.cert);
      if (fs.existsSync(p.key)) fs.unlinkSync(p.key);
    } catch {
      /* */
    }
  }
  const ssl = saveSslConfig({
    ...getSslConfig(),
    certFileName: null,
    keyFileName: null,
  });
  return { ok: true as const, ssl, status: sslFileStatus() };
});
