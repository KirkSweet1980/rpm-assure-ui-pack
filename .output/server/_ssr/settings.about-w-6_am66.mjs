import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.about-w-6_am66.js
var import_jsx_runtime = require_jsx_runtime();
function AboutPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "What we shipped in Settings" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "space-y-2 text-sm text-muted",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "list-disc space-y-1 pl-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "AMS:"
					}), " SYSPRO operating + FinSight financial controls — not uptime alone."] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "SQL Server connections (multi-entry, primary, test, data mode)" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Read-only SQL query explorer" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Full user account control — create sign-in, roles, enable/disable, password reset, customer scope (PlatformAdmin only; no public self-registration)" })
				]
			})
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Suggested next settings (priority order)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "text-sm",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
				className: "list-decimal space-y-2 pl-5 text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "RAG thresholds"
					}), " — job error red/amber, FinSight rules without code deploy."] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "Alert rules"
					}), " (in-app evaluation; email off) — "] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "Collect inventory"
					}), " — last import per customer / instance, schedule health."] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "Audit log of admin actions"
					}), " — who created/disabled users and when."] })
				]
			})
		})] })]
	});
}
//#endregion
export { AboutPage as component };
