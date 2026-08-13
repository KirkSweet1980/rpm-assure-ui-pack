import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as DEFAULT_ALERTS } from "./types-Dk-h6nx5.mjs";
import { c as runAlertEvaluation, o as fetchSettingsBundle, u as saveAlertSettings } from "./settings-api-7fPZgfQ4.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { Y as Bell, h as Save } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.alerts-dLYQTRgh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AlertsSettingsPage() {
	const [alerts, setAlerts] = (0, import_react.useState)({ ...DEFAULT_ALERTS });
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [matches, setMatches] = (0, import_react.useState)([]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const load = (0, import_react.useCallback)(async () => {
		const b = await fetchSettingsBundle();
		setAlerts({
			...DEFAULT_ALERTS,
			...b.alerts ?? {}
		});
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	async function onSave() {
		setBusy(true);
		setMsg(null);
		try {
			const r = await saveAlertSettings({ data: { alerts } });
			setMsg("Alert rules saved (in-app evaluation only — email disabled).");
			if (r.alerts) setAlerts(r.alerts);
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	async function onEvaluate() {
		setBusy(true);
		setMsg(null);
		setMatches([]);
		try {
			await saveAlertSettings({ data: { alerts } });
			const r = await runAlertEvaluation({ data: { force: true } });
			setMsg(r.message);
			setMatches(r.matches ?? []);
			await load();
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
			className: "inline-flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "size-4 text-primary" }), "Alert rules"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: [
						"Evaluate estate health and collect freshness in the app.",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Outbound email is disabled"
						}),
						" — matches show on this page only."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: alerts.enabled,
						onChange: (e) => setAlerts((s) => ({
							...s,
							enabled: e.target.checked
						}))
					}), "Enable alert evaluation"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: alerts.alertOnRed,
						onChange: (e) => setAlerts((s) => ({
							...s,
							alertOnRed: e.target.checked
						}))
					}), "Flag Red health"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mb-1 block font-medium text-fg",
						children: "Job errors threshold (min)"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						className: "w-full max-w-xs rounded-lg border border-border bg-bg px-3 py-2",
						value: alerts.jobErrorMin,
						onChange: (e) => setAlerts((s) => ({
							...s,
							jobErrorMin: Number(e.target.value) || 0
						}))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mb-1 block font-medium text-fg",
						children: "Collect stale after (hours)"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						className: "w-full max-w-xs rounded-lg border border-border bg-bg px-3 py-2",
						value: alerts.collectStaleHours,
						onChange: (e) => setAlerts((s) => ({
							...s,
							collectStaleHours: Number(e.target.value) || 0
						}))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2 pt-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						disabled: busy,
						onClick: () => void onSave(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), " Save rules"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "secondary",
						disabled: busy,
						onClick: () => void onEvaluate(),
						children: "Evaluate now"
					})]
				}),
				msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-fg",
					children: msg
				}) : null,
				matches.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "list-inside list-disc text-sm text-muted",
					children: matches.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: m }, m))
				}) : null
			]
		})] })
	});
}
//#endregion
export { AlertsSettingsPage as component };
