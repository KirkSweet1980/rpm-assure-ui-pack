import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as Route } from "./customers._code-DMK4iK3J.mjs";
import { n as NoCoverPanel } from "./no-cover-Bp-NAN5U.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/customers._code.epp.modules-C1Mo_FhJ.js
var import_jsx_runtime = require_jsx_runtime();
var SplitComponent = function CustomerChild() {
	const data = Route.useLoaderData();
	if (!data?.customer) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Loading customer workspace…"
	});
	const epp = data.epp;
	const devices = epp?.devices ?? [];
	if (!(data.cover?.epp === true || epp?.enabled === true || devices.length > 0 || (data.customer?.eppDeviceCount ?? 0) > 0)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "Endpoint Protection (EPP)",
		hint: epp?.message || "No cover — enable EPP for this customer to collect this module."
	});
	const byPolicy = /* @__PURE__ */ new Map();
	for (const d of devices) {
		const k = d.policyName?.trim() || "(no policy name)";
		byPolicy.set(k, (byPolicy.get(k) ?? 0) + 1);
	}
	const policies = [...byPolicy.entries()].sort((a, b) => b[1] - a[1]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "RPM End Point Protection · Policies on endpoints" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "p-4 text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-3 text-muted",
				children: "Policy assignment from GravityZone endpoint list (module matrix expands when API rights allow)."
			}), policies.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "No endpoint/policy rows for this customer on latest snapshot."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-1",
				children: policies.map(([name, n]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between rounded-md border border-border px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium text-fg",
						children: name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "tabular-nums text-muted",
						children: [n, " device(s)"]
					})]
				}, name))
			})]
		})] })
	});
};
//#endregion
export { SplitComponent as component };
