import { a as DEFAULT_SMTP, i as DEFAULT_RAG, n as DEFAULT_ALERTS, o as DEFAULT_SSL, r as DEFAULT_DASHBOARD } from "./types-Dk-h6nx5.mjs";
import fs from "node:fs";
import path from "node:path";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-store-DT2EXCSw.js
var FILE = "rpma-settings.json";
function settingsPath() {
	const cwd = process.cwd();
	const dir = path.join(cwd, "data");
	return path.join(dir, FILE);
}
function defaultFile() {
	return {
		version: 1,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		sqlConnections: [],
		smtp: { ...DEFAULT_SMTP },
		ssl: { ...DEFAULT_SSL },
		rag: { ...DEFAULT_RAG },
		alerts: { ...DEFAULT_ALERTS },
		dashboard: { ...DEFAULT_DASHBOARD },
		cronSecret: "",
		lastWeeklyReportAt: null
	};
}
function clampRag(r) {
	const base = {
		...DEFAULT_RAG,
		...r ?? {}
	};
	let red = Math.max(1, Math.floor(Number(base.jobErrorsRedAt) || 10));
	let amber = Math.max(0, Math.floor(Number(base.jobErrorsAmberFrom) || 1));
	if (amber > red) amber = Math.max(0, red - 1);
	return {
		jobErrorsRedAt: red,
		jobErrorsAmberFrom: amber,
		dtrVarianceIsAmber: base.dtrVarianceIsAmber !== false,
		dtrVarianceRedAt: Math.max(0, Math.floor(Number(base.dtrVarianceRedAt) || 0)),
		noOperatorsIsAmber: base.noOperatorsIsAmber !== false,
		collectStaleHours: Math.max(1, Math.floor(Number(base.collectStaleHours) || 48))
	};
}
function clampAlerts(a) {
	const base = {
		...DEFAULT_ALERTS,
		...a ?? {}
	};
	return {
		enabled: Boolean(base.enabled),
		emailTo: String(base.emailTo ?? ""),
		alertOnRed: base.alertOnRed !== false,
		jobErrorMin: Math.max(0, Math.floor(Number(base.jobErrorMin) || 0)),
		collectStaleHours: Math.max(0, Math.floor(Number(base.collectStaleHours) || 0)),
		minIntervalMinutes: Math.max(5, Math.floor(Number(base.minIntervalMinutes) || 60)),
		lastFiredAt: base.lastFiredAt ?? null
	};
}
function bool(v, d) {
	if (typeof v === "boolean") return v;
	return d;
}
function clampDashboard(d) {
	const base = {
		...DEFAULT_DASHBOARD,
		...d ?? {}
	};
	const landing = base.customerLanding === "syspro" || base.customerLanding === "ams" ? base.customerLanding : "exec";
	return {
		estateTitle: String(base.estateTitle || DEFAULT_DASHBOARD.estateTitle || "Exco Insight").slice(0, 80),
		estateSubtitle: (() => {
			let sub = String(base.estateSubtitle ?? DEFAULT_DASHBOARD.estateSubtitle ?? "").slice(0, 240);
			if (/Managed customer health/i.test(sub)) sub = "";
			return sub;
		})(),
		showMultitenantHint: bool(base.showMultitenantHint, DEFAULT_DASHBOARD.showMultitenantHint),
		collectFreshHours: Math.max(1, Math.floor(Number(base.collectFreshHours) || 24)),
		licenseExpiringDays: Math.max(1, Math.floor(Number(base.licenseExpiringDays) || 90)),
		kpiCustomers: bool(base.kpiCustomers, true),
		kpiAttention: bool(base.kpiAttention, true),
		kpiAssurance: bool(base.kpiAssurance, true),
		kpiRefresh: bool(base.kpiRefresh, true),
		kpiRisks: bool(base.kpiRisks, true),
		kpiLicenses: bool(base.kpiLicenses, true),
		kpiRmm: bool(base.kpiRmm, true),
		kpiHotfixes: bool(base.kpiHotfixes, true),
		panelPortfolioTable: bool(base.panelPortfolioTable, true),
		panelRmmHealth: bool(base.panelRmmHealth, true),
		panelDataRefresh: bool(base.panelDataRefresh, true),
		panelAttention: bool(base.panelAttention, true),
		panelAssuranceChart: bool(base.panelAssuranceChart, true),
		panelHealthChart: bool(base.panelHealthChart, true),
		panelSla: bool(base.panelSla, true),
		panelLicenses: bool(base.panelLicenses, true),
		panelRisks: bool(base.panelRisks, true),
		panelBackups: bool(base.panelBackups, true),
		customerLanding: landing,
		customerShowCharts: bool(base.customerShowCharts, true),
		customerShowDtr: bool(base.customerShowDtr, true),
		customerShowLists: bool(base.customerShowLists, true)
	};
}
function readSettingsFile() {
	try {
		const p = settingsPath();
		if (!fs.existsSync(p)) return defaultFile();
		const raw = fs.readFileSync(p, "utf8");
		const j = JSON.parse(raw);
		if (!j.version) return defaultFile();
		return {
			version: 1,
			updatedAt: j.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
			sqlConnections: Array.isArray(j.sqlConnections) ? j.sqlConnections : [],
			smtp: {
				...DEFAULT_SMTP,
				...j.smtp ?? {}
			},
			ssl: {
				...DEFAULT_SSL,
				...j.ssl ?? {}
			},
			rag: clampRag(j.rag),
			alerts: clampAlerts(j.alerts),
			dashboard: clampDashboard(j.dashboard),
			cronSecret: typeof j.cronSecret === "string" ? j.cronSecret : "",
			lastWeeklyReportAt: j.lastWeeklyReportAt ?? null
		};
	} catch {
		return defaultFile();
	}
}
function writeSettingsFile(data) {
	const dir = path.join(process.cwd(), "data");
	fs.mkdirSync(dir, { recursive: true });
	const prev = (() => {
		try {
			return readSettingsFile();
		} catch {
			return defaultFile();
		}
	})();
	const out = {
		...data,
		version: 1,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		rag: clampRag(data.rag),
		alerts: clampAlerts(data.alerts),
		dashboard: clampDashboard(data.dashboard),
		ssl: {
			...DEFAULT_SSL,
			...data.ssl ?? {}
		},
		cronSecret: typeof data.cronSecret === "string" ? data.cronSecret : prev.cronSecret ?? "",
		lastWeeklyReportAt: data.lastWeeklyReportAt !== void 0 ? data.lastWeeklyReportAt : prev.lastWeeklyReportAt ?? null
	};
	fs.writeFileSync(settingsPath(), JSON.stringify(out, null, 2), "utf8");
}
function getPrimarySqlFromFile() {
	const f = readSettingsFile();
	return f.sqlConnections.find((c) => c.isPrimary) ?? f.sqlConnections[0] ?? null;
}
function getRagConfig() {
	return clampRag(readSettingsFile().rag);
}
function getAlertConfig() {
	return clampAlerts(readSettingsFile().alerts);
}
function getDashboardConfig() {
	return clampDashboard(readSettingsFile().dashboard);
}
function maskPassword(p) {
	if (!p) return "";
	return "********";
}
function applyPasswordKeep(incoming, existing) {
	const v = (incoming ?? "").trim();
	if (!v || v === "********" || v === "••••••••") return existing ?? "";
	return v;
}
/** Write primary SQL settings into .env.local so Vite restarts pick them up */
function syncPrimarySqlToEnvLocal(c) {
	try {
		const envPath = path.join(process.cwd(), ".env.local");
		let lines = [];
		if (fs.existsSync(envPath)) lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
		const skip = /* @__PURE__ */ new Set([
			"RPM_ASSURE_SQL_SERVER",
			"RPM_ASSURE_SQL_PORT",
			"RPM_ASSURE_SQL_DATABASE",
			"RPM_ASSURE_SQL_USER",
			"RPM_ASSURE_SQL_PASSWORD",
			"RPM_ASSURE_SQL_TRUST_CERT",
			"RPM_ASSURE_SQL_ENCRYPT",
			"RPM_ASSURE_DATA_MODE"
		]);
		lines = lines.filter((l) => {
			const k = l.split("=")[0]?.trim();
			return k && !skip.has(k);
		});
		lines.push(`RPM_ASSURE_SQL_SERVER=${c.server}`);
		lines.push(`RPM_ASSURE_SQL_PORT=${c.port}`);
		lines.push(`RPM_ASSURE_SQL_DATABASE=${c.database}`);
		lines.push(`RPM_ASSURE_SQL_USER=${c.user}`);
		lines.push(`RPM_ASSURE_SQL_PASSWORD=${c.password}`);
		lines.push(`RPM_ASSURE_SQL_TRUST_CERT=${c.trustServerCertificate ? "true" : "false"}`);
		lines.push(`RPM_ASSURE_SQL_ENCRYPT=${c.encrypt ? "true" : "false"}`);
		lines.push(`RPM_ASSURE_DATA_MODE=${c.dataMode}`);
		fs.writeFileSync(envPath, lines.filter(Boolean).join("\n") + "\n", "utf8");
	} catch {}
}
//#endregion
export { getRagConfig as a, syncPrimarySqlToEnvLocal as c, getPrimarySqlFromFile as i, writeSettingsFile as l, getAlertConfig as n, maskPassword as o, getDashboardConfig as r, readSettingsFile as s, applyPasswordKeep as t };
