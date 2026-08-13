import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { r as fetchAdminAuditLog } from "./settings-api-7fPZgfQ4.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { v as RefreshCw } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.audit-1mavqyZJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function fmt(iso) {
	try {
		return new Date(iso).toLocaleString("en-ZA", {
			timeZone: "Africa/Johannesburg",
			dateStyle: "short",
			timeStyle: "medium"
		});
	} catch {
		return iso;
	}
}
function AuditLogPage() {
	const [entries, setEntries] = (0, import_react.useState)([]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const load = (0, import_react.useCallback)(async () => {
		setBusy(true);
		try {
			const r = await fetchAdminAuditLog({ data: { limit: 300 } });
			setEntries(r.entries ?? []);
		} catch {
			setEntries([]);
		} finally {
			setBusy(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
		className: "flex flex-wrap items-center justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Admin audit log" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			type: "button",
			size: "sm",
			variant: "secondary",
			disabled: busy,
			onClick: () => void load(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-4", busy && "animate-spin") }), "Refresh"]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-xs text-muted",
			children: [
				"Who changed platform settings / users. Stored on the app host as",
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
					className: "text-fg",
					children: "data/admin-audit.jsonl"
				}),
				" (not customer SQL)."
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto rounded-lg border border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[640px] text-left text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-surface-2 text-[11px] uppercase tracking-wide text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "When (SAST)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Actor"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Action"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Target"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Detail"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "OK"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					colSpan: 6,
					className: "px-2 py-6 text-center text-muted",
					children: "No audit entries yet — create/update a user or save RAG/alerts."
				}) }) : entries.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border/80 align-top",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-2 whitespace-nowrap",
							children: fmt(e.atUtc)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-2",
							children: e.actorEmail
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-2 font-mono text-[11px]",
							children: e.action
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-2",
							children: e.target ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "max-w-[280px] truncate px-2 py-2 text-muted",
							title: e.detail,
							children: e.detail ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-2",
							children: e.ok ? "Y" : "N"
						})
					]
				}, `${e.atUtc}-${i}`)) })]
			})
		})]
	})] });
}
//#endregion
export { AuditLogPage as component };
