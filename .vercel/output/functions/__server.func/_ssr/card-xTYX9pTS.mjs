import "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
require_react();
var import_jsx_runtime = require_jsx_runtime();
/** shadcn-style Card — flat border, consistent padding (Phase 1) */
function Card({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("rpma-card relative overflow-hidden rounded-xl border border-border bg-surface text-fg shadow-sm", className),
		...props
	});
}
/** Legacy panel heading — keeps Exco Show/Hide headers working */
function CardHead({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("rpma-panel-heading flex items-center border-b border-border px-4 py-3 font-semibold tracking-tight text-fg", className),
		...props,
		children
	});
}
function CardContent({ className, style, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("p-4 pt-2 sm:p-5 sm:pt-2", className),
		style,
		...props
	});
}
//#endregion
export { CardContent as n, CardHead as r, Card as t };
