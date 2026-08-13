import { _ as Navigate, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as useStaffProfile } from "./use-staff-profile-CtJQjgds.mjs";
import "./app-shell-AnmkMbv2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-BuZv1SvR.js
var import_jsx_runtime = require_jsx_runtime();
function SettingsLayout() {
	const { profile } = useStaffProfile();
	useRouterState({ select: (s) => s.location.pathname });
	profile?.permissions.canAccessPlatformSettings;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/" });
}
//#endregion
export { SettingsLayout as component };
