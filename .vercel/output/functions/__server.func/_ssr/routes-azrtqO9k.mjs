import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as fetchDataSourceStatus, r as fetchPortfolio } from "./portfolio-C-mAzdfM.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-azrtqO9k.js
var $$splitComponentImporter = () => import("./routes-FdH-KNpf.mjs");
var Route = createFileRoute("/")({
	loader: async () => {
		const [portfolio, source] = await Promise.all([fetchPortfolio(), fetchDataSourceStatus()]);
		return {
			portfolio,
			source
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
