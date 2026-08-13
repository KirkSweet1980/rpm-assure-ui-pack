import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as Route } from "./customers._code-DMK4iK3J.mjs";
import { n as NoCoverPanel } from "./no-cover-Bp-NAN5U.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/customers._code.epp.index-CC-ryT_7.js
var import_jsx_runtime = require_jsx_runtime();
function Stat({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-card/40 px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] uppercase tracking-wide text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: tone === "green" ? "text-lg font-semibold tabular-nums text-rag-green" : "text-lg font-semibold tabular-nums text-fg",
			children: value
		})]
	});
}
var SplitComponent = function CustomerChild() {
	const data = Route.useLoaderData();
	if (!data?.customer) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Loading customer workspace… If this stays blank, use Refresh in the top bar."
	});
	const epp = data.epp;
	const deviceCount = epp?.summary?.deviceCount ?? epp?.devices?.length ?? 0;
	if (!(data.cover?.epp === true || epp?.enabled === true || deviceCount > 0 || (data.customer?.eppDeviceCount ?? 0) > 0)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "Endpoint Protection (EPP)",
		hint: epp?.message || "No cover — no Bitdefender endpoints mapped to this customer. Run EPP collect and name-map patterns."
	});
	const s = epp?.summary;
	const devices = epp?.devices ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "RPM End Point Protection · Device stats" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-3 p-4 text-sm",
			children: [
				epp?.message && deviceCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: epp.message
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Protected endpoints",
							value: s?.deviceCount ?? devices.length
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Managed",
							value: s?.managedCount ?? "—",
							tone: "green"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Servers (type 6)",
							value: s?.serverCount ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Workstations (type 5)",
							value: s?.workstationCount ?? "—"
						})
					]
				}),
				epp?.license ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[12px] text-muted",
					children: [
						"Estate license slots:",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-medium text-fg",
							children: [
								epp.license.usedSlots ?? "—",
								" / ",
								epp.license.totalSlots ?? "—"
							]
						}),
						epp.license.endSubscription ? ` · subscription to ${epp.license.endSubscription}` : null
					]
				}) : null,
				s?.asOfDate ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[12px] text-muted",
					children: ["Snapshot: ", s.asOfDate]
				}) : null
			]
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: [
			"Endpoints (",
			devices.length,
			")"
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "p-0",
			children: devices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "p-4 text-sm text-muted",
				children: "Cover is on from portfolio counts, but no endpoint rows returned for this customer. Re-run Bitdefender collect."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[720px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Device"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "FQDN"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "IP"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "OS"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Managed"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Policy"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: devices.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border/70",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-medium",
								children: d.deviceName ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs text-muted",
								children: d.fqdn ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs tabular-nums",
								children: d.ipAddress ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "max-w-[180px] truncate px-3 py-2 text-xs text-muted",
								title: d.operatingSystem ?? void 0,
								children: d.operatingSystem ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs",
								children: d.isManaged === true ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold text-rag-green",
									children: "Yes"
								}) : d.isManaged === false ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold text-rag-amber",
									children: "No"
								}) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs text-muted",
								children: d.policyName ?? "—"
							})
						]
					}, d.endpointId)) })]
				})
			})
		})] })]
	});
};
//#endregion
export { SplitComponent as component };
