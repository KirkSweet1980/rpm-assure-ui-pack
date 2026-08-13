import "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as createServerFn } from "./ssr.mjs";
import { t as createSsrRpc } from "./createSsrRpc-C1p7zOu_.mjs";
import "./badge-BccjJCAV.mjs";
import "./button-rM46W5TP.mjs";
import "./card-xTYX9pTS.mjs";
require_react();
var import_jsx_runtime = require_jsx_runtime();
createServerFn({ method: "GET" }).handler(createSsrRpc("450e93adbc92ad25161b13a4721d56081b344e9f3ebe186335279a042bdaef23"));
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("655c2ff891a9ffe4067fb9597e22b84995284ecd6d55da4aca79d4be4f81ea23"));
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("3860f8f488890094b805b54995721f94f0430ff486f937a1dbecd6566a78fd3e"));
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("7e21663ebff32c4a98b430e9ff6385320d86fd75c7caa51fcbbeba58eeec7875"));
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("0dc950cade5305cb25c0e54ebd4949901e7aa0be58da596ed5d5d830b5b7ecd2"));
function UsersPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-surface p-6 text-sm text-muted",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-medium text-fg",
				children: "User accounts temporarily disabled"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2",
				children: "Staff user management will return later. Existing logins still work."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/settings",
				className: "mt-3 inline-block text-accent hover:underline",
				children: "Back to Configuration"
			})
		]
	});
}
//#endregion
export { UsersPage as component };
