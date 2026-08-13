import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as fetchPortfolio } from "./portfolio-C-mAzdfM.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-C-ApQtys.js
var $$splitComponentImporter = () => import("./reports-CT26zeMq.mjs");
var Route = createFileRoute("/reports")({
	validateSearch: (search) => ({
		format: typeof search.format === "string" ? search.format : void 0,
		customer: typeof search.customer === "string" ? search.customer : void 0
	}),
	loader: async () => fetchPortfolio(),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
