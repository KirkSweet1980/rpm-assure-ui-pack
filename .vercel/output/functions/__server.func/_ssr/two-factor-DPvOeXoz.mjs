import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as Navigate, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import "./client-GruXRyhu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/two-factor-DPvOeXoz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Second factor after password sign-in.
* better-auth holds a short-lived 2FA cookie until TOTP/backup succeeds.
*/
function TwoFactorVerifyPage() {
	useNavigate();
	const [code, setCode] = (0, import_react.useState)("");
	const [trustDevice, setTrustDevice] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [mode, setMode] = (0, import_react.useState)("totp");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/" });
}
//#endregion
export { TwoFactorVerifyPage as component };
