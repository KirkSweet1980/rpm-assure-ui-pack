import { n as __esmMin } from "../_runtime.mjs";
import fs from "node:fs";
//#region node_modules/is-docker/index.js
function hasDockerEnv() {
	try {
		fs.statSync("/.dockerenv");
		return true;
	} catch {
		return false;
	}
}
function hasDockerCGroup() {
	try {
		return fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
	} catch {
		return false;
	}
}
function isDocker() {
	if (isDockerCached === void 0) isDockerCached = hasDockerEnv() || hasDockerCGroup();
	return isDockerCached;
}
var isDockerCached;
var init_is_docker = __esmMin((() => {}));
//#endregion
export { isDocker as n, init_is_docker as t };
