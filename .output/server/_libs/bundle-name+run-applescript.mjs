import { n as __esmMin } from "../_runtime.mjs";
import { promisify } from "node:util";
import process from "node:process";
import { execFile } from "node:child_process";
//#region node_modules/run-applescript/index.js
async function runAppleScript(script, { humanReadableOutput = true, signal } = {}) {
	if (process.platform !== "darwin") throw new Error("macOS only");
	const outputArguments = humanReadableOutput ? [] : ["-ss"];
	const execOptions = {};
	if (signal) execOptions.signal = signal;
	const { stdout } = await execFileAsync("osascript", [
		"-e",
		script,
		outputArguments
	], execOptions);
	return stdout.trim();
}
var execFileAsync;
var init_run_applescript = __esmMin((() => {
	execFileAsync = promisify(execFile);
}));
//#endregion
//#region node_modules/bundle-name/index.js
async function bundleName(bundleId) {
	return runAppleScript(`tell application "Finder" to set app_path to application file id "${bundleId}" as string\ntell application "System Events" to get value of property list item "CFBundleName" of property list file (app_path & ":Contents:Info.plist")`);
}
var init_bundle_name = __esmMin((() => {
	init_run_applescript();
}));
//#endregion
export { init_bundle_name as n, bundleName as t };
