import { n as __esmMin, r as __exportAll } from "../_runtime.mjs";
import { n as isInsideContainer, t as init_is_inside_container } from "./is-inside-container.mjs";
import { n as is_wsl_default, t as init_is_wsl } from "./is-wsl.mjs";
import { n as init_define_lazy_prop, t as defineLazyProperty } from "./define-lazy-prop.mjs";
import { n as init_default_browser, t as defaultBrowser } from "./default-browser+[...].mjs";
import path from "node:path";
import { promisify } from "node:util";
import process from "node:process";
import fsPromises, { constants } from "node:fs/promises";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
//#region node_modules/wsl-utils/index.js
var wslDrivesMountPoint, powerShellPathFromWsl, powerShellPath;
var init_wsl_utils = __esmMin((() => {
	init_is_wsl();
	wslDrivesMountPoint = (() => {
		const defaultMountPoint = "/mnt/";
		let mountPoint;
		return async function() {
			if (mountPoint) return mountPoint;
			const configFilePath = "/etc/wsl.conf";
			let isConfigFileExists = false;
			try {
				await fsPromises.access(configFilePath, constants.F_OK);
				isConfigFileExists = true;
			} catch {}
			if (!isConfigFileExists) return defaultMountPoint;
			const configContent = await fsPromises.readFile(configFilePath, { encoding: "utf8" });
			const configMountPoint = /(?<!#.*)root\s*=\s*(?<mountPoint>.*)/g.exec(configContent);
			if (!configMountPoint) return defaultMountPoint;
			mountPoint = configMountPoint.groups.mountPoint.trim();
			mountPoint = mountPoint.endsWith("/") ? mountPoint : `${mountPoint}/`;
			return mountPoint;
		};
	})();
	powerShellPathFromWsl = async () => {
		return `${await wslDrivesMountPoint()}c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`;
	};
	powerShellPath = async () => {
		if (is_wsl_default) return powerShellPathFromWsl();
		return `${process.env.SYSTEMROOT || process.env.windir || String.raw`C:\Windows`}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
	};
}));
//#endregion
//#region node_modules/open/index.js
var open_exports = /* @__PURE__ */ __exportAll({
	apps: () => apps,
	default: () => open
});
/**
Get the default browser name in Windows from WSL.

@returns {Promise<string>} Browser name.
*/
async function getWindowsDefaultBrowserFromWsl() {
	const powershellPath = await powerShellPath();
	const rawCommand = String.raw`(Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice").ProgId`;
	const encodedCommand = Buffer.from(rawCommand, "utf16le").toString("base64");
	const { stdout } = await execFile$1(powershellPath, [
		"-NoProfile",
		"-NonInteractive",
		"-ExecutionPolicy",
		"Bypass",
		"-EncodedCommand",
		encodedCommand
	], { encoding: "utf8" });
	const progId = stdout.trim();
	const browserMap = {
		ChromeHTML: "com.google.chrome",
		BraveHTML: "com.brave.Browser",
		MSEdgeHTM: "com.microsoft.edge",
		FirefoxURL: "org.mozilla.firefox"
	};
	return browserMap[progId] ? { id: browserMap[progId] } : {};
}
function detectArchBinary(binary) {
	if (typeof binary === "string" || Array.isArray(binary)) return binary;
	const { [arch]: archBinary } = binary;
	if (!archBinary) throw new Error(`${arch} is not supported`);
	return archBinary;
}
function detectPlatformBinary({ [platform]: platformBinary }, { wsl }) {
	if (wsl && is_wsl_default) return detectArchBinary(wsl);
	if (!platformBinary) throw new Error(`${platform} is not supported`);
	return detectArchBinary(platformBinary);
}
var execFile$1, __dirname, localXdgOpenPath, platform, arch, pTryEach, baseOpen, open, apps;
var init_open = __esmMin((() => {
	init_wsl_utils();
	init_define_lazy_prop();
	init_default_browser();
	init_is_inside_container();
	execFile$1 = promisify(childProcess.execFile);
	__dirname = path.dirname(fileURLToPath(import.meta.url));
	localXdgOpenPath = path.join(__dirname, "xdg-open");
	({platform, arch} = process);
	pTryEach = async (array, mapper) => {
		let latestError;
		for (const item of array) try {
			return await mapper(item);
		} catch (error) {
			latestError = error;
		}
		throw latestError;
	};
	baseOpen = async (options) => {
		options = {
			wait: false,
			background: false,
			newInstance: false,
			allowNonzeroExitCode: false,
			...options
		};
		if (Array.isArray(options.app)) return pTryEach(options.app, (singleApp) => baseOpen({
			...options,
			app: singleApp
		}));
		let { name: app, arguments: appArguments = [] } = options.app ?? {};
		appArguments = [...appArguments];
		if (Array.isArray(app)) return pTryEach(app, (appName) => baseOpen({
			...options,
			app: {
				name: appName,
				arguments: appArguments
			}
		}));
		if (app === "browser" || app === "browserPrivate") {
			const ids = {
				"com.google.chrome": "chrome",
				"google-chrome.desktop": "chrome",
				"com.brave.Browser": "brave",
				"org.mozilla.firefox": "firefox",
				"firefox.desktop": "firefox",
				"com.microsoft.msedge": "edge",
				"com.microsoft.edge": "edge",
				"com.microsoft.edgemac": "edge",
				"microsoft-edge.desktop": "edge"
			};
			const flags = {
				chrome: "--incognito",
				brave: "--incognito",
				firefox: "--private-window",
				edge: "--inPrivate"
			};
			const browser = is_wsl_default ? await getWindowsDefaultBrowserFromWsl() : await defaultBrowser();
			if (browser.id in ids) {
				const browserName = ids[browser.id];
				if (app === "browserPrivate") appArguments.push(flags[browserName]);
				return baseOpen({
					...options,
					app: {
						name: apps[browserName],
						arguments: appArguments
					}
				});
			}
			throw new Error(`${browser.name} is not supported as a default browser`);
		}
		let command;
		const cliArguments = [];
		const childProcessOptions = {};
		if (platform === "darwin") {
			command = "open";
			if (options.wait) cliArguments.push("--wait-apps");
			if (options.background) cliArguments.push("--background");
			if (options.newInstance) cliArguments.push("--new");
			if (app) cliArguments.push("-a", app);
		} else if (platform === "win32" || is_wsl_default && !isInsideContainer() && !app) {
			command = await powerShellPath();
			cliArguments.push("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand");
			if (!is_wsl_default) childProcessOptions.windowsVerbatimArguments = true;
			const encodedArguments = ["Start"];
			if (options.wait) encodedArguments.push("-Wait");
			if (app) {
				encodedArguments.push(`"\`"${app}\`""`);
				if (options.target) appArguments.push(options.target);
			} else if (options.target) encodedArguments.push(`"${options.target}"`);
			if (appArguments.length > 0) {
				appArguments = appArguments.map((argument) => `"\`"${argument}\`""`);
				encodedArguments.push("-ArgumentList", appArguments.join(","));
			}
			options.target = Buffer.from(encodedArguments.join(" "), "utf16le").toString("base64");
		} else {
			if (app) command = app;
			else {
				const isBundled = !__dirname || __dirname === "/";
				let exeLocalXdgOpen = false;
				try {
					await fsPromises.access(localXdgOpenPath, constants.X_OK);
					exeLocalXdgOpen = true;
				} catch {}
				command = process.versions.electron ?? (platform === "android" || isBundled || !exeLocalXdgOpen) ? "xdg-open" : localXdgOpenPath;
			}
			if (appArguments.length > 0) cliArguments.push(...appArguments);
			if (!options.wait) {
				childProcessOptions.stdio = "ignore";
				childProcessOptions.detached = true;
			}
		}
		if (platform === "darwin" && appArguments.length > 0) cliArguments.push("--args", ...appArguments);
		if (options.target) cliArguments.push(options.target);
		const subprocess = childProcess.spawn(command, cliArguments, childProcessOptions);
		if (options.wait) return new Promise((resolve, reject) => {
			subprocess.once("error", reject);
			subprocess.once("close", (exitCode) => {
				if (!options.allowNonzeroExitCode && exitCode > 0) {
					reject(/* @__PURE__ */ new Error(`Exited with code ${exitCode}`));
					return;
				}
				resolve(subprocess);
			});
		});
		subprocess.unref();
		return subprocess;
	};
	open = (target, options) => {
		if (typeof target !== "string") throw new TypeError("Expected a `target`");
		return baseOpen({
			...options,
			target
		});
	};
	apps = {};
	defineLazyProperty(apps, "chrome", () => detectPlatformBinary({
		darwin: "google chrome",
		win32: "chrome",
		linux: [
			"google-chrome",
			"google-chrome-stable",
			"chromium"
		]
	}, { wsl: {
		ia32: "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
		x64: ["/mnt/c/Program Files/Google/Chrome/Application/chrome.exe", "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"]
	} }));
	defineLazyProperty(apps, "brave", () => detectPlatformBinary({
		darwin: "brave browser",
		win32: "brave",
		linux: ["brave-browser", "brave"]
	}, { wsl: {
		ia32: "/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe",
		x64: ["/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe", "/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe"]
	} }));
	defineLazyProperty(apps, "firefox", () => detectPlatformBinary({
		darwin: "firefox",
		win32: String.raw`C:\Program Files\Mozilla Firefox\firefox.exe`,
		linux: "firefox"
	}, { wsl: "/mnt/c/Program Files/Mozilla Firefox/firefox.exe" }));
	defineLazyProperty(apps, "edge", () => detectPlatformBinary({
		darwin: "microsoft edge",
		win32: "msedge",
		linux: ["microsoft-edge", "microsoft-edge-dev"]
	}, { wsl: "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" }));
	defineLazyProperty(apps, "browser", () => "browser");
	defineLazyProperty(apps, "browserPrivate", () => "browserPrivate");
}));
//#endregion
export { open_exports as n, init_open as t };
