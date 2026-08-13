import { n as __esmMin } from "../_runtime.mjs";
import { n as init_bundle_name, t as bundleName } from "./bundle-name+run-applescript.mjs";
import { promisify } from "node:util";
import process from "node:process";
import { execFile } from "node:child_process";
//#region node_modules/default-browser-id/index.js
async function defaultBrowserId() {
	if (process.platform !== "darwin") throw new Error("macOS only");
	const { stdout } = await execFileAsync$2("defaults", [
		"read",
		"com.apple.LaunchServices/com.apple.launchservices.secure",
		"LSHandlers"
	]);
	const browserId = /LSHandlerRoleAll = "(?!-)(?<id>[^"]+?)";\s+?LSHandlerURLScheme = (?:http|https);/.exec(stdout)?.groups.id ?? "com.apple.Safari";
	if (browserId === "com.apple.safari") return "com.apple.Safari";
	return browserId;
}
var execFileAsync$2;
var init_default_browser_id = __esmMin((() => {
	execFileAsync$2 = promisify(execFile);
}));
//#endregion
//#region node_modules/default-browser/windows.js
async function defaultBrowser$1(_execFileAsync = execFileAsync$1) {
	const { stdout } = await _execFileAsync("reg", [
		"QUERY",
		" HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice",
		"/v",
		"ProgId"
	]);
	const match = /ProgId\s*REG_SZ\s*(?<id>\S+)/.exec(stdout);
	if (!match) throw new UnknownBrowserError(`Cannot find Windows browser in stdout: ${JSON.stringify(stdout)}`);
	const { id } = match.groups;
	const dotIndex = id.lastIndexOf(".");
	const hyphenIndex = id.lastIndexOf("-");
	const baseIdByDot = dotIndex === -1 ? void 0 : id.slice(0, dotIndex);
	const baseIdByHyphen = hyphenIndex === -1 ? void 0 : id.slice(0, hyphenIndex);
	return windowsBrowserProgIds[id] ?? windowsBrowserProgIds[baseIdByDot] ?? windowsBrowserProgIds[baseIdByHyphen] ?? {
		name: id,
		id
	};
}
var execFileAsync$1, windowsBrowserProgIds, UnknownBrowserError;
var init_windows = __esmMin((() => {
	execFileAsync$1 = promisify(execFile);
	windowsBrowserProgIds = {
		MSEdgeHTM: {
			name: "Edge",
			id: "com.microsoft.edge"
		},
		MSEdgeBHTML: {
			name: "Edge Beta",
			id: "com.microsoft.edge.beta"
		},
		MSEdgeDHTML: {
			name: "Edge Dev",
			id: "com.microsoft.edge.dev"
		},
		AppXq0fevzme2pys62n3e0fbqa7peapykr8v: {
			name: "Edge",
			id: "com.microsoft.edge.old"
		},
		ChromeHTML: {
			name: "Chrome",
			id: "com.google.chrome"
		},
		ChromeBHTML: {
			name: "Chrome Beta",
			id: "com.google.chrome.beta"
		},
		ChromeDHTML: {
			name: "Chrome Dev",
			id: "com.google.chrome.dev"
		},
		ChromiumHTM: {
			name: "Chromium",
			id: "org.chromium.Chromium"
		},
		BraveHTML: {
			name: "Brave",
			id: "com.brave.Browser"
		},
		BraveBHTML: {
			name: "Brave Beta",
			id: "com.brave.Browser.beta"
		},
		BraveDHTML: {
			name: "Brave Dev",
			id: "com.brave.Browser.dev"
		},
		BraveSSHTM: {
			name: "Brave Nightly",
			id: "com.brave.Browser.nightly"
		},
		FirefoxURL: {
			name: "Firefox",
			id: "org.mozilla.firefox"
		},
		OperaStable: {
			name: "Opera",
			id: "com.operasoftware.Opera"
		},
		VivaldiHTM: {
			name: "Vivaldi",
			id: "com.vivaldi.Vivaldi"
		},
		"IE.HTTP": {
			name: "Internet Explorer",
			id: "com.microsoft.ie"
		}
	};
	new Map(Object.entries(windowsBrowserProgIds));
	UnknownBrowserError = class extends Error {};
}));
//#endregion
//#region node_modules/default-browser/index.js
async function defaultBrowser() {
	if (process.platform === "darwin") {
		const id = await defaultBrowserId();
		return {
			name: await bundleName(id),
			id
		};
	}
	if (process.platform === "linux") {
		const { stdout } = await execFileAsync("xdg-mime", [
			"query",
			"default",
			"x-scheme-handler/http"
		]);
		const id = stdout.trim();
		return {
			name: titleize(id.replace(/.desktop$/, "").replace("-", " ")),
			id
		};
	}
	if (process.platform === "win32") return defaultBrowser$1();
	throw new Error("Only macOS, Linux, and Windows are supported");
}
var execFileAsync, titleize;
var init_default_browser = __esmMin((() => {
	init_default_browser_id();
	init_bundle_name();
	init_windows();
	execFileAsync = promisify(execFile);
	titleize = (string) => string.toLowerCase().replaceAll(/(?:^|\s|-)\S/g, (x) => x.toUpperCase());
}));
//#endregion
export { init_default_browser as n, defaultBrowser as t };
