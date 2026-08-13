import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as Badge } from "./badge-BccjJCAV.mjs";
import { l as runSqlQuery } from "./settings-api-7fPZgfQ4.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { S as Play } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.query-CX_OpeR8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SAMPLES = [
	"SELECT TOP 20 CustomerCode, DisplayName, Active, SqlInstanceName FROM dbo.Dim_Customer ORDER BY CustomerCode",
	"SELECT TOP 50 SnapshotDate, InstanceName, OperatorCode, LastLoginDate FROM dbo.Syspro_Operators ORDER BY ImportedAt DESC",
	"SELECT InstanceName, COUNT(*) AS JobRows FROM dbo.Syspro_JobLogging GROUP BY InstanceName"
];
function QueryPage() {
	const [sqlText, setSqlText] = (0, import_react.useState)(SAMPLES[0]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [message, setMessage] = (0, import_react.useState)(null);
	const [ok, setOk] = (0, import_react.useState)(null);
	const [columns, setColumns] = (0, import_react.useState)([]);
	const [rows, setRows] = (0, import_react.useState)([]);
	async function run() {
		setBusy(true);
		setMessage(null);
		try {
			const r = await runSqlQuery({ data: {
				sqlText,
				maxRows: 200
			} });
			setOk(r.ok);
			setMessage(r.message);
			setColumns(r.columns);
			setRows(r.rows);
		} catch (e) {
			setOk(false);
			setMessage(e instanceof Error ? e.message : String(e));
			setColumns([]);
			setRows([]);
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "inline-flex items-center gap-2",
			children: ["SQL Query", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
				variant: "muted",
				children: "SELECT only"
			})]
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: [
						"Read-only explorer against the ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "primary" }),
						" connection. Blocked: INSERT, UPDATE, DELETE, DDL, EXEC, multiple batches. Max 200 rows (cap 1000)."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-1.5",
					children: SAMPLES.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] text-muted hover:text-fg",
						onClick: () => setSqlText(s),
						children: ["Sample ", i + 1]
					}, i))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					className: "min-h-[140px] w-full rounded-lg border border-border bg-bg p-3 font-mono text-xs text-fg",
					value: sqlText,
					onChange: (e) => setSqlText(e.target.value),
					spellCheck: false
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					disabled: busy,
					onClick: () => void run(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-4 w-4" }), " Run query"]
				}),
				message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `text-xs ${ok ? "text-rag-green" : "text-rag-red"}`,
					children: message
				}) : null
			]
		})] }), columns.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: [
			"Results (",
			rows.length,
			")"
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "overflow-auto p-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-left text-[11px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "sticky top-0 bg-card-head text-[10px] uppercase text-subtle",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: columns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "whitespace-nowrap px-2 py-1.5 font-semibold",
						children: c
					}, c)) })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
					className: "border-t border-border/80",
					children: columns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "max-w-[220px] truncate px-2 py-1 font-mono",
						children: formatCell(r[c])
					}, c))
				}, i)) })]
			})
		})] }) : null]
	});
}
function formatCell(v) {
	if (v == null) return "—";
	if (typeof v === "object") return JSON.stringify(v);
	return String(v);
}
//#endregion
export { QueryPage as component };
