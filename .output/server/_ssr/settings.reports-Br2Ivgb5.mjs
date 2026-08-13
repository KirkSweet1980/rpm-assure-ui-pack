import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { L as FileText, q as CalendarClock } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.reports-Br2Ivgb5.js
var import_jsx_runtime = require_jsx_runtime();
function ReportSchedulesPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
			className: "inline-flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { className: "size-4 text-primary" }), "Reports"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-4 text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-muted",
				children: [
					"Packs are built from Live SQL + AMS facts and viewed",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "in the browser / print"
					}),
					". Outbound email schedules are not enabled in this release."
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						size: "sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/reports",
							search: {
								format: void 0,
								customer: void 0
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-4" }), "Open Reports"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						size: "sm",
						variant: "secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/reports",
							search: {
								format: "ams-monthly",
								customer: void 0
							},
							children: "Monthly pack UI"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						size: "sm",
						variant: "secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/reports",
							search: {
								format: "ams-weekly",
								customer: void 0
							},
							children: "Weekly AMS UI"
						})
					})
				]
			})]
		})] })
	});
}
//#endregion
export { ReportSchedulesPage as component };
