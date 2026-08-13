import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.smtp-BTTBDghg.js
var import_jsx_runtime = require_jsx_runtime();
/** Outbound email removed from RPM Assure for now. */
function SmtpRemovedPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Email / SMTP removed" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-3 text-sm text-muted",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"Outbound email (SMTP, test send, weekly digest mail) is not part of this release. Reports stay ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
					className: "text-fg",
					children: "on-screen / print"
				}),
				" ",
				"under Reports."
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Sign-in username/email and Let's Encrypt contact email (SSL) are unchanged — those are not outbound mail." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/settings/sql",
				className: "font-medium text-primary underline-offset-2 hover:underline",
				children: "Back to Settings → SQL Server"
			})
		]
	})] });
}
//#endregion
export { SmtpRemovedPage as component };
