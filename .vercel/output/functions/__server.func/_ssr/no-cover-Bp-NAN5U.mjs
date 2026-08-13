import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { t as NO_COVER } from "./cover-XYn6CGMi.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/no-cover-Bp-NAN5U.js
var import_jsx_runtime = require_jsx_runtime();
/** Estate / customer “not in scope” label — yellow + bold site-wide */
function NoCover({ className, title = "No Cover — this service is not in scope for this customer" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("rpma-no-cover inline-flex items-center rounded-md border border-rag-amber/50 bg-rag-amber-bg px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-rag-amber", className),
		title,
		children: NO_COVER
	});
}
function NoCoverPanel({ service, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-dashed border-rag-amber/40 bg-rag-amber-bg/30 px-4 py-8 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-bold text-fg",
				children: service
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCover, { className: "text-[11px]" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mx-auto mt-2 max-w-md text-[13px] text-muted",
				children: hint ?? "This customer does not include this service in their managed scope. Health and KPIs for this pillar are not scored."
			})
		]
	});
}
//#endregion
export { NoCoverPanel as n, NoCover as t };
