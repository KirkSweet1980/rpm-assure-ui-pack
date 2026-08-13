import { i as __require, t as __commonJSMin } from "../../_runtime.mjs";
import { a as require_bytesEncoding, c as require_delay, i as require_sanitizer, l as require_env, n as require_commonjs$5, o as require_uuidUtils, r as require_internal$2, s as require_error } from "./core-auth+[...].mjs";
//#region node_modules/ms/index.js
var require_ms = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Helpers.
	*/
	var s = 1e3;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var w = d * 7;
	var y = d * 365.25;
	/**
	* Parse or format the given `val`.
	*
	* Options:
	*
	*  - `long` verbose formatting [false]
	*
	* @param {String|Number} val
	* @param {Object} [options]
	* @throws {Error} throw an error if val is not a non-empty string or a number
	* @return {String|Number}
	* @api public
	*/
	module.exports = function(val, options) {
		options = options || {};
		var type = typeof val;
		if (type === "string" && val.length > 0) return parse(val);
		else if (type === "number" && isFinite(val)) return options.long ? fmtLong(val) : fmtShort(val);
		throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
	};
	/**
	* Parse the given `str` and return milliseconds.
	*
	* @param {String} str
	* @return {Number}
	* @api private
	*/
	function parse(str) {
		str = String(str);
		if (str.length > 100) return;
		var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
		if (!match) return;
		var n = parseFloat(match[1]);
		switch ((match[2] || "ms").toLowerCase()) {
			case "years":
			case "year":
			case "yrs":
			case "yr":
			case "y": return n * y;
			case "weeks":
			case "week":
			case "w": return n * w;
			case "days":
			case "day":
			case "d": return n * d;
			case "hours":
			case "hour":
			case "hrs":
			case "hr":
			case "h": return n * h;
			case "minutes":
			case "minute":
			case "mins":
			case "min":
			case "m": return n * m;
			case "seconds":
			case "second":
			case "secs":
			case "sec":
			case "s": return n * s;
			case "milliseconds":
			case "millisecond":
			case "msecs":
			case "msec":
			case "ms": return n;
			default: return;
		}
	}
	/**
	* Short format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtShort(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return Math.round(ms / d) + "d";
		if (msAbs >= h) return Math.round(ms / h) + "h";
		if (msAbs >= m) return Math.round(ms / m) + "m";
		if (msAbs >= s) return Math.round(ms / s) + "s";
		return ms + "ms";
	}
	/**
	* Long format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtLong(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return plural(ms, msAbs, d, "day");
		if (msAbs >= h) return plural(ms, msAbs, h, "hour");
		if (msAbs >= m) return plural(ms, msAbs, m, "minute");
		if (msAbs >= s) return plural(ms, msAbs, s, "second");
		return ms + " ms";
	}
	/**
	* Pluralization helper.
	*/
	function plural(ms, msAbs, n, name) {
		var isPlural = msAbs >= n * 1.5;
		return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
	}
}));
//#endregion
//#region node_modules/debug/src/common.js
var require_common = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This is the common logic for both the Node.js and web browser
	* implementations of `debug()`.
	*/
	function setup(env) {
		createDebug.debug = createDebug;
		createDebug.default = createDebug;
		createDebug.coerce = coerce;
		createDebug.disable = disable;
		createDebug.enable = enable;
		createDebug.enabled = enabled;
		createDebug.humanize = require_ms();
		createDebug.destroy = destroy;
		Object.keys(env).forEach((key) => {
			createDebug[key] = env[key];
		});
		/**
		* The currently active debug mode names, and names to skip.
		*/
		createDebug.names = [];
		createDebug.skips = [];
		/**
		* Map of special "%n" handling functions, for the debug "format" argument.
		*
		* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
		*/
		createDebug.formatters = {};
		/**
		* Selects a color for a debug namespace
		* @param {String} namespace The namespace string for the debug instance to be colored
		* @return {Number|String} An ANSI color code for the given namespace
		* @api private
		*/
		function selectColor(namespace) {
			let hash = 0;
			for (let i = 0; i < namespace.length; i++) {
				hash = (hash << 5) - hash + namespace.charCodeAt(i);
				hash |= 0;
			}
			return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
		}
		createDebug.selectColor = selectColor;
		/**
		* Create a debugger with the given `namespace`.
		*
		* @param {String} namespace
		* @return {Function}
		* @api public
		*/
		function createDebug(namespace) {
			let prevTime;
			let enableOverride = null;
			let namespacesCache;
			let enabledCache;
			function debug(...args) {
				if (!debug.enabled) return;
				const self = debug;
				const curr = Number(/* @__PURE__ */ new Date());
				self.diff = curr - (prevTime || curr);
				self.prev = prevTime;
				self.curr = curr;
				prevTime = curr;
				args[0] = createDebug.coerce(args[0]);
				if (typeof args[0] !== "string") args.unshift("%O");
				let index = 0;
				args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
					if (match === "%%") return "%";
					index++;
					const formatter = createDebug.formatters[format];
					if (typeof formatter === "function") {
						const val = args[index];
						match = formatter.call(self, val);
						args.splice(index, 1);
						index--;
					}
					return match;
				});
				createDebug.formatArgs.call(self, args);
				(self.log || createDebug.log).apply(self, args);
			}
			debug.namespace = namespace;
			debug.useColors = createDebug.useColors();
			debug.color = createDebug.selectColor(namespace);
			debug.extend = extend;
			debug.destroy = createDebug.destroy;
			Object.defineProperty(debug, "enabled", {
				enumerable: true,
				configurable: false,
				get: () => {
					if (enableOverride !== null) return enableOverride;
					if (namespacesCache !== createDebug.namespaces) {
						namespacesCache = createDebug.namespaces;
						enabledCache = createDebug.enabled(namespace);
					}
					return enabledCache;
				},
				set: (v) => {
					enableOverride = v;
				}
			});
			if (typeof createDebug.init === "function") createDebug.init(debug);
			return debug;
		}
		function extend(namespace, delimiter) {
			const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
			newDebug.log = this.log;
			return newDebug;
		}
		/**
		* Enables a debug mode by namespaces. This can include modes
		* separated by a colon and wildcards.
		*
		* @param {String} namespaces
		* @api public
		*/
		function enable(namespaces) {
			createDebug.save(namespaces);
			createDebug.namespaces = namespaces;
			createDebug.names = [];
			createDebug.skips = [];
			const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
			for (const ns of split) if (ns[0] === "-") createDebug.skips.push(ns.slice(1));
			else createDebug.names.push(ns);
		}
		/**
		* Checks if the given string matches a namespace template, honoring
		* asterisks as wildcards.
		*
		* @param {String} search
		* @param {String} template
		* @return {Boolean}
		*/
		function matchesTemplate(search, template) {
			let searchIndex = 0;
			let templateIndex = 0;
			let starIndex = -1;
			let matchIndex = 0;
			while (searchIndex < search.length) if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) if (template[templateIndex] === "*") {
				starIndex = templateIndex;
				matchIndex = searchIndex;
				templateIndex++;
			} else {
				searchIndex++;
				templateIndex++;
			}
			else if (starIndex !== -1) {
				templateIndex = starIndex + 1;
				matchIndex++;
				searchIndex = matchIndex;
			} else return false;
			while (templateIndex < template.length && template[templateIndex] === "*") templateIndex++;
			return templateIndex === template.length;
		}
		/**
		* Disable debug output.
		*
		* @return {String} namespaces
		* @api public
		*/
		function disable() {
			const namespaces = [...createDebug.names, ...createDebug.skips.map((namespace) => "-" + namespace)].join(",");
			createDebug.enable("");
			return namespaces;
		}
		/**
		* Returns true if the given mode name is enabled, false otherwise.
		*
		* @param {String} name
		* @return {Boolean}
		* @api public
		*/
		function enabled(name) {
			for (const skip of createDebug.skips) if (matchesTemplate(name, skip)) return false;
			for (const ns of createDebug.names) if (matchesTemplate(name, ns)) return true;
			return false;
		}
		/**
		* Coerce `val`.
		*
		* @param {Mixed} val
		* @return {Mixed}
		* @api private
		*/
		function coerce(val) {
			if (val instanceof Error) return val.stack || val.message;
			return val;
		}
		/**
		* XXX DO NOT USE. This is a temporary stub function.
		* XXX It WILL be removed in the next major release.
		*/
		function destroy() {
			console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
		}
		createDebug.enable(createDebug.load());
		return createDebug;
	}
	module.exports = setup;
}));
//#endregion
//#region node_modules/debug/src/browser.js
var require_browser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This is the web browser implementation of `debug()`.
	*/
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = localstorage();
	exports.destroy = (() => {
		let warned = false;
		return () => {
			if (!warned) {
				warned = true;
				console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
			}
		};
	})();
	/**
	* Colors.
	*/
	exports.colors = [
		"#0000CC",
		"#0000FF",
		"#0033CC",
		"#0033FF",
		"#0066CC",
		"#0066FF",
		"#0099CC",
		"#0099FF",
		"#00CC00",
		"#00CC33",
		"#00CC66",
		"#00CC99",
		"#00CCCC",
		"#00CCFF",
		"#3300CC",
		"#3300FF",
		"#3333CC",
		"#3333FF",
		"#3366CC",
		"#3366FF",
		"#3399CC",
		"#3399FF",
		"#33CC00",
		"#33CC33",
		"#33CC66",
		"#33CC99",
		"#33CCCC",
		"#33CCFF",
		"#6600CC",
		"#6600FF",
		"#6633CC",
		"#6633FF",
		"#66CC00",
		"#66CC33",
		"#9900CC",
		"#9900FF",
		"#9933CC",
		"#9933FF",
		"#99CC00",
		"#99CC33",
		"#CC0000",
		"#CC0033",
		"#CC0066",
		"#CC0099",
		"#CC00CC",
		"#CC00FF",
		"#CC3300",
		"#CC3333",
		"#CC3366",
		"#CC3399",
		"#CC33CC",
		"#CC33FF",
		"#CC6600",
		"#CC6633",
		"#CC9900",
		"#CC9933",
		"#CCCC00",
		"#CCCC33",
		"#FF0000",
		"#FF0033",
		"#FF0066",
		"#FF0099",
		"#FF00CC",
		"#FF00FF",
		"#FF3300",
		"#FF3333",
		"#FF3366",
		"#FF3399",
		"#FF33CC",
		"#FF33FF",
		"#FF6600",
		"#FF6633",
		"#FF9900",
		"#FF9933",
		"#FFCC00",
		"#FFCC33"
	];
	/**
	* Currently only WebKit-based Web Inspectors, Firefox >= v31,
	* and the Firebug extension (any Firefox version) are known
	* to support "%c" CSS customizations.
	*
	* TODO: add a `localStorage` variable to explicitly enable/disable colors
	*/
	function useColors() {
		if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) return true;
		if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) return false;
		let m;
		return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
	}
	/**
	* Colorize log arguments if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
		if (!this.useColors) return;
		const c = "color: " + this.color;
		args.splice(1, 0, c, "color: inherit");
		let index = 0;
		let lastC = 0;
		args[0].replace(/%[a-zA-Z%]/g, (match) => {
			if (match === "%%") return;
			index++;
			if (match === "%c") lastC = index;
		});
		args.splice(lastC, 0, c);
	}
	/**
	* Invokes `console.debug()` when available.
	* No-op when `console.debug` is not a "function".
	* If `console.debug` is not available, falls back
	* to `console.log`.
	*
	* @api public
	*/
	exports.log = console.debug || console.log || (() => {});
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		try {
			if (namespaces) exports.storage.setItem("debug", namespaces);
			else exports.storage.removeItem("debug");
		} catch (error) {}
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		let r;
		try {
			r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
		} catch (error) {}
		if (!r && typeof process !== "undefined" && "env" in process) r = process.env.DEBUG;
		return r;
	}
	/**
	* Localstorage attempts to return the localstorage.
	*
	* This is necessary because safari throws
	* when a user disables cookies/localstorage
	* and you attempt to access it.
	*
	* @return {LocalStorage}
	* @api private
	*/
	function localstorage() {
		try {
			return localStorage;
		} catch (error) {}
	}
	module.exports = require_common()(exports);
	var { formatters } = module.exports;
	/**
	* Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	*/
	formatters.j = function(v) {
		try {
			return JSON.stringify(v);
		} catch (error) {
			return "[UnexpectedJSONParseError]: " + error.message;
		}
	};
}));
//#endregion
//#region node_modules/has-flag/index.js
var require_has_flag = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = (flag, argv = process.argv) => {
		const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
		const position = argv.indexOf(prefix + flag);
		const terminatorPosition = argv.indexOf("--");
		return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
	};
}));
//#endregion
//#region node_modules/supports-color/index.js
var require_supports_color = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var os = __require("os");
	var tty$1 = __require("tty");
	var hasFlag = require_has_flag();
	var { env } = process;
	var forceColor;
	if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) forceColor = 0;
	else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) forceColor = 1;
	if ("FORCE_COLOR" in env) if (env.FORCE_COLOR === "true") forceColor = 1;
	else if (env.FORCE_COLOR === "false") forceColor = 0;
	else forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
	function translateLevel(level) {
		if (level === 0) return false;
		return {
			level,
			hasBasic: true,
			has256: level >= 2,
			has16m: level >= 3
		};
	}
	function supportsColor(haveStream, streamIsTTY) {
		if (forceColor === 0) return 0;
		if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) return 3;
		if (hasFlag("color=256")) return 2;
		if (haveStream && !streamIsTTY && forceColor === void 0) return 0;
		const min = forceColor || 0;
		if (env.TERM === "dumb") return min;
		if (process.platform === "win32") {
			const osRelease = os.release().split(".");
			if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) return Number(osRelease[2]) >= 14931 ? 3 : 2;
			return 1;
		}
		if ("CI" in env) {
			if ([
				"TRAVIS",
				"CIRCLECI",
				"APPVEYOR",
				"GITLAB_CI",
				"GITHUB_ACTIONS",
				"BUILDKITE"
			].some((sign) => sign in env) || env.CI_NAME === "codeship") return 1;
			return min;
		}
		if ("TEAMCITY_VERSION" in env) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
		if (env.COLORTERM === "truecolor") return 3;
		if ("TERM_PROGRAM" in env) {
			const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
			switch (env.TERM_PROGRAM) {
				case "iTerm.app": return version >= 3 ? 3 : 2;
				case "Apple_Terminal": return 2;
			}
		}
		if (/-256(color)?$/i.test(env.TERM)) return 2;
		if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) return 1;
		if ("COLORTERM" in env) return 1;
		return min;
	}
	function getSupportLevel(stream) {
		return translateLevel(supportsColor(stream, stream && stream.isTTY));
	}
	module.exports = {
		supportsColor: getSupportLevel,
		stdout: translateLevel(supportsColor(true, tty$1.isatty(1))),
		stderr: translateLevel(supportsColor(true, tty$1.isatty(2)))
	};
}));
//#endregion
//#region node_modules/debug/src/node.js
var require_node = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Module dependencies.
	*/
	var tty = __require("tty");
	var util = __require("util");
	/**
	* This is the Node.js implementation of `debug()`.
	*/
	exports.init = init;
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.destroy = util.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
	/**
	* Colors.
	*/
	exports.colors = [
		6,
		2,
		3,
		4,
		5,
		1
	];
	try {
		const supportsColor = require_supports_color();
		if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) exports.colors = [
			20,
			21,
			26,
			27,
			32,
			33,
			38,
			39,
			40,
			41,
			42,
			43,
			44,
			45,
			56,
			57,
			62,
			63,
			68,
			69,
			74,
			75,
			76,
			77,
			78,
			79,
			80,
			81,
			92,
			93,
			98,
			99,
			112,
			113,
			128,
			129,
			134,
			135,
			148,
			149,
			160,
			161,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			171,
			172,
			173,
			178,
			179,
			184,
			185,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			203,
			204,
			205,
			206,
			207,
			208,
			209,
			214,
			215,
			220,
			221
		];
	} catch (error) {}
	/**
	* Build up the default `inspectOpts` object from the environment variables.
	*
	*   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
	*/
	exports.inspectOpts = Object.keys(process.env).filter((key) => {
		return /^debug_/i.test(key);
	}).reduce((obj, key) => {
		const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
			return k.toUpperCase();
		});
		let val = process.env[key];
		if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
		else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
		else if (val === "null") val = null;
		else val = Number(val);
		obj[prop] = val;
		return obj;
	}, {});
	/**
	* Is stdout a TTY? Colored output is enabled when `true`.
	*/
	function useColors() {
		return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
	}
	/**
	* Adds ANSI color escape codes if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		const { namespace: name, useColors } = this;
		if (useColors) {
			const c = this.color;
			const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
			const prefix = `  ${colorCode};1m${name} \u001B[0m`;
			args[0] = prefix + args[0].split("\n").join("\n" + prefix);
			args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
		} else args[0] = getDate() + name + " " + args[0];
	}
	function getDate() {
		if (exports.inspectOpts.hideDate) return "";
		return (/* @__PURE__ */ new Date()).toISOString() + " ";
	}
	/**
	* Invokes `util.formatWithOptions()` with the specified arguments and writes to stderr.
	*/
	function log(...args) {
		return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
	}
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		if (namespaces) process.env.DEBUG = namespaces;
		else delete process.env.DEBUG;
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		return process.env.DEBUG;
	}
	/**
	* Init logic for `debug` instances.
	*
	* Create a new `inspectOpts` object in case `useColors` is set
	* differently for a particular `debug` instance.
	*/
	function init(debug) {
		debug.inspectOpts = {};
		const keys = Object.keys(exports.inspectOpts);
		for (let i = 0; i < keys.length; i++) debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
	}
	module.exports = require_common()(exports);
	var { formatters } = module.exports;
	/**
	* Map %o to `util.inspect()`, all on a single line.
	*/
	formatters.o = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
	};
	/**
	* Map %O to `util.inspect()`, allowing multiple lines if needed.
	*/
	formatters.O = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts);
	};
}));
//#endregion
//#region node_modules/debug/src/index.js
var require_src = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Detect Electron renderer / nwjs process, which is node, but we should
	* treat as a browser.
	*/
	if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) module.exports = require_browser();
	else module.exports = require_node();
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/logger/log.js
var require_log$3 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var log_exports = {};
	__export(log_exports, { log: () => log });
	module.exports = __toCommonJS(log_exports);
	var import_node_os$2 = __require("node:os");
	var import_node_util = __toESM(__require("node:util"));
	var import_node_process$2 = __toESM(__require("node:process"));
	function log(message, ...args) {
		import_node_process$2.default.stderr.write(`${import_node_util.default.format(message, ...args)}${import_node_os$2.EOL}`);
	}
	0 && (module.exports = { log });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/logger/debug.js
