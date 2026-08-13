import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as Route } from "./customers._code-DMK4iK3J.mjs";
import { n as NoCoverPanel } from "./no-cover-Bp-NAN5U.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/customers._code.csp.index-DXJCDQGp.js
var import_jsx_runtime = require_jsx_runtime();
var SplitComponent = function CustomerChild() {
	const data = Route.useLoaderData();
	if (!data?.customer) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Loading customer workspace…"
	});
	if (data.cover?.csp !== true) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "Microsoft 365 Tenant",
		hint: "No cover — Microsoft 365 Tenant / Office 365 licensing not in scope for this customer yet. Tenant health and seat stats will appear when the CSP connection is mapped."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Microsoft 365 Tenant · Tenant health" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
		className: "p-4 text-sm text-muted",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Tenant health, service scores, and open issues for the customer Microsoft 365 tenant." })
	})] });
};
//#endregion
export { SplitComponent as component };
