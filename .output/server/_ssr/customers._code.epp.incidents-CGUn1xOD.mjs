import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as formatSastDateTime } from "./utils-BpkUUAOs.mjs";
import { t as Route } from "./customers._code-DMK4iK3J.mjs";
import { n as NoCoverPanel } from "./no-cover-Bp-NAN5U.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/customers._code.epp.incidents-CGUn1xOD.js
var import_jsx_runtime = require_jsx_runtime();
var SplitComponent = function CustomerChild() {
	const data = Route.useLoaderData();
	if (!data?.customer) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Loading customer workspace…"
	});
	const epp = data.epp;
	if (!(data.cover?.epp === true || epp?.enabled === true || (epp?.devices?.length ?? 0) > 0 || (epp?.summary?.deviceCount ?? 0) > 0 || (data.customer?.eppDeviceCount ?? 0) > 0)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "Endpoint Protection (EPP) · Incidents",
		hint: epp?.message || "No cover — no Bitdefender endpoints mapped to this customer."
	});
	const rows = epp?.incidents ?? [];
	const feed = epp?.feedStatus;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: [
			"RPM End Point Protection · Incidents (",
			rows.length,
			")"
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "p-0",
			children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2 p-4 text-sm text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium text-fg",
					children: "No open incidents on latest collect."
				}), feed?.incidentsOk === false ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[12px] text-subtle",
					children: [
						"GravityZone incidents API not available for this key",
						feed.incidentsMessage ? `: ${feed.incidentsMessage}` : ".",
						" Enable Incidents rights on the API key, re-run Bitdefender collect."
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[12px] text-subtle",
					children: "Clean slate — no open security incidents returned for this customer's endpoints."
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[720px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Detected"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Device"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Severity"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Type"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Summary"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border/70",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs text-muted",
								children: r.detectedAt ? formatSastDateTime(r.detectedAt) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-medium",
								children: r.deviceName ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs",
								children: r.severity ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs",
								children: r.status ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs text-muted",
								children: r.incidentType ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "max-w-[280px] truncate px-3 py-2 text-xs text-muted",
								title: r.summary ?? void 0,
								children: r.summary ?? "—"
							})
						]
					}, r.incidentId)) })]
				})
			})
		})] })
	});
};
//#endregion
export { SplitComponent as component };
