import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import "./profile-security-panels-C_njn8P6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.profile-C-m9hvXX.js
var import_jsx_runtime = require_jsx_runtime();
function SettingsProfilePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-surface p-6 text-sm text-muted",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-medium text-fg",
				children: "Profiles temporarily disabled"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2",
				children: "User profiles and 2FA will return in a later release. Continue using the app with your existing sign-in."
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
export { SettingsProfilePage as component };
