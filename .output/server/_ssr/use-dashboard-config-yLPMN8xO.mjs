import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { r as DEFAULT_DASHBOARD } from "./types-Dk-h6nx5.mjs";
import { o as fetchSettingsBundle } from "./settings-api-7fPZgfQ4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-dashboard-config-yLPMN8xO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var CACHE_KEY = "rpma_dashboard_cfg_v1";
var TTL_MS = 3e4;
function readCache() {
	if (typeof sessionStorage === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const box = JSON.parse(raw);
		if (!box?.at || Date.now() - box.at > TTL_MS) return null;
		return {
			...DEFAULT_DASHBOARD,
			...box.data
		};
	} catch {
		return null;
	}
}
function writeCache(data) {
	if (typeof sessionStorage === "undefined") return;
	try {
		sessionStorage.setItem(CACHE_KEY, JSON.stringify({
			at: Date.now(),
			data
		}));
	} catch {}
}
/** Client hook — estate / customer pages read dashboard layout from settings. */
function useDashboardConfig() {
	const cached = readCache();
	const [dashboard, setDashboard] = (0, import_react.useState)(cached ?? { ...DEFAULT_DASHBOARD });
	const [loading, setLoading] = (0, import_react.useState)(!cached);
	const load = (0, import_react.useCallback)(async () => {
		try {
			const b = await fetchSettingsBundle();
			const next = {
				...DEFAULT_DASHBOARD,
				...b.dashboard ?? {}
			};
			setDashboard(next);
			writeCache(next);
		} catch {} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	return {
		dashboard,
		loading,
		reload: () => {
			try {
				sessionStorage.removeItem(CACHE_KEY);
			} catch {}
			setLoading(true);
			load();
		}
	};
}
function clearDashboardConfigCache() {
	try {
		sessionStorage.removeItem(CACHE_KEY);
	} catch {}
}
//#endregion
export { useDashboardConfig as n, clearDashboardConfigCache as t };