var require_debug = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var debug_exports = {};
	__export(debug_exports, { default: () => debug_default });
	module.exports = __toCommonJS(debug_exports);
	var import_log = require_log$3();
	var debugEnvVariable = (0, require_env().getEnvironmentVariable)("DEBUG");
	var enabledString;
	var enabledNamespaces = [];
	var skippedNamespaces = [];
	var debuggers = [];
	if (debugEnvVariable) enable(debugEnvVariable);
	var debugObj = Object.assign((namespace) => {
		return createDebugger(namespace);
	}, {
		enable,
		enabled,
		disable,
		log: import_log.log
	});
	function enable(namespaces) {
		enabledString = namespaces;
		enabledNamespaces = [];
		skippedNamespaces = [];
		const namespaceList = namespaces.split(",").map((ns) => ns.trim());
		for (const ns of namespaceList) if (ns.startsWith("-")) skippedNamespaces.push(ns.substring(1));
		else enabledNamespaces.push(ns);
		for (const instance of debuggers) instance.enabled = enabled(instance.namespace);
	}
	function enabled(namespace) {
		if (namespace.endsWith("*")) return true;
		for (const skipped of skippedNamespaces) if (namespaceMatches(namespace, skipped)) return false;
		for (const enabledNamespace of enabledNamespaces) if (namespaceMatches(namespace, enabledNamespace)) return true;
		return false;
	}
	function namespaceMatches(namespace, patternToMatch) {
		if (patternToMatch.indexOf("*") === -1) return namespace === patternToMatch;
		let pattern = patternToMatch;
		if (patternToMatch.indexOf("**") !== -1) {
			const patternParts = [];
			let lastCharacter = "";
			for (const character of patternToMatch) if (character === "*" && lastCharacter === "*") continue;
			else {
				lastCharacter = character;
				patternParts.push(character);
			}
			pattern = patternParts.join("");
		}
		let namespaceIndex = 0;
		let patternIndex = 0;
		const patternLength = pattern.length;
		const namespaceLength = namespace.length;
		let lastWildcard = -1;
		let lastWildcardNamespace = -1;
		while (namespaceIndex < namespaceLength && patternIndex < patternLength) if (pattern[patternIndex] === "*") {
			lastWildcard = patternIndex;
			patternIndex++;
			if (patternIndex === patternLength) return true;
			while (namespace[namespaceIndex] !== pattern[patternIndex]) {
				namespaceIndex++;
				if (namespaceIndex === namespaceLength) return false;
			}
			lastWildcardNamespace = namespaceIndex;
			namespaceIndex++;
			patternIndex++;
			continue;
		} else if (pattern[patternIndex] === namespace[namespaceIndex]) {
			patternIndex++;
			namespaceIndex++;
		} else if (lastWildcard >= 0) {
			patternIndex = lastWildcard + 1;
			namespaceIndex = lastWildcardNamespace + 1;
			if (namespaceIndex === namespaceLength) return false;
			while (namespace[namespaceIndex] !== pattern[patternIndex]) {
				namespaceIndex++;
				if (namespaceIndex === namespaceLength) return false;
			}
			lastWildcardNamespace = namespaceIndex;
			namespaceIndex++;
			patternIndex++;
			continue;
		} else return false;
		const namespaceDone = namespaceIndex === namespace.length;
		const patternDone = patternIndex === pattern.length;
		const trailingWildCard = patternIndex === pattern.length - 1 && pattern[patternIndex] === "*";
		return namespaceDone && (patternDone || trailingWildCard);
	}
	function disable() {
		const result = enabledString || "";
		enable("");
		return result;
	}
	function createDebugger(namespace) {
		const newDebugger = Object.assign(debug, {
			enabled: enabled(namespace),
			destroy,
			log: debugObj.log,
			namespace,
			extend
		});
		function debug(...args) {
			if (!newDebugger.enabled) return;
			if (args.length > 0) args[0] = `${namespace} ${args[0]}`;
			newDebugger.log(...args);
		}
		debuggers.push(newDebugger);
		return newDebugger;
	}
	function destroy() {
		const index = debuggers.indexOf(this);
		if (index >= 0) {
			debuggers.splice(index, 1);
			return true;
		}
		return false;
	}
	function extend(namespace) {
		const newDebugger = createDebugger(`${this.namespace}:${namespace}`);
		newDebugger.log = this.log;
		return newDebugger;
	}
	var debug_default = debugObj;
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/logger/logger.js
var require_logger = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var logger_exports = {};
	__export(logger_exports, {
		TypeSpecRuntimeLogger: () => TypeSpecRuntimeLogger,
		createClientLogger: () => createClientLogger,
		createLoggerContext: () => createLoggerContext,
		getLogLevel: () => getLogLevel,
		setLogLevel: () => setLogLevel
	});
	module.exports = __toCommonJS(logger_exports);
	var import_debug = __toESM(require_debug());
	var import_env = require_env();
	var TYPESPEC_RUNTIME_LOG_LEVELS = [
		"verbose",
		"info",
		"warning",
		"error"
	];
	var levelMap = {
		verbose: 400,
		info: 300,
		warning: 200,
		error: 100
	};
	function patchLogMethod(parent, child) {
		child.log = (...args) => {
			parent.log(...args);
		};
	}
	function isTypeSpecRuntimeLogLevel(level) {
		return TYPESPEC_RUNTIME_LOG_LEVELS.includes(level);
	}
	function createLoggerContext(options) {
		const registeredLoggers = /* @__PURE__ */ new Set();
		const logLevelFromEnv = (0, import_env.getEnvironmentVariable)(options.logLevelEnvVarName);
		let logLevel;
		const clientLogger = (0, import_debug.default)(options.namespace);
		clientLogger.log = (...args) => {
			import_debug.default.log(...args);
		};
		function contextSetLogLevel(level) {
			if (level && !isTypeSpecRuntimeLogLevel(level)) throw new Error(`Unknown log level '${level}'. Acceptable values: ${TYPESPEC_RUNTIME_LOG_LEVELS.join(",")}`);
			logLevel = level;
			const enabledNamespaces = [];
			for (const logger of registeredLoggers) if (shouldEnable(logger)) enabledNamespaces.push(logger.namespace);
			import_debug.default.enable(enabledNamespaces.join(","));
		}
		if (logLevelFromEnv) if (isTypeSpecRuntimeLogLevel(logLevelFromEnv)) contextSetLogLevel(logLevelFromEnv);
		else console.error(`${options.logLevelEnvVarName} set to unknown log level '${logLevelFromEnv}'; logging is not enabled. Acceptable values: ${TYPESPEC_RUNTIME_LOG_LEVELS.join(", ")}.`);
		function shouldEnable(logger) {
			return Boolean(logLevel && levelMap[logger.level] <= levelMap[logLevel]);
		}
		function createLogger(parent, level) {
			const logger = Object.assign(parent.extend(level), { level });
			patchLogMethod(parent, logger);
			if (shouldEnable(logger)) {
				const enabledNamespaces = import_debug.default.disable();
				import_debug.default.enable(enabledNamespaces + "," + logger.namespace);
			}
			registeredLoggers.add(logger);
			return logger;
		}
		function contextGetLogLevel() {
			return logLevel;
		}
		function contextCreateClientLogger(namespace) {
			const clientRootLogger = clientLogger.extend(namespace);
			patchLogMethod(clientLogger, clientRootLogger);
			return {
				error: createLogger(clientRootLogger, "error"),
				warning: createLogger(clientRootLogger, "warning"),
				info: createLogger(clientRootLogger, "info"),
				verbose: createLogger(clientRootLogger, "verbose")
			};
		}
		return {
			setLogLevel: contextSetLogLevel,
			getLogLevel: contextGetLogLevel,
			createClientLogger: contextCreateClientLogger,
			logger: clientLogger
		};
	}
	var context = createLoggerContext({
		logLevelEnvVarName: "TYPESPEC_RUNTIME_LOG_LEVEL",
		namespace: "typeSpecRuntime"
	});
	var TypeSpecRuntimeLogger = context.logger;
	function setLogLevel(logLevel) {
		context.setLogLevel(logLevel);
	}
	function getLogLevel() {
		return context.getLogLevel();
	}
	function createClientLogger(namespace) {
		return context.createClientLogger(namespace);
	}
	0 && (module.exports = {
		TypeSpecRuntimeLogger,
		createClientLogger,
		createLoggerContext,
		getLogLevel,
		setLogLevel
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/logger/internal.js
var require_internal$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var internal_exports = {};
	__export(internal_exports, { createLoggerContext: () => import_logger.createLoggerContext });
	module.exports = __toCommonJS(internal_exports);
	var import_logger = require_logger();
	0 && (module.exports = { createLoggerContext });
}));
//#endregion
//#region node_modules/@azure/logger/dist/commonjs/index.js
var require_commonjs$4 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var src_exports = {};
	__export(src_exports, {
		AzureLogger: () => AzureLogger,
		createClientLogger: () => createClientLogger,
		getLogLevel: () => getLogLevel,
		setLogLevel: () => setLogLevel
	});
	module.exports = __toCommonJS(src_exports);
	var context = (0, require_internal$1().createLoggerContext)({
		logLevelEnvVarName: "AZURE_LOG_LEVEL",
		namespace: "azure"
	});
	var AzureLogger = context.logger;
	function setLogLevel(level) {
		context.setLogLevel(level);
	}
	function getLogLevel() {
		return context.getLogLevel();
	}
	function createClientLogger(namespace) {
		return context.createClientLogger(namespace);
	}
	0 && (module.exports = {
		AzureLogger,
		createClientLogger,
		getLogLevel,
		setLogLevel
	});
}));
//#endregion
//#region node_modules/@azure/core-tracing/dist/commonjs/tracingContext.js
var require_tracingContext = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.TracingContextImpl = exports.knownContextKeys = void 0;
	exports.createTracingContext = createTracingContext;
	/** @internal */
	exports.knownContextKeys = {
		span: Symbol.for("@azure/core-tracing span"),
		namespace: Symbol.for("@azure/core-tracing namespace")
	};
	/**
	* Creates a new {@link TracingContext} with the given options.
	* @param options - A set of known keys that may be set on the context.
	* @returns A new {@link TracingContext} with the given options.
	*
	* @internal
	*/
	function createTracingContext(options = {}) {
		let context = new TracingContextImpl(options.parentContext);
		if (options.span) context = context.setValue(exports.knownContextKeys.span, options.span);
		if (options.namespace) context = context.setValue(exports.knownContextKeys.namespace, options.namespace);
		return context;
	}
	/** @internal */
	var TracingContextImpl = class TracingContextImpl {
		_contextMap;
		constructor(initialContext) {
			this._contextMap = initialContext instanceof TracingContextImpl ? new Map(initialContext._contextMap) : /* @__PURE__ */ new Map();
		}
		setValue(key, value) {
			const newContext = new TracingContextImpl(this);
			newContext._contextMap.set(key, value);
			return newContext;
		}
		getValue(key) {
			return this._contextMap.get(key);
		}
		deleteValue(key) {
			const newContext = new TracingContextImpl(this);
			newContext._contextMap.delete(key);
			return newContext;
		}
	};
	exports.TracingContextImpl = TracingContextImpl;
}));
//#endregion
//#region node_modules/@azure/core-tracing/dist/commonjs/state-cjs.js
var require_state_cjs$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.state = void 0;
	/**
	* @internal
	*
	* Holds the singleton instrumenter, to be shared across CJS and ESM imports.
	*/
	exports.state = { instrumenterImplementation: void 0 };
}));
//#endregion
//#region node_modules/@azure/core-tracing/dist/commonjs/instrumenter.js
var require_instrumenter = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.createDefaultTracingSpan = createDefaultTracingSpan;
	exports.createDefaultInstrumenter = createDefaultInstrumenter;
	exports.useInstrumenter = useInstrumenter;
	exports.getInstrumenter = getInstrumenter;
	var tracingContext_js_1 = require_tracingContext();
	var state_1 = require_state_cjs$1();
	function createDefaultTracingSpan() {
		return {
			end: () => {},
			isRecording: () => false,
			recordException: () => {},
			setAttribute: () => {},
			setStatus: () => {},
			addEvent: () => {}
		};
	}
	function createDefaultInstrumenter() {
		return {
			createRequestHeaders: () => {
				return {};
			},
			parseTraceparentHeader: () => {},
			startSpan: (_name, spanOptions) => {
				return {
					span: createDefaultTracingSpan(),
					tracingContext: (0, tracingContext_js_1.createTracingContext)({ parentContext: spanOptions.tracingContext })
				};
			},
			withContext(_context, callback, ...callbackArgs) {
				return callback(...callbackArgs);
			}
		};
	}
	/**
	* Extends the Azure SDK with support for a given instrumenter implementation.
	*
	* @param instrumenter - The instrumenter implementation to use.
	*/
	function useInstrumenter(instrumenter) {
		state_1.state.instrumenterImplementation = instrumenter;
	}
	/**
	* Gets the currently set instrumenter, a No-Op instrumenter by default.
	*
	* @returns The currently set instrumenter
	*/
	function getInstrumenter() {
		if (!state_1.state.instrumenterImplementation) state_1.state.instrumenterImplementation = createDefaultInstrumenter();
		return state_1.state.instrumenterImplementation;
	}
}));
//#endregion
//#region node_modules/@azure/core-tracing/dist/commonjs/tracingClient.js
var require_tracingClient = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.createTracingClient = createTracingClient;
	var instrumenter_js_1 = require_instrumenter();
	var tracingContext_js_1 = require_tracingContext();
	/**
	* Creates a new tracing client.
	*
	* @param options - Options used to configure the tracing client.
	* @returns - An instance of {@link TracingClient}.
	*/
	function createTracingClient(options) {
		const { namespace, packageName, packageVersion } = options;
		function startSpan(name, operationOptions, spanOptions) {
			const startSpanResult = (0, instrumenter_js_1.getInstrumenter)().startSpan(name, {
				...spanOptions,
				packageName,
				packageVersion,
				tracingContext: operationOptions?.tracingOptions?.tracingContext
			});
			let tracingContext = startSpanResult.tracingContext;
			const span = startSpanResult.span;
			if (!tracingContext.getValue(tracingContext_js_1.knownContextKeys.namespace)) tracingContext = tracingContext.setValue(tracingContext_js_1.knownContextKeys.namespace, namespace);
			span.setAttribute("az.namespace", tracingContext.getValue(tracingContext_js_1.knownContextKeys.namespace));
			return {
				span,
				updatedOptions: Object.assign({}, operationOptions, { tracingOptions: {
					...operationOptions?.tracingOptions,
					tracingContext
				} })
			};
		}
		async function withSpan(name, operationOptions, callback, spanOptions) {
			const { span, updatedOptions } = startSpan(name, operationOptions, spanOptions);
			try {
				const result = await withContext(updatedOptions.tracingOptions.tracingContext, () => callback(updatedOptions, span));
				span.setStatus({ status: "success" });
				return result;
			} catch (err) {
				span.setStatus({
					status: "error",
					error: err
				});
				throw err;
			} finally {
				span.end();
			}
		}
		function withContext(context, callback, ...callbackArgs) {
			return (0, instrumenter_js_1.getInstrumenter)().withContext(context, callback, ...callbackArgs);
		}
		/**
		* Parses a traceparent header value into a span identifier.
		*
		* @param traceparentHeader - The traceparent header to parse.
		* @returns An implementation-specific identifier for the span.
		*/
		function parseTraceparentHeader(traceparentHeader) {
			return (0, instrumenter_js_1.getInstrumenter)().parseTraceparentHeader(traceparentHeader);
		}
		/**
		* Creates a set of request headers to propagate tracing information to a backend.
		*
		* @param tracingContext - The context containing the span to serialize.
		* @returns The set of headers to add to a request.
		*/
		function createRequestHeaders(tracingContext) {
			return (0, instrumenter_js_1.getInstrumenter)().createRequestHeaders(tracingContext);
		}
		return {
			startSpan,
			withSpan,
			withContext,
			parseTraceparentHeader,
			createRequestHeaders
		};
	}
}));
//#endregion
//#region node_modules/@azure/core-tracing/dist/commonjs/index.js
var require_commonjs$3 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.createTracingClient = exports.useInstrumenter = void 0;
	var instrumenter_js_1 = require_instrumenter();
	Object.defineProperty(exports, "useInstrumenter", {
		enumerable: true,
		get: function() {
			return instrumenter_js_1.useInstrumenter;
		}
	});
	var tracingClient_js_1 = require_tracingClient();
	Object.defineProperty(exports, "createTracingClient", {
		enumerable: true,
		get: function() {
			return tracingClient_js_1.createTracingClient;
		}
	});
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/base64.js
var require_base64 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.encodeString = encodeString;
	exports.encodeByteArray = encodeByteArray;
	exports.decodeString = decodeString;
	exports.decodeStringToString = decodeStringToString;
	var core_util_1 = require_commonjs$5();
	/**
	* Encodes a string in base64 format.
	* @param value - the string to encode
	* @internal
	*/
	function encodeString(value) {
		return (0, core_util_1.uint8ArrayToString)((0, core_util_1.stringToUint8Array)(value, "utf-8"), "base64");
	}
	/**
	* Encodes a byte array in base64 format.
	* @param value - the Uint8Array to encode
	* @internal
	*/
	function encodeByteArray(value) {
		return (0, core_util_1.uint8ArrayToString)(value, "base64");
	}
	/**
	* Decodes a base64 string into a byte array.
	* @param value - the base64 string to decode
	* @internal
	*/
	function decodeString(value) {
		return (0, core_util_1.stringToUint8Array)(value, "base64");
	}
	/**
	* Decodes a base64 string into a string.
	* @param value - the base64 string to decode
	* @internal
	*/
	function decodeStringToString(value) {
		return (0, core_util_1.uint8ArrayToString)((0, core_util_1.stringToUint8Array)(value, "base64"), "utf-8");
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/interfaces.js
var require_interfaces = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.XML_CHARKEY = exports.XML_ATTRKEY = void 0;
	/**
	* Default key used to access the XML attributes.
	*/
	exports.XML_ATTRKEY = "$";
	/**
	* Default key used to access the XML value content.
	*/
	exports.XML_CHARKEY = "_";
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isPrimitiveBody = isPrimitiveBody;
	exports.isDuration = isDuration;
	exports.isValidUuid = isValidUuid;
	exports.flattenResponse = flattenResponse;
	/**
	* A type guard for a primitive response body.
	* @param value - Value to test
	*
	* @internal
	*/
	function isPrimitiveBody(value, mapperTypeName) {
		return mapperTypeName !== "Composite" && mapperTypeName !== "Dictionary" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || mapperTypeName?.match(/^(Date|DateTime|DateTimeRfc1123|UnixTime|ByteArray|Base64Url)$/i) !== null || value === void 0 || value === null);
	}
	var validateISODuration = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;
	/**
	* Returns true if the given string is in ISO 8601 format.
	* @param value - The value to be validated for ISO 8601 duration format.
	* @internal
	*/
	function isDuration(value) {
		return validateISODuration.test(value);
	}
	var validUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
	/**
	* Returns true if the provided uuid is valid.
	*
	* @param uuid - The uuid that needs to be validated.
	*
	* @internal
	*/
	function isValidUuid(uuid) {
		return validUuidRegex.test(uuid);
	}
	/**
	* Maps the response as follows:
	* - wraps the response body if needed (typically if its type is primitive).
	* - returns null if the combination of the headers and the body is empty.
	* - otherwise, returns the combination of the headers and the body.
	*
	* @param responseObject - a representation of the parsed response
	* @returns the response that will be returned to the user which can be null and/or wrapped
	*
	* @internal
	*/
	function handleNullableResponseAndWrappableBody(responseObject) {
		const combinedHeadersAndBody = {
			...responseObject.headers,
			...responseObject.body
		};
		if (responseObject.hasNullableType && Object.getOwnPropertyNames(combinedHeadersAndBody).length === 0) return responseObject.shouldWrapBody ? { body: null } : null;
		else return responseObject.shouldWrapBody ? {
			...responseObject.headers,
			body: responseObject.body
		} : combinedHeadersAndBody;
	}
	/**
	* Take a `FullOperationResponse` and turn it into a flat
	* response object to hand back to the consumer.
	* @param fullResponse - The processed response from the operation request
	* @param responseSpec - The response map from the OperationSpec
	*
	* @internal
	*/
	function flattenResponse(fullResponse, responseSpec) {
		const parsedHeaders = fullResponse.parsedHeaders;
		if (fullResponse.request.method === "HEAD") return {
			...parsedHeaders,
			body: fullResponse.parsedBody
		};
		const bodyMapper = responseSpec && responseSpec.bodyMapper;
		const isNullable = Boolean(bodyMapper?.nullable);
		const expectedBodyTypeName = bodyMapper?.type.name;
		/** If the body is asked for, we look at the expected body type to handle it */
		if (expectedBodyTypeName === "Stream") return {
			...parsedHeaders,
			blobBody: fullResponse.blobBody,
			readableStreamBody: fullResponse.readableStreamBody
		};
		const modelProperties = expectedBodyTypeName === "Composite" && bodyMapper.type.modelProperties || {};
		const isPageableResponse = Object.keys(modelProperties).some((k) => modelProperties[k].serializedName === "");
		if (expectedBodyTypeName === "Sequence" || isPageableResponse) {
			const arrayResponse = fullResponse.parsedBody ?? [];
			for (const key of Object.keys(modelProperties)) if (modelProperties[key].serializedName) arrayResponse[key] = fullResponse.parsedBody?.[key];
			if (parsedHeaders) for (const key of Object.keys(parsedHeaders)) arrayResponse[key] = parsedHeaders[key];
			return isNullable && !fullResponse.parsedBody && !parsedHeaders && Object.getOwnPropertyNames(modelProperties).length === 0 ? null : arrayResponse;
		}
		return handleNullableResponseAndWrappableBody({
			body: fullResponse.parsedBody,
			headers: parsedHeaders,
			hasNullableType: isNullable,
			shouldWrapBody: isPrimitiveBody(fullResponse.parsedBody, expectedBodyTypeName)
		});
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/serializer.js
var require_serializer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.MapperTypeNames = void 0;
	exports.createSerializer = createSerializer;
	var base64 = __require("tslib").__importStar(require_base64());
	var interfaces_js_1 = require_interfaces();
	var utils_js_1 = require_utils();
	var SerializerImpl = class {
		modelMappers;
		isXML;
		constructor(modelMappers = {}, isXML = false) {
			this.modelMappers = modelMappers;
			this.isXML = isXML;
		}
		/**
		* @deprecated Removing the constraints validation on client side.
		*/
		validateConstraints(mapper, value, objectName) {
			const failValidation = (constraintName, constraintValue) => {
				throw new Error(`"${objectName}" with value "${value}" should satisfy the constraint "${constraintName}": ${constraintValue}.`);
			};
			if (mapper.constraints && value !== void 0 && value !== null) {
				const { ExclusiveMaximum, ExclusiveMinimum, InclusiveMaximum, InclusiveMinimum, MaxItems, MaxLength, MinItems, MinLength, MultipleOf, Pattern, UniqueItems } = mapper.constraints;
				if (ExclusiveMaximum !== void 0 && value >= ExclusiveMaximum) failValidation("ExclusiveMaximum", ExclusiveMaximum);
				if (ExclusiveMinimum !== void 0 && value <= ExclusiveMinimum) failValidation("ExclusiveMinimum", ExclusiveMinimum);
				if (InclusiveMaximum !== void 0 && value > InclusiveMaximum) failValidation("InclusiveMaximum", InclusiveMaximum);
				if (InclusiveMinimum !== void 0 && value < InclusiveMinimum) failValidation("InclusiveMinimum", InclusiveMinimum);
				if (MaxItems !== void 0 && value.length > MaxItems) failValidation("MaxItems", MaxItems);
				if (MaxLength !== void 0 && value.length > MaxLength) failValidation("MaxLength", MaxLength);
				if (MinItems !== void 0 && value.length < MinItems) failValidation("MinItems", MinItems);
				if (MinLength !== void 0 && value.length < MinLength) failValidation("MinLength", MinLength);
				if (MultipleOf !== void 0 && value % MultipleOf !== 0) failValidation("MultipleOf", MultipleOf);
				if (Pattern) {
					const pattern = typeof Pattern === "string" ? new RegExp(Pattern) : Pattern;
					if (typeof value !== "string" || value.match(pattern) === null) failValidation("Pattern", Pattern);
				}
				if (UniqueItems && value.some((item, i, ar) => ar.indexOf(item) !== i)) failValidation("UniqueItems", UniqueItems);
			}
		}
		/**
		* Serialize the given object based on its metadata defined in the mapper
		*
		* @param mapper - The mapper which defines the metadata of the serializable object
		*
		* @param object - A valid Javascript object to be serialized
		*
		* @param objectName - Name of the serialized object
		*
		* @param options - additional options to serialization
		*
		* @returns A valid serialized Javascript object
		*/
		serialize(mapper, object, objectName, options = { xml: {} }) {
			const updatedOptions = { xml: {
				rootName: options.xml.rootName ?? "",
				includeRoot: options.xml.includeRoot ?? false,
				xmlCharKey: options.xml.xmlCharKey ?? interfaces_js_1.XML_CHARKEY
			} };
			let payload = {};
			const mapperType = mapper.type.name;
			if (!objectName) objectName = mapper.serializedName;
			if (mapperType.match(/^Sequence$/i) !== null) payload = [];
			if (mapper.isConstant) object = mapper.defaultValue;
			const { required, nullable } = mapper;
			if (required && nullable && object === void 0) throw new Error(`${objectName} cannot be undefined.`);
			if (required && !nullable && (object === void 0 || object === null)) throw new Error(`${objectName} cannot be null or undefined.`);
			if (!required && nullable === false && object === null) throw new Error(`${objectName} cannot be null.`);
			if (object === void 0 || object === null) payload = object;
			else if (mapperType.match(/^any$/i) !== null) payload = object;
			else if (mapperType.match(/^(Number|String|Boolean|Object|Stream|Uuid)$/i) !== null) payload = serializeBasicTypes(mapperType, objectName, object);
			else if (mapperType.match(/^Enum$/i) !== null) payload = serializeEnumType(objectName, mapper.type.allowedValues, object);
			else if (mapperType.match(/^(Date|DateTime|TimeSpan|DateTimeRfc1123|UnixTime)$/i) !== null) payload = serializeDateTypes(mapperType, object, objectName);
			else if (mapperType.match(/^ByteArray$/i) !== null) payload = serializeByteArrayType(objectName, object);
			else if (mapperType.match(/^Base64Url$/i) !== null) payload = serializeBase64UrlType(objectName, object);
			else if (mapperType.match(/^Sequence$/i) !== null) payload = serializeSequenceType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
			else if (mapperType.match(/^Dictionary$/i) !== null) payload = serializeDictionaryType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
			else if (mapperType.match(/^Composite$/i) !== null) payload = serializeCompositeType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
			return payload;
		}
		/**
		* Deserialize the given object based on its metadata defined in the mapper
		*
		* @param mapper - The mapper which defines the metadata of the serializable object
		*
		* @param responseBody - A valid Javascript entity to be deserialized
		*
		* @param objectName - Name of the deserialized object
		*
		* @param options - Controls behavior of XML parser and builder.
		*
		* @returns A valid deserialized Javascript object
		*/
		deserialize(mapper, responseBody, objectName, options = { xml: {} }) {
			const updatedOptions = {
				xml: {
					rootName: options.xml.rootName ?? "",
					includeRoot: options.xml.includeRoot ?? false,
					xmlCharKey: options.xml.xmlCharKey ?? interfaces_js_1.XML_CHARKEY
				},
				ignoreUnknownProperties: options.ignoreUnknownProperties ?? false
			};
			if (responseBody === void 0 || responseBody === null) {
				if (this.isXML && mapper.type.name === "Sequence" && !mapper.xmlIsWrapped) responseBody = [];
				if (mapper.defaultValue !== void 0) responseBody = mapper.defaultValue;
				return responseBody;
			}
			let payload;
			const mapperType = mapper.type.name;
			if (!objectName) objectName = mapper.serializedName;
			if (mapperType.match(/^Composite$/i) !== null) payload = deserializeCompositeType(this, mapper, responseBody, objectName, updatedOptions);
			else {
				if (this.isXML) {
					const xmlCharKey = updatedOptions.xml.xmlCharKey;
					/**
					* If the mapper specifies this as a non-composite type value but the responseBody contains
					* both header ("$" i.e., XML_ATTRKEY) and body ("#" i.e., XML_CHARKEY) properties,
					* then just reduce the responseBody value to the body ("#" i.e., XML_CHARKEY) property.
					*/
					if (responseBody[interfaces_js_1.XML_ATTRKEY] !== void 0 && responseBody[xmlCharKey] !== void 0) responseBody = responseBody[xmlCharKey];
				}
				if (mapperType.match(/^Number$/i) !== null) {
					payload = parseFloat(responseBody);
					if (isNaN(payload)) payload = responseBody;
				} else if (mapperType.match(/^Boolean$/i) !== null) if (responseBody === "true") payload = true;
				else if (responseBody === "false") payload = false;
				else payload = responseBody;
				else if (mapperType.match(/^(String|Enum|Object|Stream|Uuid|TimeSpan|any)$/i) !== null) payload = responseBody;
				else if (mapperType.match(/^(Date|DateTime|DateTimeRfc1123)$/i) !== null) payload = new Date(responseBody);
				else if (mapperType.match(/^UnixTime$/i) !== null) payload = unixTimeToDate(responseBody);
				else if (mapperType.match(/^ByteArray$/i) !== null) payload = base64.decodeString(responseBody);
				else if (mapperType.match(/^Base64Url$/i) !== null) payload = base64UrlToByteArray(responseBody);
				else if (mapperType.match(/^Sequence$/i) !== null) payload = deserializeSequenceType(this, mapper, responseBody, objectName, updatedOptions);
				else if (mapperType.match(/^Dictionary$/i) !== null) payload = deserializeDictionaryType(this, mapper, responseBody, objectName, updatedOptions);
			}
			if (mapper.isConstant) payload = mapper.defaultValue;
			return payload;
		}
	};
	/**
	* Method that creates and returns a Serializer.
	* @param modelMappers - Known models to map
	* @param isXML - If XML should be supported
	*/
	function createSerializer(modelMappers = {}, isXML = false) {
		return new SerializerImpl(modelMappers, isXML);
	}
	function trimEnd(str, ch) {
		let len = str.length;
		while (len - 1 >= 0 && str[len - 1] === ch) --len;
		return str.substr(0, len);
	}
	function bufferToBase64Url(buffer) {
		if (!buffer) return;
		if (!(buffer instanceof Uint8Array)) throw new Error(`Please provide an input of type Uint8Array for converting to Base64Url.`);
		return trimEnd(base64.encodeByteArray(buffer), "=").replace(/\+/g, "-").replace(/\//g, "_");
	}
	function base64UrlToByteArray(str) {
		if (!str) return;
		if (str && typeof str.valueOf() !== "string") throw new Error("Please provide an input of type string for converting to Uint8Array");
		str = str.replace(/-/g, "+").replace(/_/g, "/");
		return base64.decodeString(str);
	}
	function splitSerializeName(prop) {
		const classes = [];
		let partialclass = "";
		if (prop) {
			const subwords = prop.split(".");
			for (const item of subwords) if (item.charAt(item.length - 1) === "\\") partialclass += item.substr(0, item.length - 1) + ".";
			else {
				partialclass += item;
				classes.push(partialclass);
				partialclass = "";
			}
		}
		return classes;
	}
	function dateToUnixTime(d) {
		if (!d) return;
		if (typeof d.valueOf() === "string") d = new Date(d);
		return Math.floor(d.getTime() / 1e3);
	}
	function unixTimeToDate(n) {
		if (!n) return;
		return /* @__PURE__ */ new Date(n * 1e3);
	}
	function serializeBasicTypes(typeName, objectName, value) {
		if (value !== null && value !== void 0) {
			if (typeName.match(/^Number$/i) !== null) {
				if (typeof value !== "number") throw new Error(`${objectName} with value ${value} must be of type number.`);
			} else if (typeName.match(/^String$/i) !== null) {
				if (typeof value.valueOf() !== "string") throw new Error(`${objectName} with value "${value}" must be of type string.`);
			} else if (typeName.match(/^Uuid$/i) !== null) {
				if (!(typeof value.valueOf() === "string" && (0, utils_js_1.isValidUuid)(value))) throw new Error(`${objectName} with value "${value}" must be of type string and a valid uuid.`);
			} else if (typeName.match(/^Boolean$/i) !== null) {
				if (typeof value !== "boolean") throw new Error(`${objectName} with value ${value} must be of type boolean.`);
			} else if (typeName.match(/^Stream$/i) !== null) {
				const objectType = typeof value;
				if (objectType !== "string" && typeof value.pipe !== "function" && typeof value.tee !== "function" && !(value instanceof ArrayBuffer) && !ArrayBuffer.isView(value) && !((typeof Blob === "function" || typeof Blob === "object") && value instanceof Blob) && objectType !== "function") throw new Error(`${objectName} must be a string, Blob, ArrayBuffer, ArrayBufferView, ReadableStream, or () => ReadableStream.`);
			}
		}
		return value;
	}
	function serializeEnumType(objectName, allowedValues, value) {
		if (!allowedValues) throw new Error(`Please provide a set of allowedValues to validate ${objectName} as an Enum Type.`);
		if (!allowedValues.some((item) => {
			if (typeof item.valueOf() === "string") return item.toLowerCase() === value.toLowerCase();
			return item === value;
		})) throw new Error(`${value} is not a valid value for ${objectName}. The valid values are: ${JSON.stringify(allowedValues)}.`);
		return value;
	}
	function serializeByteArrayType(objectName, value) {
		if (value !== void 0 && value !== null) {
			if (!(value instanceof Uint8Array)) throw new Error(`${objectName} must be of type Uint8Array.`);
			value = base64.encodeByteArray(value);
		}
		return value;
	}
	function serializeBase64UrlType(objectName, value) {
		if (value !== void 0 && value !== null) {
			if (!(value instanceof Uint8Array)) throw new Error(`${objectName} must be of type Uint8Array.`);
			value = bufferToBase64Url(value);
		}
		return value;
	}
	function serializeDateTypes(typeName, value, objectName) {
		if (value !== void 0 && value !== null) {
			if (typeName.match(/^Date$/i) !== null) {
				if (!(value instanceof Date || typeof value.valueOf() === "string" && !isNaN(Date.parse(value)))) throw new Error(`${objectName} must be an instanceof Date or a string in ISO8601 format.`);
				value = value instanceof Date ? value.toISOString().substring(0, 10) : new Date(value).toISOString().substring(0, 10);
			} else if (typeName.match(/^DateTime$/i) !== null) {
				if (!(value instanceof Date || typeof value.valueOf() === "string" && !isNaN(Date.parse(value)))) throw new Error(`${objectName} must be an instanceof Date or a string in ISO8601 format.`);
				value = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
			} else if (typeName.match(/^DateTimeRfc1123$/i) !== null) {
				if (!(value instanceof Date || typeof value.valueOf() === "string" && !isNaN(Date.parse(value)))) throw new Error(`${objectName} must be an instanceof Date or a string in RFC-1123 format.`);
				value = value instanceof Date ? value.toUTCString() : new Date(value).toUTCString();
			} else if (typeName.match(/^UnixTime$/i) !== null) {
				if (!(value instanceof Date || typeof value.valueOf() === "string" && !isNaN(Date.parse(value)))) throw new Error(`${objectName} must be an instanceof Date or a string in RFC-1123/ISO8601 format for it to be serialized in UnixTime/Epoch format.`);
				value = dateToUnixTime(value);
			} else if (typeName.match(/^TimeSpan$/i) !== null) {
				if (!(0, utils_js_1.isDuration)(value)) throw new Error(`${objectName} must be a string in ISO 8601 format. Instead was "${value}".`);
			}
		}
		return value;
	}
	function serializeSequenceType(serializer, mapper, object, objectName, isXml, options) {
		if (!Array.isArray(object)) throw new Error(`${objectName} must be of type Array.`);
		let elementType = mapper.type.element;
		if (!elementType || typeof elementType !== "object") throw new Error(`"element" metadata for an Array must be defined in the mapper and it must be of type "object" in ${objectName}.`);
		if (elementType.type.name === "Composite" && elementType.type.className) elementType = serializer.modelMappers[elementType.type.className] ?? elementType;
		const tempArray = [];
		for (let i = 0; i < object.length; i++) {
			const serializedValue = serializer.serialize(elementType, object[i], objectName, options);
			if (isXml && elementType.xmlNamespace) {
				const xmlnsKey = elementType.xmlNamespacePrefix ? `xmlns:${elementType.xmlNamespacePrefix}` : "xmlns";
				if (elementType.type.name === "Composite") {
					tempArray[i] = { ...serializedValue };
					tempArray[i][interfaces_js_1.XML_ATTRKEY] = { [xmlnsKey]: elementType.xmlNamespace };
				} else {
					tempArray[i] = {};
					tempArray[i][options.xml.xmlCharKey] = serializedValue;
					tempArray[i][interfaces_js_1.XML_ATTRKEY] = { [xmlnsKey]: elementType.xmlNamespace };
				}
			} else tempArray[i] = serializedValue;
		}
		return tempArray;
	}
	function serializeDictionaryType(serializer, mapper, object, objectName, isXml, options) {
		if (typeof object !== "object") throw new Error(`${objectName} must be of type object.`);
		const valueType = mapper.type.value;
		if (!valueType || typeof valueType !== "object") throw new Error(`"value" metadata for a Dictionary must be defined in the mapper and it must of type "object" in ${objectName}.`);
		const tempDictionary = {};
		for (const key of Object.keys(object)) tempDictionary[key] = getXmlObjectValue(valueType, serializer.serialize(valueType, object[key], objectName, options), isXml, options);
		if (isXml && mapper.xmlNamespace) {
			const xmlnsKey = mapper.xmlNamespacePrefix ? `xmlns:${mapper.xmlNamespacePrefix}` : "xmlns";
			const result = tempDictionary;
			result[interfaces_js_1.XML_ATTRKEY] = { [xmlnsKey]: mapper.xmlNamespace };
			return result;
		}
		return tempDictionary;
	}
	/**
	* Resolves the additionalProperties property from a referenced mapper
	* @param serializer - the serializer containing the entire set of mappers
	* @param mapper - the composite mapper to resolve
	* @param objectName - name of the object being serialized
	*/
	function resolveAdditionalProperties(serializer, mapper, objectName) {
		const additionalProperties = mapper.type.additionalProperties;
		if (!additionalProperties && mapper.type.className) return resolveReferencedMapper(serializer, mapper, objectName)?.type.additionalProperties;
		return additionalProperties;
	}
	/**
	* Finds the mapper referenced by className
	* @param serializer - the serializer containing the entire set of mappers
	* @param mapper - the composite mapper to resolve
	* @param objectName - name of the object being serialized
	*/
	function resolveReferencedMapper(serializer, mapper, objectName) {
		const className = mapper.type.className;
		if (!className) throw new Error(`Class name for model "${objectName}" is not provided in the mapper "${JSON.stringify(mapper, void 0, 2)}".`);
		return serializer.modelMappers[className];
	}
	/**
	* Resolves a composite mapper's modelProperties.
	* @param serializer - the serializer containing the entire set of mappers
	* @param mapper - the composite mapper to resolve
	*/
	function resolveModelProperties(serializer, mapper, objectName) {
		let modelProps = mapper.type.modelProperties;
		if (!modelProps) {
			const modelMapper = resolveReferencedMapper(serializer, mapper, objectName);
			if (!modelMapper) throw new Error(`mapper() cannot be null or undefined for model "${mapper.type.className}".`);
			modelProps = modelMapper?.type.modelProperties;
			if (!modelProps) throw new Error(`modelProperties cannot be null or undefined in the mapper "${JSON.stringify(modelMapper)}" of type "${mapper.type.className}" for object "${objectName}".`);
		}
		return modelProps;
	}
	function serializeCompositeType(serializer, mapper, object, objectName, isXml, options) {
		if (getPolymorphicDiscriminatorRecursively(serializer, mapper)) mapper = getPolymorphicMapper(serializer, mapper, object, "clientName");
		if (object !== void 0 && object !== null) {
			const payload = {};
			const modelProps = resolveModelProperties(serializer, mapper, objectName);
			for (const key of Object.keys(modelProps)) {
				const propertyMapper = modelProps[key];
				if (propertyMapper.readOnly) continue;
				let propName;
				let parentObject = payload;
				if (serializer.isXML) if (propertyMapper.xmlIsWrapped) propName = propertyMapper.xmlName;
				else propName = propertyMapper.xmlElementName || propertyMapper.xmlName;
				else {
					const paths = splitSerializeName(propertyMapper.serializedName);
					propName = paths.pop();
					for (const pathName of paths) {
						const childObject = parentObject[pathName];
						if ((childObject === void 0 || childObject === null) && (object[key] !== void 0 && object[key] !== null || propertyMapper.defaultValue !== void 0)) parentObject[pathName] = {};
						parentObject = parentObject[pathName];
					}
				}
				if (parentObject !== void 0 && parentObject !== null) {
					if (isXml && mapper.xmlNamespace) {
						const xmlnsKey = mapper.xmlNamespacePrefix ? `xmlns:${mapper.xmlNamespacePrefix}` : "xmlns";
						parentObject[interfaces_js_1.XML_ATTRKEY] = {
							...parentObject[interfaces_js_1.XML_ATTRKEY],
							[xmlnsKey]: mapper.xmlNamespace
						};
					}
					const propertyObjectName = propertyMapper.serializedName !== "" ? objectName + "." + propertyMapper.serializedName : objectName;
					let toSerialize = object[key];
					const polymorphicDiscriminator = getPolymorphicDiscriminatorRecursively(serializer, mapper);
					if (polymorphicDiscriminator && polymorphicDiscriminator.clientName === key && (toSerialize === void 0 || toSerialize === null)) toSerialize = mapper.serializedName;
					const serializedValue = serializer.serialize(propertyMapper, toSerialize, propertyObjectName, options);
					if (serializedValue !== void 0 && propName !== void 0 && propName !== null) {
						const value = getXmlObjectValue(propertyMapper, serializedValue, isXml, options);
						if (isXml && propertyMapper.xmlIsAttribute) {
							parentObject[interfaces_js_1.XML_ATTRKEY] = parentObject[interfaces_js_1.XML_ATTRKEY] || {};
							parentObject[interfaces_js_1.XML_ATTRKEY][propName] = serializedValue;
						} else if (isXml && propertyMapper.xmlIsWrapped) parentObject[propName] = { [propertyMapper.xmlElementName]: value };
						else parentObject[propName] = value;
					}
				}
			}
			const additionalPropertiesMapper = resolveAdditionalProperties(serializer, mapper, objectName);
			if (additionalPropertiesMapper) {
				const propNames = Object.keys(modelProps);
				for (const clientPropName of Object.keys(object)) if (propNames.every((pn) => pn !== clientPropName)) Object.defineProperty(payload, clientPropName, {
					value: serializer.serialize(additionalPropertiesMapper, object[clientPropName], objectName + "[\"" + clientPropName + "\"]", options),
					enumerable: true,
					configurable: true,
					writable: true
				});
			}
			return payload;
		}
		return object;
	}
	function getXmlObjectValue(propertyMapper, serializedValue, isXml, options) {
		if (!isXml || !propertyMapper.xmlNamespace) return serializedValue;
		const xmlNamespace = { [propertyMapper.xmlNamespacePrefix ? `xmlns:${propertyMapper.xmlNamespacePrefix}` : "xmlns"]: propertyMapper.xmlNamespace };
		if (["Composite"].includes(propertyMapper.type.name)) if (serializedValue[interfaces_js_1.XML_ATTRKEY]) return serializedValue;
		else {
			const result = { ...serializedValue };
			result[interfaces_js_1.XML_ATTRKEY] = xmlNamespace;
			return result;
		}
		const result = {};
		result[options.xml.xmlCharKey] = serializedValue;
		result[interfaces_js_1.XML_ATTRKEY] = xmlNamespace;
		return result;
	}
	function isSpecialXmlProperty(propertyName, options) {
		return [interfaces_js_1.XML_ATTRKEY, options.xml.xmlCharKey].includes(propertyName);
	}
	function deserializeCompositeType(serializer, mapper, responseBody, objectName, options) {
		const xmlCharKey = options.xml.xmlCharKey ?? interfaces_js_1.XML_CHARKEY;
		if (getPolymorphicDiscriminatorRecursively(serializer, mapper)) mapper = getPolymorphicMapper(serializer, mapper, responseBody, "serializedName");
		const modelProps = resolveModelProperties(serializer, mapper, objectName);
		let instance = {};
		const handledPropertyNames = [];
		for (const key of Object.keys(modelProps)) {
			const propertyMapper = modelProps[key];
			const paths = splitSerializeName(modelProps[key].serializedName);
			handledPropertyNames.push(paths[0]);
			const { serializedName, xmlName, xmlElementName } = propertyMapper;
			let propertyObjectName = objectName;
			if (serializedName !== "" && serializedName !== void 0) propertyObjectName = objectName + "." + serializedName;
			const headerCollectionPrefix = propertyMapper.headerCollectionPrefix;
			if (headerCollectionPrefix) {
				const dictionary = {};
				for (const headerKey of Object.keys(responseBody)) {
					if (headerKey.startsWith(headerCollectionPrefix)) dictionary[headerKey.substring(headerCollectionPrefix.length)] = serializer.deserialize(propertyMapper.type.value, responseBody[headerKey], propertyObjectName, options);
					handledPropertyNames.push(headerKey);
				}
				instance[key] = dictionary;
			} else if (serializer.isXML) if (propertyMapper.xmlIsAttribute && responseBody[interfaces_js_1.XML_ATTRKEY]) instance[key] = serializer.deserialize(propertyMapper, responseBody[interfaces_js_1.XML_ATTRKEY][xmlName], propertyObjectName, options);
			else if (propertyMapper.xmlIsMsText) {
				if (responseBody[xmlCharKey] !== void 0) instance[key] = responseBody[xmlCharKey];
				else if (typeof responseBody === "string") instance[key] = responseBody;
			} else {
				const propertyName = xmlElementName || xmlName || serializedName;
				if (propertyMapper.xmlIsWrapped) {
					const elementList = responseBody[xmlName]?.[xmlElementName] ?? [];
					Object.defineProperty(instance, key, {
						value: serializer.deserialize(propertyMapper, elementList, propertyObjectName, options),
						enumerable: true,
						configurable: true,
						writable: true
					});
					handledPropertyNames.push(xmlName);
				} else {
					const property = responseBody[propertyName];
					instance[key] = serializer.deserialize(propertyMapper, property, propertyObjectName, options);
					handledPropertyNames.push(propertyName);
				}
			}
			else {
				let propertyInstance;
				let res = responseBody;
				let steps = 0;
				for (const item of paths) {
					if (!res) break;
					steps++;
					res = res[item];
				}
				if (res === null && steps < paths.length) res = void 0;
				propertyInstance = res;
				const polymorphicDiscriminator = mapper.type.polymorphicDiscriminator;
				if (polymorphicDiscriminator && key === polymorphicDiscriminator.clientName && (propertyInstance === void 0 || propertyInstance === null)) propertyInstance = mapper.serializedName;
				let serializedValue;
				if (Array.isArray(responseBody[key]) && modelProps[key].serializedName === "") {
					propertyInstance = responseBody[key];
					const arrayInstance = serializer.deserialize(propertyMapper, propertyInstance, propertyObjectName, options);
					for (const [k, v] of Object.entries(instance)) if (!Object.prototype.hasOwnProperty.call(arrayInstance, k)) arrayInstance[k] = v;
					instance = arrayInstance;
				} else if (propertyInstance !== void 0 || propertyMapper.defaultValue !== void 0) {
					serializedValue = serializer.deserialize(propertyMapper, propertyInstance, propertyObjectName, options);
					instance[key] = serializedValue;
				}
			}
		}
		const additionalPropertiesMapper = mapper.type.additionalProperties;
		if (additionalPropertiesMapper) {
			const isAdditionalProperty = (responsePropName) => {
				for (const clientPropName of Object.keys(modelProps)) if (splitSerializeName(modelProps[clientPropName].serializedName)[0] === responsePropName) return false;
				return true;
			};
			for (const responsePropName of Object.keys(responseBody)) if (isAdditionalProperty(responsePropName)) {
				const deserializedValue = serializer.deserialize(additionalPropertiesMapper, responseBody[responsePropName], objectName + "[\"" + responsePropName + "\"]", options);
				Object.defineProperty(instance, responsePropName, {
					value: deserializedValue,
					enumerable: true,
					configurable: true,
					writable: true
				});
			}
		} else if (responseBody && !options.ignoreUnknownProperties) {
			for (const key of Object.keys(responseBody)) if (instance[key] === void 0 && !handledPropertyNames.includes(key) && !isSpecialXmlProperty(key, options)) Object.defineProperty(instance, key, {
				value: responseBody[key],
				enumerable: true,
				configurable: true,
				writable: true
			});
		}
		return instance;
	}
	function deserializeDictionaryType(serializer, mapper, responseBody, objectName, options) {
		const value = mapper.type.value;
		if (!value || typeof value !== "object") throw new Error(`"value" metadata for a Dictionary must be defined in the mapper and it must of type "object" in ${objectName}`);
		if (responseBody) {
			const tempDictionary = {};
			for (const key of Object.keys(responseBody)) tempDictionary[key] = serializer.deserialize(value, responseBody[key], objectName, options);
			return tempDictionary;
		}
		return responseBody;
	}
	function deserializeSequenceType(serializer, mapper, responseBody, objectName, options) {
		let element = mapper.type.element;
		if (!element || typeof element !== "object") throw new Error(`"element" metadata for an Array must be defined in the mapper and it must be of type "object" in ${objectName}`);
		if (responseBody) {
			if (!Array.isArray(responseBody)) responseBody = [responseBody];
			if (element.type.name === "Composite" && element.type.className) element = serializer.modelMappers[element.type.className] ?? element;
			const tempArray = [];
			for (let i = 0; i < responseBody.length; i++) tempArray[i] = serializer.deserialize(element, responseBody[i], `${objectName}[${i}]`, options);
			return tempArray;
		}
		return responseBody;
	}
	function getIndexDiscriminator(discriminators, discriminatorValue, typeName) {
		const typeNamesToCheck = [typeName];
		while (typeNamesToCheck.length) {
			const currentName = typeNamesToCheck.shift();
			const indexDiscriminator = discriminatorValue === currentName ? discriminatorValue : currentName + "." + discriminatorValue;
			if (Object.prototype.hasOwnProperty.call(discriminators, indexDiscriminator)) return discriminators[indexDiscriminator];
			else for (const [name, mapper] of Object.entries(discriminators)) if (name.startsWith(currentName + ".") && mapper.type.uberParent === currentName && mapper.type.className) typeNamesToCheck.push(mapper.type.className);
		}
	}
	function getPolymorphicMapper(serializer, mapper, object, polymorphicPropertyName) {
		const polymorphicDiscriminator = getPolymorphicDiscriminatorRecursively(serializer, mapper);
		if (polymorphicDiscriminator) {
			let discriminatorName = polymorphicDiscriminator[polymorphicPropertyName];
			if (discriminatorName) {
				if (polymorphicPropertyName === "serializedName") discriminatorName = discriminatorName.replace(/\\/gi, "");
				const discriminatorValue = object[discriminatorName];
				const typeName = mapper.type.uberParent ?? mapper.type.className;
				if (typeof discriminatorValue === "string" && typeName) {
					const polymorphicMapper = getIndexDiscriminator(serializer.modelMappers.discriminators, discriminatorValue, typeName);
					if (polymorphicMapper) mapper = polymorphicMapper;
				}
			}
		}
		return mapper;
	}
	function getPolymorphicDiscriminatorRecursively(serializer, mapper) {
		return mapper.type.polymorphicDiscriminator || getPolymorphicDiscriminatorSafely(serializer, mapper.type.uberParent) || getPolymorphicDiscriminatorSafely(serializer, mapper.type.className);
	}
	function getPolymorphicDiscriminatorSafely(serializer, typeName) {
		return typeName && serializer.modelMappers[typeName] && serializer.modelMappers[typeName].type.polymorphicDiscriminator;
	}
	/**
	* Known types of Mappers
	*/
	exports.MapperTypeNames = {
		Base64Url: "Base64Url",
		Boolean: "Boolean",
		ByteArray: "ByteArray",
		Composite: "Composite",
		Date: "Date",
		DateTime: "DateTime",
		DateTimeRfc1123: "DateTimeRfc1123",
		Dictionary: "Dictionary",
		Enum: "Enum",
		Number: "Number",
		Object: "Object",
		Sequence: "Sequence",
		String: "String",
		Stream: "Stream",
		TimeSpan: "TimeSpan",
		UnixTime: "UnixTime"
	};
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/abort-controller/AbortError.js
var require_AbortError = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var AbortError_exports = {};
	__export(AbortError_exports, { AbortError: () => AbortError });
	module.exports = __toCommonJS(AbortError_exports);
	var AbortError = class extends Error {
		constructor(message) {
			super(message);
			this.name = "AbortError";
		}
	};
	0 && (module.exports = { AbortError });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/httpHeaders.js
var require_httpHeaders$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var httpHeaders_exports = {};
	__export(httpHeaders_exports, { createHttpHeaders: () => createHttpHeaders });
	module.exports = __toCommonJS(httpHeaders_exports);
	function normalizeName(name) {
		return name.toLowerCase();
	}
	function normalizeValue(value) {
		return String(value).trim().replace(/[\r\n]/g, "");
	}
	function* headerIterator(map) {
		for (const entry of map.values()) yield [entry.name, entry.value];
	}
	var HttpHeadersImpl = class {
		_headersMap;
		constructor(rawHeaders) {
			this._headersMap = /* @__PURE__ */ new Map();
			if (rawHeaders) for (const headerName of Object.keys(rawHeaders)) this.set(headerName, rawHeaders[headerName]);
		}
		/**
		* Set a header in this collection with the provided name and value. The name is
		* case-insensitive.
		* @param name - The name of the header to set. This value is case-insensitive.
		* @param value - The value of the header to set.
		*/
		set(name, value) {
			this._headersMap.set(normalizeName(name), {
				name,
				value: normalizeValue(value)
			});
		}
		/**
		* Get the header value for the provided header name, or undefined if no header exists in this
		* collection with the provided name.
		* @param name - The name of the header. This value is case-insensitive.
		*/
		get(name) {
			return this._headersMap.get(normalizeName(name))?.value;
		}
		/**
		* Get whether or not this header collection contains a header entry for the provided header name.
		* @param name - The name of the header to set. This value is case-insensitive.
		*/
		has(name) {
			return this._headersMap.has(normalizeName(name));
		}
		/**
		* Remove the header with the provided headerName.
		* @param name - The name of the header to remove.
		*/
		delete(name) {
			this._headersMap.delete(normalizeName(name));
		}
		/**
		* Get the JSON object representation of this HTTP header collection.
		*/
		toJSON(options = {}) {
			const result = {};
			if (options.preserveCase) for (const entry of this._headersMap.values()) result[entry.name] = entry.value;
			else for (const [normalizedName, entry] of this._headersMap) result[normalizedName] = entry.value;
			return result;
		}
		/**
		* Get the string representation of this HTTP header collection.
		*/
		toString() {
			return JSON.stringify(this.toJSON({ preserveCase: true }));
		}
		/**
		* Iterate over tuples of header [name, value] pairs.
		*/
		[Symbol.iterator]() {
			return headerIterator(this._headersMap);
		}
	};
	function createHttpHeaders(rawHeaders) {
		return new HttpHeadersImpl(rawHeaders);
	}
	0 && (module.exports = { createHttpHeaders });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/pipelineRequest.js
var require_pipelineRequest$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var pipelineRequest_exports = {};
	__export(pipelineRequest_exports, { createPipelineRequest: () => createPipelineRequest });
	module.exports = __toCommonJS(pipelineRequest_exports);
	var import_httpHeaders = require_httpHeaders$1();
	var import_uuid = require_uuidUtils();
	var PipelineRequestImpl = class {
		url;
		method;
		headers;
		timeout;
		withCredentials;
		body;
		multipartBody;
		formData;
		streamResponseStatusCodes;
		enableBrowserStreams;
		proxySettings;
		disableKeepAlive;
		abortSignal;
		requestId;
		allowInsecureConnection;
		onUploadProgress;
		onDownloadProgress;
		requestOverrides;
		authSchemes;
		constructor(options) {
			this.url = options.url;
			this.body = options.body;
			this.headers = options.headers ?? (0, import_httpHeaders.createHttpHeaders)();
			this.method = options.method ?? "GET";
			this.timeout = options.timeout ?? 0;
			this.multipartBody = options.multipartBody;
			this.formData = options.formData;
			this.disableKeepAlive = options.disableKeepAlive ?? false;
			this.proxySettings = options.proxySettings;
			this.streamResponseStatusCodes = options.streamResponseStatusCodes;
			this.withCredentials = options.withCredentials ?? false;
			this.abortSignal = options.abortSignal;
			this.onUploadProgress = options.onUploadProgress;
			this.onDownloadProgress = options.onDownloadProgress;
			this.requestId = options.requestId || (0, import_uuid.randomUUID)();
			this.allowInsecureConnection = options.allowInsecureConnection ?? false;
			this.enableBrowserStreams = options.enableBrowserStreams ?? false;
			this.requestOverrides = options.requestOverrides;
			this.authSchemes = options.authSchemes;
		}
	};
	function createPipelineRequest(options) {
		return new PipelineRequestImpl(options);
	}
	0 && (module.exports = { createPipelineRequest });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/pipeline.js
var require_pipeline$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var pipeline_exports = {};
	__export(pipeline_exports, { createEmptyPipeline: () => createEmptyPipeline });
	module.exports = __toCommonJS(pipeline_exports);
	var ValidPhaseNames = /* @__PURE__ */ new Set([
		"Deserialize",
		"Serialize",
		"Retry",
		"Sign"
	]);
	var HttpPipeline = class HttpPipeline {
		_policies = [];
		_orderedPolicies;
		constructor(policies) {
			this._policies = policies?.slice(0) ?? [];
			this._orderedPolicies = void 0;
		}
		addPolicy(policy, options = {}) {
			if (options.phase && options.afterPhase) throw new Error("Policies inside a phase cannot specify afterPhase.");
			if (options.phase && !ValidPhaseNames.has(options.phase)) throw new Error(`Invalid phase name: ${options.phase}`);
			if (options.afterPhase && !ValidPhaseNames.has(options.afterPhase)) throw new Error(`Invalid afterPhase name: ${options.afterPhase}`);
			this._policies.push({
				policy,
				options
			});
			this._orderedPolicies = void 0;
		}
		removePolicy(options) {
			const removedPolicies = [];
			this._policies = this._policies.filter((policyDescriptor) => {
				if (options.name && policyDescriptor.policy.name === options.name || options.phase && policyDescriptor.options.phase === options.phase) {
					removedPolicies.push(policyDescriptor.policy);
					return false;
				} else return true;
			});
			this._orderedPolicies = void 0;
			return removedPolicies;
		}
		sendRequest(httpClient, request) {
			return this.getOrderedPolicies().reduceRight((next, policy) => {
				return (req) => {
					return policy.sendRequest(req, next);
				};
			}, (req) => httpClient.sendRequest(req))(request);
		}
		getOrderedPolicies() {
			if (!this._orderedPolicies) this._orderedPolicies = this.orderPolicies();
			return this._orderedPolicies;
		}
		clone() {
			return new HttpPipeline(this._policies);
		}
		static create() {
			return new HttpPipeline();
		}
		orderPolicies() {
			const result = [];
			const policyMap = /* @__PURE__ */ new Map();
			function createPhase(name) {
				return {
					name,
					policies: /* @__PURE__ */ new Set(),
					hasRun: false,
					hasAfterPolicies: false
				};
			}
			const serializePhase = createPhase("Serialize");
			const noPhase = createPhase("None");
			const deserializePhase = createPhase("Deserialize");
			const retryPhase = createPhase("Retry");
			const signPhase = createPhase("Sign");
			const orderedPhases = [
				serializePhase,
				noPhase,
				deserializePhase,
				retryPhase,
				signPhase
			];
			function getPhase(phase) {
				if (phase === "Retry") return retryPhase;
				else if (phase === "Serialize") return serializePhase;
				else if (phase === "Deserialize") return deserializePhase;
				else if (phase === "Sign") return signPhase;
				else return noPhase;
			}
			for (const descriptor of this._policies) {
				const policy = descriptor.policy;
				const options = descriptor.options;
				const policyName = policy.name;
				if (policyMap.has(policyName)) throw new Error("Duplicate policy names not allowed in pipeline");
				const node = {
					policy,
					dependsOn: /* @__PURE__ */ new Set(),
					dependants: /* @__PURE__ */ new Set()
				};
				if (options.afterPhase) {
					node.afterPhase = getPhase(options.afterPhase);
					node.afterPhase.hasAfterPolicies = true;
				}
				policyMap.set(policyName, node);
				getPhase(options.phase).policies.add(node);
			}
			for (const descriptor of this._policies) {
				const { policy, options } = descriptor;
				const policyName = policy.name;
				const node = policyMap.get(policyName);
				if (!node) throw new Error(`Missing node for policy ${policyName}`);
				if (options.afterPolicies) for (const afterPolicyName of options.afterPolicies) {
					const afterNode = policyMap.get(afterPolicyName);
					if (afterNode) {
						node.dependsOn.add(afterNode);
						afterNode.dependants.add(node);
					}
				}
				if (options.beforePolicies) for (const beforePolicyName of options.beforePolicies) {
					const beforeNode = policyMap.get(beforePolicyName);
					if (beforeNode) {
						beforeNode.dependsOn.add(node);
						node.dependants.add(beforeNode);
					}
				}
			}
			function walkPhase(phase) {
				phase.hasRun = true;
				for (const node of phase.policies) {
					if (node.afterPhase && (!node.afterPhase.hasRun || node.afterPhase.policies.size)) continue;
					if (node.dependsOn.size === 0) {
						result.push(node.policy);
						for (const dependant of node.dependants) dependant.dependsOn.delete(node);
						policyMap.delete(node.policy.name);
						phase.policies.delete(node);
					}
				}
			}
			function walkPhases() {
				for (const phase of orderedPhases) {
					walkPhase(phase);
					if (phase.policies.size > 0 && phase !== noPhase) {
						if (!noPhase.hasRun) walkPhase(noPhase);
						return;
					}
					if (phase.hasAfterPolicies) walkPhase(noPhase);
				}
			}
			let iteration = 0;
			while (policyMap.size > 0) {
				iteration++;
				const initialResultLength = result.length;
				walkPhases();
				if (result.length <= initialResultLength && iteration > 1) throw new Error("Cannot satisfy policy dependencies due to requirements cycle.");
			}
			return result;
		}
	};
	function createEmptyPipeline() {
		return HttpPipeline.create();
	}
	0 && (module.exports = { createEmptyPipeline });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/inspect.js
var require_inspect = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var inspect_exports = {};
	__export(inspect_exports, { custom: () => custom });
	module.exports = __toCommonJS(inspect_exports);
	var custom = __require("node:util").inspect.custom;
	0 && (module.exports = { custom });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/restError.js
var require_restError$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var restError_exports = {};
	__export(restError_exports, {
		RestError: () => RestError,
		isRestError: () => isRestError
	});
	module.exports = __toCommonJS(restError_exports);
	var import_error = require_error();
	var import_inspect = require_inspect();
	var errorSanitizer = new (require_sanitizer()).Sanitizer();
	var RestError = class RestError extends Error {
		/**
		* Something went wrong when making the request.
		* This means the actual request failed for some reason,
		* such as a DNS issue or the connection being lost.
		*/
		static REQUEST_SEND_ERROR = "REQUEST_SEND_ERROR";
		/**
		* This means that parsing the response from the server failed.
		* It may have been malformed.
		*/
		static PARSE_ERROR = "PARSE_ERROR";
		/**
		* The code of the error itself (use statics on RestError if possible.)
		*/
		code;
		/**
		* The HTTP status code of the request (if applicable.)
		*/
		statusCode;
		/**
		* The request that was made.
		* This property is non-enumerable.
		*/
		request;
		/**
		* The response received (if any.)
		* This property is non-enumerable.
		*/
		response;
		/**
		* Bonus property set by the throw site.
		*/
		details;
		constructor(message, options = {}) {
			super(message);
			this.name = "RestError";
			this.code = options.code;
			this.statusCode = options.statusCode;
			Object.defineProperty(this, "request", {
				value: options.request,
				enumerable: false
			});
			Object.defineProperty(this, "response", {
				value: options.response,
				enumerable: false
			});
			const agent = this.request?.agent ? {
				maxFreeSockets: this.request.agent.maxFreeSockets,
				maxSockets: this.request.agent.maxSockets
			} : void 0;
			Object.defineProperty(this, import_inspect.custom, {
				value: () => {
					return `RestError: ${this.message} 
 ${errorSanitizer.sanitize({
						...this,
						request: {
							...this.request,
							agent
						},
						response: this.response
					})}`;
				},
				enumerable: false
			});
			Object.setPrototypeOf(this, RestError.prototype);
		}
	};
	function isRestError(e) {
		if (e instanceof RestError) return true;
		return (0, import_error.isError)(e) && e.name === "RestError";
	}
	0 && (module.exports = {
		RestError,
		isRestError
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/log.js
var require_log$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var log_exports = {};
	__export(log_exports, { logger: () => logger });
	module.exports = __toCommonJS(log_exports);
	var logger = (0, require_logger().createClientLogger)("ts-http-runtime");
	0 && (module.exports = { logger });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/nodeHttpClient.js
var require_nodeHttpClient = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var nodeHttpClient_exports = {};
	__export(nodeHttpClient_exports, {
		createNodeHttpClient: () => createNodeHttpClient,
		getBodyLength: () => getBodyLength
	});
	module.exports = __toCommonJS(nodeHttpClient_exports);
	var import_node_http = __toESM(__require("node:http"));
	var import_node_https = __toESM(__require("node:https"));
	var import_node_zlib = __toESM(__require("node:zlib"));
	var import_node_stream = __require("node:stream");
	var import_AbortError = require_AbortError();
	var import_httpHeaders = require_httpHeaders$1();
	var import_restError = require_restError$2();
	var import_log = require_log$2();
	var import_sanitizer = require_sanitizer();
	var DEFAULT_TLS_SETTINGS = {};
	function isReadableStream(body) {
		return body && typeof body.pipe === "function";
	}
	function isStreamComplete(stream) {
		if (stream.readable === false) return Promise.resolve();
		return new Promise((resolve) => {
			const handler = () => {
				resolve();
				stream.removeListener("close", handler);
				stream.removeListener("end", handler);
				stream.removeListener("error", handler);
			};
			stream.on("close", handler);
			stream.on("end", handler);
			stream.on("error", handler);
		});
	}
	function isArrayBuffer(body) {
		return body && typeof body.byteLength === "number";
	}
	var ReportTransform = class extends import_node_stream.Transform {
		loadedBytes = 0;
		progressCallback;
		_transform(chunk, _encoding, callback) {
			this.push(chunk);
			this.loadedBytes += chunk.length;
			try {
				this.progressCallback({ loadedBytes: this.loadedBytes });
				callback();
			} catch (e) {
				callback(e);
			}
		}
		constructor(progressCallback) {
			super();
			this.progressCallback = progressCallback;
		}
	};
	var NodeHttpClient = class {
		cachedHttpAgent;
		cachedHttpsAgents = /* @__PURE__ */ new WeakMap();
		/**
		* Makes a request over an underlying transport layer and returns the response.
		* @param request - The request to be made.
		*/
		async sendRequest(request) {
			const abortController = new AbortController();
			let abortListener;
			if (request.abortSignal) {
				if (request.abortSignal.aborted) throw new import_AbortError.AbortError("The operation was aborted. Request has already been canceled.");
				abortListener = (event) => {
					if (event.type === "abort") abortController.abort();
				};
				request.abortSignal.addEventListener("abort", abortListener);
			}
			let timeoutId;
			if (request.timeout > 0) timeoutId = setTimeout(() => {
				const sanitizer = new import_sanitizer.Sanitizer();
				import_log.logger.info(`request to '${sanitizer.sanitizeUrl(request.url)}' timed out. canceling...`);
				abortController.abort();
			}, request.timeout);
			const acceptEncoding = request.headers.get("Accept-Encoding");
			const shouldDecompress = acceptEncoding?.includes("gzip") || acceptEncoding?.includes("deflate");
			let body = typeof request.body === "function" ? request.body() : request.body;
			if (body && !request.headers.has("Content-Length")) {
				const bodyLength = getBodyLength(body);
				if (bodyLength !== null) request.headers.set("Content-Length", bodyLength);
			}
			let responseStream;
			try {
				if (body && request.onUploadProgress) {
					const onUploadProgress = request.onUploadProgress;
					const uploadReportStream = new ReportTransform(onUploadProgress);
					uploadReportStream.on("error", (e) => {
						import_log.logger.error("Error in upload progress", e);
					});
					if (isReadableStream(body)) body.pipe(uploadReportStream);
					else uploadReportStream.end(body);
					body = uploadReportStream;
				}
				const res = await this.makeRequest(request, abortController, body);
				if (timeoutId !== void 0) clearTimeout(timeoutId);
				const headers = getResponseHeaders(res);
				const response = {
					status: res.statusCode ?? 0,
					headers,
					request
				};
				if (request.method === "HEAD") {
					res.resume();
					return response;
				}
				responseStream = shouldDecompress ? getDecodedResponseStream(res, headers) : res;
				const onDownloadProgress = request.onDownloadProgress;
				if (onDownloadProgress) {
					const downloadReportStream = new ReportTransform(onDownloadProgress);
					downloadReportStream.on("error", (e) => {
						import_log.logger.error("Error in download progress", e);
					});
					responseStream.pipe(downloadReportStream);
					responseStream = downloadReportStream;
				}
				if (request.streamResponseStatusCodes?.has(Number.POSITIVE_INFINITY) || request.streamResponseStatusCodes?.has(response.status)) response.readableStreamBody = responseStream;
				else response.bodyAsText = await streamToText(responseStream);
				return response;
			} finally {
				if (request.abortSignal && abortListener) {
					let uploadStreamDone = Promise.resolve();
					if (isReadableStream(body)) uploadStreamDone = isStreamComplete(body);
					let downloadStreamDone = Promise.resolve();
					if (isReadableStream(responseStream)) downloadStreamDone = isStreamComplete(responseStream);
					Promise.all([uploadStreamDone, downloadStreamDone]).then(() => {
						if (abortListener) request.abortSignal?.removeEventListener("abort", abortListener);
					}).catch((e) => {
						import_log.logger.warning("Error when cleaning up abortListener on httpRequest", e);
					});
				}
			}
		}
		makeRequest(request, abortController, body) {
			const url = new URL(request.url);
			const isInsecure = url.protocol !== "https:";
			if (isInsecure && !request.allowInsecureConnection) throw new Error(`Cannot connect to ${request.url} while allowInsecureConnection is false.`);
			const options = {
				agent: request.agent ?? this.getOrCreateAgent(request, isInsecure),
				hostname: url.hostname,
				path: `${url.pathname}${url.search}`,
				port: url.port,
				method: request.method,
				headers: request.headers.toJSON({ preserveCase: true }),
				...request.requestOverrides
			};
			return new Promise((resolve, reject) => {
				const req = isInsecure ? import_node_http.default.request(options, resolve) : import_node_https.default.request(options, resolve);
				req.once("error", (err) => {
					reject(new import_restError.RestError(err.message, {
						code: err.code ?? import_restError.RestError.REQUEST_SEND_ERROR,
						request
					}));
				});
				abortController.signal.addEventListener("abort", () => {
					const abortError = new import_AbortError.AbortError("The operation was aborted. Rejecting from abort signal callback while making request.");
					req.destroy(abortError);
					reject(abortError);
				});
				if (body && isReadableStream(body)) body.pipe(req);
				else if (body) if (typeof body === "string" || Buffer.isBuffer(body)) req.end(body);
				else if (isArrayBuffer(body)) req.end(ArrayBuffer.isView(body) ? Buffer.from(body.buffer, body.byteOffset, body.byteLength) : Buffer.from(body));
				else {
					import_log.logger.error("Unrecognized body type", body);
					reject(new import_restError.RestError("Unrecognized body type"));
				}
				else req.end();
			});
		}
		getOrCreateAgent(request, isInsecure) {
			const disableKeepAlive = request.disableKeepAlive;
			if (isInsecure) {
				if (disableKeepAlive) return import_node_http.default.globalAgent;
				if (!this.cachedHttpAgent) this.cachedHttpAgent = new import_node_http.default.Agent({ keepAlive: true });
				return this.cachedHttpAgent;
			} else {
				if (disableKeepAlive && !request.tlsSettings) return import_node_https.default.globalAgent;
				const tlsSettings = request.tlsSettings ?? DEFAULT_TLS_SETTINGS;
				let agent = this.cachedHttpsAgents.get(tlsSettings);
				if (agent && agent.options.keepAlive === !disableKeepAlive) return agent;
				import_log.logger.info("No cached TLS Agent exist, creating a new Agent");
				agent = new import_node_https.default.Agent({
					keepAlive: !disableKeepAlive,
					...tlsSettings
				});
				this.cachedHttpsAgents.set(tlsSettings, agent);
				return agent;
			}
		}
	};
	function getResponseHeaders(res) {
		const headers = (0, import_httpHeaders.createHttpHeaders)();
		for (const header of Object.keys(res.headers)) {
			const value = res.headers[header];
			if (Array.isArray(value)) {
				if (value.length > 0) headers.set(header, value[0]);
			} else if (value) headers.set(header, value);
		}
		return headers;
	}
	function getDecodedResponseStream(stream, headers) {
		const contentEncoding = headers.get("Content-Encoding");
		if (contentEncoding === "gzip") {
			const unzip = import_node_zlib.default.createGunzip();
			stream.pipe(unzip);
			return unzip;
		} else if (contentEncoding === "deflate") {
			const inflate = import_node_zlib.default.createInflate();
			stream.pipe(inflate);
			return inflate;
		}
		return stream;
	}
	function streamToText(stream) {
		return new Promise((resolve, reject) => {
			const buffer = [];
			stream.on("data", (chunk) => {
				if (Buffer.isBuffer(chunk)) buffer.push(chunk);
				else buffer.push(Buffer.from(chunk));
			});
			stream.on("end", () => {
				resolve(Buffer.concat(buffer).toString("utf8"));
			});
			stream.on("error", (e) => {
				if (e && e?.name === "AbortError") reject(e);
				else reject(new import_restError.RestError(`Error reading response as text: ${e.message}`, { code: import_restError.RestError.PARSE_ERROR }));
			});
		});
	}
	function getBodyLength(body) {
		if (!body) return 0;
		else if (Buffer.isBuffer(body)) return body.length;
		else if (isReadableStream(body)) return null;
		else if (isArrayBuffer(body)) return body.byteLength;
		else if (typeof body === "string") return Buffer.from(body).length;
		else return null;
	}
	function createNodeHttpClient() {
		return new NodeHttpClient();
	}
	0 && (module.exports = {
		createNodeHttpClient,
		getBodyLength
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/defaultHttpClient.js
var require_defaultHttpClient$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var defaultHttpClient_exports = {};
	__export(defaultHttpClient_exports, { createDefaultHttpClient: () => createDefaultHttpClient });
	module.exports = __toCommonJS(defaultHttpClient_exports);
	var import_nodeHttpClient = require_nodeHttpClient();
	function createDefaultHttpClient() {
		return (0, import_nodeHttpClient.createNodeHttpClient)();
	}
	0 && (module.exports = { createDefaultHttpClient });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/logPolicy.js
var require_logPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var logPolicy_exports = {};
	__export(logPolicy_exports, {
		logPolicy: () => logPolicy,
		logPolicyName: () => logPolicyName
	});
	module.exports = __toCommonJS(logPolicy_exports);
	var import_log = require_log$2();
	var import_sanitizer = require_sanitizer();
	var logPolicyName = "logPolicy";
	function logPolicy(options = {}) {
		const logger = options.logger ?? import_log.logger.info;
		const sanitizer = new import_sanitizer.Sanitizer({
			additionalAllowedHeaderNames: options.additionalAllowedHeaderNames,
			additionalAllowedQueryParameters: options.additionalAllowedQueryParameters
		});
		return {
			name: logPolicyName,
			async sendRequest(request, next) {
				if (!logger.enabled) return next(request);
				logger(`Request: ${sanitizer.sanitize(request)}`);
				const response = await next(request);
				logger(`Response status code: ${response.status}`);
				logger(`Headers: ${sanitizer.sanitize({ headers: response.headers })}`);
				return response;
			}
		};
	}
	0 && (module.exports = {
		logPolicy,
		logPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/userAgentPlatform.js
var require_userAgentPlatform$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var userAgentPlatform_exports = {};
	__export(userAgentPlatform_exports, {
		getHeaderName: () => getHeaderName,
		setPlatformSpecificData: () => setPlatformSpecificData
	});
	module.exports = __toCommonJS(userAgentPlatform_exports);
	var import_node_os$1 = __toESM(__require("node:os"));
	var import_node_process$1 = __toESM(__require("node:process"));
	function getHeaderName() {
		return "User-Agent";
	}
	async function setPlatformSpecificData(map) {
		if (import_node_process$1.default && import_node_process$1.default.versions) {
			const osInfo = `${import_node_os$1.default.type()} ${import_node_os$1.default.release()}; ${import_node_os$1.default.arch()}`;
			if (import_node_process$1.default.versions.bun) map.set("Bun", `${import_node_process$1.default.versions.bun} (${osInfo})`);
			else if (import_node_process$1.default.versions.deno) map.set("Deno", `${import_node_process$1.default.versions.deno} (${osInfo})`);
			else if (import_node_process$1.default.versions.node) map.set("Node", `${import_node_process$1.default.versions.node} (${osInfo})`);
		}
	}
	0 && (module.exports = {
		getHeaderName,
		setPlatformSpecificData
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/constants.js
var require_constants$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var constants_exports = {};
	__export(constants_exports, {
		DEFAULT_RETRY_POLICY_COUNT: () => DEFAULT_RETRY_POLICY_COUNT,
		SDK_VERSION: () => SDK_VERSION
	});
	module.exports = __toCommonJS(constants_exports);
	var SDK_VERSION = "0.3.8";
	var DEFAULT_RETRY_POLICY_COUNT = 3;
	0 && (module.exports = {
		DEFAULT_RETRY_POLICY_COUNT,
		SDK_VERSION
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/userAgent.js
var require_userAgent$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var userAgent_exports = {};
	__export(userAgent_exports, {
		getUserAgentHeaderName: () => getUserAgentHeaderName,
		getUserAgentValue: () => getUserAgentValue,
		setPlatformSpecificData: () => import_userAgent.setPlatformSpecificData
	});
	module.exports = __toCommonJS(userAgent_exports);
	var import_userAgent = require_userAgentPlatform$1();
	var import_constants = require_constants$1();
	function getUserAgentString(telemetryInfo) {
		const parts = [];
		for (const [key, value] of telemetryInfo) {
			const token = value ? `${key}/${value}` : key;
			parts.push(token);
		}
		return parts.join(" ");
	}
	function getUserAgentHeaderName() {
		return (0, import_userAgent.getHeaderName)();
	}
	async function getUserAgentValue(prefix) {
		const runtimeInfo = /* @__PURE__ */ new Map();
		runtimeInfo.set("ts-http-runtime", import_constants.SDK_VERSION);
		await (0, import_userAgent.setPlatformSpecificData)(runtimeInfo);
		const defaultAgent = getUserAgentString(runtimeInfo);
		return prefix ? `${prefix} ${defaultAgent}` : defaultAgent;
	}
	0 && (module.exports = {
		getUserAgentHeaderName,
		getUserAgentValue,
		setPlatformSpecificData
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/userAgentPolicy.js
var require_userAgentPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var userAgentPolicy_exports = {};
	__export(userAgentPolicy_exports, {
		userAgentPolicy: () => userAgentPolicy,
		userAgentPolicyName: () => userAgentPolicyName
	});
	module.exports = __toCommonJS(userAgentPolicy_exports);
	var import_userAgent = require_userAgent$1();
	var UserAgentHeaderName = (0, import_userAgent.getUserAgentHeaderName)();
	var userAgentPolicyName = "userAgentPolicy";
	function userAgentPolicy(options = {}) {
		const userAgentValue = (0, import_userAgent.getUserAgentValue)(options.userAgentPrefix);
		return {
			name: userAgentPolicyName,
			async sendRequest(request, next) {
				if (!request.headers.has(UserAgentHeaderName)) request.headers.set(UserAgentHeaderName, await userAgentValue);
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		userAgentPolicy,
		userAgentPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/helpers.js
var require_helpers$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var helpers_exports = {};
	__export(helpers_exports, {
		delay: () => delay,
		parseHeaderValueAsNumber: () => parseHeaderValueAsNumber
	});
	module.exports = __toCommonJS(helpers_exports);
	var import_AbortError = require_AbortError();
	var StandardAbortMessage = "The operation was aborted.";
	function delay(delayInMs, value, options) {
		return new Promise((resolve, reject) => {
			let timer = void 0;
			let onAborted = void 0;
			const rejectOnAbort = () => {
				return reject(new import_AbortError.AbortError(options?.abortErrorMsg ? options?.abortErrorMsg : StandardAbortMessage));
			};
			const removeListeners = () => {
				if (options?.abortSignal && onAborted) options.abortSignal.removeEventListener("abort", onAborted);
			};
			onAborted = () => {
				if (timer) clearTimeout(timer);
				removeListeners();
				return rejectOnAbort();
			};
			if (options?.abortSignal && options.abortSignal.aborted) return rejectOnAbort();
			timer = setTimeout(() => {
				removeListeners();
				resolve(value);
			}, delayInMs);
			if (options?.abortSignal) options.abortSignal.addEventListener("abort", onAborted);
		});
	}
	function parseHeaderValueAsNumber(response, headerName) {
		const value = response.headers.get(headerName);
		if (!value) return;
		const valueAsNum = Number(value);
		if (Number.isNaN(valueAsNum)) return;
		return valueAsNum;
	}
	0 && (module.exports = {
		delay,
		parseHeaderValueAsNumber
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/retryStrategies/throttlingRetryStrategy.js
var require_throttlingRetryStrategy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var throttlingRetryStrategy_exports = {};
	__export(throttlingRetryStrategy_exports, {
		isThrottlingRetryResponse: () => isThrottlingRetryResponse,
		throttlingRetryStrategy: () => throttlingRetryStrategy
	});
	module.exports = __toCommonJS(throttlingRetryStrategy_exports);
	var import_helpers = require_helpers$1();
	var RetryAfterHeader = "Retry-After";
	var AllRetryAfterHeaders = [
		"retry-after-ms",
		"x-ms-retry-after-ms",
		RetryAfterHeader
	];
	function getRetryAfterInMs(response) {
		if (!(response && [429, 503].includes(response.status))) return void 0;
		try {
			for (const header of AllRetryAfterHeaders) {
				const retryAfterValue = (0, import_helpers.parseHeaderValueAsNumber)(response, header);
				if (retryAfterValue === 0 || retryAfterValue) return retryAfterValue * (header === RetryAfterHeader ? 1e3 : 1);
			}
			const retryAfterHeader = response.headers.get(RetryAfterHeader);
			if (!retryAfterHeader) return;
			const diff = Date.parse(retryAfterHeader) - Date.now();
			return Number.isFinite(diff) ? Math.max(0, diff) : void 0;
		} catch {
			return;
		}
	}
	function isThrottlingRetryResponse(response) {
		return Number.isFinite(getRetryAfterInMs(response));
	}
	function throttlingRetryStrategy() {
		return {
			name: "throttlingRetryStrategy",
			retry({ response }) {
				const retryAfterInMs = getRetryAfterInMs(response);
				if (!Number.isFinite(retryAfterInMs)) return { skipStrategy: true };
				return { retryAfterInMs };
			}
		};
	}
	0 && (module.exports = {
		isThrottlingRetryResponse,
		throttlingRetryStrategy
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/retryStrategies/exponentialRetryStrategy.js
var require_exponentialRetryStrategy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var exponentialRetryStrategy_exports = {};
	__export(exponentialRetryStrategy_exports, {
		exponentialRetryStrategy: () => exponentialRetryStrategy,
		isExponentialRetryResponse: () => isExponentialRetryResponse,
		isSystemError: () => isSystemError
	});
	module.exports = __toCommonJS(exponentialRetryStrategy_exports);
	var import_delay = require_delay();
	var import_throttlingRetryStrategy = require_throttlingRetryStrategy();
	var DEFAULT_CLIENT_RETRY_INTERVAL = 1e3;
	var DEFAULT_CLIENT_MAX_RETRY_INTERVAL = 64e3;
	function exponentialRetryStrategy(options = {}) {
		const retryInterval = options.retryDelayInMs ?? DEFAULT_CLIENT_RETRY_INTERVAL;
		const maxRetryInterval = options.maxRetryDelayInMs ?? DEFAULT_CLIENT_MAX_RETRY_INTERVAL;
		return {
			name: "exponentialRetryStrategy",
			retry({ retryCount, response, responseError }) {
				const matchedSystemError = isSystemError(responseError);
				const ignoreSystemErrors = matchedSystemError && options.ignoreSystemErrors;
				const isExponential = isExponentialRetryResponse(response);
				const ignoreExponentialResponse = isExponential && options.ignoreHttpStatusCodes;
				if (response && ((0, import_throttlingRetryStrategy.isThrottlingRetryResponse)(response) || !isExponential) || ignoreExponentialResponse || ignoreSystemErrors) return { skipStrategy: true };
				if (responseError && !matchedSystemError && !isExponential) return { errorToThrow: responseError };
				return (0, import_delay.calculateRetryDelay)(retryCount, {
					retryDelayInMs: retryInterval,
					maxRetryDelayInMs: maxRetryInterval
				});
			}
		};
	}
	function isExponentialRetryResponse(response) {
		return Boolean(response && response.status !== void 0 && (response.status >= 500 || response.status === 408) && response.status !== 501 && response.status !== 505);
	}
	function isSystemError(err) {
		if (!err) return false;
		return err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT" || err.code === "ECONNREFUSED" || err.code === "ECONNRESET" || err.code === "ENOENT" || err.code === "ENOTFOUND";
	}
	0 && (module.exports = {
		exponentialRetryStrategy,
		isExponentialRetryResponse,
		isSystemError
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/retryPolicy.js
var require_retryPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var retryPolicy_exports = {};
	__export(retryPolicy_exports, { retryPolicy: () => retryPolicy });
	module.exports = __toCommonJS(retryPolicy_exports);
	var import_helpers = require_helpers$1();
	var import_restError = require_restError$2();
	var import_AbortError = require_AbortError();
	var import_logger = require_logger();
	var import_constants = require_constants$1();
	var retryPolicyLogger = (0, import_logger.createClientLogger)("ts-http-runtime retryPolicy");
	var retryPolicyName = "retryPolicy";
	function retryPolicy(strategies, options = { maxRetries: import_constants.DEFAULT_RETRY_POLICY_COUNT }) {
		const logger = options.logger || retryPolicyLogger;
		return {
			name: retryPolicyName,
			async sendRequest(request, next) {
				let response;
				let responseError;
				let retryCount = -1;
				retryRequest: while (true) {
					retryCount += 1;
					response = void 0;
					responseError = void 0;
					try {
						logger.info(`Retry ${retryCount}: Attempting to send request`, request.requestId);
						response = await next(request);
						logger.info(`Retry ${retryCount}: Received a response from request`, request.requestId);
					} catch (e) {
						logger.error(`Retry ${retryCount}: Received an error from request`, request.requestId);
						if (!(0, import_restError.isRestError)(e)) throw e;
						responseError = e;
						response = e.response;
					}
					if (request.abortSignal?.aborted) {
						logger.error(`Retry ${retryCount}: Request aborted.`);
						throw new import_AbortError.AbortError();
					}
					if (retryCount >= (options.maxRetries ?? import_constants.DEFAULT_RETRY_POLICY_COUNT)) {
						logger.info(`Retry ${retryCount}: Maximum retries reached. Returning the last received response, or throwing the last received error.`);
						if (responseError) throw responseError;
						else if (response) return response;
						else throw new Error("Maximum retries reached with no response or error to throw");
					}
					logger.info(`Retry ${retryCount}: Processing ${strategies.length} retry strategies.`);
					strategiesLoop: for (const strategy of strategies) {
						const strategyLogger = strategy.logger || logger;
						strategyLogger.info(`Retry ${retryCount}: Processing retry strategy ${strategy.name}.`);
						const modifiers = strategy.retry({
							retryCount,
							response,
							responseError
						});
						if (modifiers.skipStrategy) {
							strategyLogger.info(`Retry ${retryCount}: Skipped.`);
							continue strategiesLoop;
						}
						const { errorToThrow, retryAfterInMs, redirectTo } = modifiers;
						if (errorToThrow) {
							strategyLogger.error(`Retry ${retryCount}: Retry strategy ${strategy.name} throws error:`, errorToThrow);
							throw errorToThrow;
						}
						if (retryAfterInMs || retryAfterInMs === 0) {
							strategyLogger.info(`Retry ${retryCount}: Retry strategy ${strategy.name} retries after ${retryAfterInMs}`);
							await (0, import_helpers.delay)(retryAfterInMs, void 0, { abortSignal: request.abortSignal });
							continue retryRequest;
						}
						if (redirectTo) {
							strategyLogger.info(`Retry ${retryCount}: Retry strategy ${strategy.name} redirects to ${redirectTo}`);
							request.url = redirectTo;
							continue retryRequest;
						}
					}
					if (responseError) {
						logger.info(`None of the retry strategies could work with the received error. Throwing it.`);
						throw responseError;
					}
					if (response) {
						logger.info(`None of the retry strategies could work with the received response. Returning it.`);
						return response;
					}
				}
			}
		};
	}
	0 && (module.exports = { retryPolicy });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/defaultRetryPolicy.js
var require_defaultRetryPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var defaultRetryPolicy_exports = {};
	__export(defaultRetryPolicy_exports, {
		defaultRetryPolicy: () => defaultRetryPolicy,
		defaultRetryPolicyName: () => defaultRetryPolicyName
	});
	module.exports = __toCommonJS(defaultRetryPolicy_exports);
	var import_exponentialRetryStrategy = require_exponentialRetryStrategy();
	var import_throttlingRetryStrategy = require_throttlingRetryStrategy();
	var import_retryPolicy = require_retryPolicy$1();
	var import_constants = require_constants$1();
	var defaultRetryPolicyName = "defaultRetryPolicy";
	function defaultRetryPolicy(options = {}) {
		return {
			name: defaultRetryPolicyName,
			sendRequest: (0, import_retryPolicy.retryPolicy)([(0, import_throttlingRetryStrategy.throttlingRetryStrategy)(), (0, import_exponentialRetryStrategy.exponentialRetryStrategy)(options)], { maxRetries: options.maxRetries ?? import_constants.DEFAULT_RETRY_POLICY_COUNT }).sendRequest
		};
	}
	0 && (module.exports = {
		defaultRetryPolicy,
		defaultRetryPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/formData.js
var require_formData = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var formData_exports = {};
	__export(formData_exports, { convertBodyToFormDataMap: () => convertBodyToFormDataMap });
	module.exports = __toCommonJS(formData_exports);
	function convertBodyToFormDataMap(body) {
		if (typeof FormData !== "undefined" && body instanceof FormData) {
			const formDataMap = {};
			for (const [key, value] of body.entries()) {
				const existing = formDataMap[key];
				if (Array.isArray(existing)) existing.push(value);
				else formDataMap[key] = existing !== void 0 ? [existing, value] : [value];
			}
			return formDataMap;
		}
	}
	0 && (module.exports = { convertBodyToFormDataMap });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/formDataPolicy.js
var require_formDataPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var formDataPolicy_exports = {};
	__export(formDataPolicy_exports, {
		formDataPolicy: () => formDataPolicy,
		formDataPolicyName: () => formDataPolicyName
	});
	module.exports = __toCommonJS(formDataPolicy_exports);
	var import_bytesEncoding = require_bytesEncoding();
	var import_formData = require_formData();
	var import_httpHeaders = require_httpHeaders$1();
	var formDataPolicyName = "formDataPolicy";
	function formDataPolicy() {
		return {
			name: formDataPolicyName,
			async sendRequest(request, next) {
				const converted = (0, import_formData.convertBodyToFormDataMap)(request.body);
				if (converted) {
					request.formData = converted;
					request.body = void 0;
				}
				if (request.formData) {
					const contentType = request.headers.get("Content-Type");
					if (contentType && contentType.indexOf("application/x-www-form-urlencoded") !== -1) request.body = wwwFormUrlEncode(request.formData);
					else await prepareFormData(request.formData, request);
					request.formData = void 0;
				}
				return next(request);
			}
		};
	}
	function wwwFormUrlEncode(formData) {
		const urlSearchParams = new URLSearchParams();
		for (const [key, value] of Object.entries(formData)) if (Array.isArray(value)) for (const subValue of value) urlSearchParams.append(key, subValue.toString());
		else urlSearchParams.append(key, value.toString());
		return urlSearchParams.toString();
	}
	async function prepareFormData(formData, request) {
		const contentType = request.headers.get("Content-Type");
		if (contentType && !contentType.startsWith("multipart/form-data")) return;
		request.headers.set("Content-Type", contentType ?? "multipart/form-data");
		const parts = [];
		for (const [fieldName, values] of Object.entries(formData)) for (const value of Array.isArray(values) ? values : [values]) if (typeof value === "string") parts.push({
			headers: (0, import_httpHeaders.createHttpHeaders)({ "Content-Disposition": `form-data; name="${fieldName}"` }),
			body: (0, import_bytesEncoding.stringToUint8Array)(value, "utf-8")
		});
		else if (value === void 0 || value === null || typeof value !== "object") throw new Error(`Unexpected value for key ${fieldName}: ${value}. Value should be serialized to string first.`);
		else {
			const fileName = value.name || "blob";
			const headers = (0, import_httpHeaders.createHttpHeaders)();
			headers.set("Content-Disposition", `form-data; name="${fieldName}"; filename="${fileName}"`);
			headers.set("Content-Type", value.type || "application/octet-stream");
			parts.push({
				headers,
				body: value
			});
		}
		request.multipartBody = { parts };
	}
	0 && (module.exports = {
		formDataPolicy,
		formDataPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/agentPolicy.js
var require_agentPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var agentPolicy_exports = {};
	__export(agentPolicy_exports, {
		agentPolicy: () => agentPolicy,
		agentPolicyName: () => agentPolicyName
	});
	module.exports = __toCommonJS(agentPolicy_exports);
	var agentPolicyName = "agentPolicy";
	function agentPolicy(agent) {
		return {
			name: agentPolicyName,
			sendRequest: async (req, next) => {
				if (!req.agent) req.agent = agent;
				return next(req);
			}
		};
	}
	0 && (module.exports = {
		agentPolicy,
		agentPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/tlsPolicy.js
var require_tlsPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var tlsPolicy_exports = {};
	__export(tlsPolicy_exports, {
		tlsPolicy: () => tlsPolicy,
		tlsPolicyName: () => tlsPolicyName
	});
	module.exports = __toCommonJS(tlsPolicy_exports);
	var tlsPolicyName = "tlsPolicy";
	function tlsPolicy(tlsSettings) {
		return {
			name: tlsPolicyName,
			sendRequest: async (req, next) => {
				if (!req.tlsSettings) req.tlsSettings = tlsSettings;
				return next(req);
			}
		};
	}
	0 && (module.exports = {
		tlsPolicy,
		tlsPolicyName
	});
}));
//#endregion
//#region node_modules/agent-base/dist/helpers.js
var require_helpers = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null) {
			for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
		}
		__setModuleDefault(result, mod);
		return result;
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.req = exports.json = exports.toBuffer = void 0;
	var http$1 = __importStar(__require("http"));
	var https = __importStar(__require("https"));
	async function toBuffer(stream) {
		let length = 0;
		const chunks = [];
		for await (const chunk of stream) {
			length += chunk.length;
			chunks.push(chunk);
		}
		return Buffer.concat(chunks, length);
	}
	exports.toBuffer = toBuffer;
	async function json(stream) {
		const str = (await toBuffer(stream)).toString("utf8");
		try {
			return JSON.parse(str);
		} catch (_err) {
			const err = _err;
			err.message += ` (input: ${str})`;
			throw err;
		}
	}
	exports.json = json;
	function req(url, opts = {}) {
		const req = ((typeof url === "string" ? url : url.href).startsWith("https:") ? https : http$1).request(url, opts);
		const promise = new Promise((resolve, reject) => {
			req.once("response", resolve).once("error", reject).end();
		});
		req.then = promise.then.bind(promise);
		return req;
	}
	exports.req = req;
}));
//#endregion
//#region node_modules/agent-base/dist/index.js
var require_dist$2 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null) {
			for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
		}
		__setModuleDefault(result, mod);
		return result;
	};
	var __exportStar = exports && exports.__exportStar || function(m, exports$1) {
		for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding(exports$1, m, p);
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Agent = void 0;
	var net$2 = __importStar(__require("net"));
	var http = __importStar(__require("http"));
	var https_1 = __require("https");
	__exportStar(require_helpers(), exports);
	var INTERNAL = Symbol("AgentBaseInternalState");
	var Agent = class extends http.Agent {
		constructor(opts) {
			super(opts);
			this[INTERNAL] = {};
		}
		/**
		* Determine whether this is an `http` or `https` request.
		*/
		isSecureEndpoint(options) {
			if (options) {
				if (typeof options.secureEndpoint === "boolean") return options.secureEndpoint;
				if (typeof options.protocol === "string") return options.protocol === "https:";
			}
			const { stack } = /* @__PURE__ */ new Error();
			if (typeof stack !== "string") return false;
			return stack.split("\n").some((l) => l.indexOf("(https.js:") !== -1 || l.indexOf("node:https:") !== -1);
		}
		incrementSockets(name) {
			if (this.maxSockets === Infinity && this.maxTotalSockets === Infinity) return null;
			if (!this.sockets[name]) this.sockets[name] = [];
			const fakeSocket = new net$2.Socket({ writable: false });
			this.sockets[name].push(fakeSocket);
			this.totalSocketCount++;
			return fakeSocket;
		}
		decrementSockets(name, socket) {
			if (!this.sockets[name] || socket === null) return;
			const sockets = this.sockets[name];
			const index = sockets.indexOf(socket);
			if (index !== -1) {
				sockets.splice(index, 1);
				this.totalSocketCount--;
				if (sockets.length === 0) delete this.sockets[name];
			}
		}
		getName(options) {
			if (this.isSecureEndpoint(options)) return https_1.Agent.prototype.getName.call(this, options);
			return super.getName(options);
		}
		createSocket(req, options, cb) {
			const connectOpts = {
				...options,
				secureEndpoint: this.isSecureEndpoint(options)
			};
			const name = this.getName(connectOpts);
			const fakeSocket = this.incrementSockets(name);
			Promise.resolve().then(() => this.connect(req, connectOpts)).then((socket) => {
				this.decrementSockets(name, fakeSocket);
				if (socket instanceof http.Agent) try {
					return socket.addRequest(req, connectOpts);
				} catch (err) {
					return cb(err);
				}
				this[INTERNAL].currentSocket = socket;
				super.createSocket(req, options, cb);
			}, (err) => {
				this.decrementSockets(name, fakeSocket);
				cb(err);
			});
		}
		createConnection() {
			const socket = this[INTERNAL].currentSocket;
			this[INTERNAL].currentSocket = void 0;
			if (!socket) throw new Error("No socket was returned in the `connect()` function");
			return socket;
		}
		get defaultPort() {
			return this[INTERNAL].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
		}
		set defaultPort(v) {
			if (this[INTERNAL]) this[INTERNAL].defaultPort = v;
		}
		get protocol() {
			return this[INTERNAL].protocol ?? (this.isSecureEndpoint() ? "https:" : "http:");
		}
		set protocol(v) {
			if (this[INTERNAL]) this[INTERNAL].protocol = v;
		}
	};
	exports.Agent = Agent;
}));
//#endregion
//#region node_modules/https-proxy-agent/dist/parse-proxy-response.js
var require_parse_proxy_response = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.parseProxyResponse = void 0;
	var debug = (0, __importDefault(require_src()).default)("https-proxy-agent:parse-proxy-response");
	function parseProxyResponse(socket) {
		return new Promise((resolve, reject) => {
			let buffersLength = 0;
			const buffers = [];
			function read() {
				const b = socket.read();
				if (b) ondata(b);
				else socket.once("readable", read);
			}
			function cleanup() {
				socket.removeListener("end", onend);
				socket.removeListener("error", onerror);
				socket.removeListener("readable", read);
			}
			function onend() {
				cleanup();
				debug("onend");
				reject(/* @__PURE__ */ new Error("Proxy connection ended before receiving CONNECT response"));
			}
			function onerror(err) {
				cleanup();
				debug("onerror %o", err);
				reject(err);
			}
			function ondata(b) {
				buffers.push(b);
				buffersLength += b.length;
				const buffered = Buffer.concat(buffers, buffersLength);
				const endOfHeaders = buffered.indexOf("\r\n\r\n");
				if (endOfHeaders === -1) {
					debug("have not received end of HTTP headers yet...");
					read();
					return;
				}
				const headerParts = buffered.slice(0, endOfHeaders).toString("ascii").split("\r\n");
				const firstLine = headerParts.shift();
				if (!firstLine) {
					socket.destroy();
					return reject(/* @__PURE__ */ new Error("No header received from proxy CONNECT response"));
				}
				const firstLineParts = firstLine.split(" ");
				const statusCode = +firstLineParts[1];
				const statusText = firstLineParts.slice(2).join(" ");
				const headers = {};
				for (const header of headerParts) {
					if (!header) continue;
					const firstColon = header.indexOf(":");
					if (firstColon === -1) {
						socket.destroy();
						return reject(/* @__PURE__ */ new Error(`Invalid header from proxy CONNECT response: "${header}"`));
					}
					const key = header.slice(0, firstColon).toLowerCase();
					const value = header.slice(firstColon + 1).trimStart();
					const current = headers[key];
					if (typeof current === "string") headers[key] = [current, value];
					else if (Array.isArray(current)) current.push(value);
					else headers[key] = value;
				}
				debug("got proxy server response: %o %o", firstLine, headers);
				cleanup();
				resolve({
					connect: {
						statusCode,
						statusText,
						headers
					},
					buffered
				});
			}
			socket.on("error", onerror);
			socket.on("end", onend);
			read();
		});
	}
	exports.parseProxyResponse = parseProxyResponse;
}));
//#endregion
//#region node_modules/https-proxy-agent/dist/index.js
var require_dist$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null) {
			for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
		}
		__setModuleDefault(result, mod);
		return result;
	};
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.HttpsProxyAgent = void 0;
	var net$1 = __importStar(__require("net"));
	var tls$1 = __importStar(__require("tls"));
	var assert_1 = __importDefault(__require("assert"));
	var debug_1 = __importDefault(require_src());
	var agent_base_1 = require_dist$2();
	var url_1$1 = __require("url");
	var parse_proxy_response_1 = require_parse_proxy_response();
	var debug = (0, debug_1.default)("https-proxy-agent");
	var setServernameFromNonIpHost = (options) => {
		if (options.servername === void 0 && options.host && !net$1.isIP(options.host)) return {
			...options,
			servername: options.host
		};
		return options;
	};
	/**
	* The `HttpsProxyAgent` implements an HTTP Agent subclass that connects to
	* the specified "HTTP(s) proxy server" in order to proxy HTTPS requests.
	*
	* Outgoing HTTP requests are first tunneled through the proxy server using the
	* `CONNECT` HTTP request method to establish a connection to the proxy server,
	* and then the proxy server connects to the destination target and issues the
	* HTTP request from the proxy server.
	*
	* `https:` requests have their socket connection upgraded to TLS once
	* the connection to the proxy server has been established.
	*/
	var HttpsProxyAgent = class extends agent_base_1.Agent {
		constructor(proxy, opts) {
			super(opts);
			this.options = { path: void 0 };
			this.proxy = typeof proxy === "string" ? new url_1$1.URL(proxy) : proxy;
			this.proxyHeaders = opts?.headers ?? {};
			debug("Creating new HttpsProxyAgent instance: %o", this.proxy.href);
			const host = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, "");
			const port = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
			this.connectOpts = {
				ALPNProtocols: ["http/1.1"],
				...opts ? omit(opts, "headers") : null,
				host,
				port
			};
		}
		/**
		* Called when the node-core HTTP client library is creating a
		* new HTTP request.
		*/
		async connect(req, opts) {
			const { proxy } = this;
			if (!opts.host) throw new TypeError("No \"host\" provided");
			let socket;
			if (proxy.protocol === "https:") {
				debug("Creating `tls.Socket`: %o", this.connectOpts);
				socket = tls$1.connect(setServernameFromNonIpHost(this.connectOpts));
			} else {
				debug("Creating `net.Socket`: %o", this.connectOpts);
				socket = net$1.connect(this.connectOpts);
			}
			const headers = typeof this.proxyHeaders === "function" ? this.proxyHeaders() : { ...this.proxyHeaders };
			const host = net$1.isIPv6(opts.host) ? `[${opts.host}]` : opts.host;
			let payload = `CONNECT ${host}:${opts.port} HTTP/1.1\r\n`;
			if (proxy.username || proxy.password) {
				const auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
				headers["Proxy-Authorization"] = `Basic ${Buffer.from(auth).toString("base64")}`;
			}
			headers.Host = `${host}:${opts.port}`;
			if (!headers["Proxy-Connection"]) headers["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
			for (const name of Object.keys(headers)) payload += `${name}: ${headers[name]}\r\n`;
			const proxyResponsePromise = (0, parse_proxy_response_1.parseProxyResponse)(socket);
			socket.write(`${payload}\r\n`);
			const { connect, buffered } = await proxyResponsePromise;
			req.emit("proxyConnect", connect);
			this.emit("proxyConnect", connect, req);
			if (connect.statusCode === 200) {
				req.once("socket", resume);
				if (opts.secureEndpoint) {
					debug("Upgrading socket connection to TLS");
					return tls$1.connect({
						...omit(setServernameFromNonIpHost(opts), "host", "path", "port"),
						socket
					});
				}
				return socket;
			}
			socket.destroy();
			const fakeSocket = new net$1.Socket({ writable: false });
			fakeSocket.readable = true;
			req.once("socket", (s) => {
				debug("Replaying proxy buffer for failed request");
				(0, assert_1.default)(s.listenerCount("data") > 0);
				s.push(buffered);
				s.push(null);
			});
			return fakeSocket;
		}
	};
	HttpsProxyAgent.protocols = ["http", "https"];
	exports.HttpsProxyAgent = HttpsProxyAgent;
	function resume(socket) {
		socket.resume();
	}
	function omit(obj, ...keys) {
		const ret = {};
		let key;
		for (key in obj) if (!keys.includes(key)) ret[key] = obj[key];
		return ret;
	}
}));
//#endregion
//#region node_modules/http-proxy-agent/dist/index.js
var require_dist = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null) {
			for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
		}
		__setModuleDefault(result, mod);
		return result;
	};
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.HttpProxyAgent = void 0;
	var net = __importStar(__require("net"));
	var tls = __importStar(__require("tls"));
	var debug_1 = __importDefault(require_src());
	var events_1 = __require("events");
	var agent_base_1 = require_dist$2();
	var url_1 = __require("url");
	var debug = (0, debug_1.default)("http-proxy-agent");
	/**
	* The `HttpProxyAgent` implements an HTTP Agent subclass that connects
	* to the specified "HTTP proxy server" in order to proxy HTTP requests.
	*/
	var HttpProxyAgent = class extends agent_base_1.Agent {
		constructor(proxy, opts) {
			super(opts);
			this.proxy = typeof proxy === "string" ? new url_1.URL(proxy) : proxy;
			this.proxyHeaders = opts?.headers ?? {};
			debug("Creating new HttpProxyAgent instance: %o", this.proxy.href);
			const host = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, "");
			const port = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
			this.connectOpts = {
				...opts ? omit(opts, "headers") : null,
				host,
				port
			};
		}
		addRequest(req, opts) {
			req._header = null;
			this.setRequestProps(req, opts);
			super.addRequest(req, opts);
		}
		setRequestProps(req, opts) {
			const { proxy } = this;
			const base = `${opts.secureEndpoint ? "https:" : "http:"}//${req.getHeader("host") || "localhost"}`;
			const url = new url_1.URL(req.path, base);
			if (opts.port !== 80) url.port = String(opts.port);
			req.path = String(url);
			const headers = typeof this.proxyHeaders === "function" ? this.proxyHeaders() : { ...this.proxyHeaders };
			if (proxy.username || proxy.password) {
				const auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
				headers["Proxy-Authorization"] = `Basic ${Buffer.from(auth).toString("base64")}`;
			}
			if (!headers["Proxy-Connection"]) headers["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
			for (const name of Object.keys(headers)) {
				const value = headers[name];
				if (value) req.setHeader(name, value);
			}
		}
		async connect(req, opts) {
			req._header = null;
			if (!req.path.includes("://")) this.setRequestProps(req, opts);
			let first;
			let endOfHeaders;
			debug("Regenerating stored HTTP header string for request");
			req._implicitHeader();
			if (req.outputData && req.outputData.length > 0) {
				debug("Patching connection write() output buffer with updated header");
				first = req.outputData[0].data;
				endOfHeaders = first.indexOf("\r\n\r\n") + 4;
				req.outputData[0].data = req._header + first.substring(endOfHeaders);
				debug("Output buffer: %o", req.outputData[0].data);
			}
			let socket;
			if (this.proxy.protocol === "https:") {
				debug("Creating `tls.Socket`: %o", this.connectOpts);
				socket = tls.connect(this.connectOpts);
			} else {
				debug("Creating `net.Socket`: %o", this.connectOpts);
				socket = net.connect(this.connectOpts);
			}
			await (0, events_1.once)(socket, "connect");
			return socket;
		}
	};
	HttpProxyAgent.protocols = ["http", "https"];
	exports.HttpProxyAgent = HttpProxyAgent;
	function omit(obj, ...keys) {
		const ret = {};
		let key;
		for (key in obj) if (!keys.includes(key)) ret[key] = obj[key];
		return ret;
	}
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/proxyPolicy.js
var require_proxyPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var proxyPolicy_exports = {};
	__export(proxyPolicy_exports, {
		getDefaultProxySettings: () => getDefaultProxySettings,
		globalNoProxyList: () => globalNoProxyList,
		loadNoProxy: () => loadNoProxy,
		proxyPolicy: () => proxyPolicy,
		proxyPolicyName: () => proxyPolicyName
	});
	module.exports = __toCommonJS(proxyPolicy_exports);
	var import_https_proxy_agent = require_dist$1();
	var import_http_proxy_agent = require_dist();
	var import_log = require_log$2();
	var HTTPS_PROXY = "HTTPS_PROXY";
	var HTTP_PROXY = "HTTP_PROXY";
	var ALL_PROXY = "ALL_PROXY";
	var NO_PROXY = "NO_PROXY";
	var proxyPolicyName = "proxyPolicy";
	var globalNoProxyList = [];
	var noProxyListLoaded = false;
	var globalBypassedMap = /* @__PURE__ */ new Map();
	function getEnvironmentValue(name) {
		if (process.env[name]) return process.env[name];
		else if (process.env[name.toLowerCase()]) return process.env[name.toLowerCase()];
	}
	function loadEnvironmentProxyValue() {
		if (!process) return;
		const httpsProxy = getEnvironmentValue(HTTPS_PROXY);
		const allProxy = getEnvironmentValue(ALL_PROXY);
		const httpProxy = getEnvironmentValue(HTTP_PROXY);
		return httpsProxy || allProxy || httpProxy;
	}
	function isBypassed(uri, noProxyList, bypassedMap) {
		if (noProxyList.length === 0) return false;
		const host = new URL(uri).hostname;
		if (bypassedMap?.has(host)) return bypassedMap.get(host);
		let isBypassedFlag = false;
		for (const pattern of noProxyList) if (pattern[0] === ".") {
			if (host.endsWith(pattern)) isBypassedFlag = true;
			else if (host.length === pattern.length - 1 && host === pattern.slice(1)) isBypassedFlag = true;
		} else if (host === pattern) isBypassedFlag = true;
		bypassedMap?.set(host, isBypassedFlag);
		return isBypassedFlag;
	}
	function loadNoProxy() {
		const noProxy = getEnvironmentValue(NO_PROXY);
		noProxyListLoaded = true;
		if (noProxy) return noProxy.split(",").map((item) => item.trim()).filter((item) => item.length);
		return [];
	}
	function getDefaultProxySettings(proxyUrl) {
		if (!proxyUrl) {
			proxyUrl = loadEnvironmentProxyValue();
			if (!proxyUrl) return;
		}
		const parsedUrl = new URL(proxyUrl);
		return {
			host: (parsedUrl.protocol ? parsedUrl.protocol + "//" : "") + parsedUrl.hostname,
			port: Number.parseInt(parsedUrl.port || "80"),
			username: parsedUrl.username,
			password: parsedUrl.password
		};
	}
	function getDefaultProxySettingsInternal() {
		const envProxy = loadEnvironmentProxyValue();
		return envProxy ? new URL(envProxy) : void 0;
	}
	function getUrlFromProxySettings(settings) {
		let parsedProxyUrl;
		try {
			parsedProxyUrl = new URL(settings.host);
		} catch {
			throw new Error(`Expecting a valid host string in proxy settings, but found "${settings.host}".`);
		}
		parsedProxyUrl.port = String(settings.port);
		if (settings.username) parsedProxyUrl.username = settings.username;
		if (settings.password) parsedProxyUrl.password = settings.password;
		return parsedProxyUrl;
	}
	function setProxyAgentOnRequest(request, cachedAgents, proxyUrl) {
		if (request.agent) return;
		const isInsecure = new URL(request.url).protocol !== "https:";
		if (request.tlsSettings) import_log.logger.warning("TLS settings are not supported in combination with custom Proxy, certificates provided to the client will be ignored.");
		if (isInsecure) {
			if (!cachedAgents.httpProxyAgent) cachedAgents.httpProxyAgent = new import_http_proxy_agent.HttpProxyAgent(proxyUrl);
			request.agent = cachedAgents.httpProxyAgent;
		} else {
			if (!cachedAgents.httpsProxyAgent) cachedAgents.httpsProxyAgent = new import_https_proxy_agent.HttpsProxyAgent(proxyUrl);
			request.agent = cachedAgents.httpsProxyAgent;
		}
	}
	function proxyPolicy(proxySettings, options) {
		if (!noProxyListLoaded) globalNoProxyList.push(...loadNoProxy());
		const defaultProxy = proxySettings ? getUrlFromProxySettings(proxySettings) : getDefaultProxySettingsInternal();
		const cachedAgents = {};
		return {
			name: proxyPolicyName,
			async sendRequest(request, next) {
				if (!request.proxySettings && defaultProxy && !isBypassed(request.url, options?.customNoProxyList ?? globalNoProxyList, options?.customNoProxyList ? void 0 : globalBypassedMap)) setProxyAgentOnRequest(request, cachedAgents, defaultProxy);
				else if (request.proxySettings) setProxyAgentOnRequest(request, cachedAgents, getUrlFromProxySettings(request.proxySettings));
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		getDefaultProxySettings,
		globalNoProxyList,
		loadNoProxy,
		proxyPolicy,
		proxyPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/decompressResponsePolicy.js
var require_decompressResponsePolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var decompressResponsePolicy_exports = {};
	__export(decompressResponsePolicy_exports, {
		decompressResponsePolicy: () => decompressResponsePolicy,
		decompressResponsePolicyName: () => decompressResponsePolicyName
	});
	module.exports = __toCommonJS(decompressResponsePolicy_exports);
	var decompressResponsePolicyName = "decompressResponsePolicy";
	function decompressResponsePolicy() {
		return {
			name: decompressResponsePolicyName,
			async sendRequest(request, next) {
				if (request.method !== "HEAD") request.headers.set("Accept-Encoding", "gzip,deflate");
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		decompressResponsePolicy,
		decompressResponsePolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/redirectPolicy.js
var require_redirectPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var redirectPolicy_exports = {};
	__export(redirectPolicy_exports, {
		redirectPolicy: () => redirectPolicy,
		redirectPolicyName: () => redirectPolicyName
	});
	module.exports = __toCommonJS(redirectPolicy_exports);
	var import_log = require_log$2();
	var redirectPolicyName = "redirectPolicy";
	var allowedRedirect = ["GET", "HEAD"];
	function redirectPolicy(options = {}) {
		const { maxRetries = 20, allowCrossOriginRedirects = false } = options;
		return {
			name: redirectPolicyName,
			async sendRequest(request, next) {
				return handleRedirect(next, await next(request), maxRetries, allowCrossOriginRedirects);
			}
		};
	}
	async function handleRedirect(next, response, maxRetries, allowCrossOriginRedirects, currentRetries = 0) {
		const { request, status, headers } = response;
		const locationHeader = headers.get("location");
		if (locationHeader && (status === 300 || status === 301 && allowedRedirect.includes(request.method) || status === 302 && allowedRedirect.includes(request.method) || status === 303 && request.method === "POST" || status === 307) && currentRetries < maxRetries) {
			const url = new URL(locationHeader, request.url);
			if (!allowCrossOriginRedirects) {
				const originalUrl = new URL(request.url);
				if (url.origin !== originalUrl.origin) {
					import_log.logger.verbose(`Skipping cross-origin redirect from ${originalUrl.origin} to ${url.origin}.`);
					return response;
				}
			}
			request.url = url.toString();
			if (status === 303) {
				request.method = "GET";
				request.headers.delete("Content-Length");
				delete request.body;
			}
			request.headers.delete("Authorization");
			return handleRedirect(next, await next(request), maxRetries, allowCrossOriginRedirects, currentRetries + 1);
		}
		return response;
	}
	0 && (module.exports = {
		redirectPolicy,
		redirectPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/platformPolicies.js
var require_platformPolicies = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var platformPolicies_exports = {};
	__export(platformPolicies_exports, { addPlatformPolicies: () => addPlatformPolicies });
	module.exports = __toCommonJS(platformPolicies_exports);
	var import_agentPolicy = require_agentPolicy$1();
	var import_tlsPolicy = require_tlsPolicy$1();
	var import_proxy = require_proxyPolicy$1();
	var import_decompress = require_decompressResponsePolicy$1();
	var import_redirectPolicy = require_redirectPolicy$1();
	function addPlatformPolicies(pipeline, options) {
		if (options.agent) pipeline.addPolicy((0, import_agentPolicy.agentPolicy)(options.agent));
		if (options.tlsOptions) pipeline.addPolicy((0, import_tlsPolicy.tlsPolicy)(options.tlsOptions));
		pipeline.addPolicy((0, import_proxy.proxyPolicy)(options.proxyOptions));
		pipeline.addPolicy((0, import_decompress.decompressResponsePolicy)());
		pipeline.addPolicy((0, import_redirectPolicy.redirectPolicy)(options.redirectOptions), { afterPhase: "Retry" });
	}
	0 && (module.exports = { addPlatformPolicies });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/typeGuards-node.js
var require_typeGuards_node = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var typeGuards_node_exports = {};
	__export(typeGuards_node_exports, {
		isNodeReadableStream: () => isNodeReadableStream,
		isWebReadableStream: () => isWebReadableStream
	});
	module.exports = __toCommonJS(typeGuards_node_exports);
	var import_stream$1 = __require("stream");
	function isNodeReadableStream(x) {
		return x instanceof import_stream$1.Readable;
	}
	function isWebReadableStream(x) {
		return x instanceof ReadableStream;
	}
	0 && (module.exports = {
		isNodeReadableStream,
		isWebReadableStream
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/typeGuards.js
var require_typeGuards = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var typeGuards_exports = {};
	__export(typeGuards_exports, {
		isBinaryBody: () => isBinaryBody,
		isBlob: () => isBlob,
		isNodeReadableStream: () => import_typeGuards.isNodeReadableStream,
		isReadableStream: () => isReadableStream,
		isWebReadableStream: () => import_typeGuards.isWebReadableStream
	});
	module.exports = __toCommonJS(typeGuards_exports);
	var import_typeGuards = require_typeGuards_node();
	function isBinaryBody(body) {
		return body !== void 0 && (body instanceof Uint8Array || isReadableStream(body) || typeof body === "function" || body instanceof Blob);
	}
	function isReadableStream(x) {
		return (0, import_typeGuards.isNodeReadableStream)(x) || (0, import_typeGuards.isWebReadableStream)(x);
	}
	function isBlob(x) {
		return x instanceof Blob;
	}
	0 && (module.exports = {
		isBinaryBody,
		isBlob,
		isNodeReadableStream,
		isReadableStream,
		isWebReadableStream
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/concat.js
var require_concat = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var concat_exports = {};
	__export(concat_exports, { concat: () => concat });
	module.exports = __toCommonJS(concat_exports);
	var import_stream = __require("stream");
	var import_typeGuards = require_typeGuards();
	async function* streamAsyncIterator() {
		const reader = this.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) return;
				yield value;
			}
		} finally {
			reader.releaseLock();
		}
	}
	function makeAsyncIterable(webStream) {
		if (!webStream[Symbol.asyncIterator]) webStream[Symbol.asyncIterator] = streamAsyncIterator.bind(webStream);
		if (!webStream.values) webStream.values = streamAsyncIterator.bind(webStream);
	}
	function ensureNodeStream(stream) {
		if (stream instanceof ReadableStream) {
			makeAsyncIterable(stream);
			return import_stream.Readable.fromWeb(stream);
		} else return stream;
	}
	function toStream(source) {
		if (source instanceof Uint8Array) return import_stream.Readable.from(Buffer.from(source));
		else if ((0, import_typeGuards.isBlob)(source)) return ensureNodeStream(source.stream());
		else return ensureNodeStream(source);
	}
	async function concat(sources) {
		return function() {
			const streams = sources.map((x) => typeof x === "function" ? x() : x).map(toStream);
			return import_stream.Readable.from((async function* () {
				for (const stream of streams) for await (const chunk of stream) yield chunk;
			})());
		};
	}
	0 && (module.exports = { concat });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/multipartPolicy.js
var require_multipartPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var multipartPolicy_exports = {};
	__export(multipartPolicy_exports, {
		multipartPolicy: () => multipartPolicy,
		multipartPolicyName: () => multipartPolicyName
	});
	module.exports = __toCommonJS(multipartPolicy_exports);
	var import_bytesEncoding = require_bytesEncoding();
	var import_typeGuards = require_typeGuards();
	var import_uuid = require_uuidUtils();
	var import_concat = require_concat();
	function generateBoundary() {
		return `----AzSDKFormBoundary${(0, import_uuid.randomUUID)()}`;
	}
	function encodeHeaders(headers) {
		let result = "";
		for (const [key, value] of headers) result += `${key}: ${value}\r
`;
		return result;
	}
	function getLength(source) {
		if (source instanceof Uint8Array) return source.byteLength;
		else if ((0, import_typeGuards.isBlob)(source)) return source.size === -1 ? void 0 : source.size;
		else return;
	}
	function getTotalLength(sources) {
		let total = 0;
		for (const source of sources) {
			const partLength = getLength(source);
			if (partLength === void 0) return;
			else total += partLength;
		}
		return total;
	}
	async function buildRequestBody(request, parts, boundary) {
		const sources = [
			(0, import_bytesEncoding.stringToUint8Array)(`--${boundary}`, "utf-8"),
			...parts.flatMap((part) => [
				(0, import_bytesEncoding.stringToUint8Array)("\r\n", "utf-8"),
				(0, import_bytesEncoding.stringToUint8Array)(encodeHeaders(part.headers), "utf-8"),
				(0, import_bytesEncoding.stringToUint8Array)("\r\n", "utf-8"),
				part.body,
				(0, import_bytesEncoding.stringToUint8Array)(`\r
--${boundary}`, "utf-8")
			]),
			(0, import_bytesEncoding.stringToUint8Array)("--\r\n\r\n", "utf-8")
		];
		const contentLength = getTotalLength(sources);
		if (contentLength) request.headers.set("Content-Length", contentLength);
		request.body = await (0, import_concat.concat)(sources);
	}
	var multipartPolicyName = "multipartPolicy";
	var maxBoundaryLength = 70;
	var validBoundaryCharacters = /* @__PURE__ */ new Set(`abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'()+,-./:=?`);
	function assertValidBoundary(boundary) {
		if (boundary.length > maxBoundaryLength) throw new Error(`Multipart boundary "${boundary}" exceeds maximum length of 70 characters`);
		if (Array.from(boundary).some((x) => !validBoundaryCharacters.has(x))) throw new Error(`Multipart boundary "${boundary}" contains invalid characters`);
	}
	function multipartPolicy() {
		return {
			name: multipartPolicyName,
			async sendRequest(request, next) {
				if (!request.multipartBody) return next(request);
				if (request.body) throw new Error("multipartBody and regular body cannot be set at the same time");
				let boundary = request.multipartBody.boundary;
				const contentTypeHeader = request.headers.get("Content-Type") ?? "multipart/mixed";
				const parsedHeader = contentTypeHeader.match(/^(multipart\/[^ ;]+)(?:; *boundary=(.+))?$/);
				if (!parsedHeader) throw new Error(`Got multipart request body, but content-type header was not multipart: ${contentTypeHeader}`);
				const [, contentType, parsedBoundary] = parsedHeader;
				if (parsedBoundary && boundary && parsedBoundary !== boundary) throw new Error(`Multipart boundary was specified as ${parsedBoundary} in the header, but got ${boundary} in the request body`);
				boundary ??= parsedBoundary;
				if (boundary) assertValidBoundary(boundary);
				else boundary = generateBoundary();
				request.headers.set("Content-Type", `${contentType}; boundary=${boundary}`);
				await buildRequestBody(request, request.multipartBody.parts, boundary);
				request.multipartBody = void 0;
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		multipartPolicy,
		multipartPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/createPipelineFromOptions.js
var require_createPipelineFromOptions$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var createPipelineFromOptions_exports = {};
	__export(createPipelineFromOptions_exports, { createPipelineFromOptions: () => createPipelineFromOptions });
	module.exports = __toCommonJS(createPipelineFromOptions_exports);
	var import_logPolicy = require_logPolicy$1();
	var import_pipeline = require_pipeline$2();
	var import_userAgentPolicy = require_userAgentPolicy$1();
	var import_defaultRetryPolicy = require_defaultRetryPolicy$1();
	var import_formDataPolicy = require_formDataPolicy$1();
	var import_policies = require_platformPolicies();
	var import_multipartPolicy = require_multipartPolicy$1();
	function createPipelineFromOptions(options) {
		const pipeline = (0, import_pipeline.createEmptyPipeline)();
		(0, import_policies.addPlatformPolicies)(pipeline, options);
		pipeline.addPolicy((0, import_formDataPolicy.formDataPolicy)(), { beforePolicies: [import_multipartPolicy.multipartPolicyName] });
		pipeline.addPolicy((0, import_userAgentPolicy.userAgentPolicy)(options.userAgentOptions));
		pipeline.addPolicy((0, import_multipartPolicy.multipartPolicy)(), { afterPhase: "Deserialize" });
		pipeline.addPolicy((0, import_defaultRetryPolicy.defaultRetryPolicy)(options.retryOptions), { phase: "Retry" });
		pipeline.addPolicy((0, import_logPolicy.logPolicy)(options.loggingOptions), { afterPhase: "Sign" });
		return pipeline;
	}
	0 && (module.exports = { createPipelineFromOptions });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/client/apiVersionPolicy.js
var require_apiVersionPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var apiVersionPolicy_exports = {};
	__export(apiVersionPolicy_exports, {
		apiVersionPolicy: () => apiVersionPolicy,
		apiVersionPolicyName: () => apiVersionPolicyName
	});
	module.exports = __toCommonJS(apiVersionPolicy_exports);
	var apiVersionPolicyName = "ApiVersionPolicy";
	function apiVersionPolicy(options) {
		return {
			name: apiVersionPolicyName,
			sendRequest: (req, next) => {
				const url = new URL(req.url);
				if (!url.searchParams.get("api-version") && options.apiVersion) req.url = `${req.url}${Array.from(url.searchParams.keys()).length > 0 ? "&" : "?"}api-version=${options.apiVersion}`;
				return next(req);
			}
		};
	}
	0 && (module.exports = {
		apiVersionPolicy,
		apiVersionPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/auth/credentials.js
var require_credentials = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var credentials_exports = {};
	__export(credentials_exports, {
		isApiKeyCredential: () => isApiKeyCredential,
		isBasicCredential: () => isBasicCredential,
		isBearerTokenCredential: () => isBearerTokenCredential,
		isOAuth2TokenCredential: () => isOAuth2TokenCredential
	});
	module.exports = __toCommonJS(credentials_exports);
	function isOAuth2TokenCredential(credential) {
		return "getOAuth2Token" in credential;
	}
	function isBearerTokenCredential(credential) {
		return "getBearerToken" in credential;
	}
	function isBasicCredential(credential) {
		return "username" in credential && "password" in credential;
	}
	function isApiKeyCredential(credential) {
		return "key" in credential;
	}
	0 && (module.exports = {
		isApiKeyCredential,
		isBasicCredential,
		isBearerTokenCredential,
		isOAuth2TokenCredential
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/auth/checkInsecureConnection.js
var require_checkInsecureConnection = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var checkInsecureConnection_exports = {};
	__export(checkInsecureConnection_exports, { ensureSecureConnection: () => ensureSecureConnection });
	module.exports = __toCommonJS(checkInsecureConnection_exports);
	var import_log = require_log$2();
	var import_env = require_env();
	var insecureConnectionWarningEmmitted = false;
	function allowInsecureConnection(request, options) {
		if (options.allowInsecureConnection && request.allowInsecureConnection) {
			const url = new URL(request.url);
			if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
		}
		return false;
	}
	function emitInsecureConnectionWarning() {
		const warning = "Sending token over insecure transport. Assume any token issued is compromised.";
		import_log.logger.warning(warning);
		if (!insecureConnectionWarningEmmitted) {
			insecureConnectionWarningEmmitted = true;
			(0, import_env.emitNodeWarning)(warning);
		}
	}
	function ensureSecureConnection(request, options) {
		if (!request.url.toLowerCase().startsWith("https://")) if (allowInsecureConnection(request, options)) emitInsecureConnectionWarning();
		else throw new Error("Authentication is not permitted for non-TLS protected (non-https) URLs when allowInsecureConnection is false.");
	}
	0 && (module.exports = { ensureSecureConnection });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/auth/apiKeyAuthenticationPolicy.js
var require_apiKeyAuthenticationPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var apiKeyAuthenticationPolicy_exports = {};
	__export(apiKeyAuthenticationPolicy_exports, {
		apiKeyAuthenticationPolicy: () => apiKeyAuthenticationPolicy,
		apiKeyAuthenticationPolicyName: () => apiKeyAuthenticationPolicyName
	});
	module.exports = __toCommonJS(apiKeyAuthenticationPolicy_exports);
	var import_checkInsecureConnection = require_checkInsecureConnection();
	var apiKeyAuthenticationPolicyName = "apiKeyAuthenticationPolicy";
	function apiKeyAuthenticationPolicy(options) {
		return {
			name: apiKeyAuthenticationPolicyName,
			async sendRequest(request, next) {
				(0, import_checkInsecureConnection.ensureSecureConnection)(request, options);
				const scheme = (request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "apiKey");
				if (!scheme) return next(request);
				if (scheme.apiKeyLocation !== "header") throw new Error(`Unsupported API key location: ${scheme.apiKeyLocation}`);
				request.headers.set(scheme.name, options.credential.key);
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		apiKeyAuthenticationPolicy,
		apiKeyAuthenticationPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/auth/basicAuthenticationPolicy.js
var require_basicAuthenticationPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var basicAuthenticationPolicy_exports = {};
	__export(basicAuthenticationPolicy_exports, {
		basicAuthenticationPolicy: () => basicAuthenticationPolicy,
		basicAuthenticationPolicyName: () => basicAuthenticationPolicyName
	});
	module.exports = __toCommonJS(basicAuthenticationPolicy_exports);
	var import_bytesEncoding = require_bytesEncoding();
	var import_checkInsecureConnection = require_checkInsecureConnection();
	var basicAuthenticationPolicyName = "bearerAuthenticationPolicy";
	function basicAuthenticationPolicy(options) {
		return {
			name: basicAuthenticationPolicyName,
			async sendRequest(request, next) {
				(0, import_checkInsecureConnection.ensureSecureConnection)(request, options);
				if (!(request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "http" && x.scheme === "basic")) return next(request);
				const { username, password } = options.credential;
				const headerValue = (0, import_bytesEncoding.uint8ArrayToString)((0, import_bytesEncoding.stringToUint8Array)(`${username}:${password}`, "utf-8"), "base64");
				request.headers.set("Authorization", `Basic ${headerValue}`);
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		basicAuthenticationPolicy,
		basicAuthenticationPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/auth/bearerAuthenticationPolicy.js
var require_bearerAuthenticationPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var bearerAuthenticationPolicy_exports = {};
	__export(bearerAuthenticationPolicy_exports, {
		bearerAuthenticationPolicy: () => bearerAuthenticationPolicy,
		bearerAuthenticationPolicyName: () => bearerAuthenticationPolicyName
	});
	module.exports = __toCommonJS(bearerAuthenticationPolicy_exports);
	var import_checkInsecureConnection = require_checkInsecureConnection();
	var bearerAuthenticationPolicyName = "bearerAuthenticationPolicy";
	function bearerAuthenticationPolicy(options) {
		return {
			name: bearerAuthenticationPolicyName,
			async sendRequest(request, next) {
				(0, import_checkInsecureConnection.ensureSecureConnection)(request, options);
				if (!(request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "http" && x.scheme === "bearer")) return next(request);
				const token = await options.credential.getBearerToken({ abortSignal: request.abortSignal });
				request.headers.set("Authorization", `Bearer ${token}`);
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		bearerAuthenticationPolicy,
		bearerAuthenticationPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/auth/oauth2AuthenticationPolicy.js
var require_oauth2AuthenticationPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var oauth2AuthenticationPolicy_exports = {};
	__export(oauth2AuthenticationPolicy_exports, {
		oauth2AuthenticationPolicy: () => oauth2AuthenticationPolicy,
		oauth2AuthenticationPolicyName: () => oauth2AuthenticationPolicyName
	});
	module.exports = __toCommonJS(oauth2AuthenticationPolicy_exports);
	var import_checkInsecureConnection = require_checkInsecureConnection();
	var oauth2AuthenticationPolicyName = "oauth2AuthenticationPolicy";
	function oauth2AuthenticationPolicy(options) {
		return {
			name: oauth2AuthenticationPolicyName,
			async sendRequest(request, next) {
				(0, import_checkInsecureConnection.ensureSecureConnection)(request, options);
				const scheme = (request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "oauth2");
				if (!scheme) return next(request);
				const token = await options.credential.getOAuth2Token(scheme.flows, { abortSignal: request.abortSignal });
				request.headers.set("Authorization", `Bearer ${token}`);
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		oauth2AuthenticationPolicy,
		oauth2AuthenticationPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/client/clientHelpers.js
var require_clientHelpers = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var clientHelpers_exports = {};
	__export(clientHelpers_exports, {
		createDefaultPipeline: () => createDefaultPipeline,
		getCachedDefaultHttpsClient: () => getCachedDefaultHttpsClient
	});
	module.exports = __toCommonJS(clientHelpers_exports);
	var import_httpClient = require_defaultHttpClient$1();
	var import_createPipelineFromOptions = require_createPipelineFromOptions$1();
	var import_apiVersionPolicy = require_apiVersionPolicy();
	var import_credentials = require_credentials();
	var import_apiKeyAuthenticationPolicy = require_apiKeyAuthenticationPolicy();
	var import_basicAuthenticationPolicy = require_basicAuthenticationPolicy();
	var import_bearerAuthenticationPolicy = require_bearerAuthenticationPolicy();
	var import_oauth2AuthenticationPolicy = require_oauth2AuthenticationPolicy();
	var cachedHttpClient;
	function createDefaultPipeline(options = {}) {
		const pipeline = (0, import_createPipelineFromOptions.createPipelineFromOptions)(options);
		pipeline.addPolicy((0, import_apiVersionPolicy.apiVersionPolicy)(options));
		const { credential, authSchemes, allowInsecureConnection } = options;
		if (credential) {
			if ((0, import_credentials.isApiKeyCredential)(credential)) pipeline.addPolicy((0, import_apiKeyAuthenticationPolicy.apiKeyAuthenticationPolicy)({
				authSchemes,
				credential,
				allowInsecureConnection
			}));
			else if ((0, import_credentials.isBasicCredential)(credential)) pipeline.addPolicy((0, import_basicAuthenticationPolicy.basicAuthenticationPolicy)({
				authSchemes,
				credential,
				allowInsecureConnection
			}));
			else if ((0, import_credentials.isBearerTokenCredential)(credential)) pipeline.addPolicy((0, import_bearerAuthenticationPolicy.bearerAuthenticationPolicy)({
				authSchemes,
				credential,
				allowInsecureConnection
			}));
			else if ((0, import_credentials.isOAuth2TokenCredential)(credential)) pipeline.addPolicy((0, import_oauth2AuthenticationPolicy.oauth2AuthenticationPolicy)({
				authSchemes,
				credential,
				allowInsecureConnection
			}));
		}
		return pipeline;
	}
	function getCachedDefaultHttpsClient() {
		if (!cachedHttpClient) cachedHttpClient = (0, import_httpClient.createDefaultHttpClient)();
		return cachedHttpClient;
	}
	0 && (module.exports = {
		createDefaultPipeline,
		getCachedDefaultHttpsClient
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/client/multipart.js
var require_multipart = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var multipart_exports = {};
	__export(multipart_exports, {
		buildBodyPart: () => buildBodyPart,
		buildMultipartBody: () => buildMultipartBody
	});
	module.exports = __toCommonJS(multipart_exports);
	var import_restError = require_restError$2();
	var import_httpHeaders = require_httpHeaders$1();
	var import_bytesEncoding = require_bytesEncoding();
	var import_typeGuards = require_typeGuards();
	function getHeaderValue(descriptor, headerName) {
		if (descriptor.headers) {
			const actualHeaderName = Object.keys(descriptor.headers).find((x) => x.toLowerCase() === headerName.toLowerCase());
			if (actualHeaderName) return descriptor.headers[actualHeaderName];
		}
	}
	function getPartContentType(descriptor) {
		const contentTypeHeader = getHeaderValue(descriptor, "content-type");
		if (contentTypeHeader) return contentTypeHeader;
		if (descriptor.contentType === null) return;
		if (descriptor.contentType) return descriptor.contentType;
		const { body } = descriptor;
		if (body === null || body === void 0) return;
		if (typeof body === "string" || typeof body === "number" || typeof body === "boolean") return "text/plain; charset=UTF-8";
		if (body instanceof Blob) return body.type || "application/octet-stream";
		if ((0, import_typeGuards.isBinaryBody)(body)) return "application/octet-stream";
		return "application/json";
	}
	function escapeDispositionField(value) {
		return JSON.stringify(value);
	}
	function getContentDisposition(descriptor) {
		const contentDispositionHeader = getHeaderValue(descriptor, "content-disposition");
		if (contentDispositionHeader) return contentDispositionHeader;
		if (descriptor.dispositionType === void 0 && descriptor.name === void 0 && descriptor.filename === void 0) return;
		let disposition = descriptor.dispositionType ?? "form-data";
		if (descriptor.name) disposition += `; name=${escapeDispositionField(descriptor.name)}`;
		let filename = void 0;
		if (descriptor.filename) filename = descriptor.filename;
		else if (typeof File !== "undefined" && descriptor.body instanceof File) {
			const filenameFromFile = descriptor.body.name;
			if (filenameFromFile !== "") filename = filenameFromFile;
		}
		if (filename) disposition += `; filename=${escapeDispositionField(filename)}`;
		return disposition;
	}
	function normalizeBody(body, contentType) {
		if (body === void 0) return new Uint8Array([]);
		if ((0, import_typeGuards.isBinaryBody)(body)) return body;
		if (typeof body === "string" || typeof body === "number" || typeof body === "boolean") return (0, import_bytesEncoding.stringToUint8Array)(String(body), "utf-8");
		if (contentType && /application\/(.+\+)?json(;.+)?/i.test(String(contentType))) return (0, import_bytesEncoding.stringToUint8Array)(JSON.stringify(body), "utf-8");
		throw new import_restError.RestError(`Unsupported body/content-type combination: ${body}, ${contentType}`);
	}
	function buildBodyPart(descriptor) {
		const contentType = getPartContentType(descriptor);
		const contentDisposition = getContentDisposition(descriptor);
		const headers = (0, import_httpHeaders.createHttpHeaders)(descriptor.headers ?? {});
		if (contentType) headers.set("content-type", contentType);
		if (contentDisposition) headers.set("content-disposition", contentDisposition);
		return {
			headers,
			body: normalizeBody(descriptor.body, contentType)
		};
	}
	function buildMultipartBody(parts) {
		return { parts: parts.map(buildBodyPart) };
	}
	0 && (module.exports = {
		buildBodyPart,
		buildMultipartBody
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/client/sendRequest.js
var require_sendRequest = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var sendRequest_exports = {};
	__export(sendRequest_exports, {
		getRequestBody: () => getRequestBody,
		sendRequest: () => sendRequest
	});
	module.exports = __toCommonJS(sendRequest_exports);
	var import_restError = require_restError$2();
	var import_httpHeaders = require_httpHeaders$1();
	var import_pipelineRequest = require_pipelineRequest$1();
	var import_clientHelpers = require_clientHelpers();
	var import_typeGuards = require_typeGuards();
	var import_multipart = require_multipart();
	async function sendRequest(method, url, pipeline, options = {}, customHttpClient) {
		const httpClient = customHttpClient ?? (0, import_clientHelpers.getCachedDefaultHttpsClient)();
		const request = buildPipelineRequest(method, url, options);
		try {
			const response = await pipeline.sendRequest(httpClient, request);
			const headers = response.headers.toJSON();
			const stream = response.readableStreamBody ?? response.browserStreamBody;
			const parsedBody = options.responseAsStream || stream !== void 0 ? void 0 : getResponseBody(response);
			const body = stream ?? parsedBody;
			if (options?.onResponse) options.onResponse({
				...response,
				request,
				rawHeaders: headers,
				parsedBody
			});
			return {
				request,
				headers,
				status: `${response.status}`,
				body
			};
		} catch (e) {
			if ((0, import_restError.isRestError)(e) && e.response && options.onResponse) {
				const { response } = e;
				const rawHeaders = response.headers.toJSON();
				options?.onResponse({
					...response,
					request,
					rawHeaders
				}, e);
			}
			throw e;
		}
	}
	function getRequestContentType(options = {}) {
		if (options.contentType) return options.contentType;
		const headerContentType = options.headers?.["content-type"];
		if (typeof headerContentType === "string") return headerContentType;
		return getContentType(options.body);
	}
	function getContentType(body) {
		if (body === void 0) return;
		if (ArrayBuffer.isView(body)) return "application/octet-stream";
		if ((0, import_typeGuards.isBlob)(body) && body.type) return body.type;
		if (typeof body === "string") try {
			JSON.parse(body);
			return "application/json";
		} catch (error) {
			return;
		}
		return "application/json";
	}
	function buildPipelineRequest(method, url, options = {}) {
		const requestContentType = getRequestContentType(options);
		const { body, multipartBody } = getRequestBody(options.body, requestContentType);
		const accept = options.accept ?? options.headers?.accept ?? (options.noDefaultAcceptHeader ? void 0 : "application/json");
		const headers = (0, import_httpHeaders.createHttpHeaders)({
			...options.headers ? options.headers : {},
			...accept !== void 0 && { accept },
			...requestContentType && { "content-type": requestContentType }
		});
		const { allowInsecureConnection, abortSignal, onUploadProgress, onDownloadProgress, timeout, responseAsStream, noDefaultAcceptHeader: _noDefaultAcceptHeader, url: _url, method: _method, body: _body, multipartBody: _multiBody, headers: _headers, ...rest } = options;
		const request = (0, import_pipelineRequest.createPipelineRequest)({
			url,
			method,
			body,
			multipartBody,
			headers,
			allowInsecureConnection,
			abortSignal,
			onUploadProgress,
			onDownloadProgress,
			timeout,
			enableBrowserStreams: true,
			streamResponseStatusCodes: responseAsStream ? /* @__PURE__ */ new Set([Number.POSITIVE_INFINITY]) : void 0
		});
		Object.assign(request, rest);
		return request;
	}
	function getRequestBody(body, contentType = "") {
		if (body === void 0) return { body: void 0 };
		if (typeof FormData !== "undefined" && body instanceof FormData) return { body };
		if ((0, import_typeGuards.isBlob)(body)) return { body };
		if ((0, import_typeGuards.isReadableStream)(body)) return { body };
		if (typeof body === "function") return { body };
		if (ArrayBuffer.isView(body)) return { body: body instanceof Uint8Array ? body : JSON.stringify(body) };
		switch (contentType.split(";")[0]) {
			case "application/json": return { body: JSON.stringify(body) };
			case "multipart/form-data":
				if (Array.isArray(body)) return { multipartBody: (0, import_multipart.buildMultipartBody)(body) };
				return { body: JSON.stringify(body) };
			case "text/plain": return { body: String(body) };
			default:
				if (typeof body === "string") return { body };
				return { body: JSON.stringify(body) };
		}
	}
	function getResponseBody(response) {
		const firstType = (response.headers.get("content-type") ?? "").split(";")[0];
		const bodyToParse = response.bodyAsText ?? "";
		if (firstType === "text/plain") return String(bodyToParse);
		try {
			return bodyToParse ? JSON.parse(bodyToParse) : void 0;
		} catch (error) {
			if (firstType === "application/json") throw createParseError(response, error);
			return String(bodyToParse);
		}
	}
	function createParseError(response, err) {
		const msg = `Error "${err}" occurred while parsing the response body - ${response.bodyAsText}.`;
		const errCode = err.code ?? import_restError.RestError.PARSE_ERROR;
		return new import_restError.RestError(msg, {
			code: errCode,
			statusCode: response.status,
			request: response.request,
			response
		});
	}
	0 && (module.exports = {
		getRequestBody,
		sendRequest
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/client/urlHelpers.js
var require_urlHelpers$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var urlHelpers_exports = {};
	__export(urlHelpers_exports, {
		appendQueryParams: () => appendQueryParams,
		buildBaseUrl: () => buildBaseUrl,
		buildRequestUrl: () => buildRequestUrl,
		replaceAll: () => replaceAll
	});
	module.exports = __toCommonJS(urlHelpers_exports);
	function isQueryParameterWithOptions(x) {
		if (typeof x !== "object" || x === null || !Object.hasOwn(x, "value")) return false;
		return typeof x.value?.toString === "function";
	}
	function buildRequestUrl(endpoint, routePath, pathParameters, options = {}) {
		if (routePath.startsWith("https://") || routePath.startsWith("http://")) return routePath;
		endpoint = buildBaseUrl(endpoint, options);
		const updatedRoutePath = buildRoutePath(routePath, pathParameters, options);
		const requestUrl = appendQueryParams(appendPath(endpoint, updatedRoutePath), options);
		return new URL(requestUrl).toString();
	}
	function appendPath(endpoint, pathToAppend) {
		const endpointSearchStart = endpoint.indexOf("?");
		const pathSearchStart = pathToAppend.indexOf("?");
		const endpointParts = endpointSearchStart !== -1 ? [endpoint.substring(0, endpointSearchStart), endpoint.substring(endpointSearchStart + 1)] : [endpoint, ""];
		const pathParts = pathSearchStart !== -1 ? [pathToAppend.substring(0, pathSearchStart), pathToAppend.substring(pathSearchStart + 1)] : [pathToAppend, ""];
		const combinedSearch = [endpointParts[1], pathParts[1].replaceAll("?", "&")].filter(Boolean).join("&");
		const baseEndpoint = endpointParts[0].replace(/(^[^:]+:\/\/[^/]+)\/\/+/, "$1/");
		const basePathToAppend = pathParts[0];
		let combinedUrl = baseEndpoint;
		if (!baseEndpoint.endsWith("/") && !basePathToAppend.startsWith("/") && basePathToAppend !== "") combinedUrl += `/${basePathToAppend}`;
		else if (baseEndpoint.endsWith("/") && basePathToAppend.startsWith("/")) combinedUrl += basePathToAppend.substring(1);
		else combinedUrl += basePathToAppend;
		if (combinedSearch) combinedUrl += `?${combinedSearch}`;
		return combinedUrl;
	}
	function getQueryParamValue(key, allowReserved, style, param) {
		let separator;
		if (style === "pipeDelimited") separator = "|";
		else if (style === "spaceDelimited") separator = "%20";
		else separator = ",";
		let paramValues;
		if (Array.isArray(param)) paramValues = param;
		else if (typeof param === "object" && param.toString === Object.prototype.toString) paramValues = Object.entries(param).flat();
		else paramValues = [param];
		const value = paramValues.map((p) => {
			if (p === null || p === void 0) return "";
			if (!p.toString || typeof p.toString !== "function") throw new Error(`Query parameters must be able to be represented as string, ${key} can't`);
			const rawValue = p.toISOString !== void 0 ? p.toISOString() : p.toString();
			return allowReserved ? rawValue : encodeURIComponent(rawValue);
		}).join(separator);
		return `${allowReserved ? key : encodeURIComponent(key)}=${value}`;
	}
	function simpleParseQueryParams(queryString) {
		const result = /* @__PURE__ */ new Map();
		if (!queryString || queryString[0] !== "?") return result;
		queryString = queryString.slice(1);
		const pairs = queryString.split("&");
		for (const pair of pairs) {
			const eqIndex = pair.indexOf("=");
			const name = eqIndex === -1 ? pair : pair.substring(0, eqIndex);
			const value = eqIndex === -1 ? "" : pair.substring(eqIndex + 1);
			const existingValue = result.get(name);
			if (existingValue !== void 0) if (Array.isArray(existingValue)) existingValue.push(value);
			else result.set(name, [existingValue, value]);
			else result.set(name, value);
		}
		return result;
	}
	function appendQueryParams(url, options = {}) {
		if (!options.queryParameters) return url;
		const parsedUrl = new URL(url);
		const queryParams = options.queryParameters;
		const existingParams = simpleParseQueryParams(parsedUrl.search);
		const newParamStrings = [];
		for (const key of Object.keys(queryParams)) {
			const param = queryParams[key];
			if (param === void 0 || param === null) continue;
			const hasMetadata = isQueryParameterWithOptions(param);
			const rawValue = hasMetadata ? param.value : param;
			const explode = hasMetadata ? param.explode ?? false : false;
			const style = hasMetadata && param.style ? param.style : "form";
			if (explode) if (Array.isArray(rawValue)) for (const item of rawValue) newParamStrings.push(getQueryParamValue(key, options.skipUrlEncoding ?? false, style, item));
			else if (rawValue !== null && typeof rawValue === "object") for (const [actualKey, value] of Object.entries(rawValue)) newParamStrings.push(getQueryParamValue(actualKey, options.skipUrlEncoding ?? false, style, value));
			else throw new Error("explode can only be set to true for objects and arrays");
			else newParamStrings.push(getQueryParamValue(key, options.skipUrlEncoding ?? false, style, rawValue));
		}
		for (const paramString of newParamStrings) {
			const eqIndex = paramString.indexOf("=");
			const name = paramString.substring(0, eqIndex);
			const value = paramString.substring(eqIndex + 1);
			const existingValue = existingParams.get(name);
			if (existingValue !== void 0) {
				if (Array.isArray(existingValue)) {
					if (!existingValue.includes(value)) existingValue.push(value);
				} else if (existingValue !== value) existingParams.set(name, [existingValue, value]);
			} else existingParams.set(name, value);
		}
		const searchPieces = [];
		for (const [name, value] of existingParams) if (Array.isArray(value)) for (const subValue of value) searchPieces.push(`${name}=${subValue}`);
		else searchPieces.push(`${name}=${value}`);
		parsedUrl.search = searchPieces.length ? `?${searchPieces.join("&")}` : "";
		return parsedUrl.toString();
	}
	function buildBaseUrl(endpoint, options) {
		if (!options.pathParameters) return endpoint;
		const pathParams = options.pathParameters;
		for (const [key, param] of Object.entries(pathParams)) {
			if (param === void 0 || param === null) throw new Error(`Path parameters ${key} must not be undefined or null`);
			if (!param.toString || typeof param.toString !== "function") throw new Error(`Path parameters must be able to be represented as string, ${key} can't`);
			let value = param.toISOString !== void 0 ? param.toISOString() : String(param);
			if (!options.skipUrlEncoding) value = encodeURIComponent(param);
			endpoint = replaceAll(endpoint, `{${key}}`, value) ?? "";
		}
		return endpoint;
	}
	function buildRoutePath(routePath, pathParameters, options = {}) {
		for (const pathParam of pathParameters) {
			const allowReserved = typeof pathParam === "object" && (pathParam.allowReserved ?? false);
			let value = typeof pathParam === "object" ? pathParam.value : pathParam;
			if (!options.skipUrlEncoding && !allowReserved) value = encodeURIComponent(value);
			routePath = routePath.replace(/\{[\w-]+\}/, String(value));
		}
		return routePath;
	}
	function replaceAll(value, searchValue, replaceValue) {
		return !value || !searchValue ? value : value.split(searchValue).join(replaceValue || "");
	}
	0 && (module.exports = {
		appendQueryParams,
		buildBaseUrl,
		buildRequestUrl,
		replaceAll
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/client/getClient.js
var require_getClient = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var getClient_exports = {};
	__export(getClient_exports, { getClient: () => getClient });
	module.exports = __toCommonJS(getClient_exports);
	var import_clientHelpers = require_clientHelpers();
	var import_sendRequest = require_sendRequest();
	var import_urlHelpers = require_urlHelpers$1();
	var import_env = require_env();
	function getClient(endpoint, clientOptions = {}) {
		const pipeline = clientOptions.pipeline ?? (0, import_clientHelpers.createDefaultPipeline)(clientOptions);
		if (clientOptions.additionalPolicies?.length) for (const { policy, position } of clientOptions.additionalPolicies) {
			const afterPhase = position === "perRetry" ? "Sign" : void 0;
			pipeline.addPolicy(policy, { afterPhase });
		}
		const noDefaultAcceptHeader = clientOptions.internal?.noDefaultAcceptHeader ?? false;
		const { allowInsecureConnection, httpClient } = clientOptions;
		const endpointUrl = clientOptions.endpoint ?? endpoint;
		const client = (path, ...args) => {
			const getUrl = (requestOptions) => (0, import_urlHelpers.buildRequestUrl)(endpointUrl, path, args, {
				allowInsecureConnection,
				...requestOptions
			});
			return {
				get: (requestOptions = {}) => {
					return buildOperation("GET", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient, noDefaultAcceptHeader);
				},
				post: (requestOptions = {}) => {
					return buildOperation("POST", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient, noDefaultAcceptHeader);
				},
				put: (requestOptions = {}) => {
					return buildOperation("PUT", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient, noDefaultAcceptHeader);
				},
				patch: (requestOptions = {}) => {
					return buildOperation("PATCH", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient, noDefaultAcceptHeader);
				},
				delete: (requestOptions = {}) => {
					return buildOperation("DELETE", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient, noDefaultAcceptHeader);
				},
				head: (requestOptions = {}) => {
					return buildOperation("HEAD", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient, noDefaultAcceptHeader);
				},
				options: (requestOptions = {}) => {
					return buildOperation("OPTIONS", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient, noDefaultAcceptHeader);
				},
				trace: (requestOptions = {}) => {
					return buildOperation("TRACE", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient, noDefaultAcceptHeader);
				}
			};
		};
		return {
			path: client,
			pathUnchecked: client,
			pipeline
		};
	}
	function buildOperation(method, url, pipeline, options, allowInsecureConnection, httpClient, noDefaultAcceptHeader = false) {
		allowInsecureConnection = options.allowInsecureConnection ?? allowInsecureConnection;
		return {
			then: function(onFulfilled, onrejected) {
				return (0, import_sendRequest.sendRequest)(method, url, pipeline, {
					...options,
					allowInsecureConnection,
					noDefaultAcceptHeader
				}, httpClient).then(onFulfilled, onrejected);
			},
			async asBrowserStream() {
				if (import_env.isNodeLike) throw new Error("`asBrowserStream` is supported only in the browser environment. Use `asNodeStream` instead to obtain the response body stream. If you require a Web stream of the response in Node, consider using `Readable.toWeb` on the result of `asNodeStream`.");
				else return (0, import_sendRequest.sendRequest)(method, url, pipeline, {
					...options,
					allowInsecureConnection,
					noDefaultAcceptHeader,
					responseAsStream: true
				}, httpClient);
			},
			async asNodeStream() {
				if (import_env.isNodeLike) return (0, import_sendRequest.sendRequest)(method, url, pipeline, {
					...options,
					allowInsecureConnection,
					noDefaultAcceptHeader,
					responseAsStream: true
				}, httpClient);
				else throw new Error("`isNodeStream` is not supported in the browser environment. Use `asBrowserStream` to obtain the response body stream.");
			}
		};
	}
	0 && (module.exports = { getClient });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/client/operationOptionHelpers.js
var require_operationOptionHelpers = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var operationOptionHelpers_exports = {};
	__export(operationOptionHelpers_exports, { operationOptionsToRequestParameters: () => operationOptionsToRequestParameters });
	module.exports = __toCommonJS(operationOptionHelpers_exports);
	function operationOptionsToRequestParameters(options) {
		return {
			allowInsecureConnection: options.requestOptions?.allowInsecureConnection,
			timeout: options.requestOptions?.timeout,
			skipUrlEncoding: options.requestOptions?.skipUrlEncoding,
			abortSignal: options.abortSignal,
			onUploadProgress: options.requestOptions?.onUploadProgress,
			onDownloadProgress: options.requestOptions?.onDownloadProgress,
			headers: { ...options.requestOptions?.headers },
			onResponse: options.onResponse
		};
	}
	0 && (module.exports = { operationOptionsToRequestParameters });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/client/restError.js
var require_restError$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var restError_exports = {};
	__export(restError_exports, { createRestError: () => createRestError });
	module.exports = __toCommonJS(restError_exports);
	var import_restError = require_restError$2();
	var import_httpHeaders = require_httpHeaders$1();
	function createRestError(messageOrResponse, response) {
		const resp = typeof messageOrResponse === "string" ? response : messageOrResponse;
		const internalError = resp.body?.error ?? resp.body;
		const message = typeof messageOrResponse === "string" ? messageOrResponse : internalError?.message ?? `Unexpected status code: ${resp.status}`;
		return new import_restError.RestError(message, {
			statusCode: statusCodeToNumber(resp.status),
			code: internalError?.code,
			request: resp.request,
			response: toPipelineResponse(resp)
		});
	}
	function toPipelineResponse(errorResponse) {
		return {
			headers: (0, import_httpHeaders.createHttpHeaders)(errorResponse.headers),
			request: errorResponse.request,
			status: statusCodeToNumber(errorResponse.status) ?? -1,
			...typeof errorResponse.body === "string" ? { bodyAsText: errorResponse.body } : {}
		};
	}
	function statusCodeToNumber(statusCode) {
		const status = Number.parseInt(statusCode);
		return Number.isNaN(status) ? void 0 : status;
	}
	0 && (module.exports = { createRestError });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/index.js
var require_commonjs$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var src_exports = {};
	__export(src_exports, {
		AbortError: () => import_AbortError.AbortError,
		RestError: () => import_restError.RestError,
		TypeSpecRuntimeLogger: () => import_logger.TypeSpecRuntimeLogger,
		createClientLogger: () => import_logger.createClientLogger,
		createDefaultHttpClient: () => import_httpClient.createDefaultHttpClient,
		createEmptyPipeline: () => import_pipeline.createEmptyPipeline,
		createHttpHeaders: () => import_httpHeaders.createHttpHeaders,
		createPipelineRequest: () => import_pipelineRequest.createPipelineRequest,
		createRestError: () => import_restError2.createRestError,
		getClient: () => import_getClient.getClient,
		getLogLevel: () => import_logger.getLogLevel,
		isRestError: () => import_restError.isRestError,
		operationOptionsToRequestParameters: () => import_operationOptionHelpers.operationOptionsToRequestParameters,
		setLogLevel: () => import_logger.setLogLevel,
		stringToUint8Array: () => import_bytesEncoding.stringToUint8Array,
		uint8ArrayToString: () => import_bytesEncoding.uint8ArrayToString
	});
	module.exports = __toCommonJS(src_exports);
	var import_AbortError = require_AbortError();
	var import_logger = require_logger();
	var import_httpHeaders = require_httpHeaders$1();
	var import_pipelineRequest = require_pipelineRequest$1();
	var import_pipeline = require_pipeline$2();
	var import_restError = require_restError$2();
	var import_bytesEncoding = require_bytesEncoding();
	var import_httpClient = require_defaultHttpClient$1();
	var import_getClient = require_getClient();
	var import_operationOptionHelpers = require_operationOptionHelpers();
	var import_restError2 = require_restError$1();
	0 && (module.exports = {
		AbortError,
		RestError,
		TypeSpecRuntimeLogger,
		createClientLogger,
		createDefaultHttpClient,
		createEmptyPipeline,
		createHttpHeaders,
		createPipelineRequest,
		createRestError,
		getClient,
		getLogLevel,
		isRestError,
		operationOptionsToRequestParameters,
		setLogLevel,
		stringToUint8Array,
		uint8ArrayToString
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/pipeline.js
var require_pipeline$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var pipeline_exports = {};
	__export(pipeline_exports, { createEmptyPipeline: () => createEmptyPipeline });
	module.exports = __toCommonJS(pipeline_exports);
	var import_ts_http_runtime = require_commonjs$2();
	function createEmptyPipeline() {
		return (0, import_ts_http_runtime.createEmptyPipeline)();
	}
	0 && (module.exports = { createEmptyPipeline });
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/log.js
var require_log$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var log_exports = {};
	__export(log_exports, { logger: () => logger });
	module.exports = __toCommonJS(log_exports);
	var logger = (0, require_commonjs$4().createClientLogger)("core-rest-pipeline");
	0 && (module.exports = { logger });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/exponentialRetryPolicy.js
var require_exponentialRetryPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var exponentialRetryPolicy_exports = {};
	__export(exponentialRetryPolicy_exports, {
		exponentialRetryPolicy: () => exponentialRetryPolicy,
		exponentialRetryPolicyName: () => exponentialRetryPolicyName
	});
	module.exports = __toCommonJS(exponentialRetryPolicy_exports);
	var import_exponentialRetryStrategy = require_exponentialRetryStrategy();
	var import_retryPolicy = require_retryPolicy$1();
	var import_constants = require_constants$1();
	var exponentialRetryPolicyName = "exponentialRetryPolicy";
	function exponentialRetryPolicy(options = {}) {
		return (0, import_retryPolicy.retryPolicy)([(0, import_exponentialRetryStrategy.exponentialRetryStrategy)({
			...options,
			ignoreSystemErrors: true
		})], { maxRetries: options.maxRetries ?? import_constants.DEFAULT_RETRY_POLICY_COUNT });
	}
	0 && (module.exports = {
		exponentialRetryPolicy,
		exponentialRetryPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/systemErrorRetryPolicy.js
var require_systemErrorRetryPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var systemErrorRetryPolicy_exports = {};
	__export(systemErrorRetryPolicy_exports, {
		systemErrorRetryPolicy: () => systemErrorRetryPolicy,
		systemErrorRetryPolicyName: () => systemErrorRetryPolicyName
	});
	module.exports = __toCommonJS(systemErrorRetryPolicy_exports);
	var import_exponentialRetryStrategy = require_exponentialRetryStrategy();
	var import_retryPolicy = require_retryPolicy$1();
	var import_constants = require_constants$1();
	var systemErrorRetryPolicyName = "systemErrorRetryPolicy";
	function systemErrorRetryPolicy(options = {}) {
		return {
			name: systemErrorRetryPolicyName,
			sendRequest: (0, import_retryPolicy.retryPolicy)([(0, import_exponentialRetryStrategy.exponentialRetryStrategy)({
				...options,
				ignoreHttpStatusCodes: true
			})], { maxRetries: options.maxRetries ?? import_constants.DEFAULT_RETRY_POLICY_COUNT }).sendRequest
		};
	}
	0 && (module.exports = {
		systemErrorRetryPolicy,
		systemErrorRetryPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/throttlingRetryPolicy.js
var require_throttlingRetryPolicy$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var throttlingRetryPolicy_exports = {};
	__export(throttlingRetryPolicy_exports, {
		throttlingRetryPolicy: () => throttlingRetryPolicy,
		throttlingRetryPolicyName: () => throttlingRetryPolicyName
	});
	module.exports = __toCommonJS(throttlingRetryPolicy_exports);
	var import_throttlingRetryStrategy = require_throttlingRetryStrategy();
	var import_retryPolicy = require_retryPolicy$1();
	var import_constants = require_constants$1();
	var throttlingRetryPolicyName = "throttlingRetryPolicy";
	function throttlingRetryPolicy(options = {}) {
		return {
			name: throttlingRetryPolicyName,
			sendRequest: (0, import_retryPolicy.retryPolicy)([(0, import_throttlingRetryStrategy.throttlingRetryStrategy)()], { maxRetries: options.maxRetries ?? import_constants.DEFAULT_RETRY_POLICY_COUNT }).sendRequest
		};
	}
	0 && (module.exports = {
		throttlingRetryPolicy,
		throttlingRetryPolicyName
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/policies/internal.js
var require_internal = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var internal_exports = {};
	__export(internal_exports, {
		agentPolicy: () => import_agentPolicy.agentPolicy,
		agentPolicyName: () => import_agentPolicy.agentPolicyName,
		decompressResponsePolicy: () => import_decompress.decompressResponsePolicy,
		decompressResponsePolicyName: () => import_decompress.decompressResponsePolicyName,
		defaultRetryPolicy: () => import_defaultRetryPolicy.defaultRetryPolicy,
		defaultRetryPolicyName: () => import_defaultRetryPolicy.defaultRetryPolicyName,
		exponentialRetryPolicy: () => import_exponentialRetryPolicy.exponentialRetryPolicy,
		exponentialRetryPolicyName: () => import_exponentialRetryPolicy.exponentialRetryPolicyName,
		formDataPolicy: () => import_formDataPolicy.formDataPolicy,
		formDataPolicyName: () => import_formDataPolicy.formDataPolicyName,
		getDefaultProxySettings: () => import_proxy.getDefaultProxySettings,
		logPolicy: () => import_logPolicy.logPolicy,
		logPolicyName: () => import_logPolicy.logPolicyName,
		multipartPolicy: () => import_multipartPolicy.multipartPolicy,
		multipartPolicyName: () => import_multipartPolicy.multipartPolicyName,
		proxyPolicy: () => import_proxy.proxyPolicy,
		proxyPolicyName: () => import_proxy.proxyPolicyName,
		redirectPolicy: () => import_redirectPolicy.redirectPolicy,
		redirectPolicyName: () => import_redirectPolicy.redirectPolicyName,
		retryPolicy: () => import_retryPolicy.retryPolicy,
		systemErrorRetryPolicy: () => import_systemErrorRetryPolicy.systemErrorRetryPolicy,
		systemErrorRetryPolicyName: () => import_systemErrorRetryPolicy.systemErrorRetryPolicyName,
		throttlingRetryPolicy: () => import_throttlingRetryPolicy.throttlingRetryPolicy,
		throttlingRetryPolicyName: () => import_throttlingRetryPolicy.throttlingRetryPolicyName,
		tlsPolicy: () => import_tlsPolicy.tlsPolicy,
		tlsPolicyName: () => import_tlsPolicy.tlsPolicyName,
		userAgentPolicy: () => import_userAgentPolicy.userAgentPolicy,
		userAgentPolicyName: () => import_userAgentPolicy.userAgentPolicyName
	});
	module.exports = __toCommonJS(internal_exports);
	var import_agentPolicy = require_agentPolicy$1();
	var import_decompress = require_decompressResponsePolicy$1();
	var import_defaultRetryPolicy = require_defaultRetryPolicy$1();
	var import_exponentialRetryPolicy = require_exponentialRetryPolicy$1();
	var import_retryPolicy = require_retryPolicy$1();
	var import_systemErrorRetryPolicy = require_systemErrorRetryPolicy$1();
	var import_throttlingRetryPolicy = require_throttlingRetryPolicy$1();
	var import_formDataPolicy = require_formDataPolicy$1();
	var import_logPolicy = require_logPolicy$1();
	var import_multipartPolicy = require_multipartPolicy$1();
	var import_proxy = require_proxyPolicy$1();
	var import_redirectPolicy = require_redirectPolicy$1();
	var import_tlsPolicy = require_tlsPolicy$1();
	var import_userAgentPolicy = require_userAgentPolicy$1();
	0 && (module.exports = {
		agentPolicy,
		agentPolicyName,
		decompressResponsePolicy,
		decompressResponsePolicyName,
		defaultRetryPolicy,
		defaultRetryPolicyName,
		exponentialRetryPolicy,
		exponentialRetryPolicyName,
		formDataPolicy,
		formDataPolicyName,
		getDefaultProxySettings,
		logPolicy,
		logPolicyName,
		multipartPolicy,
		multipartPolicyName,
		proxyPolicy,
		proxyPolicyName,
		redirectPolicy,
		redirectPolicyName,
		retryPolicy,
		systemErrorRetryPolicy,
		systemErrorRetryPolicyName,
		throttlingRetryPolicy,
		throttlingRetryPolicyName,
		tlsPolicy,
		tlsPolicyName,
		userAgentPolicy,
		userAgentPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/logPolicy.js
var require_logPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var logPolicy_exports = {};
	__export(logPolicy_exports, {
		logPolicy: () => logPolicy,
		logPolicyName: () => logPolicyName
	});
	module.exports = __toCommonJS(logPolicy_exports);
	var import_log = require_log$1();
	var import_policies = require_internal();
	var logPolicyName = import_policies.logPolicyName;
	function logPolicy(options = {}) {
		return (0, import_policies.logPolicy)({
			logger: import_log.logger.info,
			...options
		});
	}
	0 && (module.exports = {
		logPolicy,
		logPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/redirectPolicy.js
var require_redirectPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var redirectPolicy_exports = {};
	__export(redirectPolicy_exports, {
		redirectPolicy: () => redirectPolicy,
		redirectPolicyName: () => redirectPolicyName
	});
	module.exports = __toCommonJS(redirectPolicy_exports);
	var import_policies = require_internal();
	var redirectPolicyName = import_policies.redirectPolicyName;
	function redirectPolicy(options = {}) {
		return (0, import_policies.redirectPolicy)(options);
	}
	0 && (module.exports = {
		redirectPolicy,
		redirectPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/util/userAgentPlatform.js
var require_userAgentPlatform = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var userAgentPlatform_exports = {};
	__export(userAgentPlatform_exports, {
		getHeaderName: () => getHeaderName,
		setPlatformSpecificData: () => setPlatformSpecificData
	});
	module.exports = __toCommonJS(userAgentPlatform_exports);
	var import_node_os = __toESM(__require("node:os"));
	var import_node_process = __toESM(__require("node:process"));
	function getHeaderName() {
		return "User-Agent";
	}
	async function setPlatformSpecificData(map) {
		if (import_node_process.default && import_node_process.default.versions) {
			const osInfo = `${import_node_os.default.type()} ${import_node_os.default.release()}; ${import_node_os.default.arch()}`;
			if (import_node_process.default.versions.bun) map.set("Bun", `${import_node_process.default.versions.bun} (${osInfo})`);
			else if (import_node_process.default.versions.deno) map.set("Deno", `${import_node_process.default.versions.deno} (${osInfo})`);
			else if (import_node_process.default.versions.node) map.set("Node", `${import_node_process.default.versions.node} (${osInfo})`);
		}
	}
	0 && (module.exports = {
		getHeaderName,
		setPlatformSpecificData
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var constants_exports = {};
	__export(constants_exports, {
		DEFAULT_RETRY_POLICY_COUNT: () => DEFAULT_RETRY_POLICY_COUNT,
		SDK_VERSION: () => SDK_VERSION
	});
	module.exports = __toCommonJS(constants_exports);
	var SDK_VERSION = "1.25.0";
	var DEFAULT_RETRY_POLICY_COUNT = 3;
	0 && (module.exports = {
		DEFAULT_RETRY_POLICY_COUNT,
		SDK_VERSION
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/util/userAgent.js
var require_userAgent = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var userAgent_exports = {};
	__export(userAgent_exports, {
		getUserAgentHeaderName: () => getUserAgentHeaderName,
		getUserAgentValue: () => getUserAgentValue
	});
	module.exports = __toCommonJS(userAgent_exports);
	var import_userAgent = require_userAgentPlatform();
	var import_constants = require_constants();
	function getUserAgentString(telemetryInfo) {
		const parts = [];
		for (const [key, value] of telemetryInfo) {
			const token = value ? `${key}/${value}` : key;
			parts.push(token);
		}
		return parts.join(" ");
	}
	function getUserAgentHeaderName() {
		return (0, import_userAgent.getHeaderName)();
	}
	async function getUserAgentValue(prefix) {
		const runtimeInfo = /* @__PURE__ */ new Map();
		runtimeInfo.set("core-rest-pipeline", import_constants.SDK_VERSION);
		await (0, import_userAgent.setPlatformSpecificData)(runtimeInfo);
		const defaultAgent = getUserAgentString(runtimeInfo);
		return prefix ? `${prefix} ${defaultAgent}` : defaultAgent;
	}
	0 && (module.exports = {
		getUserAgentHeaderName,
		getUserAgentValue
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/userAgentPolicy.js
var require_userAgentPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var userAgentPolicy_exports = {};
	__export(userAgentPolicy_exports, {
		userAgentPolicy: () => userAgentPolicy,
		userAgentPolicyName: () => userAgentPolicyName
	});
	module.exports = __toCommonJS(userAgentPolicy_exports);
	var import_userAgent = require_userAgent();
	var UserAgentHeaderName = (0, import_userAgent.getUserAgentHeaderName)();
	var userAgentPolicyName = "userAgentPolicy";
	function userAgentPolicy(options = {}) {
		const userAgentValue = (0, import_userAgent.getUserAgentValue)(options.userAgentPrefix);
		return {
			name: userAgentPolicyName,
			async sendRequest(request, next) {
				if (!request.headers.has(UserAgentHeaderName)) request.headers.set(UserAgentHeaderName, await userAgentValue);
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		userAgentPolicy,
		userAgentPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/util/createFile.js
var require_createFile = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var createFile_exports = {};
	__export(createFile_exports, { createFile: () => createFile });
	module.exports = __toCommonJS(createFile_exports);
	var import_file = require_file();
	function createFile(content, name, options = {}) {
		return (0, import_file.createRawFile)(content, name, options);
	}
	0 && (module.exports = { createFile });
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/util/file.js
var require_file = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var file_exports = {};
	__export(file_exports, {
		createFile: () => import_createFile.createFile,
		createFileFromStream: () => createFileFromStream,
		createRawFile: () => createRawFile,
		getRawContent: () => getRawContent,
		hasRawContent: () => hasRawContent
	});
	module.exports = __toCommonJS(file_exports);
	var import_createFile = require_createFile();
	function isNodeReadableStream(x) {
		return typeof x === "object" && x !== null && "pipe" in x && typeof x.pipe === "function";
	}
	var unimplementedMethods = {
		arrayBuffer: () => {
			throw new Error("Not implemented");
		},
		bytes: () => {
			throw new Error("Not implemented");
		},
		slice: () => {
			throw new Error("Not implemented");
		},
		text: () => {
			throw new Error("Not implemented");
		}
	};
	var rawContent = /* @__PURE__ */ Symbol("rawContent");
	function hasRawContent(x) {
		return typeof x[rawContent] === "function";
	}
	function getRawContent(blob) {
		if (hasRawContent(blob)) return blob[rawContent]();
		else return blob;
	}
	function createRawFile(content, name, options = {}) {
		return {
			...unimplementedMethods,
			type: options.type ?? "",
			lastModified: options.lastModified ?? (/* @__PURE__ */ new Date()).getTime(),
			webkitRelativePath: options.webkitRelativePath ?? "",
			size: content.byteLength,
			name,
			arrayBuffer: async () => toArrayBuffer(content).buffer,
			stream: () => new Blob([toArrayBuffer(content)]).stream(),
			[rawContent]: () => content
		};
	}
	function createFileFromStream(stream, name, options = {}) {
		return {
			...unimplementedMethods,
			type: options.type ?? "",
			lastModified: options.lastModified ?? (/* @__PURE__ */ new Date()).getTime(),
			webkitRelativePath: options.webkitRelativePath ?? "",
			size: options.size ?? -1,
			name,
			stream: () => {
				const s = stream();
				if (isNodeReadableStream(s)) throw new Error("Not supported: a Node stream was provided as input to createFileFromStream.");
				return s;
			},
			[rawContent]: stream
		};
	}
	function hasArrayBuffer(source) {
		return "resize" in source.buffer;
	}
	function toArrayBuffer(source) {
		if (hasArrayBuffer(source)) {
			if (source.byteOffset !== 0 || source.byteLength !== source.buffer.byteLength) return new Uint8Array(source);
			return source;
		}
		return source.map((x) => x);
	}
	0 && (module.exports = {
		createFile,
		createFileFromStream,
		createRawFile,
		getRawContent,
		hasRawContent
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/multipartPolicy.js
var require_multipartPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var multipartPolicy_exports = {};
	__export(multipartPolicy_exports, {
		multipartPolicy: () => multipartPolicy,
		multipartPolicyName: () => multipartPolicyName
	});
	module.exports = __toCommonJS(multipartPolicy_exports);
	var import_policies = require_internal();
	var import_file = require_file();
	var multipartPolicyName = import_policies.multipartPolicyName;
	function multipartPolicy() {
		const tspPolicy = (0, import_policies.multipartPolicy)();
		return {
			name: multipartPolicyName,
			sendRequest: async (request, next) => {
				if (request.multipartBody) {
					for (const part of request.multipartBody.parts) if ((0, import_file.hasRawContent)(part.body)) part.body = (0, import_file.getRawContent)(part.body);
				}
				return tspPolicy.sendRequest(request, next);
			}
		};
	}
	0 && (module.exports = {
		multipartPolicy,
		multipartPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/decompressResponsePolicy.js
var require_decompressResponsePolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var decompressResponsePolicy_exports = {};
	__export(decompressResponsePolicy_exports, {
		decompressResponsePolicy: () => decompressResponsePolicy,
		decompressResponsePolicyName: () => decompressResponsePolicyName
	});
	module.exports = __toCommonJS(decompressResponsePolicy_exports);
	var import_policies = require_internal();
	var decompressResponsePolicyName = import_policies.decompressResponsePolicyName;
	function decompressResponsePolicy() {
		return (0, import_policies.decompressResponsePolicy)();
	}
	0 && (module.exports = {
		decompressResponsePolicy,
		decompressResponsePolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/defaultRetryPolicy.js
var require_defaultRetryPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var defaultRetryPolicy_exports = {};
	__export(defaultRetryPolicy_exports, {
		defaultRetryPolicy: () => defaultRetryPolicy,
		defaultRetryPolicyName: () => defaultRetryPolicyName
	});
	module.exports = __toCommonJS(defaultRetryPolicy_exports);
	var import_policies = require_internal();
	var defaultRetryPolicyName = import_policies.defaultRetryPolicyName;
	function defaultRetryPolicy(options = {}) {
		return (0, import_policies.defaultRetryPolicy)(options);
	}
	0 && (module.exports = {
		defaultRetryPolicy,
		defaultRetryPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/formDataPolicy.js
var require_formDataPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var formDataPolicy_exports = {};
	__export(formDataPolicy_exports, {
		formDataPolicy: () => formDataPolicy,
		formDataPolicyName: () => formDataPolicyName
	});
	module.exports = __toCommonJS(formDataPolicy_exports);
	var import_policies = require_internal();
	var formDataPolicyName = import_policies.formDataPolicyName;
	function formDataPolicy() {
		return (0, import_policies.formDataPolicy)();
	}
	0 && (module.exports = {
		formDataPolicy,
		formDataPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/proxyPolicy.js
var require_proxyPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var proxyPolicy_exports = {};
	__export(proxyPolicy_exports, {
		getDefaultProxySettings: () => getDefaultProxySettings,
		proxyPolicy: () => proxyPolicy,
		proxyPolicyName: () => proxyPolicyName
	});
	module.exports = __toCommonJS(proxyPolicy_exports);
	var import_policies = require_internal();
	var proxyPolicyName = import_policies.proxyPolicyName;
	function getDefaultProxySettings(proxyUrl) {
		return (0, import_policies.getDefaultProxySettings)(proxyUrl);
	}
	function proxyPolicy(proxySettings, options) {
		return (0, import_policies.proxyPolicy)(proxySettings, options);
	}
	0 && (module.exports = {
		getDefaultProxySettings,
		proxyPolicy,
		proxyPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/setClientRequestIdPolicy.js
var require_setClientRequestIdPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var setClientRequestIdPolicy_exports = {};
	__export(setClientRequestIdPolicy_exports, {
		setClientRequestIdPolicy: () => setClientRequestIdPolicy,
		setClientRequestIdPolicyName: () => setClientRequestIdPolicyName
	});
	module.exports = __toCommonJS(setClientRequestIdPolicy_exports);
	var setClientRequestIdPolicyName = "setClientRequestIdPolicy";
	function setClientRequestIdPolicy(requestIdHeaderName = "x-ms-client-request-id") {
		return {
			name: setClientRequestIdPolicyName,
			async sendRequest(request, next) {
				if (!request.headers.has(requestIdHeaderName)) request.headers.set(requestIdHeaderName, request.requestId);
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		setClientRequestIdPolicy,
		setClientRequestIdPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/agentPolicy.js
var require_agentPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var agentPolicy_exports = {};
	__export(agentPolicy_exports, {
		agentPolicy: () => agentPolicy,
		agentPolicyName: () => agentPolicyName
	});
	module.exports = __toCommonJS(agentPolicy_exports);
	var import_policies = require_internal();
	var agentPolicyName = import_policies.agentPolicyName;
	function agentPolicy(agent) {
		return (0, import_policies.agentPolicy)(agent);
	}
	0 && (module.exports = {
		agentPolicy,
		agentPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/tlsPolicy.js
var require_tlsPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var tlsPolicy_exports = {};
	__export(tlsPolicy_exports, {
		tlsPolicy: () => tlsPolicy,
		tlsPolicyName: () => tlsPolicyName
	});
	module.exports = __toCommonJS(tlsPolicy_exports);
	var import_policies = require_internal();
	var tlsPolicyName = import_policies.tlsPolicyName;
	function tlsPolicy(tlsSettings) {
		return (0, import_policies.tlsPolicy)(tlsSettings);
	}
	0 && (module.exports = {
		tlsPolicy,
		tlsPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/restError.js
var require_restError = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var restError_exports = {};
	__export(restError_exports, {
		RestError: () => RestError,
		isRestError: () => isRestError
	});
	module.exports = __toCommonJS(restError_exports);
	var import_ts_http_runtime = require_commonjs$2();
	var RestError = import_ts_http_runtime.RestError;
	function isRestError(e) {
		return (0, import_ts_http_runtime.isRestError)(e);
	}
	0 && (module.exports = {
		RestError,
		isRestError
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/tracingPolicy.js
var require_tracingPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var tracingPolicy_exports = {};
	__export(tracingPolicy_exports, {
		tracingPolicy: () => tracingPolicy,
		tracingPolicyName: () => tracingPolicyName
	});
	module.exports = __toCommonJS(tracingPolicy_exports);
	var import_core_tracing = require_commonjs$3();
	var import_constants = require_constants();
	var import_userAgent = require_userAgent();
	var import_log = require_log$1();
	var import_core_util = require_commonjs$5();
	var import_restError = require_restError();
	var import_util = require_internal$2();
	var tracingPolicyName = "tracingPolicy";
	function tracingPolicy(options = {}) {
		const userAgentPromise = (0, import_userAgent.getUserAgentValue)(options.userAgentPrefix);
		const sanitizer = new import_util.Sanitizer({ additionalAllowedQueryParameters: options.additionalAllowedQueryParameters });
		const tracingClient = tryCreateTracingClient();
		return {
			name: tracingPolicyName,
			async sendRequest(request, next) {
				if (!tracingClient) return next(request);
				const userAgent = await userAgentPromise;
				const spanAttributes = {
					"http.url": sanitizer.sanitizeUrl(request.url),
					"http.method": request.method,
					"http.user_agent": userAgent,
					requestId: request.requestId
				};
				if (userAgent) spanAttributes["http.user_agent"] = userAgent;
				const { span, tracingContext } = tryCreateSpan(tracingClient, request, spanAttributes) ?? {};
				if (!span || !tracingContext) return next(request);
				try {
					const response = await tracingClient.withContext(tracingContext, next, request);
					tryProcessResponse(span, response);
					return response;
				} catch (err) {
					tryProcessError(span, err);
					throw err;
				}
			}
		};
	}
	function tryCreateTracingClient() {
		try {
			return (0, import_core_tracing.createTracingClient)({
				namespace: "",
				packageName: "@azure/core-rest-pipeline",
				packageVersion: import_constants.SDK_VERSION
			});
		} catch (e) {
			import_log.logger.warning(`Error when creating the TracingClient: ${(0, import_core_util.getErrorMessage)(e)}`);
			return;
		}
	}
	function tryCreateSpan(tracingClient, request, spanAttributes) {
		try {
			const { span, updatedOptions } = tracingClient.startSpan(`HTTP ${request.method}`, { tracingOptions: request.tracingOptions }, {
				spanKind: "client",
				spanAttributes
			});
			if (!span.isRecording()) {
				span.end();
				return;
			}
			const headers = tracingClient.createRequestHeaders(updatedOptions.tracingOptions.tracingContext);
			for (const [key, value] of Object.entries(headers)) request.headers.set(key, value);
			return {
				span,
				tracingContext: updatedOptions.tracingOptions.tracingContext
			};
		} catch (e) {
			import_log.logger.warning(`Skipping creating a tracing span due to an error: ${(0, import_core_util.getErrorMessage)(e)}`);
			return;
		}
	}
	function tryProcessError(span, error) {
		try {
			span.setStatus({
				status: "error",
				error: (0, import_core_util.isError)(error) ? error : void 0
			});
			if ((0, import_restError.isRestError)(error) && error.statusCode) span.setAttribute("http.status_code", error.statusCode);
			span.end();
		} catch (e) {
			import_log.logger.warning(`Skipping tracing span processing due to an error: ${(0, import_core_util.getErrorMessage)(e)}`);
		}
	}
	function tryProcessResponse(span, response) {
		try {
			span.setAttribute("http.status_code", response.status);
			const serviceRequestId = response.headers.get("x-ms-request-id");
			if (serviceRequestId) span.setAttribute("serviceRequestId", serviceRequestId);
			if (response.status >= 400) span.setStatus({ status: "error" });
			span.end();
		} catch (e) {
			import_log.logger.warning(`Skipping tracing span processing due to an error: ${(0, import_core_util.getErrorMessage)(e)}`);
		}
	}
	0 && (module.exports = {
		tracingPolicy,
		tracingPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/util/wrapAbortSignal.js
var require_wrapAbortSignal = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var wrapAbortSignal_exports = {};
	__export(wrapAbortSignal_exports, { wrapAbortSignalLike: () => wrapAbortSignalLike });
	module.exports = __toCommonJS(wrapAbortSignal_exports);
	function wrapAbortSignalLike(abortSignalLike) {
		if (abortSignalLike instanceof AbortSignal) return { abortSignal: abortSignalLike };
		if (abortSignalLike.aborted) return { abortSignal: AbortSignal.abort("reason" in abortSignalLike ? abortSignalLike.reason : void 0) };
		const controller = new AbortController();
		let needsCleanup = true;
		function cleanup() {
			if (needsCleanup) {
				abortSignalLike.removeEventListener("abort", listener);
				needsCleanup = false;
			}
		}
		function listener() {
			controller.abort("reason" in abortSignalLike ? abortSignalLike.reason : void 0);
			cleanup();
		}
		abortSignalLike.addEventListener("abort", listener);
		return {
			abortSignal: controller.signal,
			cleanup
		};
	}
	0 && (module.exports = { wrapAbortSignalLike });
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/wrapAbortSignalLikePolicy.js
var require_wrapAbortSignalLikePolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var wrapAbortSignalLikePolicy_exports = {};
	__export(wrapAbortSignalLikePolicy_exports, {
		wrapAbortSignalLikePolicy: () => wrapAbortSignalLikePolicy,
		wrapAbortSignalLikePolicyName: () => wrapAbortSignalLikePolicyName
	});
	module.exports = __toCommonJS(wrapAbortSignalLikePolicy_exports);
	var import_wrapAbortSignal = require_wrapAbortSignal();
	var wrapAbortSignalLikePolicyName = "wrapAbortSignalLikePolicy";
	function wrapAbortSignalLikePolicy() {
		return {
			name: wrapAbortSignalLikePolicyName,
			sendRequest: async (request, next) => {
				if (!request.abortSignal) return next(request);
				const { abortSignal, cleanup } = (0, import_wrapAbortSignal.wrapAbortSignalLike)(request.abortSignal);
				request.abortSignal = abortSignal;
				try {
					return await next(request);
				} finally {
					cleanup?.();
				}
			}
		};
	}
	0 && (module.exports = {
		wrapAbortSignalLikePolicy,
		wrapAbortSignalLikePolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/createPipelineFromOptions.js
var require_createPipelineFromOptions = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var createPipelineFromOptions_exports = {};
	__export(createPipelineFromOptions_exports, { createPipelineFromOptions: () => createPipelineFromOptions });
	module.exports = __toCommonJS(createPipelineFromOptions_exports);
	var import_logPolicy = require_logPolicy();
	var import_pipeline = require_pipeline$1();
	var import_redirectPolicy = require_redirectPolicy();
	var import_userAgentPolicy = require_userAgentPolicy();
	var import_multipartPolicy = require_multipartPolicy();
	var import_decompressResponsePolicy = require_decompressResponsePolicy();
	var import_defaultRetryPolicy = require_defaultRetryPolicy();
	var import_formDataPolicy = require_formDataPolicy();
	var import_core_util = require_commonjs$5();
	var import_proxyPolicy = require_proxyPolicy();
	var import_setClientRequestIdPolicy = require_setClientRequestIdPolicy();
	var import_agentPolicy = require_agentPolicy();
	var import_tlsPolicy = require_tlsPolicy();
	var import_tracingPolicy = require_tracingPolicy();
	var import_wrapAbortSignalLikePolicy = require_wrapAbortSignalLikePolicy();
	function createPipelineFromOptions(options) {
		const pipeline = (0, import_pipeline.createEmptyPipeline)();
		if (import_core_util.isNodeLike) {
			if (options.agent) pipeline.addPolicy((0, import_agentPolicy.agentPolicy)(options.agent));
			if (options.tlsOptions) pipeline.addPolicy((0, import_tlsPolicy.tlsPolicy)(options.tlsOptions));
			pipeline.addPolicy((0, import_proxyPolicy.proxyPolicy)(options.proxyOptions));
			pipeline.addPolicy((0, import_decompressResponsePolicy.decompressResponsePolicy)());
		}
		pipeline.addPolicy((0, import_wrapAbortSignalLikePolicy.wrapAbortSignalLikePolicy)());
		pipeline.addPolicy((0, import_formDataPolicy.formDataPolicy)(), { beforePolicies: [import_multipartPolicy.multipartPolicyName] });
		pipeline.addPolicy((0, import_userAgentPolicy.userAgentPolicy)(options.userAgentOptions));
		pipeline.addPolicy((0, import_setClientRequestIdPolicy.setClientRequestIdPolicy)(options.telemetryOptions?.clientRequestIdHeaderName));
		pipeline.addPolicy((0, import_multipartPolicy.multipartPolicy)(), { afterPhase: "Deserialize" });
		pipeline.addPolicy((0, import_defaultRetryPolicy.defaultRetryPolicy)(options.retryOptions), { phase: "Retry" });
		pipeline.addPolicy((0, import_tracingPolicy.tracingPolicy)({
			...options.userAgentOptions,
			...options.loggingOptions
		}), { afterPhase: "Retry" });
		if (import_core_util.isNodeLike) pipeline.addPolicy((0, import_redirectPolicy.redirectPolicy)(options.redirectOptions), { afterPhase: "Retry" });
		pipeline.addPolicy((0, import_logPolicy.logPolicy)(options.loggingOptions), { afterPhase: "Sign" });
		return pipeline;
	}
	0 && (module.exports = { createPipelineFromOptions });
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/defaultHttpClient.js
var require_defaultHttpClient = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var defaultHttpClient_exports = {};
	__export(defaultHttpClient_exports, { createDefaultHttpClient: () => createDefaultHttpClient });
	module.exports = __toCommonJS(defaultHttpClient_exports);
	var import_ts_http_runtime = require_commonjs$2();
	var import_wrapAbortSignal = require_wrapAbortSignal();
	function createDefaultHttpClient() {
		const client = (0, import_ts_http_runtime.createDefaultHttpClient)();
		return { async sendRequest(request) {
			const { abortSignal, cleanup } = request.abortSignal ? (0, import_wrapAbortSignal.wrapAbortSignalLike)(request.abortSignal) : {};
			try {
				request.abortSignal = abortSignal;
				return await client.sendRequest(request);
			} finally {
				cleanup?.();
			}
		} };
	}
	0 && (module.exports = { createDefaultHttpClient });
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/httpHeaders.js
var require_httpHeaders = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var httpHeaders_exports = {};
	__export(httpHeaders_exports, { createHttpHeaders: () => createHttpHeaders });
	module.exports = __toCommonJS(httpHeaders_exports);
	var import_ts_http_runtime = require_commonjs$2();
	function createHttpHeaders(rawHeaders) {
		return (0, import_ts_http_runtime.createHttpHeaders)(rawHeaders);
	}
	0 && (module.exports = { createHttpHeaders });
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/pipelineRequest.js
var require_pipelineRequest = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var pipelineRequest_exports = {};
	__export(pipelineRequest_exports, { createPipelineRequest: () => createPipelineRequest });
	module.exports = __toCommonJS(pipelineRequest_exports);
	var import_ts_http_runtime = require_commonjs$2();
	function createPipelineRequest(options) {
		return (0, import_ts_http_runtime.createPipelineRequest)(options);
	}
	0 && (module.exports = { createPipelineRequest });
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/exponentialRetryPolicy.js
var require_exponentialRetryPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var exponentialRetryPolicy_exports = {};
	__export(exponentialRetryPolicy_exports, {
		exponentialRetryPolicy: () => exponentialRetryPolicy,
		exponentialRetryPolicyName: () => exponentialRetryPolicyName
	});
	module.exports = __toCommonJS(exponentialRetryPolicy_exports);
	var import_policies = require_internal();
	var exponentialRetryPolicyName = import_policies.exponentialRetryPolicyName;
	function exponentialRetryPolicy(options = {}) {
		return (0, import_policies.exponentialRetryPolicy)(options);
	}
	0 && (module.exports = {
		exponentialRetryPolicy,
		exponentialRetryPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/systemErrorRetryPolicy.js
var require_systemErrorRetryPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var systemErrorRetryPolicy_exports = {};
	__export(systemErrorRetryPolicy_exports, {
		systemErrorRetryPolicy: () => systemErrorRetryPolicy,
		systemErrorRetryPolicyName: () => systemErrorRetryPolicyName
	});
	module.exports = __toCommonJS(systemErrorRetryPolicy_exports);
	var import_policies = require_internal();
	var systemErrorRetryPolicyName = import_policies.systemErrorRetryPolicyName;
	function systemErrorRetryPolicy(options = {}) {
		return (0, import_policies.systemErrorRetryPolicy)(options);
	}
	0 && (module.exports = {
		systemErrorRetryPolicy,
		systemErrorRetryPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/throttlingRetryPolicy.js
var require_throttlingRetryPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var throttlingRetryPolicy_exports = {};
	__export(throttlingRetryPolicy_exports, {
		throttlingRetryPolicy: () => throttlingRetryPolicy,
		throttlingRetryPolicyName: () => throttlingRetryPolicyName
	});
	module.exports = __toCommonJS(throttlingRetryPolicy_exports);
	var import_policies = require_internal();
	var throttlingRetryPolicyName = import_policies.throttlingRetryPolicyName;
	function throttlingRetryPolicy(options = {}) {
		return (0, import_policies.throttlingRetryPolicy)(options);
	}
	0 && (module.exports = {
		throttlingRetryPolicy,
		throttlingRetryPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/retryPolicy.js
var require_retryPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var retryPolicy_exports = {};
	__export(retryPolicy_exports, { retryPolicy: () => retryPolicy });
	module.exports = __toCommonJS(retryPolicy_exports);
	var import_logger = require_commonjs$4();
	var import_constants = require_constants();
	var import_policies = require_internal();
	var retryPolicyLogger = (0, import_logger.createClientLogger)("core-rest-pipeline retryPolicy");
	function retryPolicy(strategies, options = { maxRetries: import_constants.DEFAULT_RETRY_POLICY_COUNT }) {
		return (0, import_policies.retryPolicy)(strategies, {
			logger: retryPolicyLogger,
			...options
		});
	}
	0 && (module.exports = { retryPolicy });
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/util/tokenCycler.js
var require_tokenCycler = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var tokenCycler_exports = {};
	__export(tokenCycler_exports, {
		DEFAULT_CYCLER_OPTIONS: () => DEFAULT_CYCLER_OPTIONS,
		createTokenCycler: () => createTokenCycler
	});
	module.exports = __toCommonJS(tokenCycler_exports);
	var import_core_util = require_commonjs$5();
	var DEFAULT_CYCLER_OPTIONS = {
		forcedRefreshWindowInMs: 1e3,
		retryIntervalInMs: 3e3,
		refreshWindowInMs: 12e4
	};
	async function beginRefresh(getAccessToken, retryIntervalInMs, refreshTimeout) {
		async function tryGetAccessToken() {
			if (Date.now() < refreshTimeout) try {
				return await getAccessToken();
			} catch {
				return null;
			}
			else {
				const finalToken = await getAccessToken();
				if (finalToken === null) throw new Error("Failed to refresh access token.");
				return finalToken;
			}
		}
		let token = await tryGetAccessToken();
		while (token === null) {
			await (0, import_core_util.delay)(retryIntervalInMs);
			token = await tryGetAccessToken();
		}
		return token;
	}
	function createTokenCycler(credential, tokenCyclerOptions) {
		let refreshWorker = null;
		let token = null;
		let tenantId;
		const options = {
			...DEFAULT_CYCLER_OPTIONS,
			...tokenCyclerOptions
		};
		const cycler = {
			/**
			* Produces true if a refresh job is currently in progress.
			*/
			get isRefreshing() {
				return refreshWorker !== null;
			},
			/**
			* Produces true if the cycler SHOULD refresh (we are within the refresh
			* window and not already refreshing)
			*/
			get shouldRefresh() {
				if (token === null) return true;
				if (cycler.isRefreshing) return false;
				if (token.refreshAfterTimestamp && token.refreshAfterTimestamp < Date.now()) return true;
				return token.expiresOnTimestamp - options.refreshWindowInMs < Date.now();
			},
			/**
			* Produces true if the cycler MUST refresh (null or nearly-expired
			* token).
			*/
			get mustRefresh() {
				return token === null || token.expiresOnTimestamp - options.forcedRefreshWindowInMs < Date.now();
			}
		};
		function refresh(scopes, getTokenOptions) {
			if (!cycler.isRefreshing) {
				const tryGetAccessToken = () => credential.getToken(scopes, getTokenOptions);
				refreshWorker = beginRefresh(tryGetAccessToken, options.retryIntervalInMs, token?.expiresOnTimestamp ?? Date.now()).then((_token) => {
					refreshWorker = null;
					token = _token;
					tenantId = getTokenOptions.tenantId;
					return token;
				}).catch((reason) => {
					refreshWorker = null;
					token = null;
					tenantId = void 0;
					throw reason;
				});
			}
			return refreshWorker;
		}
		return async (scopes, tokenOptions) => {
			const hasClaimChallenge = Boolean(tokenOptions.claims);
			const tenantIdChanged = tenantId !== tokenOptions.tenantId;
			if (hasClaimChallenge) token = null;
			if (tenantIdChanged || hasClaimChallenge || cycler.mustRefresh) return refresh(scopes, tokenOptions);
			if (cycler.shouldRefresh) refresh(scopes, tokenOptions);
			return token;
		};
	}
	0 && (module.exports = {
		DEFAULT_CYCLER_OPTIONS,
		createTokenCycler
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/bearerTokenAuthenticationPolicy.js
var require_bearerTokenAuthenticationPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var bearerTokenAuthenticationPolicy_exports = {};
	__export(bearerTokenAuthenticationPolicy_exports, {
		bearerTokenAuthenticationPolicy: () => bearerTokenAuthenticationPolicy,
		bearerTokenAuthenticationPolicyName: () => bearerTokenAuthenticationPolicyName,
		parseChallenges: () => parseChallenges
	});
	module.exports = __toCommonJS(bearerTokenAuthenticationPolicy_exports);
	var import_tokenCycler = require_tokenCycler();
	var import_log = require_log$1();
	var import_restError = require_restError();
	var bearerTokenAuthenticationPolicyName = "bearerTokenAuthenticationPolicy";
	async function trySendRequest(request, next) {
		try {
			return [await next(request), void 0];
		} catch (e) {
			if ((0, import_restError.isRestError)(e) && e.response) return [e.response, e];
			else throw e;
		}
	}
	async function defaultAuthorizeRequest(options) {
		const { scopes, getAccessToken, request } = options;
		const accessToken = await getAccessToken(scopes, {
			abortSignal: request.abortSignal,
			tracingOptions: request.tracingOptions,
			enableCae: true
		});
		if (accessToken) options.request.headers.set("Authorization", `Bearer ${accessToken.token}`);
	}
	function isChallengeResponse(response) {
		return response.status === 401 && response.headers.has("WWW-Authenticate");
	}
	async function authorizeRequestOnCaeChallenge(onChallengeOptions, caeClaims) {
		const { scopes } = onChallengeOptions;
		const accessToken = await onChallengeOptions.getAccessToken(scopes, {
			enableCae: true,
			claims: caeClaims
		});
		if (!accessToken) return false;
		onChallengeOptions.request.headers.set("Authorization", `${accessToken.tokenType ?? "Bearer"} ${accessToken.token}`);
		return true;
	}
	function bearerTokenAuthenticationPolicy(options) {
		const { credential, scopes, challengeCallbacks } = options;
		const logger = options.logger || import_log.logger;
		const callbacks = {
			authorizeRequest: challengeCallbacks?.authorizeRequest?.bind(challengeCallbacks) ?? defaultAuthorizeRequest,
			authorizeRequestOnChallenge: challengeCallbacks?.authorizeRequestOnChallenge?.bind(challengeCallbacks)
		};
		const getAccessToken = credential ? (0, import_tokenCycler.createTokenCycler)(credential) : () => Promise.resolve(null);
		return {
			name: bearerTokenAuthenticationPolicyName,
			/**
			* If there's no challenge parameter:
			* - It will try to retrieve the token using the cache, or the credential's getToken.
			* - Then it will try the next policy with or without the retrieved token.
			*
			* It uses the challenge parameters to:
			* - Skip a first attempt to get the token from the credential if there's no cached token,
			*   since it expects the token to be retrievable only after the challenge.
			* - Prepare the outgoing request if the `prepareRequest` method has been provided.
			* - Send an initial request to receive the challenge if it fails.
			* - Process a challenge if the response contains it.
			* - Retrieve a token with the challenge information, then re-send the request.
			*/
			async sendRequest(request, next) {
				if (!request.url.toLowerCase().startsWith("https://")) throw new Error("Bearer token authentication is not permitted for non-TLS protected (non-https) URLs.");
				await callbacks.authorizeRequest({
					scopes: Array.isArray(scopes) ? scopes : [scopes],
					request,
					getAccessToken,
					logger
				});
				let response;
				let error;
				let shouldSendRequest;
				[response, error] = await trySendRequest(request, next);
				if (isChallengeResponse(response)) {
					let claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate"));
					if (claims) {
						let parsedClaim;
						try {
							parsedClaim = atob(claims);
						} catch (e) {
							logger.warning(`The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`);
							return response;
						}
						shouldSendRequest = await authorizeRequestOnCaeChallenge({
							scopes: Array.isArray(scopes) ? scopes : [scopes],
							response,
							request,
							getAccessToken,
							logger
						}, parsedClaim);
						if (shouldSendRequest) [response, error] = await trySendRequest(request, next);
					} else if (callbacks.authorizeRequestOnChallenge) {
						shouldSendRequest = await callbacks.authorizeRequestOnChallenge({
							scopes: Array.isArray(scopes) ? scopes : [scopes],
							request,
							response,
							getAccessToken,
							logger
						});
						if (shouldSendRequest) [response, error] = await trySendRequest(request, next);
						if (isChallengeResponse(response)) {
							claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate") ?? "");
							if (claims) {
								let parsedClaim;
								try {
									parsedClaim = atob(claims);
								} catch (e) {
									logger.warning(`The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`);
									return response;
								}
								shouldSendRequest = await authorizeRequestOnCaeChallenge({
									scopes: Array.isArray(scopes) ? scopes : [scopes],
									response,
									request,
									getAccessToken,
									logger
								}, parsedClaim);
								if (shouldSendRequest) [response, error] = await trySendRequest(request, next);
							}
						}
					}
				}
				if (error) throw error;
				else return response;
			}
		};
	}
	function parseChallenges(challenges) {
		const challengeRegex = /(\w+)\s+((?:\w+=(?:"[^"]*"|[^,]*),?\s*)+)/g;
		const paramRegex = /(\w+)="([^"]*)"/g;
		const parsedChallenges = [];
		let match;
		while ((match = challengeRegex.exec(challenges)) !== null) {
			const scheme = match[1];
			const paramsString = match[2];
			const params = {};
			let paramMatch;
			while ((paramMatch = paramRegex.exec(paramsString)) !== null) params[paramMatch[1]] = paramMatch[2];
			parsedChallenges.push({
				scheme,
				params
			});
		}
		return parsedChallenges;
	}
	function getCaeChallengeClaims(challenges) {
		if (!challenges) return;
		return parseChallenges(challenges).find((x) => x.scheme === "Bearer" && x.params.claims && x.params.error === "insufficient_claims")?.params.claims;
	}
	0 && (module.exports = {
		bearerTokenAuthenticationPolicy,
		bearerTokenAuthenticationPolicyName,
		parseChallenges
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/ndJsonPolicy.js
var require_ndJsonPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var ndJsonPolicy_exports = {};
	__export(ndJsonPolicy_exports, {
		ndJsonPolicy: () => ndJsonPolicy,
		ndJsonPolicyName: () => ndJsonPolicyName
	});
	module.exports = __toCommonJS(ndJsonPolicy_exports);
	var ndJsonPolicyName = "ndJsonPolicy";
	function ndJsonPolicy() {
		return {
			name: ndJsonPolicyName,
			async sendRequest(request, next) {
				if (typeof request.body === "string" && request.body.startsWith("[")) request.body = JSON.parse(request.body).map((item) => JSON.stringify(item) + "\n").join("");
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		ndJsonPolicy,
		ndJsonPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/policies/auxiliaryAuthenticationHeaderPolicy.js
var require_auxiliaryAuthenticationHeaderPolicy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var auxiliaryAuthenticationHeaderPolicy_exports = {};
	__export(auxiliaryAuthenticationHeaderPolicy_exports, {
		auxiliaryAuthenticationHeaderPolicy: () => auxiliaryAuthenticationHeaderPolicy,
		auxiliaryAuthenticationHeaderPolicyName: () => auxiliaryAuthenticationHeaderPolicyName
	});
	module.exports = __toCommonJS(auxiliaryAuthenticationHeaderPolicy_exports);
	var import_tokenCycler = require_tokenCycler();
	var import_log = require_log$1();
	var auxiliaryAuthenticationHeaderPolicyName = "auxiliaryAuthenticationHeaderPolicy";
	var AUTHORIZATION_AUXILIARY_HEADER = "x-ms-authorization-auxiliary";
	async function sendAuthorizeRequest(options) {
		const { scopes, getAccessToken, request } = options;
		return (await getAccessToken(scopes, {
			abortSignal: request.abortSignal,
			tracingOptions: request.tracingOptions
		}))?.token ?? "";
	}
	function auxiliaryAuthenticationHeaderPolicy(options) {
		const { credentials, scopes } = options;
		const logger = options.logger || import_log.logger;
		const tokenCyclerMap = /* @__PURE__ */ new WeakMap();
		return {
			name: auxiliaryAuthenticationHeaderPolicyName,
			async sendRequest(request, next) {
				if (!request.url.toLowerCase().startsWith("https://")) throw new Error("Bearer token authentication for auxiliary header is not permitted for non-TLS protected (non-https) URLs.");
				if (!credentials || credentials.length === 0) {
					logger.info(`${auxiliaryAuthenticationHeaderPolicyName} header will not be set due to empty credentials.`);
					return next(request);
				}
				const tokenPromises = [];
				for (const credential of credentials) {
					let getAccessToken = tokenCyclerMap.get(credential);
					if (!getAccessToken) {
						getAccessToken = (0, import_tokenCycler.createTokenCycler)(credential);
						tokenCyclerMap.set(credential, getAccessToken);
					}
					tokenPromises.push(sendAuthorizeRequest({
						scopes: Array.isArray(scopes) ? scopes : [scopes],
						request,
						getAccessToken,
						logger
					}));
				}
				const auxiliaryTokens = (await Promise.all(tokenPromises)).filter((token) => Boolean(token));
				if (auxiliaryTokens.length === 0) {
					logger.warning(`None of the auxiliary tokens are valid. ${AUTHORIZATION_AUXILIARY_HEADER} header will not be set.`);
					return next(request);
				}
				request.headers.set(AUTHORIZATION_AUXILIARY_HEADER, auxiliaryTokens.map((token) => `Bearer ${token}`).join(", "));
				return next(request);
			}
		};
	}
	0 && (module.exports = {
		auxiliaryAuthenticationHeaderPolicy,
		auxiliaryAuthenticationHeaderPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-rest-pipeline/dist/commonjs/index.js
var require_commonjs$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var src_exports = {};
	__export(src_exports, {
		RestError: () => import_restError.RestError,
		agentPolicy: () => import_agentPolicy.agentPolicy,
		agentPolicyName: () => import_agentPolicy.agentPolicyName,
		auxiliaryAuthenticationHeaderPolicy: () => import_auxiliaryAuthenticationHeaderPolicy.auxiliaryAuthenticationHeaderPolicy,
		auxiliaryAuthenticationHeaderPolicyName: () => import_auxiliaryAuthenticationHeaderPolicy.auxiliaryAuthenticationHeaderPolicyName,
		bearerTokenAuthenticationPolicy: () => import_bearerTokenAuthenticationPolicy.bearerTokenAuthenticationPolicy,
		bearerTokenAuthenticationPolicyName: () => import_bearerTokenAuthenticationPolicy.bearerTokenAuthenticationPolicyName,
		createDefaultHttpClient: () => import_defaultHttpClient.createDefaultHttpClient,
		createEmptyPipeline: () => import_pipeline.createEmptyPipeline,
		createFile: () => import_file.createFile,
		createFileFromStream: () => import_file.createFileFromStream,
		createHttpHeaders: () => import_httpHeaders.createHttpHeaders,
		createPipelineFromOptions: () => import_createPipelineFromOptions.createPipelineFromOptions,
		createPipelineRequest: () => import_pipelineRequest.createPipelineRequest,
		decompressResponsePolicy: () => import_decompressResponsePolicy.decompressResponsePolicy,
		decompressResponsePolicyName: () => import_decompressResponsePolicy.decompressResponsePolicyName,
		defaultRetryPolicy: () => import_defaultRetryPolicy.defaultRetryPolicy,
		exponentialRetryPolicy: () => import_exponentialRetryPolicy.exponentialRetryPolicy,
		exponentialRetryPolicyName: () => import_exponentialRetryPolicy.exponentialRetryPolicyName,
		formDataPolicy: () => import_formDataPolicy.formDataPolicy,
		formDataPolicyName: () => import_formDataPolicy.formDataPolicyName,
		getDefaultProxySettings: () => import_proxyPolicy.getDefaultProxySettings,
		isRestError: () => import_restError.isRestError,
		logPolicy: () => import_logPolicy.logPolicy,
		logPolicyName: () => import_logPolicy.logPolicyName,
		multipartPolicy: () => import_multipartPolicy.multipartPolicy,
		multipartPolicyName: () => import_multipartPolicy.multipartPolicyName,
		ndJsonPolicy: () => import_ndJsonPolicy.ndJsonPolicy,
		ndJsonPolicyName: () => import_ndJsonPolicy.ndJsonPolicyName,
		proxyPolicy: () => import_proxyPolicy.proxyPolicy,
		proxyPolicyName: () => import_proxyPolicy.proxyPolicyName,
		redirectPolicy: () => import_redirectPolicy.redirectPolicy,
		redirectPolicyName: () => import_redirectPolicy.redirectPolicyName,
		retryPolicy: () => import_retryPolicy.retryPolicy,
		setClientRequestIdPolicy: () => import_setClientRequestIdPolicy.setClientRequestIdPolicy,
		setClientRequestIdPolicyName: () => import_setClientRequestIdPolicy.setClientRequestIdPolicyName,
		systemErrorRetryPolicy: () => import_systemErrorRetryPolicy.systemErrorRetryPolicy,
		systemErrorRetryPolicyName: () => import_systemErrorRetryPolicy.systemErrorRetryPolicyName,
		throttlingRetryPolicy: () => import_throttlingRetryPolicy.throttlingRetryPolicy,
		throttlingRetryPolicyName: () => import_throttlingRetryPolicy.throttlingRetryPolicyName,
		tlsPolicy: () => import_tlsPolicy.tlsPolicy,
		tlsPolicyName: () => import_tlsPolicy.tlsPolicyName,
		tracingPolicy: () => import_tracingPolicy.tracingPolicy,
		tracingPolicyName: () => import_tracingPolicy.tracingPolicyName,
		userAgentPolicy: () => import_userAgentPolicy.userAgentPolicy,
		userAgentPolicyName: () => import_userAgentPolicy.userAgentPolicyName
	});
	module.exports = __toCommonJS(src_exports);
	var import_pipeline = require_pipeline$1();
	var import_createPipelineFromOptions = require_createPipelineFromOptions();
	var import_defaultHttpClient = require_defaultHttpClient();
	var import_httpHeaders = require_httpHeaders();
	var import_pipelineRequest = require_pipelineRequest();
	var import_restError = require_restError();
	var import_decompressResponsePolicy = require_decompressResponsePolicy();
	var import_exponentialRetryPolicy = require_exponentialRetryPolicy();
	var import_setClientRequestIdPolicy = require_setClientRequestIdPolicy();
	var import_logPolicy = require_logPolicy();
	var import_multipartPolicy = require_multipartPolicy();
	var import_proxyPolicy = require_proxyPolicy();
	var import_redirectPolicy = require_redirectPolicy();
	var import_systemErrorRetryPolicy = require_systemErrorRetryPolicy();
	var import_throttlingRetryPolicy = require_throttlingRetryPolicy();
	var import_retryPolicy = require_retryPolicy();
	var import_tracingPolicy = require_tracingPolicy();
	var import_defaultRetryPolicy = require_defaultRetryPolicy();
	var import_userAgentPolicy = require_userAgentPolicy();
	var import_tlsPolicy = require_tlsPolicy();
	var import_formDataPolicy = require_formDataPolicy();
	var import_bearerTokenAuthenticationPolicy = require_bearerTokenAuthenticationPolicy();
	var import_ndJsonPolicy = require_ndJsonPolicy();
	var import_auxiliaryAuthenticationHeaderPolicy = require_auxiliaryAuthenticationHeaderPolicy();
	var import_agentPolicy = require_agentPolicy();
	var import_file = require_file();
	0 && (module.exports = {
		RestError,
		agentPolicy,
		agentPolicyName,
		auxiliaryAuthenticationHeaderPolicy,
		auxiliaryAuthenticationHeaderPolicyName,
		bearerTokenAuthenticationPolicy,
		bearerTokenAuthenticationPolicyName,
		createDefaultHttpClient,
		createEmptyPipeline,
		createFile,
		createFileFromStream,
		createHttpHeaders,
		createPipelineFromOptions,
		createPipelineRequest,
		decompressResponsePolicy,
		decompressResponsePolicyName,
		defaultRetryPolicy,
		exponentialRetryPolicy,
		exponentialRetryPolicyName,
		formDataPolicy,
		formDataPolicyName,
		getDefaultProxySettings,
		isRestError,
		logPolicy,
		logPolicyName,
		multipartPolicy,
		multipartPolicyName,
		ndJsonPolicy,
		ndJsonPolicyName,
		proxyPolicy,
		proxyPolicyName,
		redirectPolicy,
		redirectPolicyName,
		retryPolicy,
		setClientRequestIdPolicy,
		setClientRequestIdPolicyName,
		systemErrorRetryPolicy,
		systemErrorRetryPolicyName,
		throttlingRetryPolicy,
		throttlingRetryPolicyName,
		tlsPolicy,
		tlsPolicyName,
		tracingPolicy,
		tracingPolicyName,
		userAgentPolicy,
		userAgentPolicyName
	});
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/state-cjs.js
var require_state_cjs = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.state = void 0;
	/**
	* Holds the singleton operationRequestMap, to be shared across CJS and ESM imports.
	*/
	exports.state = { operationRequestMap: /* @__PURE__ */ new WeakMap() };
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/operationHelpers.js
var require_operationHelpers = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getOperationArgumentValueFromParameter = getOperationArgumentValueFromParameter;
	exports.getOperationRequestInfo = getOperationRequestInfo;
	var state_1 = require_state_cjs();
	/**
	* @internal
	* Retrieves the value to use for a given operation argument
	* @param operationArguments - The arguments passed from the generated client
	* @param parameter - The parameter description
	* @param fallbackObject - If something isn't found in the arguments bag, look here.
	*  Generally used to look at the service client properties.
	*/
	function getOperationArgumentValueFromParameter(operationArguments, parameter, fallbackObject) {
		let parameterPath = parameter.parameterPath;
		const parameterMapper = parameter.mapper;
		let value;
		if (typeof parameterPath === "string") parameterPath = [parameterPath];
		if (Array.isArray(parameterPath)) {
			if (parameterPath.length > 0) if (parameterMapper.isConstant) value = parameterMapper.defaultValue;
			else {
				let propertySearchResult = getPropertyFromParameterPath(operationArguments, parameterPath);
				if (!propertySearchResult.propertyFound && fallbackObject) propertySearchResult = getPropertyFromParameterPath(fallbackObject, parameterPath);
				let useDefaultValue = false;
				if (!propertySearchResult.propertyFound) useDefaultValue = parameterMapper.required || parameterPath[0] === "options" && parameterPath.length === 2;
				value = useDefaultValue ? parameterMapper.defaultValue : propertySearchResult.propertyValue;
			}
		} else {
			if (parameterMapper.required) value = {};
			for (const [propertyName, propertyPath] of Object.entries(parameterPath)) {
				const propertyMapper = parameterMapper.type.modelProperties[propertyName];
				const propertyValue = getOperationArgumentValueFromParameter(operationArguments, {
					parameterPath: propertyPath,
					mapper: propertyMapper
				}, fallbackObject);
				if (propertyValue !== void 0) {
					if (!value) value = {};
					Object.defineProperty(value, propertyName, {
						value: propertyValue,
						enumerable: true,
						configurable: true,
						writable: true
					});
				}
			}
		}
		return value;
	}
	function getPropertyFromParameterPath(parent, parameterPath) {
		const result = { propertyFound: false };
		let i = 0;
		for (; i < parameterPath.length; ++i) {
			const parameterPathPart = parameterPath[i];
			if (parent && parameterPathPart in parent) parent = parent[parameterPathPart];
			else break;
		}
		if (i === parameterPath.length) {
			result.propertyValue = parent;
			result.propertyFound = true;
		}
		return result;
	}
	var originalRequestSymbol = Symbol.for("@azure/core-client original request");
	function hasOriginalRequest(request) {
		return originalRequestSymbol in request;
	}
	function getOperationRequestInfo(request) {
		if (hasOriginalRequest(request)) return getOperationRequestInfo(request[originalRequestSymbol]);
		let info = state_1.state.operationRequestMap.get(request);
		if (!info) {
			info = {};
			state_1.state.operationRequestMap.set(request, info);
		}
		return info;
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/deserializationPolicy.js
var require_deserializationPolicy = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.deserializationPolicyName = void 0;
	exports.deserializationPolicy = deserializationPolicy;
	var interfaces_js_1 = require_interfaces();
	var core_rest_pipeline_1 = require_commonjs$1();
	var serializer_js_1 = require_serializer();
	var operationHelpers_js_1 = require_operationHelpers();
	var defaultJsonContentTypes = ["application/json", "text/json"];
	var defaultXmlContentTypes = ["application/xml", "application/atom+xml"];
	/**
	* The programmatic identifier of the deserializationPolicy.
	*/
	exports.deserializationPolicyName = "deserializationPolicy";
	/**
	* This policy handles parsing out responses according to OperationSpecs on the request.
	*/
	function deserializationPolicy(options = {}) {
		const jsonContentTypes = options.expectedContentTypes?.json ?? defaultJsonContentTypes;
		const xmlContentTypes = options.expectedContentTypes?.xml ?? defaultXmlContentTypes;
		const parseXML = options.parseXML;
		const serializerOptions = options.serializerOptions;
		const updatedOptions = { xml: {
			rootName: serializerOptions?.xml.rootName ?? "",
			includeRoot: serializerOptions?.xml.includeRoot ?? false,
			xmlCharKey: serializerOptions?.xml.xmlCharKey ?? interfaces_js_1.XML_CHARKEY
		} };
		return {
			name: exports.deserializationPolicyName,
			async sendRequest(request, next) {
				const response = await next(request);
				return deserializeResponseBody(jsonContentTypes, xmlContentTypes, response, updatedOptions, parseXML);
			}
		};
	}
	function getOperationResponseMap(parsedResponse) {
		let result;
		const request = parsedResponse.request;
		const operationInfo = (0, operationHelpers_js_1.getOperationRequestInfo)(request);
		const operationSpec = operationInfo?.operationSpec;
		if (operationSpec) if (!operationInfo?.operationResponseGetter) result = operationSpec.responses[parsedResponse.status];
		else result = operationInfo?.operationResponseGetter(operationSpec, parsedResponse);
		return result;
	}
	function shouldDeserializeResponse(parsedResponse) {
		const request = parsedResponse.request;
		const shouldDeserialize = (0, operationHelpers_js_1.getOperationRequestInfo)(request)?.shouldDeserialize;
		let result;
		if (shouldDeserialize === void 0) result = true;
		else if (typeof shouldDeserialize === "boolean") result = shouldDeserialize;
		else result = shouldDeserialize(parsedResponse);
		return result;
	}
	async function deserializeResponseBody(jsonContentTypes, xmlContentTypes, response, options, parseXML) {
		const parsedResponse = await parse(jsonContentTypes, xmlContentTypes, response, options, parseXML);
		if (!shouldDeserializeResponse(parsedResponse)) return parsedResponse;
		const operationSpec = (0, operationHelpers_js_1.getOperationRequestInfo)(parsedResponse.request)?.operationSpec;
		if (!operationSpec || !operationSpec.responses) return parsedResponse;
		const responseSpec = getOperationResponseMap(parsedResponse);
		const { error, shouldReturnResponse } = handleErrorResponse(parsedResponse, operationSpec, responseSpec, options);
		if (error) throw error;
		else if (shouldReturnResponse) return parsedResponse;
		if (responseSpec) {
			if (responseSpec.bodyMapper) {
				let valueToDeserialize = parsedResponse.parsedBody;
				if (operationSpec.isXML && responseSpec.bodyMapper.type.name === serializer_js_1.MapperTypeNames.Sequence) valueToDeserialize = typeof valueToDeserialize === "object" ? valueToDeserialize[responseSpec.bodyMapper.xmlElementName] : [];
				try {
					parsedResponse.parsedBody = operationSpec.serializer.deserialize(responseSpec.bodyMapper, valueToDeserialize, "operationRes.parsedBody", options);
				} catch (deserializeError) {
					throw new core_rest_pipeline_1.RestError(`Error ${deserializeError} occurred in deserializing the responseBody - ${parsedResponse.bodyAsText}`, {
						statusCode: parsedResponse.status,
						request: parsedResponse.request,
						response: parsedResponse
					});
				}
			} else if (operationSpec.httpMethod === "HEAD") parsedResponse.parsedBody = response.status >= 200 && response.status < 300;
			if (responseSpec.headersMapper) parsedResponse.parsedHeaders = operationSpec.serializer.deserialize(responseSpec.headersMapper, parsedResponse.headers.toJSON(), "operationRes.parsedHeaders", {
				xml: {},
				ignoreUnknownProperties: true
			});
		}
		return parsedResponse;
	}
	function isOperationSpecEmpty(operationSpec) {
		const expectedStatusCodes = Object.keys(operationSpec.responses);
		return expectedStatusCodes.length === 0 || expectedStatusCodes.length === 1 && expectedStatusCodes[0] === "default";
	}
	function handleErrorResponse(parsedResponse, operationSpec, responseSpec, options) {
		const isSuccessByStatus = 200 <= parsedResponse.status && parsedResponse.status < 300;
		if (isOperationSpecEmpty(operationSpec) ? isSuccessByStatus : !!responseSpec) if (responseSpec) {
			if (!responseSpec.isError) return {
				error: null,
				shouldReturnResponse: false
			};
		} else return {
			error: null,
			shouldReturnResponse: false
		};
		const errorResponseSpec = responseSpec ?? operationSpec.responses.default;
		const initialErrorMessage = parsedResponse.request.streamResponseStatusCodes?.has(parsedResponse.status) ? `Unexpected status code: ${parsedResponse.status}` : parsedResponse.bodyAsText;
		const error = new core_rest_pipeline_1.RestError(initialErrorMessage, {
			statusCode: parsedResponse.status,
			request: parsedResponse.request,
			response: parsedResponse
		});
		if (!errorResponseSpec && !(parsedResponse.parsedBody?.error?.code && parsedResponse.parsedBody?.error?.message)) throw error;
		const defaultBodyMapper = errorResponseSpec?.bodyMapper;
		const defaultHeadersMapper = errorResponseSpec?.headersMapper;
		try {
			if (parsedResponse.parsedBody) {
				const parsedBody = parsedResponse.parsedBody;
				let deserializedError;
				if (defaultBodyMapper) {
					let valueToDeserialize = parsedBody;
					if (operationSpec.isXML && defaultBodyMapper.type.name === serializer_js_1.MapperTypeNames.Sequence) {
						valueToDeserialize = [];
						const elementName = defaultBodyMapper.xmlElementName;
						if (typeof parsedBody === "object" && elementName) valueToDeserialize = parsedBody[elementName];
					}
					deserializedError = operationSpec.serializer.deserialize(defaultBodyMapper, valueToDeserialize, "error.response.parsedBody", options);
				}
				const internalError = parsedBody.error || deserializedError || parsedBody;
				error.code = internalError.code;
				if (internalError.message) error.message = internalError.message;
				if (defaultBodyMapper) error.response.parsedBody = deserializedError;
			}
			if (parsedResponse.headers && defaultHeadersMapper) error.response.parsedHeaders = operationSpec.serializer.deserialize(defaultHeadersMapper, parsedResponse.headers.toJSON(), "operationRes.parsedHeaders");
		} catch (defaultError) {
			error.message = `Error "${defaultError.message}" occurred in deserializing the responseBody - "${parsedResponse.bodyAsText}" for the default response.`;
		}
		return {
			error,
			shouldReturnResponse: false
		};
	}
	async function parse(jsonContentTypes, xmlContentTypes, operationResponse, opts, parseXML) {
		if (!operationResponse.request.streamResponseStatusCodes?.has(operationResponse.status) && operationResponse.bodyAsText) {
			const text = operationResponse.bodyAsText;
			const contentType = operationResponse.headers.get("Content-Type") || "";
			const contentComponents = !contentType ? [] : contentType.split(";").map((component) => component.toLowerCase());
			try {
				if (contentComponents.length === 0 || contentComponents.some((component) => jsonContentTypes.indexOf(component) !== -1)) {
					operationResponse.parsedBody = JSON.parse(text);
					return operationResponse;
				} else if (contentComponents.some((component) => xmlContentTypes.indexOf(component) !== -1)) {
					if (!parseXML) throw new Error("Parsing XML not supported.");
					operationResponse.parsedBody = await parseXML(text, opts.xml);
					return operationResponse;
				}
			} catch (err) {
				const msg = `Error "${err}" occurred while parsing the response body - ${operationResponse.bodyAsText}.`;
				const errCode = err.code || core_rest_pipeline_1.RestError.PARSE_ERROR;
				throw new core_rest_pipeline_1.RestError(msg, {
					code: errCode,
					statusCode: operationResponse.status,
					request: operationResponse.request,
					response: operationResponse
				});
			}
		}
		return operationResponse;
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/interfaceHelpers.js
var require_interfaceHelpers = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getStreamingResponseStatusCodes = getStreamingResponseStatusCodes;
	exports.getPathStringFromParameter = getPathStringFromParameter;
	var serializer_js_1 = require_serializer();
	/**
	* Gets the list of status codes for streaming responses.
	* @internal
	*/
	function getStreamingResponseStatusCodes(operationSpec) {
		const result = /* @__PURE__ */ new Set();
		for (const [statusCode, operationResponse] of Object.entries(operationSpec.responses)) if (operationResponse.bodyMapper && operationResponse.bodyMapper.type.name === serializer_js_1.MapperTypeNames.Stream) result.add(Number(statusCode));
		return result;
	}
	/**
	* Get the path to this parameter's value as a dotted string (a.b.c).
	* @param parameter - The parameter to get the path string for.
	* @returns The path to this parameter's value as a dotted string.
	* @internal
	*/
	function getPathStringFromParameter(parameter) {
		const { parameterPath, mapper } = parameter;
		let result;
		if (typeof parameterPath === "string") result = parameterPath;
		else if (Array.isArray(parameterPath)) result = parameterPath.join(".");
		else result = mapper.serializedName;
		return result;
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/serializationPolicy.js
var require_serializationPolicy = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.serializationPolicyName = void 0;
	exports.serializationPolicy = serializationPolicy;
	exports.serializeHeaders = serializeHeaders;
	exports.serializeRequestBody = serializeRequestBody;
	var interfaces_js_1 = require_interfaces();
	var operationHelpers_js_1 = require_operationHelpers();
	var serializer_js_1 = require_serializer();
	var interfaceHelpers_js_1 = require_interfaceHelpers();
	/**
	* The programmatic identifier of the serializationPolicy.
	*/
	exports.serializationPolicyName = "serializationPolicy";
	/**
	* This policy handles assembling the request body and headers using
	* an OperationSpec and OperationArguments on the request.
	*/
	function serializationPolicy(options = {}) {
		const stringifyXML = options.stringifyXML;
		return {
			name: exports.serializationPolicyName,
			sendRequest(request, next) {
				const operationInfo = (0, operationHelpers_js_1.getOperationRequestInfo)(request);
				const operationSpec = operationInfo?.operationSpec;
				const operationArguments = operationInfo?.operationArguments;
				if (operationSpec && operationArguments) {
					serializeHeaders(request, operationArguments, operationSpec);
					serializeRequestBody(request, operationArguments, operationSpec, stringifyXML);
				}
				return next(request);
			}
		};
	}
	/**
	* @internal
	*/
	function serializeHeaders(request, operationArguments, operationSpec) {
		if (operationSpec.headerParameters) for (const headerParameter of operationSpec.headerParameters) {
			let headerValue = (0, operationHelpers_js_1.getOperationArgumentValueFromParameter)(operationArguments, headerParameter);
			if (headerValue !== null && headerValue !== void 0 || headerParameter.mapper.required) {
				headerValue = operationSpec.serializer.serialize(headerParameter.mapper, headerValue, (0, interfaceHelpers_js_1.getPathStringFromParameter)(headerParameter));
				const headerCollectionPrefix = headerParameter.mapper.headerCollectionPrefix;
				if (headerCollectionPrefix) for (const key of Object.keys(headerValue)) request.headers.set(headerCollectionPrefix + key, headerValue[key]);
				else request.headers.set(headerParameter.mapper.serializedName || (0, interfaceHelpers_js_1.getPathStringFromParameter)(headerParameter), headerValue);
			}
		}
		const customHeaders = operationArguments.options?.requestOptions?.customHeaders;
		if (customHeaders) for (const customHeaderName of Object.keys(customHeaders)) request.headers.set(customHeaderName, customHeaders[customHeaderName]);
	}
	/**
	* @internal
	*/
	function serializeRequestBody(request, operationArguments, operationSpec, stringifyXML = function() {
		throw new Error("XML serialization unsupported!");
	}) {
		const serializerOptions = operationArguments.options?.serializerOptions;
		const updatedOptions = { xml: {
			rootName: serializerOptions?.xml.rootName ?? "",
			includeRoot: serializerOptions?.xml.includeRoot ?? false,
			xmlCharKey: serializerOptions?.xml.xmlCharKey ?? interfaces_js_1.XML_CHARKEY
		} };
		const xmlCharKey = updatedOptions.xml.xmlCharKey;
		if (operationSpec.requestBody && operationSpec.requestBody.mapper) {
			request.body = (0, operationHelpers_js_1.getOperationArgumentValueFromParameter)(operationArguments, operationSpec.requestBody);
			const bodyMapper = operationSpec.requestBody.mapper;
			const { required, serializedName, xmlName, xmlElementName, xmlNamespace, xmlNamespacePrefix, nullable } = bodyMapper;
			const typeName = bodyMapper.type.name;
			try {
				if (request.body !== void 0 && request.body !== null || nullable && request.body === null || required) {
					const requestBodyParameterPathString = (0, interfaceHelpers_js_1.getPathStringFromParameter)(operationSpec.requestBody);
					request.body = operationSpec.serializer.serialize(bodyMapper, request.body, requestBodyParameterPathString, updatedOptions);
					const isStream = typeName === serializer_js_1.MapperTypeNames.Stream;
					if (operationSpec.isXML) {
						const xmlnsKey = xmlNamespacePrefix ? `xmlns:${xmlNamespacePrefix}` : "xmlns";
						const value = getXmlValueWithNamespace(xmlNamespace, xmlnsKey, typeName, request.body, updatedOptions);
						if (typeName === serializer_js_1.MapperTypeNames.Sequence) request.body = stringifyXML(prepareXMLRootList(value, xmlElementName || xmlName || serializedName, xmlnsKey, xmlNamespace), {
							rootName: xmlName || serializedName,
							xmlCharKey
						});
						else if (!isStream) request.body = stringifyXML(value, {
							rootName: xmlName || serializedName,
							xmlCharKey
						});
					} else if (typeName === serializer_js_1.MapperTypeNames.String && (operationSpec.contentType?.match("text/plain") || operationSpec.mediaType === "text")) return;
					else if (!isStream) request.body = JSON.stringify(request.body);
				}
			} catch (error) {
				throw new Error(`Error "${error.message}" occurred in serializing the payload - ${JSON.stringify(serializedName, void 0, "  ")}.`);
			}
		} else if (operationSpec.formDataParameters && operationSpec.formDataParameters.length > 0) {
			request.formData = {};
			for (const formDataParameter of operationSpec.formDataParameters) {
				const formDataParameterValue = (0, operationHelpers_js_1.getOperationArgumentValueFromParameter)(operationArguments, formDataParameter);
				if (formDataParameterValue !== void 0 && formDataParameterValue !== null) {
					const formDataParameterPropertyName = formDataParameter.mapper.serializedName || (0, interfaceHelpers_js_1.getPathStringFromParameter)(formDataParameter);
					request.formData[formDataParameterPropertyName] = operationSpec.serializer.serialize(formDataParameter.mapper, formDataParameterValue, (0, interfaceHelpers_js_1.getPathStringFromParameter)(formDataParameter), updatedOptions);
				}
			}
		}
	}
	/**
	* Adds an xml namespace to the xml serialized object if needed, otherwise it just returns the value itself
	*/
	function getXmlValueWithNamespace(xmlNamespace, xmlnsKey, typeName, serializedValue, options) {
		if (xmlNamespace && ![
			"Composite",
			"Sequence",
			"Dictionary"
		].includes(typeName)) {
			const result = {};
			result[options.xml.xmlCharKey] = serializedValue;
			result[interfaces_js_1.XML_ATTRKEY] = { [xmlnsKey]: xmlNamespace };
			return result;
		}
		return serializedValue;
	}
	function prepareXMLRootList(obj, elementName, xmlNamespaceKey, xmlNamespace) {
		if (!Array.isArray(obj)) obj = [obj];
		if (!xmlNamespaceKey || !xmlNamespace) return { [elementName]: obj };
		const result = { [elementName]: obj };
		result[interfaces_js_1.XML_ATTRKEY] = { [xmlNamespaceKey]: xmlNamespace };
		return result;
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/pipeline.js
var require_pipeline = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.createClientPipeline = createClientPipeline;
	var deserializationPolicy_js_1 = require_deserializationPolicy();
	var core_rest_pipeline_1 = require_commonjs$1();
	var serializationPolicy_js_1 = require_serializationPolicy();
	/**
	* Creates a new Pipeline for use with a Service Client.
	* Adds in deserializationPolicy by default.
	* Also adds in bearerTokenAuthenticationPolicy if passed a TokenCredential.
	* @param options - Options to customize the created pipeline.
	*/
	function createClientPipeline(options = {}) {
		const pipeline = (0, core_rest_pipeline_1.createPipelineFromOptions)(options ?? {});
		if (options.credentialOptions) pipeline.addPolicy((0, core_rest_pipeline_1.bearerTokenAuthenticationPolicy)({
			credential: options.credentialOptions.credential,
			scopes: options.credentialOptions.credentialScopes
		}));
		pipeline.addPolicy((0, serializationPolicy_js_1.serializationPolicy)(options.serializationOptions), { phase: "Serialize" });
		pipeline.addPolicy((0, deserializationPolicy_js_1.deserializationPolicy)(options.deserializationOptions), { phase: "Deserialize" });
		return pipeline;
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/httpClientCache.js
var require_httpClientCache = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getCachedDefaultHttpClient = getCachedDefaultHttpClient;
	var core_rest_pipeline_1 = require_commonjs$1();
	var cachedHttpClient;
	function getCachedDefaultHttpClient() {
		if (!cachedHttpClient) cachedHttpClient = (0, core_rest_pipeline_1.createDefaultHttpClient)();
		return cachedHttpClient;
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/urlHelpers.js
var require_urlHelpers = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getRequestUrl = getRequestUrl;
	exports.appendQueryParams = appendQueryParams;
	var operationHelpers_js_1 = require_operationHelpers();
	var interfaceHelpers_js_1 = require_interfaceHelpers();
	var CollectionFormatToDelimiterMap = {
		CSV: ",",
		SSV: " ",
		Multi: "Multi",
		TSV: "	",
		Pipes: "|"
	};
	function getRequestUrl(baseUri, operationSpec, operationArguments, fallbackObject) {
		const urlReplacements = calculateUrlReplacements(operationSpec, operationArguments, fallbackObject);
		let isAbsolutePath = false;
		let requestUrl = replaceAll(baseUri, urlReplacements);
		if (operationSpec.path) {
			let path = replaceAll(operationSpec.path, urlReplacements);
			if (operationSpec.path === "/{nextLink}" && path.startsWith("/")) path = path.substring(1);
			if (isAbsoluteUrl(path)) {
				requestUrl = path;
				isAbsolutePath = true;
			} else requestUrl = appendPath(requestUrl, path);
		}
		const { queryParams, sequenceParams } = calculateQueryParameters(operationSpec, operationArguments, fallbackObject);
		/**
		* Notice that this call sets the `noOverwrite` parameter to true if the `requestUrl`
		* is an absolute path. This ensures that existing query parameter values in `requestUrl`
		* do not get overwritten. On the other hand when `requestUrl` is not absolute path, it
		* is still being built so there is nothing to overwrite.
		*/
		requestUrl = appendQueryParams(requestUrl, queryParams, sequenceParams, isAbsolutePath);
		return requestUrl;
	}
	function replaceAll(input, replacements) {
		let result = input;
		for (const [searchValue, replaceValue] of replacements) result = result.split(searchValue).join(replaceValue);
		return result;
	}
	function calculateUrlReplacements(operationSpec, operationArguments, fallbackObject) {
		const result = /* @__PURE__ */ new Map();
		if (operationSpec.urlParameters?.length) for (const urlParameter of operationSpec.urlParameters) {
			let urlParameterValue = (0, operationHelpers_js_1.getOperationArgumentValueFromParameter)(operationArguments, urlParameter, fallbackObject);
			const parameterPathString = (0, interfaceHelpers_js_1.getPathStringFromParameter)(urlParameter);
			urlParameterValue = operationSpec.serializer.serialize(urlParameter.mapper, urlParameterValue, parameterPathString);
			if (!urlParameter.skipEncoding) urlParameterValue = encodeURIComponent(urlParameterValue);
			result.set(`{${urlParameter.mapper.serializedName || parameterPathString}}`, urlParameterValue);
		}
		return result;
	}
	function isAbsoluteUrl(url) {
		return url.includes("://");
	}
	function appendPath(url, pathToAppend) {
		if (!pathToAppend) return url;
		const parsedUrl = new URL(url);
		let newPath = parsedUrl.pathname;
		if (!newPath.endsWith("/")) newPath = `${newPath}/`;
		if (pathToAppend.startsWith("/")) pathToAppend = pathToAppend.substring(1);
		const searchStart = pathToAppend.indexOf("?");
		if (searchStart !== -1) {
			const path = pathToAppend.substring(0, searchStart);
			const search = pathToAppend.substring(searchStart + 1);
			newPath = newPath + path;
			if (search) parsedUrl.search = parsedUrl.search ? `${parsedUrl.search}&${search}` : search;
		} else newPath = newPath + pathToAppend;
		Object.assign(parsedUrl, { pathname: newPath });
		return parsedUrl.toString();
	}
	function calculateQueryParameters(operationSpec, operationArguments, fallbackObject) {
		const result = /* @__PURE__ */ new Map();
		const sequenceParams = /* @__PURE__ */ new Set();
		if (operationSpec.queryParameters?.length) for (const queryParameter of operationSpec.queryParameters) {
			if (queryParameter.mapper.type.name === "Sequence" && queryParameter.mapper.serializedName) sequenceParams.add(queryParameter.mapper.serializedName);
			let queryParameterValue = (0, operationHelpers_js_1.getOperationArgumentValueFromParameter)(operationArguments, queryParameter, fallbackObject);
			if (queryParameterValue !== void 0 && queryParameterValue !== null || queryParameter.mapper.required) {
				queryParameterValue = operationSpec.serializer.serialize(queryParameter.mapper, queryParameterValue, (0, interfaceHelpers_js_1.getPathStringFromParameter)(queryParameter));
				const delimiter = queryParameter.collectionFormat ? CollectionFormatToDelimiterMap[queryParameter.collectionFormat] : "";
				if (Array.isArray(queryParameterValue)) queryParameterValue = queryParameterValue.map((item) => {
					if (item === null || item === void 0) return "";
					return item;
				});
				if (queryParameter.collectionFormat === "Multi" && queryParameterValue.length === 0) continue;
				else if (Array.isArray(queryParameterValue) && (queryParameter.collectionFormat === "SSV" || queryParameter.collectionFormat === "TSV")) queryParameterValue = queryParameterValue.join(delimiter);
				if (!queryParameter.skipEncoding) if (Array.isArray(queryParameterValue)) queryParameterValue = queryParameterValue.map((item) => {
					return encodeURIComponent(item);
				});
				else queryParameterValue = encodeURIComponent(queryParameterValue);
				if (Array.isArray(queryParameterValue) && (queryParameter.collectionFormat === "CSV" || queryParameter.collectionFormat === "Pipes")) queryParameterValue = queryParameterValue.join(delimiter);
				result.set(queryParameter.mapper.serializedName || (0, interfaceHelpers_js_1.getPathStringFromParameter)(queryParameter), queryParameterValue);
			}
		}
		return {
			queryParams: result,
			sequenceParams
		};
	}
	function simpleParseQueryParams(queryString) {
		const result = /* @__PURE__ */ new Map();
		if (!queryString || queryString[0] !== "?") return result;
		queryString = queryString.slice(1);
		const pairs = queryString.split("&");
		for (const pair of pairs) {
			const [name, value] = pair.split("=", 2);
			const existingValue = result.get(name);
			if (existingValue) if (Array.isArray(existingValue)) existingValue.push(value);
			else result.set(name, [existingValue, value]);
			else result.set(name, value);
		}
		return result;
	}
	/** @internal */
	function appendQueryParams(url, queryParams, sequenceParams, noOverwrite = false) {
		if (queryParams.size === 0) return url;
		const parsedUrl = new URL(url);
		const combinedParams = simpleParseQueryParams(parsedUrl.search);
		for (const [name, value] of queryParams) {
			const existingValue = combinedParams.get(name);
			if (Array.isArray(existingValue)) if (Array.isArray(value)) {
				existingValue.push(...value);
				const valueSet = new Set(existingValue);
				combinedParams.set(name, Array.from(valueSet));
			} else existingValue.push(value);
			else if (existingValue) {
				if (Array.isArray(value)) value.unshift(existingValue);
				else if (sequenceParams.has(name)) combinedParams.set(name, [existingValue, value]);
				if (!noOverwrite) combinedParams.set(name, value);
			} else combinedParams.set(name, value);
		}
		const searchPieces = [];
		for (const [name, value] of combinedParams) if (typeof value === "string") searchPieces.push(`${name}=${value}`);
		else if (Array.isArray(value)) for (const subValue of value) searchPieces.push(`${name}=${subValue}`);
		else searchPieces.push(`${name}=${value}`);
		parsedUrl.search = searchPieces.length ? `?${searchPieces.join("&")}` : "";
		return parsedUrl.toString();
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/log.js
var require_log = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.logger = void 0;
	exports.logger = (0, require_commonjs$4().createClientLogger)("core-client");
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/serviceClient.js
var require_serviceClient = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ServiceClient = void 0;
	var core_rest_pipeline_1 = require_commonjs$1();
	var pipeline_js_1 = require_pipeline();
	var utils_js_1 = require_utils();
	var httpClientCache_js_1 = require_httpClientCache();
	var operationHelpers_js_1 = require_operationHelpers();
	var urlHelpers_js_1 = require_urlHelpers();
	var interfaceHelpers_js_1 = require_interfaceHelpers();
	var log_js_1 = require_log();
	/**
	* Initializes a new instance of the ServiceClient.
	*/
	var ServiceClient = class {
		/**
		* If specified, this is the base URI that requests will be made against for this ServiceClient.
		* If it is not specified, then all OperationSpecs must contain a baseUrl property.
		*/
		_endpoint;
		/**
		* The default request content type for the service.
		* Used if no requestContentType is present on an OperationSpec.
		*/
		_requestContentType;
		/**
		* Set to true if the request is sent over HTTP instead of HTTPS
		*/
		_allowInsecureConnection;
		/**
		* The HTTP client that will be used to send requests.
		*/
		_httpClient;
		/**
		* The pipeline used by this client to make requests
		*/
		pipeline;
		/**
		* The ServiceClient constructor
		* @param options - The service client options that govern the behavior of the client.
		*/
		constructor(options = {}) {
			this._requestContentType = options.requestContentType;
			this._endpoint = options.endpoint ?? options.baseUri;
			if (options.baseUri) log_js_1.logger.warning("The baseUri option for SDK Clients has been deprecated, please use endpoint instead.");
			this._allowInsecureConnection = options.allowInsecureConnection;
			this._httpClient = options.httpClient || (0, httpClientCache_js_1.getCachedDefaultHttpClient)();
			this.pipeline = options.pipeline || createDefaultPipeline(options);
			if (options.additionalPolicies?.length) for (const { policy, position } of options.additionalPolicies) {
				const afterPhase = position === "perRetry" ? "Sign" : void 0;
				this.pipeline.addPolicy(policy, { afterPhase });
			}
		}
		/**
		* Send the provided httpRequest.
		*/
		sendRequest(request) {
			return this.pipeline.sendRequest(this._httpClient, request);
		}
		/**
		* Send an HTTP request that is populated using the provided OperationSpec.
		* @typeParam T - The typed result of the request, based on the OperationSpec.
		* @param operationArguments - The arguments that the HTTP request's templated values will be populated from.
		* @param operationSpec - The OperationSpec to use to populate the httpRequest.
		*/
		async sendOperationRequest(operationArguments, operationSpec) {
			const endpoint = operationSpec.baseUrl || this._endpoint;
			if (!endpoint) throw new Error("If operationSpec.baseUrl is not specified, then the ServiceClient must have a endpoint string property that contains the base URL to use.");
			const url = (0, urlHelpers_js_1.getRequestUrl)(endpoint, operationSpec, operationArguments, this);
			const request = (0, core_rest_pipeline_1.createPipelineRequest)({ url });
			request.method = operationSpec.httpMethod;
			const operationInfo = (0, operationHelpers_js_1.getOperationRequestInfo)(request);
			operationInfo.operationSpec = operationSpec;
			operationInfo.operationArguments = operationArguments;
			const contentType = operationSpec.contentType || this._requestContentType;
			if (contentType && operationSpec.requestBody) request.headers.set("Content-Type", contentType);
			const options = operationArguments.options;
			if (options) {
				const requestOptions = options.requestOptions;
				if (requestOptions) {
					if (requestOptions.timeout) request.timeout = requestOptions.timeout;
					if (requestOptions.onUploadProgress) request.onUploadProgress = requestOptions.onUploadProgress;
					if (requestOptions.onDownloadProgress) request.onDownloadProgress = requestOptions.onDownloadProgress;
					if (requestOptions.shouldDeserialize !== void 0) operationInfo.shouldDeserialize = requestOptions.shouldDeserialize;
					if (requestOptions.allowInsecureConnection) request.allowInsecureConnection = true;
				}
				if (options.abortSignal) request.abortSignal = options.abortSignal;
				if (options.tracingOptions) request.tracingOptions = options.tracingOptions;
			}
			if (this._allowInsecureConnection) request.allowInsecureConnection = true;
			if (request.streamResponseStatusCodes === void 0) request.streamResponseStatusCodes = (0, interfaceHelpers_js_1.getStreamingResponseStatusCodes)(operationSpec);
			try {
				const rawResponse = await this.sendRequest(request);
				const flatResponse = (0, utils_js_1.flattenResponse)(rawResponse, operationSpec.responses[rawResponse.status]);
				if (options?.onResponse) options.onResponse(rawResponse, flatResponse);
				return flatResponse;
			} catch (error) {
				if (typeof error === "object" && error?.response) {
					const rawResponse = error.response;
					const flatResponse = (0, utils_js_1.flattenResponse)(rawResponse, operationSpec.responses[error.statusCode] || operationSpec.responses["default"]);
					error.details = flatResponse;
					if (options?.onResponse) options.onResponse(rawResponse, flatResponse, error);
				}
				throw error;
			}
		}
	};
	exports.ServiceClient = ServiceClient;
	function createDefaultPipeline(options) {
		const credentialScopes = getCredentialScopes(options);
		const credentialOptions = options.credential && credentialScopes ? {
			credentialScopes,
			credential: options.credential
		} : void 0;
		return (0, pipeline_js_1.createClientPipeline)({
			...options,
			credentialOptions
		});
	}
	function getCredentialScopes(options) {
		if (options.credentialScopes) return options.credentialScopes;
		if (options.endpoint) return `${options.endpoint}/.default`;
		if (options.baseUri) return `${options.baseUri}/.default`;
		if (options.credential) throw new Error(`When using credentials, the ServiceClientOptions must contain either a endpoint or a credentialScopes. Unable to create a bearerTokenAuthenticationPolicy`);
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/authorizeRequestOnClaimChallenge.js
var require_authorizeRequestOnClaimChallenge = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.parseCAEChallenge = parseCAEChallenge;
	exports.authorizeRequestOnClaimChallenge = authorizeRequestOnClaimChallenge;
	var log_js_1 = require_log();
	var base64_js_1 = require_base64();
	/**
	* Converts: `Bearer a="b", c="d", Bearer d="e", f="g"`.
	* Into: `[ { a: 'b', c: 'd' }, { d: 'e', f: 'g' } ]`.
	*
	* @internal
	*/
	function parseCAEChallenge(challenges) {
		return `, ${challenges.trim()}`.split(", Bearer ").filter((x) => x).map((challenge) => {
			return `${challenge.trim()}, `.split("\", ").filter((x) => x).map((keyValue) => (([key, value]) => ({ [key]: value }))(keyValue.trim().split("=\""))).reduce((a, b) => ({
				...a,
				...b
			}), {});
		});
	}
	/**
	* This function can be used as a callback for the `bearerTokenAuthenticationPolicy` of `@azure/core-rest-pipeline`, to support CAE challenges:
	* [Continuous Access Evaluation](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation).
	*
	* Call the `bearerTokenAuthenticationPolicy` with the following options:
	*
	* ```ts snippet:AuthorizeRequestOnClaimChallenge
	* import { bearerTokenAuthenticationPolicy } from "@azure/core-rest-pipeline";
	* import { authorizeRequestOnClaimChallenge } from "@azure/core-client";
	*
	* const policy = bearerTokenAuthenticationPolicy({
	*   challengeCallbacks: {
	*     authorizeRequestOnChallenge: authorizeRequestOnClaimChallenge,
	*   },
	*   scopes: ["https://service/.default"],
	* });
	* ```
	*
	* Once provided, the `bearerTokenAuthenticationPolicy` policy will internally handle Continuous Access Evaluation (CAE) challenges.
	* When it can't complete a challenge it will return the 401 (unauthorized) response from ARM.
	*
	* Example challenge with claims:
	*
	* ```
	* Bearer authorization_uri="https://login.windows-ppe.net/", error="invalid_token",
	* error_description="User session has been revoked",
	* claims="eyJhY2Nlc3NfdG9rZW4iOnsibmJmIjp7ImVzc2VudGlhbCI6dHJ1ZSwgInZhbHVlIjoiMTYwMzc0MjgwMCJ9fX0="
	* ```
	*/
	async function authorizeRequestOnClaimChallenge(onChallengeOptions) {
		const { scopes, response } = onChallengeOptions;
		const logger = onChallengeOptions.logger || log_js_1.logger;
		const challenge = response.headers.get("WWW-Authenticate");
		if (!challenge) {
			logger.info(`The WWW-Authenticate header was missing. Failed to perform the Continuous Access Evaluation authentication flow.`);
			return false;
		}
		const parsedChallenge = (parseCAEChallenge(challenge) || []).find((x) => x.claims);
		if (!parsedChallenge) {
			logger.info(`The WWW-Authenticate header was missing the necessary "claims" to perform the Continuous Access Evaluation authentication flow.`);
			return false;
		}
		const accessToken = await onChallengeOptions.getAccessToken(parsedChallenge.scope ? [parsedChallenge.scope] : scopes, { claims: (0, base64_js_1.decodeStringToString)(parsedChallenge.claims) });
		if (!accessToken) return false;
		onChallengeOptions.request.headers.set("Authorization", `${accessToken.tokenType ?? "Bearer"} ${accessToken.token}`);
		return true;
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/authorizeRequestOnTenantChallenge.js
var require_authorizeRequestOnTenantChallenge = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.authorizeRequestOnTenantChallenge = void 0;
	/**
	* A set of constants used internally when processing requests.
	*/
	var Constants = {
		DefaultScope: "/.default",
		/**
		* Defines constants for use with HTTP headers.
		*/
		HeaderConstants: { 
		/**
		* The Authorization header.
		*/
AUTHORIZATION: "authorization" }
	};
	function isUuid(text) {
		return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(text);
	}
	/**
	* Defines a callback to handle auth challenge for Storage APIs.
	* This implements the bearer challenge process described here: https://learn.microsoft.com/rest/api/storageservices/authorize-with-azure-active-directory#bearer-challenge
	* Handling has specific features for storage that departs to the general AAD challenge docs.
	**/
	var authorizeRequestOnTenantChallenge = async (challengeOptions) => {
		const requestOptions = requestToOptions(challengeOptions.request);
		const challenge = getChallenge(challengeOptions.response);
		if (challenge) {
			const challengeInfo = parseChallenge(challenge);
			const challengeScopes = buildScopes(challengeOptions, challengeInfo);
			const tenantId = extractTenantId(challengeInfo);
			if (!tenantId) return false;
			const accessToken = await challengeOptions.getAccessToken(challengeScopes, {
				...requestOptions,
				tenantId
			});
			if (!accessToken) return false;
			challengeOptions.request.headers.set(Constants.HeaderConstants.AUTHORIZATION, `${accessToken.tokenType ?? "Bearer"} ${accessToken.token}`);
			return true;
		}
		return false;
	};
	exports.authorizeRequestOnTenantChallenge = authorizeRequestOnTenantChallenge;
	/**
	* Extracts the tenant id from the challenge information
	* The tenant id is contained in the authorization_uri as the first
	* path part.
	*/
	function extractTenantId(challengeInfo) {
		const tenantId = new URL(challengeInfo.authorization_uri).pathname.split("/")[1];
		if (tenantId && isUuid(tenantId)) return tenantId;
	}
	/**
	* Builds the authentication scopes based on the information that comes in the
	* challenge information. Scopes url is present in the resource_id, if it is empty
	* we keep using the original scopes.
	*/
	function buildScopes(challengeOptions, challengeInfo) {
		if (!challengeInfo.resource_id) return challengeOptions.scopes;
		const challengeScopes = new URL(challengeInfo.resource_id);
		let scope = new URL(Constants.DefaultScope, challengeScopes.origin).toString();
		if (scope === "https://disk.azure.com/.default") scope = "https://disk.azure.com//.default";
		return [scope];
	}
	/**
	* We will retrieve the challenge only if the response status code was 401,
	* and if the response contained the header "WWW-Authenticate" with a non-empty value.
	*/
	function getChallenge(response) {
		const challenge = response.headers.get("WWW-Authenticate");
		if (response.status === 401 && challenge) return challenge;
	}
	/**
	* Converts: `Bearer a="b" c="d"`.
	* Into: `[ { a: 'b', c: 'd' }]`.
	*
	* @internal
	*/
	function parseChallenge(challenge) {
		return `${challenge.slice(7).trim()} `.split(" ").filter((x) => x).map((keyValue) => (([key, value]) => ({ [key]: value }))(keyValue.trim().split("="))).reduce((a, b) => ({
			...a,
			...b
		}), {});
	}
	/**
	* Extracts the options form a Pipeline Request for later re-use
	*/
	function requestToOptions(request) {
		return {
			abortSignal: request.abortSignal,
			requestOptions: { timeout: request.timeout },
			tracingOptions: request.tracingOptions
		};
	}
}));
//#endregion
//#region node_modules/@azure/core-client/dist/commonjs/index.js
var require_commonjs = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.authorizeRequestOnTenantChallenge = exports.authorizeRequestOnClaimChallenge = exports.serializationPolicyName = exports.serializationPolicy = exports.deserializationPolicyName = exports.deserializationPolicy = exports.XML_CHARKEY = exports.XML_ATTRKEY = exports.createClientPipeline = exports.ServiceClient = exports.MapperTypeNames = exports.createSerializer = void 0;
	var serializer_js_1 = require_serializer();
	Object.defineProperty(exports, "createSerializer", {
		enumerable: true,
		get: function() {
			return serializer_js_1.createSerializer;
		}
	});
	Object.defineProperty(exports, "MapperTypeNames", {
		enumerable: true,
		get: function() {
			return serializer_js_1.MapperTypeNames;
		}
	});
	var serviceClient_js_1 = require_serviceClient();
	Object.defineProperty(exports, "ServiceClient", {
		enumerable: true,
		get: function() {
			return serviceClient_js_1.ServiceClient;
		}
	});
	var pipeline_js_1 = require_pipeline();
	Object.defineProperty(exports, "createClientPipeline", {
		enumerable: true,
		get: function() {
			return pipeline_js_1.createClientPipeline;
		}
	});
	var interfaces_js_1 = require_interfaces();
	Object.defineProperty(exports, "XML_ATTRKEY", {
		enumerable: true,
		get: function() {
			return interfaces_js_1.XML_ATTRKEY;
		}
	});
	Object.defineProperty(exports, "XML_CHARKEY", {
		enumerable: true,
		get: function() {
			return interfaces_js_1.XML_CHARKEY;
		}
	});
	var deserializationPolicy_js_1 = require_deserializationPolicy();
	Object.defineProperty(exports, "deserializationPolicy", {
		enumerable: true,
		get: function() {
			return deserializationPolicy_js_1.deserializationPolicy;
		}
	});
	Object.defineProperty(exports, "deserializationPolicyName", {
		enumerable: true,
		get: function() {
			return deserializationPolicy_js_1.deserializationPolicyName;
		}
	});
	var serializationPolicy_js_1 = require_serializationPolicy();
	Object.defineProperty(exports, "serializationPolicy", {
		enumerable: true,
		get: function() {
			return serializationPolicy_js_1.serializationPolicy;
		}
	});
	Object.defineProperty(exports, "serializationPolicyName", {
		enumerable: true,
		get: function() {
			return serializationPolicy_js_1.serializationPolicyName;
		}
	});
	var authorizeRequestOnClaimChallenge_js_1 = require_authorizeRequestOnClaimChallenge();
	Object.defineProperty(exports, "authorizeRequestOnClaimChallenge", {
		enumerable: true,
		get: function() {
			return authorizeRequestOnClaimChallenge_js_1.authorizeRequestOnClaimChallenge;
		}
	});
	var authorizeRequestOnTenantChallenge_js_1 = require_authorizeRequestOnTenantChallenge();
	Object.defineProperty(exports, "authorizeRequestOnTenantChallenge", {
		enumerable: true,
		get: function() {
			return authorizeRequestOnTenantChallenge_js_1.authorizeRequestOnTenantChallenge;
		}
	});
}));
//#endregion
export { require_src as a, require_commonjs$4 as i, require_commonjs$1 as n, require_ms as o, require_commonjs$3 as r, require_commonjs as t };
