import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { i as getPrimarySqlFromFile } from "./settings-store-DT2EXCSw.mjs";
import fs from "node:fs";
import path from "node:path";
//#region node_modules/.nitro/vite/services/ssr/assets/sql-config-BAM-cI78.js
/**
* Normalize SQL passwords from Settings / .env (quotes, BOM, newlines, smart quotes).
*/
function cleanSqlPassword(raw) {
	if (raw == null) return "";
	let s = String(raw);
	s = s.replace(/^\uFEFF/, "");
	s = s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "");
	s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
	s = s.replace(/^\n+|\n+$/g, "").trim();
	s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, "\"");
	s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
	for (let i = 0; i < 3; i++) {
		if (s.startsWith("\"") && s.endsWith("\"") && s.length >= 2 || s.startsWith("'") && s.endsWith("'") && s.length >= 2) {
			s = s.slice(1, -1).trim();
			continue;
		}
		break;
	}
	return s;
}
function passwordDiagnostics(raw) {
	const rawS = raw == null ? "" : String(raw);
	const clean = cleanSqlPassword(rawS);
	const changedByClean = clean !== rawS.trim() && clean !== rawS;
	let hint = "";
	if (rawS.length === 21 && clean.length === 19) hint = "Likely extra quotes around the password — cleaned for connect.";
	else if (rawS.length !== clean.length) hint = `Cleaned password length ${clean.length} (was ${rawS.length}).`;
	else if (clean.length === 0) hint = "Password empty after clean.";
	return {
		rawLength: rawS.length,
		cleanLength: clean.length,
		hasHash: clean.includes("#"),
		changedByClean,
		hint
	};
}
/**
* SQL Server connection for RPMAssure_App
* Priority: Settings UI file (data/rpma-settings.json) when complete
*           > process env / .env.local
* UI save is the source of truth for operators; env is fallback / bootstrap.
*/
var sql_config_exports = /* @__PURE__ */ __exportAll({
	getDataMode: () => getDataMode,
	getSqlConfig: () => getSqlConfig,
	hasSqlConfig: () => hasSqlConfig,
	invalidateEnvCache: () => invalidateEnvCache,
	parseSqlServer: () => parseSqlServer,
	sqlConfigDebug: () => sqlConfigDebug
});
var fileEnvLoaded = false;
/** Call after Settings save so .env.local is re-read if needed */
function invalidateEnvCache() {
	fileEnvLoaded = false;
}
function loadDotEnvFiles() {
	if (fileEnvLoaded || typeof process === "undefined") return;
	fileEnvLoaded = true;
	const cwd = process.cwd();
	for (const name of [".env.local", ".env"]) {
		const full = path.join(cwd, name);
		try {
			if (!fs.existsSync(full)) continue;
			let text = fs.readFileSync(full, "utf8");
			if (text.charCodeAt(0) === 65279) text = text.slice(1);
			for (const line of text.split(/\r?\n/)) {
				const t = line.trim();
				if (!t || t.startsWith("#")) continue;
				const eq = t.indexOf("=");
				if (eq <= 0) continue;
				const key = t.slice(0, eq).trim().replace(/^\uFEFF/, "");
				let val = t.slice(eq + 1).trim();
				if (val.startsWith("\"") && val.endsWith("\"") || val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
				if (process.env[key] === void 0 || process.env[key] === "" || key.startsWith("RPM_ASSURE_")) process.env[key] = val;
			}
		} catch {}
	}
}
function env(name) {
	loadDotEnvFiles();
	const v = process.env[name];
	return v?.trim() ? v.trim() : void 0;
}
function getDataMode() {
	try {
		const f = getPrimarySqlFromFile();
		if (f?.dataMode === "live" || f?.dataMode === "demo" || f?.dataMode === "auto") return f.dataMode;
	} catch {}
	const fromEnv = env("RPM_ASSURE_DATA_MODE");
	if (fromEnv) {
		const m = fromEnv.toLowerCase();
		if (m === "live" || m === "demo" || m === "auto") return m;
	}
	return "auto";
}
function fileSqlComplete() {
	try {
		const f = getPrimarySqlFromFile();
		return Boolean(f?.server?.trim() && f?.user?.trim() && f?.password?.trim());
	} catch {
		return false;
	}
}
function hasSqlConfig() {
	if (fileSqlComplete()) return true;
	return Boolean(env("RPM_ASSURE_SQL_SERVER") && env("RPM_ASSURE_SQL_USER") && env("RPM_ASSURE_SQL_PASSWORD"));
}
function sqlConfigDebug() {
	loadDotEnvFiles();
	const envOk = Boolean(env("RPM_ASSURE_SQL_SERVER") && env("RPM_ASSURE_SQL_USER") && env("RPM_ASSURE_SQL_PASSWORD"));
	let fileOk = false;
	try {
		fileOk = fileSqlComplete();
	} catch {
		fileOk = false;
	}
	let effective = "none";
	if (fileOk) effective = "settings-file";
	else if (envOk) effective = "env";
	let snap = {};
	try {
		if (hasSqlConfig()) {
			const c = getSqlConfig();
			snap = {
				server: c.server,
				port: c.port,
				database: c.database,
				user: c.user
			};
		}
	} catch {}
	return {
		hasServer: Boolean(env("RPM_ASSURE_SQL_SERVER")) || fileOk,
		hasUser: Boolean(env("RPM_ASSURE_SQL_USER")) || fileOk,
		hasPassword: Boolean(env("RPM_ASSURE_SQL_PASSWORD")) || fileOk,
		cwd: process.cwd(),
		source: envOk && fileOk ? "mixed" : envOk ? "env" : fileOk ? "settings-file" : "none",
		effectiveSource: effective,
		...snap
	};
}
/** host,port OR host + port — never pass "host,port" as server name */
function parseSqlServer(raw, portEnv) {
	const s = raw.trim();
	if (s.includes(",")) {
		const [host, portStr] = s.split(",").map((x) => x.trim());
		const port = Number(portStr || portEnv || 1433);
		if (!host || !Number.isFinite(port)) throw new Error(`Invalid SQL server: ${raw}`);
		return {
			server: host,
			port
		};
	}
	if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(s) || s.includes(":") && !s.includes("\\")) {
		const idx = s.lastIndexOf(":");
		const host = s.slice(0, idx).trim();
		const port = Number(s.slice(idx + 1).trim() || portEnv || 1433);
		if (host && Number.isFinite(port)) return {
			server: host,
			port
		};
	}
	const port = Number(portEnv || 1433);
	return {
		server: s,
		port: Number.isFinite(port) ? port : 1433
	};
}
function getSqlConfig() {
	const file = (() => {
		try {
			return getPrimarySqlFromFile();
		} catch {
			return null;
		}
	})();
	const useFile = Boolean(file?.server?.trim() && file?.user?.trim() && file?.password?.trim());
	const serverRaw = useFile ? file.server.trim() : env("RPM_ASSURE_SQL_SERVER") || file?.server?.trim();
	const user = useFile ? file.user.trim() : env("RPM_ASSURE_SQL_USER") || file?.user?.trim();
	const passwordClean = cleanSqlPassword(useFile ? file.password : env("RPM_ASSURE_SQL_PASSWORD") || file?.password);
	if (!serverRaw || !user || !passwordClean) throw new Error("SQL config incomplete — set Settings → SQL Server (or .env.local RPM_ASSURE_SQL_*).");
	const { server, port } = parseSqlServer(serverRaw, useFile ? file.port != null ? String(file.port) : void 0 : env("RPM_ASSURE_SQL_PORT") || (file?.port != null ? String(file.port) : void 0));
	const trust = useFile ? file.trustServerCertificate ?? true : env("RPM_ASSURE_SQL_TRUST_CERT") !== void 0 ? env("RPM_ASSURE_SQL_TRUST_CERT") !== "false" : file?.trustServerCertificate ?? true;
	const encrypt = useFile ? file.encrypt ?? true : env("RPM_ASSURE_SQL_ENCRYPT") !== void 0 ? env("RPM_ASSURE_SQL_ENCRYPT") !== "false" : file?.encrypt ?? true;
	const database = useFile ? file.database?.trim() || "RPMAssure_App" : env("RPM_ASSURE_SQL_DATABASE") ?? file?.database ?? "RPMAssure_App";
	let resolvedPort = port;
	if (useFile && file.port != null && !String(serverRaw).includes(",") && !String(serverRaw).includes(":")) resolvedPort = Number(file.port) || port;
	else if (!useFile && !env("RPM_ASSURE_SQL_PORT") && !String(serverRaw).includes(",") && file?.port) resolvedPort = file.port;
	return {
		server,
		port: resolvedPort,
		database,
		user,
		password: passwordClean,
		options: {
			encrypt,
			trustServerCertificate: trust,
			enableArithAbort: true
		},
		pool: {
			max: 5,
			min: 0,
			idleTimeoutMillis: 3e4
		},
		connectionTimeout: 12e3,
		requestTimeout: 2e4,
		_source: useFile ? "settings-file" : "env"
	};
}
//#endregion
export { sql_config_exports as a, sqlConfigDebug as i, getSqlConfig as n, cleanSqlPassword as o, hasSqlConfig as r, passwordDiagnostics as s, getDataMode as t };
