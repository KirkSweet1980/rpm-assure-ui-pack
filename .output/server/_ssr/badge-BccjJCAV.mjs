import "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
require_react();
var import_jsx_runtime = require_jsx_runtime();
var badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-normal", {
	variants: { variant: {
		default: "border-border bg-surface-2 text-fg",
		muted: "border-border/60 bg-surface-2 text-muted",
		outline: "border-border text-muted",
		green: "border-rag-green/30 bg-rag-green-bg text-rag-green",
		amber: "border-rag-amber/30 bg-rag-amber-bg text-rag-amber",
		red: "border-rag-red/30 bg-rag-red-bg text-rag-red",
		nav: "border-transparent bg-white/15 text-nav-fg",
		accent: "border-accent/30 bg-accent-soft text-accent"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
//#endregion
export { Badge as t };
