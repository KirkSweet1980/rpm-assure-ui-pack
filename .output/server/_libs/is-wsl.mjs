import { n as __esmMin } from "../_runtime.mjs";
import { n as isInsideContainer, t as init_is_inside_container } from "./is-inside-container.mjs";
import fs from "node:fs";
import os from "node:os";
import process from "node:process";
//#region node_modules/is-wsl/index.js
var isWsl, is_wsl_default;
var init_is_wsl = __esmMin((() => {
	init_is_inside_container();
	isWsl = () => {
		if (process.platform !== "linux") return false;
		if (os.release().toLowerCase().includes("microsoft")) {
			if (isInsideContainer()) return false;
			return true;
		}
		try {
			if (fs.readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft")) return !isInsideContainer();
		} catch {}
		if (fs.existsSync("/proc/sys/fs/binfmt_misc/WSLInterop") || fs.existsSync("/run/WSL")) return !isInsideContainer();
		return false;
	};
	is_wsl_default = process.env.__IS_WSL_TEST__ ? isWsl : isWsl();
}));
//#endregion
export { is_wsl_default as n, init_is_wsl as t };
