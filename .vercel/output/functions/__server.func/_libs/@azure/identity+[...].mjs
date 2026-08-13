import { i as __require, t as __commonJSMin } from "../../_runtime.mjs";
import { i as require_commonjs$1, n as require_commonjs$4, o as require_ms, r as require_commonjs$2, t as require_commonjs$3 } from "./core-client+[...].mjs";
import { n as require_commonjs$5 } from "./core-auth+[...].mjs";
import { t as require_commonjs$6 } from "../azure__abort-controller.mjs";
//#region node_modules/@azure/identity/dist/commonjs/constants.js
var require_constants$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.DEFAULT_TOKEN_CACHE_NAME = exports.CACHE_NON_CAE_SUFFIX = exports.CACHE_CAE_SUFFIX = exports.ALL_TENANTS = exports.DefaultAuthority = exports.DefaultAuthorityHost = exports.AzureAuthorityHosts = exports.DefaultTenantId = exports.DeveloperSignOnClientId = exports.SDK_VERSION = void 0;
	/**
	* Current version of the `@azure/identity` package.
	*/
	exports.SDK_VERSION = `4.13.1`;
	/**
	* The default client ID for authentication
	* @internal
	*/
	exports.DeveloperSignOnClientId = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";
	/**
	* The default tenant for authentication
	* @internal
	*/
	exports.DefaultTenantId = "common";
	/**
	* A list of known Azure authority hosts
	*/
	var AzureAuthorityHosts;
	(function(AzureAuthorityHosts) {
		/**
		* China-based Azure Authority Host
		*/
		AzureAuthorityHosts["AzureChina"] = "https://login.chinacloudapi.cn";
		/**
		* Germany-based Azure Authority Host
		*
		* @deprecated Microsoft Cloud Germany was closed on October 29th, 2021.
		*
		* */
		AzureAuthorityHosts["AzureGermany"] = "https://login.microsoftonline.de";
		/**
		* US Government Azure Authority Host
		*/
		AzureAuthorityHosts["AzureGovernment"] = "https://login.microsoftonline.us";
		/**
		* Public Cloud Azure Authority Host
		*/
		AzureAuthorityHosts["AzurePublicCloud"] = "https://login.microsoftonline.com";
	})(AzureAuthorityHosts || (exports.AzureAuthorityHosts = AzureAuthorityHosts = {}));
	/**
	* @internal
	* The default authority host.
	*/
	exports.DefaultAuthorityHost = AzureAuthorityHosts.AzurePublicCloud;
	/**
	* @internal
	* The default environment host for Azure Public Cloud
	*/
	exports.DefaultAuthority = "login.microsoftonline.com";
	/**
	* @internal
	* Allow acquiring tokens for any tenant for multi-tentant auth.
	*/
	exports.ALL_TENANTS = ["*"];
	/**
	* @internal
	*/
	exports.CACHE_CAE_SUFFIX = "cae";
	/**
	* @internal
	*/
	exports.CACHE_NON_CAE_SUFFIX = "nocae";
	/**
	* @internal
	*
	* The default name for the cache persistence plugin.
	* Matches the constant defined in the cache persistence package.
	*/
	exports.DEFAULT_TOKEN_CACHE_NAME = "msal.cache";
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/msal/nodeFlows/msalPlugins.js
var require_msalPlugins = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.msalPlugins = exports.msalNodeFlowVSCodeCredentialControl = exports.msalNodeFlowNativeBrokerControl = exports.vsCodeBrokerInfo = exports.vsCodeAuthRecordPath = exports.nativeBrokerInfo = exports.msalNodeFlowCacheControl = exports.persistenceProvider = void 0;
	exports.hasNativeBroker = hasNativeBroker;
	exports.hasVSCodePlugin = hasVSCodePlugin;
	var constants_js_1 = require_constants$1();
	/**
	* The current persistence provider, undefined by default.
	* @internal
	*/
	exports.persistenceProvider = void 0;
	/**
	* An object that allows setting the persistence provider.
	* @internal
	*/
	exports.msalNodeFlowCacheControl = { setPersistence(pluginProvider) {
		exports.persistenceProvider = pluginProvider;
	} };
	/**
	* The current native broker provider, undefined by default.
	* @internal
	*/
	exports.nativeBrokerInfo = void 0;
	/**
	* The current VSCode auth record path, undefined by default.
	* @internal
	*/
	exports.vsCodeAuthRecordPath = void 0;
	/**
	* The current VSCode broker, undefined by default.
	* @internal
	*/
	exports.vsCodeBrokerInfo = void 0;
	function hasNativeBroker() {
		return exports.nativeBrokerInfo !== void 0;
	}
	function hasVSCodePlugin() {
		return exports.vsCodeAuthRecordPath !== void 0 && exports.vsCodeBrokerInfo !== void 0;
	}
	/**
	* An object that allows setting the native broker provider.
	* @internal
	*/
	exports.msalNodeFlowNativeBrokerControl = { setNativeBroker(broker) {
		exports.nativeBrokerInfo = { broker };
	} };
	/**
	* An object that allows setting the VSCode credential auth record path and broker.
	* @internal
	*/
	exports.msalNodeFlowVSCodeCredentialControl = {
		setVSCodeAuthRecordPath(path) {
			exports.vsCodeAuthRecordPath = path;
		},
		setVSCodeBroker(broker) {
			exports.vsCodeBrokerInfo = { broker };
		}
	};
	/**
	* Configures plugins, validating that required plugins are available and enabled.
	*
	* Does not create the plugins themselves, but rather returns the configuration that will be used to create them.
	*
	* @param options - options for creating the MSAL client
	* @returns plugin configuration
	*/
	function generatePluginConfiguration(options) {
		const config = {
			cache: {},
			broker: {
				...options.brokerOptions,
				isEnabled: options.brokerOptions?.enabled ?? false,
				enableMsaPassthrough: options.brokerOptions?.legacyEnableMsaPassthrough ?? false
			}
		};
		if (options.tokenCachePersistenceOptions?.enabled) {
			if (exports.persistenceProvider === void 0) throw new Error([
				"Persistent token caching was requested, but no persistence provider was configured.",
				"You must install the identity-cache-persistence plugin package (`npm install --save @azure/identity-cache-persistence`)",
				"and enable it by importing `useIdentityPlugin` from `@azure/identity` and calling",
				"`useIdentityPlugin(cachePersistencePlugin)` before using `tokenCachePersistenceOptions`."
			].join(" "));
			const cacheBaseName = options.tokenCachePersistenceOptions.name || constants_js_1.DEFAULT_TOKEN_CACHE_NAME;
			config.cache.cachePlugin = (0, exports.persistenceProvider)({
				name: `${cacheBaseName}.${constants_js_1.CACHE_NON_CAE_SUFFIX}`,
				...options.tokenCachePersistenceOptions
			});
			config.cache.cachePluginCae = (0, exports.persistenceProvider)({
				name: `${cacheBaseName}.${constants_js_1.CACHE_CAE_SUFFIX}`,
				...options.tokenCachePersistenceOptions
			});
		}
		if (options.brokerOptions?.enabled) config.broker.nativeBrokerPlugin = getBrokerPlugin(options.isVSCodeCredential || false);
		return config;
	}
	var brokerErrorTemplates = {
		missing: (credentialName, packageName, pluginVar) => [
			`${credentialName} was requested, but no plugin was configured or no authentication record was found.`,
			`You must install the ${packageName} plugin package (npm install --save ${packageName})`,
			"and enable it by importing `useIdentityPlugin` from `@azure/identity` and calling",
			`useIdentityPlugin(${pluginVar}) before using enableBroker.`
		].join(" "),
		unavailable: (credentialName, packageName) => [
			`${credentialName} was requested, and the plugin is configured, but the broker is unavailable.`,
			`Ensure the ${credentialName} plugin is properly installed and configured.`,
			"Check for missing native dependencies and ensure the package is properly installed.",
			`See the README for prerequisites on installing and using ${packageName}.`
		].join(" ")
	};
	var brokerConfig = {
		vsCode: {
			credentialName: "Visual Studio Code Credential",
			packageName: "@azure/identity-vscode",
			pluginVar: "vsCodePlugin",
			get brokerInfo() {
				return exports.vsCodeBrokerInfo;
			}
		},
		native: {
			credentialName: "Broker for WAM",
			packageName: "@azure/identity-broker",
			pluginVar: "nativeBrokerPlugin",
			get brokerInfo() {
				return exports.nativeBrokerInfo;
			}
		}
	};
	/**
	* Set appropriate broker plugin based on whether VSCode or native broker is requested.
	* @param isVSCodePlugin - true for VSCode broker, false for native broker
	* @returns the broker plugin if available
	*/
	function getBrokerPlugin(isVSCodePlugin) {
		const { credentialName, packageName, pluginVar, brokerInfo } = brokerConfig[isVSCodePlugin ? "vsCode" : "native"];
		if (brokerInfo === void 0) throw new Error(brokerErrorTemplates.missing(credentialName, packageName, pluginVar));
		if (brokerInfo.broker.isBrokerAvailable === false) throw new Error(brokerErrorTemplates.unavailable(credentialName, packageName));
		return brokerInfo.broker;
	}
	/**
	* Wraps generatePluginConfiguration as a writeable property for test stubbing purposes.
	*/
	exports.msalPlugins = { generatePluginConfiguration };
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/plugins/consumer.js
var require_consumer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.useIdentityPlugin = useIdentityPlugin;
	var msalPlugins_js_1 = require_msalPlugins();
	/**
	* The context passed to an Identity plugin. This contains objects that
	* plugins can use to set backend implementations.
	*/
	var pluginContext = {
		cachePluginControl: msalPlugins_js_1.msalNodeFlowCacheControl,
		nativeBrokerPluginControl: msalPlugins_js_1.msalNodeFlowNativeBrokerControl,
		vsCodeCredentialControl: msalPlugins_js_1.msalNodeFlowVSCodeCredentialControl
	};
	/**
	* Extend Azure Identity with additional functionality. Pass a plugin from
	* a plugin package, such as:
	*
	* - `@azure/identity-cache-persistence`: provides persistent token caching
	* - `@azure/identity-vscode`: provides the dependencies of
	*   `VisualStudioCodeCredential` and enables it
	*
	* Example:
	*
	* ```ts snippet:consumer_example
	* import { useIdentityPlugin, DeviceCodeCredential } from "@azure/identity";
	*
	* useIdentityPlugin(cachePersistencePlugin);
	* // The plugin has the capability to extend `DeviceCodeCredential` and to
	* // add middleware to the underlying credentials, such as persistence.
	* const credential = new DeviceCodeCredential({
	*   tokenCachePersistenceOptions: {
	*     enabled: true,
	*   },
	* });
	* ```
	*
	* @param plugin - the plugin to register
	*/
	function useIdentityPlugin(plugin) {
		plugin(pluginContext);
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/errors.js
var require_errors = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.AuthenticationRequiredError = exports.AggregateAuthenticationError = exports.AggregateAuthenticationErrorName = exports.AuthenticationError = exports.AuthenticationErrorName = exports.CredentialUnavailableError = exports.CredentialUnavailableErrorName = void 0;
	function isErrorResponse(errorResponse) {
		return errorResponse && typeof errorResponse.error === "string" && typeof errorResponse.error_description === "string";
	}
	/**
	* The Error.name value of an CredentialUnavailable
	*/
	exports.CredentialUnavailableErrorName = "CredentialUnavailableError";
	/**
	* This signifies that the credential that was tried in a chained credential
	* was not available to be used as the credential. Rather than treating this as
	* an error that should halt the chain, it's caught and the chain continues
	*/
	var CredentialUnavailableError = class extends Error {
		constructor(message, options) {
			super(message, options);
			this.name = exports.CredentialUnavailableErrorName;
		}
	};
	exports.CredentialUnavailableError = CredentialUnavailableError;
	/**
	* The Error.name value of an AuthenticationError
	*/
	exports.AuthenticationErrorName = "AuthenticationError";
	/**
	* Provides details about a failure to authenticate with Azure Active
	* Directory.  The `errorResponse` field contains more details about
	* the specific failure.
	*/
	var AuthenticationError = class extends Error {
		/**
		* The HTTP status code returned from the authentication request.
		*/
		statusCode;
		/**
		* The error response details.
		*/
		errorResponse;
		constructor(statusCode, errorBody, options) {
			let errorResponse = {
				error: "unknown",
				errorDescription: "An unknown error occurred and no additional details are available."
			};
			if (isErrorResponse(errorBody)) errorResponse = convertOAuthErrorResponseToErrorResponse(errorBody);
			else if (typeof errorBody === "string") try {
				errorResponse = convertOAuthErrorResponseToErrorResponse(JSON.parse(errorBody));
			} catch (e) {
				if (statusCode === 400) errorResponse = {
					error: "invalid_request",
					errorDescription: `The service indicated that the request was invalid.\n\n${errorBody}`
				};
				else errorResponse = {
					error: "unknown_error",
					errorDescription: `An unknown error has occurred. Response body:\n\n${errorBody}`
				};
			}
			else errorResponse = {
				error: "unknown_error",
				errorDescription: "An unknown error occurred and no additional details are available."
			};
			super(`${errorResponse.error} Status code: ${statusCode}\nMore details:\n${errorResponse.errorDescription},`, options);
			this.statusCode = statusCode;
			this.errorResponse = errorResponse;
			this.name = exports.AuthenticationErrorName;
		}
	};
	exports.AuthenticationError = AuthenticationError;
	/**
	* The Error.name value of an AggregateAuthenticationError
	*/
	exports.AggregateAuthenticationErrorName = "AggregateAuthenticationError";
	/**
	* Provides an `errors` array containing {@link AuthenticationError} instance
	* for authentication failures from credentials in a {@link ChainedTokenCredential}.
	*/
	var AggregateAuthenticationError = class extends Error {
		/**
		* The array of error objects that were thrown while trying to authenticate
		* with the credentials in a {@link ChainedTokenCredential}.
		*/
		errors;
		constructor(errors, errorMessage) {
			const errorDetail = errors.join("\n");
			super(`${errorMessage}\n${errorDetail}`);
			this.errors = errors;
			this.name = exports.AggregateAuthenticationErrorName;
		}
	};
	exports.AggregateAuthenticationError = AggregateAuthenticationError;
	function convertOAuthErrorResponseToErrorResponse(errorBody) {
		return {
			error: errorBody.error,
			errorDescription: errorBody.error_description,
			correlationId: errorBody.correlation_id,
			errorCodes: errorBody.error_codes,
			timestamp: errorBody.timestamp,
			traceId: errorBody.trace_id
		};
	}
	/**
	* Error used to enforce authentication after trying to retrieve a token silently.
	*/
	var AuthenticationRequiredError = class extends Error {
		/**
		* The list of scopes for which the token will have access.
		*/
		scopes;
		/**
		* The options passed to the getToken request.
		*/
		getTokenOptions;
		constructor(options) {
			super(options.message, options.cause ? { cause: options.cause } : void 0);
			this.scopes = options.scopes;
			this.getTokenOptions = options.getTokenOptions;
			this.name = "AuthenticationRequiredError";
		}
	};
	exports.AuthenticationRequiredError = AuthenticationRequiredError;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/util/logging.js
var require_logging = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.logger = void 0;
	exports.processEnvVars = processEnvVars;
	exports.logEnvVars = logEnvVars;
	exports.formatSuccess = formatSuccess;
	exports.formatError = formatError;
	exports.credentialLoggerInstance = credentialLoggerInstance;
	exports.credentialLogger = credentialLogger;
	/**
	* The AzureLogger used for all clients within the identity package
	*/
	exports.logger = (0, require_commonjs$1().createClientLogger)("identity");
	/**
	* Separates a list of environment variable names into a plain object with two arrays: an array of missing environment variables and another array with assigned environment variables.
	* @param supportedEnvVars - List of environment variable names
	*/
	function processEnvVars(supportedEnvVars) {
		return supportedEnvVars.reduce((acc, envVariable) => {
			if (process.env[envVariable]) acc.assigned.push(envVariable);
			else acc.missing.push(envVariable);
			return acc;
		}, {
			missing: [],
			assigned: []
		});
	}
	/**
	* Based on a given list of environment variable names,
	* logs the environment variables currently assigned during the usage of a credential that goes by the given name.
	* @param credentialName - Name of the credential in use
	* @param supportedEnvVars - List of environment variables supported by that credential
	*/
	function logEnvVars(credentialName, supportedEnvVars) {
		const { assigned } = processEnvVars(supportedEnvVars);
		exports.logger.info(`${credentialName} => Found the following environment variables: ${assigned.join(", ")}`);
	}
	/**
	* Formatting the success event on the credentials
	*/
	function formatSuccess(scope) {
		return `SUCCESS. Scopes: ${Array.isArray(scope) ? scope.join(", ") : scope}.`;
	}
	/**
	* Formatting the success event on the credentials
	*/
	function formatError(scope, error) {
		let message = "ERROR.";
		if (scope?.length) message += ` Scopes: ${Array.isArray(scope) ? scope.join(", ") : scope}.`;
		return `${message} Error message: ${typeof error === "string" ? error : error.message}.`;
	}
	/**
	* Generates a CredentialLoggerInstance.
	*
	* It logs with the format:
	*
	*   `[title] => [message]`
	*
	*/
	function credentialLoggerInstance(title, parent, log = exports.logger) {
		const fullTitle = parent ? `${parent.fullTitle} ${title}` : title;
		function info(message) {
			log.info(`${fullTitle} =>`, message);
		}
		function warning(message) {
			log.warning(`${fullTitle} =>`, message);
		}
		function verbose(message) {
			log.verbose(`${fullTitle} =>`, message);
		}
		function error(message) {
			log.error(`${fullTitle} =>`, message);
		}
		return {
			title,
			fullTitle,
			info,
			warning,
			verbose,
			error
		};
	}
	/**
	* Generates a CredentialLogger, which is a logger declared at the credential's constructor, and used at any point in the credential.
	* It has all the properties of a CredentialLoggerInstance, plus other logger instances, one per method.
	*
	* It logs with the format:
	*
	*   `[title] => [message]`
	*   `[title] => getToken() => [message]`
	*
	*/
	function credentialLogger(title, log = exports.logger) {
		const credLogger = credentialLoggerInstance(title, void 0, log);
		return {
			...credLogger,
			parent: log,
			getToken: credentialLoggerInstance("=> getToken()", credLogger, log)
		};
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/util/tracing.js
var require_tracing = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.tracingClient = void 0;
	var constants_js_1 = require_constants$1();
	/**
	* Creates a span using the global tracer.
	* @internal
	*/
	exports.tracingClient = (0, require_commonjs$2().createTracingClient)({
		namespace: "Microsoft.AAD",
		packageName: "@azure/identity",
		packageVersion: constants_js_1.SDK_VERSION
	});
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/chainedTokenCredential.js
var require_chainedTokenCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ChainedTokenCredential = exports.logger = void 0;
	var errors_js_1 = require_errors();
	var logging_js_1 = require_logging();
	var tracing_js_1 = require_tracing();
	/**
	* @internal
	*/
	exports.logger = (0, logging_js_1.credentialLogger)("ChainedTokenCredential");
	/**
	* Enables multiple `TokenCredential` implementations to be tried in order until
	* one of the getToken methods returns an access token. For more information, see
	* [ChainedTokenCredential overview](https://aka.ms/azsdk/js/identity/credential-chains#use-chainedtokencredential-for-granularity).
	*/
	var ChainedTokenCredential = class {
		_sources = [];
		/**
		* Creates an instance of ChainedTokenCredential using the given credentials.
		*
		* @param sources - `TokenCredential` implementations to be tried in order.
		*
		* Example usage:
		* ```ts snippet:chained_token_credential_example
		* import { ClientSecretCredential, ChainedTokenCredential } from "@azure/identity";
		*
		* const tenantId = "<tenant-id>";
		* const clientId = "<client-id>";
		* const clientSecret = "<client-secret>";
		* const anotherClientId = "<another-client-id>";
		* const anotherSecret = "<another-client-secret>";
		*
		* const firstCredential = new ClientSecretCredential(tenantId, clientId, clientSecret);
		* const secondCredential = new ClientSecretCredential(tenantId, anotherClientId, anotherSecret);
		*
		* const credentialChain = new ChainedTokenCredential(firstCredential, secondCredential);
		* ```
		*/
		constructor(...sources) {
			this._sources = sources;
		}
		/**
		* Returns the first access token returned by one of the chained
		* `TokenCredential` implementations.  Throws an {@link AggregateAuthenticationError}
		* when one or more credentials throws an {@link AuthenticationError} and
		* no credentials have returned an access token.
		*
		* This method is called automatically by Azure SDK client libraries. You may call this method
		* directly, but you must also handle token caching and token refreshing.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                `TokenCredential` implementation might make.
		*/
		async getToken(scopes, options = {}) {
			const { token } = await this.getTokenInternal(scopes, options);
			return token;
		}
		async getTokenInternal(scopes, options = {}) {
			let token = null;
			let successfulCredential;
			const errors = [];
			return tracing_js_1.tracingClient.withSpan("ChainedTokenCredential.getToken", options, async (updatedOptions) => {
				for (let i = 0; i < this._sources.length && token === null; i++) try {
					token = await this._sources[i].getToken(scopes, updatedOptions);
					successfulCredential = this._sources[i];
				} catch (err) {
					if (err.name === "CredentialUnavailableError" || err.name === "AuthenticationRequiredError") errors.push(err);
					else {
						exports.logger.getToken.info((0, logging_js_1.formatError)(scopes, err));
						throw err;
					}
				}
				if (!token && errors.length > 0) {
					const err = new errors_js_1.AggregateAuthenticationError(errors, "ChainedTokenCredential authentication failed.");
					exports.logger.getToken.info((0, logging_js_1.formatError)(scopes, err));
					throw err;
				}
				exports.logger.getToken.info(`Result for ${successfulCredential.constructor.name}: ${(0, logging_js_1.formatSuccess)(scopes)}`);
				if (token === null) throw new errors_js_1.CredentialUnavailableError("Failed to retrieve a valid token");
				return {
					token,
					successfulCredential
				};
			});
		}
	};
	exports.ChainedTokenCredential = ChainedTokenCredential;
}));
//#endregion
//#region node_modules/safe-buffer/index.js
var require_safe_buffer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
	var buffer = __require("buffer");
	var Buffer = buffer.Buffer;
	function copyProps(src, dst) {
		for (var key in src) dst[key] = src[key];
	}
	if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) module.exports = buffer;
	else {
		copyProps(buffer, exports);
		exports.Buffer = SafeBuffer;
	}
	function SafeBuffer(arg, encodingOrOffset, length) {
		return Buffer(arg, encodingOrOffset, length);
	}
	SafeBuffer.prototype = Object.create(Buffer.prototype);
	copyProps(Buffer, SafeBuffer);
	SafeBuffer.from = function(arg, encodingOrOffset, length) {
		if (typeof arg === "number") throw new TypeError("Argument must not be a number");
		return Buffer(arg, encodingOrOffset, length);
	};
	SafeBuffer.alloc = function(size, fill, encoding) {
		if (typeof size !== "number") throw new TypeError("Argument must be a number");
		var buf = Buffer(size);
		if (fill !== void 0) if (typeof encoding === "string") buf.fill(fill, encoding);
		else buf.fill(fill);
		else buf.fill(0);
		return buf;
	};
	SafeBuffer.allocUnsafe = function(size) {
		if (typeof size !== "number") throw new TypeError("Argument must be a number");
		return Buffer(size);
	};
	SafeBuffer.allocUnsafeSlow = function(size) {
		if (typeof size !== "number") throw new TypeError("Argument must be a number");
		return buffer.SlowBuffer(size);
	};
}));
//#endregion
//#region node_modules/jws/lib/data-stream.js
var require_data_stream = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Buffer = require_safe_buffer().Buffer;
	var Stream$2 = __require("stream");
	var util$3 = __require("util");
	function DataStream(data) {
		this.buffer = null;
		this.writable = true;
		this.readable = true;
		if (!data) {
			this.buffer = Buffer.alloc(0);
			return this;
		}
		if (typeof data.pipe === "function") {
			this.buffer = Buffer.alloc(0);
			data.pipe(this);
			return this;
		}
		if (data.length || typeof data === "object") {
			this.buffer = data;
			this.writable = false;
			process.nextTick(function() {
				this.emit("end", data);
				this.readable = false;
				this.emit("close");
			}.bind(this));
			return this;
		}
		throw new TypeError("Unexpected data type (" + typeof data + ")");
	}
	util$3.inherits(DataStream, Stream$2);
	DataStream.prototype.write = function write(data) {
		this.buffer = Buffer.concat([this.buffer, Buffer.from(data)]);
		this.emit("data", data);
	};
	DataStream.prototype.end = function end(data) {
		if (data) this.write(data);
		this.emit("end", data);
		this.emit("close");
		this.writable = false;
		this.readable = false;
	};
	module.exports = DataStream;
}));
//#endregion
//#region node_modules/ecdsa-sig-formatter/src/param-bytes-for-alg.js
var require_param_bytes_for_alg = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function getParamSize(keySize) {
		return (keySize / 8 | 0) + (keySize % 8 === 0 ? 0 : 1);
	}
	var paramBytesForAlg = {
		ES256: getParamSize(256),
		ES384: getParamSize(384),
		ES512: getParamSize(521)
	};
	function getParamBytesForAlg(alg) {
		var paramBytes = paramBytesForAlg[alg];
		if (paramBytes) return paramBytes;
		throw new Error("Unknown algorithm \"" + alg + "\"");
	}
	module.exports = getParamBytesForAlg;
}));
//#endregion
//#region node_modules/ecdsa-sig-formatter/src/ecdsa-sig-formatter.js
var require_ecdsa_sig_formatter = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Buffer = require_safe_buffer().Buffer;
	var getParamBytesForAlg = require_param_bytes_for_alg();
	var MAX_OCTET = 128;
	var CLASS_UNIVERSAL = 0;
	var PRIMITIVE_BIT = 32;
	var TAG_SEQ = 16;
	var TAG_INT = 2;
	var ENCODED_TAG_SEQ = TAG_SEQ | PRIMITIVE_BIT | CLASS_UNIVERSAL << 6;
	var ENCODED_TAG_INT = TAG_INT | CLASS_UNIVERSAL << 6;
	function base64Url(base64) {
		return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
	}
	function signatureAsBuffer(signature) {
		if (Buffer.isBuffer(signature)) return signature;
		else if ("string" === typeof signature) return Buffer.from(signature, "base64");
		throw new TypeError("ECDSA signature must be a Base64 string or a Buffer");
	}
	function derToJose(signature, alg) {
		signature = signatureAsBuffer(signature);
		var paramBytes = getParamBytesForAlg(alg);
		var maxEncodedParamLength = paramBytes + 1;
		var inputLength = signature.length;
		var offset = 0;
		if (signature[offset++] !== ENCODED_TAG_SEQ) throw new Error("Could not find expected \"seq\"");
		var seqLength = signature[offset++];
		if (seqLength === (MAX_OCTET | 1)) seqLength = signature[offset++];
		if (inputLength - offset < seqLength) throw new Error("\"seq\" specified length of \"" + seqLength + "\", only \"" + (inputLength - offset) + "\" remaining");
		if (signature[offset++] !== ENCODED_TAG_INT) throw new Error("Could not find expected \"int\" for \"r\"");
		var rLength = signature[offset++];
		if (inputLength - offset - 2 < rLength) throw new Error("\"r\" specified length of \"" + rLength + "\", only \"" + (inputLength - offset - 2) + "\" available");
		if (maxEncodedParamLength < rLength) throw new Error("\"r\" specified length of \"" + rLength + "\", max of \"" + maxEncodedParamLength + "\" is acceptable");
		var rOffset = offset;
		offset += rLength;
		if (signature[offset++] !== ENCODED_TAG_INT) throw new Error("Could not find expected \"int\" for \"s\"");
		var sLength = signature[offset++];
		if (inputLength - offset !== sLength) throw new Error("\"s\" specified length of \"" + sLength + "\", expected \"" + (inputLength - offset) + "\"");
		if (maxEncodedParamLength < sLength) throw new Error("\"s\" specified length of \"" + sLength + "\", max of \"" + maxEncodedParamLength + "\" is acceptable");
		var sOffset = offset;
		offset += sLength;
		if (offset !== inputLength) throw new Error("Expected to consume entire buffer, but \"" + (inputLength - offset) + "\" bytes remain");
		var rPadding = paramBytes - rLength, sPadding = paramBytes - sLength;
		var dst = Buffer.allocUnsafe(rPadding + rLength + sPadding + sLength);
		for (offset = 0; offset < rPadding; ++offset) dst[offset] = 0;
		signature.copy(dst, offset, rOffset + Math.max(-rPadding, 0), rOffset + rLength);
		offset = paramBytes;
		for (var o = offset; offset < o + sPadding; ++offset) dst[offset] = 0;
		signature.copy(dst, offset, sOffset + Math.max(-sPadding, 0), sOffset + sLength);
		dst = dst.toString("base64");
		dst = base64Url(dst);
		return dst;
	}
	function countPadding(buf, start, stop) {
		var padding = 0;
		while (start + padding < stop && buf[start + padding] === 0) ++padding;
		if (buf[start + padding] >= MAX_OCTET) --padding;
		return padding;
	}
	function joseToDer(signature, alg) {
		signature = signatureAsBuffer(signature);
		var paramBytes = getParamBytesForAlg(alg);
		var signatureBytes = signature.length;
		if (signatureBytes !== paramBytes * 2) throw new TypeError("\"" + alg + "\" signatures must be \"" + paramBytes * 2 + "\" bytes, saw \"" + signatureBytes + "\"");
		var rPadding = countPadding(signature, 0, paramBytes);
		var sPadding = countPadding(signature, paramBytes, signature.length);
		var rLength = paramBytes - rPadding;
		var sLength = paramBytes - sPadding;
		var rsBytes = 2 + rLength + 1 + 1 + sLength;
		var shortLength = rsBytes < MAX_OCTET;
		var dst = Buffer.allocUnsafe((shortLength ? 2 : 3) + rsBytes);
		var offset = 0;
		dst[offset++] = ENCODED_TAG_SEQ;
		if (shortLength) dst[offset++] = rsBytes;
		else {
			dst[offset++] = MAX_OCTET | 1;
			dst[offset++] = rsBytes & 255;
		}
		dst[offset++] = ENCODED_TAG_INT;
		dst[offset++] = rLength;
		if (rPadding < 0) {
			dst[offset++] = 0;
			offset += signature.copy(dst, offset, 0, paramBytes);
		} else offset += signature.copy(dst, offset, rPadding, paramBytes);
		dst[offset++] = ENCODED_TAG_INT;
		dst[offset++] = sLength;
		if (sPadding < 0) {
			dst[offset++] = 0;
			signature.copy(dst, offset, paramBytes);
		} else signature.copy(dst, offset, paramBytes + sPadding);
		return dst;
	}
	module.exports = {
		derToJose,
		joseToDer
	};
}));
//#endregion
//#region node_modules/buffer-equal-constant-time/index.js
var require_buffer_equal_constant_time = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Buffer$2 = __require("buffer").Buffer;
	var SlowBuffer = __require("buffer").SlowBuffer;
	module.exports = bufferEq;
	function bufferEq(a, b) {
		if (!Buffer$2.isBuffer(a) || !Buffer$2.isBuffer(b)) return false;
		if (a.length !== b.length) return false;
		var c = 0;
		for (var i = 0; i < a.length; i++) c |= a[i] ^ b[i];
		return c === 0;
	}
	bufferEq.install = function() {
		Buffer$2.prototype.equal = SlowBuffer.prototype.equal = function equal(that) {
			return bufferEq(this, that);
		};
	};
	var origBufEqual = Buffer$2.prototype.equal;
	var origSlowBufEqual = SlowBuffer.prototype.equal;
	bufferEq.restore = function() {
		Buffer$2.prototype.equal = origBufEqual;
		SlowBuffer.prototype.equal = origSlowBufEqual;
	};
}));
//#endregion
//#region node_modules/jwa/index.js
var require_jwa = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Buffer = require_safe_buffer().Buffer;
	var crypto$1 = __require("crypto");
	var formatEcdsa = require_ecdsa_sig_formatter();
	var util$2 = __require("util");
	var MSG_INVALID_ALGORITHM = "\"%s\" is not a valid algorithm.\n  Supported algorithms are:\n  \"HS256\", \"HS384\", \"HS512\", \"RS256\", \"RS384\", \"RS512\", \"PS256\", \"PS384\", \"PS512\", \"ES256\", \"ES384\", \"ES512\" and \"none\".";
	var MSG_INVALID_SECRET = "secret must be a string or buffer";
	var MSG_INVALID_VERIFIER_KEY = "key must be a string or a buffer";
	var MSG_INVALID_SIGNER_KEY = "key must be a string, a buffer or an object";
	var supportsKeyObjects = typeof crypto$1.createPublicKey === "function";
	if (supportsKeyObjects) {
		MSG_INVALID_VERIFIER_KEY += " or a KeyObject";
		MSG_INVALID_SECRET += "or a KeyObject";
	}
	function checkIsPublicKey(key) {
		if (Buffer.isBuffer(key)) return;
		if (typeof key === "string") return;
		if (!supportsKeyObjects) throw typeError(MSG_INVALID_VERIFIER_KEY);
		if (typeof key !== "object") throw typeError(MSG_INVALID_VERIFIER_KEY);
		if (typeof key.type !== "string") throw typeError(MSG_INVALID_VERIFIER_KEY);
		if (typeof key.asymmetricKeyType !== "string") throw typeError(MSG_INVALID_VERIFIER_KEY);
		if (typeof key.export !== "function") throw typeError(MSG_INVALID_VERIFIER_KEY);
	}
	function checkIsPrivateKey(key) {
		if (Buffer.isBuffer(key)) return;
		if (typeof key === "string") return;
		if (typeof key === "object") return;
		throw typeError(MSG_INVALID_SIGNER_KEY);
	}
	function checkIsSecretKey(key) {
		if (Buffer.isBuffer(key)) return;
		if (typeof key === "string") return key;
		if (!supportsKeyObjects) throw typeError(MSG_INVALID_SECRET);
		if (typeof key !== "object") throw typeError(MSG_INVALID_SECRET);
		if (key.type !== "secret") throw typeError(MSG_INVALID_SECRET);
		if (typeof key.export !== "function") throw typeError(MSG_INVALID_SECRET);
	}
	function fromBase64(base64) {
		return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
	}
	function toBase64(base64url) {
		base64url = base64url.toString();
		var padding = 4 - base64url.length % 4;
		if (padding !== 4) for (var i = 0; i < padding; ++i) base64url += "=";
		return base64url.replace(/\-/g, "+").replace(/_/g, "/");
	}
	function typeError(template) {
		var args = [].slice.call(arguments, 1);
		var errMsg = util$2.format.bind(util$2, template).apply(null, args);
		return new TypeError(errMsg);
	}
	function bufferOrString(obj) {
		return Buffer.isBuffer(obj) || typeof obj === "string";
	}
	function normalizeInput(thing) {
		if (!bufferOrString(thing)) thing = JSON.stringify(thing);
		return thing;
	}
	function createHmacSigner(bits) {
		return function sign(thing, secret) {
			checkIsSecretKey(secret);
			thing = normalizeInput(thing);
			var hmac = crypto$1.createHmac("sha" + bits, secret);
			return fromBase64((hmac.update(thing), hmac.digest("base64")));
		};
	}
	var bufferEqual;
	var timingSafeEqual = "timingSafeEqual" in crypto$1 ? function timingSafeEqual(a, b) {
		if (a.byteLength !== b.byteLength) return false;
		return crypto$1.timingSafeEqual(a, b);
	} : function timingSafeEqual(a, b) {
		if (!bufferEqual) bufferEqual = require_buffer_equal_constant_time();
		return bufferEqual(a, b);
	};
	function createHmacVerifier(bits) {
		return function verify(thing, signature, secret) {
			var computedSig = createHmacSigner(bits)(thing, secret);
			return timingSafeEqual(Buffer.from(signature), Buffer.from(computedSig));
		};
	}
	function createKeySigner(bits) {
		return function sign(thing, privateKey) {
			checkIsPrivateKey(privateKey);
			thing = normalizeInput(thing);
			var signer = crypto$1.createSign("RSA-SHA" + bits);
			return fromBase64((signer.update(thing), signer.sign(privateKey, "base64")));
		};
	}
	function createKeyVerifier(bits) {
		return function verify(thing, signature, publicKey) {
			checkIsPublicKey(publicKey);
			thing = normalizeInput(thing);
			signature = toBase64(signature);
			var verifier = crypto$1.createVerify("RSA-SHA" + bits);
			verifier.update(thing);
			return verifier.verify(publicKey, signature, "base64");
		};
	}
	function createPSSKeySigner(bits) {
		return function sign(thing, privateKey) {
			checkIsPrivateKey(privateKey);
			thing = normalizeInput(thing);
			var signer = crypto$1.createSign("RSA-SHA" + bits);
			return fromBase64((signer.update(thing), signer.sign({
				key: privateKey,
				padding: crypto$1.constants.RSA_PKCS1_PSS_PADDING,
				saltLength: crypto$1.constants.RSA_PSS_SALTLEN_DIGEST
			}, "base64")));
		};
	}
	function createPSSKeyVerifier(bits) {
		return function verify(thing, signature, publicKey) {
			checkIsPublicKey(publicKey);
			thing = normalizeInput(thing);
			signature = toBase64(signature);
			var verifier = crypto$1.createVerify("RSA-SHA" + bits);
			verifier.update(thing);
			return verifier.verify({
				key: publicKey,
				padding: crypto$1.constants.RSA_PKCS1_PSS_PADDING,
				saltLength: crypto$1.constants.RSA_PSS_SALTLEN_DIGEST
			}, signature, "base64");
		};
	}
	function createECDSASigner(bits) {
		var inner = createKeySigner(bits);
		return function sign() {
			var signature = inner.apply(null, arguments);
			signature = formatEcdsa.derToJose(signature, "ES" + bits);
			return signature;
		};
	}
	function createECDSAVerifer(bits) {
		var inner = createKeyVerifier(bits);
		return function verify(thing, signature, publicKey) {
			signature = formatEcdsa.joseToDer(signature, "ES" + bits).toString("base64");
			return inner(thing, signature, publicKey);
		};
	}
	function createNoneSigner() {
		return function sign() {
			return "";
		};
	}
	function createNoneVerifier() {
		return function verify(thing, signature) {
			return signature === "";
		};
	}
	module.exports = function jwa(algorithm) {
		var signerFactories = {
			hs: createHmacSigner,
			rs: createKeySigner,
			ps: createPSSKeySigner,
			es: createECDSASigner,
			none: createNoneSigner
		};
		var verifierFactories = {
			hs: createHmacVerifier,
			rs: createKeyVerifier,
			ps: createPSSKeyVerifier,
			es: createECDSAVerifer,
			none: createNoneVerifier
		};
		var match = algorithm.match(/^(RS|PS|ES|HS)(256|384|512)$|^(none)$/);
		if (!match) throw typeError(MSG_INVALID_ALGORITHM, algorithm);
		var algo = (match[1] || match[3]).toLowerCase();
		var bits = match[2];
		return {
			sign: signerFactories[algo](bits),
			verify: verifierFactories[algo](bits)
		};
	};
}));
//#endregion
//#region node_modules/jws/lib/tostring.js
var require_tostring = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Buffer$1 = __require("buffer").Buffer;
	module.exports = function toString(obj) {
		if (typeof obj === "string") return obj;
		if (typeof obj === "number" || Buffer$1.isBuffer(obj)) return obj.toString();
		return JSON.stringify(obj);
	};
}));
//#endregion
//#region node_modules/jws/lib/sign-stream.js
var require_sign_stream = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Buffer = require_safe_buffer().Buffer;
	var DataStream = require_data_stream();
	var jwa = require_jwa();
	var Stream$1 = __require("stream");
	var toString = require_tostring();
	var util$1 = __require("util");
	function base64url(string, encoding) {
		return Buffer.from(string, encoding).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
	}
	function jwsSecuredInput(header, payload, encoding) {
		encoding = encoding || "utf8";
		var encodedHeader = base64url(toString(header), "binary");
		var encodedPayload = base64url(toString(payload), encoding);
		return util$1.format("%s.%s", encodedHeader, encodedPayload);
	}
	function jwsSign(opts) {
		var header = opts.header;
		var payload = opts.payload;
		var secretOrKey = opts.secret || opts.privateKey;
		var encoding = opts.encoding;
		var algo = jwa(header.alg);
		var securedInput = jwsSecuredInput(header, payload, encoding);
		var signature = algo.sign(securedInput, secretOrKey);
		return util$1.format("%s.%s", securedInput, signature);
	}
	function SignStream(opts) {
		var secret = opts.secret;
		secret = secret == null ? opts.privateKey : secret;
		secret = secret == null ? opts.key : secret;
		if (/^hs/i.test(opts.header.alg) === true && secret == null) throw new TypeError("secret must be a string or buffer or a KeyObject");
		var secretStream = new DataStream(secret);
		this.readable = true;
		this.header = opts.header;
		this.encoding = opts.encoding;
		this.secret = this.privateKey = this.key = secretStream;
		this.payload = new DataStream(opts.payload);
		this.secret.once("close", function() {
			if (!this.payload.writable && this.readable) this.sign();
		}.bind(this));
		this.payload.once("close", function() {
			if (!this.secret.writable && this.readable) this.sign();
		}.bind(this));
	}
	util$1.inherits(SignStream, Stream$1);
	SignStream.prototype.sign = function sign() {
		try {
			var signature = jwsSign({
				header: this.header,
				payload: this.payload.buffer,
				secret: this.secret.buffer,
				encoding: this.encoding
			});
			this.emit("done", signature);
			this.emit("data", signature);
			this.emit("end");
			this.readable = false;
			return signature;
		} catch (e) {
			this.readable = false;
			this.emit("error", e);
			this.emit("close");
		}
	};
	SignStream.sign = jwsSign;
	module.exports = SignStream;
}));
//#endregion
//#region node_modules/jws/lib/verify-stream.js
var require_verify_stream = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Buffer = require_safe_buffer().Buffer;
	var DataStream = require_data_stream();
	var jwa = require_jwa();
	var Stream = __require("stream");
	var toString = require_tostring();
	var util = __require("util");
	var JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
	function isObject(thing) {
		return Object.prototype.toString.call(thing) === "[object Object]";
	}
	function safeJsonParse(thing) {
		if (isObject(thing)) return thing;
		try {
			return JSON.parse(thing);
		} catch (e) {
			return;
		}
	}
	function headerFromJWS(jwsSig) {
		var encodedHeader = jwsSig.split(".", 1)[0];
		return safeJsonParse(Buffer.from(encodedHeader, "base64").toString("binary"));
	}
	function securedInputFromJWS(jwsSig) {
		return jwsSig.split(".", 2).join(".");
	}
	function signatureFromJWS(jwsSig) {
		return jwsSig.split(".")[2];
	}
	function payloadFromJWS(jwsSig, encoding) {
		encoding = encoding || "utf8";
		var payload = jwsSig.split(".")[1];
		return Buffer.from(payload, "base64").toString(encoding);
	}
	function isValidJws(string) {
		return JWS_REGEX.test(string) && !!headerFromJWS(string);
	}
	function jwsVerify(jwsSig, algorithm, secretOrKey) {
		if (!algorithm) {
			var err = /* @__PURE__ */ new Error("Missing algorithm parameter for jws.verify");
			err.code = "MISSING_ALGORITHM";
			throw err;
		}
		jwsSig = toString(jwsSig);
		var signature = signatureFromJWS(jwsSig);
		var securedInput = securedInputFromJWS(jwsSig);
		return jwa(algorithm).verify(securedInput, signature, secretOrKey);
	}
	function jwsDecode(jwsSig, opts) {
		opts = opts || {};
		jwsSig = toString(jwsSig);
		if (!isValidJws(jwsSig)) return null;
		var header = headerFromJWS(jwsSig);
		if (!header) return null;
		var payload = payloadFromJWS(jwsSig);
		if (header.typ === "JWT" || opts.json) payload = JSON.parse(payload, opts.encoding);
		return {
			header,
			payload,
			signature: signatureFromJWS(jwsSig)
		};
	}
	function VerifyStream(opts) {
		opts = opts || {};
		var secretOrKey = opts.secret;
		secretOrKey = secretOrKey == null ? opts.publicKey : secretOrKey;
		secretOrKey = secretOrKey == null ? opts.key : secretOrKey;
		if (/^hs/i.test(opts.algorithm) === true && secretOrKey == null) throw new TypeError("secret must be a string or buffer or a KeyObject");
		var secretStream = new DataStream(secretOrKey);
		this.readable = true;
		this.algorithm = opts.algorithm;
		this.encoding = opts.encoding;
		this.secret = this.publicKey = this.key = secretStream;
		this.signature = new DataStream(opts.signature);
		this.secret.once("close", function() {
			if (!this.signature.writable && this.readable) this.verify();
		}.bind(this));
		this.signature.once("close", function() {
			if (!this.secret.writable && this.readable) this.verify();
		}.bind(this));
	}
	util.inherits(VerifyStream, Stream);
	VerifyStream.prototype.verify = function verify() {
		try {
			var valid = jwsVerify(this.signature.buffer, this.algorithm, this.key.buffer);
			var obj = jwsDecode(this.signature.buffer, this.encoding);
			this.emit("done", valid, obj);
			this.emit("data", valid);
			this.emit("end");
			this.readable = false;
			return valid;
		} catch (e) {
			this.readable = false;
			this.emit("error", e);
			this.emit("close");
		}
	};
	VerifyStream.decode = jwsDecode;
	VerifyStream.isValid = isValidJws;
	VerifyStream.verify = jwsVerify;
	module.exports = VerifyStream;
}));
//#endregion
//#region node_modules/jws/index.js
var require_jws = /* @__PURE__ */ __commonJSMin(((exports) => {
	var SignStream = require_sign_stream();
	var VerifyStream = require_verify_stream();
	exports.ALGORITHMS = [
		"HS256",
		"HS384",
		"HS512",
		"RS256",
		"RS384",
		"RS512",
		"PS256",
		"PS384",
		"PS512",
		"ES256",
		"ES384",
		"ES512"
	];
	exports.sign = SignStream.sign;
	exports.verify = VerifyStream.verify;
	exports.decode = VerifyStream.decode;
	exports.isValid = VerifyStream.isValid;
	exports.createSign = function createSign(opts) {
		return new SignStream(opts);
	};
	exports.createVerify = function createVerify(opts) {
		return new VerifyStream(opts);
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/decode.js
var require_decode = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var jws = require_jws();
	module.exports = function(jwt, options) {
		options = options || {};
		var decoded = jws.decode(jwt, options);
		if (!decoded) return null;
		var payload = decoded.payload;
		if (typeof payload === "string") try {
			var obj = JSON.parse(payload);
			if (obj !== null && typeof obj === "object") payload = obj;
		} catch (e) {}
		if (options.complete === true) return {
			header: decoded.header,
			payload,
			signature: decoded.signature
		};
		return payload;
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/lib/JsonWebTokenError.js
var require_JsonWebTokenError = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var JsonWebTokenError = function(message, error) {
		Error.call(this, message);
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
		this.name = "JsonWebTokenError";
		this.message = message;
		if (error) this.inner = error;
	};
	JsonWebTokenError.prototype = Object.create(Error.prototype);
	JsonWebTokenError.prototype.constructor = JsonWebTokenError;
	module.exports = JsonWebTokenError;
}));
//#endregion
//#region node_modules/jsonwebtoken/lib/NotBeforeError.js
var require_NotBeforeError = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var JsonWebTokenError = require_JsonWebTokenError();
	var NotBeforeError = function(message, date) {
		JsonWebTokenError.call(this, message);
		this.name = "NotBeforeError";
		this.date = date;
	};
	NotBeforeError.prototype = Object.create(JsonWebTokenError.prototype);
	NotBeforeError.prototype.constructor = NotBeforeError;
	module.exports = NotBeforeError;
}));
//#endregion
//#region node_modules/jsonwebtoken/lib/TokenExpiredError.js
var require_TokenExpiredError = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var JsonWebTokenError = require_JsonWebTokenError();
	var TokenExpiredError = function(message, expiredAt) {
		JsonWebTokenError.call(this, message);
		this.name = "TokenExpiredError";
		this.expiredAt = expiredAt;
	};
	TokenExpiredError.prototype = Object.create(JsonWebTokenError.prototype);
	TokenExpiredError.prototype.constructor = TokenExpiredError;
	module.exports = TokenExpiredError;
}));
//#endregion
//#region node_modules/jsonwebtoken/lib/timespan.js
var require_timespan = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ms = require_ms();
	module.exports = function(time, iat) {
		var timestamp = iat || Math.floor(Date.now() / 1e3);
		if (typeof time === "string") {
			var milliseconds = ms(time);
			if (typeof milliseconds === "undefined") return;
			return Math.floor(timestamp + milliseconds / 1e3);
		} else if (typeof time === "number") return timestamp + time;
		else return;
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/internal/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		MAX_LENGTH: 256,
		MAX_SAFE_COMPONENT_LENGTH: 16,
		MAX_SAFE_BUILD_LENGTH: 250,
		MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER || 
		/* istanbul ignore next */ 9007199254740991,
		RELEASE_TYPES: [
			"major",
			"premajor",
			"minor",
			"preminor",
			"patch",
			"prepatch",
			"prerelease"
		],
		SEMVER_SPEC_VERSION: "2.0.0",
		FLAG_INCLUDE_PRERELEASE: 1,
		FLAG_LOOSE: 2
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/internal/debug.js
var require_debug = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {};
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/internal/re.js
var require_re = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH, MAX_LENGTH } = require_constants();
	var debug = require_debug();
	exports = module.exports = {};
	var re = exports.re = [];
	var safeRe = exports.safeRe = [];
	var src = exports.src = [];
	var safeSrc = exports.safeSrc = [];
	var t = exports.t = {};
	var R = 0;
	var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
	var safeRegexReplacements = [
		["\\s", 1],
		["\\d", MAX_LENGTH],
		[LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
	];
	var makeSafeRegex = (value) => {
		for (const [token, max] of safeRegexReplacements) value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
		return value;
	};
	var createToken = (name, value, isGlobal) => {
		const safe = makeSafeRegex(value);
		const index = R++;
		debug(name, index, value);
		t[name] = index;
		src[index] = value;
		safeSrc[index] = safe;
		re[index] = new RegExp(value, isGlobal ? "g" : void 0);
		safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
	};
	createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
	createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
	createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
	createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
	createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
	createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
	createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
	createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
	createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
	createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
	createToken("FULL", `^${src[t.FULLPLAIN]}$`);
	createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
	createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
	createToken("GTLT", "((?:<|>)?=?)");
	createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
	createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
	createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
	createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COERCEPLAIN", `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
	createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
	createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
	createToken("COERCERTL", src[t.COERCE], true);
	createToken("COERCERTLFULL", src[t.COERCEFULL], true);
	createToken("LONETILDE", "(?:~>?)");
	createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
	exports.tildeTrimReplace = "$1~";
	createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
	createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("LONECARET", "(?:\\^)");
	createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
	exports.caretTrimReplace = "$1^";
	createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
	createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
	createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
	createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
	exports.comparatorTrimReplace = "$1$2$3";
	createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
	createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
	createToken("STAR", "(<|>)?=?\\s*\\*");
	createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
	createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/internal/parse-options.js
var require_parse_options = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var looseOption = Object.freeze({ loose: true });
	var emptyOpts = Object.freeze({});
	var parseOptions = (options) => {
		if (!options) return emptyOpts;
		if (typeof options !== "object") return looseOption;
		return options;
	};
	module.exports = parseOptions;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/internal/identifiers.js
var require_identifiers = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var numeric = /^[0-9]+$/;
	var compareIdentifiers = (a, b) => {
		if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
		const anum = numeric.test(a);
		const bnum = numeric.test(b);
		if (anum && bnum) {
			a = +a;
			b = +b;
		}
		return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
	};
	var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
	module.exports = {
		compareIdentifiers,
		rcompareIdentifiers
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/classes/semver.js
var require_semver$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var debug = require_debug();
	var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
	var { safeRe: re, t } = require_re();
	var parseOptions = require_parse_options();
	var { compareIdentifiers } = require_identifiers();
	var isPrereleaseIdentifier = (prerelease, identifier) => {
		const identifiers = identifier.split(".");
		if (identifiers.length > prerelease.length) return false;
		for (let i = 0; i < identifiers.length; i++) if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) return false;
		return true;
	};
	module.exports = class SemVer {
		constructor(version, options) {
			options = parseOptions(options);
			if (version instanceof SemVer) if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) return version;
			else version = version.version;
			else if (typeof version !== "string") throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
			if (version.length > MAX_LENGTH) throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
			debug("SemVer", version, options);
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
			if (!m) throw new TypeError(`Invalid Version: ${version}`);
			this.raw = version;
			this.major = +m[1];
			this.minor = +m[2];
			this.patch = +m[3];
			if (this.major > MAX_SAFE_INTEGER || this.major < 0) throw new TypeError("Invalid major version");
			if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) throw new TypeError("Invalid minor version");
			if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) throw new TypeError("Invalid patch version");
			if (!m[4]) this.prerelease = [];
			else this.prerelease = m[4].split(".").map((id) => {
				if (/^[0-9]+$/.test(id)) {
					const num = +id;
					if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
				}
				return id;
			});
			this.build = m[5] ? m[5].split(".") : [];
			this.format();
		}
		format() {
			this.version = `${this.major}.${this.minor}.${this.patch}`;
			if (this.prerelease.length) this.version += `-${this.prerelease.join(".")}`;
			return this.version;
		}
		toString() {
			return this.version;
		}
		compare(other) {
			debug("SemVer.compare", this.version, this.options, other);
			if (!(other instanceof SemVer)) {
				if (typeof other === "string" && other === this.version) return 0;
				other = new SemVer(other, this.options);
			}
			if (other.version === this.version) return 0;
			return this.compareMain(other) || this.comparePre(other);
		}
		compareMain(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.major < other.major) return -1;
			if (this.major > other.major) return 1;
			if (this.minor < other.minor) return -1;
			if (this.minor > other.minor) return 1;
			if (this.patch < other.patch) return -1;
			if (this.patch > other.patch) return 1;
			return 0;
		}
		comparePre(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.prerelease.length && !other.prerelease.length) return -1;
			else if (!this.prerelease.length && other.prerelease.length) return 1;
			else if (!this.prerelease.length && !other.prerelease.length) return 0;
			let i = 0;
			do {
				const a = this.prerelease[i];
				const b = other.prerelease[i];
				debug("prerelease compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		compareBuild(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			let i = 0;
			do {
				const a = this.build[i];
				const b = other.build[i];
				debug("build compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		inc(release, identifier, identifierBase) {
			if (release.startsWith("pre")) {
				if (!identifier && identifierBase === false) throw new Error("invalid increment argument: identifier is empty");
				if (identifier) {
					const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
					if (!match || match[1] !== identifier) throw new Error(`invalid identifier: ${identifier}`);
				}
			}
			switch (release) {
				case "premajor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor = 0;
					this.major++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "preminor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "prepatch":
					this.prerelease.length = 0;
					this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "prerelease":
					if (this.prerelease.length === 0) this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "release":
					if (this.prerelease.length === 0) throw new Error(`version ${this.raw} is not a prerelease`);
					this.prerelease.length = 0;
					break;
				case "major":
					if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
					this.minor = 0;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "minor":
					if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "patch":
					if (this.prerelease.length === 0) this.patch++;
					this.prerelease = [];
					break;
				case "pre": {
					const base = Number(identifierBase) ? 1 : 0;
					if (this.prerelease.length === 0) this.prerelease = [base];
					else {
						let i = this.prerelease.length;
						while (--i >= 0) if (typeof this.prerelease[i] === "number") {
							this.prerelease[i]++;
							i = -2;
						}
						if (i === -1) {
							if (identifier === this.prerelease.join(".") && identifierBase === false) throw new Error("invalid increment argument: identifier already exists");
							this.prerelease.push(base);
						}
					}
					if (identifier) {
						let prerelease = [identifier, base];
						if (identifierBase === false) prerelease = [identifier];
						if (isPrereleaseIdentifier(this.prerelease, identifier)) {
							const prereleaseBase = this.prerelease[identifier.split(".").length];
							if (isNaN(prereleaseBase)) this.prerelease = prerelease;
						} else this.prerelease = prerelease;
					}
					break;
				}
				default: throw new Error(`invalid increment argument: ${release}`);
			}
			this.raw = this.format();
			if (this.build.length) this.raw += `+${this.build.join(".")}`;
			return this;
		}
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var parse = (version, options, throwErrors = false) => {
		if (version instanceof SemVer) return version;
		try {
			return new SemVer(version, options);
		} catch (er) {
			if (!throwErrors) return null;
			throw er;
		}
	};
	module.exports = parse;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/valid.js
var require_valid$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var valid = (version, options) => {
		const v = parse(version, options);
		return v ? v.version : null;
	};
	module.exports = valid;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/clean.js
var require_clean = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var clean = (version, options) => {
		const s = parse(version.trim().replace(/^[=v]+/, ""), options);
		return s ? s.version : null;
	};
	module.exports = clean;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/inc.js
var require_inc = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var inc = (version, release, options, identifier, identifierBase) => {
		if (typeof options === "string") {
			identifierBase = identifier;
			identifier = options;
			options = void 0;
		}
		try {
			return new SemVer(version instanceof SemVer ? version.version : version, options).inc(release, identifier, identifierBase).version;
		} catch (er) {
			return null;
		}
	};
	module.exports = inc;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/diff.js
var require_diff = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var diff = (version1, version2) => {
		const v1 = parse(version1, null, true);
		const v2 = parse(version2, null, true);
		const comparison = v1.compare(v2);
		if (comparison === 0) return null;
		const v1Higher = comparison > 0;
		const highVersion = v1Higher ? v1 : v2;
		const lowVersion = v1Higher ? v2 : v1;
		const highHasPre = !!highVersion.prerelease.length;
		if (!!lowVersion.prerelease.length && !highHasPre) {
			if (!lowVersion.patch && !lowVersion.minor) return "major";
			if (lowVersion.compareMain(highVersion) === 0) {
				if (lowVersion.minor && !lowVersion.patch) return "minor";
				return "patch";
			}
		}
		const prefix = highHasPre ? "pre" : "";
		if (v1.major !== v2.major) return prefix + "major";
		if (v1.minor !== v2.minor) return prefix + "minor";
		if (v1.patch !== v2.patch) return prefix + "patch";
		return "prerelease";
	};
	module.exports = diff;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/major.js
var require_major = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var major = (a, loose) => new SemVer(a, loose).major;
	module.exports = major;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/minor.js
var require_minor = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var minor = (a, loose) => new SemVer(a, loose).minor;
	module.exports = minor;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/patch.js
var require_patch = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var patch = (a, loose) => new SemVer(a, loose).patch;
	module.exports = patch;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/prerelease.js
var require_prerelease = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var prerelease = (version, options) => {
		const parsed = parse(version, options);
		return parsed && parsed.prerelease.length ? parsed.prerelease : null;
	};
	module.exports = prerelease;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/compare.js
var require_compare = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
	module.exports = compare;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/rcompare.js
var require_rcompare = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var rcompare = (a, b, loose) => compare(b, a, loose);
	module.exports = rcompare;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/compare-loose.js
var require_compare_loose = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var compareLoose = (a, b) => compare(a, b, true);
	module.exports = compareLoose;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/compare-build.js
var require_compare_build = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var compareBuild = (a, b, loose) => {
		const versionA = new SemVer(a, loose);
		const versionB = new SemVer(b, loose);
		return versionA.compare(versionB) || versionA.compareBuild(versionB);
	};
	module.exports = compareBuild;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/sort.js
var require_sort = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compareBuild = require_compare_build();
	var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
	module.exports = sort;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/rsort.js
var require_rsort = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compareBuild = require_compare_build();
	var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
	module.exports = rsort;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/gt.js
var require_gt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gt = (a, b, loose) => compare(a, b, loose) > 0;
	module.exports = gt;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/lt.js
var require_lt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lt = (a, b, loose) => compare(a, b, loose) < 0;
	module.exports = lt;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/eq.js
var require_eq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var eq = (a, b, loose) => compare(a, b, loose) === 0;
	module.exports = eq;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/neq.js
var require_neq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var neq = (a, b, loose) => compare(a, b, loose) !== 0;
	module.exports = neq;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/gte.js
var require_gte = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gte = (a, b, loose) => compare(a, b, loose) >= 0;
	module.exports = gte;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/lte.js
var require_lte = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lte = (a, b, loose) => compare(a, b, loose) <= 0;
	module.exports = lte;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/cmp.js
var require_cmp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var eq = require_eq();
	var neq = require_neq();
	var gt = require_gt();
	var gte = require_gte();
	var lt = require_lt();
	var lte = require_lte();
	var cmp = (a, op, b, loose) => {
		switch (op) {
			case "===":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a === b;
			case "!==":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a !== b;
			case "":
			case "=":
			case "==": return eq(a, b, loose);
			case "!=": return neq(a, b, loose);
			case ">": return gt(a, b, loose);
			case ">=": return gte(a, b, loose);
			case "<": return lt(a, b, loose);
			case "<=": return lte(a, b, loose);
			default: throw new TypeError(`Invalid operator: ${op}`);
		}
	};
	module.exports = cmp;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/coerce.js
var require_coerce = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var parse = require_parse();
	var { safeRe: re, t } = require_re();
	var coerce = (version, options) => {
		if (version instanceof SemVer) return version;
		if (typeof version === "number") version = String(version);
		if (typeof version !== "string") return null;
		options = options || {};
		let match = null;
		if (!options.rtl) match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
		else {
			const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
			let next;
			while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
				if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
				coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
			}
			coerceRtlRegex.lastIndex = -1;
		}
		if (match === null) return null;
		const major = match[2];
		return parse(`${major}.${match[3] || "0"}.${match[4] || "0"}${options.includePrerelease && match[5] ? `-${match[5]}` : ""}${options.includePrerelease && match[6] ? `+${match[6]}` : ""}`, options);
	};
	module.exports = coerce;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/truncate.js
var require_truncate = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var constants = require_constants();
	var SemVer = require_semver$1();
	var truncate = (version, truncation, options) => {
		if (!constants.RELEASE_TYPES.includes(truncation)) return null;
		const clonedVersion = cloneInputVersion(version, options);
		return clonedVersion && doTruncation(clonedVersion, truncation);
	};
	var cloneInputVersion = (version, options) => {
		return parse(version instanceof SemVer ? version.version : version, options);
	};
	var doTruncation = (version, truncation) => {
		if (isPrerelease(truncation)) return version.version;
		version.prerelease = [];
		switch (truncation) {
			case "major":
				version.minor = 0;
				version.patch = 0;
				break;
			case "minor": version.patch = 0;
		}
		return version.format();
	};
	var isPrerelease = (type) => {
		return type.startsWith("pre");
	};
	module.exports = truncate;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/internal/lrucache.js
var require_lrucache = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var LRUCache = class {
		constructor() {
			this.max = 1e3;
			this.map = /* @__PURE__ */ new Map();
		}
		get(key) {
			const value = this.map.get(key);
			if (value === void 0) return;
			else {
				this.map.delete(key);
				this.map.set(key, value);
				return value;
			}
		}
		delete(key) {
			return this.map.delete(key);
		}
		set(key, value) {
			if (!this.delete(key) && value !== void 0) {
				if (this.map.size >= this.max) {
					const firstKey = this.map.keys().next().value;
					this.delete(firstKey);
				}
				this.map.set(key, value);
			}
			return this;
		}
	};
	module.exports = LRUCache;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/classes/range.js
var require_range = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SPACE_CHARACTERS = /\s+/g;
	module.exports = class Range {
		constructor(range, options) {
			options = parseOptions(options);
			if (range instanceof Range) if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) return range;
			else return new Range(range.raw, options);
			if (range instanceof Comparator) {
				this.raw = range.value;
				this.set = [[range]];
				this.formatted = void 0;
				return this;
			}
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
			this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
			if (!this.set.length) throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
			if (this.set.length > 1) {
				const first = this.set[0];
				this.set = this.set.filter((c) => !isNullSet(c[0]));
				if (this.set.length === 0) this.set = [first];
				else if (this.set.length > 1) {
					for (const c of this.set) if (c.length === 1 && isAny(c[0])) {
						this.set = [c];
						break;
					}
				}
			}
			this.formatted = void 0;
		}
		get range() {
			if (this.formatted === void 0) {
				this.formatted = "";
				for (let i = 0; i < this.set.length; i++) {
					if (i > 0) this.formatted += "||";
					const comps = this.set[i];
					for (let k = 0; k < comps.length; k++) {
						if (k > 0) this.formatted += " ";
						this.formatted += comps[k].toString().trim();
					}
				}
			}
			return this.formatted;
		}
		format() {
			return this.range;
		}
		toString() {
			return this.range;
		}
		parseRange(range) {
			range = range.replace(BUILDSTRIPRE, "");
			const memoKey = ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE)) + ":" + range;
			const cached = cache.get(memoKey);
			if (cached) return cached;
			const loose = this.options.loose;
			const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
			range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
			debug("hyphen replace", range);
			range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
			debug("comparator trim", range);
			range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
			debug("tilde trim", range);
			range = range.replace(re[t.CARETTRIM], caretTrimReplace);
			debug("caret trim", range);
			let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
			if (loose) rangeList = rangeList.filter((comp) => {
				debug("loose invalid filter", comp, this.options);
				return !!comp.match(re[t.COMPARATORLOOSE]);
			});
			debug("range list", rangeList);
			const rangeMap = /* @__PURE__ */ new Map();
			const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
			for (const comp of comparators) {
				if (isNullSet(comp)) return [comp];
				rangeMap.set(comp.value, comp);
			}
			if (rangeMap.size > 1 && rangeMap.has("")) rangeMap.delete("");
			const result = [...rangeMap.values()];
			cache.set(memoKey, result);
			return result;
		}
		intersects(range, options) {
			if (!(range instanceof Range)) throw new TypeError("a Range is required");
			return this.set.some((thisComparators) => {
				return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
					return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
						return rangeComparators.every((rangeComparator) => {
							return thisComparator.intersects(rangeComparator, options);
						});
					});
				});
			});
		}
		test(version) {
			if (!version) return false;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			for (let i = 0; i < this.set.length; i++) if (testSet(this.set[i], version, this.options)) return true;
			return false;
		}
	};
	var cache = new (require_lrucache())();
	var parseOptions = require_parse_options();
	var Comparator = require_comparator();
	var debug = require_debug();
	var SemVer = require_semver$1();
	var { safeRe: re, src, t, comparatorTrimReplace, tildeTrimReplace, caretTrimReplace } = require_re();
	var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
	var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
	var isNullSet = (c) => c.value === "<0.0.0-0";
	var isAny = (c) => c.value === "";
	var isSatisfiable = (comparators, options) => {
		let result = true;
		const remainingComparators = comparators.slice();
		let testComparator = remainingComparators.pop();
		while (result && remainingComparators.length) {
			result = remainingComparators.every((otherComparator) => {
				return testComparator.intersects(otherComparator, options);
			});
			testComparator = remainingComparators.pop();
		}
		return result;
	};
	var parseComparator = (comp, options) => {
		comp = comp.replace(re[t.BUILD], "");
		debug("comp", comp, options);
		comp = replaceCarets(comp, options);
		debug("caret", comp);
		comp = replaceTildes(comp, options);
		debug("tildes", comp);
		comp = replaceXRanges(comp, options);
		debug("xrange", comp);
		comp = replaceStars(comp, options);
		debug("stars", comp);
		return comp;
	};
	var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
	var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
	var replaceTildes = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
	};
	var replaceTilde = (comp, options) => {
		const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
		const z = options.includePrerelease ? "-0" : "";
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("tilde", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
			else if (isX(p)) ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
			else if (pr) {
				debug("replaceTilde pr", pr);
				ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
			} else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
			debug("tilde return", ret);
			return ret;
		});
	};
	var replaceCarets = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
	};
	var replaceCaret = (comp, options) => {
		debug("caret", comp, options);
		const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
		const z = options.includePrerelease ? "-0" : "";
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("caret", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
			else if (isX(p)) if (M === "0") ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
			else ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
			else if (pr) {
				debug("replaceCaret pr", pr);
				if (M === "0") if (m === "0") ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
				else ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
				else ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
			} else {
				debug("no pr");
				if (M === "0") if (m === "0") ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
				else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
				else ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
			}
			debug("caret return", ret);
			return ret;
		});
	};
	var replaceXRanges = (comp, options) => {
		debug("replaceXRanges", comp, options);
		return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
	};
	var replaceXRange = (comp, options) => {
		comp = comp.trim();
		const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
		return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
			debug("xRange", comp, ret, gtlt, M, m, p, pr);
			if (invalidXRangeOrder(M, m, p)) return comp;
			const xM = isX(M);
			const xm = xM || isX(m);
			const xp = xm || isX(p);
			const anyX = xp;
			if (gtlt === "=" && anyX) gtlt = "";
			pr = options.includePrerelease ? "-0" : "";
			if (xM) if (gtlt === ">" || gtlt === "<") ret = "<0.0.0-0";
			else ret = "*";
			else if (gtlt && anyX) {
				if (xm) m = 0;
				p = 0;
				if (gtlt === ">") {
					gtlt = ">=";
					if (xm) {
						M = +M + 1;
						m = 0;
						p = 0;
					} else {
						m = +m + 1;
						p = 0;
					}
				} else if (gtlt === "<=") {
					gtlt = "<";
					if (xm) M = +M + 1;
					else m = +m + 1;
				}
				if (gtlt === "<") pr = "-0";
				ret = `${gtlt + M}.${m}.${p}${pr}`;
			} else if (xm) ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
			else if (xp) ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
			debug("xRange return", ret);
			return ret;
		});
	};
	var replaceStars = (comp, options) => {
		debug("replaceStars", comp, options);
		return comp.trim().replace(re[t.STAR], "");
	};
	var replaceGTE0 = (comp, options) => {
		debug("replaceGTE0", comp, options);
		return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
	};
	var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
		if (isX(fM)) from = "";
		else if (isX(fm)) from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
		else if (isX(fp)) from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
		else if (fpr) from = `>=${from}`;
		else from = `>=${from}${incPr ? "-0" : ""}`;
		if (isX(tM)) to = "";
		else if (isX(tm)) to = `<${+tM + 1}.0.0-0`;
		else if (isX(tp)) to = `<${tM}.${+tm + 1}.0-0`;
		else if (tpr) to = `<=${tM}.${tm}.${tp}-${tpr}`;
		else if (incPr) to = `<${tM}.${tm}.${+tp + 1}-0`;
		else to = `<=${to}`;
		return `${from} ${to}`.trim();
	};
	var testSet = (set, version, options) => {
		for (let i = 0; i < set.length; i++) if (!set[i].test(version)) return false;
		if (version.prerelease.length && !options.includePrerelease) {
			for (let i = 0; i < set.length; i++) {
				debug(set[i].semver);
				if (set[i].semver === Comparator.ANY) continue;
				if (set[i].semver.prerelease.length > 0) {
					const allowed = set[i].semver;
					if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) return true;
				}
			}
			return false;
		}
		return true;
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/classes/comparator.js
var require_comparator = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ANY = Symbol("SemVer ANY");
	module.exports = class Comparator {
		static get ANY() {
			return ANY;
		}
		constructor(comp, options) {
			options = parseOptions(options);
			if (comp instanceof Comparator) if (comp.loose === !!options.loose) return comp;
			else comp = comp.value;
			comp = comp.trim().split(/\s+/).join(" ");
			debug("comparator", comp, options);
			this.options = options;
			this.loose = !!options.loose;
			this.parse(comp);
			if (this.semver === ANY) this.value = "";
			else this.value = this.operator + this.semver.version;
			debug("comp", this);
		}
		parse(comp) {
			const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
			const m = comp.match(r);
			if (!m) throw new TypeError(`Invalid comparator: ${comp}`);
			this.operator = m[1] !== void 0 ? m[1] : "";
			if (this.operator === "=") this.operator = "";
			if (!m[2]) this.semver = ANY;
			else this.semver = new SemVer(m[2], this.options.loose);
		}
		toString() {
			return this.value;
		}
		test(version) {
			debug("Comparator.test", version, this.options.loose);
			if (this.semver === ANY || version === ANY) return true;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			return cmp(version, this.operator, this.semver, this.options);
		}
		intersects(comp, options) {
			if (!(comp instanceof Comparator)) throw new TypeError("a Comparator is required");
			if (this.operator === "") {
				if (this.value === "") return true;
				return new Range(comp.value, options).test(this.value);
			} else if (comp.operator === "") {
				if (comp.value === "") return true;
				return new Range(this.value, options).test(comp.semver);
			}
			options = parseOptions(options);
			if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) return false;
			if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) return false;
			if (this.operator.startsWith(">") && comp.operator.startsWith(">")) return true;
			if (this.operator.startsWith("<") && comp.operator.startsWith("<")) return true;
			if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) return true;
			if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) return true;
			if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) return true;
			return false;
		}
	};
	var parseOptions = require_parse_options();
	var { safeRe: re, t } = require_re();
	var cmp = require_cmp();
	var debug = require_debug();
	var SemVer = require_semver$1();
	var Range = require_range();
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/functions/satisfies.js
var require_satisfies = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var satisfies = (version, range, options) => {
		try {
			range = new Range(range, options);
		} catch (er) {
			return false;
		}
		return range.test(version);
	};
	module.exports = satisfies;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/to-comparators.js
var require_to_comparators = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
	module.exports = toComparators;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Range = require_range();
	var maxSatisfying = (versions, range, options) => {
		let max = null;
		let maxSV = null;
		let rangeObj = null;
		try {
			rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach((v) => {
			if (rangeObj.test(v)) {
				if (!max || maxSV.compare(v) === -1) {
					max = v;
					maxSV = new SemVer(max, options);
				}
			}
		});
		return max;
	};
	module.exports = maxSatisfying;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Range = require_range();
	var minSatisfying = (versions, range, options) => {
		let min = null;
		let minSV = null;
		let rangeObj = null;
		try {
			rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach((v) => {
			if (rangeObj.test(v)) {
				if (!min || minSV.compare(v) === 1) {
					min = v;
					minSV = new SemVer(min, options);
				}
			}
		});
		return min;
	};
	module.exports = minSatisfying;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/min-version.js
var require_min_version = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Range = require_range();
	var gt = require_gt();
	var minVersion = (range, loose) => {
		range = new Range(range, loose);
		let minver = new SemVer("0.0.0");
		if (range.test(minver)) return minver;
		minver = new SemVer("0.0.0-0");
		if (range.test(minver)) return minver;
		minver = null;
		for (let i = 0; i < range.set.length; ++i) {
			const comparators = range.set[i];
			let setMin = null;
			comparators.forEach((comparator) => {
				const compver = new SemVer(comparator.semver.version);
				switch (comparator.operator) {
					case ">":
						if (compver.prerelease.length === 0) compver.patch++;
						else compver.prerelease.push(0);
						compver.raw = compver.format();
					case "":
					case ">=":
						if (!setMin || gt(compver, setMin)) setMin = compver;
						break;
					case "<":
					case "<=": break;
					/* istanbul ignore next */
					default: throw new Error(`Unexpected operation: ${comparator.operator}`);
				}
			});
			if (setMin && (!minver || gt(minver, setMin))) minver = setMin;
		}
		if (minver && range.test(minver)) return minver;
		return null;
	};
	module.exports = minVersion;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/valid.js
var require_valid = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var validRange = (range, options) => {
		try {
			return new Range(range, options).range || "*";
		} catch (er) {
			return null;
		}
	};
	module.exports = validRange;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/outside.js
var require_outside = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Comparator = require_comparator();
	var { ANY } = Comparator;
	var Range = require_range();
	var satisfies = require_satisfies();
	var gt = require_gt();
	var lt = require_lt();
	var lte = require_lte();
	var gte = require_gte();
	var outside = (version, range, hilo, options) => {
		version = new SemVer(version, options);
		range = new Range(range, options);
		let gtfn, ltefn, ltfn, comp, ecomp;
		switch (hilo) {
			case ">":
				gtfn = gt;
				ltefn = lte;
				ltfn = lt;
				comp = ">";
				ecomp = ">=";
				break;
			case "<":
				gtfn = lt;
				ltefn = gte;
				ltfn = gt;
				comp = "<";
				ecomp = "<=";
				break;
			default: throw new TypeError("Must provide a hilo val of \"<\" or \">\"");
		}
		if (satisfies(version, range, options)) return false;
		for (let i = 0; i < range.set.length; ++i) {
			const comparators = range.set[i];
			let high = null;
			let low = null;
			comparators.forEach((comparator) => {
				if (comparator.semver === ANY) comparator = new Comparator(">=0.0.0");
				high = high || comparator;
				low = low || comparator;
				if (gtfn(comparator.semver, high.semver, options)) high = comparator;
				else if (ltfn(comparator.semver, low.semver, options)) low = comparator;
			});
			if (high.operator === comp || high.operator === ecomp) return false;
			if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) return false;
			else if (low.operator === ecomp && ltfn(version, low.semver)) return false;
		}
		return true;
	};
	module.exports = outside;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/gtr.js
var require_gtr = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var outside = require_outside();
	var gtr = (version, range, options) => outside(version, range, ">", options);
	module.exports = gtr;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/ltr.js
var require_ltr = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var outside = require_outside();
	var ltr = (version, range, options) => outside(version, range, "<", options);
	module.exports = ltr;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/intersects.js
var require_intersects = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var intersects = (r1, r2, options) => {
		r1 = new Range(r1, options);
		r2 = new Range(r2, options);
		return r1.intersects(r2, options);
	};
	module.exports = intersects;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/simplify.js
var require_simplify = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var satisfies = require_satisfies();
	var compare = require_compare();
	module.exports = (versions, range, options) => {
		const set = [];
		let first = null;
		let prev = null;
		const v = versions.sort((a, b) => compare(a, b, options));
		for (const version of v) if (satisfies(version, range, options)) {
			prev = version;
			if (!first) first = version;
		} else {
			if (prev) set.push([first, prev]);
			prev = null;
			first = null;
		}
		if (first) set.push([first, null]);
		const ranges = [];
		for (const [min, max] of set) if (min === max) ranges.push(min);
		else if (!max && min === v[0]) ranges.push("*");
		else if (!max) ranges.push(`>=${min}`);
		else if (min === v[0]) ranges.push(`<=${max}`);
		else ranges.push(`${min} - ${max}`);
		const simplified = ranges.join(" || ");
		const original = typeof range.raw === "string" ? range.raw : String(range);
		return simplified.length < original.length ? simplified : range;
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/ranges/subset.js
var require_subset = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var Comparator = require_comparator();
	var { ANY } = Comparator;
	var satisfies = require_satisfies();
	var compare = require_compare();
	var subset = (sub, dom, options = {}) => {
		if (sub === dom) return true;
		sub = new Range(sub, options);
		dom = new Range(dom, options);
		let sawNonNull = false;
		OUTER: for (const simpleSub of sub.set) {
			for (const simpleDom of dom.set) {
				const isSub = simpleSubset(simpleSub, simpleDom, options);
				sawNonNull = sawNonNull || isSub !== null;
				if (isSub) continue OUTER;
			}
			if (sawNonNull) return false;
		}
		return true;
	};
	var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
	var minimumVersion = [new Comparator(">=0.0.0")];
	var simpleSubset = (sub, dom, options) => {
		if (sub === dom) return true;
		if (sub.length === 1 && sub[0].semver === ANY) if (dom.length === 1 && dom[0].semver === ANY) return true;
		else if (options.includePrerelease) sub = minimumVersionWithPreRelease;
		else sub = minimumVersion;
		if (dom.length === 1 && dom[0].semver === ANY) if (options.includePrerelease) return true;
		else dom = minimumVersion;
		const eqSet = /* @__PURE__ */ new Set();
		let gt, lt;
		for (const c of sub) if (c.operator === ">" || c.operator === ">=") gt = higherGT(gt, c, options);
		else if (c.operator === "<" || c.operator === "<=") lt = lowerLT(lt, c, options);
		else eqSet.add(c.semver);
		if (eqSet.size > 1) return null;
		let gtltComp;
		if (gt && lt) {
			gtltComp = compare(gt.semver, lt.semver, options);
			if (gtltComp > 0) return null;
			else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) return null;
		}
		for (const eq of eqSet) {
			if (gt && !satisfies(eq, String(gt), options)) return null;
			if (lt && !satisfies(eq, String(lt), options)) return null;
			for (const c of dom) if (!satisfies(eq, String(c), options)) return false;
			return true;
		}
		let higher, lower;
		let hasDomLT, hasDomGT;
		let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
		let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
		if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) needDomLTPre = false;
		for (const c of dom) {
			hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
			hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
			if (gt) {
				if (needDomGTPre) {
					if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) needDomGTPre = false;
				}
				if (c.operator === ">" || c.operator === ">=") {
					higher = higherGT(gt, c, options);
					if (higher === c && higher !== gt) return false;
				} else if (gt.operator === ">=" && !c.test(gt.semver)) return false;
			}
			if (lt) {
				if (needDomLTPre) {
					if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) needDomLTPre = false;
				}
				if (c.operator === "<" || c.operator === "<=") {
					lower = lowerLT(lt, c, options);
					if (lower === c && lower !== lt) return false;
				} else if (lt.operator === "<=" && !c.test(lt.semver)) return false;
			}
			if (!c.operator && (lt || gt) && gtltComp !== 0) return false;
		}
		if (gt && hasDomLT && !lt && gtltComp !== 0) return false;
		if (lt && hasDomGT && !gt && gtltComp !== 0) return false;
		if (needDomGTPre || needDomLTPre) return false;
		return true;
	};
	var higherGT = (a, b, options) => {
		if (!a) return b;
		const comp = compare(a.semver, b.semver, options);
		return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
	};
	var lowerLT = (a, b, options) => {
		if (!a) return b;
		const comp = compare(a.semver, b.semver, options);
		return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
	};
	module.exports = subset;
}));
//#endregion
//#region node_modules/jsonwebtoken/node_modules/semver/index.js
var require_semver = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var internalRe = require_re();
	var constants = require_constants();
	var SemVer = require_semver$1();
	var identifiers = require_identifiers();
	module.exports = {
		parse: require_parse(),
		valid: require_valid$1(),
		clean: require_clean(),
		inc: require_inc(),
		diff: require_diff(),
		major: require_major(),
		minor: require_minor(),
		patch: require_patch(),
		prerelease: require_prerelease(),
		compare: require_compare(),
		rcompare: require_rcompare(),
		compareLoose: require_compare_loose(),
		compareBuild: require_compare_build(),
		sort: require_sort(),
		rsort: require_rsort(),
		gt: require_gt(),
		lt: require_lt(),
		eq: require_eq(),
		neq: require_neq(),
		gte: require_gte(),
		lte: require_lte(),
		cmp: require_cmp(),
		coerce: require_coerce(),
		truncate: require_truncate(),
		Comparator: require_comparator(),
		Range: require_range(),
		satisfies: require_satisfies(),
		toComparators: require_to_comparators(),
		maxSatisfying: require_max_satisfying(),
		minSatisfying: require_min_satisfying(),
		minVersion: require_min_version(),
		validRange: require_valid(),
		outside: require_outside(),
		gtr: require_gtr(),
		ltr: require_ltr(),
		intersects: require_intersects(),
		simplifyRange: require_simplify(),
		subset: require_subset(),
		SemVer,
		re: internalRe.re,
		src: internalRe.src,
		tokens: internalRe.t,
		SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
		RELEASE_TYPES: constants.RELEASE_TYPES,
		compareIdentifiers: identifiers.compareIdentifiers,
		rcompareIdentifiers: identifiers.rcompareIdentifiers
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/lib/asymmetricKeyDetailsSupported.js
var require_asymmetricKeyDetailsSupported = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_semver().satisfies(process.version, ">=15.7.0");
}));
//#endregion
//#region node_modules/jsonwebtoken/lib/rsaPssKeyDetailsSupported.js
var require_rsaPssKeyDetailsSupported = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_semver().satisfies(process.version, ">=16.9.0");
}));
//#endregion
//#region node_modules/jsonwebtoken/lib/validateAsymmetricKey.js
var require_validateAsymmetricKey = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ASYMMETRIC_KEY_DETAILS_SUPPORTED = require_asymmetricKeyDetailsSupported();
	var RSA_PSS_KEY_DETAILS_SUPPORTED = require_rsaPssKeyDetailsSupported();
	var allowedAlgorithmsForKeys = {
		"ec": [
			"ES256",
			"ES384",
			"ES512"
		],
		"rsa": [
			"RS256",
			"PS256",
			"RS384",
			"PS384",
			"RS512",
			"PS512"
		],
		"rsa-pss": [
			"PS256",
			"PS384",
			"PS512"
		]
	};
	var allowedCurves = {
		ES256: "prime256v1",
		ES384: "secp384r1",
		ES512: "secp521r1"
	};
	module.exports = function(algorithm, key) {
		if (!algorithm || !key) return;
		const keyType = key.asymmetricKeyType;
		if (!keyType) return;
		const allowedAlgorithms = allowedAlgorithmsForKeys[keyType];
		if (!allowedAlgorithms) throw new Error(`Unknown key type "${keyType}".`);
		if (!allowedAlgorithms.includes(algorithm)) throw new Error(`"alg" parameter for "${keyType}" key type must be one of: ${allowedAlgorithms.join(", ")}.`);
		/* istanbul ignore next */
		if (ASYMMETRIC_KEY_DETAILS_SUPPORTED) switch (keyType) {
			case "ec":
				const keyCurve = key.asymmetricKeyDetails.namedCurve;
				const allowedCurve = allowedCurves[algorithm];
				if (keyCurve !== allowedCurve) throw new Error(`"alg" parameter "${algorithm}" requires curve "${allowedCurve}".`);
				break;
			case "rsa-pss": if (RSA_PSS_KEY_DETAILS_SUPPORTED) {
				const length = parseInt(algorithm.slice(-3), 10);
				const { hashAlgorithm, mgf1HashAlgorithm, saltLength } = key.asymmetricKeyDetails;
				if (hashAlgorithm !== `sha${length}` || mgf1HashAlgorithm !== hashAlgorithm) throw new Error(`Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${algorithm}.`);
				if (saltLength !== void 0 && saltLength > length >> 3) throw new Error(`Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${algorithm}.`);
			}
		}
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/lib/psSupported.js
var require_psSupported = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_semver().satisfies(process.version, "^6.12.0 || >=8.0.0");
}));
//#endregion
//#region node_modules/jsonwebtoken/verify.js
var require_verify = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var JsonWebTokenError = require_JsonWebTokenError();
	var NotBeforeError = require_NotBeforeError();
	var TokenExpiredError = require_TokenExpiredError();
	var decode = require_decode();
	var timespan = require_timespan();
	var validateAsymmetricKey = require_validateAsymmetricKey();
	var PS_SUPPORTED = require_psSupported();
	var jws = require_jws();
	var { KeyObject: KeyObject$1, createSecretKey: createSecretKey$1, createPublicKey } = __require("crypto");
	var PUB_KEY_ALGS = [
		"RS256",
		"RS384",
		"RS512"
	];
	var EC_KEY_ALGS = [
		"ES256",
		"ES384",
		"ES512"
	];
	var RSA_KEY_ALGS = [
		"RS256",
		"RS384",
		"RS512"
	];
	var HS_ALGS = [
		"HS256",
		"HS384",
		"HS512"
	];
	if (PS_SUPPORTED) {
		PUB_KEY_ALGS.splice(PUB_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
		RSA_KEY_ALGS.splice(RSA_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
	}
	module.exports = function(jwtString, secretOrPublicKey, options, callback) {
		if (typeof options === "function" && !callback) {
			callback = options;
			options = {};
		}
		if (!options) options = {};
		options = Object.assign({}, options);
		let done;
		if (callback) done = callback;
		else done = function(err, data) {
			if (err) throw err;
			return data;
		};
		if (options.clockTimestamp && typeof options.clockTimestamp !== "number") return done(new JsonWebTokenError("clockTimestamp must be a number"));
		if (options.nonce !== void 0 && (typeof options.nonce !== "string" || options.nonce.trim() === "")) return done(new JsonWebTokenError("nonce must be a non-empty string"));
		if (options.allowInvalidAsymmetricKeyTypes !== void 0 && typeof options.allowInvalidAsymmetricKeyTypes !== "boolean") return done(new JsonWebTokenError("allowInvalidAsymmetricKeyTypes must be a boolean"));
		const clockTimestamp = options.clockTimestamp || Math.floor(Date.now() / 1e3);
		if (!jwtString) return done(new JsonWebTokenError("jwt must be provided"));
		if (typeof jwtString !== "string") return done(new JsonWebTokenError("jwt must be a string"));
		const parts = jwtString.split(".");
		if (parts.length !== 3) return done(new JsonWebTokenError("jwt malformed"));
		let decodedToken;
		try {
			decodedToken = decode(jwtString, { complete: true });
		} catch (err) {
			return done(err);
		}
		if (!decodedToken) return done(new JsonWebTokenError("invalid token"));
		const header = decodedToken.header;
		let getSecret;
		if (typeof secretOrPublicKey === "function") {
			if (!callback) return done(new JsonWebTokenError("verify must be called asynchronous if secret or public key is provided as a callback"));
			getSecret = secretOrPublicKey;
		} else getSecret = function(header, secretCallback) {
			return secretCallback(null, secretOrPublicKey);
		};
		return getSecret(header, function(err, secretOrPublicKey) {
			if (err) return done(new JsonWebTokenError("error in secret or public key callback: " + err.message));
			const hasSignature = parts[2].trim() !== "";
			if (!hasSignature && secretOrPublicKey) return done(new JsonWebTokenError("jwt signature is required"));
			if (hasSignature && !secretOrPublicKey) return done(new JsonWebTokenError("secret or public key must be provided"));
			if (!hasSignature && !options.algorithms) return done(new JsonWebTokenError("please specify \"none\" in \"algorithms\" to verify unsigned tokens"));
			if (secretOrPublicKey != null && !(secretOrPublicKey instanceof KeyObject$1)) try {
				secretOrPublicKey = createPublicKey(secretOrPublicKey);
			} catch (_) {
				try {
					secretOrPublicKey = createSecretKey$1(typeof secretOrPublicKey === "string" ? Buffer.from(secretOrPublicKey) : secretOrPublicKey);
				} catch (_) {
					return done(new JsonWebTokenError("secretOrPublicKey is not valid key material"));
				}
			}
			if (!options.algorithms) if (secretOrPublicKey.type === "secret") options.algorithms = HS_ALGS;
			else if (["rsa", "rsa-pss"].includes(secretOrPublicKey.asymmetricKeyType)) options.algorithms = RSA_KEY_ALGS;
			else if (secretOrPublicKey.asymmetricKeyType === "ec") options.algorithms = EC_KEY_ALGS;
			else options.algorithms = PUB_KEY_ALGS;
			if (options.algorithms.indexOf(decodedToken.header.alg) === -1) return done(new JsonWebTokenError("invalid algorithm"));
			if (header.alg.startsWith("HS") && secretOrPublicKey.type !== "secret") return done(new JsonWebTokenError(`secretOrPublicKey must be a symmetric key when using ${header.alg}`));
			else if (/^(?:RS|PS|ES)/.test(header.alg) && secretOrPublicKey.type !== "public") return done(new JsonWebTokenError(`secretOrPublicKey must be an asymmetric key when using ${header.alg}`));
			if (!options.allowInvalidAsymmetricKeyTypes) try {
				validateAsymmetricKey(header.alg, secretOrPublicKey);
			} catch (e) {
				return done(e);
			}
			let valid;
			try {
				valid = jws.verify(jwtString, decodedToken.header.alg, secretOrPublicKey);
			} catch (e) {
				return done(e);
			}
			if (!valid) return done(new JsonWebTokenError("invalid signature"));
			const payload = decodedToken.payload;
			if (typeof payload.nbf !== "undefined" && !options.ignoreNotBefore) {
				if (typeof payload.nbf !== "number") return done(new JsonWebTokenError("invalid nbf value"));
				if (payload.nbf > clockTimestamp + (options.clockTolerance || 0)) return done(new NotBeforeError("jwt not active", /* @__PURE__ */ new Date(payload.nbf * 1e3)));
			}
			if (typeof payload.exp !== "undefined" && !options.ignoreExpiration) {
				if (typeof payload.exp !== "number") return done(new JsonWebTokenError("invalid exp value"));
				if (clockTimestamp >= payload.exp + (options.clockTolerance || 0)) return done(new TokenExpiredError("jwt expired", /* @__PURE__ */ new Date(payload.exp * 1e3)));
			}
			if (options.audience) {
				const audiences = Array.isArray(options.audience) ? options.audience : [options.audience];
				if (!(Array.isArray(payload.aud) ? payload.aud : [payload.aud]).some(function(targetAudience) {
					return audiences.some(function(audience) {
						return audience instanceof RegExp ? audience.test(targetAudience) : audience === targetAudience;
					});
				})) return done(new JsonWebTokenError("jwt audience invalid. expected: " + audiences.join(" or ")));
			}
			if (options.issuer) {
				if (typeof options.issuer === "string" && payload.iss !== options.issuer || Array.isArray(options.issuer) && options.issuer.indexOf(payload.iss) === -1) return done(new JsonWebTokenError("jwt issuer invalid. expected: " + options.issuer));
			}
			if (options.subject) {
				if (payload.sub !== options.subject) return done(new JsonWebTokenError("jwt subject invalid. expected: " + options.subject));
			}
			if (options.jwtid) {
				if (payload.jti !== options.jwtid) return done(new JsonWebTokenError("jwt jwtid invalid. expected: " + options.jwtid));
			}
			if (options.nonce) {
				if (payload.nonce !== options.nonce) return done(new JsonWebTokenError("jwt nonce invalid. expected: " + options.nonce));
			}
			if (options.maxAge) {
				if (typeof payload.iat !== "number") return done(new JsonWebTokenError("iat required when maxAge is specified"));
				const maxAgeTimestamp = timespan(options.maxAge, payload.iat);
				if (typeof maxAgeTimestamp === "undefined") return done(new JsonWebTokenError("\"maxAge\" should be a number of seconds or string representing a timespan eg: \"1d\", \"20h\", 60"));
				if (clockTimestamp >= maxAgeTimestamp + (options.clockTolerance || 0)) return done(new TokenExpiredError("maxAge exceeded", /* @__PURE__ */ new Date(maxAgeTimestamp * 1e3)));
			}
			if (options.complete === true) {
				const signature = decodedToken.signature;
				return done(null, {
					header,
					payload,
					signature
				});
			}
			return done(null, payload);
		});
	};
}));
//#endregion
//#region node_modules/lodash.includes/index.js
var require_lodash_includes = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* lodash (Custom Build) <https://lodash.com/>
	* Build: `lodash modularize exports="npm" -o ./`
	* Copyright jQuery Foundation and other contributors <https://jquery.org/>
	* Released under MIT license <https://lodash.com/license>
	* Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	* Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	*/
	/** Used as references for various `Number` constants. */
	var INFINITY = Infinity;
	var MAX_SAFE_INTEGER = 9007199254740991;
	var MAX_INTEGER = 17976931348623157e292;
	var NAN = NaN;
	/** `Object#toString` result references. */
	var argsTag = "[object Arguments]";
	var funcTag = "[object Function]";
	var genTag = "[object GeneratorFunction]";
	var stringTag = "[object String]";
	var symbolTag = "[object Symbol]";
	/** Used to match leading and trailing whitespace. */
	var reTrim = /^\s+|\s+$/g;
	/** Used to detect bad signed hexadecimal string values. */
	var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
	/** Used to detect binary string values. */
	var reIsBinary = /^0b[01]+$/i;
	/** Used to detect octal string values. */
	var reIsOctal = /^0o[0-7]+$/i;
	/** Used to detect unsigned integer values. */
	var reIsUint = /^(?:0|[1-9]\d*)$/;
	/** Built-in method references without a dependency on `root`. */
	var freeParseInt = parseInt;
	/**
	* A specialized version of `_.map` for arrays without support for iteratee
	* shorthands.
	*
	* @private
	* @param {Array} [array] The array to iterate over.
	* @param {Function} iteratee The function invoked per iteration.
	* @returns {Array} Returns the new mapped array.
	*/
	function arrayMap(array, iteratee) {
		var index = -1, length = array ? array.length : 0, result = Array(length);
		while (++index < length) result[index] = iteratee(array[index], index, array);
		return result;
	}
	/**
	* The base implementation of `_.findIndex` and `_.findLastIndex` without
	* support for iteratee shorthands.
	*
	* @private
	* @param {Array} array The array to inspect.
	* @param {Function} predicate The function invoked per iteration.
	* @param {number} fromIndex The index to search from.
	* @param {boolean} [fromRight] Specify iterating from right to left.
	* @returns {number} Returns the index of the matched value, else `-1`.
	*/
	function baseFindIndex(array, predicate, fromIndex, fromRight) {
		var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
		while (fromRight ? index-- : ++index < length) if (predicate(array[index], index, array)) return index;
		return -1;
	}
	/**
	* The base implementation of `_.indexOf` without `fromIndex` bounds checks.
	*
	* @private
	* @param {Array} array The array to inspect.
	* @param {*} value The value to search for.
	* @param {number} fromIndex The index to search from.
	* @returns {number} Returns the index of the matched value, else `-1`.
	*/
	function baseIndexOf(array, value, fromIndex) {
		if (value !== value) return baseFindIndex(array, baseIsNaN, fromIndex);
		var index = fromIndex - 1, length = array.length;
		while (++index < length) if (array[index] === value) return index;
		return -1;
	}
	/**
	* The base implementation of `_.isNaN` without support for number objects.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
	*/
	function baseIsNaN(value) {
		return value !== value;
	}
	/**
	* The base implementation of `_.times` without support for iteratee shorthands
	* or max array length checks.
	*
	* @private
	* @param {number} n The number of times to invoke `iteratee`.
	* @param {Function} iteratee The function invoked per iteration.
	* @returns {Array} Returns the array of results.
	*/
	function baseTimes(n, iteratee) {
		var index = -1, result = Array(n);
		while (++index < n) result[index] = iteratee(index);
		return result;
	}
	/**
	* The base implementation of `_.values` and `_.valuesIn` which creates an
	* array of `object` property values corresponding to the property names
	* of `props`.
	*
	* @private
	* @param {Object} object The object to query.
	* @param {Array} props The property names to get values for.
	* @returns {Object} Returns the array of property values.
	*/
	function baseValues(object, props) {
		return arrayMap(props, function(key) {
			return object[key];
		});
	}
	/**
	* Creates a unary function that invokes `func` with its argument transformed.
	*
	* @private
	* @param {Function} func The function to wrap.
	* @param {Function} transform The argument transform.
	* @returns {Function} Returns the new function.
	*/
	function overArg(func, transform) {
		return function(arg) {
			return func(transform(arg));
		};
	}
	/** Used for built-in method references. */
	var objectProto = Object.prototype;
	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;
	/**
	* Used to resolve the
	* [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var objectToString = objectProto.toString;
	/** Built-in value references. */
	var propertyIsEnumerable = objectProto.propertyIsEnumerable;
	var nativeKeys = overArg(Object.keys, Object);
	var nativeMax = Math.max;
	/**
	* Creates an array of the enumerable property names of the array-like `value`.
	*
	* @private
	* @param {*} value The value to query.
	* @param {boolean} inherited Specify returning inherited property names.
	* @returns {Array} Returns the array of property names.
	*/
	function arrayLikeKeys(value, inherited) {
		var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
		var length = result.length, skipIndexes = !!length;
		for (var key in value) if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) result.push(key);
		return result;
	}
	/**
	* The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
	*
	* @private
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of property names.
	*/
	function baseKeys(object) {
		if (!isPrototype(object)) return nativeKeys(object);
		var result = [];
		for (var key in Object(object)) if (hasOwnProperty.call(object, key) && key != "constructor") result.push(key);
		return result;
	}
	/**
	* Checks if `value` is a valid array-like index.
	*
	* @private
	* @param {*} value The value to check.
	* @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
	* @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
	*/
	function isIndex(value, length) {
		length = length == null ? MAX_SAFE_INTEGER : length;
		return !!length && (typeof value == "number" || reIsUint.test(value)) && value > -1 && value % 1 == 0 && value < length;
	}
	/**
	* Checks if `value` is likely a prototype object.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
	*/
	function isPrototype(value) {
		var Ctor = value && value.constructor;
		return value === (typeof Ctor == "function" && Ctor.prototype || objectProto);
	}
	/**
	* Checks if `value` is in `collection`. If `collection` is a string, it's
	* checked for a substring of `value`, otherwise
	* [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	* is used for equality comparisons. If `fromIndex` is negative, it's used as
	* the offset from the end of `collection`.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Collection
	* @param {Array|Object|string} collection The collection to inspect.
	* @param {*} value The value to search for.
	* @param {number} [fromIndex=0] The index to search from.
	* @param- {Object} [guard] Enables use as an iteratee for methods like `_.reduce`.
	* @returns {boolean} Returns `true` if `value` is found, else `false`.
	* @example
	*
	* _.includes([1, 2, 3], 1);
	* // => true
	*
	* _.includes([1, 2, 3], 1, 2);
	* // => false
	*
	* _.includes({ 'a': 1, 'b': 2 }, 1);
	* // => true
	*
	* _.includes('abcd', 'bc');
	* // => true
	*/
	function includes(collection, value, fromIndex, guard) {
		collection = isArrayLike(collection) ? collection : values(collection);
		fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
		var length = collection.length;
		if (fromIndex < 0) fromIndex = nativeMax(length + fromIndex, 0);
		return isString(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection, value, fromIndex) > -1;
	}
	/**
	* Checks if `value` is likely an `arguments` object.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an `arguments` object,
	*  else `false`.
	* @example
	*
	* _.isArguments(function() { return arguments; }());
	* // => true
	*
	* _.isArguments([1, 2, 3]);
	* // => false
	*/
	function isArguments(value) {
		return isArrayLikeObject(value) && hasOwnProperty.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
	}
	/**
	* Checks if `value` is classified as an `Array` object.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an array, else `false`.
	* @example
	*
	* _.isArray([1, 2, 3]);
	* // => true
	*
	* _.isArray(document.body.children);
	* // => false
	*
	* _.isArray('abc');
	* // => false
	*
	* _.isArray(_.noop);
	* // => false
	*/
	var isArray = Array.isArray;
	/**
	* Checks if `value` is array-like. A value is considered array-like if it's
	* not a function and has a `value.length` that's an integer greater than or
	* equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is array-like, else `false`.
	* @example
	*
	* _.isArrayLike([1, 2, 3]);
	* // => true
	*
	* _.isArrayLike(document.body.children);
	* // => true
	*
	* _.isArrayLike('abc');
	* // => true
	*
	* _.isArrayLike(_.noop);
	* // => false
	*/
	function isArrayLike(value) {
		return value != null && isLength(value.length) && !isFunction(value);
	}
	/**
	* This method is like `_.isArrayLike` except that it also checks if `value`
	* is an object.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an array-like object,
	*  else `false`.
	* @example
	*
	* _.isArrayLikeObject([1, 2, 3]);
	* // => true
	*
	* _.isArrayLikeObject(document.body.children);
	* // => true
	*
	* _.isArrayLikeObject('abc');
	* // => false
	*
	* _.isArrayLikeObject(_.noop);
	* // => false
	*/
	function isArrayLikeObject(value) {
		return isObjectLike(value) && isArrayLike(value);
	}
	/**
	* Checks if `value` is classified as a `Function` object.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a function, else `false`.
	* @example
	*
	* _.isFunction(_);
	* // => true
	*
	* _.isFunction(/abc/);
	* // => false
	*/
	function isFunction(value) {
		var tag = isObject(value) ? objectToString.call(value) : "";
		return tag == funcTag || tag == genTag;
	}
	/**
	* Checks if `value` is a valid array-like length.
	*
	* **Note:** This method is loosely based on
	* [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
	* @example
	*
	* _.isLength(3);
	* // => true
	*
	* _.isLength(Number.MIN_VALUE);
	* // => false
	*
	* _.isLength(Infinity);
	* // => false
	*
	* _.isLength('3');
	* // => false
	*/
	function isLength(value) {
		return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
	}
	/**
	* Checks if `value` is the
	* [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	* of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an object, else `false`.
	* @example
	*
	* _.isObject({});
	* // => true
	*
	* _.isObject([1, 2, 3]);
	* // => true
	*
	* _.isObject(_.noop);
	* // => true
	*
	* _.isObject(null);
	* // => false
	*/
	function isObject(value) {
		var type = typeof value;
		return !!value && (type == "object" || type == "function");
	}
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return !!value && typeof value == "object";
	}
	/**
	* Checks if `value` is classified as a `String` primitive or object.
	*
	* @static
	* @since 0.1.0
	* @memberOf _
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a string, else `false`.
	* @example
	*
	* _.isString('abc');
	* // => true
	*
	* _.isString(1);
	* // => false
	*/
	function isString(value) {
		return typeof value == "string" || !isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag;
	}
	/**
	* Checks if `value` is classified as a `Symbol` primitive or object.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	* @example
	*
	* _.isSymbol(Symbol.iterator);
	* // => true
	*
	* _.isSymbol('abc');
	* // => false
	*/
	function isSymbol(value) {
		return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
	}
	/**
	* Converts `value` to a finite number.
	*
	* @static
	* @memberOf _
	* @since 4.12.0
	* @category Lang
	* @param {*} value The value to convert.
	* @returns {number} Returns the converted number.
	* @example
	*
	* _.toFinite(3.2);
	* // => 3.2
	*
	* _.toFinite(Number.MIN_VALUE);
	* // => 5e-324
	*
	* _.toFinite(Infinity);
	* // => 1.7976931348623157e+308
	*
	* _.toFinite('3.2');
	* // => 3.2
	*/
	function toFinite(value) {
		if (!value) return value === 0 ? value : 0;
		value = toNumber(value);
		if (value === INFINITY || value === -Infinity) return (value < 0 ? -1 : 1) * MAX_INTEGER;
		return value === value ? value : 0;
	}
	/**
	* Converts `value` to an integer.
	*
	* **Note:** This method is loosely based on
	* [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to convert.
	* @returns {number} Returns the converted integer.
	* @example
	*
	* _.toInteger(3.2);
	* // => 3
	*
	* _.toInteger(Number.MIN_VALUE);
	* // => 0
	*
	* _.toInteger(Infinity);
	* // => 1.7976931348623157e+308
	*
	* _.toInteger('3.2');
	* // => 3
	*/
	function toInteger(value) {
		var result = toFinite(value), remainder = result % 1;
		return result === result ? remainder ? result - remainder : result : 0;
	}
	/**
	* Converts `value` to a number.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to process.
	* @returns {number} Returns the number.
	* @example
	*
	* _.toNumber(3.2);
	* // => 3.2
	*
	* _.toNumber(Number.MIN_VALUE);
	* // => 5e-324
	*
	* _.toNumber(Infinity);
	* // => Infinity
	*
	* _.toNumber('3.2');
	* // => 3.2
	*/
	function toNumber(value) {
		if (typeof value == "number") return value;
		if (isSymbol(value)) return NAN;
		if (isObject(value)) {
			var other = typeof value.valueOf == "function" ? value.valueOf() : value;
			value = isObject(other) ? other + "" : other;
		}
		if (typeof value != "string") return value === 0 ? value : +value;
		value = value.replace(reTrim, "");
		var isBinary = reIsBinary.test(value);
		return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
	}
	/**
	* Creates an array of the own enumerable property names of `object`.
	*
	* **Note:** Non-object values are coerced to objects. See the
	* [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
	* for more details.
	*
	* @static
	* @since 0.1.0
	* @memberOf _
	* @category Object
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of property names.
	* @example
	*
	* function Foo() {
	*   this.a = 1;
	*   this.b = 2;
	* }
	*
	* Foo.prototype.c = 3;
	*
	* _.keys(new Foo);
	* // => ['a', 'b'] (iteration order is not guaranteed)
	*
	* _.keys('hi');
	* // => ['0', '1']
	*/
	function keys(object) {
		return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
	}
	/**
	* Creates an array of the own enumerable string keyed property values of `object`.
	*
	* **Note:** Non-object values are coerced to objects.
	*
	* @static
	* @since 0.1.0
	* @memberOf _
	* @category Object
	* @param {Object} object The object to query.
	* @returns {Array} Returns the array of property values.
	* @example
	*
	* function Foo() {
	*   this.a = 1;
	*   this.b = 2;
	* }
	*
	* Foo.prototype.c = 3;
	*
	* _.values(new Foo);
	* // => [1, 2] (iteration order is not guaranteed)
	*
	* _.values('hi');
	* // => ['h', 'i']
	*/
	function values(object) {
		return object ? baseValues(object, keys(object)) : [];
	}
	module.exports = includes;
}));
//#endregion
//#region node_modules/lodash.isboolean/index.js
var require_lodash_isboolean = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* lodash 3.0.3 (Custom Build) <https://lodash.com/>
	* Build: `lodash modularize exports="npm" -o ./`
	* Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
	* Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	* Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	* Available under MIT license <https://lodash.com/license>
	*/
	/** `Object#toString` result references. */
	var boolTag = "[object Boolean]";
	/**
	* Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var objectToString = Object.prototype.toString;
	/**
	* Checks if `value` is classified as a boolean primitive or object.
	*
	* @static
	* @memberOf _
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
	* @example
	*
	* _.isBoolean(false);
	* // => true
	*
	* _.isBoolean(null);
	* // => false
	*/
	function isBoolean(value) {
		return value === true || value === false || isObjectLike(value) && objectToString.call(value) == boolTag;
	}
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return !!value && typeof value == "object";
	}
	module.exports = isBoolean;
}));
//#endregion
//#region node_modules/lodash.isinteger/index.js
var require_lodash_isinteger = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* lodash (Custom Build) <https://lodash.com/>
	* Build: `lodash modularize exports="npm" -o ./`
	* Copyright jQuery Foundation and other contributors <https://jquery.org/>
	* Released under MIT license <https://lodash.com/license>
	* Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	* Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	*/
	/** Used as references for various `Number` constants. */
	var INFINITY = Infinity;
	var MAX_INTEGER = 17976931348623157e292;
	var NAN = NaN;
	/** `Object#toString` result references. */
	var symbolTag = "[object Symbol]";
	/** Used to match leading and trailing whitespace. */
	var reTrim = /^\s+|\s+$/g;
	/** Used to detect bad signed hexadecimal string values. */
	var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
	/** Used to detect binary string values. */
	var reIsBinary = /^0b[01]+$/i;
	/** Used to detect octal string values. */
	var reIsOctal = /^0o[0-7]+$/i;
	/** Built-in method references without a dependency on `root`. */
	var freeParseInt = parseInt;
	/**
	* Used to resolve the
	* [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var objectToString = Object.prototype.toString;
	/**
	* Checks if `value` is an integer.
	*
	* **Note:** This method is based on
	* [`Number.isInteger`](https://mdn.io/Number/isInteger).
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an integer, else `false`.
	* @example
	*
	* _.isInteger(3);
	* // => true
	*
	* _.isInteger(Number.MIN_VALUE);
	* // => false
	*
	* _.isInteger(Infinity);
	* // => false
	*
	* _.isInteger('3');
	* // => false
	*/
	function isInteger(value) {
		return typeof value == "number" && value == toInteger(value);
	}
	/**
	* Checks if `value` is the
	* [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	* of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an object, else `false`.
	* @example
	*
	* _.isObject({});
	* // => true
	*
	* _.isObject([1, 2, 3]);
	* // => true
	*
	* _.isObject(_.noop);
	* // => true
	*
	* _.isObject(null);
	* // => false
	*/
	function isObject(value) {
		var type = typeof value;
		return !!value && (type == "object" || type == "function");
	}
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return !!value && typeof value == "object";
	}
	/**
	* Checks if `value` is classified as a `Symbol` primitive or object.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	* @example
	*
	* _.isSymbol(Symbol.iterator);
	* // => true
	*
	* _.isSymbol('abc');
	* // => false
	*/
	function isSymbol(value) {
		return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
	}
	/**
	* Converts `value` to a finite number.
	*
	* @static
	* @memberOf _
	* @since 4.12.0
	* @category Lang
	* @param {*} value The value to convert.
	* @returns {number} Returns the converted number.
	* @example
	*
	* _.toFinite(3.2);
	* // => 3.2
	*
	* _.toFinite(Number.MIN_VALUE);
	* // => 5e-324
	*
	* _.toFinite(Infinity);
	* // => 1.7976931348623157e+308
	*
	* _.toFinite('3.2');
	* // => 3.2
	*/
	function toFinite(value) {
		if (!value) return value === 0 ? value : 0;
		value = toNumber(value);
		if (value === INFINITY || value === -Infinity) return (value < 0 ? -1 : 1) * MAX_INTEGER;
		return value === value ? value : 0;
	}
	/**
	* Converts `value` to an integer.
	*
	* **Note:** This method is loosely based on
	* [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to convert.
	* @returns {number} Returns the converted integer.
	* @example
	*
	* _.toInteger(3.2);
	* // => 3
	*
	* _.toInteger(Number.MIN_VALUE);
	* // => 0
	*
	* _.toInteger(Infinity);
	* // => 1.7976931348623157e+308
	*
	* _.toInteger('3.2');
	* // => 3
	*/
	function toInteger(value) {
		var result = toFinite(value), remainder = result % 1;
		return result === result ? remainder ? result - remainder : result : 0;
	}
	/**
	* Converts `value` to a number.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to process.
	* @returns {number} Returns the number.
	* @example
	*
	* _.toNumber(3.2);
	* // => 3.2
	*
	* _.toNumber(Number.MIN_VALUE);
	* // => 5e-324
	*
	* _.toNumber(Infinity);
	* // => Infinity
	*
	* _.toNumber('3.2');
	* // => 3.2
	*/
	function toNumber(value) {
		if (typeof value == "number") return value;
		if (isSymbol(value)) return NAN;
		if (isObject(value)) {
			var other = typeof value.valueOf == "function" ? value.valueOf() : value;
			value = isObject(other) ? other + "" : other;
		}
		if (typeof value != "string") return value === 0 ? value : +value;
		value = value.replace(reTrim, "");
		var isBinary = reIsBinary.test(value);
		return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
	}
	module.exports = isInteger;
}));
//#endregion
//#region node_modules/lodash.isnumber/index.js
var require_lodash_isnumber = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* lodash 3.0.3 (Custom Build) <https://lodash.com/>
	* Build: `lodash modularize exports="npm" -o ./`
	* Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
	* Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	* Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	* Available under MIT license <https://lodash.com/license>
	*/
	/** `Object#toString` result references. */
	var numberTag = "[object Number]";
	/**
	* Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var objectToString = Object.prototype.toString;
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return !!value && typeof value == "object";
	}
	/**
	* Checks if `value` is classified as a `Number` primitive or object.
	*
	* **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are classified
	* as numbers, use the `_.isFinite` method.
	*
	* @static
	* @memberOf _
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
	* @example
	*
	* _.isNumber(3);
	* // => true
	*
	* _.isNumber(Number.MIN_VALUE);
	* // => true
	*
	* _.isNumber(Infinity);
	* // => true
	*
	* _.isNumber('3');
	* // => false
	*/
	function isNumber(value) {
		return typeof value == "number" || isObjectLike(value) && objectToString.call(value) == numberTag;
	}
	module.exports = isNumber;
}));
//#endregion
//#region node_modules/lodash.isplainobject/index.js
var require_lodash_isplainobject = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* lodash (Custom Build) <https://lodash.com/>
	* Build: `lodash modularize exports="npm" -o ./`
	* Copyright jQuery Foundation and other contributors <https://jquery.org/>
	* Released under MIT license <https://lodash.com/license>
	* Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	* Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	*/
	/** `Object#toString` result references. */
	var objectTag = "[object Object]";
	/**
	* Checks if `value` is a host object in IE < 9.
	*
	* @private
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a host object, else `false`.
	*/
	function isHostObject(value) {
		var result = false;
		if (value != null && typeof value.toString != "function") try {
			result = !!(value + "");
		} catch (e) {}
		return result;
	}
	/**
	* Creates a unary function that invokes `func` with its argument transformed.
	*
	* @private
	* @param {Function} func The function to wrap.
	* @param {Function} transform The argument transform.
	* @returns {Function} Returns the new function.
	*/
	function overArg(func, transform) {
		return function(arg) {
			return func(transform(arg));
		};
	}
	/** Used for built-in method references. */
	var funcProto = Function.prototype;
	var objectProto = Object.prototype;
	/** Used to resolve the decompiled source of functions. */
	var funcToString = funcProto.toString;
	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;
	/** Used to infer the `Object` constructor. */
	var objectCtorString = funcToString.call(Object);
	/**
	* Used to resolve the
	* [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var objectToString = objectProto.toString;
	/** Built-in value references. */
	var getPrototype = overArg(Object.getPrototypeOf, Object);
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return !!value && typeof value == "object";
	}
	/**
	* Checks if `value` is a plain object, that is, an object created by the
	* `Object` constructor or one with a `[[Prototype]]` of `null`.
	*
	* @static
	* @memberOf _
	* @since 0.8.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
	* @example
	*
	* function Foo() {
	*   this.a = 1;
	* }
	*
	* _.isPlainObject(new Foo);
	* // => false
	*
	* _.isPlainObject([1, 2, 3]);
	* // => false
	*
	* _.isPlainObject({ 'x': 0, 'y': 0 });
	* // => true
	*
	* _.isPlainObject(Object.create(null));
	* // => true
	*/
	function isPlainObject(value) {
		if (!isObjectLike(value) || objectToString.call(value) != objectTag || isHostObject(value)) return false;
		var proto = getPrototype(value);
		if (proto === null) return true;
		var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
		return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
	}
	module.exports = isPlainObject;
}));
//#endregion
//#region node_modules/lodash.isstring/index.js
var require_lodash_isstring = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* lodash 4.0.1 (Custom Build) <https://lodash.com/>
	* Build: `lodash modularize exports="npm" -o ./`
	* Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
	* Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	* Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	* Available under MIT license <https://lodash.com/license>
	*/
	/** `Object#toString` result references. */
	var stringTag = "[object String]";
	/**
	* Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var objectToString = Object.prototype.toString;
	/**
	* Checks if `value` is classified as an `Array` object.
	*
	* @static
	* @memberOf _
	* @type Function
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
	* @example
	*
	* _.isArray([1, 2, 3]);
	* // => true
	*
	* _.isArray(document.body.children);
	* // => false
	*
	* _.isArray('abc');
	* // => false
	*
	* _.isArray(_.noop);
	* // => false
	*/
	var isArray = Array.isArray;
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return !!value && typeof value == "object";
	}
	/**
	* Checks if `value` is classified as a `String` primitive or object.
	*
	* @static
	* @memberOf _
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
	* @example
	*
	* _.isString('abc');
	* // => true
	*
	* _.isString(1);
	* // => false
	*/
	function isString(value) {
		return typeof value == "string" || !isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag;
	}
	module.exports = isString;
}));
//#endregion
//#region node_modules/lodash.once/index.js
var require_lodash_once = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* lodash (Custom Build) <https://lodash.com/>
	* Build: `lodash modularize exports="npm" -o ./`
	* Copyright jQuery Foundation and other contributors <https://jquery.org/>
	* Released under MIT license <https://lodash.com/license>
	* Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	* Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	*/
	/** Used as the `TypeError` message for "Functions" methods. */
	var FUNC_ERROR_TEXT = "Expected a function";
	/** Used as references for various `Number` constants. */
	var INFINITY = Infinity;
	var MAX_INTEGER = 17976931348623157e292;
	var NAN = NaN;
	/** `Object#toString` result references. */
	var symbolTag = "[object Symbol]";
	/** Used to match leading and trailing whitespace. */
	var reTrim = /^\s+|\s+$/g;
	/** Used to detect bad signed hexadecimal string values. */
	var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
	/** Used to detect binary string values. */
	var reIsBinary = /^0b[01]+$/i;
	/** Used to detect octal string values. */
	var reIsOctal = /^0o[0-7]+$/i;
	/** Built-in method references without a dependency on `root`. */
	var freeParseInt = parseInt;
	/**
	* Used to resolve the
	* [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var objectToString = Object.prototype.toString;
	/**
	* Creates a function that invokes `func`, with the `this` binding and arguments
	* of the created function, while it's called less than `n` times. Subsequent
	* calls to the created function return the result of the last `func` invocation.
	*
	* @static
	* @memberOf _
	* @since 3.0.0
	* @category Function
	* @param {number} n The number of calls at which `func` is no longer invoked.
	* @param {Function} func The function to restrict.
	* @returns {Function} Returns the new restricted function.
	* @example
	*
	* jQuery(element).on('click', _.before(5, addContactToList));
	* // => Allows adding up to 4 contacts to the list.
	*/
	function before(n, func) {
		var result;
		if (typeof func != "function") throw new TypeError(FUNC_ERROR_TEXT);
		n = toInteger(n);
		return function() {
			if (--n > 0) result = func.apply(this, arguments);
			if (n <= 1) func = void 0;
			return result;
		};
	}
	/**
	* Creates a function that is restricted to invoking `func` once. Repeat calls
	* to the function return the value of the first invocation. The `func` is
	* invoked with the `this` binding and arguments of the created function.
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Function
	* @param {Function} func The function to restrict.
	* @returns {Function} Returns the new restricted function.
	* @example
	*
	* var initialize = _.once(createApplication);
	* initialize();
	* initialize();
	* // => `createApplication` is invoked once
	*/
	function once(func) {
		return before(2, func);
	}
	/**
	* Checks if `value` is the
	* [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	* of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	*
	* @static
	* @memberOf _
	* @since 0.1.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is an object, else `false`.
	* @example
	*
	* _.isObject({});
	* // => true
	*
	* _.isObject([1, 2, 3]);
	* // => true
	*
	* _.isObject(_.noop);
	* // => true
	*
	* _.isObject(null);
	* // => false
	*/
	function isObject(value) {
		var type = typeof value;
		return !!value && (type == "object" || type == "function");
	}
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return !!value && typeof value == "object";
	}
	/**
	* Checks if `value` is classified as a `Symbol` primitive or object.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	* @example
	*
	* _.isSymbol(Symbol.iterator);
	* // => true
	*
	* _.isSymbol('abc');
	* // => false
	*/
	function isSymbol(value) {
		return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
	}
	/**
	* Converts `value` to a finite number.
	*
	* @static
	* @memberOf _
	* @since 4.12.0
	* @category Lang
	* @param {*} value The value to convert.
	* @returns {number} Returns the converted number.
	* @example
	*
	* _.toFinite(3.2);
	* // => 3.2
	*
	* _.toFinite(Number.MIN_VALUE);
	* // => 5e-324
	*
	* _.toFinite(Infinity);
	* // => 1.7976931348623157e+308
	*
	* _.toFinite('3.2');
	* // => 3.2
	*/
	function toFinite(value) {
		if (!value) return value === 0 ? value : 0;
		value = toNumber(value);
		if (value === INFINITY || value === -Infinity) return (value < 0 ? -1 : 1) * MAX_INTEGER;
		return value === value ? value : 0;
	}
	/**
	* Converts `value` to an integer.
	*
	* **Note:** This method is loosely based on
	* [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to convert.
	* @returns {number} Returns the converted integer.
	* @example
	*
	* _.toInteger(3.2);
	* // => 3
	*
	* _.toInteger(Number.MIN_VALUE);
	* // => 0
	*
	* _.toInteger(Infinity);
	* // => 1.7976931348623157e+308
	*
	* _.toInteger('3.2');
	* // => 3
	*/
	function toInteger(value) {
		var result = toFinite(value), remainder = result % 1;
		return result === result ? remainder ? result - remainder : result : 0;
	}
	/**
	* Converts `value` to a number.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to process.
	* @returns {number} Returns the number.
	* @example
	*
	* _.toNumber(3.2);
	* // => 3.2
	*
	* _.toNumber(Number.MIN_VALUE);
	* // => 5e-324
	*
	* _.toNumber(Infinity);
	* // => Infinity
	*
	* _.toNumber('3.2');
	* // => 3.2
	*/
	function toNumber(value) {
		if (typeof value == "number") return value;
		if (isSymbol(value)) return NAN;
		if (isObject(value)) {
			var other = typeof value.valueOf == "function" ? value.valueOf() : value;
			value = isObject(other) ? other + "" : other;
		}
		if (typeof value != "string") return value === 0 ? value : +value;
		value = value.replace(reTrim, "");
		var isBinary = reIsBinary.test(value);
		return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
	}
	module.exports = once;
}));
//#endregion
//#region node_modules/jsonwebtoken/sign.js
var require_sign = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var timespan = require_timespan();
	var PS_SUPPORTED = require_psSupported();
	var validateAsymmetricKey = require_validateAsymmetricKey();
	var jws = require_jws();
	var includes = require_lodash_includes();
	var isBoolean = require_lodash_isboolean();
	var isInteger = require_lodash_isinteger();
	var isNumber = require_lodash_isnumber();
	var isPlainObject = require_lodash_isplainobject();
	var isString = require_lodash_isstring();
	var once = require_lodash_once();
	var { KeyObject, createSecretKey, createPrivateKey } = __require("crypto");
	var SUPPORTED_ALGS = [
		"RS256",
		"RS384",
		"RS512",
		"ES256",
		"ES384",
		"ES512",
		"HS256",
		"HS384",
		"HS512",
		"none"
	];
	if (PS_SUPPORTED) SUPPORTED_ALGS.splice(3, 0, "PS256", "PS384", "PS512");
	var sign_options_schema = {
		expiresIn: {
			isValid: function(value) {
				return isInteger(value) || isString(value) && value;
			},
			message: "\"expiresIn\" should be a number of seconds or string representing a timespan"
		},
		notBefore: {
			isValid: function(value) {
				return isInteger(value) || isString(value) && value;
			},
			message: "\"notBefore\" should be a number of seconds or string representing a timespan"
		},
		audience: {
			isValid: function(value) {
				return isString(value) || Array.isArray(value);
			},
			message: "\"audience\" must be a string or array"
		},
		algorithm: {
			isValid: includes.bind(null, SUPPORTED_ALGS),
			message: "\"algorithm\" must be a valid string enum value"
		},
		header: {
			isValid: isPlainObject,
			message: "\"header\" must be an object"
		},
		encoding: {
			isValid: isString,
			message: "\"encoding\" must be a string"
		},
		issuer: {
			isValid: isString,
			message: "\"issuer\" must be a string"
		},
		subject: {
			isValid: isString,
			message: "\"subject\" must be a string"
		},
		jwtid: {
			isValid: isString,
			message: "\"jwtid\" must be a string"
		},
		noTimestamp: {
			isValid: isBoolean,
			message: "\"noTimestamp\" must be a boolean"
		},
		keyid: {
			isValid: isString,
			message: "\"keyid\" must be a string"
		},
		mutatePayload: {
			isValid: isBoolean,
			message: "\"mutatePayload\" must be a boolean"
		},
		allowInsecureKeySizes: {
			isValid: isBoolean,
			message: "\"allowInsecureKeySizes\" must be a boolean"
		},
		allowInvalidAsymmetricKeyTypes: {
			isValid: isBoolean,
			message: "\"allowInvalidAsymmetricKeyTypes\" must be a boolean"
		}
	};
	var registered_claims_schema = {
		iat: {
			isValid: isNumber,
			message: "\"iat\" should be a number of seconds"
		},
		exp: {
			isValid: isNumber,
			message: "\"exp\" should be a number of seconds"
		},
		nbf: {
			isValid: isNumber,
			message: "\"nbf\" should be a number of seconds"
		}
	};
	function validate(schema, allowUnknown, object, parameterName) {
		if (!isPlainObject(object)) throw new Error("Expected \"" + parameterName + "\" to be a plain object.");
		Object.keys(object).forEach(function(key) {
			const validator = schema[key];
			if (!validator) {
				if (!allowUnknown) throw new Error("\"" + key + "\" is not allowed in \"" + parameterName + "\"");
				return;
			}
			if (!validator.isValid(object[key])) throw new Error(validator.message);
		});
	}
	function validateOptions(options) {
		return validate(sign_options_schema, false, options, "options");
	}
	function validatePayload(payload) {
		return validate(registered_claims_schema, true, payload, "payload");
	}
	var options_to_payload = {
		"audience": "aud",
		"issuer": "iss",
		"subject": "sub",
		"jwtid": "jti"
	};
	var options_for_objects = [
		"expiresIn",
		"notBefore",
		"noTimestamp",
		"audience",
		"issuer",
		"subject",
		"jwtid"
	];
	module.exports = function(payload, secretOrPrivateKey, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = {};
		} else options = options || {};
		const isObjectPayload = typeof payload === "object" && !Buffer.isBuffer(payload);
		const header = Object.assign({
			alg: options.algorithm || "HS256",
			typ: isObjectPayload ? "JWT" : void 0,
			kid: options.keyid
		}, options.header);
		function failure(err) {
			if (callback) return callback(err);
			throw err;
		}
		if (!secretOrPrivateKey && options.algorithm !== "none") return failure(/* @__PURE__ */ new Error("secretOrPrivateKey must have a value"));
		if (secretOrPrivateKey != null && !(secretOrPrivateKey instanceof KeyObject)) try {
			secretOrPrivateKey = createPrivateKey(secretOrPrivateKey);
		} catch (_) {
			try {
				secretOrPrivateKey = createSecretKey(typeof secretOrPrivateKey === "string" ? Buffer.from(secretOrPrivateKey) : secretOrPrivateKey);
			} catch (_) {
				return failure(/* @__PURE__ */ new Error("secretOrPrivateKey is not valid key material"));
			}
		}
		if (header.alg.startsWith("HS") && secretOrPrivateKey.type !== "secret") return failure(/* @__PURE__ */ new Error(`secretOrPrivateKey must be a symmetric key when using ${header.alg}`));
		else if (/^(?:RS|PS|ES)/.test(header.alg)) {
			if (secretOrPrivateKey.type !== "private") return failure(/* @__PURE__ */ new Error(`secretOrPrivateKey must be an asymmetric key when using ${header.alg}`));
			if (!options.allowInsecureKeySizes && !header.alg.startsWith("ES") && secretOrPrivateKey.asymmetricKeyDetails !== void 0 && secretOrPrivateKey.asymmetricKeyDetails.modulusLength < 2048) return failure(/* @__PURE__ */ new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
		}
		if (typeof payload === "undefined") return failure(/* @__PURE__ */ new Error("payload is required"));
		else if (isObjectPayload) {
			try {
				validatePayload(payload);
			} catch (error) {
				return failure(error);
			}
			if (!options.mutatePayload) payload = Object.assign({}, payload);
		} else {
			const invalid_options = options_for_objects.filter(function(opt) {
				return typeof options[opt] !== "undefined";
			});
			if (invalid_options.length > 0) return failure(/* @__PURE__ */ new Error("invalid " + invalid_options.join(",") + " option for " + typeof payload + " payload"));
		}
		if (typeof payload.exp !== "undefined" && typeof options.expiresIn !== "undefined") return failure(/* @__PURE__ */ new Error("Bad \"options.expiresIn\" option the payload already has an \"exp\" property."));
		if (typeof payload.nbf !== "undefined" && typeof options.notBefore !== "undefined") return failure(/* @__PURE__ */ new Error("Bad \"options.notBefore\" option the payload already has an \"nbf\" property."));
		try {
			validateOptions(options);
		} catch (error) {
			return failure(error);
		}
		if (!options.allowInvalidAsymmetricKeyTypes) try {
			validateAsymmetricKey(header.alg, secretOrPrivateKey);
		} catch (error) {
			return failure(error);
		}
		const timestamp = payload.iat || Math.floor(Date.now() / 1e3);
		if (options.noTimestamp) delete payload.iat;
		else if (isObjectPayload) payload.iat = timestamp;
		if (typeof options.notBefore !== "undefined") {
			try {
				payload.nbf = timespan(options.notBefore, timestamp);
			} catch (err) {
				return failure(err);
			}
			if (typeof payload.nbf === "undefined") return failure(/* @__PURE__ */ new Error("\"notBefore\" should be a number of seconds or string representing a timespan eg: \"1d\", \"20h\", 60"));
		}
		if (typeof options.expiresIn !== "undefined" && typeof payload === "object") {
			try {
				payload.exp = timespan(options.expiresIn, timestamp);
			} catch (err) {
				return failure(err);
			}
			if (typeof payload.exp === "undefined") return failure(/* @__PURE__ */ new Error("\"expiresIn\" should be a number of seconds or string representing a timespan eg: \"1d\", \"20h\", 60"));
		}
		Object.keys(options_to_payload).forEach(function(key) {
			const claim = options_to_payload[key];
			if (typeof options[key] !== "undefined") {
				if (typeof payload[claim] !== "undefined") return failure(/* @__PURE__ */ new Error("Bad \"options." + key + "\" option. The payload already has an \"" + claim + "\" property."));
				payload[claim] = options[key];
			}
		});
		const encoding = options.encoding || "utf8";
		if (typeof callback === "function") {
			callback = callback && once(callback);
			jws.createSign({
				header,
				privateKey: secretOrPrivateKey,
				payload,
				encoding
			}).once("error", callback).once("done", function(signature) {
				if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) return callback(/* @__PURE__ */ new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
				callback(null, signature);
			});
		} else {
			let signature = jws.sign({
				header,
				payload,
				secret: secretOrPrivateKey,
				encoding
			});
			if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) throw new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`);
			return signature;
		}
	};
}));
//#endregion
//#region node_modules/jsonwebtoken/index.js
var require_jsonwebtoken = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		decode: require_decode(),
		verify: require_verify(),
		sign: require_sign(),
		JsonWebTokenError: require_JsonWebTokenError(),
		NotBeforeError: require_NotBeforeError(),
		TokenExpiredError: require_TokenExpiredError()
	};
}));
//#endregion
//#region node_modules/@azure/msal-node/lib/msal-node.cjs
/*! @azure/msal-node v5.5.0 2026-08-04 */
var require_msal_node = /* @__PURE__ */ __commonJSMin(((exports) => {
	var node_crypto = __require("node:crypto");
	var crypto = __require("crypto");
	var jwt = require_jsonwebtoken();
	var http = __require("http");
	var fs = __require("fs");
	var path = __require("path");
	/**
	* This class serializes cache entities to be saved into in-memory object types defined internally
	* @internal
	*/
	var Serializer = class {
		/**
		* serialize the JSON blob
		* @param data - JSON blob cache
		*/
		static serializeJSONBlob(data) {
			return JSON.stringify(data);
		}
		/**
		* Serialize Accounts
		* @param accCache - cache of accounts
		*/
		static serializeAccounts(accCache) {
			const accounts = {};
			Object.keys(accCache).map(function(key) {
				const accountEntity = accCache[key];
				accounts[key] = {
					home_account_id: accountEntity.homeAccountId,
					environment: accountEntity.environment,
					realm: accountEntity.realm,
					local_account_id: accountEntity.localAccountId,
					username: accountEntity.username,
					authority_type: accountEntity.authorityType,
					name: accountEntity.name,
					client_info: accountEntity.clientInfo,
					last_modification_time: accountEntity.lastModificationTime,
					last_modification_app: accountEntity.lastModificationApp,
					tenantProfiles: accountEntity.tenantProfiles?.map((tenantProfile) => {
						return JSON.stringify(tenantProfile);
					})
				};
			});
			return accounts;
		}
		/**
		* Serialize IdTokens
		* @param idTCache - cache of ID tokens
		*/
		static serializeIdTokens(idTCache) {
			const idTokens = {};
			Object.keys(idTCache).map(function(key) {
				const idTEntity = idTCache[key];
				idTokens[key] = {
					home_account_id: idTEntity.homeAccountId,
					environment: idTEntity.environment,
					credential_type: idTEntity.credentialType,
					client_id: idTEntity.clientId,
					secret: idTEntity.secret,
					realm: idTEntity.realm
				};
			});
			return idTokens;
		}
		/**
		* Serializes AccessTokens
		* @param atCache - cache of access tokens
		*/
		static serializeAccessTokens(atCache) {
			const accessTokens = {};
			Object.keys(atCache).map(function(key) {
				const atEntity = atCache[key];
				accessTokens[key] = {
					home_account_id: atEntity.homeAccountId,
					environment: atEntity.environment,
					credential_type: atEntity.credentialType,
					client_id: atEntity.clientId,
					secret: atEntity.secret,
					realm: atEntity.realm,
					target: atEntity.target,
					cached_at: atEntity.cachedAt,
					expires_on: atEntity.expiresOn,
					extended_expires_on: atEntity.extendedExpiresOn,
					refresh_on: atEntity.refreshOn,
					key_id: atEntity.keyId,
					token_type: atEntity.tokenType,
					userAssertionHash: atEntity.userAssertionHash,
					resource: atEntity.resource,
					additionalCacheKeyComponents: atEntity.additionalCacheKeyComponents
				};
			});
			return accessTokens;
		}
		/**
		* Serialize refreshTokens
		* @param rtCache - cache of refresh tokens
		*/
		static serializeRefreshTokens(rtCache) {
			const refreshTokens = {};
			Object.keys(rtCache).map(function(key) {
				const rtEntity = rtCache[key];
				refreshTokens[key] = {
					home_account_id: rtEntity.homeAccountId,
					environment: rtEntity.environment,
					credential_type: rtEntity.credentialType,
					client_id: rtEntity.clientId,
					secret: rtEntity.secret,
					family_id: rtEntity.familyId,
					target: rtEntity.target,
					realm: rtEntity.realm
				};
			});
			return refreshTokens;
		}
		/**
		* Serialize amdtCache
		* @param amdtCache - cache of app metadata
		*/
		static serializeAppMetadata(amdtCache) {
			const appMetadata = {};
			Object.keys(amdtCache).map(function(key) {
				const amdtEntity = amdtCache[key];
				appMetadata[key] = {
					client_id: amdtEntity.clientId,
					environment: amdtEntity.environment,
					family_id: amdtEntity.familyId
				};
			});
			return appMetadata;
		}
		/**
		* Serialize the cache
		* @param inMemCache - itemised cache read from the JSON
		*/
		static serializeAllCache(inMemCache) {
			return {
				Account: this.serializeAccounts(inMemCache.accounts),
				IdToken: this.serializeIdTokens(inMemCache.idTokens),
				AccessToken: this.serializeAccessTokens(inMemCache.accessTokens),
				RefreshToken: this.serializeRefreshTokens(inMemCache.refreshTokens),
				AppMetadata: this.serializeAppMetadata(inMemCache.appMetadata)
			};
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var CLIENT_ID = "client_id";
	var REDIRECT_URI = "redirect_uri";
	var RESPONSE_TYPE = "response_type";
	var RESPONSE_MODE = "response_mode";
	var GRANT_TYPE = "grant_type";
	var CLAIMS = "claims";
	var SCOPE = "scope";
	var REFRESH_TOKEN = "refresh_token";
	var STATE = "state";
	var NONCE = "nonce";
	var PROMPT = "prompt";
	var CODE = "code";
	var CODE_CHALLENGE = "code_challenge";
	var CODE_CHALLENGE_METHOD = "code_challenge_method";
	var CODE_VERIFIER = "code_verifier";
	var CLIENT_REQUEST_ID = "client-request-id";
	var X_CLIENT_SKU = "x-client-SKU";
	var X_CLIENT_VER = "x-client-VER";
	var X_CLIENT_OS = "x-client-OS";
	var X_CLIENT_CPU = "x-client-CPU";
	var X_CLIENT_CURR_TELEM = "x-client-current-telemetry";
	var X_CLIENT_LAST_TELEM = "x-client-last-telemetry";
	var X_MS_LIB_CAPABILITY = "x-ms-lib-capability";
	var X_APP_NAME = "x-app-name";
	var X_APP_VER = "x-app-ver";
	var POST_LOGOUT_URI = "post_logout_redirect_uri";
	var ID_TOKEN_HINT = "id_token_hint";
	var DEVICE_CODE = "device_code";
	var CLIENT_SECRET = "client_secret";
	var CLIENT_ASSERTION = "client_assertion";
	var CLIENT_ASSERTION_TYPE = "client_assertion_type";
	var TOKEN_TYPE = "token_type";
	var REQ_CNF = "req_cnf";
	var OBO_ASSERTION = "assertion";
	var REQUESTED_TOKEN_USE = "requested_token_use";
	var ON_BEHALF_OF = "on_behalf_of";
	var RETURN_SPA_CODE = "return_spa_code";
	var LOGOUT_HINT = "logout_hint";
	var SID = "sid";
	var LOGIN_HINT = "login_hint";
	var DOMAIN_HINT = "domain_hint";
	var X_CLIENT_EXTRA_SKU = "x-client-xtra-sku";
	var BROKER_CLIENT_ID = "brk_client_id";
	var BROKER_REDIRECT_URI = "brk_redirect_uri";
	var INSTANCE_AWARE = "instance_aware";
	var RESOURCE = "resource";
	var CLI_DATA = "clidata";
	var USER_FEDERATED_IDENTITY_CREDENTIAL = "user_federated_identity_credential";
	var USERNAME = "username";
	var USER_ID = "user_id";
	var FMI_PATH = "fmi_path";
	var ATTRIBUTE_TOKENS = "attribute_tokens";
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var SKU = "msal.js.common";
	var DEFAULT_AUTHORITY = "https://login.microsoftonline.com/common/";
	var DEFAULT_AUTHORITY_HOST = "login.microsoftonline.com";
	var DEFAULT_COMMON_TENANT = "common";
	var ADFS = "adfs";
	var DSTS = "dstsv2";
	var AAD_INSTANCE_DISCOVERY_ENDPT = `${DEFAULT_AUTHORITY}discovery/instance?api-version=1.1&authorization_endpoint=`;
	var CIAM_AUTH_URL = ".ciamlogin.com";
	var AAD_TENANT_DOMAIN_SUFFIX = ".onmicrosoft.com";
	var RESOURCE_DELIM = "|";
	var OPENID_SCOPE = "openid";
	var PROFILE_SCOPE = "profile";
	var OFFLINE_ACCESS_SCOPE = "offline_access";
	var EMAIL_SCOPE = "email";
	var URL_FORM_CONTENT_TYPE = "application/x-www-form-urlencoded;charset=utf-8";
	var AUTHORIZATION_PENDING = "authorization_pending";
	var NOT_APPLICABLE = "N/A";
	var NOT_AVAILABLE = "Not Available";
	var FORWARD_SLASH = "/";
	var IMDS_ENDPOINT = "http://169.254.169.254/metadata/instance/compute";
	var IMDS_VERSION = "2021-02-01";
	var IMDS_TIMEOUT = 2e3;
	var AZURE_REGION_AUTO_DISCOVER_FLAG = "TryAutoDetect";
	var REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX = "login.microsoft.com";
	var KNOWN_PUBLIC_CLOUDS = [
		"login.microsoftonline.com",
		"login.windows.net",
		"login.microsoft.com",
		"sts.windows.net"
	];
	var INVALID_INSTANCE = "invalid_instance";
	var HTTP_SUCCESS = 200;
	var HTTP_REDIRECT = 302;
	var HTTP_CLIENT_ERROR_RANGE_START = 400;
	var HTTP_BAD_REQUEST = 400;
	var HTTP_UNAUTHORIZED = 401;
	var HTTP_NOT_FOUND = 404;
	var HTTP_REQUEST_TIMEOUT = 408;
	var HTTP_GONE = 410;
	var HTTP_TOO_MANY_REQUESTS = 429;
	var HTTP_CLIENT_ERROR_RANGE_END = 499;
	var HTTP_SERVER_ERROR = 500;
	var HTTP_SERVER_ERROR_RANGE_START = 500;
	var HTTP_SERVICE_UNAVAILABLE = 503;
	var HTTP_GATEWAY_TIMEOUT = 504;
	var HTTP_SERVER_ERROR_RANGE_END = 599;
	var OIDC_DEFAULT_SCOPES = [
		OPENID_SCOPE,
		PROFILE_SCOPE,
		OFFLINE_ACCESS_SCOPE
	];
	var OIDC_SCOPES = [...OIDC_DEFAULT_SCOPES, EMAIL_SCOPE];
	/**
	* Request header names
	*/
	var HeaderNames = {
		CONTENT_TYPE: "Content-Type",
		CONTENT_LENGTH: "Content-Length",
		RETRY_AFTER: "Retry-After",
		CCS_HEADER: "X-AnchorMailbox",
		WWWAuthenticate: "WWW-Authenticate",
		AuthenticationInfo: "Authentication-Info",
		X_MS_REQUEST_ID: "x-ms-request-id",
		X_MS_HTTP_VERSION: "x-ms-httpver"
	};
	/**
	* String constants related to AAD Authority
	*/
	var AADAuthority = {
		COMMON: "common",
		ORGANIZATIONS: "organizations",
		CONSUMERS: "consumers"
	};
	/**
	* Claims request keys
	*/
	var ClaimsRequestKeys = {
		ACCESS_TOKEN: "access_token",
		XMS_CC: "xms_cc",
		ID_TOKEN: "id_token",
		SIGNIN_STATE: "signin_state",
		LOGIN_HINT: "login_hint"
	};
	/**
	* we considered making this "enum" in the request instead of string, however it looks like the allowed list of
	* prompt values kept changing over past couple of years. There are some undocumented prompt values for some
	* internal partners too, hence the choice of generic "string" type instead of the "enum"
	*/
	var PromptValue$1 = {
		LOGIN: "login",
		SELECT_ACCOUNT: "select_account",
		CONSENT: "consent",
		NONE: "none",
		CREATE: "create",
		NO_SESSION: "no_session"
	};
	/**
	* allowed values for codeVerifier
	*/
	var CodeChallengeMethodValues = {
		PLAIN: "plain",
		S256: "S256"
	};
	/**
	* Allowed values for response_type
	*/
	var OAuthResponseType = {
		CODE: "code",
		IDTOKEN_TOKEN: "id_token token"
	};
	/**
	* allowed values for response_mode
	*/
	var ResponseMode$1 = {
		QUERY: "query",
		FRAGMENT: "fragment",
		FORM_POST: "form_post"
	};
	/**
	* allowed grant_type
	*/
	var GrantType = {
		AUTHORIZATION_CODE_GRANT: "authorization_code",
		CLIENT_CREDENTIALS_GRANT: "client_credentials",
		RESOURCE_OWNER_PASSWORD_GRANT: "password",
		REFRESH_TOKEN_GRANT: "refresh_token",
		DEVICE_CODE_GRANT: "device_code",
		JWT_BEARER: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		USER_FIC: "user_fic"
	};
	/**
	* Account types in Cache
	*/
	var CACHE_ACCOUNT_TYPE_MSSTS = "MSSTS";
	var CACHE_ACCOUNT_TYPE_ADFS = "ADFS";
	var CACHE_ACCOUNT_TYPE_GENERIC = "Generic";
	/**
	* Separators used in cache
	*/
	var CACHE_KEY_SEPARATOR = "-";
	var CLIENT_INFO_SEPARATOR = ".";
	/**
	* Credential Type stored in the cache
	*/
	var CredentialType = {
		ID_TOKEN: "IdToken",
		ACCESS_TOKEN: "AccessToken",
		ACCESS_TOKEN_WITH_AUTH_SCHEME: "AccessToken_With_AuthScheme",
		REFRESH_TOKEN: "RefreshToken"
	};
	/**
	* More Cache related constants
	*/
	var APP_METADATA = "appmetadata";
	var CLIENT_INFO = "client_info";
	var THE_FAMILY_ID = "1";
	var AUTHORITY_METADATA_CACHE_KEY = "authority-metadata";
	var AUTHORITY_METADATA_REFRESH_TIME_SECONDS = 86400;
	var AuthorityMetadataSource = {
		CONFIG: "config",
		CACHE: "cache",
		NETWORK: "network",
		HARDCODED_VALUES: "hardcoded_values"
	};
	var SERVER_TELEM_SCHEMA_VERSION = 5;
	var SERVER_TELEM_MAX_LAST_HEADER_BYTES = 330;
	var SERVER_TELEM_MAX_CACHED_ERRORS = 50;
	var SERVER_TELEM_CACHE_KEY = "server-telemetry";
	var SERVER_TELEM_CATEGORY_SEPARATOR = "|";
	var SERVER_TELEM_VALUE_SEPARATOR = ",";
	var SERVER_TELEM_OVERFLOW_TRUE = "1";
	var SERVER_TELEM_OVERFLOW_FALSE = "0";
	var SERVER_TELEM_UNKNOWN_ERROR = "unknown_error";
	/**
	* Type of the authentication request
	*/
	var AuthenticationScheme = {
		BEARER: "Bearer",
		POP: "pop",
		SSH: "ssh-cert"
	};
	/**
	* Constants related to throttling
	*/
	var DEFAULT_THROTTLE_TIME_SECONDS = 60;
	var DEFAULT_MAX_THROTTLE_TIME_SECONDS = 3600;
	var THROTTLING_PREFIX = "throttling";
	var X_MS_LIB_CAPABILITY_VALUE = "retry-after, h429";
	/**
	* Errors
	*/
	var INVALID_GRANT_ERROR = "invalid_grant";
	var CLIENT_MISMATCH_ERROR = "client_mismatch";
	/**
	* Password grant parameters
	*/
	var PasswordGrantConstants = {
		username: "username",
		password: "password"
	};
	/**
	* Region Discovery Sources
	*/
	var RegionDiscoverySources = {
		FAILED_AUTO_DETECTION: "1",
		INTERNAL_CACHE: "2",
		ENVIRONMENT_VARIABLE: "3",
		IMDS: "4"
	};
	/**
	* Region Discovery Outcomes
	*/
	var RegionDiscoveryOutcomes = {
		CONFIGURED_NO_AUTO_DETECTION: "2",
		AUTO_DETECTION_REQUESTED_SUCCESSFUL: "4",
		AUTO_DETECTION_REQUESTED_FAILED: "5"
	};
	/**
	* Specifies the reason for fetching the access token from the identity provider
	*/
	var CacheOutcome = {
		NOT_APPLICABLE: "0",
		FORCE_REFRESH_OR_CLAIMS: "1",
		NO_CACHED_ACCESS_TOKEN: "2",
		CACHED_ACCESS_TOKEN_EXPIRED: "3",
		PROACTIVELY_REFRESHED: "4"
	};
	var DEFAULT_TOKEN_RENEWAL_OFFSET_SEC = 300;
	var EncodingTypes = {
		BASE64: "base64",
		HEX: "hex",
		UTF8: "utf-8"
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	function getDefaultErrorMessage(code) {
		return `See https://aka.ms/msal.js.errors#${code} for details`;
	}
	/**
	* General error class thrown by the MSAL.js library.
	*/
	var AuthError = class AuthError extends Error {
		constructor(errorCode, correlationId, errorMessage, suberror) {
			const message = errorMessage || (errorCode ? getDefaultErrorMessage(errorCode) : "");
			const errorString = message ? `${errorCode}: ${message}` : errorCode;
			super(errorString);
			Object.setPrototypeOf(this, AuthError.prototype);
			this.errorCode = errorCode || "";
			this.errorMessage = message || "";
			this.subError = suberror || "";
			this.correlationId = correlationId;
			this.name = "AuthError";
		}
	};
	function createAuthError(code, correlationId, additionalMessage) {
		return new AuthError(code, correlationId, additionalMessage || getDefaultErrorMessage(code));
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* ClientAuthErrorMessage class containing string constants used by error codes and messages.
	*/
	/**
	* Error thrown when there is an error in the client code running on the browser.
	*/
	var ClientAuthError = class ClientAuthError extends AuthError {
		constructor(errorCode, correlationId, additionalMessage) {
			super(errorCode, correlationId, additionalMessage);
			this.name = "ClientAuthError";
			Object.setPrototypeOf(this, ClientAuthError.prototype);
		}
	};
	function createClientAuthError(errorCode, correlationId, additionalMessage) {
		return new ClientAuthError(errorCode, correlationId, additionalMessage);
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var clientInfoDecodingError = "client_info_decoding_error";
	var clientInfoEmptyError = "client_info_empty_error";
	var tokenParsingError = "token_parsing_error";
	var nullOrEmptyToken = "null_or_empty_token";
	var endpointResolutionError = "endpoints_resolution_error";
	var networkError = "network_error";
	var openIdConfigError = "openid_config_error";
	var hashNotDeserialized = "hash_not_deserialized";
	var invalidState = "invalid_state";
	var stateMismatch = "state_mismatch";
	var stateNotFound = "state_not_found";
	var nonceMismatch = "nonce_mismatch";
	var multipleMatchingTokens = "multiple_matching_tokens";
	var multipleMatchingAppMetadata = "multiple_matching_appMetadata";
	var requestCannotBeMade = "request_cannot_be_made";
	var cannotRemoveEmptyScope = "cannot_remove_empty_scope";
	var cannotAppendScopeSet = "cannot_append_scopeset";
	var emptyInputScopeSet = "empty_input_scopeset";
	var noAccountInSilentRequest = "no_account_in_silent_request";
	var invalidCacheRecord = "invalid_cache_record";
	var invalidCacheEnvironment = "invalid_cache_environment";
	var noAccountFound = "no_account_found";
	var noCryptoObject = "no_crypto_object";
	var unexpectedCredentialType = "unexpected_credential_type";
	var tokenRefreshRequired = "token_refresh_required";
	var tokenClaimsCnfRequiredForSignedJwt = "token_claims_cnf_required_for_signedjwt";
	var authorizationCodeMissingFromServerResponse = "authorization_code_missing_from_server_response";
	var bindingKeyNotRemoved = "binding_key_not_removed";
	var endSessionEndpointNotSupported = "end_session_endpoint_not_supported";
	var keyIdMissing = "key_id_missing";
	var noNetworkConnectivity = "no_network_connectivity";
	var userCanceled = "user_canceled";
	var methodNotImplemented = "method_not_implemented";
	var nestedAppAuthBridgeDisabled = "nested_app_auth_bridge_disabled";
	var platformBrokerError = "platform_broker_error";
	var resourceParameterRequired = "resource_parameter_required";
	var misplacedResourceParam = "misplaced_resource_parameter";
	var ClientAuthErrorCodes = /*#__PURE__*/ Object.freeze({
		__proto__: null,
		authorizationCodeMissingFromServerResponse,
		bindingKeyNotRemoved,
		cannotAppendScopeSet,
		cannotRemoveEmptyScope,
		clientInfoDecodingError,
		clientInfoEmptyError,
		emptyInputScopeSet,
		endSessionEndpointNotSupported,
		endpointResolutionError,
		hashNotDeserialized,
		invalidCacheEnvironment,
		invalidCacheRecord,
		invalidState,
		keyIdMissing,
		methodNotImplemented,
		misplacedResourceParam,
		multipleMatchingAppMetadata,
		multipleMatchingTokens,
		nestedAppAuthBridgeDisabled,
		networkError,
		noAccountFound,
		noAccountInSilentRequest,
		noCryptoObject,
		noNetworkConnectivity,
		nonceMismatch,
		nullOrEmptyToken,
		openIdConfigError,
		platformBrokerError,
		requestCannotBeMade,
		resourceParameterRequired,
		stateMismatch,
		stateNotFound,
		tokenClaimsCnfRequiredForSignedJwt,
		tokenParsingError,
		tokenRefreshRequired,
		unexpectedCredentialType,
		userCanceled
	});
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Function to build a client info object from server clientInfo string
	* @param rawClientInfo
	* @param crypto
	*/
	function buildClientInfo(rawClientInfo, base64Decode) {
		if (!rawClientInfo) throw createClientAuthError(clientInfoEmptyError, "");
		try {
			const decodedClientInfo = base64Decode(rawClientInfo);
			return JSON.parse(decodedClientInfo);
		} catch (e) {
			throw createClientAuthError(clientInfoDecodingError, "");
		}
	}
	/**
	* Function to build a client info object from cached homeAccountId string
	* @param homeAccountId
	*/
	function buildClientInfoFromHomeAccountId(homeAccountId) {
		if (!homeAccountId) throw createClientAuthError(clientInfoDecodingError, "");
		const clientInfoParts = homeAccountId.split(CLIENT_INFO_SEPARATOR, 2);
		return {
			uid: clientInfoParts[0],
			utid: clientInfoParts.length < 2 ? "" : clientInfoParts[1]
		};
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Extract token by decoding the rawToken
	*
	* @param encodedToken
	*/
	function extractTokenClaims(encodedToken, base64Decode, correlationId) {
		const jswPayload = getJWSPayload(encodedToken, correlationId);
		try {
			const base64Decoded = base64Decode(jswPayload);
			return JSON.parse(base64Decoded);
		} catch (err) {
			throw createClientAuthError(tokenParsingError, correlationId);
		}
	}
	/**
	* Check if the signin_state claim contains "kmsi"
	* @param idTokenClaims
	* @returns
	*/
	function isKmsi(idTokenClaims) {
		if (!idTokenClaims.signin_state) return false;
		/**
		* Signin_state claim known values:
		* dvc_mngd - device is managed
		* dvc_dmjd - device is domain joined
		* kmsi - user opted to "keep me signed in"
		* inknownntwk - Request made inside a known network. Don't use this, use CAE instead.
		*/
		const kmsiClaims = ["kmsi", "dvc_dmjd"];
		return idTokenClaims.signin_state.some((value) => kmsiClaims.includes(value.trim().toLowerCase()));
	}
	/**
	* decode a JWT
	*
	* @param authToken
	*/
	function getJWSPayload(authToken, correlationId) {
		if (!authToken) throw createClientAuthError(nullOrEmptyToken, correlationId);
		const matches = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/.exec(authToken);
		if (!matches || matches.length < 4) throw createClientAuthError(tokenParsingError, correlationId);
		/**
		* const crackedToken = {
		*  header: matches[1],
		*  JWSPayload: matches[2],
		*  JWSSig: matches[3],
		* };
		*/
		return matches[2];
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Returns true if tenantId matches the utid portion of homeAccountId
	* @param tenantId
	* @param homeAccountId
	* @returns
	*/
	function tenantIdMatchesHomeTenant(tenantId, homeAccountId) {
		return !!tenantId && !!homeAccountId && tenantId === homeAccountId.split(".")[1];
	}
	/**
	* Build tenant profile
	* @param homeAccountId - Home account identifier for this account object
	* @param localAccountId - Local account identifer for this account object
	* @param tenantId - Full tenant or organizational id that this account belongs to
	* @param nativeAccountId - Native account identifier for this tenant
	* @param idTokenClaims - Claims from the ID token
	* @returns
	*/
	function buildTenantProfile(homeAccountId, localAccountId, tenantId, nativeAccountId, idTokenClaims) {
		if (idTokenClaims) {
			const { oid, sub, tid, name, tfp, acr, preferred_username, upn, login_hint } = idTokenClaims;
			/**
			* Since there is no way to determine if the authority is AAD or B2C, we exhaust all the possible claims that can serve as tenant ID with the following precedence:
			* tid - TenantID claim that identifies the tenant that issued the token in AAD. Expected in all AAD ID tokens, not present in B2C ID Tokens.
			* tfp - Trust Framework Policy claim that identifies the policy that was used to authenticate the user. Functions as tenant for B2C scenarios.
			* acr - Authentication Context Class Reference claim used only with older B2C policies. Fallback in case tfp is not present, but likely won't be present anyway.
			*/
			const tenantId = tid || tfp || acr || "";
			return {
				tenantId,
				localAccountId: oid || sub || "",
				name,
				username: preferred_username || upn || "",
				loginHint: login_hint,
				isHomeTenant: tenantIdMatchesHomeTenant(tenantId, homeAccountId),
				upn,
				...nativeAccountId && { nativeAccountId }
			};
		} else return {
			tenantId,
			localAccountId,
			username: "",
			isHomeTenant: tenantIdMatchesHomeTenant(tenantId, homeAccountId),
			...nativeAccountId && { nativeAccountId }
		};
	}
	/**
	* Replaces account info that varies by tenant profile sourced from the ID token claims passed in with the tenant-specific account info
	* @param baseAccountInfo
	* @param idTokenClaims
	* @returns
	*/
	function updateAccountTenantProfileData(baseAccountInfo, tenantProfile, idTokenClaims, idTokenSecret) {
		let updatedAccountInfo = baseAccountInfo;
		if (tenantProfile) {
			const { isHomeTenant, ...tenantProfileOverride } = tenantProfile;
			updatedAccountInfo = {
				...baseAccountInfo,
				...tenantProfileOverride
			};
		}
		if (idTokenClaims) {
			const { isHomeTenant, ...claimsSourcedTenantProfile } = buildTenantProfile(baseAccountInfo.homeAccountId, baseAccountInfo.localAccountId, baseAccountInfo.tenantId, updatedAccountInfo.nativeAccountId, idTokenClaims);
			updatedAccountInfo = {
				...updatedAccountInfo,
				...claimsSourcedTenantProfile,
				idTokenClaims,
				idToken: idTokenSecret,
				kmsi: isKmsi(idTokenClaims)
			};
			return updatedAccountInfo;
		}
		return updatedAccountInfo;
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Authority types supported by MSAL.
	*/
	var AuthorityType = {
		Default: 0,
		Adfs: 1,
		Dsts: 2,
		Ciam: 3
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Gets tenantId from available ID token claims to set as credential realm with the following precedence:
	* 1. tid - if the token is acquired from an Azure AD tenant tid will be present
	* 2. tfp - if the token is acquired from a modern B2C tenant tfp should be present
	* 3. acr - if the token is acquired from a legacy B2C tenant acr should be present
	* Downcased to match the realm case-insensitive comparison requirements
	* @param idTokenClaims
	* @returns
	*/
	function getTenantIdFromIdTokenClaims(idTokenClaims) {
		if (idTokenClaims) return idTokenClaims.tid || idTokenClaims.tfp || idTokenClaims.acr || null;
		return null;
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Protocol modes supported by MSAL.
	*/
	var ProtocolMode = {
		/**
		* Auth Code + PKCE with Entra ID (formerly AAD) specific optimizations and features
		*/
		AAD: "AAD",
		/**
		* Auth Code + PKCE without Entra ID specific optimizations and features. For use only with non-Microsoft owned authorities.
		* Support is limited for this mode.
		*/
		OIDC: "OIDC",
		/**
		* Encrypted Authorize Response (EAR) with Entra ID specific optimizations and features
		*/
		EAR: "EAR"
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Returns the AccountInfo interface for this account.
	* @internal
	*/
	function getAccountInfo(accountEntity) {
		const tenantProfiles = accountEntity.tenantProfiles || [];
		if (tenantProfiles.length === 0 && accountEntity.realm && accountEntity.localAccountId) tenantProfiles.push(buildTenantProfile(accountEntity.homeAccountId, accountEntity.localAccountId, accountEntity.realm, accountEntity.nativeAccountId));
		const nativeAccountId = tenantProfiles.find((tp) => tp.tenantId === accountEntity.realm)?.nativeAccountId || accountEntity.nativeAccountId;
		return {
			homeAccountId: accountEntity.homeAccountId,
			environment: accountEntity.environment,
			tenantId: accountEntity.realm,
			username: accountEntity.username,
			localAccountId: accountEntity.localAccountId,
			loginHint: accountEntity.loginHint,
			name: accountEntity.name,
			nativeAccountId,
			authorityType: accountEntity.authorityType,
			tenantProfiles: new Map(tenantProfiles.map((tenantProfile) => {
				return [tenantProfile.tenantId, tenantProfile];
			})),
			dataBoundary: accountEntity.dataBoundary
		};
	}
	/**
	* Build Account cache from IdToken, clientInfo and authority/policy. Associated with AAD.
	* @param accountDetails
	* @internal
	*/
	function createAccountEntity(accountDetails, authority, correlationId, base64Decode) {
		let authorityType;
		if (authority.authorityType === AuthorityType.Adfs) authorityType = CACHE_ACCOUNT_TYPE_ADFS;
		else if (authority.protocolMode === ProtocolMode.OIDC) authorityType = CACHE_ACCOUNT_TYPE_GENERIC;
		else authorityType = CACHE_ACCOUNT_TYPE_MSSTS;
		let clientInfo;
		let dataBoundary;
		if (accountDetails.clientInfo && base64Decode) {
			clientInfo = buildClientInfo(accountDetails.clientInfo, base64Decode);
			if (clientInfo.xms_tdbr) dataBoundary = clientInfo.xms_tdbr === "EU" ? "EU" : "None";
		}
		const env = accountDetails.environment || authority && authority.getPreferredCache();
		if (!env) throw createClientAuthError(invalidCacheEnvironment, correlationId);
		const preferredUsername = accountDetails.idTokenClaims?.preferred_username || accountDetails.idTokenClaims?.upn;
		const email = accountDetails.idTokenClaims?.emails ? accountDetails.idTokenClaims.emails[0] : null;
		const username = preferredUsername || email || "";
		const loginHint = accountDetails.idTokenClaims?.login_hint;
		const realm = clientInfo?.utid || getTenantIdFromIdTokenClaims(accountDetails.idTokenClaims) || "";
		const localAccountId = clientInfo?.uid || accountDetails.idTokenClaims?.oid || accountDetails.idTokenClaims?.sub || "";
		let tenantProfiles;
		if (accountDetails.tenantProfiles) tenantProfiles = accountDetails.tenantProfiles;
		else tenantProfiles = [buildTenantProfile(accountDetails.homeAccountId, localAccountId, realm, accountDetails.nativeAccountId, accountDetails.idTokenClaims)];
		return {
			homeAccountId: accountDetails.homeAccountId,
			environment: env,
			realm,
			localAccountId,
			username,
			authorityType,
			loginHint,
			clientInfo: accountDetails.clientInfo,
			name: accountDetails.idTokenClaims?.name || "",
			lastModificationTime: void 0,
			lastModificationApp: void 0,
			cloudGraphHostName: accountDetails.cloudGraphHostName,
			msGraphHost: accountDetails.msGraphHost,
			nativeAccountId: accountDetails.nativeAccountId,
			tenantProfiles,
			dataBoundary
		};
	}
	/**
	* Generate HomeAccountId from server response
	* @param serverClientInfo
	* @param authType
	*/
	function generateHomeAccountId(serverClientInfo, authType, logger, cryptoObj, correlationId, idTokenClaims) {
		if (!(authType === AuthorityType.Adfs || authType === AuthorityType.Dsts)) {
			if (serverClientInfo) try {
				const clientInfo = buildClientInfo(serverClientInfo, cryptoObj.base64Decode);
				if (clientInfo.uid && clientInfo.utid) return `${clientInfo.uid}.${clientInfo.utid}`;
			} catch (e) {}
			logger.warning("No client info in response", correlationId);
		}
		return idTokenClaims?.sub || "";
	}
	/**
	* Validates an entity: checks for all expected params
	* @param entity
	* @internal
	*/
	function isAccountEntity(entity) {
		if (!entity) return false;
		return entity.hasOwnProperty("homeAccountId") && entity.hasOwnProperty("environment") && entity.hasOwnProperty("realm") && entity.hasOwnProperty("localAccountId") && entity.hasOwnProperty("username") && entity.hasOwnProperty("authorityType");
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* AuthErrorMessage class containing string constants used by error codes and messages.
	*/
	var unexpectedError = "unexpected_error";
	var postRequestFailed = "post_request_failed";
	var AuthErrorCodes = /*#__PURE__*/ Object.freeze({
		__proto__: null,
		postRequestFailed,
		unexpectedError
	});
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Error thrown when there is an error in configuration of the MSAL.js library.
	*/
	var ClientConfigurationError = class ClientConfigurationError extends AuthError {
		constructor(errorCode, correlationId) {
			super(errorCode, correlationId);
			this.name = "ClientConfigurationError";
			Object.setPrototypeOf(this, ClientConfigurationError.prototype);
		}
	};
	function createClientConfigurationError(errorCode, correlationId) {
		return new ClientConfigurationError(errorCode, correlationId);
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var redirectUriEmpty = "redirect_uri_empty";
	var claimsRequestParsingError = "claims_request_parsing_error";
	var authorityUriInsecure = "authority_uri_insecure";
	var urlParseError = "url_parse_error";
	var urlEmptyError = "empty_url_error";
	var emptyInputScopesError = "empty_input_scopes_error";
	var invalidClaims = "invalid_claims";
	var tokenRequestEmpty = "token_request_empty";
	var logoutRequestEmpty = "logout_request_empty";
	var invalidCodeChallengeMethod = "invalid_code_challenge_method";
	var pkceParamsMissing = "pkce_params_missing";
	var invalidCloudDiscoveryMetadata = "invalid_cloud_discovery_metadata";
	var invalidAuthorityMetadata = "invalid_authority_metadata";
	var untrustedAuthority = "untrusted_authority";
	var missingSshJwk = "missing_ssh_jwk";
	var missingSshKid = "missing_ssh_kid";
	var missingNonceAuthenticationHeader = "missing_nonce_authentication_header";
	var invalidAuthenticationHeader = "invalid_authentication_header";
	var cannotSetOIDCOptions = "cannot_set_OIDCOptions";
	var cannotAllowPlatformBroker = "cannot_allow_platform_broker";
	var authorityMismatch = "authority_mismatch";
	var invalidRequestMethodForEAR = "invalid_request_method_for_EAR";
	var invalidPlatformBrokerConfiguration = "invalid_platform_broker_configuration";
	var issuerValidationFailed = "issuer_validation_failed";
	var invalidResponseMode = "invalid_response_mode";
	var ClientConfigurationErrorCodes = /*#__PURE__*/ Object.freeze({
		__proto__: null,
		authorityMismatch,
		authorityUriInsecure,
		cannotAllowPlatformBroker,
		cannotSetOIDCOptions,
		claimsRequestParsingError,
		emptyInputScopesError,
		invalidAuthenticationHeader,
		invalidAuthorityMetadata,
		invalidClaims,
		invalidCloudDiscoveryMetadata,
		invalidCodeChallengeMethod,
		invalidDpopHtm: "invalid_dpop_htm",
		invalidDpopHtu: "invalid_dpop_htu",
		invalidPlatformBrokerConfiguration,
		invalidRequestMethodForEAR,
		invalidResponseMode,
		issuerValidationFailed,
		logoutRequestEmpty,
		missingNonceAuthenticationHeader,
		missingSshJwk,
		missingSshKid,
		pkceParamsMissing,
		redirectUriEmpty,
		tokenRequestEmpty,
		untrustedAuthority,
		urlEmptyError,
		urlParseError
	});
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	function isOpenIdConfigResponse(response) {
		return response.hasOwnProperty("authorization_endpoint") && response.hasOwnProperty("token_endpoint") && response.hasOwnProperty("issuer") && response.hasOwnProperty("jwks_uri");
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* @hidden
	*/
	var StringUtils = class {
		/**
		* Check if stringified object is empty
		* @param strObj
		*/
		static isEmptyObj(strObj) {
			if (strObj) try {
				const obj = JSON.parse(strObj);
				return Object.keys(obj).length === 0;
			} catch (e) {}
			return true;
		}
		static startsWith(str, search) {
			return str.indexOf(search) === 0;
		}
		static endsWith(str, search) {
			return str.length >= search.length && str.lastIndexOf(search) === str.length - search.length;
		}
		/**
		* Parses string into an object.
		*
		* @param query
		*/
		static queryStringToObject(query) {
			const obj = {};
			const params = query.split("&");
			const decode = (s) => decodeURIComponent(s.replace(/\+/g, " "));
			params.forEach((pair) => {
				if (pair.trim()) {
					const [key, value] = pair.split(/=(.+)/g, 2);
					if (key && value) obj[decode(key)] = decode(value);
				}
			});
			return obj;
		}
		/**
		* Trims entries in an array.
		*
		* @param arr
		*/
		static trimArrayEntries(arr) {
			return arr.map((entry) => entry.trim());
		}
		/**
		* Removes empty strings from array
		* @param arr
		*/
		static removeEmptyStringsFromArray(arr) {
			return arr.filter((entry) => {
				return !!entry;
			});
		}
		/**
		* Attempts to parse a string into JSON
		* @param str
		*/
		static jsonParseHelper(str) {
			try {
				return JSON.parse(str);
			} catch (e) {
				return null;
			}
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Url object class which can perform various transformations on url strings.
	*/
	var UrlString = class UrlString {
		get urlString() {
			return this._urlString;
		}
		constructor(url, correlationId) {
			this._urlString = url;
			this.correlationId = correlationId;
			if (!this._urlString) throw createClientConfigurationError(urlEmptyError, correlationId);
			if (!url.includes("#")) this._urlString = UrlString.canonicalizeUri(url);
		}
		/**
		* Ensure urls are lower case and end with a / character.
		* @param url
		*/
		static canonicalizeUri(url) {
			if (url) {
				let lowerCaseUrl = url.toLowerCase();
				if (StringUtils.endsWith(lowerCaseUrl, "?")) lowerCaseUrl = lowerCaseUrl.slice(0, -1);
				else if (StringUtils.endsWith(lowerCaseUrl, "?/")) lowerCaseUrl = lowerCaseUrl.slice(0, -2);
				if (!StringUtils.endsWith(lowerCaseUrl, "/")) lowerCaseUrl += "/";
				return lowerCaseUrl;
			}
			return url;
		}
		/**
		* Throws if urlString passed is not a valid authority URI string.
		*/
		validateAsUri() {
			let components;
			try {
				components = this.getUrlComponents();
			} catch (e) {
				throw createClientConfigurationError(urlParseError, this.correlationId);
			}
			if (!components.HostNameAndPort || !components.PathSegments) throw createClientConfigurationError(urlParseError, this.correlationId);
			if (!components.Protocol || components.Protocol.toLowerCase() !== "https:") throw createClientConfigurationError(authorityUriInsecure, this.correlationId);
		}
		/**
		* Given a url and a query string return the url with provided query string appended
		* @param url
		* @param queryString
		*/
		static appendQueryString(url, queryString) {
			if (!queryString) return url;
			return url.indexOf("?") < 0 ? `${url}?${queryString}` : `${url}&${queryString}`;
		}
		/**
		* Returns a url with the hash removed
		* @param url
		*/
		static removeHashFromUrl(url) {
			return UrlString.canonicalizeUri(url.split("#")[0]);
		}
		/**
		* Given a url like https://a:b/common/d?e=f#g, and a tenantId, returns https://a:b/tenantId/d
		* @param href The url
		* @param tenantId The tenant id to replace
		*/
		replaceTenantPath(tenantId) {
			const urlObject = this.getUrlComponents();
			const pathArray = urlObject.PathSegments;
			if (tenantId && pathArray.length !== 0 && (pathArray[0] === AADAuthority.COMMON || pathArray[0] === AADAuthority.ORGANIZATIONS)) pathArray[0] = tenantId;
			return UrlString.constructAuthorityUriFromObject(urlObject, this.correlationId);
		}
		/**
		* Parses out the components from a url string.
		* @returns An object with the various components. Please cache this value insted of calling this multiple times on the same url.
		*/
		getUrlComponents() {
			const regEx = RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");
			const match = this.urlString.match(regEx);
			if (!match) throw createClientConfigurationError(urlParseError, this.correlationId);
			const urlComponents = {
				Protocol: match[1],
				HostNameAndPort: match[4],
				AbsolutePath: match[5],
				QueryString: match[7]
			};
			let pathSegments = urlComponents.AbsolutePath.split("/");
			pathSegments = pathSegments.filter((val) => val && val.length > 0);
			urlComponents.PathSegments = pathSegments;
			if (urlComponents.QueryString && urlComponents.QueryString.endsWith("/")) urlComponents.QueryString = urlComponents.QueryString.substring(0, urlComponents.QueryString.length - 1);
			return urlComponents;
		}
		static getDomainFromUrl(url, correlationId) {
			const regEx = RegExp("^([^:/?#]+://)?([^/?#]*)");
			const match = url.match(regEx);
			if (!match) throw createClientConfigurationError(urlParseError, correlationId);
			return match[2];
		}
		static getAbsoluteUrl(relativeUrl, baseUrl, correlationId) {
			if (relativeUrl[0] === FORWARD_SLASH) {
				const baseComponents = new UrlString(baseUrl, correlationId).getUrlComponents();
				return baseComponents.Protocol + "//" + baseComponents.HostNameAndPort + relativeUrl;
			}
			return relativeUrl;
		}
		static constructAuthorityUriFromObject(urlObject, correlationId) {
			return new UrlString(urlObject.Protocol + "//" + urlObject.HostNameAndPort + "/" + urlObject.PathSegments.join("/"), correlationId);
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var endpointHosts = [
		{ host: "login.microsoftonline.com" },
		{
			host: "login.chinacloudapi.cn",
			issuerHost: "login.partner.microsoftonline.cn"
		},
		{ host: "login.microsoftonline.us" },
		{ host: "login.sovcloud-identity.fr" },
		{ host: "login.sovcloud-identity.de" },
		{ host: "login.sovcloud-identity.sg" }
	];
	function buildOpenIdConfig(host, issuerHost) {
		return {
			token_endpoint: `https://${host}/{tenantid}/oauth2/v2.0/token`,
			jwks_uri: `https://${host}/{tenantid}/discovery/v2.0/keys`,
			issuer: `https://${issuerHost}/{tenantid}/v2.0`,
			authorization_endpoint: `https://${host}/{tenantid}/oauth2/v2.0/authorize`,
			end_session_endpoint: `https://${host}/{tenantid}/oauth2/v2.0/logout`
		};
	}
	var rawMetdataJSON = {
		endpointMetadata: endpointHosts.reduce((acc, { host, issuerHost }) => {
			acc[host] = buildOpenIdConfig(host, issuerHost || host);
			return acc;
		}, {}),
		instanceDiscoveryMetadata: { metadata: [
			{
				preferred_network: "login.microsoftonline.com",
				preferred_cache: "login.windows.net",
				aliases: [
					"login.microsoftonline.com",
					"login.windows.net",
					"login.microsoft.com",
					"sts.windows.net"
				]
			},
			{
				preferred_network: "login.partner.microsoftonline.cn",
				preferred_cache: "login.partner.microsoftonline.cn",
				aliases: ["login.partner.microsoftonline.cn", "login.chinacloudapi.cn"]
			},
			{
				preferred_network: "login.microsoftonline.de",
				preferred_cache: "login.microsoftonline.de",
				aliases: ["login.microsoftonline.de"]
			},
			{
				preferred_network: "login.microsoftonline.us",
				preferred_cache: "login.microsoftonline.us",
				aliases: ["login.microsoftonline.us", "login.usgovcloudapi.net"]
			},
			{
				preferred_network: "login-us.microsoftonline.com",
				preferred_cache: "login-us.microsoftonline.com",
				aliases: ["login-us.microsoftonline.com"]
			},
			{
				preferred_network: "login.sovcloud-identity.fr",
				preferred_cache: "login.sovcloud-identity.fr",
				aliases: ["login.sovcloud-identity.fr"]
			},
			{
				preferred_network: "login.sovcloud-identity.de",
				preferred_cache: "login.sovcloud-identity.de",
				aliases: ["login.sovcloud-identity.de"]
			},
			{
				preferred_network: "login.sovcloud-identity.sg",
				preferred_cache: "login.sovcloud-identity.sg",
				aliases: ["login.sovcloud-identity.sg"]
			},
			{
				preferred_network: "login.windows-ppe.net",
				preferred_cache: "login.windows-ppe.net",
				aliases: [
					"login.windows-ppe.net",
					"sts.windows-ppe.net",
					"login.microsoft-ppe.com"
				]
			}
		] }
	};
	var EndpointMetadata = rawMetdataJSON.endpointMetadata;
	var InstanceDiscoveryMetadata = rawMetdataJSON.instanceDiscoveryMetadata;
	var InstanceDiscoveryMetadataAliases = /* @__PURE__ */ new Set();
	InstanceDiscoveryMetadata.metadata.forEach((metadataEntry) => {
		metadataEntry.aliases.forEach((alias) => {
			InstanceDiscoveryMetadataAliases.add(alias);
		});
	});
	/**
	* Attempts to get an aliases array from the static authority metadata sources based on the canonical authority host
	* @param staticAuthorityOptions
	* @param logger
	* @returns
	*/
	function getAliasesFromStaticSources(staticAuthorityOptions, logger, correlationId) {
		let staticAliases;
		const canonicalAuthority = staticAuthorityOptions.canonicalAuthority;
		if (canonicalAuthority) {
			const authorityHost = new UrlString(canonicalAuthority, correlationId).getUrlComponents().HostNameAndPort;
			staticAliases = getAliasesFromMetadata(logger, correlationId, authorityHost, staticAuthorityOptions.cloudDiscoveryMetadata?.metadata, AuthorityMetadataSource.CONFIG) || getAliasesFromMetadata(logger, correlationId, authorityHost, InstanceDiscoveryMetadata.metadata, AuthorityMetadataSource.HARDCODED_VALUES) || staticAuthorityOptions.knownAuthorities;
		}
		return staticAliases || [];
	}
	/**
	* Returns aliases for from the raw cloud discovery metadata passed in
	* @param authorityHost
	* @param rawCloudDiscoveryMetadata
	* @returns
	*/
	function getAliasesFromMetadata(logger, correlationId, authorityHost, cloudDiscoveryMetadata, source) {
		logger.trace(`getAliasesFromMetadata called with source: '${source}'`, correlationId);
		if (authorityHost && cloudDiscoveryMetadata) {
			const metadata = getCloudDiscoveryMetadataFromNetworkResponse(cloudDiscoveryMetadata, authorityHost);
			if (metadata) {
				logger.trace(`getAliasesFromMetadata: found cloud discovery metadata in '${source}', returning aliases`, correlationId);
				return metadata.aliases;
			} else logger.trace(`getAliasesFromMetadata: did not find cloud discovery metadata in '${source}'`, correlationId);
		}
		return null;
	}
	/**
	* Get cloud discovery metadata for common authorities
	*/
	function getCloudDiscoveryMetadataFromHardcodedValues(authorityHost) {
		return getCloudDiscoveryMetadataFromNetworkResponse(InstanceDiscoveryMetadata.metadata, authorityHost);
	}
	/**
	* Searches instance discovery network response for the entry that contains the host in the aliases list
	* @param response
	* @param authority
	*/
	function getCloudDiscoveryMetadataFromNetworkResponse(response, authorityHost) {
		for (let i = 0; i < response.length; i++) {
			const metadata = response[i];
			if (metadata.aliases.includes(authorityHost)) return metadata;
		}
		return null;
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var AzureCloudInstance = {
		None: "none",
		AzurePublic: "https://login.microsoftonline.com",
		AzurePpe: "https://login.windows-ppe.net",
		AzureChina: "https://login.chinacloudapi.cn",
		AzureGermany: "https://login.microsoftonline.de",
		AzureUsGovernment: "https://login.microsoftonline.us"
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	function isCloudInstanceDiscoveryResponse(response) {
		return response.hasOwnProperty("tenant_discovery_endpoint") && response.hasOwnProperty("metadata");
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	function isCloudInstanceDiscoveryErrorResponse(response) {
		return response.hasOwnProperty("error") && response.hasOwnProperty("error_description");
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Time spent sending/waiting for the response of a request to the token endpoint
	*/
	var NetworkClientSendPostRequestAsync = "networkClientSendPostRequestAsync";
	var RefreshTokenClientExecutePostToTokenEndpoint = "refreshTokenClientExecutePostToTokenEndpoint";
	var AuthorizationCodeClientExecutePostToTokenEndpoint = "authorizationCodeClientExecutePostToTokenEndpoint";
	/**
	* Time spent on the network for refresh token acquisition
	*/
	var RefreshTokenClientExecuteTokenRequest = "refreshTokenClientExecuteTokenRequest";
	/**
	* Time taken for acquiring refresh token , records RT size
	*/
	var RefreshTokenClientAcquireToken = "refreshTokenClientAcquireToken";
	/**
	* Time taken for acquiring cached refresh token
	*/
	var RefreshTokenClientAcquireTokenWithCachedRefreshToken = "refreshTokenClientAcquireTokenWithCachedRefreshToken";
	/**
	* Helper function to create token request body in RefreshTokenClient (msal-common).
	*/
	var RefreshTokenClientCreateTokenRequestBody = "refreshTokenClientCreateTokenRequestBody";
	var SilentFlowClientGenerateResultFromCacheRecord = "silentFlowClientGenerateResultFromCacheRecord";
	/**
	* APIs in Authorization Code Client (msal-common)
	*/
	var AuthClientExecuteTokenRequest = "authClientExecuteTokenRequest";
	var AuthClientCreateTokenRequestBody = "authClientCreateTokenRequestBody";
	var UpdateTokenEndpointAuthority = "updateTokenEndpointAuthority";
	/**
	* Generate functions in PopTokenGenerator (msal-common)
	*/
	var PopTokenGenerateCnf = "popTokenGenerateCnf";
	/**
	* handleServerTokenResponse API in ResponseHandler (msal-common)
	*/
	var HandleServerTokenResponse = "handleServerTokenResponse";
	/**
	* Authority functions
	*/
	var AuthorityResolveEndpointsAsync = "authorityResolveEndpointsAsync";
	var AuthorityGetCloudDiscoveryMetadataFromNetwork = "authorityGetCloudDiscoveryMetadataFromNetwork";
	var AuthorityUpdateCloudDiscoveryMetadata = "authorityUpdateCloudDiscoveryMetadata";
	var AuthorityGetEndpointMetadataFromNetwork = "authorityGetEndpointMetadataFromNetwork";
	var AuthorityUpdateEndpointMetadata = "authorityUpdateEndpointMetadata";
	var AuthorityUpdateMetadataWithRegionalInformation = "authorityUpdateMetadataWithRegionalInformation";
	/**
	* Region Discovery functions
	*/
	var RegionDiscoveryDetectRegion = "regionDiscoveryDetectRegion";
	var RegionDiscoveryGetRegionFromIMDS = "regionDiscoveryGetRegionFromIMDS";
	var RegionDiscoveryGetCurrentVersion = "regionDiscoveryGetCurrentVersion";
	/**
	* Cache operations
	*/
	var CacheManagerGetRefreshToken = "cacheManagerGetRefreshToken";
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Wraps a function with a performance measurement.
	* Usage: invoke(functionToCall, performanceClient, "EventName", "correlationId")(...argsToPassToFunction)
	* @param callback
	* @param eventName
	* @param logger
	* @param telemetryClient
	* @param correlationId
	* @returns
	* @internal
	*/
	var invoke = (callback, eventName, logger, telemetryClient, correlationId) => {
		return (...args) => {
			logger.trace(`Executing function '${eventName}'`, correlationId);
			const inProgressEvent = telemetryClient.startMeasurement(eventName, correlationId);
			if (correlationId) telemetryClient.incrementFields({ [`ext.${eventName}CallCount`]: 1 }, correlationId);
			try {
				const result = callback(...args);
				inProgressEvent.end({ success: true });
				logger.trace(`Returning result from '${eventName}'`, correlationId);
				return result;
			} catch (e) {
				logger.trace(`Error occurred in '${eventName}'`, correlationId);
				try {
					logger.trace(JSON.stringify(e), correlationId);
				} catch (e) {
					logger.trace("Unable to print error message.", correlationId);
				}
				inProgressEvent.end({ success: false }, e);
				throw e;
			}
		};
	};
	/**
	* Wraps an async function with a performance measurement.
	* Usage: invokeAsync(functionToCall, performanceClient, "EventName", "correlationId")(...argsToPassToFunction)
	* @param callback
	* @param eventName
	* @param logger
	* @param telemetryClient
	* @param correlationId
	* @returns
	* @internal
	*
	*/
	var invokeAsync = (callback, eventName, logger, telemetryClient, correlationId) => {
		return (...args) => {
			logger.trace(`Executing function '${eventName}'`, correlationId);
			const inProgressEvent = telemetryClient.startMeasurement(eventName, correlationId);
			if (correlationId) telemetryClient.incrementFields({ [`ext.${eventName}CallCount`]: 1 }, correlationId);
			return callback(...args).then((response) => {
				logger.trace(`Returning result from '${eventName}'`, correlationId);
				inProgressEvent.end({ success: true });
				return response;
			}).catch((e) => {
				logger.trace(`Error occurred in '${eventName}'`, correlationId);
				try {
					logger.trace(JSON.stringify(e), correlationId);
				} catch (e) {
					logger.trace("Unable to print error message.", correlationId);
				}
				inProgressEvent.end({ success: false }, e);
				throw e;
			});
		};
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var RegionDiscovery = class RegionDiscovery {
		constructor(networkInterface, logger, performanceClient, correlationId) {
			this.networkInterface = networkInterface;
			this.logger = logger;
			this.performanceClient = performanceClient;
			this.correlationId = correlationId;
		}
		/**
		* Detect the region from the application's environment.
		*
		* @returns Promise<string | null>
		*/
		async detectRegion(environmentRegion, regionDiscoveryMetadata) {
			let autodetectedRegionName = environmentRegion;
			if (!autodetectedRegionName) {
				const options = RegionDiscovery.IMDS_OPTIONS;
				try {
					const localIMDSVersionResponse = await invokeAsync(this.getRegionFromIMDS.bind(this), RegionDiscoveryGetRegionFromIMDS, this.logger, this.performanceClient, this.correlationId)(IMDS_VERSION, options);
					if (localIMDSVersionResponse.status === HTTP_SUCCESS) {
						autodetectedRegionName = localIMDSVersionResponse.body?.location;
						if (autodetectedRegionName) regionDiscoveryMetadata.region_source = RegionDiscoverySources.IMDS;
					}
					if (localIMDSVersionResponse.status === HTTP_BAD_REQUEST) {
						const currentIMDSVersion = await invokeAsync(this.getCurrentVersion.bind(this), RegionDiscoveryGetCurrentVersion, this.logger, this.performanceClient, this.correlationId)(options);
						if (!currentIMDSVersion) {
							regionDiscoveryMetadata.region_source = RegionDiscoverySources.FAILED_AUTO_DETECTION;
							return null;
						}
						const currentIMDSVersionResponse = await invokeAsync(this.getRegionFromIMDS.bind(this), RegionDiscoveryGetRegionFromIMDS, this.logger, this.performanceClient, this.correlationId)(currentIMDSVersion, options);
						if (currentIMDSVersionResponse.status === HTTP_SUCCESS) {
							autodetectedRegionName = currentIMDSVersionResponse.body?.location;
							if (autodetectedRegionName) regionDiscoveryMetadata.region_source = RegionDiscoverySources.IMDS;
						}
					}
				} catch (e) {
					regionDiscoveryMetadata.region_source = RegionDiscoverySources.FAILED_AUTO_DETECTION;
					return null;
				}
			} else regionDiscoveryMetadata.region_source = RegionDiscoverySources.ENVIRONMENT_VARIABLE;
			if (!autodetectedRegionName) regionDiscoveryMetadata.region_source = RegionDiscoverySources.FAILED_AUTO_DETECTION;
			return autodetectedRegionName || null;
		}
		/**
		* Make the call to the IMDS endpoint
		*
		* @param version
		* @param options
		* @returns Promise<NetworkResponse<ImdsComputeResponse>>
		*/
		async getRegionFromIMDS(version, options) {
			return this.networkInterface.sendGetRequestAsync(`${IMDS_ENDPOINT}?api-version=${version}`, options, IMDS_TIMEOUT);
		}
		/**
		* Get the most recent version of the IMDS endpoint available
		*
		* @returns Promise<string | null>
		*/
		async getCurrentVersion(options) {
			try {
				const response = await this.networkInterface.sendGetRequestAsync(`${IMDS_ENDPOINT}?format=json`, options);
				if (response.status === HTTP_BAD_REQUEST && response.body && response.body["newest-versions"] && response.body["newest-versions"].length > 0) return response.body["newest-versions"][0];
				return null;
			} catch (e) {
				return null;
			}
		}
	};
	RegionDiscovery.IMDS_OPTIONS = { headers: { Metadata: "true" } };
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Utility functions for managing date and time operations.
	*/
	/**
	* return the current time in Unix time (seconds).
	*/
	function nowSeconds() {
		return Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3);
	}
	/**
	* Convert seconds to JS Date object. Seconds can be in a number or string format or undefined (will still return a date).
	* @param seconds
	*/
	function toDateFromSeconds(seconds) {
		if (seconds) return /* @__PURE__ */ new Date(Number(seconds) * 1e3);
		return /* @__PURE__ */ new Date();
	}
	/**
	* check if a token is expired based on given UTC time in seconds.
	* @param expiresOn
	*/
	function isTokenExpired(expiresOn, offset) {
		const expirationSec = Number(expiresOn) || 0;
		return nowSeconds() + offset > expirationSec;
	}
	/**
	* If the current time is earlier than the time that a token was cached at, we must discard the token
	* i.e. The system clock was turned back after acquiring the cached token
	* @param cachedAt
	* @param offset
	*/
	function wasClockTurnedBack(cachedAt) {
		return Number(cachedAt) > nowSeconds();
	}
	/**
	* Waits for t number of milliseconds
	* @param t number
	* @param value T
	*/
	function delay(t, value) {
		return new Promise((resolve) => setTimeout(() => resolve(value), t));
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Create IdTokenEntity
	* @param homeAccountId
	* @param authenticationResult
	* @param clientId
	* @param authority
	*/
	function createIdTokenEntity(homeAccountId, environment, idToken, clientId, tenantId) {
		return {
			credentialType: CredentialType.ID_TOKEN,
			homeAccountId,
			environment,
			clientId,
			secret: idToken,
			realm: tenantId,
			lastUpdatedAt: Date.now().toString()
		};
	}
	/**
	* Create AccessTokenEntity
	* @param homeAccountId
	* @param environment
	* @param accessToken
	* @param clientId
	* @param tenantId
	* @param scopes
	* @param expiresOn
	* @param extExpiresOn
	*/
	function createAccessTokenEntity(homeAccountId, environment, accessToken, clientId, tenantId, scopes, expiresOn, extExpiresOn, base64Decode, correlationId, refreshOn, tokenType, userAssertionHash, keyId, additionalCacheKeyComponents) {
		const atEntity = {
			homeAccountId,
			credentialType: CredentialType.ACCESS_TOKEN,
			secret: accessToken,
			cachedAt: nowSeconds().toString(),
			expiresOn: expiresOn.toString(),
			extendedExpiresOn: extExpiresOn.toString(),
			environment,
			clientId,
			realm: tenantId,
			target: scopes,
			tokenType: tokenType || AuthenticationScheme.BEARER,
			lastUpdatedAt: Date.now().toString()
		};
		if (userAssertionHash) atEntity.userAssertionHash = userAssertionHash;
		if (refreshOn) atEntity.refreshOn = refreshOn.toString();
		if (atEntity.tokenType?.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase()) {
			atEntity.credentialType = CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME;
			switch (atEntity.tokenType) {
				case AuthenticationScheme.POP:
					const tokenClaims = extractTokenClaims(accessToken, base64Decode, correlationId);
					if (!tokenClaims?.cnf?.kid) throw createClientAuthError(tokenClaimsCnfRequiredForSignedJwt, correlationId);
					atEntity.keyId = tokenClaims.cnf.kid;
					break;
				case AuthenticationScheme.SSH: atEntity.keyId = keyId;
			}
		}
		if (additionalCacheKeyComponents && Object.keys(additionalCacheKeyComponents).length > 0) atEntity.additionalCacheKeyComponents = additionalCacheKeyComponents;
		return atEntity;
	}
	/**
	* Create RefreshTokenEntity
	* @param homeAccountId
	* @param authenticationResult
	* @param clientId
	* @param authority
	*/
	function createRefreshTokenEntity(homeAccountId, environment, refreshToken, clientId, familyId, userAssertionHash, expiresOn) {
		const rtEntity = {
			credentialType: CredentialType.REFRESH_TOKEN,
			homeAccountId,
			environment,
			clientId,
			secret: refreshToken,
			lastUpdatedAt: Date.now().toString()
		};
		if (userAssertionHash) rtEntity.userAssertionHash = userAssertionHash;
		if (familyId) rtEntity.familyId = familyId;
		if (expiresOn) rtEntity.expiresOn = expiresOn.toString();
		return rtEntity;
	}
	function isCredentialEntity(entity) {
		return entity.hasOwnProperty("homeAccountId") && entity.hasOwnProperty("environment") && entity.hasOwnProperty("credentialType") && entity.hasOwnProperty("clientId") && entity.hasOwnProperty("secret");
	}
	/**
	* Validates an entity: checks for all expected params
	* @param entity
	*/
	function isAccessTokenEntity(entity) {
		if (!entity) return false;
		return isCredentialEntity(entity) && entity.hasOwnProperty("realm") && entity.hasOwnProperty("target") && (entity["credentialType"] === CredentialType.ACCESS_TOKEN || entity["credentialType"] === CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME);
	}
	/**
	* Validates an entity: checks for all expected params
	* @param entity
	*/
	function isIdTokenEntity(entity) {
		if (!entity) return false;
		return isCredentialEntity(entity) && entity.hasOwnProperty("realm") && entity["credentialType"] === CredentialType.ID_TOKEN;
	}
	/**
	* Validates an entity: checks for all expected params
	* @param entity
	*/
	function isRefreshTokenEntity(entity) {
		if (!entity) return false;
		return isCredentialEntity(entity) && entity["credentialType"] === CredentialType.REFRESH_TOKEN;
	}
	/**
	* validates if a given cache entry is "Telemetry", parses <key,value>
	* @param key
	* @param entity
	*/
	function isServerTelemetryEntity(key, entity) {
		const validateKey = key.indexOf(SERVER_TELEM_CACHE_KEY) === 0;
		let validateEntity = true;
		if (entity) validateEntity = entity.hasOwnProperty("failedRequests") && entity.hasOwnProperty("errors") && entity.hasOwnProperty("cacheHits");
		return validateKey && validateEntity;
	}
	/**
	* validates if a given cache entry is "Throttling", parses <key,value>
	* @param key
	* @param entity
	*/
	function isThrottlingEntity(key, entity) {
		let validateKey = false;
		if (key) validateKey = key.indexOf(THROTTLING_PREFIX) === 0;
		let validateEntity = true;
		if (entity) validateEntity = entity.hasOwnProperty("throttleTime");
		return validateKey && validateEntity;
	}
	/**
	* Generate AppMetadata Cache Key as per the schema: appmetadata-<environment>-<client_id>
	*/
	function generateAppMetadataKey({ environment, clientId }) {
		return [
			APP_METADATA,
			environment,
			clientId
		].join(CACHE_KEY_SEPARATOR).toLowerCase();
	}
	function isAppMetadataEntity(key, entity) {
		if (!entity) return false;
		return key.indexOf(APP_METADATA) === 0 && entity.hasOwnProperty("clientId") && entity.hasOwnProperty("environment");
	}
	/**
	* Validates an entity: checks for all expected params
	* @param entity
	*/
	function isAuthorityMetadataEntity(key, entity) {
		if (!entity) return false;
		return key.indexOf(AUTHORITY_METADATA_CACHE_KEY) === 0 && entity.hasOwnProperty("aliases") && entity.hasOwnProperty("preferred_cache") && entity.hasOwnProperty("preferred_network") && entity.hasOwnProperty("canonical_authority") && entity.hasOwnProperty("authorization_endpoint") && entity.hasOwnProperty("token_endpoint") && entity.hasOwnProperty("issuer") && entity.hasOwnProperty("aliasesFromNetwork") && entity.hasOwnProperty("endpointsFromNetwork") && entity.hasOwnProperty("expiresAt") && entity.hasOwnProperty("jwks_uri");
	}
	/**
	* Reset the exiresAt value
	*/
	function generateAuthorityMetadataExpiresAt() {
		return nowSeconds() + AUTHORITY_METADATA_REFRESH_TIME_SECONDS;
	}
	/** @internal */
	function updateAuthorityEndpointMetadata(authorityMetadata, updatedValues, fromNetwork) {
		authorityMetadata.authorization_endpoint = updatedValues.authorization_endpoint;
		authorityMetadata.token_endpoint = updatedValues.token_endpoint;
		authorityMetadata.end_session_endpoint = updatedValues.end_session_endpoint;
		authorityMetadata.issuer = updatedValues.issuer;
		authorityMetadata.endpointsFromNetwork = fromNetwork;
		authorityMetadata.jwks_uri = updatedValues.jwks_uri;
	}
	/** @internal */
	function updateCloudDiscoveryMetadata(authorityMetadata, updatedValues, fromNetwork) {
		authorityMetadata.aliases = updatedValues.aliases;
		authorityMetadata.preferred_cache = updatedValues.preferred_cache;
		authorityMetadata.preferred_network = updatedValues.preferred_network;
		authorityMetadata.aliasesFromNetwork = fromNetwork;
	}
	/**
	* Returns whether or not the data needs to be refreshed
	* @internal
	*/
	function isAuthorityMetadataExpired(metadata) {
		return metadata.expiresAt <= nowSeconds();
	}
	/**
	* Serialize attribute tokens synchronously (sort and join).
	* This is a sync-only operation for use at request construction time.
	* @param attributeTokens - array of tokens
	* @returns serialized partition string or undefined if no tokens
	*/
	function serializeAttributeTokens(attributeTokens) {
		if (!attributeTokens || attributeTokens.length === 0) return;
		return [...attributeTokens].sort().join(" ");
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* The authority class validates the authority URIs used by the user, and retrieves the OpenID Configuration Data from the
	* endpoint. It will store the pertinent config data in this object for use during token calls.
	* @internal
	*/
	var Authority = class Authority {
		constructor(authority, networkInterface, cacheManager, authorityOptions, logger, correlationId, performanceClient, managedIdentity) {
			this.canonicalAuthority = authority;
			this._canonicalAuthority.validateAsUri();
			this.networkInterface = networkInterface;
			this.cacheManager = cacheManager;
			this.authorityOptions = authorityOptions;
			this.regionDiscoveryMetadata = {
				region_used: void 0,
				region_source: void 0,
				region_outcome: void 0
			};
			this.logger = logger;
			this.performanceClient = performanceClient;
			this.correlationId = correlationId;
			this.managedIdentity = managedIdentity || false;
			this.regionDiscovery = new RegionDiscovery(networkInterface, this.logger, this.performanceClient, this.correlationId);
		}
		/**
		* Get {@link AuthorityType:type}
		* @param authorityUri {@link IUri}
		* @private
		*/
		getAuthorityType(authorityUri) {
			if (authorityUri.HostNameAndPort.endsWith(CIAM_AUTH_URL)) return AuthorityType.Ciam;
			const pathSegments = authorityUri.PathSegments;
			if (pathSegments.length) switch (pathSegments[0].toLowerCase()) {
				case ADFS: return AuthorityType.Adfs;
				case DSTS: return AuthorityType.Dsts;
			}
			return AuthorityType.Default;
		}
		get authorityType() {
			return this.getAuthorityType(this.canonicalAuthorityUrlComponents);
		}
		/**
		* ProtocolMode enum representing the way endpoints are constructed.
		*/
		get protocolMode() {
			return this.authorityOptions.protocolMode;
		}
		/**
		* Returns authorityOptions which can be used to reinstantiate a new authority instance
		*/
		get options() {
			return this.authorityOptions;
		}
		/**
		* A URL that is the authority set by the developer
		*/
		get canonicalAuthority() {
			return this._canonicalAuthority.urlString;
		}
		/**
		* Sets canonical authority.
		*/
		set canonicalAuthority(url) {
			this._canonicalAuthority = new UrlString(url, this.correlationId);
			this._canonicalAuthority.validateAsUri();
			this._canonicalAuthorityUrlComponents = null;
		}
		/**
		* Get authority components.
		*/
		get canonicalAuthorityUrlComponents() {
			if (!this._canonicalAuthorityUrlComponents) this._canonicalAuthorityUrlComponents = this._canonicalAuthority.getUrlComponents();
			return this._canonicalAuthorityUrlComponents;
		}
		/**
		* Get hostname and port i.e. login.microsoftonline.com
		*/
		get hostnameAndPort() {
			return this.canonicalAuthorityUrlComponents.HostNameAndPort.toLowerCase();
		}
		/**
		* Get tenant for authority.
		*/
		get tenant() {
			return this.canonicalAuthorityUrlComponents.PathSegments[0];
		}
		/**
		* OAuth /authorize endpoint for requests
		*/
		get authorizationEndpoint() {
			if (this.discoveryComplete()) return this.replacePath(this.metadata.authorization_endpoint);
			else throw createClientAuthError(endpointResolutionError, this.correlationId);
		}
		/**
		* OAuth /token endpoint for requests
		*/
		get tokenEndpoint() {
			if (this.discoveryComplete()) return this.replacePath(this.metadata.token_endpoint);
			else throw createClientAuthError(endpointResolutionError, this.correlationId);
		}
		get deviceCodeEndpoint() {
			if (this.discoveryComplete()) return this.replacePath(this.metadata.token_endpoint.replace("/token", "/devicecode"));
			else throw createClientAuthError(endpointResolutionError, this.correlationId);
		}
		/**
		* OAuth logout endpoint for requests
		*/
		get endSessionEndpoint() {
			if (this.discoveryComplete()) {
				if (!this.metadata.end_session_endpoint) throw createClientAuthError(endSessionEndpointNotSupported, this.correlationId);
				return this.replacePath(this.metadata.end_session_endpoint);
			} else throw createClientAuthError(endpointResolutionError, this.correlationId);
		}
		/**
		* OAuth issuer for requests
		*/
		get selfSignedJwtAudience() {
			if (this.discoveryComplete()) return this.replacePath(this.metadata.issuer);
			else throw createClientAuthError(endpointResolutionError, this.correlationId);
		}
		/**
		* Jwks_uri for token signing keys
		*/
		get jwksUri() {
			if (this.discoveryComplete()) return this.replacePath(this.metadata.jwks_uri);
			else throw createClientAuthError(endpointResolutionError, this.correlationId);
		}
		/**
		* Returns a flag indicating that tenant name can be replaced in authority {@link IUri}
		* @param authorityUri {@link IUri}
		* @private
		*/
		canReplaceTenant(authorityUri) {
			return authorityUri.PathSegments.length === 1 && !Authority.reservedTenantDomains.has(authorityUri.PathSegments[0]) && this.getAuthorityType(authorityUri) === AuthorityType.Default && this.protocolMode !== ProtocolMode.OIDC;
		}
		/**
		* Replaces tenant in url path with current tenant. Defaults to common.
		* @param urlString
		*/
		replaceTenant(urlString) {
			return urlString.replace(/{tenant}|{tenantid}/g, this.tenant);
		}
		/**
		* Replaces path such as tenant or policy with the current tenant or policy.
		* @param urlString
		*/
		replacePath(urlString) {
			let endpoint = urlString;
			const cachedAuthorityUrlComponents = new UrlString(this.metadata.canonical_authority, this.correlationId).getUrlComponents();
			const cachedAuthorityParts = cachedAuthorityUrlComponents.PathSegments;
			this.canonicalAuthorityUrlComponents.PathSegments.forEach((currentPart, index) => {
				let cachedPart = cachedAuthorityParts[index];
				if (index === 0 && this.canReplaceTenant(cachedAuthorityUrlComponents)) {
					const tenantId = new UrlString(this.metadata.authorization_endpoint, this.correlationId).getUrlComponents().PathSegments[0];
					/**
					* Check if AAD canonical authority contains tenant domain name, for example "testdomain.onmicrosoft.com",
					* by comparing its first path segment to the corresponding authorization endpoint path segment, which is
					* always resolved with tenant id by OIDC.
					*/
					if (cachedPart !== tenantId) {
						this.logger.verbose(`Replacing tenant domain name '${cachedPart}' with id '${tenantId}'`, this.correlationId);
						cachedPart = tenantId;
					}
				}
				if (currentPart !== cachedPart) endpoint = endpoint.replace(`/${cachedPart}/`, `/${currentPart}/`);
			});
			return this.replaceTenant(endpoint);
		}
		/**
		* The default open id configuration endpoint for any canonical authority.
		*/
		get defaultOpenIdConfigurationEndpoint() {
			const canonicalAuthorityHost = this.hostnameAndPort;
			if (this.canonicalAuthority.endsWith("v2.0/") || this.authorityType === AuthorityType.Adfs || this.protocolMode === ProtocolMode.OIDC && !this.isAliasOfKnownMicrosoftAuthority(canonicalAuthorityHost)) return `${this.canonicalAuthority}.well-known/openid-configuration`;
			return `${this.canonicalAuthority}v2.0/.well-known/openid-configuration`;
		}
		/**
		* Boolean that returns whether or not tenant discovery has been completed.
		*/
		discoveryComplete() {
			return !!this.metadata;
		}
		/**
		* Perform endpoint discovery to discover aliases, preferred_cache, preferred_network
		* and the /authorize, /token and logout endpoints.
		*/
		async resolveEndpointsAsync() {
			const metadataEntity = this.getCurrentMetadataEntity();
			const cloudDiscoverySource = await invokeAsync(this.updateCloudDiscoveryMetadata.bind(this), AuthorityUpdateCloudDiscoveryMetadata, this.logger, this.performanceClient, this.correlationId)(metadataEntity);
			this.canonicalAuthority = this.canonicalAuthority.replace(this.hostnameAndPort, metadataEntity.preferred_network);
			const endpointSource = await invokeAsync(this.updateEndpointMetadata.bind(this), AuthorityUpdateEndpointMetadata, this.logger, this.performanceClient, this.correlationId)(metadataEntity);
			this.updateCachedMetadata(metadataEntity, cloudDiscoverySource, { source: endpointSource });
			this.performanceClient?.addFields({
				cloudDiscoverySource,
				authorityEndpointSource: endpointSource
			}, this.correlationId);
		}
		/**
		* Returns metadata entity from cache if it exists, otherwise returns a new metadata entity built
		* from the configured canonical authority
		* @returns
		*/
		getCurrentMetadataEntity() {
			let metadataEntity = this.cacheManager.getAuthorityMetadataByAlias(this.hostnameAndPort, this.correlationId);
			if (!metadataEntity) metadataEntity = {
				aliases: [],
				preferred_cache: this.hostnameAndPort,
				preferred_network: this.hostnameAndPort,
				canonical_authority: this.canonicalAuthority,
				authorization_endpoint: "",
				token_endpoint: "",
				end_session_endpoint: "",
				issuer: "",
				aliasesFromNetwork: false,
				endpointsFromNetwork: false,
				expiresAt: generateAuthorityMetadataExpiresAt(),
				jwks_uri: ""
			};
			return metadataEntity;
		}
		/**
		* Updates cached metadata based on metadata source and sets the instance's metadata
		* property to the same value
		* @param metadataEntity
		* @param cloudDiscoverySource
		* @param endpointMetadataResult
		*/
		updateCachedMetadata(metadataEntity, cloudDiscoverySource, endpointMetadataResult) {
			if (cloudDiscoverySource !== AuthorityMetadataSource.CACHE && endpointMetadataResult?.source !== AuthorityMetadataSource.CACHE) {
				metadataEntity.expiresAt = generateAuthorityMetadataExpiresAt();
				metadataEntity.canonical_authority = this.canonicalAuthority;
			}
			const cacheKey = this.cacheManager.generateAuthorityMetadataCacheKey(metadataEntity.preferred_cache, this.correlationId);
			this.cacheManager.setAuthorityMetadata(cacheKey, metadataEntity, this.correlationId);
			this.metadata = metadataEntity;
		}
		/**
		* Update AuthorityMetadataEntity with new endpoints and return where the information came from
		* @param metadataEntity
		*/
		async updateEndpointMetadata(metadataEntity) {
			const localMetadata = this.updateEndpointMetadataFromLocalSources(metadataEntity);
			if (localMetadata) {
				if (localMetadata.source === AuthorityMetadataSource.HARDCODED_VALUES) {
					if (this.authorityOptions.azureRegionConfiguration?.azureRegion) {
						if (localMetadata.metadata) {
							updateAuthorityEndpointMetadata(metadataEntity, await invokeAsync(this.updateMetadataWithRegionalInformation.bind(this), AuthorityUpdateMetadataWithRegionalInformation, this.logger, this.performanceClient, this.correlationId)(localMetadata.metadata), false);
							metadataEntity.canonical_authority = this.canonicalAuthority;
						}
					}
				}
				return localMetadata.source;
			}
			let metadata = await invokeAsync(this.getEndpointMetadataFromNetwork.bind(this), AuthorityGetEndpointMetadataFromNetwork, this.logger, this.performanceClient, this.correlationId)();
			if (metadata) {
				this.validateIssuer(metadata.issuer);
				if (this.authorityOptions.azureRegionConfiguration?.azureRegion) metadata = await invokeAsync(this.updateMetadataWithRegionalInformation.bind(this), AuthorityUpdateMetadataWithRegionalInformation, this.logger, this.performanceClient, this.correlationId)(metadata);
				updateAuthorityEndpointMetadata(metadataEntity, metadata, true);
				return AuthorityMetadataSource.NETWORK;
			} else throw createClientAuthError(openIdConfigError, this.defaultOpenIdConfigurationEndpoint, this.correlationId);
		}
		/**
		* Updates endpoint metadata from local sources and returns where the information was retrieved from and the metadata config
		* response if the source is hardcoded metadata
		* @param metadataEntity
		* @returns
		*/
		updateEndpointMetadataFromLocalSources(metadataEntity) {
			this.logger.verbose("Attempting to get endpoint metadata from authority configuration", this.correlationId);
			const configMetadata = this.getEndpointMetadataFromConfig();
			if (configMetadata) {
				this.logger.verbose("Found endpoint metadata in authority configuration", this.correlationId);
				updateAuthorityEndpointMetadata(metadataEntity, configMetadata, false);
				return { source: AuthorityMetadataSource.CONFIG };
			}
			this.logger.verbose("Did not find endpoint metadata in the config... Attempting to get endpoint metadata from the hardcoded values.", this.correlationId);
			const hardcodedMetadata = this.getEndpointMetadataFromHardcodedValues();
			if (hardcodedMetadata) {
				updateAuthorityEndpointMetadata(metadataEntity, hardcodedMetadata, false);
				return {
					source: AuthorityMetadataSource.HARDCODED_VALUES,
					metadata: hardcodedMetadata
				};
			} else this.logger.verbose("Did not find endpoint metadata in hardcoded values... Attempting to get endpoint metadata from the network metadata cache.", this.correlationId);
			const metadataEntityExpired = isAuthorityMetadataExpired(metadataEntity);
			if (this.isAuthoritySameType(metadataEntity) && metadataEntity.endpointsFromNetwork && !metadataEntityExpired) {
				this.logger.verbose("Found endpoint metadata in the cache.", "");
				return { source: AuthorityMetadataSource.CACHE };
			} else if (metadataEntityExpired) this.logger.verbose("The metadata entity is expired.", "");
			return null;
		}
		/**
		* Compares the number of url components after the domain to determine if the cached
		* authority metadata can be used for the requested authority. Protects against same domain different
		* authority such as login.microsoftonline.com/tenant and login.microsoftonline.com/tfp/tenant/policy
		* @param metadataEntity
		*/
		isAuthoritySameType(metadataEntity) {
			return new UrlString(metadataEntity.canonical_authority, this.correlationId).getUrlComponents().PathSegments.length === this.canonicalAuthorityUrlComponents.PathSegments.length;
		}
		/**
		* Parse authorityMetadata config option
		*/
		getEndpointMetadataFromConfig() {
			if (this.authorityOptions.authorityMetadata) try {
				return JSON.parse(this.authorityOptions.authorityMetadata);
			} catch (e) {
				throw createClientConfigurationError(invalidAuthorityMetadata, this.correlationId);
			}
			return null;
		}
		/**
		* Gets OAuth endpoints from the given OpenID configuration endpoint.
		*
		* @param hasHardcodedMetadata boolean
		*/
		async getEndpointMetadataFromNetwork() {
			const options = {};
			const openIdConfigurationEndpoint = this.defaultOpenIdConfigurationEndpoint;
			this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: attempting to retrieve OAuth endpoints from '${openIdConfigurationEndpoint}'`, this.correlationId);
			try {
				const response = await this.networkInterface.sendGetRequestAsync(openIdConfigurationEndpoint, options);
				if (isOpenIdConfigResponse(response.body)) return response.body;
				else {
					this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: could not parse response as OpenID configuration`, this.correlationId);
					return null;
				}
			} catch (e) {
				this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: '${e}'`, this.correlationId);
				return null;
			}
		}
		/**
		* Get OAuth endpoints for common authorities.
		*/
		getEndpointMetadataFromHardcodedValues() {
			if (this.hostnameAndPort in EndpointMetadata) return EndpointMetadata[this.hostnameAndPort];
			return null;
		}
		/**
		* Update the retrieved metadata with regional information.
		* User selected Azure region will be used if configured.
		*/
		async updateMetadataWithRegionalInformation(metadata) {
			const userConfiguredAzureRegion = this.authorityOptions.azureRegionConfiguration?.azureRegion;
			if (userConfiguredAzureRegion) {
				if (userConfiguredAzureRegion !== AZURE_REGION_AUTO_DISCOVER_FLAG) {
					this.regionDiscoveryMetadata.region_outcome = RegionDiscoveryOutcomes.CONFIGURED_NO_AUTO_DETECTION;
					this.regionDiscoveryMetadata.region_used = userConfiguredAzureRegion;
					return Authority.replaceWithRegionalInformation(metadata, userConfiguredAzureRegion, this.correlationId);
				}
				const autodetectedRegionName = await invokeAsync(this.regionDiscovery.detectRegion.bind(this.regionDiscovery), RegionDiscoveryDetectRegion, this.logger, this.performanceClient, this.correlationId)(this.authorityOptions.azureRegionConfiguration?.environmentRegion, this.regionDiscoveryMetadata);
				if (autodetectedRegionName) {
					this.regionDiscoveryMetadata.region_outcome = RegionDiscoveryOutcomes.AUTO_DETECTION_REQUESTED_SUCCESSFUL;
					this.regionDiscoveryMetadata.region_used = autodetectedRegionName;
					return Authority.replaceWithRegionalInformation(metadata, autodetectedRegionName, this.correlationId);
				}
				this.regionDiscoveryMetadata.region_outcome = RegionDiscoveryOutcomes.AUTO_DETECTION_REQUESTED_FAILED;
			}
			return metadata;
		}
		/**
		* Updates the AuthorityMetadataEntity with new aliases, preferred_network and preferred_cache
		* and returns where the information was retrieved from
		* @param metadataEntity
		* @returns AuthorityMetadataSource
		*/
		async updateCloudDiscoveryMetadata(metadataEntity) {
			const localMetadataSource = this.updateCloudDiscoveryMetadataFromLocalSources(metadataEntity);
			if (localMetadataSource) return localMetadataSource;
			const metadata = await invokeAsync(this.getCloudDiscoveryMetadataFromNetwork.bind(this), AuthorityGetCloudDiscoveryMetadataFromNetwork, this.logger, this.performanceClient, this.correlationId)();
			if (metadata) {
				updateCloudDiscoveryMetadata(metadataEntity, metadata, true);
				return AuthorityMetadataSource.NETWORK;
			}
			throw createClientConfigurationError(untrustedAuthority, this.correlationId);
		}
		updateCloudDiscoveryMetadataFromLocalSources(metadataEntity) {
			this.logger.verbose("Attempting to get cloud discovery metadata from authority configuration", this.correlationId);
			this.logger.verbosePii(`Known Authorities: '${this.authorityOptions.knownAuthorities || NOT_APPLICABLE}'`, this.correlationId);
			this.logger.verbosePii(`Authority Metadata: '${this.authorityOptions.authorityMetadata || NOT_APPLICABLE}'`, this.correlationId);
			this.logger.verbosePii(`Canonical Authority: '${metadataEntity.canonical_authority || NOT_APPLICABLE}'`, this.correlationId);
			const metadata = this.getCloudDiscoveryMetadataFromConfig();
			if (metadata) {
				this.logger.verbose("Found cloud discovery metadata in authority configuration", this.correlationId);
				updateCloudDiscoveryMetadata(metadataEntity, metadata, false);
				return AuthorityMetadataSource.CONFIG;
			}
			this.logger.verbose("Did not find cloud discovery metadata in the config... Attempting to get cloud discovery metadata from the hardcoded values.", this.correlationId);
			const hardcodedMetadata = getCloudDiscoveryMetadataFromHardcodedValues(this.hostnameAndPort);
			if (hardcodedMetadata) {
				this.logger.verbose("Found cloud discovery metadata from hardcoded values.", this.correlationId);
				updateCloudDiscoveryMetadata(metadataEntity, hardcodedMetadata, false);
				return AuthorityMetadataSource.HARDCODED_VALUES;
			}
			this.logger.verbose("Did not find cloud discovery metadata in hardcoded values... Attempting to get cloud discovery metadata from the network metadata cache.", this.correlationId);
			const metadataEntityExpired = isAuthorityMetadataExpired(metadataEntity);
			if (this.isAuthoritySameType(metadataEntity) && metadataEntity.aliasesFromNetwork && !metadataEntityExpired) {
				this.logger.verbose("Found cloud discovery metadata in the cache.", "");
				return AuthorityMetadataSource.CACHE;
			} else if (metadataEntityExpired) this.logger.verbose("The metadata entity is expired.", "");
			return null;
		}
		/**
		* Parse cloudDiscoveryMetadata config or check knownAuthorities
		*/
		getCloudDiscoveryMetadataFromConfig() {
			if (this.authorityType === AuthorityType.Ciam) {
				this.logger.verbose("CIAM authorities do not support cloud discovery metadata, generate the aliases from authority host.", this.correlationId);
				return Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
			}
			if (this.authorityOptions.cloudDiscoveryMetadata) {
				this.logger.verbose("The cloud discovery metadata has been provided as a network response, in the config.", this.correlationId);
				try {
					this.logger.verbose("Attempting to parse the cloud discovery metadata.", this.correlationId);
					const metadata = getCloudDiscoveryMetadataFromNetworkResponse(JSON.parse(this.authorityOptions.cloudDiscoveryMetadata).metadata, this.hostnameAndPort);
					this.logger.verbose("Parsed the cloud discovery metadata.", "");
					if (metadata) {
						this.logger.verbose("There is returnable metadata attached to the parsed cloud discovery metadata.", this.correlationId);
						return metadata;
					} else this.logger.verbose("There is no metadata attached to the parsed cloud discovery metadata.", this.correlationId);
				} catch (e) {
					this.logger.verbose("Unable to parse the cloud discovery metadata. Throwing Invalid Cloud Discovery Metadata Error.", this.correlationId);
					throw createClientConfigurationError(invalidCloudDiscoveryMetadata, this.correlationId);
				}
			}
			if (this.isInKnownAuthorities(this.hostnameAndPort)) {
				this.logger.verbose("The host is included in knownAuthorities. Creating new cloud discovery metadata from the host.", this.correlationId);
				return Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
			}
			return null;
		}
		/**
		* Called to get metadata from network if CloudDiscoveryMetadata was not populated by config
		*
		* @param hasHardcodedMetadata boolean
		*/
		async getCloudDiscoveryMetadataFromNetwork() {
			const instanceDiscoveryEndpoint = `${AAD_INSTANCE_DISCOVERY_ENDPT}${this.canonicalAuthority}oauth2/v2.0/authorize`;
			const options = {};
			let match = null;
			try {
				const response = await this.networkInterface.sendGetRequestAsync(instanceDiscoveryEndpoint, options);
				let typedResponseBody;
				let metadata;
				if (isCloudInstanceDiscoveryResponse(response.body)) {
					typedResponseBody = response.body;
					metadata = typedResponseBody.metadata;
					this.logger.verbosePii(`tenant_discovery_endpoint is: '${typedResponseBody.tenant_discovery_endpoint}'`, this.correlationId);
				} else if (isCloudInstanceDiscoveryErrorResponse(response.body)) {
					this.logger.warning(`A CloudInstanceDiscoveryErrorResponse was returned. The cloud instance discovery network request's status code is: '${response.status}'`, this.correlationId);
					typedResponseBody = response.body;
					if (typedResponseBody.error === INVALID_INSTANCE) {
						this.logger.error("The CloudInstanceDiscoveryErrorResponse error is invalid_instance.", this.correlationId);
						return null;
					}
					this.logger.warning(`The CloudInstanceDiscoveryErrorResponse error is '${typedResponseBody.error}'`, this.correlationId);
					this.logger.warning(`The CloudInstanceDiscoveryErrorResponse error description is '${typedResponseBody.error_description}'`, this.correlationId);
					this.logger.warning("Setting the value of the CloudInstanceDiscoveryMetadata (returned from the network, correlationId) to []", this.correlationId);
					metadata = [];
				} else {
					this.logger.error("AAD did not return a CloudInstanceDiscoveryResponse or CloudInstanceDiscoveryErrorResponse", this.correlationId);
					return null;
				}
				this.logger.verbose("Attempting to find a match between the developer's authority and the CloudInstanceDiscoveryMetadata returned from the network request.", this.correlationId);
				match = getCloudDiscoveryMetadataFromNetworkResponse(metadata, this.hostnameAndPort);
			} catch (error) {
				if (error instanceof AuthError) this.logger.error(`There was a network error while attempting to get the cloud discovery instance metadata.\nError: '${error.errorCode}'\nError Description: '${error.errorMessage}'`, this.correlationId);
				else {
					const typedError = error;
					this.logger.error(`A non-MSALJS error was thrown while attempting to get the cloud instance discovery metadata.\nError: '${typedError.name}'\nError Description: '${typedError.message}'`, this.correlationId);
				}
				return null;
			}
			if (!match) {
				this.logger.warning("The developer's authority was not found within the CloudInstanceDiscoveryMetadata returned from the network request.", this.correlationId);
				this.logger.verbose("Creating custom Authority for custom domain scenario.", this.correlationId);
				match = Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
			}
			return match;
		}
		/**
		* Helper function to determine if a host is included in the knownAuthorities config option.
		*/
		isInKnownAuthorities(host) {
			const normalizedHost = host.toLowerCase();
			return this.authorityOptions.knownAuthorities.filter((authority) => {
				return authority && UrlString.getDomainFromUrl(authority, this.correlationId).toLowerCase() === normalizedHost;
			}).length > 0;
		}
		/**
		* helper function to populate the authority based on azureCloudOptions
		* @param authorityString
		* @param azureCloudOptions
		*/
		static generateAuthority(authorityString, azureCloudOptions) {
			let authorityAzureCloudInstance;
			if (azureCloudOptions && azureCloudOptions.azureCloudInstance !== AzureCloudInstance.None) {
				const tenant = azureCloudOptions.tenant ? azureCloudOptions.tenant : DEFAULT_COMMON_TENANT;
				authorityAzureCloudInstance = `${azureCloudOptions.azureCloudInstance}/${tenant}/`;
			}
			return authorityAzureCloudInstance ? authorityAzureCloudInstance : authorityString;
		}
		/**
		* Creates cloud discovery metadata object from a given host
		* @param host
		*/
		static createCloudDiscoveryMetadataFromHost(host) {
			return {
				preferred_network: host,
				preferred_cache: host,
				aliases: [host]
			};
		}
		/**
		* helper function to generate environment from authority object
		*/
		getPreferredCache() {
			if (this.managedIdentity) return DEFAULT_AUTHORITY_HOST;
			else if (this.discoveryComplete()) return this.metadata.preferred_cache;
			else throw createClientAuthError(endpointResolutionError, this.correlationId);
		}
		/**
		* Returns whether or not the provided host is an alias of this authority instance
		* @param host
		*/
		isAlias(host) {
			return this.metadata.aliases.indexOf(host) > -1;
		}
		/**
		* Returns whether or not the provided host is an alias of a known Microsoft authority for purposes of endpoint discovery
		* @param host
		*/
		isAliasOfKnownMicrosoftAuthority(host) {
			return InstanceDiscoveryMetadataAliases.has(host);
		}
		/**
		* Validates the `issuer` returned by an OIDC discovery document against
		* this authority, per
		* https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationValidation
		*
		* The issuer is accepted when ANY of the following holds:
		*  1. The issuer scheme + host + port match the authority's (path may
		*     differ). Applies to all authorities.
		*  2. The authority is a Microsoft cloud authority (public, sovereign,
		*     or CIAM), the issuer is HTTPS, and the issuer host is in the known
		*     Microsoft authority host set.
		*  3. Same as (2), but the issuer host is a single-label regional variant
		*     of a known Microsoft host (e.g. `westus.login.microsoftonline.com`).
		*  4. Same as (2), but the issuer host matches the CIAM tenant pattern
		*     `{tenant}.ciamlogin.com` with an optional `/{tenant}[.onmicrosoft.com][/v2.0]`
		*     path.
		*  5. The issuer host is HTTPS and is explicitly listed in the
		*     developer-configured `knownAuthorities`. This covers scenarios where
		*     the OIDC discovery document returns an issuer host that differs from
		*     the authority (e.g., a GUID-based issuer for a name-based CIAM authority).
		*
		* @param issuer The `issuer` value returned in the OIDC discovery document.
		* @throws ClientConfigurationError("issuer_validation_failed") on failure.
		*/
		validateIssuer(issuer) {
			if (!issuer) throw createClientConfigurationError(issuerValidationFailed, this.correlationId);
			let issuerUrl;
			try {
				issuerUrl = new URL(issuer);
			} catch {
				throw createClientConfigurationError(issuerValidationFailed, this.correlationId);
			}
			const issuerScheme = issuerUrl.protocol;
			const issuerHost = issuerUrl.host;
			const authorityScheme = (this.canonicalAuthorityUrlComponents.Protocol || "").toLowerCase();
			const authorityHost = (this.canonicalAuthorityUrlComponents.HostNameAndPort || "").toLowerCase();
			const matchesAuthorityOrigin = this.matchesAuthorityOrigin(issuerScheme, issuerHost, authorityScheme, authorityHost);
			const matchesKnownMicrosoftHost = issuerScheme === "https:" && this.isAliasOfKnownMicrosoftAuthority(issuerHost);
			const matchesRegionalMicrosoftHost = issuerScheme === "https:" && this.matchesRegionalMicrosoftHost(issuerHost);
			const matchesCiamTenantPattern = this.matchesCiamTenantPattern(issuerUrl, authorityHost, this.canonicalAuthorityUrlComponents.PathSegments);
			const matchesKnownAuthority = issuerScheme === "https:" && this.isInKnownAuthorities(issuerHost);
			if (matchesAuthorityOrigin || matchesKnownMicrosoftHost || matchesRegionalMicrosoftHost || matchesCiamTenantPattern || matchesKnownAuthority) return;
			throw createClientConfigurationError(issuerValidationFailed, this.correlationId);
		}
		/**
		* Rule 1: The issuer scheme + host (and port) match the authority's. Path
		* may differ. Applies to all authorities.
		*/
		matchesAuthorityOrigin(issuerScheme, issuerHost, authorityScheme, authorityHost) {
			return issuerScheme === authorityScheme && issuerHost === authorityHost;
		}
		/**
		* Rule 3: The issuer host is a regional variant
		* (`{region}.{host}`) of a known Microsoft authority host.
		* E.g. `westus2.login.microsoft.com`.
		*/
		matchesRegionalMicrosoftHost(issuerHost) {
			const firstDot = issuerHost.indexOf(".");
			if (firstDot > 0 && firstDot < issuerHost.length - 1) {
				const hostWithoutRegion = issuerHost.substring(firstDot + 1);
				return this.isAliasOfKnownMicrosoftAuthority(hostWithoutRegion);
			}
			return false;
		}
		/**
		* Rule 4: The issuer matches one of the well-known CIAM tenant patterns
		* (`https://{tenant}.ciamlogin.com[/{tenant}[.onmicrosoft.com][/v2.0]]`).
		*
		* The bare tenant name is extracted from the authority's first path segment
		* when available (stripping the `.onmicrosoft.com` suffix that
		* `transformCIAMAuthority` adds), or otherwise from the leftmost label of
		* the authority host (to support CIAM custom domain scenarios).
		*
		* Both `/{tenant}` and `/{tenant}.onmicrosoft.com` path forms are accepted
		* because the OIDC issuer may use either form depending on the authority URL
		* that was used to trigger discovery.
		*/
		matchesCiamTenantPattern(issuerUrl, authorityHost, authorityPathSegments) {
			const pathSegment = authorityPathSegments[0];
			const tenantName = pathSegment ? pathSegment.endsWith(AAD_TENANT_DOMAIN_SUFFIX) ? pathSegment.slice(0, -16) : pathSegment : authorityHost.split(".")[0];
			if (!tenantName) return false;
			const ciamBaseURL = `https://${tenantName}${CIAM_AUTH_URL}`;
			const validCiamPatterns = [
				ciamBaseURL,
				`${ciamBaseURL}/${tenantName}`,
				`${ciamBaseURL}/${tenantName}/v2.0`,
				`${ciamBaseURL}/${tenantName}${AAD_TENANT_DOMAIN_SUFFIX}`,
				`${ciamBaseURL}/${tenantName}${AAD_TENANT_DOMAIN_SUFFIX}/v2.0`
			];
			const issuerPath = issuerUrl.pathname.replace(/\/+$/, "");
			const normalizedIssuer = `${issuerUrl.protocol}//${issuerUrl.host}${issuerPath}`;
			return validCiamPatterns.some((pattern) => pattern === normalizedIssuer);
		}
		/**
		* Checks whether the provided host is that of a public cloud authority
		*
		* @param authority string
		* @returns bool
		*/
		static isPublicCloudAuthority(host) {
			return KNOWN_PUBLIC_CLOUDS.indexOf(host) >= 0;
		}
		/**
		* Rebuild the authority string with the region
		*
		* @param host string
		* @param region string
		*/
		static buildRegionalAuthorityString(host, region, correlationId, queryString) {
			const authorityUrlInstance = new UrlString(host, correlationId);
			authorityUrlInstance.validateAsUri();
			const authorityUrlParts = authorityUrlInstance.getUrlComponents();
			let hostNameAndPort = `${region}.${authorityUrlParts.HostNameAndPort}`;
			if (this.isPublicCloudAuthority(authorityUrlParts.HostNameAndPort)) hostNameAndPort = `${region}.${REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX}`;
			const url = UrlString.constructAuthorityUriFromObject({
				...authorityUrlInstance.getUrlComponents(),
				HostNameAndPort: hostNameAndPort
			}, correlationId).urlString;
			if (queryString) return `${url}?${queryString}`;
			return url;
		}
		/**
		* Replace the endpoints in the metadata object with their regional equivalents.
		*
		* @param metadata OpenIdConfigResponse
		* @param azureRegion string
		*/
		static replaceWithRegionalInformation(metadata, azureRegion, correlationId) {
			const regionalMetadata = { ...metadata };
			regionalMetadata.authorization_endpoint = Authority.buildRegionalAuthorityString(regionalMetadata.authorization_endpoint, azureRegion, correlationId);
			regionalMetadata.token_endpoint = Authority.buildRegionalAuthorityString(regionalMetadata.token_endpoint, azureRegion, correlationId);
			if (regionalMetadata.end_session_endpoint) regionalMetadata.end_session_endpoint = Authority.buildRegionalAuthorityString(regionalMetadata.end_session_endpoint, azureRegion, correlationId);
			return regionalMetadata;
		}
		/**
		* Transform CIAM_AUTHORIY as per the below rules:
		* If no path segments found and it is a CIAM authority (hostname ends with .ciamlogin.com), then transform it
		*
		* NOTE: The transformation path should go away once STS supports CIAM with the format: `tenantIdorDomain.ciamlogin.com`
		* `ciamlogin.com` can also change in the future and we should accommodate the same
		*
		* @param authority
		*/
		static transformCIAMAuthority(authority, correlationId) {
			let ciamAuthority = authority;
			const authorityUrlComponents = new UrlString(authority, correlationId).getUrlComponents();
			if (authorityUrlComponents.PathSegments.length === 0 && authorityUrlComponents.HostNameAndPort.endsWith(CIAM_AUTH_URL)) {
				const tenantIdOrDomain = authorityUrlComponents.HostNameAndPort.split(".")[0];
				ciamAuthority = `${ciamAuthority}${tenantIdOrDomain}${AAD_TENANT_DOMAIN_SUFFIX}`;
			}
			return ciamAuthority;
		}
	};
	Authority.reservedTenantDomains = /* @__PURE__ */ new Set([
		"{tenant}",
		"{tenantid}",
		AADAuthority.COMMON,
		AADAuthority.CONSUMERS,
		AADAuthority.ORGANIZATIONS
	]);
	/**
	* Extract tenantId from authority
	*/
	function getTenantFromAuthorityString(authority, correlationId) {
		/**
		* For credential matching purposes, tenantId is the last path segment of the authority URL:
		*  AAD Authority - domain/tenantId -> Credentials are cached with realm = tenantId
		*  B2C Authority - domain/{tenantId}?/.../policy -> Credentials are cached with realm = policy
		*  tenantId is downcased because B2C policies can have mixed case but tfp claim is downcased
		*
		* Note that we may not have any path segments in certain OIDC scenarios.
		*/
		const tenantId = new UrlString(authority, correlationId).getUrlComponents().PathSegments.slice(-1)[0]?.toLowerCase();
		switch (tenantId) {
			case AADAuthority.COMMON:
			case AADAuthority.ORGANIZATIONS:
			case AADAuthority.CONSUMERS: return;
			default: return tenantId;
		}
	}
	function formatAuthorityUri(authorityUri) {
		return authorityUri.endsWith(FORWARD_SLASH) ? authorityUri : `${authorityUri}${FORWARD_SLASH}`;
	}
	function buildStaticAuthorityOptions(authOptions) {
		const rawCloudDiscoveryMetadata = authOptions.cloudDiscoveryMetadata;
		let cloudDiscoveryMetadata = void 0;
		if (rawCloudDiscoveryMetadata) try {
			cloudDiscoveryMetadata = JSON.parse(rawCloudDiscoveryMetadata);
		} catch (e) {
			throw createClientConfigurationError(invalidCloudDiscoveryMetadata, "");
		}
		return {
			canonicalAuthority: authOptions.authority ? formatAuthorityUri(authOptions.authority) : void 0,
			knownAuthorities: authOptions.knownAuthorities,
			cloudDiscoveryMetadata
		};
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Create an authority object of the correct type based on the url
	* Performs basic authority validation - checks to see if the authority is of a valid type (i.e. aad, b2c, adfs)
	*
	* Also performs endpoint discovery.
	*
	* @param authorityUri
	* @param networkClient
	* @param cacheManager
	* @param authorityOptions
	* @param logger
	* @param correlationId
	* @param performanceClient
	* @internal
	*/
	async function createDiscoveredInstance(authorityUri, networkClient, cacheManager, authorityOptions, logger, correlationId, performanceClient) {
		const acquireTokenAuthority = new Authority(Authority.transformCIAMAuthority(formatAuthorityUri(authorityUri), correlationId), networkClient, cacheManager, authorityOptions, logger, correlationId, performanceClient);
		try {
			await invokeAsync(acquireTokenAuthority.resolveEndpointsAsync.bind(acquireTokenAuthority), AuthorityResolveEndpointsAsync, logger, performanceClient, correlationId)();
			return acquireTokenAuthority;
		} catch (e) {
			throw createClientAuthError(endpointResolutionError, correlationId);
		}
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* The ScopeSet class creates a set of scopes. Scopes are case-insensitive, unique values, so the Set object in JS makes
	* the most sense to implement for this class. All scopes are trimmed and converted to lower case strings in intersection and union functions
	* to ensure uniqueness of strings.
	*/
	var ScopeSet = class ScopeSet {
		constructor(inputScopes, correlationId) {
			this.correlationId = correlationId;
			const scopeArr = inputScopes ? StringUtils.trimArrayEntries([...inputScopes]) : [];
			const filteredInput = scopeArr ? StringUtils.removeEmptyStringsFromArray(scopeArr) : [];
			if (!filteredInput || !filteredInput.length) throw createClientConfigurationError(emptyInputScopesError, correlationId);
			this.scopes = /* @__PURE__ */ new Set();
			filteredInput.forEach((scope) => this.scopes.add(scope));
		}
		/**
		* Factory method to create ScopeSet from space-delimited string
		* @param inputScopeString
		* @param appClientId
		* @param scopesRequired
		*/
		static fromString(inputScopeString, correlationId) {
			const inputScopes = (inputScopeString || "").split(" ");
			return new ScopeSet(inputScopes, correlationId);
		}
		/**
		* Creates the set of scopes to search for in cache lookups
		* @param inputScopeString
		* @returns
		*/
		static createSearchScopes(inputScopeString, correlationId) {
			const scopesToUse = inputScopeString && inputScopeString.length > 0 ? inputScopeString : [...OIDC_DEFAULT_SCOPES];
			const scopeSet = new ScopeSet(scopesToUse, correlationId);
			if (!scopeSet.containsOnlyOIDCScopes()) scopeSet.removeOIDCScopes();
			else scopeSet.removeScope(OFFLINE_ACCESS_SCOPE);
			return scopeSet;
		}
		/**
		* Check if a given scope is present in this set of scopes.
		* @param scope
		*/
		containsScope(scope) {
			const lowerCaseScopes = this.printScopesLowerCase().split(" ");
			const lowerCaseScopesSet = new ScopeSet(lowerCaseScopes, this.correlationId);
			return scope ? lowerCaseScopesSet.scopes.has(scope.toLowerCase()) : false;
		}
		/**
		* Check if a set of scopes is present in this set of scopes.
		* @param scopeSet
		*/
		containsScopeSet(scopeSet) {
			if (!scopeSet || scopeSet.scopes.size <= 0) return false;
			return this.scopes.size >= scopeSet.scopes.size && scopeSet.asArray().every((scope) => this.containsScope(scope));
		}
		/**
		* Check if set of scopes contains only the defaults
		*/
		containsOnlyOIDCScopes() {
			let defaultScopeCount = 0;
			OIDC_SCOPES.forEach((defaultScope) => {
				if (this.containsScope(defaultScope)) defaultScopeCount += 1;
			});
			return this.scopes.size === defaultScopeCount;
		}
		/**
		* Appends single scope if passed
		* @param newScope
		*/
		appendScope(newScope) {
			if (newScope) this.scopes.add(newScope.trim());
		}
		/**
		* Appends multiple scopes if passed
		* @param newScopes
		*/
		appendScopes(newScopes) {
			try {
				newScopes.forEach((newScope) => this.appendScope(newScope));
			} catch (e) {
				throw createClientAuthError(cannotAppendScopeSet, this.correlationId);
			}
		}
		/**
		* Removes element from set of scopes.
		* @param scope
		*/
		removeScope(scope) {
			if (!scope) throw createClientAuthError(cannotRemoveEmptyScope, this.correlationId);
			this.scopes.delete(scope.trim());
		}
		/**
		* Removes default scopes from set of scopes
		* Primarily used to prevent cache misses if the default scopes are not returned from the server
		*/
		removeOIDCScopes() {
			OIDC_SCOPES.forEach((defaultScope) => {
				this.scopes.delete(defaultScope);
			});
		}
		/**
		* Combines an array of scopes with the current set of scopes.
		* @param otherScopes
		*/
		unionScopeSets(otherScopes) {
			if (!otherScopes) throw createClientAuthError(emptyInputScopeSet, this.correlationId);
			const unionScopes = /* @__PURE__ */ new Set();
			otherScopes.scopes.forEach((scope) => unionScopes.add(scope.toLowerCase()));
			this.scopes.forEach((scope) => unionScopes.add(scope.toLowerCase()));
			return unionScopes;
		}
		/**
		* Check if scopes intersect between this set and another.
		* @param otherScopes
		*/
		intersectingScopeSets(otherScopes) {
			if (!otherScopes) throw createClientAuthError(emptyInputScopeSet, this.correlationId);
			if (!otherScopes.containsOnlyOIDCScopes()) otherScopes.removeOIDCScopes();
			const unionScopes = this.unionScopeSets(otherScopes);
			const sizeOtherScopes = otherScopes.getScopeCount();
			const sizeThisScopes = this.getScopeCount();
			return unionScopes.size < sizeThisScopes + sizeOtherScopes;
		}
		/**
		* Returns size of set of scopes.
		*/
		getScopeCount() {
			return this.scopes.size;
		}
		/**
		* Returns the scopes as an array of string values
		*/
		asArray() {
			const array = [];
			this.scopes.forEach((val) => array.push(val));
			return array;
		}
		/**
		* Prints scopes into a space-delimited string
		*/
		printScopes() {
			if (this.scopes) return this.asArray().join(" ");
			return "";
		}
		/**
		* Prints scopes into a space-delimited lower-case string (used for caching)
		*/
		printScopesLowerCase() {
			return this.printScopes().toLowerCase();
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	function instrumentBrokerParams(parameters, correlationId, performanceClient) {
		if (!correlationId) return;
		const clientId = parameters.get(CLIENT_ID);
		if (clientId && parameters.has(BROKER_CLIENT_ID)) performanceClient?.addFields({
			embeddedClientId: clientId,
			embeddedRedirectUri: parameters.get(REDIRECT_URI)
		}, correlationId);
	}
	/**
	* Add the given response_type
	* @param parameters
	* @param responseType
	*/
	function addResponseType(parameters, responseType) {
		parameters.set(RESPONSE_TYPE, responseType);
	}
	/**
	* add response_mode. defaults to query.
	* @param responseMode
	*/
	function addResponseMode(parameters, responseMode) {
		parameters.set(RESPONSE_MODE, responseMode ? responseMode : ResponseMode$1.QUERY);
	}
	/**
	* add scopes. set addOidcScopes to false to prevent default scopes in non-user scenarios
	* @param scopeSet
	* @param addOidcScopes
	*/
	function addScopes(parameters, scopes, correlationId, addOidcScopes = true, defaultScopes = OIDC_DEFAULT_SCOPES) {
		if (addOidcScopes && !defaultScopes.includes("openid") && !scopes.includes("openid")) defaultScopes.push("openid");
		const scopeSet = new ScopeSet(addOidcScopes ? [...scopes || [], ...defaultScopes] : scopes || [], correlationId);
		parameters.set(SCOPE, scopeSet.printScopes());
	}
	/**
	* add clientId
	* @param clientId
	*/
	function addClientId(parameters, clientId) {
		parameters.set(CLIENT_ID, clientId);
	}
	/**
	* add redirect_uri
	* @param redirectUri
	*/
	function addRedirectUri(parameters, redirectUri) {
		parameters.set(REDIRECT_URI, redirectUri);
	}
	/**
	* add post logout redirectUri
	* @param redirectUri
	*/
	function addPostLogoutRedirectUri(parameters, redirectUri) {
		parameters.set(POST_LOGOUT_URI, redirectUri);
	}
	/**
	* add id_token_hint to logout request
	* @param idTokenHint
	*/
	function addIdTokenHint(parameters, idTokenHint) {
		parameters.set(ID_TOKEN_HINT, idTokenHint);
	}
	/**
	* add domain_hint
	* @param domainHint
	*/
	function addDomainHint(parameters, domainHint) {
		parameters.set(DOMAIN_HINT, domainHint);
	}
	/**
	* add login_hint
	* @param loginHint
	*/
	function addLoginHint(parameters, loginHint) {
		parameters.set(LOGIN_HINT, loginHint);
	}
	/**
	* Adds the CCS (Cache Credential Service) query parameter for login_hint
	* @param loginHint
	*/
	function addCcsUpn(parameters, loginHint) {
		parameters.set(HeaderNames.CCS_HEADER, `UPN:${loginHint}`);
	}
	/**
	* Adds the CCS (Cache Credential Service) query parameter for account object
	* @param loginHint
	*/
	function addCcsOid(parameters, clientInfo) {
		parameters.set(HeaderNames.CCS_HEADER, `Oid:${clientInfo.uid}@${clientInfo.utid}`);
	}
	/**
	* add sid
	* @param sid
	*/
	function addSid(parameters, sid) {
		parameters.set(SID, sid);
	}
	/**
	* Adds claims to request parameters, conditionally excluding clientCapabilities
	* when skipBrokerClaims is true and a brokered flow is in effect.
	* @param parameters - The request parameters map
	* @param correlationId - The request correlation id
	* @param claims - The claims string from the request
	* @param clientCapabilities - The client capabilities from configuration
	* @param skipBrokerClaims - When true and BROKER_CLIENT_ID is present, excludes clientCapabilities from claims
	* @param claimsToMerge - Optional client-originated claims JSON string (e.g. `claimsFromClient`) deep-merged into `claims` with precedence on conflicts
	*/
	function addClaims(parameters, correlationId, claims, clientCapabilities, skipBrokerClaims, claimsToMerge) {
		const mergedClaims = buildMergedClaims(claims, skipBrokerClaims && parameters.has(BROKER_CLIENT_ID) ? void 0 : clientCapabilities, correlationId, claimsToMerge);
		parameters.set(CLAIMS, mergedClaims);
	}
	/**
	* add correlationId
	* @param correlationId
	*/
	function addCorrelationId(parameters, correlationId) {
		parameters.set(CLIENT_REQUEST_ID, correlationId);
	}
	/**
	* add library info query params
	* @param libraryInfo
	*/
	function addLibraryInfo(parameters, libraryInfo) {
		parameters.set(X_CLIENT_SKU, libraryInfo.sku);
		parameters.set(X_CLIENT_VER, libraryInfo.version);
		if (libraryInfo.os) parameters.set(X_CLIENT_OS, libraryInfo.os);
		if (libraryInfo.cpu) parameters.set(X_CLIENT_CPU, libraryInfo.cpu);
	}
	/**
	* Add client telemetry parameters
	* @param appTelemetry
	*/
	function addApplicationTelemetry(parameters, appTelemetry) {
		if (appTelemetry?.appName) parameters.set(X_APP_NAME, appTelemetry.appName);
		if (appTelemetry?.appVersion) parameters.set(X_APP_VER, appTelemetry.appVersion);
	}
	/**
	* add prompt
	* @param prompt
	*/
	function addPrompt(parameters, prompt) {
		parameters.set(PROMPT, prompt);
	}
	/**
	* add state
	* @param state
	*/
	function addState(parameters, state) {
		if (state) parameters.set(STATE, state);
	}
	/**
	* add nonce
	* @param nonce
	*/
	function addNonce(parameters, nonce) {
		parameters.set(NONCE, nonce);
	}
	/**
	* add code_challenge and code_challenge_method
	* - throw if either of them are not passed
	* @param codeChallenge
	* @param codeChallengeMethod
	*/
	function addCodeChallengeParams(parameters, codeChallenge, codeChallengeMethod) {
		if (codeChallenge && codeChallengeMethod) {
			parameters.set(CODE_CHALLENGE, codeChallenge);
			parameters.set(CODE_CHALLENGE_METHOD, codeChallengeMethod);
		} else throw createClientConfigurationError(pkceParamsMissing, "");
	}
	/**
	* add the `authorization_code` passed by the user to exchange for a token
	* @param code
	*/
	function addAuthorizationCode(parameters, code) {
		parameters.set(CODE, code);
	}
	/**
	* add the `authorization_code` passed by the user to exchange for a token
	* @param code
	*/
	function addDeviceCode(parameters, code) {
		parameters.set(DEVICE_CODE, code);
	}
	/**
	* add the `refreshToken` passed by the user
	* @param refreshToken
	*/
	function addRefreshToken(parameters, refreshToken) {
		parameters.set(REFRESH_TOKEN, refreshToken);
	}
	/**
	* add the `code_verifier` passed by the user to exchange for a token
	* @param codeVerifier
	*/
	function addCodeVerifier(parameters, codeVerifier) {
		parameters.set(CODE_VERIFIER, codeVerifier);
	}
	/**
	* add client_secret
	* @param clientSecret
	*/
	function addClientSecret(parameters, clientSecret) {
		parameters.set(CLIENT_SECRET, clientSecret);
	}
	/**
	* add clientAssertion for confidential client flows
	* @param clientAssertion
	*/
	function addClientAssertion(parameters, clientAssertion) {
		if (clientAssertion) parameters.set(CLIENT_ASSERTION, clientAssertion);
	}
	/**
	* add clientAssertionType for confidential client flows
	* @param clientAssertionType
	*/
	function addClientAssertionType(parameters, clientAssertionType) {
		if (clientAssertionType) parameters.set(CLIENT_ASSERTION_TYPE, clientAssertionType);
	}
	/**
	* add OBO assertion for confidential client flows
	* @param clientAssertion
	*/
	function addOboAssertion(parameters, oboAssertion) {
		parameters.set(OBO_ASSERTION, oboAssertion);
	}
	/**
	* add grant type
	* @param grantType
	*/
	function addRequestTokenUse(parameters, tokenUse) {
		parameters.set(REQUESTED_TOKEN_USE, tokenUse);
	}
	/**
	* add grant type
	* @param grantType
	*/
	function addGrantType(parameters, grantType) {
		parameters.set(GRANT_TYPE, grantType);
	}
	/**
	* add client info
	*
	*/
	function addClientInfo(parameters) {
		parameters.set(CLIENT_INFO, "1");
	}
	/**
	* add clidata=1 to request to indicate client data support
	*/
	function addCliData(parameters) {
		parameters.set(CLI_DATA, "1");
	}
	function addInstanceAware(parameters) {
		if (!parameters.has(INSTANCE_AWARE)) parameters.set(INSTANCE_AWARE, "true");
	}
	/**
	* Add extraParameters
	* @param extraParams - String dictionary containing extra parameters to be added.
	*/
	function addExtraParameters(parameters, extraParams) {
		Object.entries(extraParams).forEach(([key, value]) => {
			if (!parameters.has(key) && value) parameters.set(key, value);
		});
	}
	/**
	* Default optional idToken claims requested on all auth requests.
	* signin_state enables KMSI detection; login_hint enables login hint propagation.
	*/
	var DEFAULT_ID_TOKEN_CLAIMS = {
		[ClaimsRequestKeys.SIGNIN_STATE]: { essential: false },
		[ClaimsRequestKeys.LOGIN_HINT]: { essential: false }
	};
	/**
	* Parses a claims JSON string into an object, throwing a ClientConfigurationError
	* (error code `invalid_claims`) if the value is not a valid JSON object. The raw
	* claims value is never included in the error - it may contain sensitive data.
	* @param claims - Claims JSON string. Must be valid JSON representing an object.
	* @param correlationId - The request correlation id
	* @returns The parsed claims object
	*/
	function parseClaims(claims, correlationId = "") {
		let parsed;
		try {
			parsed = JSON.parse(claims);
		} catch (e) {
			throw createClientConfigurationError(invalidClaims, correlationId);
		}
		if (!isPlainObject(parsed)) throw createClientConfigurationError(invalidClaims, correlationId);
		return parsed;
	}
	/**
	* Type guard for a non-null, non-array object (a JSON "object" value).
	* @param value - The value to test
	* @returns True when value is a plain object that can be deep-merged
	*/
	function isPlainObject(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	/**
	* Recursively deep-merges two parsed claims objects. Nested objects are merged key-by-key;
	* for any other value type (arrays, scalars, null) the value from `claimsToMerge` replaces
	* the base. This mirrors the deep merge used by msal-dotnet so that, for example, a server
	* `access_token` challenge and a client-originated `access_token` claim are combined rather
	* than one clobbering the other.
	* @param baseClaims - The parsed base claims object
	* @param claimsToMerge - The parsed claims object merged in with precedence
	* @returns The deep-merged claims object
	*/
	function deepMergeClaims(baseClaims, claimsToMerge) {
		const merged = { ...baseClaims };
		for (const [key, mergeInValue] of Object.entries(claimsToMerge)) {
			const baseValue = merged[key];
			if (isPlainObject(baseValue) && isPlainObject(mergeInValue)) merged[key] = deepMergeClaims(baseValue, mergeInValue);
			else merged[key] = mergeInValue;
		}
		return merged;
	}
	/**
	* Parses claims JSON, optionally deep-merges a second client-originated claims string
	* (`claimsToMerge`, e.g. `claimsFromClient`) with precedence on conflicting keys, merges
	* default optional idToken claims (signin_state, login_hint), and appends client
	* capabilities (xms_cc) to the access_token section.
	* Does not overwrite idToken claims already specified by the caller.
	* @param claims - Existing claims JSON string from the request (may be undefined)
	* @param clientCapabilities - Client capabilities array from configuration
	* @param correlationId - The request correlation id
	* @param claimsToMerge - Optional second claims JSON string (e.g. client-originated `claimsFromClient`)
	* deep-merged into `claims` with precedence on conflicts; parsed and validated when present. Nested
	* objects are merged recursively; arrays and scalar values are replaced.
	* @returns Merged claims JSON string
	*/
	function buildMergedClaims(claims, clientCapabilities, correlationId = "", claimsToMerge) {
		let mergedClaims = claims ? parseClaims(claims, correlationId) : {};
		if (claimsToMerge?.trim()) mergedClaims = deepMergeClaims(mergedClaims, parseClaims(claimsToMerge, correlationId));
		if (!Object.prototype.hasOwnProperty.call(mergedClaims, ClaimsRequestKeys.ID_TOKEN)) mergedClaims[ClaimsRequestKeys.ID_TOKEN] = {};
		const idTokenClaims = mergedClaims[ClaimsRequestKeys.ID_TOKEN];
		for (const [key, value] of Object.entries(DEFAULT_ID_TOKEN_CLAIMS)) if (!(key in idTokenClaims)) idTokenClaims[key] = value;
		if (clientCapabilities && clientCapabilities.length > 0) {
			if (!Object.prototype.hasOwnProperty.call(mergedClaims, ClaimsRequestKeys.ACCESS_TOKEN)) mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN] = {};
			mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN][ClaimsRequestKeys.XMS_CC] = { values: clientCapabilities };
		}
		return JSON.stringify(mergedClaims);
	}
	/**
	* adds `username` for Password Grant flow
	* @param username
	*/
	function addUsername(parameters, username) {
		parameters.set(PasswordGrantConstants.username, username);
	}
	/**
	* adds `password` for Password Grant flow
	* @param password
	*/
	function addPassword(parameters, password) {
		parameters.set(PasswordGrantConstants.password, password);
	}
	/**
	* add pop_jwk to query params
	* @param cnfString
	*/
	function addPopToken(parameters, cnfString) {
		if (cnfString) {
			parameters.set(TOKEN_TYPE, AuthenticationScheme.POP);
			parameters.set(REQ_CNF, cnfString);
		}
	}
	/**
	* add SSH JWK and key ID to query params
	*/
	function addSshJwk(parameters, sshJwkString) {
		if (sshJwkString) {
			parameters.set(TOKEN_TYPE, AuthenticationScheme.SSH);
			parameters.set(REQ_CNF, sshJwkString);
		}
	}
	/**
	* add server telemetry fields
	* @param serverTelemetryManager
	* @internal
	*/
	function addServerTelemetry(parameters, serverTelemetryManager) {
		parameters.set(X_CLIENT_CURR_TELEM, serverTelemetryManager.generateCurrentRequestHeaderValue());
		parameters.set(X_CLIENT_LAST_TELEM, serverTelemetryManager.generateLastRequestHeaderValue());
	}
	/**
	* Adds parameter that indicates to the server that throttling is supported
	*/
	function addThrottling(parameters) {
		parameters.set(X_MS_LIB_CAPABILITY, X_MS_LIB_CAPABILITY_VALUE);
	}
	/**
	* Adds logout_hint parameter for "silent" logout which prevent server account picker
	*/
	function addLogoutHint(parameters, logoutHint) {
		parameters.set(LOGOUT_HINT, logoutHint);
	}
	function addBrokerParameters(parameters, brokerClientId, brokerRedirectUri) {
		if (!parameters.has(BROKER_CLIENT_ID)) parameters.set(BROKER_CLIENT_ID, brokerClientId);
		if (!parameters.has(BROKER_REDIRECT_URI)) parameters.set(BROKER_REDIRECT_URI, brokerRedirectUri);
	}
	function addResource(parameters, resource) {
		if (resource) parameters.set(RESOURCE, resource);
	}
	/**
	* Add the `attribute_tokens` parameter to a /token request body.
	*
	* When `attributeTokens` is a non-empty array the values are sorted lexicographically and joined
	* with a single space, then written to the request body. When `attributeTokens` is an empty array
	* the parameter is deleted from the request body.
	*
	* @param parameters - request parameter map that will be serialized into the /token body
	* @param attributeTokens - caller-provided attribute token strings
	*/
	function addAttributeTokens(parameters, attributeTokens) {
		const serialized = serializeAttributeTokens(attributeTokens);
		if (serialized) parameters.set(ATTRIBUTE_TOKENS, serialized);
		else parameters.delete(ATTRIBUTE_TOKENS);
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Parses hash string from given string. Returns empty string if no hash symbol is found.
	* @param hashString
	*/
	function stripLeadingHashOrQuery(responseString) {
		if (responseString.startsWith("#/")) return responseString.substring(2);
		else if (responseString.startsWith("#") || responseString.startsWith("?")) return responseString.substring(1);
		return responseString;
	}
	/**
	* Returns URL hash as server auth code response object.
	*/
	function getDeserializedResponse(responseString) {
		if (!responseString || responseString.indexOf("=") < 0) return null;
		try {
			const normalizedResponse = stripLeadingHashOrQuery(responseString);
			const deserializedHash = Object.fromEntries(new URLSearchParams(normalizedResponse));
			if (deserializedHash.code || deserializedHash.ear_jwe || deserializedHash.error || deserializedHash.error_description || deserializedHash.state) return deserializedHash;
		} catch (e) {
			throw createClientAuthError(hashNotDeserialized, "");
		}
		return null;
	}
	/**
	* Utility to create a URL from the params map
	*/
	function mapToQueryString(parameters) {
		const queryParameterArray = new Array();
		parameters.forEach((value, key) => {
			queryParameterArray.push(`${key}=${encodeURIComponent(value)}`);
		});
		return queryParameterArray.join("&");
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Default crypto implementation used when a platform-specific implementation has
	* not been provided.
	*/
	var DEFAULT_CRYPTO_IMPLEMENTATION = {
		createNewGuid: () => {
			throw createClientAuthError(methodNotImplemented, "");
		},
		base64Decode: () => {
			throw createClientAuthError(methodNotImplemented, "");
		},
		base64Encode: () => {
			throw createClientAuthError(methodNotImplemented, "");
		},
		base64UrlEncode: () => {
			throw createClientAuthError(methodNotImplemented, "");
		},
		encodeKid: () => {
			throw createClientAuthError(methodNotImplemented, "");
		},
		async getPublicKeyThumbprint() {
			throw createClientAuthError(methodNotImplemented, "");
		},
		async removeTokenBindingKey() {
			throw createClientAuthError(methodNotImplemented, "");
		},
		async clearKeystore() {
			throw createClientAuthError(methodNotImplemented, "");
		},
		async signJwt() {
			throw createClientAuthError(methodNotImplemented, "");
		},
		async hashString() {
			throw createClientAuthError(methodNotImplemented, "");
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Log message level.
	*/
	exports.LogLevel = void 0;
	(function(LogLevel) {
		LogLevel[LogLevel["Error"] = 0] = "Error";
		LogLevel[LogLevel["Warning"] = 1] = "Warning";
		LogLevel[LogLevel["Info"] = 2] = "Info";
		LogLevel[LogLevel["Verbose"] = 3] = "Verbose";
		LogLevel[LogLevel["Trace"] = 4] = "Trace";
	})(exports.LogLevel || (exports.LogLevel = {}));
	var CACHE_CAPACITY = 50;
	var MAX_LOGS_PER_CORRELATION = 500;
	var correlationCache = /* @__PURE__ */ new Map();
	/**
	* Mark correlation ID as recently used by moving it to end of Map
	* @param correlationId
	* @param {CorrelationLogData} data
	*/
	function markAsRecentlyUsed(correlationId, data) {
		correlationCache.delete(correlationId);
		correlationCache.set(correlationId, data);
	}
	/**
	* Add log message to cache for specific correlation ID
	* @param correlationId
	* @param {LoggedMessage} loggedMessage
	*/
	function addLogToCache(correlationId, loggedMessage) {
		const currentTime = Date.now();
		let data = correlationCache.get(correlationId);
		if (data) markAsRecentlyUsed(correlationId, data);
		else {
			data = {
				logs: [],
				firstEventTime: currentTime
			};
			correlationCache.set(correlationId, data);
			if (correlationCache.size > CACHE_CAPACITY) {
				const firstKey = correlationCache.keys().next().value;
				if (firstKey !== void 0) correlationCache.delete(firstKey);
			}
		}
		data.logs.push({
			...loggedMessage,
			milliseconds: currentTime - data.firstEventTime
		});
		if (data.logs.length > MAX_LOGS_PER_CORRELATION) data.logs.shift();
	}
	/**
	* Extracts the leading minification hash from a log message, if present.
	*
	* Minified messages are produced by the logger-minify rollup plugin and are
	* either a bare 6-character alphanumeric hash, or that hash followed by a space
	* and runtime variables appended for local (console) logging, e.g.
	* "abc123 user-1 popup". Only the leading hash is returned so that telemetry
	* never captures the appended variables. Returns null when the message is not
	* a minified message.
	*/
	function getMessageHash(str) {
		if (str.length < 6) return null;
		if (str.length > 6 && str[6] !== " ") return null;
		for (let i = 0; i < 6; i++) {
			const char = str[i];
			if (!(char >= "a" && char <= "z" || char >= "A" && char <= "Z" || char >= "0" && char <= "9")) return null;
		}
		return str.substring(0, 6);
	}
	/**
	* Class which facilitates logging of messages to a specific place.
	*/
	var Logger = class Logger {
		constructor(loggerOptions, packageName, packageVersion) {
			this.level = exports.LogLevel.Info;
			const defaultLoggerCallback = () => {};
			const setLoggerOptions = loggerOptions || Logger.createDefaultLoggerOptions();
			this.localCallback = setLoggerOptions.loggerCallback || defaultLoggerCallback;
			this.piiLoggingEnabled = setLoggerOptions.piiLoggingEnabled || false;
			this.level = typeof setLoggerOptions.logLevel === "number" ? setLoggerOptions.logLevel : exports.LogLevel.Info;
			this.packageName = packageName || "";
			this.packageVersion = packageVersion || "";
		}
		static createDefaultLoggerOptions() {
			return {
				loggerCallback: () => {},
				piiLoggingEnabled: false,
				logLevel: exports.LogLevel.Info
			};
		}
		/**
		* Create new Logger with existing configurations.
		*/
		clone(packageName, packageVersion) {
			return new Logger({
				loggerCallback: this.localCallback,
				piiLoggingEnabled: this.piiLoggingEnabled,
				logLevel: this.level
			}, packageName, packageVersion);
		}
		/**
		* Log message with required options.
		*/
		logMessage(logMessage, options) {
			const correlationId = options.correlationId;
			const messageHash = getMessageHash(logMessage);
			if (messageHash) addLogToCache(correlationId, {
				hash: messageHash,
				level: options.logLevel,
				containsPii: options.containsPii || false,
				milliseconds: 0
			});
			if (options.logLevel > this.level || !this.piiLoggingEnabled && options.containsPii) return;
			const log = `${`[${(/* @__PURE__ */ new Date()).toUTCString()}] : [${correlationId}]`} : ${this.packageName}@${this.packageVersion} : ${exports.LogLevel[options.logLevel]} - ${logMessage}`;
			this.executeCallback(options.logLevel, log, options.containsPii || false);
		}
		/**
		* Execute callback with message.
		*/
		executeCallback(level, message, containsPii) {
			if (this.localCallback) this.localCallback(level, message, containsPii);
		}
		/**
		* Logs error messages.
		*/
		error(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Error,
				containsPii: false,
				correlationId
			});
		}
		/**
		* Logs error messages with PII.
		*/
		errorPii(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Error,
				containsPii: true,
				correlationId
			});
		}
		/**
		* Logs warning messages.
		*/
		warning(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Warning,
				containsPii: false,
				correlationId
			});
		}
		/**
		* Logs warning messages with PII.
		*/
		warningPii(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Warning,
				containsPii: true,
				correlationId
			});
		}
		/**
		* Logs info messages.
		*/
		info(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Info,
				containsPii: false,
				correlationId
			});
		}
		/**
		* Logs info messages with PII.
		*/
		infoPii(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Info,
				containsPii: true,
				correlationId
			});
		}
		/**
		* Logs verbose messages.
		*/
		verbose(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Verbose,
				containsPii: false,
				correlationId
			});
		}
		/**
		* Logs verbose messages with PII.
		*/
		verbosePii(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Verbose,
				containsPii: true,
				correlationId
			});
		}
		/**
		* Logs trace messages.
		*/
		trace(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Trace,
				containsPii: false,
				correlationId
			});
		}
		/**
		* Logs trace messages with PII.
		*/
		tracePii(message, correlationId) {
			this.logMessage(message, {
				logLevel: exports.LogLevel.Trace,
				containsPii: true,
				correlationId
			});
		}
		/**
		* Returns whether PII Logging is enabled or not.
		*/
		isPiiLoggingEnabled() {
			return this.piiLoggingEnabled || false;
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var name$1 = "@azure/msal-common";
	var version$1 = "16.12.0";
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var cacheQuotaExceeded = "cache_quota_exceeded";
	var cacheErrorUnknown = "cache_error_unknown";
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Error thrown when there is an error with the cache
	*/
	var CacheError = class CacheError extends Error {
		constructor(errorCode, errorMessage) {
			const message = errorMessage || getDefaultErrorMessage(errorCode);
			super(message);
			Object.setPrototypeOf(this, CacheError.prototype);
			this.name = "CacheError";
			this.errorCode = errorCode;
			this.errorMessage = message;
		}
	};
	/**
	* Helper function to wrap browser errors in a CacheError object
	* @param e
	* @returns
	*/
	function createCacheError(e) {
		if (!(e instanceof Error)) return new CacheError(cacheErrorUnknown);
		if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.message.includes("exceeded the quota")) return new CacheError(cacheQuotaExceeded);
		else return new CacheError(e.name, e.message);
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Interface class which implement cache storage functions used by MSAL to perform validity checks, and store tokens.
	* @internal
	*/
	var CacheManager = class {
		constructor(clientId, cryptoImpl, logger, performanceClient, staticAuthorityOptions) {
			this.clientId = clientId;
			this.cryptoImpl = cryptoImpl;
			this.commonLogger = logger.clone(name$1, version$1);
			this.staticAuthorityOptions = staticAuthorityOptions;
			this.performanceClient = performanceClient;
		}
		/**
		* Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
		* @param accountFilter - (Optional) filter to narrow down the accounts returned
		* @returns Array of AccountInfo objects in cache
		*/
		getAllAccounts(accountFilter = {}, correlationId) {
			return this.buildTenantProfiles(this.getAccountsFilteredBy(accountFilter, correlationId), correlationId, accountFilter);
		}
		/**
		* Gets first tenanted AccountInfo object found based on provided filters
		*/
		getAccountInfoFilteredBy(accountFilter, correlationId) {
			if (Object.keys(accountFilter).length === 0 || Object.values(accountFilter).every((value) => value === null || value === void 0 || value === "")) {
				this.commonLogger.warning("getAccountInfoFilteredBy: Account filter is empty or invalid, returning null", correlationId);
				return null;
			}
			const allAccounts = this.getAllAccounts(accountFilter, correlationId);
			if (allAccounts.length > 1) return allAccounts.sort((a, b) => {
				const aHasClaims = a.idTokenClaims ? 1 : 0;
				return (b.idTokenClaims ? 1 : 0) - aHasClaims;
			})[0];
			else if (allAccounts.length === 1) return allAccounts[0];
			else return null;
		}
		/**
		* Returns a single matching
		* @param accountFilter
		* @returns
		*/
		getBaseAccountInfo(accountFilter, correlationId) {
			const accountEntities = this.getAccountsFilteredBy(accountFilter, correlationId);
			if (accountEntities.length > 0) return getAccountInfo(accountEntities[0]);
			else return null;
		}
		/**
		* Matches filtered account entities with cached ID tokens that match the tenant profile-specific account filters
		* and builds the account info objects from the matching ID token's claims
		* @param cachedAccounts
		* @param accountFilter
		* @returns Array of AccountInfo objects that match account and tenant profile filters
		*/
		buildTenantProfiles(cachedAccounts, correlationId, accountFilter) {
			return cachedAccounts.flatMap((accountEntity) => {
				return this.getTenantProfilesFromAccountEntity(accountEntity, correlationId, accountFilter?.tenantId, accountFilter);
			});
		}
		getTenantedAccountInfoByFilter(accountInfo, tokenKeys, tenantProfile, correlationId, tenantProfileFilter) {
			let tenantedAccountInfo = null;
			let idTokenClaims;
			if (tenantProfileFilter) {
				if (!this.tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter)) return null;
			}
			const idToken = this.getIdToken(accountInfo, correlationId, tokenKeys, tenantProfile.tenantId);
			if (idToken) {
				idTokenClaims = extractTokenClaims(idToken.secret, this.cryptoImpl.base64Decode, correlationId);
				if (!this.idTokenClaimsMatchTenantProfileFilter(idTokenClaims, tenantProfileFilter)) return null;
			}
			tenantedAccountInfo = updateAccountTenantProfileData(accountInfo, tenantProfile, idTokenClaims, idToken?.secret);
			return tenantedAccountInfo;
		}
		getTenantProfilesFromAccountEntity(accountEntity, correlationId, targetTenantId, tenantProfileFilter) {
			const accountInfo = getAccountInfo(accountEntity);
			let searchTenantProfiles = accountInfo.tenantProfiles || /* @__PURE__ */ new Map();
			const tokenKeys = this.getTokenKeys();
			if (targetTenantId) {
				const tenantProfile = searchTenantProfiles.get(targetTenantId);
				if (tenantProfile) searchTenantProfiles = /* @__PURE__ */ new Map([[targetTenantId, tenantProfile]]);
				else return [];
			}
			const matchingTenantProfiles = [];
			searchTenantProfiles.forEach((tenantProfile) => {
				const tenantedAccountInfo = this.getTenantedAccountInfoByFilter(accountInfo, tokenKeys, tenantProfile, correlationId, tenantProfileFilter);
				if (tenantedAccountInfo) matchingTenantProfiles.push(tenantedAccountInfo);
			});
			return matchingTenantProfiles;
		}
		tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter) {
			if (!!tenantProfileFilter.localAccountId && !this.matchLocalAccountIdFromTenantProfile(tenantProfile, tenantProfileFilter.localAccountId)) return false;
			if (!!tenantProfileFilter.name && !(tenantProfile.name === tenantProfileFilter.name)) return false;
			if (tenantProfileFilter.isHomeTenant !== void 0 && !(tenantProfile.isHomeTenant === tenantProfileFilter.isHomeTenant)) return false;
			if (!!tenantProfileFilter.username && !this.matchUsername(tenantProfile.username, tenantProfileFilter.username) && !this.matchUsername(tenantProfile.upn, tenantProfileFilter.username)) return false;
			if (!!tenantProfileFilter.loginHint && !this.matchLoginHintWithTenantProfile(tenantProfile, tenantProfileFilter.loginHint)) return false;
			if (!!tenantProfileFilter.upn && !(tenantProfile.upn === tenantProfileFilter.upn)) return false;
			if (!!tenantProfileFilter.nativeAccountId && tenantProfile.nativeAccountId !== tenantProfileFilter.nativeAccountId) return false;
			return true;
		}
		idTokenClaimsMatchTenantProfileFilter(idTokenClaims, tenantProfileFilter) {
			if (tenantProfileFilter) {
				if (!!tenantProfileFilter.localAccountId && !this.matchLocalAccountIdFromTokenClaims(idTokenClaims, tenantProfileFilter.localAccountId)) return false;
				if (!!tenantProfileFilter.loginHint && !this.matchLoginHintFromTokenClaims(idTokenClaims, tenantProfileFilter.loginHint)) return false;
				if (!!tenantProfileFilter.username && !this.matchUsername(idTokenClaims.preferred_username, tenantProfileFilter.username) && !this.matchUsername(idTokenClaims.upn, tenantProfileFilter.username)) return false;
				if (!!tenantProfileFilter.name && !this.matchName(idTokenClaims, tenantProfileFilter.name)) return false;
				if (!!tenantProfileFilter.sid && !this.matchSid(idTokenClaims, tenantProfileFilter.sid)) return false;
			}
			return true;
		}
		/**
		* saves a cache record
		* @param cacheRecord {CacheRecord}
		* @param storeInCache {?StoreInCache}
		* @param correlationId {?string} correlation id
		*/
		async saveCacheRecord(cacheRecord, correlationId, kmsi, apiId, storeInCache) {
			if (!cacheRecord) throw createClientAuthError(invalidCacheRecord, correlationId);
			try {
				if (!!cacheRecord.account) await this.setAccount(cacheRecord.account, correlationId, kmsi, apiId);
				if (!!cacheRecord.idToken && storeInCache?.idToken !== false) await this.setIdTokenCredential(cacheRecord.idToken, correlationId, kmsi);
				if (!!cacheRecord.accessToken && storeInCache?.accessToken !== false) await this.saveAccessToken(cacheRecord.accessToken, correlationId, kmsi);
				if (!!cacheRecord.refreshToken && storeInCache?.refreshToken !== false) await this.setRefreshTokenCredential(cacheRecord.refreshToken, correlationId, kmsi);
				if (!!cacheRecord.appMetadata) this.setAppMetadata(cacheRecord.appMetadata, correlationId);
			} catch (e) {
				this.commonLogger?.error(`CacheManager.saveCacheRecord: failed`, correlationId);
				if (e instanceof AuthError) throw e;
				else throw createCacheError(e);
			}
		}
		/**
		* saves access token credential
		* @param credential - the access token entity to save
		* @param correlationId - unique identifier for the request
		* @param kmsi - keep me signed in flag
		*/
		async saveAccessToken(credential, correlationId, kmsi) {
			let additionalCacheKeyHash;
			if (credential.additionalCacheKeyComponents && Object.keys(credential.additionalCacheKeyComponents).length > 0) additionalCacheKeyHash = await this.cryptoImpl.hashString(JSON.stringify(credential.additionalCacheKeyComponents));
			const accessTokenFilter = {
				clientId: credential.clientId,
				credentialType: credential.credentialType,
				environment: credential.environment,
				homeAccountId: credential.homeAccountId,
				realm: credential.realm,
				tokenType: credential.tokenType
			};
			const tokenKeys = this.getTokenKeys();
			const currentScopes = ScopeSet.fromString(credential.target, correlationId);
			tokenKeys.accessToken.forEach((key) => {
				if (!this.accessTokenKeyMatchesFilter(key, accessTokenFilter, false)) return;
				const tokenEntity = this.getAccessTokenCredential(key, correlationId);
				if (tokenEntity && this.credentialMatchesFilter(tokenEntity, accessTokenFilter, correlationId)) {
					if (ScopeSet.fromString(tokenEntity.target, correlationId).intersectingScopeSets(currentScopes)) this.removeAccessToken(key, correlationId);
				}
			});
			await this.setAccessTokenCredential(credential, correlationId, kmsi, additionalCacheKeyHash);
		}
		/**
		* Retrieve account entities matching all provided tenant-agnostic filters; if no filter is set, get all account entities in the cache
		* Not checking for casing as keys are all generated in lower case, remember to convert to lower case if object properties are compared
		* @param accountFilter - An object containing Account properties to filter by
		*/
		getAccountsFilteredBy(accountFilter, correlationId) {
			const allAccountKeys = this.getAccountKeys();
			const matchingAccounts = [];
			allAccountKeys.forEach((cacheKey) => {
				const entity = this.getAccount(cacheKey, correlationId);
				if (!entity) return;
				if (!!accountFilter.homeAccountId && !this.matchHomeAccountId(entity, accountFilter.homeAccountId)) return;
				if (!!accountFilter.environment && !this.matchEnvironment(entity, accountFilter.environment, correlationId)) return;
				if (!!accountFilter.realm && !this.matchRealm(entity, accountFilter.realm)) return;
				if (!!accountFilter.authorityType && !this.matchAuthorityType(entity, accountFilter.authorityType)) return;
				const tenantProfileFilter = {
					localAccountId: accountFilter?.localAccountId,
					name: accountFilter?.name,
					username: accountFilter?.username,
					loginHint: accountFilter?.loginHint,
					upn: accountFilter?.upn,
					nativeAccountId: accountFilter?.nativeAccountId
				};
				const matchingTenantProfiles = entity.tenantProfiles?.filter((tenantProfile) => {
					return this.tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter);
				});
				if (matchingTenantProfiles && matchingTenantProfiles.length === 0) return;
				matchingAccounts.push(entity);
			});
			return matchingAccounts;
		}
		/**
		* Returns whether or not the given credential entity matches the filter
		* @param entity
		* @param filter
		* @param correlationId
		* @returns
		*/
		credentialMatchesFilter(entity, filter, correlationId) {
			if (!!filter.clientId && !this.matchClientId(entity, filter.clientId)) return false;
			if (!!filter.userAssertionHash && !this.matchUserAssertionHash(entity, filter.userAssertionHash)) return false;
			if (typeof filter.homeAccountId === "string" && !this.matchHomeAccountId(entity, filter.homeAccountId)) return false;
			if (!!filter.environment && !this.matchEnvironment(entity, filter.environment, correlationId)) return false;
			if (!!filter.realm && !this.matchRealm(entity, filter.realm)) return false;
			if (!!filter.credentialType && !this.matchCredentialType(entity, filter.credentialType)) return false;
			if (!!filter.familyId && !this.matchFamilyId(entity, filter.familyId)) return false;
			if (!!filter.target && !this.matchTarget(entity, filter.target, correlationId)) return false;
			if (entity.credentialType === CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME) {
				if (!!filter.tokenType && !this.matchTokenType(entity, filter.tokenType)) return false;
				if (filter.tokenType === AuthenticationScheme.SSH) {
					if (filter.keyId && !this.matchKeyId(entity, filter.keyId)) return false;
				}
			}
			const entityComponents = entity.additionalCacheKeyComponents;
			const filterComponents = filter.additionalCacheKeyComponents;
			const entityHasComponents = !!entityComponents && Object.keys(entityComponents).length > 0;
			const filterHasComponents = !!filterComponents && Object.keys(filterComponents).length > 0;
			if (entityHasComponents !== filterHasComponents) return false;
			if (entityHasComponents && filterHasComponents) {
				const entityKeys = Object.keys(entityComponents).sort();
				const filterKeys = Object.keys(filterComponents).sort();
				if (entityKeys.length !== filterKeys.length) return false;
				for (let i = 0; i < entityKeys.length; i++) if (entityKeys[i] !== filterKeys[i] || entityComponents[entityKeys[i]] !== filterComponents[filterKeys[i]]) return false;
			}
			return true;
		}
		/**
		* retrieve appMetadata matching all provided filters; if no filter is set, get all appMetadata
		* @param filter
		* @param correlationId
		*/
		getAppMetadataFilteredBy(filter, correlationId) {
			const allCacheKeys = this.getKeys();
			const matchingAppMetadata = {};
			allCacheKeys.forEach((cacheKey) => {
				if (!this.isAppMetadata(cacheKey)) return;
				const entity = this.getAppMetadata(cacheKey, correlationId);
				if (!entity) return;
				if (!!filter.environment && !this.matchEnvironment(entity, filter.environment, correlationId)) return;
				if (!!filter.clientId && !this.matchClientId(entity, filter.clientId)) return;
				matchingAppMetadata[cacheKey] = entity;
			});
			return matchingAppMetadata;
		}
		/**
		* retrieve authorityMetadata that contains a matching alias
		* @param host
		* @param correlationId
		*/
		getAuthorityMetadataByAlias(host, correlationId) {
			const allCacheKeys = this.getAuthorityMetadataKeys();
			let matchedEntity = null;
			allCacheKeys.forEach((cacheKey) => {
				if (!this.isAuthorityMetadata(cacheKey) || cacheKey.indexOf(this.clientId) === -1) return;
				const entity = this.getAuthorityMetadata(cacheKey, correlationId);
				if (!entity) return;
				if (entity.aliases.indexOf(host) === -1) return;
				matchedEntity = entity;
			});
			return matchedEntity;
		}
		/**
		* Removes all accounts and related tokens from cache.
		*/
		removeAllAccounts(correlationId) {
			this.getAllAccounts({}, correlationId).forEach((account) => {
				this.removeAccount(account, correlationId);
			});
		}
		/**
		* Removes the account and related tokens for a given account key
		* @param account
		*/
		removeAccount(account, correlationId) {
			this.removeAccountContext(account, correlationId);
			const accountKeys = this.getAccountKeys();
			const keyFilter = (key) => {
				return key.includes(account.homeAccountId) && key.includes(account.environment);
			};
			accountKeys.filter(keyFilter).forEach((key) => {
				this.removeItem(key, correlationId);
				this.performanceClient.incrementFields({ accountsRemoved: 1 }, correlationId);
			});
		}
		/**
		* Removes credentials associated with the provided account
		* @param account
		*/
		removeAccountContext(account, correlationId) {
			const allTokenKeys = this.getTokenKeys();
			const keyFilter = (key) => {
				return key.includes(account.homeAccountId) && key.includes(account.environment);
			};
			allTokenKeys.idToken.filter(keyFilter).forEach((key) => {
				this.removeIdToken(key, correlationId);
			});
			allTokenKeys.accessToken.filter(keyFilter).forEach((key) => {
				this.removeAccessToken(key, correlationId);
			});
			allTokenKeys.refreshToken.filter(keyFilter).forEach((key) => {
				this.removeRefreshToken(key, correlationId);
			});
		}
		/**
		* returns a boolean if the given credential is removed
		* @param key
		* @param correlationId
		*/
		removeAccessToken(key, correlationId) {
			const credential = this.getAccessTokenCredential(key, correlationId);
			if (!credential) return;
			this.removeItem(key, correlationId);
			this.performanceClient.incrementFields({ accessTokensRemoved: 1 }, correlationId);
			if (credential.credentialType.toLowerCase() === CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME.toLowerCase()) {
				if (credential.tokenType === AuthenticationScheme.POP) {
					const kid = credential.keyId;
					if (kid) this.cryptoImpl.removeTokenBindingKey(kid, correlationId).catch(() => {
						this.commonLogger.error(`Failed to remove token binding key '${kid}'`, correlationId);
						this.performanceClient?.incrementFields({ removeTokenBindingKeyFailure: 1 }, correlationId);
					});
				}
			}
		}
		/**
		* Removes all app metadata objects from cache.
		*/
		removeAppMetadata(correlationId) {
			this.getKeys().forEach((cacheKey) => {
				if (this.isAppMetadata(cacheKey)) this.removeItem(cacheKey, correlationId);
			});
			return true;
		}
		/**
		* Retrieve IdTokenEntity from cache
		* @param account {AccountInfo}
		* @param tokenKeys {?TokenKeys}
		* @param targetRealm {?string}
		* @param performanceClient {?IPerformanceClient}
		* @param correlationId {?string}
		*/
		getIdToken(account, correlationId, tokenKeys, targetRealm) {
			this.commonLogger.trace("CacheManager - getIdToken called", correlationId);
			const idTokenFilter = {
				homeAccountId: account.homeAccountId,
				environment: account.environment,
				credentialType: CredentialType.ID_TOKEN,
				clientId: this.clientId,
				realm: targetRealm
			};
			const idTokenMap = this.getIdTokensByFilter(idTokenFilter, correlationId, tokenKeys);
			const numIdTokens = idTokenMap.size;
			if (numIdTokens < 1) {
				this.commonLogger.info("CacheManager:getIdToken - No token found", correlationId);
				return null;
			} else if (numIdTokens > 1) {
				let tokensToBeRemoved = idTokenMap;
				if (!targetRealm) {
					const homeIdTokenMap = /* @__PURE__ */ new Map();
					idTokenMap.forEach((idToken, key) => {
						if (idToken.realm === account.tenantId) homeIdTokenMap.set(key, idToken);
					});
					const numHomeIdTokens = homeIdTokenMap.size;
					if (numHomeIdTokens < 1) {
						this.commonLogger.info("CacheManager:getIdToken - Multiple ID tokens found for account but none match account entity tenant id, returning first result", correlationId);
						return idTokenMap.values().next().value ?? null;
					} else if (numHomeIdTokens === 1) {
						this.commonLogger.info("CacheManager:getIdToken - Multiple ID tokens found for account, defaulting to home tenant profile", correlationId);
						return homeIdTokenMap.values().next().value ?? null;
					} else tokensToBeRemoved = homeIdTokenMap;
				}
				this.commonLogger.info("CacheManager:getIdToken - Multiple matching ID tokens found, clearing them", correlationId);
				tokensToBeRemoved.forEach((idToken, key) => {
					this.removeIdToken(key, correlationId);
				});
				this.performanceClient.addFields({ multiMatchedID: idTokenMap.size }, correlationId);
				return null;
			}
			this.commonLogger.info("CacheManager:getIdToken - Returning ID token", correlationId);
			return idTokenMap.values().next().value ?? null;
		}
		/**
		* Gets all idTokens matching the given filter
		* @param filter
		* @returns
		*/
		getIdTokensByFilter(filter, correlationId, tokenKeys) {
			const idTokenKeys = tokenKeys && tokenKeys.idToken || this.getTokenKeys().idToken;
			const idTokens = /* @__PURE__ */ new Map();
			idTokenKeys.forEach((key) => {
				if (!this.idTokenKeyMatchesFilter(key, {
					clientId: this.clientId,
					...filter
				})) return;
				const idToken = this.getIdTokenCredential(key, correlationId);
				if (idToken && this.credentialMatchesFilter(idToken, filter, correlationId)) idTokens.set(key, idToken);
			});
			return idTokens;
		}
		/**
		* Validate the cache key against filter before retrieving and parsing cache value
		* @param key
		* @param filter
		* @returns
		*/
		idTokenKeyMatchesFilter(inputKey, filter) {
			const key = inputKey.toLowerCase();
			if (filter.clientId && key.indexOf(filter.clientId.toLowerCase()) === -1) return false;
			if (filter.homeAccountId && key.indexOf(filter.homeAccountId.toLowerCase()) === -1) return false;
			return true;
		}
		/**
		* Removes idToken from the cache
		* @param key
		*/
		removeIdToken(key, correlationId) {
			this.removeItem(key, correlationId);
		}
		/**
		* Removes refresh token from the cache
		* @param key
		*/
		removeRefreshToken(key, correlationId) {
			this.removeItem(key, correlationId);
		}
		/**
		* Retrieve AccessTokenEntity from cache
		* @param account {AccountInfo}
		* @param request {BaseAuthRequest}
		* @param tokenKeys {?TokenKeys}
		* @param performanceClient {?IPerformanceClient}
		*/
		getAccessToken(account, request, tokenKeys, targetRealm) {
			const correlationId = request.correlationId;
			this.commonLogger.trace("CacheManager - getAccessToken called", correlationId);
			const scopes = ScopeSet.createSearchScopes(request.scopes, correlationId);
			const authScheme = request.authenticationScheme || AuthenticationScheme.BEARER;
			const credentialType = authScheme.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase() ? CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME : CredentialType.ACCESS_TOKEN;
			const attributeTokenPartition = serializeAttributeTokens(request.attributeTokens);
			const additionalCacheKeyComponents = attributeTokenPartition ? { attribute_tokens: attributeTokenPartition } : void 0;
			const accessTokenFilter = {
				homeAccountId: account.homeAccountId,
				environment: account.environment,
				credentialType,
				clientId: this.clientId,
				realm: targetRealm || account.tenantId,
				target: scopes,
				tokenType: authScheme,
				keyId: request.sshKid,
				additionalCacheKeyComponents
			};
			const accessTokenKeys = tokenKeys && tokenKeys.accessToken || this.getTokenKeys().accessToken;
			const accessTokens = [];
			const matchedKeys = [];
			accessTokenKeys.forEach((key) => {
				if (this.accessTokenKeyMatchesFilter(key, accessTokenFilter, true)) {
					const accessToken = this.getAccessTokenCredential(key, correlationId);
					if (accessToken && this.credentialMatchesFilter(accessToken, accessTokenFilter, correlationId)) {
						accessTokens.push(accessToken);
						matchedKeys.push(key);
					}
				}
			});
			if (accessTokens.length < 1) {
				this.commonLogger.info("CacheManager:getAccessToken - No token found", correlationId);
				return null;
			} else if (accessTokens.length > 1) {
				this.commonLogger.info("CacheManager:getAccessToken - Multiple access tokens found, clearing them", correlationId);
				matchedKeys.forEach((key) => {
					this.removeAccessToken(key, correlationId);
				});
				this.performanceClient.addFields({ multiMatchedAT: accessTokens.length }, correlationId);
				return null;
			}
			this.commonLogger.info("CacheManager:getAccessToken - Returning access token", correlationId);
			return accessTokens[0];
		}
		/**
		* Validate the cache key against filter before retrieving and parsing cache value
		* @param key
		* @param filter
		* @param keyMustContainAllScopes
		* @returns
		*/
		accessTokenKeyMatchesFilter(inputKey, filter, keyMustContainAllScopes) {
			const key = inputKey.toLowerCase();
			if (filter.clientId && key.indexOf(filter.clientId.toLowerCase()) === -1) return false;
			if (filter.homeAccountId && key.indexOf(filter.homeAccountId.toLowerCase()) === -1) return false;
			if (filter.realm && key.indexOf(filter.realm.toLowerCase()) === -1) return false;
			if (filter.target) {
				const scopes = filter.target.asArray();
				for (let i = 0; i < scopes.length; i++) if (keyMustContainAllScopes && !key.includes(scopes[i].toLowerCase())) return false;
				else if (!keyMustContainAllScopes && key.includes(scopes[i].toLowerCase())) return true;
			}
			return true;
		}
		/**
		* Gets all access tokens matching the filter
		* @param filter
		* @returns
		*/
		getAccessTokensByFilter(filter, correlationId) {
			const tokenKeys = this.getTokenKeys();
			const accessTokens = [];
			tokenKeys.accessToken.forEach((key) => {
				if (!this.accessTokenKeyMatchesFilter(key, filter, true)) return;
				const accessToken = this.getAccessTokenCredential(key, correlationId);
				if (accessToken && this.credentialMatchesFilter(accessToken, filter, correlationId)) accessTokens.push(accessToken);
			});
			return accessTokens;
		}
		/**
		* Helper to retrieve the appropriate refresh token from cache
		* @param account {AccountInfo}
		* @param familyRT {boolean}
		* @param tokenKeys {?TokenKeys}
		* @param performanceClient {?IPerformanceClient}
		* @param correlationId {?string}
		*/
		getRefreshToken(account, familyRT, correlationId, tokenKeys) {
			this.commonLogger.trace("CacheManager - getRefreshToken called", correlationId);
			const id = familyRT ? THE_FAMILY_ID : void 0;
			const refreshTokenFilter = {
				homeAccountId: account.homeAccountId,
				environment: account.environment,
				credentialType: CredentialType.REFRESH_TOKEN,
				clientId: this.clientId,
				familyId: id
			};
			const refreshTokenKeys = tokenKeys && tokenKeys.refreshToken || this.getTokenKeys().refreshToken;
			const refreshTokens = [];
			refreshTokenKeys.forEach((key) => {
				if (this.refreshTokenKeyMatchesFilter(key, refreshTokenFilter)) {
					const refreshToken = this.getRefreshTokenCredential(key, correlationId);
					if (refreshToken && this.credentialMatchesFilter(refreshToken, refreshTokenFilter, correlationId)) refreshTokens.push(refreshToken);
				}
			});
			const numRefreshTokens = refreshTokens.length;
			if (numRefreshTokens < 1) {
				this.commonLogger.info("CacheManager:getRefreshToken - No refresh token found.", correlationId);
				return null;
			}
			if (numRefreshTokens > 1) this.performanceClient.addFields({ multiMatchedRT: numRefreshTokens }, correlationId);
			this.commonLogger.info("CacheManager:getRefreshToken - returning refresh token", correlationId);
			return refreshTokens[0];
		}
		/**
		* Validate the cache key against filter before retrieving and parsing cache value
		* @param key
		* @param filter
		*/
		refreshTokenKeyMatchesFilter(inputKey, filter) {
			const key = inputKey.toLowerCase();
			if (filter.familyId && key.indexOf(filter.familyId.toLowerCase()) === -1) return false;
			if (!filter.familyId && filter.clientId && key.indexOf(filter.clientId.toLowerCase()) === -1) return false;
			if (filter.homeAccountId && key.indexOf(filter.homeAccountId.toLowerCase()) === -1) return false;
			return true;
		}
		/**
		* Retrieve AppMetadataEntity from cache
		*/
		readAppMetadataFromCache(environment, correlationId) {
			const appMetadataFilter = {
				environment,
				clientId: this.clientId
			};
			const appMetadata = this.getAppMetadataFilteredBy(appMetadataFilter, correlationId);
			const appMetadataEntries = Object.keys(appMetadata).map((key) => appMetadata[key]);
			const numAppMetadata = appMetadataEntries.length;
			if (numAppMetadata < 1) return null;
			else if (numAppMetadata > 1) throw createClientAuthError(multipleMatchingAppMetadata, correlationId);
			return appMetadataEntries[0];
		}
		/**
		* Return the family_id value associated  with FOCI
		* @param environment
		* @param clientId
		*/
		isAppMetadataFOCI(environment, correlationId) {
			const appMetadata = this.readAppMetadataFromCache(environment, correlationId);
			return !!(appMetadata && appMetadata.familyId === THE_FAMILY_ID);
		}
		/**
		* helper to match account ids
		* @param value
		* @param homeAccountId
		*/
		matchHomeAccountId(entity, homeAccountId) {
			return !!(typeof entity.homeAccountId === "string" && homeAccountId === entity.homeAccountId);
		}
		/**
		* helper to match account ids
		* @param entity
		* @param localAccountId
		* @returns
		*/
		matchLocalAccountIdFromTokenClaims(tokenClaims, localAccountId) {
			return localAccountId === (tokenClaims.oid || tokenClaims.sub);
		}
		matchLocalAccountIdFromTenantProfile(tenantProfile, localAccountId) {
			return tenantProfile.localAccountId === localAccountId;
		}
		/**
		* helper to match names
		* @param entity
		* @param name
		* @returns true if the downcased name properties are present and match in the filter and the entity
		*/
		matchName(claims, name) {
			return !!(name.toLowerCase() === claims.name?.toLowerCase());
		}
		/**
		* helper to match usernames
		* @param entity
		* @param username
		* @returns
		*/
		matchUsername(cachedUsername, filterUsername) {
			return !!(cachedUsername && typeof cachedUsername === "string" && filterUsername?.toLowerCase() === cachedUsername.toLowerCase());
		}
		/**
		* helper to match loginhints
		* @param entity
		* @param loginHint
		* @returns
		*/
		matchLoginHintWithTenantProfile(tenantProfile, loginHintFilter) {
			return tenantProfile.loginHint === loginHintFilter || tenantProfile.username === loginHintFilter || tenantProfile.upn === loginHintFilter;
		}
		/**
		* helper to match assertion
		* @param value
		* @param oboAssertion
		*/
		matchUserAssertionHash(entity, userAssertionHash) {
			return !!(entity.userAssertionHash && userAssertionHash === entity.userAssertionHash);
		}
		/**
		* helper to match environment
		* @param value
		* @param environment
		*/
		matchEnvironment(entity, environment, correlationId) {
			if (this.staticAuthorityOptions) {
				const staticAliases = getAliasesFromStaticSources(this.staticAuthorityOptions, this.commonLogger, correlationId);
				if (staticAliases.includes(environment) && staticAliases.includes(entity.environment)) return true;
			}
			const cloudMetadata = this.getAuthorityMetadataByAlias(environment, correlationId);
			if (cloudMetadata && cloudMetadata.aliases.indexOf(entity.environment) > -1) return true;
			return false;
		}
		/**
		* helper to match credential type
		* @param entity
		* @param credentialType
		*/
		matchCredentialType(entity, credentialType) {
			return entity.credentialType && credentialType.toLowerCase() === entity.credentialType.toLowerCase();
		}
		/**
		* helper to match client ids
		* @param entity
		* @param clientId
		*/
		matchClientId(entity, clientId) {
			return !!(entity.clientId && clientId === entity.clientId);
		}
		/**
		* helper to match family ids
		* @param entity
		* @param familyId
		*/
		matchFamilyId(entity, familyId) {
			return !!(entity.familyId && familyId === entity.familyId);
		}
		/**
		* helper to match realm
		* @param entity
		* @param realm
		*/
		matchRealm(entity, realm) {
			return !!(entity.realm?.toLowerCase() === realm.toLowerCase());
		}
		/**
		* helper to match loginHint which can be either:
		* 1. login_hint ID token claim
		* 2. username in cached account object
		* 3. upn in ID token claims
		* @param entity
		* @param loginHint
		* @returns
		*/
		matchLoginHintFromTokenClaims(tokenClaims, loginHint) {
			if (tokenClaims.login_hint === loginHint) return true;
			if (tokenClaims.preferred_username === loginHint) return true;
			if (tokenClaims.upn === loginHint) return true;
			if (tokenClaims.emails && tokenClaims.emails.includes(loginHint)) return true;
			return false;
		}
		/**
		* Helper to match sid
		* @param entity
		* @param sid
		* @returns true if the sid claim is present and matches the filter
		*/
		matchSid(idTokenClaims, sid) {
			return idTokenClaims.sid === sid;
		}
		matchAuthorityType(entity, authorityType) {
			return !!(entity.authorityType && authorityType.toLowerCase() === entity.authorityType.toLowerCase());
		}
		/**
		* Returns true if the target scopes are a subset of the current entity's scopes, false otherwise.
		* @param entity
		* @param target
		*/
		matchTarget(entity, target, correlationId) {
			if (entity.credentialType !== CredentialType.ACCESS_TOKEN && entity.credentialType !== CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME || !entity.target) return false;
			return ScopeSet.fromString(entity.target, correlationId).containsScopeSet(target);
		}
		/**
		* Returns true if the credential's tokenType or Authentication Scheme matches the one in the request, false otherwise
		* @param entity
		* @param tokenType
		*/
		matchTokenType(entity, tokenType) {
			return !!(entity.tokenType && entity.tokenType === tokenType);
		}
		/**
		* Returns true if the credential's keyId matches the one in the request, false otherwise
		* @param entity
		* @param keyId
		*/
		matchKeyId(entity, keyId) {
			return !!(entity.keyId && entity.keyId === keyId);
		}
		/**
		* returns if a given cache entity is of the type appmetadata
		* @param key
		*/
		isAppMetadata(key) {
			return key.indexOf(APP_METADATA) !== -1;
		}
		/**
		* returns if a given cache entity is of the type authoritymetadata
		* @param key
		*/
		isAuthorityMetadata(key) {
			return key.indexOf(AUTHORITY_METADATA_CACHE_KEY) !== -1;
		}
		/**
		* returns cache key used for cloud instance metadata
		*/
		generateAuthorityMetadataCacheKey(authority) {
			return `${AUTHORITY_METADATA_CACHE_KEY}-${this.clientId}-${authority}`;
		}
		/**
		* Helper to convert serialized data to object
		* @param obj
		* @param json
		*/
		static toObject(obj, json) {
			for (const propertyName in json) obj[propertyName] = json[propertyName];
			return obj;
		}
	};
	/** @internal */
	var DefaultStorageClass = class extends CacheManager {
		async setAccount() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getAccount() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		async setIdTokenCredential() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getIdTokenCredential() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		async setAccessTokenCredential() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getAccessTokenCredential() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		async setRefreshTokenCredential() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getRefreshTokenCredential() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		setAppMetadata() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getAppMetadata() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		setServerTelemetry() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getServerTelemetry() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		setAuthorityMetadata() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getAuthorityMetadata() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getAuthorityMetadataKeys() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		setThrottlingCache() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getThrottlingCache() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		removeItem() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getKeys() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getAccountKeys() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		getTokenKeys() {
			throw createClientAuthError(methodNotImplemented, "");
		}
		generateCredentialKey(_credential, _hash) {
			throw createClientAuthError(methodNotImplemented, "");
		}
		generateAccountKey() {
			throw createClientAuthError(methodNotImplemented, "");
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* State of the performance event.
	*
	* @export
	* @enum {number}
	*/
	var PerformanceEventStatus = { InProgress: 1 };
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var StubPerformanceClient = class {
		generateId() {
			return "callback-id";
		}
		startMeasurement(measureName, correlationId) {
			return {
				end: () => null,
				discard: () => {},
				add: () => {},
				increment: () => {},
				event: {
					eventId: this.generateId(),
					status: PerformanceEventStatus.InProgress,
					authority: "",
					libraryName: "",
					libraryVersion: "",
					clientId: "",
					name: measureName,
					startTimeMs: Date.now(),
					correlationId: correlationId || ""
				}
			};
		}
		endMeasurement() {
			return null;
		}
		discardMeasurements() {}
		removePerformanceCallback() {
			return true;
		}
		addPerformanceCallback() {
			return "";
		}
		emitEvents() {}
		addFields() {}
		addGlobalFields() {}
		incrementFields() {}
		cacheEventByCorrelationId() {}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var DEFAULT_SYSTEM_OPTIONS$1 = {
		tokenRenewalOffsetSeconds: DEFAULT_TOKEN_RENEWAL_OFFSET_SEC,
		preventCorsPreflight: false
	};
	var DEFAULT_LOGGER_IMPLEMENTATION = {
		loggerCallback: () => {},
		piiLoggingEnabled: false,
		logLevel: exports.LogLevel.Info,
		correlationId: ""
	};
	var DEFAULT_NETWORK_IMPLEMENTATION = {
		async sendGetRequestAsync() {
			throw createClientAuthError(methodNotImplemented, "");
		},
		async sendPostRequestAsync() {
			throw createClientAuthError(methodNotImplemented, "");
		}
	};
	var DEFAULT_LIBRARY_INFO = {
		sku: SKU,
		version: version$1,
		cpu: "",
		os: ""
	};
	var DEFAULT_CLIENT_CREDENTIALS = {
		clientSecret: "",
		clientAssertion: void 0
	};
	var DEFAULT_AZURE_CLOUD_OPTIONS = {
		azureCloudInstance: AzureCloudInstance.None,
		tenant: `${DEFAULT_COMMON_TENANT}`
	};
	var DEFAULT_TELEMETRY_OPTIONS$1 = { application: {
		appName: "",
		appVersion: ""
	} };
	/**
	* Function that sets the default options when not explicitly configured from app developer
	*
	* @param Configuration
	*
	* @returns Configuration
	* @internal
	*/
	function buildClientConfiguration({ authOptions: userAuthOptions, systemOptions: userSystemOptions, loggerOptions: userLoggerOption, storageInterface: storageImplementation, networkInterface: networkImplementation, cryptoInterface: cryptoImplementation, clientCredentials, libraryInfo, telemetry, serverTelemetryManager, persistencePlugin, serializableCache }) {
		const loggerOptions = {
			...DEFAULT_LOGGER_IMPLEMENTATION,
			...userLoggerOption
		};
		return {
			authOptions: buildAuthOptions(userAuthOptions),
			systemOptions: {
				...DEFAULT_SYSTEM_OPTIONS$1,
				...userSystemOptions
			},
			loggerOptions,
			storageInterface: storageImplementation || new DefaultStorageClass(userAuthOptions.clientId, DEFAULT_CRYPTO_IMPLEMENTATION, new Logger(loggerOptions, name$1, version$1), new StubPerformanceClient()),
			networkInterface: networkImplementation || DEFAULT_NETWORK_IMPLEMENTATION,
			cryptoInterface: cryptoImplementation || DEFAULT_CRYPTO_IMPLEMENTATION,
			clientCredentials: clientCredentials || DEFAULT_CLIENT_CREDENTIALS,
			libraryInfo: {
				...DEFAULT_LIBRARY_INFO,
				...libraryInfo
			},
			telemetry: {
				...DEFAULT_TELEMETRY_OPTIONS$1,
				...telemetry
			},
			serverTelemetryManager: serverTelemetryManager || null,
			persistencePlugin: persistencePlugin || null,
			serializableCache: serializableCache || null
		};
	}
	/**
	* Construct authoptions from the client and platform passed values
	* @param authOptions
	*/
	function buildAuthOptions(authOptions) {
		return {
			clientCapabilities: [],
			azureCloudOptions: DEFAULT_AZURE_CLOUD_OPTIONS,
			instanceAware: false,
			isMcp: false,
			...authOptions
		};
	}
	/**
	* Returns true if config has protocolMode set to ProtocolMode.OIDC, false otherwise
	* @param ClientConfiguration
	*/
	function isOidcProtocolMode(config) {
		return config.authOptions.authority.options.protocolMode === ProtocolMode.OIDC;
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* This class instance helps track the memory changes facilitating
	* decisions to read from and write to the persistent cache
	*/ var TokenCacheContext = class {
		constructor(tokenCache, hasChanged) {
			this.cache = tokenCache;
			this.hasChanged = hasChanged;
		}
		/**
		* boolean which indicates the changes in cache
		*/
		get cacheHasChanged() {
			return this.hasChanged;
		}
		/**
		* function to retrieve the token cache
		*/
		get tokenCache() {
			return this.cache;
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var KeyLocation = { SW: "sw" };
	/** @internal */
	var PopTokenGenerator = class {
		constructor(cryptoUtils, performanceClient) {
			this.cryptoUtils = cryptoUtils;
			this.performanceClient = performanceClient;
		}
		/**
		* Generates the req_cnf validated at the RP in the POP protocol for SHR parameters
		* and returns an object containing the keyid, the full req_cnf string and the req_cnf string hash
		* @param request
		* @returns
		*/
		async generateCnf(request, logger) {
			const reqCnf = await invokeAsync(this.generateKid.bind(this), PopTokenGenerateCnf, logger, this.performanceClient, request.correlationId)(request);
			const reqCnfString = this.cryptoUtils.base64UrlEncode(JSON.stringify(reqCnf));
			return {
				kid: reqCnf.kid,
				reqCnfString
			};
		}
		/**
		* Generates key_id for a SHR token request
		* @param request
		* @returns
		*/
		async generateKid(request) {
			return {
				kid: await this.cryptoUtils.getPublicKeyThumbprint(request),
				xms_ksl: KeyLocation.SW
			};
		}
		/**
		* Signs the POP access_token with the local generated key-pair
		* @param accessToken
		* @param request
		* @returns
		*/
		async signPopToken(accessToken, keyId, request) {
			return this.signPayload(accessToken, keyId, request);
		}
		/**
		* Utility function to generate the signed JWT for an access_token
		* @param payload
		* @param kid
		* @param request
		* @param claims
		* @returns
		*/
		async signPayload(payload, keyId, request, claims) {
			const { resourceRequestMethod, resourceRequestUri, shrClaims, shrNonce, shrOptions } = request;
			const resourceUrlComponents = (resourceRequestUri ? new UrlString(resourceRequestUri, request.correlationId) : void 0)?.getUrlComponents();
			return this.cryptoUtils.signJwt({
				at: payload,
				ts: nowSeconds(),
				m: resourceRequestMethod?.toUpperCase(),
				u: resourceUrlComponents?.HostNameAndPort,
				nonce: shrNonce || this.cryptoUtils.createNewGuid(),
				p: resourceUrlComponents?.AbsolutePath,
				q: resourceUrlComponents?.QueryString ? [[], resourceUrlComponents.QueryString] : void 0,
				client_claims: shrClaims || void 0,
				...claims
			}, keyId, shrOptions, request.correlationId);
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* MSAL-defined interaction required error code indicating no tokens are found in cache.
	* @public
	*/
	var noTokensFound = "no_tokens_found";
	/**
	* MSAL-defined error code indicating a native account is unavailable on the platform.
	* @public
	*/
	var nativeAccountUnavailable = "native_account_unavailable";
	/**
	* MSAL-defined error code indicating the refresh token has expired and user interaction is needed.
	* @public
	*/
	var refreshTokenExpired = "refresh_token_expired";
	/**
	* MSAL-defined error code indicating UI/UX is not allowed (e.g., blocked by policy), requiring alternate interaction.
	* @public
	*/
	var uiNotAllowed = "ui_not_allowed";
	/**
	* Server-originated error code indicating interaction is required to complete the request.
	* @public
	*/
	var interactionRequired = "interaction_required";
	/**
	* Server-originated error code indicating user consent is required.
	* @public
	*/
	var consentRequired = "consent_required";
	/**
	* Server-originated error code indicating user login is required.
	* @public
	*/
	var loginRequired = "login_required";
	/**
	* Server-originated error code indicating the token is invalid or corrupted.
	* @public
	*/
	var badToken = "bad_token";
	/**
	* Server-originated error code indicating the user is in an interrupted state and interaction is required.
	* @public
	*/
	var interruptedUser = "interrupted_user";
	var InteractionRequiredAuthErrorCodes = /*#__PURE__*/ Object.freeze({
		__proto__: null,
		badToken,
		consentRequired,
		interactionRequired,
		interruptedUser,
		loginRequired,
		nativeAccountUnavailable,
		noTokensFound,
		refreshTokenExpired,
		uiNotAllowed
	});
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* InteractionRequiredServerErrorMessage contains string constants used by error codes and messages returned by the server indicating interaction is required
	*/
	var InteractionRequiredServerErrorMessage = [
		interactionRequired,
		consentRequired,
		loginRequired,
		badToken,
		uiNotAllowed,
		interruptedUser
	];
	var InteractionRequiredAuthSubErrorMessage = [
		"message_only",
		"additional_action",
		"basic_action",
		"user_password_expired",
		"consent_required",
		"bad_token",
		"ui_not_allowed",
		"interrupted_user"
	];
	/**
	* Error thrown when user interaction is required.
	*/
	var InteractionRequiredAuthError = class InteractionRequiredAuthError extends AuthError {
		constructor(errorCode, correlationId, errorMessage, subError, timestamp, traceId, claims, errorNo) {
			super(errorCode, correlationId, errorMessage, subError);
			Object.setPrototypeOf(this, InteractionRequiredAuthError.prototype);
			this.timestamp = timestamp || "";
			this.traceId = traceId || "";
			this.claims = claims || "";
			this.name = "InteractionRequiredAuthError";
			this.errorNo = errorNo;
		}
	};
	/**
	* Helper function used to determine if an error thrown by the server requires interaction to resolve
	* @param errorCode
	* @param errorString
	* @param subError
	*/
	function isInteractionRequiredError(errorCode, errorString, subError) {
		const isInteractionRequiredErrorCode = !!errorCode && InteractionRequiredServerErrorMessage.indexOf(errorCode) > -1;
		const isInteractionRequiredSubError = !!subError && InteractionRequiredAuthSubErrorMessage.indexOf(subError) > -1;
		const isInteractionRequiredErrorDesc = !!errorString && InteractionRequiredServerErrorMessage.some((irErrorCode) => {
			return errorString.indexOf(irErrorCode) > -1;
		});
		return isInteractionRequiredErrorCode || isInteractionRequiredErrorDesc || isInteractionRequiredSubError;
	}
	/**
	* Creates an InteractionRequiredAuthError
	*/
	function createInteractionRequiredAuthError(errorCode, correlationId, errorMessage) {
		return new InteractionRequiredAuthError(errorCode, correlationId, errorMessage);
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Error thrown when there is an error with the server code, for example, unavailability.
	*/
	var ServerError = class ServerError extends AuthError {
		constructor(errorCode, correlationId, errorMessage, subError, errorNo, status) {
			super(errorCode, correlationId, errorMessage, subError);
			this.name = "ServerError";
			this.errorNo = errorNo;
			this.status = status;
			Object.setPrototypeOf(this, ServerError.prototype);
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Parses the state into the RequestStateObject, which contains the LibraryState info and the state passed by the user.
	* @param base64Decode
	* @param state
	* @param correlationId
	*/
	function parseRequestState(base64Decode, state, correlationId) {
		if (!base64Decode) throw createClientAuthError(noCryptoObject, correlationId);
		if (!state) throw createClientAuthError(invalidState, correlationId);
		try {
			const splitState = state.split(RESOURCE_DELIM);
			const libraryState = splitState[0];
			const userState = splitState.length > 1 ? splitState.slice(1).join(RESOURCE_DELIM) : "";
			const libraryStateString = base64Decode(libraryState);
			const libraryStateObj = JSON.parse(libraryStateString);
			return {
				userRequestState: userState || "",
				libraryState: libraryStateObj
			};
		} catch (e) {
			throw createClientAuthError(invalidState, correlationId);
		}
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Class that handles response parsing.
	* @internal
	*/
	var ResponseHandler = class ResponseHandler {
		constructor(clientId, cacheStorage, cryptoObj, logger, performanceClient, serializableCache, persistencePlugin) {
			this.clientId = clientId;
			this.cacheStorage = cacheStorage;
			this.cryptoObj = cryptoObj;
			this.logger = logger;
			this.performanceClient = performanceClient;
			this.serializableCache = serializableCache;
			this.persistencePlugin = persistencePlugin;
		}
		/**
		* Function which validates server authorization token response.
		* @param serverResponse
		* @param correlationId
		* @param refreshAccessToken
		*/
		validateTokenResponse(serverResponse, correlationId, refreshAccessToken) {
			if (serverResponse.error || serverResponse.error_description || serverResponse.suberror) {
				const errString = `Error(s): ${serverResponse.error_codes || NOT_AVAILABLE} - Timestamp: ${serverResponse.timestamp || NOT_AVAILABLE} - Description: ${serverResponse.error_description || NOT_AVAILABLE} - Correlation ID: ${serverResponse.correlation_id || NOT_AVAILABLE} - Trace ID: ${serverResponse.trace_id || NOT_AVAILABLE}`;
				const serverErrorNo = serverResponse.error_codes?.length ? serverResponse.error_codes[0] : void 0;
				const serverError = new ServerError(serverResponse.error || "", serverResponse.correlation_id || "", errString, serverResponse.suberror, serverErrorNo, serverResponse.status);
				if (refreshAccessToken && serverResponse.status && serverResponse.status >= HTTP_SERVER_ERROR_RANGE_START && serverResponse.status <= HTTP_SERVER_ERROR_RANGE_END) {
					this.logger.warning(`executeTokenRequest:validateTokenResponse - AAD is currently unavailable and the access token is unable to be refreshed.\n${serverError}`, correlationId);
					return;
				} else if (refreshAccessToken && serverResponse.status && serverResponse.status >= HTTP_CLIENT_ERROR_RANGE_START && serverResponse.status <= HTTP_CLIENT_ERROR_RANGE_END) {
					this.logger.warning(`executeTokenRequest:validateTokenResponse - AAD is currently available but is unable to refresh the access token.\n${serverError}`, correlationId);
					return;
				}
				if (isInteractionRequiredError(serverResponse.error, serverResponse.error_description, serverResponse.suberror)) throw new InteractionRequiredAuthError(serverResponse.error || "", serverResponse.correlation_id || "", serverResponse.error_description, serverResponse.suberror, serverResponse.timestamp || "", serverResponse.trace_id || "", serverResponse.claims || "", serverErrorNo);
				throw serverError;
			}
		}
		/**
		* Returns a constructed token response based on given string. Also manages the cache updates and cleanups.
		* @param serverTokenResponse
		* @param authority
		*/
		async handleServerTokenResponse(serverTokenResponse, authority, reqTimestamp, request, apiId, authCodePayload, userAssertionHash, handlingRefreshTokenResponse, forceCacheRefreshTokenResponse, serverRequestId, additionalCacheKeyComponents) {
			let idTokenClaims;
			if (serverTokenResponse.id_token) {
				idTokenClaims = extractTokenClaims(serverTokenResponse.id_token || "", this.cryptoObj.base64Decode, request.correlationId);
				if (authCodePayload && authCodePayload.nonce) {
					if (idTokenClaims.nonce !== authCodePayload.nonce) throw createClientAuthError(nonceMismatch, request.correlationId);
				}
			}
			this.homeAccountIdentifier = generateHomeAccountId(serverTokenResponse.client_info || "", authority.authorityType, this.logger, this.cryptoObj, request.correlationId, idTokenClaims);
			let requestStateObj;
			if (!!authCodePayload && !!authCodePayload.state) requestStateObj = parseRequestState(this.cryptoObj.base64Decode, authCodePayload.state, request.correlationId);
			serverTokenResponse.key_id = serverTokenResponse.key_id || request.sshKid || void 0;
			const attributeTokenPartition = serializeAttributeTokens(request.attributeTokens);
			const cacheKeyComponents = additionalCacheKeyComponents ?? (attributeTokenPartition ? { attribute_tokens: attributeTokenPartition } : void 0);
			const cacheRecord = this.generateCacheRecord(serverTokenResponse, authority, reqTimestamp, request, idTokenClaims, userAssertionHash, authCodePayload, cacheKeyComponents);
			let cacheContext;
			try {
				if (this.persistencePlugin && this.serializableCache) {
					this.logger.verbose("Persistence enabled, calling beforeCacheAccess", request.correlationId);
					cacheContext = new TokenCacheContext(this.serializableCache, true);
					await this.persistencePlugin.beforeCacheAccess(cacheContext);
				}
				if (handlingRefreshTokenResponse && !forceCacheRefreshTokenResponse && cacheRecord.account) {
					if (this.cacheStorage.getAllAccounts({
						homeAccountId: cacheRecord.account.homeAccountId,
						environment: cacheRecord.account.environment
					}, request.correlationId).length < 1) {
						this.logger.warning("Account used to refresh tokens not in persistence, refreshed tokens will not be stored in the cache", request.correlationId);
						this.performanceClient?.addFields({ acntLoggedOut: true }, request.correlationId);
						return await ResponseHandler.generateAuthenticationResult(this.cryptoObj, authority, cacheRecord, false, request, this.performanceClient, idTokenClaims, requestStateObj, void 0, serverRequestId);
					}
				}
				await this.cacheStorage.saveCacheRecord(cacheRecord, request.correlationId, isKmsi(idTokenClaims || {}), apiId, request.storeInCache);
			} finally {
				if (this.persistencePlugin && this.serializableCache && cacheContext) {
					this.logger.verbose("Persistence enabled, calling afterCacheAccess", request.correlationId);
					await this.persistencePlugin.afterCacheAccess(cacheContext);
				}
			}
			return ResponseHandler.generateAuthenticationResult(this.cryptoObj, authority, cacheRecord, false, request, this.performanceClient, idTokenClaims, requestStateObj, serverTokenResponse, serverRequestId);
		}
		/**
		* Generates CacheRecord
		* @param serverTokenResponse
		* @param idTokenObj
		* @param authority
		*/
		generateCacheRecord(serverTokenResponse, authority, reqTimestamp, request, idTokenClaims, userAssertionHash, authCodePayload, additionalCacheKeyComponents) {
			const env = authority.getPreferredCache();
			if (!env) throw createClientAuthError(invalidCacheEnvironment, request.correlationId);
			const claimsTenantId = getTenantIdFromIdTokenClaims(idTokenClaims);
			let cachedIdToken;
			let cachedAccount;
			if (serverTokenResponse.id_token && !!idTokenClaims) {
				cachedIdToken = createIdTokenEntity(this.homeAccountIdentifier, env, serverTokenResponse.id_token, this.clientId, claimsTenantId || "");
				cachedAccount = buildAccountToCache(this.cacheStorage, authority, this.homeAccountIdentifier, this.cryptoObj.base64Decode, request.correlationId, idTokenClaims, serverTokenResponse.client_info, env, claimsTenantId, authCodePayload, void 0, this.logger, this.performanceClient);
			}
			let cachedAccessToken = null;
			if (serverTokenResponse.access_token) {
				const responseScopes = serverTokenResponse.scope ? ScopeSet.fromString(serverTokenResponse.scope, request.correlationId) : new ScopeSet(request.scopes || [], request.correlationId);
				const expiresIn = (typeof serverTokenResponse.expires_in === "string" ? parseInt(serverTokenResponse.expires_in, 10) : serverTokenResponse.expires_in) || 0;
				const extExpiresIn = (typeof serverTokenResponse.ext_expires_in === "string" ? parseInt(serverTokenResponse.ext_expires_in, 10) : serverTokenResponse.ext_expires_in) || 0;
				const refreshIn = (typeof serverTokenResponse.refresh_in === "string" ? parseInt(serverTokenResponse.refresh_in, 10) : serverTokenResponse.refresh_in) || void 0;
				const tokenExpirationSeconds = reqTimestamp + expiresIn;
				const extendedTokenExpirationSeconds = tokenExpirationSeconds + extExpiresIn;
				const refreshOnSeconds = refreshIn && refreshIn > 0 ? reqTimestamp + refreshIn : void 0;
				cachedAccessToken = createAccessTokenEntity(this.homeAccountIdentifier, env, serverTokenResponse.access_token, this.clientId, claimsTenantId || authority.tenant || "", responseScopes.printScopes(), tokenExpirationSeconds, extendedTokenExpirationSeconds, this.cryptoObj.base64Decode, request.correlationId, refreshOnSeconds, serverTokenResponse.token_type, userAssertionHash, serverTokenResponse.key_id, additionalCacheKeyComponents);
				const resource = request.resource || null;
				if (resource) cachedAccessToken.resource = resource;
			}
			let cachedRefreshToken = null;
			if (serverTokenResponse.refresh_token) {
				let rtExpiresOn;
				if (serverTokenResponse.refresh_token_expires_in) {
					rtExpiresOn = reqTimestamp + (typeof serverTokenResponse.refresh_token_expires_in === "string" ? parseInt(serverTokenResponse.refresh_token_expires_in, 10) : serverTokenResponse.refresh_token_expires_in);
					this.performanceClient?.addFields({ ntwkRtExpiresOnSeconds: rtExpiresOn }, request.correlationId);
				}
				cachedRefreshToken = createRefreshTokenEntity(this.homeAccountIdentifier, env, serverTokenResponse.refresh_token, this.clientId, serverTokenResponse.foci, userAssertionHash, rtExpiresOn);
			}
			let cachedAppMetadata = null;
			if (serverTokenResponse.foci) cachedAppMetadata = {
				clientId: this.clientId,
				environment: env,
				familyId: serverTokenResponse.foci
			};
			return {
				account: cachedAccount,
				idToken: cachedIdToken,
				accessToken: cachedAccessToken,
				refreshToken: cachedRefreshToken,
				appMetadata: cachedAppMetadata
			};
		}
		/**
		* Creates an @AuthenticationResult from @CacheRecord , @IdToken , and a boolean that states whether or not the result is from cache.
		*
		* Optionally takes a state string that is set as-is in the response.
		*
		* @param cacheRecord
		* @param idTokenObj
		* @param fromTokenCache
		* @param stateString
		*/
		static async generateAuthenticationResult(cryptoObj, authority, cacheRecord, fromTokenCache, request, performanceClient, idTokenClaims, requestState, serverTokenResponse, requestId) {
			let accessToken = "";
			let responseScopes = [];
			let expiresOn = null;
			let extExpiresOn;
			let refreshOn;
			let familyId = "";
			if (cacheRecord.accessToken) {
				if (cacheRecord.accessToken.tokenType === AuthenticationScheme.POP && !request.popKid) {
					const popTokenGenerator = new PopTokenGenerator(cryptoObj, performanceClient);
					const { secret, keyId } = cacheRecord.accessToken;
					if (!keyId) throw createClientAuthError(keyIdMissing, request.correlationId);
					accessToken = await popTokenGenerator.signPopToken(secret, keyId, request);
				} else accessToken = cacheRecord.accessToken.secret;
				responseScopes = ScopeSet.fromString(cacheRecord.accessToken.target, request.correlationId).asArray();
				expiresOn = toDateFromSeconds(cacheRecord.accessToken.expiresOn);
				extExpiresOn = toDateFromSeconds(cacheRecord.accessToken.extendedExpiresOn);
				if (cacheRecord.accessToken.refreshOn) refreshOn = toDateFromSeconds(cacheRecord.accessToken.refreshOn);
			}
			if (cacheRecord.appMetadata) familyId = cacheRecord.appMetadata.familyId === THE_FAMILY_ID ? THE_FAMILY_ID : "";
			const uid = idTokenClaims?.oid || idTokenClaims?.sub || "";
			const tid = idTokenClaims?.tid || "";
			if (serverTokenResponse?.spa_accountid && !!cacheRecord.account) {
				cacheRecord.account.nativeAccountId = serverTokenResponse?.spa_accountid;
				const targetTenantId = tid || cacheRecord.account.realm;
				if (cacheRecord.account.tenantProfiles) {
					const matchingProfile = cacheRecord.account.tenantProfiles.find((tp) => tp.tenantId === targetTenantId);
					if (matchingProfile) matchingProfile.nativeAccountId = serverTokenResponse.spa_accountid;
				}
			}
			const accountInfo = cacheRecord.account ? updateAccountTenantProfileData(getAccountInfo(cacheRecord.account), void 0, idTokenClaims, cacheRecord.idToken?.secret) : null;
			return {
				authority: authority.canonicalAuthority,
				uniqueId: uid,
				tenantId: tid,
				scopes: responseScopes,
				account: accountInfo,
				idToken: cacheRecord?.idToken?.secret || "",
				idTokenClaims: idTokenClaims || {},
				accessToken,
				fromCache: fromTokenCache,
				expiresOn,
				extExpiresOn,
				refreshOn,
				correlationId: request.correlationId,
				requestId: requestId || "",
				familyId,
				tokenType: cacheRecord.accessToken?.tokenType || "",
				state: requestState ? requestState.userRequestState : "",
				cloudGraphHostName: cacheRecord.account?.cloudGraphHostName || "",
				msGraphHost: cacheRecord.account?.msGraphHost || "",
				code: serverTokenResponse?.spa_code,
				fromPlatformBroker: false
			};
		}
	};
	/** @internal */
	function buildAccountToCache(cacheStorage, authority, homeAccountId, base64Decode, correlationId, idTokenClaims, clientInfo, environment, claimsTenantId, authCodePayload, nativeAccountId, logger, performanceClient) {
		logger?.verbose("setCachedAccount called", correlationId);
		const accountEnvironment = environment || authority.getPreferredCache();
		const matchedAccounts = cacheStorage.getAccountsFilteredBy({
			homeAccountId,
			environment: accountEnvironment
		}, correlationId);
		performanceClient?.addFields({ cacheMatchedAccounts: matchedAccounts.length }, correlationId);
		if (matchedAccounts.length > 1) logger?.warning("Multiple base accounts matched homeAccountId. Ignoring cached account and creating a new base account.", correlationId);
		const baseAccount = (matchedAccounts.length === 1 ? matchedAccounts[0] : null) || createAccountEntity({
			homeAccountId,
			idTokenClaims,
			clientInfo,
			environment,
			cloudGraphHostName: authCodePayload?.cloud_graph_host_name,
			msGraphHost: authCodePayload?.msgraph_host,
			nativeAccountId
		}, authority, correlationId, base64Decode);
		const tenantProfiles = baseAccount.tenantProfiles || [];
		const tenantId = claimsTenantId || baseAccount.realm;
		if (tenantId && !tenantProfiles.find((tenantProfile) => {
			return tenantProfile.tenantId === tenantId;
		})) {
			const newTenantProfile = buildTenantProfile(homeAccountId, baseAccount.localAccountId, tenantId, nativeAccountId, idTokenClaims);
			tenantProfiles.push(newTenantProfile);
		}
		baseAccount.tenantProfiles = tenantProfiles;
		return baseAccount;
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var CcsCredentialType = {
		HOME_ACCOUNT_ID: "home_account_id",
		UPN: "UPN"
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	async function getClientAssertion(clientAssertion, clientId, tokenEndpoint, fmiPath) {
		if (typeof clientAssertion === "string") return clientAssertion;
		else return clientAssertion({
			clientId,
			tokenEndpoint,
			fmiPath
		});
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	function getRequestThumbprint(clientId, request, homeAccountId) {
		return {
			clientId,
			authority: request.authority,
			scopes: request.scopes,
			homeAccountIdentifier: homeAccountId,
			claims: request.claims,
			authenticationScheme: request.authenticationScheme,
			resourceRequestMethod: request.resourceRequestMethod,
			resourceRequestUri: request.resourceRequestUri,
			shrClaims: request.shrClaims,
			sshKid: request.sshKid,
			embeddedClientId: request.embeddedClientId || request.extraParameters?.clientId,
			resource: request.resource,
			attributeTokens: serializeAttributeTokens(request.attributeTokens)
		};
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/** @internal */
	var ThrottlingUtils = class ThrottlingUtils {
		/**
		* Prepares a RequestThumbprint to be stored as a key.
		* @param thumbprint
		*/
		static generateThrottlingStorageKey(thumbprint) {
			return `${THROTTLING_PREFIX}.${JSON.stringify(thumbprint)}`;
		}
		/**
		* Performs necessary throttling checks before a network request.
		* @param cacheManager
		* @param thumbprint
		*/
		static preProcess(cacheManager, thumbprint, correlationId) {
			const key = ThrottlingUtils.generateThrottlingStorageKey(thumbprint);
			const value = cacheManager.getThrottlingCache(key, correlationId);
			if (value) {
				if (value.throttleTime < Date.now()) {
					cacheManager.removeItem(key, correlationId);
					return;
				}
				throw new ServerError(value.errorCodes?.join(" ") || "", correlationId, value.errorMessage, value.subError);
			}
		}
		/**
		* Performs necessary throttling checks after a network request.
		* @param cacheManager
		* @param thumbprint
		* @param response
		*/
		static postProcess(cacheManager, thumbprint, response, correlationId) {
			if (ThrottlingUtils.checkResponseStatus(response) || ThrottlingUtils.checkResponseForRetryAfter(response)) {
				const thumbprintValue = {
					throttleTime: ThrottlingUtils.calculateThrottleTime(parseInt(response.headers[HeaderNames.RETRY_AFTER])),
					error: response.body.error,
					errorCodes: response.body.error_codes,
					errorMessage: response.body.error_description,
					subError: response.body.suberror
				};
				cacheManager.setThrottlingCache(ThrottlingUtils.generateThrottlingStorageKey(thumbprint), thumbprintValue, correlationId);
			}
		}
		/**
		* Checks a NetworkResponse object's status codes against 429 or 5xx
		* @param response
		*/
		static checkResponseStatus(response) {
			return response.status === 429 || response.status >= 500 && response.status < 600;
		}
		/**
		* Checks a NetworkResponse object's RetryAfter header
		* @param response
		*/
		static checkResponseForRetryAfter(response) {
			if (response.headers) return response.headers.hasOwnProperty(HeaderNames.RETRY_AFTER) && (response.status < 200 || response.status >= 300);
			return false;
		}
		/**
		* Calculates the Unix-time value for a throttle to expire given throttleTime in seconds.
		* @param throttleTime
		*/
		static calculateThrottleTime(throttleTime) {
			const time = throttleTime <= 0 ? 0 : throttleTime;
			const currentSeconds = Date.now() / 1e3;
			return Math.floor(Math.min(currentSeconds + (time || DEFAULT_THROTTLE_TIME_SECONDS), currentSeconds + DEFAULT_MAX_THROTTLE_TIME_SECONDS) * 1e3);
		}
		static removeThrottle(cacheManager, clientId, request, homeAccountIdentifier) {
			const thumbprint = getRequestThumbprint(clientId, request, homeAccountIdentifier);
			const key = this.generateThrottlingStorageKey(thumbprint);
			cacheManager.removeItem(key, request.correlationId);
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Represents network related errors
	*/
	var NetworkError = class NetworkError extends AuthError {
		constructor(error, httpStatus, responseHeaders) {
			super(error.errorCode, error.correlationId, error.errorMessage, error.subError);
			Object.setPrototypeOf(this, NetworkError.prototype);
			this.name = "NetworkError";
			this.error = error;
			this.httpStatus = httpStatus;
			this.responseHeaders = responseHeaders;
		}
	};
	/**
	* Creates NetworkError object for a failed network request
	* @param error - Error to be thrown back to the caller
	* @param httpStatus - Status code of the network request
	* @param responseHeaders - Response headers of the network request, when available
	* @returns NetworkError object
	*/
	function createNetworkError(error, httpStatus, responseHeaders, additionalError) {
		error.errorMessage = `${error.errorMessage}, additionalErrorInfo: error.name:${additionalError?.name}, error.message:${additionalError?.message}`;
		return new NetworkError(error, httpStatus, responseHeaders);
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Creates default headers for requests to token endpoint
	*/
	function createTokenRequestHeaders(logger, preventCorsPreflight, ccsCred) {
		const headers = {};
		headers[HeaderNames.CONTENT_TYPE] = URL_FORM_CONTENT_TYPE;
		if (!preventCorsPreflight && ccsCred) switch (ccsCred.type) {
			case CcsCredentialType.HOME_ACCOUNT_ID:
				try {
					const clientInfo = buildClientInfoFromHomeAccountId(ccsCred.credential);
					headers[HeaderNames.CCS_HEADER] = `Oid:${clientInfo.uid}@${clientInfo.utid}`;
				} catch (e) {
					logger.verbose(`Could not parse home account ID for CCS Header: '${e}'`, "");
				}
				break;
			case CcsCredentialType.UPN: headers[HeaderNames.CCS_HEADER] = `UPN: ${ccsCred.credential}`;
		}
		return headers;
	}
	/**
	* Creates query string for the /token request
	* @param request
	*/
	function createTokenQueryParameters(request, clientId, redirectUri, performanceClient) {
		const parameters = /* @__PURE__ */ new Map();
		if (request.embeddedClientId) addBrokerParameters(parameters, clientId, redirectUri);
		if (request.extraQueryParameters) addExtraParameters(parameters, request.extraQueryParameters);
		addCorrelationId(parameters, request.correlationId);
		instrumentBrokerParams(parameters, request.correlationId, performanceClient);
		return mapToQueryString(parameters);
	}
	/**
	* Http post to token endpoint
	* @param tokenEndpoint
	* @param queryString
	* @param headers
	* @param thumbprint
	* @internal
	*/
	async function executePostToTokenEndpoint(tokenEndpoint, queryString, headers, thumbprint, correlationId, cacheManager, networkClient, logger, performanceClient, serverTelemetryManager) {
		const response = await sendPostRequest(thumbprint, tokenEndpoint, {
			body: queryString,
			headers
		}, correlationId, cacheManager, networkClient, logger, performanceClient);
		if (serverTelemetryManager && response.status < 500 && response.status !== 429) serverTelemetryManager.clearTelemetryCache();
		return response;
	}
	/**
	* Wraps sendPostRequestAsync with necessary preflight and postflight logic
	* @param thumbprint - Request thumbprint for throttling
	* @param tokenEndpoint - Endpoint to make the POST to
	* @param options - Body and Headers to include on the POST request
	* @param correlationId - CorrelationId for telemetry
	* @param cacheManager - Cache manager instance
	* @param networkClient - Network module instance
	* @param logger - Logger instance
	* @param performanceClient - Performance client instance
	* @internal
	*/
	async function sendPostRequest(thumbprint, tokenEndpoint, options, correlationId, cacheManager, networkClient, logger, performanceClient) {
		ThrottlingUtils.preProcess(cacheManager, thumbprint, correlationId);
		let response;
		try {
			response = await invokeAsync(networkClient.sendPostRequestAsync.bind(networkClient), NetworkClientSendPostRequestAsync, logger, performanceClient, correlationId)(tokenEndpoint, {
				...options,
				correlationId,
				performanceClient
			});
			const responseHeaders = response.headers || {};
			performanceClient?.addFields({
				refreshTokenSize: response.body.refresh_token?.length || 0,
				httpVerToken: responseHeaders[HeaderNames.X_MS_HTTP_VERSION] || "",
				requestId: responseHeaders[HeaderNames.X_MS_REQUEST_ID] || ""
			}, correlationId);
		} catch (e) {
			if (e instanceof NetworkError) {
				const responseHeaders = e.responseHeaders;
				if (responseHeaders) performanceClient?.addFields({
					httpVerToken: responseHeaders[HeaderNames.X_MS_HTTP_VERSION] || "",
					requestId: responseHeaders[HeaderNames.X_MS_REQUEST_ID] || "",
					contentTypeHeader: responseHeaders[HeaderNames.CONTENT_TYPE] || void 0,
					contentLengthHeader: responseHeaders[HeaderNames.CONTENT_LENGTH] || void 0,
					httpStatus: e.httpStatus
				}, correlationId);
				throw e.error;
			}
			if (e instanceof AuthError) throw e;
			else throw createClientAuthError(networkError, correlationId);
		}
		ThrottlingUtils.postProcess(cacheManager, thumbprint, response, correlationId);
		return response;
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Oauth2.0 Authorization Code client
	* @internal
	*/
	var AuthorizationCodeClient = class {
		constructor(configuration, performanceClient) {
			this.includeRedirectUri = true;
			this.config = buildClientConfiguration(configuration);
			this.logger = new Logger(this.config.loggerOptions, name$1, version$1);
			this.cryptoUtils = this.config.cryptoInterface;
			this.cacheManager = this.config.storageInterface;
			this.networkClient = this.config.networkInterface;
			this.serverTelemetryManager = this.config.serverTelemetryManager;
			this.authority = this.config.authOptions.authority;
			this.performanceClient = performanceClient;
			this.oidcDefaultScopes = this.config.authOptions.authority.options.OIDCOptions?.defaultScopes;
		}
		/**
		* API to acquire a token in exchange of 'authorization_code` acquired by the user in the first leg of the
		* authorization_code_grant
		* @param request
		*/
		async acquireToken(request, apiId, authCodePayload) {
			if (!request.code) throw createClientAuthError(requestCannotBeMade, request.correlationId);
			if (authCodePayload && authCodePayload.cloud_instance_host_name) await invokeAsync(this.updateTokenEndpointAuthority.bind(this), UpdateTokenEndpointAuthority, this.logger, this.performanceClient, request.correlationId)(authCodePayload.cloud_instance_host_name, request.correlationId);
			const reqTimestamp = nowSeconds();
			const response = await invokeAsync(this.executeTokenRequest.bind(this), AuthClientExecuteTokenRequest, this.logger, this.performanceClient, request.correlationId)(this.authority, request, this.serverTelemetryManager);
			const requestId = response.headers?.[HeaderNames.X_MS_REQUEST_ID];
			const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.performanceClient, this.config.serializableCache, this.config.persistencePlugin);
			responseHandler.validateTokenResponse(response.body, request.correlationId);
			return invokeAsync(responseHandler.handleServerTokenResponse.bind(responseHandler), HandleServerTokenResponse, this.logger, this.performanceClient, request.correlationId)(response.body, this.authority, reqTimestamp, request, apiId, authCodePayload, void 0, void 0, void 0, requestId);
		}
		/**
		* Used to log out the current user, and redirect the user to the postLogoutRedirectUri.
		* Default behaviour is to redirect the user to `window.location.href`.
		* @param authorityUri
		*/
		getLogoutUri(logoutRequest) {
			if (!logoutRequest) throw createClientConfigurationError(logoutRequestEmpty, "");
			const queryString = this.createLogoutUrlQueryString(logoutRequest);
			return UrlString.appendQueryString(this.authority.endSessionEndpoint, queryString);
		}
		/**
		* Executes POST request to token endpoint
		* @param authority
		* @param request
		*/
		async executeTokenRequest(authority, request, serverTelemetryManager) {
			const queryParametersString = createTokenQueryParameters(request, this.config.authOptions.clientId, this.config.authOptions.redirectUri, this.performanceClient);
			const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
			const requestBody = await invokeAsync(this.createTokenRequestBody.bind(this), AuthClientCreateTokenRequestBody, this.logger, this.performanceClient, request.correlationId)(request);
			let ccsCredential = void 0;
			if (request.clientInfo) try {
				const clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
				ccsCredential = {
					credential: `${clientInfo.uid}${CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
					type: CcsCredentialType.HOME_ACCOUNT_ID
				};
			} catch (e) {
				this.logger.verbose(`Could not parse client info for CCS Header: '${e}'`, request.correlationId);
			}
			const headers = createTokenRequestHeaders(this.logger, this.config.systemOptions.preventCorsPreflight, ccsCredential || request.ccsCredential);
			const thumbprint = getRequestThumbprint(this.config.authOptions.clientId, request);
			return invokeAsync(executePostToTokenEndpoint, AuthorizationCodeClientExecutePostToTokenEndpoint, this.logger, this.performanceClient, request.correlationId)(endpoint, requestBody, headers, thumbprint, request.correlationId, this.cacheManager, this.networkClient, this.logger, this.performanceClient, serverTelemetryManager);
		}
		/**
		* Generates a map for all the params to be sent to the service
		* @param request
		*/
		async createTokenRequestBody(request) {
			const parameters = /* @__PURE__ */ new Map();
			addClientId(parameters, request.embeddedClientId || request.extraParameters?.[CLIENT_ID] || this.config.authOptions.clientId);
			if (!this.includeRedirectUri) {
				if (!request.redirectUri) throw createClientConfigurationError(redirectUriEmpty, request.correlationId);
			} else addRedirectUri(parameters, request.redirectUri);
			addScopes(parameters, request.scopes, request.correlationId, true, this.oidcDefaultScopes);
			addResource(parameters, request.resource);
			if (request.attributeTokens) addAttributeTokens(parameters, request.attributeTokens);
			this.performanceClient?.addFields({ hasAttributeTokens: !!request.attributeTokens?.length }, request.correlationId);
			addAuthorizationCode(parameters, request.code);
			addLibraryInfo(parameters, this.config.libraryInfo);
			addApplicationTelemetry(parameters, this.config.telemetry.application);
			addThrottling(parameters);
			if (this.serverTelemetryManager && !isOidcProtocolMode(this.config)) addServerTelemetry(parameters, this.serverTelemetryManager);
			if (request.codeVerifier) addCodeVerifier(parameters, request.codeVerifier);
			if (this.config.clientCredentials.clientSecret) addClientSecret(parameters, this.config.clientCredentials.clientSecret);
			if (this.config.clientCredentials.clientAssertion) {
				const clientAssertion = this.config.clientCredentials.clientAssertion;
				addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
				addClientAssertionType(parameters, clientAssertion.assertionType);
			}
			addGrantType(parameters, GrantType.AUTHORIZATION_CODE_GRANT);
			addClientInfo(parameters);
			if (request.authenticationScheme === AuthenticationScheme.POP) {
				const popTokenGenerator = new PopTokenGenerator(this.cryptoUtils, this.performanceClient);
				let reqCnfData;
				if (!request.popKid) reqCnfData = (await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PopTokenGenerateCnf, this.logger, this.performanceClient, request.correlationId)(request, this.logger)).reqCnfString;
				else reqCnfData = this.cryptoUtils.encodeKid(request.popKid);
				addPopToken(parameters, reqCnfData);
			} else if (request.authenticationScheme === AuthenticationScheme.SSH) if (request.sshJwk) addSshJwk(parameters, request.sshJwk);
			else throw createClientConfigurationError(missingSshJwk, request.correlationId);
			let ccsCred = void 0;
			if (request.clientInfo) try {
				const clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
				ccsCred = {
					credential: `${clientInfo.uid}${CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
					type: CcsCredentialType.HOME_ACCOUNT_ID
				};
			} catch (e) {
				this.logger.verbose(`Could not parse client info for CCS Header: '${e}'`, request.correlationId);
			}
			else ccsCred = request.ccsCredential;
			if (this.config.systemOptions.preventCorsPreflight && ccsCred) switch (ccsCred.type) {
				case CcsCredentialType.HOME_ACCOUNT_ID:
					try {
						addCcsOid(parameters, buildClientInfoFromHomeAccountId(ccsCred.credential));
					} catch (e) {
						this.logger.verbose(`Could not parse home account ID for CCS Header: '${e}'`, request.correlationId);
					}
					break;
				case CcsCredentialType.UPN: addCcsUpn(parameters, ccsCred.credential);
			}
			if (request.embeddedClientId) addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
			if (request.extraParameters) addExtraParameters(parameters, request.extraParameters);
			if (request.enableSpaAuthorizationCode && (!request.extraParameters || !request.extraParameters[RETURN_SPA_CODE])) addExtraParameters(parameters, { [RETURN_SPA_CODE]: "1" });
			instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
			addClaims(parameters, request.correlationId, request.claims, this.config.authOptions.clientCapabilities, request.skipBrokerClaims);
			return mapToQueryString(parameters);
		}
		/**
		* This API validates the `EndSessionRequest` and creates a URL
		* @param request
		*/
		createLogoutUrlQueryString(request) {
			const parameters = /* @__PURE__ */ new Map();
			if (request.postLogoutRedirectUri) addPostLogoutRedirectUri(parameters, request.postLogoutRedirectUri);
			if (request.correlationId) addCorrelationId(parameters, request.correlationId);
			if (request.idTokenHint) addIdTokenHint(parameters, request.idTokenHint);
			if (request.state) addState(parameters, request.state);
			if (request.logoutHint) addLogoutHint(parameters, request.logoutHint);
			if (request.extraQueryParameters) addExtraParameters(parameters, request.extraQueryParameters);
			if (this.config.authOptions.instanceAware) addInstanceAware(parameters);
			return mapToQueryString(parameters);
		}
		/**
		* Updates the authority to the cloud instance provided in the authorization response
		* @param cloudInstanceHostName - cloud instance host name from authorization code payload
		* @param correlationId - request correlation id
		*/
		async updateTokenEndpointAuthority(cloudInstanceHostName, correlationId) {
			const cloudInstanceAuthority = await createDiscoveredInstance(`https://${cloudInstanceHostName}/${this.authority.tenant}/`, this.networkClient, this.cacheManager, this.authority.options, this.logger, correlationId, this.performanceClient);
			this.authority = cloudInstanceAuthority;
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Returns map of parameters that are applicable to all calls to /authorize whether using PKCE or EAR
	* @param config
	* @param request
	* @param logger
	* @param performanceClient
	* @returns
	* @internal
	*/
	function getStandardAuthorizeRequestParameters(authOptions, request, logger, performanceClient) {
		const correlationId = request.correlationId;
		const parameters = /* @__PURE__ */ new Map();
		addClientId(parameters, request.embeddedClientId || request.extraQueryParameters?.[CLIENT_ID] || authOptions.clientId);
		addScopes(parameters, [...request.scopes || [], ...request.extraScopesToConsent || []], request.correlationId, true, authOptions.authority.options.OIDCOptions?.defaultScopes);
		addResource(parameters, request.resource);
		addRedirectUri(parameters, request.redirectUri);
		addCorrelationId(parameters, correlationId);
		addResponseMode(parameters, request.responseMode);
		addClientInfo(parameters);
		addCliData(parameters);
		if (request.prompt) addPrompt(parameters, request.prompt);
		if (request.domainHint) addDomainHint(parameters, request.domainHint);
		if (request.prompt !== PromptValue$1.SELECT_ACCOUNT) {
			if (request.sid && request.prompt === PromptValue$1.NONE) {
				logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from request", request.correlationId);
				addSid(parameters, request.sid);
			} else if (request.account) {
				const accountSid = extractAccountSid(request.account);
				let accountLoginHintClaim = extractLoginHint(request.account);
				if (accountLoginHintClaim && request.domainHint) {
					logger.warning(`AuthorizationCodeClient.createAuthCodeUrlQueryString: "domainHint" param is set, skipping opaque "login_hint" claim. Please consider not passing domainHint`, request.correlationId);
					accountLoginHintClaim = null;
				}
				if (accountLoginHintClaim) {
					logger.verbose("createAuthCodeUrlQueryString: login_hint claim present on account", request.correlationId);
					addLoginHint(parameters, accountLoginHintClaim);
					try {
						addCcsOid(parameters, buildClientInfoFromHomeAccountId(request.account.homeAccountId));
					} catch (e) {
						logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header", request.correlationId);
					}
				} else if (accountSid && request.prompt === PromptValue$1.NONE) {
					logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from account", request.correlationId);
					addSid(parameters, accountSid);
					try {
						addCcsOid(parameters, buildClientInfoFromHomeAccountId(request.account.homeAccountId));
					} catch (e) {
						logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header", request.correlationId);
					}
				} else if (request.loginHint) {
					logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from request", request.correlationId);
					addLoginHint(parameters, request.loginHint);
					addCcsUpn(parameters, request.loginHint);
				} else if (request.account.username) {
					logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from account", request.correlationId);
					addLoginHint(parameters, request.account.username);
					try {
						addCcsOid(parameters, buildClientInfoFromHomeAccountId(request.account.homeAccountId));
					} catch (e) {
						logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header", request.correlationId);
					}
				}
			} else if (request.loginHint) {
				logger.verbose("createAuthCodeUrlQueryString: No account, adding login_hint from request", request.correlationId);
				addLoginHint(parameters, request.loginHint);
				addCcsUpn(parameters, request.loginHint);
			}
		} else logger.verbose("createAuthCodeUrlQueryString: Prompt is select_account, ignoring account hints", request.correlationId);
		if (request.nonce) addNonce(parameters, request.nonce);
		if (request.state) addState(parameters, request.state);
		if (request.embeddedClientId) addBrokerParameters(parameters, authOptions.clientId, authOptions.redirectUri);
		addClaims(parameters, request.correlationId, request.claims, authOptions.clientCapabilities, request.skipBrokerClaims);
		if (authOptions.instanceAware && (!request.extraQueryParameters || !Object.keys(request.extraQueryParameters).includes(INSTANCE_AWARE))) addInstanceAware(parameters);
		return parameters;
	}
	/**
	* Returns authorize endpoint with given request parameters in the query string
	* @param authority
	* @param requestParameters
	* @returns
	* @internal
	*/
	function getAuthorizeUrl(authority, requestParameters) {
		const queryString = mapToQueryString(requestParameters);
		return UrlString.appendQueryString(authority.authorizationEndpoint, queryString);
	}
	/**
	* Helper to get sid from account. Returns null if idTokenClaims are not present or sid is not present.
	* @param account
	*/
	function extractAccountSid(account) {
		return account.idTokenClaims?.sid || null;
	}
	function extractLoginHint(account) {
		return account.loginHint || account.idTokenClaims?.login_hint || null;
	}
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var DEFAULT_REFRESH_TOKEN_EXPIRATION_OFFSET_SECONDS = 300;
	/**
	* OAuth2.0 refresh token client
	* @internal
	*/
	var RefreshTokenClient = class {
		constructor(configuration, performanceClient) {
			this.config = buildClientConfiguration(configuration);
			this.logger = new Logger(this.config.loggerOptions, name$1, version$1);
			this.cryptoUtils = this.config.cryptoInterface;
			this.cacheManager = this.config.storageInterface;
			this.networkClient = this.config.networkInterface;
			this.serverTelemetryManager = this.config.serverTelemetryManager;
			this.authority = this.config.authOptions.authority;
			this.performanceClient = performanceClient;
		}
		async acquireToken(request, apiId) {
			const reqTimestamp = nowSeconds();
			const response = await invokeAsync(this.executeTokenRequest.bind(this), RefreshTokenClientExecuteTokenRequest, this.logger, this.performanceClient, request.correlationId)(request, this.authority);
			const requestId = response.headers?.[HeaderNames.X_MS_REQUEST_ID];
			const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.performanceClient, this.config.serializableCache, this.config.persistencePlugin);
			responseHandler.validateTokenResponse(response.body, request.correlationId);
			return invokeAsync(responseHandler.handleServerTokenResponse.bind(responseHandler), HandleServerTokenResponse, this.logger, this.performanceClient, request.correlationId)(response.body, this.authority, reqTimestamp, request, apiId, void 0, void 0, true, request.forceCache, requestId);
		}
		/**
		* Gets cached refresh token and attaches to request, then calls acquireToken API
		* @param request
		*/
		async acquireTokenByRefreshToken(request, apiId) {
			if (!request) throw createClientConfigurationError(tokenRequestEmpty, "");
			if (!request.account) throw createClientAuthError(noAccountInSilentRequest, request.correlationId);
			if (this.cacheManager.isAppMetadataFOCI(request.account.environment, request.correlationId)) try {
				return await invokeAsync(this.acquireTokenWithCachedRefreshToken.bind(this), RefreshTokenClientAcquireTokenWithCachedRefreshToken, this.logger, this.performanceClient, request.correlationId)(request, true, apiId);
			} catch (e) {
				const noFamilyRTInCache = e instanceof InteractionRequiredAuthError && e.errorCode === noTokensFound;
				const clientMismatchErrorWithFamilyRT = e instanceof ServerError && e.errorCode === INVALID_GRANT_ERROR && e.subError === CLIENT_MISMATCH_ERROR;
				if (noFamilyRTInCache || clientMismatchErrorWithFamilyRT) return invokeAsync(this.acquireTokenWithCachedRefreshToken.bind(this), RefreshTokenClientAcquireTokenWithCachedRefreshToken, this.logger, this.performanceClient, request.correlationId)(request, false, apiId);
				else throw e;
			}
			return invokeAsync(this.acquireTokenWithCachedRefreshToken.bind(this), RefreshTokenClientAcquireTokenWithCachedRefreshToken, this.logger, this.performanceClient, request.correlationId)(request, false, apiId);
		}
		/**
		* makes a network call to acquire tokens by exchanging RefreshToken available in userCache; throws if refresh token is not cached
		* @param request
		*/
		async acquireTokenWithCachedRefreshToken(request, foci, apiId) {
			const refreshToken = invoke(this.cacheManager.getRefreshToken.bind(this.cacheManager), CacheManagerGetRefreshToken, this.logger, this.performanceClient, request.correlationId)(request.account, foci, request.correlationId, void 0);
			if (!refreshToken) throw createInteractionRequiredAuthError(noTokensFound, request.correlationId);
			if (refreshToken.expiresOn) {
				const offset = request.refreshTokenExpirationOffsetSeconds || DEFAULT_REFRESH_TOKEN_EXPIRATION_OFFSET_SECONDS;
				this.performanceClient?.addFields({
					cacheRtExpiresOnSeconds: Number(refreshToken.expiresOn),
					rtOffsetSeconds: offset
				}, request.correlationId);
				if (isTokenExpired(refreshToken.expiresOn, offset)) throw createInteractionRequiredAuthError(refreshTokenExpired, request.correlationId);
			}
			const refreshTokenRequest = {
				...request,
				refreshToken: refreshToken.secret,
				authenticationScheme: request.authenticationScheme || AuthenticationScheme.BEARER,
				ccsCredential: {
					credential: request.account.homeAccountId,
					type: CcsCredentialType.HOME_ACCOUNT_ID
				}
			};
			try {
				return await invokeAsync(this.acquireToken.bind(this), RefreshTokenClientAcquireToken, this.logger, this.performanceClient, request.correlationId)(refreshTokenRequest, apiId);
			} catch (e) {
				if (e instanceof InteractionRequiredAuthError) {
					if (e.subError === badToken) {
						this.logger.verbose("acquireTokenWithRefreshToken: bad refresh token, removing from cache", request.correlationId);
						const badRefreshTokenKey = this.cacheManager.generateCredentialKey(refreshToken);
						this.cacheManager.removeRefreshToken(badRefreshTokenKey, request.correlationId);
					}
				}
				throw e;
			}
		}
		/**
		* Constructs the network message and makes a NW call to the underlying secure token service
		* @param request
		* @param authority
		*/
		async executeTokenRequest(request, authority) {
			const queryParametersString = createTokenQueryParameters(request, this.config.authOptions.clientId, this.config.authOptions.redirectUri, this.performanceClient);
			const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
			const requestBody = await invokeAsync(this.createTokenRequestBody.bind(this), RefreshTokenClientCreateTokenRequestBody, this.logger, this.performanceClient, request.correlationId)(request);
			const headers = createTokenRequestHeaders(this.logger, this.config.systemOptions.preventCorsPreflight, request.ccsCredential);
			const thumbprint = getRequestThumbprint(this.config.authOptions.clientId, request);
			return invokeAsync(executePostToTokenEndpoint, RefreshTokenClientExecutePostToTokenEndpoint, this.logger, this.performanceClient, request.correlationId)(endpoint, requestBody, headers, thumbprint, request.correlationId, this.cacheManager, this.networkClient, this.logger, this.performanceClient, this.serverTelemetryManager);
		}
		/**
		* Helper function to create the token request body
		* @param request
		*/
		async createTokenRequestBody(request) {
			const parameters = /* @__PURE__ */ new Map();
			addClientId(parameters, request.embeddedClientId || request.extraParameters?.[CLIENT_ID] || this.config.authOptions.clientId);
			if (request.redirectUri) addRedirectUri(parameters, request.redirectUri);
			addScopes(parameters, request.scopes, request.correlationId, true, this.config.authOptions.authority.options.OIDCOptions?.defaultScopes);
			addGrantType(parameters, GrantType.REFRESH_TOKEN_GRANT);
			addClientInfo(parameters);
			addLibraryInfo(parameters, this.config.libraryInfo);
			addApplicationTelemetry(parameters, this.config.telemetry.application);
			addThrottling(parameters);
			if (this.serverTelemetryManager && !isOidcProtocolMode(this.config)) addServerTelemetry(parameters, this.serverTelemetryManager);
			addRefreshToken(parameters, request.refreshToken);
			if (request.attributeTokens) addAttributeTokens(parameters, request.attributeTokens);
			this.performanceClient?.addFields({ hasAttributeTokens: !!request.attributeTokens?.length }, request.correlationId);
			if (this.config.clientCredentials.clientSecret) addClientSecret(parameters, this.config.clientCredentials.clientSecret);
			if (this.config.clientCredentials.clientAssertion) {
				const clientAssertion = this.config.clientCredentials.clientAssertion;
				addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
				addClientAssertionType(parameters, clientAssertion.assertionType);
			}
			if (request.authenticationScheme === AuthenticationScheme.POP) {
				const popTokenGenerator = new PopTokenGenerator(this.cryptoUtils, this.performanceClient);
				let reqCnfData;
				if (!request.popKid) reqCnfData = (await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PopTokenGenerateCnf, this.logger, this.performanceClient, request.correlationId)(request, this.logger)).reqCnfString;
				else reqCnfData = this.cryptoUtils.encodeKid(request.popKid);
				addPopToken(parameters, reqCnfData);
			} else if (request.authenticationScheme === AuthenticationScheme.SSH) if (request.sshJwk) addSshJwk(parameters, request.sshJwk);
			else throw createClientConfigurationError(missingSshJwk, request.correlationId);
			if (this.config.systemOptions.preventCorsPreflight && request.ccsCredential) switch (request.ccsCredential.type) {
				case CcsCredentialType.HOME_ACCOUNT_ID:
					try {
						addCcsOid(parameters, buildClientInfoFromHomeAccountId(request.ccsCredential.credential));
					} catch (e) {
						this.logger.verbose(`Could not parse home account ID for CCS Header: '${e}'`, request.correlationId);
					}
					break;
				case CcsCredentialType.UPN: addCcsUpn(parameters, request.ccsCredential.credential);
			}
			if (request.embeddedClientId) addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
			if (request.extraParameters) addExtraParameters(parameters, { ...request.extraParameters });
			instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
			addClaims(parameters, request.correlationId, request.claims, this.config.authOptions.clientCapabilities, request.skipBrokerClaims);
			return mapToQueryString(parameters);
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	var skuGroupSeparator = ",";
	var skuValueSeparator = "|";
	function makeExtraSkuString(params) {
		const { skus, libraryName, libraryVersion, extensionName, extensionVersion } = params;
		const skuMap = /* @__PURE__ */ new Map([[0, [libraryName, libraryVersion]], [2, [extensionName, extensionVersion]]]);
		let skuArr = [];
		if (skus?.length) {
			skuArr = skus.split(skuGroupSeparator);
			if (skuArr.length < 4) return skus;
		} else skuArr = Array.from({ length: 4 }, () => skuValueSeparator);
		skuMap.forEach((value, key) => {
			if (value.length === 2 && value[0]?.length && value[1]?.length) setSku({
				skuArr,
				index: key,
				skuName: value[0],
				skuVersion: value[1]
			});
		});
		return skuArr.join(skuGroupSeparator);
	}
	function setSku(params) {
		const { skuArr, index, skuName, skuVersion } = params;
		if (index >= skuArr.length) return;
		skuArr[index] = [skuName, skuVersion].join(skuValueSeparator);
	}
	/** @internal */
	var ServerTelemetryManager = class ServerTelemetryManager {
		constructor(telemetryRequest, cacheManager) {
			this.cacheOutcome = CacheOutcome.NOT_APPLICABLE;
			this.cacheManager = cacheManager;
			this.apiId = telemetryRequest.apiId;
			this.correlationId = telemetryRequest.correlationId;
			this.wrapperSKU = telemetryRequest.wrapperSKU || "";
			this.wrapperVer = telemetryRequest.wrapperVer || "";
			this.telemetryCacheKey = "server-telemetry-" + telemetryRequest.clientId;
		}
		/**
		* API to add MSER Telemetry to request
		*/
		generateCurrentRequestHeaderValue() {
			const request = `${this.apiId}${SERVER_TELEM_VALUE_SEPARATOR}${this.cacheOutcome}`;
			const platformFieldsArr = [this.wrapperSKU, this.wrapperVer];
			const nativeBrokerErrorCode = this.getNativeBrokerErrorCode();
			if (nativeBrokerErrorCode?.length) platformFieldsArr.push(`broker_error=${nativeBrokerErrorCode}`);
			const platformFields = platformFieldsArr.join(SERVER_TELEM_VALUE_SEPARATOR);
			return [
				SERVER_TELEM_SCHEMA_VERSION,
				[request, this.getRegionDiscoveryFields()].join(SERVER_TELEM_VALUE_SEPARATOR),
				platformFields
			].join(SERVER_TELEM_CATEGORY_SEPARATOR);
		}
		/**
		* API to add MSER Telemetry for the last failed request
		*/
		generateLastRequestHeaderValue() {
			const lastRequests = this.getLastRequests();
			const maxErrors = ServerTelemetryManager.maxErrorsToSend(lastRequests);
			const failedRequests = lastRequests.failedRequests.slice(0, 2 * maxErrors).join(SERVER_TELEM_VALUE_SEPARATOR);
			const errors = lastRequests.errors.slice(0, maxErrors).join(SERVER_TELEM_VALUE_SEPARATOR);
			const errorCount = lastRequests.errors.length;
			const platformFields = [errorCount, maxErrors < errorCount ? SERVER_TELEM_OVERFLOW_TRUE : SERVER_TELEM_OVERFLOW_FALSE].join(SERVER_TELEM_VALUE_SEPARATOR);
			return [
				SERVER_TELEM_SCHEMA_VERSION,
				lastRequests.cacheHits,
				failedRequests,
				errors,
				platformFields
			].join(SERVER_TELEM_CATEGORY_SEPARATOR);
		}
		/**
		* API to cache token failures for MSER data capture
		* @param error
		*/
		cacheFailedRequest(error) {
			try {
				const lastRequests = this.getLastRequests();
				if (lastRequests.errors.length >= SERVER_TELEM_MAX_CACHED_ERRORS) {
					lastRequests.failedRequests.shift();
					lastRequests.failedRequests.shift();
					lastRequests.errors.shift();
				}
				lastRequests.failedRequests.push(this.apiId, this.correlationId);
				if (error instanceof Error && !!error && error.toString()) if (error instanceof AuthError) if (error.subError) lastRequests.errors.push(error.subError);
				else if (error.errorCode) lastRequests.errors.push(error.errorCode);
				else lastRequests.errors.push(error.toString());
				else lastRequests.errors.push(error.toString());
				else lastRequests.errors.push(SERVER_TELEM_UNKNOWN_ERROR);
				this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
			} catch {}
		}
		/**
		* Update server telemetry cache entry by incrementing cache hit counter
		*/
		incrementCacheHits() {
			const lastRequests = this.getLastRequests();
			lastRequests.cacheHits += 1;
			this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
			return lastRequests.cacheHits;
		}
		/**
		* Get the server telemetry entity from cache or initialize a new one
		*/
		getLastRequests() {
			return this.cacheManager.getServerTelemetry(this.telemetryCacheKey, this.correlationId) || {
				failedRequests: [],
				errors: [],
				cacheHits: 0
			};
		}
		/**
		* Remove server telemetry cache entry
		*/
		clearTelemetryCache() {
			const lastRequests = this.getLastRequests();
			const numErrorsFlushed = ServerTelemetryManager.maxErrorsToSend(lastRequests);
			if (numErrorsFlushed === lastRequests.errors.length) this.cacheManager.removeItem(this.telemetryCacheKey, this.correlationId);
			else {
				const serverTelemEntity = {
					failedRequests: lastRequests.failedRequests.slice(numErrorsFlushed * 2),
					errors: lastRequests.errors.slice(numErrorsFlushed),
					cacheHits: 0
				};
				this.cacheManager.setServerTelemetry(this.telemetryCacheKey, serverTelemEntity, this.correlationId);
			}
		}
		/**
		* Returns the maximum number of errors that can be flushed to the server in the next network request
		* @param serverTelemetryEntity
		*/
		static maxErrorsToSend(serverTelemetryEntity) {
			let i;
			let maxErrors = 0;
			let dataSize = 0;
			const errorCount = serverTelemetryEntity.errors.length;
			for (i = 0; i < errorCount; i++) {
				const apiId = serverTelemetryEntity.failedRequests[2 * i] || "";
				const correlationId = serverTelemetryEntity.failedRequests[2 * i + 1] || "";
				const errorCode = serverTelemetryEntity.errors[i] || "";
				dataSize += apiId.toString().length + correlationId.toString().length + errorCode.length + 3;
				if (dataSize < SERVER_TELEM_MAX_LAST_HEADER_BYTES) maxErrors += 1;
				else break;
			}
			return maxErrors;
		}
		/**
		* Get the region discovery fields
		*
		* @returns string
		*/
		getRegionDiscoveryFields() {
			const regionDiscoveryFields = [];
			regionDiscoveryFields.push(this.regionUsed || "");
			regionDiscoveryFields.push(this.regionSource || "");
			regionDiscoveryFields.push(this.regionOutcome || "");
			return regionDiscoveryFields.join(",");
		}
		/**
		* Update the region discovery metadata
		*
		* @param regionDiscoveryMetadata
		* @returns void
		*/
		updateRegionDiscoveryMetadata(regionDiscoveryMetadata) {
			this.regionUsed = regionDiscoveryMetadata.region_used;
			this.regionSource = regionDiscoveryMetadata.region_source;
			this.regionOutcome = regionDiscoveryMetadata.region_outcome;
		}
		/**
		* Set cache outcome
		*/
		setCacheOutcome(cacheOutcome) {
			this.cacheOutcome = cacheOutcome;
		}
		setNativeBrokerErrorCode(errorCode) {
			const lastRequests = this.getLastRequests();
			lastRequests.nativeBrokerErrorCode = errorCode;
			this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
		}
		getNativeBrokerErrorCode() {
			return this.getLastRequests().nativeBrokerErrorCode;
		}
		clearNativeBrokerErrorCode() {
			const lastRequests = this.getLastRequests();
			delete lastRequests.nativeBrokerErrorCode;
			this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
		}
		static makeExtraSkuString(params) {
			return makeExtraSkuString(params);
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/** @internal */
	var SilentFlowClient = class {
		constructor(configuration, performanceClient) {
			this.config = buildClientConfiguration(configuration);
			this.logger = new Logger(this.config.loggerOptions, name$1, version$1);
			this.cryptoUtils = this.config.cryptoInterface;
			this.cacheManager = this.config.storageInterface;
			this.networkClient = this.config.networkInterface;
			this.serverTelemetryManager = this.config.serverTelemetryManager;
			this.authority = this.config.authOptions.authority;
			this.performanceClient = performanceClient;
		}
		/**
		* Retrieves token from cache or throws an error if it must be refreshed.
		* @param request
		*/
		async acquireCachedToken(request) {
			let lastCacheOutcome = CacheOutcome.NOT_APPLICABLE;
			if (request.forceRefresh || !StringUtils.isEmptyObj(request.claims)) {
				this.setCacheOutcome(CacheOutcome.FORCE_REFRESH_OR_CLAIMS, request.correlationId);
				throw createClientAuthError(tokenRefreshRequired, request.correlationId);
			}
			if (!request.account) throw createClientAuthError(noAccountInSilentRequest, request.correlationId);
			const requestTenantId = request.account.tenantId || getTenantFromAuthorityString(request.authority, request.correlationId);
			const tokenKeys = this.cacheManager.getTokenKeys();
			const cachedAccessToken = this.cacheManager.getAccessToken(request.account, request, tokenKeys, requestTenantId);
			if (!cachedAccessToken) {
				this.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN, request.correlationId);
				throw createClientAuthError(tokenRefreshRequired, request.correlationId);
			} else if (wasClockTurnedBack(cachedAccessToken.cachedAt) || isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)) {
				this.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED, request.correlationId);
				throw createClientAuthError(tokenRefreshRequired, request.correlationId);
			} else if (request.resource) {
				if (cachedAccessToken.resource !== request.resource) {
					this.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN, request.correlationId);
					throw createClientAuthError(tokenRefreshRequired, request.correlationId);
				}
			} else if (cachedAccessToken.refreshOn && isTokenExpired(cachedAccessToken.refreshOn, 0)) lastCacheOutcome = CacheOutcome.PROACTIVELY_REFRESHED;
			const environment = request.authority || this.authority.getPreferredCache();
			const cacheRecord = {
				account: this.cacheManager.getAccount(this.cacheManager.generateAccountKey(request.account), request.correlationId),
				accessToken: cachedAccessToken,
				idToken: this.cacheManager.getIdToken(request.account, request.correlationId, tokenKeys, requestTenantId),
				refreshToken: null,
				appMetadata: this.cacheManager.readAppMetadataFromCache(environment, request.correlationId)
			};
			this.setCacheOutcome(lastCacheOutcome, request.correlationId);
			if (this.config.serverTelemetryManager) this.config.serverTelemetryManager.incrementCacheHits();
			return [await invokeAsync(this.generateResultFromCacheRecord.bind(this), SilentFlowClientGenerateResultFromCacheRecord, this.logger, this.performanceClient, request.correlationId)(cacheRecord, request), lastCacheOutcome];
		}
		setCacheOutcome(cacheOutcome, correlationId) {
			this.serverTelemetryManager?.setCacheOutcome(cacheOutcome);
			this.performanceClient?.addFields({ cacheOutcome }, correlationId);
			if (cacheOutcome !== CacheOutcome.NOT_APPLICABLE) this.logger.info(`Token refresh is required due to cache outcome: '${cacheOutcome}'`, correlationId);
		}
		/**
		* Helper function to build response object from the CacheRecord
		* @param cacheRecord
		*/
		async generateResultFromCacheRecord(cacheRecord, request) {
			let idTokenClaims;
			if (cacheRecord.idToken) idTokenClaims = extractTokenClaims(cacheRecord.idToken.secret, this.config.cryptoInterface.base64Decode, request.correlationId);
			return ResponseHandler.generateAuthenticationResult(this.cryptoUtils, this.authority, cacheRecord, true, request, this.performanceClient, idTokenClaims);
		}
	};
	/*! @azure/msal-common v16.12.0 2026-08-04 */
	/**
	* Helper to enforce resource parameter presence in token requests when isMcp is set in the configuration.
	* If resource parameter is set in both the request and in extraQueryParameters or extraParameters, an error will be thrown.
	* This is used for MCP flows.
	* @param isMcp - Flag indicating if application is an MCP app, from configuration
	* @param request - Auth request
	*/
	function enforceResourceParameter(isMcp, request) {
		if (!isMcp) return;
		if (request.resource && (containsResourceParam(request.extraParameters) || containsResourceParam(request.extraQueryParameters))) throw createClientAuthError(misplacedResourceParam, request.correlationId || "");
		if (!request.resource) throw createClientAuthError(resourceParameterRequired, request.correlationId || "");
	}
	function containsResourceParam(params) {
		if (!params) return false;
		return Object.prototype.hasOwnProperty.call(params, "resource");
	}
	/**
	* This class deserializes cache entities read from the file into in-memory object types defined internally
	* @internal
	*/
	var Deserializer = class {
		/**
		* Parse the JSON blob in memory and deserialize the content
		* @param cachedJson - JSON blob cache
		*/
		static deserializeJSONBlob(jsonFile) {
			return !jsonFile ? {} : JSON.parse(jsonFile);
		}
		/**
		* Deserializes accounts to AccountEntity objects
		* @param accounts - accounts of type SerializedAccountEntity
		*/
		static deserializeAccounts(accounts) {
			const accountObjects = {};
			if (accounts) Object.keys(accounts).map(function(key) {
				const serializedAcc = accounts[key];
				const mappedAcc = {
					homeAccountId: serializedAcc.home_account_id,
					environment: serializedAcc.environment,
					realm: serializedAcc.realm,
					localAccountId: serializedAcc.local_account_id,
					username: serializedAcc.username,
					authorityType: serializedAcc.authority_type,
					name: serializedAcc.name,
					clientInfo: serializedAcc.client_info,
					lastModificationTime: serializedAcc.last_modification_time,
					lastModificationApp: serializedAcc.last_modification_app,
					tenantProfiles: serializedAcc.tenantProfiles?.map((serializedTenantProfile) => {
						return JSON.parse(serializedTenantProfile);
					}),
					lastUpdatedAt: Date.now().toString()
				};
				const account = {};
				CacheManager.toObject(account, mappedAcc);
				accountObjects[key] = account;
			});
			return accountObjects;
		}
		/**
		* Deserializes id tokens to IdTokenEntity objects
		* @param idTokens - credentials of type SerializedIdTokenEntity
		*/
		static deserializeIdTokens(idTokens) {
			const idObjects = {};
			if (idTokens) Object.keys(idTokens).map(function(key) {
				const serializedIdT = idTokens[key];
				const idToken = {
					homeAccountId: serializedIdT.home_account_id,
					environment: serializedIdT.environment,
					credentialType: serializedIdT.credential_type,
					clientId: serializedIdT.client_id,
					secret: serializedIdT.secret,
					realm: serializedIdT.realm,
					lastUpdatedAt: Date.now().toString()
				};
				idObjects[key] = idToken;
			});
			return idObjects;
		}
		/**
		* Deserializes access tokens to AccessTokenEntity objects
		* @param accessTokens - access tokens of type SerializedAccessTokenEntity
		*/
		static deserializeAccessTokens(accessTokens) {
			const atObjects = {};
			if (accessTokens) Object.keys(accessTokens).map(function(key) {
				const serializedAT = accessTokens[key];
				const accessToken = {
					homeAccountId: serializedAT.home_account_id,
					environment: serializedAT.environment,
					credentialType: serializedAT.credential_type,
					clientId: serializedAT.client_id,
					secret: serializedAT.secret,
					realm: serializedAT.realm,
					target: serializedAT.target,
					cachedAt: serializedAT.cached_at,
					expiresOn: serializedAT.expires_on,
					extendedExpiresOn: serializedAT.extended_expires_on,
					refreshOn: serializedAT.refresh_on,
					keyId: serializedAT.key_id,
					tokenType: serializedAT.token_type,
					userAssertionHash: serializedAT.userAssertionHash,
					resource: serializedAT.resource,
					additionalCacheKeyComponents: serializedAT.additionalCacheKeyComponents,
					lastUpdatedAt: Date.now().toString()
				};
				atObjects[key] = accessToken;
			});
			return atObjects;
		}
		/**
		* Deserializes refresh tokens to RefreshTokenEntity objects
		* @param refreshTokens - refresh tokens of type SerializedRefreshTokenEntity
		*/
		static deserializeRefreshTokens(refreshTokens) {
			const rtObjects = {};
			if (refreshTokens) Object.keys(refreshTokens).map(function(key) {
				const serializedRT = refreshTokens[key];
				const refreshToken = {
					homeAccountId: serializedRT.home_account_id,
					environment: serializedRT.environment,
					credentialType: serializedRT.credential_type,
					clientId: serializedRT.client_id,
					secret: serializedRT.secret,
					familyId: serializedRT.family_id,
					target: serializedRT.target,
					realm: serializedRT.realm,
					lastUpdatedAt: Date.now().toString()
				};
				rtObjects[key] = refreshToken;
			});
			return rtObjects;
		}
		/**
		* Deserializes appMetadata to AppMetaData objects
		* @param appMetadata - app metadata of type SerializedAppMetadataEntity
		*/
		static deserializeAppMetadata(appMetadata) {
			const appMetadataObjects = {};
			if (appMetadata) Object.keys(appMetadata).map(function(key) {
				const serializedAmdt = appMetadata[key];
				appMetadataObjects[key] = {
					clientId: serializedAmdt.client_id,
					environment: serializedAmdt.environment,
					familyId: serializedAmdt.family_id
				};
			});
			return appMetadataObjects;
		}
		/**
		* Deserialize an inMemory Cache
		* @param jsonCache - JSON blob cache
		*/
		static deserializeAllCache(jsonCache) {
			return {
				accounts: jsonCache.Account ? this.deserializeAccounts(jsonCache.Account) : {},
				idTokens: jsonCache.IdToken ? this.deserializeIdTokens(jsonCache.IdToken) : {},
				accessTokens: jsonCache.AccessToken ? this.deserializeAccessTokens(jsonCache.AccessToken) : {},
				refreshTokens: jsonCache.RefreshToken ? this.deserializeRefreshTokens(jsonCache.RefreshToken) : {},
				appMetadata: jsonCache.AppMetadata ? this.deserializeAppMetadata(jsonCache.AppMetadata) : {}
			};
		}
	};
	/**
	* Warning: This set of exports is purely intended to be used by other MSAL libraries, and should be considered potentially unstable. We strongly discourage using them directly, you do so at your own risk.
	* Breaking changes to these APIs will be shipped under a minor version, instead of a major version.
	*/
	var internals = /*#__PURE__*/ Object.freeze({
		__proto__: null,
		Deserializer,
		Serializer
	});
	var DEFAULT_MANAGED_IDENTITY_ID = "system_assigned_managed_identity";
	var DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY = `https://login.microsoftonline.com/managed_identity/`;
	/**
	* Managed Identity Headers - used in network requests
	*/
	var ManagedIdentityHeaders = {
		AUTHORIZATION_HEADER_NAME: "Authorization",
		METADATA_HEADER_NAME: "Metadata",
		APP_SERVICE_SECRET_HEADER_NAME: "X-IDENTITY-HEADER",
		ML_AND_SF_SECRET_HEADER_NAME: "secret",
		CLIENT_SKU: X_CLIENT_SKU,
		CLIENT_VER: X_CLIENT_VER,
		CLIENT_REQUEST_ID: "x-ms-client-request-id"
	};
	/**
	* Managed Identity Query Parameters - used in network requests
	*/
	var ManagedIdentityQueryParameters = {
		API_VERSION: "api-version",
		RESOURCE: "resource",
		SHA256_TOKEN_TO_REFRESH: "token_sha256_to_refresh",
		XMS_CC: "xms_cc"
	};
	/**
	* Managed Identity Environment Variable Names
	*/
	var ManagedIdentityEnvironmentVariableNames = {
		AZURE_POD_IDENTITY_AUTHORITY_HOST: "AZURE_POD_IDENTITY_AUTHORITY_HOST",
		DEFAULT_IDENTITY_CLIENT_ID: "DEFAULT_IDENTITY_CLIENT_ID",
		IDENTITY_ENDPOINT: "IDENTITY_ENDPOINT",
		IDENTITY_HEADER: "IDENTITY_HEADER",
		IDENTITY_SERVER_THUMBPRINT: "IDENTITY_SERVER_THUMBPRINT",
		IMDS_ENDPOINT: "IMDS_ENDPOINT",
		MSI_ENDPOINT: "MSI_ENDPOINT",
		MSI_SECRET: "MSI_SECRET"
	};
	/**
	* Managed Identity Source Names
	* @public
	*/
	var ManagedIdentitySourceNames = {
		APP_SERVICE: "AppService",
		AZURE_ARC: "AzureArc",
		CLOUD_SHELL: "CloudShell",
		DEFAULT_TO_IMDS: "DefaultToImds",
		IMDS: "Imds",
		MACHINE_LEARNING: "MachineLearning",
		SERVICE_FABRIC: "ServiceFabric"
	};
	/**
	* Managed Identity Ids
	*/
	var ManagedIdentityIdType = {
		SYSTEM_ASSIGNED: "system-assigned",
		USER_ASSIGNED_CLIENT_ID: "user-assigned-client-id",
		USER_ASSIGNED_RESOURCE_ID: "user-assigned-resource-id",
		USER_ASSIGNED_OBJECT_ID: "user-assigned-object-id"
	};
	/**
	* http methods
	*/
	var HttpMethod = {
		GET: "GET",
		POST: "POST"
	};
	/**
	* Constants used for region discovery
	*/
	var REGION_ENVIRONMENT_VARIABLE = "REGION_NAME";
	var MSAL_FORCE_REGION = "MSAL_FORCE_REGION";
	/**
	* Constant used for PKCE
	*/
	var RANDOM_OCTET_SIZE = 32;
	/**
	* Constants used in PKCE
	*/
	var Hash = { SHA256: "sha256" };
	/**
	* Constants for encoding schemes
	*/
	var CharSet = { CV_CHARSET: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~" };
	/**
	* Cache Constants
	*/
	var CACHE = { KEY_SEPARATOR: "-" };
	/**
	* Constants
	*/
	var Constants = {
		MSAL_SKU: "msal.js.node",
		JWT_BEARER_ASSERTION_TYPE: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
		HTTP_PROTOCOL: "http://",
		LOCALHOST: "localhost"
	};
	/**
	* API Codes for Telemetry purposes.
	* Before adding a new code you must claim it in the MSAL Telemetry tracker as these number spaces are shared across all MSALs
	* 0-99 Silent Flow
	* 600-699 Device Code Flow
	* 800-899 Auth Code Flow
	*/
	var ApiId = {
		acquireTokenSilent: 62,
		acquireTokenByUsernamePassword: 371,
		acquireTokenByDeviceCode: 671,
		acquireTokenByClientCredential: 771,
		acquireTokenByOBO: 772,
		acquireTokenWithManagedIdentity: 773,
		acquireTokenByUserFederatedIdentityCredential: 774,
		acquireTokenByCode: 871,
		acquireTokenByRefreshToken: 872
	};
	/**
	* JWT  constants
	*/
	var JwtConstants = {
		RSA_256: "RS256",
		PSS_256: "PS256",
		X5T_256: "x5t#S256",
		X5T: "x5t",
		X5C: "x5c",
		AUDIENCE: "aud",
		EXPIRATION_TIME: "exp",
		ISSUER: "iss",
		SUBJECT: "sub",
		NOT_BEFORE: "nbf",
		JWT_ID: "jti"
	};
	var LOOPBACK_SERVER_CONSTANTS = {
		INTERVAL_MS: 100,
		TIMEOUT_MS: 5e3
	};
	var AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES = 4096;
	/**
	* HTTP client implementation using Node.js native fetch API.
	*
	* This class provides a clean interface for making HTTP requests using the modern
	* fetch API available in Node.js 18+. It replaces the previous implementation that
	* relied on custom proxy handling and the legacy http/https modules.
	*/
	var HttpClient = class {
		/**
		* Sends an HTTP GET request to the specified URL.
		*
		* This method handles GET requests with optional timeout support. The timeout
		* is implemented using AbortController, which provides a clean way to cancel
		* fetch requests that take too long to complete.
		*
		* @param url - The target URL for the GET request
		* @param options - Optional request configuration including headers
		* @param timeout - Optional timeout in milliseconds. If specified, the request
		*                  will be aborted if it doesn't complete within this time
		* @returns Promise that resolves to a NetworkResponse containing headers, body, and status
		* @throws {AuthError} When the request times out or response parsing fails
		* @throws {NetworkError} When the network request fails
		*/
		async sendGetRequestAsync(url, options, timeout) {
			return this.sendRequest(url, HttpMethod.GET, options, timeout);
		}
		/**
		* Sends an HTTP POST request to the specified URL.
		*
		* This method handles POST requests with request body support. Currently,
		* timeout functionality is not exposed for POST requests, but the underlying
		* implementation supports it through the shared sendRequest method.
		*
		* @param url - The target URL for the POST request
		* @param options - Optional request configuration including headers and body
		* @returns Promise that resolves to a NetworkResponse containing headers, body, and status
		* @throws {AuthError} When the request times out or response parsing fails
		* @throws {NetworkError} When the network request fails
		*/
		async sendPostRequestAsync(url, options) {
			return this.sendRequest(url, HttpMethod.POST, options);
		}
		/**
		* Core HTTP request implementation using native fetch API.
		*
		* This method handles GET and POST HTTP requests with comprehensive
		* timeout support and error handling. The timeout mechanism works as follows:
		*
		* 1. An AbortController is created for each request
		* 2. If a timeout is specified, setTimeout is used to call abort() after the delay
		* 3. The abort signal is passed to fetch, which will reject the promise if aborted
		* 4. Cleanup occurs in both success and error cases to prevent timer leaks
		*
		* Error handling priority:
		* 1. Timeout errors (AbortError) are converted to "Request timeout" messages
		* 2. Network/connection errors are wrapped with "Network request failed" prefix
		* 3. JSON parsing errors are wrapped with "Failed to parse response" prefix
		*
		* @param url - The target URL for the request
		* @param method - HTTP method (GET or POST)
		* @param options - Optional request configuration (headers, body)
		* @param timeout - Optional timeout in milliseconds for request cancellation
		* @returns Promise resolving to NetworkResponse with parsed JSON body
		* @throws {AuthError} For timeouts or JSON parsing errors
		* @throws {NetworkError} For network failures
		*/
		async sendRequest(url, method, options, timeout) {
			const controller = new AbortController();
			let timeoutId;
			if (timeout) timeoutId = setTimeout(() => {
				controller.abort();
			}, timeout);
			const fetchOptions = {
				method,
				headers: getFetchHeaders(options),
				signal: controller.signal
			};
			if (method === HttpMethod.POST) fetchOptions.body = options?.body || "";
			let response;
			try {
				response = await fetch(url, fetchOptions);
			} catch (error) {
				if (timeoutId) clearTimeout(timeoutId);
				if (error instanceof Error && error.name === "AbortError") throw createAuthError(networkError, "", "Request timeout");
				throw createNetworkError(createAuthError(networkError, "", `Network request failed: ${error instanceof Error ? error.message : "unknown"}`), void 0, void 0, error instanceof Error ? error : void 0);
			}
			if (timeoutId) clearTimeout(timeoutId);
			try {
				return {
					headers: getHeaderDict(response.headers),
					body: await response.json(),
					status: response.status
				};
			} catch (error) {
				throw createAuthError(tokenParsingError, "", `Failed to parse response: ${error instanceof Error ? error.message : "unknown"}`);
			}
		}
	};
	/**
	* Converts a fetch Headers object to a plain JavaScript object.
	*
	* The fetch API returns headers as a Headers object with methods like get(), has(),
	* etc. However, the rest of the MSAL codebase expects headers as a simple key-value
	* object. This function performs that conversion.
	*
	* @param headers - The Headers object returned by fetch response
	* @returns A plain object with header names as keys and values as strings
	*/
	function getHeaderDict(headers) {
		const headerDict = {};
		headers.forEach((value, key) => {
			headerDict[key] = value;
		});
		return headerDict;
	}
	/**
	* Converts NetworkRequestOptions headers to a fetch-compatible Headers object.
	*
	* The MSAL library uses plain objects for headers in NetworkRequestOptions,
	* but the fetch API expects either a Headers object, plain object, or array
	* of arrays. Using the Headers constructor provides better compatibility
	* and validation.
	*
	* @param options - Optional NetworkRequestOptions containing headers
	* @returns A Headers object ready for use with fetch API
	*/
	function getFetchHeaders(options) {
		const headers = new Headers();
		if (!(options && options.headers)) return headers;
		Object.entries(options.headers).forEach(([key, value]) => {
			headers.append(key, value);
		});
		return headers;
	}
	var invalidFileExtension = "invalid_file_extension";
	var invalidFilePath = "invalid_file_path";
	var invalidManagedIdentityIdType = "invalid_managed_identity_id_type";
	var invalidSecret = "invalid_secret";
	var missingId = "missing_client_id";
	var networkUnavailable = "network_unavailable";
	var platformNotSupported = "platform_not_supported";
	var unableToCreateAzureArc = "unable_to_create_azure_arc";
	var unableToCreateCloudShell = "unable_to_create_cloud_shell";
	var unableToCreateSource = "unable_to_create_source";
	var unableToReadSecretFile = "unable_to_read_secret_file";
	var userAssignedNotAvailableAtRuntime = "user_assigned_not_available_at_runtime";
	var wwwAuthenticateHeaderMissing = "www_authenticate_header_missing";
	var wwwAuthenticateHeaderUnsupportedFormat = "www_authenticate_header_unsupported_format";
	var MsiEnvironmentVariableUrlMalformedErrorCodes = {
		[ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST]: "azure_pod_identity_authority_host_url_malformed",
		[ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT]: "identity_endpoint_url_malformed",
		[ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT]: "imds_endpoint_url_malformed",
		[ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT]: "msi_endpoint_url_malformed"
	};
	/**
	* ManagedIdentityErrorMessage class containing string constants used by error codes and messages.
	*/
	var ManagedIdentityErrorMessages = {
		[invalidFileExtension]: "The file path in the WWW-Authenticate header does not contain a .key file.",
		[invalidFilePath]: "The file path in the WWW-Authenticate header is not in a valid Windows or Linux Format.",
		[invalidManagedIdentityIdType]: "More than one ManagedIdentityIdType was provided.",
		[invalidSecret]: "The secret in the file on the file path in the WWW-Authenticate header is greater than 4096 bytes.",
		[platformNotSupported]: "The platform is not supported by Azure Arc. Azure Arc only supports Windows and Linux.",
		[missingId]: "A ManagedIdentityId id was not provided.",
		[MsiEnvironmentVariableUrlMalformedErrorCodes.AZURE_POD_IDENTITY_AUTHORITY_HOST]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST}' environment variable is malformed.`,
		[MsiEnvironmentVariableUrlMalformedErrorCodes.IDENTITY_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' environment variable is malformed.`,
		[MsiEnvironmentVariableUrlMalformedErrorCodes.IMDS_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT}' environment variable is malformed.`,
		[MsiEnvironmentVariableUrlMalformedErrorCodes.MSI_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT}' environment variable is malformed.`,
		[networkUnavailable]: "Authentication unavailable. The request to the managed identity endpoint timed out.",
		[unableToCreateAzureArc]: "Azure Arc Managed Identities can only be system assigned.",
		[unableToCreateCloudShell]: "Cloud Shell Managed Identities can only be system assigned.",
		[unableToCreateSource]: "Unable to create a Managed Identity source based on environment variables.",
		[unableToReadSecretFile]: "Unable to read the secret file.",
		[userAssignedNotAvailableAtRuntime]: "Service Fabric user assigned managed identity ClientId or ResourceId is not configurable at runtime.",
		[wwwAuthenticateHeaderMissing]: "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is missing.",
		[wwwAuthenticateHeaderUnsupportedFormat]: "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is in an unsupported format."
	};
	var ManagedIdentityError = class ManagedIdentityError extends AuthError {
		constructor(errorCode, correlationId) {
			super(errorCode, correlationId, ManagedIdentityErrorMessages[errorCode]);
			this.name = "ManagedIdentityError";
			Object.setPrototypeOf(this, ManagedIdentityError.prototype);
		}
	};
	function createManagedIdentityError(errorCode, correlationId) {
		return new ManagedIdentityError(errorCode, correlationId);
	}
	var ManagedIdentityId = class {
		get id() {
			return this._id;
		}
		set id(value) {
			this._id = value;
		}
		get idType() {
			return this._idType;
		}
		set idType(value) {
			this._idType = value;
		}
		constructor(managedIdentityIdParams) {
			const userAssignedClientId = managedIdentityIdParams?.userAssignedClientId;
			const userAssignedResourceId = managedIdentityIdParams?.userAssignedResourceId;
			const userAssignedObjectId = managedIdentityIdParams?.userAssignedObjectId;
			if (userAssignedClientId) {
				if (userAssignedResourceId || userAssignedObjectId) throw createManagedIdentityError(invalidManagedIdentityIdType, "");
				this.id = userAssignedClientId;
				this.idType = ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID;
			} else if (userAssignedResourceId) {
				if (userAssignedClientId || userAssignedObjectId) throw createManagedIdentityError(invalidManagedIdentityIdType, "");
				this.id = userAssignedResourceId;
				this.idType = ManagedIdentityIdType.USER_ASSIGNED_RESOURCE_ID;
			} else if (userAssignedObjectId) {
				if (userAssignedClientId || userAssignedResourceId) throw createManagedIdentityError(invalidManagedIdentityIdType, "");
				this.id = userAssignedObjectId;
				this.idType = ManagedIdentityIdType.USER_ASSIGNED_OBJECT_ID;
			} else {
				this.id = DEFAULT_MANAGED_IDENTITY_ID;
				this.idType = ManagedIdentityIdType.SYSTEM_ASSIGNED;
			}
		}
	};
	/**
	* NodeAuthErrorMessage class containing string constants used by error codes and messages.
	*/
	var NodeAuthErrorMessage = {
		invalidLoopbackAddressType: {
			code: "invalid_loopback_server_address_type",
			desc: "Loopback server address is not type string. This is unexpected."
		},
		unableToLoadRedirectUri: {
			code: "unable_to_load_redirectUrl",
			desc: "Loopback server callback was invoked without a url. This is unexpected."
		},
		noAuthCodeInResponse: {
			code: "no_auth_code_in_response",
			desc: "No auth code found in the server response. Please check your network trace to determine what happened."
		},
		noLoopbackServerExists: {
			code: "no_loopback_server_exists",
			desc: "No loopback server exists yet."
		},
		loopbackServerAlreadyExists: {
			code: "loopback_server_already_exists",
			desc: "Loopback server already exists. Cannot create another."
		},
		loopbackServerTimeout: {
			code: "loopback_server_timeout",
			desc: "Timed out waiting for auth code listener to be registered."
		},
		stateNotFoundError: {
			code: "state_not_found",
			desc: "State not found. Please verify that the request originated from msal."
		},
		thumbprintMissing: {
			code: "thumbprint_missing_from_client_certificate",
			desc: "Client certificate does not contain a SHA-1 or SHA-256 thumbprint."
		},
		redirectUriNotSupported: {
			code: "redirect_uri_not_supported",
			desc: "RedirectUri is not supported in this scenario. Please remove redirectUri from the request."
		}
	};
	var NodeAuthError = class NodeAuthError extends AuthError {
		constructor(errorCode, correlationId, errorMessage) {
			super(errorCode, correlationId, errorMessage);
			this.name = "NodeAuthError";
		}
		/**
		* Creates an error thrown if loopback server address is of type string.
		*/
		static createInvalidLoopbackAddressTypeError() {
			return new NodeAuthError(NodeAuthErrorMessage.invalidLoopbackAddressType.code, "", `${NodeAuthErrorMessage.invalidLoopbackAddressType.desc}`);
		}
		/**
		* Creates an error thrown if the loopback server is unable to get a url.
		*/
		static createUnableToLoadRedirectUrlError() {
			return new NodeAuthError(NodeAuthErrorMessage.unableToLoadRedirectUri.code, "", `${NodeAuthErrorMessage.unableToLoadRedirectUri.desc}`);
		}
		/**
		* Creates an error thrown if the server response does not contain an auth code.
		*/
		static createNoAuthCodeInResponseError(correlationId = "") {
			return new NodeAuthError(NodeAuthErrorMessage.noAuthCodeInResponse.code, correlationId, `${NodeAuthErrorMessage.noAuthCodeInResponse.desc}`);
		}
		/**
		* Creates an error thrown if the loopback server has not been spun up yet.
		*/
		static createNoLoopbackServerExistsError() {
			return new NodeAuthError(NodeAuthErrorMessage.noLoopbackServerExists.code, "", `${NodeAuthErrorMessage.noLoopbackServerExists.desc}`);
		}
		/**
		* Creates an error thrown if a loopback server already exists when attempting to create another one.
		*/
		static createLoopbackServerAlreadyExistsError() {
			return new NodeAuthError(NodeAuthErrorMessage.loopbackServerAlreadyExists.code, "", `${NodeAuthErrorMessage.loopbackServerAlreadyExists.desc}`);
		}
		/**
		* Creates an error thrown if the loopback server times out registering the auth code listener.
		*/
		static createLoopbackServerTimeoutError(correlationId = "") {
			return new NodeAuthError(NodeAuthErrorMessage.loopbackServerTimeout.code, correlationId, `${NodeAuthErrorMessage.loopbackServerTimeout.desc}`);
		}
		/**
		* Creates an error thrown when the state is not present.
		*/
		static createStateNotFoundError(correlationId = "") {
			return new NodeAuthError(NodeAuthErrorMessage.stateNotFoundError.code, correlationId, NodeAuthErrorMessage.stateNotFoundError.desc);
		}
		/**
		* Creates an error thrown when client certificate was provided, but neither the SHA-1 or SHA-256 thumbprints were provided
		*/
		static createThumbprintMissingError() {
			return new NodeAuthError(NodeAuthErrorMessage.thumbprintMissing.code, "", NodeAuthErrorMessage.thumbprintMissing.desc);
		}
		/**
		* Creates an error thrown when redirectUri is provided in an unsupported scenario
		*/
		static createRedirectUriNotSupportedError(correlationId = "") {
			return new NodeAuthError(NodeAuthErrorMessage.redirectUriNotSupported.code, correlationId, NodeAuthErrorMessage.redirectUriNotSupported.desc);
		}
	};
	var DEFAULT_AUTH_OPTIONS = {
		clientId: "",
		authority: DEFAULT_AUTHORITY,
		clientSecret: "",
		clientAssertion: "",
		clientCertificate: {
			thumbprint: "",
			thumbprintSha256: "",
			privateKey: "",
			x5c: ""
		},
		knownAuthorities: [],
		cloudDiscoveryMetadata: "",
		authorityMetadata: "",
		clientCapabilities: [],
		azureCloudOptions: {
			azureCloudInstance: AzureCloudInstance.None,
			tenant: ""
		},
		isMcp: false
	};
	var DEFAULT_LOGGER_OPTIONS = {
		loggerCallback: () => {},
		piiLoggingEnabled: false,
		logLevel: exports.LogLevel.Info
	};
	var DEFAULT_SYSTEM_OPTIONS = {
		loggerOptions: DEFAULT_LOGGER_OPTIONS,
		networkClient: new HttpClient(),
		disableInternalRetries: false,
		protocolMode: ProtocolMode.AAD
	};
	var DEFAULT_TELEMETRY_OPTIONS = { application: {
		appName: "",
		appVersion: ""
	} };
	/**
	* Sets the default options when not explicitly configured from app developer
	*
	* @param auth - Authentication options
	* @param cache - Cache options
	* @param system - System options
	* @param telemetry - Telemetry options
	*
	* @returns Configuration
	* @internal
	*/
	function buildAppConfiguration({ auth, broker, cache, system, telemetry }) {
		const systemOptions = {
			...DEFAULT_SYSTEM_OPTIONS,
			networkClient: new HttpClient(),
			loggerOptions: system?.loggerOptions || DEFAULT_LOGGER_OPTIONS,
			disableInternalRetries: system?.disableInternalRetries || false
		};
		if (!!auth.clientCertificate && !!!auth.clientCertificate.thumbprint && !!!auth.clientCertificate.thumbprintSha256) throw NodeAuthError.createStateNotFoundError();
		return {
			auth: {
				...DEFAULT_AUTH_OPTIONS,
				...auth
			},
			broker: { ...broker },
			cache: { ...cache },
			system: {
				...systemOptions,
				...system
			},
			telemetry: {
				...DEFAULT_TELEMETRY_OPTIONS,
				...telemetry
			}
		};
	}
	function buildManagedIdentityConfiguration({ clientCapabilities, managedIdentityIdParams, system }) {
		const managedIdentityId = new ManagedIdentityId(managedIdentityIdParams);
		const loggerOptions = system?.loggerOptions || DEFAULT_LOGGER_OPTIONS;
		let networkClient;
		if (system?.networkClient) networkClient = system.networkClient;
		else networkClient = new HttpClient();
		return {
			clientCapabilities: clientCapabilities || [],
			managedIdentityId,
			system: {
				loggerOptions,
				networkClient
			},
			disableInternalRetries: system?.disableInternalRetries || false
		};
	}
	var GuidGenerator = class {
		/**
		* Generates a random [RFC 4122](https://www.rfc-editor.org/rfc/rfc4122.txt) version 4 UUID. The UUID is generated using a
		* cryptographic pseudorandom number generator.
		*/
		generateGuid() {
			return node_crypto.randomUUID();
		}
		/**
		* verifies if a string is  GUID
		* @param guid
		*/
		isGuid(guid) {
			return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guid);
		}
	};
	var EncodingUtils = class EncodingUtils {
		/**
		* 'utf8': Multibyte encoded Unicode characters. Many web pages and other document formats use UTF-8.
		* 'base64': Base64 encoding.
		*
		* @param str text
		*/
		static base64Encode(str, encoding) {
			return Buffer.from(str, encoding).toString(EncodingTypes.BASE64);
		}
		/**
		* encode a URL
		* @param str
		*/
		static base64EncodeUrl(str, encoding) {
			return EncodingUtils.base64Encode(str, encoding).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
		}
		/**
		* 'utf8': Multibyte encoded Unicode characters. Many web pages and other document formats use UTF-8.
		* 'base64': Base64 encoding.
		*
		* @param base64Str Base64 encoded text
		*/
		static base64Decode(base64Str) {
			return Buffer.from(base64Str, EncodingTypes.BASE64).toString("utf8");
		}
		/**
		* @param base64Str Base64 encoded Url
		*/
		static base64DecodeUrl(base64Str) {
			let str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
			while (str.length % 4) str += "=";
			return EncodingUtils.base64Decode(str);
		}
	};
	var HashUtils = class {
		/**
		* generate 'SHA256' hash
		* @param buffer
		*/
		sha256(buffer) {
			return crypto.createHash(Hash.SHA256).update(buffer).digest();
		}
	};
	/**
	* https://tools.ietf.org/html/rfc7636#page-8
	*/
	var PkceGenerator = class {
		constructor() {
			this.hashUtils = new HashUtils();
		}
		/**
		* generates the codeVerfier and the challenge from the codeVerfier
		* reference: https://tools.ietf.org/html/rfc7636#section-4.1 and https://tools.ietf.org/html/rfc7636#section-4.2
		*/
		async generatePkceCodes() {
			const verifier = this.generateCodeVerifier();
			return {
				verifier,
				challenge: this.generateCodeChallengeFromVerifier(verifier)
			};
		}
		/**
		* generates the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.1
		*/
		generateCodeVerifier() {
			const charArr = [];
			const maxNumber = 256 - 256 % CharSet.CV_CHARSET.length;
			while (charArr.length <= RANDOM_OCTET_SIZE) {
				const byte = crypto.randomBytes(1)[0];
				if (byte >= maxNumber) continue;
				const index = byte % CharSet.CV_CHARSET.length;
				charArr.push(CharSet.CV_CHARSET[index]);
			}
			const verifier = charArr.join("");
			return EncodingUtils.base64EncodeUrl(verifier);
		}
		/**
		* generate the challenge from the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.2
		* @param codeVerifier
		*/
		generateCodeChallengeFromVerifier(codeVerifier) {
			return EncodingUtils.base64EncodeUrl(this.hashUtils.sha256(codeVerifier).toString(EncodingTypes.BASE64), EncodingTypes.BASE64);
		}
	};
	/**
	* This class implements MSAL node's crypto interface, which allows it to perform base64 encoding and decoding, generating cryptographically random GUIDs and
	* implementing Proof Key for Code Exchange specs for the OAuth Authorization Code Flow using PKCE (rfc here: https://tools.ietf.org/html/rfc7636).
	* @public
	*/
	var CryptoProvider = class {
		constructor() {
			this.pkceGenerator = new PkceGenerator();
			this.guidGenerator = new GuidGenerator();
			this.hashUtils = new HashUtils();
		}
		/**
		* base64 URL safe encoded string
		*/
		base64UrlEncode() {
			throw new Error("Method not implemented.");
		}
		/**
		* Stringifies and base64Url encodes input public key
		* @param inputKid - public key id
		* @returns Base64Url encoded public key
		*/
		encodeKid() {
			throw new Error("Method not implemented.");
		}
		/**
		* Creates a new random GUID - used to populate state and nonce.
		* @returns string (GUID)
		*/
		createNewGuid() {
			return this.guidGenerator.generateGuid();
		}
		/**
		* Encodes input string to base64.
		* @param input - string to be encoded
		*/
		base64Encode(input) {
			return EncodingUtils.base64Encode(input);
		}
		/**
		* Decodes input string from base64.
		* @param input - string to be decoded
		*/
		base64Decode(input) {
			return EncodingUtils.base64Decode(input);
		}
		/**
		* Generates PKCE codes used in Authorization Code Flow.
		*/
		generatePkceCodes() {
			return this.pkceGenerator.generatePkceCodes();
		}
		/**
		* Generates a keypair, stores it and returns a thumbprint - not yet implemented for node
		*/
		getPublicKeyThumbprint() {
			throw new Error("Method not implemented.");
		}
		/**
		* Removes cryptographic keypair from key store matching the keyId passed in
		* @param kid - public key id
		*/
		removeTokenBindingKey() {
			throw new Error("Method not implemented.");
		}
		/**
		* Removes all cryptographic keys from Keystore
		*/
		clearKeystore() {
			throw new Error("Method not implemented.");
		}
		/**
		* Signs the given object as a jwt payload with private key retrieved by given kid - currently not implemented for node
		*/
		signJwt() {
			throw new Error("Method not implemented.");
		}
		/**
		* Returns the SHA-256 hash of an input string
		*/
		async hashString(plainText) {
			return EncodingUtils.base64EncodeUrl(this.hashUtils.sha256(plainText).toString(EncodingTypes.BASE64), EncodingTypes.BASE64);
		}
	};
	/**
	* Computes a combined hash from additional cache key components.
	*
	* Matches the cross-SDK algorithm: sort keys ascending → for each key append a
	* length-prefixed (netstring-style) encoding of the key and value → SHA-256 →
	* Base64URL (no padding).
	*
	* Each entry is encoded as `<byteLen(key)>:<key><byteLen(value)>:<value>` where the
	* lengths are the UTF-8 **byte** lengths (via `Buffer.byteLength`, not `String.length`
	* which counts UTF-16 code units). The length prefixes make the serialization injective
	* so that semantically different component sets can never serialize to the same byte
	* string. A plain delimiter-less concatenation of key+value is ambiguous
	* (e.g. `{fmi_path:"value"}` and `{fmi_pat:"hvalue"}` would both yield `fmi_pathvalue`),
	* which would collide into the same credential cache slot.
	*
	* The encoding is byte-identical to the other MSAL SDKs (Go/.NET/Java/Python), so the
	* resulting hash is a stable cross-SDK cache key. The final credential key is lowercased
	* downstream in `generateCredentialKey`.
	*/
	function computeAdditionalCacheKeyHash(components) {
		const sortedKeys = Object.keys(components).sort();
		let input = "";
		for (const key of sortedKeys) {
			const value = components[key];
			input += `${Buffer.byteLength(key, "utf8")}:${key}${Buffer.byteLength(value, "utf8")}:${value}`;
		}
		return crypto.createHash("sha256").update(input, "utf8").digest("base64url");
	}
	function generateCredentialKey(credential, hash) {
		const familyId = credential.credentialType === CredentialType.REFRESH_TOKEN && credential.familyId || credential.clientId;
		const scheme = credential.tokenType && credential.tokenType.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase() ? credential.tokenType.toLowerCase() : "";
		const credentialKey = [
			credential.homeAccountId,
			credential.environment,
			credential.credentialType,
			familyId,
			credential.realm || "",
			credential.target || "",
			scheme
		];
		if (credential.additionalCacheKeyComponents && Object.keys(credential.additionalCacheKeyComponents).length > 0) credentialKey.push(hash ?? computeAdditionalCacheKeyHash(credential.additionalCacheKeyComponents));
		return credentialKey.join(CACHE.KEY_SEPARATOR).toLowerCase();
	}
	function generateAccountKey(account) {
		const homeTenantId = account.homeAccountId.split(".")[1];
		return [
			account.homeAccountId,
			account.environment,
			homeTenantId || account.tenantId || ""
		].join(CACHE.KEY_SEPARATOR).toLowerCase();
	}
	/**
	* This class implements Storage for node, reading cache from user specified storage location or an  extension library
	* @public
	*/
	var NodeStorage = class extends CacheManager {
		constructor(logger, clientId, cryptoImpl, staticAuthorityOptions) {
			super(clientId, cryptoImpl, logger, new StubPerformanceClient(), staticAuthorityOptions);
			this.cache = {};
			this.changeEmitters = [];
			this.logger = logger;
		}
		/**
		* Queue up callbacks
		* @param func - a callback function for cache change indication
		*/
		registerChangeEmitter(func) {
			this.changeEmitters.push(func);
		}
		/**
		* Invoke the callback when cache changes
		*/
		emitChange() {
			this.changeEmitters.forEach((func) => func.call(null));
		}
		/**
		* Converts cacheKVStore to InMemoryCache
		* @param cache - key value store
		*/
		cacheToInMemoryCache(cache) {
			const inMemoryCache = {
				accounts: {},
				idTokens: {},
				accessTokens: {},
				refreshTokens: {},
				appMetadata: {}
			};
			for (const key in cache) {
				const value = cache[key];
				if (typeof value !== "object") continue;
				if (isAccountEntity(value)) inMemoryCache.accounts[key] = value;
				else if (isIdTokenEntity(value)) inMemoryCache.idTokens[key] = value;
				else if (isAccessTokenEntity(value)) inMemoryCache.accessTokens[key] = value;
				else if (isRefreshTokenEntity(value)) inMemoryCache.refreshTokens[key] = value;
				else if (isAppMetadataEntity(key, value)) inMemoryCache.appMetadata[key] = value;
				else continue;
			}
			return inMemoryCache;
		}
		/**
		* converts inMemoryCache to CacheKVStore
		* @param inMemoryCache - kvstore map for inmemory
		*/
		inMemoryCacheToCache(inMemoryCache) {
			let cache = this.getCache();
			cache = {
				...cache,
				...inMemoryCache.accounts,
				...inMemoryCache.idTokens,
				...inMemoryCache.accessTokens,
				...inMemoryCache.refreshTokens,
				...inMemoryCache.appMetadata
			};
			return cache;
		}
		/**
		* gets the current in memory cache for the client
		*/
		getInMemoryCache() {
			this.logger.trace("Getting in-memory cache", "");
			return this.cacheToInMemoryCache(this.getCache());
		}
		/**
		* sets the current in memory cache for the client
		* @param inMemoryCache - key value map in memory
		*/
		setInMemoryCache(inMemoryCache) {
			this.logger.trace("Setting in-memory cache", "");
			const cache = this.inMemoryCacheToCache(inMemoryCache);
			this.setCache(cache);
			this.emitChange();
		}
		/**
		* get the current cache key-value store
		*/
		getCache() {
			this.logger.trace("Getting cache key-value store", "");
			return this.cache;
		}
		/**
		* sets the current cache (key value store)
		* @param cacheMap - key value map
		*/
		setCache(cache) {
			this.logger.trace("Setting cache key value store", "");
			this.cache = cache;
			this.emitChange();
		}
		/**
		* Gets cache item with given key.
		* @param key - lookup key for the cache entry
		*/
		getItem(key) {
			this.logger.tracePii(`Item key: ${key}`, "");
			return this.getCache()[key];
		}
		/**
		* Gets cache item with given key-value
		* @param key - lookup key for the cache entry
		* @param value - value of the cache entry
		*/
		setItem(key, value) {
			this.logger.tracePii(`Item key: ${key}`, "");
			const cache = this.getCache();
			cache[key] = value;
			this.setCache(cache);
		}
		generateCredentialKey(credential, additionalCacheKeyHash) {
			return generateCredentialKey(credential, additionalCacheKeyHash);
		}
		generateAccountKey(account) {
			return generateAccountKey(account);
		}
		getAccountKeys() {
			const inMemoryCache = this.getInMemoryCache();
			return Object.keys(inMemoryCache.accounts);
		}
		getTokenKeys() {
			const inMemoryCache = this.getInMemoryCache();
			return {
				idToken: Object.keys(inMemoryCache.idTokens),
				accessToken: Object.keys(inMemoryCache.accessTokens),
				refreshToken: Object.keys(inMemoryCache.refreshTokens)
			};
		}
		/**
		* Reads account from cache, builds it into an account entity and returns it.
		* @param accountKey - lookup key to fetch cache type AccountEntity
		* @returns
		*/
		getAccount(accountKey) {
			const cachedAccount = this.getItem(accountKey);
			return cachedAccount && typeof cachedAccount === "object" ? { ...cachedAccount } : null;
		}
		/**
		* set account entity
		* @param account - cache value to be set of type AccountEntity
		*/
		async setAccount(account) {
			const accountKey = this.generateAccountKey(getAccountInfo(account));
			this.setItem(accountKey, account);
		}
		/**
		* fetch the idToken credential
		* @param idTokenKey - lookup key to fetch cache type IdTokenEntity
		*/
		getIdTokenCredential(idTokenKey) {
			const idToken = this.getItem(idTokenKey);
			if (isIdTokenEntity(idToken)) return idToken;
			return null;
		}
		/**
		* set idToken credential
		* @param idToken - cache value to be set of type IdTokenEntity
		*/
		async setIdTokenCredential(idToken) {
			const idTokenKey = this.generateCredentialKey(idToken);
			this.setItem(idTokenKey, idToken);
		}
		/**
		* fetch the accessToken credential
		* @param accessTokenKey - lookup key to fetch cache type AccessTokenEntity
		*/
		getAccessTokenCredential(accessTokenKey) {
			const accessToken = this.getItem(accessTokenKey);
			if (isAccessTokenEntity(accessToken)) return accessToken;
			return null;
		}
		/**
		* Set accessToken credential to the cache
		* @param accessToken - the access token entity to cache
		* @param _correlationId - unique identifier for the request
		* @param _kmsi - keep me signed in flag
		* @param additionalCacheKeyHash - optional precomputed hash of additionalCacheKeyComponents used in key generation
		*/
		async setAccessTokenCredential(accessToken, _correlationId, _kmsi, additionalCacheKeyHash) {
			const accessTokenKey = this.generateCredentialKey(accessToken, additionalCacheKeyHash);
			this.setItem(accessTokenKey, accessToken);
		}
		/**
		* fetch the refreshToken credential
		* @param refreshTokenKey - lookup key to fetch cache type RefreshTokenEntity
		*/
		getRefreshTokenCredential(refreshTokenKey) {
			const refreshToken = this.getItem(refreshTokenKey);
			if (isRefreshTokenEntity(refreshToken)) return refreshToken;
			return null;
		}
		/**
		* set refreshToken credential
		* @param refreshToken - cache value to be set of type RefreshTokenEntity
		*/
		async setRefreshTokenCredential(refreshToken) {
			const refreshTokenKey = this.generateCredentialKey(refreshToken);
			this.setItem(refreshTokenKey, refreshToken);
		}
		/**
		* fetch appMetadata entity from the platform cache
		* @param appMetadataKey - lookup key to fetch cache type AppMetadataEntity
		*/
		getAppMetadata(appMetadataKey) {
			const appMetadata = this.getItem(appMetadataKey);
			if (isAppMetadataEntity(appMetadataKey, appMetadata)) return appMetadata;
			return null;
		}
		/**
		* set appMetadata entity to the platform cache
		* @param appMetadata - cache value to be set of type AppMetadataEntity
		*/
		setAppMetadata(appMetadata) {
			const appMetadataKey = generateAppMetadataKey(appMetadata);
			this.setItem(appMetadataKey, appMetadata);
		}
		/**
		* fetch server telemetry entity from the platform cache
		* @param serverTelemetrykey - lookup key to fetch cache type ServerTelemetryEntity
		*/
		getServerTelemetry(serverTelemetrykey) {
			const serverTelemetryEntity = this.getItem(serverTelemetrykey);
			if (serverTelemetryEntity && isServerTelemetryEntity(serverTelemetrykey, serverTelemetryEntity)) return serverTelemetryEntity;
			return null;
		}
		/**
		* set server telemetry entity to the platform cache
		* @param serverTelemetryKey - lookup key to fetch cache type ServerTelemetryEntity
		* @param serverTelemetry - cache value to be set of type ServerTelemetryEntity
		*/
		setServerTelemetry(serverTelemetryKey, serverTelemetry) {
			this.setItem(serverTelemetryKey, serverTelemetry);
		}
		/**
		* fetch authority metadata entity from the platform cache
		* @param key - lookup key to fetch cache type AuthorityMetadataEntity
		*/
		getAuthorityMetadata(key) {
			const authorityMetadataEntity = this.getItem(key);
			if (authorityMetadataEntity && isAuthorityMetadataEntity(key, authorityMetadataEntity)) return authorityMetadataEntity;
			return null;
		}
		/**
		* Get all authority metadata keys
		*/
		getAuthorityMetadataKeys() {
			return this.getKeys().filter((key) => {
				return this.isAuthorityMetadata(key);
			});
		}
		/**
		* set authority metadata entity to the platform cache
		* @param key - lookup key to fetch cache type AuthorityMetadataEntity
		* @param metadata - cache value to be set of type AuthorityMetadataEntity
		*/
		setAuthorityMetadata(key, metadata) {
			this.setItem(key, metadata);
		}
		/**
		* fetch throttling entity from the platform cache
		* @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
		*/
		getThrottlingCache(throttlingCacheKey) {
			const throttlingCache = this.getItem(throttlingCacheKey);
			if (throttlingCache && isThrottlingEntity(throttlingCacheKey, throttlingCache)) return throttlingCache;
			return null;
		}
		/**
		* set throttling entity to the platform cache
		* @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
		* @param throttlingCache - cache value to be set of type ThrottlingEntity
		*/
		setThrottlingCache(throttlingCacheKey, throttlingCache) {
			this.setItem(throttlingCacheKey, throttlingCache);
		}
		/**
		* Removes the cache item from memory with the given key.
		* @param key - lookup key to remove a cache entity
		* @param inMemory - key value map of the cache
		*/
		removeItem(key) {
			this.logger.tracePii(`Item key: ${key}`, "");
			let result = false;
			const cache = this.getCache();
			if (!!cache[key]) {
				delete cache[key];
				result = true;
			}
			if (result) {
				this.setCache(cache);
				this.emitChange();
			}
			return result;
		}
		/**
		* Remove account entity from the platform cache if it's outdated
		* @param accountKey - lookup key to fetch cache type AccountEntity
		*/
		removeOutdatedAccount(accountKey) {
			this.removeItem(accountKey);
		}
		/**
		* Checks whether key is in cache.
		* @param key - look up key for a cache entity
		*/
		containsKey(key) {
			return this.getKeys().includes(key);
		}
		/**
		* Gets all keys in window.
		*/
		getKeys() {
			this.logger.trace("Retrieving all cache keys", "");
			const cache = this.getCache();
			return [...Object.keys(cache)];
		}
		/**
		* Clears all cache entries created by MSAL except authority metadata..
		*/
		clear() {
			this.logger.trace("Clearing cache entries created by MSAL", "");
			this.getKeys().forEach((key) => {
				if (this.isAuthorityMetadata(key)) return;
				this.removeItem(key);
			});
			this.emitChange();
		}
		/**
		* Initialize in memory cache from an exisiting cache vault
		* @param cache - blob formatted cache (JSON)
		*/
		static generateInMemoryCache(cache) {
			return Deserializer.deserializeAllCache(Deserializer.deserializeJSONBlob(cache));
		}
		/**
		* retrieves the final JSON
		* @param inMemoryCache - itemised cache read from the JSON
		*/
		static generateJsonCache(inMemoryCache) {
			return Serializer.serializeAllCache(inMemoryCache);
		}
		/**
		* Updates a credential's cache key if the current cache key is outdated
		*/
		updateCredentialCacheKey(currentCacheKey, credential) {
			const updatedCacheKey = this.generateCredentialKey(credential);
			if (currentCacheKey !== updatedCacheKey) {
				const cacheItem = this.getItem(currentCacheKey);
				if (cacheItem) {
					this.removeItem(currentCacheKey);
					this.setItem(updatedCacheKey, cacheItem);
					this.logger.verbose(`Updated an outdated ${credential.credentialType} cache key`, "");
					return updatedCacheKey;
				} else this.logger.error(`Attempted to update an outdated ${credential.credentialType} cache key but no item matching the outdated key was found in storage`, "");
			}
			return currentCacheKey;
		}
	};
	var defaultSerializedCache = {
		Account: {},
		IdToken: {},
		AccessToken: {},
		RefreshToken: {},
		AppMetadata: {}
	};
	/**
	* In-memory token cache manager
	* @public
	*/
	var TokenCache = class {
		constructor(storage, logger, cachePlugin) {
			this.cacheHasChanged = false;
			this.storage = storage;
			this.storage.registerChangeEmitter(this.handleChangeEvent.bind(this));
			if (cachePlugin) this.persistence = cachePlugin;
			this.logger = logger;
		}
		/**
		* Set to true if cache state has changed since last time serialize or writeToPersistence was called
		*/
		hasChanged() {
			return this.cacheHasChanged;
		}
		/**
		* Serializes in memory cache to JSON
		*/
		serialize() {
			this.logger.trace("Serializing in-memory cache", "");
			let finalState = Serializer.serializeAllCache(this.storage.getInMemoryCache());
			if (this.cacheSnapshot) {
				this.logger.trace("Reading cache snapshot from disk", "");
				finalState = this.mergeState(JSON.parse(this.cacheSnapshot), finalState);
			} else this.logger.trace("No cache snapshot to merge", "");
			this.cacheHasChanged = false;
			return JSON.stringify(finalState);
		}
		/**
		* Deserializes JSON to in-memory cache. JSON should be in MSAL cache schema format
		* @param cache - blob formatted cache
		*/
		deserialize(cache) {
			this.logger.trace("Deserializing JSON to in-memory cache", "");
			this.cacheSnapshot = cache;
			if (this.cacheSnapshot) {
				this.logger.trace("Reading cache snapshot from disk", "");
				const deserializedCache = Deserializer.deserializeAllCache(this.overlayDefaults(JSON.parse(this.cacheSnapshot)));
				this.storage.setInMemoryCache(deserializedCache);
			} else this.logger.trace("No cache snapshot to deserialize", "");
		}
		/**
		* Fetches the cache key-value map
		*/
		getKVStore() {
			return this.storage.getCache();
		}
		/**
		* Gets cache snapshot in CacheKVStore format
		*/
		getCacheSnapshot() {
			const deserializedPersistentStorage = NodeStorage.generateInMemoryCache(this.cacheSnapshot);
			return this.storage.inMemoryCacheToCache(deserializedPersistentStorage);
		}
		/**
		* API that retrieves all accounts currently in cache to the user
		*/
		async getAllAccounts(correlationId = new CryptoProvider().createNewGuid()) {
			this.logger.trace("getAllAccounts called", correlationId);
			let cacheContext;
			try {
				if (this.persistence) {
					cacheContext = new TokenCacheContext(this, false);
					await this.persistence.beforeCacheAccess(cacheContext);
				}
				return this.storage.getAllAccounts({}, correlationId);
			} finally {
				if (this.persistence && cacheContext) await this.persistence.afterCacheAccess(cacheContext);
			}
		}
		/**
		* Returns the signed in account matching homeAccountId.
		* (the account object is created at the time of successful login)
		* or null when no matching account is found
		* @param homeAccountId - unique identifier for an account (uid.utid)
		*/
		async getAccountByHomeId(homeAccountId) {
			const allAccounts = await this.getAllAccounts();
			if (homeAccountId && allAccounts && allAccounts.length) return allAccounts.filter((accountObj) => accountObj.homeAccountId === homeAccountId)[0] || null;
			else return null;
		}
		/**
		* Returns the signed in account matching localAccountId.
		* (the account object is created at the time of successful login)
		* or null when no matching account is found
		* @param localAccountId - unique identifier of an account (sub/obj when homeAccountId cannot be populated)
		*/
		async getAccountByLocalId(localAccountId) {
			const allAccounts = await this.getAllAccounts();
			if (localAccountId && allAccounts && allAccounts.length) return allAccounts.filter((accountObj) => accountObj.localAccountId === localAccountId)[0] || null;
			else return null;
		}
		/**
		* API to remove a specific account and the relevant data from cache
		* @param account - AccountInfo passed by the user
		*/
		async removeAccount(account, correlationId) {
			this.logger.trace("removeAccount called", correlationId || "");
			let cacheContext;
			try {
				if (this.persistence) {
					cacheContext = new TokenCacheContext(this, true);
					await this.persistence.beforeCacheAccess(cacheContext);
				}
				this.storage.removeAccount(account, correlationId || new GuidGenerator().generateGuid());
			} finally {
				if (this.persistence && cacheContext) await this.persistence.afterCacheAccess(cacheContext);
			}
		}
		/**
		* Overwrites in-memory cache with persistent cache
		*/
		async overwriteCache() {
			if (!this.persistence) {
				this.logger.info("No persistence layer specified, cache cannot be overwritten", "");
				return;
			}
			this.logger.info("Overwriting in-memory cache with persistent cache", "");
			this.storage.clear();
			const cacheContext = new TokenCacheContext(this, false);
			await this.persistence.beforeCacheAccess(cacheContext);
			const cacheSnapshot = this.getCacheSnapshot();
			this.storage.setCache(cacheSnapshot);
			await this.persistence.afterCacheAccess(cacheContext);
		}
		/**
		* Called when the cache has changed state.
		*/
		handleChangeEvent() {
			this.cacheHasChanged = true;
		}
		/**
		* Merge in memory cache with the cache snapshot.
		* @param oldState - cache before changes
		* @param currentState - current cache state in the library
		*/
		mergeState(oldState, currentState) {
			this.logger.trace("Merging in-memory cache with cache snapshot", "");
			const stateAfterRemoval = this.mergeRemovals(oldState, currentState);
			return this.mergeUpdates(stateAfterRemoval, currentState);
		}
		/**
		* Deep update of oldState based on newState values
		* @param oldState - cache before changes
		* @param newState - updated cache
		*/
		mergeUpdates(oldState, newState) {
			Object.keys(newState).forEach((newKey) => {
				const newValue = newState[newKey];
				if (!oldState.hasOwnProperty(newKey)) {
					if (newValue !== null) oldState[newKey] = newValue;
				} else {
					const newValueNotNull = newValue !== null;
					const newValueIsObject = typeof newValue === "object";
					const newValueIsNotArray = !Array.isArray(newValue);
					const oldStateNotUndefinedOrNull = typeof oldState[newKey] !== "undefined" && oldState[newKey] !== null;
					if (newValueNotNull && newValueIsObject && newValueIsNotArray && oldStateNotUndefinedOrNull) this.mergeUpdates(oldState[newKey], newValue);
					else oldState[newKey] = newValue;
				}
			});
			return oldState;
		}
		/**
		* Removes entities in oldState that the were removed from newState. If there are any unknown values in root of
		* oldState that are not recognized, they are left untouched.
		* @param oldState - cache before changes
		* @param newState - updated cache
		*/
		mergeRemovals(oldState, newState) {
			this.logger.trace("Remove updated entries in cache", "");
			const accounts = oldState.Account ? this.mergeRemovalsDict(oldState.Account, newState.Account) : oldState.Account;
			const accessTokens = oldState.AccessToken ? this.mergeRemovalsDict(oldState.AccessToken, newState.AccessToken) : oldState.AccessToken;
			const refreshTokens = oldState.RefreshToken ? this.mergeRemovalsDict(oldState.RefreshToken, newState.RefreshToken) : oldState.RefreshToken;
			const idTokens = oldState.IdToken ? this.mergeRemovalsDict(oldState.IdToken, newState.IdToken) : oldState.IdToken;
			const appMetadata = oldState.AppMetadata ? this.mergeRemovalsDict(oldState.AppMetadata, newState.AppMetadata) : oldState.AppMetadata;
			return {
				...oldState,
				Account: accounts,
				AccessToken: accessTokens,
				RefreshToken: refreshTokens,
				IdToken: idTokens,
				AppMetadata: appMetadata
			};
		}
		/**
		* Helper to merge new cache with the old one
		* @param oldState - cache before changes
		* @param newState - updated cache
		*/
		mergeRemovalsDict(oldState, newState) {
			const finalState = { ...oldState };
			Object.keys(oldState).forEach((oldKey) => {
				if (!newState || !newState.hasOwnProperty(oldKey)) delete finalState[oldKey];
			});
			return finalState;
		}
		/**
		* Helper to overlay as a part of cache merge
		* @param passedInCache - cache read from the blob
		*/
		overlayDefaults(passedInCache) {
			this.logger.trace("Overlaying input cache with the default cache", "");
			return {
				Account: {
					...defaultSerializedCache.Account,
					...passedInCache.Account
				},
				IdToken: {
					...defaultSerializedCache.IdToken,
					...passedInCache.IdToken
				},
				AccessToken: {
					...defaultSerializedCache.AccessToken,
					...passedInCache.AccessToken
				},
				RefreshToken: {
					...defaultSerializedCache.RefreshToken,
					...passedInCache.RefreshToken
				},
				AppMetadata: {
					...defaultSerializedCache.AppMetadata,
					...passedInCache.AppMetadata
				}
			};
		}
	};
	var missingTenantIdError = "missing_tenant_id_error";
	var userTimeoutReached = "user_timeout_reached";
	var invalidAssertion = "invalid_assertion";
	var invalidClientCredential = "invalid_client_credential";
	var emptyFicAssertion = "empty_fic_assertion";
	var conflictingUserIdentifiers = "conflicting_user_identifiers";
	var missingUserIdentifier = "missing_user_identifier";
	var deviceCodePollingCancelled = "device_code_polling_cancelled";
	var deviceCodeExpired = "device_code_expired";
	var deviceCodeUnknownError = "device_code_unknown_error";
	/**
	* Client assertion of type jwt-bearer used in confidential client flows
	* @public
	*/
	var ClientAssertion = class ClientAssertion {
		/**
		* Initialize the ClientAssertion class from the clientAssertion passed by the user
		* @param assertion - refer https://tools.ietf.org/html/rfc7521
		*/
		static fromAssertion(assertion) {
			const clientAssertion = new ClientAssertion();
			clientAssertion.jwt = assertion;
			return clientAssertion;
		}
		/**
		* @deprecated Use fromCertificateWithSha256Thumbprint instead, with a SHA-256 thumprint
		* Initialize the ClientAssertion class from the certificate passed by the user
		* @param thumbprint - identifier of a certificate
		* @param privateKey - secret key
		* @param publicCertificate - electronic document provided to prove the ownership of the public key
		*/
		static fromCertificate(thumbprint, privateKey, publicCertificate) {
			const clientAssertion = new ClientAssertion();
			clientAssertion.privateKey = privateKey;
			clientAssertion.thumbprint = thumbprint;
			clientAssertion.useSha256 = false;
			if (publicCertificate) clientAssertion.publicCertificate = this.parseCertificate(publicCertificate);
			return clientAssertion;
		}
		/**
		* Initialize the ClientAssertion class from the certificate passed by the user
		* @param thumbprint - identifier of a certificate
		* @param privateKey - secret key
		* @param publicCertificate - electronic document provided to prove the ownership of the public key
		*/
		static fromCertificateWithSha256Thumbprint(thumbprint, privateKey, publicCertificate) {
			const clientAssertion = new ClientAssertion();
			clientAssertion.privateKey = privateKey;
			clientAssertion.thumbprint = thumbprint;
			clientAssertion.useSha256 = true;
			if (publicCertificate) clientAssertion.publicCertificate = this.parseCertificate(publicCertificate);
			return clientAssertion;
		}
		/**
		* Update JWT for certificate based clientAssertion, if passed by the user, uses it as is
		* @param cryptoProvider - library's crypto helper
		* @param issuer - iss claim
		* @param jwtAudience - aud claim
		*/
		getJwt(cryptoProvider, issuer, jwtAudience) {
			if (this.privateKey && this.thumbprint) {
				if (this.jwt && !this.isExpired() && issuer === this.issuer && jwtAudience === this.jwtAudience) return this.jwt;
				return this.createJwt(cryptoProvider, issuer, jwtAudience);
			}
			if (this.jwt) return this.jwt;
			throw createClientAuthError(invalidAssertion, "");
		}
		/**
		* JWT format and required claims specified: https://tools.ietf.org/html/rfc7523#section-3
		*/
		createJwt(cryptoProvider, issuer, jwtAudience) {
			this.issuer = issuer;
			this.jwtAudience = jwtAudience;
			const issuedAt = nowSeconds();
			this.expirationTime = issuedAt + 600;
			const header = { alg: this.useSha256 ? JwtConstants.PSS_256 : JwtConstants.RSA_256 };
			const thumbprintHeader = this.useSha256 ? JwtConstants.X5T_256 : JwtConstants.X5T;
			Object.assign(header, { [thumbprintHeader]: EncodingUtils.base64EncodeUrl(this.thumbprint, EncodingTypes.HEX) });
			if (this.publicCertificate) Object.assign(header, { [JwtConstants.X5C]: this.publicCertificate });
			const payload = {
				[JwtConstants.AUDIENCE]: this.jwtAudience,
				[JwtConstants.EXPIRATION_TIME]: this.expirationTime,
				[JwtConstants.ISSUER]: this.issuer,
				[JwtConstants.SUBJECT]: this.issuer,
				[JwtConstants.NOT_BEFORE]: issuedAt,
				[JwtConstants.JWT_ID]: cryptoProvider.createNewGuid()
			};
			this.jwt = jwt.sign(payload, this.privateKey, { header });
			return this.jwt;
		}
		/**
		* Utility API to check expiration
		*/
		isExpired() {
			return this.expirationTime < nowSeconds();
		}
		/**
		* Extracts the raw certs from a given certificate string and returns them in an array.
		* @param publicCertificate - electronic document provided to prove the ownership of the public key
		*/
		static parseCertificate(publicCertificate) {
			/**
			* This is regex to identify the certs in a given certificate string.
			* We want to look for the contents between the BEGIN and END certificate strings, without the associated newlines.
			* The information in parens "(.+?)" is the capture group to represent the cert we want isolated.
			* "." means any string character, "+" means match 1 or more times, and "?" means the shortest match.
			* The "g" at the end of the regex means search the string globally, and the "s" enables the "." to match newlines.
			*/
			const regexToFindCerts = /-----BEGIN CERTIFICATE-----\r*\n(.+?)\r*\n-----END CERTIFICATE-----/gs;
			const certs = [];
			let matches;
			while ((matches = regexToFindCerts.exec(publicCertificate)) !== null) certs.push(matches[1].replace(/\r*\n/g, ""));
			return certs;
		}
	};
	var name = "@azure/msal-node";
	var version = "5.5.0";
	/**
	* Base application class which will construct requests to send to and handle responses from the Microsoft STS using the authorization code flow.
	* @internal
	*/
	var BaseClient = class {
		constructor(configuration) {
			this.config = buildClientConfiguration(configuration);
			this.logger = new Logger(this.config.loggerOptions, name, version);
			this.cryptoUtils = this.config.cryptoInterface;
			this.cacheManager = this.config.storageInterface;
			this.networkClient = this.config.networkInterface;
			this.serverTelemetryManager = this.config.serverTelemetryManager;
			this.authority = this.config.authOptions.authority;
			this.performanceClient = new StubPerformanceClient();
		}
		/**
		* Creates default headers for requests to token endpoint
		*/
		createTokenRequestHeaders(ccsCred) {
			return createTokenRequestHeaders(this.logger, false, ccsCred);
		}
		/**
		* Http post to token endpoint
		* @param tokenEndpoint
		* @param queryString
		* @param headers
		* @param thumbprint
		*/
		async executePostToTokenEndpoint(tokenEndpoint, queryString, headers, thumbprint, correlationId) {
			return executePostToTokenEndpoint(tokenEndpoint, queryString, headers, thumbprint, correlationId, this.cacheManager, this.networkClient, this.logger, this.performanceClient, this.serverTelemetryManager);
		}
		/**
		* Wraps sendPostRequestAsync with necessary preflight and postflight logic
		* @param thumbprint - Request thumbprint for throttling
		* @param tokenEndpoint - Endpoint to make the POST to
		* @param options - Body and Headers to include on the POST request
		* @param correlationId - CorrelationId for telemetry
		*/
		async sendPostRequest(thumbprint, tokenEndpoint, options, correlationId) {
			return sendPostRequest(thumbprint, tokenEndpoint, options, correlationId, this.cacheManager, this.networkClient, this.logger, this.performanceClient);
		}
		/**
		* Creates query string for the /token request
		* @param request
		*/
		createTokenQueryParameters(request) {
			return createTokenQueryParameters(request, this.config.authOptions.clientId, this.config.authOptions.redirectUri, this.performanceClient);
		}
	};
	/**
	* Oauth2.0 Password grant client
	* Note: We are only supporting public clients for password grant and for purely testing purposes
	* @public
	* @deprecated - Use a more secure flow instead
	*/
	var UsernamePasswordClient = class extends BaseClient {
		constructor(configuration) {
			super(configuration);
		}
		/**
		* API to acquire a token by passing the username and password to the service in exchage of credentials
		* password_grant
		* @param request - CommonUsernamePasswordRequest
		*/
		async acquireToken(request) {
			this.logger.info("in acquireToken call in username-password client", request.correlationId);
			const reqTimestamp = nowSeconds();
			const response = await this.executeTokenRequest(this.authority, request);
			const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.performanceClient, this.config.serializableCache, this.config.persistencePlugin);
			responseHandler.validateTokenResponse(response.body, request.correlationId);
			return responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request, ApiId.acquireTokenByUsernamePassword);
		}
		/**
		* Executes POST request to token endpoint
		* @param authority - authority object
		* @param request - CommonUsernamePasswordRequest provided by the developer
		*/
		async executeTokenRequest(authority, request) {
			const queryParametersString = this.createTokenQueryParameters(request);
			const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
			const requestBody = await this.createTokenRequestBody(request);
			const headers = this.createTokenRequestHeaders({
				credential: request.username,
				type: CcsCredentialType.UPN
			});
			const thumbprint = {
				clientId: this.config.authOptions.clientId,
				authority: authority.canonicalAuthority,
				scopes: request.scopes,
				claims: request.claims,
				authenticationScheme: request.authenticationScheme,
				resourceRequestMethod: request.resourceRequestMethod,
				resourceRequestUri: request.resourceRequestUri,
				shrClaims: request.shrClaims,
				sshKid: request.sshKid
			};
			return this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint, request.correlationId);
		}
		/**
		* Generates a map for all the params to be sent to the service
		* @param request - CommonUsernamePasswordRequest provided by the developer
		*/
		async createTokenRequestBody(request) {
			const parameters = /* @__PURE__ */ new Map();
			addClientId(parameters, this.config.authOptions.clientId);
			addUsername(parameters, request.username);
			addPassword(parameters, request.password);
			addScopes(parameters, request.scopes, request.correlationId);
			addResponseType(parameters, OAuthResponseType.IDTOKEN_TOKEN);
			addGrantType(parameters, GrantType.RESOURCE_OWNER_PASSWORD_GRANT);
			addClientInfo(parameters);
			addLibraryInfo(parameters, this.config.libraryInfo);
			addApplicationTelemetry(parameters, this.config.telemetry.application);
			addThrottling(parameters);
			if (this.serverTelemetryManager) addServerTelemetry(parameters, this.serverTelemetryManager);
			addCorrelationId(parameters, request.correlationId || this.config.cryptoInterface.createNewGuid());
			if (this.config.clientCredentials.clientSecret) addClientSecret(parameters, this.config.clientCredentials.clientSecret);
			const clientAssertion = this.config.clientCredentials.clientAssertion;
			if (clientAssertion) {
				addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
				addClientAssertionType(parameters, clientAssertion.assertionType);
			}
			if (!StringUtils.isEmptyObj(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) addClaims(parameters, request.correlationId, request.claims, this.config.authOptions.clientCapabilities);
			if (this.config.systemOptions.preventCorsPreflight && request.username) addCcsUpn(parameters, request.username);
			return mapToQueryString(parameters);
		}
	};
	/**
	* Constructs the full /authorize URL with request parameters
	* @param config
	* @param authority
	* @param request
	* @param logger
	* @returns
	*/
	function getAuthCodeRequestUrl(config, authority, request, logger) {
		const parameters = getStandardAuthorizeRequestParameters({
			...config.auth,
			authority,
			redirectUri: request.redirectUri || ""
		}, request, logger);
		addLibraryInfo(parameters, {
			sku: Constants.MSAL_SKU,
			version,
			cpu: process.arch || "",
			os: process.platform || ""
		});
		if (config.system.protocolMode !== ProtocolMode.OIDC) addApplicationTelemetry(parameters, config.telemetry.application);
		addResponseType(parameters, OAuthResponseType.CODE);
		if (request.codeChallenge && request.codeChallengeMethod) addCodeChallengeParams(parameters, request.codeChallenge, request.codeChallengeMethod);
		addExtraParameters(parameters, request.extraQueryParameters || {});
		return getAuthorizeUrl(authority, parameters);
	}
	/**
	* Base abstract class for all ClientApplications - public and confidential
	* @public
	*/
	var ClientApplication = class {
		/**
		* Constructor for the ClientApplication
		*/
		constructor(configuration) {
			this.config = buildAppConfiguration(configuration);
			this.cryptoProvider = new CryptoProvider();
			this.logger = new Logger(this.config.system.loggerOptions, name, version);
			this.storage = new NodeStorage(this.logger, this.config.auth.clientId, this.cryptoProvider, buildStaticAuthorityOptions(this.config.auth));
			this.tokenCache = new TokenCache(this.storage, this.logger, this.config.cache.cachePlugin);
		}
		/**
		* Creates the URL of the authorization request, letting the user input credentials and consent to the
		* application. The URL targets the /authorize endpoint of the authority configured in the
		* application object.
		*
		* Once the user inputs their credentials and consents, the authority will send a response to the redirect URI
		* sent in the request and should contain an authorization code, which can then be used to acquire tokens via
		* `acquireTokenByCode(AuthorizationCodeRequest)`.
		*/
		async getAuthCodeUrl(request) {
			this.logger.info("getAuthCodeUrl called", request.correlationId || "");
			const validRequest = {
				...request,
				...await this.initializeBaseRequest(request),
				responseMode: request.responseMode || ResponseMode$1.QUERY,
				authenticationScheme: AuthenticationScheme.BEARER,
				state: request.state || "",
				nonce: request.nonce || ""
			};
			const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
			return getAuthCodeRequestUrl(this.config, discoveredAuthority, validRequest, this.logger);
		}
		/**
		* Acquires a token by exchanging the Authorization Code received from the first step of OAuth2.0
		* Authorization Code flow.
		*
		* `getAuthCodeUrl(AuthorizationCodeUrlRequest)` can be used to create the URL for the first step of OAuth2.0
		* Authorization Code flow. Ensure that values for redirectUri and scopes in AuthorizationCodeUrlRequest and
		* AuthorizationCodeRequest are the same.
		*/
		async acquireTokenByCode(request, authCodePayLoad) {
			this.logger.info("acquireTokenByCode called", request.correlationId || "");
			if (request.state && authCodePayLoad) {
				this.logger.info("acquireTokenByCode - validating state", request.correlationId || "");
				this.validateState(request.state, authCodePayLoad.state || "", request.correlationId || "");
				authCodePayLoad = {
					...authCodePayLoad,
					state: ""
				};
			}
			const validRequest = {
				...request,
				...await this.initializeBaseRequest(request),
				authenticationScheme: AuthenticationScheme.BEARER
			};
			const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByCode, validRequest.correlationId);
			try {
				const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
				const authorizationCodeClient = new AuthorizationCodeClient(await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, validRequest.redirectUri, serverTelemetryManager), new StubPerformanceClient());
				this.logger.verbose("Auth code client created", validRequest.correlationId);
				return await authorizationCodeClient.acquireToken(validRequest, ApiId.acquireTokenByCode, authCodePayLoad);
			} catch (e) {
				if (e instanceof AuthError) e.correlationId = validRequest.correlationId;
				serverTelemetryManager.cacheFailedRequest(e);
				throw e;
			}
		}
		/**
		* Acquires a token by exchanging the refresh token provided for a new set of tokens.
		*
		* This API is provided only for scenarios where you would like to migrate from ADAL to MSAL. Otherwise, it is
		* recommended that you use `acquireTokenSilent()` for silent scenarios. When using `acquireTokenSilent()`, MSAL will
		* handle the caching and refreshing of tokens automatically.
		*/
		async acquireTokenByRefreshToken(request) {
			this.logger.info("acquireTokenByRefreshToken called", request.correlationId || "");
			const validRequest = {
				...request,
				...await this.initializeBaseRequest(request),
				authenticationScheme: AuthenticationScheme.BEARER
			};
			const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByRefreshToken, validRequest.correlationId);
			try {
				const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
				const refreshTokenClient = new RefreshTokenClient(await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, validRequest.redirectUri || "", serverTelemetryManager), new StubPerformanceClient());
				this.logger.verbose("Refresh token client created", validRequest.correlationId);
				return await refreshTokenClient.acquireToken(validRequest, ApiId.acquireTokenByRefreshToken);
			} catch (e) {
				if (e instanceof AuthError) e.correlationId = validRequest.correlationId;
				serverTelemetryManager.cacheFailedRequest(e);
				throw e;
			}
		}
		/**
		* Acquires a token silently when a user specifies the account the token is requested for.
		*
		* This API expects the user to provide an account object and looks into the cache to retrieve the token if present.
		* There is also an optional "forceRefresh" boolean the user can send to bypass the cache for access_token and id_token.
		* In case the refresh_token is expired or not found, an error is thrown
		* and the guidance is for the user to call any interactive token acquisition API (eg: `acquireTokenByCode()`).
		*/
		async acquireTokenSilent(request) {
			const validRequest = {
				...request,
				...await this.initializeBaseRequest(request),
				forceRefresh: request.forceRefresh || false
			};
			const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenSilent, validRequest.correlationId, validRequest.forceRefresh);
			try {
				const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
				const clientConfiguration = await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, validRequest.redirectUri || "", serverTelemetryManager);
				const silentFlowClient = new SilentFlowClient(clientConfiguration, new StubPerformanceClient());
				this.logger.verbose("Silent flow client created", validRequest.correlationId);
				try {
					await this.tokenCache.overwriteCache();
					return await this.acquireCachedTokenSilent(validRequest, silentFlowClient, clientConfiguration);
				} catch (error) {
					if (error instanceof ClientAuthError && error.errorCode === tokenRefreshRequired) return new RefreshTokenClient(clientConfiguration, new StubPerformanceClient()).acquireTokenByRefreshToken(validRequest, ApiId.acquireTokenSilent);
					throw error;
				}
			} catch (error) {
				if (error instanceof AuthError) error.correlationId = validRequest.correlationId;
				serverTelemetryManager.cacheFailedRequest(error);
				throw error;
			}
		}
		async acquireCachedTokenSilent(validRequest, silentFlowClient, clientConfiguration) {
			const [authResponse, cacheOutcome] = await silentFlowClient.acquireCachedToken({
				...validRequest,
				scopes: validRequest.scopes?.length ? validRequest.scopes : [...OIDC_DEFAULT_SCOPES]
			});
			if (cacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
				this.logger.info("ClientApplication:acquireCachedTokenSilent - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.", validRequest.correlationId);
				const refreshTokenClient = new RefreshTokenClient(clientConfiguration, new StubPerformanceClient());
				try {
					await refreshTokenClient.acquireTokenByRefreshToken(validRequest, ApiId.acquireTokenSilent);
				} catch {}
			}
			return authResponse;
		}
		/**
		* Acquires tokens with password grant by exchanging client applications username and password for credentials
		*
		* The latest OAuth 2.0 Security Best Current Practice disallows the password grant entirely.
		* More details on this recommendation at https://tools.ietf.org/html/draft-ietf-oauth-security-topics-13#section-3.4
		* Microsoft's documentation and recommendations are at:
		* https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-authentication-flows#usernamepassword
		*
		* @param request - UsenamePasswordRequest
		* @deprecated - Use a more secure flow instead
		*/
		async acquireTokenByUsernamePassword(request) {
			this.logger.info("acquireTokenByUsernamePassword called", request.correlationId || "");
			const validRequest = {
				...request,
				...await this.initializeBaseRequest(request)
			};
			const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByUsernamePassword, validRequest.correlationId);
			try {
				const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
				const usernamePasswordClient = new UsernamePasswordClient(await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, "", serverTelemetryManager));
				this.logger.verbose("Username password client created", validRequest.correlationId);
				return await usernamePasswordClient.acquireToken(validRequest);
			} catch (e) {
				if (e instanceof AuthError) e.correlationId = validRequest.correlationId;
				serverTelemetryManager.cacheFailedRequest(e);
				throw e;
			}
		}
		/**
		* Gets the token cache for the application.
		*/
		getTokenCache() {
			this.logger.info("getTokenCache called", "");
			return this.tokenCache;
		}
		/**
		* Validates OIDC state by comparing the user cached state with the state received from the server.
		*
		* This API is provided for scenarios where you would use OAuth2.0 state parameter to mitigate against
		* CSRF attacks.
		* For more information about state, visit https://datatracker.ietf.org/doc/html/rfc6819#section-3.6.
		* @param state - Unique GUID generated by the user that is cached by the user and sent to the server during the first leg of the flow
		* @param cachedState - This string is sent back by the server with the authorization code
		*/
		validateState(state, cachedState, correlationId) {
			if (!state) throw NodeAuthError.createStateNotFoundError(correlationId);
			if (state !== cachedState) throw createClientAuthError(stateMismatch, correlationId);
		}
		/**
		* Returns the logger instance
		*/
		getLogger() {
			return this.logger;
		}
		/**
		* Replaces the default logger set in configurations with new Logger with new configurations
		* @param logger - Logger instance
		*/
		setLogger(logger) {
			this.logger = logger;
		}
		/**
		* Builds the common configuration to be passed to the common component based on the platform configurarion
		* @param authority - user passed authority in configuration
		* @param serverTelemetryManager - initializes servertelemetry if passed
		*/
		async buildOauthClientConfiguration(discoveredAuthority, requestCorrelationId, redirectUri, serverTelemetryManager) {
			this.logger.verbose("buildOauthClientConfiguration called", requestCorrelationId);
			this.logger.info(`Building oauth client configuration with the following authority: ${discoveredAuthority.tokenEndpoint}.`, requestCorrelationId);
			serverTelemetryManager?.updateRegionDiscoveryMetadata(discoveredAuthority.regionDiscoveryMetadata);
			return {
				authOptions: {
					clientId: this.config.auth.clientId,
					authority: discoveredAuthority,
					clientCapabilities: this.config.auth.clientCapabilities,
					redirectUri,
					isMcp: this.config.auth.isMcp
				},
				loggerOptions: {
					logLevel: this.config.system.loggerOptions.logLevel,
					loggerCallback: this.config.system.loggerOptions.loggerCallback,
					piiLoggingEnabled: this.config.system.loggerOptions.piiLoggingEnabled,
					correlationId: requestCorrelationId
				},
				cryptoInterface: this.cryptoProvider,
				networkInterface: this.config.system.networkClient,
				storageInterface: this.storage,
				serverTelemetryManager,
				clientCredentials: {
					clientSecret: this.clientSecret,
					clientAssertion: await this.getClientAssertion(discoveredAuthority)
				},
				libraryInfo: {
					sku: Constants.MSAL_SKU,
					version,
					cpu: process.arch || "",
					os: process.platform || ""
				},
				telemetry: this.config.telemetry,
				persistencePlugin: this.config.cache.cachePlugin,
				serializableCache: this.tokenCache
			};
		}
		async getClientAssertion(authority) {
			if (this.developerProvidedClientAssertion) this.clientAssertion = ClientAssertion.fromAssertion(await getClientAssertion(this.developerProvidedClientAssertion, this.config.auth.clientId, authority.tokenEndpoint));
			return this.clientAssertion && {
				assertion: this.clientAssertion.getJwt(this.cryptoProvider, this.config.auth.clientId, authority.tokenEndpoint),
				assertionType: Constants.JWT_BEARER_ASSERTION_TYPE
			};
		}
		/**
		* Generates a request with the default scopes & generates a correlationId.
		* @param authRequest - BaseAuthRequest for initialization
		*/
		async initializeBaseRequest(authRequest) {
			const correlationId = authRequest.correlationId || this.cryptoProvider.createNewGuid();
			this.logger.verbose("initializeRequestScopes called", correlationId);
			if (authRequest.authenticationScheme && authRequest.authenticationScheme === AuthenticationScheme.POP) this.logger.verbose("Authentication Scheme 'pop' is not supported yet, setting Authentication Scheme to 'Bearer' for request", correlationId);
			authRequest.authenticationScheme = AuthenticationScheme.BEARER;
			return {
				...authRequest,
				scopes: [...authRequest && authRequest.scopes || [], ...OIDC_DEFAULT_SCOPES],
				correlationId,
				authority: authRequest.authority || this.config.auth.authority
			};
		}
		/**
		* Initializes the server telemetry payload
		* @param apiId - Id for a specific request
		* @param correlationId - GUID
		* @param forceRefresh - boolean to indicate network call
		*/
		initializeServerTelemetryManager(apiId, correlationId, forceRefresh) {
			return new ServerTelemetryManager({
				clientId: this.config.auth.clientId,
				correlationId,
				apiId,
				forceRefresh: forceRefresh || false
			}, this.storage);
		}
		/**
		* Create authority instance. If authority not passed in request, default to authority set on the application
		* object. If no authority set in application object, then default to common authority.
		* @param authorityString - authority from user configuration
		*/
		async createAuthority(authorityString, requestCorrelationId, azureRegionConfiguration, azureCloudOptions) {
			this.logger.verbose("createAuthority called", requestCorrelationId);
			const authorityUrl = Authority.generateAuthority(authorityString, azureCloudOptions || this.config.auth.azureCloudOptions);
			const authorityOptions = {
				protocolMode: this.config.system.protocolMode,
				knownAuthorities: this.config.auth.knownAuthorities,
				cloudDiscoveryMetadata: this.config.auth.cloudDiscoveryMetadata,
				authorityMetadata: this.config.auth.authorityMetadata,
				azureRegionConfiguration
			};
			return createDiscoveredInstance(authorityUrl, this.config.system.networkClient, this.storage, authorityOptions, this.logger, requestCorrelationId, new StubPerformanceClient());
		}
		/**
		* Clear the cache except for authority metadata.
		*/
		clearCache() {
			this.storage.clear();
		}
	};
	var LoopbackClient = class {
		constructor(preferredPort) {
			this.preferredPort = preferredPort;
		}
		/**
		* Spins up a loopback server which returns the server response when the localhost redirectUri is hit
		* @param successTemplate
		* @param errorTemplate
		* @returns
		*/
		async listenForAuthCode(successTemplate, errorTemplate) {
			if (this.server) throw NodeAuthError.createLoopbackServerAlreadyExistsError();
			return new Promise((resolve, reject) => {
				this.server = http.createServer((req, res) => {
					const method = req.method?.toUpperCase();
					if (method !== "GET" && method !== "POST") {
						res.writeHead(405, { Allow: "GET, POST" });
						res.end("Method Not Allowed");
						return;
					}
					const url = req.url;
					if (!url) {
						res.end(errorTemplate || "Error occurred loading redirectUrl");
						reject(NodeAuthError.createUnableToLoadRedirectUrlError());
						return;
					} else if (url === FORWARD_SLASH) {
						if (method === "POST") {
							this.handlePostRequest(req, res, resolve, successTemplate, errorTemplate);
							return;
						}
						res.end(successTemplate || "Auth code was successfully acquired. You can close this window now.");
						return;
					}
					if (method === "GET") {
						const redirectUri = this.getRedirectUri();
						const authCodeResponse = getDeserializedResponse(new URL(url, redirectUri).search) || {};
						if (!authCodeResponse.code && !authCodeResponse.error) {
							res.writeHead(200);
							res.end();
							return;
						}
						if (authCodeResponse.code) {
							res.writeHead(HTTP_REDIRECT, { location: redirectUri });
							res.end();
						}
						if (authCodeResponse.error) res.end(errorTemplate || `Error occurred: ${authCodeResponse.error}`);
						resolve(authCodeResponse);
					} else {
						res.writeHead(200);
						res.end();
					}
				});
				const port = this.preferredPort || 0;
				this.server.on("error", (err) => {
					if (err.code === "EADDRINUSE" && this.preferredPort && port !== 0) this.server?.listen(0, "127.0.0.1");
					else reject(err);
				});
				this.server.listen(port, "127.0.0.1");
			});
		}
		/**
		* Handles POST requests for form_post response mode
		*/
		handlePostRequest(req, res, resolve, successTemplate, errorTemplate) {
			if (req.headers["content-type"]?.split(";")[0]?.trim() !== "application/x-www-form-urlencoded") {
				res.writeHead(415);
				res.end("Unsupported Media Type");
				return;
			}
			let body = "";
			req.on("error", () => {
				if (!res.headersSent) res.writeHead(400);
				res.end();
			});
			req.on("data", (chunk) => {
				body += chunk.toString();
			});
			req.on("end", () => {
				const authCodeResponse = getDeserializedResponse(`?${body}`) || {};
				if (!authCodeResponse.code && !authCodeResponse.error) {
					res.writeHead(200);
					res.end();
					return;
				}
				if (authCodeResponse.error) {
					res.writeHead(200);
					res.end(errorTemplate || `Error occurred: ${authCodeResponse.error}`);
				} else {
					res.writeHead(200);
					res.end(successTemplate || "Auth code was successfully acquired. You can close this window now.");
				}
				resolve(authCodeResponse);
			});
		}
		/**
		* Get the port that the loopback server is running on
		* @returns
		*/
		getRedirectUri() {
			if (!this.server || !this.server.listening) throw NodeAuthError.createNoLoopbackServerExistsError();
			const address = this.server.address();
			if (!address || typeof address === "string" || !address.port) {
				this.closeServer();
				throw NodeAuthError.createInvalidLoopbackAddressTypeError();
			}
			const port = address && address.port;
			return `${Constants.HTTP_PROTOCOL}${Constants.LOCALHOST}:${port}`;
		}
		/**
		* Close the loopback server
		*/
		closeServer() {
			if (this.server) {
				this.server.close();
				if (typeof this.server.closeAllConnections === "function") this.server.closeAllConnections();
				this.server.unref();
				this.server = void 0;
			}
		}
	};
	/**
	* OAuth2.0 Device code client
	* @public
	*/
	var DeviceCodeClient = class extends BaseClient {
		constructor(configuration) {
			super(configuration);
		}
		/**
		* Gets device code from device code endpoint, calls back to with device code response, and
		* polls token endpoint to exchange device code for tokens
		* @param request - developer provided CommonDeviceCodeRequest
		*/
		async acquireToken(request) {
			const deviceCodeResponse = await this.getDeviceCode(request);
			request.deviceCodeCallback(deviceCodeResponse);
			const reqTimestamp = nowSeconds();
			const response = await this.acquireTokenWithDeviceCode(request, deviceCodeResponse);
			const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.performanceClient, this.config.serializableCache, this.config.persistencePlugin);
			responseHandler.validateTokenResponse(response, request.correlationId);
			return responseHandler.handleServerTokenResponse(response, this.authority, reqTimestamp, request, ApiId.acquireTokenByDeviceCode);
		}
		/**
		* Creates device code request and executes http GET
		* @param request - developer provided CommonDeviceCodeRequest
		*/
		async getDeviceCode(request) {
			const queryParametersString = this.createExtraQueryParameters(request);
			const endpoint = UrlString.appendQueryString(this.authority.deviceCodeEndpoint, queryParametersString);
			const queryString = this.createQueryString(request);
			const headers = this.createTokenRequestHeaders();
			const thumbprint = {
				clientId: this.config.authOptions.clientId,
				authority: request.authority,
				scopes: request.scopes,
				claims: request.claims,
				authenticationScheme: request.authenticationScheme,
				resourceRequestMethod: request.resourceRequestMethod,
				resourceRequestUri: request.resourceRequestUri,
				shrClaims: request.shrClaims,
				sshKid: request.sshKid
			};
			return this.executePostRequestToDeviceCodeEndpoint(endpoint, queryString, headers, thumbprint, request.correlationId);
		}
		/**
		* Creates query string for the device code request
		* @param request - developer provided CommonDeviceCodeRequest
		*/
		createExtraQueryParameters(request) {
			const parameters = /* @__PURE__ */ new Map();
			if (request.extraQueryParameters) addExtraParameters(parameters, request.extraQueryParameters);
			return mapToQueryString(parameters);
		}
		/**
		* Executes POST request to device code endpoint
		* @param deviceCodeEndpoint - token endpoint
		* @param queryString - string to be used in the body of the request
		* @param headers - headers for the request
		* @param thumbprint - unique request thumbprint
		* @param correlationId - correlation id to be used in the request
		*/
		async executePostRequestToDeviceCodeEndpoint(deviceCodeEndpoint, queryString, headers, thumbprint, correlationId) {
			const { body: { user_code: userCode, device_code: deviceCode, verification_uri: verificationUri, expires_in: expiresIn, interval, message } } = await this.sendPostRequest(thumbprint, deviceCodeEndpoint, {
				body: queryString,
				headers
			}, correlationId);
			return {
				userCode,
				deviceCode,
				verificationUri,
				expiresIn,
				interval,
				message
			};
		}
		/**
		* Create device code endpoint query parameters and returns string
		* @param request - developer provided CommonDeviceCodeRequest
		*/
		createQueryString(request) {
			const parameters = /* @__PURE__ */ new Map();
			addScopes(parameters, request.scopes, request.correlationId);
			addClientId(parameters, this.config.authOptions.clientId);
			if (request.extraQueryParameters) addExtraParameters(parameters, request.extraQueryParameters);
			if (request.claims || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) addClaims(parameters, request.correlationId, request.claims, this.config.authOptions.clientCapabilities);
			return mapToQueryString(parameters);
		}
		/**
		* Breaks the polling with specific conditions
		* @param deviceCodeExpirationTime - expiration time for the device code request
		* @param correlationId - correlation id of the request
		* @param userSpecifiedTimeout - developer provided timeout, to be compared against deviceCodeExpirationTime
		* @param userSpecifiedCancelFlag - boolean indicating the developer would like to cancel the request
		*/
		continuePolling(deviceCodeExpirationTime, correlationId, userSpecifiedTimeout, userSpecifiedCancelFlag) {
			if (userSpecifiedCancelFlag) {
				this.logger.error("Token request cancelled by setting DeviceCodeRequest.cancel = true", correlationId);
				throw createClientAuthError(deviceCodePollingCancelled, correlationId);
			} else if (userSpecifiedTimeout && userSpecifiedTimeout < deviceCodeExpirationTime && nowSeconds() > userSpecifiedTimeout) {
				this.logger.error(`User defined timeout for device code polling reached. The timeout was set for ${userSpecifiedTimeout}`, correlationId);
				throw createClientAuthError(userTimeoutReached, correlationId);
			} else if (nowSeconds() > deviceCodeExpirationTime) {
				if (userSpecifiedTimeout) this.logger.verbose(`User specified timeout ignored as the device code has expired before the timeout elapsed. The user specified timeout was set for ${userSpecifiedTimeout}`, correlationId);
				this.logger.error(`Device code expired. Expiration time of device code was ${deviceCodeExpirationTime}`, correlationId);
				throw createClientAuthError(deviceCodeExpired, correlationId);
			}
			return true;
		}
		/**
		* Creates token request with device code response and polls token endpoint at interval set by the device code response
		* @param request - developer provided CommonDeviceCodeRequest
		* @param deviceCodeResponse - DeviceCodeResponse returned by the security token service device code endpoint
		*/
		async acquireTokenWithDeviceCode(request, deviceCodeResponse) {
			const queryParametersString = this.createTokenQueryParameters(request);
			const endpoint = UrlString.appendQueryString(this.authority.tokenEndpoint, queryParametersString);
			const requestBody = this.createTokenRequestBody(request, deviceCodeResponse);
			const headers = this.createTokenRequestHeaders();
			const userSpecifiedTimeout = request.timeout ? nowSeconds() + request.timeout : void 0;
			const deviceCodeExpirationTime = nowSeconds() + deviceCodeResponse.expiresIn;
			const pollingIntervalMilli = deviceCodeResponse.interval * 1e3;
			while (this.continuePolling(deviceCodeExpirationTime, request.correlationId, userSpecifiedTimeout, request.cancel)) {
				const thumbprint = {
					clientId: this.config.authOptions.clientId,
					authority: request.authority,
					scopes: request.scopes,
					claims: request.claims,
					authenticationScheme: request.authenticationScheme,
					resourceRequestMethod: request.resourceRequestMethod,
					resourceRequestUri: request.resourceRequestUri,
					shrClaims: request.shrClaims,
					sshKid: request.sshKid
				};
				const response = await this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint, request.correlationId);
				if (response.body && response.body.error) if (response.body.error === AUTHORIZATION_PENDING) {
					this.logger.info("Authorization pending. Continue polling.", request.correlationId);
					await delay(pollingIntervalMilli);
				} else {
					this.logger.info("Unexpected error in polling from the server", request.correlationId);
					throw createAuthError(postRequestFailed, request.correlationId, response.body.error);
				}
				else {
					this.logger.verbose("Authorization completed successfully. Polling stopped.", request.correlationId);
					return response.body;
				}
			}
			this.logger.error("Polling stopped for unknown reasons.", request.correlationId);
			throw createClientAuthError(deviceCodeUnknownError, request.correlationId);
		}
		/**
		* Creates query parameters and converts to string.
		* @param request - developer provided CommonDeviceCodeRequest
		* @param deviceCodeResponse - DeviceCodeResponse returned by the security token service device code endpoint
		*/
		createTokenRequestBody(request, deviceCodeResponse) {
			const parameters = /* @__PURE__ */ new Map();
			addScopes(parameters, request.scopes, request.correlationId);
			addClientId(parameters, this.config.authOptions.clientId);
			addGrantType(parameters, GrantType.DEVICE_CODE_GRANT);
			addDeviceCode(parameters, deviceCodeResponse.deviceCode);
			addCorrelationId(parameters, request.correlationId || this.config.cryptoInterface.createNewGuid());
			addClientInfo(parameters);
			addLibraryInfo(parameters, this.config.libraryInfo);
			addApplicationTelemetry(parameters, this.config.telemetry.application);
			addThrottling(parameters);
			if (this.serverTelemetryManager) addServerTelemetry(parameters, this.serverTelemetryManager);
			if (!StringUtils.isEmptyObj(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) addClaims(parameters, request.correlationId, request.claims, this.config.authOptions.clientCapabilities);
			return mapToQueryString(parameters);
		}
	};
	/**
	* This class is to be used to acquire tokens for public client applications (desktop, mobile). Public client applications
	* are not trusted to safely store application secrets, and therefore can only request tokens in the name of an user.
	* @public
	*/
	var PublicClientApplication = class extends ClientApplication {
		/**
		* Important attributes in the Configuration object for auth are:
		* - clientID: the application ID of your application. You can obtain one by registering your application with our Application registration portal.
		* - authority: the authority URL for your application.
		*
		* AAD authorities are of the form https://login.microsoftonline.com/\{Enter_the_Tenant_Info_Here\}.
		* - If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
		* - If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
		* - If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
		* - To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
		*
		* Azure B2C authorities are of the form https://\{instance\}/\{tenant\}/\{policy\}. Each policy is considered
		* its own authority. You will have to set the all of the knownAuthorities at the time of the client application
		* construction.
		*
		* ADFS authorities are of the form https://\{instance\}/adfs.
		*/
		constructor(configuration) {
			super(configuration);
			if (this.config.broker.nativeBrokerPlugin) if (this.config.broker.nativeBrokerPlugin.isBrokerAvailable) {
				this.nativeBrokerPlugin = this.config.broker.nativeBrokerPlugin;
				this.nativeBrokerPlugin.setLogger(this.config.system.loggerOptions);
			} else this.logger.warning("NativeBroker implementation was provided but the broker is unavailable.", "");
			this.skus = ServerTelemetryManager.makeExtraSkuString({
				libraryName: Constants.MSAL_SKU,
				libraryVersion: version
			});
		}
		/**
		* Acquires a token from the authority using OAuth2.0 device code flow.
		* This flow is designed for devices that do not have access to a browser or have input constraints.
		* The authorization server issues a DeviceCode object with a verification code, an end-user code,
		* and the end-user verification URI. The DeviceCode object is provided through a callback, and the end-user should be
		* instructed to use another device to navigate to the verification URI to input credentials.
		* Since the client cannot receive incoming requests, it polls the authorization server repeatedly
		* until the end-user completes input of credentials.
		*/
		async acquireTokenByDeviceCode(request) {
			this.logger.info("acquireTokenByDeviceCode called", request.correlationId || "");
			enforceResourceParameter(this.config.auth.isMcp, request);
			const validRequest = Object.assign(request, await this.initializeBaseRequest(request));
			const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByDeviceCode, validRequest.correlationId);
			try {
				const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
				const deviceCodeClient = new DeviceCodeClient(await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, "", serverTelemetryManager));
				this.logger.verbose("Device code client created", validRequest.correlationId);
				return await deviceCodeClient.acquireToken(validRequest);
			} catch (e) {
				if (e instanceof AuthError) e.correlationId = validRequest.correlationId;
				serverTelemetryManager.cacheFailedRequest(e);
				throw e;
			}
		}
		/**
		* Acquires a token interactively via the browser by requesting an authorization code then exchanging it for a token.
		*/
		async acquireTokenInteractive(request) {
			const correlationId = request.correlationId || this.cryptoProvider.createNewGuid();
			this.logger.trace("acquireTokenInteractive called", correlationId);
			enforceResourceParameter(this.config.auth.isMcp, request);
			const { openBrowser, successTemplate, errorTemplate, windowHandle, loopbackClient: customLoopbackClient, preferredPort, ...remainingProperties } = request;
			if (customLoopbackClient) this.logger.warning("The loopbackClient option is deprecated and will be removed in a future major version. Omit it to use the built-in loopback server, and set preferredPort when a fixed port is required.", correlationId);
			if (this.nativeBrokerPlugin) {
				const brokerRequest = {
					...remainingProperties,
					clientId: this.config.auth.clientId,
					scopes: request.scopes || OIDC_DEFAULT_SCOPES,
					redirectUri: request.redirectUri || "",
					authority: request.authority || this.config.auth.authority,
					correlationId,
					extraParameters: {
						...remainingProperties.extraQueryParameters,
						...remainingProperties.extraParameters,
						[X_CLIENT_EXTRA_SKU]: this.skus
					},
					accountId: remainingProperties.account?.nativeAccountId
				};
				return this.nativeBrokerPlugin.acquireTokenInteractive(brokerRequest, windowHandle);
			}
			if (request.redirectUri) {
				if (!this.config.broker.nativeBrokerPlugin) throw NodeAuthError.createRedirectUriNotSupportedError(correlationId);
				request.redirectUri = "";
			}
			const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();
			const loopbackClient = customLoopbackClient || new LoopbackClient(preferredPort);
			const responseMode = remainingProperties.responseMode ?? ResponseMode$1.QUERY;
			if (responseMode !== ResponseMode$1.QUERY && responseMode !== ResponseMode$1.FORM_POST) throw createClientConfigurationError(invalidResponseMode, correlationId);
			let authCodeResponse = {};
			let authCodeListenerError = null;
			try {
				const authCodeListener = loopbackClient.listenForAuthCode(successTemplate, errorTemplate).then((response) => {
					authCodeResponse = response;
				}).catch((e) => {
					authCodeListenerError = e;
				});
				const redirectUri = await this.waitForRedirectUri(loopbackClient, correlationId);
				const validRequest = {
					...remainingProperties,
					correlationId,
					scopes: request.scopes || OIDC_DEFAULT_SCOPES,
					redirectUri,
					responseMode,
					codeChallenge: challenge,
					codeChallengeMethod: CodeChallengeMethodValues.S256
				};
				await openBrowser(await this.getAuthCodeUrl(validRequest));
				await authCodeListener;
				if (authCodeListenerError) throw authCodeListenerError;
				if (authCodeResponse.error) throw new ServerError(authCodeResponse.error, correlationId, authCodeResponse.error_description, authCodeResponse.suberror);
				else if (!authCodeResponse.code) throw NodeAuthError.createNoAuthCodeInResponseError(correlationId);
				const clientInfo = authCodeResponse.client_info;
				const tokenRequest = {
					code: authCodeResponse.code,
					codeVerifier: verifier,
					clientInfo: clientInfo || "",
					...validRequest
				};
				return await this.acquireTokenByCode(tokenRequest);
			} finally {
				loopbackClient.closeServer();
			}
		}
		/**
		* Returns a token retrieved either from the cache or by exchanging the refresh token for a fresh access token. If brokering is enabled the token request will be serviced by the broker.
		* @param request - developer provided SilentFlowRequest
		* @returns
		*/
		async acquireTokenSilent(request) {
			const correlationId = request.correlationId || this.cryptoProvider.createNewGuid();
			this.logger.trace("acquireTokenSilent called", correlationId);
			enforceResourceParameter(this.config.auth.isMcp, request);
			if (this.nativeBrokerPlugin) {
				const brokerRequest = {
					...request,
					clientId: this.config.auth.clientId,
					scopes: request.scopes || OIDC_DEFAULT_SCOPES,
					redirectUri: request.redirectUri || "",
					authority: request.authority || this.config.auth.authority,
					correlationId,
					extraParameters: {
						...request.extraQueryParameters,
						...request.extraParameters,
						[X_CLIENT_EXTRA_SKU]: this.skus
					},
					accountId: request.account.nativeAccountId,
					forceRefresh: request.forceRefresh || false
				};
				return this.nativeBrokerPlugin.acquireTokenSilent(brokerRequest);
			}
			if (request.redirectUri) {
				if (!this.config.broker.nativeBrokerPlugin) throw NodeAuthError.createRedirectUriNotSupportedError(correlationId);
				request.redirectUri = "";
			}
			return super.acquireTokenSilent(request);
		}
		/**
		* Acquires a token by exchanging the authorization code received from the first step of OAuth 2.0 Authorization Code Flow.
		* In MCP mode, a resource parameter is required on the request.
		*/
		async acquireTokenByCode(request, authCodePayLoad) {
			enforceResourceParameter(this.config.auth.isMcp, request);
			return super.acquireTokenByCode(request, authCodePayLoad);
		}
		/**
		* Acquires a token by exchanging the refresh token provided for a new set of tokens.
		* In MCP mode, a resource parameter is required on the request.
		*/
		async acquireTokenByRefreshToken(request) {
			enforceResourceParameter(this.config.auth.isMcp, request);
			return super.acquireTokenByRefreshToken(request);
		}
		/**
		* Removes cache artifacts associated with the given account
		* @param request - developer provided SignOutRequest
		* @returns
		*/
		async signOut(request) {
			if (this.nativeBrokerPlugin && request.account.nativeAccountId) {
				const signoutRequest = {
					clientId: this.config.auth.clientId,
					accountId: request.account.nativeAccountId,
					correlationId: request.correlationId || this.cryptoProvider.createNewGuid()
				};
				await this.nativeBrokerPlugin.signOut(signoutRequest);
			}
			await this.getTokenCache().removeAccount(request.account, request.correlationId);
		}
		/**
		* Returns all cached accounts for this application. If brokering is enabled this request will be serviced by the broker.
		* @returns
		*/
		async getAllAccounts() {
			if (this.nativeBrokerPlugin) {
				const correlationId = this.cryptoProvider.createNewGuid();
				return this.nativeBrokerPlugin.getAllAccounts(this.config.auth.clientId, correlationId);
			}
			return this.getTokenCache().getAllAccounts();
		}
		/**
		* Attempts to retrieve the redirectUri from the loopback server. If the loopback server does not start listening for requests within the timeout this will throw.
		* @param loopbackClient - developer provided custom loopback server implementation
		* @param correlationId - correlation id of the request
		* @returns
		*/
		async waitForRedirectUri(loopbackClient, correlationId) {
			return new Promise((resolve, reject) => {
				let ticks = 0;
				const id = setInterval(() => {
					if (LOOPBACK_SERVER_CONSTANTS.TIMEOUT_MS / LOOPBACK_SERVER_CONSTANTS.INTERVAL_MS < ticks) {
						clearInterval(id);
						reject(NodeAuthError.createLoopbackServerTimeoutError(correlationId));
						return;
					}
					try {
						const r = loopbackClient.getRedirectUri();
						clearInterval(id);
						resolve(r);
						return;
					} catch (e) {
						if (e instanceof AuthError && e.errorCode === NodeAuthErrorMessage.noLoopbackServerExists.code) {
							ticks++;
							return;
						}
						clearInterval(id);
						reject(e);
						return;
					}
				}, LOOPBACK_SERVER_CONSTANTS.INTERVAL_MS);
			});
		}
	};
	/**
	* OAuth2.0 client credential grant
	* @public
	*/
	var ClientCredentialClient = class extends BaseClient {
		constructor(configuration, appTokenProvider) {
			super(configuration);
			this.appTokenProvider = appTokenProvider;
		}
		/**
		* Public API to acquire a token with ClientCredential Flow for Confidential clients
		* @param request - CommonClientCredentialRequest provided by the developer
		*/
		async acquireToken(request) {
			let additionalCacheKeyComponents;
			if (request.fmiPath) additionalCacheKeyComponents = {
				...additionalCacheKeyComponents,
				fmi_path: request.fmiPath
			};
			if (request.claimsFromClient && !StringUtils.isEmptyObj(request.claimsFromClient)) additionalCacheKeyComponents = {
				...additionalCacheKeyComponents,
				client_claims: request.claimsFromClient
			};
			if (request.skipCache || !StringUtils.isEmptyObj(request.claims)) return this.executeTokenRequest(request, this.authority, void 0, additionalCacheKeyComponents);
			const [cachedAuthenticationResult, lastCacheOutcome] = await this.getCachedAuthenticationResult(request, this.config, this.cryptoUtils, this.authority, this.cacheManager, this.serverTelemetryManager, additionalCacheKeyComponents);
			if (cachedAuthenticationResult) {
				if (lastCacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
					this.logger.info("ClientCredentialClient:getCachedAuthenticationResult - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.", request.correlationId);
					await this.executeTokenRequest(request, this.authority, true, additionalCacheKeyComponents);
				}
				return cachedAuthenticationResult;
			} else return this.executeTokenRequest(request, this.authority, void 0, additionalCacheKeyComponents);
		}
		/**
		* looks up cache if the tokens are cached already
		*/
		async getCachedAuthenticationResult(request, config, cryptoUtils, authority, cacheManager, serverTelemetryManager, additionalCacheKeyComponents) {
			const clientConfiguration = config;
			const managedIdentityConfiguration = config;
			let lastCacheOutcome = CacheOutcome.NOT_APPLICABLE;
			let cacheContext;
			if (clientConfiguration.serializableCache && clientConfiguration.persistencePlugin) {
				cacheContext = new TokenCacheContext(clientConfiguration.serializableCache, false);
				await clientConfiguration.persistencePlugin.beforeCacheAccess(cacheContext);
			}
			const cachedAccessToken = this.readAccessTokenFromCache(authority, managedIdentityConfiguration.managedIdentityId?.id || clientConfiguration.authOptions.clientId, new ScopeSet(request.scopes || [], request.correlationId), cacheManager, request.correlationId, additionalCacheKeyComponents);
			if (clientConfiguration.serializableCache && clientConfiguration.persistencePlugin && cacheContext) await clientConfiguration.persistencePlugin.afterCacheAccess(cacheContext);
			if (!cachedAccessToken) {
				serverTelemetryManager?.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN);
				return [null, CacheOutcome.NO_CACHED_ACCESS_TOKEN];
			}
			if (isTokenExpired(cachedAccessToken.expiresOn, clientConfiguration.systemOptions?.tokenRenewalOffsetSeconds || DEFAULT_TOKEN_RENEWAL_OFFSET_SEC)) {
				serverTelemetryManager?.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED);
				return [null, CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED];
			}
			if (cachedAccessToken.refreshOn && isTokenExpired(cachedAccessToken.refreshOn.toString(), 0)) {
				lastCacheOutcome = CacheOutcome.PROACTIVELY_REFRESHED;
				serverTelemetryManager?.setCacheOutcome(CacheOutcome.PROACTIVELY_REFRESHED);
			}
			return [await ResponseHandler.generateAuthenticationResult(cryptoUtils, authority, {
				account: null,
				idToken: null,
				accessToken: cachedAccessToken,
				refreshToken: null,
				appMetadata: null
			}, true, request, this.performanceClient), lastCacheOutcome];
		}
		/**
		* Reads access token from the cache
		*/
		readAccessTokenFromCache(authority, id, scopeSet, cacheManager, correlationId, additionalCacheKeyComponents) {
			const accessTokenFilter = {
				homeAccountId: "",
				environment: authority.canonicalAuthorityUrlComponents.HostNameAndPort,
				credentialType: CredentialType.ACCESS_TOKEN,
				clientId: id,
				realm: authority.tenant,
				target: ScopeSet.createSearchScopes(scopeSet.asArray(), correlationId),
				additionalCacheKeyComponents
			};
			const accessTokens = cacheManager.getAccessTokensByFilter(accessTokenFilter, correlationId);
			if (accessTokens.length < 1) return null;
			else if (accessTokens.length > 1) throw createClientAuthError(multipleMatchingTokens, correlationId);
			return accessTokens[0];
		}
		/**
		* Makes a network call to request the token from the service
		* @param request - CommonClientCredentialRequest provided by the developer
		* @param authority - authority object
		*/
		async executeTokenRequest(request, authority, refreshAccessToken, additionalCacheKeyComponents) {
			let serverTokenResponse;
			let reqTimestamp;
			if (this.appTokenProvider) {
				this.logger.info("Using appTokenProvider extensibility.", request.correlationId);
				const appTokenPropviderParameters = {
					correlationId: request.correlationId,
					tenantId: this.config.authOptions.authority.tenant,
					scopes: request.scopes,
					claims: request.claims
				};
				reqTimestamp = nowSeconds();
				const appTokenProviderResult = await this.appTokenProvider(appTokenPropviderParameters);
				serverTokenResponse = {
					access_token: appTokenProviderResult.accessToken,
					expires_in: appTokenProviderResult.expiresInSeconds,
					refresh_in: appTokenProviderResult.refreshInSeconds,
					token_type: AuthenticationScheme.BEARER
				};
			} else {
				const queryParametersString = this.createTokenQueryParameters(request);
				const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
				const requestBody = await this.createTokenRequestBody(request);
				const headers = this.createTokenRequestHeaders();
				const thumbprint = {
					clientId: this.config.authOptions.clientId,
					authority: request.authority,
					scopes: request.scopes,
					claims: request.claims,
					authenticationScheme: request.authenticationScheme,
					resourceRequestMethod: request.resourceRequestMethod,
					resourceRequestUri: request.resourceRequestUri,
					shrClaims: request.shrClaims,
					sshKid: request.sshKid
				};
				this.logger.info("Sending token request to endpoint: " + authority.tokenEndpoint, request.correlationId);
				reqTimestamp = nowSeconds();
				const response = await this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint, request.correlationId);
				serverTokenResponse = response.body;
				serverTokenResponse.status = response.status;
			}
			const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.performanceClient, this.config.serializableCache, this.config.persistencePlugin);
			responseHandler.validateTokenResponse(serverTokenResponse, request.correlationId, refreshAccessToken);
			return await responseHandler.handleServerTokenResponse(serverTokenResponse, this.authority, reqTimestamp, request, ApiId.acquireTokenByClientCredential, void 0, void 0, void 0, void 0, void 0, additionalCacheKeyComponents);
		}
		/**
		* generate the request to the server in the acceptable format
		* @param request - CommonClientCredentialRequest provided by the developer
		*/
		async createTokenRequestBody(request) {
			const parameters = /* @__PURE__ */ new Map();
			addClientId(parameters, this.config.authOptions.clientId);
			addScopes(parameters, request.scopes, request.correlationId, false);
			addGrantType(parameters, GrantType.CLIENT_CREDENTIALS_GRANT);
			addLibraryInfo(parameters, this.config.libraryInfo);
			addApplicationTelemetry(parameters, this.config.telemetry.application);
			addThrottling(parameters);
			if (this.serverTelemetryManager) addServerTelemetry(parameters, this.serverTelemetryManager);
			addCorrelationId(parameters, request.correlationId || this.config.cryptoInterface.createNewGuid());
			if (this.config.clientCredentials.clientSecret) addClientSecret(parameters, this.config.clientCredentials.clientSecret);
			const clientAssertion = request.clientAssertion || this.config.clientCredentials.clientAssertion;
			if (clientAssertion) {
				addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, this.authority.tokenEndpoint, request.fmiPath));
				addClientAssertionType(parameters, clientAssertion.assertionType);
			}
			if (request.fmiPath) parameters.set(FMI_PATH, request.fmiPath);
			if (!StringUtils.isEmptyObj(request.claims) || !StringUtils.isEmptyObj(request.claimsFromClient) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) addClaims(parameters, request.correlationId, request.claims, this.config.authOptions.clientCapabilities, void 0, request.claimsFromClient);
			return mapToQueryString(parameters);
		}
	};
	/**
	* On-Behalf-Of client
	* @public
	*/
	var OnBehalfOfClient = class extends BaseClient {
		constructor(configuration) {
			super(configuration);
		}
		/**
		* Public API to acquire tokens with on behalf of flow
		* @param request - developer provided CommonOnBehalfOfRequest
		*/
		async acquireToken(request) {
			this.scopeSet = new ScopeSet(request.scopes || [], request.correlationId);
			this.userAssertionHash = await this.cryptoUtils.hashString(request.oboAssertion);
			let additionalCacheKeyComponents;
			if (request.claimsFromClient && !StringUtils.isEmptyObj(request.claimsFromClient)) additionalCacheKeyComponents = { client_claims: request.claimsFromClient };
			if (request.skipCache || !StringUtils.isEmptyObj(request.claims)) return this.executeTokenRequest(request, this.authority, this.userAssertionHash, additionalCacheKeyComponents);
			try {
				return await this.getCachedAuthenticationResult(request, additionalCacheKeyComponents);
			} catch (e) {
				return await this.executeTokenRequest(request, this.authority, this.userAssertionHash, additionalCacheKeyComponents);
			}
		}
		/**
		* look up cache for tokens
		* Find idtoken in the cache
		* Find accessToken based on user assertion and account info in the cache
		* Please note we are not yet supported OBO tokens refreshed with long lived RT. User will have to send a new assertion if the current access token expires
		* This is to prevent security issues when the assertion changes over time, however, longlived RT helps retaining the session
		* @param request - developer provided CommonOnBehalfOfRequest
		*/
		async getCachedAuthenticationResult(request, additionalCacheKeyComponents) {
			const cachedAccessToken = this.readAccessTokenFromCacheForOBO(this.config.authOptions.clientId, request, additionalCacheKeyComponents);
			if (!cachedAccessToken) {
				this.serverTelemetryManager?.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN);
				this.logger.info("SilentFlowClient:acquireCachedToken - No access token found in cache for the given properties.", request.correlationId);
				throw createClientAuthError(tokenRefreshRequired, request.correlationId);
			} else if (isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)) {
				this.serverTelemetryManager?.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED);
				this.logger.info(`OnbehalfofFlow:getCachedAuthenticationResult - Cached access token is expired or will expire within ${this.config.systemOptions.tokenRenewalOffsetSeconds} seconds.`, request.correlationId);
				throw createClientAuthError(tokenRefreshRequired, request.correlationId);
			}
			const cachedIdToken = this.readIdTokenFromCacheForOBO(cachedAccessToken.homeAccountId, request.correlationId);
			let idTokenClaims;
			let cachedAccount = null;
			if (cachedIdToken) {
				idTokenClaims = extractTokenClaims(cachedIdToken.secret, EncodingUtils.base64Decode, request.correlationId);
				const localAccountId = idTokenClaims.oid || idTokenClaims.sub;
				const accountInfo = {
					homeAccountId: cachedIdToken.homeAccountId,
					environment: cachedIdToken.environment,
					tenantId: cachedIdToken.realm,
					username: "",
					localAccountId: localAccountId || ""
				};
				cachedAccount = this.cacheManager.getAccount(this.cacheManager.generateAccountKey(accountInfo), request.correlationId);
			}
			if (this.config.serverTelemetryManager) this.config.serverTelemetryManager.incrementCacheHits();
			return ResponseHandler.generateAuthenticationResult(this.cryptoUtils, this.authority, {
				account: cachedAccount,
				accessToken: cachedAccessToken,
				idToken: cachedIdToken,
				refreshToken: null,
				appMetadata: null
			}, true, request, this.performanceClient, idTokenClaims);
		}
		/**
		* read idtoken from cache, this is a specific implementation for OBO as the requirements differ from a generic lookup in the cacheManager
		* Certain use cases of OBO flow do not expect an idToken in the cache/or from the service
		* @param atHomeAccountId - account id
		*/
		readIdTokenFromCacheForOBO(atHomeAccountId, correlationId) {
			const idTokenFilter = {
				homeAccountId: atHomeAccountId,
				environment: this.authority.canonicalAuthorityUrlComponents.HostNameAndPort,
				credentialType: CredentialType.ID_TOKEN,
				clientId: this.config.authOptions.clientId,
				realm: this.authority.tenant
			};
			const idTokenMap = this.cacheManager.getIdTokensByFilter(idTokenFilter, correlationId);
			if (Object.values(idTokenMap).length < 1) return null;
			return Object.values(idTokenMap)[0];
		}
		/**
		* Fetches the cached access token based on incoming assertion
		* @param clientId - client id
		* @param request - developer provided CommonOnBehalfOfRequest
		*/
		readAccessTokenFromCacheForOBO(clientId, request, additionalCacheKeyComponents) {
			const authScheme = request.authenticationScheme || AuthenticationScheme.BEARER;
			const accessTokenFilter = {
				credentialType: authScheme.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase() ? CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME : CredentialType.ACCESS_TOKEN,
				clientId,
				target: ScopeSet.createSearchScopes(this.scopeSet.asArray(), request.correlationId),
				tokenType: authScheme,
				keyId: request.sshKid,
				userAssertionHash: this.userAssertionHash,
				additionalCacheKeyComponents
			};
			const accessTokens = this.cacheManager.getAccessTokensByFilter(accessTokenFilter, request.correlationId);
			const numAccessTokens = accessTokens.length;
			if (numAccessTokens < 1) return null;
			else if (numAccessTokens > 1) throw createClientAuthError(multipleMatchingTokens, request.correlationId);
			return accessTokens[0];
		}
		/**
		* Make a network call to the server requesting credentials
		* @param request - developer provided CommonOnBehalfOfRequest
		* @param authority - authority object
		*/
		async executeTokenRequest(request, authority, userAssertionHash, additionalCacheKeyComponents) {
			const queryParametersString = this.createTokenQueryParameters(request);
			const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
			const requestBody = await this.createTokenRequestBody(request);
			const headers = this.createTokenRequestHeaders();
			const thumbprint = {
				clientId: this.config.authOptions.clientId,
				authority: request.authority,
				scopes: request.scopes,
				claims: request.claims,
				authenticationScheme: request.authenticationScheme,
				resourceRequestMethod: request.resourceRequestMethod,
				resourceRequestUri: request.resourceRequestUri,
				shrClaims: request.shrClaims,
				sshKid: request.sshKid
			};
			const reqTimestamp = nowSeconds();
			const response = await this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint, request.correlationId);
			const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.performanceClient, this.config.serializableCache, this.config.persistencePlugin);
			responseHandler.validateTokenResponse(response.body, request.correlationId);
			return await responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request, ApiId.acquireTokenByOBO, void 0, userAssertionHash, void 0, void 0, void 0, additionalCacheKeyComponents);
		}
		/**
		* generate a server request in accepable format
		* @param request - developer provided CommonOnBehalfOfRequest
		*/
		async createTokenRequestBody(request) {
			const parameters = /* @__PURE__ */ new Map();
			addClientId(parameters, this.config.authOptions.clientId);
			addScopes(parameters, request.scopes, request.correlationId);
			addGrantType(parameters, GrantType.JWT_BEARER);
			addClientInfo(parameters);
			addLibraryInfo(parameters, this.config.libraryInfo);
			addApplicationTelemetry(parameters, this.config.telemetry.application);
			addThrottling(parameters);
			if (this.serverTelemetryManager) addServerTelemetry(parameters, this.serverTelemetryManager);
			addCorrelationId(parameters, request.correlationId || this.config.cryptoInterface.createNewGuid());
			addRequestTokenUse(parameters, ON_BEHALF_OF);
			addOboAssertion(parameters, request.oboAssertion);
			if (this.config.clientCredentials.clientSecret) addClientSecret(parameters, this.config.clientCredentials.clientSecret);
			const clientAssertion = this.config.clientCredentials.clientAssertion;
			if (clientAssertion) {
				addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
				addClientAssertionType(parameters, clientAssertion.assertionType);
			}
			if (!StringUtils.isEmptyObj(request.claims) || !StringUtils.isEmptyObj(request.claimsFromClient) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) addClaims(parameters, request.correlationId, request.claims, this.config.authOptions.clientCapabilities, void 0, request.claimsFromClient);
			return mapToQueryString(parameters);
		}
	};
	/**
	* Client for the user_fic grant type (Leg 3 of Agent Identity).
	* Exchanges a federated identity credential (instance token) for a user-scoped token.
	* @internal
	*/
	var UserFederatedIdentityCredentialClient = class extends BaseClient {
		constructor(configuration) {
			super(configuration);
		}
		/**
		* Acquires a token using the user_fic grant type.
		* Always hits the network (no cache lookup for the network call).
		* Developers use acquireTokenSilent for cached FIC tokens.
		*/
		async acquireToken(request) {
			return this.executeTokenRequest(request, this.authority);
		}
		/**
		* Makes a network call to the token endpoint
		*/
		async executeTokenRequest(request, authority) {
			const scopeSet = new ScopeSet(request.scopes || [], request.correlationId);
			scopeSet.appendScopes(OIDC_DEFAULT_SCOPES);
			const augmentedScopes = scopeSet.asArray();
			const queryParametersString = this.createTokenQueryParameters(request);
			const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
			const requestBody = await this.createTokenRequestBody(request, augmentedScopes);
			const headers = this.createTokenRequestHeaders();
			const thumbprint = {
				clientId: this.config.authOptions.clientId,
				authority: request.authority,
				scopes: augmentedScopes,
				claims: request.claims,
				authenticationScheme: request.authenticationScheme,
				resourceRequestMethod: request.resourceRequestMethod,
				resourceRequestUri: request.resourceRequestUri,
				shrClaims: request.shrClaims,
				sshKid: request.sshKid
			};
			const reqTimestamp = nowSeconds();
			const response = await this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint, request.correlationId);
			const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.performanceClient, this.config.serializableCache, this.config.persistencePlugin);
			responseHandler.validateTokenResponse(response.body, request.correlationId);
			return await responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request, ApiId.acquireTokenByUserFederatedIdentityCredential);
		}
		/**
		* Builds the request body for the user_fic grant type
		*/
		async createTokenRequestBody(request, augmentedScopes) {
			const parameters = /* @__PURE__ */ new Map();
			addClientId(parameters, this.config.authOptions.clientId);
			addScopes(parameters, augmentedScopes, request.correlationId);
			addGrantType(parameters, GrantType.USER_FIC);
			addClientInfo(parameters);
			parameters.set(USER_FEDERATED_IDENTITY_CREDENTIAL, request.assertion);
			if (request.username) parameters.set(USERNAME, request.username);
			else if (request.userObjectId) parameters.set(USER_ID, request.userObjectId);
			addLibraryInfo(parameters, this.config.libraryInfo);
			addApplicationTelemetry(parameters, this.config.telemetry.application);
			addThrottling(parameters);
			if (this.serverTelemetryManager) addServerTelemetry(parameters, this.serverTelemetryManager);
			addCorrelationId(parameters, request.correlationId || this.config.cryptoInterface.createNewGuid());
			if (this.config.clientCredentials.clientSecret) addClientSecret(parameters, this.config.clientCredentials.clientSecret);
			const clientAssertion = request.clientAssertion || this.config.clientCredentials.clientAssertion;
			if (clientAssertion) {
				addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, this.authority.tokenEndpoint));
				addClientAssertionType(parameters, clientAssertion.assertionType);
			}
			if (!StringUtils.isEmptyObj(request.claims) || !StringUtils.isEmptyObj(request.claimsFromClient) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) addClaims(parameters, request.correlationId, request.claims, this.config.authOptions.clientCapabilities, void 0, request.claimsFromClient);
			return mapToQueryString(parameters);
		}
	};
	/**
	*  This class is to be used to acquire tokens for confidential client applications (webApp, webAPI). Confidential client applications
	*  will configure application secrets, client certificates/assertions as applicable
	* @public
	*/
	var ConfidentialClientApplication = class extends ClientApplication {
		/**
		* Constructor for the ConfidentialClientApplication
		*
		* Required attributes in the Configuration object are:
		* - clientID: the application ID of your application. You can obtain one by registering your application with our application registration portal
		* - authority: the authority URL for your application.
		* - client credential: Must set either client secret, certificate, or assertion for confidential clients. You can obtain a client secret from the application registration portal.
		*
		* In Azure AD, authority is a URL indicating of the form https://login.microsoftonline.com/\{Enter_the_Tenant_Info_Here\}.
		* If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
		* If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
		* If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
		* To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
		*
		* In Azure B2C, authority is of the form https://\{instance\}/tfp/\{tenant\}/\{policyName\}/
		* Full B2C functionality will be available in this library in future versions.
		*
		* @param Configuration - configuration object for the MSAL ConfidentialClientApplication instance
		*/
		constructor(configuration) {
			super(configuration);
			const clientSecretNotEmpty = !!this.config.auth.clientSecret;
			const clientAssertionNotEmpty = !!this.config.auth.clientAssertion;
			const certificateNotEmpty = (!!this.config.auth.clientCertificate?.thumbprint || !!this.config.auth.clientCertificate?.thumbprintSha256) && !!this.config.auth.clientCertificate?.privateKey;
			if (this.appTokenProvider) return;
			if (clientSecretNotEmpty && clientAssertionNotEmpty || clientAssertionNotEmpty && certificateNotEmpty || clientSecretNotEmpty && certificateNotEmpty) throw createClientAuthError(invalidClientCredential, "");
			if (this.config.auth.clientSecret) {
				this.clientSecret = this.config.auth.clientSecret;
				return;
			}
			if (this.config.auth.clientAssertion) {
				this.developerProvidedClientAssertion = this.config.auth.clientAssertion;
				return;
			}
			if (!certificateNotEmpty) throw createClientAuthError(invalidClientCredential, "");
			else this.clientAssertion = !!this.config.auth.clientCertificate.thumbprintSha256 ? ClientAssertion.fromCertificateWithSha256Thumbprint(this.config.auth.clientCertificate.thumbprintSha256, this.config.auth.clientCertificate.privateKey, this.config.auth.clientCertificate.x5c) : ClientAssertion.fromCertificate(this.config.auth.clientCertificate.thumbprint, this.config.auth.clientCertificate.privateKey, this.config.auth.clientCertificate.x5c);
			this.appTokenProvider = void 0;
		}
		/**
		* This extensibility point only works for the client_credential flow, i.e. acquireTokenByClientCredential and
		* is meant for Azure SDK to enhance Managed Identity support.
		*
		* @param IAppTokenProvider  - Extensibility interface, which allows the app developer to return a token from a custom source.
		*/
		SetAppTokenProvider(provider) {
			this.appTokenProvider = provider;
		}
		/**
		* Acquires tokens from the authority for the application (not for an end user).
		*/
		async acquireTokenByClientCredential(request) {
			this.logger.info("acquireTokenByClientCredential called", request.correlationId || "");
			let clientAssertion;
			if (request.clientAssertion) clientAssertion = {
				assertion: await getClientAssertion(request.clientAssertion, this.config.auth.clientId),
				assertionType: Constants.JWT_BEARER_ASSERTION_TYPE
			};
			const baseRequest = await this.initializeBaseRequest(request);
			const validBaseRequest = {
				...baseRequest,
				scopes: baseRequest.scopes.filter((scope) => !OIDC_DEFAULT_SCOPES.includes(scope))
			};
			const validRequest = {
				...request,
				...validBaseRequest,
				clientAssertion
			};
			const tenantId = new UrlString(validRequest.authority, validRequest.correlationId).getUrlComponents().PathSegments[0];
			if (Object.values(AADAuthority).includes(tenantId)) throw createClientAuthError(missingTenantIdError, validRequest.correlationId);
			const ENV_MSAL_FORCE_REGION = process.env[MSAL_FORCE_REGION];
			let region;
			if (validRequest.azureRegion !== "DisableMsalForceRegion") if (!validRequest.azureRegion && ENV_MSAL_FORCE_REGION) region = ENV_MSAL_FORCE_REGION;
			else region = validRequest.azureRegion;
			const azureRegionConfiguration = {
				azureRegion: region,
				environmentRegion: process.env[REGION_ENVIRONMENT_VARIABLE]
			};
			const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByClientCredential, validRequest.correlationId, validRequest.skipCache);
			try {
				const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, azureRegionConfiguration, request.azureCloudOptions);
				const clientCredentialClient = new ClientCredentialClient(await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, "", serverTelemetryManager), this.appTokenProvider);
				this.logger.verbose("Client credential client created", validRequest.correlationId);
				return await clientCredentialClient.acquireToken(validRequest);
			} catch (e) {
				if (e instanceof AuthError) e.correlationId = validRequest.correlationId;
				serverTelemetryManager.cacheFailedRequest(e);
				throw e;
			}
		}
		/**
		* Acquires tokens from the authority for the application.
		*
		* Used in scenarios where the current app is a middle-tier service which was called with a token
		* representing an end user. The current app can use the token (oboAssertion) to request another
		* token to access downstream web API, on behalf of that user.
		*
		* The current middle-tier app has no user interaction to obtain consent.
		* See how to gain consent upfront for your middle-tier app from this article.
		* https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow#gaining-consent-for-the-middle-tier-application
		*/
		async acquireTokenOnBehalfOf(request) {
			this.logger.info("acquireTokenOnBehalfOf called", request.correlationId || "");
			const validRequest = {
				...request,
				...await this.initializeBaseRequest(request)
			};
			try {
				const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
				const oboClient = new OnBehalfOfClient(await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, "", void 0));
				this.logger.verbose("On behalf of client created", validRequest.correlationId);
				return await oboClient.acquireToken(validRequest);
			} catch (e) {
				if (e instanceof AuthError) e.correlationId = validRequest.correlationId;
				throw e;
			}
		}
		/**
		* Acquires a user-scoped token using the user_fic grant type (Leg 3 of Agent Identity).
		*
		* Exchanges a federated identity credential (instance token from Leg 2) for a user-scoped token.
		* Exactly one of `userObjectId` or `username` must be provided to identify the target user.
		*
		* This method always makes a network call. Use `acquireTokenSilent` to retrieve cached FIC tokens.
		*/
		async acquireTokenByUserFederatedIdentityCredential(request) {
			this.logger.info("acquireTokenByUserFederatedIdentityCredential called", request.correlationId || "");
			if (request.userObjectId && request.username) throw createClientAuthError(conflictingUserIdentifiers, request.correlationId || "");
			if (!request.userObjectId && !request.username) throw createClientAuthError(missingUserIdentifier, request.correlationId || "");
			if (!request.assertion) throw createClientAuthError(emptyFicAssertion, request.correlationId || "");
			let clientAssertion;
			if (request.clientAssertion) clientAssertion = {
				assertion: await getClientAssertion(request.clientAssertion, this.config.auth.clientId),
				assertionType: Constants.JWT_BEARER_ASSERTION_TYPE
			};
			const baseRequest = await this.initializeBaseRequest(request);
			const validRequest = {
				...request,
				...baseRequest,
				assertion: request.assertion,
				clientAssertion
			};
			const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByUserFederatedIdentityCredential, validRequest.correlationId);
			try {
				const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
				const ficClient = new UserFederatedIdentityCredentialClient(await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, "", serverTelemetryManager));
				this.logger.verbose("UserFederatedIdentityCredential client created", validRequest.correlationId);
				return await ficClient.acquireToken(validRequest);
			} catch (e) {
				if (e instanceof AuthError) e.correlationId = validRequest.correlationId;
				serverTelemetryManager.cacheFailedRequest(e);
				throw e;
			}
		}
	};
	/**
	* @internal
	* Checks if a given date string is in ISO 8601 format.
	*
	* @param dateString - The date string to be checked.
	* @returns boolean - Returns true if the date string is in ISO 8601 format, otherwise false.
	*/
	function isIso8601(dateString) {
		if (typeof dateString !== "string") return false;
		const date = new Date(dateString);
		return !isNaN(date.getTime()) && date.toISOString() === dateString;
	}
	var HttpClientWithRetries = class {
		constructor(httpClientNoRetries, retryPolicy, logger) {
			this.httpClientNoRetries = httpClientNoRetries;
			this.retryPolicy = retryPolicy;
			this.logger = logger;
		}
		async sendNetworkRequestAsyncHelper(httpMethod, url, options) {
			if (httpMethod === HttpMethod.GET) return this.httpClientNoRetries.sendGetRequestAsync(url, options);
			else return this.httpClientNoRetries.sendPostRequestAsync(url, options);
		}
		async sendNetworkRequestAsync(httpMethod, url, options) {
			let response = await this.sendNetworkRequestAsyncHelper(httpMethod, url, options);
			if ("isNewRequest" in this.retryPolicy) this.retryPolicy.isNewRequest = true;
			let currentRetry = 0;
			while (await this.retryPolicy.pauseForRetry(response.status, currentRetry, this.logger, response.headers[HeaderNames.RETRY_AFTER])) {
				response = await this.sendNetworkRequestAsyncHelper(httpMethod, url, options);
				currentRetry++;
			}
			return response;
		}
		async sendGetRequestAsync(url, options) {
			return this.sendNetworkRequestAsync(HttpMethod.GET, url, options);
		}
		async sendPostRequestAsync(url, options) {
			return this.sendNetworkRequestAsync(HttpMethod.POST, url, options);
		}
	};
	/**
	* Managed Identity User Assigned Id Query Parameter Names
	*/
	var ManagedIdentityUserAssignedIdQueryParameterNames = {
		MANAGED_IDENTITY_CLIENT_ID_2017: "clientid",
		MANAGED_IDENTITY_CLIENT_ID: "client_id",
		MANAGED_IDENTITY_OBJECT_ID: "object_id",
		MANAGED_IDENTITY_RESOURCE_ID_IMDS: "msi_res_id",
		MANAGED_IDENTITY_RESOURCE_ID_NON_IMDS: "mi_res_id"
	};
	/**
	* Base class for all Managed Identity sources. Provides common functionality for
	* authenticating with Azure Managed Identity endpoints across different Azure services
	* including IMDS, App Service, Azure Arc, Service Fabric, Cloud Shell, and Machine Learning.
	*
	* This abstract class handles token acquisition, response processing, and network communication
	* while allowing concrete implementations to define source-specific request creation logic.
	*/
	var BaseManagedIdentitySource = class {
		/**
		* Creates an instance of BaseManagedIdentitySource.
		*
		* @param logger - Logger instance for diagnostic information
		* @param nodeStorage - Storage interface for caching tokens
		* @param networkClient - Network client for making HTTP requests
		* @param cryptoProvider - Cryptographic provider for token operations
		* @param disableInternalRetries - Whether to disable automatic retry logic
		*/
		constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
			this.logger = logger;
			this.nodeStorage = nodeStorage;
			this.networkClient = networkClient;
			this.cryptoProvider = cryptoProvider;
			this.disableInternalRetries = disableInternalRetries;
		}
		/**
		* Generates a new correlation ID for request tracing.
		*
		* @returns A new GUID string for use as a correlation or request ID
		*/
		createCorrelationId() {
			return this.cryptoProvider.createNewGuid();
		}
		/**
		* Processes the network response and converts it to a standardized server token response.
		* This async version allows for source-specific response processing logic while maintaining
		* backward compatibility with the synchronous version.
		*
		* @param response - The network response containing the managed identity token
		* @param _networkClient - Network client used for the request (unused in base implementation)
		* @param _networkRequest - The original network request parameters (unused in base implementation)
		* @param _networkRequestOptions - The network request options (unused in base implementation)
		*
		* @returns Promise resolving to a standardized server authorization token response
		*/
		async getServerTokenResponseAsync(response, _networkClient, _networkRequest, _networkRequestOptions) {
			return this.getServerTokenResponse(response);
		}
		/**
		* Converts a managed identity token response to a standardized server authorization token response.
		* Handles time format conversion, expiration calculation, and error mapping to ensure
		* compatibility with the MSAL response handling pipeline.
		*
		* @param response - The network response containing the managed identity token
		*
		* @returns Standardized server authorization token response with normalized fields
		*/
		getServerTokenResponse(response) {
			let refreshIn, expiresIn;
			if (response.body.expires_on) {
				if (isIso8601(response.body.expires_on)) response.body.expires_on = new Date(response.body.expires_on).getTime() / 1e3;
				expiresIn = response.body.expires_on - nowSeconds();
				if (expiresIn > 7200) refreshIn = expiresIn / 2;
			}
			return {
				status: response.status,
				access_token: response.body.access_token,
				expires_in: expiresIn,
				scope: response.body.resource,
				token_type: response.body.token_type,
				refresh_in: refreshIn,
				correlation_id: response.body.correlation_id || response.body.correlationId,
				error: typeof response.body.error === "string" ? response.body.error : response.body.error?.code,
				error_description: response.body.message || (typeof response.body.error === "string" ? response.body.error_description : response.body.error?.message),
				error_codes: response.body.error_codes,
				timestamp: response.body.timestamp,
				trace_id: response.body.trace_id
			};
		}
		/**
		* Acquires an access token using the managed identity endpoint for the specified resource.
		* This is the primary method for token acquisition, handling the complete flow from
		* request creation through response processing and token caching.
		*
		* @param managedIdentityRequest - The managed identity request containing resource and optional parameters
		* @param managedIdentityId - The managed identity configuration (system or user-assigned)
		* @param fakeAuthority - Authority instance used for token caching (managed identity uses a placeholder authority)
		* @param refreshAccessToken - Whether this is a token refresh operation
		*
		* @returns Promise resolving to an authentication result containing the access token and metadata
		*
		* @throws {AuthError} When network requests fail or token validation fails
		* @throws {ClientAuthError} When network errors occur during the request
		*/
		async acquireTokenWithManagedIdentity(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken) {
			const networkRequest = this.createRequest(managedIdentityRequest.resource, managedIdentityId);
			if (managedIdentityRequest.revokedTokenSha256Hash) {
				this.logger.info(`[Managed Identity] The following claims are present in the request: ${managedIdentityRequest.claims}`, "");
				networkRequest.queryParameters[ManagedIdentityQueryParameters.SHA256_TOKEN_TO_REFRESH] = managedIdentityRequest.revokedTokenSha256Hash;
			}
			if (managedIdentityRequest.clientCapabilities?.length) {
				const clientCapabilities = managedIdentityRequest.clientCapabilities.toString();
				this.logger.info(`[Managed Identity] The following client capabilities are present in the request: ${clientCapabilities}`, "");
				networkRequest.queryParameters[ManagedIdentityQueryParameters.XMS_CC] = clientCapabilities;
			}
			const headers = networkRequest.headers;
			headers[HeaderNames.CONTENT_TYPE] = URL_FORM_CONTENT_TYPE;
			const networkRequestOptions = { headers };
			if (Object.keys(networkRequest.bodyParameters).length) networkRequestOptions.body = networkRequest.computeParametersBodyString();
			/**
			* Initializes the network client helper based on the retry policy configuration.
			* If internal retries are disabled, it uses the provided network client directly.
			* Otherwise, it wraps the network client with an HTTP client that supports retries.
			*/
			const networkClientHelper = this.disableInternalRetries ? this.networkClient : new HttpClientWithRetries(this.networkClient, networkRequest.retryPolicy, this.logger);
			const reqTimestamp = nowSeconds();
			let response;
			try {
				if (networkRequest.httpMethod === HttpMethod.POST) response = await networkClientHelper.sendPostRequestAsync(networkRequest.computeUri(), networkRequestOptions);
				else response = await networkClientHelper.sendGetRequestAsync(networkRequest.computeUri(), networkRequestOptions);
			} catch (error) {
				if (error instanceof AuthError) throw error;
				else throw createClientAuthError(networkError, managedIdentityRequest.correlationId);
			}
			const responseHandler = new ResponseHandler(managedIdentityId.id, this.nodeStorage, this.cryptoProvider, this.logger, new StubPerformanceClient(), null, null);
			const serverTokenResponse = await this.getServerTokenResponseAsync(response, networkClientHelper, networkRequest, networkRequestOptions);
			responseHandler.validateTokenResponse(serverTokenResponse, serverTokenResponse.correlation_id || "", refreshAccessToken);
			return responseHandler.handleServerTokenResponse(serverTokenResponse, fakeAuthority, reqTimestamp, managedIdentityRequest, ApiId.acquireTokenWithManagedIdentity);
		}
		/**
		* Determines the appropriate query parameter name for user-assigned managed identity
		* based on the identity type, API version, and endpoint characteristics.
		* Different Azure services and API versions use different parameter names for the same identity types.
		*
		* @param managedIdentityIdType - The type of user-assigned managed identity (client ID, object ID, or resource ID)
		* @param isImds - Whether the request is being made to the IMDS (Instance Metadata Service) endpoint
		* @param usesApi2017 - Whether the endpoint uses the 2017-09-01 API version (affects client ID parameter name)
		*
		* @returns The correct query parameter name for the specified identity type and endpoint
		*
		* @throws {ManagedIdentityError} When an invalid managed identity ID type is provided
		*/
		getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityIdType, isImds, usesApi2017) {
			switch (managedIdentityIdType) {
				case ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID:
					this.logger.info(`[Managed Identity] [API version ${usesApi2017 ? "2017+" : "2019+"}] Adding user assigned client id to the request.`, "");
					return usesApi2017 ? ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_CLIENT_ID_2017 : ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_CLIENT_ID;
				case ManagedIdentityIdType.USER_ASSIGNED_RESOURCE_ID:
					this.logger.info("[Managed Identity] Adding user assigned resource id to the request.", "");
					return isImds ? ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_RESOURCE_ID_IMDS : ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_RESOURCE_ID_NON_IMDS;
				case ManagedIdentityIdType.USER_ASSIGNED_OBJECT_ID:
					this.logger.info("[Managed Identity] Adding user assigned object id to the request.", "");
					return ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_OBJECT_ID;
				default: throw createManagedIdentityError(invalidManagedIdentityIdType, "");
			}
		}
	};
	/**
	* Validates and normalizes an environment variable containing a URL string.
	* This static utility method ensures that environment variables used for managed identity
	* endpoints contain properly formatted URLs and provides informative error messages when validation fails.
	*
	* @param envVariableStringName - The name of the environment variable being validated (for error reporting)
	* @param envVariable - The environment variable value containing the URL string
	* @param sourceName - The name of the managed identity source (for error reporting)
	* @param logger - Logger instance for diagnostic information
	*
	* @returns The validated and normalized URL string
	*
	* @throws {ManagedIdentityError} When the environment variable contains a malformed URL
	*/
	BaseManagedIdentitySource.getValidatedEnvVariableUrlString = (envVariableStringName, envVariable, sourceName, logger) => {
		try {
			return new UrlString(envVariable, "").urlString;
		} catch (error) {
			logger.info(`[Managed Identity] ${sourceName} managed identity is unavailable because the '${envVariableStringName}' environment variable is malformed.`, "");
			throw createManagedIdentityError(MsiEnvironmentVariableUrlMalformedErrorCodes[envVariableStringName], "");
		}
	};
	var LinearRetryStrategy = class {
		/**
		* Calculates the number of milliseconds to sleep based on the `retry-after` HTTP header.
		*
		* @param retryHeader - The value of the `retry-after` HTTP header. This can be either a number of seconds
		*                      or an HTTP date string.
		* @returns The number of milliseconds to sleep before retrying the request. If the `retry-after` header is not
		*          present or cannot be parsed, returns 0.
		*/
		calculateDelay(retryHeader, minimumDelay) {
			if (!retryHeader) return minimumDelay;
			let millisToSleep = Math.round(parseFloat(retryHeader) * 1e3);
			if (isNaN(millisToSleep)) millisToSleep = new Date(retryHeader).valueOf() - (/* @__PURE__ */ new Date()).valueOf();
			return Math.max(minimumDelay, millisToSleep);
		}
	};
	var DEFAULT_MANAGED_IDENTITY_MAX_RETRIES = 3;
	var DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS = 1e3;
	var DEFAULT_MANAGED_IDENTITY_HTTP_STATUS_CODES_TO_RETRY_ON = [
		HTTP_NOT_FOUND,
		HTTP_REQUEST_TIMEOUT,
		HTTP_TOO_MANY_REQUESTS,
		HTTP_SERVER_ERROR,
		HTTP_SERVICE_UNAVAILABLE,
		HTTP_GATEWAY_TIMEOUT
	];
	var DefaultManagedIdentityRetryPolicy = class DefaultManagedIdentityRetryPolicy {
		constructor() {
			this.linearRetryStrategy = new LinearRetryStrategy();
		}
		static get DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS() {
			return DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS;
		}
		async pauseForRetry(httpStatusCode, currentRetry, logger, retryAfterHeader) {
			if (DEFAULT_MANAGED_IDENTITY_HTTP_STATUS_CODES_TO_RETRY_ON.includes(httpStatusCode) && currentRetry < DEFAULT_MANAGED_IDENTITY_MAX_RETRIES) {
				const retryAfterDelay = this.linearRetryStrategy.calculateDelay(retryAfterHeader, DefaultManagedIdentityRetryPolicy.DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS);
				logger.verbose(`Retrying request in ${retryAfterDelay}ms (retry attempt: ${currentRetry + 1})`, "");
				await new Promise((resolve) => {
					return setTimeout(resolve, retryAfterDelay);
				});
				return true;
			}
			return false;
		}
	};
	var ManagedIdentityRequestParameters = class {
		constructor(httpMethod, endpoint, retryPolicy) {
			this.httpMethod = httpMethod;
			this._baseEndpoint = endpoint;
			this.headers = {};
			this.bodyParameters = {};
			this.queryParameters = {};
			this.retryPolicy = retryPolicy || new DefaultManagedIdentityRetryPolicy();
		}
		computeUri() {
			const parameters = /* @__PURE__ */ new Map();
			if (this.queryParameters) addExtraParameters(parameters, this.queryParameters);
			const queryParametersString = mapToQueryString(parameters);
			return UrlString.appendQueryString(this._baseEndpoint, queryParametersString);
		}
		computeParametersBodyString() {
			const parameters = /* @__PURE__ */ new Map();
			if (this.bodyParameters) addExtraParameters(parameters, this.bodyParameters);
			return mapToQueryString(parameters);
		}
	};
	var APP_SERVICE_MSI_API_VERSION = "2019-08-01";
	/**
	* Azure App Service Managed Identity Source implementation.
	*
	* This class provides managed identity authentication for applications running in Azure App Service.
	* It uses the local metadata service endpoint available within App Service environments to obtain
	* access tokens without requiring explicit credentials.
	*
	* Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/AppServiceManagedIdentitySource.cs
	*/
	var AppService = class AppService extends BaseManagedIdentitySource {
		/**
		* Creates a new instance of the AppService managed identity source.
		*
		* @param logger - Logger instance for diagnostic output
		* @param nodeStorage - Node.js storage implementation for caching
		* @param networkClient - Network client for making HTTP requests
		* @param cryptoProvider - Cryptographic operations provider
		* @param disableInternalRetries - Whether to disable internal retry logic
		* @param identityEndpoint - The App Service identity endpoint URL
		* @param identityHeader - The secret header value required for authentication
		*/
		constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, identityEndpoint, identityHeader) {
			super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
			this.identityEndpoint = identityEndpoint;
			this.identityHeader = identityHeader;
		}
		/**
		* Retrieves the required environment variables for App Service managed identity.
		*
		* App Service managed identity requires two environment variables:
		* - IDENTITY_ENDPOINT: The URL of the local metadata service
		* - IDENTITY_HEADER: A secret header value for authentication
		*
		* @returns An array containing [identityEndpoint, identityHeader] values from environment variables.
		*          Either value may be undefined if the environment variable is not set.
		*/
		static getEnvironmentVariables() {
			return [process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT], process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER]];
		}
		/**
		* Attempts to create an AppService managed identity source if the environment supports it.
		*
		* This method checks for the presence of required environment variables and validates
		* the identity endpoint URL. If the environment is not suitable for App Service managed
		* identity (missing environment variables or invalid endpoint), it returns null.
		*
		* @param logger - Logger instance for diagnostic output
		* @param nodeStorage - Node.js storage implementation for caching
		* @param networkClient - Network client for making HTTP requests
		* @param cryptoProvider - Cryptographic operations provider
		* @param disableInternalRetries - Whether to disable internal retry logic
		*
		* @returns A new AppService instance if the environment is suitable, null otherwise
		*/
		static tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
			const [identityEndpoint, identityHeader] = AppService.getEnvironmentVariables();
			if (!identityEndpoint || !identityHeader) {
				logger.info(`[Managed Identity] ${ManagedIdentitySourceNames.APP_SERVICE} managed identity is unavailable because one or both of the '${ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER}' and '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' environment variables are not defined.`, "");
				return null;
			}
			const validatedIdentityEndpoint = AppService.getValidatedEnvVariableUrlString(ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT, identityEndpoint, ManagedIdentitySourceNames.APP_SERVICE, logger);
			logger.info(`[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.APP_SERVICE} managed identity. Endpoint URI: ${validatedIdentityEndpoint}. Creating ${ManagedIdentitySourceNames.APP_SERVICE} managed identity.`, "");
			return new AppService(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, identityEndpoint, identityHeader);
		}
		/**
		* Creates a managed identity token request for the App Service environment.
		*
		* This method constructs an HTTP GET request to the App Service identity endpoint
		* with the required headers, query parameters, and managed identity configuration.
		* The request includes the secret header for authentication and appropriate API version.
		*
		* @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
		* @param managedIdentityId - The managed identity configuration specifying whether to use system-assigned or user-assigned identity
		*
		* @returns A configured ManagedIdentityRequestParameters object ready for network execution
		*/
		createRequest(resource, managedIdentityId) {
			const request = new ManagedIdentityRequestParameters(HttpMethod.GET, this.identityEndpoint);
			request.headers[ManagedIdentityHeaders.APP_SERVICE_SECRET_HEADER_NAME] = this.identityHeader;
			request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = APP_SERVICE_MSI_API_VERSION;
			request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
			if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED) request.queryParameters[this.getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityId.idType)] = managedIdentityId.id;
			return request;
		}
	};
	var ARC_API_VERSION = "2020-06-01";
	var DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT = "http://127.0.0.1:40342/metadata/identity/oauth2/token";
	var HIMDS_EXECUTABLE_HELPER_STRING = "N/A: himds executable exists";
	var SUPPORTED_AZURE_ARC_PLATFORMS = {
		win32: `${process.env["ProgramData"]}\\AzureConnectedMachineAgent\\Tokens\\`,
		linux: "/var/opt/azcmagent/tokens/"
	};
	var AZURE_ARC_FILE_DETECTION = {
		win32: `${process.env["ProgramFiles"]}\\AzureConnectedMachineAgent\\himds.exe`,
		linux: "/opt/azcmagent/bin/himds"
	};
	/**
	* Azure Arc managed identity source implementation for acquiring tokens from Azure Arc-enabled servers.
	*
	* This class provides managed identity authentication for applications running on Azure Arc-enabled servers
	* by communicating with the local Hybrid Instance Metadata Service (HIMDS). It supports both environment
	* variable-based configuration and automatic detection through the HIMDS executable.
	*
	* Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/AzureArcManagedIdentitySource.cs
	*/
	var AzureArc = class AzureArc extends BaseManagedIdentitySource {
		/**
		* Creates a new instance of the AzureArc managed identity source.
		*
		* @param logger - Logger instance for capturing telemetry and diagnostic information
		* @param nodeStorage - Storage implementation for caching tokens and metadata
		* @param networkClient - Network client for making HTTP requests to the identity endpoint
		* @param cryptoProvider - Cryptographic operations provider for token validation and encryption
		* @param disableInternalRetries - Flag to disable automatic retry logic for failed requests
		* @param identityEndpoint - The Azure Arc identity endpoint URL for token requests
		*/
		constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, identityEndpoint) {
			super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
			this.identityEndpoint = identityEndpoint;
		}
		/**
		* Retrieves and validates Azure Arc environment variables for managed identity configuration.
		*
		* This method checks for IDENTITY_ENDPOINT and IMDS_ENDPOINT environment variables.
		* If either is missing, it attempts to detect the Azure Arc environment by checking for
		* the HIMDS executable at platform-specific paths. On successful detection, it returns
		* the default identity endpoint and a helper string indicating file-based detection.
		*
		* @returns An array containing [identityEndpoint, imdsEndpoint] where both values are
		*          strings if Azure Arc is available, or undefined if not available.
		*/
		static getEnvironmentVariables() {
			let identityEndpoint = process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT];
			let imdsEndpoint = process.env[ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT];
			if (!identityEndpoint || !imdsEndpoint) {
				const fileDetectionPath = AZURE_ARC_FILE_DETECTION[process.platform];
				try {
					fs.accessSync(fileDetectionPath, fs.constants.F_OK | fs.constants.R_OK);
					identityEndpoint = DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT;
					imdsEndpoint = HIMDS_EXECUTABLE_HELPER_STRING;
				} catch (err) {}
			}
			return [identityEndpoint, imdsEndpoint];
		}
		/**
		* Attempts to create an AzureArc managed identity source instance.
		*
		* Validates the Azure Arc environment by checking environment variables
		* and performing file-based detection. It ensures that only system-assigned managed identities
		* are supported for Azure Arc scenarios. The method performs comprehensive validation of
		* endpoint URLs and logs detailed information about the detection process.
		*
		* @param logger - Logger instance for capturing creation and validation steps
		* @param nodeStorage - Storage implementation for the managed identity source
		* @param networkClient - Network client for HTTP communication
		* @param cryptoProvider - Cryptographic operations provider
		* @param disableInternalRetries - Whether to disable automatic retry mechanisms
		* @param managedIdentityId - The managed identity configuration, must be system-assigned
		*
		* @returns AzureArc instance if the environment supports Azure Arc managed identity, null otherwise
		*
		* @throws {ManagedIdentityError} When a user-assigned managed identity is specified (not supported for Azure Arc)
		*/
		static tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) {
			const [identityEndpoint, imdsEndpoint] = AzureArc.getEnvironmentVariables();
			if (!identityEndpoint || !imdsEndpoint) {
				logger.info(`[Managed Identity] ${ManagedIdentitySourceNames.AZURE_ARC} managed identity is unavailable through environment variables because one or both of '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' and '${ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT}' are not defined. ${ManagedIdentitySourceNames.AZURE_ARC} managed identity is also unavailable through file detection.`, "");
				return null;
			}
			if (imdsEndpoint === HIMDS_EXECUTABLE_HELPER_STRING) logger.info(`[Managed Identity] ${ManagedIdentitySourceNames.AZURE_ARC} managed identity is available through file detection. Defaulting to known ${ManagedIdentitySourceNames.AZURE_ARC} endpoint: ${DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT}. Creating ${ManagedIdentitySourceNames.AZURE_ARC} managed identity.`, "");
			else {
				const validatedIdentityEndpoint = AzureArc.getValidatedEnvVariableUrlString(ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT, identityEndpoint, ManagedIdentitySourceNames.AZURE_ARC, logger);
				validatedIdentityEndpoint.endsWith("/") && validatedIdentityEndpoint.slice(0, -1);
				AzureArc.getValidatedEnvVariableUrlString(ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT, imdsEndpoint, ManagedIdentitySourceNames.AZURE_ARC, logger);
				logger.info(`[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.AZURE_ARC} managed identity. Endpoint URI: ${validatedIdentityEndpoint}. Creating ${ManagedIdentitySourceNames.AZURE_ARC} managed identity.`, "");
			}
			if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED) throw createManagedIdentityError(unableToCreateAzureArc, "");
			return new AzureArc(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, identityEndpoint);
		}
		/**
		* Creates a properly formatted HTTP request for acquiring tokens from the Azure Arc identity endpoint.
		*
		* This method constructs a GET request to the Azure Arc HIMDS endpoint with the required metadata header
		* and query parameters. The endpoint URL is normalized to use 127.0.0.1 instead of localhost for
		* consistency. Additional body parameters are calculated by the base class during token acquisition.
		*
		* @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
		*
		* @returns A configured ManagedIdentityRequestParameters object ready for network execution
		*/
		createRequest(resource) {
			const request = new ManagedIdentityRequestParameters(HttpMethod.GET, this.identityEndpoint.replace("localhost", "127.0.0.1"));
			request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";
			request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = ARC_API_VERSION;
			request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
			return request;
		}
		/**
		* Processes the server response and handles Azure Arc-specific authentication challenges.
		*
		* This method implements the Azure Arc authentication flow which may require reading a secret file
		* for authorization. When the initial request returns HTTP 401 Unauthorized, it extracts the file
		* path from the WWW-Authenticate header, validates the file location and size, reads the secret,
		* and retries the request with Basic authentication. The method includes comprehensive security
		* validations to prevent path traversal and ensure file integrity.
		*
		* @param originalResponse - The initial HTTP response from the identity endpoint
		* @param networkClient - Network client for making the retry request if needed
		* @param networkRequest - The original request parameters (modified with auth header for retry)
		* @param networkRequestOptions - Additional options for network requests
		*
		* @returns A promise that resolves to the server token response with access token and metadata
		*
		* @throws {ManagedIdentityError} When:
		*   - WWW-Authenticate header is missing or has unsupported format
		*   - Platform is not supported (not Windows or Linux)
		*   - Secret file has invalid extension (not .key)
		*   - Secret file path doesn't match expected platform path
		*   - Secret file cannot be read or is too large (>4096 bytes)
		* @throws {ClientAuthError} When network errors occur during retry request
		*/
		async getServerTokenResponseAsync(originalResponse, networkClient, networkRequest, networkRequestOptions) {
			let retryResponse;
			if (originalResponse.status === HTTP_UNAUTHORIZED) {
				const wwwAuthHeader = originalResponse.headers["www-authenticate"];
				if (!wwwAuthHeader) throw createManagedIdentityError(wwwAuthenticateHeaderMissing, "");
				if (!wwwAuthHeader.includes("Basic realm=")) throw createManagedIdentityError(wwwAuthenticateHeaderUnsupportedFormat, "");
				const secretFilePath = wwwAuthHeader.split("Basic realm=")[1];
				if (!SUPPORTED_AZURE_ARC_PLATFORMS.hasOwnProperty(process.platform)) throw createManagedIdentityError(platformNotSupported, "");
				const expectedSecretFilePath = SUPPORTED_AZURE_ARC_PLATFORMS[process.platform];
				const fileName = path.basename(secretFilePath);
				if (!fileName.endsWith(".key")) throw createManagedIdentityError(invalidFileExtension, "");
				if (expectedSecretFilePath + fileName !== secretFilePath) throw createManagedIdentityError(invalidFilePath, "");
				let secretFileSize;
				try {
					secretFileSize = await fs.statSync(secretFilePath).size;
				} catch (e) {
					throw createManagedIdentityError(unableToReadSecretFile, "");
				}
				if (secretFileSize > AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES) throw createManagedIdentityError(invalidSecret, "");
				let secret;
				try {
					secret = fs.readFileSync(secretFilePath, EncodingTypes.UTF8);
				} catch (e) {
					throw createManagedIdentityError(unableToReadSecretFile, "");
				}
				const authHeaderValue = `Basic ${secret}`;
				this.logger.info(`[Managed Identity] Adding authorization header to the request.`, "");
				networkRequest.headers[ManagedIdentityHeaders.AUTHORIZATION_HEADER_NAME] = authHeaderValue;
				try {
					retryResponse = await networkClient.sendGetRequestAsync(networkRequest.computeUri(), networkRequestOptions);
				} catch (error) {
					if (error instanceof AuthError) throw error;
					else throw createClientAuthError(networkError, "");
				}
			}
			return this.getServerTokenResponse(retryResponse || originalResponse);
		}
	};
	/**
	* Azure Cloud Shell managed identity source implementation.
	*
	* This class handles authentication for applications running in Azure Cloud Shell environment.
	* Cloud Shell provides a browser-accessible shell for managing Azure resources and includes
	* a pre-configured managed identity for authentication.
	*
	* Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/CloudShellManagedIdentitySource.cs
	*/
	var CloudShell = class CloudShell extends BaseManagedIdentitySource {
		/**
		* Creates a new CloudShell managed identity source instance.
		*
		* @param logger - Logger instance for diagnostic logging
		* @param nodeStorage - Node.js storage implementation for caching
		* @param networkClient - HTTP client for making requests to the managed identity endpoint
		* @param cryptoProvider - Cryptographic operations provider
		* @param disableInternalRetries - Whether to disable automatic retry logic for failed requests
		* @param msiEndpoint - The MSI endpoint URL obtained from environment variables
		*/
		constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, msiEndpoint) {
			super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
			this.msiEndpoint = msiEndpoint;
		}
		/**
		* Retrieves the required environment variables for Cloud Shell managed identity.
		*
		* Cloud Shell requires the MSI_ENDPOINT environment variable to be set, which
		* contains the URL of the managed identity service endpoint.
		*
		* @returns An array containing the MSI_ENDPOINT environment variable value (or undefined if not set)
		*/
		static getEnvironmentVariables() {
			return [process.env[ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT]];
		}
		/**
		* Attempts to create a CloudShell managed identity source instance.
		*
		* This method validates that the required environment variables are present and
		* creates a CloudShell instance if the environment is properly configured.
		* Cloud Shell only supports system-assigned managed identities.
		*
		* @param logger - Logger instance for diagnostic logging
		* @param nodeStorage - Node.js storage implementation for caching
		* @param networkClient - HTTP client for making requests
		* @param cryptoProvider - Cryptographic operations provider
		* @param disableInternalRetries - Whether to disable automatic retry logic
		* @param managedIdentityId - The managed identity configuration (must be system-assigned)
		*
		* @returns A CloudShell instance if the environment is valid, null otherwise
		*
		* @throws {ManagedIdentityError} When a user-assigned managed identity is requested,
		*         as Cloud Shell only supports system-assigned identities
		*/
		static tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) {
			const [msiEndpoint] = CloudShell.getEnvironmentVariables();
			if (!msiEndpoint) {
				logger.info(`[Managed Identity] ${ManagedIdentitySourceNames.CLOUD_SHELL} managed identity is unavailable because the '${ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT} environment variable is not defined.`, "");
				return null;
			}
			const validatedMsiEndpoint = CloudShell.getValidatedEnvVariableUrlString(ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT, msiEndpoint, ManagedIdentitySourceNames.CLOUD_SHELL, logger);
			logger.info(`[Managed Identity] Environment variable validation passed for ${ManagedIdentitySourceNames.CLOUD_SHELL} managed identity. Endpoint URI: ${validatedMsiEndpoint}. Creating ${ManagedIdentitySourceNames.CLOUD_SHELL} managed identity.`, "");
			if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED) throw createManagedIdentityError(unableToCreateCloudShell, "");
			return new CloudShell(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, msiEndpoint);
		}
		/**
		* Creates an HTTP request to acquire an access token from the Cloud Shell managed identity endpoint.
		*
		* This method constructs a POST request to the MSI endpoint with the required headers and
		* body parameters for Cloud Shell authentication. The request includes the target resource
		* for which the access token is being requested.
		*
		* @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
		*
		* @returns A configured ManagedIdentityRequestParameters object ready for network execution
		*/
		createRequest(resource) {
			const request = new ManagedIdentityRequestParameters(HttpMethod.POST, this.msiEndpoint);
			request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";
			request.bodyParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
			return request;
		}
	};
	var ExponentialRetryStrategy = class {
		constructor(minExponentialBackoff, maxExponentialBackoff, exponentialDeltaBackoff) {
			this.minExponentialBackoff = minExponentialBackoff;
			this.maxExponentialBackoff = maxExponentialBackoff;
			this.exponentialDeltaBackoff = exponentialDeltaBackoff;
		}
		/**
		* Calculates the exponential delay based on the current retry attempt.
		*
		* @param {number} currentRetry - The current retry attempt number.
		* @returns {number} - The calculated exponential delay in milliseconds.
		*
		* The delay is calculated using the formula:
		* - If `currentRetry` is 0, it returns the minimum backoff time.
		* - Otherwise, it calculates the delay as the minimum of:
		*   - `(2^(currentRetry - 1)) * deltaBackoff`
		*   - `maxBackoff`
		*
		* This ensures that the delay increases exponentially with each retry attempt,
		* but does not exceed the maximum backoff time.
		*/
		calculateDelay(currentRetry) {
			if (currentRetry === 0) return this.minExponentialBackoff;
			return Math.min(Math.pow(2, currentRetry - 1) * this.exponentialDeltaBackoff, this.maxExponentialBackoff);
		}
	};
	var HTTP_STATUS_400_CODES_FOR_EXPONENTIAL_STRATEGY = [
		HTTP_NOT_FOUND,
		HTTP_REQUEST_TIMEOUT,
		HTTP_GONE,
		HTTP_TOO_MANY_REQUESTS
	];
	var EXPONENTIAL_STRATEGY_NUM_RETRIES = 3;
	var LINEAR_STRATEGY_NUM_RETRIES = 7;
	var MIN_EXPONENTIAL_BACKOFF_MS = 1e3;
	var MAX_EXPONENTIAL_BACKOFF_MS = 4e3;
	var EXPONENTIAL_DELTA_BACKOFF_MS = 2e3;
	var HTTP_STATUS_GONE_RETRY_AFTER_MS = 1e4;
	var ImdsRetryPolicy = class ImdsRetryPolicy {
		constructor() {
			this.exponentialRetryStrategy = new ExponentialRetryStrategy(ImdsRetryPolicy.MIN_EXPONENTIAL_BACKOFF_MS, ImdsRetryPolicy.MAX_EXPONENTIAL_BACKOFF_MS, ImdsRetryPolicy.EXPONENTIAL_DELTA_BACKOFF_MS);
		}
		static get MIN_EXPONENTIAL_BACKOFF_MS() {
			return MIN_EXPONENTIAL_BACKOFF_MS;
		}
		static get MAX_EXPONENTIAL_BACKOFF_MS() {
			return MAX_EXPONENTIAL_BACKOFF_MS;
		}
		static get EXPONENTIAL_DELTA_BACKOFF_MS() {
			return EXPONENTIAL_DELTA_BACKOFF_MS;
		}
		static get HTTP_STATUS_GONE_RETRY_AFTER_MS() {
			return HTTP_STATUS_GONE_RETRY_AFTER_MS;
		}
		set isNewRequest(value) {
			this._isNewRequest = value;
		}
		/**
		* Pauses execution for a calculated delay before retrying a request.
		*
		* @param httpStatusCode - The HTTP status code of the response.
		* @param currentRetry - The current retry attempt number.
		* @param retryAfterHeader - The value of the "retry-after" header from the response.
		* @returns A promise that resolves to a boolean indicating whether a retry should be attempted.
		*/
		async pauseForRetry(httpStatusCode, currentRetry, logger) {
			if (this._isNewRequest) {
				this._isNewRequest = false;
				this.maxRetries = httpStatusCode === HTTP_GONE ? LINEAR_STRATEGY_NUM_RETRIES : EXPONENTIAL_STRATEGY_NUM_RETRIES;
			}
			/**
			* (status code is one of the retriable 400 status code
			* or
			* status code is >= 500 and <= 599)
			* and
			* current count of retries is less than the max number of retries
			*/
			if ((HTTP_STATUS_400_CODES_FOR_EXPONENTIAL_STRATEGY.includes(httpStatusCode) || httpStatusCode >= HTTP_SERVER_ERROR_RANGE_START && httpStatusCode <= HTTP_SERVER_ERROR_RANGE_END && currentRetry < this.maxRetries) && currentRetry < this.maxRetries) {
				const retryAfterDelay = httpStatusCode === HTTP_GONE ? ImdsRetryPolicy.HTTP_STATUS_GONE_RETRY_AFTER_MS : this.exponentialRetryStrategy.calculateDelay(currentRetry);
				logger.verbose(`Retrying request in ${retryAfterDelay}ms (retry attempt: ${currentRetry + 1})`, "");
				await new Promise((resolve) => {
					return setTimeout(resolve, retryAfterDelay);
				});
				return true;
			}
			return false;
		}
	};
	var IMDS_TOKEN_PATH = "/metadata/identity/oauth2/token";
	var DEFAULT_IMDS_ENDPOINT = `http://169.254.169.254${IMDS_TOKEN_PATH}`;
	var IMDS_API_VERSION = "2018-02-01";
	/**
	* Managed Identity source implementation for Azure Instance Metadata Service (IMDS).
	*
	* IMDS is available on Azure Virtual Machines and Virtual Machine Scale Sets and provides
	* a REST endpoint to obtain OAuth tokens for managed identities. This implementation
	* handles both system-assigned and user-assigned managed identities.
	*
	* Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/ImdsManagedIdentitySource.cs
	*/
	var Imds = class Imds extends BaseManagedIdentitySource {
		/**
		* Constructs an Imds instance with the specified configuration.
		*
		* @param logger - Logger instance for recording debug information and errors
		* @param nodeStorage - NodeStorage instance used for token caching operations
		* @param networkClient - Network client implementation for making HTTP requests to IMDS
		* @param cryptoProvider - CryptoProvider for generating correlation IDs and other cryptographic operations
		* @param disableInternalRetries - When true, disables the built-in retry logic for IMDS requests
		* @param identityEndpoint - The complete IMDS endpoint URL including the token path
		*/
		constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, identityEndpoint) {
			super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
			this.identityEndpoint = identityEndpoint;
		}
		/**
		* Creates an Imds instance with the appropriate endpoint configuration.
		*
		* This method checks for the presence of the AZURE_POD_IDENTITY_AUTHORITY_HOST environment
		* variable, which is used in Azure Kubernetes Service (AKS) environments with Azure AD
		* Pod Identity. If found, it uses that endpoint; otherwise, it falls back to the standard
		* IMDS endpoint (169.254.169.254).
		*
		* @param logger - Logger instance for recording endpoint discovery and validation
		* @param nodeStorage - NodeStorage instance for token caching
		* @param networkClient - Network client for HTTP requests
		* @param cryptoProvider - CryptoProvider for cryptographic operations
		* @param disableInternalRetries - Whether to disable built-in retry logic
		*
		* @returns A configured Imds instance ready to make token requests
		*/
		static tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
			let validatedIdentityEndpoint;
			if (process.env[ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST]) {
				logger.info(`[Managed Identity] Environment variable ${ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST} for ${ManagedIdentitySourceNames.IMDS} returned endpoint: ${process.env[ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST]}`, "");
				validatedIdentityEndpoint = Imds.getValidatedEnvVariableUrlString(ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST, `${process.env[ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST]}${IMDS_TOKEN_PATH}`, ManagedIdentitySourceNames.IMDS, logger);
			} else {
				logger.info(`[Managed Identity] Unable to find ${ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST} environment variable for ${ManagedIdentitySourceNames.IMDS}, using the default endpoint.`, "");
				validatedIdentityEndpoint = DEFAULT_IMDS_ENDPOINT;
			}
			return new Imds(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, validatedIdentityEndpoint);
		}
		/**
		* Creates a properly configured HTTP request for acquiring an access token from IMDS.
		*
		* This method builds a complete request object with all necessary headers, query parameters,
		* and retry policies required by the Azure Instance Metadata Service.
		*
		* Key request components:
		* - HTTP GET method to the IMDS token endpoint
		* - Metadata header set to "true" (required by IMDS)
		* - API version parameter (currently "2018-02-01")
		* - Resource parameter specifying the target audience
		* - Identity-specific parameters for user-assigned managed identities
		* - IMDS-specific retry policy
		*
		* @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
		* @param managedIdentityId - The managed identity configuration specifying whether to use system-assigned or user-assigned identity
		*
		* @returns A configured ManagedIdentityRequestParameters object ready for network execution
		*/
		createRequest(resource, managedIdentityId) {
			const request = new ManagedIdentityRequestParameters(HttpMethod.GET, this.identityEndpoint);
			request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";
			request.headers[ManagedIdentityHeaders.CLIENT_SKU] = Constants.MSAL_SKU;
			request.headers[ManagedIdentityHeaders.CLIENT_VER] = version;
			request.headers[ManagedIdentityHeaders.CLIENT_REQUEST_ID] = this.createCorrelationId();
			request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = IMDS_API_VERSION;
			request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
			if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED) request.queryParameters[this.getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityId.idType, true)] = managedIdentityId.id;
			request.retryPolicy = new ImdsRetryPolicy();
			return request;
		}
	};
	var SERVICE_FABRIC_MSI_API_VERSION = "2019-07-01-preview";
	/**
	* Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/ServiceFabricManagedIdentitySource.cs
	*/
	var ServiceFabric = class ServiceFabric extends BaseManagedIdentitySource {
		/**
		* Constructs a new ServiceFabric managed identity source for acquiring tokens from Azure Service Fabric clusters.
		*
		* Service Fabric managed identity allows applications running in Service Fabric clusters to authenticate
		* without storing credentials in code. This source handles token acquisition using the Service Fabric
		* Managed Identity Token Service (MITS).
		*
		* @param logger - Logger instance for logging authentication events and debugging information
		* @param nodeStorage - NodeStorage instance for caching tokens and other authentication artifacts
		* @param networkClient - Network client for making HTTP requests to the Service Fabric identity endpoint
		* @param cryptoProvider - Crypto provider for cryptographic operations like token validation
		* @param disableInternalRetries - Whether to disable internal retry logic for failed requests
		* @param identityEndpoint - The Service Fabric managed identity endpoint URL
		* @param identityHeader - The Service Fabric managed identity secret header value
		*/
		constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, identityEndpoint, identityHeader) {
			super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
			this.identityEndpoint = identityEndpoint;
			this.identityHeader = identityHeader;
		}
		/**
		* Retrieves the environment variables required for Service Fabric managed identity authentication.
		*
		* Service Fabric managed identity requires three specific environment variables to be set by the
		* Service Fabric runtime:
		* - IDENTITY_ENDPOINT: The endpoint URL for the Managed Identity Token Service (MITS)
		* - IDENTITY_HEADER: A secret value used for authentication with the MITS
		* - IDENTITY_SERVER_THUMBPRINT: The thumbprint of the MITS server certificate for secure communication
		*
		* @returns An array containing the identity endpoint, identity header, and identity server thumbprint values.
		*          Elements will be undefined if the corresponding environment variables are not set.
		*/
		static getEnvironmentVariables() {
			return [
				process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT],
				process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER],
				process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_SERVER_THUMBPRINT]
			];
		}
		/**
		* Attempts to create a ServiceFabric managed identity source if the runtime environment supports it.
		*
		* Checks for the presence of all required Service Fabric environment variables
		* and validates the endpoint URL format. It will only create a ServiceFabric instance if the application
		* is running in a properly configured Service Fabric cluster with managed identity enabled.
		*
		* Note: User-assigned managed identities must be configured at the cluster level, not at runtime.
		* This method will log a warning if a user-assigned identity is requested.
		*
		* @param logger - Logger instance for logging creation events and validation results
		* @param nodeStorage - NodeStorage instance for caching tokens and authentication artifacts
		* @param networkClient - Network client for making HTTP requests to the identity endpoint
		* @param cryptoProvider - Crypto provider for cryptographic operations
		* @param disableInternalRetries - Whether to disable internal retry logic for failed requests
		* @param managedIdentityId - Managed identity identifier specifying system-assigned or user-assigned identity
		*
		* @returns A ServiceFabric instance if all environment variables are valid and present, otherwise null
		*/
		static tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) {
			const [identityEndpoint, identityHeader, identityServerThumbprint] = ServiceFabric.getEnvironmentVariables();
			if (!identityEndpoint || !identityHeader || !identityServerThumbprint) {
				logger.info(`[Managed Identity] ${ManagedIdentitySourceNames.SERVICE_FABRIC} managed identity is unavailable because one or all of the '${ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER}', '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' or '${ManagedIdentityEnvironmentVariableNames.IDENTITY_SERVER_THUMBPRINT}' environment variables are not defined.`, "");
				return null;
			}
			const validatedIdentityEndpoint = ServiceFabric.getValidatedEnvVariableUrlString(ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT, identityEndpoint, ManagedIdentitySourceNames.SERVICE_FABRIC, logger);
			logger.info(`[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.SERVICE_FABRIC} managed identity. Endpoint URI: ${validatedIdentityEndpoint}. Creating ${ManagedIdentitySourceNames.SERVICE_FABRIC} managed identity.`, "");
			if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED) logger.warning(`[Managed Identity] ${ManagedIdentitySourceNames.SERVICE_FABRIC} user assigned managed identity is configured in the cluster, not during runtime. See also: https://learn.microsoft.com/en-us/azure/service-fabric/configure-existing-cluster-enable-managed-identity-token-service.`, "");
			return new ServiceFabric(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, identityEndpoint, identityHeader);
		}
		/**
		* Creates HTTP request parameters for acquiring an access token from the Service Fabric Managed Identity Token Service (MITS).
		*
		* This method constructs a properly formatted HTTP GET request that includes:
		* - The secret header for authentication with MITS
		* - API version parameter for the Service Fabric MSI endpoint
		* - Resource parameter specifying the target Azure service
		* - Optional identity parameters for user-assigned managed identities
		*
		* The request follows the Service Fabric managed identity protocol and uses the 2019-07-01-preview API version.
		* For user-assigned identities, the appropriate query parameter (client_id, object_id, or resource_id) is added
		* based on the identity type.
		*
		* @param resource - The Azure resource URI for which the access token is requested (e.g., "https://vault.azure.net/")
		* @param managedIdentityId - The managed identity configuration specifying system-assigned or user-assigned identity details
		*
		* @returns A configured ManagedIdentityRequestParameters object ready for network execution
		*/
		createRequest(resource, managedIdentityId) {
			const request = new ManagedIdentityRequestParameters(HttpMethod.GET, this.identityEndpoint);
			request.headers[ManagedIdentityHeaders.ML_AND_SF_SECRET_HEADER_NAME] = this.identityHeader;
			request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = SERVICE_FABRIC_MSI_API_VERSION;
			request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
			if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED) request.queryParameters[this.getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityId.idType)] = managedIdentityId.id;
			return request;
		}
	};
	var MACHINE_LEARNING_MSI_API_VERSION = "2017-09-01";
	var MANAGED_IDENTITY_MACHINE_LEARNING_UNSUPPORTED_ID_TYPE_ERROR = `Only client id is supported for user-assigned managed identity in ${ManagedIdentitySourceNames.MACHINE_LEARNING}.`;
	/**
	* Machine Learning Managed Identity Source implementation for Azure Machine Learning environments.
	*
	* This class handles managed identity authentication specifically for Azure Machine Learning services.
	* It supports both system-assigned and user-assigned managed identities, using the MSI_ENDPOINT
	* and MSI_SECRET environment variables that are automatically provided in Azure ML environments.
	*/
	var MachineLearning = class MachineLearning extends BaseManagedIdentitySource {
		/**
		* Creates a new MachineLearning managed identity source instance.
		*
		* @param logger - Logger instance for diagnostic information
		* @param nodeStorage - Node storage implementation for caching
		* @param networkClient - Network client for making HTTP requests
		* @param cryptoProvider - Cryptographic operations provider
		* @param disableInternalRetries - Whether to disable automatic request retries
		* @param msiEndpoint - The MSI endpoint URL from environment variables
		* @param secret - The MSI secret from environment variables
		*/
		constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, msiEndpoint, secret) {
			super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
			this.msiEndpoint = msiEndpoint;
			this.secret = secret;
		}
		/**
		* Retrieves the required environment variables for Azure Machine Learning managed identity.
		*
		* This method checks for the presence of MSI_ENDPOINT and MSI_SECRET environment variables
		* that are automatically set by the Azure Machine Learning platform when managed identity
		* is enabled for the compute instance or cluster.
		*
		* @returns An array containing [msiEndpoint, secret] where either value may be undefined
		*          if the corresponding environment variable is not set
		*/
		static getEnvironmentVariables() {
			return [process.env[ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT], process.env[ManagedIdentityEnvironmentVariableNames.MSI_SECRET]];
		}
		/**
		* Attempts to create a MachineLearning managed identity source.
		*
		* This method validates the Azure Machine Learning environment by checking for the required
		* MSI_ENDPOINT and MSI_SECRET environment variables. If both are present and valid,
		* it creates and returns a MachineLearning instance. If either is missing or invalid,
		* it returns null, indicating that this managed identity source is not available
		* in the current environment.
		*
		* @param logger - Logger instance for diagnostic information
		* @param nodeStorage - Node storage implementation for caching
		* @param networkClient - Network client for making HTTP requests
		* @param cryptoProvider - Cryptographic operations provider
		* @param disableInternalRetries - Whether to disable automatic request retries
		*
		* @returns A new MachineLearning instance if the environment is valid, null otherwise
		*/
		static tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
			const [msiEndpoint, secret] = MachineLearning.getEnvironmentVariables();
			if (!msiEndpoint || !secret) {
				logger.info(`[Managed Identity] ${ManagedIdentitySourceNames.MACHINE_LEARNING} managed identity is unavailable because one or both of the '${ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT}' and '${ManagedIdentityEnvironmentVariableNames.MSI_SECRET}' environment variables are not defined.`, "");
				return null;
			}
			const validatedMsiEndpoint = MachineLearning.getValidatedEnvVariableUrlString(ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT, msiEndpoint, ManagedIdentitySourceNames.MACHINE_LEARNING, logger);
			logger.info(`[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.MACHINE_LEARNING} managed identity. Endpoint URI: ${validatedMsiEndpoint}. Creating ${ManagedIdentitySourceNames.MACHINE_LEARNING} managed identity.`, "");
			return new MachineLearning(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, msiEndpoint, secret);
		}
		/**
		* Creates a managed identity token request for Azure Machine Learning environments.
		*
		* This method constructs the HTTP request parameters needed to acquire an access token
		* from the Azure Machine Learning managed identity endpoint. It handles both system-assigned
		* and user-assigned managed identities with specific logic for each type:
		*
		* - System-assigned: Uses the DEFAULT_IDENTITY_CLIENT_ID environment variable
		* - User-assigned: Only supports client ID-based identification (not object ID or resource ID)
		*
		* The request uses the 2017-09-01 API version and includes the required secret header
		* for authentication with the MSI endpoint.
		*
		* @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
		* @param managedIdentityId - The managed identity configuration specifying whether to use system-assigned or user-assigned identity
		*
		* @returns A configured ManagedIdentityRequestParameters object ready for network execution
		*
		* @throws Error if an unsupported managed identity ID type is specified (only client ID is supported for user-assigned)
		*/
		createRequest(resource, managedIdentityId) {
			const request = new ManagedIdentityRequestParameters(HttpMethod.GET, this.msiEndpoint);
			request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";
			request.headers[ManagedIdentityHeaders.ML_AND_SF_SECRET_HEADER_NAME] = this.secret;
			request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = MACHINE_LEARNING_MSI_API_VERSION;
			request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
			if (managedIdentityId.idType === ManagedIdentityIdType.SYSTEM_ASSIGNED) request.queryParameters[ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_CLIENT_ID_2017] = process.env[ManagedIdentityEnvironmentVariableNames.DEFAULT_IDENTITY_CLIENT_ID];
			else if (managedIdentityId.idType === ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID) request.queryParameters[this.getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityId.idType, false, true)] = managedIdentityId.id;
			else throw new Error(MANAGED_IDENTITY_MACHINE_LEARNING_UNSUPPORTED_ID_TYPE_ERROR);
			return request;
		}
	};
	var ManagedIdentityClient = class ManagedIdentityClient {
		constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
			this.logger = logger;
			this.nodeStorage = nodeStorage;
			this.networkClient = networkClient;
			this.cryptoProvider = cryptoProvider;
			this.disableInternalRetries = disableInternalRetries;
		}
		async sendManagedIdentityTokenRequest(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken) {
			if (!ManagedIdentityClient.identitySource) ManagedIdentityClient.identitySource = this.selectManagedIdentitySource(this.logger, this.nodeStorage, this.networkClient, this.cryptoProvider, this.disableInternalRetries, managedIdentityId);
			return ManagedIdentityClient.identitySource.acquireTokenWithManagedIdentity(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken);
		}
		allEnvironmentVariablesAreDefined(environmentVariables) {
			return Object.values(environmentVariables).every((environmentVariable) => {
				return environmentVariable !== void 0;
			});
		}
		/**
		* Determine the Managed Identity Source based on available environment variables. This API is consumed by ManagedIdentityApplication's getManagedIdentitySource.
		* @returns ManagedIdentitySourceNames - The Managed Identity source's name
		*/
		getManagedIdentitySource() {
			ManagedIdentityClient.sourceName = this.allEnvironmentVariablesAreDefined(ServiceFabric.getEnvironmentVariables()) ? ManagedIdentitySourceNames.SERVICE_FABRIC : this.allEnvironmentVariablesAreDefined(AppService.getEnvironmentVariables()) ? ManagedIdentitySourceNames.APP_SERVICE : this.allEnvironmentVariablesAreDefined(MachineLearning.getEnvironmentVariables()) ? ManagedIdentitySourceNames.MACHINE_LEARNING : this.allEnvironmentVariablesAreDefined(CloudShell.getEnvironmentVariables()) ? ManagedIdentitySourceNames.CLOUD_SHELL : this.allEnvironmentVariablesAreDefined(AzureArc.getEnvironmentVariables()) ? ManagedIdentitySourceNames.AZURE_ARC : ManagedIdentitySourceNames.DEFAULT_TO_IMDS;
			return ManagedIdentityClient.sourceName;
		}
		/**
		* Tries to create a managed identity source for all sources
		* @returns the managed identity Source
		*/
		selectManagedIdentitySource(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) {
			const source = ServiceFabric.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) || AppService.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) || MachineLearning.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) || CloudShell.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) || AzureArc.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) || Imds.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
			if (!source) throw createManagedIdentityError(unableToCreateSource, "");
			return source;
		}
	};
	var SOURCES_THAT_SUPPORT_TOKEN_REVOCATION = [ManagedIdentitySourceNames.SERVICE_FABRIC];
	/**
	* Class to initialize a managed identity and identify the service
	* @public
	*/
	var ManagedIdentityApplication = class ManagedIdentityApplication {
		constructor(configuration) {
			this.config = buildManagedIdentityConfiguration(configuration || {});
			this.logger = new Logger(this.config.system.loggerOptions, name, version);
			const fakeStatusAuthorityOptions = { canonicalAuthority: DEFAULT_AUTHORITY };
			if (!ManagedIdentityApplication.nodeStorage) ManagedIdentityApplication.nodeStorage = new NodeStorage(this.logger, this.config.managedIdentityId.id, DEFAULT_CRYPTO_IMPLEMENTATION, fakeStatusAuthorityOptions);
			this.networkClient = this.config.system.networkClient;
			this.cryptoProvider = new CryptoProvider();
			const fakeAuthorityOptions = {
				protocolMode: ProtocolMode.AAD,
				knownAuthorities: [DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY],
				cloudDiscoveryMetadata: "",
				authorityMetadata: ""
			};
			this.fakeAuthority = new Authority(DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY, this.networkClient, ManagedIdentityApplication.nodeStorage, fakeAuthorityOptions, this.logger, this.cryptoProvider.createNewGuid(), new StubPerformanceClient(), true);
			this.fakeClientCredentialClient = new ClientCredentialClient({ authOptions: {
				clientId: this.config.managedIdentityId.id,
				authority: this.fakeAuthority
			} });
			this.managedIdentityClient = new ManagedIdentityClient(this.logger, ManagedIdentityApplication.nodeStorage, this.networkClient, this.cryptoProvider, this.config.disableInternalRetries);
			this.hashUtils = new HashUtils();
		}
		/**
		* Acquire an access token from the cache or the managed identity
		* @param managedIdentityRequest - the ManagedIdentityRequestParams object passed in by the developer
		* @returns the access token
		*/
		async acquireToken(managedIdentityRequestParams) {
			if (!managedIdentityRequestParams.resource) throw createClientConfigurationError(urlEmptyError, "");
			const managedIdentityRequest = {
				forceRefresh: managedIdentityRequestParams.forceRefresh,
				resource: managedIdentityRequestParams.resource.replace("/.default", ""),
				scopes: [managedIdentityRequestParams.resource.replace("/.default", "")],
				authority: this.fakeAuthority.canonicalAuthority,
				correlationId: this.cryptoProvider.createNewGuid(),
				claims: managedIdentityRequestParams.claims,
				clientCapabilities: this.config.clientCapabilities
			};
			if (managedIdentityRequest.forceRefresh) return this.acquireTokenFromManagedIdentity(managedIdentityRequest, this.config.managedIdentityId, this.fakeAuthority);
			const [cachedAuthenticationResult, lastCacheOutcome] = await this.fakeClientCredentialClient.getCachedAuthenticationResult(managedIdentityRequest, this.config, this.cryptoProvider, this.fakeAuthority, ManagedIdentityApplication.nodeStorage);
			if (managedIdentityRequest.claims) {
				const sourceName = this.managedIdentityClient.getManagedIdentitySource();
				if (cachedAuthenticationResult && SOURCES_THAT_SUPPORT_TOKEN_REVOCATION.includes(sourceName)) managedIdentityRequest.revokedTokenSha256Hash = this.hashUtils.sha256(cachedAuthenticationResult.accessToken).toString(EncodingTypes.HEX);
				return this.acquireTokenFromManagedIdentity(managedIdentityRequest, this.config.managedIdentityId, this.fakeAuthority);
			}
			if (cachedAuthenticationResult) {
				if (lastCacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
					this.logger.info("ClientCredentialClient:getCachedAuthenticationResult - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.", managedIdentityRequest.correlationId);
					await this.acquireTokenFromManagedIdentity(managedIdentityRequest, this.config.managedIdentityId, this.fakeAuthority, true);
				}
				return cachedAuthenticationResult;
			} else return this.acquireTokenFromManagedIdentity(managedIdentityRequest, this.config.managedIdentityId, this.fakeAuthority);
		}
		/**
		* Acquires a token from a managed identity endpoint.
		*
		* @param managedIdentityRequest - The request object containing parameters for the managed identity token request.
		* @param managedIdentityId - The identifier for the managed identity (e.g., client ID or resource ID).
		* @param fakeAuthority - A placeholder authority used for the token request.
		* @param refreshAccessToken - Optional flag indicating whether to force a refresh of the access token.
		* @returns A promise that resolves to an AuthenticationResult containing the acquired token and related information.
		*/
		async acquireTokenFromManagedIdentity(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken) {
			return this.managedIdentityClient.sendManagedIdentityTokenRequest(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken);
		}
		/**
		* Determine the Managed Identity Source based on available environment variables. This API is consumed by Azure Identity SDK.
		* @returns ManagedIdentitySourceNames - The Managed Identity source's name
		*/
		getManagedIdentitySource() {
			return ManagedIdentityClient.sourceName || this.managedIdentityClient.getManagedIdentitySource();
		}
	};
	/**
	* Cache plugin that serializes data to the cache and deserializes data from the cache
	* @public
	*/
	var DistributedCachePlugin = class {
		constructor(client, partitionManager) {
			this.client = client;
			this.partitionManager = partitionManager;
		}
		/**
		* Deserializes the cache before accessing it
		* @param cacheContext - TokenCacheContext
		*/
		async beforeCacheAccess(cacheContext) {
			const partitionKey = await this.partitionManager.getKey();
			const cacheData = await this.client.get(partitionKey);
			cacheContext.tokenCache.deserialize(cacheData);
		}
		/**
		* Serializes the cache after accessing it
		* @param cacheContext - TokenCacheContext
		*/
		async afterCacheAccess(cacheContext) {
			if (cacheContext.cacheHasChanged) {
				const kvStore = cacheContext.tokenCache.getKVStore();
				const accountEntities = Object.values(kvStore).filter((value) => isAccountEntity(value));
				let partitionKey;
				if (accountEntities.length > 0) {
					const accountEntity = accountEntities[0];
					partitionKey = await this.partitionManager.extractKey(accountEntity);
				} else partitionKey = await this.partitionManager.getKey();
				await this.client.set(partitionKey, cacheContext.tokenCache.serialize());
			}
		}
	};
	/**
	* @packageDocumentation
	* @module @azure/msal-node
	*/
	/**
	* Warning: This set of exports is purely intended to be used by other MSAL libraries, and should be considered potentially unstable. We strongly discourage using them directly, you do so at your own risk.
	* Breaking changes to these APIs will be shipped under a minor version, instead of a major version.
	*/
	var PromptValue = PromptValue$1;
	var ResponseMode = ResponseMode$1;
	exports.AuthError = AuthError;
	exports.AuthErrorCodes = AuthErrorCodes;
	exports.AzureCloudInstance = AzureCloudInstance;
	exports.ClientAssertion = ClientAssertion;
	exports.ClientAuthError = ClientAuthError;
	exports.ClientAuthErrorCodes = ClientAuthErrorCodes;
	exports.ClientConfigurationError = ClientConfigurationError;
	exports.ClientConfigurationErrorCodes = ClientConfigurationErrorCodes;
	exports.ConfidentialClientApplication = ConfidentialClientApplication;
	exports.CryptoProvider = CryptoProvider;
	exports.DistributedCachePlugin = DistributedCachePlugin;
	exports.InteractionRequiredAuthError = InteractionRequiredAuthError;
	exports.InteractionRequiredAuthErrorCodes = InteractionRequiredAuthErrorCodes;
	exports.Logger = Logger;
	exports.ManagedIdentityApplication = ManagedIdentityApplication;
	exports.ManagedIdentitySourceNames = ManagedIdentitySourceNames;
	exports.PromptValue = PromptValue;
	exports.ProtocolMode = ProtocolMode;
	exports.PublicClientApplication = PublicClientApplication;
	exports.ResponseMode = ResponseMode;
	exports.ServerError = ServerError;
	exports.TokenCache = TokenCache;
	exports.TokenCacheContext = TokenCacheContext;
	exports.internals = internals;
	exports.version = version;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/msal/msal.js
var require_msal = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.msalCommon = void 0;
	exports.msalCommon = __require("tslib").__importStar(require_msal_node());
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/msal/utils.js
var require_utils$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.defaultLoggerCallback = void 0;
	exports.ensureValidMsalToken = ensureValidMsalToken;
	exports.getAuthorityHost = getAuthorityHost;
	exports.getAuthority = getAuthority;
	exports.getKnownAuthorities = getKnownAuthorities;
	exports.getMSALLogLevel = getMSALLogLevel;
	exports.randomUUID = randomUUID;
	exports.handleMsalError = handleMsalError;
	exports.publicToMsal = publicToMsal;
	exports.msalToPublic = msalToPublic;
	exports.serializeAuthenticationRecord = serializeAuthenticationRecord;
	exports.deserializeAuthenticationRecord = deserializeAuthenticationRecord;
	var errors_js_1 = require_errors();
	var logging_js_1 = require_logging();
	var constants_js_1 = require_constants$1();
	var core_util_1 = require_commonjs$5();
	var abort_controller_1 = require_commonjs$6();
	var msal_js_1 = require_msal();
	var logger = (0, logging_js_1.credentialLogger)("IdentityUtils");
	/**
	* Latest AuthenticationRecord version
	*/
	var LatestAuthenticationRecordVersion = "1.0";
	/**
	* Ensures the validity of the MSAL token
	* @internal
	*/
	function ensureValidMsalToken(scopes, msalToken, getTokenOptions) {
		const error = (message) => {
			logger.getToken.info(message);
			return new errors_js_1.AuthenticationRequiredError({
				scopes: Array.isArray(scopes) ? scopes : [scopes],
				getTokenOptions,
				message
			});
		};
		if (!msalToken) throw error("No response");
		if (!msalToken.expiresOn) throw error(`Response had no "expiresOn" property.`);
		if (!msalToken.accessToken) throw error(`Response had no "accessToken" property.`);
	}
	/**
	* Returns the authority host from either the options bag or the AZURE_AUTHORITY_HOST environment variable.
	*
	* Defaults to {@link DefaultAuthorityHost}.
	* @internal
	*/
	function getAuthorityHost(options) {
		let authorityHost = options?.authorityHost;
		if (!authorityHost && core_util_1.isNodeLike) authorityHost = process.env.AZURE_AUTHORITY_HOST;
		return authorityHost ?? constants_js_1.DefaultAuthorityHost;
	}
	/**
	* Generates a valid authority by combining a host with a tenantId.
	* @internal
	*/
	function getAuthority(tenantId, host) {
		if (!host) host = constants_js_1.DefaultAuthorityHost;
		if (new RegExp(`${tenantId}/?$`).test(host)) return host;
		if (host.endsWith("/")) return host + tenantId;
		else return `${host}/${tenantId}`;
	}
	/**
	* Generates the known authorities.
	* If the Tenant Id is `adfs`, the authority can't be validated since the format won't match the expected one.
	* For that reason, we have to force MSAL to disable validating the authority
	* by sending it within the known authorities in the MSAL configuration.
	* @internal
	*/
	function getKnownAuthorities(tenantId, authorityHost, disableInstanceDiscovery) {
		if (tenantId === "adfs" && authorityHost || disableInstanceDiscovery) return [authorityHost];
		return [];
	}
	/**
	* Generates a logger that can be passed to the MSAL clients.
	* @param credLogger - The logger of the credential.
	* @internal
	*/
	var defaultLoggerCallback = (credLogger, platform = core_util_1.isNode ? "Node" : "Browser") => (level, message, containsPii) => {
		if (containsPii) return;
		switch (level) {
			case msal_js_1.msalCommon.LogLevel.Error:
				credLogger.info(`MSAL ${platform} V2 error: ${message}`);
				return;
			case msal_js_1.msalCommon.LogLevel.Info:
				credLogger.info(`MSAL ${platform} V2 info message: ${message}`);
				return;
			case msal_js_1.msalCommon.LogLevel.Verbose:
				credLogger.info(`MSAL ${platform} V2 verbose message: ${message}`);
				return;
			case msal_js_1.msalCommon.LogLevel.Warning:
				credLogger.info(`MSAL ${platform} V2 warning: ${message}`);
				return;
		}
	};
	exports.defaultLoggerCallback = defaultLoggerCallback;
	/**
	* @internal
	*/
	function getMSALLogLevel(logLevel) {
		switch (logLevel) {
			case "error": return msal_js_1.msalCommon.LogLevel.Error;
			case "info": return msal_js_1.msalCommon.LogLevel.Info;
			case "verbose": return msal_js_1.msalCommon.LogLevel.Verbose;
			case "warning": return msal_js_1.msalCommon.LogLevel.Warning;
			default: return msal_js_1.msalCommon.LogLevel.Info;
		}
	}
	/**
	* Wraps core-util's randomUUID in order to allow for mocking in tests.
	* This prepares the library for the upcoming core-util update to ESM.
	*
	* @internal
	* @returns A string containing a random UUID
	*/
	function randomUUID() {
		return (0, core_util_1.randomUUID)();
	}
	/**
	* Handles MSAL errors.
	*/
	function handleMsalError(scopes, error, getTokenOptions) {
		if (error.name === "AuthError" || error.name === "ClientAuthError" || error.name === "BrowserAuthError") {
			const msalError = error;
			switch (msalError.errorCode) {
				case "endpoints_resolution_error":
					logger.info((0, logging_js_1.formatError)(scopes, error.message));
					return new errors_js_1.CredentialUnavailableError(error.message);
				case "device_code_polling_cancelled": return new abort_controller_1.AbortError("The authentication has been aborted by the caller.");
				case "consent_required":
				case "interaction_required":
				case "login_required":
					logger.info((0, logging_js_1.formatError)(scopes, `Authentication returned errorCode ${msalError.errorCode}`));
					break;
				default: logger.info((0, logging_js_1.formatError)(scopes, `Failed to acquire token: ${error.message}`));
			}
		}
		if (error.name === "ClientConfigurationError" || error.name === "BrowserConfigurationAuthError" || error.name === "AbortError" || error.name === "AuthenticationError") return error;
		if (error.name === "NativeAuthError") {
			logger.info((0, logging_js_1.formatError)(scopes, `Error from the native broker: ${error.message} with status code: ${error.statusCode}`));
			return error;
		}
		return new errors_js_1.AuthenticationRequiredError({
			scopes,
			getTokenOptions,
			message: error.message
		});
	}
	function publicToMsal(account) {
		return {
			localAccountId: account.homeAccountId,
			environment: account.authority,
			username: account.username,
			homeAccountId: account.homeAccountId,
			tenantId: account.tenantId
		};
	}
	function msalToPublic(clientId, account) {
		return {
			authority: account.environment ?? constants_js_1.DefaultAuthority,
			homeAccountId: account.homeAccountId,
			tenantId: account.tenantId || constants_js_1.DefaultTenantId,
			username: account.username,
			clientId,
			version: LatestAuthenticationRecordVersion
		};
	}
	/**
	* Serializes an `AuthenticationRecord` into a string.
	*
	* The output of a serialized authentication record will contain the following properties:
	*
	* - "authority"
	* - "homeAccountId"
	* - "clientId"
	* - "tenantId"
	* - "username"
	* - "version"
	*
	* To later convert this string to a serialized `AuthenticationRecord`, please use the exported function `deserializeAuthenticationRecord()`.
	*/
	function serializeAuthenticationRecord(record) {
		return JSON.stringify(record);
	}
	/**
	* Deserializes a previously serialized authentication record from a string into an object.
	*
	* The input string must contain the following properties:
	*
	* - "authority"
	* - "homeAccountId"
	* - "clientId"
	* - "tenantId"
	* - "username"
	* - "version"
	*
	* If the version we receive is unsupported, an error will be thrown.
	*
	* At the moment, the only available version is: "1.0", which is always set when the authentication record is serialized.
	*
	* @param serializedRecord - Authentication record previously serialized into string.
	* @returns AuthenticationRecord.
	*/
	function deserializeAuthenticationRecord(serializedRecord) {
		const parsed = JSON.parse(serializedRecord);
		if (parsed.version && parsed.version !== LatestAuthenticationRecordVersion) throw Error("Unsupported AuthenticationRecord version");
		return parsed;
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/util/identityTokenEndpoint.js
var require_identityTokenEndpoint = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getIdentityTokenEndpointSuffix = getIdentityTokenEndpointSuffix;
	function getIdentityTokenEndpointSuffix(tenantId) {
		if (tenantId === "adfs") return "oauth2/token";
		else return "oauth2/v2.0/token";
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/managedIdentityCredential/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.serviceFabricErrorMessage = void 0;
	exports.mapScopesToResource = mapScopesToResource;
	exports.parseExpirationTimestamp = parseExpirationTimestamp;
	exports.parseRefreshTimestamp = parseRefreshTimestamp;
	var DefaultScopeSuffix = "/.default";
	/**
	* Error message for Service Fabric Managed Identity environment.
	*/
	exports.serviceFabricErrorMessage = "Specifying a `clientId` or `resourceId` is not supported by the Service Fabric managed identity environment. The managed identity configuration is determined by the Service Fabric cluster resource configuration. See https://aka.ms/servicefabricmi for more information";
	/**
	* Most MSIs send requests to the IMDS endpoint, or a similar endpoint.
	* These are GET requests that require sending a `resource` parameter on the query.
	* This resource can be derived from the scopes received through the getToken call, as long as only one scope is received.
	* Multiple scopes assume that the resulting token will have access to multiple resources, which won't be the case.
	*
	* For that reason, when we encounter multiple scopes, we return undefined.
	* It's up to the individual MSI implementations to throw the errors (which helps us provide less generic errors).
	*/
	function mapScopesToResource(scopes) {
		let scope = "";
		if (Array.isArray(scopes)) {
			if (scopes.length !== 1) return;
			scope = scopes[0];
		} else if (typeof scopes === "string") scope = scopes;
		if (!scope.endsWith(DefaultScopeSuffix)) return scope;
		return scope.substr(0, scope.lastIndexOf(DefaultScopeSuffix));
	}
	/**
	* Given a token response, return the expiration timestamp as the number of milliseconds from the Unix epoch.
	* @param body - A parsed response body from the authentication endpoint.
	*/
	function parseExpirationTimestamp(body) {
		if (typeof body.expires_on === "number") return body.expires_on * 1e3;
		if (typeof body.expires_on === "string") {
			const asNumber = +body.expires_on;
			if (!isNaN(asNumber)) return asNumber * 1e3;
			const asDate = Date.parse(body.expires_on);
			if (!isNaN(asDate)) return asDate;
		}
		if (typeof body.expires_in === "number") return Date.now() + body.expires_in * 1e3;
		throw new Error(`Failed to parse token expiration from body. expires_in="${body.expires_in}", expires_on="${body.expires_on}"`);
	}
	/**
	* Given a token response, return the expiration timestamp as the number of milliseconds from the Unix epoch.
	* @param body - A parsed response body from the authentication endpoint.
	*/
	function parseRefreshTimestamp(body) {
		if (body.refresh_on) {
			if (typeof body.refresh_on === "number") return body.refresh_on * 1e3;
			if (typeof body.refresh_on === "string") {
				const asNumber = +body.refresh_on;
				if (!isNaN(asNumber)) return asNumber * 1e3;
				const asDate = Date.parse(body.refresh_on);
				if (!isNaN(asDate)) return asDate;
			}
			throw new Error(`Failed to parse refresh_on from body. refresh_on="${body.refresh_on}"`);
		} else return;
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/client/identityClient.js
var require_identityClient = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.IdentityClient = void 0;
	exports.getIdentityClientAuthorityHost = getIdentityClientAuthorityHost;
	var core_client_1 = require_commonjs$3();
	var core_util_1 = require_commonjs$5();
	var core_rest_pipeline_1 = require_commonjs$4();
	var errors_js_1 = require_errors();
	var identityTokenEndpoint_js_1 = require_identityTokenEndpoint();
	var constants_js_1 = require_constants$1();
	var tracing_js_1 = require_tracing();
	var logging_js_1 = require_logging();
	var utils_js_1 = require_utils();
	var noCorrelationId = "noCorrelationId";
	/**
	* @internal
	*/
	function getIdentityClientAuthorityHost(options) {
		let authorityHost = options?.authorityHost;
		if (core_util_1.isNode) authorityHost = authorityHost ?? process.env.AZURE_AUTHORITY_HOST;
		return authorityHost ?? constants_js_1.DefaultAuthorityHost;
	}
	/**
	* The network module used by the Identity credentials.
	*
	* It allows for credentials to abort any pending request independently of the MSAL flow,
	* by calling to the `abortRequests()` method.
	*
	*/
	var IdentityClient = class extends core_client_1.ServiceClient {
		authorityHost;
		allowLoggingAccountIdentifiers;
		abortControllers;
		allowInsecureConnection = false;
		tokenCredentialOptions;
		constructor(options) {
			const packageDetails = `azsdk-js-identity/${constants_js_1.SDK_VERSION}`;
			const userAgentPrefix = options?.userAgentOptions?.userAgentPrefix ? `${options.userAgentOptions.userAgentPrefix} ${packageDetails}` : `${packageDetails}`;
			const baseUri = getIdentityClientAuthorityHost(options);
			if (!baseUri.startsWith("https:")) throw new Error("The authorityHost address must use the 'https' protocol.");
			super({
				requestContentType: "application/json; charset=utf-8",
				retryOptions: { maxRetries: 3 },
				...options,
				userAgentOptions: { userAgentPrefix },
				baseUri
			});
			this.authorityHost = baseUri;
			this.abortControllers = /* @__PURE__ */ new Map();
			this.allowLoggingAccountIdentifiers = options?.loggingOptions?.allowLoggingAccountIdentifiers;
			this.tokenCredentialOptions = { ...options };
			if (options?.allowInsecureConnection) this.allowInsecureConnection = options.allowInsecureConnection;
		}
		async sendTokenRequest(request) {
			logging_js_1.logger.info(`IdentityClient: sending token request to [${request.url}]`);
			const response = await this.sendRequest(request);
			if (response.bodyAsText && (response.status === 200 || response.status === 201)) {
				const parsedBody = JSON.parse(response.bodyAsText);
				if (!parsedBody.access_token) return null;
				this.logIdentifiers(response);
				const token = {
					accessToken: {
						token: parsedBody.access_token,
						expiresOnTimestamp: (0, utils_js_1.parseExpirationTimestamp)(parsedBody),
						refreshAfterTimestamp: (0, utils_js_1.parseRefreshTimestamp)(parsedBody),
						tokenType: "Bearer"
					},
					refreshToken: parsedBody.refresh_token
				};
				logging_js_1.logger.info(`IdentityClient: [${request.url}] token acquired, expires on ${token.accessToken.expiresOnTimestamp}`);
				return token;
			} else {
				const error = new errors_js_1.AuthenticationError(response.status, response.bodyAsText);
				logging_js_1.logger.warning(`IdentityClient: authentication error. HTTP status: ${response.status}, ${error.errorResponse.errorDescription}`);
				throw error;
			}
		}
		async refreshAccessToken(tenantId, clientId, scopes, refreshToken, clientSecret, options = {}) {
			if (refreshToken === void 0) return null;
			logging_js_1.logger.info(`IdentityClient: refreshing access token with client ID: ${clientId}, scopes: ${scopes} started`);
			const refreshParams = {
				grant_type: "refresh_token",
				client_id: clientId,
				refresh_token: refreshToken,
				scope: scopes
			};
			if (clientSecret !== void 0) refreshParams.client_secret = clientSecret;
			const query = new URLSearchParams(refreshParams);
			return tracing_js_1.tracingClient.withSpan("IdentityClient.refreshAccessToken", options, async (updatedOptions) => {
				try {
					const urlSuffix = (0, identityTokenEndpoint_js_1.getIdentityTokenEndpointSuffix)(tenantId);
					const request = (0, core_rest_pipeline_1.createPipelineRequest)({
						url: `${this.authorityHost}/${tenantId}/${urlSuffix}`,
						method: "POST",
						body: query.toString(),
						abortSignal: options.abortSignal,
						headers: (0, core_rest_pipeline_1.createHttpHeaders)({
							Accept: "application/json",
							"Content-Type": "application/x-www-form-urlencoded"
						}),
						tracingOptions: updatedOptions.tracingOptions
					});
					const response = await this.sendTokenRequest(request);
					logging_js_1.logger.info(`IdentityClient: refreshed token for client ID: ${clientId}`);
					return response;
				} catch (err) {
					if (err.name === errors_js_1.AuthenticationErrorName && err.errorResponse.error === "interaction_required") {
						logging_js_1.logger.info(`IdentityClient: interaction required for client ID: ${clientId}`);
						return null;
					} else {
						logging_js_1.logger.warning(`IdentityClient: failed refreshing token for client ID: ${clientId}: ${err}`);
						throw err;
					}
				}
			});
		}
		generateAbortSignal(correlationId) {
			const controller = new AbortController();
			const controllers = this.abortControllers.get(correlationId) || [];
			controllers.push(controller);
			this.abortControllers.set(correlationId, controllers);
			const existingOnAbort = controller.signal.onabort;
			controller.signal.onabort = (...params) => {
				this.abortControllers.set(correlationId, void 0);
				if (existingOnAbort) existingOnAbort.apply(controller.signal, params);
			};
			return controller.signal;
		}
		abortRequests(correlationId) {
			const key = correlationId || noCorrelationId;
			const controllers = [...this.abortControllers.get(key) || [], ...this.abortControllers.get(noCorrelationId) || []];
			if (!controllers.length) return;
			for (const controller of controllers) controller.abort();
			this.abortControllers.set(key, void 0);
		}
		getCorrelationId(options) {
			const parameter = options?.body?.split("&").map((part) => part.split("=")).find(([key]) => key === "client-request-id");
			return parameter && parameter.length ? parameter[1] || noCorrelationId : noCorrelationId;
		}
		async sendGetRequestAsync(url, options) {
			const request = (0, core_rest_pipeline_1.createPipelineRequest)({
				url,
				method: "GET",
				body: options?.body,
				allowInsecureConnection: this.allowInsecureConnection,
				headers: (0, core_rest_pipeline_1.createHttpHeaders)(options?.headers),
				abortSignal: this.generateAbortSignal(noCorrelationId)
			});
			const response = await this.sendRequest(request);
			this.logIdentifiers(response);
			return {
				body: response.bodyAsText ? JSON.parse(response.bodyAsText) : void 0,
				headers: response.headers.toJSON(),
				status: response.status
			};
		}
		async sendPostRequestAsync(url, options) {
			const request = (0, core_rest_pipeline_1.createPipelineRequest)({
				url,
				method: "POST",
				body: options?.body,
				headers: (0, core_rest_pipeline_1.createHttpHeaders)(options?.headers),
				allowInsecureConnection: this.allowInsecureConnection,
				abortSignal: this.generateAbortSignal(this.getCorrelationId(options))
			});
			const response = await this.sendRequest(request);
			this.logIdentifiers(response);
			return {
				body: response.bodyAsText ? JSON.parse(response.bodyAsText) : void 0,
				headers: response.headers.toJSON(),
				status: response.status
			};
		}
		/**
		*
		* @internal
		*/
		getTokenCredentialOptions() {
			return this.tokenCredentialOptions;
		}
		/**
		* If allowLoggingAccountIdentifiers was set on the constructor options
		* we try to log the account identifiers by parsing the received access token.
		*
		* The account identifiers we try to log are:
		* - `appid`: The application or Client Identifier.
		* - `upn`: User Principal Name.
		*   - It might not be available in some authentication scenarios.
		*   - If it's not available, we put a placeholder: "No User Principal Name available".
		* - `tid`: Tenant Identifier.
		* - `oid`: Object Identifier of the authenticated user.
		*/
		logIdentifiers(response) {
			if (!this.allowLoggingAccountIdentifiers || !response.bodyAsText) return;
			const unavailableUpn = "No User Principal Name available";
			try {
				const accessToken = (response.parsedBody || JSON.parse(response.bodyAsText)).access_token;
				if (!accessToken) return;
				const base64Metadata = accessToken.split(".")[1];
				const { appid, upn, tid, oid } = JSON.parse(Buffer.from(base64Metadata, "base64").toString("utf8"));
				logging_js_1.logger.info(`[Authenticated account] Client ID: ${appid}. Tenant ID: ${tid}. User Principal Name: ${upn || unavailableUpn}. Object ID (user): ${oid}`);
			} catch (e) {
				logging_js_1.logger.warning("allowLoggingAccountIdentifiers was set, but we couldn't log the account information. Error:", e.message);
			}
		}
	};
	exports.IdentityClient = IdentityClient;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/regionalAuthority.js
var require_regionalAuthority = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.RegionalAuthority = void 0;
	exports.calculateRegionalAuthority = calculateRegionalAuthority;
	/**
	* Helps specify a regional authority, or "AutoDiscoverRegion" to auto-detect the region.
	*/
	var RegionalAuthority;
	(function(RegionalAuthority) {
		/** Instructs MSAL to attempt to discover the region */
		RegionalAuthority["AutoDiscoverRegion"] = "AutoDiscoverRegion";
		/** Uses the {@link RegionalAuthority} for the Azure 'westus' region. */
		RegionalAuthority["USWest"] = "westus";
		/** Uses the {@link RegionalAuthority} for the Azure 'westus2' region. */
		RegionalAuthority["USWest2"] = "westus2";
		/** Uses the {@link RegionalAuthority} for the Azure 'centralus' region. */
		RegionalAuthority["USCentral"] = "centralus";
		/** Uses the {@link RegionalAuthority} for the Azure 'eastus' region. */
		RegionalAuthority["USEast"] = "eastus";
		/** Uses the {@link RegionalAuthority} for the Azure 'eastus2' region. */
		RegionalAuthority["USEast2"] = "eastus2";
		/** Uses the {@link RegionalAuthority} for the Azure 'northcentralus' region. */
		RegionalAuthority["USNorthCentral"] = "northcentralus";
		/** Uses the {@link RegionalAuthority} for the Azure 'southcentralus' region. */
		RegionalAuthority["USSouthCentral"] = "southcentralus";
		/** Uses the {@link RegionalAuthority} for the Azure 'westcentralus' region. */
		RegionalAuthority["USWestCentral"] = "westcentralus";
		/** Uses the {@link RegionalAuthority} for the Azure 'canadacentral' region. */
		RegionalAuthority["CanadaCentral"] = "canadacentral";
		/** Uses the {@link RegionalAuthority} for the Azure 'canadaeast' region. */
		RegionalAuthority["CanadaEast"] = "canadaeast";
		/** Uses the {@link RegionalAuthority} for the Azure 'brazilsouth' region. */
		RegionalAuthority["BrazilSouth"] = "brazilsouth";
		/** Uses the {@link RegionalAuthority} for the Azure 'northeurope' region. */
		RegionalAuthority["EuropeNorth"] = "northeurope";
		/** Uses the {@link RegionalAuthority} for the Azure 'westeurope' region. */
		RegionalAuthority["EuropeWest"] = "westeurope";
		/** Uses the {@link RegionalAuthority} for the Azure 'uksouth' region. */
		RegionalAuthority["UKSouth"] = "uksouth";
		/** Uses the {@link RegionalAuthority} for the Azure 'ukwest' region. */
		RegionalAuthority["UKWest"] = "ukwest";
		/** Uses the {@link RegionalAuthority} for the Azure 'francecentral' region. */
		RegionalAuthority["FranceCentral"] = "francecentral";
		/** Uses the {@link RegionalAuthority} for the Azure 'francesouth' region. */
		RegionalAuthority["FranceSouth"] = "francesouth";
		/** Uses the {@link RegionalAuthority} for the Azure 'switzerlandnorth' region. */
		RegionalAuthority["SwitzerlandNorth"] = "switzerlandnorth";
		/** Uses the {@link RegionalAuthority} for the Azure 'switzerlandwest' region. */
		RegionalAuthority["SwitzerlandWest"] = "switzerlandwest";
		/** Uses the {@link RegionalAuthority} for the Azure 'germanynorth' region. */
		RegionalAuthority["GermanyNorth"] = "germanynorth";
		/** Uses the {@link RegionalAuthority} for the Azure 'germanywestcentral' region. */
		RegionalAuthority["GermanyWestCentral"] = "germanywestcentral";
		/** Uses the {@link RegionalAuthority} for the Azure 'norwaywest' region. */
		RegionalAuthority["NorwayWest"] = "norwaywest";
		/** Uses the {@link RegionalAuthority} for the Azure 'norwayeast' region. */
		RegionalAuthority["NorwayEast"] = "norwayeast";
		/** Uses the {@link RegionalAuthority} for the Azure 'eastasia' region. */
		RegionalAuthority["AsiaEast"] = "eastasia";
		/** Uses the {@link RegionalAuthority} for the Azure 'southeastasia' region. */
		RegionalAuthority["AsiaSouthEast"] = "southeastasia";
		/** Uses the {@link RegionalAuthority} for the Azure 'japaneast' region. */
		RegionalAuthority["JapanEast"] = "japaneast";
		/** Uses the {@link RegionalAuthority} for the Azure 'japanwest' region. */
		RegionalAuthority["JapanWest"] = "japanwest";
		/** Uses the {@link RegionalAuthority} for the Azure 'australiaeast' region. */
		RegionalAuthority["AustraliaEast"] = "australiaeast";
		/** Uses the {@link RegionalAuthority} for the Azure 'australiasoutheast' region. */
		RegionalAuthority["AustraliaSouthEast"] = "australiasoutheast";
		/** Uses the {@link RegionalAuthority} for the Azure 'australiacentral' region. */
		RegionalAuthority["AustraliaCentral"] = "australiacentral";
		/** Uses the {@link RegionalAuthority} for the Azure 'australiacentral2' region. */
		RegionalAuthority["AustraliaCentral2"] = "australiacentral2";
		/** Uses the {@link RegionalAuthority} for the Azure 'centralindia' region. */
		RegionalAuthority["IndiaCentral"] = "centralindia";
		/** Uses the {@link RegionalAuthority} for the Azure 'southindia' region. */
		RegionalAuthority["IndiaSouth"] = "southindia";
		/** Uses the {@link RegionalAuthority} for the Azure 'westindia' region. */
		RegionalAuthority["IndiaWest"] = "westindia";
		/** Uses the {@link RegionalAuthority} for the Azure 'koreasouth' region. */
		RegionalAuthority["KoreaSouth"] = "koreasouth";
		/** Uses the {@link RegionalAuthority} for the Azure 'koreacentral' region. */
		RegionalAuthority["KoreaCentral"] = "koreacentral";
		/** Uses the {@link RegionalAuthority} for the Azure 'uaecentral' region. */
		RegionalAuthority["UAECentral"] = "uaecentral";
		/** Uses the {@link RegionalAuthority} for the Azure 'uaenorth' region. */
		RegionalAuthority["UAENorth"] = "uaenorth";
		/** Uses the {@link RegionalAuthority} for the Azure 'southafricanorth' region. */
		RegionalAuthority["SouthAfricaNorth"] = "southafricanorth";
		/** Uses the {@link RegionalAuthority} for the Azure 'southafricawest' region. */
		RegionalAuthority["SouthAfricaWest"] = "southafricawest";
		/** Uses the {@link RegionalAuthority} for the Azure 'chinanorth' region. */
		RegionalAuthority["ChinaNorth"] = "chinanorth";
		/** Uses the {@link RegionalAuthority} for the Azure 'chinaeast' region. */
		RegionalAuthority["ChinaEast"] = "chinaeast";
		/** Uses the {@link RegionalAuthority} for the Azure 'chinanorth2' region. */
		RegionalAuthority["ChinaNorth2"] = "chinanorth2";
		/** Uses the {@link RegionalAuthority} for the Azure 'chinaeast2' region. */
		RegionalAuthority["ChinaEast2"] = "chinaeast2";
		/** Uses the {@link RegionalAuthority} for the Azure 'germanycentral' region. */
		RegionalAuthority["GermanyCentral"] = "germanycentral";
		/** Uses the {@link RegionalAuthority} for the Azure 'germanynortheast' region. */
		RegionalAuthority["GermanyNorthEast"] = "germanynortheast";
		/** Uses the {@link RegionalAuthority} for the Azure 'usgovvirginia' region. */
		RegionalAuthority["GovernmentUSVirginia"] = "usgovvirginia";
		/** Uses the {@link RegionalAuthority} for the Azure 'usgoviowa' region. */
		RegionalAuthority["GovernmentUSIowa"] = "usgoviowa";
		/** Uses the {@link RegionalAuthority} for the Azure 'usgovarizona' region. */
		RegionalAuthority["GovernmentUSArizona"] = "usgovarizona";
		/** Uses the {@link RegionalAuthority} for the Azure 'usgovtexas' region. */
		RegionalAuthority["GovernmentUSTexas"] = "usgovtexas";
		/** Uses the {@link RegionalAuthority} for the Azure 'usdodeast' region. */
		RegionalAuthority["GovernmentUSDodEast"] = "usdodeast";
		/** Uses the {@link RegionalAuthority} for the Azure 'usdodcentral' region. */
		RegionalAuthority["GovernmentUSDodCentral"] = "usdodcentral";
	})(RegionalAuthority || (exports.RegionalAuthority = RegionalAuthority = {}));
	/**
	* Calculates the correct regional authority based on the supplied value
	* and the AZURE_REGIONAL_AUTHORITY_NAME environment variable.
	*
	* Values will be returned verbatim, except for {@link RegionalAuthority.AutoDiscoverRegion}
	* which is mapped to a value MSAL can understand.
	*
	* @internal
	*/
	function calculateRegionalAuthority(regionalAuthority) {
		let azureRegion = regionalAuthority;
		if (azureRegion === void 0 && globalThis.process?.env?.AZURE_REGIONAL_AUTHORITY_NAME !== void 0) azureRegion = process.env.AZURE_REGIONAL_AUTHORITY_NAME;
		if (azureRegion === RegionalAuthority.AutoDiscoverRegion) return "AUTO_DISCOVER";
		return azureRegion;
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/util/processMultiTenantRequest.js
var require_processMultiTenantRequest = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.processMultiTenantRequest = processMultiTenantRequest;
	var errors_js_1 = require_errors();
	function createConfigurationErrorMessage(tenantId) {
		return `The current credential is not configured to acquire tokens for tenant ${tenantId}. To enable acquiring tokens for this tenant add it to the AdditionallyAllowedTenants on the credential options, or add "*" to AdditionallyAllowedTenants to allow acquiring tokens for any tenant.`;
	}
	/**
	* Of getToken contains a tenantId, this functions allows picking this tenantId as the appropriate for authentication,
	* unless multitenant authentication has been disabled through the AZURE_IDENTITY_DISABLE_MULTITENANTAUTH (on Node.js),
	* or unless the original tenant Id is `adfs`.
	* @internal
	*/
	function processMultiTenantRequest(tenantId, getTokenOptions, additionallyAllowedTenantIds = [], logger) {
		let resolvedTenantId;
		if (process.env.AZURE_IDENTITY_DISABLE_MULTITENANTAUTH) resolvedTenantId = tenantId;
		else if (tenantId === "adfs") resolvedTenantId = tenantId;
		else resolvedTenantId = getTokenOptions?.tenantId ?? tenantId;
		if (tenantId && resolvedTenantId !== tenantId && !additionallyAllowedTenantIds.includes("*") && !additionallyAllowedTenantIds.some((t) => t.localeCompare(resolvedTenantId) === 0)) {
			const message = createConfigurationErrorMessage(resolvedTenantId);
			logger?.info(message);
			throw new errors_js_1.CredentialUnavailableError(message);
		}
		return resolvedTenantId;
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/util/tenantIdUtils.js
var require_tenantIdUtils = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.processMultiTenantRequest = void 0;
	exports.checkTenantId = checkTenantId;
	exports.resolveTenantId = resolveTenantId;
	exports.resolveAdditionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds;
	var constants_js_1 = require_constants$1();
	var logging_js_1 = require_logging();
	var processMultiTenantRequest_js_1 = require_processMultiTenantRequest();
	Object.defineProperty(exports, "processMultiTenantRequest", {
		enumerable: true,
		get: function() {
			return processMultiTenantRequest_js_1.processMultiTenantRequest;
		}
	});
	/**
	* @internal
	*/
	function checkTenantId(logger, tenantId) {
		if (!tenantId.match(/^[0-9a-zA-Z-.]+$/)) {
			const error = /* @__PURE__ */ new Error("Invalid tenant id provided. You can locate your tenant id by following the instructions listed here: https://learn.microsoft.com/partner-center/find-ids-and-domain-names.");
			logger.info((0, logging_js_1.formatError)("", error));
			throw error;
		}
	}
	/**
	* @internal
	*/
	function resolveTenantId(logger, tenantId, clientId) {
		if (tenantId) {
			checkTenantId(logger, tenantId);
			return tenantId;
		}
		if (!clientId) clientId = constants_js_1.DeveloperSignOnClientId;
		if (clientId !== constants_js_1.DeveloperSignOnClientId) return "common";
		return "organizations";
	}
	/**
	* @internal
	*/
	function resolveAdditionallyAllowedTenantIds(additionallyAllowedTenants) {
		if (!additionallyAllowedTenants || additionallyAllowedTenants.length === 0) return [];
		if (additionallyAllowedTenants.includes("*")) return constants_js_1.ALL_TENANTS;
		return additionallyAllowedTenants;
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/msal/nodeFlows/msalClient.js
var require_msalClient = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.generateMsalConfiguration = generateMsalConfiguration;
	exports.createMsalClient = createMsalClient;
	var msal = __require("tslib").__importStar(require_msal_node());
	var logging_js_1 = require_logging();
	var msalPlugins_js_1 = require_msalPlugins();
	var utils_js_1 = require_utils$1();
	var errors_js_1 = require_errors();
	var identityClient_js_1 = require_identityClient();
	var regionalAuthority_js_1 = require_regionalAuthority();
	var logger_1 = require_commonjs$1();
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	/**
	* The default logger used if no logger was passed in by the credential.
	*/
	var msalLogger = (0, logging_js_1.credentialLogger)("MsalClient");
	/**
	* Generates the configuration for MSAL (Microsoft Authentication Library).
	*
	* @param clientId - The client ID of the application.
	* @param  tenantId - The tenant ID of the Azure Active Directory.
	* @param  msalClientOptions - Optional. Additional options for creating the MSAL client.
	* @returns  The MSAL configuration object.
	*/
	function generateMsalConfiguration(clientId, tenantId, msalClientOptions = {}) {
		const resolvedTenant = (0, tenantIdUtils_js_1.resolveTenantId)(msalClientOptions.logger ?? msalLogger, tenantId, clientId);
		const authority = (0, utils_js_1.getAuthority)(resolvedTenant, (0, utils_js_1.getAuthorityHost)(msalClientOptions));
		const httpClient = new identityClient_js_1.IdentityClient({
			...msalClientOptions.tokenCredentialOptions,
			authorityHost: authority,
			loggingOptions: msalClientOptions.loggingOptions
		});
		return {
			auth: {
				clientId,
				authority,
				knownAuthorities: (0, utils_js_1.getKnownAuthorities)(resolvedTenant, authority, msalClientOptions.disableInstanceDiscovery)
			},
			system: {
				networkClient: httpClient,
				loggerOptions: {
					loggerCallback: (0, utils_js_1.defaultLoggerCallback)(msalClientOptions.logger ?? msalLogger),
					logLevel: (0, utils_js_1.getMSALLogLevel)((0, logger_1.getLogLevel)()),
					piiLoggingEnabled: msalClientOptions.loggingOptions?.enableUnsafeSupportLogging
				}
			}
		};
	}
	/**
	* Creates an instance of the MSAL (Microsoft Authentication Library) client.
	*
	* @param clientId - The client ID of the application.
	* @param tenantId - The tenant ID of the Azure Active Directory.
	* @param createMsalClientOptions - Optional. Additional options for creating the MSAL client.
	* @returns An instance of the MSAL client.
	*
	* @public
	*/
	function createMsalClient(clientId, tenantId, createMsalClientOptions = {}) {
		const state = {
			msalConfig: generateMsalConfiguration(clientId, tenantId, createMsalClientOptions),
			cachedAccount: createMsalClientOptions.authenticationRecord ? (0, utils_js_1.publicToMsal)(createMsalClientOptions.authenticationRecord) : null,
			pluginConfiguration: msalPlugins_js_1.msalPlugins.generatePluginConfiguration(createMsalClientOptions),
			logger: createMsalClientOptions.logger ?? msalLogger
		};
		const publicApps = /* @__PURE__ */ new Map();
		async function getPublicApp(options = {}) {
			const appKey = options.enableCae ? "CAE" : "default";
			let publicClientApp = publicApps.get(appKey);
			if (publicClientApp) {
				state.logger.getToken.info("Existing PublicClientApplication found in cache, returning it.");
				return publicClientApp;
			}
			state.logger.getToken.info(`Creating new PublicClientApplication with CAE ${options.enableCae ? "enabled" : "disabled"}.`);
			const cachePlugin = options.enableCae ? state.pluginConfiguration.cache.cachePluginCae : state.pluginConfiguration.cache.cachePlugin;
			state.msalConfig.auth.clientCapabilities = options.enableCae ? ["cp1"] : void 0;
			publicClientApp = new msal.PublicClientApplication({
				...state.msalConfig,
				broker: { nativeBrokerPlugin: state.pluginConfiguration.broker.nativeBrokerPlugin },
				cache: { cachePlugin: await cachePlugin }
			});
			publicApps.set(appKey, publicClientApp);
			return publicClientApp;
		}
		const confidentialApps = /* @__PURE__ */ new Map();
		async function getConfidentialApp(options = {}) {
			const appKey = options.enableCae ? "CAE" : "default";
			let confidentialClientApp = confidentialApps.get(appKey);
			if (confidentialClientApp) {
				state.logger.getToken.info("Existing ConfidentialClientApplication found in cache, returning it.");
				return confidentialClientApp;
			}
			state.logger.getToken.info(`Creating new ConfidentialClientApplication with CAE ${options.enableCae ? "enabled" : "disabled"}.`);
			const cachePlugin = options.enableCae ? state.pluginConfiguration.cache.cachePluginCae : state.pluginConfiguration.cache.cachePlugin;
			state.msalConfig.auth.clientCapabilities = options.enableCae ? ["cp1"] : void 0;
			confidentialClientApp = new msal.ConfidentialClientApplication({
				...state.msalConfig,
				broker: { nativeBrokerPlugin: state.pluginConfiguration.broker.nativeBrokerPlugin },
				cache: { cachePlugin: await cachePlugin }
			});
			confidentialApps.set(appKey, confidentialClientApp);
			return confidentialClientApp;
		}
		async function getTokenSilent(app, scopes, options = {}) {
			if (state.cachedAccount === null) {
				state.logger.getToken.info("No cached account found in local state.");
				throw new errors_js_1.AuthenticationRequiredError({ scopes });
			}
			if (options.claims) state.cachedClaims = options.claims;
			const silentRequest = {
				account: state.cachedAccount,
				scopes,
				claims: state.cachedClaims
			};
			if (state.pluginConfiguration.broker.isEnabled) {
				silentRequest.extraQueryParameters ||= {};
				if (state.pluginConfiguration.broker.enableMsaPassthrough) silentRequest.extraQueryParameters["msal_request_type"] = "consumer_passthrough";
			}
			if (options.proofOfPossessionOptions) {
				silentRequest.shrNonce = options.proofOfPossessionOptions.nonce;
				silentRequest.authenticationScheme = "pop";
				silentRequest.resourceRequestMethod = options.proofOfPossessionOptions.resourceRequestMethod;
				silentRequest.resourceRequestUri = options.proofOfPossessionOptions.resourceRequestUrl;
			}
			state.logger.getToken.info("Attempting to acquire token silently");
			try {
				return await app.acquireTokenSilent(silentRequest);
			} catch (err) {
				throw (0, utils_js_1.handleMsalError)(scopes, err, options);
			}
		}
		/**
		* Builds an authority URL for the given request. The authority may be different than the one used when creating the MSAL client
		* if the user is creating cross-tenant requests
		*/
		function calculateRequestAuthority(options) {
			if (options?.tenantId) return (0, utils_js_1.getAuthority)(options.tenantId, (0, utils_js_1.getAuthorityHost)(createMsalClientOptions));
			return state.msalConfig.auth.authority;
		}
		/**
		* Performs silent authentication using MSAL to acquire an access token.
		* If silent authentication fails, falls back to interactive authentication.
		*
		* @param msalApp - The MSAL application instance.
		* @param scopes - The scopes for which to acquire the access token.
		* @param options - The options for acquiring the access token.
		* @param onAuthenticationRequired - A callback function to handle interactive authentication when silent authentication fails.
		* @returns A promise that resolves to an AccessToken object containing the access token and its expiration timestamp.
		*/
		async function withSilentAuthentication(msalApp, scopes, options, onAuthenticationRequired) {
			let response = null;
			try {
				response = await getTokenSilent(msalApp, scopes, options);
			} catch (e) {
				if (e.name !== "AuthenticationRequiredError") throw e;
				if (options.disableAutomaticAuthentication) throw new errors_js_1.AuthenticationRequiredError({
					scopes,
					getTokenOptions: options,
					message: "Automatic authentication has been disabled. You may call the authentication() method."
				});
			}
			if (response === null) try {
				response = await onAuthenticationRequired();
			} catch (err) {
				throw (0, utils_js_1.handleMsalError)(scopes, err, options);
			}
			(0, utils_js_1.ensureValidMsalToken)(scopes, response, options);
			state.cachedAccount = response?.account ?? null;
			state.logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
			return {
				token: response.accessToken,
				expiresOnTimestamp: response.expiresOn.getTime(),
				refreshAfterTimestamp: response.refreshOn?.getTime(),
				tokenType: response.tokenType
			};
		}
		async function getTokenByClientSecret(scopes, clientSecret, options = {}) {
			state.logger.getToken.info(`Attempting to acquire token using client secret`);
			state.msalConfig.auth.clientSecret = clientSecret;
			const msalApp = await getConfidentialApp(options);
			try {
				const response = await msalApp.acquireTokenByClientCredential({
					scopes,
					authority: calculateRequestAuthority(options),
					azureRegion: (0, regionalAuthority_js_1.calculateRegionalAuthority)(),
					claims: options?.claims
				});
				(0, utils_js_1.ensureValidMsalToken)(scopes, response, options);
				state.logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
				return {
					token: response.accessToken,
					expiresOnTimestamp: response.expiresOn.getTime(),
					refreshAfterTimestamp: response.refreshOn?.getTime(),
					tokenType: response.tokenType
				};
			} catch (err) {
				throw (0, utils_js_1.handleMsalError)(scopes, err, options);
			}
		}
		async function getTokenByClientAssertion(scopes, clientAssertion, options = {}) {
			state.logger.getToken.info(`Attempting to acquire token using client assertion`);
			state.msalConfig.auth.clientAssertion = clientAssertion;
			const msalApp = await getConfidentialApp(options);
			try {
				const response = await msalApp.acquireTokenByClientCredential({
					scopes,
					authority: calculateRequestAuthority(options),
					azureRegion: (0, regionalAuthority_js_1.calculateRegionalAuthority)(),
					claims: options?.claims,
					clientAssertion
				});
				(0, utils_js_1.ensureValidMsalToken)(scopes, response, options);
				state.logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
				return {
					token: response.accessToken,
					expiresOnTimestamp: response.expiresOn.getTime(),
					refreshAfterTimestamp: response.refreshOn?.getTime(),
					tokenType: response.tokenType
				};
			} catch (err) {
				throw (0, utils_js_1.handleMsalError)(scopes, err, options);
			}
		}
		async function getTokenByClientCertificate(scopes, certificate, options = {}) {
			state.logger.getToken.info(`Attempting to acquire token using client certificate`);
			state.msalConfig.auth.clientCertificate = certificate;
			const msalApp = await getConfidentialApp(options);
			try {
				const response = await msalApp.acquireTokenByClientCredential({
					scopes,
					authority: calculateRequestAuthority(options),
					azureRegion: (0, regionalAuthority_js_1.calculateRegionalAuthority)(),
					claims: options?.claims
				});
				(0, utils_js_1.ensureValidMsalToken)(scopes, response, options);
				state.logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
				return {
					token: response.accessToken,
					expiresOnTimestamp: response.expiresOn.getTime(),
					refreshAfterTimestamp: response.refreshOn?.getTime(),
					tokenType: response.tokenType
				};
			} catch (err) {
				throw (0, utils_js_1.handleMsalError)(scopes, err, options);
			}
		}
		async function getTokenByDeviceCode(scopes, deviceCodeCallback, options = {}) {
			state.logger.getToken.info(`Attempting to acquire token using device code`);
			const msalApp = await getPublicApp(options);
			return withSilentAuthentication(msalApp, scopes, options, () => {
				const requestOptions = {
					scopes,
					cancel: options?.abortSignal?.aborted ?? false,
					deviceCodeCallback,
					authority: calculateRequestAuthority(options),
					claims: options?.claims
				};
				const deviceCodeRequest = msalApp.acquireTokenByDeviceCode(requestOptions);
				if (options.abortSignal) options.abortSignal.addEventListener("abort", () => {
					requestOptions.cancel = true;
				});
				return deviceCodeRequest;
			});
		}
		async function getTokenByUsernamePassword(scopes, username, password, options = {}) {
			state.logger.getToken.info(`Attempting to acquire token using username and password`);
			const msalApp = await getPublicApp(options);
			return withSilentAuthentication(msalApp, scopes, options, () => {
				const requestOptions = {
					scopes,
					username,
					password,
					authority: calculateRequestAuthority(options),
					claims: options?.claims
				};
				return msalApp.acquireTokenByUsernamePassword(requestOptions);
			});
		}
		function getActiveAccount() {
			if (!state.cachedAccount) return;
			return (0, utils_js_1.msalToPublic)(clientId, state.cachedAccount);
		}
		async function getTokenByAuthorizationCode(scopes, redirectUri, authorizationCode, clientSecret, options = {}) {
			state.logger.getToken.info(`Attempting to acquire token using authorization code`);
			let msalApp;
			if (clientSecret) {
				state.msalConfig.auth.clientSecret = clientSecret;
				msalApp = await getConfidentialApp(options);
			} else msalApp = await getPublicApp(options);
			return withSilentAuthentication(msalApp, scopes, options, () => {
				return msalApp.acquireTokenByCode({
					scopes,
					redirectUri,
					code: authorizationCode,
					authority: calculateRequestAuthority(options),
					claims: options?.claims
				});
			});
		}
		async function getTokenOnBehalfOf(scopes, userAssertionToken, clientCredentials, options = {}) {
			msalLogger.getToken.info(`Attempting to acquire token on behalf of another user`);
			if (typeof clientCredentials === "string") {
				msalLogger.getToken.info(`Using client secret for on behalf of flow`);
				state.msalConfig.auth.clientSecret = clientCredentials;
			} else if (typeof clientCredentials === "function") {
				msalLogger.getToken.info(`Using client assertion callback for on behalf of flow`);
				state.msalConfig.auth.clientAssertion = clientCredentials;
			} else {
				msalLogger.getToken.info(`Using client certificate for on behalf of flow`);
				state.msalConfig.auth.clientCertificate = clientCredentials;
			}
			const msalApp = await getConfidentialApp(options);
			try {
				const response = await msalApp.acquireTokenOnBehalfOf({
					scopes,
					authority: calculateRequestAuthority(options),
					claims: options.claims,
					oboAssertion: userAssertionToken
				});
				(0, utils_js_1.ensureValidMsalToken)(scopes, response, options);
				msalLogger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
				return {
					token: response.accessToken,
					expiresOnTimestamp: response.expiresOn.getTime(),
					refreshAfterTimestamp: response.refreshOn?.getTime(),
					tokenType: response.tokenType
				};
			} catch (err) {
				throw (0, utils_js_1.handleMsalError)(scopes, err, options);
			}
		}
		/**
		* Creates a base interactive request configuration for MSAL interactive authentication.
		* This is shared between interactive and brokered authentication flows.
		*/
		function createBaseInteractiveRequest(scopes, options) {
			return {
				openBrowser: async (url) => {
					await (await import("../open+wsl-utils.mjs").then((n) => (n.t(), n.n))).default(url, { newInstance: true });
				},
				scopes,
				authority: calculateRequestAuthority(options),
				claims: options?.claims,
				loginHint: options?.loginHint,
				errorTemplate: options?.browserCustomizationOptions?.errorMessage,
				successTemplate: options?.browserCustomizationOptions?.successMessage,
				prompt: options?.loginHint ? "login" : "select_account"
			};
		}
		/**
		* @internal
		*/
		async function getBrokeredTokenInternal(scopes, useDefaultBrokerAccount, options = {}) {
			msalLogger.verbose("Authentication will resume through the broker");
			const app = await getPublicApp(options);
			const interactiveRequest = createBaseInteractiveRequest(scopes, options);
			if (state.pluginConfiguration.broker.parentWindowHandle) interactiveRequest.windowHandle = Buffer.from(state.pluginConfiguration.broker.parentWindowHandle);
			else msalLogger.warning("Parent window handle is not specified for the broker. This may cause unexpected behavior. Please provide the parentWindowHandle.");
			if (state.pluginConfiguration.broker.enableMsaPassthrough) (interactiveRequest.extraQueryParameters ??= {})["msal_request_type"] = "consumer_passthrough";
			if (useDefaultBrokerAccount) {
				interactiveRequest.prompt = "none";
				msalLogger.verbose("Attempting broker authentication using the default broker account");
			} else msalLogger.verbose("Attempting broker authentication without the default broker account");
			if (options.proofOfPossessionOptions) {
				interactiveRequest.shrNonce = options.proofOfPossessionOptions.nonce;
				interactiveRequest.authenticationScheme = "pop";
				interactiveRequest.resourceRequestMethod = options.proofOfPossessionOptions.resourceRequestMethod;
				interactiveRequest.resourceRequestUri = options.proofOfPossessionOptions.resourceRequestUrl;
			}
			try {
				return await app.acquireTokenInteractive(interactiveRequest);
			} catch (e) {
				msalLogger.verbose(`Failed to authenticate through the broker: ${e.message}`);
				if (options.disableAutomaticAuthentication) throw new errors_js_1.AuthenticationRequiredError({
					scopes,
					getTokenOptions: options,
					message: "Cannot silently authenticate with default broker account."
				});
				if (useDefaultBrokerAccount) return getBrokeredTokenInternal(scopes, false, options);
				else throw e;
			}
		}
		/**
		* A helper function that supports brokered authentication through the MSAL's public application.
		*
		* When useDefaultBrokerAccount is true, the method will attempt to authenticate using the default broker account.
		* If the default broker account is not available, the method will fall back to interactive authentication.
		*/
		async function getBrokeredToken(scopes, useDefaultBrokerAccount, options = {}) {
			msalLogger.getToken.info(`Attempting to acquire token using brokered authentication with useDefaultBrokerAccount: ${useDefaultBrokerAccount}`);
			const response = await getBrokeredTokenInternal(scopes, useDefaultBrokerAccount, options);
			(0, utils_js_1.ensureValidMsalToken)(scopes, response, options);
			state.cachedAccount = response?.account ?? null;
			state.logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
			return {
				token: response.accessToken,
				expiresOnTimestamp: response.expiresOn.getTime(),
				refreshAfterTimestamp: response.refreshOn?.getTime(),
				tokenType: response.tokenType
			};
		}
		async function getTokenByInteractiveRequest(scopes, options = {}) {
			msalLogger.getToken.info(`Attempting to acquire token interactively`);
			const app = await getPublicApp(options);
			return withSilentAuthentication(app, scopes, options, async () => {
				const interactiveRequest = createBaseInteractiveRequest(scopes, options);
				if (state.pluginConfiguration.broker.isEnabled) return getBrokeredTokenInternal(scopes, state.pluginConfiguration.broker.useDefaultBrokerAccount ?? false, options);
				if (options.proofOfPossessionOptions) {
					interactiveRequest.shrNonce = options.proofOfPossessionOptions.nonce;
					interactiveRequest.authenticationScheme = "pop";
					interactiveRequest.resourceRequestMethod = options.proofOfPossessionOptions.resourceRequestMethod;
					interactiveRequest.resourceRequestUri = options.proofOfPossessionOptions.resourceRequestUrl;
				}
				return app.acquireTokenInteractive(interactiveRequest);
			});
		}
		return {
			getActiveAccount,
			getBrokeredToken,
			getTokenByClientSecret,
			getTokenByClientAssertion,
			getTokenByClientCertificate,
			getTokenByDeviceCode,
			getTokenByUsernamePassword,
			getTokenByAuthorizationCode,
			getTokenOnBehalfOf,
			getTokenByInteractiveRequest
		};
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/clientCertificateCredential.js
var require_clientCertificateCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ClientCertificateCredential = void 0;
	exports.parseCertificate = parseCertificate;
	var msalClient_js_1 = require_msalClient();
	var node_crypto_1$1 = __require("node:crypto");
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var logging_js_1 = require_logging();
	var promises_1$3 = __require("node:fs/promises");
	var tracing_js_1 = require_tracing();
	var credentialName = "ClientCertificateCredential";
	var logger = (0, logging_js_1.credentialLogger)(credentialName);
	/**
	* Enables authentication to Microsoft Entra ID using a PEM-encoded
	* certificate that is assigned to an App Registration. More information
	* on how to configure certificate authentication can be found here:
	*
	* https://learn.microsoft.com/azure/active-directory/develop/active-directory-certificate-credentials#register-your-certificate-with-azure-ad
	*
	*/
	var ClientCertificateCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		certificateConfiguration;
		sendCertificateChain;
		msalClient;
		constructor(tenantId, clientId, certificatePathOrConfiguration, options = {}) {
			if (!tenantId || !clientId) throw new Error(`${credentialName}: tenantId and clientId are required parameters.`);
			this.tenantId = tenantId;
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			this.sendCertificateChain = options.sendCertificateChain;
			this.certificateConfiguration = { ...typeof certificatePathOrConfiguration === "string" ? { certificatePath: certificatePathOrConfiguration } : certificatePathOrConfiguration };
			const certificate = this.certificateConfiguration.certificate;
			const certificatePath = this.certificateConfiguration.certificatePath;
			if (!this.certificateConfiguration || !(certificate || certificatePath)) throw new Error(`${credentialName}: Provide either a PEM certificate in string form, or the path to that certificate in the filesystem. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
			if (certificate && certificatePath) throw new Error(`${credentialName}: To avoid unexpected behaviors, providing both the contents of a PEM certificate and the path to a PEM certificate is forbidden. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
			this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, tenantId, {
				...options,
				logger,
				tokenCredentialOptions: options
			});
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${credentialName}.getToken`, options, async (newOptions) => {
				newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
				const arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
				const certificate = await this.buildClientCertificate();
				return this.msalClient.getTokenByClientCertificate(arrayScopes, certificate, newOptions);
			});
		}
		async buildClientCertificate() {
			const parts = await parseCertificate(this.certificateConfiguration, this.sendCertificateChain ?? false);
			let privateKey;
			if (this.certificateConfiguration.certificatePassword !== void 0) privateKey = (0, node_crypto_1$1.createPrivateKey)({
				key: parts.certificateContents,
				passphrase: this.certificateConfiguration.certificatePassword,
				format: "pem"
			}).export({
				format: "pem",
				type: "pkcs8"
			}).toString();
			else privateKey = parts.certificateContents;
			return {
				thumbprint: parts.thumbprint,
				thumbprintSha256: parts.thumbprintSha256,
				privateKey,
				x5c: parts.x5c
			};
		}
	};
	exports.ClientCertificateCredential = ClientCertificateCredential;
	/**
	* Parses a certificate into its relevant parts
	*
	* @param certificateConfiguration - The certificate contents or path to the certificate
	* @param sendCertificateChain - true if the entire certificate chain should be sent for SNI, false otherwise
	* @returns The parsed certificate parts and the certificate contents
	*/
	async function parseCertificate(certificateConfiguration, sendCertificateChain) {
		const certificate = certificateConfiguration.certificate;
		const certificatePath = certificateConfiguration.certificatePath;
		const certificateContents = certificate || await (0, promises_1$3.readFile)(certificatePath, "utf8");
		const x5c = sendCertificateChain ? certificateContents : void 0;
		const certificatePattern = /(-+BEGIN CERTIFICATE-+)(\n\r?|\r\n?)([A-Za-z0-9+/\n\r]+=*)(\n\r?|\r\n?)(-+END CERTIFICATE-+)/g;
		const publicKeys = [];
		let match;
		do {
			match = certificatePattern.exec(certificateContents);
			if (match) publicKeys.push(match[3]);
		} while (match);
		if (publicKeys.length === 0) throw new Error("The file at the specified path does not contain a PEM-encoded certificate.");
		const thumbprint = (0, node_crypto_1$1.createHash)("sha1").update(Buffer.from(publicKeys[0], "base64")).digest("hex").toUpperCase();
		return {
			certificateContents,
			thumbprintSha256: (0, node_crypto_1$1.createHash)("sha256").update(Buffer.from(publicKeys[0], "base64")).digest("hex").toUpperCase(),
			thumbprint,
			x5c
		};
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/util/scopeUtils.js
var require_scopeUtils = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ensureScopes = ensureScopes;
	exports.ensureValidScopeForDevTimeCreds = ensureValidScopeForDevTimeCreds;
	exports.getScopeResource = getScopeResource;
	var logging_js_1 = require_logging();
	/**
	* Ensures the scopes value is an array.
	* @internal
	*/
	function ensureScopes(scopes) {
		return Array.isArray(scopes) ? scopes : [scopes];
	}
	/**
	* Throws if the received scope is not valid.
	* @internal
	*/
	function ensureValidScopeForDevTimeCreds(scope, logger) {
		if (!scope.match(/^[0-9a-zA-Z-_.:/]+$/)) {
			const error = /* @__PURE__ */ new Error("Invalid scope was specified by the user or calling client");
			logger.getToken.info((0, logging_js_1.formatError)(scope, error));
			throw error;
		}
	}
	/**
	* Returns the resource out of a scope.
	* @internal
	*/
	function getScopeResource(scope) {
		return scope.replace(/\/.default$/, "");
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/clientSecretCredential.js
var require_clientSecretCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ClientSecretCredential = void 0;
	var msalClient_js_1 = require_msalClient();
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var errors_js_1 = require_errors();
	var logging_js_1 = require_logging();
	var scopeUtils_js_1 = require_scopeUtils();
	var tracing_js_1 = require_tracing();
	var logger = (0, logging_js_1.credentialLogger)("ClientSecretCredential");
	/**
	* Enables authentication to Microsoft Entra ID using a client secret
	* that was generated for an App Registration. More information on how
	* to configure a client secret can be found here:
	*
	* https://learn.microsoft.com/entra/identity-platform/quickstart-configure-app-access-web-apis#add-credentials-to-your-web-application
	*
	*/
	var ClientSecretCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		msalClient;
		clientSecret;
		/**
		* Creates an instance of the ClientSecretCredential with the details
		* needed to authenticate against Microsoft Entra ID with a client
		* secret.
		*
		* @param tenantId - The Microsoft Entra tenant (directory) ID.
		* @param clientId - The client (application) ID of an App Registration in the tenant.
		* @param clientSecret - A client secret that was generated for the App Registration.
		* @param options - Options for configuring the client which makes the authentication request.
		*/
		constructor(tenantId, clientId, clientSecret, options = {}) {
			if (!tenantId) throw new errors_js_1.CredentialUnavailableError("ClientSecretCredential: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.");
			if (!clientId) throw new errors_js_1.CredentialUnavailableError("ClientSecretCredential: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.");
			if (!clientSecret) throw new errors_js_1.CredentialUnavailableError("ClientSecretCredential: clientSecret is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.");
			this.clientSecret = clientSecret;
			this.tenantId = tenantId;
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, tenantId, {
				...options,
				logger,
				tokenCredentialOptions: options
			});
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
				newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
				const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
				return this.msalClient.getTokenByClientSecret(arrayScopes, this.clientSecret, newOptions);
			});
		}
	};
	exports.ClientSecretCredential = ClientSecretCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/usernamePasswordCredential.js
var require_usernamePasswordCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.UsernamePasswordCredential = void 0;
	var msalClient_js_1 = require_msalClient();
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var errors_js_1 = require_errors();
	var logging_js_1 = require_logging();
	var scopeUtils_js_1 = require_scopeUtils();
	var tracing_js_1 = require_tracing();
	var logger = (0, logging_js_1.credentialLogger)("UsernamePasswordCredential");
	/**
	* Enables authentication to Microsoft Entra ID with a user's
	* username and password. This credential requires a high degree of
	* trust so you should only use it when other, more secure credential
	* types can't be used.
	* @deprecated UsernamePasswordCredential is deprecated. Use a more secure credential. See https://aka.ms/azsdk/identity/mfa for details.
	*/
	var UsernamePasswordCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		msalClient;
		username;
		password;
		/**
		* Creates an instance of the UsernamePasswordCredential with the details
		* needed to authenticate against Microsoft Entra ID with a username
		* and password.
		*
		* @param tenantId - The Microsoft Entra tenant (directory).
		* @param clientId - The client (application) ID of an App Registration in the tenant.
		* @param username - The user account's e-mail address (user name).
		* @param password - The user account's account password
		* @param options - Options for configuring the client which makes the authentication request.
		*/
		constructor(tenantId, clientId, username, password, options = {}) {
			if (!tenantId) throw new errors_js_1.CredentialUnavailableError("UsernamePasswordCredential: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.");
			if (!clientId) throw new errors_js_1.CredentialUnavailableError("UsernamePasswordCredential: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.");
			if (!username) throw new errors_js_1.CredentialUnavailableError("UsernamePasswordCredential: username is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.");
			if (!password) throw new errors_js_1.CredentialUnavailableError("UsernamePasswordCredential: password is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.");
			this.tenantId = tenantId;
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			this.username = username;
			this.password = password;
			this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, this.tenantId, {
				...options,
				tokenCredentialOptions: options ?? {}
			});
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* If the user provided the option `disableAutomaticAuthentication`,
		* once the token can't be retrieved silently,
		* this method won't attempt to request user interaction to retrieve the token.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
				newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
				const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
				return this.msalClient.getTokenByUsernamePassword(arrayScopes, this.username, this.password, newOptions);
			});
		}
	};
	exports.UsernamePasswordCredential = UsernamePasswordCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/environmentCredential.js
var require_environmentCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.EnvironmentCredential = exports.AllSupportedEnvironmentVariables = void 0;
	exports.getSendCertificateChain = getSendCertificateChain;
	var errors_js_1 = require_errors();
	var logging_js_1 = require_logging();
	var clientCertificateCredential_js_1 = require_clientCertificateCredential();
	var clientSecretCredential_js_1 = require_clientSecretCredential();
	var usernamePasswordCredential_js_1 = require_usernamePasswordCredential();
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var tracing_js_1 = require_tracing();
	/**
	* Contains the list of all supported environment variable names so that an
	* appropriate error message can be generated when no credentials can be
	* configured.
	*
	* @internal
	*/
	exports.AllSupportedEnvironmentVariables = [
		"AZURE_TENANT_ID",
		"AZURE_CLIENT_ID",
		"AZURE_CLIENT_SECRET",
		"AZURE_CLIENT_CERTIFICATE_PATH",
		"AZURE_CLIENT_CERTIFICATE_PASSWORD",
		"AZURE_USERNAME",
		"AZURE_PASSWORD",
		"AZURE_ADDITIONALLY_ALLOWED_TENANTS",
		"AZURE_CLIENT_SEND_CERTIFICATE_CHAIN"
	];
	function getAdditionallyAllowedTenants() {
		return (process.env.AZURE_ADDITIONALLY_ALLOWED_TENANTS ?? "").split(";");
	}
	var credentialName = "EnvironmentCredential";
	var logger = (0, logging_js_1.credentialLogger)(credentialName);
	function getSendCertificateChain() {
		const sendCertificateChain = (process.env.AZURE_CLIENT_SEND_CERTIFICATE_CHAIN ?? "").toLowerCase();
		const result = sendCertificateChain === "true" || sendCertificateChain === "1";
		logger.verbose(`AZURE_CLIENT_SEND_CERTIFICATE_CHAIN: ${process.env.AZURE_CLIENT_SEND_CERTIFICATE_CHAIN}; sendCertificateChain: ${result}`);
		return result;
	}
	/**
	* Enables authentication to Microsoft Entra ID using a client secret or certificate.
	*/
	var EnvironmentCredential = class {
		_credential = void 0;
		/**
		* Creates an instance of the EnvironmentCredential class and decides what credential to use depending on the available environment variables.
		*
		* Required environment variables:
		* - `AZURE_TENANT_ID`: The Microsoft Entra tenant (directory) ID.
		* - `AZURE_CLIENT_ID`: The client (application) ID of an App Registration in the tenant.
		*
		* If setting the AZURE_TENANT_ID, then you can also set the additionally allowed tenants
		* - `AZURE_ADDITIONALLY_ALLOWED_TENANTS`: For multi-tenant applications, specifies additional tenants for which the credential may acquire tokens with a single semicolon delimited string. Use * to allow all tenants.
		*
		* Environment variables used for client credential authentication:
		* - `AZURE_CLIENT_SECRET`: A client secret that was generated for the App Registration.
		* - `AZURE_CLIENT_CERTIFICATE_PATH`: The path to a PEM certificate to use during the authentication, instead of the client secret.
		* - `AZURE_CLIENT_CERTIFICATE_PASSWORD`: (optional) password for the certificate file.
		* - `AZURE_CLIENT_SEND_CERTIFICATE_CHAIN`: (optional) indicates that the certificate chain should be set in x5c header to support subject name / issuer based authentication.
		*
		* Username and password authentication is deprecated, since it doesn't support multifactor authentication (MFA). See https://aka.ms/azsdk/identity/mfa for more details. Users can still provide environment variables for this authentication method:
		* - `AZURE_USERNAME`: Username to authenticate with.
		* - `AZURE_PASSWORD`: Password to authenticate with.
		*
		* If the environment variables required to perform the authentication are missing, a {@link CredentialUnavailableError} will be thrown.
		* If the authentication fails, or if there's an unknown error, an {@link AuthenticationError} will be thrown.
		*
		* @param options - Options for configuring the client which makes the authentication request.
		*/
		constructor(options) {
			const assigned = (0, logging_js_1.processEnvVars)(exports.AllSupportedEnvironmentVariables).assigned.join(", ");
			logger.info(`Found the following environment variables: ${assigned}`);
			const tenantId = process.env.AZURE_TENANT_ID, clientId = process.env.AZURE_CLIENT_ID, clientSecret = process.env.AZURE_CLIENT_SECRET;
			const additionallyAllowedTenantIds = getAdditionallyAllowedTenants();
			const sendCertificateChain = getSendCertificateChain();
			const newOptions = {
				...options,
				additionallyAllowedTenantIds,
				sendCertificateChain
			};
			if (tenantId) (0, tenantIdUtils_js_1.checkTenantId)(logger, tenantId);
			if (tenantId && clientId && clientSecret) {
				logger.info(`Invoking ClientSecretCredential with tenant ID: ${tenantId}, clientId: ${clientId} and clientSecret: [REDACTED]`);
				this._credential = new clientSecretCredential_js_1.ClientSecretCredential(tenantId, clientId, clientSecret, newOptions);
				return;
			}
			const certificatePath = process.env.AZURE_CLIENT_CERTIFICATE_PATH;
			const certificatePassword = process.env.AZURE_CLIENT_CERTIFICATE_PASSWORD;
			if (tenantId && clientId && certificatePath) {
				logger.info(`Invoking ClientCertificateCredential with tenant ID: ${tenantId}, clientId: ${clientId} and certificatePath: ${certificatePath}`);
				this._credential = new clientCertificateCredential_js_1.ClientCertificateCredential(tenantId, clientId, {
					certificatePath,
					certificatePassword
				}, newOptions);
				return;
			}
			const username = process.env.AZURE_USERNAME;
			const password = process.env.AZURE_PASSWORD;
			if (tenantId && clientId && username && password) {
				logger.info(`Invoking UsernamePasswordCredential with tenant ID: ${tenantId}, clientId: ${clientId} and username: ${username}`);
				logger.warning("Environment is configured to use username and password authentication. This authentication method is deprecated, as it doesn't support multifactor authentication (MFA). Use a more secure credential. For more details, see https://aka.ms/azsdk/identity/mfa.");
				this._credential = new usernamePasswordCredential_js_1.UsernamePasswordCredential(tenantId, clientId, username, password, newOptions);
			}
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - Optional parameters. See {@link GetTokenOptions}.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${credentialName}.getToken`, options, async (newOptions) => {
				if (this._credential) try {
					const result = await this._credential.getToken(scopes, newOptions);
					logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
					return result;
				} catch (err) {
					const authenticationError = new errors_js_1.AuthenticationError(400, {
						error: `${credentialName} authentication failed. To troubleshoot, visit https://aka.ms/azsdk/js/identity/environmentcredential/troubleshoot.`,
						error_description: err.message.toString().split("More details:").join("")
					});
					logger.getToken.info((0, logging_js_1.formatError)(scopes, authenticationError));
					throw authenticationError;
				}
				throw new errors_js_1.CredentialUnavailableError(`${credentialName} is unavailable. No underlying credential could be used. To troubleshoot, visit https://aka.ms/azsdk/js/identity/environmentcredential/troubleshoot.`);
			});
		}
	};
	exports.EnvironmentCredential = EnvironmentCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/managedIdentityCredential/imdsRetryPolicy.js
var require_imdsRetryPolicy = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.imdsRetryPolicy = imdsRetryPolicy;
	var core_rest_pipeline_1 = require_commonjs$4();
	var core_util_1 = require_commonjs$5();
	var DEFAULT_CLIENT_MAX_RETRY_INTERVAL = 64e3;
	var MIN_DELAY_FOR_410_MS = 3e3;
	/**
	* An additional policy that retries on 404 and 410 errors. The default retry policy does not retry on
	* 404s or 410s, but the IMDS endpoint can return these when the token is not yet available or when
	* the identity is still being set up. This policy will retry on 404s and 410s with an exponential backoff.
	* For 410 responses, it uses a minimum 3-second initial delay to ensure at least 70 seconds total duration.
	*
	* @param msiRetryConfig - The retry configuration for the MSI credential.
	* @returns - The policy that will retry on 404s and 410s.
	*/
	function imdsRetryPolicy(msiRetryConfig) {
		return (0, core_rest_pipeline_1.retryPolicy)([{
			name: "imdsRetryPolicy",
			retry: ({ retryCount, response }) => {
				if (response?.status !== 404 && response?.status !== 410) return { skipStrategy: true };
				const initialDelayMs = response?.status === 410 ? Math.max(MIN_DELAY_FOR_410_MS, msiRetryConfig.startDelayInMs) : msiRetryConfig.startDelayInMs;
				return (0, core_util_1.calculateRetryDelay)(retryCount, {
					retryDelayInMs: initialDelayMs,
					maxRetryDelayInMs: DEFAULT_CLIENT_MAX_RETRY_INTERVAL
				});
			}
		}], { maxRetries: msiRetryConfig.maxRetries });
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/managedIdentityCredential/imdsMsi.js
var require_imdsMsi = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.imdsMsi = void 0;
	var core_rest_pipeline_1 = require_commonjs$4();
	var core_util_1 = require_commonjs$5();
	var logging_js_1 = require_logging();
	var utils_js_1 = require_utils();
	var tracing_js_1 = require_tracing();
	var msiName = "ManagedIdentityCredential - IMDS";
	var logger = (0, logging_js_1.credentialLogger)(msiName);
	var imdsHost = "http://169.254.169.254";
	var imdsEndpointPath = "/metadata/identity/oauth2/token";
	/**
	* Generates an invalid request options to get a response quickly from IMDS endpoint.
	* The response indicates the availability of IMSD service; otherwise the request would time out.
	*/
	function prepareInvalidRequestOptions(scopes) {
		if (!(0, utils_js_1.mapScopesToResource)(scopes)) throw new Error(`${msiName}: Multiple scopes are not supported.`);
		return {
			url: `${new URL(imdsEndpointPath, process.env.AZURE_POD_IDENTITY_AUTHORITY_HOST ?? imdsHost)}`,
			method: "GET",
			headers: (0, core_rest_pipeline_1.createHttpHeaders)({ Accept: "application/json" })
		};
	}
	/**
	* Defines how to determine whether the Azure IMDS MSI is available.
	*
	* Actually getting the token once we determine IMDS is available is handled by MSAL.
	*/
	exports.imdsMsi = {
		name: "imdsMsi",
		async isAvailable(options) {
			const { scopes, identityClient, getTokenOptions } = options;
			const resource = (0, utils_js_1.mapScopesToResource)(scopes);
			if (!resource) {
				logger.info(`${msiName}: Unavailable. Multiple scopes are not supported.`);
				return false;
			}
			if (process.env.AZURE_POD_IDENTITY_AUTHORITY_HOST) return true;
			if (!identityClient) throw new Error("Missing IdentityClient");
			const requestOptions = prepareInvalidRequestOptions(resource);
			return tracing_js_1.tracingClient.withSpan("ManagedIdentityCredential-pingImdsEndpoint", getTokenOptions ?? {}, async (updatedOptions) => {
				requestOptions.tracingOptions = updatedOptions.tracingOptions;
				const request = (0, core_rest_pipeline_1.createPipelineRequest)(requestOptions);
				request.timeout = updatedOptions.requestOptions?.timeout || 1e3;
				request.allowInsecureConnection = true;
				let response;
				try {
					logger.info(`${msiName}: Pinging the Azure IMDS endpoint`);
					response = await identityClient.sendRequest(request);
				} catch (err) {
					if ((0, core_util_1.isError)(err)) logger.verbose(`${msiName}: Caught error ${err.name}: ${err.message}`);
					logger.info(`${msiName}: The Azure IMDS endpoint is unavailable`);
					return false;
				}
				if (response.status === 403) {
					if (response.bodyAsText?.includes("unreachable")) {
						logger.info(`${msiName}: The Azure IMDS endpoint is unavailable`);
						logger.info(`${msiName}: ${response.bodyAsText}`);
						return false;
					}
				}
				logger.info(`${msiName}: The Azure IMDS endpoint is available`);
				return true;
			});
		}
	};
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/clientAssertionCredential.js
var require_clientAssertionCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ClientAssertionCredential = void 0;
	var msalClient_js_1 = require_msalClient();
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var errors_js_1 = require_errors();
	var logging_js_1 = require_logging();
	var tracing_js_1 = require_tracing();
	var logger = (0, logging_js_1.credentialLogger)("ClientAssertionCredential");
	/**
	* Authenticates a service principal with a JWT assertion.
	*/
	var ClientAssertionCredential = class {
		msalClient;
		tenantId;
		additionallyAllowedTenantIds;
		getAssertion;
		options;
		/**
		* Creates an instance of the ClientAssertionCredential with the details
		* needed to authenticate against Microsoft Entra ID with a client
		* assertion provided by the developer through the `getAssertion` function parameter.
		*
		* @param tenantId - The Microsoft Entra tenant (directory) ID.
		* @param clientId - The client (application) ID of an App Registration in the tenant.
		* @param getAssertion - A function that retrieves the assertion for the credential to use.
		* @param options - Options for configuring the client which makes the authentication request.
		*/
		constructor(tenantId, clientId, getAssertion, options = {}) {
			if (!tenantId) throw new errors_js_1.CredentialUnavailableError("ClientAssertionCredential: tenantId is a required parameter.");
			if (!clientId) throw new errors_js_1.CredentialUnavailableError("ClientAssertionCredential: clientId is a required parameter.");
			if (!getAssertion) throw new errors_js_1.CredentialUnavailableError("ClientAssertionCredential: clientAssertion is a required parameter.");
			this.tenantId = tenantId;
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			this.options = options;
			this.getAssertion = getAssertion;
			this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, tenantId, {
				...options,
				logger,
				tokenCredentialOptions: this.options
			});
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
				newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
				const arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
				return this.msalClient.getTokenByClientAssertion(arrayScopes, this.getAssertion, newOptions);
			});
		}
	};
	exports.ClientAssertionCredential = ClientAssertionCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/workloadIdentityCredential.js
var require_workloadIdentityCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.WorkloadIdentityCredential = exports.SupportedWorkloadEnvironmentVariables = void 0;
	var logging_js_1 = require_logging();
	var clientAssertionCredential_js_1 = require_clientAssertionCredential();
	var errors_js_1 = require_errors();
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var promises_1$2 = __require("node:fs/promises");
	var credentialName = "WorkloadIdentityCredential";
	/**
	* Contains the list of all supported environment variable names so that an
	* appropriate error message can be generated when no credentials can be
	* configured.
	*
	* @internal
	*/
	exports.SupportedWorkloadEnvironmentVariables = [
		"AZURE_TENANT_ID",
		"AZURE_CLIENT_ID",
		"AZURE_FEDERATED_TOKEN_FILE"
	];
	var logger = (0, logging_js_1.credentialLogger)(credentialName);
	/**
	* Workload Identity authentication is a feature in Azure that allows applications running on virtual machines (VMs)
	* to access other Azure resources without the need for a service principal or managed identity. With Workload Identity
	* authentication, applications authenticate themselves using their own identity, rather than using a shared service
	* principal or managed identity. Under the hood, Workload Identity authentication uses the concept of Service Account
	* Credentials (SACs), which are automatically created by Azure and stored securely in the VM. By using Workload
	* Identity authentication, you can avoid the need to manage and rotate service principals or managed identities for
	* each application on each VM. Additionally, because SACs are created automatically and managed by Azure, you don't
	* need to worry about storing and securing sensitive credentials themselves.
	* The WorkloadIdentityCredential supports Microsoft Entra Workload ID authentication on Azure Kubernetes and acquires
	* a token using the SACs available in the Azure Kubernetes environment.
	* Refer to <a href="https://learn.microsoft.com/azure/aks/workload-identity-overview">Microsoft Entra
	* Workload ID</a> for more information.
	*/
	var WorkloadIdentityCredential = class {
		client;
		azureFederatedTokenFileContent = void 0;
		cacheDate = void 0;
		federatedTokenFilePath;
		/**
		* WorkloadIdentityCredential supports Microsoft Entra Workload ID on Kubernetes.
		*
		* @param options - The identity client options to use for authentication.
		*/
		constructor(options) {
			const assignedEnv = (0, logging_js_1.processEnvVars)(exports.SupportedWorkloadEnvironmentVariables).assigned.join(", ");
			logger.info(`Found the following environment variables: ${assignedEnv}`);
			const workloadIdentityCredentialOptions = options ?? {};
			const tenantId = workloadIdentityCredentialOptions.tenantId || process.env.AZURE_TENANT_ID;
			const clientId = workloadIdentityCredentialOptions.clientId || process.env.AZURE_CLIENT_ID;
			this.federatedTokenFilePath = workloadIdentityCredentialOptions.tokenFilePath || process.env.AZURE_FEDERATED_TOKEN_FILE;
			if (tenantId) (0, tenantIdUtils_js_1.checkTenantId)(logger, tenantId);
			if (!clientId) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. clientId is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_CLIENT_ID".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
			if (!tenantId) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. tenantId is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_TENANT_ID".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
			if (!this.federatedTokenFilePath) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. federatedTokenFilePath is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_FEDERATED_TOKEN_FILE".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
			logger.info(`Invoking ClientAssertionCredential with tenant ID: ${tenantId}, clientId: ${workloadIdentityCredentialOptions.clientId} and federated token path: [REDACTED]`);
			this.client = new clientAssertionCredential_js_1.ClientAssertionCredential(tenantId, clientId, this.readFileContents.bind(this), options);
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options) {
			if (!this.client) {
				const errorMessage = `${credentialName}: is unavailable. tenantId, clientId, and federatedTokenFilePath are required parameters. 
      In DefaultAzureCredential and ManagedIdentityCredential, these can be provided as environment variables - 
      "AZURE_TENANT_ID",
      "AZURE_CLIENT_ID",
      "AZURE_FEDERATED_TOKEN_FILE". See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`;
				logger.info(errorMessage);
				throw new errors_js_1.CredentialUnavailableError(errorMessage);
			}
			logger.info("Invoking getToken() of Client Assertion Credential");
			return this.client.getToken(scopes, options);
		}
		async readFileContents() {
			if (this.cacheDate !== void 0 && Date.now() - this.cacheDate >= 3e5) this.azureFederatedTokenFileContent = void 0;
			if (!this.federatedTokenFilePath) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. Invalid file path provided ${this.federatedTokenFilePath}.`);
			if (!this.azureFederatedTokenFileContent) {
				const value = (await (0, promises_1$2.readFile)(this.federatedTokenFilePath, "utf8")).trim();
				if (!value) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. No content on the file ${this.federatedTokenFilePath}.`);
				else {
					this.azureFederatedTokenFileContent = value;
					this.cacheDate = Date.now();
				}
			}
			return this.azureFederatedTokenFileContent;
		}
	};
	exports.WorkloadIdentityCredential = WorkloadIdentityCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/managedIdentityCredential/tokenExchangeMsi.js
var require_tokenExchangeMsi = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.tokenExchangeMsi = void 0;
	var workloadIdentityCredential_js_1 = require_workloadIdentityCredential();
	var logging_js_1 = require_logging();
	var msiName = "ManagedIdentityCredential - Token Exchange";
	var logger = (0, logging_js_1.credentialLogger)(msiName);
	/**
	* Defines how to determine whether the token exchange MSI is available, and also how to retrieve a token from the token exchange MSI.
	*
	* Token exchange MSI (used by AKS) is the only MSI implementation handled entirely by Azure Identity.
	* The rest have been migrated to MSAL.
	*/
	exports.tokenExchangeMsi = {
		name: "tokenExchangeMsi",
		async isAvailable(clientId) {
			const env = process.env;
			const result = Boolean((clientId || env.AZURE_CLIENT_ID) && env.AZURE_TENANT_ID && process.env.AZURE_FEDERATED_TOKEN_FILE);
			if (!result) logger.info(`${msiName}: Unavailable. The environment variables needed are: AZURE_CLIENT_ID (or the client ID sent through the parameters), AZURE_TENANT_ID and AZURE_FEDERATED_TOKEN_FILE`);
			return result;
		},
		async getToken(configuration, getTokenOptions = {}) {
			const { scopes, clientId } = configuration;
			return new workloadIdentityCredential_js_1.WorkloadIdentityCredential({
				clientId,
				tenantId: process.env.AZURE_TENANT_ID,
				tokenFilePath: process.env.AZURE_FEDERATED_TOKEN_FILE,
				disableInstanceDiscovery: true
			}).getToken(scopes, getTokenOptions);
		}
	};
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/managedIdentityCredential/index.js
var require_managedIdentityCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ManagedIdentityCredential = void 0;
	var logger_1 = require_commonjs$1();
	var msal_node_1 = require_msal_node();
	var identityClient_js_1 = require_identityClient();
	var errors_js_1 = require_errors();
	var utils_js_1 = require_utils$1();
	var imdsRetryPolicy_js_1 = require_imdsRetryPolicy();
	var logging_js_1 = require_logging();
	var tracing_js_1 = require_tracing();
	var imdsMsi_js_1 = require_imdsMsi();
	var tokenExchangeMsi_js_1 = require_tokenExchangeMsi();
	var utils_js_2 = require_utils();
	var logger = (0, logging_js_1.credentialLogger)("ManagedIdentityCredential");
	/**
	* Attempts authentication using a managed identity available at the deployment environment.
	* This authentication type works in Azure VMs, App Service instances, Azure Functions applications,
	* Azure Kubernetes Services, Azure Service Fabric instances and inside of the Azure Cloud Shell.
	*
	* More information about configuring managed identities can be found here:
	* https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview
	*/
	var ManagedIdentityCredential = class {
		managedIdentityApp;
		identityClient;
		clientId;
		resourceId;
		objectId;
		msiRetryConfig = {
			maxRetries: 5,
			startDelayInMs: 800,
			intervalIncrement: 2
		};
		isAvailableIdentityClient;
		sendProbeRequest;
		/**
		* @internal
		* @hidden
		*/
		constructor(clientIdOrOptions, options) {
			let _options;
			if (typeof clientIdOrOptions === "string") {
				this.clientId = clientIdOrOptions;
				_options = options ?? {};
			} else {
				this.clientId = clientIdOrOptions?.clientId;
				_options = clientIdOrOptions ?? {};
			}
			this.resourceId = _options?.resourceId;
			this.objectId = _options?.objectId;
			this.sendProbeRequest = _options?.sendProbeRequest ?? false;
			const providedIds = [
				{
					key: "clientId",
					value: this.clientId
				},
				{
					key: "resourceId",
					value: this.resourceId
				},
				{
					key: "objectId",
					value: this.objectId
				}
			].filter((id) => id.value);
			if (providedIds.length > 1) throw new Error(`ManagedIdentityCredential: only one of 'clientId', 'resourceId', or 'objectId' can be provided. Received values: ${JSON.stringify({
				clientId: this.clientId,
				resourceId: this.resourceId,
				objectId: this.objectId
			})}`);
			_options.allowInsecureConnection = true;
			if (_options.retryOptions?.maxRetries !== void 0) this.msiRetryConfig.maxRetries = _options.retryOptions.maxRetries;
			this.identityClient = new identityClient_js_1.IdentityClient({
				..._options,
				additionalPolicies: [{
					policy: (0, imdsRetryPolicy_js_1.imdsRetryPolicy)(this.msiRetryConfig),
					position: "perCall"
				}]
			});
			this.managedIdentityApp = new msal_node_1.ManagedIdentityApplication({
				managedIdentityIdParams: {
					userAssignedClientId: this.clientId,
					userAssignedResourceId: this.resourceId,
					userAssignedObjectId: this.objectId
				},
				system: {
					disableInternalRetries: true,
					networkClient: this.identityClient,
					loggerOptions: {
						logLevel: (0, utils_js_1.getMSALLogLevel)((0, logger_1.getLogLevel)()),
						piiLoggingEnabled: _options.loggingOptions?.enableUnsafeSupportLogging,
						loggerCallback: (0, utils_js_1.defaultLoggerCallback)(logger)
					}
				}
			});
			this.isAvailableIdentityClient = new identityClient_js_1.IdentityClient({
				..._options,
				retryOptions: { maxRetries: 0 }
			});
			const managedIdentitySource = this.managedIdentityApp.getManagedIdentitySource();
			if (managedIdentitySource === "CloudShell") {
				if (this.clientId || this.resourceId || this.objectId) {
					logger.warning(`CloudShell MSI detected with user-provided IDs - throwing. Received values: ${JSON.stringify({
						clientId: this.clientId,
						resourceId: this.resourceId,
						objectId: this.objectId
					})}.`);
					throw new errors_js_1.CredentialUnavailableError("ManagedIdentityCredential: Specifying a user-assigned managed identity is not supported for CloudShell at runtime. When using Managed Identity in CloudShell, omit the clientId, resourceId, and objectId parameters.");
				}
			}
			if (managedIdentitySource === "ServiceFabric") {
				if (this.clientId || this.resourceId || this.objectId) {
					logger.warning(`Service Fabric detected with user-provided IDs - throwing. Received values: ${JSON.stringify({
						clientId: this.clientId,
						resourceId: this.resourceId,
						objectId: this.objectId
					})}.`);
					throw new errors_js_1.CredentialUnavailableError(`ManagedIdentityCredential: ${utils_js_2.serviceFabricErrorMessage}`);
				}
			}
			logger.info(`Using ${managedIdentitySource} managed identity.`);
			if (providedIds.length === 1) {
				const { key, value } = providedIds[0];
				logger.info(`${managedIdentitySource} with ${key}: ${value}`);
			}
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		* If an unexpected error occurs, an {@link AuthenticationError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			logger.getToken.info("Using the MSAL provider for Managed Identity.");
			const resource = (0, utils_js_2.mapScopesToResource)(scopes);
			if (!resource) throw new errors_js_1.CredentialUnavailableError(`ManagedIdentityCredential: Multiple scopes are not supported. Scopes: ${JSON.stringify(scopes)}`);
			return tracing_js_1.tracingClient.withSpan("ManagedIdentityCredential.getToken", options, async () => {
				try {
					const isTokenExchangeMsi = await tokenExchangeMsi_js_1.tokenExchangeMsi.isAvailable(this.clientId);
					const identitySource = this.managedIdentityApp.getManagedIdentitySource();
					const isImdsMsi = identitySource === "DefaultToImds" || identitySource === "Imds";
					logger.getToken.info(`MSAL Identity source: ${identitySource}`);
					if (isTokenExchangeMsi) {
						logger.getToken.info("Using the token exchange managed identity.");
						const result = await tokenExchangeMsi_js_1.tokenExchangeMsi.getToken({
							scopes,
							clientId: this.clientId,
							identityClient: this.identityClient,
							retryConfig: this.msiRetryConfig,
							resourceId: this.resourceId
						});
						if (result === null) throw new errors_js_1.CredentialUnavailableError("Attempted to use the token exchange managed identity, but received a null response.");
						return result;
					} else if (isImdsMsi && this.sendProbeRequest) {
						logger.getToken.info("Using the IMDS endpoint to probe for availability.");
						if (!await imdsMsi_js_1.imdsMsi.isAvailable({
							scopes,
							clientId: this.clientId,
							getTokenOptions: options,
							identityClient: this.isAvailableIdentityClient,
							resourceId: this.resourceId
						})) throw new errors_js_1.CredentialUnavailableError(`Attempted to use the IMDS endpoint, but it is not available.`);
					}
					logger.getToken.info("Calling into MSAL for managed identity token.");
					const token = await this.managedIdentityApp.acquireToken({ resource });
					this.ensureValidMsalToken(scopes, token, options);
					logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
					return {
						expiresOnTimestamp: token.expiresOn.getTime(),
						token: token.accessToken,
						refreshAfterTimestamp: token.refreshOn?.getTime(),
						tokenType: "Bearer"
					};
				} catch (err) {
					logger.getToken.error((0, logging_js_1.formatError)(scopes, err));
					if (err.name === "AuthenticationRequiredError") throw err;
					if (isNetworkError(err)) throw new errors_js_1.CredentialUnavailableError(`ManagedIdentityCredential: Network unreachable. Message: ${err.message}`, { cause: err });
					throw new errors_js_1.CredentialUnavailableError(`ManagedIdentityCredential: Authentication failed. Message ${err.message}`, { cause: err });
				}
			});
		}
		/**
		* Ensures the validity of the MSAL token
		*/
		ensureValidMsalToken(scopes, msalToken, getTokenOptions) {
			const createError = (message) => {
				logger.getToken.info(message);
				return new errors_js_1.AuthenticationRequiredError({
					scopes: Array.isArray(scopes) ? scopes : [scopes],
					getTokenOptions,
					message
				});
			};
			if (!msalToken) throw createError("No response.");
			if (!msalToken.expiresOn) throw createError(`Response had no "expiresOn" property.`);
			if (!msalToken.accessToken) throw createError(`Response had no "accessToken" property.`);
		}
	};
	exports.ManagedIdentityCredential = ManagedIdentityCredential;
	function isNetworkError(err) {
		if (err.errorCode === "network_error") return true;
		if (err.code === "ENETUNREACH" || err.code === "EHOSTUNREACH") return true;
		if (err.statusCode === 403 || err.code === 403) {
			if (err.message.includes("unreachable")) return true;
		}
		return false;
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/azureDeveloperCliCredential.js
var require_azureDeveloperCliCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.AzureDeveloperCliCredential = exports.developerCliCredentialInternals = exports.azureDeveloperCliPublicErrorMessages = void 0;
	var tslib_1$1 = __require("tslib");
	var logging_js_1 = require_logging();
	var errors_js_1 = require_errors();
	var child_process_1$1 = tslib_1$1.__importDefault(__require("child_process"));
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var tracing_js_1 = require_tracing();
	var scopeUtils_js_1 = require_scopeUtils();
	var logger = (0, logging_js_1.credentialLogger)("AzureDeveloperCliCredential");
	/**
	* Messages to use when throwing in this credential.
	* @internal
	*/
	exports.azureDeveloperCliPublicErrorMessages = {
		notInstalled: "Azure Developer CLI couldn't be found. To mitigate this issue, see the troubleshooting guidelines at https://aka.ms/azsdk/js/identity/azdevclicredential/troubleshoot.",
		login: "Please run 'azd auth login' from a command prompt to authenticate before using this credential. For more information, see the troubleshooting guidelines at https://aka.ms/azsdk/js/identity/azdevclicredential/troubleshoot.",
		unknown: "Unknown error while trying to retrieve the access token",
		claim: "This credential doesn't support claims challenges. To authenticate with the required claims, please run the following command:"
	};
	/**
	* Mockable reference to the Developer CLI credential cliCredentialFunctions
	* @internal
	*/
	exports.developerCliCredentialInternals = {
		/**
		* @internal
		*/
		getSafeWorkingDir() {
			if (process.platform === "win32") {
				let systemRoot = process.env.SystemRoot || process.env["SYSTEMROOT"];
				if (!systemRoot) {
					logger.getToken.warning("The SystemRoot environment variable is not set. This may cause issues when using the Azure Developer CLI credential.");
					systemRoot = "C:\\Windows";
				}
				return systemRoot;
			} else return "/bin";
		},
		/**
		* Gets the access token from Azure Developer CLI
		* @param scopes - The scopes to use when getting the token
		* @internal
		*/
		async getAzdAccessToken(scopes, tenantId, timeout, claims) {
			let tenantSection = [];
			if (tenantId) tenantSection = ["--tenant-id", tenantId];
			let claimsSections = [];
			if (claims) claimsSections = ["--claims", btoa(claims)];
			return new Promise((resolve, reject) => {
				try {
					const command = ["azd", ...[
						"auth",
						"token",
						"--output",
						"json",
						"--no-prompt",
						...scopes.reduce((previous, current) => previous.concat("--scope", current), []),
						...tenantSection,
						...claimsSections
					]].join(" ");
					child_process_1$1.default.exec(command, {
						cwd: exports.developerCliCredentialInternals.getSafeWorkingDir(),
						timeout
					}, (error, stdout, stderr) => {
						resolve({
							stdout,
							stderr,
							error
						});
					});
				} catch (err) {
					reject(err);
				}
			});
		}
	};
	/**
	* Azure Developer CLI is a command-line interface tool that allows developers to create, manage, and deploy
	* resources in Azure. It's built on top of the Azure CLI and provides additional functionality specific
	* to Azure developers. It allows users to authenticate as a user and/or a service principal against
	* <a href="https://learn.microsoft.com/entra/fundamentals/">Microsoft Entra ID</a>. The
	* AzureDeveloperCliCredential authenticates in a development environment and acquires a token on behalf of
	* the logged-in user or service principal in the Azure Developer CLI. It acts as the Azure Developer CLI logged in user or
	* service principal and executes an Azure CLI command underneath to authenticate the application against
	* Microsoft Entra ID.
	*
	* <h2> Configure AzureDeveloperCliCredential </h2>
	*
	* To use this credential, the developer needs to authenticate locally in Azure Developer CLI using one of the
	* commands below:
	*
	* <ol>
	*     <li>Run "azd auth login" in Azure Developer CLI to authenticate interactively as a user.</li>
	*     <li>Run "azd auth login --client-id clientID --client-secret clientSecret
	*     --tenant-id tenantID" to authenticate as a service principal.</li>
	* </ol>
	*
	* You may need to repeat this process after a certain time period, depending on the refresh token validity in your
	* organization. Generally, the refresh token validity period is a few weeks to a few months.
	* AzureDeveloperCliCredential will prompt you to sign in again.
	*/
	var AzureDeveloperCliCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		timeout;
		/**
		* Creates an instance of the {@link AzureDeveloperCliCredential}.
		*
		* To use this credential, ensure that you have already logged
		* in via the 'azd' tool using the command "azd auth login" from the commandline.
		*
		* @param options - Options, to optionally allow multi-tenant requests.
		*/
		constructor(options) {
			if (options?.tenantId) {
				(0, tenantIdUtils_js_1.checkTenantId)(logger, options?.tenantId);
				this.tenantId = options?.tenantId;
			}
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			this.timeout = options?.processTimeoutInMs;
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			const tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, options, this.additionallyAllowedTenantIds);
			if (tenantId) (0, tenantIdUtils_js_1.checkTenantId)(logger, tenantId);
			let scopeList;
			if (typeof scopes === "string") scopeList = [scopes];
			else scopeList = scopes;
			logger.getToken.info(`Using the scopes ${scopes}`);
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async () => {
				try {
					scopeList.forEach((scope) => {
						(0, scopeUtils_js_1.ensureValidScopeForDevTimeCreds)(scope, logger);
					});
					const obj = await exports.developerCliCredentialInternals.getAzdAccessToken(scopeList, tenantId, this.timeout, options.claims);
					const isMFARequiredError = obj.stderr?.match("must use multi-factor authentication") || obj.stderr?.match("reauthentication required");
					const isNotLoggedInError = obj.stderr?.match("not logged in, run `azd login` to login") || obj.stderr?.match("not logged in, run `azd auth login` to login");
					if (obj.stderr?.match("azd:(.*)not found") || obj.stderr?.startsWith("'azd' is not recognized") || obj.error && obj.error.code === "ENOENT") {
						const error = new errors_js_1.CredentialUnavailableError(exports.azureDeveloperCliPublicErrorMessages.notInstalled);
						logger.getToken.info((0, logging_js_1.formatError)(scopes, error));
						throw error;
					}
					if (isNotLoggedInError) {
						const error = new errors_js_1.CredentialUnavailableError(exports.azureDeveloperCliPublicErrorMessages.login);
						logger.getToken.info((0, logging_js_1.formatError)(scopes, error));
						throw error;
					}
					if (isMFARequiredError) {
						const loginCmd = `azd auth login ${scopeList.reduce((previous, current) => previous.concat("--scope", current), []).join(" ")}`;
						const error = new errors_js_1.CredentialUnavailableError(`${exports.azureDeveloperCliPublicErrorMessages.claim} ${loginCmd}`);
						logger.getToken.info((0, logging_js_1.formatError)(scopes, error));
						throw error;
					}
					try {
						const resp = JSON.parse(obj.stdout);
						logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
						return {
							token: resp.token,
							expiresOnTimestamp: new Date(resp.expiresOn).getTime(),
							tokenType: "Bearer"
						};
					} catch (e) {
						if (obj.stderr) throw new errors_js_1.CredentialUnavailableError(obj.stderr);
						throw e;
					}
				} catch (err) {
					const error = err.name === "CredentialUnavailableError" ? err : new errors_js_1.CredentialUnavailableError(err.message || exports.azureDeveloperCliPublicErrorMessages.unknown);
					logger.getToken.info((0, logging_js_1.formatError)(scopes, error));
					throw error;
				}
			});
		}
	};
	exports.AzureDeveloperCliCredential = AzureDeveloperCliCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/util/subscriptionUtils.js
var require_subscriptionUtils = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.checkSubscription = checkSubscription;
	var logging_js_1 = require_logging();
	/**
	* @internal
	*/
	function checkSubscription(logger, subscription) {
		if (!subscription.match(/^[0-9a-zA-Z-._ ]+$/)) {
			const error = /* @__PURE__ */ new Error(`Subscription '${subscription}' contains invalid characters. If this is the name of a subscription, use its ID instead. You can locate your subscription by following the instructions listed here: https://learn.microsoft.com/azure/azure-portal/get-subscription-tenant-id`);
			logger.info((0, logging_js_1.formatError)("", error));
			throw error;
		}
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/azureCliCredential.js
var require_azureCliCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.AzureCliCredential = exports.cliCredentialInternals = exports.azureCliPublicErrorMessages = void 0;
	var tslib_1 = __require("tslib");
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var logging_js_1 = require_logging();
	var scopeUtils_js_1 = require_scopeUtils();
	var errors_js_1 = require_errors();
	var child_process_1 = tslib_1.__importDefault(__require("child_process"));
	var tracing_js_1 = require_tracing();
	var subscriptionUtils_js_1 = require_subscriptionUtils();
	var logger = (0, logging_js_1.credentialLogger)("AzureCliCredential");
	/**
	* Messages to use when throwing in this credential.
	* @internal
	*/
	exports.azureCliPublicErrorMessages = {
		claim: "This credential doesn't support claims challenges. To authenticate with the required claims, please run the following command:",
		notInstalled: "Azure CLI could not be found. Please visit https://aka.ms/azure-cli for installation instructions and then, once installed, authenticate to your Azure account using 'az login'.",
		login: "Please run 'az login' from a command prompt to authenticate before using this credential.",
		unknown: "Unknown error while trying to retrieve the access token",
		unexpectedResponse: "Unexpected response from Azure CLI when getting token. Expected \"expiresOn\" to be a RFC3339 date string. Got:"
	};
	/**
	* Mockable reference to the CLI credential cliCredentialFunctions
	* @internal
	*/
	exports.cliCredentialInternals = {
		/**
		* @internal
		*/
		getSafeWorkingDir() {
			if (process.platform === "win32") {
				let systemRoot = process.env.SystemRoot || process.env["SYSTEMROOT"];
				if (!systemRoot) {
					logger.getToken.warning("The SystemRoot environment variable is not set. This may cause issues when using the Azure CLI credential.");
					systemRoot = "C:\\Windows";
				}
				return systemRoot;
			} else return "/bin";
		},
		/**
		* Gets the access token from Azure CLI
		* @param resource - The resource to use when getting the token
		* @internal
		*/
		async getAzureCliAccessToken(resource, tenantId, subscription, timeout) {
			let tenantSection = [];
			let subscriptionSection = [];
			if (tenantId) tenantSection = ["--tenant", tenantId];
			if (subscription) subscriptionSection = ["--subscription", `"${subscription}"`];
			return new Promise((resolve, reject) => {
				try {
					const command = ["az", ...[
						"account",
						"get-access-token",
						"--output",
						"json",
						"--resource",
						resource,
						...tenantSection,
						...subscriptionSection
					]].join(" ");
					child_process_1.default.exec(command, {
						cwd: exports.cliCredentialInternals.getSafeWorkingDir(),
						timeout
					}, (error, stdout, stderr) => {
						resolve({
							stdout,
							stderr,
							error
						});
					});
				} catch (err) {
					reject(err);
				}
			});
		}
	};
	/**
	* This credential will use the currently logged-in user login information
	* via the Azure CLI ('az') commandline tool.
	* To do so, it will read the user access token and expire time
	* with Azure CLI command "az account get-access-token".
	*/
	var AzureCliCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		timeout;
		subscription;
		/**
		* Creates an instance of the {@link AzureCliCredential}.
		*
		* To use this credential, ensure that you have already logged
		* in via the 'az' tool using the command "az login" from the commandline.
		*
		* @param options - Options, to optionally allow multi-tenant requests.
		*/
		constructor(options) {
			if (options?.tenantId) {
				(0, tenantIdUtils_js_1.checkTenantId)(logger, options?.tenantId);
				this.tenantId = options?.tenantId;
			}
			if (options?.subscription) {
				(0, subscriptionUtils_js_1.checkSubscription)(logger, options?.subscription);
				this.subscription = options?.subscription;
			}
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			this.timeout = options?.processTimeoutInMs;
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			const scope = typeof scopes === "string" ? scopes : scopes[0];
			const claimsValue = options.claims;
			if (claimsValue && claimsValue.trim()) {
				let loginCmd = `az login --claims-challenge ${btoa(claimsValue)} --scope ${scope}`;
				const tenantIdFromOptions = options.tenantId;
				if (tenantIdFromOptions) loginCmd += ` --tenant ${tenantIdFromOptions}`;
				const error = new errors_js_1.CredentialUnavailableError(`${exports.azureCliPublicErrorMessages.claim} ${loginCmd}`);
				logger.getToken.info((0, logging_js_1.formatError)(scope, error));
				throw error;
			}
			const tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, options, this.additionallyAllowedTenantIds);
			if (tenantId) (0, tenantIdUtils_js_1.checkTenantId)(logger, tenantId);
			if (this.subscription) (0, subscriptionUtils_js_1.checkSubscription)(logger, this.subscription);
			logger.getToken.info(`Using the scope ${scope}`);
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async () => {
				try {
					(0, scopeUtils_js_1.ensureValidScopeForDevTimeCreds)(scope, logger);
					const resource = (0, scopeUtils_js_1.getScopeResource)(scope);
					const obj = await exports.cliCredentialInternals.getAzureCliAccessToken(resource, tenantId, this.subscription, this.timeout);
					const specificScope = obj.stderr?.match("(.*)az login --scope(.*)");
					const isLoginError = obj.stderr?.match("(.*)az login(.*)") && !specificScope;
					if (obj.stderr?.match("az:(.*)not found") || obj.stderr?.startsWith("'az' is not recognized")) {
						const error = new errors_js_1.CredentialUnavailableError(exports.azureCliPublicErrorMessages.notInstalled);
						logger.getToken.info((0, logging_js_1.formatError)(scopes, error));
						throw error;
					}
					if (isLoginError) {
						const error = new errors_js_1.CredentialUnavailableError(exports.azureCliPublicErrorMessages.login);
						logger.getToken.info((0, logging_js_1.formatError)(scopes, error));
						throw error;
					}
					try {
						const responseData = obj.stdout;
						const response = this.parseRawResponse(responseData);
						logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
						return response;
					} catch (e) {
						if (obj.stderr) throw new errors_js_1.CredentialUnavailableError(obj.stderr);
						throw e;
					}
				} catch (err) {
					const error = err.name === "CredentialUnavailableError" ? err : new errors_js_1.CredentialUnavailableError(err.message || exports.azureCliPublicErrorMessages.unknown);
					logger.getToken.info((0, logging_js_1.formatError)(scopes, error));
					throw error;
				}
			});
		}
		/**
		* Parses the raw JSON response from the Azure CLI into a usable AccessToken object
		*
		* @param rawResponse - The raw JSON response from the Azure CLI
		* @returns An access token with the expiry time parsed from the raw response
		*
		* The expiryTime of the credential's access token, in milliseconds, is calculated as follows:
		*
		* When available, expires_on (introduced in Azure CLI v2.54.0) will be preferred. Otherwise falls back to expiresOn.
		*/
		parseRawResponse(rawResponse) {
			const response = JSON.parse(rawResponse);
			const token = response.accessToken;
			let expiresOnTimestamp = Number.parseInt(response.expires_on, 10) * 1e3;
			if (!isNaN(expiresOnTimestamp)) {
				logger.getToken.info("expires_on is available and is valid, using it");
				return {
					token,
					expiresOnTimestamp,
					tokenType: "Bearer"
				};
			}
			expiresOnTimestamp = new Date(response.expiresOn).getTime();
			if (isNaN(expiresOnTimestamp)) throw new errors_js_1.CredentialUnavailableError(`${exports.azureCliPublicErrorMessages.unexpectedResponse} "${response.expiresOn}"`);
			return {
				token,
				expiresOnTimestamp,
				tokenType: "Bearer"
			};
		}
	};
	exports.AzureCliCredential = AzureCliCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/util/processUtils.js
var require_processUtils = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.processUtils = void 0;
	var node_child_process_1 = __require("tslib").__importDefault(__require("node:child_process"));
	/**
	* Easy to mock childProcess utils.
	* @internal
	*/
	exports.processUtils = { 
	/**
	* Promisifying childProcess.execFile
	* @internal
	*/
execFile(file, params, options) {
		return new Promise((resolve, reject) => {
			node_child_process_1.default.execFile(file, params, options, (error, stdout, stderr) => {
				if (Buffer.isBuffer(stdout)) stdout = stdout.toString("utf8");
				if (Buffer.isBuffer(stderr)) stderr = stderr.toString("utf8");
				if (stderr || error) reject(stderr ? new Error(stderr) : error);
				else resolve(stdout);
			});
		});
	} };
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/azurePowerShellCredential.js
var require_azurePowerShellCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.AzurePowerShellCredential = exports.commandStack = exports.powerShellPublicErrorMessages = exports.powerShellErrors = void 0;
	exports.formatCommand = formatCommand;
	exports.parseJsonToken = parseJsonToken;
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var logging_js_1 = require_logging();
	var scopeUtils_js_1 = require_scopeUtils();
	var errors_js_1 = require_errors();
	var processUtils_js_1 = require_processUtils();
	var tracing_js_1 = require_tracing();
	var logger = (0, logging_js_1.credentialLogger)("AzurePowerShellCredential");
	var isWindows = process.platform === "win32";
	/**
	* Returns a platform-appropriate command name by appending ".exe" on Windows.
	*
	* @internal
	*/
	function formatCommand(commandName) {
		if (isWindows) return `${commandName}.exe`;
		else return commandName;
	}
	/**
	* Receives a list of commands to run, executes them, then returns the outputs.
	* If anything fails, an error is thrown.
	* @internal
	*/
	async function runCommands(commands, timeout) {
		const results = [];
		for (const command of commands) {
			const [file, ...parameters] = command;
			const result = await processUtils_js_1.processUtils.execFile(file, parameters, {
				encoding: "utf8",
				timeout
			});
			results.push(result);
		}
		return results;
	}
	/**
	* Known PowerShell errors
	* @internal
	*/
	exports.powerShellErrors = {
		login: "Run Connect-AzAccount to login",
		installed: "The specified module 'Az.Accounts' with version '2.2.0' was not loaded because no valid module file was found in any module directory"
	};
	/**
	* Messages to use when throwing in this credential.
	* @internal
	*/
	exports.powerShellPublicErrorMessages = {
		login: "Please run 'Connect-AzAccount' from PowerShell to authenticate before using this credential.",
		installed: `The 'Az.Account' module >= 2.2.0 is not installed. Install the Azure Az PowerShell module with: "Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force".`,
		claim: "This credential doesn't support claims challenges. To authenticate with the required claims, please run the following command:",
		troubleshoot: `To troubleshoot, visit https://aka.ms/azsdk/js/identity/powershellcredential/troubleshoot.`
	};
	var isLoginError = (err) => err.message.match(`(.*)${exports.powerShellErrors.login}(.*)`);
	var isNotInstalledError = (err) => err.message.match(exports.powerShellErrors.installed);
	/**
	* The PowerShell commands to be tried, in order.
	*
	* @internal
	*/
	exports.commandStack = [formatCommand("pwsh")];
	if (isWindows) exports.commandStack.push(formatCommand("powershell"));
	/**
	* This credential will use the currently logged-in user information from the
	* Azure PowerShell module. To do so, it will read the user access token and
	* expire time with Azure PowerShell command `Get-AzAccessToken -ResourceUrl {ResourceScope}`
	*/
	var AzurePowerShellCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		timeout;
		/**
		* Creates an instance of the {@link AzurePowerShellCredential}.
		*
		* To use this credential:
		* - Install the Azure Az PowerShell module with:
		*   `Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force`.
		* - You have already logged in to Azure PowerShell using the command
		* `Connect-AzAccount` from the command line.
		*
		* @param options - Options, to optionally allow multi-tenant requests.
		*/
		constructor(options) {
			if (options?.tenantId) {
				(0, tenantIdUtils_js_1.checkTenantId)(logger, options?.tenantId);
				this.tenantId = options?.tenantId;
			}
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			this.timeout = options?.processTimeoutInMs;
		}
		/**
		* Gets the access token from Azure PowerShell
		* @param resource - The resource to use when getting the token
		*/
		async getAzurePowerShellAccessToken(resource, tenantId, timeout) {
			for (const powerShellCommand of [...exports.commandStack]) {
				try {
					await runCommands([[powerShellCommand, "/?"]], timeout);
				} catch (e) {
					exports.commandStack.shift();
					continue;
				}
				const result = (await runCommands([[
					powerShellCommand,
					"-NoProfile",
					"-NonInteractive",
					"-Command",
					`
          $tenantId = "${tenantId ?? ""}"
          $m = Import-Module Az.Accounts -MinimumVersion 2.2.0 -PassThru
          $useSecureString = $m.Version -ge [version]'2.17.0' -and $m.Version -lt [version]'5.0.0'

          $params = @{
            ResourceUrl = "${resource}"
          }

          if ($tenantId.Length -gt 0) {
            $params["TenantId"] = $tenantId
          }

          if ($useSecureString) {
            $params["AsSecureString"] = $true
          }

          $token = Get-AzAccessToken @params

          $result = New-Object -TypeName PSObject
          $result | Add-Member -MemberType NoteProperty -Name ExpiresOn -Value $token.ExpiresOn

          if ($token.Token -is [System.Security.SecureString]) {
            if ($PSVersionTable.PSVersion.Major -lt 7) {
              $ssPtr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token.Token)
              try {
                $result | Add-Member -MemberType NoteProperty -Name Token -Value ([System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ssPtr))
              }
              finally {
                [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ssPtr)
              }
            }
            else {
              $result | Add-Member -MemberType NoteProperty -Name Token -Value ($token.Token | ConvertFrom-SecureString -AsPlainText)
            }
          }
          else {
            $result | Add-Member -MemberType NoteProperty -Name Token -Value $token.Token
          }

          Write-Output (ConvertTo-Json $result)
          `
				]]))[0];
				return parseJsonToken(result);
			}
			throw new Error(`Unable to execute PowerShell. Ensure that it is installed in your system`);
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If the authentication cannot be performed through PowerShell, a {@link CredentialUnavailableError} will be thrown.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async () => {
				const scope = typeof scopes === "string" ? scopes : scopes[0];
				const claimsValue = options.claims;
				if (claimsValue && claimsValue.trim()) {
					let loginCmd = `Connect-AzAccount -ClaimsChallenge ${btoa(claimsValue)}`;
					const tenantIdFromOptions = options.tenantId;
					if (tenantIdFromOptions) loginCmd += ` -Tenant ${tenantIdFromOptions}`;
					const error = new errors_js_1.CredentialUnavailableError(`${exports.powerShellPublicErrorMessages.claim} ${loginCmd}`);
					logger.getToken.info((0, logging_js_1.formatError)(scope, error));
					throw error;
				}
				const tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, options, this.additionallyAllowedTenantIds);
				if (tenantId) (0, tenantIdUtils_js_1.checkTenantId)(logger, tenantId);
				try {
					(0, scopeUtils_js_1.ensureValidScopeForDevTimeCreds)(scope, logger);
					logger.getToken.info(`Using the scope ${scope}`);
					const resource = (0, scopeUtils_js_1.getScopeResource)(scope);
					const response = await this.getAzurePowerShellAccessToken(resource, tenantId, this.timeout);
					logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
					return {
						token: response.Token,
						expiresOnTimestamp: new Date(response.ExpiresOn).getTime(),
						tokenType: "Bearer"
					};
				} catch (err) {
					if (isNotInstalledError(err)) {
						const error = new errors_js_1.CredentialUnavailableError(exports.powerShellPublicErrorMessages.installed);
						logger.getToken.info((0, logging_js_1.formatError)(scope, error));
						throw error;
					} else if (isLoginError(err)) {
						const error = new errors_js_1.CredentialUnavailableError(exports.powerShellPublicErrorMessages.login);
						logger.getToken.info((0, logging_js_1.formatError)(scope, error));
						throw error;
					}
					const error = new errors_js_1.CredentialUnavailableError(`${err}. ${exports.powerShellPublicErrorMessages.troubleshoot}`);
					logger.getToken.info((0, logging_js_1.formatError)(scope, error));
					throw error;
				}
			});
		}
	};
	exports.AzurePowerShellCredential = AzurePowerShellCredential;
	/**
	*
	* @internal
	*/
	async function parseJsonToken(result) {
		const matches = result.match(/{[^{}]*}/g);
		let resultWithoutToken = result;
		if (matches) try {
			for (const item of matches) try {
				const jsonContent = JSON.parse(item);
				if (jsonContent?.Token) {
					resultWithoutToken = resultWithoutToken.replace(item, "");
					if (resultWithoutToken) logger.getToken.warning(resultWithoutToken);
					return jsonContent;
				}
			} catch (e) {
				continue;
			}
		} catch (e) {
			throw new Error(`Unable to parse the output of PowerShell. Received output: ${result}`);
		}
		throw new Error(`No access token found in the output. Received output: ${result}`);
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/visualStudioCodeCredential.js
var require_visualStudioCodeCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.VisualStudioCodeCredential = void 0;
	var logging_js_1 = require_logging();
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var errors_js_1 = require_errors();
	var tenantIdUtils_js_2 = require_tenantIdUtils();
	var msalClient_js_1 = require_msalClient();
	var scopeUtils_js_1 = require_scopeUtils();
	var msalPlugins_js_1 = require_msalPlugins();
	var utils_js_1 = require_utils$1();
	var promises_1$1 = __require("node:fs/promises");
	var CommonTenantId = "common";
	var VSCodeClientId = "aebc6443-996d-45c2-90f0-388ff96faa56";
	var logger = (0, logging_js_1.credentialLogger)("VisualStudioCodeCredential");
	var unsupportedTenantIds = { adfs: "The VisualStudioCodeCredential does not support authentication with ADFS tenants." };
	function checkUnsupportedTenant(tenantId) {
		const unsupportedTenantError = unsupportedTenantIds[tenantId];
		if (unsupportedTenantError) throw new errors_js_1.CredentialUnavailableError(unsupportedTenantError);
	}
	/**
	* Connects to Azure using the user account signed in through the Azure Resources extension in Visual Studio Code.
	* Once the user has logged in via the extension, this credential can share the same refresh token
	* that is cached by the extension.
	*/
	var VisualStudioCodeCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		msalClient;
		options;
		/**
		* Creates an instance of VisualStudioCodeCredential to use for automatically authenticating via VSCode.
		*
		* **Note**: `VisualStudioCodeCredential` is provided by a plugin package:
		* `@azure/identity-vscode`. If this package is not installed, then authentication using
		* `VisualStudioCodeCredential` will not be available.
		*
		* @param options - Options for configuring the client which makes the authentication request.
		*/
		constructor(options) {
			this.options = options || {};
			if (options && options.tenantId) {
				(0, tenantIdUtils_js_2.checkTenantId)(logger, options.tenantId);
				this.tenantId = options.tenantId;
			} else this.tenantId = CommonTenantId;
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			checkUnsupportedTenant(this.tenantId);
		}
		/**
		* Runs preparations for any further getToken request:
		*   - Validates that the plugin is available.
		*   - Loads the authentication record from VSCode if available.
		*   - Creates the MSAL client with the loaded plugin and authentication record.
		*/
		async prepare(scopes) {
			const tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, this.options, this.additionallyAllowedTenantIds, logger) || this.tenantId;
			if (!(0, msalPlugins_js_1.hasVSCodePlugin)() || !msalPlugins_js_1.vsCodeAuthRecordPath) throw new errors_js_1.CredentialUnavailableError("Visual Studio Code Authentication is not available. Ensure you have have Azure Resources Extension installed in VS Code, signed into Azure via VS Code, installed the @azure/identity-vscode package, and properly configured the extension.");
			const authenticationRecord = await this.loadAuthRecord(msalPlugins_js_1.vsCodeAuthRecordPath, scopes);
			this.msalClient = (0, msalClient_js_1.createMsalClient)(VSCodeClientId, tenantId, {
				...this.options,
				isVSCodeCredential: true,
				brokerOptions: {
					enabled: true,
					parentWindowHandle: /* @__PURE__ */ new Uint8Array(0),
					useDefaultBrokerAccount: true
				},
				authenticationRecord
			});
		}
		/**
		* The promise of the single preparation that will be executed at the first getToken request for an instance of this class.
		*/
		preparePromise;
		/**
		* Runs preparations for any further getToken, but only once.
		*/
		prepareOnce(scopes) {
			if (!this.preparePromise) this.preparePromise = this.prepare(scopes);
			return this.preparePromise;
		}
		/**
		* Returns the token found by searching VSCode's authentication cache or
		* returns null if no token could be found.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                `TokenCredential` implementation might make.
		*/
		async getToken(scopes, options) {
			const scopeArray = (0, scopeUtils_js_1.ensureScopes)(scopes);
			await this.prepareOnce(scopeArray);
			if (!this.msalClient) throw new errors_js_1.CredentialUnavailableError("Visual Studio Code Authentication failed to initialize. Ensure you have have Azure Resources Extension installed in VS Code, signed into Azure via VS Code, installed the @azure/identity-vscode package, and properly configured the extension.");
			return this.msalClient.getTokenByInteractiveRequest(scopeArray, {
				...options,
				disableAutomaticAuthentication: true
			});
		}
		/**
		* Loads the authentication record from the specified path.
		* @param authRecordPath - The path to the authentication record file.
		* @param scopes - The list of scopes for which the token will have access.
		* @returns The authentication record or undefined if loading fails.
		*/
		async loadAuthRecord(authRecordPath, scopes) {
			try {
				const authRecordContent = await (0, promises_1$1.readFile)(authRecordPath, { encoding: "utf8" });
				return (0, utils_js_1.deserializeAuthenticationRecord)(authRecordContent);
			} catch (error) {
				logger.getToken.info((0, logging_js_1.formatError)(scopes, error));
				throw new errors_js_1.CredentialUnavailableError("Cannot load authentication record in Visual Studio Code. Ensure you have have Azure Resources Extension installed in VS Code, signed into Azure via VS Code, installed the @azure/identity-vscode package, and properly configured the extension.");
			}
		}
	};
	exports.VisualStudioCodeCredential = VisualStudioCodeCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/brokerCredential.js
var require_brokerCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.BrokerCredential = void 0;
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var logging_js_1 = require_logging();
	var scopeUtils_js_1 = require_scopeUtils();
	var tracing_js_1 = require_tracing();
	var msalClient_js_1 = require_msalClient();
	var constants_js_1 = require_constants$1();
	var errors_js_1 = require_errors();
	var logger = (0, logging_js_1.credentialLogger)("BrokerCredential");
	/**
	* Enables authentication to Microsoft Entra ID using WAM (Web Account Manager) broker.
	* This credential uses the default account logged into the OS via a broker.
	*/
	var BrokerCredential = class {
		brokerMsalClient;
		brokerTenantId;
		brokerAdditionallyAllowedTenantIds;
		/**
		* Creates an instance of BrokerCredential with the required broker options.
		*
		* This credential uses WAM (Web Account Manager) for authentication, which provides
		* better security and user experience on Windows platforms.
		*
		* @param options - Options for configuring the broker credential, including required broker options.
		*/
		constructor(options) {
			this.brokerTenantId = (0, tenantIdUtils_js_1.resolveTenantId)(logger, options.tenantId);
			this.brokerAdditionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			const msalClientOptions = {
				...options,
				tokenCredentialOptions: options,
				logger,
				brokerOptions: {
					enabled: true,
					parentWindowHandle: /* @__PURE__ */ new Uint8Array(0),
					useDefaultBrokerAccount: true
				}
			};
			this.brokerMsalClient = (0, msalClient_js_1.createMsalClient)(constants_js_1.DeveloperSignOnClientId, this.brokerTenantId, msalClientOptions);
		}
		/**
		* Authenticates with Microsoft Entra ID using WAM broker and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* This method extends the base getToken method to support silentAuthenticationOnly option
		* when using broker authentication.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure the token request, including silentAuthenticationOnly option.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
				newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.brokerTenantId, newOptions, this.brokerAdditionallyAllowedTenantIds, logger);
				const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
				try {
					return this.brokerMsalClient.getBrokeredToken(arrayScopes, true, {
						...newOptions,
						disableAutomaticAuthentication: true
					});
				} catch (e) {
					logger.getToken.info((0, logging_js_1.formatError)(arrayScopes, e));
					throw new errors_js_1.CredentialUnavailableError("Failed to acquire token using broker authentication", { cause: e });
				}
			});
		}
	};
	exports.BrokerCredential = BrokerCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/defaultAzureCredentialFunctions.js
var require_defaultAzureCredentialFunctions = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.createDefaultBrokerCredential = createDefaultBrokerCredential;
	exports.createDefaultVisualStudioCodeCredential = createDefaultVisualStudioCodeCredential;
	exports.createDefaultManagedIdentityCredential = createDefaultManagedIdentityCredential;
	exports.createDefaultWorkloadIdentityCredential = createDefaultWorkloadIdentityCredential;
	exports.createDefaultAzureDeveloperCliCredential = createDefaultAzureDeveloperCliCredential;
	exports.createDefaultAzureCliCredential = createDefaultAzureCliCredential;
	exports.createDefaultAzurePowershellCredential = createDefaultAzurePowershellCredential;
	exports.createDefaultEnvironmentCredential = createDefaultEnvironmentCredential;
	var environmentCredential_js_1 = require_environmentCredential();
	var index_js_1 = require_managedIdentityCredential();
	var workloadIdentityCredential_js_1 = require_workloadIdentityCredential();
	var azureDeveloperCliCredential_js_1 = require_azureDeveloperCliCredential();
	var azureCliCredential_js_1 = require_azureCliCredential();
	var azurePowerShellCredential_js_1 = require_azurePowerShellCredential();
	var visualStudioCodeCredential_js_1 = require_visualStudioCodeCredential();
	var brokerCredential_js_1 = require_brokerCredential();
	/**
	* Creates a {@link BrokerCredential} instance with the provided options.
	* This credential uses the Windows Authentication Manager (WAM) broker for authentication.
	* It will only attempt to authenticate silently using the default broker account
	*
	* @param options - Options for configuring the credential.
	*
	* @internal
	*/
	function createDefaultBrokerCredential(options = {}) {
		return new brokerCredential_js_1.BrokerCredential(options);
	}
	/**
	* Creates a {@link VisualStudioCodeCredential} from the provided options.
	* @param options - Options to configure the credential.
	*
	* @internal
	*/
	function createDefaultVisualStudioCodeCredential(options = {}) {
		return new visualStudioCodeCredential_js_1.VisualStudioCodeCredential(options);
	}
	/**
	* Creates a {@link ManagedIdentityCredential} from the provided options.
	* @param options - Options to configure the credential.
	*
	* @internal
	*/
	function createDefaultManagedIdentityCredential(options = {}) {
		options.retryOptions ??= {
			maxRetries: 5,
			retryDelayInMs: 800
		};
		options.sendProbeRequest ??= true;
		const managedIdentityClientId = options?.managedIdentityClientId ?? process.env.AZURE_CLIENT_ID;
		const workloadIdentityClientId = options?.workloadIdentityClientId ?? managedIdentityClientId;
		const managedResourceId = options?.managedIdentityResourceId;
		const workloadFile = process.env.AZURE_FEDERATED_TOKEN_FILE;
		const tenantId = options?.tenantId ?? process.env.AZURE_TENANT_ID;
		if (managedResourceId) {
			const managedIdentityResourceIdOptions = {
				...options,
				resourceId: managedResourceId
			};
			return new index_js_1.ManagedIdentityCredential(managedIdentityResourceIdOptions);
		}
		if (workloadFile && workloadIdentityClientId) {
			const workloadIdentityCredentialOptions = {
				...options,
				tenantId
			};
			return new index_js_1.ManagedIdentityCredential(workloadIdentityClientId, workloadIdentityCredentialOptions);
		}
		if (managedIdentityClientId) {
			const managedIdentityClientOptions = {
				...options,
				clientId: managedIdentityClientId
			};
			return new index_js_1.ManagedIdentityCredential(managedIdentityClientOptions);
		}
		return new index_js_1.ManagedIdentityCredential(options);
	}
	/**
	* Creates a {@link WorkloadIdentityCredential} from the provided options.
	* @param options - Options to configure the credential.
	*
	* @internal
	*/
	function createDefaultWorkloadIdentityCredential(options) {
		const managedIdentityClientId = options?.managedIdentityClientId ?? process.env.AZURE_CLIENT_ID;
		const workloadIdentityClientId = options?.workloadIdentityClientId ?? managedIdentityClientId;
		const workloadFile = process.env.AZURE_FEDERATED_TOKEN_FILE;
		const tenantId = options?.tenantId ?? process.env.AZURE_TENANT_ID;
		if (workloadFile && workloadIdentityClientId) {
			const workloadIdentityCredentialOptions = {
				...options,
				tenantId,
				clientId: workloadIdentityClientId,
				tokenFilePath: workloadFile
			};
			return new workloadIdentityCredential_js_1.WorkloadIdentityCredential(workloadIdentityCredentialOptions);
		}
		if (tenantId) {
			const workloadIdentityClientTenantOptions = {
				...options,
				tenantId
			};
			return new workloadIdentityCredential_js_1.WorkloadIdentityCredential(workloadIdentityClientTenantOptions);
		}
		return new workloadIdentityCredential_js_1.WorkloadIdentityCredential(options);
	}
	/**
	* Creates a {@link AzureDeveloperCliCredential} from the provided options.
	* @param options - Options to configure the credential.
	*
	* @internal
	*/
	function createDefaultAzureDeveloperCliCredential(options = {}) {
		return new azureDeveloperCliCredential_js_1.AzureDeveloperCliCredential(options);
	}
	/**
	* Creates a {@link AzureCliCredential} from the provided options.
	* @param options - Options to configure the credential.
	*
	* @internal
	*/
	function createDefaultAzureCliCredential(options = {}) {
		return new azureCliCredential_js_1.AzureCliCredential(options);
	}
	/**
	* Creates a {@link AzurePowerShellCredential} from the provided options.
	* @param options - Options to configure the credential.
	*
	* @internal
	*/
	function createDefaultAzurePowershellCredential(options = {}) {
		return new azurePowerShellCredential_js_1.AzurePowerShellCredential(options);
	}
	/**
	* Creates an {@link EnvironmentCredential} from the provided options.
	* @param options - Options to configure the credential.
	*
	* @internal
	*/
	function createDefaultEnvironmentCredential(options = {}) {
		return new environmentCredential_js_1.EnvironmentCredential(options);
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/defaultAzureCredential.js
var require_defaultAzureCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.DefaultAzureCredential = exports.UnavailableDefaultCredential = void 0;
	var chainedTokenCredential_js_1 = require_chainedTokenCredential();
	var logging_js_1 = require_logging();
	var defaultAzureCredentialFunctions_js_1 = require_defaultAzureCredentialFunctions();
	var logger = (0, logging_js_1.credentialLogger)("DefaultAzureCredential");
	/**
	* A no-op credential that logs the reason it was skipped if getToken is called.
	* @internal
	*/
	var UnavailableDefaultCredential = class {
		credentialUnavailableErrorMessage;
		credentialName;
		constructor(credentialName, message) {
			this.credentialName = credentialName;
			this.credentialUnavailableErrorMessage = message;
		}
		getToken() {
			logger.getToken.info(`Skipping ${this.credentialName}, reason: ${this.credentialUnavailableErrorMessage}`);
			return Promise.resolve(null);
		}
	};
	exports.UnavailableDefaultCredential = UnavailableDefaultCredential;
	/**
	* Provides a default {@link ChainedTokenCredential} configuration that works for most
	* applications that use Azure SDK client libraries. For more information, see
	* [DefaultAzureCredential overview](https://aka.ms/azsdk/js/identity/credential-chains#use-defaultazurecredential-for-flexibility).
	*
	* The following credential types will be tried, in order:
	*
	* - {@link EnvironmentCredential}
	* - {@link WorkloadIdentityCredential}
	* - {@link ManagedIdentityCredential}
	* - {@link VisualStudioCodeCredential}
	* - {@link AzureCliCredential}
	* - {@link AzurePowerShellCredential}
	* - {@link AzureDeveloperCliCredential}
	* - BrokerCredential (a broker-enabled credential that requires \@azure/identity-broker is installed)
	*
	* Consult the documentation of these credential types for more information
	* on how they attempt authentication.
	*
	* The following example demonstrates how to use the `requiredEnvVars` option to ensure that certain environment variables are set before the `DefaultAzureCredential` is instantiated.
	* If any of the specified environment variables are missing or empty, an error will be thrown, preventing the application from continuing execution without the necessary configuration.
	* It also demonstrates how to set the `AZURE_TOKEN_CREDENTIALS` environment variable to control which credentials are included in the chain.
	
	* ```ts snippet:defaultazurecredential_requiredEnvVars
	* import { DefaultAzureCredential } from "@azure/identity";
	*
	* const credential = new DefaultAzureCredential({
	*   requiredEnvVars: [
	*     "AZURE_CLIENT_ID",
	*     "AZURE_TENANT_ID",
	*     "AZURE_CLIENT_SECRET",
	*     "AZURE_TOKEN_CREDENTIALS",
	*   ],
	* });
	* ```
	*/
	var DefaultAzureCredential = class extends chainedTokenCredential_js_1.ChainedTokenCredential {
		constructor(options) {
			validateRequiredEnvVars(options);
			const azureTokenCredentials = process.env.AZURE_TOKEN_CREDENTIALS ? process.env.AZURE_TOKEN_CREDENTIALS.trim().toLowerCase() : void 0;
			const devCredentialFunctions = [
				defaultAzureCredentialFunctions_js_1.createDefaultVisualStudioCodeCredential,
				defaultAzureCredentialFunctions_js_1.createDefaultAzureCliCredential,
				defaultAzureCredentialFunctions_js_1.createDefaultAzurePowershellCredential,
				defaultAzureCredentialFunctions_js_1.createDefaultAzureDeveloperCliCredential,
				defaultAzureCredentialFunctions_js_1.createDefaultBrokerCredential
			];
			const prodCredentialFunctions = [
				defaultAzureCredentialFunctions_js_1.createDefaultEnvironmentCredential,
				defaultAzureCredentialFunctions_js_1.createDefaultWorkloadIdentityCredential,
				defaultAzureCredentialFunctions_js_1.createDefaultManagedIdentityCredential
			];
			let credentialFunctions = [];
			const validCredentialNames = "EnvironmentCredential, WorkloadIdentityCredential, ManagedIdentityCredential, VisualStudioCodeCredential, AzureCliCredential, AzurePowerShellCredential, AzureDeveloperCliCredential";
			if (azureTokenCredentials) switch (azureTokenCredentials) {
				case "dev":
					credentialFunctions = devCredentialFunctions;
					break;
				case "prod":
					credentialFunctions = prodCredentialFunctions;
					break;
				case "environmentcredential":
					credentialFunctions = [defaultAzureCredentialFunctions_js_1.createDefaultEnvironmentCredential];
					break;
				case "workloadidentitycredential":
					credentialFunctions = [defaultAzureCredentialFunctions_js_1.createDefaultWorkloadIdentityCredential];
					break;
				case "managedidentitycredential":
					credentialFunctions = [() => (0, defaultAzureCredentialFunctions_js_1.createDefaultManagedIdentityCredential)({ sendProbeRequest: false })];
					break;
				case "visualstudiocodecredential":
					credentialFunctions = [defaultAzureCredentialFunctions_js_1.createDefaultVisualStudioCodeCredential];
					break;
				case "azureclicredential":
					credentialFunctions = [defaultAzureCredentialFunctions_js_1.createDefaultAzureCliCredential];
					break;
				case "azurepowershellcredential":
					credentialFunctions = [defaultAzureCredentialFunctions_js_1.createDefaultAzurePowershellCredential];
					break;
				case "azuredeveloperclicredential":
					credentialFunctions = [defaultAzureCredentialFunctions_js_1.createDefaultAzureDeveloperCliCredential];
					break;
				default: {
					const errorMessage = `Invalid value for AZURE_TOKEN_CREDENTIALS = ${process.env.AZURE_TOKEN_CREDENTIALS}. Valid values are 'prod' or 'dev' or any of these credentials - ${validCredentialNames}.`;
					logger.warning(errorMessage);
					throw new Error(errorMessage);
				}
			}
			else credentialFunctions = [...prodCredentialFunctions, ...devCredentialFunctions];
			const credentials = credentialFunctions.map((createCredentialFn) => {
				try {
					return createCredentialFn(options ?? {});
				} catch (err) {
					logger.warning(`Skipped ${createCredentialFn.name} because of an error creating the credential: ${err}`);
					return new UnavailableDefaultCredential(createCredentialFn.name, err.message);
				}
			});
			super(...credentials);
		}
	};
	exports.DefaultAzureCredential = DefaultAzureCredential;
	/**
	* This function checks that all environment variables in `options.requiredEnvVars` are set and non-empty.
	* If any are missing or empty, it throws an error.
	*/
	function validateRequiredEnvVars(options) {
		if (options?.requiredEnvVars) {
			const missing = (Array.isArray(options.requiredEnvVars) ? options.requiredEnvVars : [options.requiredEnvVars]).filter((envVar) => !process.env[envVar]);
			if (missing.length > 0) {
				const errorMessage = `Required environment ${missing.length === 1 ? "variable" : "variables"} '${missing.join(", ")}' for DefaultAzureCredential ${missing.length === 1 ? "is" : "are"} not set or empty.`;
				logger.warning(errorMessage);
				throw new Error(errorMessage);
			}
		}
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/interactiveBrowserCredential.js
var require_interactiveBrowserCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.InteractiveBrowserCredential = void 0;
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var logging_js_1 = require_logging();
	var scopeUtils_js_1 = require_scopeUtils();
	var tracing_js_1 = require_tracing();
	var msalClient_js_1 = require_msalClient();
	var constants_js_1 = require_constants$1();
	var logger = (0, logging_js_1.credentialLogger)("InteractiveBrowserCredential");
	/**
	* Enables authentication to Microsoft Entra ID inside of the web browser
	* using the interactive login flow.
	*/
	var InteractiveBrowserCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		msalClient;
		disableAutomaticAuthentication;
		browserCustomizationOptions;
		loginHint;
		/**
		* Creates an instance of InteractiveBrowserCredential with the details needed.
		*
		* This credential uses the [Authorization Code Flow](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow).
		* On Node.js, it will open a browser window while it listens for a redirect response from the authentication service.
		* On browsers, it authenticates via popups. The `loginStyle` optional parameter can be set to `redirect` to authenticate by redirecting the user to an Azure secure login page, which then will redirect the user back to the web application where the authentication started.
		*
		* For Node.js, if a `clientId` is provided, the Microsoft Entra application will need to be configured to have a "Mobile and desktop applications" redirect endpoint.
		* Follow our guide on [setting up Redirect URIs for Desktop apps that calls to web APIs](https://learn.microsoft.com/entra/identity-platform/scenario-desktop-app-registration#redirect-uris).
		*
		* @param options - Options for configuring the client which makes the authentication requests.
		*/
		constructor(options) {
			this.tenantId = (0, tenantIdUtils_js_1.resolveTenantId)(logger, options.tenantId, options.clientId);
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			const msalClientOptions = {
				...options,
				tokenCredentialOptions: options,
				logger
			};
			const ibcNodeOptions = options;
			this.browserCustomizationOptions = ibcNodeOptions.browserCustomizationOptions;
			this.loginHint = ibcNodeOptions.loginHint;
			if (ibcNodeOptions?.brokerOptions?.enabled) if (!ibcNodeOptions?.brokerOptions?.parentWindowHandle) throw new Error("In order to do WAM authentication, `parentWindowHandle` under `brokerOptions` is a required parameter");
			else msalClientOptions.brokerOptions = {
				enabled: true,
				parentWindowHandle: ibcNodeOptions.brokerOptions.parentWindowHandle,
				legacyEnableMsaPassthrough: ibcNodeOptions.brokerOptions?.legacyEnableMsaPassthrough,
				useDefaultBrokerAccount: ibcNodeOptions.brokerOptions?.useDefaultBrokerAccount
			};
			this.msalClient = (0, msalClient_js_1.createMsalClient)(options.clientId ?? constants_js_1.DeveloperSignOnClientId, this.tenantId, msalClientOptions);
			this.disableAutomaticAuthentication = options?.disableAutomaticAuthentication;
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* If the user provided the option `disableAutomaticAuthentication`,
		* once the token can't be retrieved silently,
		* this method won't attempt to request user interaction to retrieve the token.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
				newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
				const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
				return this.msalClient.getTokenByInteractiveRequest(arrayScopes, {
					...newOptions,
					disableAutomaticAuthentication: this.disableAutomaticAuthentication,
					browserCustomizationOptions: this.browserCustomizationOptions,
					loginHint: this.loginHint
				});
			});
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* If the token can't be retrieved silently, this method will always generate a challenge for the user.
		*
		* On Node.js, this credential has [Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636) enabled by default.
		* PKCE is a security feature that mitigates authentication code interception attacks.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                  TokenCredential implementation might make.
		*/
		async authenticate(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.authenticate`, options, async (newOptions) => {
				const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
				await this.msalClient.getTokenByInteractiveRequest(arrayScopes, {
					...newOptions,
					disableAutomaticAuthentication: false,
					browserCustomizationOptions: this.browserCustomizationOptions,
					loginHint: this.loginHint
				});
				return this.msalClient.getActiveAccount();
			});
		}
	};
	exports.InteractiveBrowserCredential = InteractiveBrowserCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/deviceCodeCredential.js
var require_deviceCodeCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.DeviceCodeCredential = void 0;
	exports.defaultDeviceCodePromptCallback = defaultDeviceCodePromptCallback;
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var logging_js_1 = require_logging();
	var scopeUtils_js_1 = require_scopeUtils();
	var tracing_js_1 = require_tracing();
	var msalClient_js_1 = require_msalClient();
	var constants_js_1 = require_constants$1();
	var logger = (0, logging_js_1.credentialLogger)("DeviceCodeCredential");
	/**
	* Method that logs the user code from the DeviceCodeCredential.
	* @param deviceCodeInfo - The device code.
	*/
	function defaultDeviceCodePromptCallback(deviceCodeInfo) {
		console.log(deviceCodeInfo.message);
	}
	/**
	* Enables authentication to Microsoft Entra ID using a device code
	* that the user can enter into https://microsoft.com/devicelogin.
	*/
	var DeviceCodeCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		disableAutomaticAuthentication;
		msalClient;
		userPromptCallback;
		/**
		* Creates an instance of DeviceCodeCredential with the details needed
		* to initiate the device code authorization flow with Microsoft Entra ID.
		*
		* A message will be logged, giving users a code that they can use to authenticate once they go to https://microsoft.com/devicelogin
		*
		* Developers can configure how this message is shown by passing a custom `userPromptCallback`:
		*
		* ```ts snippet:device_code_credential_example
		* import { DeviceCodeCredential } from "@azure/identity";
		*
		* const credential = new DeviceCodeCredential({
		*   tenantId: process.env.AZURE_TENANT_ID,
		*   clientId: process.env.AZURE_CLIENT_ID,
		*   userPromptCallback: (info) => {
		*     console.log("CUSTOMIZED PROMPT CALLBACK", info.message);
		*   },
		* });
		* ```
		*
		* @param options - Options for configuring the client which makes the authentication requests.
		*/
		constructor(options) {
			this.tenantId = options?.tenantId;
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			const clientId = options?.clientId ?? constants_js_1.DeveloperSignOnClientId;
			const tenantId = (0, tenantIdUtils_js_1.resolveTenantId)(logger, options?.tenantId, clientId);
			this.userPromptCallback = options?.userPromptCallback ?? defaultDeviceCodePromptCallback;
			this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, tenantId, {
				...options,
				logger,
				tokenCredentialOptions: options || {}
			});
			this.disableAutomaticAuthentication = options?.disableAutomaticAuthentication;
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* If the user provided the option `disableAutomaticAuthentication`,
		* once the token can't be retrieved silently,
		* this method won't attempt to request user interaction to retrieve the token.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
				newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
				const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
				return this.msalClient.getTokenByDeviceCode(arrayScopes, this.userPromptCallback, {
					...newOptions,
					disableAutomaticAuthentication: this.disableAutomaticAuthentication
				});
			});
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* If the token can't be retrieved silently, this method will always generate a challenge for the user.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                  TokenCredential implementation might make.
		*/
		async authenticate(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.authenticate`, options, async (newOptions) => {
				const arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
				await this.msalClient.getTokenByDeviceCode(arrayScopes, this.userPromptCallback, {
					...newOptions,
					disableAutomaticAuthentication: false
				});
				return this.msalClient.getActiveAccount();
			});
		}
	};
	exports.DeviceCodeCredential = DeviceCodeCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/azurePipelinesCredential.js
var require_azurePipelinesCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.AzurePipelinesCredential = void 0;
	exports.handleOidcResponse = handleOidcResponse;
	var errors_js_1 = require_errors();
	var core_rest_pipeline_1 = require_commonjs$4();
	var clientAssertionCredential_js_1 = require_clientAssertionCredential();
	var identityClient_js_1 = require_identityClient();
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var logging_js_1 = require_logging();
	var credentialName = "AzurePipelinesCredential";
	var logger = (0, logging_js_1.credentialLogger)(credentialName);
	var OIDC_API_VERSION = "7.1";
	/**
	* This credential is designed to be used in Azure Pipelines with service connections
	* as a setup for workload identity federation.
	*/
	var AzurePipelinesCredential = class {
		clientAssertionCredential;
		identityClient;
		/**
		* AzurePipelinesCredential supports Federated Identity on Azure Pipelines through Service Connections.
		* @param tenantId - tenantId associated with the service connection
		* @param clientId - clientId associated with the service connection
		* @param serviceConnectionId - Unique ID for the service connection, as found in the querystring's resourceId key
		* @param systemAccessToken - The pipeline's <see href="https://learn.microsoft.com/azure/devops/pipelines/build/variables?view=azure-devops%26tabs=yaml#systemaccesstoken">System.AccessToken</see> value.
		* @param options - The identity client options to use for authentication.
		*/
		constructor(tenantId, clientId, serviceConnectionId, systemAccessToken, options = {}) {
			if (!clientId) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. clientId is a required parameter.`);
			if (!tenantId) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. tenantId is a required parameter.`);
			if (!serviceConnectionId) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. serviceConnectionId is a required parameter.`);
			if (!systemAccessToken) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. systemAccessToken is a required parameter.`);
			options.loggingOptions = {
				...options?.loggingOptions,
				additionalAllowedHeaderNames: [
					...options.loggingOptions?.additionalAllowedHeaderNames ?? [],
					"x-vss-e2eid",
					"x-msedge-ref"
				]
			};
			this.identityClient = new identityClient_js_1.IdentityClient(options);
			(0, tenantIdUtils_js_1.checkTenantId)(logger, tenantId);
			logger.info(`Invoking AzurePipelinesCredential with tenant ID: ${tenantId}, client ID: ${clientId}, and service connection ID: ${serviceConnectionId}`);
			if (!process.env.SYSTEM_OIDCREQUESTURI) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: is unavailable. Ensure that you're running this task in an Azure Pipeline, so that following missing system variable(s) can be defined- "SYSTEM_OIDCREQUESTURI"`);
			const oidcRequestUrl = `${process.env.SYSTEM_OIDCREQUESTURI}?api-version=${OIDC_API_VERSION}&serviceConnectionId=${serviceConnectionId}`;
			logger.info(`Invoking ClientAssertionCredential with tenant ID: ${tenantId}, client ID: ${clientId} and service connection ID: ${serviceConnectionId}`);
			this.clientAssertionCredential = new clientAssertionCredential_js_1.ClientAssertionCredential(tenantId, clientId, this.requestOidcToken.bind(this, oidcRequestUrl, systemAccessToken), options);
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} or {@link AuthenticationError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options) {
			if (!this.clientAssertionCredential) {
				const errorMessage = `${credentialName}: is unavailable. To use Federation Identity in Azure Pipelines, the following parameters are required - 
      tenantId,
      clientId,
      serviceConnectionId,
      systemAccessToken,
      "SYSTEM_OIDCREQUESTURI".      
      See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/azurepipelinescredential/troubleshoot`;
				logger.error(errorMessage);
				throw new errors_js_1.CredentialUnavailableError(errorMessage);
			}
			logger.info("Invoking getToken() of Client Assertion Credential");
			return this.clientAssertionCredential.getToken(scopes, options);
		}
		/**
		*
		* @param oidcRequestUrl - oidc request url
		* @param systemAccessToken - system access token
		* @returns OIDC token from Azure Pipelines
		*/
		async requestOidcToken(oidcRequestUrl, systemAccessToken) {
			logger.info("Requesting OIDC token from Azure Pipelines...");
			logger.info(oidcRequestUrl);
			const request = (0, core_rest_pipeline_1.createPipelineRequest)({
				url: oidcRequestUrl,
				method: "POST",
				headers: (0, core_rest_pipeline_1.createHttpHeaders)({
					"Content-Type": "application/json",
					Authorization: `Bearer ${systemAccessToken}`,
					"X-TFS-FedAuthRedirect": "Suppress"
				})
			});
			return handleOidcResponse(await this.identityClient.sendRequest(request));
		}
	};
	exports.AzurePipelinesCredential = AzurePipelinesCredential;
	function handleOidcResponse(response) {
		const text = response.bodyAsText;
		if (!text) {
			logger.error(`${credentialName}: Authentication Failed. Received null token from OIDC request. Response status- ${response.status}. Complete response - ${JSON.stringify(response)}`);
			throw new errors_js_1.AuthenticationError(response.status, {
				error: `${credentialName}: Authentication Failed. Received null token from OIDC request.`,
				error_description: `${JSON.stringify(response)}. See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/azurepipelinescredential/troubleshoot`
			});
		}
		try {
			const result = JSON.parse(text);
			if (result?.oidcToken) return result.oidcToken;
			else {
				const errorMessage = `${credentialName}: Authentication Failed. oidcToken field not detected in the response.`;
				let errorDescription = ``;
				if (response.status !== 200) errorDescription = `Response body = ${text}. Response Headers ["x-vss-e2eid"] = ${response.headers.get("x-vss-e2eid")} and ["x-msedge-ref"] = ${response.headers.get("x-msedge-ref")}. See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/azurepipelinescredential/troubleshoot`;
				logger.error(errorMessage);
				logger.error(errorDescription);
				throw new errors_js_1.AuthenticationError(response.status, {
					error: errorMessage,
					error_description: errorDescription
				});
			}
		} catch (e) {
			const errorDetails = `${credentialName}: Authentication Failed. oidcToken field not detected in the response.`;
			logger.error(`Response from service = ${text}, Response Headers ["x-vss-e2eid"] = ${response.headers.get("x-vss-e2eid")} 
      and ["x-msedge-ref"] = ${response.headers.get("x-msedge-ref")}, error message = ${e.message}`);
			logger.error(errorDetails);
			throw new errors_js_1.AuthenticationError(response.status, {
				error: errorDetails,
				error_description: `Response = ${text}. Response headers ["x-vss-e2eid"] = ${response.headers.get("x-vss-e2eid")} and ["x-msedge-ref"] =  ${response.headers.get("x-msedge-ref")}. See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/azurepipelinescredential/troubleshoot`
			});
		}
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/authorizationCodeCredential.js
var require_authorizationCodeCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.AuthorizationCodeCredential = void 0;
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var tenantIdUtils_js_2 = require_tenantIdUtils();
	var logging_js_1 = require_logging();
	var scopeUtils_js_1 = require_scopeUtils();
	var tracing_js_1 = require_tracing();
	var msalClient_js_1 = require_msalClient();
	var logger = (0, logging_js_1.credentialLogger)("AuthorizationCodeCredential");
	/**
	* Enables authentication to Microsoft Entra ID using an authorization code
	* that was obtained through the authorization code flow, described in more detail
	* in the Microsoft Entra ID documentation:
	*
	* https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
	*/
	var AuthorizationCodeCredential = class {
		msalClient;
		disableAutomaticAuthentication;
		authorizationCode;
		redirectUri;
		tenantId;
		additionallyAllowedTenantIds;
		clientSecret;
		/**
		* @hidden
		* @internal
		*/
		constructor(tenantId, clientId, clientSecretOrAuthorizationCode, authorizationCodeOrRedirectUri, redirectUriOrOptions, options) {
			(0, tenantIdUtils_js_2.checkTenantId)(logger, tenantId);
			this.clientSecret = clientSecretOrAuthorizationCode;
			if (typeof redirectUriOrOptions === "string") {
				this.authorizationCode = authorizationCodeOrRedirectUri;
				this.redirectUri = redirectUriOrOptions;
			} else {
				this.authorizationCode = clientSecretOrAuthorizationCode;
				this.redirectUri = authorizationCodeOrRedirectUri;
				this.clientSecret = void 0;
				options = redirectUriOrOptions;
			}
			this.tenantId = tenantId;
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
			this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, tenantId, {
				...options,
				logger,
				tokenCredentialOptions: options ?? {}
			});
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure any requests this
		*                TokenCredential implementation might make.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
				newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds);
				const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
				return this.msalClient.getTokenByAuthorizationCode(arrayScopes, this.redirectUri, this.authorizationCode, this.clientSecret, {
					...newOptions,
					disableAutomaticAuthentication: this.disableAutomaticAuthentication
				});
			});
		}
	};
	exports.AuthorizationCodeCredential = AuthorizationCodeCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/credentials/onBehalfOfCredential.js
var require_onBehalfOfCredential = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.OnBehalfOfCredential = void 0;
	var msalClient_js_1 = require_msalClient();
	var logging_js_1 = require_logging();
	var tenantIdUtils_js_1 = require_tenantIdUtils();
	var errors_js_1 = require_errors();
	var node_crypto_1 = __require("node:crypto");
	var scopeUtils_js_1 = require_scopeUtils();
	var promises_1 = __require("node:fs/promises");
	var tracing_js_1 = require_tracing();
	var credentialName = "OnBehalfOfCredential";
	var logger = (0, logging_js_1.credentialLogger)(credentialName);
	/**
	* Enables authentication to Microsoft Entra ID using the [On Behalf Of flow](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-on-behalf-of-flow).
	*/
	var OnBehalfOfCredential = class {
		tenantId;
		additionallyAllowedTenantIds;
		msalClient;
		sendCertificateChain;
		certificatePath;
		clientSecret;
		userAssertionToken;
		clientAssertion;
		constructor(options) {
			const { clientSecret } = options;
			const { certificatePath, sendCertificateChain } = options;
			const { getAssertion } = options;
			const { tenantId, clientId, userAssertionToken, additionallyAllowedTenants: additionallyAllowedTenantIds } = options;
			if (!tenantId) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
			if (!clientId) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
			if (!clientSecret && !certificatePath && !getAssertion) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: You must provide one of clientSecret, certificatePath, or a getAssertion callback but none were provided. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
			if (!userAssertionToken) throw new errors_js_1.CredentialUnavailableError(`${credentialName}: userAssertionToken is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`);
			this.certificatePath = certificatePath;
			this.clientSecret = clientSecret;
			this.userAssertionToken = userAssertionToken;
			this.sendCertificateChain = sendCertificateChain;
			this.clientAssertion = getAssertion;
			this.tenantId = tenantId;
			this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(additionallyAllowedTenantIds);
			this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, this.tenantId, {
				...options,
				logger,
				tokenCredentialOptions: options
			});
		}
		/**
		* Authenticates with Microsoft Entra ID and returns an access token if successful.
		* If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
		*
		* @param scopes - The list of scopes for which the token will have access.
		* @param options - The options used to configure the underlying network requests.
		*/
		async getToken(scopes, options = {}) {
			return tracing_js_1.tracingClient.withSpan(`${credentialName}.getToken`, options, async (newOptions) => {
				newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
				const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
				if (this.certificatePath) {
					const clientCertificate = await this.buildClientCertificate(this.certificatePath);
					return this.msalClient.getTokenOnBehalfOf(arrayScopes, this.userAssertionToken, clientCertificate, newOptions);
				} else if (this.clientSecret) return this.msalClient.getTokenOnBehalfOf(arrayScopes, this.userAssertionToken, this.clientSecret, options);
				else if (this.clientAssertion) return this.msalClient.getTokenOnBehalfOf(arrayScopes, this.userAssertionToken, this.clientAssertion, options);
				else throw new Error("Expected either clientSecret or certificatePath or clientAssertion to be defined.");
			});
		}
		async buildClientCertificate(certificatePath) {
			try {
				const parts = await this.parseCertificate({ certificatePath }, this.sendCertificateChain);
				return {
					thumbprint: parts.thumbprint,
					thumbprintSha256: parts.thumbprintSha256,
					privateKey: parts.certificateContents,
					x5c: parts.x5c
				};
			} catch (error) {
				logger.info((0, logging_js_1.formatError)("", error));
				throw error;
			}
		}
		async parseCertificate(configuration, sendCertificateChain) {
			const certificatePath = configuration.certificatePath;
			const certificateContents = await (0, promises_1.readFile)(certificatePath, "utf8");
			const x5c = sendCertificateChain ? certificateContents : void 0;
			const certificatePattern = /(-+BEGIN CERTIFICATE-+)(\n\r?|\r\n?)([A-Za-z0-9+/\n\r]+=*)(\n\r?|\r\n?)(-+END CERTIFICATE-+)/g;
			const publicKeys = [];
			let match;
			do {
				match = certificatePattern.exec(certificateContents);
				if (match) publicKeys.push(match[3]);
			} while (match);
			if (publicKeys.length === 0) throw new Error("The file at the specified path does not contain a PEM-encoded certificate.");
			const thumbprint = (0, node_crypto_1.createHash)("sha1").update(Buffer.from(publicKeys[0], "base64")).digest("hex").toUpperCase();
			return {
				certificateContents,
				thumbprintSha256: (0, node_crypto_1.createHash)("sha256").update(Buffer.from(publicKeys[0], "base64")).digest("hex").toUpperCase(),
				thumbprint,
				x5c
			};
		}
	};
	exports.OnBehalfOfCredential = OnBehalfOfCredential;
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/tokenProvider.js
var require_tokenProvider = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getBearerTokenProvider = getBearerTokenProvider;
	var core_rest_pipeline_1 = require_commonjs$4();
	/**
	* Returns a callback that provides a bearer token.
	* For example, the bearer token can be used to authenticate a request as follows:
	* ```ts snippet:token_provider_example
	* import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
	* import { createPipelineRequest } from "@azure/core-rest-pipeline";
	*
	* const credential = new DefaultAzureCredential();
	* const scope = "https://cognitiveservices.azure.com/.default";
	* const getAccessToken = getBearerTokenProvider(credential, scope);
	* const token = await getAccessToken();
	*
	* // usage
	* const request = createPipelineRequest({ url: "https://example.com" });
	* request.headers.set("Authorization", `Bearer ${token}`);
	* ```
	*
	* @param credential - The credential used to authenticate the request.
	* @param scopes - The scopes required for the bearer token.
	* @param options - Options to configure the token provider.
	* @returns a callback that provides a bearer token.
	*/
	function getBearerTokenProvider(credential, scopes, options) {
		const { abortSignal, tracingOptions } = options || {};
		const pipeline = (0, core_rest_pipeline_1.createEmptyPipeline)();
		pipeline.addPolicy((0, core_rest_pipeline_1.bearerTokenAuthenticationPolicy)({
			credential,
			scopes
		}));
		async function getRefreshedToken() {
			const accessToken = (await pipeline.sendRequest({ sendRequest: (request) => Promise.resolve({
				request,
				status: 200,
				headers: request.headers
			}) }, (0, core_rest_pipeline_1.createPipelineRequest)({
				url: "https://example.com",
				abortSignal,
				tracingOptions
			}))).headers.get("authorization")?.split(" ")[1];
			if (!accessToken) throw new Error("Failed to get access token");
			return accessToken;
		}
		return getRefreshedToken;
	}
}));
//#endregion
//#region node_modules/@azure/identity/dist/commonjs/index.js
var require_commonjs = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getBearerTokenProvider = exports.AzureAuthorityHosts = exports.logger = exports.WorkloadIdentityCredential = exports.OnBehalfOfCredential = exports.VisualStudioCodeCredential = exports.UsernamePasswordCredential = exports.AzurePowerShellCredential = exports.AuthorizationCodeCredential = exports.AzurePipelinesCredential = exports.DeviceCodeCredential = exports.ManagedIdentityCredential = exports.InteractiveBrowserCredential = exports.AzureDeveloperCliCredential = exports.AzureCliCredential = exports.ClientAssertionCredential = exports.ClientCertificateCredential = exports.EnvironmentCredential = exports.DefaultAzureCredential = exports.ClientSecretCredential = exports.ChainedTokenCredential = exports.deserializeAuthenticationRecord = exports.serializeAuthenticationRecord = exports.AuthenticationRequiredError = exports.CredentialUnavailableErrorName = exports.CredentialUnavailableError = exports.AggregateAuthenticationErrorName = exports.AuthenticationErrorName = exports.AggregateAuthenticationError = exports.AuthenticationError = void 0;
	exports.getDefaultAzureCredential = getDefaultAzureCredential;
	__require("tslib").__exportStar(require_consumer(), exports);
	var defaultAzureCredential_js_1 = require_defaultAzureCredential();
	var errors_js_1 = require_errors();
	Object.defineProperty(exports, "AuthenticationError", {
		enumerable: true,
		get: function() {
			return errors_js_1.AuthenticationError;
		}
	});
	Object.defineProperty(exports, "AggregateAuthenticationError", {
		enumerable: true,
		get: function() {
			return errors_js_1.AggregateAuthenticationError;
		}
	});
	Object.defineProperty(exports, "AuthenticationErrorName", {
		enumerable: true,
		get: function() {
			return errors_js_1.AuthenticationErrorName;
		}
	});
	Object.defineProperty(exports, "AggregateAuthenticationErrorName", {
		enumerable: true,
		get: function() {
			return errors_js_1.AggregateAuthenticationErrorName;
		}
	});
	Object.defineProperty(exports, "CredentialUnavailableError", {
		enumerable: true,
		get: function() {
			return errors_js_1.CredentialUnavailableError;
		}
	});
	Object.defineProperty(exports, "CredentialUnavailableErrorName", {
		enumerable: true,
		get: function() {
			return errors_js_1.CredentialUnavailableErrorName;
		}
	});
	Object.defineProperty(exports, "AuthenticationRequiredError", {
		enumerable: true,
		get: function() {
			return errors_js_1.AuthenticationRequiredError;
		}
	});
	var utils_js_1 = require_utils$1();
	Object.defineProperty(exports, "serializeAuthenticationRecord", {
		enumerable: true,
		get: function() {
			return utils_js_1.serializeAuthenticationRecord;
		}
	});
	Object.defineProperty(exports, "deserializeAuthenticationRecord", {
		enumerable: true,
		get: function() {
			return utils_js_1.deserializeAuthenticationRecord;
		}
	});
	var chainedTokenCredential_js_1 = require_chainedTokenCredential();
	Object.defineProperty(exports, "ChainedTokenCredential", {
		enumerable: true,
		get: function() {
			return chainedTokenCredential_js_1.ChainedTokenCredential;
		}
	});
	var clientSecretCredential_js_1 = require_clientSecretCredential();
	Object.defineProperty(exports, "ClientSecretCredential", {
		enumerable: true,
		get: function() {
			return clientSecretCredential_js_1.ClientSecretCredential;
		}
	});
	var defaultAzureCredential_js_2 = require_defaultAzureCredential();
	Object.defineProperty(exports, "DefaultAzureCredential", {
		enumerable: true,
		get: function() {
			return defaultAzureCredential_js_2.DefaultAzureCredential;
		}
	});
	var environmentCredential_js_1 = require_environmentCredential();
	Object.defineProperty(exports, "EnvironmentCredential", {
		enumerable: true,
		get: function() {
			return environmentCredential_js_1.EnvironmentCredential;
		}
	});
	var clientCertificateCredential_js_1 = require_clientCertificateCredential();
	Object.defineProperty(exports, "ClientCertificateCredential", {
		enumerable: true,
		get: function() {
			return clientCertificateCredential_js_1.ClientCertificateCredential;
		}
	});
	var clientAssertionCredential_js_1 = require_clientAssertionCredential();
	Object.defineProperty(exports, "ClientAssertionCredential", {
		enumerable: true,
		get: function() {
			return clientAssertionCredential_js_1.ClientAssertionCredential;
		}
	});
	var azureCliCredential_js_1 = require_azureCliCredential();
	Object.defineProperty(exports, "AzureCliCredential", {
		enumerable: true,
		get: function() {
			return azureCliCredential_js_1.AzureCliCredential;
		}
	});
	var azureDeveloperCliCredential_js_1 = require_azureDeveloperCliCredential();
	Object.defineProperty(exports, "AzureDeveloperCliCredential", {
		enumerable: true,
		get: function() {
			return azureDeveloperCliCredential_js_1.AzureDeveloperCliCredential;
		}
	});
	var interactiveBrowserCredential_js_1 = require_interactiveBrowserCredential();
	Object.defineProperty(exports, "InteractiveBrowserCredential", {
		enumerable: true,
		get: function() {
			return interactiveBrowserCredential_js_1.InteractiveBrowserCredential;
		}
	});
	var index_js_1 = require_managedIdentityCredential();
	Object.defineProperty(exports, "ManagedIdentityCredential", {
		enumerable: true,
		get: function() {
			return index_js_1.ManagedIdentityCredential;
		}
	});
	var deviceCodeCredential_js_1 = require_deviceCodeCredential();
	Object.defineProperty(exports, "DeviceCodeCredential", {
		enumerable: true,
		get: function() {
			return deviceCodeCredential_js_1.DeviceCodeCredential;
		}
	});
	var azurePipelinesCredential_js_1 = require_azurePipelinesCredential();
	Object.defineProperty(exports, "AzurePipelinesCredential", {
		enumerable: true,
		get: function() {
			return azurePipelinesCredential_js_1.AzurePipelinesCredential;
		}
	});
	var authorizationCodeCredential_js_1 = require_authorizationCodeCredential();
	Object.defineProperty(exports, "AuthorizationCodeCredential", {
		enumerable: true,
		get: function() {
			return authorizationCodeCredential_js_1.AuthorizationCodeCredential;
		}
	});
	var azurePowerShellCredential_js_1 = require_azurePowerShellCredential();
	Object.defineProperty(exports, "AzurePowerShellCredential", {
		enumerable: true,
		get: function() {
			return azurePowerShellCredential_js_1.AzurePowerShellCredential;
		}
	});
	var usernamePasswordCredential_js_1 = require_usernamePasswordCredential();
	Object.defineProperty(exports, "UsernamePasswordCredential", {
		enumerable: true,
		get: function() {
			return usernamePasswordCredential_js_1.UsernamePasswordCredential;
		}
	});
	var visualStudioCodeCredential_js_1 = require_visualStudioCodeCredential();
	Object.defineProperty(exports, "VisualStudioCodeCredential", {
		enumerable: true,
		get: function() {
			return visualStudioCodeCredential_js_1.VisualStudioCodeCredential;
		}
	});
	var onBehalfOfCredential_js_1 = require_onBehalfOfCredential();
	Object.defineProperty(exports, "OnBehalfOfCredential", {
		enumerable: true,
		get: function() {
			return onBehalfOfCredential_js_1.OnBehalfOfCredential;
		}
	});
	var workloadIdentityCredential_js_1 = require_workloadIdentityCredential();
	Object.defineProperty(exports, "WorkloadIdentityCredential", {
		enumerable: true,
		get: function() {
			return workloadIdentityCredential_js_1.WorkloadIdentityCredential;
		}
	});
	var logging_js_1 = require_logging();
	Object.defineProperty(exports, "logger", {
		enumerable: true,
		get: function() {
			return logging_js_1.logger;
		}
	});
	var constants_js_1 = require_constants$1();
	Object.defineProperty(exports, "AzureAuthorityHosts", {
		enumerable: true,
		get: function() {
			return constants_js_1.AzureAuthorityHosts;
		}
	});
	/**
	* Returns a new instance of the {@link DefaultAzureCredential}.
	*/
	function getDefaultAzureCredential() {
		return new defaultAzureCredential_js_1.DefaultAzureCredential();
	}
	var tokenProvider_js_1 = require_tokenProvider();
	Object.defineProperty(exports, "getBearerTokenProvider", {
		enumerable: true,
		get: function() {
			return tokenProvider_js_1.getBearerTokenProvider;
		}
	});
}));
//#endregion
export { require_commonjs as t };
