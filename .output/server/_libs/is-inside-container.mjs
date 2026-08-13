import { n as __esmMin } from "../_runtime.mjs";
import { n as isDocker, t as init_is_docker } from "./is-docker.mjs";
import fs from "node:fs";
//#region node_modules/is-inside-container/index.js
function isInsideContainer() {
	if (cachedResult === void 0) cachedResult = hasContainerEnv() || isDocker();
	return cachedResult;
}
var cachedResult, hasContainerEnv;
var init_is_inside_container = __esmMin((() => {
	init_is_docker();
	hasContainerEnv = () => {
		try {
			fs.statSync("/run/.containerenv");
			return true;
		} catch {
			return false;
		}
	};
}));
//#endregion
export { isInsideContainer as n, init_is_inside_container as t };
