import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { t as Badge } from "./badge-BccjJCAV.mjs";
import { a as fetchIntegrations } from "./settings-api-7fPZgfQ4.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { b as Plug, v as RefreshCw } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.integrations-DSvkAE7s.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STATUS_CLASS = {
	Active: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
	Configured: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
	Planned: "bg-muted text-muted-foreground",
	Error: "bg-red-500/15 text-red-700 dark:text-red-300",
	Disabled: "bg-muted text-muted-foreground"
};
function IntegrationsPage() {
	const [rows, setRows] = (0, import_react.useState)([]);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const load = (0, import_react.useCallback)(async () => {
		setBusy(true);
		try {
			const r = await fetchIntegrations();
			setRows(r.rows ?? []);
			setMsg(r.message);
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
			setRows([]);
		} finally {
			setBusy(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
			className: "flex flex-wrap items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "inline-flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plug, { className: "size-4 text-primary" }), "Connections"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				type: "button",
				size: "sm",
				variant: "secondary",
				disabled: busy,
				onClick: () => void load(),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-4", busy && "animate-spin") }), "Refresh"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: [
						"SYSPRO is Active in v1. ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "RPM RMM Ecosystem"
						}),
						" (Pulseway) is the next leg — schema and customer tree are live. Endpoint protection, Cove backup, and Microsoft 365 Tenant remain planned under the same Customer spine (not domains)."
					]
				}),
				msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-amber-700 dark:text-amber-300",
					children: msg
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto rounded-xl border border-border",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full min-w-[640px] text-left text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-semibold",
									children: "Connection"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-semibold",
									children: "Kind"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-semibold",
									children: "Status"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-semibold",
									children: "Notes"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							colSpan: 4,
							className: "px-3 py-6 text-center text-muted",
							children: [
								"No connection rows — run central script",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "text-xs",
									children: "410_Ensure_Integration_Connections.sql"
								})
							]
						}) }) : rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border/70 last:border-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium text-fg",
										children: r.displayName
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-mono text-[11px] text-muted",
										children: r.connectionCode
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2.5 text-muted",
									children: r.sourceKind
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2.5",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: cn("font-medium", STATUS_CLASS[r.status] ?? STATUS_CLASS.Planned),
										children: r.status
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2.5 text-xs text-muted",
									children: r.notes ?? "—"
								})
							]
						}, r.connectionCode)) })]
					})
				})
			]
		})] })
	});
}
//#endregion
export { IntegrationsPage as component };
