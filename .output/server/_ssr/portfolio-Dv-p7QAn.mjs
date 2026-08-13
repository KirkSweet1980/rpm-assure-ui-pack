import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { i as sqlConfigDebug, r as hasSqlConfig, t as getDataMode } from "./sql-config-BAM-cI78.mjs";
import { t as getLastPoolError } from "./sql-pool-kLXZ0UEv.mjs";
import { a as getDemoPortfolio, i as getDemoCustomerDetail, n as fetchLivePortfolio, r as fillCustomerPanels, t as fetchLiveCustomerDetail } from "./live-portfolio-BRTWk7If.mjs";
import { CUSTOMER_TTL_MS, PORTFOLIO_TTL_MS, cacheGetOrLoad, cacheInvalidate } from "./query-cache-DoTtYwLe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/portfolio-Dv-p7QAn.js
function normalizeCustomerCode(raw) {
	let s = String(raw ?? "").trim();
	try {
		s = decodeURIComponent(s);
	} catch {}
	return s.trim();
}
async function loadPortfolio() {
	return cacheGetOrLoad("portfolio", PORTFOLIO_TTL_MS, async () => {
		const mode = getDataMode();
		if (mode === "demo") return getDemoPortfolio();
		if (!hasSqlConfig()) {
			if (mode === "live") console.warn("[rpm-assure] DATA_MODE=live but SQL env missing — using demo");
			return getDemoPortfolio();
		}
		try {
			const t0 = Date.now();
			const live = await fetchLivePortfolio();
			console.info(`[rpm-assure] portfolio SQL ${Date.now() - t0}ms`);
			if (live) return live;
			console.warn("[rpm-assure] SQL returned null:", getLastPoolError());
			return getDemoPortfolio();
		} catch (e) {
			console.error("[rpm-assure] portfolio SQL error", e);
			return getDemoPortfolio();
		}
	});
}
async function loadCustomer(codeRaw) {
	const code = normalizeCustomerCode(codeRaw);
	if (!code) return null;
	const key = "customer:" + code.toUpperCase();
	try {
		const { cacheGet } = await import("./query-cache-DoTtYwLe.mjs");
		if (cacheGet(key, 18e4) === null) cacheInvalidate(key);
	} catch {}
	return cacheGetOrLoad(key, CUSTOMER_TTL_MS, async () => {
		const mode = getDataMode();
		let result = null;
		if (mode === "demo") {
			const d = getDemoCustomerDetail(code);
			result = d ? fillCustomerPanels(d) : null;
		} else if (hasSqlConfig()) {
			try {
				const t0 = Date.now();
				const live = await fetchLiveCustomerDetail(code);
				console.info(`[rpm-assure] customer ${code} SQL ${Date.now() - t0}ms live=${!!live}`);
				if (live) result = fillCustomerPanels(live);
			} catch (e) {
				console.error("[rpm-assure] customer SQL error", e);
			}
			if (!result) {
				const demo = getDemoCustomerDetail(code);
				result = demo ? fillCustomerPanels(demo) : null;
			}
		} else {
			const demo = getDemoCustomerDetail(code);
			result = demo ? fillCustomerPanels(demo) : null;
		}
		if (result == null) {
			console.warn(`[rpm-assure] customer detail null for code="${code}"`);
			setTimeout(() => cacheInvalidate(key), 0);
		}
		return result;
	});
}
var fetchPortfolio_createServerFn_handler = createServerRpc({
	id: "c6deb86d8c8bbc3a7406d249b1a1fe5914b060a2380c4ae637e5bf32032ec2ca",
	name: "fetchPortfolio",
	filename: "src/lib/data/portfolio.ts"
}, (opts) => fetchPortfolio.__executeServer(opts));
var fetchPortfolio = createServerFn({ method: "GET" }).handler(fetchPortfolio_createServerFn_handler, async () => loadPortfolio());
var fetchCustomerDetail_createServerFn_handler = createServerRpc({
	id: "725b757130e54f94873c36c1161ce6e3dc1adef88fa98d97cdb88754cf8966d2",
	name: "fetchCustomerDetail",
	filename: "src/lib/data/portfolio.ts"
}, (opts) => fetchCustomerDetail.__executeServer(opts));
var fetchCustomerDetail = createServerFn({ method: "GET" }).validator((data) => data).handler(fetchCustomerDetail_createServerFn_handler, async ({ data }) => loadCustomer(data.code));
var fetchDataSourceStatus_createServerFn_handler = createServerRpc({
	id: "5bbc4c3aeaa13925fb4356600f3df13cf20606af24141cd6133e3ce90712be55",
	name: "fetchDataSourceStatus",
	filename: "src/lib/data/portfolio.ts"
}, (opts) => fetchDataSourceStatus.__executeServer(opts));
var fetchDataSourceStatus = createServerFn({ method: "GET" }).handler(fetchDataSourceStatus_createServerFn_handler, async () => {
	const mode = getDataMode();
	const configured = hasSqlConfig();
	let liveOk = false;
	let error = null;
	let customerCount = null;
	if (configured && mode !== "demo") try {
		const p = await loadPortfolio();
		liveOk = p.summary.dataMode === "live" || (p.rows?.length ?? 0) > 0;
		customerCount = p?.summary.totalCustomers ?? null;
		if (!liveOk) error = getLastPoolError();
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
	const dbg = sqlConfigDebug();
	return {
		mode,
		configured,
		liveOk,
		error,
		customerCount,
		server: process.env.RPM_ASSURE_SQL_SERVER ?? null,
		database: process.env.RPM_ASSURE_SQL_DATABASE ?? "RPMAssure_App",
		debug: dbg
	};
});
//#endregion
export { fetchCustomerDetail_createServerFn_handler, fetchDataSourceStatus_createServerFn_handler, fetchPortfolio_createServerFn_handler };
