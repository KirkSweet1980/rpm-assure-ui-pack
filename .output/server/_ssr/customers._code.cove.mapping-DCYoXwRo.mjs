import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as Route } from "./customers._code-DMK4iK3J.mjs";
import { i as CoveMappingSection } from "./customer-sections-bLlAl5Tn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/customers._code.cove.mapping-DCYoXwRo.js
var import_jsx_runtime = require_jsx_runtime();
var SplitComponent = function CustomerChild() {
	const data = Route.useLoaderData();
	if (!data?.customer) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Loading customer workspace… If this stays blank, use Refresh in the top bar."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoveMappingSection, { data });
};
//#endregion
export { SplitComponent as component };
