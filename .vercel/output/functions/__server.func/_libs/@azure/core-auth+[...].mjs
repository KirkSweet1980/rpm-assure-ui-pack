import { i as __require, t as __commonJSMin } from "../../_runtime.mjs";
import { t as require_commonjs$2 } from "../azure__abort-controller.mjs";
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/env.js
var require_env = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var env_exports = {};
	__export(env_exports, {
		emitNodeWarning: () => emitNodeWarning,
		getEnvironmentVariable: () => getEnvironmentVariable,
		isBrowser: () => isBrowser,
		isBun: () => isBun,
		isDeno: () => isDeno,
		isNodeLike: () => isNodeLike,
		isNodeRuntime: () => isNodeRuntime,
		isReactNative: () => isReactNative,
		isWebWorker: () => isWebWorker
	});
	module.exports = __toCommonJS(env_exports);
	var import_node_process = __toESM(__require("node:process"));
	function getEnvironmentVariable(name) {
		return import_node_process.default.env[name];
	}
	function emitNodeWarning(warning) {
		import_node_process.default.emitWarning(warning);
	}
	var isBrowser = false;
	var isWebWorker = false;
	var isDeno = typeof import_node_process.default.versions.deno === "string" && import_node_process.default.versions.deno.length > 0;
	var isBun = typeof import_node_process.default.versions.bun === "string" && import_node_process.default.versions.bun.length > 0;
	var isNodeLike = true;
	var isNodeRuntime = !isBun && !isDeno;
	var isReactNative = false;
	0 && (module.exports = {
		emitNodeWarning,
		getEnvironmentVariable,
		isBrowser,
		isBun,
		isDeno,
		isNodeLike,
		isNodeRuntime,
		isReactNative,
		isWebWorker
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/random.js
var require_random = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var random_exports = {};
	__export(random_exports, { getRandomIntegerInclusive: () => getRandomIntegerInclusive });
	module.exports = __toCommonJS(random_exports);
	function getRandomIntegerInclusive(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	0 && (module.exports = { getRandomIntegerInclusive });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/delay.js
var require_delay$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var delay_exports = {};
	__export(delay_exports, { calculateRetryDelay: () => calculateRetryDelay });
	module.exports = __toCommonJS(delay_exports);
	var import_random = require_random();
	function calculateRetryDelay(retryAttempt, config) {
		const exponentialDelay = config.retryDelayInMs * Math.pow(2, retryAttempt);
		const clampedDelay = Math.min(config.maxRetryDelayInMs, exponentialDelay);
		return { retryAfterInMs: clampedDelay / 2 + (0, import_random.getRandomIntegerInclusive)(0, clampedDelay / 2) };
	}
	0 && (module.exports = { calculateRetryDelay });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/object.js
var require_object = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var object_exports = {};
	__export(object_exports, { isObject: () => isObject });
	module.exports = __toCommonJS(object_exports);
	function isObject(input) {
		return typeof input === "object" && input !== null && !Array.isArray(input) && !(input instanceof RegExp) && !(input instanceof Date);
	}
	0 && (module.exports = { isObject });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/error.js
var require_error$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var error_exports = {};
	__export(error_exports, { isError: () => isError });
	module.exports = __toCommonJS(error_exports);
	var import_object = require_object();
	function isError(e) {
		if ((0, import_object.isObject)(e)) {
			const hasName = typeof e.name === "string";
			const hasMessage = typeof e.message === "string";
			return hasName && hasMessage;
		}
		return false;
	}
	0 && (module.exports = { isError });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/sha256.js
var require_sha256 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var sha256_exports = {};
	__export(sha256_exports, {
		computeSha256Hash: () => computeSha256Hash,
		computeSha256Hmac: () => computeSha256Hmac
	});
	module.exports = __toCommonJS(sha256_exports);
	var import_node_crypto = __require("node:crypto");
	async function computeSha256Hmac(key, stringToSign, encoding) {
		const decodedKey = Buffer.from(key, "base64");
		return (0, import_node_crypto.createHmac)("sha256", decodedKey).update(stringToSign).digest(encoding);
	}
	async function computeSha256Hash(content, encoding) {
		return (0, import_node_crypto.createHash)("sha256").update(content).digest(encoding);
	}
	0 && (module.exports = {
		computeSha256Hash,
		computeSha256Hmac
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/uuidUtils.js
var require_uuidUtils = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var uuidUtils_exports = {};
	__export(uuidUtils_exports, { randomUUID: () => randomUUID });
	module.exports = __toCommonJS(uuidUtils_exports);
	function randomUUID() {
		return globalThis.crypto.randomUUID();
	}
	0 && (module.exports = { randomUUID });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/bytesEncoding.js
var require_bytesEncoding = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var bytesEncoding_exports = {};
	__export(bytesEncoding_exports, {
		stringToUint8Array: () => stringToUint8Array,
		uint8ArrayToString: () => uint8ArrayToString
	});
	module.exports = __toCommonJS(bytesEncoding_exports);
	function uint8ArrayToString(bytes, format) {
		return Buffer.from(bytes).toString(format);
	}
	function stringToUint8Array(value, format) {
		return Buffer.from(value, format);
	}
	0 && (module.exports = {
		stringToUint8Array,
		uint8ArrayToString
	});
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/sanitizer.js
var require_sanitizer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var sanitizer_exports = {};
	__export(sanitizer_exports, { Sanitizer: () => Sanitizer });
	module.exports = __toCommonJS(sanitizer_exports);
	var import_object = require_object();
	var RedactedString = "REDACTED";
	var defaultAllowedHeaderNames = [
		"x-ms-client-request-id",
		"x-ms-return-client-request-id",
		"x-ms-useragent",
		"x-ms-correlation-request-id",
		"x-ms-request-id",
		"client-request-id",
		"ms-cv",
		"return-client-request-id",
		"traceparent",
		"Access-Control-Allow-Credentials",
		"Access-Control-Allow-Headers",
		"Access-Control-Allow-Methods",
		"Access-Control-Allow-Origin",
		"Access-Control-Expose-Headers",
		"Access-Control-Max-Age",
		"Access-Control-Request-Headers",
		"Access-Control-Request-Method",
		"Origin",
		"Accept",
		"Accept-Encoding",
		"Cache-Control",
		"Connection",
		"Content-Length",
		"Content-Type",
		"Date",
		"ETag",
		"Expires",
		"If-Match",
		"If-Modified-Since",
		"If-None-Match",
		"If-Unmodified-Since",
		"Last-Modified",
		"Pragma",
		"Request-Id",
		"Retry-After",
		"Server",
		"Transfer-Encoding",
		"User-Agent",
		"WWW-Authenticate"
	];
	var defaultAllowedQueryParameters = ["api-version"];
	var Sanitizer = class {
		allowedHeaderNames;
		allowedQueryParameters;
		constructor({ additionalAllowedHeaderNames: allowedHeaderNames = [], additionalAllowedQueryParameters: allowedQueryParameters = [] } = {}) {
			allowedHeaderNames = defaultAllowedHeaderNames.concat(allowedHeaderNames);
			allowedQueryParameters = defaultAllowedQueryParameters.concat(allowedQueryParameters);
			this.allowedHeaderNames = new Set(allowedHeaderNames.map((n) => n.toLowerCase()));
			this.allowedQueryParameters = new Set(allowedQueryParameters.map((p) => p.toLowerCase()));
		}
		/**
		* Sanitizes an object for logging.
		* @param obj - The object to sanitize
		* @returns - The sanitized object as a string
		*/
		sanitize(obj) {
			const seen = /* @__PURE__ */ new Set();
			return JSON.stringify(obj, (key, value) => {
				if (value instanceof Error) return {
					...value,
					name: value.name,
					message: value.message
				};
				if (key === "headers" && (0, import_object.isObject)(value)) return this.sanitizeHeaders(value);
				else if (key === "url" && typeof value === "string") return this.sanitizeUrl(value);
				else if (key === "query" && (0, import_object.isObject)(value)) return this.sanitizeQuery(value);
				else if (key === "body") return;
				else if (key === "response") return;
				else if (key === "operationSpec") return;
				else if (Array.isArray(value) || (0, import_object.isObject)(value)) {
					if (seen.has(value)) return "[Circular]";
					seen.add(value);
				}
				return value;
			}, 2);
		}
		/**
		* Sanitizes a URL for logging.
		* @param value - The URL to sanitize
		* @returns - The sanitized URL as a string
		*/
		sanitizeUrl(value) {
			if (typeof value !== "string" || value === null || value === "") return value;
			const url = new URL(value);
			if (!url.search) return value;
			for (const [key] of url.searchParams) if (!this.allowedQueryParameters.has(key.toLowerCase())) url.searchParams.set(key, RedactedString);
			return url.toString();
		}
		sanitizeHeaders(obj) {
			const sanitized = {};
			for (const key of Object.keys(obj)) if (this.allowedHeaderNames.has(key.toLowerCase())) sanitized[key] = obj[key];
			else sanitized[key] = RedactedString;
			return sanitized;
		}
		sanitizeQuery(value) {
			if (typeof value !== "object" || value === null) return value;
			const sanitized = {};
			for (const k of Object.keys(value)) if (this.allowedQueryParameters.has(k.toLowerCase())) sanitized[k] = value[k];
			else sanitized[k] = RedactedString;
			return sanitized;
		}
	};
	0 && (module.exports = { Sanitizer });
}));
//#endregion
//#region node_modules/@typespec/ts-http-runtime/dist/commonjs/util/internal.js
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
		Sanitizer: () => import_sanitizer.Sanitizer,
		calculateRetryDelay: () => import_delay.calculateRetryDelay,
		computeSha256Hash: () => import_sha256.computeSha256Hash,
		computeSha256Hmac: () => import_sha256.computeSha256Hmac,
		getRandomIntegerInclusive: () => import_random.getRandomIntegerInclusive,
		isBrowser: () => import_env.isBrowser,
		isBun: () => import_env.isBun,
		isDeno: () => import_env.isDeno,
		isError: () => import_error.isError,
		isNodeLike: () => import_env.isNodeLike,
		isNodeRuntime: () => import_env.isNodeRuntime,
		isObject: () => import_object.isObject,
		isReactNative: () => import_env.isReactNative,
		isWebWorker: () => import_env.isWebWorker,
		randomUUID: () => import_uuid.randomUUID,
		stringToUint8Array: () => import_bytesEncoding.stringToUint8Array,
		uint8ArrayToString: () => import_bytesEncoding.uint8ArrayToString
	});
	module.exports = __toCommonJS(internal_exports);
	var import_delay = require_delay$1();
	var import_random = require_random();
	var import_object = require_object();
	var import_error = require_error$1();
	var import_sha256 = require_sha256();
	var import_uuid = require_uuidUtils();
	var import_env = require_env();
	var import_bytesEncoding = require_bytesEncoding();
	var import_sanitizer = require_sanitizer();
	0 && (module.exports = {
		Sanitizer,
		calculateRetryDelay,
		computeSha256Hash,
		computeSha256Hmac,
		getRandomIntegerInclusive,
		isBrowser,
		isBun,
		isDeno,
		isError,
		isNodeLike,
		isNodeRuntime,
		isObject,
		isReactNative,
		isWebWorker,
		randomUUID,
		stringToUint8Array,
		uint8ArrayToString
	});
}));
//#endregion
//#region node_modules/@azure/core-util/dist/commonjs/aborterUtils.js
var require_aborterUtils = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var aborterUtils_exports = {};
	__export(aborterUtils_exports, { cancelablePromiseRace: () => cancelablePromiseRace });
	module.exports = __toCommonJS(aborterUtils_exports);
	async function cancelablePromiseRace(abortablePromiseBuilders, options) {
		const aborter = new AbortController();
		function abortHandler() {
			aborter.abort();
		}
		options?.abortSignal?.addEventListener("abort", abortHandler);
		try {
			return await Promise.race(abortablePromiseBuilders.map((p) => p({ abortSignal: aborter.signal })));
		} finally {
			aborter.abort();
			options?.abortSignal?.removeEventListener("abort", abortHandler);
		}
	}
	0 && (module.exports = { cancelablePromiseRace });
}));
//#endregion
//#region node_modules/@azure/core-util/dist/commonjs/createAbortablePromise.js
var require_createAbortablePromise = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var createAbortablePromise_exports = {};
	__export(createAbortablePromise_exports, { createAbortablePromise: () => createAbortablePromise });
	module.exports = __toCommonJS(createAbortablePromise_exports);
	var import_abort_controller = require_commonjs$2();
	function createAbortablePromise(buildPromise, options) {
		const { cleanupBeforeAbort, abortSignal, abortErrorMsg } = options ?? {};
		return new Promise((resolve, reject) => {
			function rejectOnAbort() {
				reject(new import_abort_controller.AbortError(abortErrorMsg ?? "The operation was aborted."));
			}
			function removeListeners() {
				abortSignal?.removeEventListener("abort", onAbort);
			}
			function onAbort() {
				cleanupBeforeAbort?.();
				removeListeners();
				rejectOnAbort();
			}
			if (abortSignal?.aborted) return rejectOnAbort();
			try {
				buildPromise((x) => {
					removeListeners();
					resolve(x);
				}, (x) => {
					removeListeners();
					reject(x);
				});
			} catch (err) {
				reject(err);
			}
			abortSignal?.addEventListener("abort", onAbort);
		});
	}
	0 && (module.exports = { createAbortablePromise });
}));
//#endregion
//#region node_modules/@azure/core-util/dist/commonjs/delay.js
var require_delay = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var delay_exports = {};
	__export(delay_exports, { delay: () => delay });
	module.exports = __toCommonJS(delay_exports);
	var import_createAbortablePromise = require_createAbortablePromise();
	var StandardAbortMessage = "The delay was aborted.";
	function delay(timeInMs, options) {
		let token;
		const { abortSignal, abortErrorMsg } = options ?? {};
		return (0, import_createAbortablePromise.createAbortablePromise)((resolve) => {
			token = setTimeout(resolve, timeInMs);
		}, {
			cleanupBeforeAbort: () => clearTimeout(token),
			abortSignal,
			abortErrorMsg: abortErrorMsg ?? StandardAbortMessage
		});
	}
	0 && (module.exports = { delay });
}));
//#endregion
//#region node_modules/@azure/core-util/dist/commonjs/error.js
var require_error = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var error_exports = {};
	__export(error_exports, { getErrorMessage: () => getErrorMessage });
	module.exports = __toCommonJS(error_exports);
	var import_util = require_internal();
	function getErrorMessage(e) {
		if ((0, import_util.isError)(e)) return e.message;
		else {
			let stringified;
			try {
				if (typeof e === "object" && e) stringified = JSON.stringify(e);
				else stringified = String(e);
			} catch (err) {
				stringified = "[unable to stringify input]";
			}
			return `Unknown error ${stringified}`;
		}
	}
	0 && (module.exports = { getErrorMessage });
}));
//#endregion
//#region node_modules/@azure/core-util/dist/commonjs/typeGuards.js
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
		isDefined: () => isDefined,
		isObjectWithProperties: () => isObjectWithProperties,
		objectHasProperty: () => objectHasProperty
	});
	module.exports = __toCommonJS(typeGuards_exports);
	function isDefined(thing) {
		return typeof thing !== "undefined" && thing !== null;
	}
	function isObjectWithProperties(thing, properties) {
		if (!isDefined(thing) || typeof thing !== "object") return false;
		for (const property of properties) if (!objectHasProperty(thing, property)) return false;
		return true;
	}
	function objectHasProperty(thing, property) {
		return isDefined(thing) && typeof thing === "object" && property in thing;
	}
	0 && (module.exports = {
		isDefined,
		isObjectWithProperties,
		objectHasProperty
	});
}));
//#endregion
//#region node_modules/@azure/core-util/dist/commonjs/index.js
var require_commonjs$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var src_exports = {};
	__export(src_exports, {
		calculateRetryDelay: () => calculateRetryDelay,
		cancelablePromiseRace: () => import_aborterUtils.cancelablePromiseRace,
		computeSha256Hash: () => computeSha256Hash,
		computeSha256Hmac: () => computeSha256Hmac,
		createAbortablePromise: () => import_createAbortablePromise.createAbortablePromise,
		delay: () => import_delay.delay,
		getErrorMessage: () => import_error.getErrorMessage,
		getRandomIntegerInclusive: () => getRandomIntegerInclusive,
		isBrowser: () => isBrowser,
		isBun: () => isBun,
		isDefined: () => import_typeGuards.isDefined,
		isDeno: () => isDeno,
		isError: () => isError,
		isNode: () => isNode,
		isNodeLike: () => isNodeLike,
		isNodeRuntime: () => isNodeRuntime,
		isObject: () => isObject,
		isObjectWithProperties: () => import_typeGuards.isObjectWithProperties,
		isReactNative: () => isReactNative,
		isWebWorker: () => isWebWorker,
		objectHasProperty: () => import_typeGuards.objectHasProperty,
		randomUUID: () => randomUUID,
		stringToUint8Array: () => stringToUint8Array,
		uint8ArrayToString: () => uint8ArrayToString
	});
	module.exports = __toCommonJS(src_exports);
	var tspRuntime = __toESM(require_internal());
	var import_aborterUtils = require_aborterUtils();
	var import_createAbortablePromise = require_createAbortablePromise();
	var import_delay = require_delay();
	var import_error = require_error();
	var import_typeGuards = require_typeGuards();
	function calculateRetryDelay(retryAttempt, config) {
		return tspRuntime.calculateRetryDelay(retryAttempt, config);
	}
	function computeSha256Hash(content, encoding) {
		return tspRuntime.computeSha256Hash(content, encoding);
	}
	function computeSha256Hmac(key, stringToSign, encoding) {
		return tspRuntime.computeSha256Hmac(key, stringToSign, encoding);
	}
	function getRandomIntegerInclusive(min, max) {
		return tspRuntime.getRandomIntegerInclusive(min, max);
	}
	function isError(e) {
		return tspRuntime.isError(e);
	}
	function isObject(input) {
		return tspRuntime.isObject(input);
	}
	function randomUUID() {
		return tspRuntime.randomUUID();
	}
	var isBrowser = tspRuntime.isBrowser;
	var isBun = tspRuntime.isBun;
	var isDeno = tspRuntime.isDeno;
	var isNode = tspRuntime.isNodeLike;
	var isNodeLike = tspRuntime.isNodeLike;
	var isNodeRuntime = tspRuntime.isNodeRuntime;
	var isReactNative = tspRuntime.isReactNative;
	var isWebWorker = tspRuntime.isWebWorker;
	function uint8ArrayToString(bytes, format) {
		return tspRuntime.uint8ArrayToString(bytes, format);
	}
	function stringToUint8Array(value, format) {
		return tspRuntime.stringToUint8Array(value, format);
	}
	0 && (module.exports = {
		calculateRetryDelay,
		cancelablePromiseRace,
		computeSha256Hash,
		computeSha256Hmac,
		createAbortablePromise,
		delay,
		getErrorMessage,
		getRandomIntegerInclusive,
		isBrowser,
		isBun,
		isDefined,
		isDeno,
		isError,
		isNode,
		isNodeLike,
		isNodeRuntime,
		isObject,
		isObjectWithProperties,
		isReactNative,
		isWebWorker,
		objectHasProperty,
		randomUUID,
		stringToUint8Array,
		uint8ArrayToString
	});
}));
//#endregion
//#region node_modules/@azure/core-auth/dist/commonjs/azureKeyCredential.js
var require_azureKeyCredential = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var azureKeyCredential_exports = {};
	__export(azureKeyCredential_exports, { AzureKeyCredential: () => AzureKeyCredential });
	module.exports = __toCommonJS(azureKeyCredential_exports);
	var AzureKeyCredential = class {
		_key;
		/**
		* The value of the key to be used in authentication
		*/
		get key() {
			return this._key;
		}
		/**
		* Create an instance of an AzureKeyCredential for use
		* with a service client.
		*
		* @param key - The initial value of the key to use in authentication
		*/
		constructor(key) {
			if (!key) throw new Error("key must be a non-empty string");
			this._key = key;
		}
		/**
		* Change the value of the key.
		*
		* Updates will take effect upon the next request after
		* updating the key value.
		*
		* @param newKey - The new key value to be used
		*/
		update(newKey) {
			this._key = newKey;
		}
	};
	0 && (module.exports = { AzureKeyCredential });
}));
//#endregion
//#region node_modules/@azure/core-auth/dist/commonjs/keyCredential.js
var require_keyCredential = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var keyCredential_exports = {};
	__export(keyCredential_exports, { isKeyCredential: () => isKeyCredential });
	module.exports = __toCommonJS(keyCredential_exports);
	var import_core_util = require_commonjs$1();
	function isKeyCredential(credential) {
		return (0, import_core_util.isObjectWithProperties)(credential, ["key"]) && typeof credential.key === "string";
	}
	0 && (module.exports = { isKeyCredential });
}));
//#endregion
//#region node_modules/@azure/core-auth/dist/commonjs/azureNamedKeyCredential.js
var require_azureNamedKeyCredential = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var azureNamedKeyCredential_exports = {};
	__export(azureNamedKeyCredential_exports, {
		AzureNamedKeyCredential: () => AzureNamedKeyCredential,
		isNamedKeyCredential: () => isNamedKeyCredential
	});
	module.exports = __toCommonJS(azureNamedKeyCredential_exports);
	var import_core_util = require_commonjs$1();
	var AzureNamedKeyCredential = class {
		_key;
		_name;
		/**
		* The value of the key to be used in authentication.
		*/
		get key() {
			return this._key;
		}
		/**
		* The value of the name to be used in authentication.
		*/
		get name() {
			return this._name;
		}
		/**
		* Create an instance of an AzureNamedKeyCredential for use
		* with a service client.
		*
		* @param name - The initial value of the name to use in authentication.
		* @param key - The initial value of the key to use in authentication.
		*/
		constructor(name, key) {
			if (!name || !key) throw new TypeError("name and key must be non-empty strings");
			this._name = name;
			this._key = key;
		}
		/**
		* Change the value of the key.
		*
		* Updates will take effect upon the next request after
		* updating the key value.
		*
		* @param newName - The new name value to be used.
		* @param newKey - The new key value to be used.
		*/
		update(newName, newKey) {
			if (!newName || !newKey) throw new TypeError("newName and newKey must be non-empty strings");
			this._name = newName;
			this._key = newKey;
		}
	};
	function isNamedKeyCredential(credential) {
		return (0, import_core_util.isObjectWithProperties)(credential, ["name", "key"]) && typeof credential.key === "string" && typeof credential.name === "string";
	}
	0 && (module.exports = {
		AzureNamedKeyCredential,
		isNamedKeyCredential
	});
}));
//#endregion
//#region node_modules/@azure/core-auth/dist/commonjs/azureSASCredential.js
var require_azureSASCredential = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var azureSASCredential_exports = {};
	__export(azureSASCredential_exports, {
		AzureSASCredential: () => AzureSASCredential,
		isSASCredential: () => isSASCredential
	});
	module.exports = __toCommonJS(azureSASCredential_exports);
	var import_core_util = require_commonjs$1();
	var AzureSASCredential = class {
		_signature;
		/**
		* The value of the shared access signature to be used in authentication
		*/
		get signature() {
			return this._signature;
		}
		/**
		* Create an instance of an AzureSASCredential for use
		* with a service client.
		*
		* @param signature - The initial value of the shared access signature to use in authentication
		*/
		constructor(signature) {
			if (!signature) throw new Error("shared access signature must be a non-empty string");
			this._signature = signature;
		}
		/**
		* Change the value of the signature.
		*
		* Updates will take effect upon the next request after
		* updating the signature value.
		*
		* @param newSignature - The new shared access signature value to be used
		*/
		update(newSignature) {
			if (!newSignature) throw new Error("shared access signature must be a non-empty string");
			this._signature = newSignature;
		}
	};
	function isSASCredential(credential) {
		return (0, import_core_util.isObjectWithProperties)(credential, ["signature"]) && typeof credential.signature === "string";
	}
	0 && (module.exports = {
		AzureSASCredential,
		isSASCredential
	});
}));
//#endregion
//#region node_modules/@azure/core-auth/dist/commonjs/tokenCredential.js
var require_tokenCredential = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var tokenCredential_exports = {};
	__export(tokenCredential_exports, { isTokenCredential: () => isTokenCredential });
	module.exports = __toCommonJS(tokenCredential_exports);
	function isTokenCredential(credential) {
		const castCredential = credential;
		return castCredential && typeof castCredential.getToken === "function" && (castCredential.signRequest === void 0 || castCredential.getToken.length > 0);
	}
	0 && (module.exports = { isTokenCredential });
}));
//#endregion
//#region node_modules/@azure/core-auth/dist/commonjs/index.js
var require_commonjs = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
		AzureKeyCredential: () => import_azureKeyCredential.AzureKeyCredential,
		AzureNamedKeyCredential: () => import_azureNamedKeyCredential.AzureNamedKeyCredential,
		AzureSASCredential: () => import_azureSASCredential.AzureSASCredential,
		isKeyCredential: () => import_keyCredential.isKeyCredential,
		isNamedKeyCredential: () => import_azureNamedKeyCredential.isNamedKeyCredential,
		isSASCredential: () => import_azureSASCredential.isSASCredential,
		isTokenCredential: () => import_tokenCredential.isTokenCredential
	});
	module.exports = __toCommonJS(src_exports);
	var import_azureKeyCredential = require_azureKeyCredential();
	var import_keyCredential = require_keyCredential();
	var import_azureNamedKeyCredential = require_azureNamedKeyCredential();
	var import_azureSASCredential = require_azureSASCredential();
	var import_tokenCredential = require_tokenCredential();
	0 && (module.exports = {
		AzureKeyCredential,
		AzureNamedKeyCredential,
		AzureSASCredential,
		isKeyCredential,
		isNamedKeyCredential,
		isSASCredential,
		isTokenCredential
	});
}));
//#endregion
export { require_bytesEncoding as a, require_delay$1 as c, require_sanitizer as i, require_env as l, require_commonjs$1 as n, require_uuidUtils as o, require_internal as r, require_error$1 as s, require_commonjs as t };
