import { o as __toESM } from "../_runtime.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { n as getSqlConfig, o as cleanSqlPassword, r as hasSqlConfig, s as passwordDiagnostics } from "./sql-config-BAM-cI78.mjs";
import { t as require_mssql } from "../_libs/mssql+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sql-pool-kLXZ0UEv.js
var import_mssql = /* @__PURE__ */ __toESM(require_mssql());
/**
* Shared SQL Server connect for pool + Settings test.
* Handles on-prem: Encrypt off, TrustServerCertificate on, quoted passwords.
*/
function baseConfig(c, encrypt) {
	const password = cleanSqlPassword(c.password);
	return {
		server: c.server.trim(),
		port: Number(c.port) || 14333,
		database: (c.database || "RPMAssure_App").trim(),
		user: c.user.trim(),
		password,
		connectionTimeout: c.connectionTimeout ?? 15e3,
		requestTimeout: c.requestTimeout ?? 45e3,
		options: {
			encrypt,
			trustServerCertificate: c.trustServerCertificate !== false,
			enableArithAbort: true,
			useUTC: true
		},
		pool: {
			max: 12,
			min: 1,
			idleTimeoutMillis: 6e4
		}
	};
}
/**
* Try preferred encrypt, then opposite. Returns open pool on success (caller must close if one-shot).
*/
async function connectSql(c) {
	const diag = passwordDiagnostics(c.password ?? "");
	const password = cleanSqlPassword(c.password ?? "");
	const pwdLen = password.length;
	if (!c.server?.trim() || !c.user?.trim()) return {
		ok: false,
		message: "Server and user are required",
		passwordLength: pwdLen,
		attempts: []
	};
	if (!pwdLen) return {
		ok: false,
		message: "Password is empty after cleaning. Type the full SQL password (no quotes), Save, then Test.",
		passwordLength: 0,
		attempts: []
	};
	const preferEncrypt = Boolean(c.encrypt);
	const order = [preferEncrypt, !preferEncrypt];
	const attempts = [];
	for (const encrypt of order) {
		const label = `encrypt=${encrypt}`;
		try {
			const pool = await new import_mssql.default.ConnectionPool(baseConfig(c, encrypt)).connect();
			const row = (await pool.request().query("SELECT @@SERVERNAME AS srv, DB_NAME() AS db, SUSER_SNAME() AS who, ORIGINAL_LOGIN() AS orig")).recordset[0];
			attempts.push(`${label}: OK`);
			return {
				ok: true,
				pool,
				serverName: row.srv,
				database: row.db,
				who: row.who || row.orig,
				encryptUsed: encrypt
			};
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			attempts.push(`${label}: ${msg}`);
		}
	}
	const hintParts = [];
	if (diag.rawLength !== diag.cleanLength) hintParts.push(`rawLen=${diag.rawLength} cleanLen=${diag.cleanLength}` + (diag.hint ? ` (${diag.hint})` : ""));
	else hintParts.push(`pwdLength=${pwdLen}`);
	if (password.includes("#")) hintParts.push("contains #");
	if (pwdLen === 19) hintParts.push("length matches RpmCollect#AHIC2026 pattern");
	else if (pwdLen === 21) hintParts.push("length 21 often means quotes were saved as part of the password — re-type WITHOUT quotes and Save");
	return {
		ok: false,
		message: `Login failed for ${c.user.trim()} @ ${c.server.trim()},${c.port || 14333} / ${(c.database || "RPMAssure_App").trim()}. ` + hintParts.join(". ") + ". " + attempts.join(" | ") + ` · On central reset login: 209b_Reset_Rpm_collect_Password.sql then sqlcmd -U Rpm_collect -P "RpmCollect#AHIC2026"`,
		passwordLength: pwdLen,
		attempts
	};
}
var sql_pool_exports = /* @__PURE__ */ __exportAll({
	getLastPoolError: () => getLastPoolError,
	getPool: () => getPool,
	resetPool: () => resetPool,
	sql: () => import_mssql.default
});
var pool = null;
var poolError = null;
/** Coalesce concurrent getPool() so we only open one connection */
var connecting = null;
function getLastPoolError() {
	return poolError;
}
function resetPool() {
	try {
		pool?.close();
	} catch {}
	pool = null;
	poolError = null;
	connecting = null;
}
async function getPool() {
	if (!hasSqlConfig()) {
		poolError = "SQL env not configured";
		return null;
	}
	if (pool?.connected) return pool;
	if (connecting) return connecting;
	connecting = (async () => {
		try {
			if (pool?.connected) return pool;
			const cfg = getSqlConfig();
			const src = cfg._source ?? "?";
			console.info(`[rpm-assure] SQL connecting ${cfg.server}:${cfg.port}/${cfg.database} user=${cfg.user} source=${src} pwdLen=${cfg.password?.length ?? 0}`);
			const result = await connectSql({
				server: cfg.server,
				port: cfg.port,
				database: cfg.database,
				user: cfg.user,
				password: cfg.password,
				encrypt: cfg.options?.encrypt,
				trustServerCertificate: cfg.options?.trustServerCertificate,
				connectionTimeout: cfg.connectionTimeout,
				requestTimeout: cfg.requestTimeout
			});
			if (!result.ok) {
				pool = null;
				poolError = result.message;
				console.error("[rpm-assure] SQL connect failed:", poolError);
				return null;
			}
			pool = result.pool;
			poolError = null;
			console.info(`[rpm-assure] SQL connected ${result.serverName}/${result.database} as ${result.who} encrypt=${result.encryptUsed}`);
			pool.on("error", (err) => {
				console.error("[rpm-assure] SQL pool error", err);
				pool = null;
				poolError = err.message;
				connecting = null;
			});
			return pool;
		} catch (e) {
			pool = null;
			poolError = e instanceof Error ? e.message : String(e);
			console.error("[rpm-assure] SQL connect failed:", poolError);
			return null;
		} finally {
			connecting = null;
		}
	})();
	return connecting;
}
//#endregion
export { sql_pool_exports as i, getPool as n, import_mssql as r, getLastPoolError as t };
