import { o as __toESM } from "../_runtime.mjs";
import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { a as DEFAULT_SMTP, i as DEFAULT_RAG, n as DEFAULT_ALERTS, o as DEFAULT_SSL, r as DEFAULT_DASHBOARD, s as emptySqlConnection } from "./types-Dk-h6nx5.mjs";
import { a as getRagConfig, c as syncPrimarySqlToEnvLocal, l as writeSettingsFile, n as getAlertConfig, o as maskPassword, r as getDashboardConfig, s as readSettingsFile, t as applyPasswordKeep } from "./settings-store-DT2EXCSw.mjs";
import { i as sqlConfigDebug, r as hasSqlConfig, t as getDataMode } from "./sql-config-BAM-cI78.mjs";
import { t as require_mssql } from "../_libs/mssql+[...].mjs";
import { n as getPool, r as import_mssql$1, t as getLastPoolError } from "./sql-pool-kLXZ0UEv.mjs";
import { n as isStaffRole } from "./roles-D3FgOqTF.mjs";
import { appendAdminAudit, readAdminAudit } from "./admin-audit-NxU6BQp5.mjs";
import { a as getDemoPortfolio, i as getDemoCustomerDetail, n as fetchLivePortfolio, o as healthFor, r as fillCustomerPanels, t as fetchLiveCustomerDetail } from "./live-portfolio-BRTWk7If.mjs";
import { cacheInvalidate } from "./query-cache-DoTtYwLe.mjs";
import { i as buildPortfolioAmsHtml, n as buildDayEndFinSightHtml, r as buildPeriodEndFinSightHtml, t as buildApplicationsAmsHtml } from "./ams-report-html-DDL_kaDs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-api-BvGKL1n8.js
var import_mssql = /* @__PURE__ */ __toESM(require_mssql());
function percentile(sortedAsc, p) {
	if (sortedAsc.length === 0) return 0;
	if (sortedAsc.length === 1) return sortedAsc[0];
	const idx = (sortedAsc.length - 1) * p;
	const lo = Math.floor(idx);
	const hi = Math.ceil(idx);
	if (lo === hi) return sortedAsc[lo];
	const w = idx - lo;
	return sortedAsc[lo] * (1 - w) + sortedAsc[hi] * w;
}
/**
* Derive RAG thresholds from live estate samples (no code deploy).
*
* Goals for ExCo / AMS:
* - Amber = watch (any material job noise or FinSight Out of Balance)
* - Red = needs attention this week (outlier job volume)
* - Don't paint whole estate Red if baseline Out of Balance is chronically high
* - Stale collect reflects schedule (15 min) with operational buffer
*/
function suggestRagFromSamples(samples, current) {
	const base = {
		...DEFAULT_RAG,
		...current ?? {}
	};
	const active = samples.filter((s) => s.active);
	const withCollect = active.filter((s) => s.opsCount > 0 || s.hoursSinceOps != null);
	const jobSeries = active.map((s) => s.jobErrors).sort((a, b) => a - b);
	const jobNonZero = jobSeries.filter((j) => j > 0);
	const dtrSeries = active.map((s) => s.dtrVarLines).sort((a, b) => a - b);
	const hourSeries = active.map((s) => s.hoursSinceOps).filter((h) => h != null && Number.isFinite(h)).sort((a, b) => a - b);
	const maxJob = jobSeries.length ? jobSeries[jobSeries.length - 1] : 0;
	const p75Job = Math.round(percentile(jobSeries, .75));
	const p90Job = Math.round(percentile(jobSeries, .9));
	const maxDtr = dtrSeries.length ? dtrSeries[dtrSeries.length - 1] : 0;
	const p75Dtr = Math.round(percentile(dtrSeries, .75));
	const maxHours = hourSeries.length ? hourSeries[hourSeries.length - 1] : null;
	const p50Hours = hourSeries.length ? percentile(hourSeries, .5) : null;
	const rationale = [];
	let amberFrom = 1;
	if (jobNonZero.length >= 2 && maxJob > 0 && maxJob < 10) {
		const sortedNz = [...jobNonZero].sort((a, b) => a - b);
		const secondWorst = sortedNz[sortedNz.length - 2];
		amberFrom = Math.max(1, secondWorst + 1);
		rationale.push(`Job Amber from ${amberFrom}: estate max job errors = ${maxJob} (<10). Sites at ≤${secondWorst} stay Green on jobs; mid-band = Amber.`);
	} else if (jobNonZero.length >= 2) {
		const minNz = Math.min(...jobNonZero);
		if (minNz >= 5 && maxJob <= minNz * 2) {
			amberFrom = Math.max(1, minNz);
			rationale.push(`Job Amber from ${amberFrom}: all sites with errors sit near a floor (~${minNz}); treat below as normal noise.`);
		} else rationale.push(`Job Amber from 1: any job error is a watch signal (min non-zero = ${minNz || 0}).`);
	} else if (jobNonZero.length === 1) rationale.push(`Job Amber from 1: single site with ${jobNonZero[0]} error(s); keep early watch signal.`);
	else rationale.push("Job Amber from 1: no job errors on active customers today.");
	let redAt = Math.max(5, Math.ceil(Math.max(p75Job * 1.5, p90Job + 1, maxJob > 0 ? maxJob + 1 : 5)));
	if (maxJob > 0 && maxJob < 10) {
		redAt = Math.max(10, redAt);
		rationale.push(`Job Red at ${redAt}: max live errors = ${maxJob} (estate still mid-single digits) — Red stays a material bar, not "anyone with jobs".`);
	} else if (maxJob >= 10) {
		const second = jobSeries.length >= 2 ? jobSeries[jobSeries.length - 2] : 0;
		if (maxJob >= second * 2 && maxJob >= 10) {
			redAt = Math.max(10, Math.ceil((second + maxJob) / 2));
			rationale.push(`Job Red at ${redAt}: worst site (${maxJob}) is an outlier vs next (${second}).`);
		} else {
			redAt = Math.max(10, Math.ceil(p75Job * 1.5) || 10);
			rationale.push(`Job Red at ${redAt}: p75=${p75Job}, p90=${p90Job}, max=${maxJob} across ${active.length} active customer(s).`);
		}
	} else {
		redAt = 10;
		rationale.push("Job Red at 10: clean estate — keep standard AMS threshold.");
	}
	if (amberFrom >= redAt) amberFrom = Math.max(0, redAt - 1);
	const dtrVarianceIsAmber = true;
	let dtrVarianceRedAt = 0;
	if (maxDtr > 0) if (maxDtr >= 100 && p75Dtr >= 50) {
		dtrVarianceRedAt = Math.max(100, Math.ceil(p75Dtr * 2));
		rationale.push(`FinSight Red at ${dtrVarianceRedAt} lines (optional hard Red): chronic Out of Balance present (max ${maxDtr}, p75 ${p75Dtr}). Any Out of Balance still Amber.`);
	} else {
		dtrVarianceRedAt = 0;
		rationale.push(`FinSight Red off (0): max Out of Balance lines = ${maxDtr} — keep as Amber control signal, not Red outage.`);
	}
	else rationale.push("Out of Balance: no out-of-balance lines on sampled modules — Amber-on-variance stays on for early warning.");
	let collectStaleHours = base.collectStaleHours || 48;
	if (p50Hours != null && maxHours != null) if (maxHours < 2) {
		collectStaleHours = 24;
		rationale.push(`Collect stale at 24h: live ages are sub-hour (max ~${maxHours.toFixed(1)}h); 15-min schedule is healthy.`);
	} else {
		const opsStale = Math.max(6, Math.ceil(p50Hours * 3 + 1));
		collectStaleHours = Math.min(72, Math.max(24, opsStale));
		rationale.push(`Collect stale at ${collectStaleHours}h: median age ~${p50Hours.toFixed(1)}h, max ~${maxHours.toFixed(1)}h.`);
	}
	else {
		collectStaleHours = 48;
		rationale.push("Collect stale at 48h: limited last-import samples — keep board default.");
	}
	const suggested = {
		jobErrorsRedAt: redAt,
		jobErrorsAmberFrom: amberFrom,
		dtrVarianceIsAmber,
		dtrVarianceRedAt,
		noOperatorsIsAmber: true,
		collectStaleHours
	};
	return {
		suggested,
		rationale,
		samples: samples.map((s) => {
			const cur = healthFor({
				operatorCount: s.opsCount,
				jobErrorCount: s.jobErrors,
				dtrVariance: s.dtrVarLines
			}, base);
			const sug = healthFor({
				operatorCount: s.opsCount,
				jobErrorCount: s.jobErrors,
				dtrVariance: s.dtrVarLines
			}, suggested);
			return {
				...s,
				currentRag: cur.rag,
				suggestedRag: sug.rag
			};
		}),
		estate: {
			activeCount: active.length,
			withCollect: withCollect.length,
			maxJobErrors: maxJob,
			p75JobErrors: p75Job,
			maxDtr,
			maxHoursSinceOps: maxHours
		}
	};
}
function publicSql(c) {
	return {
		...c,
		password: "",
		passwordConfigured: Boolean(c.password && c.password.length > 0)
	};
}
var fetchSettingsBundle_createServerFn_handler = createServerRpc({
	id: "58e40e28be1c07ac58d2e28371a30a821f8eee26af85658aed6835d1b8dfd720",
	name: "fetchSettingsBundle",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => fetchSettingsBundle.__executeServer(opts));
var fetchSettingsBundle = createServerFn({ method: "GET" }).handler(fetchSettingsBundle_createServerFn_handler, async () => {
	const file = readSettingsFile();
	const dbg = sqlConfigDebug();
	let liveTest = {
		ok: false,
		message: "Not tested"
	};
	if (hasSqlConfig()) try {
		const pool = await getPool();
		if (pool) {
			const row = (await pool.request().query("SELECT DB_NAME() AS db, @@SERVERNAME AS srv")).recordset[0];
			liveTest = {
				ok: true,
				message: `Connected ${row.srv} / ${row.db}`
			};
		} else liveTest = {
			ok: false,
			message: getLastPoolError() ?? "No pool"
		};
	} catch (e) {
		liveTest = {
			ok: false,
			message: e instanceof Error ? e.message : String(e)
		};
	}
	const pwdLen = (file.sqlConnections.find((c) => c.isPrimary) ?? file.sqlConnections[0])?.password?.length ?? 0;
	if (!liveTest.ok && pwdLen === 0) liveTest = {
		ok: false,
		message: (liveTest.message || "SQL issue") + " · No password stored in settings file yet."
	};
	else if (!liveTest.ok && pwdLen > 0) liveTest = {
		ok: false,
		message: (liveTest.message || "SQL issue") + ` · Password on file length=${pwdLen} (not shown). If wrong, re-type password and Save, then Reset Application Service.`
	};
	return {
		sqlConnections: file.sqlConnections.map(publicSql),
		smtp: {
			...file.smtp,
			password: file.smtp.password ? maskPassword(file.smtp.password) : ""
		},
		rag: {
			...DEFAULT_RAG,
			...file.rag ?? {}
		},
		alerts: {
			...DEFAULT_ALERTS,
			...file.alerts ?? {},
			lastFiredAt: file.alerts?.lastFiredAt ?? null
		},
		dashboard: {
			...DEFAULT_DASHBOARD,
			...file.dashboard ?? {}
		},
		runtime: {
			dataMode: getDataMode(),
			hasSqlConfig: hasSqlConfig(),
			debug: dbg,
			liveTest,
			passwordLength: pwdLen
		},
		updatedAt: file.updatedAt
	};
});
var saveSqlConnections_createServerFn_handler = createServerRpc({
	id: "fe5e358b8db02d1858d530fbba60d9d4bf259ff30bcddbbbe67fddb564a4e3b3",
	name: "saveSqlConnections",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => saveSqlConnections.__executeServer(opts));
var saveSqlConnections = createServerFn({ method: "POST" }).validator((data) => data).handler(saveSqlConnections_createServerFn_handler, async ({ data }) => {
	const prev = readSettingsFile();
	const prevById = new Map(prev.sqlConnections.map((c) => [c.id, c]));
	const next = data.connections.map((c, i) => {
		const old = prevById.get(c.id);
		const id = c.id || crypto.randomUUID();
		return {
			...emptySqlConnection({
				...c,
				id
			}),
			password: applyPasswordKeep(c.password, old?.password ?? ""),
			isPrimary: c.isPrimary,
			name: c.name || `Connection ${i + 1}`
		};
	});
	if (next.length && !next.some((c) => c.isPrimary)) next[0].isPrimary = true;
	if (next.filter((c) => c.isPrimary).length > 1) next.forEach((c, i) => {
		c.isPrimary = i === next.findIndex((x) => x.isPrimary);
	});
	writeSettingsFile({
		...prev,
		sqlConnections: next
	});
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
			dataMode: primary.dataMode
		});
		process.env.RPM_ASSURE_SQL_SERVER = primary.server.trim();
		process.env.RPM_ASSURE_SQL_PORT = String(primary.port || 14333);
		process.env.RPM_ASSURE_SQL_DATABASE = primary.database || "RPMAssure_App";
		process.env.RPM_ASSURE_SQL_USER = primary.user.trim();
		process.env.RPM_ASSURE_SQL_PASSWORD = primary.password;
		process.env.RPM_ASSURE_SQL_TRUST_CERT = primary.trustServerCertificate === false ? "false" : "true";
		process.env.RPM_ASSURE_SQL_ENCRYPT = primary.encrypt ? "true" : "false";
		process.env.RPM_ASSURE_DATA_MODE = primary.dataMode || "auto";
	}
	try {
		const { resetPool } = await import("./sql-pool-kLXZ0UEv.mjs").then((n) => n.i);
		const { invalidateEnvCache } = await import("./sql-config-BAM-cI78.mjs").then((n) => n.a);
		invalidateEnvCache?.();
		resetPool?.();
	} catch {}
	return {
		ok: true,
		count: next.length,
		passwordSaved: Boolean(primary?.password)
	};
});
var saveSmtpSettings_createServerFn_handler = createServerRpc({
	id: "17344401878010a15e1e05a83873847e42f68bc9cdede376754820b13fd2f6e9",
	name: "saveSmtpSettings",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => saveSmtpSettings.__executeServer(opts));
var saveSmtpSettings = createServerFn({ method: "POST" }).validator((data) => data).handler(saveSmtpSettings_createServerFn_handler, async ({ data }) => {
	const prev = readSettingsFile();
	const smtp = {
		...DEFAULT_SMTP,
		...data.smtp,
		password: applyPasswordKeep(data.smtp.password, prev.smtp.password)
	};
	writeSettingsFile({
		...prev,
		smtp
	});
	return { ok: true };
});
var testSqlConnection_createServerFn_handler = createServerRpc({
	id: "ff7f93a0a6d214ae1c30719cdc467ba31563d216753b8a7a1e4887dd1b9bb568",
	name: "testSqlConnection",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => testSqlConnection.__executeServer(opts));
var testSqlConnection = createServerFn({ method: "POST" }).validator((data) => data).handler(testSqlConnection_createServerFn_handler, async ({ data }) => {
	const old = readSettingsFile().sqlConnections.find((c) => c.id === data.connection.id);
	const password = applyPasswordKeep(data.connection.password, old?.password ?? "");
	const c = data.connection;
	if (!c.server?.trim() || !c.user?.trim()) return {
		ok: false,
		message: "Server and user required"
	};
	if (!password) return {
		ok: false,
		message: "No password on file. Type the full password in the Password field (leave blank only after it was saved once), then Test or Save."
	};
	const server = c.server.trim();
	const port = Number(c.port) || 14333;
	const database = (c.database || "RPMAssure_App").trim();
	const user = c.user.trim();
	const trust = c.trustServerCertificate !== false;
	async function tryConnect(encrypt) {
		const pool = await new import_mssql.default.ConnectionPool({
			server,
			port,
			database,
			user,
			password,
			options: {
				encrypt,
				trustServerCertificate: trust,
				enableArithAbort: true
			},
			connectionTimeout: 12e3,
			requestTimeout: 12e3
		}).connect();
		const r = await pool.request().query("SELECT 1 AS ok, @@SERVERNAME AS srv, DB_NAME() AS db, SUSER_SNAME() AS who");
		await pool.close();
		return r.recordset[0];
	}
	const preferEncrypt = Boolean(c.encrypt);
	try {
		const row = await tryConnect(preferEncrypt);
		return {
			ok: true,
			message: `OK — ${row.srv} / ${row.db} as ${row.who} (encrypt=${preferEncrypt})`
		};
	} catch (e1) {
		const m1 = e1 instanceof Error ? e1.message : String(e1);
		try {
			const row = await tryConnect(!preferEncrypt);
			return {
				ok: true,
				message: `OK — ${row.srv} / ${row.db} as ${row.who} (encrypt=${!preferEncrypt}; toggled after first attempt failed)`
			};
		} catch (e2) {
			const m2 = e2 instanceof Error ? e2.message : String(e2);
			return {
				ok: false,
				message: `Login/connect failed for ${user} @ ${server},${port} / ${database}. encrypt=${preferEncrypt}: ${m1} | encrypt=${!preferEncrypt}: ${m2}. Verify with: sqlcmd -S "${server},${port}" -d "${database}" -U "${user}" -P "***" -C -Q "SELECT 1"`
			};
		}
	}
});
var runSqlQuery_createServerFn_handler = createServerRpc({
	id: "84a61ab9e54742c267ae90708648d8e5f3ca5dd7e24f7a195f3827fe9d318595",
	name: "runSqlQuery",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => runSqlQuery.__executeServer(opts));
var runSqlQuery = createServerFn({ method: "POST" }).validator((data) => data).handler(runSqlQuery_createServerFn_handler, async ({ data }) => {
	const empty = (message) => ({
		ok: false,
		message,
		columns: [],
		rows: [],
		rowCount: 0
	});
	const text = (data.sqlText ?? "").trim();
	if (!text) return empty("Empty query");
	const stripped = text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ").trim();
	const upper = stripped.toUpperCase();
	if (!/^(SELECT|WITH)\b/.test(upper)) return empty("Only SELECT / WITH (CTE) queries are allowed.");
	if (/\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|GRANT|REVOKE|DENY|xp_)\b/i.test(stripped)) return empty("Query contains a blocked keyword.");
	if (stripped.includes(";") && stripped.replace(/;+\s*$/, "").includes(";")) return empty("Multiple statements are not allowed.");
	const maxRows = Math.min(Math.max(data.maxRows ?? 200, 1), 1e3);
	const pool = await getPool();
	if (!pool) return empty(getLastPoolError() ?? "SQL not connected");
	try {
		const wrapped = `
SET NOCOUNT ON;
SET ROWCOUNT ${maxRows};
${stripped.replace(/;+\s*$/, "")};
SET ROWCOUNT 0;
`;
		const recordset = (await pool.request().query(wrapped)).recordset ?? [];
		const columns = recordset.length > 0 ? Object.keys(recordset[0]) : [];
		const rows = recordset.map((r) => {
			const o = {};
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
			rowCount: rows.length
		};
	} catch (e) {
		return empty(e instanceof Error ? e.message : String(e));
	}
});
async function ensureStaffRoleColumn(pool) {
	await pool.request().query(`
    IF COL_LENGTH(N'dbo.App_User', N'StaffRole') IS NULL
      ALTER TABLE dbo.App_User ADD StaffRole nvarchar(30) NULL;
  `);
}
var fetchAppUsers_createServerFn_handler = createServerRpc({
	id: "e346678ce4d1c40d58acf8eea7d3b838c1ad131a9a09d970365c961365284d8c",
	name: "fetchAppUsers",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => fetchAppUsers.__executeServer(opts));
var fetchAppUsers = createServerFn({ method: "GET" }).handler(fetchAppUsers_createServerFn_handler, async () => {
	const pool = await getPool();
	if (!pool) return {
		ok: false,
		message: getLastPoolError() ?? "SQL not connected",
		users: []
	};
	try {
		await ensureStaffRoleColumn(pool);
		const users = ((await pool.request().query(`
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
    `)).recordset ?? []).map((row) => ({
			appUserId: String(row.appUserId),
			userName: String(row.userName ?? ""),
			email: String(row.email ?? ""),
			displayName: String(row.displayName ?? ""),
			staffRole: String(row.staffRole ?? "TechnicalReadOnly"),
			isPlatformAdmin: Boolean(row.isPlatformAdmin),
			isActive: Boolean(row.isActive),
			customerCount: Number(row.customerCount) || 0
		}));
		return {
			ok: true,
			message: `${users.length} user(s)`,
			users
		};
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e),
			users: []
		};
	}
});
var upsertAppUser_createServerFn_handler = createServerRpc({
	id: "88d196eac8c27dea565e67c3ec0965562bbbe0f2acecfbae6e99322411df66fe",
	name: "upsertAppUser",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => upsertAppUser.__executeServer(opts));
var upsertAppUser = createServerFn({ method: "POST" }).validator((data) => data).handler(upsertAppUser_createServerFn_handler, async ({ data }) => {
	const pool = await getPool();
	if (!pool) return {
		ok: false,
		message: getLastPoolError() ?? "SQL not connected"
	};
	const email = data.email.trim().toLowerCase();
	const displayName = data.displayName.trim() || email;
	const userName = (data.userName?.trim() || email.split("@")[0] || "user").slice(0, 100);
	let role = "TechnicalReadOnly";
	if (isStaffRole(data.staffRole)) role = data.staffRole;
	const isAdmin = role === "PlatformAdmin";
	try {
		await ensureStaffRoleColumn(pool);
		if (data.appUserId) await pool.request().input("id", import_mssql$1.default.UniqueIdentifier, data.appUserId).input("email", import_mssql$1.default.NVarChar(256), email).input("dn", import_mssql$1.default.NVarChar(200), displayName).input("un", import_mssql$1.default.NVarChar(100), userName).input("role", import_mssql$1.default.NVarChar(30), role).input("admin", import_mssql$1.default.Bit, isAdmin).input("active", import_mssql$1.default.Bit, data.isActive).query(`
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
		else await pool.request().input("email", import_mssql$1.default.NVarChar(256), email).input("dn", import_mssql$1.default.NVarChar(200), displayName).input("un", import_mssql$1.default.NVarChar(100), userName).input("role", import_mssql$1.default.NVarChar(30), role).input("admin", import_mssql$1.default.Bit, isAdmin).input("active", import_mssql$1.default.Bit, data.isActive).query(`
            IF EXISTS (SELECT 1 FROM dbo.App_User WHERE LOWER(Email) = @email)
              UPDATE dbo.App_User
              SET DisplayName = @dn, UserName = @un, StaffRole = @role,
                  IsPlatformAdmin = @admin, IsActive = @active, UpdatedAt = SYSUTCDATETIME()
              WHERE LOWER(Email) = @email;
            ELSE
              INSERT INTO dbo.App_User (UserName, Email, DisplayName, StaffRole, IsPlatformAdmin, IsActive)
              VALUES (@un, @email, @dn, @role, @admin, @active);
          `);
		return {
			ok: true,
			message: "User saved"
		};
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e)
		};
	}
});
var restartApplicationService_createServerFn_handler = createServerRpc({
	id: "e4cc34ac404a923705a2775cef64d4276288ad274bee1364c5094ba929d36a82",
	name: "restartApplicationService",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => restartApplicationService.__executeServer(opts));
var restartApplicationService = createServerFn({ method: "POST" }).handler(restartApplicationService_createServerFn_handler, async () => {
	const { spawn } = await import("node:child_process");
	const path = await import("node:path");
	const fs = await import("node:fs");
	const appRoot = process.cwd();
	const script = path.join(appRoot, "scripts", "Restart-RpmAssure.ps1");
	const target = fs.existsSync(script) ? script : "C:\\RPM-Assure\\App\\scripts\\Restart-RpmAssure.ps1";
	if (!fs.existsSync(target)) return {
		ok: false,
		message: `Restart script not found at ${script}. Deploy scripts/Restart-RpmAssure.ps1`
	};
	spawn("powershell.exe", [
		"-NoProfile",
		"-ExecutionPolicy",
		"Bypass",
		"-File",
		target
	], {
		detached: true,
		stdio: "ignore",
		windowsHide: true,
		cwd: appRoot
	}).unref();
	setTimeout(() => {
		try {
			process.exit(0);
		} catch {}
	}, 800);
	return {
		ok: true,
		message: "Restart requested. Wait 10–15 seconds, then refresh the page. If the app does not come back, run Start-Dev.ps1 on the server."
	};
});
var sendTestEmail_createServerFn_handler = createServerRpc({
	id: "79a2f398972f9fc5229e18ad025181a7f611977f75b6a160e5a101639f233488",
	name: "sendTestEmail",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => sendTestEmail.__executeServer(opts));
var sendTestEmail = createServerFn({ method: "POST" }).validator((data) => data).handler(sendTestEmail_createServerFn_handler, async () => {
	return {
		ok: false,
		error: "Outbound email is disabled in this release."
	};
});
var sendWeeklyReportNow_createServerFn_handler = createServerRpc({
	id: "b7a147e4c65eabaefa08f85aa80915d8557bd049e0696f870ec57558bf152be3",
	name: "sendWeeklyReportNow",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => sendWeeklyReportNow.__executeServer(opts));
var sendWeeklyReportNow = createServerFn({ method: "POST" }).validator((data) => data ?? {}).handler(sendWeeklyReportNow_createServerFn_handler, async () => {
	return {
		ok: false,
		error: "Weekly email is disabled — use Reports UI."
	};
});
async function loadPortfolioForReport() {
	if (getDataMode() !== "demo" && hasSqlConfig()) try {
		const live = await fetchLivePortfolio();
		if (live?.rows?.length) return live;
	} catch (e) {
		console.warn("[rpm-assure] report portfolio live failed:", e instanceof Error ? e.message : e);
	}
	return getDemoPortfolio();
}
function emptyCustomerDetail(row) {
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
		amsSlaSummary: null,
		changes: [],
		csat: null,
		operGroups: [],
		operAmends: [],
		securitySummary: {
			groupMemberships: 0,
			distinctOperatorsInGroups: 0,
			distinctGroups: 0,
			amendCount90d: 0
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
			lastAuditImport: null
		},
		operationalAssurance: {
			collectAgeHours: null,
			collectFresh: false,
			jobErrorCount: row.sysproJobErrorCount,
			activeUserRatioPct: null,
			dtrOutOfBalance: row.sysproDtrVarianceLines,
			scorePct: row.healthRag === "Green" ? 80 : row.healthRag === "Amber" ? 55 : 30,
			summary: row.healthSummary || "Portfolio row only — detail collect incomplete."
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
			message: null
		},
		cove: {
			enabled: false,
			summary: null,
			devices: [],
			mapping: [],
			unmapped: [],
			message: null
		},
		dataMode: "live"
	};
}
async function loadCustomerForReport(code) {
	const mode = getDataMode();
	let lastErr = null;
	if (mode !== "demo" && hasSqlConfig()) try {
		const live = await fetchLiveCustomerDetail(code);
		if (live) try {
			return {
				customer: fillCustomerPanels(live),
				source: "live",
				warning: null
			};
		} catch (e) {
			lastErr = e instanceof Error ? e.message : String(e);
			console.warn("[rpm-assure] fillCustomerPanels failed:", lastErr);
			return {
				customer: live,
				source: "live",
				warning: lastErr
			};
		}
	} catch (e) {
		lastErr = e instanceof Error ? e.message : String(e);
		console.warn("[rpm-assure] report customer live failed:", lastErr);
	}
	try {
		const demo = getDemoCustomerDetail(code);
		if (demo) return {
			customer: fillCustomerPanels(demo),
			source: "demo",
			warning: lastErr ? `Live detail failed (${lastErr}); showing demo/fallback.` : null
		};
	} catch (e) {
		lastErr = e instanceof Error ? e.message : String(e);
	}
	try {
		const row = (await loadPortfolioForReport()).rows.find((r) => r.customerCode.toUpperCase() === code.toUpperCase());
		if (row) {
			const raw = emptyCustomerDetail(row);
			return {
				customer: fillCustomerPanels(raw),
				source: "portfolio",
				warning: lastErr ? `Detail load failed (${lastErr}); preview built from portfolio metrics only.` : "Preview built from portfolio metrics only."
			};
		}
	} catch (e) {
		lastErr = e instanceof Error ? e.message : String(e);
	}
	return {
		customer: null,
		source: "none",
		warning: lastErr
	};
}
function buildPack(format, customer, portfolio) {
	if (format === "estate") return buildPortfolioAmsHtml(portfolio);
	if (!customer) throw new Error("Customer required for this format");
	if (format === "day-end") return buildDayEndFinSightHtml({
		customer,
		portfolio
	});
	if (format === "period-end") return buildPeriodEndFinSightHtml({
		customer,
		portfolio
	});
	return buildApplicationsAmsHtml({
		customer,
		portfolio
	});
}
/** Minimal always-safe HTML when a full pack builder throws */
function fallbackReportPack(format, customer, err) {
	const name = customer?.customer?.displayName || customer?.customer?.customerCode || "Customer";
	const code = customer?.customer?.customerCode || "—";
	const rag = customer?.customer?.healthRag || "—";
	const subject = `RPM Assure — ${format} — ${name} (partial)`;
	const text = `${subject}\n\nPreview builder error: ${err}\nHealth: ${rag}\nJobs: ${customer?.customer?.sysproJobErrorCount ?? "—"}\nFinSight Out of Balance: ${customer?.customer?.sysproDtrVarianceLines ?? "—"}`;
	return {
		subject,
		html: `<!DOCTYPE html><html lang="en-ZA"><head><meta charset="utf-8"/><title>${subject.replace(/</g, "")}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#1a1a1a}h1{color:#12365a}.err{background:#fff4f4;border:1px solid #e8b4b4;padding:12px;border-radius:8px;margin:16px 0}.ok{color:#1a8f4a}</style></head><body>
<h1>RPM Assure — ${format}</h1>
<p><strong>${name}</strong> (${code}) · Health ${rag}</p>
<div class="err"><strong>Full pack could not be built.</strong><br/>${err.replace(/</g, "<")}<br/><span class="ok">Showing fallback metrics so you can still print / email a stub.</span></div>
<ul>
<li>Job errors: ${customer?.customer?.sysproJobErrorCount ?? "—"}</li>
<li>FinSight Out of Balance lines: ${customer?.customer?.sysproDtrVarianceLines ?? "—"}</li>
<li>Active users: ${customer?.customer?.activeUserCount ?? "—"}</li>
<li>Last collect: ${customer?.customer?.lastImportAt ?? "—"}</li>
<li>FinSight modules in payload: ${customer?.dtrLevel1?.length ?? 0}</li>
<li>Backup rows: ${customer?.sqlBackups?.length ?? 0}</li>
</ul>
<p style="color:#666;font-size:12px">If this persists, check server log for [rpm-assure] previewAmsReportHtml and apply the latest crash/report fix pack.</p>
</body></html>`,
		text
	};
}
var sendAmsReportEmail_createServerFn_handler = createServerRpc({
	id: "c14a8b9e79c11b299abada98d12ca72db22a5056be37f01c24f779edfbb27c85",
	name: "sendAmsReportEmail",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => sendAmsReportEmail.__executeServer(opts));
var sendAmsReportEmail = createServerFn({ method: "POST" }).validator((data) => data).handler(sendAmsReportEmail_createServerFn_handler, async () => {
	return {
		ok: false,
		error: "Outbound email is disabled — use Preview / Print in Reports."
	};
});
var previewAmsReportHtml_createServerFn_handler = createServerRpc({
	id: "d17ce60656ef8bfaafd6707ece0cecf55d0784ce568277b2f71adba743a6a49b",
	name: "previewAmsReportHtml",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => previewAmsReportHtml.__executeServer(opts));
var previewAmsReportHtml = createServerFn({ method: "POST" }).validator((data) => data ?? {}).handler(previewAmsReportHtml_createServerFn_handler, async ({ data }) => {
	try {
		const format = data?.format || "ams-full";
		let portfolio;
		try {
			portfolio = await loadPortfolioForReport();
		} catch (pe) {
			const msg = pe instanceof Error ? pe.message : String(pe);
			console.error("[rpm-assure] preview portfolio load failed:", msg);
			return {
				ok: false,
				error: "Could not load portfolio for report: " + msg
			};
		}
		if (format === "estate") try {
			const pack = buildPortfolioAmsHtml(portfolio);
			return {
				ok: true,
				subject: pack.subject,
				html: pack.html,
				source: portfolio.summary?.dataMode ?? "demo",
				warning: null
			};
		} catch (ee) {
			const msg = ee instanceof Error ? ee.message : String(ee);
			const pack = fallbackReportPack("estate", null, msg);
			return {
				ok: true,
				subject: pack.subject,
				html: pack.html,
				source: "fallback",
				warning: msg
			};
		}
		const code = (data?.customerCode || "").trim();
		if (!code) return {
			ok: false,
			error: "Select a customer (or wait for the list to load)."
		};
		let loaded;
		try {
			loaded = await loadCustomerForReport(code);
		} catch (ce) {
			const msg = ce instanceof Error ? ce.message : String(ce);
			console.error("[rpm-assure] preview customer load failed:", msg);
			return {
				ok: false,
				error: "Could not load customer " + code + ": " + msg
			};
		}
		if (!loaded.customer) return {
			ok: false,
			error: "Customer not found: " + code + (loaded.warning ? " — " + loaded.warning : "") + ". Check Dim_Customer is Active and collect has run."
		};
		try {
			const pack = buildPack(format, loaded.customer, portfolio);
			if (!pack?.html) throw new Error("Report builder returned empty HTML");
			return {
				ok: true,
				subject: pack.subject || `RPM Assure — ${format}`,
				html: pack.html,
				source: loaded.source,
				warning: loaded.warning
			};
		} catch (be) {
			const msg = be instanceof Error ? be.message : String(be);
			console.error("[rpm-assure] previewAmsReportHtml buildPack failed:", msg);
			const pack = fallbackReportPack(format, loaded.customer, msg);
			return {
				ok: true,
				subject: pack.subject,
				html: pack.html,
				source: loaded.source,
				warning: "Builder error (fallback pack): " + msg
			};
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.error("[rpm-assure] previewAmsReportHtml failed:", msg);
		return {
			ok: false,
			error: "Preview failed: " + msg
		};
	}
});
var saveRagSettings_createServerFn_handler = createServerRpc({
	id: "5129309f413cade2ca14df47a702fd6f1a9bc8debd22e51a5ed7b67bda140274",
	name: "saveRagSettings",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => saveRagSettings.__executeServer(opts));
var saveRagSettings = createServerFn({ method: "POST" }).validator((data) => data).handler(saveRagSettings_createServerFn_handler, async ({ data }) => {
	const prev = readSettingsFile();
	writeSettingsFile({
		...prev,
		rag: data.rag
	});
	try {
		cacheInvalidate();
	} catch {}
	appendAdminAudit({
		actorEmail: "platform-admin",
		action: "settings.rag.save",
		detail: JSON.stringify(data.rag),
		ok: true
	});
	return {
		ok: true,
		rag: getRagConfig()
	};
});
var saveAlertSettings_createServerFn_handler = createServerRpc({
	id: "b4d203b2fa3ac8338846f581680fef535ab66a3359fa93bac7e96b421415fd65",
	name: "saveAlertSettings",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => saveAlertSettings.__executeServer(opts));
var saveAlertSettings = createServerFn({ method: "POST" }).validator((data) => data).handler(saveAlertSettings_createServerFn_handler, async ({ data }) => {
	const prev = readSettingsFile();
	const keepLast = prev.alerts?.lastFiredAt ?? null;
	writeSettingsFile({
		...prev,
		alerts: {
			...data.alerts,
			lastFiredAt: keepLast
		}
	});
	appendAdminAudit({
		actorEmail: "platform-admin",
		action: "settings.alerts.save",
		detail: JSON.stringify({
			...data.alerts,
			lastFiredAt: keepLast
		}),
		ok: true
	});
	return {
		ok: true,
		alerts: getAlertConfig()
	};
});
var saveDashboardSettings_createServerFn_handler = createServerRpc({
	id: "a792fdbf518dfb39d042af6c2e06d95556058ae88e2701c21ca61a1e147e8c08",
	name: "saveDashboardSettings",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => saveDashboardSettings.__executeServer(opts));
var saveDashboardSettings = createServerFn({ method: "POST" }).validator((data) => data).handler(saveDashboardSettings_createServerFn_handler, async ({ data }) => {
	const prev = readSettingsFile();
	writeSettingsFile({
		...prev,
		dashboard: data.dashboard
	});
	appendAdminAudit({
		actorEmail: "platform-admin",
		action: "settings.dashboard.save",
		detail: JSON.stringify(data.dashboard),
		ok: true
	});
	return {
		ok: true,
		dashboard: getDashboardConfig()
	};
});
var fetchCollectInventory_createServerFn_handler = createServerRpc({
	id: "d0b916ca8f2beb5e5c66fe496b269dba185de3390d2551fd0c93951d56a98a65",
	name: "fetchCollectInventory",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => fetchCollectInventory.__executeServer(opts));
var fetchCollectInventory = createServerFn({ method: "GET" }).handler(fetchCollectInventory_createServerFn_handler, async () => {
	const rag = getRagConfig();
	const pool = await getPool();
	if (!pool) return {
		ok: false,
		message: getLastPoolError() ?? "SQL not connected",
		rows: [],
		staleHours: rag.collectStaleHours
	};
	try {
		const r = await pool.request().query(`
SET NOCOUNT ON;
;WITH Cust AS (
  SELECT CustomerCode, DisplayName,
         ISNULL(SqlInstanceName, N'') AS SqlInstanceName,
         CAST(Active AS bit) AS Active
  FROM dbo.Dim_Customer WITH (NOLOCK)
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
SELECT c.CustomerCode, c.DisplayName, c.SqlInstanceName, c.Active,
       o.LastOps, ISNULL(o.OpsCnt, 0) AS OpsCnt,
       j.LastJobs, ISNULL(j.JobsCnt, 0) AS JobsCnt, ISNULL(j.JobErrors, 0) AS JobErrors,
       l.LastLicense, d.LastDtr, ISNULL(d.VarLines, 0) AS VarLines
FROM Cust c
LEFT JOIN Ops o ON o.InstanceName = c.SqlInstanceName
LEFT JOIN Jobs j ON j.InstanceName = c.SqlInstanceName
LEFT JOIN Lic l ON l.InstanceName = c.SqlInstanceName
LEFT JOIN Dtr d ON d.InstanceName = c.SqlInstanceName
ORDER BY c.DisplayName;
`);
		const now = Date.now();
		const rows = (r.recordset ?? []).map((row) => {
			const lastOps = row.LastOps ? new Date(row.LastOps) : null;
			const hours = lastOps && !Number.isNaN(lastOps.getTime()) ? (now - lastOps.getTime()) / 36e5 : null;
			const opsCount = Number(row.OpsCnt) || 0;
			const jobErrors = Number(row.JobErrors) || 0;
			const dtrVar = Number(row.VarLines) || 0;
			const { rag: healthRag, summary } = healthFor({
				operatorCount: opsCount,
				jobErrorCount: jobErrors,
				dtrVariance: dtrVar
			}, rag);
			return {
				customerCode: String(row.CustomerCode ?? ""),
				displayName: String(row.DisplayName ?? ""),
				sqlInstanceName: String(row.SqlInstanceName ?? ""),
				active: Boolean(row.Active),
				lastOpsUtc: lastOps ? lastOps.toISOString() : null,
				opsCount,
				lastJobsUtc: row.LastJobs ? new Date(row.LastJobs).toISOString() : null,
				jobsCount: Number(row.JobsCnt) || 0,
				jobErrors,
				lastLicenseUtc: row.LastLicense ? new Date(row.LastLicense).toISOString() : null,
				lastDtrUtc: row.LastDtr ? new Date(row.LastDtr).toISOString() : null,
				dtrVarLines: dtrVar,
				hoursSinceOps: hours == null ? null : Math.round(hours * 10) / 10,
				stale: hours == null || hours > rag.collectStaleHours,
				healthRag,
				healthSummary: summary
			};
		});
		return {
			ok: true,
			message: `${rows.length} customer(s)`,
			rows,
			staleHours: rag.collectStaleHours
		};
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e),
			rows: [],
			staleHours: rag.collectStaleHours
		};
	}
});
var fetchIntegrations_createServerFn_handler = createServerRpc({
	id: "e16a9519b068f1e7954c5c132801bc0d54b097934604e5227709d20163057750",
	name: "fetchIntegrations",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => fetchIntegrations.__executeServer(opts));
var fetchIntegrations = createServerFn({ method: "GET" }).handler(fetchIntegrations_createServerFn_handler, async () => {
	const pool = await getPool();
	if (!pool) return {
		ok: false,
		message: getLastPoolError() ?? "SQL not connected — run 410_Ensure_Integration_Connections.sql after SQL is up",
		rows: []
	};
	try {
		const rows = ((await pool.request().query(`
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
`)).recordset ?? []).filter((row) => row.ConnectionCode).map((row) => ({
			connectionCode: String(row.ConnectionCode),
			displayName: String(row.DisplayName ?? row.ConnectionCode),
			sourceKind: String(row.SourceKind ?? ""),
			status: String(row.Status ?? "Planned"),
			notes: row.Notes != null ? String(row.Notes) : null,
			lastSyncAt: row.LastSyncAt ? new Date(row.LastSyncAt).toISOString() : null
		}));
		return {
			ok: true,
			message: rows.length === 0 ? "Dim_Connection empty — run central 410_Ensure_Integration_Connections.sql" : `${rows.length} connection(s)`,
			rows
		};
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e),
			rows: []
		};
	}
});
var fetchAdminAuditLog_createServerFn_handler = createServerRpc({
	id: "110aea48c5df815dcbda5d038773a6408884ddcad335d7d22d72c74f6006ea72",
	name: "fetchAdminAuditLog",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => fetchAdminAuditLog.__executeServer(opts));
var fetchAdminAuditLog = createServerFn({ method: "GET" }).validator((data) => data ?? {}).handler(fetchAdminAuditLog_createServerFn_handler, async ({ data }) => {
	const limit = Math.min(Math.max(data?.limit ?? 200, 1), 500);
	return {
		ok: true,
		entries: readAdminAudit(limit)
	};
});
var runAlertEvaluation_createServerFn_handler = createServerRpc({
	id: "2aab97066ef504973d547689e958380723abccf4ef4c8b8c4305231f7cfdacb2",
	name: "runAlertEvaluation",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => runAlertEvaluation.__executeServer(opts));
var runAlertEvaluation = createServerFn({ method: "POST" }).validator((data) => data ?? {}).handler(runAlertEvaluation_createServerFn_handler, async ({ data }) => {
	const alerts = getAlertConfig();
	const force = Boolean(data?.force);
	if (!alerts.enabled && !force) return {
		ok: false,
		fired: false,
		message: "Alerts disabled — enable in Settings → Alerts, or use Evaluate now.",
		matches: []
	};
	const inv = await fetchCollectInventory();
	if (!inv.ok) return {
		ok: false,
		fired: false,
		message: inv.message,
		matches: []
	};
	const matches = [];
	for (const row of inv.rows) {
		if (!row.active) continue;
		if (alerts.alertOnRed && row.healthRag === "Red") matches.push(`${row.displayName} (${row.customerCode}): RED — ${row.healthSummary}`);
		if (alerts.jobErrorMin > 0 && row.jobErrors >= alerts.jobErrorMin) matches.push(`${row.displayName}: ${row.jobErrors} job error(s) (threshold ≥ ${alerts.jobErrorMin})`);
		if (alerts.collectStaleHours > 0 && (row.hoursSinceOps == null || row.hoursSinceOps > alerts.collectStaleHours)) matches.push(`${row.displayName}: collect stale (${row.hoursSinceOps ?? "never"} h; threshold ${alerts.collectStaleHours} h)`);
	}
	const uniq = [...new Set(matches)];
	if (uniq.length === 0) return {
		ok: true,
		fired: false,
		message: "No alert conditions matched.",
		matches: []
	};
	return {
		ok: true,
		fired: false,
		message: `Matched ${uniq.length} condition(s). Email is disabled; review matches below.`,
		matches: uniq
	};
});
var suggestRagFromLive_createServerFn_handler = createServerRpc({
	id: "f4811077a5f8b39f5077d8c08efaf437715743aff9b70c3e9572e9731518679f",
	name: "suggestRagFromLive",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => suggestRagFromLive.__executeServer(opts));
var suggestRagFromLive = createServerFn({ method: "GET" }).handler(suggestRagFromLive_createServerFn_handler, async () => {
	const inv = await fetchCollectInventory();
	if (!inv.ok) return {
		ok: false,
		message: inv.message,
		result: null
	};
	const samples = inv.rows.map((r) => ({
		customerCode: r.customerCode,
		displayName: r.displayName,
		active: r.active,
		jobErrors: r.jobErrors,
		dtrVarLines: r.dtrVarLines,
		opsCount: r.opsCount,
		hoursSinceOps: r.hoursSinceOps
	}));
	const current = getRagConfig();
	const result = suggestRagFromSamples(samples, current);
	return {
		ok: true,
		message: `Tuned from ${result.estate.activeCount} active customer(s); max job errors=${result.estate.maxJobErrors}, max Out of Balance lines=${result.estate.maxDtr}.`,
		result,
		current
	};
});
var fetchSslSettings_createServerFn_handler = createServerRpc({
	id: "a5e9c80bea74a7ec5f71ec7794f4f521a4cada5e8b8fe0de27e98407f20fedf9",
	name: "fetchSslSettings",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => fetchSslSettings.__executeServer(opts));
var fetchSslSettings = createServerFn({ method: "GET" }).handler(fetchSslSettings_createServerFn_handler, async () => {
	const { getSslConfig, sslFileStatus, buildCaddyfile, caddyfilePath } = await import("./ssl-store-C2W4YOb6.mjs");
	const ssl = getSslConfig();
	const status = sslFileStatus();
	let existingCaddy = "";
	try {
		const fs = await import("node:fs");
		if (fs.existsSync(caddyfilePath())) existingCaddy = fs.readFileSync(caddyfilePath(), "utf8");
	} catch {}
	return {
		ssl: {
			...DEFAULT_SSL,
			...ssl
		},
		status,
		caddyPreview: buildCaddyfile(ssl),
		existingCaddy
	};
});
var saveSslSettings_createServerFn_handler = createServerRpc({
	id: "dfebb239d6cb138f5a945fae2dd86e91a7378e7b2c26229ff59654d828ba12dd",
	name: "saveSslSettings",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => saveSslSettings.__executeServer(opts));
var saveSslSettings = createServerFn({ method: "POST" }).validator((data) => data).handler(saveSslSettings_createServerFn_handler, async ({ data }) => {
	const { saveSslConfig, buildCaddyfile } = await import("./ssl-store-C2W4YOb6.mjs");
	const ssl = saveSslConfig(data.ssl);
	return {
		ok: true,
		ssl,
		caddyPreview: buildCaddyfile(ssl)
	};
});
var uploadSslCertificate_createServerFn_handler = createServerRpc({
	id: "d6f34dc33ee2f81f5bb38b9598a73083a18185362058f2c69dea388d62658ccb",
	name: "uploadSslCertificate",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => uploadSslCertificate.__executeServer(opts));
var uploadSslCertificate = createServerFn({ method: "POST" }).validator((data) => data).handler(uploadSslCertificate_createServerFn_handler, async ({ data }) => {
	const { writeSslPemFiles, sslFileStatus, getSslConfig, buildCaddyfile } = await import("./ssl-store-C2W4YOb6.mjs");
	const r = writeSslPemFiles({
		certPem: data.certPem,
		keyPem: data.keyPem,
		certFileName: data.certFileName,
		keyFileName: data.keyFileName
	});
	if (!r.ok) return {
		ok: false,
		error: r.error
	};
	try {
		const { appendAdminAudit } = await import("./admin-audit-NxU6BQp5.mjs");
		appendAdminAudit({
			actorEmail: "platform",
			action: "ssl.cert_upload",
			detail: `Uploaded PEM cert (${data.certFileName || "fullchain.pem"})`,
			ok: true
		});
	} catch {}
	const ssl = getSslConfig();
	return {
		ok: true,
		status: sslFileStatus(),
		ssl,
		caddyPreview: buildCaddyfile(ssl)
	};
});
var applySslConfig_createServerFn_handler = createServerRpc({
	id: "04752fdc659b0c75b82b53ef09f6d1cb696a174d21b14d84c4739d8ca260e85a",
	name: "applySslConfig",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => applySslConfig.__executeServer(opts));
var applySslConfig = createServerFn({ method: "POST" }).validator((data) => data ?? {}).handler(applySslConfig_createServerFn_handler, async ({ data }) => {
	const { saveSslConfig, applySslToDisk, getSslConfig } = await import("./ssl-store-C2W4YOb6.mjs");
	if (data?.ssl) saveSslConfig(data.ssl);
	const result = applySslToDisk(data?.ssl ?? getSslConfig());
	if (result.ok) try {
		appendAdminAudit({
			actorEmail: "platform",
			action: "ssl.apply_caddyfile",
			detail: `Wrote Caddyfile mode=${(data?.ssl ?? getSslConfig()).mode} host=${(data?.ssl ?? getSslConfig()).hostname}`,
			ok: true
		});
	} catch {}
	return result;
});
var clearSslCertificate_createServerFn_handler = createServerRpc({
	id: "304b4eec83c664de6f0c6d25b64b1bba8aa555f698b1ff06f9ac99b9cd151c6a",
	name: "clearSslCertificate",
	filename: "src/lib/settings/settings-api.ts"
}, (opts) => clearSslCertificate.__executeServer(opts));
var clearSslCertificate = createServerFn({ method: "POST" }).handler(clearSslCertificate_createServerFn_handler, async () => {
	const fs = await import("node:fs");
	const { certPaths, deployCertPaths, sslFileStatus, saveSslConfig, getSslConfig } = await import("./ssl-store-C2W4YOb6.mjs");
	for (const p of [certPaths(), deployCertPaths()]) try {
		if (fs.existsSync(p.cert)) fs.unlinkSync(p.cert);
		if (fs.existsSync(p.key)) fs.unlinkSync(p.key);
	} catch {}
	return {
		ok: true,
		ssl: saveSslConfig({
			...getSslConfig(),
			certFileName: null,
			keyFileName: null
		}),
		status: sslFileStatus()
	};
});
//#endregion
export { applySslConfig_createServerFn_handler, clearSslCertificate_createServerFn_handler, fetchAdminAuditLog_createServerFn_handler, fetchAppUsers_createServerFn_handler, fetchCollectInventory_createServerFn_handler, fetchIntegrations_createServerFn_handler, fetchSettingsBundle_createServerFn_handler, fetchSslSettings_createServerFn_handler, previewAmsReportHtml_createServerFn_handler, restartApplicationService_createServerFn_handler, runAlertEvaluation_createServerFn_handler, runSqlQuery_createServerFn_handler, saveAlertSettings_createServerFn_handler, saveDashboardSettings_createServerFn_handler, saveRagSettings_createServerFn_handler, saveSmtpSettings_createServerFn_handler, saveSqlConnections_createServerFn_handler, saveSslSettings_createServerFn_handler, sendAmsReportEmail_createServerFn_handler, sendTestEmail_createServerFn_handler, sendWeeklyReportNow_createServerFn_handler, suggestRagFromLive_createServerFn_handler, testSqlConnection_createServerFn_handler, uploadSslCertificate_createServerFn_handler, upsertAppUser_createServerFn_handler };
