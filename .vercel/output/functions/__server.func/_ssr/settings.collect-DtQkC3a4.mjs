import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { t as Badge } from "./badge-BccjJCAV.mjs";
import { i as fetchCollectInventory } from "./settings-api-7fPZgfQ4.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { v as RefreshCw } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.collect-DtQkC3a4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function fmt(iso) {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleString("en-ZA", {
			timeZone: "Africa/Johannesburg",
			dateStyle: "short",
			timeStyle: "short"
		});
	} catch {
		return iso;
	}
}
function ragClass(r) {
	if (r === "Red") return "bg-red-500/15 text-red-700 dark:text-red-300";
	if (r === "Amber") return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
	return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
}
function CollectInventoryPage() {
	const [rows, setRows] = (0, import_react.useState)([]);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [staleHours, setStaleHours] = (0, import_react.useState)(48);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const load = (0, import_react.useCallback)(async () => {
		setBusy(true);
		try {
			const r = await fetchCollectInventory();
			setMsg(r.message);
			setRows(r.rows ?? []);
			setStaleHours(r.staleHours ?? 48);
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
		className: "flex flex-wrap items-center justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Collect inventory" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
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
					"Last import per active customer / SYSPRO instance. Stale = no operators import within ",
					staleHours,
					" hours (Settings → RAG thresholds)."
				]
			}),
			msg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: msg
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-lg border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[720px] text-left text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-surface-2 text-[11px] uppercase tracking-wide text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-2",
								children: "Customer"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-2",
								children: "Instance"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-2",
								children: "Health"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-2",
								children: "Ops last"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-2",
								children: "Age (h)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-2",
								children: "Jobs / err"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-2",
								children: "FinSight Out of Balance"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-2",
								children: "License"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 8,
						className: "px-2 py-6 text-center text-muted",
						children: "No rows — check SQL connection and Dim_Customer."
					}) }) : rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border/80 hover:bg-surface-2/60",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-2 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/customers/$code",
									params: { code: row.customerCode },
									className: "font-medium text-primary hover:underline",
									children: row.displayName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[10px] text-muted",
									children: [row.customerCode, !row.active && " · inactive"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-2 font-mono text-[11px]",
								children: row.sqlInstanceName || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-2 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: cn("inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold", ragClass(row.healthRag)),
									children: row.healthRag
								}), row.stale && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "outline",
									className: "ml-1 text-[10px]",
									children: "Stale"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-2 py-2 whitespace-nowrap",
								children: [fmt(row.lastOpsUtc), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[10px] text-muted",
									children: [row.opsCount, " ops"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-2",
								children: row.hoursSinceOps == null ? "—" : row.hoursSinceOps
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-2 py-2",
								children: [
									row.jobsCount,
									row.jobErrors > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-red-600 dark:text-red-400",
										children: [
											" ",
											"/ ",
											row.jobErrors,
											" err"
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-muted",
										children: fmt(row.lastJobsUtc)
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-2",
								children: row.dtrVarLines
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-2 whitespace-nowrap",
								children: fmt(row.lastLicenseUtc)
							})
						]
					}, row.customerCode)) })]
				})
			})
		]
	})] });
}
//#endregion
export { CollectInventoryPage as component };
