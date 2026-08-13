import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as Route } from "./customers._code-DMK4iK3J.mjs";
import { a as CoveRecoverySection } from "./customer-sections-bLlAl5Tn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/customers._code.cove.recovery-DaEeRhZR.js
var import_jsx_runtime = require_jsx_runtime();
var SplitComponent = function CustomerChild() {
	const data = Route.useLoaderData();
	if (!data?.customer) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Loading…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoveRecoverySection, { data });
};
//#endregion
export { SplitComponent as component };
