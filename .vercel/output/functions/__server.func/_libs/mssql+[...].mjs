import { a as __toCommonJS, i as __require, n as __esmMin, r as __exportAll, t as __commonJSMin } from "../_runtime.mjs";
import { a as require_src } from "./@azure/core-client+[...].mjs";
import { t as require_lib } from "./tediousjs__connection-string.mjs";
import { t as require_commonjs } from "./@azure/identity+[...].mjs";
import { t as require_commonjs$1 } from "./@azure/core-auth+[...].mjs";
import { t as require_md4 } from "./js-md4.mjs";
import { t as require_bl } from "./bl+inherits+readable-stream.mjs";
import { n as js_joda_esm_exports, t as init_js_joda_esm } from "./js-joda__core.mjs";
import { t as require_lib$1 } from "./iconv-lite+safer-buffer.mjs";
//#region node_modules/tarn/dist/TimeoutError.js
var require_TimeoutError = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.TimeoutError = void 0;
	var TimeoutError = class extends Error {};
	exports.TimeoutError = TimeoutError;
}));
//#endregion
//#region node_modules/tarn/dist/PromiseInspection.js
var require_PromiseInspection = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.PromiseInspection = void 0;
	var PromiseInspection = class {
		constructor(args) {
			this._value = args.value;
			this._error = args.error;
		}
		value() {
			return this._value;
		}
		reason() {
			return this._error;
		}
		isRejected() {
			return !!this._error;
		}
		isFulfilled() {
			return !!this._value;
		}
	};
	exports.PromiseInspection = PromiseInspection;
}));
//#endregion
//#region node_modules/tarn/dist/utils.js
var require_utils$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.defer = defer;
	exports.now = now;
	exports.duration = duration;
	exports.checkOptionalTime = checkOptionalTime;
	exports.checkRequiredTime = checkRequiredTime;
	exports.delay = delay;
	exports.reflect = reflect;
	exports.tryPromise = tryPromise;
	var PromiseInspection_1 = require_PromiseInspection();
	function defer() {
		let resolve = null;
		let reject = null;
		return {
			promise: new Promise((resolver, rejecter) => {
				resolve = resolver;
				reject = rejecter;
			}),
			resolve,
			reject
		};
	}
	function now() {
		return Date.now();
	}
	function duration(t1, t2) {
		return Math.abs(t2 - t1);
	}
	function checkOptionalTime(time) {
		if (typeof time === "undefined") return true;
		return checkRequiredTime(time);
	}
	function checkRequiredTime(time) {
		return typeof time === "number" && time === Math.round(time) && time > 0;
	}
	function delay(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	function reflect(promise) {
		return promise.then((value) => {
			return new PromiseInspection_1.PromiseInspection({ value });
		}).catch((error) => {
			return new PromiseInspection_1.PromiseInspection({ error });
		});
	}
	function tryPromise(cb) {
		try {
			const result = cb();
			return Promise.resolve(result);
		} catch (err) {
			return Promise.reject(err);
		}
	}
}));
//#endregion
//#region node_modules/tarn/dist/PendingOperation.js
var require_PendingOperation = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.PendingOperation = void 0;
	var TimeoutError_1 = require_TimeoutError();
	var utils_1 = require_utils$1();
	var PendingOperation = class {
		constructor(timeoutMillis) {
			this.timeoutMillis = timeoutMillis;
			this.deferred = (0, utils_1.defer)();
			this.possibleTimeoutCause = null;
			this.isRejected = false;
			this.promise = timeout(this.deferred.promise, timeoutMillis).catch((err) => {
				if (err instanceof TimeoutError_1.TimeoutError) if (this.possibleTimeoutCause) err = new TimeoutError_1.TimeoutError(this.possibleTimeoutCause.message);
				else err = new TimeoutError_1.TimeoutError("operation timed out for an unknown reason");
				this.deferred.reject(err);
				this.isRejected = true;
				return Promise.reject(err);
			});
		}
		abort() {
			this.reject(/* @__PURE__ */ new Error("aborted"));
		}
		reject(err) {
			this.deferred.reject(err);
		}
		resolve(value) {
			this.deferred.resolve(value);
		}
	};
	exports.PendingOperation = PendingOperation;
	function timeout(promise, time) {
		return new Promise((resolve, reject) => {
			const timeoutHandle = setTimeout(() => reject(new TimeoutError_1.TimeoutError()), time);
			promise.then((result) => {
				clearTimeout(timeoutHandle);
				resolve(result);
			}).catch((err) => {
				clearTimeout(timeoutHandle);
				reject(err);
			});
		});
	}
}));
//#endregion
//#region node_modules/tarn/dist/Resource.js
var require_Resource = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Resource = void 0;
	var utils_1 = require_utils$1();
	exports.Resource = class Resource {
		constructor(resource) {
			this.resource = resource;
			this.resource = resource;
			this.timestamp = (0, utils_1.now)();
			this.deferred = (0, utils_1.defer)();
		}
		get promise() {
			return this.deferred.promise;
		}
		resolve() {
			this.deferred.resolve(void 0);
			return new Resource(this.resource);
		}
		settle() {
			this.deferred.resolve(void 0);
		}
	};
}));
//#endregion
//#region node_modules/tarn/dist/Pool.js
var require_Pool = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Pool = void 0;
	var PendingOperation_1 = require_PendingOperation();
	var Resource_1 = require_Resource();
	var utils_1 = require_utils$1();
	var events_1 = __require("events");
	var timers_1 = __require("timers");
	var Pool = class {
		constructor(opt) {
			this.destroyed = false;
			this.emitter = new events_1.EventEmitter();
			opt = opt || {};
			if (!opt.create) throw new Error("Tarn: opt.create function most be provided");
			if (!opt.destroy) throw new Error("Tarn: opt.destroy function most be provided");
			if (typeof opt.min !== "number" || opt.min < 0 || opt.min !== Math.round(opt.min)) throw new Error("Tarn: opt.min must be an integer >= 0");
			if (typeof opt.max !== "number" || opt.max <= 0 || opt.max !== Math.round(opt.max)) throw new Error("Tarn: opt.max must be an integer > 0");
			if (opt.min > opt.max) throw new Error("Tarn: opt.max is smaller than opt.min");
			if (!(0, utils_1.checkOptionalTime)(opt.acquireTimeoutMillis)) throw new Error("Tarn: invalid opt.acquireTimeoutMillis " + JSON.stringify(opt.acquireTimeoutMillis));
			if (!(0, utils_1.checkOptionalTime)(opt.createTimeoutMillis)) throw new Error("Tarn: invalid opt.createTimeoutMillis " + JSON.stringify(opt.createTimeoutMillis));
			if (!(0, utils_1.checkOptionalTime)(opt.destroyTimeoutMillis)) throw new Error("Tarn: invalid opt.destroyTimeoutMillis " + JSON.stringify(opt.destroyTimeoutMillis));
			if (!(0, utils_1.checkOptionalTime)(opt.idleTimeoutMillis)) throw new Error("Tarn: invalid opt.idleTimeoutMillis " + JSON.stringify(opt.idleTimeoutMillis));
			if (!(0, utils_1.checkOptionalTime)(opt.reapIntervalMillis)) throw new Error("Tarn: invalid opt.reapIntervalMillis " + JSON.stringify(opt.reapIntervalMillis));
			if (!(0, utils_1.checkOptionalTime)(opt.createRetryIntervalMillis)) throw new Error("Tarn: invalid opt.createRetryIntervalMillis " + JSON.stringify(opt.createRetryIntervalMillis));
			const allowedKeys = {
				create: true,
				validate: true,
				destroy: true,
				log: true,
				min: true,
				max: true,
				acquireTimeoutMillis: true,
				createTimeoutMillis: true,
				destroyTimeoutMillis: true,
				idleTimeoutMillis: true,
				reapIntervalMillis: true,
				createRetryIntervalMillis: true,
				propagateCreateError: true
			};
			for (const key of Object.keys(opt)) if (!allowedKeys[key]) throw new Error(`Tarn: unsupported option opt.${key}`);
			this.creator = opt.create;
			this.destroyer = opt.destroy;
			this.validate = typeof opt.validate === "function" ? opt.validate : () => true;
			this.log = opt.log || (() => {});
			this.acquireTimeoutMillis = opt.acquireTimeoutMillis || 3e4;
			this.createTimeoutMillis = opt.createTimeoutMillis || 3e4;
			this.destroyTimeoutMillis = opt.destroyTimeoutMillis || 5e3;
			this.idleTimeoutMillis = opt.idleTimeoutMillis || 3e4;
			this.reapIntervalMillis = opt.reapIntervalMillis || 1e3;
			this.createRetryIntervalMillis = opt.createRetryIntervalMillis || 200;
			this.propagateCreateError = !!opt.propagateCreateError;
			this.min = opt.min;
			this.max = opt.max;
			this.used = [];
			this.free = [];
			this.pendingCreates = [];
			this.pendingAcquires = [];
			this.pendingDestroys = [];
			this.pendingRetryTimers = [];
			this.pendingValidations = [];
			this.destroyed = false;
			this.interval = null;
			this.eventId = 1;
		}
		numUsed() {
			return this.used.length;
		}
		numFree() {
			return this.free.length;
		}
		numPendingAcquires() {
			return this.pendingAcquires.length;
		}
		numPendingValidations() {
			return this.pendingValidations.length;
		}
		numPendingCreates() {
			return this.pendingCreates.length;
		}
		acquire() {
			const eventId = this.eventId++;
			this._executeEventHandlers("acquireRequest", eventId);
			const pendingAcquire = new PendingOperation_1.PendingOperation(this.acquireTimeoutMillis);
			this.pendingAcquires.push(pendingAcquire);
			pendingAcquire.promise = pendingAcquire.promise.then((resource) => {
				this._executeEventHandlers("acquireSuccess", eventId, resource);
				return resource;
			}).catch((err) => {
				this._executeEventHandlers("acquireFail", eventId, err);
				remove(this.pendingAcquires, pendingAcquire);
				return Promise.reject(err);
			});
			this._tryAcquireOrCreate();
			return pendingAcquire;
		}
		release(resource) {
			this._executeEventHandlers("release", resource);
			for (let i = 0, l = this.used.length; i < l; ++i) {
				const used = this.used[i];
				if (used.resource === resource) {
					this.used.splice(i, 1);
					this.free.push(used.resolve());
					this._tryAcquireOrCreate();
					return true;
				}
			}
			return false;
		}
		isEmpty() {
			return [
				this.numFree(),
				this.numUsed(),
				this.numPendingAcquires(),
				this.numPendingValidations(),
				this.numPendingCreates()
			].reduce((total, value) => total + value) === 0;
		}
		/**
		* Reaping cycle.
		*/
		check() {
			const timestamp = (0, utils_1.now)();
			const newFree = [];
			const minKeep = this.min - this.used.length;
			const maxDestroy = this.free.length - minKeep;
			let numDestroyed = 0;
			this.free.forEach((free) => {
				if ((0, utils_1.duration)(timestamp, free.timestamp) >= this.idleTimeoutMillis && numDestroyed < maxDestroy) {
					numDestroyed++;
					free.settle();
					this._destroy(free.resource);
				} else newFree.push(free);
			});
			this.free = newFree;
			if (this.isEmpty()) this._stopReaping();
		}
		destroy() {
			const eventId = this.eventId++;
			this._executeEventHandlers("poolDestroyRequest", eventId);
			this._stopReaping();
			this.destroyed = true;
			this.pendingRetryTimers.forEach((timer) => clearTimeout(timer));
			this.pendingRetryTimers = [];
			return (0, utils_1.reflect)(Promise.all(this.pendingCreates.map((create) => (0, utils_1.reflect)(create.promise))).then(() => {
				return new Promise((resolve, reject) => {
					if (this.numPendingValidations() === 0) {
						resolve();
						return;
					}
					const interval = setInterval(() => {
						if (this.numPendingValidations() === 0) {
							(0, timers_1.clearInterval)(interval);
							resolve();
						}
					}, 100);
				});
			}).then(() => {
				return Promise.all(this.used.map((used) => (0, utils_1.reflect)(used.promise)));
			}).then(() => {
				return Promise.all(this.pendingAcquires.map((acquire) => {
					acquire.abort();
					return (0, utils_1.reflect)(acquire.promise);
				}));
			}).then(() => {
				this.free.forEach((free) => free.settle());
				return Promise.all(this.free.map((free) => (0, utils_1.reflect)(this._destroy(free.resource))));
			}).then(() => {
				return Promise.all(this.pendingDestroys.map((pd) => pd.promise));
			}).then(() => {
				this.free = [];
				this.pendingAcquires = [];
			})).then((res) => {
				this._executeEventHandlers("poolDestroySuccess", eventId);
				this.emitter.removeAllListeners();
				return res;
			});
		}
		on(event, listener) {
			this.emitter.on(event, listener);
		}
		removeListener(event, listener) {
			this.emitter.removeListener(event, listener);
		}
		removeAllListeners(event) {
			this.emitter.removeAllListeners(event);
		}
		/**
		* The most important method that is called always when resources
		* are created / destroyed / acquired / released. In other words
		* every time when resources are moved from used to free or vice
		* versa.
		*
		* Either assigns free resources to pendingAcquires or creates new
		* resources if there is room for it in the pool.
		*/
		_tryAcquireOrCreate() {
			if (this.destroyed) return;
			if (this._hasFreeResources()) this._doAcquire();
			else if (this._shouldCreateMoreResources()) this._doCreate();
		}
		_hasFreeResources() {
			return this.free.length > 0;
		}
		_doAcquire() {
			while (this._canAcquire()) {
				const pendingAcquire = this.pendingAcquires.shift();
				const free = this.free.pop();
				if (free === void 0 || pendingAcquire === void 0) {
					const errMessage = "this.free was empty while trying to acquire resource";
					this.log(`Tarn: ${errMessage}`, "warn");
					throw new Error(`Internal error, should never happen. ${errMessage}`);
				}
				this.pendingValidations.push(pendingAcquire);
				this.used.push(free);
				const abortAbleValidation = new PendingOperation_1.PendingOperation(this.acquireTimeoutMillis);
				pendingAcquire.promise.catch((err) => {
					abortAbleValidation.abort();
				});
				abortAbleValidation.promise.catch((err) => {
					this.log("Tarn: resource validator threw an exception " + err.stack, "warn");
					return false;
				}).then((validationSuccess) => {
					try {
						if (validationSuccess && !pendingAcquire.isRejected) {
							this._startReaping();
							pendingAcquire.resolve(free.resource);
						} else {
							remove(this.used, free);
							if (!validationSuccess) {
								free.settle();
								this._destroy(free.resource);
								setTimeout(() => {
									this._tryAcquireOrCreate();
								}, 0);
							} else this.free.push(free);
							if (!pendingAcquire.isRejected) this.pendingAcquires.unshift(pendingAcquire);
						}
					} finally {
						remove(this.pendingValidations, pendingAcquire);
					}
				});
				this._validateResource(free.resource).then((validationSuccess) => {
					abortAbleValidation.resolve(validationSuccess);
				}).catch((err) => {
					abortAbleValidation.reject(err);
				});
			}
		}
		_canAcquire() {
			return this.free.length > 0 && this.pendingAcquires.length > 0;
		}
		_validateResource(resource) {
			try {
				return Promise.resolve(this.validate(resource));
			} catch (err) {
				return Promise.reject(err);
			}
		}
		_shouldCreateMoreResources() {
			return this.used.length + this.pendingCreates.length < this.max && this.pendingCreates.length < this.pendingAcquires.length;
		}
		_doCreate() {
			const pendingAcquiresBeforeCreate = this.pendingAcquires.slice();
			this._create().promise.then(() => {
				this._tryAcquireOrCreate();
				return null;
			}).catch((err) => {
				if (this.destroyed) return;
				if (this.propagateCreateError && this.pendingAcquires.length !== 0) this.pendingAcquires[0].reject(err);
				pendingAcquiresBeforeCreate.forEach((pendingAcquire) => {
					pendingAcquire.possibleTimeoutCause = err;
				});
				const retryTimer = setTimeout(() => {
					remove(this.pendingRetryTimers, retryTimer);
					this._tryAcquireOrCreate();
				}, this.createRetryIntervalMillis);
				this.pendingRetryTimers.push(retryTimer);
			});
		}
		_create() {
			const eventId = this.eventId++;
			this._executeEventHandlers("createRequest", eventId);
			const pendingCreate = new PendingOperation_1.PendingOperation(this.createTimeoutMillis);
			pendingCreate.promise = pendingCreate.promise.catch((err) => {
				if (remove(this.pendingCreates, pendingCreate)) this._executeEventHandlers("createFail", eventId, err);
				throw err;
			});
			this.pendingCreates.push(pendingCreate);
			callbackOrPromise(this.creator).then((resource) => {
				if (pendingCreate.isRejected) {
					this.destroyer(resource);
					pendingCreate.resolve(resource);
					return null;
				}
				remove(this.pendingCreates, pendingCreate);
				this.free.push(new Resource_1.Resource(resource));
				pendingCreate.resolve(resource);
				this._executeEventHandlers("createSuccess", eventId, resource);
				return null;
			}).catch((err) => {
				if (pendingCreate.isRejected) {
					pendingCreate.reject(err);
					return null;
				}
				if (remove(this.pendingCreates, pendingCreate)) this._executeEventHandlers("createFail", eventId, err);
				pendingCreate.reject(err);
				return null;
			});
			return pendingCreate;
		}
		_destroy(resource) {
			const eventId = this.eventId++;
			this._executeEventHandlers("destroyRequest", eventId, resource);
			const pendingDestroy = new PendingOperation_1.PendingOperation(this.destroyTimeoutMillis);
			Promise.resolve().then(() => this.destroyer(resource)).then(() => {
				pendingDestroy.resolve(resource);
			}).catch((err) => {
				pendingDestroy.reject(err);
			});
			this.pendingDestroys.push(pendingDestroy);
			return pendingDestroy.promise.then((res) => {
				this._executeEventHandlers("destroySuccess", eventId, resource);
				return res;
			}).catch((err) => this._logDestroyerError(eventId, resource, err)).then((res) => {
				const index = this.pendingDestroys.findIndex((pd) => pd === pendingDestroy);
				this.pendingDestroys.splice(index, 1);
				return res;
			});
		}
		_logDestroyerError(eventId, resource, err) {
			this._executeEventHandlers("destroyFail", eventId, resource, err);
			this.log("Tarn: resource destroyer threw an exception " + err.stack, "warn");
		}
		_startReaping() {
			if (!this.interval) {
				this._executeEventHandlers("startReaping");
				this.interval = setInterval(() => this.check(), this.reapIntervalMillis);
			}
		}
		_stopReaping() {
			if (this.interval !== null) {
				this._executeEventHandlers("stopReaping");
				(0, timers_1.clearInterval)(this.interval);
			}
			this.interval = null;
		}
		_executeEventHandlers(eventName, ...args) {
			this.emitter.listeners(eventName).forEach((listener) => {
				try {
					listener(...args);
				} catch (err) {
					this.log(`Tarn: event handler "${eventName}" threw an exception ${err.stack}`, "warn");
				}
			});
		}
	};
	exports.Pool = Pool;
	function remove(arr, item) {
		const idx = arr.indexOf(item);
		if (idx === -1) return false;
		else {
			arr.splice(idx, 1);
			return true;
		}
	}
	function callbackOrPromise(func) {
		return new Promise((resolve, reject) => {
			const callback = (err, resource) => {
				if (err) reject(err);
				else resolve(resource);
			};
			(0, utils_1.tryPromise)(() => func(callback)).then((res) => {
				if (res) resolve(res);
			}).catch((err) => {
				reject(err);
			});
		});
	}
}));
//#endregion
//#region node_modules/tarn/dist/tarn.js
var require_tarn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.TimeoutError = exports.Pool = void 0;
	var Pool_1 = require_Pool();
	Object.defineProperty(exports, "Pool", {
		enumerable: true,
		get: function() {
			return Pool_1.Pool;
		}
	});
	var TimeoutError_1 = require_TimeoutError();
	Object.defineProperty(exports, "TimeoutError", {
		enumerable: true,
		get: function() {
			return TimeoutError_1.TimeoutError;
		}
	});
	module.exports = {
		Pool: Pool_1.Pool,
		TimeoutError: TimeoutError_1.TimeoutError
	};
}));
//#endregion
//#region node_modules/mssql/lib/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var IDS = /* @__PURE__ */ new WeakMap();
	var INCREMENT = {
		Connection: 1,
		ConnectionPool: 1,
		Request: 1,
		Transaction: 1,
		PreparedStatement: 1
	};
	var getPoolId = (obj) => {
		let parent = obj && obj.parent;
		while (parent && !parent.pool) parent = parent.parent;
		return parent ? IDS.get(parent) : void 0;
	};
	module.exports = {
		objectHasProperty: (object, property) => Object.prototype.hasOwnProperty.call(object, property),
		INCREMENT,
		IDS: {
			get: IDS.get.bind(IDS),
			add: (object, type, id) => {
				if (id) return IDS.set(object, id);
				IDS.set(object, INCREMENT[type]++);
			}
		},
		getPoolId
	};
}));
//#endregion
//#region node_modules/mssql/lib/error/mssql-error.js
var require_mssql_error = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var MSSQLError = class extends Error {
		/**
		* Creates a new ConnectionError.
		*
		* @param {String} message Error message.
		* @param {String} [code] Error code.
		*/
		constructor(message, code) {
			if (message instanceof Error) {
				super(message.message);
				this.code = message.code || code;
				Error.captureStackTrace(this, this.constructor);
				Object.defineProperty(this, "originalError", {
					enumerable: true,
					value: message
				});
			} else {
				super(message);
				this.code = code;
			}
			this.name = "MSSQLError";
		}
	};
	module.exports = MSSQLError;
}));
//#endregion
//#region node_modules/mssql/lib/error/connection-error.js
var require_connection_error = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var MSSQLError = require_mssql_error();
	/**
	* Class ConnectionError.
	*/
	var ConnectionError = class extends MSSQLError {
		/**
		* Creates a new ConnectionError.
		*
		* @param {String} message Error message.
		* @param {String} [code] Error code.
		*/
		constructor(message, code) {
			super(message, code);
			this.name = "ConnectionError";
		}
	};
	module.exports = ConnectionError;
}));
//#endregion
//#region node_modules/mssql/lib/datatypes.js
var require_datatypes = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var objectHasProperty = require_utils().objectHasProperty;
	var inspect = Symbol.for("nodejs.util.inspect.custom");
	var TYPES = {
		VarChar(length) {
			return {
				type: TYPES.VarChar,
				length
			};
		},
		NVarChar(length) {
			return {
				type: TYPES.NVarChar,
				length
			};
		},
		Text() {
			return { type: TYPES.Text };
		},
		Int() {
			return { type: TYPES.Int };
		},
		BigInt() {
			return { type: TYPES.BigInt };
		},
		TinyInt() {
			return { type: TYPES.TinyInt };
		},
		SmallInt() {
			return { type: TYPES.SmallInt };
		},
		Bit() {
			return { type: TYPES.Bit };
		},
		Float() {
			return { type: TYPES.Float };
		},
		Numeric(precision, scale) {
			return {
				type: TYPES.Numeric,
				precision,
				scale
			};
		},
		Decimal(precision, scale) {
			return {
				type: TYPES.Decimal,
				precision,
				scale
			};
		},
		Real() {
			return { type: TYPES.Real };
		},
		Date() {
			return { type: TYPES.Date };
		},
		DateTime() {
			return { type: TYPES.DateTime };
		},
		DateTime2(scale) {
			return {
				type: TYPES.DateTime2,
				scale
			};
		},
		DateTimeOffset(scale) {
			return {
				type: TYPES.DateTimeOffset,
				scale
			};
		},
		SmallDateTime() {
			return { type: TYPES.SmallDateTime };
		},
		Time(scale) {
			return {
				type: TYPES.Time,
				scale
			};
		},
		UniqueIdentifier() {
			return { type: TYPES.UniqueIdentifier };
		},
		SmallMoney() {
			return { type: TYPES.SmallMoney };
		},
		Money() {
			return { type: TYPES.Money };
		},
		Binary(length) {
			return {
				type: TYPES.Binary,
				length
			};
		},
		VarBinary(length) {
			return {
				type: TYPES.VarBinary,
				length
			};
		},
		Image() {
			return { type: TYPES.Image };
		},
		Xml() {
			return { type: TYPES.Xml };
		},
		Char(length) {
			return {
				type: TYPES.Char,
				length
			};
		},
		NChar(length) {
			return {
				type: TYPES.NChar,
				length
			};
		},
		NText() {
			return { type: TYPES.NText };
		},
		TVP(tvpType) {
			return {
				type: TYPES.TVP,
				tvpType
			};
		},
		UDT() {
			return { type: TYPES.UDT };
		},
		Geography() {
			return { type: TYPES.Geography };
		},
		Geometry() {
			return { type: TYPES.Geometry };
		},
		Variant() {
			return { type: TYPES.Variant };
		}
	};
	module.exports.TYPES = TYPES;
	module.exports.DECLARATIONS = {};
	var zero = function(value, length) {
		if (length == null) length = 2;
		value = String(value);
		if (value.length < length) for (let i = 1; i <= length - value.length; i++) value = `0${value}`;
		return value;
	};
	for (const key in TYPES) if (objectHasProperty(TYPES, key)) {
		const value = TYPES[key];
		value.declaration = key.toLowerCase();
		module.exports.DECLARATIONS[value.declaration] = value;
		((key, value) => {
			value[inspect] = () => `[sql.${key}]`;
		})(key, value);
	}
	module.exports.declare = (type, options) => {
		switch (type) {
			case TYPES.VarChar:
			case TYPES.VarBinary: return `${type.declaration} (${options.length > 8e3 ? "MAX" : options.length == null ? "MAX" : options.length})`;
			case TYPES.NVarChar: return `${type.declaration} (${options.length > 4e3 ? "MAX" : options.length == null ? "MAX" : options.length})`;
			case TYPES.Char:
			case TYPES.NChar:
			case TYPES.Binary: return `${type.declaration} (${options.length == null ? 1 : options.length})`;
			case TYPES.Decimal:
			case TYPES.Numeric: return `${type.declaration} (${options.precision == null ? 18 : options.precision}, ${options.scale == null ? 0 : options.scale})`;
			case TYPES.Time:
			case TYPES.DateTime2:
			case TYPES.DateTimeOffset: return `${type.declaration} (${options.scale == null ? 7 : options.scale})`;
			case TYPES.TVP: return `${options.tvpType} readonly`;
			default: return type.declaration;
		}
	};
	module.exports.cast = (value, type, options) => {
		if (value == null) return null;
		switch (typeof value) {
			case "string": return `N'${value.replace(/'/g, "''")}'`;
			case "number":
			case "bigint": return value;
			case "boolean": return value ? 1 : 0;
			case "object":
				if (value instanceof Date) {
					let ns = value.getUTCMilliseconds() / 1e3;
					if (value.nanosecondDelta != null) ns += value.nanosecondDelta;
					const scale = options.scale == null ? 7 : options.scale;
					if (scale > 0) ns = String(ns).substr(1, scale + 1);
					else ns = "";
					return `N'${value.getUTCFullYear()}-${zero(value.getUTCMonth() + 1)}-${zero(value.getUTCDate())} ${zero(value.getUTCHours())}:${zero(value.getUTCMinutes())}:${zero(value.getUTCSeconds())}${ns}'`;
				} else if (Buffer.isBuffer(value)) return `0x${value.toString("hex")}`;
				return null;
			default: return null;
		}
	};
}));
//#endregion
//#region node_modules/mssql/lib/table.js
var require_table = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var TYPES = require_datatypes().TYPES;
	var declareType = require_datatypes().declare;
	var objectHasProperty = require_utils().objectHasProperty;
	var MAX = 65535;
	var JSON_COLUMN_ID = "JSON_F52E2B61-18A1-11d1-B105-00805F49916B";
	function Table(name) {
		if (name) {
			const parsed = Table.parseName(name);
			this.name = parsed.name;
			this.schema = parsed.schema;
			this.database = parsed.database;
			this.path = (this.database ? `[${this.database}].` : "") + (this.schema ? `[${this.schema}].` : "") + `[${this.name}]`;
			this.temporary = this.name.charAt(0) === "#";
		}
		this.columns = [];
		this.rows = [];
		Object.defineProperty(this.columns, "add", { value(name, column, options) {
			if (column == null) throw new Error("Column data type is not defined.");
			if (column instanceof Function) column = column();
			options = options || {};
			column.name = name;
			[
				"nullable",
				"primary",
				"identity",
				"readOnly",
				"length"
			].forEach((prop) => {
				if (objectHasProperty(options, prop)) column[prop] = options[prop];
			});
			return this.push(column);
		} });
		Object.defineProperty(this.rows, "add", { value() {
			return this.push(Array.prototype.slice.call(arguments));
		} });
		Object.defineProperty(this.rows, "clear", { value() {
			return this.splice(0, this.length);
		} });
	}
	Table.prototype._makeBulk = function _makeBulk() {
		for (let i = 0; i < this.columns.length; i++) {
			const col = this.columns[i];
			switch (col.type) {
				case TYPES.Date:
				case TYPES.DateTime:
				case TYPES.DateTime2:
					for (let j = 0; j < this.rows.length; j++) {
						const dateValue = this.rows[j][i];
						if (typeof dateValue === "string" || typeof dateValue === "number") {
							const date = new Date(dateValue);
							if (isNaN(date.getDate())) throw new TypeError("Invalid date value passed to bulk rows");
							this.rows[j][i] = date;
						}
					}
					break;
				case TYPES.Xml:
					col.type = TYPES.NVarChar(MAX).type;
					break;
				case TYPES.UDT:
				case TYPES.Geography:
				case TYPES.Geometry: col.type = TYPES.VarBinary(MAX).type;
			}
		}
		return this;
	};
	Table.prototype.declare = function declare() {
		const pkey = this.columns.filter((col) => col.primary === true).map((col) => `[${col.name}]`);
		const cols = this.columns.map((col) => {
			const def = [`[${col.name}] ${declareType(col.type, col)}`];
			if (col.nullable === true) def.push("null");
			else if (col.nullable === false) def.push("not null");
			if (col.primary === true && pkey.length === 1) def.push("primary key");
			return def.join(" ");
		});
		const constraint = pkey.length > 1 ? `, constraint [PK_${this.temporary ? this.name.substr(1) : this.name}] primary key (${pkey.join(", ")})` : "";
		return `create table ${this.path} (${cols.join(", ")}${constraint})`;
	};
	Table.fromRecordset = function fromRecordset(recordset, name) {
		const t = new this(name);
		for (const colName in recordset.columns) if (objectHasProperty(recordset.columns, colName)) {
			const col = recordset.columns[colName];
			t.columns.add(colName, {
				type: col.type,
				length: col.length,
				scale: col.scale,
				precision: col.precision
			}, {
				nullable: col.nullable,
				identity: col.identity,
				readOnly: col.readOnly
			});
		}
		if (t.columns.length === 1 && t.columns[0].name === JSON_COLUMN_ID) for (let i = 0; i < recordset.length; i++) t.rows.add(JSON.stringify(recordset[i]));
		else for (let i = 0; i < recordset.length; i++) t.rows.add.apply(t.rows, t.columns.map((col) => recordset[i][col.name]));
		return t;
	};
	Table.parseName = function parseName(name) {
		const length = name.length;
		let cursor = -1;
		let buffer = "";
		let escaped = false;
		const path = [];
		while (++cursor < length) {
			const char = name.charAt(cursor);
			if (char === "[") if (escaped) buffer += char;
			else escaped = true;
			else if (char === "]") if (escaped) escaped = false;
			else throw new Error("Invalid table name.");
			else if (char === ".") if (escaped) buffer += char;
			else {
				path.push(buffer);
				buffer = "";
			}
			else buffer += char;
		}
		if (buffer) path.push(buffer);
		switch (path.length) {
			case 1: return {
				name: path[0],
				schema: null,
				database: null
			};
			case 2: return {
				name: path[1],
				schema: path[0],
				database: null
			};
			case 3: return {
				name: path[2],
				schema: path[1],
				database: path[0]
			};
			default: throw new Error("Invalid table name.");
		}
	};
	module.exports = Table;
}));
//#endregion
//#region node_modules/mssql/lib/shared.js
var require_shared = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { TYPES } = require_datatypes();
	var Table = require_table();
	var PromiseLibrary = Promise;
	var driver = {};
	var map = [];
	/**
	* Register you own type map.
	*
	* @path module.exports.map
	* @param {*} jstype JS data type.
	* @param {*} sqltype SQL data type.
	*/
	map.register = function(jstype, sqltype) {
		for (let index = 0; index < this.length; index++) if (this[index].js === jstype) {
			this.splice(index, 1);
			break;
		}
		this.push({
			js: jstype,
			sql: sqltype
		});
		return null;
	};
	map.register(String, TYPES.NVarChar);
	map.register(Number, TYPES.Int);
	map.register(Boolean, TYPES.Bit);
	map.register(Date, TYPES.DateTime);
	map.register(Buffer, TYPES.VarBinary);
	map.register(Table, TYPES.TVP);
	/**
	* @ignore
	*/
	var getTypeByValue = function(value) {
		if (value === null || value === void 0) return TYPES.NVarChar;
		switch (typeof value) {
			case "string":
				for (const item of Array.from(map)) if (item.js === String) return item.sql;
				return TYPES.NVarChar;
			case "number": if (value % 1 === 0) if (value < -2147483648 || value > 2147483647) return TYPES.BigInt;
			else return TYPES.Int;
			else return TYPES.Float;
			case "bigint": if (value < -2147483648n || value > 2147483647n) return TYPES.BigInt;
			else return TYPES.Int;
			case "boolean":
				for (const item of Array.from(map)) if (item.js === Boolean) return item.sql;
				return TYPES.Bit;
			case "object":
				for (const item of Array.from(map)) if (value instanceof item.js) return item.sql;
				return TYPES.NVarChar;
			default: return TYPES.NVarChar;
		}
	};
	module.exports = {
		driver,
		getTypeByValue,
		map
	};
	Object.defineProperty(module.exports, "Promise", {
		get: () => {
			return PromiseLibrary;
		},
		set: (value) => {
			PromiseLibrary = value;
		}
	});
	Object.defineProperty(module.exports, "valueHandler", {
		enumerable: true,
		value: /* @__PURE__ */ new Map(),
		writable: false,
		configurable: false
	});
}));
//#endregion
//#region node_modules/mssql/lib/error/prepared-statement-error.js
var require_prepared_statement_error = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var MSSQLError = require_mssql_error();
	/**
	* Class PreparedStatementError.
	*/
	var PreparedStatementError = class extends MSSQLError {
		/**
		* Creates a new PreparedStatementError.
		*
		* @param {String} message Error message.
		* @param {String} [code] Error code.
		*/
		constructor(message, code) {
			super(message, code);
			this.name = "PreparedStatementError";
		}
	};
	module.exports = PreparedStatementError;
}));
//#endregion
//#region node_modules/mssql/lib/error/request-error.js
var require_request_error = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var MSSQLError = require_mssql_error();
	/**
	* Class RequestError.
	*
	* @property {String} number Error number.
	* @property {Number} lineNumber Line number.
	* @property {String} state Error state.
	* @property {String} class Error class.
	* @property {String} serverName Server name.
	* @property {String} procName Procedure name.
	*/
	var RequestError = class extends MSSQLError {
		/**
		* Creates a new RequestError.
		*
		* @param {String} message Error message.
		* @param {String} [code] Error code.
		*/
		constructor(message, code) {
			super(message, code);
			if (message instanceof Error) if (message.info) {
				this.number = message.info.number || message.code;
				this.lineNumber = message.info.lineNumber;
				this.state = message.info.state || message.sqlstate;
				this.class = message.info.class;
				this.serverName = message.info.serverName;
				this.procName = message.info.procName;
			} else {
				this.number = message.code;
				this.lineNumber = message.lineNumber;
				this.state = message.sqlstate;
				this.class = message.severity;
				this.serverName = message.serverName;
				this.procName = message.procName;
			}
			this.name = "RequestError";
			const parsedMessage = /^\[Microsoft\]\[SQL Server Native Client 11\.0\](?:\[SQL Server\])?([\s\S]*)$/.exec(this.message);
			if (parsedMessage) this.message = parsedMessage[1];
		}
	};
	module.exports = RequestError;
}));
//#endregion
//#region node_modules/mssql/lib/error/transaction-error.js
var require_transaction_error = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var MSSQLError = require_mssql_error();
	/**
	* Class TransactionError.
	*/
	var TransactionError = class extends MSSQLError {
		/**
		* Creates a new TransactionError.
		*
		* @param {String} message Error message.
		* @param {String} [code] Error code.
		*/
		constructor(message, code) {
			super(message, code);
			this.name = "TransactionError";
		}
	};
	module.exports = TransactionError;
}));
//#endregion
//#region node_modules/mssql/lib/error/index.js
var require_error = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		ConnectionError: require_connection_error(),
		MSSQLError: require_mssql_error(),
		PreparedStatementError: require_prepared_statement_error(),
		RequestError: require_request_error(),
		TransactionError: require_transaction_error()
	};
}));
//#endregion
//#region node_modules/mssql/lib/diagnostics.js
var require_diagnostics = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var dc = __require("node:diagnostics_channel");
	var TRACE_QUERY = "mssql:query";
	var TRACE_BATCH = "mssql:batch";
	var TRACE_EXECUTE = "mssql:execute";
	var TRACE_BULK = "mssql:bulk";
	var TRACE_CONNECT = "mssql:connect";
	var TRACE_POOL_ACQUIRE = "mssql:pool:acquire";
	var TRACE_PREPARED_STATEMENT_PREPARE = "mssql:prepared-statement:prepare";
	var TRACE_PREPARED_STATEMENT_EXECUTE = "mssql:prepared-statement:execute";
	var CONNECTION_ACQUIRE = "mssql:connection:acquire";
	var CONNECTION_RELEASE = "mssql:connection:release";
	var CONNECTION_CREATE = "mssql:connection:create";
	var CONNECTION_DESTROY = "mssql:connection:destroy";
	var POOL_CLOSE = "mssql:pool:close";
	var TRANSACTION_BEGIN = "mssql:transaction:begin";
	var TRANSACTION_COMMIT = "mssql:transaction:commit";
	var TRANSACTION_ROLLBACK = "mssql:transaction:rollback";
	var REQUEST_CANCEL = "mssql:request:cancel";
	var PREPARED_STATEMENT_UNPREPARE = "mssql:prepared-statement:unprepare";
	var CHANNELS = Object.freeze({
		TRACE_QUERY,
		TRACE_BATCH,
		TRACE_EXECUTE,
		TRACE_BULK,
		TRACE_CONNECT,
		TRACE_POOL_ACQUIRE,
		TRACE_PREPARED_STATEMENT_PREPARE,
		TRACE_PREPARED_STATEMENT_EXECUTE,
		CONNECTION_ACQUIRE,
		CONNECTION_RELEASE,
		CONNECTION_CREATE,
		CONNECTION_DESTROY,
		POOL_CLOSE,
		TRANSACTION_BEGIN,
		TRANSACTION_COMMIT,
		TRANSACTION_ROLLBACK,
		REQUEST_CANCEL,
		PREPARED_STATEMENT_UNPREPARE
	});
	var tracingChannels = {
		[TRACE_QUERY]: dc.tracingChannel(TRACE_QUERY),
		[TRACE_BATCH]: dc.tracingChannel(TRACE_BATCH),
		[TRACE_EXECUTE]: dc.tracingChannel(TRACE_EXECUTE),
		[TRACE_BULK]: dc.tracingChannel(TRACE_BULK),
		[TRACE_CONNECT]: dc.tracingChannel(TRACE_CONNECT),
		[TRACE_POOL_ACQUIRE]: dc.tracingChannel(TRACE_POOL_ACQUIRE),
		[TRACE_PREPARED_STATEMENT_PREPARE]: dc.tracingChannel(TRACE_PREPARED_STATEMENT_PREPARE),
		[TRACE_PREPARED_STATEMENT_EXECUTE]: dc.tracingChannel(TRACE_PREPARED_STATEMENT_EXECUTE)
	};
	var pointChannels = {
		[CONNECTION_ACQUIRE]: dc.channel(CONNECTION_ACQUIRE),
		[CONNECTION_RELEASE]: dc.channel(CONNECTION_RELEASE),
		[CONNECTION_CREATE]: dc.channel(CONNECTION_CREATE),
		[CONNECTION_DESTROY]: dc.channel(CONNECTION_DESTROY),
		[POOL_CLOSE]: dc.channel(POOL_CLOSE),
		[TRANSACTION_BEGIN]: dc.channel(TRANSACTION_BEGIN),
		[TRANSACTION_COMMIT]: dc.channel(TRANSACTION_COMMIT),
		[TRANSACTION_ROLLBACK]: dc.channel(TRANSACTION_ROLLBACK),
		[REQUEST_CANCEL]: dc.channel(REQUEST_CANCEL),
		[PREPARED_STATEMENT_UNPREPARE]: dc.channel(PREPARED_STATEMENT_UNPREPARE)
	};
	function tracingChannelHasSubscribers(tc) {
		if (typeof tc.hasSubscribers === "boolean") return tc.hasSubscribers;
		return tc.start.hasSubscribers || tc.end.hasSubscribers || tc.asyncStart.hasSubscribers || tc.asyncEnd.hasSubscribers || tc.error.hasSubscribers;
	}
	/**
	* Trace an async operation using a TracingChannel.
	*
	* When subscribers are active, wraps `fn` with TracingChannel.tracePromise().
	* When no subscribers are active, calls `fn` directly with zero overhead
	* (no context allocation).
	*
	* @param {string} name - TracingChannel name (one of CHANNELS.TRACE_*)
	* @param {Function} fn - The function to trace (must return a Promise)
	* @param {Function} contextFactory - Factory function returning the context object
	* @returns {Promise} The return value of fn
	*/
	function tracePromise(name, fn, contextFactory) {
		const channel = tracingChannels[name];
		if (tracingChannelHasSubscribers(channel)) return channel.tracePromise(fn, contextFactory());
		return fn();
	}
	/**
	* Trace a callback-style async operation using a TracingChannel.
	*
	* When subscribers are active, delegates to TracingChannel.traceCallback,
	* which replaces the callback at `position` in `args` with a wrapped
	* version that publishes to start/end/asyncStart/asyncEnd/error. When
	* no subscribers are active, calls `fn` directly with zero overhead.
	*
	* @param {string} name - TracingChannel name (one of CHANNELS.TRACE_*)
	* @param {Function} fn - The function to call (receives callback at `position`)
	* @param {number} position - Index of the callback within `args`
	* @param {Function} contextFactory - Factory function returning the context object
	* @param {*} thisArg - `this` binding for fn
	* @param {Array} args - Arguments to pass to fn (includes the callback at `position`)
	* @returns {*} The return value of fn
	*/
	function traceCallback(name, fn, position, contextFactory, thisArg, args) {
		const channel = tracingChannels[name];
		if (tracingChannelHasSubscribers(channel)) return channel.traceCallback(fn, position, contextFactory(), thisArg, ...args);
		return fn.apply(thisArg, args);
	}
	/**
	* Publish a point event on a named channel.
	*
	* Only allocates the message object when subscribers are active.
	*
	* @param {string} name - Point-event channel name (one of CHANNELS.*)
	* @param {Function} factory - Factory function that returns the message object
	*/
	function publish(name, factory) {
		const channel = pointChannels[name];
		if (channel.hasSubscribers) channel.publish(factory());
	}
	module.exports = {
		CHANNELS,
		tracingChannels,
		tracePromise,
		traceCallback,
		publish
	};
}));
//#endregion
//#region node_modules/mssql/lib/base/connection-pool.js
var require_connection_pool$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { EventEmitter: EventEmitter$3 } = __require("node:events");
	var debug = require_src()("mssql:base");
	var { parse, MSSQL_SCHEMA } = require_lib();
	var tarn = require_tarn();
	var { IDS } = require_utils();
	var ConnectionError = require_connection_error();
	var shared = require_shared();
	var { MSSQLError } = require_error();
	var { CHANNELS, tracePromise, traceCallback, publish } = require_diagnostics();
	var NODE_MSSQL_SCHEMA = {
		...MSSQL_SCHEMA,
		useutc: { type: "boolean" },
		stream: { type: "boolean" },
		parsejson: { type: "boolean" },
		"request timeout": { type: "number" }
	};
	/**
	* Class ConnectionPool.
	*
	* Internally, each `Connection` instance is a separate pool of TDS connections. Once you create a new `Request`/`Transaction`/`Prepared Statement`, a new TDS connection is acquired from the pool and reserved for desired action. Once the action is complete, connection is released back to the pool.
	*
	* @property {Boolean} connected If true, connection is established.
	* @property {Boolean} connecting If true, connection is being established.
	*
	* @fires ConnectionPool#connect
	* @fires ConnectionPool#close
	*/
	var ConnectionPool = class extends EventEmitter$3 {
		/**
		* Create new Connection.
		*
		* @param {Object|String} config Connection configuration object or connection string.
		* @param {basicCallback} [callback] A callback which is called after connection has established, or an error has occurred.
		*/
		constructor(config, callback) {
			super();
			IDS.add(this, "ConnectionPool");
			debug("pool(%d): created", IDS.get(this));
			this._connectStack = [];
			this._closeStack = [];
			this._connected = false;
			this._connecting = false;
			this._healthy = false;
			if (typeof config === "string") try {
				this.config = this.constructor.parseConnectionString(config);
			} catch (ex) {
				if (typeof callback === "function") return setImmediate(callback, ex);
				throw ex;
			}
			else this.config = config;
			this.config.port = this.config.port || 1433;
			this.config.options = this.config.options || {};
			this.config.stream = this.config.stream || false;
			this.config.parseJSON = this.config.parseJSON || false;
			this.config.arrayRowMode = this.config.arrayRowMode || false;
			this.config.validateConnection = "validateConnection" in this.config ? this.config.validateConnection : true;
			const namedServer = /^(.*)\\(.*)$/.exec(this.config.server);
			if (namedServer) {
				this.config.server = namedServer[1];
				this.config.options.instanceName = namedServer[2];
			}
			if (typeof this.config.options.useColumnNames !== "undefined" && this.config.options.useColumnNames !== true) {
				const ex = new MSSQLError("Invalid options `useColumnNames`, use `arrayRowMode` instead");
				if (typeof callback === "function") return setImmediate(callback, ex);
				throw ex;
			}
			if (typeof callback === "function") this.connect(callback);
		}
		get connected() {
			return this._connected;
		}
		get connecting() {
			return this._connecting;
		}
		get healthy() {
			return this._healthy;
		}
		static parseConnectionString(connectionString) {
			return this._parseConnectionString(connectionString);
		}
		static _parseAuthenticationType(type, entries) {
			if (!type) return "default";
			switch (type.toLowerCase()) {
				case "active directory integrated":
					if (entries.includes("token")) return "azure-active-directory-access-token";
					else if ([
						"client id",
						"client secret",
						"tenant id"
					].every((entry) => entries.includes(entry))) return "azure-active-directory-service-principal-secret";
					else if ([
						"client id",
						"msi endpoint",
						"msi secret"
					].every((entry) => entries.includes(entry))) return "azure-active-directory-msi-app-service";
					else if (["client id", "msi endpoint"].every((entry) => entries.includes(entry))) return "azure-active-directory-msi-vm";
					return "azure-active-directory-default";
				case "active directory password": return "azure-active-directory-password";
				case "ntlm": return "ntlm";
				default: return "default";
			}
		}
		static _parseConnectionString(connectionString) {
			const result = parse(connectionString);
			const parsed = result.toSchema(NODE_MSSQL_SCHEMA);
			for (const [key, value] of result) if (!(key in parsed)) parsed[key] = value;
			return Object.entries(parsed).reduce((config, [key, value]) => {
				switch (key) {
					case "application name": break;
					case "applicationintent":
						Object.assign(config.options, { readOnlyIntent: value === "readonly" });
						break;
					case "asynchronous processing": break;
					case "attachdbfilename": break;
					case "authentication":
						Object.assign(config, { authentication_type: this._parseAuthenticationType(value, Object.keys(parsed)) });
						break;
					case "column encryption setting": break;
					case "connection timeout":
						Object.assign(config, { connectionTimeout: value * 1e3 });
						break;
					case "connection lifetime": break;
					case "connectretrycount": break;
					case "connectretryinterval":
						Object.assign(config.options, { connectionRetryInterval: value * 1e3 });
						break;
					case "context connection": break;
					case "client id":
						Object.assign(config, { clientId: value });
						break;
					case "client secret":
						Object.assign(config, { clientSecret: value });
						break;
					case "current language":
						Object.assign(config.options, { language: value });
						break;
					case "data source": {
						let server = value;
						let instanceName;
						let port = 1433;
						if (/^np:/i.test(server)) throw new Error("Connection via Named Pipes is not supported.");
						if (/^tcp:/i.test(server)) server = server.substr(4);
						const namedServerParts = /^(.*)\\(.*)$/.exec(server);
						if (namedServerParts) {
							server = namedServerParts[1].trim();
							instanceName = namedServerParts[2].trim();
						}
						const serverParts = /^(.*),(.*)$/.exec(server);
						if (serverParts) {
							server = serverParts[1].trim();
							port = parseInt(serverParts[2].trim(), 10);
						} else {
							const instanceParts = /^(.*),(.*)$/.exec(instanceName);
							if (instanceParts) {
								instanceName = instanceParts[1].trim();
								port = parseInt(instanceParts[2].trim(), 10);
							}
						}
						if (server === "." || server === "(.)" || server.toLowerCase() === "(localdb)" || server.toLowerCase() === "(local)") server = "localhost";
						Object.assign(config, {
							port,
							server
						});
						if (instanceName) Object.assign(config.options, { instanceName });
						break;
					}
					case "encrypt":
						Object.assign(config.options, { encrypt: !!value });
						break;
					case "enlist": break;
					case "failover partner": break;
					case "initial catalog":
						Object.assign(config, { database: value });
						break;
					case "integrated security": break;
					case "max pool size":
						Object.assign(config.pool, { max: value });
						break;
					case "min pool size":
						Object.assign(config.pool, { min: value });
						break;
					case "msi endpoint":
						Object.assign(config, { msiEndpoint: value });
						break;
					case "msi secret":
						Object.assign(config, { msiSecret: value });
						break;
					case "multipleactiveresultsets": break;
					case "multisubnetfailover":
						Object.assign(config.options, { multiSubnetFailover: value });
						break;
					case "network library": break;
					case "packet size":
						Object.assign(config.options, { packetSize: value });
						break;
					case "password":
						Object.assign(config, { password: value });
						break;
					case "persist security info": break;
					case "poolblockingperiod": break;
					case "pooling": break;
					case "replication": break;
					case "tenant id":
						Object.assign(config, { tenantId: value });
						break;
					case "token":
						Object.assign(config, { token: value });
						break;
					case "transaction binding":
						Object.assign(config.options, { enableImplicitTransactions: value.toLowerCase() === "implicit unbind" });
						break;
					case "transparentnetworkipresolution": break;
					case "trustservercertificate":
						Object.assign(config.options, { trustServerCertificate: value });
						break;
					case "type system version": break;
					case "user id": {
						let user = value;
						let domain;
						const domainUser = /^(.*)\\(.*)$/.exec(user);
						if (domainUser) {
							domain = domainUser[1];
							user = domainUser[2];
						}
						if (domain) Object.assign(config, { domain });
						if (user) Object.assign(config, { user });
						break;
					}
					case "user instance": break;
					case "workstation id":
						Object.assign(config.options, { workstationId: value });
						break;
					case "request timeout":
						Object.assign(config, { requestTimeout: parseInt(value, 10) });
						break;
					case "stream":
						Object.assign(config, { stream: !!value });
						break;
					case "useutc":
						Object.assign(config.options, { useUTC: !!value });
						break;
					case "parsejson": Object.assign(config, { parseJSON: !!value });
				}
				return config;
			}, {
				options: {},
				pool: {}
			});
		}
		/**
		* Acquire connection from this connection pool.
		*
		* @param {ConnectionPool|Transaction|PreparedStatement} requester Requester.
		* @param {acquireCallback} [callback] A callback which is called after connection has been acquired, or an error has occurred. If omited, method returns Promise.
		* @return {ConnectionPool|Promise}
		*/
		acquire(requester, callback) {
			const requestId = IDS.get(requester);
			const poolId = IDS.get(this);
			const acquirePromise = tracePromise(CHANNELS.TRACE_POOL_ACQUIRE, () => {
				return shared.Promise.resolve(this._acquire()).catch((err) => {
					this.emit("error", err);
					throw err;
				}).then((connection) => {
					publish(CHANNELS.CONNECTION_ACQUIRE, () => ({
						connectionId: IDS.get(connection),
						requestId,
						poolId
					}));
					return connection;
				});
			}, () => ({
				poolId,
				requestId
			}));
			if (typeof callback === "function") {
				acquirePromise.then((connection) => callback(null, connection, this.config)).catch(callback);
				return this;
			}
			return acquirePromise;
		}
		_acquire() {
			if (!this.pool) return shared.Promise.reject(new ConnectionError("Connection not yet open.", "ENOTOPEN"));
			else if (this.pool.destroyed) return shared.Promise.reject(new ConnectionError("Connection is closing", "ENOTOPEN"));
			return this.pool.acquire().promise;
		}
		/**
		* Release connection back to the pool.
		*
		* @param {Connection} connection Previously acquired connection.
		* @return {ConnectionPool}
		*/
		release(connection) {
			debug("connection(%d): released", IDS.get(connection));
			publish(CHANNELS.CONNECTION_RELEASE, () => ({
				connectionId: IDS.get(connection),
				poolId: IDS.get(this)
			}));
			if (this.pool) this.pool.release(connection);
			return this;
		}
		/**
		* Creates a new connection pool with one active connection. This one initial connection serves as a probe to find out whether the configuration is valid.
		*
		* @param {basicCallback} [callback] A callback which is called after connection has established, or an error has occurred. If omited, method returns Promise.
		* @return {ConnectionPool|Promise}
		*/
		connect(callback) {
			if (typeof callback === "function") {
				traceCallback(CHANNELS.TRACE_CONNECT, this._connect, 0, () => ({
					server: this.config.server,
					port: this.config.port,
					database: this.config.database,
					poolId: IDS.get(this),
					poolConfig: {
						min: this.config.pool && this.config.pool.min || 0,
						max: this.config.pool && this.config.pool.max || 10
					}
				}), this, [callback]);
				return this;
			}
			return tracePromise(CHANNELS.TRACE_CONNECT, () => {
				return new shared.Promise((resolve, reject) => {
					return this._connect((err) => {
						if (err) return reject(err);
						resolve(this);
					});
				});
			}, () => ({
				server: this.config.server,
				port: this.config.port,
				database: this.config.database,
				poolId: IDS.get(this),
				poolConfig: {
					min: this.config.pool && this.config.pool.min || 0,
					max: this.config.pool && this.config.pool.max || 10
				}
			}));
		}
		/**
		* @private
		* @param {basicCallback} callback
		*/
		_connect(callback) {
			if (this._connected) {
				debug("pool(%d): already connected, executing connect callback immediately", IDS.get(this));
				return setImmediate(callback, null, this);
			}
			this._connectStack.push(callback);
			if (this._connecting) return;
			this._connecting = true;
			debug("pool(%d): connecting", IDS.get(this));
			this._poolCreate().then((connection) => {
				debug("pool(%d): connected", IDS.get(this));
				this._healthy = true;
				return this._poolDestroy(connection).then(() => {
					this.pool = new tarn.Pool(Object.assign({
						create: () => this._poolCreate().then((connection) => {
							this._healthy = true;
							return connection;
						}).catch((err) => {
							if (this.pool.numUsed() + this.pool.numFree() <= 0) this._healthy = false;
							throw err;
						}),
						validate: this._poolValidate.bind(this),
						destroy: this._poolDestroy.bind(this),
						max: 10,
						min: 0,
						idleTimeoutMillis: 3e4,
						propagateCreateError: true
					}, this.config.pool));
					this._connecting = false;
					this._connected = true;
				});
			}).then(() => {
				this._connectStack.forEach((cb) => {
					setImmediate(cb, null, this);
				});
			}).catch((err) => {
				this._connecting = false;
				this._connectStack.forEach((cb) => {
					setImmediate(cb, err);
				});
			}).then(() => {
				this._connectStack = [];
			});
		}
		get size() {
			return this.pool.numFree() + this.pool.numUsed() + this.pool.numPendingCreates();
		}
		get available() {
			return this.pool.numFree();
		}
		get pending() {
			return this.pool.numPendingAcquires();
		}
		get borrowed() {
			return this.pool.numUsed();
		}
		/**
		* Close all active connections in the pool.
		*
		* @param {basicCallback} [callback] A callback which is called after connection has closed, or an error has occurred. If omited, method returns Promise.
		* @return {ConnectionPool|Promise}
		*/
		close(callback) {
			if (typeof callback === "function") {
				this._close(callback);
				return this;
			}
			return new shared.Promise((resolve, reject) => {
				this._close((err) => {
					if (err) return reject(err);
					resolve(this);
				});
			});
		}
		/**
		* @private
		* @param {basicCallback} callback
		*/
		_close(callback) {
			if (this._connecting) {
				debug("pool(%d): close called while connecting", IDS.get(this));
				setImmediate(callback, new ConnectionError("Cannot close a pool while it is connecting"));
			}
			if (!this.pool) {
				debug("pool(%d): already closed, executing close callback immediately", IDS.get(this));
				return setImmediate(callback, null);
			}
			this._closeStack.push(callback);
			if (this.pool.destroyed) return;
			this._connecting = this._connected = this._healthy = false;
			this.pool.destroy().then(() => {
				debug("pool(%d): pool closed, removing pool reference and executing close callbacks", IDS.get(this));
				publish(CHANNELS.POOL_CLOSE, () => ({
					poolId: IDS.get(this),
					reason: "closed"
				}));
				this.pool = null;
				this._closeStack.forEach((cb) => {
					setImmediate(cb, null);
				});
			}).catch((err) => {
				publish(CHANNELS.POOL_CLOSE, () => ({
					poolId: IDS.get(this),
					reason: "error",
					error: err
				}));
				this.pool = null;
				this._closeStack.forEach((cb) => {
					setImmediate(cb, err);
				});
			}).then(() => {
				this._closeStack = [];
			});
		}
		/**
		* Returns new request using this connection.
		*
		* @param {{ requestTimeout?: number }} [conf] Per-request overrides.
		* @return {Request}
		*/
		request(conf) {
			return new shared.driver.Request(this, conf);
		}
		/**
		* Returns new transaction using this connection.
		*
		* @param {{ requestTimeout?: number }} [conf] Per-transaction overrides, cascaded to child requests.
		* @return {Transaction}
		*/
		transaction(conf) {
			return new shared.driver.Transaction(this, conf);
		}
		/**
		* Creates a new query using this connection from a tagged template string.
		*
		* @variation 1
		* @param {Array} strings Array of string literals.
		* @param {...*} keys Values.
		* @return {Request}
		*/
		/**
		* Execute the SQL command.
		*
		* @variation 2
		* @param {String} command T-SQL command to be executed.
		* @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
		* @return {Request|Promise}
		*/
		query() {
			if (typeof arguments[0] === "string") return new shared.driver.Request(this).query(arguments[0], arguments[1]);
			const values = Array.prototype.slice.call(arguments);
			const strings = values.shift();
			return new shared.driver.Request(this)._template(strings, values, "query");
		}
		/**
		* Creates a new batch using this connection from a tagged template string.
		*
		* @variation 1
		* @param {Array} strings Array of string literals.
		* @param {...*} keys Values.
		* @return {Request}
		*/
		/**
		* Execute the SQL command.
		*
		* @variation 2
		* @param {String} command T-SQL command to be executed.
		* @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
		* @return {Request|Promise}
		*/
		batch() {
			if (typeof arguments[0] === "string") return new shared.driver.Request(this).batch(arguments[0], arguments[1]);
			const values = Array.prototype.slice.call(arguments);
			const strings = values.shift();
			return new shared.driver.Request(this)._template(strings, values, "batch");
		}
	};
	module.exports = ConnectionPool;
}));
//#endregion
//#region node_modules/mssql/lib/global-connection.js
var require_global_connection = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var shared = require_shared();
	var globalConnection = null;
	var globalConnectionHandlers = {};
	/**
	* Open global connection pool.
	*
	* @param {Object|String} config Connection configuration object or connection string.
	* @param {basicCallback} [callback] A callback which is called after connection has established, or an error has occurred. If omited, method returns Promise.
	* @return {Promise.<ConnectionPool>}
	*/
	function connect(config, callback) {
		if (!globalConnection) {
			globalConnection = new shared.driver.ConnectionPool(config);
			for (const event in globalConnectionHandlers) for (let i = 0, l = globalConnectionHandlers[event].length; i < l; i++) globalConnection.on(event, globalConnectionHandlers[event][i]);
			const ogClose = globalConnection.close;
			const globalClose = function(callback) {
				for (const event in globalConnectionHandlers) for (let i = 0, l = globalConnectionHandlers[event].length; i < l; i++) this.removeListener(event, globalConnectionHandlers[event][i]);
				this.on("error", (err) => {
					if (globalConnectionHandlers.error) for (let i = 0, l = globalConnectionHandlers.error.length; i < l; i++) globalConnectionHandlers.error[i].call(this, err);
				});
				globalConnection = null;
				return ogClose.call(this, callback);
			};
			globalConnection.close = globalClose.bind(globalConnection);
		}
		if (typeof callback === "function") return globalConnection.connect((err, connection) => {
			if (err) globalConnection = null;
			callback(err, connection);
		});
		return globalConnection.connect().catch((err) => {
			globalConnection = null;
			return shared.Promise.reject(err);
		});
	}
	/**
	* Close all active connections in the global pool.
	*
	* @param {basicCallback} [callback] A callback which is called after connection has closed, or an error has occurred. If omited, method returns Promise.
	* @return {ConnectionPool|Promise}
	*/
	function close(callback) {
		if (globalConnection) {
			const gc = globalConnection;
			globalConnection = null;
			return gc.close(callback);
		}
		if (typeof callback === "function") {
			setImmediate(callback);
			return null;
		}
		return new shared.Promise((resolve) => {
			resolve(globalConnection);
		});
	}
	/**
	* Attach event handler to global connection pool.
	*
	* @param {String} event Event name.
	* @param {Function} handler Event handler.
	* @return {ConnectionPool}
	*/
	function on(event, handler) {
		if (!globalConnectionHandlers[event]) globalConnectionHandlers[event] = [];
		globalConnectionHandlers[event].push(handler);
		if (globalConnection) globalConnection.on(event, handler);
		return globalConnection;
	}
	/**
	* Detach event handler from global connection.
	*
	* @param {String} event Event name.
	* @param {Function} handler Event handler.
	* @return {ConnectionPool}
	*/
	function removeListener(event, handler) {
		if (!globalConnectionHandlers[event]) return globalConnection;
		const index = globalConnectionHandlers[event].indexOf(handler);
		if (index === -1) return globalConnection;
		globalConnectionHandlers[event].splice(index, 1);
		if (globalConnectionHandlers[event].length === 0) globalConnectionHandlers[event] = void 0;
		if (globalConnection) globalConnection.removeListener(event, handler);
		return globalConnection;
	}
	/**
	* Creates a new query using global connection from a tagged template string.
	*
	* @variation 1
	* @param {Array|String} strings Array of string literals or sql command.
	* @param {...*} keys Values.
	* @return {Request}
	*/
	/**
	* Execute the SQL command.
	*
	* @variation 2
	* @param {String} command T-SQL command to be executed.
	* @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
	* @return {Request|Promise}
	*/
	function query() {
		if (typeof arguments[0] === "string") return new shared.driver.Request().query(arguments[0], arguments[1]);
		const values = Array.prototype.slice.call(arguments);
		const strings = values.shift();
		return new shared.driver.Request()._template(strings, values, "query");
	}
	/**
	* Creates a new batch using global connection from a tagged template string.
	*
	* @variation 1
	* @param {Array} strings Array of string literals.
	* @param {...*} keys Values.
	* @return {Request}
	*/
	/**
	* Execute the SQL command.
	*
	* @variation 2
	* @param {String} command T-SQL command to be executed.
	* @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
	* @return {Request|Promise}
	*/
	function batch() {
		if (typeof arguments[0] === "string") return new shared.driver.Request().batch(arguments[0], arguments[1]);
		const values = Array.prototype.slice.call(arguments);
		const strings = values.shift();
		return new shared.driver.Request()._template(strings, values, "batch");
	}
	module.exports = {
		batch,
		close,
		connect,
		off: removeListener,
		on,
		query,
		removeListener
	};
	Object.defineProperty(module.exports, "pool", {
		get: () => {
			return globalConnection;
		},
		set: () => {}
	});
}));
//#endregion
//#region node_modules/mssql/lib/base/prepared-statement.js
var require_prepared_statement = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var debug = require_src()("mssql:base");
	var { EventEmitter: EventEmitter$2 } = __require("node:events");
	var { IDS, objectHasProperty, getPoolId } = require_utils();
	var globalConnection = require_global_connection();
	var { TransactionError, PreparedStatementError } = require_error();
	var shared = require_shared();
	var { TYPES, declare } = require_datatypes();
	var { CHANNELS, tracePromise, traceCallback, publish } = require_diagnostics();
	/**
	* Class PreparedStatement.
	*
	* IMPORTANT: Rememeber that each prepared statement means one reserved connection from the pool. Don't forget to unprepare a prepared statement!
	*
	* @property {String} statement Prepared SQL statement.
	*/
	var PreparedStatement = class extends EventEmitter$2 {
		/**
		* Creates a new Prepared Statement.
		*
		* @param {ConnectionPool|Transaction} [parent]
		* @param {{ requestTimeout?: number }} [overrides]
		*/
		constructor(parent, overrides = {}) {
			super();
			IDS.add(this, "PreparedStatement");
			debug("ps(%d): created", IDS.get(this));
			this.parent = parent || globalConnection.pool;
			this._handle = 0;
			this.prepared = false;
			this.parameters = {};
			this.overrides = {};
			if (Number.isFinite(overrides?.requestTimeout) && overrides.requestTimeout >= 0) this.overrides.requestTimeout = overrides.requestTimeout;
		}
		get config() {
			return this.parent.config;
		}
		get connected() {
			return this.parent.connected;
		}
		/**
		* Acquire connection from connection pool.
		*
		* @param {Request} request Request.
		* @param {ConnectionPool~acquireCallback} [callback] A callback which is called after connection has established, or an error has occurred. If omited, method returns Promise.
		* @return {PreparedStatement|Promise}
		*/
		acquire(request, callback) {
			if (!this._acquiredConnection) {
				setImmediate(callback, new PreparedStatementError("Statement is not prepared. Call prepare() first.", "ENOTPREPARED"));
				return this;
			}
			if (this._activeRequest) {
				setImmediate(callback, new TransactionError("Can't acquire connection for the request. There is another request in progress.", "EREQINPROG"));
				return this;
			}
			this._activeRequest = request;
			setImmediate(callback, null, this._acquiredConnection, this._acquiredConfig);
			return this;
		}
		/**
		* Release connection back to the pool.
		*
		* @param {Connection} connection Previously acquired connection.
		* @return {PreparedStatement}
		*/
		release(connection) {
			if (connection === this._acquiredConnection) this._activeRequest = null;
			return this;
		}
		/**
		* Add an input parameter to the prepared statement.
		*
		* @param {String} name Name of the input parameter without @ char.
		* @param {*} type SQL data type of input parameter.
		* @return {PreparedStatement}
		*/
		input(name, type) {
			if (/--| |\/\*|\*\/|'/.test(name)) throw new PreparedStatementError(`SQL injection warning for param '${name}'`, "EINJECT");
			if (arguments.length < 2) throw new PreparedStatementError("Invalid number of arguments. 2 arguments expected.", "EARGS");
			if (type instanceof Function) type = type();
			if (objectHasProperty(this.parameters, name)) throw new PreparedStatementError(`The parameter name ${name} has already been declared. Parameter names must be unique`, "EDUPEPARAM");
			this.parameters[name] = {
				name,
				type: type.type,
				io: 1,
				length: type.length,
				scale: type.scale,
				precision: type.precision,
				tvpType: type.tvpType
			};
			return this;
		}
		/**
		* Replace an input parameter on the request.
		*
		* @param {String} name Name of the input parameter without @ char.
		* @param {*} [type] SQL data type of input parameter. If you omit type, module automaticaly decide which SQL data type should be used based on JS data type.
		* @param {*} value Input parameter value. `undefined` and `NaN` values are automatically converted to `null` values.
		* @return {Request}
		*/
		replaceInput(name, type, value) {
			delete this.parameters[name];
			return this.input(name, type, value);
		}
		/**
		* Add an output parameter to the prepared statement.
		*
		* @param {String} name Name of the output parameter without @ char.
		* @param {*} type SQL data type of output parameter.
		* @return {PreparedStatement}
		*/
		output(name, type) {
			if (/--| |\/\*|\*\/|'/.test(name)) throw new PreparedStatementError(`SQL injection warning for param '${name}'`, "EINJECT");
			if (arguments.length < 2) throw new PreparedStatementError("Invalid number of arguments. 2 arguments expected.", "EARGS");
			if (type instanceof Function) type = type();
			if (objectHasProperty(this.parameters, name)) throw new PreparedStatementError(`The parameter name ${name} has already been declared. Parameter names must be unique`, "EDUPEPARAM");
			this.parameters[name] = {
				name,
				type: type.type,
				io: 2,
				length: type.length,
				scale: type.scale,
				precision: type.precision
			};
			return this;
		}
		/**
		* Replace an output parameter on the request.
		*
		* @param {String} name Name of the output parameter without @ char.
		* @param {*} type SQL data type of output parameter.
		* @return {PreparedStatement}
		*/
		replaceOutput(name, type) {
			delete this.parameters[name];
			return this.output(name, type);
		}
		/**
		* Prepare a statement.
		*
		* @param {String} statement SQL statement to prepare.
		* @param {basicCallback} [callback] A callback which is called after preparation has completed, or an error has occurred. If omited, method returns Promise.
		* @return {PreparedStatement|Promise}
		*/
		prepare(statement, callback) {
			if (typeof callback === "function") {
				traceCallback(CHANNELS.TRACE_PREPARED_STATEMENT_PREPARE, this._prepare, 1, () => ({
					statement: statement || this.statement,
					parameters: Object.keys(this.parameters),
					preparedStatementId: IDS.get(this),
					poolId: getPoolId(this)
				}), this, [statement, callback]);
				return this;
			}
			return tracePromise(CHANNELS.TRACE_PREPARED_STATEMENT_PREPARE, () => {
				return new shared.Promise((resolve, reject) => {
					this._prepare(statement, (err) => {
						if (err) return reject(err);
						resolve(this);
					});
				});
			}, () => ({
				statement: statement || this.statement,
				parameters: Object.keys(this.parameters),
				preparedStatementId: IDS.get(this),
				poolId: getPoolId(this)
			}));
		}
		/**
		* @private
		* @param {String} statement
		* @param {basicCallback} callback
		*/
		_prepare(statement, callback) {
			debug("ps(%d): prepare", IDS.get(this));
			if (typeof statement === "function") {
				callback = statement;
				statement = void 0;
			}
			if (this.prepared) return setImmediate(callback, new PreparedStatementError("Statement is already prepared.", "EALREADYPREPARED"));
			this.statement = statement || this.statement;
			this.parent.acquire(this, (err, connection, config) => {
				if (err) return callback(err);
				this._acquiredConnection = connection;
				this._acquiredConfig = config;
				const req = new shared.driver.Request(this, this.overrides);
				req._internal = true;
				req.stream = false;
				req.output("handle", TYPES.Int);
				req.input("params", TYPES.NVarChar, (() => {
					const result = [];
					for (const name in this.parameters) {
						if (!objectHasProperty(this.parameters, name)) continue;
						const param = this.parameters[name];
						result.push(`@${name} ${declare(param.type, param)}${param.io === 2 ? " output" : ""}`);
					}
					return result;
				})().join(","));
				req.input("stmt", TYPES.NVarChar, this.statement);
				req.execute("sp_prepare", (err, result) => {
					if (err) {
						this.parent.release(this._acquiredConnection);
						this._acquiredConnection = null;
						this._acquiredConfig = null;
						return callback(err);
					}
					debug("ps(%d): prepared", IDS.get(this));
					this._handle = result.output.handle;
					this.prepared = true;
					callback(null);
				});
			});
		}
		/**
		* Execute a prepared statement.
		*
		* @param {Object} values An object whose names correspond to the names of parameters that were added to the prepared statement before it was prepared.
		* @param {basicCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
		* @return {Request|Promise}
		*/
		execute(values, callback) {
			if (this.stream || typeof callback === "function") {
				if (typeof callback !== "function") return this._execute(values, callback);
				return traceCallback(CHANNELS.TRACE_PREPARED_STATEMENT_EXECUTE, this._execute, 1, () => ({
					statement: this.statement,
					parameters: Object.keys(this.parameters),
					handle: this._handle,
					preparedStatementId: IDS.get(this),
					poolId: getPoolId(this)
				}), this, [values, callback]);
			}
			return tracePromise(CHANNELS.TRACE_PREPARED_STATEMENT_EXECUTE, () => {
				return new shared.Promise((resolve, reject) => {
					this._execute(values, (err, recordset) => {
						if (err) return reject(err);
						resolve(recordset);
					});
				});
			}, () => ({
				statement: this.statement,
				parameters: Object.keys(this.parameters),
				handle: this._handle,
				preparedStatementId: IDS.get(this),
				poolId: getPoolId(this)
			}));
		}
		/**
		* @private
		* @param {Object} values
		* @param {basicCallback} callback
		*/
		_execute(values, callback) {
			const req = new shared.driver.Request(this, this.overrides);
			req._internal = true;
			req.stream = this.stream;
			req.arrayRowMode = this.arrayRowMode;
			req.input("handle", TYPES.Int, this._handle);
			for (const name in this.parameters) {
				if (!objectHasProperty(this.parameters, name)) continue;
				const param = this.parameters[name];
				req.parameters[name] = {
					name,
					type: param.type,
					io: param.io,
					value: values[name],
					length: param.length,
					scale: param.scale,
					precision: param.precision
				};
			}
			req.execute("sp_execute", typeof callback === "function" ? callback : () => {});
			return req;
		}
		/**
		* Unprepare a prepared statement.
		*
		* @param {basicCallback} [callback] A callback which is called after unpreparation has completed, or an error has occurred. If omited, method returns Promise.
		* @return {PreparedStatement|Promise}
		*/
		unprepare(callback) {
			if (typeof callback === "function") {
				this._unprepare((err) => {
					if (!err) publish(CHANNELS.PREPARED_STATEMENT_UNPREPARE, () => ({
						preparedStatementId: IDS.get(this),
						poolId: getPoolId(this)
					}));
					callback(err);
				});
				return this;
			}
			return new shared.Promise((resolve, reject) => {
				this._unprepare((err) => {
					if (err) return reject(err);
					publish(CHANNELS.PREPARED_STATEMENT_UNPREPARE, () => ({
						preparedStatementId: IDS.get(this),
						poolId: getPoolId(this)
					}));
					resolve();
				});
			});
		}
		/**
		* @private
		* @param {basicCallback} callback
		*/
		_unprepare(callback) {
			debug("ps(%d): unprepare", IDS.get(this));
			if (!this.prepared) return setImmediate(callback, new PreparedStatementError("Statement is not prepared. Call prepare() first.", "ENOTPREPARED"));
			if (this._activeRequest) return setImmediate(callback, new TransactionError("Can't unprepare the statement. There is a request in progress.", "EREQINPROG"));
			const req = new shared.driver.Request(this, this.overrides);
			req._internal = true;
			req.stream = false;
			req.input("handle", TYPES.Int, this._handle);
			req.execute("sp_unprepare", (err) => {
				if (err) return callback(err);
				this.parent.release(this._acquiredConnection);
				this._acquiredConnection = null;
				this._acquiredConfig = null;
				this._handle = 0;
				this.prepared = false;
				debug("ps(%d): unprepared", IDS.get(this));
				return callback(null);
			});
		}
	};
	module.exports = PreparedStatement;
}));
//#endregion
//#region node_modules/mssql/lib/base/request.js
var require_request$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var debug = require_src()("mssql:base");
	var { EventEmitter: EventEmitter$1 } = __require("node:events");
	var { Readable } = __require("node:stream");
	var { IDS, objectHasProperty, getPoolId } = require_utils();
	var globalConnection = require_global_connection();
	var { RequestError, ConnectionError } = require_error();
	var { TYPES } = require_datatypes();
	var shared = require_shared();
	var { CHANNELS, tracePromise, traceCallback, publish } = require_diagnostics();
	/**
	* Class Request.
	*
	* @property {Transaction} transaction Reference to transaction when request was created in transaction.
	* @property {*} parameters Collection of input and output parameters.
	* @property {Boolean} canceled `true` if request was canceled.
	*
	* @fires Request#recordset
	* @fires Request#row
	* @fires Request#done
	* @fires Request#error
	*/
	var Request = class extends EventEmitter$1 {
		/**
		* Create new Request.
		*
		* @param {Connection|ConnectionPool|Transaction|PreparedStatement} [parent] If omitted, global connection is used instead.
		* @param {{ requestTimeout?: number }} [overrides]
		*/
		constructor(parent, overrides = {}) {
			super();
			IDS.add(this, "Request");
			debug("request(%d): created", IDS.get(this));
			this.canceled = false;
			this._paused = false;
			this._internal = false;
			this.parent = parent || globalConnection.pool;
			this.parameters = {};
			this.stream = null;
			this.arrayRowMode = null;
			this.overrides = {};
			if (Number.isFinite(overrides?.requestTimeout) && overrides.requestTimeout >= 0) this.overrides.requestTimeout = overrides.requestTimeout;
		}
		get paused() {
			return this._paused;
		}
		/**
		* Generate sql string and set input parameters from tagged template string.
		*
		* @param {Template literal} template
		* @return {String}
		*/
		template() {
			const values = Array.prototype.slice.call(arguments);
			const strings = values.shift();
			return this._template(strings, values);
		}
		/**
		* Fetch request from tagged template string.
		*
		* @private
		* @param {Array} strings
		* @param {Array} values
		* @param {String} [method] If provided, method is automatically called with serialized command on this object.
		* @return {Request}
		*/
		_template(strings, values, method) {
			const command = [strings[0]];
			for (let index = 0; index < values.length; index++) {
				const value = values[index];
				if (Array.isArray(value)) {
					for (let parameterIndex = 0; parameterIndex < value.length; parameterIndex++) {
						this.input(`param${index + 1}_${parameterIndex}`, value[parameterIndex]);
						command.push(`@param${index + 1}_${parameterIndex}`);
						if (parameterIndex < value.length - 1) command.push(", ");
					}
					command.push(strings[index + 1]);
				} else {
					this.input(`param${index + 1}`, value);
					command.push(`@param${index + 1}`, strings[index + 1]);
				}
			}
			if (method) return this[method](command.join(""));
			else return command.join("");
		}
		/**
		* Add an input parameter to the request.
		*
		* @param {String} name Name of the input parameter without @ char.
		* @param {*} [type] SQL data type of input parameter. If you omit type, module automatically decides which SQL data type should be used based on JS data type.
		* @param {*} value Input parameter value. `undefined` and `NaN` values are automatically converted to `null` values.
		* @return {Request}
		*/
		input(name, type, value) {
			if (/--| |\/\*|\*\/|'/.test(name)) throw new RequestError(`SQL injection warning for param '${name}'`, "EINJECT");
			if (arguments.length < 2) throw new RequestError("Invalid number of arguments. At least 2 arguments expected.", "EARGS");
			else if (arguments.length === 2) {
				value = type;
				type = shared.getTypeByValue(value);
			}
			if (value && typeof value.valueOf === "function" && !(value instanceof Date)) value = value.valueOf();
			if (value === void 0) value = null;
			if (typeof value === "number" && isNaN(value)) value = null;
			if (type instanceof Function) type = type();
			if (objectHasProperty(this.parameters, name)) throw new RequestError(`The parameter name ${name} has already been declared. Parameter names must be unique`, "EDUPEPARAM");
			this.parameters[name] = {
				name,
				type: type.type,
				io: 1,
				value,
				length: type.length,
				scale: type.scale,
				precision: type.precision,
				tvpType: type.tvpType
			};
			return this;
		}
		/**
		* Replace an input parameter on the request.
		*
		* @param {String} name Name of the input parameter without @ char.
		* @param {*} [type] SQL data type of input parameter. If you omit type, module automatically decides which SQL data type should be used based on JS data type.
		* @param {*} value Input parameter value. `undefined` and `NaN` values are automatically converted to `null` values.
		* @return {Request}
		*/
		replaceInput(name, type, value) {
			delete this.parameters[name];
			return this.input(name, type, value);
		}
		/**
		* Add an output parameter to the request.
		*
		* @param {String} name Name of the output parameter without @ char.
		* @param {*} type SQL data type of output parameter.
		* @param {*} [value] Output parameter value initial value. `undefined` and `NaN` values are automatically converted to `null` values. Optional.
		* @return {Request}
		*/
		output(name, type, value) {
			if (!type) type = TYPES.NVarChar;
			if (/--| |\/\*|\*\/|'/.test(name)) throw new RequestError(`SQL injection warning for param '${name}'`, "EINJECT");
			if (type === TYPES.Text || type === TYPES.NText || type === TYPES.Image) throw new RequestError("Deprecated types (Text, NText, Image) are not supported as OUTPUT parameters.", "EDEPRECATED");
			if (value && typeof value.valueOf === "function" && !(value instanceof Date)) value = value.valueOf();
			if (value === void 0) value = null;
			if (typeof value === "number" && isNaN(value)) value = null;
			if (type instanceof Function) type = type();
			if (objectHasProperty(this.parameters, name)) throw new RequestError(`The parameter name ${name} has already been declared. Parameter names must be unique`, "EDUPEPARAM");
			this.parameters[name] = {
				name,
				type: type.type,
				io: 2,
				value,
				length: type.length,
				scale: type.scale,
				precision: type.precision
			};
			return this;
		}
		/**
		* Replace an output parameter on the request.
		*
		* @param {String} name Name of the output parameter without @ char.
		* @param {*} type SQL data type of output parameter.
		* @param {*} [value] Output parameter value initial value. `undefined` and `NaN` values are automatically converted to `null` values. Optional.
		* @return {Request}
		*/
		replaceOutput(name, type, value) {
			delete this.parameters[name];
			return this.output(name, type, value);
		}
		_getParameterNames() {
			return Object.keys(this.parameters);
		}
		_tracedPromise(channel, contextFactory, fn) {
			if (this._internal) return fn();
			return tracePromise(channel, fn, contextFactory);
		}
		_tracedCallback(channel, contextFactory, fn, position, args) {
			if (this._internal) return fn.apply(this, args);
			return traceCallback(channel, fn, position, contextFactory, this, args);
		}
		/**
		* Execute the SQL batch.
		*
		* @param {String} batch T-SQL batch to be executed.
		* @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
		* @return {Request|Promise}
		*/
		batch(batch, callback) {
			if (this.stream === null && this.parent) this.stream = this.parent.config.stream;
			if (this.arrayRowMode === null && this.parent) this.arrayRowMode = this.parent.config.arrayRowMode;
			this.rowsAffected = 0;
			if (typeof callback === "function") {
				this._tracedCallback(CHANNELS.TRACE_BATCH, () => ({
					command: batch,
					requestId: IDS.get(this),
					poolId: getPoolId(this)
				}), this._batch, 1, [batch, (err, recordsets, output, rowsAffected) => {
					if (this.stream) {
						if (err) this.emit("error", err);
						err = null;
						this.emit("done", {
							output,
							rowsAffected
						});
					}
					if (err) return callback(err);
					callback(null, {
						recordsets,
						recordset: recordsets && recordsets[0],
						output,
						rowsAffected
					});
				}]);
				return this;
			}
			if (typeof batch === "object") {
				const values = Array.prototype.slice.call(arguments);
				const strings = values.shift();
				batch = this._template(strings, values);
			}
			const batchCommand = batch;
			return this._tracedPromise(CHANNELS.TRACE_BATCH, () => ({
				command: batchCommand,
				requestId: IDS.get(this),
				poolId: getPoolId(this)
			}), () => {
				return new shared.Promise((resolve, reject) => {
					this._batch(batchCommand, (err, recordsets, output, rowsAffected) => {
						if (this.stream) {
							if (err) this.emit("error", err);
							err = null;
							this.emit("done", {
								output,
								rowsAffected
							});
						}
						if (err) return reject(err);
						resolve({
							recordsets,
							recordset: recordsets && recordsets[0],
							output,
							rowsAffected
						});
					});
				});
			});
		}
		/**
		* @private
		* @param {String} batch
		* @param {Request~requestCallback} callback
		*/
		_batch(batch, callback) {
			if (!this.parent) return setImmediate(callback, new RequestError("No connection is specified for that request.", "ENOCONN"));
			if (!this.parent.connected) return setImmediate(callback, new ConnectionError("Connection is closed.", "ECONNCLOSED"));
			this.canceled = false;
			setImmediate(callback);
		}
		/**
		* Bulk load.
		*
		* @param {Table} table SQL table.
		* @param {object} [options] Options to be passed to the underlying driver (tedious only).
		* @param {Request~bulkCallback} [callback] A callback which is called after bulk load has completed, or an error has occurred. If omited, method returns Promise.
		* @return {Request|Promise}
		*/
		bulk(table, options, callback) {
			if (typeof options === "function") {
				callback = options;
				options = {};
			} else if (typeof options === "undefined") options = {};
			if (this.stream === null && this.parent) this.stream = this.parent.config.stream;
			if (this.arrayRowMode === null && this.parent) this.arrayRowMode = this.parent.config.arrayRowMode;
			if (this.stream || typeof callback === "function") {
				this._tracedCallback(CHANNELS.TRACE_BULK, () => ({
					table: table.path || table.name,
					rowCount: table.rows ? table.rows.length : 0,
					requestId: IDS.get(this),
					poolId: getPoolId(this)
				}), this._bulk, 2, [
					table,
					options,
					(err, rowsAffected) => {
						if (this.stream) {
							if (err) this.emit("error", err);
							return this.emit("done", { rowsAffected });
						}
						if (err) return callback(err);
						callback(null, { rowsAffected });
					}
				]);
				return this;
			}
			return this._tracedPromise(CHANNELS.TRACE_BULK, () => ({
				table: table.path || table.name,
				rowCount: table.rows ? table.rows.length : 0,
				requestId: IDS.get(this),
				poolId: getPoolId(this)
			}), () => {
				return new shared.Promise((resolve, reject) => {
					this._bulk(table, options, (err, rowsAffected) => {
						if (err) return reject(err);
						resolve({ rowsAffected });
					});
				});
			});
		}
		/**
		* @private
		* @param {Table} table
		* @param {object} options
		* @param {Request~bulkCallback} callback
		*/
		_bulk(table, options, callback) {
			if (!this.parent) return setImmediate(callback, new RequestError("No connection is specified for that request.", "ENOCONN"));
			if (!this.parent.connected) return setImmediate(callback, new ConnectionError("Connection is closed.", "ECONNCLOSED"));
			this.canceled = false;
			setImmediate(callback);
		}
		/**
		* Wrap original request in a Readable stream that supports back pressure and return.
		* It also sets request to `stream` mode and pulls all rows from all recordsets to a given stream.
		*
		* @param {Object} streamOptions - optional options to configure the readable stream with like highWaterMark
		* @return {Stream}
		*/
		toReadableStream(streamOptions = {}) {
			this.stream = true;
			this.pause();
			const readableStream = new Readable({
				...streamOptions,
				objectMode: true,
				read: () => {
					this.resume();
				}
			});
			this.on("row", (row) => {
				if (!readableStream.push(row)) this.pause();
			});
			this.on("error", (error) => {
				readableStream.emit("error", error);
			});
			this.on("done", () => {
				readableStream.push(null);
			});
			return readableStream;
		}
		/**
		* Wrap original request in a Readable stream that supports back pressure and pipe to the Writable stream.
		* It also sets request to `stream` mode and pulls all rows from all recordsets to a given stream.
		*
		* @param {Stream} stream Stream to pipe data into.
		* @return {Stream}
		*/
		pipe(writableStream) {
			return this.toReadableStream().pipe(writableStream);
		}
		/**
		* Execute the SQL command.
		*
		* @param {String} command T-SQL command to be executed.
		* @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
		* @return {Request|Promise}
		*/
		query(command, callback) {
			if (this.stream === null && this.parent) this.stream = this.parent.config.stream;
			if (this.arrayRowMode === null && this.parent) this.arrayRowMode = this.parent.config.arrayRowMode;
			this.rowsAffected = 0;
			if (typeof callback === "function") {
				this._tracedCallback(CHANNELS.TRACE_QUERY, () => ({
					command,
					parameters: this._getParameterNames(),
					requestId: IDS.get(this),
					poolId: getPoolId(this)
				}), this._query, 1, [command, (err, recordsets, output, rowsAffected, columns) => {
					if (this.stream) {
						if (err) this.emit("error", err);
						err = null;
						this.emit("done", {
							output,
							rowsAffected
						});
					}
					if (err) return callback(err);
					const result = {
						recordsets,
						recordset: recordsets && recordsets[0],
						output,
						rowsAffected
					};
					if (this.arrayRowMode) result.columns = columns;
					callback(null, result);
				}]);
				return this;
			}
			if (typeof command === "object") {
				const values = Array.prototype.slice.call(arguments);
				const strings = values.shift();
				command = this._template(strings, values);
			}
			return this._tracedPromise(CHANNELS.TRACE_QUERY, () => ({
				command,
				parameters: this._getParameterNames(),
				requestId: IDS.get(this),
				poolId: getPoolId(this)
			}), () => {
				return new shared.Promise((resolve, reject) => {
					this._query(command, (err, recordsets, output, rowsAffected, columns) => {
						if (this.stream) {
							if (err) this.emit("error", err);
							err = null;
							this.emit("done", {
								output,
								rowsAffected
							});
						}
						if (err) return reject(err);
						const result = {
							recordsets,
							recordset: recordsets && recordsets[0],
							output,
							rowsAffected
						};
						if (this.arrayRowMode) result.columns = columns;
						resolve(result);
					});
				});
			});
		}
		/**
		* @private
		* @param {String} command
		* @param {Request~bulkCallback} callback
		*/
		_query(command, callback) {
			if (!this.parent) return setImmediate(callback, new RequestError("No connection is specified for that request.", "ENOCONN"));
			if (!this.parent.connected) return setImmediate(callback, new ConnectionError("Connection is closed.", "ECONNCLOSED"));
			this.canceled = false;
			setImmediate(callback);
		}
		/**
		* Call a stored procedure.
		*
		* @param {String} procedure Name of the stored procedure to be executed.
		* @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
		* @return {Request|Promise}
		*/
		execute(command, callback) {
			if (this.stream === null && this.parent) this.stream = this.parent.config.stream;
			if (this.arrayRowMode === null && this.parent) this.arrayRowMode = this.parent.config.arrayRowMode;
			this.rowsAffected = 0;
			if (typeof callback === "function") {
				this._tracedCallback(CHANNELS.TRACE_EXECUTE, () => ({
					procedure: command,
					parameters: this._getParameterNames(),
					requestId: IDS.get(this),
					poolId: getPoolId(this)
				}), this._execute, 1, [command, (err, recordsets, output, returnValue, rowsAffected, columns) => {
					if (this.stream) {
						if (err) this.emit("error", err);
						err = null;
						this.emit("done", {
							output,
							rowsAffected,
							returnValue
						});
					}
					if (err) return callback(err);
					const result = {
						recordsets,
						recordset: recordsets && recordsets[0],
						output,
						rowsAffected,
						returnValue
					};
					if (this.arrayRowMode) result.columns = columns;
					callback(null, result);
				}]);
				return this;
			}
			return this._tracedPromise(CHANNELS.TRACE_EXECUTE, () => ({
				procedure: command,
				parameters: this._getParameterNames(),
				requestId: IDS.get(this),
				poolId: getPoolId(this)
			}), () => {
				return new shared.Promise((resolve, reject) => {
					this._execute(command, (err, recordsets, output, returnValue, rowsAffected, columns) => {
						if (this.stream) {
							if (err) this.emit("error", err);
							err = null;
							this.emit("done", {
								output,
								rowsAffected,
								returnValue
							});
						}
						if (err) return reject(err);
						const result = {
							recordsets,
							recordset: recordsets && recordsets[0],
							output,
							rowsAffected,
							returnValue
						};
						if (this.arrayRowMode) result.columns = columns;
						resolve(result);
					});
				});
			});
		}
		/**
		* @private
		* @param {String} procedure
		* @param {Request~bulkCallback} callback
		*/
		_execute(procedure, callback) {
			if (!this.parent) return setImmediate(callback, new RequestError("No connection is specified for that request.", "ENOCONN"));
			if (!this.parent.connected) return setImmediate(callback, new ConnectionError("Connection is closed.", "ECONNCLOSED"));
			this.canceled = false;
			setImmediate(callback);
		}
		/**
		* Cancel currently executed request.
		*
		* @return {Boolean}
		*/
		cancel() {
			this._cancel();
			if (!this._internal) publish(CHANNELS.REQUEST_CANCEL, () => ({ requestId: IDS.get(this) }));
			return true;
		}
		/**
		* @private
		*/
		_cancel() {
			this.canceled = true;
		}
		pause() {
			if (this.stream) {
				this._pause();
				return true;
			}
			return false;
		}
		_pause() {
			this._paused = true;
		}
		resume() {
			if (this.stream) {
				this._resume();
				return true;
			}
			return false;
		}
		_resume() {
			this._paused = false;
		}
		_setCurrentRequest(request) {
			this._currentRequest = request;
			if (this._paused) this.pause();
			return this;
		}
	};
	module.exports = Request;
}));
//#endregion
//#region node_modules/mssql/lib/isolationlevel.js
var require_isolationlevel = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		READ_UNCOMMITTED: 1,
		READ_COMMITTED: 2,
		REPEATABLE_READ: 3,
		SERIALIZABLE: 4,
		SNAPSHOT: 5
	};
}));
//#endregion
//#region node_modules/mssql/lib/base/transaction.js
var require_transaction$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var debug = require_src()("mssql:base");
	var { EventEmitter } = __require("node:events");
	var { IDS, getPoolId } = require_utils();
	var globalConnection = require_global_connection();
	var { TransactionError } = require_error();
	var shared = require_shared();
	var ISOLATION_LEVEL = require_isolationlevel();
	var { CHANNELS, publish } = require_diagnostics();
	var ISOLATION_LEVEL_NAMES = Object.fromEntries(Object.entries(ISOLATION_LEVEL).map(([name, value]) => [value, name]));
	/**
	* Class Transaction.
	*
	* @property {Number} isolationLevel Controls the locking and row versioning behavior of TSQL statements issued by a connection. READ_COMMITTED by default.
	* @property {String} name Transaction name. Empty string by default.
	*
	* @fires Transaction#begin
	* @fires Transaction#commit
	* @fires Transaction#rollback
	*/
	var Transaction = class Transaction extends EventEmitter {
		/**
		* Create new Transaction.
		*
		* @param {Connection} [parent] If omitted, global connection is used instead.
		* @param {{ requestTimeout?: number }} [overrides]
		*/
		constructor(parent, overrides = {}) {
			super();
			IDS.add(this, "Transaction");
			debug("transaction(%d): created", IDS.get(this));
			this.parent = parent || globalConnection.pool;
			this.isolationLevel = Transaction.defaultIsolationLevel;
			this.name = "";
			this.overrides = {};
			if (Number.isFinite(overrides?.requestTimeout) && overrides.requestTimeout >= 0) this.overrides.requestTimeout = overrides.requestTimeout;
		}
		get config() {
			return this.parent.config;
		}
		get connected() {
			return this.parent.connected;
		}
		/**
		* Acquire connection from connection pool.
		*
		* @param {Request} request Request.
		* @param {ConnectionPool~acquireCallback} [callback] A callback which is called after connection has established, or an error has occurred. If omited, method returns Promise.
		* @return {Transaction|Promise}
		*/
		acquire(request, callback) {
			if (!this._acquiredConnection) {
				setImmediate(callback, new TransactionError("Transaction has not begun. Call begin() first.", "ENOTBEGUN"));
				return this;
			}
			if (this._activeRequest) {
				setImmediate(callback, new TransactionError("Can't acquire connection for the request. There is another request in progress.", "EREQINPROG"));
				return this;
			}
			this._activeRequest = request;
			setImmediate(callback, null, this._acquiredConnection, this._acquiredConfig);
			return this;
		}
		/**
		* Release connection back to the pool.
		*
		* @param {Connection} connection Previously acquired connection.
		* @return {Transaction}
		*/
		release(connection) {
			if (connection === this._acquiredConnection) this._activeRequest = null;
			return this;
		}
		/**
		* Begin a transaction.
		*
		* @param {Number} [isolationLevel] Controls the locking and row versioning behavior of TSQL statements issued by a connection.
		* @param {basicCallback} [callback] A callback which is called after transaction has began, or an error has occurred. If omited, method returns Promise.
		* @return {Transaction|Promise}
		*/
		begin(isolationLevel, callback) {
			if (isolationLevel instanceof Function) {
				callback = isolationLevel;
				isolationLevel = void 0;
			}
			if (typeof callback === "function") {
				this._begin(isolationLevel, (err) => {
					if (!err) {
						publish(CHANNELS.TRANSACTION_BEGIN, () => ({
							transactionId: IDS.get(this),
							isolationLevel: this.isolationLevel,
							isolationLevelName: ISOLATION_LEVEL_NAMES[this.isolationLevel],
							poolId: getPoolId(this)
						}));
						this.emit("begin");
					}
					callback(err);
				});
				return this;
			}
			return new shared.Promise((resolve, reject) => {
				this._begin(isolationLevel, (err) => {
					if (err) return reject(err);
					publish(CHANNELS.TRANSACTION_BEGIN, () => ({
						transactionId: IDS.get(this),
						isolationLevel: this.isolationLevel,
						isolationLevelName: ISOLATION_LEVEL_NAMES[this.isolationLevel],
						poolId: getPoolId(this)
					}));
					this.emit("begin");
					resolve(this);
				});
			});
		}
		/**
		* @private
		* @param {Number} [isolationLevel]
		* @param {basicCallback} [callback]
		* @return {Transaction}
		*/
		_begin(isolationLevel, callback) {
			if (this._acquiredConnection) return setImmediate(callback, new TransactionError("Transaction has already begun.", "EALREADYBEGUN"));
			this._aborted = false;
			this._abortReason = null;
			this._rollbackRequested = false;
			if (isolationLevel) if (Object.keys(ISOLATION_LEVEL).some((key) => {
				return ISOLATION_LEVEL[key] === isolationLevel;
			})) this.isolationLevel = isolationLevel;
			else throw new TransactionError("Invalid isolation level.");
			setImmediate(callback);
		}
		/**
		* Commit a transaction.
		*
		* @param {basicCallback} [callback] A callback which is called after transaction has commited, or an error has occurred. If omited, method returns Promise.
		* @return {Transaction|Promise}
		*/
		commit(callback) {
			if (typeof callback === "function") {
				this._commit((err) => {
					if (!err) {
						publish(CHANNELS.TRANSACTION_COMMIT, () => ({ transactionId: IDS.get(this) }));
						this.emit("commit");
					}
					callback(err);
				});
				return this;
			}
			return new shared.Promise((resolve, reject) => {
				this._commit((err) => {
					if (err) return reject(err);
					publish(CHANNELS.TRANSACTION_COMMIT, () => ({ transactionId: IDS.get(this) }));
					this.emit("commit");
					resolve();
				});
			});
		}
		/**
		* Creates a TransactionError for an aborted transaction, preserving the
		* original abort reason (if any) as `originalError`.
		*
		* @private
		* @return {TransactionError}
		*/
		_createAbortError() {
			const err = new TransactionError("Transaction has been aborted.", "EABORT");
			if (this._abortReason) Object.defineProperty(err, "originalError", {
				enumerable: true,
				value: this._abortReason
			});
			return err;
		}
		/**
		* @private
		* @param {basicCallback} [callback]
		* @return {Transaction}
		*/
		_commit(callback) {
			if (this._aborted) return setImmediate(callback, this._createAbortError());
			if (!this._acquiredConnection) return setImmediate(callback, new TransactionError("Transaction has not begun. Call begin() first.", "ENOTBEGUN"));
			if (this._activeRequest) return setImmediate(callback, new TransactionError("Can't commit transaction. There is a request in progress.", "EREQINPROG"));
			setImmediate(callback);
		}
		/**
		* Returns new request using this transaction.
		*
		* @param {{ requestTimeout?: number }} [config]
		* @return {Request}
		*/
		request(config) {
			const overrides = { ...this.overrides };
			if (Number.isFinite(config?.requestTimeout) && config.requestTimeout >= 0) overrides.requestTimeout = config.requestTimeout;
			return new shared.driver.Request(this, overrides);
		}
		/**
		* Rollback a transaction.
		*
		* @param {basicCallback} [callback] A callback which is called after transaction has rolled back, or an error has occurred. If omited, method returns Promise.
		* @return {Transaction|Promise}
		*/
		rollback(callback) {
			if (typeof callback === "function") {
				this._rollback((err) => {
					if (!err) {
						publish(CHANNELS.TRANSACTION_ROLLBACK, () => ({
							transactionId: IDS.get(this),
							aborted: this._aborted
						}));
						this.emit("rollback", this._aborted);
					}
					callback(err);
				});
				return this;
			}
			return new shared.Promise((resolve, reject) => {
				return this._rollback((err) => {
					if (err) return reject(err);
					publish(CHANNELS.TRANSACTION_ROLLBACK, () => ({
						transactionId: IDS.get(this),
						aborted: this._aborted
					}));
					this.emit("rollback", this._aborted);
					resolve();
				});
			});
		}
		/**
		* @private
		* @param {basicCallback} [callback]
		* @return {Transaction}
		*/
		_rollback(callback) {
			if (this._aborted) return setImmediate(callback, this._createAbortError());
			if (!this._acquiredConnection) return setImmediate(callback, new TransactionError("Transaction has not begun. Call begin() first.", "ENOTBEGUN"));
			if (this._activeRequest) return setImmediate(callback, new TransactionError("Can't rollback transaction. There is a request in progress.", "EREQINPROG"));
			this._rollbackRequested = true;
			setImmediate(callback);
		}
	};
	/**
	* Default isolation level used for any transactions that don't explicitly specify an isolation level.
	*
	* @type {number}
	*/
	Transaction.defaultIsolationLevel = ISOLATION_LEVEL.READ_COMMITTED;
	module.exports = Transaction;
}));
//#endregion
//#region node_modules/mssql/lib/base/index.js
var require_base = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ConnectionPool = require_connection_pool$1();
	var PreparedStatement = require_prepared_statement();
	var Request = require_request$2();
	var Transaction = require_transaction$2();
	var { ConnectionError, TransactionError, RequestError, PreparedStatementError, MSSQLError } = require_error();
	var shared = require_shared();
	var Table = require_table();
	var ISOLATION_LEVEL = require_isolationlevel();
	var { TYPES } = require_datatypes();
	var { connect, close, on, off, removeListener, query, batch } = require_global_connection();
	var { CHANNELS } = require_diagnostics();
	module.exports = {
		ConnectionPool,
		Transaction,
		Request,
		PreparedStatement,
		ConnectionError,
		TransactionError,
		RequestError,
		PreparedStatementError,
		MSSQLError,
		driver: shared.driver,
		exports: {
			ConnectionError,
			TransactionError,
			RequestError,
			PreparedStatementError,
			MSSQLError,
			Table,
			ISOLATION_LEVEL,
			TYPES,
			CHANNELS,
			MAX: 65535,
			map: shared.map,
			getTypeByValue: shared.getTypeByValue,
			connect,
			close,
			on,
			removeListener,
			off,
			query,
			batch
		}
	};
	Object.defineProperty(module.exports, "Promise", {
		enumerable: true,
		get: () => {
			return shared.Promise;
		},
		set: (value) => {
			shared.Promise = value;
		}
	});
	Object.defineProperty(module.exports, "valueHandler", {
		enumerable: true,
		value: shared.valueHandler,
		writable: false,
		configurable: false
	});
	for (const key in TYPES) {
		const value = TYPES[key];
		module.exports.exports[key] = value;
		module.exports.exports[key.toUpperCase()] = value;
	}
}));
/**
* @callback Request~requestCallback
* @param {Error} err Error on error, otherwise null.
* @param {Object} [result] Request result.
*/
/**
* @callback Request~bulkCallback
* @param {Error} err Error on error, otherwise null.
* @param {Number} [rowsAffected] Number of affected rows.
*/
/**
* @callback basicCallback
* @param {Error} err Error on error, otherwise null.
* @param {Connection} [connection] Acquired connection.
*/
/**
* @callback acquireCallback
* @param {Error} err Error on error, otherwise null.
* @param {Connection} [connection] Acquired connection.
* @param {Object} [config] Connection config
*/
/**
* Dispatched after connection has established.
* @event ConnectionPool#connect
*/
/**
* Dispatched after connection has closed a pool (by calling close).
* @event ConnectionPool#close
*/
/**
* Dispatched when transaction begin.
* @event Transaction#begin
*/
/**
* Dispatched on successful commit.
* @event Transaction#commit
*/
/**
* Dispatched on successful rollback.
* @event Transaction#rollback
*/
/**
* Dispatched when metadata for new recordset are parsed.
* @event Request#recordset
*/
/**
* Dispatched when new row is parsed.
* @event Request#row
*/
/**
* Dispatched when request is complete.
* @event Request#done
*/
/**
* Dispatched on error.
* @event Request#error
*/
//#endregion
//#region node_modules/tedious/lib/tracking-buffer/writable-tracking-buffer.js
var require_writable_tracking_buffer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var SHIFT_RIGHT_32 = 1 / 4294967296;
	var UNKNOWN_PLP_LEN = Buffer.from([
		254,
		255,
		255,
		255,
		255,
		255,
		255,
		255
	]);
	var ZERO_LENGTH_BUFFER = Buffer.alloc(0);
	/**
	A Buffer-like class that tracks position.
	
	As values are written, the position advances by the size of the written data.
	When writing, automatically allocates new buffers if there's not enough space.
	*/
	var WritableTrackingBuffer = class {
		constructor(initialSize, encoding, doubleSizeGrowth) {
			this.initialSize = initialSize;
			this.encoding = encoding || "ucs2";
			this.doubleSizeGrowth = doubleSizeGrowth || false;
			this.buffer = Buffer.alloc(this.initialSize, 0);
			this.compositeBuffer = ZERO_LENGTH_BUFFER;
			this.position = 0;
		}
		get data() {
			this.newBuffer(0);
			return this.compositeBuffer;
		}
		copyFrom(buffer) {
			const length = buffer.length;
			this.makeRoomFor(length);
			buffer.copy(this.buffer, this.position);
			this.position += length;
		}
		makeRoomFor(requiredLength) {
			if (this.buffer.length - this.position < requiredLength) if (this.doubleSizeGrowth) {
				let size = Math.max(128, this.buffer.length * 2);
				while (size < requiredLength) size *= 2;
				this.newBuffer(size);
			} else this.newBuffer(requiredLength);
		}
		newBuffer(size) {
			const buffer = this.buffer.slice(0, this.position);
			this.compositeBuffer = Buffer.concat([this.compositeBuffer, buffer]);
			this.buffer = size === 0 ? ZERO_LENGTH_BUFFER : Buffer.alloc(size, 0);
			this.position = 0;
		}
		writeUInt8(value) {
			const length = 1;
			this.makeRoomFor(length);
			this.buffer.writeUInt8(value, this.position);
			this.position += length;
		}
		writeUInt16LE(value) {
			const length = 2;
			this.makeRoomFor(length);
			this.buffer.writeUInt16LE(value, this.position);
			this.position += length;
		}
		writeUShort(value) {
			this.writeUInt16LE(value);
		}
		writeUInt16BE(value) {
			const length = 2;
			this.makeRoomFor(length);
			this.buffer.writeUInt16BE(value, this.position);
			this.position += length;
		}
		writeUInt24LE(value) {
			const length = 3;
			this.makeRoomFor(length);
			this.buffer[this.position + 2] = value >>> 16 & 255;
			this.buffer[this.position + 1] = value >>> 8 & 255;
			this.buffer[this.position] = value & 255;
			this.position += length;
		}
		writeUInt32LE(value) {
			const length = 4;
			this.makeRoomFor(length);
			this.buffer.writeUInt32LE(value, this.position);
			this.position += length;
		}
		writeBigInt64LE(value) {
			const length = 8;
			this.makeRoomFor(length);
			this.buffer.writeBigInt64LE(value, this.position);
			this.position += length;
		}
		writeInt64LE(value) {
			this.writeBigInt64LE(BigInt(value));
		}
		writeUInt64LE(value) {
			this.writeBigUInt64LE(BigInt(value));
		}
		writeBigUInt64LE(value) {
			const length = 8;
			this.makeRoomFor(length);
			this.buffer.writeBigUInt64LE(value, this.position);
			this.position += length;
		}
		writeUInt32BE(value) {
			const length = 4;
			this.makeRoomFor(length);
			this.buffer.writeUInt32BE(value, this.position);
			this.position += length;
		}
		writeUInt40LE(value) {
			this.writeInt32LE(value & -1);
			this.writeUInt8(Math.floor(value * SHIFT_RIGHT_32));
		}
		writeInt8(value) {
			const length = 1;
			this.makeRoomFor(length);
			this.buffer.writeInt8(value, this.position);
			this.position += length;
		}
		writeInt16LE(value) {
			const length = 2;
			this.makeRoomFor(length);
			this.buffer.writeInt16LE(value, this.position);
			this.position += length;
		}
		writeInt16BE(value) {
			const length = 2;
			this.makeRoomFor(length);
			this.buffer.writeInt16BE(value, this.position);
			this.position += length;
		}
		writeInt32LE(value) {
			const length = 4;
			this.makeRoomFor(length);
			this.buffer.writeInt32LE(value, this.position);
			this.position += length;
		}
		writeInt32BE(value) {
			const length = 4;
			this.makeRoomFor(length);
			this.buffer.writeInt32BE(value, this.position);
			this.position += length;
		}
		writeFloatLE(value) {
			const length = 4;
			this.makeRoomFor(length);
			this.buffer.writeFloatLE(value, this.position);
			this.position += length;
		}
		writeDoubleLE(value) {
			const length = 8;
			this.makeRoomFor(length);
			this.buffer.writeDoubleLE(value, this.position);
			this.position += length;
		}
		writeString(value, encoding) {
			if (encoding == null) encoding = this.encoding;
			const length = Buffer.byteLength(value, encoding);
			this.makeRoomFor(length);
			this.buffer.write(value, this.position, encoding);
			this.position += length;
		}
		writeBVarchar(value, encoding) {
			this.writeUInt8(value.length);
			this.writeString(value, encoding);
		}
		writeUsVarchar(value, encoding) {
			this.writeUInt16LE(value.length);
			this.writeString(value, encoding);
		}
		writeUsVarbyte(value, encoding) {
			if (encoding == null) encoding = this.encoding;
			let length;
			if (value instanceof Buffer) length = value.length;
			else {
				value = value.toString();
				length = Buffer.byteLength(value, encoding);
			}
			this.writeUInt16LE(length);
			if (value instanceof Buffer) this.writeBuffer(value);
			else {
				this.makeRoomFor(length);
				this.buffer.write(value, this.position, encoding);
				this.position += length;
			}
		}
		writePLPBody(value, encoding) {
			if (encoding == null) encoding = this.encoding;
			let length;
			if (value instanceof Buffer) length = value.length;
			else {
				value = value.toString();
				length = Buffer.byteLength(value, encoding);
			}
			this.writeBuffer(UNKNOWN_PLP_LEN);
			if (length > 0) {
				this.writeUInt32LE(length);
				if (value instanceof Buffer) this.writeBuffer(value);
				else {
					this.makeRoomFor(length);
					this.buffer.write(value, this.position, encoding);
					this.position += length;
				}
			}
			this.writeUInt32LE(0);
		}
		writeBuffer(value) {
			const length = value.length;
			this.makeRoomFor(length);
			value.copy(this.buffer, this.position);
			this.position += length;
		}
		writeMoney(value) {
			this.writeInt32LE(Math.floor(value * SHIFT_RIGHT_32));
			this.writeInt32LE(value & -1);
		}
	};
	exports.default = WritableTrackingBuffer;
	module.exports = WritableTrackingBuffer;
}));
//#endregion
//#region node_modules/tedious/lib/token/token.js
var require_token = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Token = exports.TYPE = exports.SSPIToken = exports.RowToken = exports.RoutingEnvChangeToken = exports.RollbackTransactionEnvChangeToken = exports.ReturnValueToken = exports.ReturnStatusToken = exports.ResetConnectionEnvChangeToken = exports.PacketSizeEnvChangeToken = exports.OrderToken = exports.NBCRowToken = exports.LoginAckToken = exports.LanguageEnvChangeToken = exports.InfoMessageToken = exports.FedAuthInfoToken = exports.FeatureExtAckToken = exports.ErrorMessageToken = exports.DoneToken = exports.DoneProcToken = exports.DoneInProcToken = exports.DatabaseMirroringPartnerEnvChangeToken = exports.DatabaseEnvChangeToken = exports.CommitTransactionEnvChangeToken = exports.CollationChangeToken = exports.ColMetadataToken = exports.CharsetEnvChangeToken = exports.BeginTransactionEnvChangeToken = void 0;
	exports.TYPE = {
		ALTMETADATA: 136,
		ALTROW: 211,
		COLMETADATA: 129,
		COLINFO: 165,
		DONE: 253,
		DONEPROC: 254,
		DONEINPROC: 255,
		ENVCHANGE: 227,
		ERROR: 170,
		FEATUREEXTACK: 174,
		FEDAUTHINFO: 238,
		INFO: 171,
		LOGINACK: 173,
		NBCROW: 210,
		OFFSET: 120,
		ORDER: 169,
		RETURNSTATUS: 121,
		RETURNVALUE: 172,
		ROW: 209,
		SSPI: 237,
		TABNAME: 164
	};
	var Token = class {
		constructor(name, handlerName) {
			this.name = name;
			this.handlerName = handlerName;
		}
	};
	exports.Token = Token;
	var ColMetadataToken = class extends Token {
		constructor(columns) {
			super("COLMETADATA", "onColMetadata");
			this.columns = columns;
		}
	};
	exports.ColMetadataToken = ColMetadataToken;
	var DoneToken = class extends Token {
		constructor({ more, sqlError, attention, serverError, rowCount, curCmd }) {
			super("DONE", "onDone");
			this.more = more;
			this.sqlError = sqlError;
			this.attention = attention;
			this.serverError = serverError;
			this.rowCount = rowCount;
			this.curCmd = curCmd;
		}
	};
	exports.DoneToken = DoneToken;
	var DoneInProcToken = class extends Token {
		constructor({ more, sqlError, attention, serverError, rowCount, curCmd }) {
			super("DONEINPROC", "onDoneInProc");
			this.more = more;
			this.sqlError = sqlError;
			this.attention = attention;
			this.serverError = serverError;
			this.rowCount = rowCount;
			this.curCmd = curCmd;
		}
	};
	exports.DoneInProcToken = DoneInProcToken;
	var DoneProcToken = class extends Token {
		constructor({ more, sqlError, attention, serverError, rowCount, curCmd }) {
			super("DONEPROC", "onDoneProc");
			this.more = more;
			this.sqlError = sqlError;
			this.attention = attention;
			this.serverError = serverError;
			this.rowCount = rowCount;
			this.curCmd = curCmd;
		}
	};
	exports.DoneProcToken = DoneProcToken;
	var DatabaseEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onDatabaseChange");
			this.type = "DATABASE";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.DatabaseEnvChangeToken = DatabaseEnvChangeToken;
	var LanguageEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onLanguageChange");
			this.type = "LANGUAGE";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.LanguageEnvChangeToken = LanguageEnvChangeToken;
	var CharsetEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onCharsetChange");
			this.type = "CHARSET";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.CharsetEnvChangeToken = CharsetEnvChangeToken;
	var PacketSizeEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onPacketSizeChange");
			this.type = "PACKET_SIZE";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.PacketSizeEnvChangeToken = PacketSizeEnvChangeToken;
	var BeginTransactionEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onBeginTransaction");
			this.type = "BEGIN_TXN";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.BeginTransactionEnvChangeToken = BeginTransactionEnvChangeToken;
	var CommitTransactionEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onCommitTransaction");
			this.type = "COMMIT_TXN";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.CommitTransactionEnvChangeToken = CommitTransactionEnvChangeToken;
	var RollbackTransactionEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onRollbackTransaction");
			this.type = "ROLLBACK_TXN";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.RollbackTransactionEnvChangeToken = RollbackTransactionEnvChangeToken;
	var DatabaseMirroringPartnerEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onDatabaseMirroringPartner");
			this.type = "DATABASE_MIRRORING_PARTNER";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.DatabaseMirroringPartnerEnvChangeToken = DatabaseMirroringPartnerEnvChangeToken;
	var ResetConnectionEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onResetConnection");
			this.type = "RESET_CONNECTION";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.ResetConnectionEnvChangeToken = ResetConnectionEnvChangeToken;
	var CollationChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onSqlCollationChange");
			this.type = "SQL_COLLATION";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.CollationChangeToken = CollationChangeToken;
	var RoutingEnvChangeToken = class extends Token {
		constructor(newValue, oldValue) {
			super("ENVCHANGE", "onRoutingChange");
			this.type = "ROUTING_CHANGE";
			this.newValue = newValue;
			this.oldValue = oldValue;
		}
	};
	exports.RoutingEnvChangeToken = RoutingEnvChangeToken;
	var FeatureExtAckToken = class extends Token {
		/** Value of UTF8_SUPPORT acknowledgement.
		*
		* undefined when UTF8_SUPPORT not included in token. */
		constructor(fedAuth, utf8Support) {
			super("FEATUREEXTACK", "onFeatureExtAck");
			this.fedAuth = fedAuth;
			this.utf8Support = utf8Support;
		}
	};
	exports.FeatureExtAckToken = FeatureExtAckToken;
	var FedAuthInfoToken = class extends Token {
		constructor(spn, stsurl) {
			super("FEDAUTHINFO", "onFedAuthInfo");
			this.spn = spn;
			this.stsurl = stsurl;
		}
	};
	exports.FedAuthInfoToken = FedAuthInfoToken;
	var InfoMessageToken = class extends Token {
		constructor({ number, state, class: clazz, message, serverName, procName, lineNumber }) {
			super("INFO", "onInfoMessage");
			this.number = number;
			this.state = state;
			this.class = clazz;
			this.message = message;
			this.serverName = serverName;
			this.procName = procName;
			this.lineNumber = lineNumber;
		}
	};
	exports.InfoMessageToken = InfoMessageToken;
	var ErrorMessageToken = class extends Token {
		constructor({ number, state, class: clazz, message, serverName, procName, lineNumber }) {
			super("ERROR", "onErrorMessage");
			this.number = number;
			this.state = state;
			this.class = clazz;
			this.message = message;
			this.serverName = serverName;
			this.procName = procName;
			this.lineNumber = lineNumber;
		}
	};
	exports.ErrorMessageToken = ErrorMessageToken;
	var LoginAckToken = class extends Token {
		constructor({ interface: interfaze, tdsVersion, progName, progVersion }) {
			super("LOGINACK", "onLoginAck");
			this.interface = interfaze;
			this.tdsVersion = tdsVersion;
			this.progName = progName;
			this.progVersion = progVersion;
		}
	};
	exports.LoginAckToken = LoginAckToken;
	var NBCRowToken = class extends Token {
		constructor(columns) {
			super("NBCROW", "onRow");
			this.columns = columns;
		}
	};
	exports.NBCRowToken = NBCRowToken;
	var OrderToken = class extends Token {
		constructor(orderColumns) {
			super("ORDER", "onOrder");
			this.orderColumns = orderColumns;
		}
	};
	exports.OrderToken = OrderToken;
	var ReturnStatusToken = class extends Token {
		constructor(value) {
			super("RETURNSTATUS", "onReturnStatus");
			this.value = value;
		}
	};
	exports.ReturnStatusToken = ReturnStatusToken;
	var ReturnValueToken = class extends Token {
		constructor({ paramOrdinal, paramName, metadata, value }) {
			super("RETURNVALUE", "onReturnValue");
			this.paramOrdinal = paramOrdinal;
			this.paramName = paramName;
			this.metadata = metadata;
			this.value = value;
		}
	};
	exports.ReturnValueToken = ReturnValueToken;
	var RowToken = class extends Token {
		constructor(columns) {
			super("ROW", "onRow");
			this.columns = columns;
		}
	};
	exports.RowToken = RowToken;
	var SSPIToken = class extends Token {
		constructor(ntlmpacket, ntlmpacketBuffer) {
			super("SSPICHALLENGE", "onSSPI");
			this.ntlmpacket = ntlmpacket;
			this.ntlmpacketBuffer = ntlmpacketBuffer;
		}
	};
	exports.SSPIToken = SSPIToken;
}));
//#endregion
//#region node_modules/tedious/lib/bulk-load.js
var require_bulk_load = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _events$5 = __require("events");
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	var _stream$5 = __require("stream");
	var _token = require_token();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	/**
	* @private
	*/
	var FLAGS = {
		nullable: 1,
		caseSen: 2,
		updateableReadWrite: 4,
		updateableUnknown: 8,
		identity: 16,
		computed: 32,
		fixedLenCLRType: 256,
		sparseColumnSet: 1024,
		hidden: 8192,
		key: 16384,
		nullableUnknown: 32768
	};
	/**
	* @private
	*/
	var DONE_STATUS = {
		FINAL: 0,
		MORE: 1,
		ERROR: 2,
		INXACT: 4,
		COUNT: 16,
		ATTN: 32,
		SRVERROR: 256
	};
	/**
	* @private
	*/
	var rowTokenBuffer = Buffer.from([_token.TYPE.ROW]);
	var textPointerAndTimestampBuffer = Buffer.from([
		16,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	]);
	var textPointerNullBuffer = Buffer.from([0]);
	var RowTransform = class extends _stream$5.Transform {
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		constructor(bulkLoad) {
			super({ writableObjectMode: true });
			this.bulkLoad = bulkLoad;
			this.mainOptions = bulkLoad.options;
			this.columns = bulkLoad.columns;
			this.columnMetadataWritten = false;
		}
		/**
		* @private
		*/
		_transform(row, _encoding, callback) {
			if (!this.columnMetadataWritten) {
				this.push(this.bulkLoad.getColMetaData());
				this.columnMetadataWritten = true;
			}
			this.push(rowTokenBuffer);
			for (let i = 0; i < this.columns.length; i++) {
				const c = this.columns[i];
				let value = Array.isArray(row) ? row[i] : row[c.objName];
				if (!this.bulkLoad.firstRowWritten) try {
					value = c.type.validate(value, c.collation);
				} catch (error) {
					return callback(error);
				}
				const parameter = {
					length: c.length,
					scale: c.scale,
					precision: c.precision,
					value
				};
				if (c.type.name === "Text" || c.type.name === "Image" || c.type.name === "NText") {
					if (value == null) {
						this.push(textPointerNullBuffer);
						continue;
					}
					this.push(textPointerAndTimestampBuffer);
				}
				try {
					this.push(c.type.generateParameterLength(parameter, this.mainOptions));
					for (const chunk of c.type.generateParameterData(parameter, this.mainOptions)) this.push(chunk);
				} catch (error) {
					return callback(error);
				}
			}
			process.nextTick(callback);
		}
		/**
		* @private
		*/
		_flush(callback) {
			this.push(this.bulkLoad.createDoneToken());
			process.nextTick(callback);
		}
	};
	/**
	* A BulkLoad instance is used to perform a bulk insert.
	*
	* Use [[Connection.newBulkLoad]] to create a new instance, and [[Connection.execBulkLoad]] to execute it.
	*
	* Example of BulkLoad Usages:
	*
	* ```js
	* // optional BulkLoad options
	* const options = { keepNulls: true };
	*
	* // instantiate - provide the table where you'll be inserting to, options and a callback
	* const bulkLoad = connection.newBulkLoad('MyTable', options, (error, rowCount) => {
	*   console.log('inserted %d rows', rowCount);
	* });
	*
	* // setup your columns - always indicate whether the column is nullable
	* bulkLoad.addColumn('myInt', TYPES.Int, { nullable: false });
	* bulkLoad.addColumn('myString', TYPES.NVarChar, { length: 50, nullable: true });
	*
	* // execute
	* connection.execBulkLoad(bulkLoad, [
	*   { myInt: 7, myString: 'hello' },
	*   { myInt: 23, myString: 'world' }
	* ]);
	* ```
	*/
	var BulkLoad = class extends _events$5.EventEmitter {
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		constructor(table, collation, connectionOptions, { checkConstraints = false, fireTriggers = false, keepNulls = false, lockTable = false, order = {} }, callback) {
			if (typeof checkConstraints !== "boolean") throw new TypeError("The \"options.checkConstraints\" property must be of type boolean.");
			if (typeof fireTriggers !== "boolean") throw new TypeError("The \"options.fireTriggers\" property must be of type boolean.");
			if (typeof keepNulls !== "boolean") throw new TypeError("The \"options.keepNulls\" property must be of type boolean.");
			if (typeof lockTable !== "boolean") throw new TypeError("The \"options.lockTable\" property must be of type boolean.");
			if (typeof order !== "object" || order === null) throw new TypeError("The \"options.order\" property must be of type object.");
			for (const [column, direction] of Object.entries(order)) if (direction !== "ASC" && direction !== "DESC") throw new TypeError("The value of the \"" + column + "\" key in the \"options.order\" object must be either \"ASC\" or \"DESC\".");
			super();
			this.error = void 0;
			this.canceled = false;
			this.executionStarted = false;
			this.collation = collation;
			this.table = table;
			this.options = connectionOptions;
			this.callback = callback;
			this.columns = [];
			this.columnsByName = {};
			this.firstRowWritten = false;
			this.streamingMode = false;
			this.rowToPacketTransform = new RowTransform(this);
			this.bulkOptions = {
				checkConstraints,
				fireTriggers,
				keepNulls,
				lockTable,
				order
			};
		}
		/**
		* Adds a column to the bulk load.
		*
		* The column definitions should match the table you are trying to insert into.
		* Attempting to call addColumn after the first row has been added will throw an exception.
		*
		* ```js
		* bulkLoad.addColumn('MyIntColumn', TYPES.Int, { nullable: false });
		* ```
		*
		* @param name The name of the column.
		* @param type One of the supported `data types`.
		* @param __namedParameters Additional column type information. At a minimum, `nullable` must be set to true or false.
		* @param length For VarChar, NVarChar, VarBinary. Use length as `Infinity` for VarChar(max), NVarChar(max) and VarBinary(max).
		* @param nullable Indicates whether the column accepts NULL values.
		* @param objName If the name of the column is different from the name of the property found on `rowObj` arguments passed to [[addRow]] or [[Connection.execBulkLoad]], then you can use this option to specify the property name.
		* @param precision For Numeric, Decimal.
		* @param scale For Numeric, Decimal, Time, DateTime2, DateTimeOffset.
		*/
		addColumn(name, type, { output = false, length, precision, scale, objName = name, nullable = true }) {
			if (this.firstRowWritten) throw new Error("Columns cannot be added to bulk insert after the first row has been written.");
			if (this.executionStarted) throw new Error("Columns cannot be added to bulk insert after execution has started.");
			const column = {
				type,
				name,
				value: null,
				output,
				length,
				precision,
				scale,
				objName,
				nullable,
				collation: this.collation
			};
			if ((type.id & 48) === 32) {
				if (column.length == null && type.resolveLength) column.length = type.resolveLength(column);
			}
			if (type.resolvePrecision && column.precision == null) column.precision = type.resolvePrecision(column);
			if (type.resolveScale && column.scale == null) column.scale = type.resolveScale(column);
			this.columns.push(column);
			this.columnsByName[name] = column;
		}
		/**
		* @private
		*/
		getOptionsSql() {
			const addOptions = [];
			if (this.bulkOptions.checkConstraints) addOptions.push("CHECK_CONSTRAINTS");
			if (this.bulkOptions.fireTriggers) addOptions.push("FIRE_TRIGGERS");
			if (this.bulkOptions.keepNulls) addOptions.push("KEEP_NULLS");
			if (this.bulkOptions.lockTable) addOptions.push("TABLOCK");
			if (this.bulkOptions.order) {
				const orderColumns = [];
				for (const [column, direction] of Object.entries(this.bulkOptions.order)) orderColumns.push(`${column} ${direction}`);
				if (orderColumns.length) addOptions.push(`ORDER (${orderColumns.join(", ")})`);
			}
			if (addOptions.length > 0) return ` WITH (${addOptions.join(",")})`;
			else return "";
		}
		/**
		* @private
		*/
		getBulkInsertSql() {
			let sql = "insert bulk " + this.table + "(";
			for (let i = 0, len = this.columns.length; i < len; i++) {
				const c = this.columns[i];
				if (i !== 0) sql += ", ";
				sql += "[" + c.name + "] " + c.type.declaration(c);
			}
			sql += ")";
			sql += this.getOptionsSql();
			return sql;
		}
		/**
		* This is simply a helper utility function which returns a `CREATE TABLE SQL` statement based on the columns added to the bulkLoad object.
		* This may be particularly handy when you want to insert into a temporary table (a table which starts with `#`).
		*
		* ```js
		* var sql = bulkLoad.getTableCreationSql();
		* ```
		*
		* A side note on bulk inserting into temporary tables: if you want to access a local temporary table after executing the bulk load,
		* you'll need to use the same connection and execute your requests using [[Connection.execSqlBatch]] instead of [[Connection.execSql]]
		*/
		getTableCreationSql() {
			let sql = "CREATE TABLE " + this.table + "(\n";
			for (let i = 0, len = this.columns.length; i < len; i++) {
				const c = this.columns[i];
				if (i !== 0) sql += ",\n";
				sql += "[" + c.name + "] " + c.type.declaration(c);
				if (c.nullable !== void 0) sql += " " + (c.nullable ? "NULL" : "NOT NULL");
			}
			sql += "\n)";
			return sql;
		}
		/**
		* @private
		*/
		getColMetaData() {
			const tBuf = new _writableTrackingBuffer.default(100, null, true);
			tBuf.writeUInt8(_token.TYPE.COLMETADATA);
			tBuf.writeUInt16LE(this.columns.length);
			for (let j = 0, len = this.columns.length; j < len; j++) {
				const c = this.columns[j];
				if (this.options.tdsVersion < "7_2") tBuf.writeUInt16LE(0);
				else tBuf.writeUInt32LE(0);
				let flags = FLAGS.updateableReadWrite;
				if (c.nullable) flags |= FLAGS.nullable;
				else if (c.nullable === void 0 && this.options.tdsVersion >= "7_2") flags |= FLAGS.nullableUnknown;
				tBuf.writeUInt16LE(flags);
				tBuf.writeBuffer(c.type.generateTypeInfo(c, this.options));
				if (c.type.hasTableName) tBuf.writeUsVarchar(this.table, "ucs2");
				tBuf.writeBVarchar(c.name, "ucs2");
			}
			return tBuf.data;
		}
		/**
		* Sets a timeout for this bulk load.
		*
		* ```js
		* bulkLoad.setTimeout(timeout);
		* ```
		*
		* @param timeout The number of milliseconds before the bulk load is considered failed, or 0 for no timeout.
		*   When no timeout is set for the bulk load, the [[ConnectionOptions.requestTimeout]] of the Connection is used.
		*/
		setTimeout(timeout) {
			this.timeout = timeout;
		}
		/**
		* @private
		*/
		createDoneToken() {
			const tBuf = new _writableTrackingBuffer.default(this.options.tdsVersion < "7_2" ? 9 : 13);
			tBuf.writeUInt8(_token.TYPE.DONE);
			const status = DONE_STATUS.FINAL;
			tBuf.writeUInt16LE(status);
			tBuf.writeUInt16LE(0);
			tBuf.writeUInt32LE(0);
			if (this.options.tdsVersion >= "7_2") tBuf.writeUInt32LE(0);
			return tBuf.data;
		}
		/**
		* @private
		*/
		cancel() {
			if (this.canceled) return;
			this.canceled = true;
			this.emit("cancel");
		}
	};
	exports.default = BulkLoad;
	module.exports = BulkLoad;
}));
//#endregion
//#region node_modules/tedious/lib/debug.js
var require_debug = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _events$4 = __require("events");
	var util = _interopRequireWildcard(__require("util"));
	function _interopRequireWildcard(e, t) {
		if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
		return (_interopRequireWildcard = function(e, t) {
			if (!t && e && e.__esModule) return e;
			var o, i, f = {
				__proto__: null,
				default: e
			};
			if (null === e || "object" != typeof e && "function" != typeof e) return f;
			if (o = t ? n : r) {
				if (o.has(e)) return o.get(e);
				o.set(e, f);
			}
			for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
			return f;
		})(e, t);
	}
	var Debug = class extends _events$4.EventEmitter {
		constructor({ data = false, payload = false, packet = false, token = false } = {}) {
			super();
			this.options = {
				data,
				payload,
				packet,
				token
			};
			this.indent = "  ";
		}
		packet(direction, packet) {
			if (this.haveListeners() && this.options.packet) {
				this.log("");
				this.log(direction);
				this.log(packet.headerToString(this.indent));
			}
		}
		data(packet) {
			if (this.haveListeners() && this.options.data) this.log(packet.dataToString(this.indent));
		}
		payload(generatePayloadText) {
			if (this.haveListeners() && this.options.payload) this.log(generatePayloadText());
		}
		token(token) {
			if (this.haveListeners() && this.options.token) this.log(util.inspect(token, {
				showHidden: false,
				depth: 5,
				colors: true
			}));
		}
		haveListeners() {
			return this.listeners("debug").length > 0;
		}
		log(text) {
			this.emit("debug", text);
		}
	};
	exports.default = Debug;
	module.exports = Debug;
}));
//#endregion
//#region node_modules/tedious/lib/sender.js
var require_sender = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.sendInParallel = sendInParallel;
	exports.sendMessage = sendMessage;
	var _dgram = _interopRequireDefault(__require("dgram"));
	var _net$1 = _interopRequireDefault(__require("net"));
	var _nodeUrl$1 = _interopRequireDefault(__require("node:url"));
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	async function sendInParallel(addresses, port, request, signal) {
		signal.throwIfAborted();
		return await new Promise((resolve, reject) => {
			const sockets = [];
			let errorCount = 0;
			const onError = (err) => {
				errorCount++;
				if (errorCount === addresses.length) {
					signal.removeEventListener("abort", onAbort);
					clearSockets();
					reject(err);
				}
			};
			const onMessage = (message) => {
				signal.removeEventListener("abort", onAbort);
				clearSockets();
				resolve(message);
			};
			const onAbort = () => {
				clearSockets();
				reject(signal.reason);
			};
			const clearSockets = () => {
				for (const socket of sockets) {
					socket.removeListener("error", onError);
					socket.removeListener("message", onMessage);
					socket.close();
				}
			};
			signal.addEventListener("abort", onAbort, { once: true });
			for (let j = 0; j < addresses.length; j++) {
				const udpType = addresses[j].family === 6 ? "udp6" : "udp4";
				const socket = _dgram.default.createSocket(udpType);
				sockets.push(socket);
				socket.on("error", onError);
				socket.on("message", onMessage);
				socket.send(request, 0, request.length, port, addresses[j].address);
			}
		});
	}
	async function sendMessage(host, port, lookup, signal, request) {
		signal.throwIfAborted();
		let addresses;
		if (_net$1.default.isIP(host)) addresses = [{
			address: host,
			family: _net$1.default.isIPv6(host) ? 6 : 4
		}];
		else addresses = await new Promise((resolve, reject) => {
			const onAbort = () => {
				reject(signal.reason);
			};
			const domainInASCII = _nodeUrl$1.default.domainToASCII(host);
			lookup(domainInASCII === "" ? host : domainInASCII, { all: true }, (err, addresses) => {
				signal.removeEventListener("abort", onAbort);
				err ? reject(err) : resolve(addresses);
			});
		});
		return await sendInParallel(addresses, port, request, signal);
	}
}));
//#endregion
//#region node_modules/tedious/lib/instance-lookup.js
var require_instance_lookup = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.instanceLookup = instanceLookup;
	exports.parseBrowserResponse = parseBrowserResponse;
	var _dns$1 = _interopRequireDefault(__require("dns"));
	var _sender = require_sender();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var SQL_SERVER_BROWSER_PORT = 1434;
	var TIMEOUT = 2e3;
	var RETRIES = 3;
	var MYSTERY_HEADER_LENGTH = 3;
	async function instanceLookup(options) {
		const server = options.server;
		if (typeof server !== "string") throw new TypeError("Invalid arguments: \"server\" must be a string");
		const instanceName = options.instanceName;
		if (typeof instanceName !== "string") throw new TypeError("Invalid arguments: \"instanceName\" must be a string");
		const timeout = options.timeout === void 0 ? TIMEOUT : options.timeout;
		if (typeof timeout !== "number") throw new TypeError("Invalid arguments: \"timeout\" must be a number");
		const retries = options.retries === void 0 ? RETRIES : options.retries;
		if (typeof retries !== "number") throw new TypeError("Invalid arguments: \"retries\" must be a number");
		if (options.lookup !== void 0 && typeof options.lookup !== "function") throw new TypeError("Invalid arguments: \"lookup\" must be a function");
		const lookup = options.lookup ?? _dns$1.default.lookup;
		if (options.port !== void 0 && typeof options.port !== "number") throw new TypeError("Invalid arguments: \"port\" must be a number");
		const port = options.port ?? SQL_SERVER_BROWSER_PORT;
		const signal = options.signal;
		signal.throwIfAborted();
		let response;
		const request = Buffer.from([2]);
		for (let i = 0; i <= retries; i++) {
			const timeoutSignal = AbortSignal.timeout(timeout);
			try {
				response = await (0, _sender.sendMessage)(options.server, port, lookup, AbortSignal.any([signal, timeoutSignal]), request);
			} catch (err) {
				if (timeoutSignal.aborted) continue;
				throw err;
			}
		}
		if (!response) throw new Error("Failed to get response from SQL Server Browser on " + server);
		const foundPort = parseBrowserResponse(response.toString("ascii", MYSTERY_HEADER_LENGTH), instanceName);
		if (!foundPort) throw new Error("Port for " + instanceName + " not found in " + options.server);
		return foundPort;
	}
	function parseBrowserResponse(response, instanceName) {
		let getPort;
		const instances = response.split(";;");
		for (let i = 0, len = instances.length; i < len; i++) {
			const parts = instances[i].split(";");
			for (let p = 0, partsLen = parts.length; p < partsLen; p += 2) {
				const name = parts[p];
				const value = parts[p + 1];
				if (name === "tcp" && getPort) return parseInt(value, 10);
				if (name === "InstanceName") if (value.toUpperCase() === instanceName.toUpperCase()) getPort = true;
				else getPort = false;
			}
		}
	}
}));
//#endregion
//#region node_modules/tedious/lib/transient-error-lookup.js
var require_transient_error_lookup = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.TransientErrorLookup = void 0;
	var TransientErrorLookup = class {
		isTransientError(error) {
			return [
				4060,
				10928,
				10929,
				40197,
				40501,
				40613
			].indexOf(error) !== -1;
		}
	};
	exports.TransientErrorLookup = TransientErrorLookup;
}));
//#endregion
//#region node_modules/sprintf-js/src/sprintf.js
var require_sprintf = /* @__PURE__ */ __commonJSMin(((exports) => {
	(function() {
		"use strict";
		var re = {
			not_string: /[^s]/,
			not_bool: /[^t]/,
			not_type: /[^T]/,
			not_primitive: /[^v]/,
			number: /[diefg]/,
			numeric_arg: /[bcdiefguxX]/,
			json: /[j]/,
			not_json: /[^j]/,
			text: /^[^\x25]+/,
			modulo: /^\x25{2}/,
			placeholder: /^\x25(?:([1-9]\d*)\$|\(([^)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijostTuvxX])/,
			key: /^([a-z_][a-z_\d]*)/i,
			key_access: /^\.([a-z_][a-z_\d]*)/i,
			index_access: /^\[(\d+)\]/,
			sign: /^[+-]/
		};
		function sprintf(key) {
			return sprintf_format(sprintf_parse(key), arguments);
		}
		function vsprintf(fmt, argv) {
			return sprintf.apply(null, [fmt].concat(argv || []));
		}
		function sprintf_format(parse_tree, argv) {
			var cursor = 1, tree_length = parse_tree.length, arg, output = "", i, k, ph, pad, pad_character, pad_length, is_positive, sign;
			for (i = 0; i < tree_length; i++) if (typeof parse_tree[i] === "string") output += parse_tree[i];
			else if (typeof parse_tree[i] === "object") {
				ph = parse_tree[i];
				if (ph.keys) {
					arg = argv[cursor];
					for (k = 0; k < ph.keys.length; k++) {
						if (arg == void 0) throw new Error(sprintf("[sprintf] Cannot access property \"%s\" of undefined value \"%s\"", ph.keys[k], ph.keys[k - 1]));
						arg = arg[ph.keys[k]];
					}
				} else if (ph.param_no) arg = argv[ph.param_no];
				else arg = argv[cursor++];
				if (re.not_type.test(ph.type) && re.not_primitive.test(ph.type) && arg instanceof Function) arg = arg();
				if (re.numeric_arg.test(ph.type) && typeof arg !== "number" && isNaN(arg)) throw new TypeError(sprintf("[sprintf] expecting number but found %T", arg));
				if (re.number.test(ph.type)) is_positive = arg >= 0;
				switch (ph.type) {
					case "b":
						arg = parseInt(arg, 10).toString(2);
						break;
					case "c":
						arg = String.fromCharCode(parseInt(arg, 10));
						break;
					case "d":
					case "i":
						arg = parseInt(arg, 10);
						break;
					case "j":
						arg = JSON.stringify(arg, null, ph.width ? parseInt(ph.width) : 0);
						break;
					case "e":
						arg = ph.precision ? parseFloat(arg).toExponential(ph.precision) : parseFloat(arg).toExponential();
						break;
					case "f":
						arg = ph.precision ? parseFloat(arg).toFixed(ph.precision) : parseFloat(arg);
						break;
					case "g":
						arg = ph.precision ? String(Number(arg.toPrecision(ph.precision))) : parseFloat(arg);
						break;
					case "o":
						arg = (parseInt(arg, 10) >>> 0).toString(8);
						break;
					case "s":
						arg = String(arg);
						arg = ph.precision ? arg.substring(0, ph.precision) : arg;
						break;
					case "t":
						arg = String(!!arg);
						arg = ph.precision ? arg.substring(0, ph.precision) : arg;
						break;
					case "T":
						arg = Object.prototype.toString.call(arg).slice(8, -1).toLowerCase();
						arg = ph.precision ? arg.substring(0, ph.precision) : arg;
						break;
					case "u":
						arg = parseInt(arg, 10) >>> 0;
						break;
					case "v":
						arg = arg.valueOf();
						arg = ph.precision ? arg.substring(0, ph.precision) : arg;
						break;
					case "x":
						arg = (parseInt(arg, 10) >>> 0).toString(16);
						break;
					case "X": arg = (parseInt(arg, 10) >>> 0).toString(16).toUpperCase();
				}
				if (re.json.test(ph.type)) output += arg;
				else {
					if (re.number.test(ph.type) && (!is_positive || ph.sign)) {
						sign = is_positive ? "+" : "-";
						arg = arg.toString().replace(re.sign, "");
					} else sign = "";
					pad_character = ph.pad_char ? ph.pad_char === "0" ? "0" : ph.pad_char.charAt(1) : " ";
					pad_length = ph.width - (sign + arg).length;
					pad = ph.width ? pad_length > 0 ? pad_character.repeat(pad_length) : "" : "";
					output += ph.align ? sign + arg + pad : pad_character === "0" ? sign + pad + arg : pad + sign + arg;
				}
			}
			return output;
		}
		var sprintf_cache = Object.create(null);
		function sprintf_parse(fmt) {
			if (sprintf_cache[fmt]) return sprintf_cache[fmt];
			var _fmt = fmt, match, parse_tree = [], arg_names = 0;
			while (_fmt) {
				if ((match = re.text.exec(_fmt)) !== null) parse_tree.push(match[0]);
				else if ((match = re.modulo.exec(_fmt)) !== null) parse_tree.push("%");
				else if ((match = re.placeholder.exec(_fmt)) !== null) {
					if (match[2]) {
						arg_names |= 1;
						var field_list = [], replacement_field = match[2], field_match = [];
						if ((field_match = re.key.exec(replacement_field)) !== null) {
							field_list.push(field_match[1]);
							while ((replacement_field = replacement_field.substring(field_match[0].length)) !== "") if ((field_match = re.key_access.exec(replacement_field)) !== null) field_list.push(field_match[1]);
							else if ((field_match = re.index_access.exec(replacement_field)) !== null) field_list.push(field_match[1]);
							else throw new SyntaxError("[sprintf] failed to parse named argument key");
						} else throw new SyntaxError("[sprintf] failed to parse named argument key");
						match[2] = field_list;
					} else arg_names |= 2;
					if (arg_names === 3) throw new Error("[sprintf] mixing positional and named placeholders is not (yet) supported");
					parse_tree.push({
						placeholder: match[0],
						param_no: match[1],
						keys: match[2],
						sign: match[3],
						pad_char: match[4],
						align: match[5],
						width: match[6],
						precision: match[7],
						type: match[8]
					});
				} else throw new SyntaxError("[sprintf] unexpected placeholder");
				_fmt = _fmt.substring(match[0].length);
			}
			return sprintf_cache[fmt] = parse_tree;
		}
		/**
		* export to either browser or node.js
		*/
		if (typeof exports !== "undefined") {
			exports["sprintf"] = sprintf;
			exports["vsprintf"] = vsprintf;
		}
		if (typeof window !== "undefined") {
			window["sprintf"] = sprintf;
			window["vsprintf"] = vsprintf;
			if (typeof define === "function" && define["amd"]) define(function() {
				return {
					"sprintf": sprintf,
					"vsprintf": vsprintf
				};
			});
		}
	})();
}));
//#endregion
//#region node_modules/tedious/lib/packet.js
var require_packet = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.TYPE = exports.Packet = exports.OFFSET = exports.HEADER_LENGTH = void 0;
	exports.isPacketComplete = isPacketComplete;
	exports.packetLength = packetLength;
	var _sprintfJs = require_sprintf();
	var HEADER_LENGTH = exports.HEADER_LENGTH = 8;
	var TYPE = exports.TYPE = {
		SQL_BATCH: 1,
		RPC_REQUEST: 3,
		TABULAR_RESULT: 4,
		ATTENTION: 6,
		BULK_LOAD: 7,
		TRANSACTION_MANAGER: 14,
		LOGIN7: 16,
		NTLMAUTH_PKT: 17,
		PRELOGIN: 18,
		FEDAUTH_TOKEN: 8
	};
	var typeByValue = {};
	for (const name in TYPE) typeByValue[TYPE[name]] = name;
	var STATUS = {
		NORMAL: 0,
		EOM: 1,
		IGNORE: 2,
		RESETCONNECTION: 8,
		RESETCONNECTIONSKIPTRAN: 16
	};
	var OFFSET = exports.OFFSET = {
		Type: 0,
		Status: 1,
		Length: 2,
		SPID: 4,
		PacketID: 6,
		Window: 7
	};
	var DEFAULT_SPID = 0;
	var DEFAULT_PACKETID = 1;
	var DEFAULT_WINDOW = 0;
	var NL = "\n";
	var Packet = class {
		constructor(typeOrBuffer) {
			if (typeOrBuffer instanceof Buffer) this.buffer = typeOrBuffer;
			else {
				const type = typeOrBuffer;
				this.buffer = Buffer.alloc(HEADER_LENGTH, 0);
				this.buffer.writeUInt8(type, OFFSET.Type);
				this.buffer.writeUInt8(STATUS.NORMAL, OFFSET.Status);
				this.buffer.writeUInt16BE(DEFAULT_SPID, OFFSET.SPID);
				this.buffer.writeUInt8(DEFAULT_PACKETID, OFFSET.PacketID);
				this.buffer.writeUInt8(DEFAULT_WINDOW, OFFSET.Window);
				this.setLength();
			}
		}
		setLength() {
			this.buffer.writeUInt16BE(this.buffer.length, OFFSET.Length);
		}
		length() {
			return this.buffer.readUInt16BE(OFFSET.Length);
		}
		resetConnection(reset) {
			let status = this.buffer.readUInt8(OFFSET.Status);
			if (reset) status |= STATUS.RESETCONNECTION;
			else status &= 255 - STATUS.RESETCONNECTION;
			this.buffer.writeUInt8(status, OFFSET.Status);
		}
		last(last) {
			let status = this.buffer.readUInt8(OFFSET.Status);
			if (arguments.length > 0) {
				if (last) status |= STATUS.EOM;
				else status &= 255 - STATUS.EOM;
				this.buffer.writeUInt8(status, OFFSET.Status);
			}
			return this.isLast();
		}
		ignore(last) {
			let status = this.buffer.readUInt8(OFFSET.Status);
			if (last) status |= STATUS.IGNORE;
			else status &= 255 - STATUS.IGNORE;
			this.buffer.writeUInt8(status, OFFSET.Status);
		}
		isLast() {
			return !!(this.buffer.readUInt8(OFFSET.Status) & STATUS.EOM);
		}
		packetId(packetId) {
			if (packetId) this.buffer.writeUInt8(packetId % 256, OFFSET.PacketID);
			return this.buffer.readUInt8(OFFSET.PacketID);
		}
		addData(data) {
			this.buffer = Buffer.concat([this.buffer, data]);
			this.setLength();
			return this;
		}
		data() {
			return this.buffer.slice(HEADER_LENGTH);
		}
		type() {
			return this.buffer.readUInt8(OFFSET.Type);
		}
		statusAsString() {
			const status = this.buffer.readUInt8(OFFSET.Status);
			const statuses = [];
			for (const name in STATUS) if (status & STATUS[name]) statuses.push(name);
			else statuses.push(void 0);
			return statuses.join(" ").trim();
		}
		headerToString(indent = "") {
			return indent + (0, _sprintfJs.sprintf)("type:0x%02X(%s), status:0x%02X(%s), length:0x%04X, spid:0x%04X, packetId:0x%02X, window:0x%02X", this.buffer.readUInt8(OFFSET.Type), typeByValue[this.buffer.readUInt8(OFFSET.Type)], this.buffer.readUInt8(OFFSET.Status), this.statusAsString(), this.buffer.readUInt16BE(OFFSET.Length), this.buffer.readUInt16BE(OFFSET.SPID), this.buffer.readUInt8(OFFSET.PacketID), this.buffer.readUInt8(OFFSET.Window));
		}
		dataToString(indent = "") {
			const BYTES_PER_GROUP = 4;
			const CHARS_PER_GROUP = 8;
			const BYTES_PER_LINE = 32;
			const data = this.data();
			let dataDump = "";
			let chars = "";
			for (let offset = 0; offset < data.length; offset++) {
				if (offset % BYTES_PER_LINE === 0) {
					dataDump += indent;
					dataDump += (0, _sprintfJs.sprintf)("%04X  ", offset);
				}
				if (data[offset] < 32 || data[offset] > 126) {
					chars += ".";
					if ((offset + 1) % CHARS_PER_GROUP === 0 && !((offset + 1) % BYTES_PER_LINE === 0)) chars += " ";
				} else chars += String.fromCharCode(data[offset]);
				if (data[offset] != null) dataDump += (0, _sprintfJs.sprintf)("%02X", data[offset]);
				if ((offset + 1) % BYTES_PER_GROUP === 0 && !((offset + 1) % BYTES_PER_LINE === 0)) dataDump += " ";
				if ((offset + 1) % BYTES_PER_LINE === 0) {
					dataDump += "  " + chars;
					chars = "";
					if (offset < data.length - 1) dataDump += NL;
				}
			}
			if (chars.length) dataDump += "  " + chars;
			return dataDump;
		}
		toString(indent = "") {
			return this.headerToString(indent) + "\n" + this.dataToString(indent + indent);
		}
		payloadString() {
			return "";
		}
	};
	exports.Packet = Packet;
	function isPacketComplete(potentialPacketBuffer) {
		if (potentialPacketBuffer.length < HEADER_LENGTH) return false;
		else return potentialPacketBuffer.length >= potentialPacketBuffer.readUInt16BE(OFFSET.Length);
	}
	function packetLength(potentialPacketBuffer) {
		return potentialPacketBuffer.readUInt16BE(OFFSET.Length);
	}
}));
//#endregion
//#region node_modules/tedious/lib/prelogin-payload.js
var require_prelogin_payload = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _sprintfJs = require_sprintf();
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	var _crypto$1 = __require("crypto");
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var optionBufferSize = 20;
	var traceIdSize = 36;
	var TOKEN = {
		VERSION: 0,
		ENCRYPTION: 1,
		INSTOPT: 2,
		THREADID: 3,
		MARS: 4,
		TRACEID: 5,
		FEDAUTHREQUIRED: 6,
		TERMINATOR: 255
	};
	var ENCRYPT = {
		OFF: 0,
		ON: 1,
		NOT_SUP: 2,
		REQ: 3
	};
	var encryptByValue = {};
	for (const name in ENCRYPT) {
		const value = ENCRYPT[name];
		encryptByValue[value] = name;
	}
	var MARS = {
		OFF: 0,
		ON: 1
	};
	var marsByValue = {};
	for (const name in MARS) {
		const value = MARS[name];
		marsByValue[value] = name;
	}
	var PreloginPayload = class {
		constructor(bufferOrOptions = {
			encrypt: false,
			version: {
				major: 0,
				minor: 0,
				build: 0,
				subbuild: 0
			}
		}) {
			if (bufferOrOptions instanceof Buffer) {
				this.data = bufferOrOptions;
				this.options = {
					encrypt: false,
					version: {
						major: 0,
						minor: 0,
						build: 0,
						subbuild: 0
					}
				};
			} else {
				this.options = bufferOrOptions;
				this.createOptions();
			}
			this.extractOptions();
		}
		createOptions() {
			const options = [
				this.createVersionOption(),
				this.createEncryptionOption(),
				this.createInstanceOption(),
				this.createThreadIdOption(),
				this.createMarsOption(),
				this.createTraceIdOption(),
				this.createFedAuthOption()
			];
			let length = 0;
			for (let i = 0, len = options.length; i < len; i++) {
				const option = options[i];
				length += 5 + option.data.length;
			}
			length++;
			this.data = Buffer.alloc(length, 0);
			let optionOffset = 0;
			let optionDataOffset = 5 * options.length + 1;
			for (let j = 0, len = options.length; j < len; j++) {
				const option = options[j];
				this.data.writeUInt8(option.token, optionOffset + 0);
				this.data.writeUInt16BE(optionDataOffset, optionOffset + 1);
				this.data.writeUInt16BE(option.data.length, optionOffset + 3);
				optionOffset += 5;
				option.data.copy(this.data, optionDataOffset);
				optionDataOffset += option.data.length;
			}
			this.data.writeUInt8(TOKEN.TERMINATOR, optionOffset);
		}
		createVersionOption() {
			const buffer = new _writableTrackingBuffer.default(optionBufferSize);
			buffer.writeUInt8(this.options.version.major);
			buffer.writeUInt8(this.options.version.minor);
			buffer.writeUInt16BE(this.options.version.build);
			buffer.writeUInt16BE(this.options.version.subbuild);
			return {
				token: TOKEN.VERSION,
				data: buffer.data
			};
		}
		createEncryptionOption() {
			const buffer = new _writableTrackingBuffer.default(optionBufferSize);
			if (this.options.encrypt) buffer.writeUInt8(ENCRYPT.ON);
			else buffer.writeUInt8(ENCRYPT.NOT_SUP);
			return {
				token: TOKEN.ENCRYPTION,
				data: buffer.data
			};
		}
		createInstanceOption() {
			const buffer = new _writableTrackingBuffer.default(optionBufferSize);
			buffer.writeUInt8(0);
			return {
				token: TOKEN.INSTOPT,
				data: buffer.data
			};
		}
		createThreadIdOption() {
			const buffer = new _writableTrackingBuffer.default(optionBufferSize);
			buffer.writeUInt32BE(0);
			return {
				token: TOKEN.THREADID,
				data: buffer.data
			};
		}
		createMarsOption() {
			const buffer = new _writableTrackingBuffer.default(optionBufferSize);
			buffer.writeUInt8(MARS.OFF);
			return {
				token: TOKEN.MARS,
				data: buffer.data
			};
		}
		createTraceIdOption() {
			const buffer = new _writableTrackingBuffer.default(traceIdSize);
			buffer.writeBuffer((0, _crypto$1.randomBytes)(traceIdSize));
			return {
				token: TOKEN.TRACEID,
				data: buffer.data
			};
		}
		createFedAuthOption() {
			const buffer = new _writableTrackingBuffer.default(optionBufferSize);
			buffer.writeUInt8(1);
			return {
				token: TOKEN.FEDAUTHREQUIRED,
				data: buffer.data
			};
		}
		extractOptions() {
			let offset = 0;
			while (this.data[offset] !== TOKEN.TERMINATOR) {
				let dataOffset = this.data.readUInt16BE(offset + 1);
				const dataLength = this.data.readUInt16BE(offset + 3);
				switch (this.data[offset]) {
					case TOKEN.VERSION:
						this.extractVersion(dataOffset);
						break;
					case TOKEN.ENCRYPTION:
						this.extractEncryption(dataOffset);
						break;
					case TOKEN.INSTOPT:
						this.extractInstance(dataOffset);
						break;
					case TOKEN.THREADID:
						if (dataLength > 0) this.extractThreadId(dataOffset);
						break;
					case TOKEN.MARS:
						this.extractMars(dataOffset);
						break;
					case TOKEN.TRACEID:
						this.extractTraceId(dataOffset);
						break;
					case TOKEN.FEDAUTHREQUIRED: this.extractFedAuth(dataOffset);
				}
				offset += 5;
				dataOffset += dataLength;
			}
		}
		extractVersion(offset) {
			this.version = {
				major: this.data.readUInt8(offset + 0),
				minor: this.data.readUInt8(offset + 1),
				build: this.data.readUInt16BE(offset + 2),
				subbuild: this.data.readUInt16BE(offset + 4)
			};
		}
		extractEncryption(offset) {
			this.encryption = this.data.readUInt8(offset);
			this.encryptionString = encryptByValue[this.encryption];
		}
		extractInstance(offset) {
			this.instance = this.data.readUInt8(offset);
		}
		extractThreadId(offset) {
			this.threadId = this.data.readUInt32BE(offset);
		}
		extractMars(offset) {
			this.mars = this.data.readUInt8(offset);
			this.marsString = marsByValue[this.mars];
		}
		extractTraceId(offset) {
			this.traceId = this.data.subarray(offset, offset + traceIdSize);
		}
		extractFedAuth(offset) {
			this.fedAuthRequired = this.data.readUInt8(offset);
		}
		toString(indent = "") {
			return indent + "PreLogin - " + (0, _sprintfJs.sprintf)("version:%d.%d.%d.%d, encryption:0x%02X(%s), instopt:0x%02X, threadId:0x%08X, mars:0x%02X(%s), traceId:%s", this.version.major, this.version.minor, this.version.build, this.version.subbuild, this.encryption ? this.encryption : 0, this.encryptionString ? this.encryptionString : "", this.instance ? this.instance : 0, this.threadId ? this.threadId : 0, this.mars ? this.mars : 0, this.marsString ? this.marsString : "", this.traceId ? this.traceId.toString("hex") : "");
		}
	};
	exports.default = PreloginPayload;
	module.exports = PreloginPayload;
}));
//#endregion
//#region node_modules/tedious/lib/tds-versions.js
var require_tds_versions = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.versionsByValue = exports.versions = void 0;
	var versions = exports.versions = {
		"7_1": 1895825409,
		"7_2": 1913192450,
		"7_3_A": 1930035203,
		"7_3_B": 1930100739,
		"7_4": 1946157060,
		"8_0": 134217728
	};
	var versionsByValue = exports.versionsByValue = {};
	for (const name in versions) versionsByValue[versions[name]] = name;
}));
//#endregion
//#region node_modules/tedious/lib/login7-payload.js
var require_login7_payload = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _sprintfJs = require_sprintf();
	var _tdsVersions = require_tds_versions();
	var FLAGS_1 = {
		ENDIAN_LITTLE: 0,
		ENDIAN_BIG: 1,
		CHARSET_ASCII: 0,
		CHARSET_EBCDIC: 2,
		FLOAT_IEEE_754: 0,
		FLOAT_VAX: 4,
		FLOAT_ND5000: 8,
		BCP_DUMPLOAD_ON: 0,
		BCP_DUMPLOAD_OFF: 16,
		USE_DB_ON: 0,
		USE_DB_OFF: 32,
		INIT_DB_WARN: 0,
		INIT_DB_FATAL: 64,
		SET_LANG_WARN_OFF: 0,
		SET_LANG_WARN_ON: 128
	};
	var FLAGS_2 = {
		INIT_LANG_WARN: 0,
		INIT_LANG_FATAL: 1,
		ODBC_OFF: 0,
		ODBC_ON: 2,
		F_TRAN_BOUNDARY: 4,
		F_CACHE_CONNECT: 8,
		USER_NORMAL: 0,
		USER_SERVER: 16,
		USER_REMUSER: 32,
		USER_SQLREPL: 64,
		INTEGRATED_SECURITY_OFF: 0,
		INTEGRATED_SECURITY_ON: 128
	};
	var TYPE_FLAGS = {
		SQL_DFLT: 0,
		SQL_TSQL: 8,
		OLEDB_OFF: 0,
		OLEDB_ON: 16,
		READ_WRITE_INTENT: 0,
		READ_ONLY_INTENT: 32
	};
	var FLAGS_3 = {
		CHANGE_PASSWORD_NO: 0,
		CHANGE_PASSWORD_YES: 1,
		BINARY_XML: 2,
		SPAWN_USER_INSTANCE: 4,
		UNKNOWN_COLLATION_HANDLING: 8,
		EXTENSION_USED: 16
	};
	var FEDAUTH_OPTIONS = {
		FEATURE_ID: 2,
		LIBRARY_SECURITYTOKEN: 1,
		LIBRARY_ADAL: 2,
		FEDAUTH_YES_ECHO: 1,
		FEDAUTH_NO_ECHO: 0,
		ADAL_WORKFLOW_USER_PASS: 1,
		ADAL_WORKFLOW_INTEGRATED: 2
	};
	var FEATURE_EXT_TERMINATOR = 255;
	var Login7Payload = class {
		constructor({ tdsVersion, packetSize, clientProgVer, clientPid, connectionId, clientTimeZone, clientLcid }) {
			this.tdsVersion = tdsVersion;
			this.packetSize = packetSize;
			this.clientProgVer = clientProgVer;
			this.clientPid = clientPid;
			this.connectionId = connectionId;
			this.clientTimeZone = clientTimeZone;
			this.clientLcid = clientLcid;
			this.readOnlyIntent = false;
			this.initDbFatal = false;
			this.fedAuth = void 0;
			this.userName = void 0;
			this.password = void 0;
			this.serverName = void 0;
			this.appName = void 0;
			this.hostname = void 0;
			this.libraryName = void 0;
			this.language = void 0;
			this.database = void 0;
			this.clientId = void 0;
			this.sspi = void 0;
			this.attachDbFile = void 0;
			this.changePassword = void 0;
		}
		toBuffer() {
			const fixedData = Buffer.alloc(94);
			const buffers = [fixedData];
			let offset = 0;
			let dataOffset = fixedData.length;
			offset = fixedData.writeUInt32LE(0, offset);
			offset = fixedData.writeUInt32LE(this.tdsVersion, offset);
			offset = fixedData.writeUInt32LE(this.packetSize, offset);
			offset = fixedData.writeUInt32LE(this.clientProgVer, offset);
			offset = fixedData.writeUInt32LE(this.clientPid, offset);
			offset = fixedData.writeUInt32LE(this.connectionId, offset);
			offset = fixedData.writeUInt8(this.buildOptionFlags1(), offset);
			offset = fixedData.writeUInt8(this.buildOptionFlags2(), offset);
			offset = fixedData.writeUInt8(this.buildTypeFlags(), offset);
			offset = fixedData.writeUInt8(this.buildOptionFlags3(), offset);
			offset = fixedData.writeInt32LE(this.clientTimeZone, offset);
			offset = fixedData.writeUInt32LE(this.clientLcid, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.hostname) {
				const buffer = Buffer.from(this.hostname, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(buffer);
			} else offset = fixedData.writeUInt16LE(dataOffset, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.userName) {
				const buffer = Buffer.from(this.userName, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(buffer);
			} else offset = fixedData.writeUInt16LE(0, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.password) {
				const buffer = Buffer.from(this.password, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(this.scramblePassword(buffer));
			} else offset = fixedData.writeUInt16LE(0, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.appName) {
				const buffer = Buffer.from(this.appName, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(buffer);
			} else offset = fixedData.writeUInt16LE(0, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.serverName) {
				const buffer = Buffer.from(this.serverName, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(buffer);
			} else offset = fixedData.writeUInt16LE(0, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			let featureExtData;
			let extensionOffsetBuffer;
			if (this.tdsVersion >= _tdsVersions.versions["7_4"]) {
				featureExtData = this.buildFeatureExt();
				offset = fixedData.writeUInt16LE(4, offset);
				extensionOffsetBuffer = Buffer.alloc(4);
				buffers.push(extensionOffsetBuffer);
				dataOffset += 4;
			} else offset = fixedData.writeUInt16LE(0, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.libraryName) {
				const buffer = Buffer.from(this.libraryName, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(buffer);
			} else offset = fixedData.writeUInt16LE(0, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.language) {
				const buffer = Buffer.from(this.language, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(buffer);
			} else offset = fixedData.writeUInt16LE(0, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.database) {
				const buffer = Buffer.from(this.database, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(buffer);
			} else offset = fixedData.writeUInt16LE(0, offset);
			if (this.clientId) this.clientId.copy(fixedData, offset, 0, 6);
			offset += 6;
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.sspi) {
				if (this.sspi.length > 65535) offset = fixedData.writeUInt16LE(65535, offset);
				else offset = fixedData.writeUInt16LE(this.sspi.length, offset);
				buffers.push(this.sspi);
				dataOffset += this.sspi.length;
			} else offset = fixedData.writeUInt16LE(0, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.attachDbFile) {
				const buffer = Buffer.from(this.attachDbFile, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(buffer);
			} else offset = fixedData.writeUInt16LE(0, offset);
			offset = fixedData.writeUInt16LE(dataOffset, offset);
			if (this.changePassword) {
				const buffer = Buffer.from(this.changePassword, "ucs2");
				offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
				dataOffset += buffer.length;
				buffers.push(buffer);
			} else offset = fixedData.writeUInt16LE(0, offset);
			if (this.sspi && this.sspi.length > 65535) fixedData.writeUInt32LE(this.sspi.length, offset);
			else fixedData.writeUInt32LE(0, offset);
			if (featureExtData && extensionOffsetBuffer) {
				extensionOffsetBuffer.writeUInt32LE(dataOffset, 0);
				buffers.push(featureExtData);
			}
			const data = Buffer.concat(buffers);
			data.writeUInt32LE(data.length, 0);
			return data;
		}
		buildOptionFlags1() {
			let flags1 = FLAGS_1.ENDIAN_LITTLE | FLAGS_1.CHARSET_ASCII | FLAGS_1.FLOAT_IEEE_754 | FLAGS_1.BCP_DUMPLOAD_OFF | FLAGS_1.USE_DB_OFF | FLAGS_1.SET_LANG_WARN_ON;
			if (this.initDbFatal) flags1 |= FLAGS_1.INIT_DB_FATAL;
			else flags1 |= FLAGS_1.INIT_DB_WARN;
			return flags1;
		}
		buildFeatureExt() {
			const buffers = [];
			const fedAuth = this.fedAuth;
			if (fedAuth) switch (fedAuth.type) {
				case "ADAL":
					const buffer = Buffer.alloc(7);
					buffer.writeUInt8(FEDAUTH_OPTIONS.FEATURE_ID, 0);
					buffer.writeUInt32LE(2, 1);
					buffer.writeUInt8(FEDAUTH_OPTIONS.LIBRARY_ADAL << 1 | (fedAuth.echo ? FEDAUTH_OPTIONS.FEDAUTH_YES_ECHO : FEDAUTH_OPTIONS.FEDAUTH_NO_ECHO), 5);
					buffer.writeUInt8(fedAuth.workflow === "integrated" ? 2 : FEDAUTH_OPTIONS.ADAL_WORKFLOW_USER_PASS, 6);
					buffers.push(buffer);
					break;
				case "SECURITYTOKEN":
					const token = Buffer.from(fedAuth.fedAuthToken, "ucs2");
					const buf = Buffer.alloc(10);
					let offset = 0;
					offset = buf.writeUInt8(FEDAUTH_OPTIONS.FEATURE_ID, offset);
					offset = buf.writeUInt32LE(token.length + 4 + 1, offset);
					offset = buf.writeUInt8(FEDAUTH_OPTIONS.LIBRARY_SECURITYTOKEN << 1 | (fedAuth.echo ? FEDAUTH_OPTIONS.FEDAUTH_YES_ECHO : FEDAUTH_OPTIONS.FEDAUTH_NO_ECHO), offset);
					buf.writeInt32LE(token.length, offset);
					buffers.push(buf);
					buffers.push(token);
			}
			const UTF8_SUPPORT_FEATURE_ID = 10;
			const UTF8_SUPPORT_CLIENT_SUPPORTS_UTF8 = 1;
			const buf = Buffer.alloc(6);
			buf.writeUInt8(UTF8_SUPPORT_FEATURE_ID, 0);
			buf.writeUInt32LE(1, 1);
			buf.writeUInt8(UTF8_SUPPORT_CLIENT_SUPPORTS_UTF8, 5);
			buffers.push(buf);
			buffers.push(Buffer.from([FEATURE_EXT_TERMINATOR]));
			return Buffer.concat(buffers);
		}
		buildOptionFlags2() {
			let flags2 = FLAGS_2.INIT_LANG_WARN | FLAGS_2.ODBC_OFF | FLAGS_2.USER_NORMAL;
			if (this.sspi) flags2 |= FLAGS_2.INTEGRATED_SECURITY_ON;
			else flags2 |= FLAGS_2.INTEGRATED_SECURITY_OFF;
			return flags2;
		}
		buildTypeFlags() {
			let typeFlags = TYPE_FLAGS.SQL_DFLT | TYPE_FLAGS.OLEDB_OFF;
			if (this.readOnlyIntent) typeFlags |= TYPE_FLAGS.READ_ONLY_INTENT;
			else typeFlags |= TYPE_FLAGS.READ_WRITE_INTENT;
			return typeFlags;
		}
		buildOptionFlags3() {
			return FLAGS_3.CHANGE_PASSWORD_NO | FLAGS_3.UNKNOWN_COLLATION_HANDLING | FLAGS_3.EXTENSION_USED;
		}
		scramblePassword(password) {
			for (let b = 0, len = password.length; b < len; b++) {
				let byte = password[b];
				const lowNibble = byte & 15;
				const highNibble = byte >> 4;
				byte = lowNibble << 4 | highNibble;
				byte = byte ^ 165;
				password[b] = byte;
			}
			return password;
		}
		toString(indent = "") {
			return indent + "Login7 - " + (0, _sprintfJs.sprintf)("TDS:0x%08X, PacketSize:0x%08X, ClientProgVer:0x%08X, ClientPID:0x%08X, ConnectionID:0x%08X", this.tdsVersion, this.packetSize, this.clientProgVer, this.clientPid, this.connectionId) + "\n" + indent + "         " + (0, _sprintfJs.sprintf)("Flags1:0x%02X, Flags2:0x%02X, TypeFlags:0x%02X, Flags3:0x%02X, ClientTimezone:%d, ClientLCID:0x%08X", this.buildOptionFlags1(), this.buildOptionFlags2(), this.buildTypeFlags(), this.buildOptionFlags3(), this.clientTimeZone, this.clientLcid) + "\n" + indent + "         " + (0, _sprintfJs.sprintf)("Hostname:'%s', Username:'%s', Password:'%s', AppName:'%s', ServerName:'%s', LibraryName:'%s'", this.hostname, this.userName, this.password, this.appName, this.serverName, this.libraryName) + "\n" + indent + "         " + (0, _sprintfJs.sprintf)("Language:'%s', Database:'%s', SSPI:'%s', AttachDbFile:'%s', ChangePassword:'%s'", this.language, this.database, this.sspi, this.attachDbFile, this.changePassword);
		}
	};
	exports.default = Login7Payload;
	module.exports = Login7Payload;
}));
//#endregion
//#region node_modules/tedious/lib/ntlm-payload.js
var require_ntlm_payload = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	var crypto = _interopRequireWildcard(__require("crypto"));
	var _jsMd = _interopRequireDefault(require_md4());
	function _interopRequireWildcard(e, t) {
		if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
		return (_interopRequireWildcard = function(e, t) {
			if (!t && e && e.__esModule) return e;
			var o, i, f = {
				__proto__: null,
				default: e
			};
			if (null === e || "object" != typeof e && "function" != typeof e) return f;
			if (o = t ? n : r) {
				if (o.has(e)) return o.get(e);
				o.set(e, f);
			}
			for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
			return f;
		})(e, t);
	}
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NTLMResponsePayload = class {
		constructor(loginData) {
			this.data = this.createResponse(loginData);
		}
		toString(indent = "") {
			return indent + "NTLM Auth";
		}
		createResponse(challenge) {
			const client_nonce = this.createClientNonce();
			const lmv2len = 24;
			const ntlmv2len = 16;
			const domain = challenge.domain;
			const username = challenge.userName;
			const password = challenge.password;
			const ntlmData = challenge.ntlmpacket;
			const server_data = ntlmData.target;
			const server_nonce = ntlmData.nonce;
			const bufferLength = 64 + domain.length * 2 + username.length * 2 + lmv2len + ntlmv2len + 8 + 8 + 8 + 4 + server_data.length + 4;
			const data = new _writableTrackingBuffer.default(bufferLength);
			data.position = 0;
			data.writeString("NTLMSSP\0", "utf8");
			data.writeUInt32LE(3);
			const baseIdx = 64;
			const dnIdx = baseIdx;
			const unIdx = dnIdx + domain.length * 2;
			const l2Idx = unIdx + username.length * 2;
			const ntIdx = l2Idx + lmv2len;
			data.writeUInt16LE(lmv2len);
			data.writeUInt16LE(lmv2len);
			data.writeUInt32LE(l2Idx);
			data.writeUInt16LE(ntlmv2len);
			data.writeUInt16LE(ntlmv2len);
			data.writeUInt32LE(ntIdx);
			data.writeUInt16LE(domain.length * 2);
			data.writeUInt16LE(domain.length * 2);
			data.writeUInt32LE(dnIdx);
			data.writeUInt16LE(username.length * 2);
			data.writeUInt16LE(username.length * 2);
			data.writeUInt32LE(unIdx);
			data.writeUInt16LE(0);
			data.writeUInt16LE(0);
			data.writeUInt32LE(baseIdx);
			data.writeUInt16LE(0);
			data.writeUInt16LE(0);
			data.writeUInt32LE(baseIdx);
			data.writeUInt16LE(33281);
			data.writeUInt16LE(8);
			data.writeString(domain, "ucs2");
			data.writeString(username, "ucs2");
			const lmv2Data = this.lmv2Response(domain, username, password, server_nonce, client_nonce);
			data.copyFrom(lmv2Data);
			const genTime = (/* @__PURE__ */ new Date()).getTime();
			const ntlmDataBuffer = this.ntlmv2Response(domain, username, password, server_nonce, server_data, client_nonce, genTime);
			data.copyFrom(ntlmDataBuffer);
			data.writeUInt32LE(257);
			data.writeUInt32LE(0);
			const timestamp = this.createTimestamp(genTime);
			data.copyFrom(timestamp);
			data.copyFrom(client_nonce);
			data.writeUInt32LE(0);
			data.copyFrom(server_data);
			data.writeUInt32LE(0);
			return data.data;
		}
		createClientNonce() {
			const client_nonce = Buffer.alloc(8, 0);
			let nidx = 0;
			while (nidx < 8) {
				client_nonce.writeUInt8(Math.ceil(Math.random() * 255), nidx);
				nidx++;
			}
			return client_nonce;
		}
		ntlmv2Response(domain, user, password, serverNonce, targetInfo, clientNonce, mytime) {
			const timestamp = this.createTimestamp(mytime);
			const hash = this.ntv2Hash(domain, user, password);
			const dataLength = 40 + targetInfo.length;
			const data = Buffer.alloc(dataLength, 0);
			serverNonce.copy(data, 0, 0, 8);
			data.writeUInt32LE(257, 8);
			data.writeUInt32LE(0, 12);
			timestamp.copy(data, 16, 0, 8);
			clientNonce.copy(data, 24, 0, 8);
			data.writeUInt32LE(0, 32);
			targetInfo.copy(data, 36, 0, targetInfo.length);
			data.writeUInt32LE(0, 36 + targetInfo.length);
			return this.hmacMD5(data, hash);
		}
		createTimestamp(time) {
			const tenthsOfAMicrosecond = (BigInt(time) + BigInt(11644473600)) * BigInt(1e7);
			const lo = Number(tenthsOfAMicrosecond & BigInt(4294967295));
			const hi = Number(tenthsOfAMicrosecond >> BigInt(32) & BigInt(4294967295));
			const result = Buffer.alloc(8);
			result.writeUInt32LE(lo, 0);
			result.writeUInt32LE(hi, 4);
			return result;
		}
		lmv2Response(domain, user, password, serverNonce, clientNonce) {
			const hash = this.ntv2Hash(domain, user, password);
			const data = Buffer.alloc(serverNonce.length + clientNonce.length, 0);
			serverNonce.copy(data);
			clientNonce.copy(data, serverNonce.length, 0, clientNonce.length);
			const newhash = this.hmacMD5(data, hash);
			const response = Buffer.alloc(newhash.length + clientNonce.length, 0);
			newhash.copy(response);
			clientNonce.copy(response, newhash.length, 0, clientNonce.length);
			return response;
		}
		ntv2Hash(domain, user, password) {
			const hash = this.ntHash(password);
			const identity = Buffer.from(user.toUpperCase() + domain.toUpperCase(), "ucs2");
			return this.hmacMD5(identity, hash);
		}
		ntHash(text) {
			const unicodeString = Buffer.from(text, "ucs2");
			return Buffer.from(_jsMd.default.arrayBuffer(unicodeString));
		}
		hmacMD5(data, key) {
			return crypto.createHmac("MD5", key).update(data).digest();
		}
	};
	exports.default = NTLMResponsePayload;
	module.exports = NTLMResponsePayload;
}));
//#endregion
//#region node_modules/tedious/lib/errors.js
var require_errors = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.RequestError = exports.InputError = exports.ConnectionError = void 0;
	var ConnectionError = class extends Error {
		constructor(message, code, options) {
			super(message, options);
			this.code = code;
		}
	};
	exports.ConnectionError = ConnectionError;
	var RequestError = class extends Error {
		constructor(message, code, options) {
			super(message, options);
			this.code = code;
		}
	};
	exports.RequestError = RequestError;
	var InputError = class extends TypeError {};
	exports.InputError = InputError;
}));
//#endregion
//#region node_modules/tedious/lib/always-encrypted/types.js
var require_types = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.SQLServerStatementColumnEncryptionSetting = exports.SQLServerEncryptionType = exports.DescribeParameterEncryptionResultSet2 = exports.DescribeParameterEncryptionResultSet1 = void 0;
	exports.SQLServerEncryptionType = /*#__PURE__*/ function(SQLServerEncryptionType) {
		SQLServerEncryptionType[SQLServerEncryptionType["Deterministic"] = 1] = "Deterministic";
		SQLServerEncryptionType[SQLServerEncryptionType["Randomized"] = 2] = "Randomized";
		SQLServerEncryptionType[SQLServerEncryptionType["PlainText"] = 0] = "PlainText";
		return SQLServerEncryptionType;
	}({});
	exports.DescribeParameterEncryptionResultSet1 = /*#__PURE__*/ function(DescribeParameterEncryptionResultSet1) {
		DescribeParameterEncryptionResultSet1[DescribeParameterEncryptionResultSet1["KeyOrdinal"] = 0] = "KeyOrdinal";
		DescribeParameterEncryptionResultSet1[DescribeParameterEncryptionResultSet1["DbId"] = 1] = "DbId";
		DescribeParameterEncryptionResultSet1[DescribeParameterEncryptionResultSet1["KeyId"] = 2] = "KeyId";
		DescribeParameterEncryptionResultSet1[DescribeParameterEncryptionResultSet1["KeyVersion"] = 3] = "KeyVersion";
		DescribeParameterEncryptionResultSet1[DescribeParameterEncryptionResultSet1["KeyMdVersion"] = 4] = "KeyMdVersion";
		DescribeParameterEncryptionResultSet1[DescribeParameterEncryptionResultSet1["EncryptedKey"] = 5] = "EncryptedKey";
		DescribeParameterEncryptionResultSet1[DescribeParameterEncryptionResultSet1["ProviderName"] = 6] = "ProviderName";
		DescribeParameterEncryptionResultSet1[DescribeParameterEncryptionResultSet1["KeyPath"] = 7] = "KeyPath";
		DescribeParameterEncryptionResultSet1[DescribeParameterEncryptionResultSet1["KeyEncryptionAlgorithm"] = 8] = "KeyEncryptionAlgorithm";
		return DescribeParameterEncryptionResultSet1;
	}({});
	exports.DescribeParameterEncryptionResultSet2 = /*#__PURE__*/ function(DescribeParameterEncryptionResultSet2) {
		DescribeParameterEncryptionResultSet2[DescribeParameterEncryptionResultSet2["ParameterOrdinal"] = 0] = "ParameterOrdinal";
		DescribeParameterEncryptionResultSet2[DescribeParameterEncryptionResultSet2["ParameterName"] = 1] = "ParameterName";
		DescribeParameterEncryptionResultSet2[DescribeParameterEncryptionResultSet2["ColumnEncryptionAlgorithm"] = 2] = "ColumnEncryptionAlgorithm";
		DescribeParameterEncryptionResultSet2[DescribeParameterEncryptionResultSet2["ColumnEncrytionType"] = 3] = "ColumnEncrytionType";
		DescribeParameterEncryptionResultSet2[DescribeParameterEncryptionResultSet2["ColumnEncryptionKeyOrdinal"] = 4] = "ColumnEncryptionKeyOrdinal";
		DescribeParameterEncryptionResultSet2[DescribeParameterEncryptionResultSet2["NormalizationRuleVersion"] = 5] = "NormalizationRuleVersion";
		return DescribeParameterEncryptionResultSet2;
	}({});
	exports.SQLServerStatementColumnEncryptionSetting = /*#__PURE__*/ function(SQLServerStatementColumnEncryptionSetting) {
		/**
		* if "Column Encryption Setting=Enabled" in the connection string, use Enabled. Otherwise, maps to Disabled.
		*/
		SQLServerStatementColumnEncryptionSetting[SQLServerStatementColumnEncryptionSetting["UseConnectionSetting"] = 0] = "UseConnectionSetting";
		/**
		* Enables TCE for the command. Overrides the connection level setting for this command.
		*/
		SQLServerStatementColumnEncryptionSetting[SQLServerStatementColumnEncryptionSetting["Enabled"] = 1] = "Enabled";
		/**
		* Parameters will not be encrypted, only the ResultSet will be decrypted. This is an optimization for queries that
		* do not pass any encrypted input parameters. Overrides the connection level setting for this command.
		*/
		SQLServerStatementColumnEncryptionSetting[SQLServerStatementColumnEncryptionSetting["ResultSetOnly"] = 2] = "ResultSetOnly";
		/**
		* Disables TCE for the command.Overrides the connection level setting for this command.
		*/
		SQLServerStatementColumnEncryptionSetting[SQLServerStatementColumnEncryptionSetting["Disabled"] = 3] = "Disabled";
		return SQLServerStatementColumnEncryptionSetting;
	}({});
}));
//#endregion
//#region node_modules/tedious/lib/request.js
var require_request$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _events$3 = __require("events");
	var _errors = require_errors();
	var _types = require_types();
	/**
	* The callback is called when the request has completed, either successfully or with an error.
	* If an error occurs during execution of the statement(s), then `err` will describe the error.
	*
	* As only one request at a time may be executed on a connection, another request should not
	* be initiated until this callback is called.
	*
	* This callback is called before `requestCompleted` is emitted.
	*/
	/**
	* ```js
	* const { Request } = require('tedious');
	* const request = new Request("select 42, 'hello world'", (err, rowCount) {
	*   // Request completion callback...
	* });
	* connection.execSql(request);
	* ```
	*/
	var Request = class extends _events$3.EventEmitter {
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* This event, describing result set columns, will be emitted before row
		* events are emitted. This event may be emitted multiple times when more
		* than one recordset is produced by the statement.
		*
		* An array like object, where the columns can be accessed either by index
		* or name. Columns with a name that is an integer are not accessible by name,
		* as it would be interpreted as an array index.
		*/
		/**
		* The request has been prepared and can be used in subsequent calls to execute and unprepare.
		*/
		/**
		* The request encountered an error and has not been prepared.
		*/
		/**
		* A row resulting from execution of the SQL statement.
		*/
		/**
		* All rows from a result set have been provided (through `row` events).
		*
		* This token is used to indicate the completion of a SQL statement.
		* As multiple SQL statements can be sent to the server in a single SQL batch, multiple `done` can be generated.
		* An `done` event is emitted for each SQL statement in the SQL batch except variable declarations.
		* For execution of SQL statements within stored procedures, `doneProc` and `doneInProc` events are used in place of `done`.
		*
		* If you are using [[Connection.execSql]] then SQL server may treat the multiple calls with the same query as a stored procedure.
		* When this occurs, the `doneProc` and `doneInProc` events may be emitted instead. You must handle both events to ensure complete coverage.
		*/
		/**
		* `request.on('doneInProc', function (rowCount, more, rows) { });`
		*
		* Indicates the completion status of a SQL statement within a stored procedure. All rows from a statement
		* in a stored procedure have been provided (through `row` events).
		*
		* This event may also occur when executing multiple calls with the same query using [[execSql]].
		*/
		/**
		* Indicates the completion status of a stored procedure. This is also generated for stored procedures
		* executed through SQL statements.\
		* This event may also occur when executing multiple calls with the same query using [[execSql]].
		*/
		/**
		* A value for an output parameter (that was added to the request with [[addOutputParameter]]).
		* See also `Using Parameters`.
		*/
		/**
		* This event gives the columns by which data is ordered, if `ORDER BY` clause is executed in SQL Server.
		*/
		on(event, listener) {
			return super.on(event, listener);
		}
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		emit(event, ...args) {
			return super.emit(event, ...args);
		}
		/**
		* @param sqlTextOrProcedure
		*   The SQL statement to be executed
		*
		* @param callback
		*   The callback to execute once the request has been fully completed.
		*/
		constructor(sqlTextOrProcedure, callback, options) {
			super();
			this.sqlTextOrProcedure = sqlTextOrProcedure;
			this.parameters = [];
			this.parametersByName = {};
			this.preparing = false;
			this.handle = void 0;
			this.canceled = false;
			this.paused = false;
			this.error = void 0;
			this.connection = void 0;
			this.timeout = void 0;
			this.userCallback = callback;
			this.statementColumnEncryptionSetting = options && options.statementColumnEncryptionSetting || _types.SQLServerStatementColumnEncryptionSetting.UseConnectionSetting;
			this.cryptoMetadataLoaded = false;
			this.callback = function(err, rowCount, rows) {
				if (this.preparing) {
					this.preparing = false;
					if (err) this.emit("error", err);
					else this.emit("prepared");
				} else {
					this.userCallback(err, rowCount, rows);
					this.emit("requestCompleted");
				}
			};
		}
		/**
		* @param name
		*   The parameter name. This should correspond to a parameter in the SQL,
		*   or a parameter that a called procedure expects. The name should not start with `@`.
		*
		* @param type
		*   One of the supported data types.
		*
		* @param value
		*   The value that the parameter is to be given. The Javascript type of the
		*   argument should match that documented for data types.
		*
		* @param options
		*   Additional type options. Optional.
		*/
		addParameter(name, type, value, options) {
			const { output = false, length, precision, scale } = options ?? {};
			const parameter = {
				type,
				name,
				value,
				output,
				length,
				precision,
				scale
			};
			this.parameters.push(parameter);
			this.parametersByName[name] = parameter;
		}
		/**
		* @param name
		*   The parameter name. This should correspond to a parameter in the SQL,
		*   or a parameter that a called procedure expects.
		*
		* @param type
		*   One of the supported data types.
		*
		* @param value
		*   The value that the parameter is to be given. The Javascript type of the
		*   argument should match that documented for data types
		*
		* @param options
		*   Additional type options. Optional.
		*/
		addOutputParameter(name, type, value, options) {
			this.addParameter(name, type, value, {
				...options,
				output: true
			});
		}
		/**
		* @private
		*/
		makeParamsParameter(parameters) {
			let paramsParameter = "";
			for (let i = 0, len = parameters.length; i < len; i++) {
				const parameter = parameters[i];
				if (paramsParameter.length > 0) paramsParameter += ", ";
				paramsParameter += "@" + parameter.name + " ";
				paramsParameter += parameter.type.declaration(parameter);
				if (parameter.output) paramsParameter += " OUTPUT";
			}
			return paramsParameter;
		}
		/**
		* @private
		*/
		validateParameters(collation) {
			for (let i = 0, len = this.parameters.length; i < len; i++) {
				const parameter = this.parameters[i];
				try {
					parameter.value = parameter.type.validate(parameter.value, collation);
				} catch (error) {
					throw new _errors.RequestError("Validation failed for parameter '" + parameter.name + "'. " + error.message, "EPARAM", { cause: error });
				}
			}
		}
		/**
		* Temporarily suspends the flow of data from the database. No more `row` events will be emitted until [[resume] is called.
		* If this request is already in a paused state, calling [[pause]] has no effect.
		*/
		pause() {
			if (this.paused) return;
			this.emit("pause");
			this.paused = true;
		}
		/**
		* Resumes the flow of data from the database.
		* If this request is not in a paused state, calling [[resume]] has no effect.
		*/
		resume() {
			if (!this.paused) return;
			this.paused = false;
			this.emit("resume");
		}
		/**
		* Cancels a request while waiting for a server response.
		*/
		cancel() {
			if (this.canceled) return;
			this.canceled = true;
			this.emit("cancel");
		}
		/**
		* Sets a timeout for this request.
		*
		* @param timeout
		*   The number of milliseconds before the request is considered failed,
		*   or `0` for no timeout. When no timeout is set for the request,
		*   the [[ConnectionOptions.requestTimeout]] of the [[Connection]] is used.
		*/
		setTimeout(timeout) {
			this.timeout = timeout;
		}
	};
	exports.default = Request;
	module.exports = Request;
}));
//#endregion
//#region node_modules/tedious/lib/all-headers.js
var require_all_headers = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.writeToTrackingBuffer = writeToTrackingBuffer;
	var TYPE = {
		QUERY_NOTIFICATIONS: 1,
		TXN_DESCRIPTOR: 2,
		TRACE_ACTIVITY: 3
	};
	var TXNDESCRIPTOR_HEADER_LEN = 18;
	function writeToTrackingBuffer(buffer, txnDescriptor, outstandingRequestCount) {
		buffer.writeUInt32LE(0);
		buffer.writeUInt32LE(TXNDESCRIPTOR_HEADER_LEN);
		buffer.writeUInt16LE(TYPE.TXN_DESCRIPTOR);
		buffer.writeBuffer(txnDescriptor);
		buffer.writeUInt32LE(outstandingRequestCount);
		const data = buffer.data;
		data.writeUInt32LE(data.length, 0);
		return buffer;
	}
}));
//#endregion
//#region node_modules/tedious/lib/rpcrequest-payload.js
var require_rpcrequest_payload = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	var _allHeaders = require_all_headers();
	var _errors = require_errors();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var STATUS = {
		BY_REF_VALUE: 1,
		DEFAULT_VALUE: 2
	};
	var RpcRequestPayload = class {
		constructor(procedure, parameters, txnDescriptor, options, collation) {
			this.procedure = procedure;
			this.parameters = parameters;
			this.options = options;
			this.txnDescriptor = txnDescriptor;
			this.collation = collation;
		}
		[Symbol.iterator]() {
			return this.generateData();
		}
		*generateData() {
			const buffer = new _writableTrackingBuffer.default(500);
			if (this.options.tdsVersion >= "7_2") (0, _allHeaders.writeToTrackingBuffer)(buffer, this.txnDescriptor, 1);
			if (typeof this.procedure === "string") buffer.writeUsVarchar(this.procedure);
			else {
				buffer.writeUShort(65535);
				buffer.writeUShort(this.procedure);
			}
			buffer.writeUInt16LE(0);
			yield buffer.data;
			const parametersLength = this.parameters.length;
			for (let i = 0; i < parametersLength; i++) yield* this.generateParameterData(this.parameters[i]);
		}
		toString(indent = "") {
			return indent + ("RPC Request - " + this.procedure);
		}
		*generateParameterData(parameter) {
			const buffer = new _writableTrackingBuffer.default(3 + Buffer.byteLength(parameter.name, "ucs-2") + 1);
			if (parameter.name) buffer.writeBVarchar("@" + parameter.name);
			else buffer.writeBVarchar("");
			let statusFlags = 0;
			if (parameter.output) statusFlags |= STATUS.BY_REF_VALUE;
			buffer.writeUInt8(statusFlags);
			yield buffer.data;
			const param = { value: parameter.value };
			const type = parameter.type;
			if ((type.id & 48) === 32) {
				if (parameter.length) param.length = parameter.length;
				else if (type.resolveLength) param.length = type.resolveLength(parameter);
			}
			if (parameter.precision) param.precision = parameter.precision;
			else if (type.resolvePrecision) param.precision = type.resolvePrecision(parameter);
			if (parameter.scale) param.scale = parameter.scale;
			else if (type.resolveScale) param.scale = type.resolveScale(parameter);
			if (this.collation) param.collation = this.collation;
			yield type.generateTypeInfo(param, this.options);
			yield type.generateParameterLength(param, this.options);
			try {
				yield* type.generateParameterData(param, this.options);
			} catch (error) {
				throw new _errors.InputError(`Input parameter '${parameter.name}' could not be validated`, { cause: error });
			}
		}
	};
	exports.default = RpcRequestPayload;
	module.exports = RpcRequestPayload;
}));
//#endregion
//#region node_modules/tedious/lib/sqlbatch-payload.js
var require_sqlbatch_payload = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	var _allHeaders = require_all_headers();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var SqlBatchPayload = class {
		constructor(sqlText, txnDescriptor, options) {
			this.sqlText = sqlText;
			this.txnDescriptor = txnDescriptor;
			this.options = options;
		}
		*[Symbol.iterator]() {
			if (this.options.tdsVersion >= "7_2") {
				const buffer = new _writableTrackingBuffer.default(18, "ucs2");
				(0, _allHeaders.writeToTrackingBuffer)(buffer, this.txnDescriptor, 1);
				yield buffer.data;
			}
			yield Buffer.from(this.sqlText, "ucs2");
		}
		toString(indent = "") {
			return indent + ("SQL Batch - " + this.sqlText);
		}
	};
	exports.default = SqlBatchPayload;
	module.exports = SqlBatchPayload;
}));
//#endregion
//#region node_modules/native-duplexpair/index.js
var require_native_duplexpair = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Duplex = __require("stream").Duplex;
	var kCallback = Symbol("Callback");
	var kOtherSide = Symbol("Other");
	var DuplexSocket = class extends Duplex {
		constructor(options) {
			super(options);
			this[kCallback] = null;
			this[kOtherSide] = null;
		}
		_read() {
			const callback = this[kCallback];
			if (callback) {
				this[kCallback] = null;
				callback();
			}
		}
		_write(chunk, encoding, callback) {
			this[kOtherSide][kCallback] = callback;
			this[kOtherSide].push(chunk);
		}
		_final(callback) {
			this[kOtherSide].on("end", callback);
			this[kOtherSide].push(null);
		}
	};
	var DuplexPair = class {
		constructor(options) {
			this.socket1 = new DuplexSocket(options);
			this.socket2 = new DuplexSocket(options);
			this.socket1[kOtherSide] = this.socket2;
			this.socket2[kOtherSide] = this.socket1;
		}
	};
	module.exports = DuplexPair;
}));
//#endregion
//#region node_modules/tedious/lib/message.js
var require_message = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _stream$4 = __require("stream");
	var Message = class extends _stream$4.PassThrough {
		constructor({ type, resetConnection = false }) {
			super();
			this.type = type;
			this.resetConnection = resetConnection;
			this.ignore = false;
		}
	};
	exports.default = Message;
	module.exports = Message;
}));
//#endregion
//#region node_modules/tedious/lib/incoming-message-stream.js
var require_incoming_message_stream = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _bl = _interopRequireDefault(require_bl());
	var _stream$3 = __require("stream");
	var _message = _interopRequireDefault(require_message());
	var _packet = require_packet();
	var _errors = require_errors();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	/**
	IncomingMessageStream
	Transform received TDS data into individual IncomingMessage streams.
	*/
	var IncomingMessageStream = class extends _stream$3.Transform {
		constructor(debug) {
			super({ readableObjectMode: true });
			this.debug = debug;
			this.currentMessage = void 0;
			this.bl = new _bl.default();
		}
		pause() {
			super.pause();
			if (this.currentMessage) this.currentMessage.pause();
			return this;
		}
		resume() {
			super.resume();
			if (this.currentMessage) this.currentMessage.resume();
			return this;
		}
		processBufferedData(callback) {
			while (this.bl.length >= _packet.HEADER_LENGTH) {
				const length = this.bl.readUInt16BE(2);
				if (length < _packet.HEADER_LENGTH) return callback(new _errors.ConnectionError("Unable to process incoming packet"));
				if (this.bl.length >= length) {
					const data = this.bl.slice(0, length);
					this.bl.consume(length);
					const packet = new _packet.Packet(data);
					this.debug.packet("Received", packet);
					this.debug.data(packet);
					let message = this.currentMessage;
					if (message === void 0) {
						this.currentMessage = message = new _message.default({
							type: packet.type(),
							resetConnection: false
						});
						this.push(message);
					}
					if (packet.isLast()) {
						message.once("end", () => {
							this.currentMessage = void 0;
							this.processBufferedData(callback);
						});
						message.end(packet.data());
						return;
					} else if (!message.write(packet.data())) {
						message.once("drain", () => {
							this.processBufferedData(callback);
						});
						return;
					}
				} else break;
			}
			callback();
		}
		_transform(chunk, _encoding, callback) {
			this.bl.append(chunk);
			this.processBufferedData(callback);
		}
	};
	exports.default = IncomingMessageStream;
	module.exports = IncomingMessageStream;
}));
//#endregion
//#region node_modules/tedious/lib/outgoing-message-stream.js
var require_outgoing_message_stream = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _bl = _interopRequireDefault(require_bl());
	var _stream$2 = __require("stream");
	var _packet = require_packet();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var OutgoingMessageStream = class extends _stream$2.Duplex {
		constructor(debug, { packetSize }) {
			super({ writableObjectMode: true });
			this.packetSize = packetSize;
			this.debug = debug;
			this.bl = new _bl.default();
			this.on("finish", () => {
				this.push(null);
			});
		}
		_write(message, _encoding, callback) {
			const length = this.packetSize - _packet.HEADER_LENGTH;
			let packetNumber = 0;
			this.currentMessage = message;
			this.currentMessage.on("data", (data) => {
				if (message.ignore) return;
				this.bl.append(data);
				while (this.bl.length > length) {
					const data = this.bl.slice(0, length);
					this.bl.consume(length);
					const packet = new _packet.Packet(message.type);
					packet.packetId(packetNumber += 1);
					packet.resetConnection(message.resetConnection);
					packet.addData(data);
					this.debug.packet("Sent", packet);
					this.debug.data(packet);
					if (this.push(packet.buffer) === false) message.pause();
				}
			});
			this.currentMessage.on("end", () => {
				const data = this.bl.slice();
				this.bl.consume(data.length);
				const packet = new _packet.Packet(message.type);
				packet.packetId(packetNumber += 1);
				packet.resetConnection(message.resetConnection);
				packet.last(true);
				packet.ignore(message.ignore);
				packet.addData(data);
				this.debug.packet("Sent", packet);
				this.debug.data(packet);
				this.push(packet.buffer);
				this.currentMessage = void 0;
				callback();
			});
		}
		_read(_size) {
			if (this.currentMessage) this.currentMessage.resume();
		}
	};
	exports.default = OutgoingMessageStream;
	module.exports = OutgoingMessageStream;
}));
//#endregion
//#region node_modules/tedious/lib/message-io.js
var require_message_io = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _nativeDuplexpair = _interopRequireDefault(require_native_duplexpair());
	var tls$1 = _interopRequireWildcard(__require("tls"));
	var _events$2 = __require("events");
	var _message = _interopRequireDefault(require_message());
	var _packet = require_packet();
	var _incomingMessageStream = _interopRequireDefault(require_incoming_message_stream());
	var _outgoingMessageStream = _interopRequireDefault(require_outgoing_message_stream());
	function _interopRequireWildcard(e, t) {
		if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
		return (_interopRequireWildcard = function(e, t) {
			if (!t && e && e.__esModule) return e;
			var o, i, f = {
				__proto__: null,
				default: e
			};
			if (null === e || "object" != typeof e && "function" != typeof e) return f;
			if (o = t ? n : r) {
				if (o.has(e)) return o.get(e);
				o.set(e, f);
			}
			for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
			return f;
		})(e, t);
	}
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var MessageIO = class extends _events$2.EventEmitter {
		constructor(socket, packetSize, debug) {
			super();
			this.socket = socket;
			this.debug = debug;
			this.tlsNegotiationComplete = false;
			this.incomingMessageStream = new _incomingMessageStream.default(this.debug);
			this.incomingMessageIterator = this.incomingMessageStream[Symbol.asyncIterator]();
			this.outgoingMessageStream = new _outgoingMessageStream.default(this.debug, { packetSize });
			this.socket.pipe(this.incomingMessageStream);
			this.outgoingMessageStream.pipe(this.socket);
		}
		packetSize(...args) {
			if (args.length > 0) {
				const packetSize = args[0];
				this.debug.log("Packet size changed from " + this.outgoingMessageStream.packetSize + " to " + packetSize);
				this.outgoingMessageStream.packetSize = packetSize;
			}
			if (this.securePair) this.securePair.cleartext.setMaxSendFragment(this.outgoingMessageStream.packetSize);
			return this.outgoingMessageStream.packetSize;
		}
		startTls(credentialsDetails, hostname, trustServerCertificate) {
			if (!credentialsDetails.maxVersion || ![
				"TLSv1.2",
				"TLSv1.1",
				"TLSv1"
			].includes(credentialsDetails.maxVersion)) credentialsDetails.maxVersion = "TLSv1.2";
			const secureContext = tls$1.createSecureContext(credentialsDetails);
			return new Promise((resolve, reject) => {
				const duplexpair = new _nativeDuplexpair.default();
				const securePair = this.securePair = {
					cleartext: tls$1.connect({
						socket: duplexpair.socket1,
						servername: hostname,
						secureContext,
						rejectUnauthorized: !trustServerCertificate
					}),
					encrypted: duplexpair.socket2
				};
				const onSecureConnect = () => {
					securePair.encrypted.removeListener("readable", onReadable);
					securePair.cleartext.removeListener("error", onError);
					securePair.cleartext.removeListener("secureConnect", onSecureConnect);
					securePair.cleartext.once("error", (err) => {
						this.socket.destroy(err);
					});
					const cipher = securePair.cleartext.getCipher();
					if (cipher) this.debug.log("TLS negotiated (" + cipher.name + ", " + cipher.version + ")");
					this.emit("secure", securePair.cleartext);
					securePair.cleartext.setMaxSendFragment(this.outgoingMessageStream.packetSize);
					this.outgoingMessageStream.unpipe(this.socket);
					this.socket.unpipe(this.incomingMessageStream);
					this.socket.pipe(securePair.encrypted);
					securePair.encrypted.pipe(this.socket);
					securePair.cleartext.pipe(this.incomingMessageStream);
					this.outgoingMessageStream.pipe(securePair.cleartext);
					this.tlsNegotiationComplete = true;
					resolve();
				};
				const onError = (err) => {
					securePair.encrypted.removeListener("readable", onReadable);
					securePair.cleartext.removeListener("error", onError);
					securePair.cleartext.removeListener("secureConnect", onSecureConnect);
					securePair.cleartext.destroy();
					securePair.encrypted.destroy();
					reject(err);
				};
				const onReadable = () => {
					const message = new _message.default({
						type: _packet.TYPE.PRELOGIN,
						resetConnection: false
					});
					let chunk;
					while (chunk = securePair.encrypted.read()) message.write(chunk);
					this.outgoingMessageStream.write(message);
					message.end();
					this.readMessage().then(async (response) => {
						securePair.encrypted.once("readable", onReadable);
						for await (const data of response) securePair.encrypted.write(data);
					}).catch(onError);
				};
				securePair.cleartext.once("error", onError);
				securePair.cleartext.once("secureConnect", onSecureConnect);
				securePair.encrypted.once("readable", onReadable);
			});
		}
		sendMessage(packetType, data, resetConnection) {
			const message = new _message.default({
				type: packetType,
				resetConnection
			});
			message.end(data);
			this.outgoingMessageStream.write(message);
			return message;
		}
		/**
		* Read the next incoming message from the socket.
		*/
		async readMessage() {
			const result = await this.incomingMessageIterator.next();
			if (result.done) throw new Error("unexpected end of message stream");
			return result.value;
		}
	};
	exports.default = MessageIO;
	module.exports = MessageIO;
}));
//#endregion
//#region node_modules/tedious/lib/collation.js
var require_collation = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.codepageBySortId = exports.codepageByLanguageId = exports.Flags = exports.Collation = void 0;
	var codepageByLanguageId = exports.codepageByLanguageId = {
		[1025]: "CP1256",
		[1028]: "CP950",
		[1029]: "CP1250",
		[1030]: "CP1252",
		[1032]: "CP1253",
		[1033]: "CP1252",
		[1034]: "CP1252",
		[1035]: "CP1252",
		[1036]: "CP1252",
		[1037]: "CP1255",
		[1038]: "CP1250",
		[1039]: "CP1252",
		[1041]: "CP932",
		[1042]: "CP949",
		[1044]: "CP1252",
		[1045]: "CP1250",
		[1047]: "CP1252",
		[1048]: "CP1250",
		[1049]: "CP1251",
		[1050]: "CP1250",
		[1051]: "CP1250",
		[1052]: "CP1250",
		[1054]: "CP874",
		[1055]: "CP1254",
		[1056]: "CP1256",
		[1058]: "CP1251",
		[1060]: "CP1250",
		[1061]: "CP1257",
		[1062]: "CP1257",
		[1063]: "CP1257",
		[1065]: "CP1256",
		[1066]: "CP1258",
		[1068]: "CP1254",
		[1070]: "CP1252",
		[1071]: "CP1251",
		[1083]: "CP1252",
		[1087]: "CP1251",
		[1090]: "CP1250",
		[1091]: "CP1254",
		[1092]: "CP1251",
		[1106]: "CP1252",
		[1122]: "CP1252",
		[1133]: "CP1251",
		[1146]: "CP1252",
		[1148]: "CP1252",
		[1150]: "CP1252",
		[1152]: "CP1256",
		[1155]: "CP1252",
		[1157]: "CP1251",
		[1164]: "CP1256",
		[2052]: "CP936",
		[2074]: "CP1250",
		[2092]: "CP1251",
		[2107]: "CP1252",
		[2143]: "CP1252",
		[3076]: "CP950",
		[3082]: "CP1252",
		[3098]: "CP1251",
		[5124]: "CP950",
		[5146]: "CP1250",
		[8218]: "CP1251",
		[1031]: "CP1252",
		[1079]: "CP1252"
	};
	var codepageBySortId = exports.codepageBySortId = {
		[30]: "CP437",
		[31]: "CP437",
		[32]: "CP437",
		[33]: "CP437",
		[34]: "CP437",
		[40]: "CP850",
		[41]: "CP850",
		[42]: "CP850",
		[43]: "CP850",
		[44]: "CP850",
		[49]: "CP850",
		[51]: "CP1252",
		[52]: "CP1252",
		[53]: "CP1252",
		[54]: "CP1252",
		[55]: "CP850",
		[56]: "CP850",
		[57]: "CP850",
		[58]: "CP850",
		[59]: "CP850",
		[60]: "CP850",
		[61]: "CP850",
		[80]: "CP1250",
		[81]: "CP1250",
		[82]: "CP1250",
		[83]: "CP1250",
		[84]: "CP1250",
		[85]: "CP1250",
		[86]: "CP1250",
		[87]: "CP1250",
		[88]: "CP1250",
		[89]: "CP1250",
		[90]: "CP1250",
		[91]: "CP1250",
		[92]: "CP1250",
		[93]: "CP1250",
		[94]: "CP1250",
		[95]: "CP1250",
		[96]: "CP1250",
		[104]: "CP1251",
		[105]: "CP1251",
		[106]: "CP1251",
		[107]: "CP1251",
		[108]: "CP1251",
		[112]: "CP1253",
		[113]: "CP1253",
		[114]: "CP1253",
		[120]: "CP1253",
		[121]: "CP1253",
		[122]: "CP1253",
		[124]: "CP1253",
		[128]: "CP1254",
		[129]: "CP1254",
		[130]: "CP1254",
		[136]: "CP1255",
		[137]: "CP1255",
		[138]: "CP1255",
		[144]: "CP1256",
		[145]: "CP1256",
		[146]: "CP1256",
		[152]: "CP1257",
		[153]: "CP1257",
		[154]: "CP1257",
		[155]: "CP1257",
		[156]: "CP1257",
		[157]: "CP1257",
		[158]: "CP1257",
		[159]: "CP1257",
		[160]: "CP1257",
		[183]: "CP1252",
		[184]: "CP1252",
		[185]: "CP1252",
		[186]: "CP1252"
	};
	var Flags = exports.Flags = {
		IGNORE_CASE: 1,
		IGNORE_ACCENT: 2,
		IGNORE_KANA: 4,
		IGNORE_WIDTH: 8,
		BINARY: 16,
		BINARY2: 32,
		UTF8: 64
	};
	var Collation = class {
		static fromBuffer(buffer, offset = 0) {
			let lcid = (buffer[offset + 2] & 15) << 16;
			lcid |= buffer[offset + 1] << 8;
			lcid |= buffer[offset + 0];
			let flags = (buffer[offset + 3] & 15) << 4;
			flags |= (buffer[offset + 2] & 240) >>> 4;
			const version = (buffer[offset + 3] & 240) >>> 4;
			const sortId = buffer[offset + 4];
			return new this(lcid, flags, version, sortId);
		}
		constructor(lcid, flags, version, sortId) {
			this.buffer = void 0;
			this.lcid = lcid;
			this.flags = flags;
			this.version = version;
			this.sortId = sortId;
			if (this.flags & Flags.UTF8) this.codepage = "utf-8";
			else if (this.sortId) this.codepage = codepageBySortId[this.sortId];
			else {
				const languageId = this.lcid & 65535;
				this.codepage = codepageByLanguageId[languageId];
			}
		}
		toBuffer() {
			if (this.buffer) return this.buffer;
			this.buffer = Buffer.alloc(5);
			this.buffer[0] = this.lcid & 255;
			this.buffer[1] = this.lcid >>> 8 & 255;
			this.buffer[2] = this.lcid >>> 16 & 15 | (this.flags & 15) << 4;
			this.buffer[3] = (this.flags & 240) >>> 4 | (this.version & 15) << 4;
			this.buffer[4] = this.sortId & 255;
			return this.buffer;
		}
	};
	exports.Collation = Collation;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/null.js
var require_null = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var Null = {
		id: 31,
		type: "NULL",
		name: "Null",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = Null;
	module.exports = Null;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/intn.js
var require_intn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var IntN = {
		id: 38,
		type: "INTN",
		name: "IntN",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = IntN;
	module.exports = IntN;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/tinyint.js
var require_tinyint = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _intn = _interopRequireDefault(require_intn());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var DATA_LENGTH = Buffer.from([1]);
	var NULL_LENGTH = Buffer.from([0]);
	var TinyInt = {
		id: 48,
		type: "INT1",
		name: "TinyInt",
		declaration: function() {
			return "tinyint";
		},
		generateTypeInfo() {
			return Buffer.from([_intn.default.id, 1]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const buffer = Buffer.alloc(1);
			buffer.writeUInt8(Number(parameter.value), 0);
			yield buffer;
		},
		validate: function(value) {
			if (value == null) return null;
			if (typeof value !== "number") value = Number(value);
			if (isNaN(value)) throw new TypeError("Invalid number.");
			if (value < 0 || value > 255) throw new TypeError("Value must be between 0 and 255, inclusive.");
			return value | 0;
		}
	};
	exports.default = TinyInt;
	module.exports = TinyInt;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/bitn.js
var require_bitn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var BitN = {
		id: 104,
		type: "BITN",
		name: "BitN",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		*generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = BitN;
	module.exports = BitN;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/bit.js
var require_bit = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _bitn = _interopRequireDefault(require_bitn());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var DATA_LENGTH = Buffer.from([1]);
	var NULL_LENGTH = Buffer.from([0]);
	var Bit = {
		id: 50,
		type: "BIT",
		name: "Bit",
		declaration: function() {
			return "bit";
		},
		generateTypeInfo() {
			return Buffer.from([_bitn.default.id, 1]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			yield parameter.value ? Buffer.from([1]) : Buffer.from([0]);
		},
		validate: function(value) {
			if (value == null) return null;
			if (value) return true;
			else return false;
		}
	};
	exports.default = Bit;
	module.exports = Bit;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/smallint.js
var require_smallint = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _intn = _interopRequireDefault(require_intn());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var DATA_LENGTH = Buffer.from([2]);
	var NULL_LENGTH = Buffer.from([0]);
	var SmallInt = {
		id: 52,
		type: "INT2",
		name: "SmallInt",
		declaration: function() {
			return "smallint";
		},
		generateTypeInfo() {
			return Buffer.from([_intn.default.id, 2]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const buffer = Buffer.alloc(2);
			buffer.writeInt16LE(Number(parameter.value), 0);
			yield buffer;
		},
		validate: function(value) {
			if (value == null) return null;
			if (typeof value !== "number") value = Number(value);
			if (isNaN(value)) throw new TypeError("Invalid number.");
			if (value < -32768 || value > 32767) throw new TypeError("Value must be between -32768 and 32767, inclusive.");
			return value | 0;
		}
	};
	exports.default = SmallInt;
	module.exports = SmallInt;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/int.js
var require_int = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _intn = _interopRequireDefault(require_intn());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NULL_LENGTH = Buffer.from([0]);
	var DATA_LENGTH = Buffer.from([4]);
	var Int = {
		id: 56,
		type: "INT4",
		name: "Int",
		declaration: function() {
			return "int";
		},
		generateTypeInfo() {
			return Buffer.from([_intn.default.id, 4]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const buffer = Buffer.alloc(4);
			buffer.writeInt32LE(Number(parameter.value), 0);
			yield buffer;
		},
		validate: function(value) {
			if (value == null) return null;
			if (typeof value !== "number") value = Number(value);
			if (isNaN(value)) throw new TypeError("Invalid number.");
			if (value < -2147483648 || value > 2147483647) throw new TypeError("Value must be between -2147483648 and 2147483647, inclusive.");
			return value | 0;
		}
	};
	exports.default = Int;
	module.exports = Int;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/datetimen.js
var require_datetimen = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var DateTimeN = {
		id: 111,
		type: "DATETIMN",
		name: "DateTimeN",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = DateTimeN;
	module.exports = DateTimeN;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/smalldatetime.js
var require_smalldatetime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _datetimen = _interopRequireDefault(require_datetimen());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var EPOCH_DATE = new Date(1900, 0, 1);
	var UTC_EPOCH_DATE = new Date(Date.UTC(1900, 0, 1));
	var DATA_LENGTH = Buffer.from([4]);
	var NULL_LENGTH = Buffer.from([0]);
	var SmallDateTime = {
		id: 58,
		type: "DATETIM4",
		name: "SmallDateTime",
		declaration: function() {
			return "smalldatetime";
		},
		generateTypeInfo() {
			return Buffer.from([_datetimen.default.id, 4]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		generateParameterData: function* (parameter, options) {
			if (parameter.value == null) return;
			const buffer = Buffer.alloc(4);
			let days, dstDiff, minutes;
			if (options.useUTC) {
				days = Math.floor((parameter.value.getTime() - UTC_EPOCH_DATE.getTime()) / 864e5);
				minutes = parameter.value.getUTCHours() * 60 + parameter.value.getUTCMinutes();
			} else {
				dstDiff = -(parameter.value.getTimezoneOffset() - EPOCH_DATE.getTimezoneOffset()) * 60 * 1e3;
				days = Math.floor((parameter.value.getTime() - EPOCH_DATE.getTime() + dstDiff) / 864e5);
				minutes = parameter.value.getHours() * 60 + parameter.value.getMinutes();
			}
			buffer.writeUInt16LE(days, 0);
			buffer.writeUInt16LE(minutes, 2);
			yield buffer;
		},
		validate: function(value, collation, options) {
			if (value == null) return null;
			if (!(value instanceof Date)) value = new Date(Date.parse(value));
			value = value;
			let year, month, date;
			if (options && options.useUTC) {
				year = value.getUTCFullYear();
				month = value.getUTCMonth();
				date = value.getUTCDate();
			} else {
				year = value.getFullYear();
				month = value.getMonth();
				date = value.getDate();
			}
			if (year < 1900 || year > 2079) throw new TypeError("Out of range.");
			if (year === 2079) {
				if (month > 5 || month === 5 && date > 6) throw new TypeError("Out of range.");
			}
			if (isNaN(value)) throw new TypeError("Invalid date.");
			return value;
		}
	};
	exports.default = SmallDateTime;
	module.exports = SmallDateTime;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/floatn.js
var require_floatn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var FloatN = {
		id: 109,
		type: "FLTN",
		name: "FloatN",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = FloatN;
	module.exports = FloatN;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/real.js
var require_real = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _floatn = _interopRequireDefault(require_floatn());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NULL_LENGTH = Buffer.from([0]);
	var DATA_LENGTH = Buffer.from([4]);
	var Real = {
		id: 59,
		type: "FLT4",
		name: "Real",
		declaration: function() {
			return "real";
		},
		generateTypeInfo() {
			return Buffer.from([_floatn.default.id, 4]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const buffer = Buffer.alloc(4);
			buffer.writeFloatLE(parseFloat(parameter.value), 0);
			yield buffer;
		},
		validate: function(value) {
			if (value == null) return null;
			value = parseFloat(value);
			if (isNaN(value)) throw new TypeError("Invalid number.");
			return value;
		}
	};
	exports.default = Real;
	module.exports = Real;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/moneyn.js
var require_moneyn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var MoneyN = {
		id: 110,
		type: "MONEYN",
		name: "MoneyN",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = MoneyN;
	module.exports = MoneyN;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/money.js
var require_money = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _moneyn = _interopRequireDefault(require_moneyn());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var SHIFT_RIGHT_32 = 1 / 4294967296;
	var NULL_LENGTH = Buffer.from([0]);
	var DATA_LENGTH = Buffer.from([8]);
	var Money = {
		id: 60,
		type: "MONEY",
		name: "Money",
		declaration: function() {
			return "money";
		},
		generateTypeInfo: function() {
			return Buffer.from([_moneyn.default.id, 8]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const value = parameter.value * 1e4;
			const buffer = Buffer.alloc(8);
			buffer.writeInt32LE(Math.floor(value * SHIFT_RIGHT_32), 0);
			buffer.writeInt32LE(value & -1, 4);
			yield buffer;
		},
		validate: function(value) {
			if (value == null) return null;
			value = parseFloat(value);
			if (isNaN(value)) throw new TypeError("Invalid number.");
			if (value < -922337203685477.6 || value > 922337203685477.6) throw new TypeError("Value must be between -922337203685477.5808 and 922337203685477.5807, inclusive.");
			return value;
		}
	};
	exports.default = Money;
	module.exports = Money;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/datetime.js
var require_datetime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _datetimen = _interopRequireDefault(require_datetimen());
	var _core = (init_js_joda_esm(), __toCommonJS(js_joda_esm_exports));
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var EPOCH_DATE = _core.LocalDate.ofYearDay(1900, 1);
	var NULL_LENGTH = Buffer.from([0]);
	var DATA_LENGTH = Buffer.from([8]);
	var DateTime = {
		id: 61,
		type: "DATETIME",
		name: "DateTime",
		declaration: function() {
			return "datetime";
		},
		generateTypeInfo() {
			return Buffer.from([_datetimen.default.id, 8]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		generateParameterData: function* (parameter, options) {
			if (parameter.value == null) return;
			const value = parameter.value;
			let date;
			if (options.useUTC) date = _core.LocalDate.of(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
			else date = _core.LocalDate.of(value.getFullYear(), value.getMonth() + 1, value.getDate());
			let days = EPOCH_DATE.until(date, _core.ChronoUnit.DAYS);
			let milliseconds, threeHundredthsOfSecond;
			if (options.useUTC) {
				let seconds = value.getUTCHours() * 60 * 60;
				seconds += value.getUTCMinutes() * 60;
				seconds += value.getUTCSeconds();
				milliseconds = seconds * 1e3 + value.getUTCMilliseconds();
			} else {
				let seconds = value.getHours() * 60 * 60;
				seconds += value.getMinutes() * 60;
				seconds += value.getSeconds();
				milliseconds = seconds * 1e3 + value.getMilliseconds();
			}
			threeHundredthsOfSecond = milliseconds / (3 + 1 / 3);
			threeHundredthsOfSecond = Math.round(threeHundredthsOfSecond);
			if (threeHundredthsOfSecond === 2592e4) {
				days += 1;
				threeHundredthsOfSecond = 0;
			}
			const buffer = Buffer.alloc(8);
			buffer.writeInt32LE(days, 0);
			buffer.writeUInt32LE(threeHundredthsOfSecond, 4);
			yield buffer;
		},
		validate: function(value, collation, options) {
			if (value == null) return null;
			if (!(value instanceof Date)) value = new Date(Date.parse(value));
			value = value;
			let year;
			if (options && options.useUTC) year = value.getUTCFullYear();
			else year = value.getFullYear();
			if (year < 1753 || year > 9999) throw new TypeError("Out of range.");
			if (isNaN(value)) throw new TypeError("Invalid date.");
			return value;
		}
	};
	exports.default = DateTime;
	module.exports = DateTime;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/float.js
var require_float = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _floatn = _interopRequireDefault(require_floatn());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NULL_LENGTH = Buffer.from([0]);
	var Float = {
		id: 62,
		type: "FLT8",
		name: "Float",
		declaration: function() {
			return "float";
		},
		generateTypeInfo() {
			return Buffer.from([_floatn.default.id, 8]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return Buffer.from([8]);
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const buffer = Buffer.alloc(8);
			buffer.writeDoubleLE(parseFloat(parameter.value), 0);
			yield buffer;
		},
		validate: function(value) {
			if (value == null) return null;
			value = parseFloat(value);
			if (isNaN(value)) throw new TypeError("Invalid number.");
			return value;
		}
	};
	exports.default = Float;
	module.exports = Float;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/decimaln.js
var require_decimaln = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var DecimalN = {
		id: 106,
		type: "DECIMALN",
		name: "DecimalN",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = DecimalN;
	module.exports = DecimalN;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/decimal.js
var require_decimal = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _decimaln = _interopRequireDefault(require_decimaln());
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NULL_LENGTH = Buffer.from([0]);
	var Decimal = {
		id: 55,
		type: "DECIMAL",
		name: "Decimal",
		declaration: function(parameter) {
			return "decimal(" + this.resolvePrecision(parameter) + ", " + this.resolveScale(parameter) + ")";
		},
		resolvePrecision: function(parameter) {
			if (parameter.precision != null) return parameter.precision;
			else if (parameter.value === null) return 1;
			else return 18;
		},
		resolveScale: function(parameter) {
			if (parameter.scale != null) return parameter.scale;
			else return 0;
		},
		generateTypeInfo(parameter, _options) {
			let precision;
			if (parameter.precision <= 9) precision = 5;
			else if (parameter.precision <= 19) precision = 9;
			else if (parameter.precision <= 28) precision = 13;
			else precision = 17;
			return Buffer.from([
				_decimaln.default.id,
				precision,
				parameter.precision,
				parameter.scale
			]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			const precision = parameter.precision;
			if (precision <= 9) return Buffer.from([5]);
			else if (precision <= 19) return Buffer.from([9]);
			else if (precision <= 28) return Buffer.from([13]);
			else return Buffer.from([17]);
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const sign = parameter.value < 0 ? 0 : 1;
			const value = Math.round(Math.abs(parameter.value * Math.pow(10, parameter.scale)));
			const precision = parameter.precision;
			if (precision <= 9) {
				const buffer = Buffer.alloc(5);
				buffer.writeUInt8(sign, 0);
				buffer.writeUInt32LE(value, 1);
				yield buffer;
			} else if (precision <= 19) {
				const buffer = new _writableTrackingBuffer.default(9);
				buffer.writeUInt8(sign);
				buffer.writeUInt64LE(value);
				yield buffer.data;
			} else if (precision <= 28) {
				const buffer = new _writableTrackingBuffer.default(13);
				buffer.writeUInt8(sign);
				buffer.writeUInt64LE(value);
				buffer.writeUInt32LE(0);
				yield buffer.data;
			} else {
				const buffer = new _writableTrackingBuffer.default(17);
				buffer.writeUInt8(sign);
				buffer.writeUInt64LE(value);
				buffer.writeUInt32LE(0);
				buffer.writeUInt32LE(0);
				yield buffer.data;
			}
		},
		validate: function(value) {
			if (value == null) return null;
			value = parseFloat(value);
			if (isNaN(value)) throw new TypeError("Invalid number.");
			return value;
		}
	};
	exports.default = Decimal;
	module.exports = Decimal;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/numericn.js
var require_numericn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var NumericN = {
		id: 108,
		type: "NUMERICN",
		name: "NumericN",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = NumericN;
	module.exports = NumericN;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/numeric.js
var require_numeric = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _numericn = _interopRequireDefault(require_numericn());
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NULL_LENGTH = Buffer.from([0]);
	var Numeric = {
		id: 63,
		type: "NUMERIC",
		name: "Numeric",
		declaration: function(parameter) {
			return "numeric(" + this.resolvePrecision(parameter) + ", " + this.resolveScale(parameter) + ")";
		},
		resolvePrecision: function(parameter) {
			if (parameter.precision != null) return parameter.precision;
			else if (parameter.value === null) return 1;
			else return 18;
		},
		resolveScale: function(parameter) {
			if (parameter.scale != null) return parameter.scale;
			else return 0;
		},
		generateTypeInfo(parameter) {
			let precision;
			if (parameter.precision <= 9) precision = 5;
			else if (parameter.precision <= 19) precision = 9;
			else if (parameter.precision <= 28) precision = 13;
			else precision = 17;
			return Buffer.from([
				_numericn.default.id,
				precision,
				parameter.precision,
				parameter.scale
			]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			const precision = parameter.precision;
			if (precision <= 9) return Buffer.from([5]);
			else if (precision <= 19) return Buffer.from([9]);
			else if (precision <= 28) return Buffer.from([13]);
			else return Buffer.from([17]);
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const sign = parameter.value < 0 ? 0 : 1;
			const value = Math.round(Math.abs(parameter.value * Math.pow(10, parameter.scale)));
			if (parameter.precision <= 9) {
				const buffer = Buffer.alloc(5);
				buffer.writeUInt8(sign, 0);
				buffer.writeUInt32LE(value, 1);
				yield buffer;
			} else if (parameter.precision <= 19) {
				const buffer = new _writableTrackingBuffer.default(10);
				buffer.writeUInt8(sign);
				buffer.writeUInt64LE(value);
				yield buffer.data;
			} else if (parameter.precision <= 28) {
				const buffer = new _writableTrackingBuffer.default(14);
				buffer.writeUInt8(sign);
				buffer.writeUInt64LE(value);
				buffer.writeUInt32LE(0);
				yield buffer.data;
			} else {
				const buffer = new _writableTrackingBuffer.default(18);
				buffer.writeUInt8(sign);
				buffer.writeUInt64LE(value);
				buffer.writeUInt32LE(0);
				buffer.writeUInt32LE(0);
				yield buffer.data;
			}
		},
		validate: function(value) {
			if (value == null) return null;
			value = parseFloat(value);
			if (isNaN(value)) throw new TypeError("Invalid number.");
			return value;
		}
	};
	exports.default = Numeric;
	module.exports = Numeric;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/smallmoney.js
var require_smallmoney = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _moneyn = _interopRequireDefault(require_moneyn());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var DATA_LENGTH = Buffer.from([4]);
	var NULL_LENGTH = Buffer.from([0]);
	var SmallMoney = {
		id: 122,
		type: "MONEY4",
		name: "SmallMoney",
		declaration: function() {
			return "smallmoney";
		},
		generateTypeInfo: function() {
			return Buffer.from([_moneyn.default.id, 4]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const buffer = Buffer.alloc(4);
			buffer.writeInt32LE(parameter.value * 1e4, 0);
			yield buffer;
		},
		validate: function(value) {
			if (value == null) return null;
			value = parseFloat(value);
			if (isNaN(value)) throw new TypeError("Invalid number.");
			if (value < -214748.3648 || value > 214748.3647) throw new TypeError("Value must be between -214748.3648 and 214748.3647.");
			return value;
		}
	};
	exports.default = SmallMoney;
	module.exports = SmallMoney;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/bigint.js
var require_bigint = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _intn = _interopRequireDefault(require_intn());
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var DATA_LENGTH = Buffer.from([8]);
	var NULL_LENGTH = Buffer.from([0]);
	var MAX_SAFE_BIGINT = 9223372036854775807n;
	var MIN_SAFE_BIGINT = -9223372036854775808n;
	var BigInt = {
		id: 127,
		type: "INT8",
		name: "BigInt",
		declaration: function() {
			return "bigint";
		},
		generateTypeInfo() {
			return Buffer.from([_intn.default.id, 8]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const buffer = new _writableTrackingBuffer.default(8);
			buffer.writeBigInt64LE(typeof parameter.value === "bigint" ? parameter.value : globalThis.BigInt(parameter.value));
			yield buffer.data;
		},
		validate: function(value) {
			if (value == null) return null;
			if (typeof value !== "bigint") value = globalThis.BigInt(value);
			if (value < MIN_SAFE_BIGINT || value > MAX_SAFE_BIGINT) throw new TypeError(`Value must be between ${MIN_SAFE_BIGINT} and ${MAX_SAFE_BIGINT}, inclusive.`);
			return value;
		}
	};
	exports.default = BigInt;
	module.exports = BigInt;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/image.js
var require_image = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var NULL_LENGTH = Buffer.from([
		255,
		255,
		255,
		255
	]);
	var Image = {
		id: 34,
		type: "IMAGE",
		name: "Image",
		hasTableName: true,
		declaration: function() {
			return "image";
		},
		resolveLength: function(parameter) {
			if (parameter.value != null) return parameter.value.length;
			else return -1;
		},
		generateTypeInfo(parameter) {
			const buffer = Buffer.alloc(5);
			buffer.writeUInt8(this.id, 0);
			buffer.writeInt32LE(parameter.length, 1);
			return buffer;
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			const buffer = Buffer.alloc(4);
			buffer.writeInt32LE(parameter.value.length, 0);
			return buffer;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			yield parameter.value;
		},
		validate: function(value) {
			if (value == null) return null;
			if (!Buffer.isBuffer(value)) throw new TypeError("Invalid buffer.");
			return value;
		}
	};
	exports.default = Image;
	module.exports = Image;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/text.js
var require_text = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _iconvLite = _interopRequireDefault(require_lib$1());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NULL_LENGTH = Buffer.from([
		255,
		255,
		255,
		255
	]);
	var Text = {
		id: 35,
		type: "TEXT",
		name: "Text",
		hasTableName: true,
		declaration: function() {
			return "text";
		},
		resolveLength: function(parameter) {
			const value = parameter.value;
			if (value != null) return value.length;
			else return -1;
		},
		generateTypeInfo(parameter, _options) {
			const buffer = Buffer.alloc(10);
			buffer.writeUInt8(this.id, 0);
			buffer.writeInt32LE(parameter.length, 1);
			if (parameter.collation) parameter.collation.toBuffer().copy(buffer, 5, 0, 5);
			return buffer;
		},
		generateParameterLength(parameter, options) {
			const value = parameter.value;
			if (value == null) return NULL_LENGTH;
			const buffer = Buffer.alloc(4);
			buffer.writeInt32LE(value.length, 0);
			return buffer;
		},
		generateParameterData: function* (parameter, options) {
			const value = parameter.value;
			if (value == null) return;
			yield value;
		},
		validate: function(value, collation) {
			if (value == null) return null;
			if (typeof value !== "string") throw new TypeError("Invalid string.");
			if (!collation) throw new Error("No collation was set by the server for the current connection.");
			if (!collation.codepage) throw new Error("The collation set by the server has no associated encoding.");
			return _iconvLite.default.encode(value, collation.codepage);
		}
	};
	exports.default = Text;
	module.exports = Text;
}));
//#endregion
//#region node_modules/tedious/lib/guid-parser.js
var require_guid_parser = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.bufferToLowerCaseGuid = bufferToLowerCaseGuid;
	exports.bufferToUpperCaseGuid = bufferToUpperCaseGuid;
	exports.guidToArray = guidToArray;
	var UPPER_CASE_MAP = [
		"00",
		"01",
		"02",
		"03",
		"04",
		"05",
		"06",
		"07",
		"08",
		"09",
		"0A",
		"0B",
		"0C",
		"0D",
		"0E",
		"0F",
		"10",
		"11",
		"12",
		"13",
		"14",
		"15",
		"16",
		"17",
		"18",
		"19",
		"1A",
		"1B",
		"1C",
		"1D",
		"1E",
		"1F",
		"20",
		"21",
		"22",
		"23",
		"24",
		"25",
		"26",
		"27",
		"28",
		"29",
		"2A",
		"2B",
		"2C",
		"2D",
		"2E",
		"2F",
		"30",
		"31",
		"32",
		"33",
		"34",
		"35",
		"36",
		"37",
		"38",
		"39",
		"3A",
		"3B",
		"3C",
		"3D",
		"3E",
		"3F",
		"40",
		"41",
		"42",
		"43",
		"44",
		"45",
		"46",
		"47",
		"48",
		"49",
		"4A",
		"4B",
		"4C",
		"4D",
		"4E",
		"4F",
		"50",
		"51",
		"52",
		"53",
		"54",
		"55",
		"56",
		"57",
		"58",
		"59",
		"5A",
		"5B",
		"5C",
		"5D",
		"5E",
		"5F",
		"60",
		"61",
		"62",
		"63",
		"64",
		"65",
		"66",
		"67",
		"68",
		"69",
		"6A",
		"6B",
		"6C",
		"6D",
		"6E",
		"6F",
		"70",
		"71",
		"72",
		"73",
		"74",
		"75",
		"76",
		"77",
		"78",
		"79",
		"7A",
		"7B",
		"7C",
		"7D",
		"7E",
		"7F",
		"80",
		"81",
		"82",
		"83",
		"84",
		"85",
		"86",
		"87",
		"88",
		"89",
		"8A",
		"8B",
		"8C",
		"8D",
		"8E",
		"8F",
		"90",
		"91",
		"92",
		"93",
		"94",
		"95",
		"96",
		"97",
		"98",
		"99",
		"9A",
		"9B",
		"9C",
		"9D",
		"9E",
		"9F",
		"A0",
		"A1",
		"A2",
		"A3",
		"A4",
		"A5",
		"A6",
		"A7",
		"A8",
		"A9",
		"AA",
		"AB",
		"AC",
		"AD",
		"AE",
		"AF",
		"B0",
		"B1",
		"B2",
		"B3",
		"B4",
		"B5",
		"B6",
		"B7",
		"B8",
		"B9",
		"BA",
		"BB",
		"BC",
		"BD",
		"BE",
		"BF",
		"C0",
		"C1",
		"C2",
		"C3",
		"C4",
		"C5",
		"C6",
		"C7",
		"C8",
		"C9",
		"CA",
		"CB",
		"CC",
		"CD",
		"CE",
		"CF",
		"D0",
		"D1",
		"D2",
		"D3",
		"D4",
		"D5",
		"D6",
		"D7",
		"D8",
		"D9",
		"DA",
		"DB",
		"DC",
		"DD",
		"DE",
		"DF",
		"E0",
		"E1",
		"E2",
		"E3",
		"E4",
		"E5",
		"E6",
		"E7",
		"E8",
		"E9",
		"EA",
		"EB",
		"EC",
		"ED",
		"EE",
		"EF",
		"F0",
		"F1",
		"F2",
		"F3",
		"F4",
		"F5",
		"F6",
		"F7",
		"F8",
		"F9",
		"FA",
		"FB",
		"FC",
		"FD",
		"FE",
		"FF"
	];
	var LOWER_CASE_MAP = [
		"00",
		"01",
		"02",
		"03",
		"04",
		"05",
		"06",
		"07",
		"08",
		"09",
		"0a",
		"0b",
		"0c",
		"0d",
		"0e",
		"0f",
		"10",
		"11",
		"12",
		"13",
		"14",
		"15",
		"16",
		"17",
		"18",
		"19",
		"1a",
		"1b",
		"1c",
		"1d",
		"1e",
		"1f",
		"20",
		"21",
		"22",
		"23",
		"24",
		"25",
		"26",
		"27",
		"28",
		"29",
		"2a",
		"2b",
		"2c",
		"2d",
		"2e",
		"2f",
		"30",
		"31",
		"32",
		"33",
		"34",
		"35",
		"36",
		"37",
		"38",
		"39",
		"3a",
		"3b",
		"3c",
		"3d",
		"3e",
		"3f",
		"40",
		"41",
		"42",
		"43",
		"44",
		"45",
		"46",
		"47",
		"48",
		"49",
		"4a",
		"4b",
		"4c",
		"4d",
		"4e",
		"4f",
		"50",
		"51",
		"52",
		"53",
		"54",
		"55",
		"56",
		"57",
		"58",
		"59",
		"5a",
		"5b",
		"5c",
		"5d",
		"5e",
		"5f",
		"60",
		"61",
		"62",
		"63",
		"64",
		"65",
		"66",
		"67",
		"68",
		"69",
		"6a",
		"6b",
		"6c",
		"6d",
		"6e",
		"6f",
		"70",
		"71",
		"72",
		"73",
		"74",
		"75",
		"76",
		"77",
		"78",
		"79",
		"7a",
		"7b",
		"7c",
		"7d",
		"7e",
		"7f",
		"80",
		"81",
		"82",
		"83",
		"84",
		"85",
		"86",
		"87",
		"88",
		"89",
		"8a",
		"8b",
		"8c",
		"8d",
		"8e",
		"8f",
		"90",
		"91",
		"92",
		"93",
		"94",
		"95",
		"96",
		"97",
		"98",
		"99",
		"9a",
		"9b",
		"9c",
		"9d",
		"9e",
		"9f",
		"a0",
		"a1",
		"a2",
		"a3",
		"a4",
		"a5",
		"a6",
		"a7",
		"a8",
		"a9",
		"aa",
		"ab",
		"ac",
		"ad",
		"ae",
		"af",
		"b0",
		"b1",
		"b2",
		"b3",
		"b4",
		"b5",
		"b6",
		"b7",
		"b8",
		"b9",
		"ba",
		"bb",
		"bc",
		"bd",
		"be",
		"bf",
		"c0",
		"c1",
		"c2",
		"c3",
		"c4",
		"c5",
		"c6",
		"c7",
		"c8",
		"c9",
		"ca",
		"cb",
		"cc",
		"cd",
		"ce",
		"cf",
		"d0",
		"d1",
		"d2",
		"d3",
		"d4",
		"d5",
		"d6",
		"d7",
		"d8",
		"d9",
		"da",
		"db",
		"dc",
		"dd",
		"de",
		"df",
		"e0",
		"e1",
		"e2",
		"e3",
		"e4",
		"e5",
		"e6",
		"e7",
		"e8",
		"e9",
		"ea",
		"eb",
		"ec",
		"ed",
		"ee",
		"ef",
		"f0",
		"f1",
		"f2",
		"f3",
		"f4",
		"f5",
		"f6",
		"f7",
		"f8",
		"f9",
		"fa",
		"fb",
		"fc",
		"fd",
		"fe",
		"ff"
	];
	function bufferToUpperCaseGuid(buffer) {
		return UPPER_CASE_MAP[buffer[3]] + UPPER_CASE_MAP[buffer[2]] + UPPER_CASE_MAP[buffer[1]] + UPPER_CASE_MAP[buffer[0]] + "-" + UPPER_CASE_MAP[buffer[5]] + UPPER_CASE_MAP[buffer[4]] + "-" + UPPER_CASE_MAP[buffer[7]] + UPPER_CASE_MAP[buffer[6]] + "-" + UPPER_CASE_MAP[buffer[8]] + UPPER_CASE_MAP[buffer[9]] + "-" + UPPER_CASE_MAP[buffer[10]] + UPPER_CASE_MAP[buffer[11]] + UPPER_CASE_MAP[buffer[12]] + UPPER_CASE_MAP[buffer[13]] + UPPER_CASE_MAP[buffer[14]] + UPPER_CASE_MAP[buffer[15]];
	}
	function bufferToLowerCaseGuid(buffer) {
		return LOWER_CASE_MAP[buffer[3]] + LOWER_CASE_MAP[buffer[2]] + LOWER_CASE_MAP[buffer[1]] + LOWER_CASE_MAP[buffer[0]] + "-" + LOWER_CASE_MAP[buffer[5]] + LOWER_CASE_MAP[buffer[4]] + "-" + LOWER_CASE_MAP[buffer[7]] + LOWER_CASE_MAP[buffer[6]] + "-" + LOWER_CASE_MAP[buffer[8]] + LOWER_CASE_MAP[buffer[9]] + "-" + LOWER_CASE_MAP[buffer[10]] + LOWER_CASE_MAP[buffer[11]] + LOWER_CASE_MAP[buffer[12]] + LOWER_CASE_MAP[buffer[13]] + LOWER_CASE_MAP[buffer[14]] + LOWER_CASE_MAP[buffer[15]];
	}
	var CHARCODEMAP = {};
	var hexDigits = [
		"0",
		"1",
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"8",
		"9",
		"a",
		"b",
		"c",
		"d",
		"e",
		"f",
		"A",
		"B",
		"C",
		"D",
		"E",
		"F"
	].map((d) => d.charCodeAt(0));
	for (let i = 0; i < hexDigits.length; i++) {
		const map = CHARCODEMAP[hexDigits[i]] = {};
		for (let j = 0; j < hexDigits.length; j++) {
			const hex = String.fromCharCode(hexDigits[i], hexDigits[j]);
			const value = parseInt(hex, 16);
			map[hexDigits[j]] = value;
		}
	}
	function guidToArray(guid) {
		return [
			CHARCODEMAP[guid.charCodeAt(6)][guid.charCodeAt(7)],
			CHARCODEMAP[guid.charCodeAt(4)][guid.charCodeAt(5)],
			CHARCODEMAP[guid.charCodeAt(2)][guid.charCodeAt(3)],
			CHARCODEMAP[guid.charCodeAt(0)][guid.charCodeAt(1)],
			CHARCODEMAP[guid.charCodeAt(11)][guid.charCodeAt(12)],
			CHARCODEMAP[guid.charCodeAt(9)][guid.charCodeAt(10)],
			CHARCODEMAP[guid.charCodeAt(16)][guid.charCodeAt(17)],
			CHARCODEMAP[guid.charCodeAt(14)][guid.charCodeAt(15)],
			CHARCODEMAP[guid.charCodeAt(19)][guid.charCodeAt(20)],
			CHARCODEMAP[guid.charCodeAt(21)][guid.charCodeAt(22)],
			CHARCODEMAP[guid.charCodeAt(24)][guid.charCodeAt(25)],
			CHARCODEMAP[guid.charCodeAt(26)][guid.charCodeAt(27)],
			CHARCODEMAP[guid.charCodeAt(28)][guid.charCodeAt(29)],
			CHARCODEMAP[guid.charCodeAt(30)][guid.charCodeAt(31)],
			CHARCODEMAP[guid.charCodeAt(32)][guid.charCodeAt(33)],
			CHARCODEMAP[guid.charCodeAt(34)][guid.charCodeAt(35)]
		];
	}
}));
//#endregion
//#region node_modules/tedious/lib/data-types/uniqueidentifier.js
var require_uniqueidentifier = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _guidParser = require_guid_parser();
	var NULL_LENGTH = Buffer.from([0]);
	var DATA_LENGTH = Buffer.from([16]);
	var UniqueIdentifier = {
		id: 36,
		type: "GUIDN",
		name: "UniqueIdentifier",
		declaration: function() {
			return "uniqueidentifier";
		},
		resolveLength: function() {
			return 16;
		},
		generateTypeInfo() {
			return Buffer.from([this.id, 16]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		generateParameterData: function* (parameter, options) {
			if (parameter.value == null) return;
			yield Buffer.from((0, _guidParser.guidToArray)(parameter.value));
		},
		validate: function(value) {
			if (value == null) return null;
			if (typeof value !== "string") throw new TypeError("Invalid string.");
			if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new TypeError("Invalid GUID.");
			return value;
		}
	};
	exports.default = UniqueIdentifier;
	module.exports = UniqueIdentifier;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/ntext.js
var require_ntext = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var NULL_LENGTH = Buffer.from([
		255,
		255,
		255,
		255
	]);
	var NText = {
		id: 99,
		type: "NTEXT",
		name: "NText",
		hasTableName: true,
		declaration: function() {
			return "ntext";
		},
		resolveLength: function(parameter) {
			const value = parameter.value;
			if (value != null) return value.length;
			else return -1;
		},
		generateTypeInfo(parameter, _options) {
			const buffer = Buffer.alloc(10);
			buffer.writeUInt8(this.id, 0);
			buffer.writeInt32LE(parameter.length, 1);
			if (parameter.collation) parameter.collation.toBuffer().copy(buffer, 5, 0, 5);
			return buffer;
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			const buffer = Buffer.alloc(4);
			buffer.writeInt32LE(Buffer.byteLength(parameter.value, "ucs2"), 0);
			return buffer;
		},
		generateParameterData: function* (parameter, options) {
			if (parameter.value == null) return;
			yield Buffer.from(parameter.value.toString(), "ucs2");
		},
		validate: function(value) {
			if (value == null) return null;
			if (typeof value !== "string") throw new TypeError("Invalid string.");
			return value;
		}
	};
	exports.default = NText;
	module.exports = NText;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/varbinary.js
var require_varbinary = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var MAX = 65535;
	var UNKNOWN_PLP_LEN = Buffer.from([
		254,
		255,
		255,
		255,
		255,
		255,
		255,
		255
	]);
	var PLP_TERMINATOR = Buffer.from([
		0,
		0,
		0,
		0
	]);
	var NULL_LENGTH = Buffer.from([255, 255]);
	var MAX_NULL_LENGTH = Buffer.from([
		255,
		255,
		255,
		255,
		255,
		255,
		255,
		255
	]);
	var VarBinary = {
		id: 165,
		type: "BIGVARBIN",
		name: "VarBinary",
		maximumLength: 8e3,
		declaration: function(parameter) {
			const value = parameter.value;
			let length;
			if (parameter.length) length = parameter.length;
			else if (value != null) length = value.length || 1;
			else if (value === null && !parameter.output) length = 1;
			else length = this.maximumLength;
			if (length <= this.maximumLength) return "varbinary(" + length + ")";
			else return "varbinary(max)";
		},
		resolveLength: function(parameter) {
			const value = parameter.value;
			if (parameter.length != null) return parameter.length;
			else if (value != null) return value.length;
			else return this.maximumLength;
		},
		generateTypeInfo: function(parameter) {
			const buffer = Buffer.alloc(3);
			buffer.writeUInt8(this.id, 0);
			if (parameter.length <= this.maximumLength) buffer.writeUInt16LE(parameter.length, 1);
			else buffer.writeUInt16LE(MAX, 1);
			return buffer;
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) if (parameter.length <= this.maximumLength) return NULL_LENGTH;
			else return MAX_NULL_LENGTH;
			let value = parameter.value;
			if (!Buffer.isBuffer(value)) value = value.toString();
			const length = Buffer.byteLength(value, "ucs2");
			if (parameter.length <= this.maximumLength) {
				const buffer = Buffer.alloc(2);
				buffer.writeUInt16LE(length, 0);
				return buffer;
			} else return UNKNOWN_PLP_LEN;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			let value = parameter.value;
			if (parameter.length <= this.maximumLength) if (Buffer.isBuffer(value)) yield value;
			else yield Buffer.from(value.toString(), "ucs2");
			else {
				if (!Buffer.isBuffer(value)) value = value.toString();
				const length = Buffer.byteLength(value, "ucs2");
				if (length > 0) {
					const buffer = Buffer.alloc(4);
					buffer.writeUInt32LE(length, 0);
					yield buffer;
					if (Buffer.isBuffer(value)) yield value;
					else yield Buffer.from(value, "ucs2");
				}
				yield PLP_TERMINATOR;
			}
		},
		validate: function(value) {
			if (value == null) return null;
			if (!Buffer.isBuffer(value)) throw new TypeError("Invalid buffer.");
			return value;
		}
	};
	exports.default = VarBinary;
	module.exports = VarBinary;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/varchar.js
var require_varchar = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _iconvLite = _interopRequireDefault(require_lib$1());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var MAX = 65535;
	var UNKNOWN_PLP_LEN = Buffer.from([
		254,
		255,
		255,
		255,
		255,
		255,
		255,
		255
	]);
	var PLP_TERMINATOR = Buffer.from([
		0,
		0,
		0,
		0
	]);
	var NULL_LENGTH = Buffer.from([255, 255]);
	var MAX_NULL_LENGTH = Buffer.from([
		255,
		255,
		255,
		255,
		255,
		255,
		255,
		255
	]);
	var VarChar = {
		id: 167,
		type: "BIGVARCHR",
		name: "VarChar",
		maximumLength: 8e3,
		declaration: function(parameter) {
			const value = parameter.value;
			let length;
			if (parameter.length) length = parameter.length;
			else if (value != null) length = value.length || 1;
			else if (value === null && !parameter.output) length = 1;
			else length = this.maximumLength;
			if (length <= this.maximumLength) return "varchar(" + length + ")";
			else return "varchar(max)";
		},
		resolveLength: function(parameter) {
			const value = parameter.value;
			if (parameter.length != null) return parameter.length;
			else if (value != null) return value.length || 1;
			else return this.maximumLength;
		},
		generateTypeInfo(parameter) {
			const buffer = Buffer.alloc(8);
			buffer.writeUInt8(this.id, 0);
			if (parameter.length <= this.maximumLength) buffer.writeUInt16LE(parameter.length, 1);
			else buffer.writeUInt16LE(MAX, 1);
			if (parameter.collation) parameter.collation.toBuffer().copy(buffer, 3, 0, 5);
			return buffer;
		},
		generateParameterLength(parameter, options) {
			const value = parameter.value;
			if (value == null) if (parameter.length <= this.maximumLength) return NULL_LENGTH;
			else return MAX_NULL_LENGTH;
			if (parameter.length <= this.maximumLength) {
				const buffer = Buffer.alloc(2);
				buffer.writeUInt16LE(value.length, 0);
				return buffer;
			} else return UNKNOWN_PLP_LEN;
		},
		*generateParameterData(parameter, options) {
			const value = parameter.value;
			if (value == null) return;
			if (parameter.length <= this.maximumLength) yield value;
			else {
				if (value.length > 0) {
					const buffer = Buffer.alloc(4);
					buffer.writeUInt32LE(value.length, 0);
					yield buffer;
					yield value;
				}
				yield PLP_TERMINATOR;
			}
		},
		validate: function(value, collation) {
			if (value == null) return null;
			if (typeof value !== "string") throw new TypeError("Invalid string.");
			if (!collation) throw new Error("No collation was set by the server for the current connection.");
			if (!collation.codepage) throw new Error("The collation set by the server has no associated encoding.");
			return _iconvLite.default.encode(value, collation.codepage);
		}
	};
	exports.default = VarChar;
	module.exports = VarChar;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/binary.js
var require_binary = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var NULL_LENGTH = Buffer.from([255, 255]);
	var Binary = {
		id: 173,
		type: "BIGBinary",
		name: "Binary",
		maximumLength: 8e3,
		declaration: function(parameter) {
			const value = parameter.value;
			let length;
			if (parameter.length) length = parameter.length;
			else if (value != null) length = value.length || 1;
			else if (value === null && !parameter.output) length = 1;
			else length = this.maximumLength;
			return "binary(" + length + ")";
		},
		resolveLength: function(parameter) {
			const value = parameter.value;
			if (value != null) return value.length;
			else return this.maximumLength;
		},
		generateTypeInfo(parameter) {
			const buffer = Buffer.alloc(3);
			buffer.writeUInt8(this.id, 0);
			buffer.writeUInt16LE(parameter.length, 1);
			return buffer;
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			const buffer = Buffer.alloc(2);
			buffer.writeUInt16LE(parameter.length, 0);
			return buffer;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			yield parameter.value.slice(0, parameter.length !== void 0 ? Math.min(parameter.length, this.maximumLength) : this.maximumLength);
		},
		validate: function(value) {
			if (value == null) return null;
			if (!Buffer.isBuffer(value)) throw new TypeError("Invalid buffer.");
			return value;
		}
	};
	exports.default = Binary;
	module.exports = Binary;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/char.js
var require_char = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _iconvLite = _interopRequireDefault(require_lib$1());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NULL_LENGTH = Buffer.from([255, 255]);
	var Char = {
		id: 175,
		type: "BIGCHAR",
		name: "Char",
		maximumLength: 8e3,
		declaration: function(parameter) {
			const value = parameter.value;
			let length;
			if (parameter.length) length = parameter.length;
			else if (value != null) length = value.length || 1;
			else if (value === null && !parameter.output) length = 1;
			else length = this.maximumLength;
			if (length < this.maximumLength) return "char(" + length + ")";
			else return "char(" + this.maximumLength + ")";
		},
		resolveLength: function(parameter) {
			const value = parameter.value;
			if (parameter.length != null) return parameter.length;
			else if (value != null) return value.length || 1;
			else return this.maximumLength;
		},
		generateTypeInfo(parameter) {
			const buffer = Buffer.alloc(8);
			buffer.writeUInt8(this.id, 0);
			buffer.writeUInt16LE(parameter.length, 1);
			if (parameter.collation) parameter.collation.toBuffer().copy(buffer, 3, 0, 5);
			return buffer;
		},
		generateParameterLength(parameter, options) {
			const value = parameter.value;
			if (value == null) return NULL_LENGTH;
			const buffer = Buffer.alloc(2);
			buffer.writeUInt16LE(value.length, 0);
			return buffer;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			yield Buffer.from(parameter.value, "ascii");
		},
		validate: function(value, collation) {
			if (value == null) return null;
			if (typeof value !== "string") throw new TypeError("Invalid string.");
			if (!collation) throw new Error("No collation was set by the server for the current connection.");
			if (!collation.codepage) throw new Error("The collation set by the server has no associated encoding.");
			return _iconvLite.default.encode(value, collation.codepage);
		}
	};
	exports.default = Char;
	module.exports = Char;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/nvarchar.js
var require_nvarchar = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var MAX = 65535;
	var UNKNOWN_PLP_LEN = Buffer.from([
		254,
		255,
		255,
		255,
		255,
		255,
		255,
		255
	]);
	var PLP_TERMINATOR = Buffer.from([
		0,
		0,
		0,
		0
	]);
	var NULL_LENGTH = Buffer.from([255, 255]);
	var MAX_NULL_LENGTH = Buffer.from([
		255,
		255,
		255,
		255,
		255,
		255,
		255,
		255
	]);
	var NVarChar = {
		id: 231,
		type: "NVARCHAR",
		name: "NVarChar",
		maximumLength: 4e3,
		declaration: function(parameter) {
			const value = parameter.value;
			let length;
			if (parameter.length) length = parameter.length;
			else if (value != null) length = value.toString().length || 1;
			else if (value === null && !parameter.output) length = 1;
			else length = this.maximumLength;
			if (length <= this.maximumLength) return "nvarchar(" + length + ")";
			else return "nvarchar(max)";
		},
		resolveLength: function(parameter) {
			const value = parameter.value;
			if (parameter.length != null) return parameter.length;
			else if (value != null) if (Buffer.isBuffer(value)) return value.length / 2 || 1;
			else return value.toString().length || 1;
			else return this.maximumLength;
		},
		generateTypeInfo(parameter) {
			const buffer = Buffer.alloc(8);
			buffer.writeUInt8(this.id, 0);
			if (parameter.length <= this.maximumLength) buffer.writeUInt16LE(parameter.length * 2, 1);
			else buffer.writeUInt16LE(MAX, 1);
			if (parameter.collation) parameter.collation.toBuffer().copy(buffer, 3, 0, 5);
			return buffer;
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) if (parameter.length <= this.maximumLength) return NULL_LENGTH;
			else return MAX_NULL_LENGTH;
			let value = parameter.value;
			if (parameter.length <= this.maximumLength) {
				let length;
				if (value instanceof Buffer) length = value.length;
				else {
					value = value.toString();
					length = Buffer.byteLength(value, "ucs2");
				}
				const buffer = Buffer.alloc(2);
				buffer.writeUInt16LE(length, 0);
				return buffer;
			} else return UNKNOWN_PLP_LEN;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			let value = parameter.value;
			if (parameter.length <= this.maximumLength) if (value instanceof Buffer) yield value;
			else {
				value = value.toString();
				yield Buffer.from(value, "ucs2");
			}
			else {
				if (value instanceof Buffer) {
					const length = value.length;
					if (length > 0) {
						const buffer = Buffer.alloc(4);
						buffer.writeUInt32LE(length, 0);
						yield buffer;
						yield value;
					}
				} else {
					value = value.toString();
					const length = Buffer.byteLength(value, "ucs2");
					if (length > 0) {
						const buffer = Buffer.alloc(4);
						buffer.writeUInt32LE(length, 0);
						yield buffer;
						yield Buffer.from(value, "ucs2");
					}
				}
				yield PLP_TERMINATOR;
			}
		},
		validate: function(value) {
			if (value == null) return null;
			if (typeof value !== "string") throw new TypeError("Invalid string.");
			return value;
		}
	};
	exports.default = NVarChar;
	module.exports = NVarChar;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/nchar.js
var require_nchar = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var NULL_LENGTH = Buffer.from([255, 255]);
	var NChar = {
		id: 239,
		type: "NCHAR",
		name: "NChar",
		maximumLength: 4e3,
		declaration: function(parameter) {
			const value = parameter.value;
			let length;
			if (parameter.length) length = parameter.length;
			else if (parameter.value != null) length = value.toString().length || 1;
			else if (parameter.value === null && !parameter.output) length = 1;
			else length = this.maximumLength;
			if (length < this.maximumLength) return "nchar(" + length + ")";
			else return "nchar(" + this.maximumLength + ")";
		},
		resolveLength: function(parameter) {
			const value = parameter.value;
			if (parameter.length != null) return parameter.length;
			else if (parameter.value != null) if (Buffer.isBuffer(parameter.value)) return parameter.value.length / 2 || 1;
			else return value.toString().length || 1;
			else return this.maximumLength;
		},
		generateTypeInfo: function(parameter) {
			const buffer = Buffer.alloc(8);
			buffer.writeUInt8(this.id, 0);
			buffer.writeUInt16LE(parameter.length * 2, 1);
			if (parameter.collation) parameter.collation.toBuffer().copy(buffer, 3, 0, 5);
			return buffer;
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			const { value } = parameter;
			if (value instanceof Buffer) {
				const length = value.length;
				const buffer = Buffer.alloc(2);
				buffer.writeUInt16LE(length, 0);
				return buffer;
			} else {
				const length = Buffer.byteLength(value.toString(), "ucs2");
				const buffer = Buffer.alloc(2);
				buffer.writeUInt16LE(length, 0);
				return buffer;
			}
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const value = parameter.value;
			if (value instanceof Buffer) yield value;
			else yield Buffer.from(value, "ucs2");
		},
		validate: function(value) {
			if (value == null) return null;
			if (typeof value !== "string") throw new TypeError("Invalid string.");
			return value;
		}
	};
	exports.default = NChar;
	module.exports = NChar;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/xml.js
var require_xml = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var XML = {
		id: 241,
		type: "XML",
		name: "Xml",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = XML;
	module.exports = XML;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/time.js
var require_time = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NULL_LENGTH = Buffer.from([0]);
	var Time = {
		id: 41,
		type: "TIMEN",
		name: "Time",
		declaration: function(parameter) {
			return "time(" + this.resolveScale(parameter) + ")";
		},
		resolveScale: function(parameter) {
			if (parameter.scale != null) return parameter.scale;
			else if (parameter.value === null) return 0;
			else return 7;
		},
		generateTypeInfo(parameter) {
			return Buffer.from([this.id, parameter.scale]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			switch (parameter.scale) {
				case 0:
				case 1:
				case 2: return Buffer.from([3]);
				case 3:
				case 4: return Buffer.from([4]);
				case 5:
				case 6:
				case 7: return Buffer.from([5]);
				default: throw new Error("invalid scale");
			}
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const buffer = new _writableTrackingBuffer.default(16);
			const time = parameter.value;
			let timestamp;
			if (options.useUTC) timestamp = ((time.getUTCHours() * 60 + time.getUTCMinutes()) * 60 + time.getUTCSeconds()) * 1e3 + time.getUTCMilliseconds();
			else timestamp = ((time.getHours() * 60 + time.getMinutes()) * 60 + time.getSeconds()) * 1e3 + time.getMilliseconds();
			timestamp = timestamp * Math.pow(10, parameter.scale - 3);
			timestamp += (parameter.value.nanosecondDelta != null ? parameter.value.nanosecondDelta : 0) * Math.pow(10, parameter.scale);
			timestamp = Math.round(timestamp);
			switch (parameter.scale) {
				case 0:
				case 1:
				case 2:
					buffer.writeUInt24LE(timestamp);
					break;
				case 3:
				case 4:
					buffer.writeUInt32LE(timestamp);
					break;
				case 5:
				case 6:
				case 7: buffer.writeUInt40LE(timestamp);
			}
			yield buffer.data;
		},
		validate: function(value) {
			if (value == null) return null;
			if (!(value instanceof Date)) value = new Date(Date.parse(value));
			if (isNaN(value)) throw new TypeError("Invalid time.");
			return value;
		}
	};
	exports.default = Time;
	module.exports = Time;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/date.js
var require_date = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _core = (init_js_joda_esm(), __toCommonJS(js_joda_esm_exports));
	var globalDate = global.Date;
	var EPOCH_DATE = _core.LocalDate.ofYearDay(1, 1);
	var NULL_LENGTH = Buffer.from([0]);
	var DATA_LENGTH = Buffer.from([3]);
	var Date = {
		id: 40,
		type: "DATEN",
		name: "Date",
		declaration: function() {
			return "date";
		},
		generateTypeInfo: function() {
			return Buffer.from([this.id]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			return DATA_LENGTH;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const value = parameter.value;
			let date;
			if (options.useUTC) date = _core.LocalDate.of(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
			else date = _core.LocalDate.of(value.getFullYear(), value.getMonth() + 1, value.getDate());
			const days = EPOCH_DATE.until(date, _core.ChronoUnit.DAYS);
			const buffer = Buffer.alloc(3);
			buffer.writeUIntLE(days, 0, 3);
			yield buffer;
		},
		validate: function(value, collation, options) {
			if (value == null) return null;
			if (!(value instanceof globalDate)) value = new globalDate(globalDate.parse(value));
			value = value;
			let year;
			if (options && options.useUTC) year = value.getUTCFullYear();
			else year = value.getFullYear();
			if (year < 1 || year > 9999) throw new TypeError("Out of range.");
			if (isNaN(value)) throw new TypeError("Invalid date.");
			return value;
		}
	};
	exports.default = Date;
	module.exports = Date;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/datetime2.js
var require_datetime2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _core = (init_js_joda_esm(), __toCommonJS(js_joda_esm_exports));
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var EPOCH_DATE = _core.LocalDate.ofYearDay(1, 1);
	var NULL_LENGTH = Buffer.from([0]);
	var DateTime2 = {
		id: 42,
		type: "DATETIME2N",
		name: "DateTime2",
		declaration: function(parameter) {
			return "datetime2(" + this.resolveScale(parameter) + ")";
		},
		resolveScale: function(parameter) {
			if (parameter.scale != null) return parameter.scale;
			else if (parameter.value === null) return 0;
			else return 7;
		},
		generateTypeInfo(parameter, _options) {
			return Buffer.from([this.id, parameter.scale]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			switch (parameter.scale) {
				case 0:
				case 1:
				case 2: return Buffer.from([6]);
				case 3:
				case 4: return Buffer.from([7]);
				case 5:
				case 6:
				case 7: return Buffer.from([8]);
				default: throw new Error("invalid scale");
			}
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const value = parameter.value;
			let scale = parameter.scale;
			const buffer = new _writableTrackingBuffer.default(16);
			scale = scale;
			let timestamp;
			if (options.useUTC) timestamp = ((value.getUTCHours() * 60 + value.getUTCMinutes()) * 60 + value.getUTCSeconds()) * 1e3 + value.getUTCMilliseconds();
			else timestamp = ((value.getHours() * 60 + value.getMinutes()) * 60 + value.getSeconds()) * 1e3 + value.getMilliseconds();
			timestamp = timestamp * Math.pow(10, scale - 3);
			timestamp += (value.nanosecondDelta != null ? value.nanosecondDelta : 0) * Math.pow(10, scale);
			timestamp = Math.round(timestamp);
			switch (scale) {
				case 0:
				case 1:
				case 2:
					buffer.writeUInt24LE(timestamp);
					break;
				case 3:
				case 4:
					buffer.writeUInt32LE(timestamp);
					break;
				case 5:
				case 6:
				case 7: buffer.writeUInt40LE(timestamp);
			}
			let date;
			if (options.useUTC) date = _core.LocalDate.of(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
			else date = _core.LocalDate.of(value.getFullYear(), value.getMonth() + 1, value.getDate());
			const days = EPOCH_DATE.until(date, _core.ChronoUnit.DAYS);
			buffer.writeUInt24LE(days);
			yield buffer.data;
		},
		validate: function(value, collation, options) {
			if (value == null) return null;
			if (!(value instanceof Date)) value = new Date(Date.parse(value));
			value = value;
			let year;
			if (options && options.useUTC) year = value.getUTCFullYear();
			else year = value.getFullYear();
			if (year < 1 || year > 9999) throw new TypeError("Out of range.");
			if (isNaN(value)) throw new TypeError("Invalid date.");
			return value;
		}
	};
	exports.default = DateTime2;
	module.exports = DateTime2;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/datetimeoffset.js
var require_datetimeoffset = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _core = (init_js_joda_esm(), __toCommonJS(js_joda_esm_exports));
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var EPOCH_DATE = _core.LocalDate.ofYearDay(1, 1);
	var NULL_LENGTH = Buffer.from([0]);
	var DateTimeOffset = {
		id: 43,
		type: "DATETIMEOFFSETN",
		name: "DateTimeOffset",
		declaration: function(parameter) {
			return "datetimeoffset(" + this.resolveScale(parameter) + ")";
		},
		resolveScale: function(parameter) {
			if (parameter.scale != null) return parameter.scale;
			else if (parameter.value === null) return 0;
			else return 7;
		},
		generateTypeInfo(parameter) {
			return Buffer.from([this.id, parameter.scale]);
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			switch (parameter.scale) {
				case 0:
				case 1:
				case 2: return Buffer.from([8]);
				case 3:
				case 4: return Buffer.from([9]);
				case 5:
				case 6:
				case 7: return Buffer.from([10]);
				default: throw new Error("invalid scale");
			}
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) return;
			const value = parameter.value;
			let scale = parameter.scale;
			const buffer = new _writableTrackingBuffer.default(16);
			scale = scale;
			let timestamp;
			timestamp = ((value.getUTCHours() * 60 + value.getUTCMinutes()) * 60 + value.getUTCSeconds()) * 1e3 + value.getMilliseconds();
			timestamp = timestamp * Math.pow(10, scale - 3);
			timestamp += (value.nanosecondDelta != null ? value.nanosecondDelta : 0) * Math.pow(10, scale);
			timestamp = Math.round(timestamp);
			switch (scale) {
				case 0:
				case 1:
				case 2:
					buffer.writeUInt24LE(timestamp);
					break;
				case 3:
				case 4:
					buffer.writeUInt32LE(timestamp);
					break;
				case 5:
				case 6:
				case 7: buffer.writeUInt40LE(timestamp);
			}
			const date = _core.LocalDate.of(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
			const days = EPOCH_DATE.until(date, _core.ChronoUnit.DAYS);
			buffer.writeUInt24LE(days);
			const offset = -value.getTimezoneOffset();
			buffer.writeInt16LE(offset);
			yield buffer.data;
		},
		validate: function(value, collation, options) {
			if (value == null) return null;
			if (!(value instanceof Date)) value = new Date(Date.parse(value));
			value = value;
			let year;
			if (options && options.useUTC) year = value.getUTCFullYear();
			else year = value.getFullYear();
			if (year < 1 || year > 9999) throw new TypeError("Out of range.");
			if (isNaN(value)) throw new TypeError("Invalid date.");
			return value;
		}
	};
	exports.default = DateTimeOffset;
	module.exports = DateTimeOffset;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/udt.js
var require_udt$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var UDT = {
		id: 240,
		type: "UDTTYPE",
		name: "UDT",
		declaration() {
			throw new Error("not implemented");
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = UDT;
	module.exports = UDT;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/tvp.js
var require_tvp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _errors = require_errors();
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var TVP_ROW_TOKEN = Buffer.from([1]);
	var TVP_END_TOKEN = Buffer.from([0]);
	var NULL_LENGTH = Buffer.from([255, 255]);
	var TVP = {
		id: 243,
		type: "TVPTYPE",
		name: "TVP",
		declaration: function(parameter) {
			const value = parameter.value;
			return (value.schema ? value.schema + "." : "") + value.name + " readonly";
		},
		generateTypeInfo(parameter) {
			const databaseName = "";
			const schema = parameter.value?.schema ?? "";
			const typeName = parameter.value?.name ?? "";
			const bufferLength = 2 + Buffer.byteLength(databaseName, "ucs2") + 1 + Buffer.byteLength(schema, "ucs2") + 1 + Buffer.byteLength(typeName, "ucs2");
			const buffer = new _writableTrackingBuffer.default(bufferLength, "ucs2");
			buffer.writeUInt8(this.id);
			buffer.writeBVarchar(databaseName);
			buffer.writeBVarchar(schema);
			buffer.writeBVarchar(typeName);
			return buffer.data;
		},
		generateParameterLength(parameter, options) {
			if (parameter.value == null) return NULL_LENGTH;
			const { columns } = parameter.value;
			const buffer = Buffer.alloc(2);
			buffer.writeUInt16LE(columns.length, 0);
			return buffer;
		},
		*generateParameterData(parameter, options) {
			if (parameter.value == null) {
				yield TVP_END_TOKEN;
				yield TVP_END_TOKEN;
				return;
			}
			const { columns, rows } = parameter.value;
			for (let i = 0, len = columns.length; i < len; i++) {
				const column = columns[i];
				const buff = Buffer.alloc(6);
				buff.writeUInt32LE(0, 0);
				buff.writeUInt16LE(0, 4);
				yield buff;
				yield column.type.generateTypeInfo(column);
				yield Buffer.from([0]);
			}
			yield TVP_END_TOKEN;
			for (let i = 0, length = rows.length; i < length; i++) {
				yield TVP_ROW_TOKEN;
				const row = rows[i];
				for (let k = 0, len2 = row.length; k < len2; k++) {
					const column = columns[k];
					const value = row[k];
					let paramValue;
					try {
						paramValue = column.type.validate(value, parameter.collation);
					} catch (error) {
						throw new _errors.InputError(`TVP column '${column.name}' has invalid data at row index ${i}`, { cause: error });
					}
					const param = {
						value: paramValue,
						length: column.length,
						scale: column.scale,
						precision: column.precision
					};
					yield column.type.generateParameterLength(param, options);
					yield* column.type.generateParameterData(param, options);
				}
			}
			yield TVP_END_TOKEN;
		},
		validate: function(value) {
			if (value == null) return null;
			if (typeof value !== "object") throw new TypeError("Invalid table.");
			if (!Array.isArray(value.columns)) throw new TypeError("Invalid table.");
			if (!Array.isArray(value.rows)) throw new TypeError("Invalid table.");
			return value;
		}
	};
	exports.default = TVP;
	module.exports = TVP;
}));
//#endregion
//#region node_modules/tedious/lib/data-types/sql-variant.js
var require_sql_variant = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var Variant = {
		id: 98,
		type: "SSVARIANTTYPE",
		name: "Variant",
		declaration: function() {
			return "sql_variant";
		},
		generateTypeInfo() {
			throw new Error("not implemented");
		},
		generateParameterLength() {
			throw new Error("not implemented");
		},
		generateParameterData() {
			throw new Error("not implemented");
		},
		validate() {
			throw new Error("not implemented");
		}
	};
	exports.default = Variant;
	module.exports = Variant;
}));
//#endregion
//#region node_modules/tedious/lib/data-type.js
var require_data_type = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.typeByName = exports.TYPES = exports.TYPE = void 0;
	var _null = _interopRequireDefault(require_null());
	var _tinyint = _interopRequireDefault(require_tinyint());
	var _bit = _interopRequireDefault(require_bit());
	var _smallint = _interopRequireDefault(require_smallint());
	var _int = _interopRequireDefault(require_int());
	var _smalldatetime = _interopRequireDefault(require_smalldatetime());
	var _real = _interopRequireDefault(require_real());
	var _money = _interopRequireDefault(require_money());
	var _datetime = _interopRequireDefault(require_datetime());
	var _float = _interopRequireDefault(require_float());
	var _decimal = _interopRequireDefault(require_decimal());
	var _numeric = _interopRequireDefault(require_numeric());
	var _smallmoney = _interopRequireDefault(require_smallmoney());
	var _bigint = _interopRequireDefault(require_bigint());
	var _image = _interopRequireDefault(require_image());
	var _text = _interopRequireDefault(require_text());
	var _uniqueidentifier = _interopRequireDefault(require_uniqueidentifier());
	var _intn = _interopRequireDefault(require_intn());
	var _ntext = _interopRequireDefault(require_ntext());
	var _bitn = _interopRequireDefault(require_bitn());
	var _decimaln = _interopRequireDefault(require_decimaln());
	var _numericn = _interopRequireDefault(require_numericn());
	var _floatn = _interopRequireDefault(require_floatn());
	var _moneyn = _interopRequireDefault(require_moneyn());
	var _datetimen = _interopRequireDefault(require_datetimen());
	var _varbinary = _interopRequireDefault(require_varbinary());
	var _varchar = _interopRequireDefault(require_varchar());
	var _binary = _interopRequireDefault(require_binary());
	var _char = _interopRequireDefault(require_char());
	var _nvarchar = _interopRequireDefault(require_nvarchar());
	var _nchar = _interopRequireDefault(require_nchar());
	var _xml = _interopRequireDefault(require_xml());
	var _time = _interopRequireDefault(require_time());
	var _date = _interopRequireDefault(require_date());
	var _datetime2 = _interopRequireDefault(require_datetime2());
	var _datetimeoffset = _interopRequireDefault(require_datetimeoffset());
	var _udt = _interopRequireDefault(require_udt$1());
	var _tvp = _interopRequireDefault(require_tvp());
	var _sqlVariant = _interopRequireDefault(require_sql_variant());
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	exports.TYPE = {
		[_null.default.id]: _null.default,
		[_tinyint.default.id]: _tinyint.default,
		[_bit.default.id]: _bit.default,
		[_smallint.default.id]: _smallint.default,
		[_int.default.id]: _int.default,
		[_smalldatetime.default.id]: _smalldatetime.default,
		[_real.default.id]: _real.default,
		[_money.default.id]: _money.default,
		[_datetime.default.id]: _datetime.default,
		[_float.default.id]: _float.default,
		[_decimal.default.id]: _decimal.default,
		[_numeric.default.id]: _numeric.default,
		[_smallmoney.default.id]: _smallmoney.default,
		[_bigint.default.id]: _bigint.default,
		[_image.default.id]: _image.default,
		[_text.default.id]: _text.default,
		[_uniqueidentifier.default.id]: _uniqueidentifier.default,
		[_intn.default.id]: _intn.default,
		[_ntext.default.id]: _ntext.default,
		[_bitn.default.id]: _bitn.default,
		[_decimaln.default.id]: _decimaln.default,
		[_numericn.default.id]: _numericn.default,
		[_floatn.default.id]: _floatn.default,
		[_moneyn.default.id]: _moneyn.default,
		[_datetimen.default.id]: _datetimen.default,
		[_varbinary.default.id]: _varbinary.default,
		[_varchar.default.id]: _varchar.default,
		[_binary.default.id]: _binary.default,
		[_char.default.id]: _char.default,
		[_nvarchar.default.id]: _nvarchar.default,
		[_nchar.default.id]: _nchar.default,
		[_xml.default.id]: _xml.default,
		[_time.default.id]: _time.default,
		[_date.default.id]: _date.default,
		[_datetime2.default.id]: _datetime2.default,
		[_datetimeoffset.default.id]: _datetimeoffset.default,
		[_udt.default.id]: _udt.default,
		[_tvp.default.id]: _tvp.default,
		[_sqlVariant.default.id]: _sqlVariant.default
	};
	exports.typeByName = exports.TYPES = {
		TinyInt: _tinyint.default,
		Bit: _bit.default,
		SmallInt: _smallint.default,
		Int: _int.default,
		SmallDateTime: _smalldatetime.default,
		Real: _real.default,
		Money: _money.default,
		DateTime: _datetime.default,
		Float: _float.default,
		Decimal: _decimal.default,
		Numeric: _numeric.default,
		SmallMoney: _smallmoney.default,
		BigInt: _bigint.default,
		Image: _image.default,
		Text: _text.default,
		UniqueIdentifier: _uniqueidentifier.default,
		NText: _ntext.default,
		VarBinary: _varbinary.default,
		VarChar: _varchar.default,
		Binary: _binary.default,
		Char: _char.default,
		NVarChar: _nvarchar.default,
		NChar: _nchar.default,
		Xml: _xml.default,
		Time: _time.default,
		Date: _date.default,
		DateTime2: _datetime2.default,
		DateTimeOffset: _datetimeoffset.default,
		UDT: _udt.default,
		TVP: _tvp.default,
		Variant: _sqlVariant.default
	};
}));
//#endregion
//#region node_modules/tedious/lib/token/helpers.js
var require_helpers = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Result = exports.NotEnoughDataError = void 0;
	exports.readBVarByte = readBVarByte;
	exports.readBVarChar = readBVarChar;
	exports.readBigInt64LE = readBigInt64LE;
	exports.readBigUInt64LE = readBigUInt64LE;
	exports.readDoubleLE = readDoubleLE;
	exports.readFloatLE = readFloatLE;
	exports.readInt16LE = readInt16LE;
	exports.readInt32LE = readInt32LE;
	exports.readUInt16LE = readUInt16LE;
	exports.readUInt24LE = readUInt24LE;
	exports.readUInt32BE = readUInt32BE;
	exports.readUInt32LE = readUInt32LE;
	exports.readUInt40LE = readUInt40LE;
	exports.readUInt8 = readUInt8;
	exports.readUNumeric128LE = readUNumeric128LE;
	exports.readUNumeric64LE = readUNumeric64LE;
	exports.readUNumeric96LE = readUNumeric96LE;
	exports.readUsVarByte = readUsVarByte;
	exports.readUsVarChar = readUsVarChar;
	var Result = class {
		constructor(value, offset) {
			this.value = value;
			this.offset = offset;
		}
	};
	exports.Result = Result;
	var NotEnoughDataError = class extends Error {
		byteCount;
		constructor(byteCount) {
			super();
			this.byteCount = byteCount;
		}
	};
	exports.NotEnoughDataError = NotEnoughDataError;
	function readUInt8(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 1) throw new NotEnoughDataError(offset + 1);
		return new Result(buf.readUInt8(offset), offset + 1);
	}
	function readUInt16LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 2) throw new NotEnoughDataError(offset + 2);
		return new Result(buf.readUInt16LE(offset), offset + 2);
	}
	function readInt16LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 2) throw new NotEnoughDataError(offset + 2);
		return new Result(buf.readInt16LE(offset), offset + 2);
	}
	function readUInt24LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 3) throw new NotEnoughDataError(offset + 3);
		return new Result(buf.readUIntLE(offset, 3), offset + 3);
	}
	function readUInt32LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 4) throw new NotEnoughDataError(offset + 4);
		return new Result(buf.readUInt32LE(offset), offset + 4);
	}
	function readUInt32BE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 4) throw new NotEnoughDataError(offset + 4);
		return new Result(buf.readUInt32BE(offset), offset + 4);
	}
	function readUInt40LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 5) throw new NotEnoughDataError(offset + 5);
		return new Result(buf.readUIntLE(offset, 5), offset + 5);
	}
	function readInt32LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 4) throw new NotEnoughDataError(offset + 4);
		return new Result(buf.readInt32LE(offset), offset + 4);
	}
	function readBigUInt64LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 8) throw new NotEnoughDataError(offset + 8);
		return new Result(buf.readBigUInt64LE(offset), offset + 8);
	}
	function readBigInt64LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 8) throw new NotEnoughDataError(offset + 8);
		return new Result(buf.readBigInt64LE(offset), offset + 8);
	}
	function readFloatLE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 4) throw new NotEnoughDataError(offset + 4);
		return new Result(buf.readFloatLE(offset), offset + 4);
	}
	function readDoubleLE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 8) throw new NotEnoughDataError(offset + 8);
		return new Result(buf.readDoubleLE(offset), offset + 8);
	}
	function readBVarChar(buf, offset) {
		offset = +offset;
		let charCount;
		({offset, value: charCount} = readUInt8(buf, offset));
		const byteLength = charCount * 2;
		if (buf.length < offset + byteLength) throw new NotEnoughDataError(offset + byteLength);
		return new Result(buf.toString("ucs2", offset, offset + byteLength), offset + byteLength);
	}
	function readBVarByte(buf, offset) {
		offset = +offset;
		let byteLength;
		({offset, value: byteLength} = readUInt8(buf, offset));
		if (buf.length < offset + byteLength) throw new NotEnoughDataError(offset + byteLength);
		return new Result(buf.slice(offset, offset + byteLength), offset + byteLength);
	}
	function readUsVarChar(buf, offset) {
		offset = +offset;
		let charCount;
		({offset, value: charCount} = readUInt16LE(buf, offset));
		const byteLength = charCount * 2;
		if (buf.length < offset + byteLength) throw new NotEnoughDataError(offset + byteLength);
		return new Result(buf.toString("ucs2", offset, offset + byteLength), offset + byteLength);
	}
	function readUsVarByte(buf, offset) {
		offset = +offset;
		let byteLength;
		({offset, value: byteLength} = readUInt16LE(buf, offset));
		if (buf.length < offset + byteLength) throw new NotEnoughDataError(offset + byteLength);
		return new Result(buf.slice(offset, offset + byteLength), offset + byteLength);
	}
	function readUNumeric64LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 8) throw new NotEnoughDataError(offset + 8);
		const low = buf.readUInt32LE(offset);
		return new Result(4294967296 * buf.readUInt32LE(offset + 4) + low, offset + 8);
	}
	function readUNumeric96LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 12) throw new NotEnoughDataError(offset + 12);
		const dword1 = buf.readUInt32LE(offset);
		const dword2 = buf.readUInt32LE(offset + 4);
		const dword3 = buf.readUInt32LE(offset + 8);
		return new Result(dword1 + 4294967296 * dword2 + 0x10000000000000000 * dword3, offset + 12);
	}
	function readUNumeric128LE(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 16) throw new NotEnoughDataError(offset + 16);
		const dword1 = buf.readUInt32LE(offset);
		const dword2 = buf.readUInt32LE(offset + 4);
		const dword3 = buf.readUInt32LE(offset + 8);
		const dword4 = buf.readUInt32LE(offset + 12);
		return new Result(dword1 + 4294967296 * dword2 + 0x10000000000000000 * dword3 + 7922816251426434e13 * dword4, offset + 16);
	}
}));
//#endregion
//#region node_modules/tedious/lib/metadata-parser.js
var require_metadata_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	exports.readCollation = readCollation;
	exports.readMetadata = readMetadata;
	var _collation = require_collation();
	var _dataType = require_data_type();
	var _sprintfJs = require_sprintf();
	var _helpers = require_helpers();
	function readCollation(buf, offset) {
		offset = +offset;
		if (buf.length < offset + 5) throw new _helpers.NotEnoughDataError(offset + 5);
		const collation = _collation.Collation.fromBuffer(buf.slice(offset, offset + 5));
		return new _helpers.Result(collation, offset + 5);
	}
	function readSchema(buf, offset) {
		offset = +offset;
		let schemaPresent;
		({offset, value: schemaPresent} = (0, _helpers.readUInt8)(buf, offset));
		if (schemaPresent !== 1) return new _helpers.Result(void 0, offset);
		let dbname;
		({offset, value: dbname} = (0, _helpers.readBVarChar)(buf, offset));
		let owningSchema;
		({offset, value: owningSchema} = (0, _helpers.readBVarChar)(buf, offset));
		let xmlSchemaCollection;
		({offset, value: xmlSchemaCollection} = (0, _helpers.readUsVarChar)(buf, offset));
		return new _helpers.Result({
			dbname,
			owningSchema,
			xmlSchemaCollection
		}, offset);
	}
	function readUDTInfo(buf, offset) {
		let maxByteSize;
		({offset, value: maxByteSize} = (0, _helpers.readUInt16LE)(buf, offset));
		let dbname;
		({offset, value: dbname} = (0, _helpers.readBVarChar)(buf, offset));
		let owningSchema;
		({offset, value: owningSchema} = (0, _helpers.readBVarChar)(buf, offset));
		let typeName;
		({offset, value: typeName} = (0, _helpers.readBVarChar)(buf, offset));
		let assemblyName;
		({offset, value: assemblyName} = (0, _helpers.readUsVarChar)(buf, offset));
		return new _helpers.Result({
			maxByteSize,
			dbname,
			owningSchema,
			typeName,
			assemblyName
		}, offset);
	}
	function readMetadata(buf, offset, options) {
		let userType;
		({offset, value: userType} = (options.tdsVersion < "7_2" ? _helpers.readUInt16LE : _helpers.readUInt32LE)(buf, offset));
		let flags;
		({offset, value: flags} = (0, _helpers.readUInt16LE)(buf, offset));
		let typeNumber;
		({offset, value: typeNumber} = (0, _helpers.readUInt8)(buf, offset));
		const type = _dataType.TYPE[typeNumber];
		if (!type) throw new Error((0, _sprintfJs.sprintf)("Unrecognised data type 0x%02X", typeNumber));
		switch (type.name) {
			case "Null":
			case "TinyInt":
			case "SmallInt":
			case "Int":
			case "BigInt":
			case "Real":
			case "Float":
			case "SmallMoney":
			case "Money":
			case "Bit":
			case "SmallDateTime":
			case "DateTime":
			case "Date": return new _helpers.Result({
				userType,
				flags,
				type,
				collation: void 0,
				precision: void 0,
				scale: void 0,
				dataLength: void 0,
				schema: void 0,
				udtInfo: void 0
			}, offset);
			case "IntN":
			case "FloatN":
			case "MoneyN":
			case "BitN":
			case "UniqueIdentifier":
			case "DateTimeN": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation: void 0,
					precision: void 0,
					scale: void 0,
					dataLength,
					schema: void 0,
					udtInfo: void 0
				}, offset);
			}
			case "Variant": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt32LE)(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation: void 0,
					precision: void 0,
					scale: void 0,
					dataLength,
					schema: void 0,
					udtInfo: void 0
				}, offset);
			}
			case "VarChar":
			case "Char":
			case "NVarChar":
			case "NChar": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt16LE)(buf, offset));
				let collation;
				({offset, value: collation} = readCollation(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation,
					precision: void 0,
					scale: void 0,
					dataLength,
					schema: void 0,
					udtInfo: void 0
				}, offset);
			}
			case "Text":
			case "NText": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt32LE)(buf, offset));
				let collation;
				({offset, value: collation} = readCollation(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation,
					precision: void 0,
					scale: void 0,
					dataLength,
					schema: void 0,
					udtInfo: void 0
				}, offset);
			}
			case "VarBinary":
			case "Binary": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt16LE)(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation: void 0,
					precision: void 0,
					scale: void 0,
					dataLength,
					schema: void 0,
					udtInfo: void 0
				}, offset);
			}
			case "Image": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt32LE)(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation: void 0,
					precision: void 0,
					scale: void 0,
					dataLength,
					schema: void 0,
					udtInfo: void 0
				}, offset);
			}
			case "Xml": {
				let schema;
				({offset, value: schema} = readSchema(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation: void 0,
					precision: void 0,
					scale: void 0,
					dataLength: void 0,
					schema,
					udtInfo: void 0
				}, offset);
			}
			case "Time":
			case "DateTime2":
			case "DateTimeOffset": {
				let scale;
				({offset, value: scale} = (0, _helpers.readUInt8)(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation: void 0,
					precision: void 0,
					scale,
					dataLength: void 0,
					schema: void 0,
					udtInfo: void 0
				}, offset);
			}
			case "NumericN":
			case "DecimalN": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				let precision;
				({offset, value: precision} = (0, _helpers.readUInt8)(buf, offset));
				let scale;
				({offset, value: scale} = (0, _helpers.readUInt8)(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation: void 0,
					precision,
					scale,
					dataLength,
					schema: void 0,
					udtInfo: void 0
				}, offset);
			}
			case "UDT": {
				let udtInfo;
				({offset, value: udtInfo} = readUDTInfo(buf, offset));
				return new _helpers.Result({
					userType,
					flags,
					type,
					collation: void 0,
					precision: void 0,
					scale: void 0,
					dataLength: void 0,
					schema: void 0,
					udtInfo
				}, offset);
			}
			default: throw new Error((0, _sprintfJs.sprintf)("Unrecognised type %s", type.name));
		}
	}
	function metadataParse(parser, options, callback) {
		(async () => {
			while (true) {
				let result;
				try {
					result = readMetadata(parser.buffer, parser.position, options);
				} catch (err) {
					if (err instanceof _helpers.NotEnoughDataError) {
						await parser.waitForChunk();
						continue;
					}
					throw err;
				}
				parser.position = result.offset;
				return callback(result.value);
			}
		})();
	}
	exports.default = metadataParse;
	module.exports = metadataParse;
	module.exports.readCollation = readCollation;
	module.exports.readMetadata = readMetadata;
}));
//#endregion
//#region node_modules/tedious/lib/token/colmetadata-token-parser.js
var require_colmetadata_token_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _metadataParser = require_metadata_parser();
	var _token = require_token();
	var _helpers = require_helpers();
	function readTableName(buf, offset, metadata, options) {
		if (!metadata.type.hasTableName) return new _helpers.Result(void 0, offset);
		if (options.tdsVersion < "7_2") return (0, _helpers.readUsVarChar)(buf, offset);
		let numberOfTableNameParts;
		({offset, value: numberOfTableNameParts} = (0, _helpers.readUInt8)(buf, offset));
		const tableName = [];
		for (let i = 0; i < numberOfTableNameParts; i++) {
			let tableNamePart;
			({offset, value: tableNamePart} = (0, _helpers.readUsVarChar)(buf, offset));
			tableName.push(tableNamePart);
		}
		return new _helpers.Result(tableName, offset);
	}
	function readColumnName(buf, offset, index, metadata, options) {
		let colName;
		({offset, value: colName} = (0, _helpers.readBVarChar)(buf, offset));
		if (options.columnNameReplacer) return new _helpers.Result(options.columnNameReplacer(colName, index, metadata), offset);
		else if (options.camelCaseColumns) return new _helpers.Result(colName.replace(/^[A-Z]/, function(s) {
			return s.toLowerCase();
		}), offset);
		else return new _helpers.Result(colName, offset);
	}
	function readColumn(buf, offset, options, index) {
		let metadata;
		({offset, value: metadata} = (0, _metadataParser.readMetadata)(buf, offset, options));
		let tableName;
		({offset, value: tableName} = readTableName(buf, offset, metadata, options));
		let colName;
		({offset, value: colName} = readColumnName(buf, offset, index, metadata, options));
		return new _helpers.Result({
			userType: metadata.userType,
			flags: metadata.flags,
			type: metadata.type,
			collation: metadata.collation,
			precision: metadata.precision,
			scale: metadata.scale,
			udtInfo: metadata.udtInfo,
			dataLength: metadata.dataLength,
			schema: metadata.schema,
			colName,
			tableName
		}, offset);
	}
	async function colMetadataParser(parser) {
		let columnCount;
		while (true) {
			let offset;
			try {
				({offset, value: columnCount} = (0, _helpers.readUInt16LE)(parser.buffer, parser.position));
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) {
					await parser.waitForChunk();
					continue;
				}
				throw err;
			}
			parser.position = offset;
			break;
		}
		const columns = [];
		for (let i = 0; i < columnCount; i++) while (true) {
			let column;
			let offset;
			try {
				({offset, value: column} = readColumn(parser.buffer, parser.position, parser.options, i));
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) {
					await parser.waitForChunk();
					continue;
				}
				throw err;
			}
			parser.position = offset;
			columns.push(column);
			break;
		}
		return new _token.ColMetadataToken(columns);
	}
	exports.default = colMetadataParser;
	module.exports = colMetadataParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/done-token-parser.js
var require_done_token_parser = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.doneInProcParser = doneInProcParser;
	exports.doneParser = doneParser;
	exports.doneProcParser = doneProcParser;
	var _token = require_token();
	var _helpers = require_helpers();
	var STATUS = {
		MORE: 1,
		ERROR: 2,
		INXACT: 4,
		COUNT: 16,
		ATTN: 32,
		SRVERROR: 256
	};
	function readToken(buf, offset, options) {
		let status;
		({offset, value: status} = (0, _helpers.readUInt16LE)(buf, offset));
		const more = !!(status & STATUS.MORE);
		const sqlError = !!(status & STATUS.ERROR);
		const rowCountValid = !!(status & STATUS.COUNT);
		const attention = !!(status & STATUS.ATTN);
		const serverError = !!(status & STATUS.SRVERROR);
		let curCmd;
		({offset, value: curCmd} = (0, _helpers.readUInt16LE)(buf, offset));
		let rowCount;
		({offset, value: rowCount} = (options.tdsVersion < "7_2" ? _helpers.readUInt32LE : _helpers.readBigUInt64LE)(buf, offset));
		return new _helpers.Result({
			more,
			sqlError,
			attention,
			serverError,
			rowCount: rowCountValid ? Number(rowCount) : void 0,
			curCmd
		}, offset);
	}
	function doneParser(buf, offset, options) {
		let value;
		({offset, value} = readToken(buf, offset, options));
		return new _helpers.Result(new _token.DoneToken(value), offset);
	}
	function doneInProcParser(buf, offset, options) {
		let value;
		({offset, value} = readToken(buf, offset, options));
		return new _helpers.Result(new _token.DoneInProcToken(value), offset);
	}
	function doneProcParser(buf, offset, options) {
		let value;
		({offset, value} = readToken(buf, offset, options));
		return new _helpers.Result(new _token.DoneProcToken(value), offset);
	}
}));
//#endregion
//#region node_modules/tedious/lib/token/env-change-token-parser.js
var require_env_change_token_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _collation = require_collation();
	var _token = require_token();
	var _helpers = require_helpers();
	var types = {
		1: {
			name: "DATABASE",
			event: "databaseChange"
		},
		2: {
			name: "LANGUAGE",
			event: "languageChange"
		},
		3: {
			name: "CHARSET",
			event: "charsetChange"
		},
		4: {
			name: "PACKET_SIZE",
			event: "packetSizeChange"
		},
		7: {
			name: "SQL_COLLATION",
			event: "sqlCollationChange"
		},
		8: {
			name: "BEGIN_TXN",
			event: "beginTransaction"
		},
		9: {
			name: "COMMIT_TXN",
			event: "commitTransaction"
		},
		10: {
			name: "ROLLBACK_TXN",
			event: "rollbackTransaction"
		},
		13: {
			name: "DATABASE_MIRRORING_PARTNER",
			event: "partnerNode"
		},
		17: { name: "TXN_ENDED" },
		18: {
			name: "RESET_CONNECTION",
			event: "resetConnection"
		},
		20: {
			name: "ROUTING_CHANGE",
			event: "routingChange"
		}
	};
	function _readNewAndOldValue(buf, offset, length, type) {
		switch (type.name) {
			case "DATABASE":
			case "LANGUAGE":
			case "CHARSET":
			case "PACKET_SIZE":
			case "DATABASE_MIRRORING_PARTNER": {
				let newValue;
				({offset, value: newValue} = (0, _helpers.readBVarChar)(buf, offset));
				let oldValue;
				({offset, value: oldValue} = (0, _helpers.readBVarChar)(buf, offset));
				switch (type.name) {
					case "PACKET_SIZE": return new _helpers.Result(new _token.PacketSizeEnvChangeToken(parseInt(newValue), parseInt(oldValue)), offset);
					case "DATABASE": return new _helpers.Result(new _token.DatabaseEnvChangeToken(newValue, oldValue), offset);
					case "LANGUAGE": return new _helpers.Result(new _token.LanguageEnvChangeToken(newValue, oldValue), offset);
					case "CHARSET": return new _helpers.Result(new _token.CharsetEnvChangeToken(newValue, oldValue), offset);
					case "DATABASE_MIRRORING_PARTNER": return new _helpers.Result(new _token.DatabaseMirroringPartnerEnvChangeToken(newValue, oldValue), offset);
				}
				throw new Error("unreachable");
			}
			case "SQL_COLLATION":
			case "BEGIN_TXN":
			case "COMMIT_TXN":
			case "ROLLBACK_TXN":
			case "RESET_CONNECTION": {
				let newValue;
				({offset, value: newValue} = (0, _helpers.readBVarByte)(buf, offset));
				let oldValue;
				({offset, value: oldValue} = (0, _helpers.readBVarByte)(buf, offset));
				switch (type.name) {
					case "SQL_COLLATION": {
						const newCollation = newValue.length ? _collation.Collation.fromBuffer(newValue) : void 0;
						const oldCollation = oldValue.length ? _collation.Collation.fromBuffer(oldValue) : void 0;
						return new _helpers.Result(new _token.CollationChangeToken(newCollation, oldCollation), offset);
					}
					case "BEGIN_TXN": return new _helpers.Result(new _token.BeginTransactionEnvChangeToken(newValue, oldValue), offset);
					case "COMMIT_TXN": return new _helpers.Result(new _token.CommitTransactionEnvChangeToken(newValue, oldValue), offset);
					case "ROLLBACK_TXN": return new _helpers.Result(new _token.RollbackTransactionEnvChangeToken(newValue, oldValue), offset);
					case "RESET_CONNECTION": return new _helpers.Result(new _token.ResetConnectionEnvChangeToken(newValue, oldValue), offset);
				}
				throw new Error("unreachable");
			}
			case "ROUTING_CHANGE": {
				let routePacket;
				({offset, value: routePacket} = (0, _helpers.readUsVarByte)(buf, offset));
				let oldValue;
				({offset, value: oldValue} = (0, _helpers.readUsVarByte)(buf, offset));
				const protocol = routePacket.readUInt8(0);
				if (protocol !== 0) throw new Error("Unknown protocol byte in routing change event");
				const port = routePacket.readUInt16LE(1);
				const serverLen = routePacket.readUInt16LE(3);
				const newValue = {
					protocol,
					port,
					server: routePacket.toString("ucs2", 5, 5 + serverLen * 2)
				};
				return new _helpers.Result(new _token.RoutingEnvChangeToken(newValue, oldValue), offset);
			}
			default:
				console.error("Tedious > Unsupported ENVCHANGE type " + type.name);
				return new _helpers.Result(void 0, offset + length - 1);
		}
	}
	function envChangeParser(buf, offset, _options) {
		let tokenLength;
		({offset, value: tokenLength} = (0, _helpers.readUInt16LE)(buf, offset));
		if (buf.length < offset + tokenLength) throw new _helpers.NotEnoughDataError(offset + tokenLength);
		let typeNumber;
		({offset, value: typeNumber} = (0, _helpers.readUInt8)(buf, offset));
		const type = types[typeNumber];
		if (!type) {
			console.error("Tedious > Unsupported ENVCHANGE type " + typeNumber);
			return new _helpers.Result(void 0, offset + tokenLength - 1);
		}
		return _readNewAndOldValue(buf, offset, tokenLength, type);
	}
	exports.default = envChangeParser;
	module.exports = envChangeParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/infoerror-token-parser.js
var require_infoerror_token_parser = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.errorParser = errorParser;
	exports.infoParser = infoParser;
	var _helpers = require_helpers();
	var _token = require_token();
	function readToken(buf, offset, options) {
		let tokenLength;
		({offset, value: tokenLength} = (0, _helpers.readUInt16LE)(buf, offset));
		if (buf.length < tokenLength + offset) throw new _helpers.NotEnoughDataError(tokenLength + offset);
		let number;
		({offset, value: number} = (0, _helpers.readUInt32LE)(buf, offset));
		let state;
		({offset, value: state} = (0, _helpers.readUInt8)(buf, offset));
		let clazz;
		({offset, value: clazz} = (0, _helpers.readUInt8)(buf, offset));
		let message;
		({offset, value: message} = (0, _helpers.readUsVarChar)(buf, offset));
		let serverName;
		({offset, value: serverName} = (0, _helpers.readBVarChar)(buf, offset));
		let procName;
		({offset, value: procName} = (0, _helpers.readBVarChar)(buf, offset));
		let lineNumber;
		({offset, value: lineNumber} = options.tdsVersion < "7_2" ? (0, _helpers.readUInt16LE)(buf, offset) : (0, _helpers.readUInt32LE)(buf, offset));
		return new _helpers.Result({
			"number": number,
			"state": state,
			"class": clazz,
			"message": message,
			"serverName": serverName,
			"procName": procName,
			"lineNumber": lineNumber
		}, offset);
	}
	function infoParser(buf, offset, options) {
		let data;
		({offset, value: data} = readToken(buf, offset, options));
		return new _helpers.Result(new _token.InfoMessageToken(data), offset);
	}
	function errorParser(buf, offset, options) {
		let data;
		({offset, value: data} = readToken(buf, offset, options));
		return new _helpers.Result(new _token.ErrorMessageToken(data), offset);
	}
}));
//#endregion
//#region node_modules/tedious/lib/token/fedauth-info-parser.js
var require_fedauth_info_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _helpers = require_helpers();
	var _token = require_token();
	var FEDAUTHINFOID = {
		STSURL: 1,
		SPN: 2
	};
	function readFedAuthInfo(data) {
		let offset = 0;
		let spn, stsurl;
		const countOfInfoIDs = data.readUInt32LE(offset);
		offset += 4;
		for (let i = 0; i < countOfInfoIDs; i++) {
			const fedauthInfoID = data.readUInt8(offset);
			offset += 1;
			const fedAuthInfoDataLen = data.readUInt32LE(offset);
			offset += 4;
			const fedAuthInfoDataOffset = data.readUInt32LE(offset);
			offset += 4;
			switch (fedauthInfoID) {
				case FEDAUTHINFOID.SPN:
					spn = data.toString("ucs2", fedAuthInfoDataOffset, fedAuthInfoDataOffset + fedAuthInfoDataLen);
					break;
				case FEDAUTHINFOID.STSURL: stsurl = data.toString("ucs2", fedAuthInfoDataOffset, fedAuthInfoDataOffset + fedAuthInfoDataLen);
			}
		}
		return {
			spn,
			stsurl
		};
	}
	function fedAuthInfoParser(buf, offset, _options) {
		let tokenLength;
		({offset, value: tokenLength} = (0, _helpers.readUInt32LE)(buf, offset));
		if (buf.length < offset + tokenLength) throw new _helpers.NotEnoughDataError(offset + tokenLength);
		const data = buf.slice(offset, offset + tokenLength);
		offset += tokenLength;
		const { spn, stsurl } = readFedAuthInfo(data);
		return new _helpers.Result(new _token.FedAuthInfoToken(spn, stsurl), offset);
	}
	exports.default = fedAuthInfoParser;
	module.exports = fedAuthInfoParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/feature-ext-ack-parser.js
var require_feature_ext_ack_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _helpers = require_helpers();
	var _token = require_token();
	var FEATURE_ID = {
		SESSIONRECOVERY: 1,
		FEDAUTH: 2,
		COLUMNENCRYPTION: 4,
		GLOBALTRANSACTIONS: 5,
		AZURESQLSUPPORT: 8,
		UTF8_SUPPORT: 10,
		TERMINATOR: 255
	};
	function featureExtAckParser(buf, offset, _options) {
		let fedAuth;
		let utf8Support;
		while (true) {
			let featureId;
			({value: featureId, offset} = (0, _helpers.readUInt8)(buf, offset));
			if (featureId === FEATURE_ID.TERMINATOR) return new _helpers.Result(new _token.FeatureExtAckToken(fedAuth, utf8Support), offset);
			let featureAckDataLen;
			({value: featureAckDataLen, offset} = (0, _helpers.readUInt32LE)(buf, offset));
			if (buf.length < offset + featureAckDataLen) throw new _helpers.NotEnoughDataError(offset + featureAckDataLen);
			const featureData = buf.slice(offset, offset + featureAckDataLen);
			offset += featureAckDataLen;
			switch (featureId) {
				case FEATURE_ID.FEDAUTH:
					fedAuth = featureData;
					break;
				case FEATURE_ID.UTF8_SUPPORT: utf8Support = !!featureData[0];
			}
		}
	}
	exports.default = featureExtAckParser;
	module.exports = featureExtAckParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/loginack-token-parser.js
var require_loginack_token_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _token = require_token();
	var _tdsVersions = require_tds_versions();
	var _helpers = require_helpers();
	var interfaceTypes = {
		0: "SQL_DFLT",
		1: "SQL_TSQL"
	};
	function loginAckParser(buf, offset, _options) {
		let tokenLength;
		({offset, value: tokenLength} = (0, _helpers.readUInt16LE)(buf, offset));
		if (buf.length < tokenLength + offset) throw new _helpers.NotEnoughDataError(tokenLength + offset);
		let interfaceNumber;
		({offset, value: interfaceNumber} = (0, _helpers.readUInt8)(buf, offset));
		const interfaceType = interfaceTypes[interfaceNumber];
		let tdsVersionNumber;
		({offset, value: tdsVersionNumber} = (0, _helpers.readUInt32BE)(buf, offset));
		const tdsVersion = _tdsVersions.versionsByValue[tdsVersionNumber];
		let progName;
		({offset, value: progName} = (0, _helpers.readBVarChar)(buf, offset));
		let major;
		({offset, value: major} = (0, _helpers.readUInt8)(buf, offset));
		let minor;
		({offset, value: minor} = (0, _helpers.readUInt8)(buf, offset));
		let buildNumHi;
		({offset, value: buildNumHi} = (0, _helpers.readUInt8)(buf, offset));
		let buildNumLow;
		({offset, value: buildNumLow} = (0, _helpers.readUInt8)(buf, offset));
		return new _helpers.Result(new _token.LoginAckToken({
			interface: interfaceType,
			tdsVersion,
			progName,
			progVersion: {
				major,
				minor,
				buildNumHi,
				buildNumLow
			}
		}), offset);
	}
	exports.default = loginAckParser;
	module.exports = loginAckParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/order-token-parser.js
var require_order_token_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _token = require_token();
	var _helpers = require_helpers();
	function orderParser(buf, offset, _options) {
		let tokenLength;
		({offset, value: tokenLength} = (0, _helpers.readUInt16LE)(buf, offset));
		if (buf.length < offset + tokenLength) throw new _helpers.NotEnoughDataError(offset + tokenLength);
		const orderColumns = [];
		for (let i = 0; i < tokenLength; i += 2) {
			let column;
			({offset, value: column} = (0, _helpers.readUInt16LE)(buf, offset));
			orderColumns.push(column);
		}
		return new _helpers.Result(new _token.OrderToken(orderColumns), offset);
	}
	exports.default = orderParser;
	module.exports = orderParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/returnstatus-token-parser.js
var require_returnstatus_token_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _helpers = require_helpers();
	var _token = require_token();
	function returnStatusParser(buf, offset, _options) {
		let value;
		({value, offset} = (0, _helpers.readInt32LE)(buf, offset));
		return new _helpers.Result(new _token.ReturnStatusToken(value), offset);
	}
	exports.default = returnStatusParser;
	module.exports = returnStatusParser;
}));
//#endregion
//#region node_modules/tedious/lib/value-parser.js
var require_value_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isPLPStream = isPLPStream;
	exports.readPLPStream = readPLPStream;
	exports.readValue = readValue;
	var _metadataParser = require_metadata_parser();
	var _dataType = require_data_type();
	var _iconvLite = _interopRequireDefault(require_lib$1());
	var _sprintfJs = require_sprintf();
	var _guidParser = require_guid_parser();
	var _helpers = require_helpers();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var NULL = 65535;
	var MAX = 65535;
	var THREE_AND_A_THIRD = 3 + 1 / 3;
	var MONEY_DIVISOR = 1e4;
	var PLP_NULL = 18446744073709551615n;
	var UNKNOWN_PLP_LEN = 18446744073709551614n;
	var DEFAULT_ENCODING = "utf8";
	function readTinyInt(buf, offset) {
		return (0, _helpers.readUInt8)(buf, offset);
	}
	function readSmallInt(buf, offset) {
		return (0, _helpers.readInt16LE)(buf, offset);
	}
	function readInt(buf, offset) {
		return (0, _helpers.readInt32LE)(buf, offset);
	}
	function readBigInt(buf, offset) {
		let value;
		({offset, value} = (0, _helpers.readBigInt64LE)(buf, offset));
		return new _helpers.Result(value.toString(), offset);
	}
	function readReal(buf, offset) {
		return (0, _helpers.readFloatLE)(buf, offset);
	}
	function readFloat(buf, offset) {
		return (0, _helpers.readDoubleLE)(buf, offset);
	}
	function readSmallMoney(buf, offset) {
		let value;
		({offset, value} = (0, _helpers.readInt32LE)(buf, offset));
		return new _helpers.Result(value / MONEY_DIVISOR, offset);
	}
	function readMoney(buf, offset) {
		let high;
		({offset, value: high} = (0, _helpers.readInt32LE)(buf, offset));
		let low;
		({offset, value: low} = (0, _helpers.readUInt32LE)(buf, offset));
		return new _helpers.Result((low + 4294967296 * high) / MONEY_DIVISOR, offset);
	}
	function readBit(buf, offset) {
		let value;
		({offset, value} = (0, _helpers.readUInt8)(buf, offset));
		return new _helpers.Result(!!value, offset);
	}
	function readValue(buf, offset, metadata, options) {
		switch (metadata.type.name) {
			case "Null": return new _helpers.Result(null, offset);
			case "TinyInt": return readTinyInt(buf, offset);
			case "SmallInt": return readSmallInt(buf, offset);
			case "Int": return readInt(buf, offset);
			case "BigInt": return readBigInt(buf, offset);
			case "IntN": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				switch (dataLength) {
					case 0: return new _helpers.Result(null, offset);
					case 1: return readTinyInt(buf, offset);
					case 2: return readSmallInt(buf, offset);
					case 4: return readInt(buf, offset);
					case 8: return readBigInt(buf, offset);
					default: throw new Error("Unsupported dataLength " + dataLength + " for IntN");
				}
			}
			case "Real": return readReal(buf, offset);
			case "Float": return readFloat(buf, offset);
			case "FloatN": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				switch (dataLength) {
					case 0: return new _helpers.Result(null, offset);
					case 4: return readReal(buf, offset);
					case 8: return readFloat(buf, offset);
					default: throw new Error("Unsupported dataLength " + dataLength + " for FloatN");
				}
			}
			case "SmallMoney": return readSmallMoney(buf, offset);
			case "Money": return readMoney(buf, offset);
			case "MoneyN": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				switch (dataLength) {
					case 0: return new _helpers.Result(null, offset);
					case 4: return readSmallMoney(buf, offset);
					case 8: return readMoney(buf, offset);
					default: throw new Error("Unsupported dataLength " + dataLength + " for MoneyN");
				}
			}
			case "Bit": return readBit(buf, offset);
			case "BitN": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				switch (dataLength) {
					case 0: return new _helpers.Result(null, offset);
					case 1: return readBit(buf, offset);
					default: throw new Error("Unsupported dataLength " + dataLength + " for BitN");
				}
			}
			case "VarChar":
			case "Char": {
				const codepage = metadata.collation.codepage;
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt16LE)(buf, offset));
				if (dataLength === NULL) return new _helpers.Result(null, offset);
				return readChars(buf, offset, dataLength, codepage);
			}
			case "NVarChar":
			case "NChar": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt16LE)(buf, offset));
				if (dataLength === NULL) return new _helpers.Result(null, offset);
				return readNChars(buf, offset, dataLength);
			}
			case "VarBinary":
			case "Binary": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt16LE)(buf, offset));
				if (dataLength === NULL) return new _helpers.Result(null, offset);
				return readBinary(buf, offset, dataLength);
			}
			case "Text": {
				let textPointerLength;
				({offset, value: textPointerLength} = (0, _helpers.readUInt8)(buf, offset));
				if (textPointerLength === 0) return new _helpers.Result(null, offset);
				({offset} = readBinary(buf, offset, textPointerLength));
				({offset} = readBinary(buf, offset, 8));
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt32LE)(buf, offset));
				return readChars(buf, offset, dataLength, metadata.collation.codepage);
			}
			case "NText": {
				let textPointerLength;
				({offset, value: textPointerLength} = (0, _helpers.readUInt8)(buf, offset));
				if (textPointerLength === 0) return new _helpers.Result(null, offset);
				({offset} = readBinary(buf, offset, textPointerLength));
				({offset} = readBinary(buf, offset, 8));
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt32LE)(buf, offset));
				return readNChars(buf, offset, dataLength);
			}
			case "Image": {
				let textPointerLength;
				({offset, value: textPointerLength} = (0, _helpers.readUInt8)(buf, offset));
				if (textPointerLength === 0) return new _helpers.Result(null, offset);
				({offset} = readBinary(buf, offset, textPointerLength));
				({offset} = readBinary(buf, offset, 8));
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt32LE)(buf, offset));
				return readBinary(buf, offset, dataLength);
			}
			case "SmallDateTime": return readSmallDateTime(buf, offset, options.useUTC);
			case "DateTime": return readDateTime(buf, offset, options.useUTC);
			case "DateTimeN": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				switch (dataLength) {
					case 0: return new _helpers.Result(null, offset);
					case 4: return readSmallDateTime(buf, offset, options.useUTC);
					case 8: return readDateTime(buf, offset, options.useUTC);
					default: throw new Error("Unsupported dataLength " + dataLength + " for DateTimeN");
				}
			}
			case "Time": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				if (dataLength === 0) return new _helpers.Result(null, offset);
				return readTime(buf, offset, dataLength, metadata.scale, options.useUTC);
			}
			case "Date": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				if (dataLength === 0) return new _helpers.Result(null, offset);
				return readDate(buf, offset, options.useUTC);
			}
			case "DateTime2": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				if (dataLength === 0) return new _helpers.Result(null, offset);
				return readDateTime2(buf, offset, dataLength, metadata.scale, options.useUTC);
			}
			case "DateTimeOffset": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				if (dataLength === 0) return new _helpers.Result(null, offset);
				return readDateTimeOffset(buf, offset, dataLength, metadata.scale);
			}
			case "NumericN":
			case "DecimalN": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				if (dataLength === 0) return new _helpers.Result(null, offset);
				return readNumeric(buf, offset, dataLength, metadata.precision, metadata.scale);
			}
			case "UniqueIdentifier": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt8)(buf, offset));
				switch (dataLength) {
					case 0: return new _helpers.Result(null, offset);
					case 16: return readUniqueIdentifier(buf, offset, options);
					default: throw new Error((0, _sprintfJs.sprintf)("Unsupported guid size %d", dataLength - 1));
				}
			}
			case "Variant": {
				let dataLength;
				({offset, value: dataLength} = (0, _helpers.readUInt32LE)(buf, offset));
				if (dataLength === 0) return new _helpers.Result(null, offset);
				return readVariant(buf, offset, options, dataLength);
			}
			default: throw new Error("Invalid type!");
		}
	}
	function isPLPStream(metadata) {
		switch (metadata.type.name) {
			case "VarChar":
			case "NVarChar":
			case "VarBinary": return metadata.dataLength === MAX;
			case "Xml": return true;
			case "UDT": return true;
		}
	}
	function readUniqueIdentifier(buf, offset, options) {
		let data;
		({value: data, offset} = readBinary(buf, offset, 16));
		return new _helpers.Result(options.lowerCaseGuids ? (0, _guidParser.bufferToLowerCaseGuid)(data) : (0, _guidParser.bufferToUpperCaseGuid)(data), offset);
	}
	function readNumeric(buf, offset, dataLength, _precision, scale) {
		let sign;
		({offset, value: sign} = (0, _helpers.readUInt8)(buf, offset));
		sign = sign === 1 ? 1 : -1;
		let value;
		if (dataLength === 5) ({offset, value} = (0, _helpers.readUInt32LE)(buf, offset));
		else if (dataLength === 9) ({offset, value} = (0, _helpers.readUNumeric64LE)(buf, offset));
		else if (dataLength === 13) ({offset, value} = (0, _helpers.readUNumeric96LE)(buf, offset));
		else if (dataLength === 17) ({offset, value} = (0, _helpers.readUNumeric128LE)(buf, offset));
		else throw new Error((0, _sprintfJs.sprintf)("Unsupported numeric dataLength %d", dataLength));
		return new _helpers.Result(value * sign / Math.pow(10, scale), offset);
	}
	function readVariant(buf, offset, options, dataLength) {
		let baseType;
		({value: baseType, offset} = (0, _helpers.readUInt8)(buf, offset));
		const type = _dataType.TYPE[baseType];
		let propBytes;
		({value: propBytes, offset} = (0, _helpers.readUInt8)(buf, offset));
		dataLength = dataLength - propBytes - 2;
		switch (type.name) {
			case "UniqueIdentifier": return readUniqueIdentifier(buf, offset, options);
			case "Bit": return readBit(buf, offset);
			case "TinyInt": return readTinyInt(buf, offset);
			case "SmallInt": return readSmallInt(buf, offset);
			case "Int": return readInt(buf, offset);
			case "BigInt": return readBigInt(buf, offset);
			case "SmallDateTime": return readSmallDateTime(buf, offset, options.useUTC);
			case "DateTime": return readDateTime(buf, offset, options.useUTC);
			case "Real": return readReal(buf, offset);
			case "Float": return readFloat(buf, offset);
			case "SmallMoney": return readSmallMoney(buf, offset);
			case "Money": return readMoney(buf, offset);
			case "Date": return readDate(buf, offset, options.useUTC);
			case "Time": {
				let scale;
				({value: scale, offset} = (0, _helpers.readUInt8)(buf, offset));
				return readTime(buf, offset, dataLength, scale, options.useUTC);
			}
			case "DateTime2": {
				let scale;
				({value: scale, offset} = (0, _helpers.readUInt8)(buf, offset));
				return readDateTime2(buf, offset, dataLength, scale, options.useUTC);
			}
			case "DateTimeOffset": {
				let scale;
				({value: scale, offset} = (0, _helpers.readUInt8)(buf, offset));
				return readDateTimeOffset(buf, offset, dataLength, scale);
			}
			case "VarBinary":
			case "Binary":
				({offset} = (0, _helpers.readUInt16LE)(buf, offset));
				return readBinary(buf, offset, dataLength);
			case "NumericN":
			case "DecimalN": {
				let precision;
				({value: precision, offset} = (0, _helpers.readUInt8)(buf, offset));
				let scale;
				({value: scale, offset} = (0, _helpers.readUInt8)(buf, offset));
				return readNumeric(buf, offset, dataLength, precision, scale);
			}
			case "VarChar":
			case "Char": {
				({offset} = (0, _helpers.readUInt16LE)(buf, offset));
				let collation;
				({value: collation, offset} = (0, _metadataParser.readCollation)(buf, offset));
				return readChars(buf, offset, dataLength, collation.codepage);
			}
			case "NVarChar":
			case "NChar":
				({offset} = (0, _helpers.readUInt16LE)(buf, offset));
				({offset} = (0, _metadataParser.readCollation)(buf, offset));
				return readNChars(buf, offset, dataLength);
			default: throw new Error("Invalid type!");
		}
	}
	function readBinary(buf, offset, dataLength) {
		if (buf.length < offset + dataLength) throw new _helpers.NotEnoughDataError(offset + dataLength);
		return new _helpers.Result(buf.slice(offset, offset + dataLength), offset + dataLength);
	}
	function readChars(buf, offset, dataLength, codepage) {
		if (buf.length < offset + dataLength) throw new _helpers.NotEnoughDataError(offset + dataLength);
		return new _helpers.Result(_iconvLite.default.decode(buf.slice(offset, offset + dataLength), codepage ?? DEFAULT_ENCODING), offset + dataLength);
	}
	function readNChars(buf, offset, dataLength) {
		if (buf.length < offset + dataLength) throw new _helpers.NotEnoughDataError(offset + dataLength);
		return new _helpers.Result(buf.toString("ucs2", offset, offset + dataLength), offset + dataLength);
	}
	async function readPLPStream(parser) {
		while (parser.buffer.length < parser.position + 8) await parser.waitForChunk();
		const expectedLength = parser.buffer.readBigUInt64LE(parser.position);
		parser.position += 8;
		if (expectedLength === PLP_NULL) return null;
		const chunks = [];
		let currentLength = 0;
		while (true) {
			while (parser.buffer.length < parser.position + 4) await parser.waitForChunk();
			const chunkLength = parser.buffer.readUInt32LE(parser.position);
			parser.position += 4;
			if (!chunkLength) break;
			while (parser.buffer.length < parser.position + chunkLength) await parser.waitForChunk();
			chunks.push(parser.buffer.slice(parser.position, parser.position + chunkLength));
			parser.position += chunkLength;
			currentLength += chunkLength;
		}
		if (expectedLength !== UNKNOWN_PLP_LEN) {
			if (currentLength !== Number(expectedLength)) throw new Error("Partially Length-prefixed Bytes unmatched lengths : expected " + expectedLength + ", but got " + currentLength + " bytes");
		}
		return chunks;
	}
	function readSmallDateTime(buf, offset, useUTC) {
		let days;
		({offset, value: days} = (0, _helpers.readUInt16LE)(buf, offset));
		let minutes;
		({offset, value: minutes} = (0, _helpers.readUInt16LE)(buf, offset));
		let value;
		if (useUTC) value = new Date(Date.UTC(1900, 0, 1 + days, 0, minutes));
		else value = new Date(1900, 0, 1 + days, 0, minutes);
		return new _helpers.Result(value, offset);
	}
	function readDateTime(buf, offset, useUTC) {
		let days;
		({offset, value: days} = (0, _helpers.readInt32LE)(buf, offset));
		let threeHundredthsOfSecond;
		({offset, value: threeHundredthsOfSecond} = (0, _helpers.readInt32LE)(buf, offset));
		const milliseconds = Math.round(threeHundredthsOfSecond * THREE_AND_A_THIRD);
		let value;
		if (useUTC) value = new Date(Date.UTC(1900, 0, 1 + days, 0, 0, 0, milliseconds));
		else value = new Date(1900, 0, 1 + days, 0, 0, 0, milliseconds);
		return new _helpers.Result(value, offset);
	}
	function readTime(buf, offset, dataLength, scale, useUTC) {
		let value;
		switch (dataLength) {
			case 3:
				({value, offset} = (0, _helpers.readUInt24LE)(buf, offset));
				break;
			case 4:
				({value, offset} = (0, _helpers.readUInt32LE)(buf, offset));
				break;
			case 5:
				({value, offset} = (0, _helpers.readUInt40LE)(buf, offset));
				break;
			default: throw new Error("unreachable");
		}
		if (scale < 7) for (let i = scale; i < 7; i++) value *= 10;
		let date;
		if (useUTC) date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, value / 1e4));
		else date = new Date(1970, 0, 1, 0, 0, 0, value / 1e4);
		Object.defineProperty(date, "nanosecondsDelta", {
			enumerable: false,
			value: value % 1e4 / Math.pow(10, 7)
		});
		return new _helpers.Result(date, offset);
	}
	function readDate(buf, offset, useUTC) {
		let days;
		({offset, value: days} = (0, _helpers.readUInt24LE)(buf, offset));
		if (useUTC) return new _helpers.Result(new Date(Date.UTC(2e3, 0, days - 730118)), offset);
		else return new _helpers.Result(new Date(2e3, 0, days - 730118), offset);
	}
	function readDateTime2(buf, offset, dataLength, scale, useUTC) {
		let time;
		({offset, value: time} = readTime(buf, offset, dataLength - 3, scale, useUTC));
		let days;
		({offset, value: days} = (0, _helpers.readUInt24LE)(buf, offset));
		let date;
		if (useUTC) date = new Date(Date.UTC(2e3, 0, days - 730118, 0, 0, 0, +time));
		else date = new Date(2e3, 0, days - 730118, time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
		Object.defineProperty(date, "nanosecondsDelta", {
			enumerable: false,
			value: time.nanosecondsDelta
		});
		return new _helpers.Result(date, offset);
	}
	function readDateTimeOffset(buf, offset, dataLength, scale) {
		let time;
		({offset, value: time} = readTime(buf, offset, dataLength - 5, scale, true));
		let days;
		({offset, value: days} = (0, _helpers.readUInt24LE)(buf, offset));
		({offset} = (0, _helpers.readUInt16LE)(buf, offset));
		const date = new Date(Date.UTC(2e3, 0, days - 730118, 0, 0, 0, +time));
		Object.defineProperty(date, "nanosecondsDelta", {
			enumerable: false,
			value: time.nanosecondsDelta
		});
		return new _helpers.Result(date, offset);
	}
	module.exports.readValue = readValue;
	module.exports.isPLPStream = isPLPStream;
	module.exports.readPLPStream = readPLPStream;
}));
//#endregion
//#region node_modules/tedious/lib/token/returnvalue-token-parser.js
var require_returnvalue_token_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _token = require_token();
	var _metadataParser = require_metadata_parser();
	var _valueParser = require_value_parser();
	var _helpers = require_helpers();
	var iconv = _interopRequireWildcard(require_lib$1());
	function _interopRequireWildcard(e, t) {
		if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
		return (_interopRequireWildcard = function(e, t) {
			if (!t && e && e.__esModule) return e;
			var o, i, f = {
				__proto__: null,
				default: e
			};
			if (null === e || "object" != typeof e && "function" != typeof e) return f;
			if (o = t ? n : r) {
				if (o.has(e)) return o.get(e);
				o.set(e, f);
			}
			for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
			return f;
		})(e, t);
	}
	async function returnParser(parser) {
		let paramName;
		let paramOrdinal;
		let metadata;
		while (true) {
			const buf = parser.buffer;
			let offset = parser.position;
			try {
				({offset, value: paramOrdinal} = (0, _helpers.readUInt16LE)(buf, offset));
				({offset, value: paramName} = (0, _helpers.readBVarChar)(buf, offset));
				({offset} = (0, _helpers.readUInt8)(buf, offset));
				({offset, value: metadata} = (0, _metadataParser.readMetadata)(buf, offset, parser.options));
				if (paramName.charAt(0) === "@") paramName = paramName.slice(1);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) {
					await parser.waitForChunk();
					continue;
				}
				throw err;
			}
			parser.position = offset;
			break;
		}
		let value;
		while (true) {
			const buf = parser.buffer;
			let offset = parser.position;
			if ((0, _valueParser.isPLPStream)(metadata)) {
				const chunks = await (0, _valueParser.readPLPStream)(parser);
				if (chunks === null) value = chunks;
				else if (metadata.type.name === "NVarChar" || metadata.type.name === "Xml") value = Buffer.concat(chunks).toString("ucs2");
				else if (metadata.type.name === "VarChar") value = iconv.decode(Buffer.concat(chunks), metadata.collation?.codepage ?? "utf8");
				else if (metadata.type.name === "VarBinary" || metadata.type.name === "UDT") value = Buffer.concat(chunks);
			} else {
				try {
					({value, offset} = (0, _valueParser.readValue)(buf, offset, metadata, parser.options));
				} catch (err) {
					if (err instanceof _helpers.NotEnoughDataError) {
						await parser.waitForChunk();
						continue;
					}
					throw err;
				}
				parser.position = offset;
			}
			break;
		}
		return new _token.ReturnValueToken({
			paramOrdinal,
			paramName,
			metadata,
			value
		});
	}
	exports.default = returnParser;
	module.exports = returnParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/row-token-parser.js
var require_row_token_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _token = require_token();
	var iconv = _interopRequireWildcard(require_lib$1());
	var _valueParser = require_value_parser();
	var _helpers = require_helpers();
	function _interopRequireWildcard(e, t) {
		if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
		return (_interopRequireWildcard = function(e, t) {
			if (!t && e && e.__esModule) return e;
			var o, i, f = {
				__proto__: null,
				default: e
			};
			if (null === e || "object" != typeof e && "function" != typeof e) return f;
			if (o = t ? n : r) {
				if (o.has(e)) return o.get(e);
				o.set(e, f);
			}
			for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
			return f;
		})(e, t);
	}
	async function rowParser(parser) {
		const columns = [];
		for (const metadata of parser.colMetadata) while (true) {
			if ((0, _valueParser.isPLPStream)(metadata)) {
				const chunks = await (0, _valueParser.readPLPStream)(parser);
				if (chunks === null) columns.push({
					value: chunks,
					metadata
				});
				else if (metadata.type.name === "NVarChar" || metadata.type.name === "Xml") columns.push({
					value: Buffer.concat(chunks).toString("ucs2"),
					metadata
				});
				else if (metadata.type.name === "VarChar") columns.push({
					value: iconv.decode(Buffer.concat(chunks), metadata.collation?.codepage ?? "utf8"),
					metadata
				});
				else if (metadata.type.name === "VarBinary" || metadata.type.name === "UDT") columns.push({
					value: Buffer.concat(chunks),
					metadata
				});
			} else {
				let result;
				try {
					result = (0, _valueParser.readValue)(parser.buffer, parser.position, metadata, parser.options);
				} catch (err) {
					if (err instanceof _helpers.NotEnoughDataError) {
						await parser.waitForChunk();
						continue;
					}
					throw err;
				}
				parser.position = result.offset;
				columns.push({
					value: result.value,
					metadata
				});
			}
			break;
		}
		if (parser.options.useColumnNames) {
			const columnsMap = Object.create(null);
			columns.forEach((column) => {
				const colName = column.metadata.colName;
				if (columnsMap[colName] == null) columnsMap[colName] = column;
			});
			return new _token.RowToken(columnsMap);
		} else return new _token.RowToken(columns);
	}
	exports.default = rowParser;
	module.exports = rowParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/nbcrow-token-parser.js
var require_nbcrow_token_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _token = require_token();
	var iconv = _interopRequireWildcard(require_lib$1());
	var _valueParser = require_value_parser();
	var _helpers = require_helpers();
	function _interopRequireWildcard(e, t) {
		if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
		return (_interopRequireWildcard = function(e, t) {
			if (!t && e && e.__esModule) return e;
			var o, i, f = {
				__proto__: null,
				default: e
			};
			if (null === e || "object" != typeof e && "function" != typeof e) return f;
			if (o = t ? n : r) {
				if (o.has(e)) return o.get(e);
				o.set(e, f);
			}
			for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
			return f;
		})(e, t);
	}
	async function nbcRowParser(parser) {
		const colMetadata = parser.colMetadata;
		const columns = [];
		const bitmap = [];
		const bitmapByteLength = Math.ceil(colMetadata.length / 8);
		while (parser.buffer.length - parser.position < bitmapByteLength) await parser.waitForChunk();
		const bytes = parser.buffer.slice(parser.position, parser.position + bitmapByteLength);
		parser.position += bitmapByteLength;
		for (let i = 0, len = bytes.length; i < len; i++) {
			const byte = bytes[i];
			bitmap.push(byte & 1 ? true : false);
			bitmap.push(byte & 2 ? true : false);
			bitmap.push(byte & 4 ? true : false);
			bitmap.push(byte & 8 ? true : false);
			bitmap.push(byte & 16 ? true : false);
			bitmap.push(byte & 32 ? true : false);
			bitmap.push(byte & 64 ? true : false);
			bitmap.push(byte & 128 ? true : false);
		}
		for (let i = 0; i < colMetadata.length; i++) {
			const metadata = colMetadata[i];
			if (bitmap[i]) {
				columns.push({
					value: null,
					metadata
				});
				continue;
			}
			while (true) {
				if ((0, _valueParser.isPLPStream)(metadata)) {
					const chunks = await (0, _valueParser.readPLPStream)(parser);
					if (chunks === null) columns.push({
						value: chunks,
						metadata
					});
					else if (metadata.type.name === "NVarChar" || metadata.type.name === "Xml") columns.push({
						value: Buffer.concat(chunks).toString("ucs2"),
						metadata
					});
					else if (metadata.type.name === "VarChar") columns.push({
						value: iconv.decode(Buffer.concat(chunks), metadata.collation?.codepage ?? "utf8"),
						metadata
					});
					else if (metadata.type.name === "VarBinary" || metadata.type.name === "UDT") columns.push({
						value: Buffer.concat(chunks),
						metadata
					});
				} else {
					let result;
					try {
						result = (0, _valueParser.readValue)(parser.buffer, parser.position, metadata, parser.options);
					} catch (err) {
						if (err instanceof _helpers.NotEnoughDataError) {
							await parser.waitForChunk();
							continue;
						}
						throw err;
					}
					parser.position = result.offset;
					columns.push({
						value: result.value,
						metadata
					});
				}
				break;
			}
		}
		if (parser.options.useColumnNames) {
			const columnsMap = Object.create(null);
			columns.forEach((column) => {
				const colName = column.metadata.colName;
				if (columnsMap[colName] == null) columnsMap[colName] = column;
			});
			return new _token.NBCRowToken(columnsMap);
		} else return new _token.NBCRowToken(columns);
	}
	exports.default = nbcRowParser;
	module.exports = nbcRowParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/sspi-token-parser.js
var require_sspi_token_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _helpers = require_helpers();
	var _token = require_token();
	function parseChallenge(buffer) {
		const challenge = {};
		challenge.magic = buffer.slice(0, 8).toString("utf8");
		challenge.type = buffer.readInt32LE(8);
		challenge.domainLen = buffer.readInt16LE(12);
		challenge.domainMax = buffer.readInt16LE(14);
		challenge.domainOffset = buffer.readInt32LE(16);
		challenge.flags = buffer.readInt32LE(20);
		challenge.nonce = buffer.slice(24, 32);
		challenge.zeroes = buffer.slice(32, 40);
		challenge.targetLen = buffer.readInt16LE(40);
		challenge.targetMax = buffer.readInt16LE(42);
		challenge.targetOffset = buffer.readInt32LE(44);
		challenge.oddData = buffer.slice(48, 56);
		challenge.domain = buffer.slice(56, 56 + challenge.domainLen).toString("ucs2");
		challenge.target = buffer.slice(56 + challenge.domainLen, 56 + challenge.domainLen + challenge.targetLen);
		return challenge;
	}
	function sspiParser(buf, offset, _options) {
		let tokenLength;
		({offset, value: tokenLength} = (0, _helpers.readUInt16LE)(buf, offset));
		if (buf.length < offset + tokenLength) throw new _helpers.NotEnoughDataError(offset + tokenLength);
		const data = buf.slice(offset, offset + tokenLength);
		offset += tokenLength;
		return new _helpers.Result(new _token.SSPIToken(parseChallenge(data), data), offset);
	}
	exports.default = sspiParser;
	module.exports = sspiParser;
}));
//#endregion
//#region node_modules/tedious/lib/token/stream-parser.js
var require_stream_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _token = require_token();
	var _colmetadataTokenParser = _interopRequireDefault(require_colmetadata_token_parser());
	var _doneTokenParser = require_done_token_parser();
	var _envChangeTokenParser = _interopRequireDefault(require_env_change_token_parser());
	var _infoerrorTokenParser = require_infoerror_token_parser();
	var _fedauthInfoParser = _interopRequireDefault(require_fedauth_info_parser());
	var _featureExtAckParser = _interopRequireDefault(require_feature_ext_ack_parser());
	var _loginackTokenParser = _interopRequireDefault(require_loginack_token_parser());
	var _orderTokenParser = _interopRequireDefault(require_order_token_parser());
	var _returnstatusTokenParser = _interopRequireDefault(require_returnstatus_token_parser());
	var _returnvalueTokenParser = _interopRequireDefault(require_returnvalue_token_parser());
	var _rowTokenParser = _interopRequireDefault(require_row_token_parser());
	var _nbcrowTokenParser = _interopRequireDefault(require_nbcrow_token_parser());
	var _sspiTokenParser = _interopRequireDefault(require_sspi_token_parser());
	var _helpers = require_helpers();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var Parser = class Parser {
		debug;
		colMetadata;
		options;
		iterator;
		buffer;
		position;
		static async *parseTokens(iterable, debug, options, colMetadata = []) {
			const parser = new Parser(iterable, debug, options);
			parser.colMetadata = colMetadata;
			while (true) {
				try {
					await parser.waitForChunk();
				} catch (err) {
					if (parser.position === parser.buffer.length) return;
					throw err;
				}
				while (parser.buffer.length >= parser.position + 1) {
					const type = parser.buffer.readUInt8(parser.position);
					parser.position += 1;
					const token = parser.readToken(type);
					if (token !== void 0) yield token;
				}
			}
		}
		readToken(type) {
			switch (type) {
				case _token.TYPE.DONE: return this.readDoneToken();
				case _token.TYPE.DONEPROC: return this.readDoneProcToken();
				case _token.TYPE.DONEINPROC: return this.readDoneInProcToken();
				case _token.TYPE.ERROR: return this.readErrorToken();
				case _token.TYPE.INFO: return this.readInfoToken();
				case _token.TYPE.ENVCHANGE: return this.readEnvChangeToken();
				case _token.TYPE.LOGINACK: return this.readLoginAckToken();
				case _token.TYPE.RETURNSTATUS: return this.readReturnStatusToken();
				case _token.TYPE.ORDER: return this.readOrderToken();
				case _token.TYPE.FEDAUTHINFO: return this.readFedAuthInfoToken();
				case _token.TYPE.SSPI: return this.readSSPIToken();
				case _token.TYPE.COLMETADATA: return this.readColMetadataToken();
				case _token.TYPE.RETURNVALUE: return this.readReturnValueToken();
				case _token.TYPE.ROW: return this.readRowToken();
				case _token.TYPE.NBCROW: return this.readNbcRowToken();
				case _token.TYPE.FEATUREEXTACK: return this.readFeatureExtAckToken();
				default: throw new Error("Unknown type: " + type);
			}
		}
		readFeatureExtAckToken() {
			let result;
			try {
				result = (0, _featureExtAckParser.default)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readFeatureExtAckToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		async readNbcRowToken() {
			return await (0, _nbcrowTokenParser.default)(this);
		}
		async readReturnValueToken() {
			return await (0, _returnvalueTokenParser.default)(this);
		}
		async readColMetadataToken() {
			const token = await (0, _colmetadataTokenParser.default)(this);
			this.colMetadata = token.columns;
			return token;
		}
		readSSPIToken() {
			let result;
			try {
				result = (0, _sspiTokenParser.default)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readSSPIToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readFedAuthInfoToken() {
			let result;
			try {
				result = (0, _fedauthInfoParser.default)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readFedAuthInfoToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readOrderToken() {
			let result;
			try {
				result = (0, _orderTokenParser.default)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readOrderToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readReturnStatusToken() {
			let result;
			try {
				result = (0, _returnstatusTokenParser.default)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readReturnStatusToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readLoginAckToken() {
			let result;
			try {
				result = (0, _loginackTokenParser.default)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readLoginAckToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readEnvChangeToken() {
			let result;
			try {
				result = (0, _envChangeTokenParser.default)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readEnvChangeToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readRowToken() {
			return (0, _rowTokenParser.default)(this);
		}
		readInfoToken() {
			let result;
			try {
				result = (0, _infoerrorTokenParser.infoParser)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readInfoToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readErrorToken() {
			let result;
			try {
				result = (0, _infoerrorTokenParser.errorParser)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readErrorToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readDoneInProcToken() {
			let result;
			try {
				result = (0, _doneTokenParser.doneInProcParser)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readDoneInProcToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readDoneProcToken() {
			let result;
			try {
				result = (0, _doneTokenParser.doneProcParser)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readDoneProcToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		readDoneToken() {
			let result;
			try {
				result = (0, _doneTokenParser.doneParser)(this.buffer, this.position, this.options);
			} catch (err) {
				if (err instanceof _helpers.NotEnoughDataError) return this.waitForChunk().then(() => {
					return this.readDoneToken();
				});
				throw err;
			}
			this.position = result.offset;
			return result.value;
		}
		constructor(iterable, debug, options) {
			this.debug = debug;
			this.colMetadata = [];
			this.options = options;
			this.iterator = (iterable[Symbol.asyncIterator] || iterable[Symbol.iterator]).call(iterable);
			this.buffer = Buffer.alloc(0);
			this.position = 0;
		}
		async waitForChunk() {
			const result = await this.iterator.next();
			if (result.done) throw new Error("unexpected end of data");
			if (this.position === this.buffer.length) this.buffer = result.value;
			else this.buffer = Buffer.concat([this.buffer.slice(this.position), result.value]);
			this.position = 0;
		}
	};
	exports.default = Parser;
	module.exports = Parser;
}));
//#endregion
//#region node_modules/tedious/lib/token/token-stream-parser.js
var require_token_stream_parser = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Parser = void 0;
	var _events$1 = __require("events");
	var _streamParser = _interopRequireDefault(require_stream_parser());
	var _stream$1 = __require("stream");
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var Parser = class extends _events$1.EventEmitter {
		constructor(message, debug, handler, options) {
			super();
			this.debug = debug;
			this.options = options;
			this.parser = _stream$1.Readable.from(_streamParser.default.parseTokens(message, this.debug, this.options));
			this.parser.on("data", (token) => {
				debug.token(token);
				handler[token.handlerName](token);
			});
			this.parser.on("drain", () => {
				this.emit("drain");
			});
			this.parser.on("end", () => {
				this.emit("end");
			});
		}
		pause() {
			return this.parser.pause();
		}
		resume() {
			return this.parser.resume();
		}
	};
	exports.Parser = Parser;
}));
//#endregion
//#region node_modules/tedious/lib/transaction.js
var require_transaction$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Transaction = exports.OPERATION_TYPE = exports.ISOLATION_LEVEL = void 0;
	exports.assertValidIsolationLevel = assertValidIsolationLevel;
	exports.isolationLevelByValue = void 0;
	var _writableTrackingBuffer = _interopRequireDefault(require_writable_tracking_buffer());
	var _allHeaders = require_all_headers();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var OPERATION_TYPE = exports.OPERATION_TYPE = {
		TM_GET_DTC_ADDRESS: 0,
		TM_PROPAGATE_XACT: 1,
		TM_BEGIN_XACT: 5,
		TM_PROMOTE_XACT: 6,
		TM_COMMIT_XACT: 7,
		TM_ROLLBACK_XACT: 8,
		TM_SAVE_XACT: 9
	};
	var ISOLATION_LEVEL = exports.ISOLATION_LEVEL = {
		NO_CHANGE: 0,
		READ_UNCOMMITTED: 1,
		READ_COMMITTED: 2,
		REPEATABLE_READ: 3,
		SERIALIZABLE: 4,
		SNAPSHOT: 5
	};
	var isolationLevelByValue = exports.isolationLevelByValue = {};
	for (const name in ISOLATION_LEVEL) {
		const value = ISOLATION_LEVEL[name];
		isolationLevelByValue[value] = name;
	}
	function assertValidIsolationLevel(isolationLevel, name) {
		if (typeof isolationLevel !== "number") throw new TypeError(`The "${name}" ${name.includes(".") ? "property" : "argument"} must be of type number. Received type ${typeof isolationLevel} (${isolationLevel})`);
		if (!Number.isInteger(isolationLevel)) throw new RangeError(`The value of "${name}" is out of range. It must be an integer. Received: ${isolationLevel}`);
		if (!(isolationLevel >= 0 && isolationLevel <= 5)) throw new RangeError(`The value of "${name}" is out of range. It must be >= 0 && <= 5. Received: ${isolationLevel}`);
	}
	var Transaction = class {
		constructor(name, isolationLevel = ISOLATION_LEVEL.NO_CHANGE) {
			this.name = name;
			this.isolationLevel = isolationLevel;
			this.outstandingRequestCount = 1;
		}
		beginPayload(txnDescriptor) {
			const buffer = new _writableTrackingBuffer.default(100, "ucs2");
			(0, _allHeaders.writeToTrackingBuffer)(buffer, txnDescriptor, this.outstandingRequestCount);
			buffer.writeUShort(OPERATION_TYPE.TM_BEGIN_XACT);
			buffer.writeUInt8(this.isolationLevel);
			buffer.writeUInt8(this.name.length * 2);
			buffer.writeString(this.name, "ucs2");
			return {
				*[Symbol.iterator]() {
					yield buffer.data;
				},
				toString: () => {
					return "Begin Transaction: name=" + this.name + ", isolationLevel=" + isolationLevelByValue[this.isolationLevel];
				}
			};
		}
		commitPayload(txnDescriptor) {
			const buffer = new _writableTrackingBuffer.default(100, "ascii");
			(0, _allHeaders.writeToTrackingBuffer)(buffer, txnDescriptor, this.outstandingRequestCount);
			buffer.writeUShort(OPERATION_TYPE.TM_COMMIT_XACT);
			buffer.writeUInt8(this.name.length * 2);
			buffer.writeString(this.name, "ucs2");
			buffer.writeUInt8(0);
			return {
				*[Symbol.iterator]() {
					yield buffer.data;
				},
				toString: () => {
					return "Commit Transaction: name=" + this.name;
				}
			};
		}
		rollbackPayload(txnDescriptor) {
			const buffer = new _writableTrackingBuffer.default(100, "ascii");
			(0, _allHeaders.writeToTrackingBuffer)(buffer, txnDescriptor, this.outstandingRequestCount);
			buffer.writeUShort(OPERATION_TYPE.TM_ROLLBACK_XACT);
			buffer.writeUInt8(this.name.length * 2);
			buffer.writeString(this.name, "ucs2");
			buffer.writeUInt8(0);
			return {
				*[Symbol.iterator]() {
					yield buffer.data;
				},
				toString: () => {
					return "Rollback Transaction: name=" + this.name;
				}
			};
		}
		savePayload(txnDescriptor) {
			const buffer = new _writableTrackingBuffer.default(100, "ascii");
			(0, _allHeaders.writeToTrackingBuffer)(buffer, txnDescriptor, this.outstandingRequestCount);
			buffer.writeUShort(OPERATION_TYPE.TM_SAVE_XACT);
			buffer.writeUInt8(this.name.length * 2);
			buffer.writeString(this.name, "ucs2");
			return {
				*[Symbol.iterator]() {
					yield buffer.data;
				},
				toString: () => {
					return "Save Transaction: name=" + this.name;
				}
			};
		}
		isolationLevelToTSQL() {
			switch (this.isolationLevel) {
				case ISOLATION_LEVEL.READ_UNCOMMITTED: return "READ UNCOMMITTED";
				case ISOLATION_LEVEL.READ_COMMITTED: return "READ COMMITTED";
				case ISOLATION_LEVEL.REPEATABLE_READ: return "REPEATABLE READ";
				case ISOLATION_LEVEL.SERIALIZABLE: return "SERIALIZABLE";
				case ISOLATION_LEVEL.SNAPSHOT: return "SNAPSHOT";
			}
			return "";
		}
	};
	exports.Transaction = Transaction;
}));
//#endregion
//#region node_modules/tedious/lib/connector.js
var require_connector = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.connectInParallel = connectInParallel;
	exports.connectInSequence = connectInSequence;
	exports.lookupAllAddresses = lookupAllAddresses;
	var _net = _interopRequireDefault(__require("net"));
	var _nodeUrl = _interopRequireDefault(__require("node:url"));
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	async function connectInParallel(options, lookup, signal) {
		signal.throwIfAborted();
		const addresses = await lookupAllAddresses(options.host, lookup, signal);
		return await new Promise((resolve, reject) => {
			const sockets = new Array(addresses.length);
			const errors = [];
			function onError(err) {
				errors.push(err);
				this.removeListener("error", onError);
				this.removeListener("connect", onConnect);
				this.destroy();
				if (errors.length === addresses.length) {
					signal.removeEventListener("abort", onAbort);
					reject(new AggregateError(errors, "Could not connect (parallel)"));
				}
			}
			function onConnect() {
				signal.removeEventListener("abort", onAbort);
				for (let j = 0; j < sockets.length; j++) {
					const socket = sockets[j];
					if (this === socket) continue;
					socket.removeListener("error", onError);
					socket.removeListener("connect", onConnect);
					socket.destroy();
				}
				resolve(this);
			}
			const onAbort = () => {
				for (let j = 0; j < sockets.length; j++) {
					const socket = sockets[j];
					socket.removeListener("error", onError);
					socket.removeListener("connect", onConnect);
					socket.destroy();
				}
				reject(signal.reason);
			};
			for (let i = 0, len = addresses.length; i < len; i++) {
				const socket = sockets[i] = _net.default.connect({
					...options,
					host: addresses[i].address,
					family: addresses[i].family
				});
				socket.on("error", onError);
				socket.on("connect", onConnect);
			}
			signal.addEventListener("abort", onAbort, { once: true });
		});
	}
	async function connectInSequence(options, lookup, signal) {
		signal.throwIfAborted();
		const errors = [];
		const addresses = await lookupAllAddresses(options.host, lookup, signal);
		for (const address of addresses) try {
			return await new Promise((resolve, reject) => {
				const socket = _net.default.connect({
					...options,
					host: address.address,
					family: address.family
				});
				const onAbort = () => {
					socket.removeListener("error", onError);
					socket.removeListener("connect", onConnect);
					socket.destroy();
					reject(signal.reason);
				};
				const onError = (err) => {
					signal.removeEventListener("abort", onAbort);
					socket.removeListener("error", onError);
					socket.removeListener("connect", onConnect);
					socket.destroy();
					reject(err);
				};
				const onConnect = () => {
					signal.removeEventListener("abort", onAbort);
					socket.removeListener("error", onError);
					socket.removeListener("connect", onConnect);
					resolve(socket);
				};
				signal.addEventListener("abort", onAbort, { once: true });
				socket.on("error", onError);
				socket.on("connect", onConnect);
			});
		} catch (err) {
			signal.throwIfAborted();
			errors.push(err);
			continue;
		}
		throw new AggregateError(errors, "Could not connect (sequence)");
	}
	/**
	* Look up all addresses for the given hostname.
	*/
	async function lookupAllAddresses(host, lookup, signal) {
		signal.throwIfAborted();
		if (_net.default.isIPv6(host)) return [{
			address: host,
			family: 6
		}];
		else if (_net.default.isIPv4(host)) return [{
			address: host,
			family: 4
		}];
		else return await new Promise((resolve, reject) => {
			const onAbort = () => {
				reject(signal.reason);
			};
			signal.addEventListener("abort", onAbort);
			const domainInASCII = _nodeUrl.default.domainToASCII(host);
			lookup(domainInASCII === "" ? host : domainInASCII, { all: true }, (err, addresses) => {
				signal.removeEventListener("abort", onAbort);
				err ? reject(err) : resolve(addresses);
			});
		});
	}
}));
//#endregion
//#region node_modules/tedious/lib/library.js
var require_library = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.name = void 0;
	exports.name = "Tedious";
}));
//#endregion
//#region node_modules/tedious/lib/ntlm.js
var require_ntlm = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.createNTLMRequest = createNTLMRequest;
	var NTLMFlags = {
		NTLM_NegotiateUnicode: 1,
		NTLM_NegotiateOEM: 2,
		NTLM_RequestTarget: 4,
		NTLM_Unknown9: 8,
		NTLM_NegotiateSign: 16,
		NTLM_NegotiateSeal: 32,
		NTLM_NegotiateDatagram: 64,
		NTLM_NegotiateLanManagerKey: 128,
		NTLM_Unknown8: 256,
		NTLM_NegotiateNTLM: 512,
		NTLM_NegotiateNTOnly: 1024,
		NTLM_Anonymous: 2048,
		NTLM_NegotiateOemDomainSupplied: 4096,
		NTLM_NegotiateOemWorkstationSupplied: 8192,
		NTLM_Unknown6: 16384,
		NTLM_NegotiateAlwaysSign: 32768,
		NTLM_TargetTypeDomain: 65536,
		NTLM_TargetTypeServer: 131072,
		NTLM_TargetTypeShare: 262144,
		NTLM_NegotiateExtendedSecurity: 524288,
		NTLM_NegotiateIdentify: 1048576,
		NTLM_Unknown5: 2097152,
		NTLM_RequestNonNTSessionKey: 4194304,
		NTLM_NegotiateTargetInfo: 8388608,
		NTLM_Unknown4: 16777216,
		NTLM_NegotiateVersion: 33554432,
		NTLM_Unknown3: 67108864,
		NTLM_Unknown2: 134217728,
		NTLM_Unknown1: 268435456,
		NTLM_Negotiate128: 536870912,
		NTLM_NegotiateKeyExchange: 1073741824,
		NTLM_Negotiate56: 2147483648
	};
	function createNTLMRequest(options) {
		const domain = escape(options.domain.toUpperCase());
		const workstation = options.workstation ? escape(options.workstation.toUpperCase()) : "";
		let type1flags = NTLMFlags.NTLM_NegotiateUnicode + NTLMFlags.NTLM_NegotiateOEM + NTLMFlags.NTLM_RequestTarget + NTLMFlags.NTLM_NegotiateNTLM + NTLMFlags.NTLM_NegotiateOemDomainSupplied + NTLMFlags.NTLM_NegotiateOemWorkstationSupplied + NTLMFlags.NTLM_NegotiateAlwaysSign + NTLMFlags.NTLM_NegotiateVersion + NTLMFlags.NTLM_NegotiateExtendedSecurity + NTLMFlags.NTLM_Negotiate128 + NTLMFlags.NTLM_Negotiate56;
		if (workstation === "") type1flags -= NTLMFlags.NTLM_NegotiateOemWorkstationSupplied;
		const fixedData = Buffer.alloc(40);
		const buffers = [fixedData];
		let offset = 0;
		offset += fixedData.write("NTLMSSP", offset, 7, "ascii");
		offset = fixedData.writeUInt8(0, offset);
		offset = fixedData.writeUInt32LE(1, offset);
		offset = fixedData.writeUInt32LE(type1flags, offset);
		offset = fixedData.writeUInt16LE(domain.length, offset);
		offset = fixedData.writeUInt16LE(domain.length, offset);
		offset = fixedData.writeUInt32LE(fixedData.length + workstation.length, offset);
		offset = fixedData.writeUInt16LE(workstation.length, offset);
		offset = fixedData.writeUInt16LE(workstation.length, offset);
		offset = fixedData.writeUInt32LE(fixedData.length, offset);
		offset = fixedData.writeUInt8(5, offset);
		offset = fixedData.writeUInt8(0, offset);
		offset = fixedData.writeUInt16LE(2195, offset);
		offset = fixedData.writeUInt8(0, offset);
		offset = fixedData.writeUInt8(0, offset);
		offset = fixedData.writeUInt8(0, offset);
		fixedData.writeUInt8(15, offset);
		buffers.push(Buffer.from(workstation, "ascii"));
		buffers.push(Buffer.from(domain, "ascii"));
		return Buffer.concat(buffers);
	}
}));
//#endregion
//#region node_modules/tedious/lib/bulk-load-payload.js
var require_bulk_load_payload = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.BulkLoadPayload = void 0;
	var BulkLoadPayload = class {
		constructor(bulkLoad) {
			this.bulkLoad = bulkLoad;
			this.iterator = this.bulkLoad.rowToPacketTransform[Symbol.asyncIterator]();
		}
		[Symbol.asyncIterator]() {
			return this.iterator;
		}
		toString(indent = "") {
			return indent + "BulkLoad";
		}
	};
	exports.BulkLoadPayload = BulkLoadPayload;
}));
//#endregion
//#region node_modules/tedious/lib/special-stored-procedure.js
var require_special_stored_procedure = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var procedures = {
		Sp_Cursor: 1,
		Sp_CursorOpen: 2,
		Sp_CursorPrepare: 3,
		Sp_CursorExecute: 4,
		Sp_CursorPrepExec: 5,
		Sp_CursorUnprepare: 6,
		Sp_CursorFetch: 7,
		Sp_CursorOption: 8,
		Sp_CursorClose: 9,
		Sp_ExecuteSql: 10,
		Sp_Prepare: 11,
		Sp_Execute: 12,
		Sp_PrepExec: 13,
		Sp_PrepExecRpc: 14,
		Sp_Unprepare: 15
	};
	exports.default = procedures;
	module.exports = procedures;
}));
//#endregion
//#region node_modules/tedious/package.json
var package_exports = /* @__PURE__ */ __exportAll({
	author: () => author,
	babel: () => babel,
	bugs: () => bugs,
	contributors: () => contributors,
	default: () => package_default,
	dependencies: () => dependencies,
	description: () => description,
	devDependencies: () => devDependencies,
	engines: () => engines,
	homepage: () => homepage,
	keywords: () => keywords,
	license: () => "MIT",
	main: () => main,
	mocha: () => mocha,
	name: () => name,
	nyc: () => nyc,
	publishConfig: () => publishConfig,
	release: () => release,
	repository: () => repository,
	scripts: () => scripts,
	types: () => types,
	version: () => version
}), author, contributors, name, description, keywords, homepage, bugs, version, main, types, repository, engines, publishConfig, release, dependencies, devDependencies, scripts, babel, mocha, nyc, package_default;
var init_package = __esmMin((() => {
	author = "Mike D Pilsbury <mike.pilsbury@gmail.com>";
	contributors = [
		"Alex Robson",
		"Arthur Schreiber",
		"Bret Copeland <bret@atlantisflight.org> (https://github.com/bretcope)",
		"Bryan Ross <bryan@rossipedia.com> (https://github.com/rossipedia)",
		"Ciaran Jessup <ciaranj@gmail.com>",
		"Cort Fritz <cfritz@caa.com>",
		"lastonesky",
		"Patrik Simek <patrik@patriksimek.cz>",
		"Phil Dodderidge <pdodde@poyntz.com>",
		"Zach Aller"
	];
	name = "tedious";
	description = "A TDS driver, for connecting to MS SQLServer databases.";
	keywords = [
		"sql",
		"database",
		"mssql",
		"sqlserver",
		"sql-server",
		"tds",
		"msnodesql",
		"azure"
	];
	homepage = "https://github.com/tediousjs/tedious";
	bugs = "https://github.com/tediousjs/tedious/issues";
	version = "20.0.0";
	main = "./lib/tedious.js";
	types = "./lib/tedious.d.ts";
	repository = {
		"type": "git",
		"url": "https://github.com/tediousjs/tedious.git"
	};
	engines = { "node": ">=22" };
	publishConfig = {
		"tag": "next",
		"provenance": true
	};
	release = { "branches": [
		"+([0-9])?(.{+([0-9]),x}).x",
		{
			"name": "master",
			"channel": "next"
		},
		{
			"name": "beta",
			"prerelease": true
		},
		{
			"name": "alpha",
			"prerelease": true
		}
	] };
	dependencies = {
		"@azure/core-auth": "^1.10.1",
		"@azure/identity": "^4.13.1",
		"@azure/keyvault-keys": "^4.10.2",
		"@js-joda/core": "^6.0.1",
		"@types/node": ">=22",
		"bl": "^6.1.4",
		"iconv-lite": "^0.7.0",
		"js-md4": "^0.3.2",
		"native-duplexpair": "^1.0.0",
		"sprintf-js": "^1.1.3"
	};
	devDependencies = {
		"@babel/cli": "^7.28.3",
		"@babel/core": "^7.28.5",
		"@babel/node": "^7.28.0",
		"@babel/preset-env": "^7.28.5",
		"@babel/preset-typescript": "^7.28.5",
		"@babel/register": "^7.28.3",
		"@stylistic/eslint-plugin": "^5.5.0",
		"@types/async": "^3.2.25",
		"@types/chai": "^4.3.20",
		"@types/depd": "^1.1.37",
		"@types/lru-cache": "^5.1.1",
		"@types/mitm": "^1.3.8",
		"@types/mocha": "^10.0.10",
		"@types/sinon": "^21.0.0",
		"@types/sprintf-js": "^1.1.4",
		"@typescript-eslint/eslint-plugin": "^8.46.3",
		"@typescript-eslint/parser": "^8.46.3",
		"async": "^3.2.6",
		"babel-plugin-istanbul": "^8.0.0",
		"chai": "^4.5.0",
		"eslint": "^9.39.1",
		"mitm": "^1.7.3",
		"mocha": "^11.7.5",
		"nyc": "^18.0.0",
		"rimraf": "^6.1.3",
		"semantic-release": "^25.0.5",
		"sinon": "^22.0.0",
		"typedoc": "^0.28.14",
		"typescript": "^6.0.3"
	};
	scripts = {
		"docs": "typedoc",
		"lint": "eslint src test --ext .js,.ts && tsc",
		"test": "mocha --forbid-only test/unit test/unit/token test/unit/tracking-buffer",
		"test-integration": "mocha --forbid-only test/integration/",
		"test-all": "mocha --forbid-only test/unit/ test/unit/token/ test/unit/tracking-buffer test/integration/",
		"build:types": "tsc --project tsconfig.build-types.json",
		"build": "rimraf lib && babel src --out-dir lib --extensions .js,.ts && npm run build:types",
		"prepublish": "npm run build",
		"semantic-release": "semantic-release"
	};
	babel = {
		"sourceMaps": "both",
		"ignore": ["./src/**/*.d.ts"],
		"presets": [["@babel/preset-env", { "targets": { "node": 22 } }], ["@babel/preset-typescript", { "allowDeclareFields": true }]],
		"plugins": [["@babel/transform-typescript", { "allowDeclareFields": true }]]
	};
	mocha = {
		"require": "test/setup.js",
		"timeout": 1e4,
		"extension": ["js", "ts"]
	};
	nyc = {
		"sourceMap": false,
		"instrument": false,
		"extension": [".ts"]
	};
	package_default = {
		author,
		contributors,
		name,
		description,
		keywords,
		homepage,
		bugs,
		license: "MIT",
		version,
		main,
		types,
		repository,
		engines,
		publishConfig,
		release,
		dependencies,
		devDependencies,
		scripts,
		babel,
		mocha,
		nyc
	};
}));
//#endregion
//#region node_modules/tedious/lib/token/handler.js
var require_handler = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.UnexpectedTokenError = exports.TokenHandler = exports.RequestTokenHandler = exports.Login7TokenHandler = exports.InitialSqlTokenHandler = exports.AttentionTokenHandler = void 0;
	var _request = _interopRequireDefault(require_request$1());
	var _errors = require_errors();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	var UnexpectedTokenError = class extends Error {
		constructor(handler, token) {
			super("Unexpected token `" + token.name + "` in `" + handler.constructor.name + "`");
		}
	};
	exports.UnexpectedTokenError = UnexpectedTokenError;
	var TokenHandler = class {
		onInfoMessage(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onErrorMessage(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onSSPI(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onDatabaseChange(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onLanguageChange(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onCharsetChange(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onSqlCollationChange(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onRoutingChange(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onPacketSizeChange(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onResetConnection(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onBeginTransaction(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onCommitTransaction(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onRollbackTransaction(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onFedAuthInfo(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onFeatureExtAck(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onLoginAck(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onColMetadata(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onOrder(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onRow(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onReturnStatus(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onReturnValue(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onDoneProc(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onDoneInProc(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onDone(token) {
			throw new UnexpectedTokenError(this, token);
		}
		onDatabaseMirroringPartner(token) {
			throw new UnexpectedTokenError(this, token);
		}
	};
	/**
	* A handler for tokens received in the response message to the initial SQL Batch request
	* that sets up different connection settings.
	*/
	exports.TokenHandler = TokenHandler;
	var InitialSqlTokenHandler = class extends TokenHandler {
		constructor(connection) {
			super();
			this.connection = connection;
		}
		onInfoMessage(token) {
			this.connection.emit("infoMessage", token);
		}
		onErrorMessage(token) {
			this.connection.emit("errorMessage", token);
		}
		onDatabaseChange(token) {
			this.connection.emit("databaseChange", token.newValue);
		}
		onLanguageChange(token) {
			this.connection.emit("languageChange", token.newValue);
		}
		onCharsetChange(token) {
			this.connection.emit("charsetChange", token.newValue);
		}
		onSqlCollationChange(token) {
			this.connection.databaseCollation = token.newValue;
		}
		onPacketSizeChange(token) {
			this.connection.messageIo.packetSize(token.newValue);
		}
		onBeginTransaction(token) {
			this.connection.transactionDescriptors.push(token.newValue);
			this.connection.inTransaction = true;
		}
		onCommitTransaction(token) {
			this.connection.transactionDescriptors.length = 1;
			this.connection.inTransaction = false;
		}
		onRollbackTransaction(token) {
			this.connection.transactionDescriptors.length = 1;
			this.connection.inTransaction = false;
			this.connection.emit("rollbackTransaction");
		}
		onColMetadata(token) {
			this.connection.emit("error", /* @__PURE__ */ new Error("Received 'columnMetadata' when no sqlRequest is in progress"));
			this.connection.close();
		}
		onOrder(token) {
			this.connection.emit("error", /* @__PURE__ */ new Error("Received 'order' when no sqlRequest is in progress"));
			this.connection.close();
		}
		onRow(token) {
			this.connection.emit("error", /* @__PURE__ */ new Error("Received 'row' when no sqlRequest is in progress"));
			this.connection.close();
		}
		onReturnStatus(token) {}
		onReturnValue(token) {}
		onDoneProc(token) {}
		onDoneInProc(token) {}
		onDone(token) {}
		onResetConnection(token) {
			this.connection.emit("resetConnection");
		}
	};
	/**
	* A handler for tokens received in the response message to a Login7 message.
	*/
	exports.InitialSqlTokenHandler = InitialSqlTokenHandler;
	var Login7TokenHandler = class extends TokenHandler {
		constructor(connection) {
			super();
			this.loginAckReceived = false;
			this.connection = connection;
		}
		onInfoMessage(token) {
			this.connection.emit("infoMessage", token);
		}
		onErrorMessage(token) {
			this.connection.emit("errorMessage", token);
			const error = new _errors.ConnectionError(token.message, "ELOGIN");
			if (this.connection.transientErrorLookup.isTransientError(token.number) && this.connection.curTransientRetryCount !== this.connection.config.options.maxRetriesOnTransientErrors) error.isTransient = true;
			this.connection.loginError = error;
		}
		onSSPI(token) {
			if (token.ntlmpacket) {
				this.connection.ntlmpacket = token.ntlmpacket;
				this.connection.ntlmpacketBuffer = token.ntlmpacketBuffer;
			}
		}
		onDatabaseChange(token) {
			this.connection.emit("databaseChange", token.newValue);
		}
		onDatabaseMirroringPartner(token) {
			this.connection.emit("databaseMirroringPartner", token.newValue);
		}
		onLanguageChange(token) {
			this.connection.emit("languageChange", token.newValue);
		}
		onCharsetChange(token) {
			this.connection.emit("charsetChange", token.newValue);
		}
		onSqlCollationChange(token) {
			this.connection.databaseCollation = token.newValue;
		}
		onFedAuthInfo(token) {
			this.fedAuthInfoToken = token;
		}
		onFeatureExtAck(token) {
			const { authentication } = this.connection.config;
			if (authentication.type === "azure-active-directory-password" || authentication.type === "azure-active-directory-access-token" || authentication.type === "azure-active-directory-msi-vm" || authentication.type === "azure-active-directory-msi-app-service" || authentication.type === "azure-active-directory-service-principal-secret" || authentication.type === "azure-active-directory-default") {
				if (token.fedAuth === void 0) this.connection.loginError = new _errors.ConnectionError("Did not receive Active Directory authentication acknowledgement");
				else if (token.fedAuth.length !== 0) this.connection.loginError = new _errors.ConnectionError(`Active Directory authentication acknowledgment for ${authentication.type} authentication method includes extra data`);
			} else if (token.fedAuth === void 0 && token.utf8Support === void 0) this.connection.loginError = new _errors.ConnectionError("Received acknowledgement for unknown feature");
			else if (token.fedAuth) this.connection.loginError = new _errors.ConnectionError("Did not request Active Directory authentication, but received the acknowledgment");
		}
		onLoginAck(token) {
			if (!token.tdsVersion) {
				this.connection.loginError = new _errors.ConnectionError("Server responded with unknown TDS version.", "ETDS");
				return;
			}
			if (!token.interface) {
				this.connection.loginError = new _errors.ConnectionError("Server responded with unsupported interface.", "EINTERFACENOTSUPP");
				return;
			}
			this.connection.config.options.tdsVersion = token.tdsVersion;
			this.loginAckReceived = true;
		}
		onRoutingChange(token) {
			const [server, instance] = token.newValue.server.split("\\");
			this.routingData = {
				server,
				port: token.newValue.port,
				instance
			};
		}
		onDoneInProc(token) {}
		onDone(token) {}
		onPacketSizeChange(token) {
			this.connection.messageIo.packetSize(token.newValue);
		}
	};
	/**
	* A handler for tokens received in the response message to a RPC Request,
	* a SQL Batch Request, a Bulk Load BCP Request or a Transaction Manager Request.
	*/
	exports.Login7TokenHandler = Login7TokenHandler;
	var RequestTokenHandler = class extends TokenHandler {
		constructor(connection, request) {
			super();
			this.connection = connection;
			this.request = request;
			this.errors = [];
		}
		onInfoMessage(token) {
			this.connection.emit("infoMessage", token);
		}
		onErrorMessage(token) {
			this.connection.emit("errorMessage", token);
			if (!this.request.canceled) {
				const error = new _errors.RequestError(token.message, "EREQUEST");
				error.number = token.number;
				error.state = token.state;
				error.class = token.class;
				error.serverName = token.serverName;
				error.procName = token.procName;
				error.lineNumber = token.lineNumber;
				this.errors.push(error);
				this.request.error = error;
				if (this.request instanceof _request.default && this.errors.length > 1) this.request.error = new AggregateError(this.errors);
			}
		}
		onDatabaseChange(token) {
			this.connection.emit("databaseChange", token.newValue);
		}
		onLanguageChange(token) {
			this.connection.emit("languageChange", token.newValue);
		}
		onCharsetChange(token) {
			this.connection.emit("charsetChange", token.newValue);
		}
		onSqlCollationChange(token) {
			this.connection.databaseCollation = token.newValue;
		}
		onPacketSizeChange(token) {
			this.connection.messageIo.packetSize(token.newValue);
		}
		onBeginTransaction(token) {
			this.connection.transactionDescriptors.push(token.newValue);
			this.connection.inTransaction = true;
		}
		onCommitTransaction(token) {
			this.connection.transactionDescriptors.length = 1;
			this.connection.inTransaction = false;
		}
		onRollbackTransaction(token) {
			this.connection.transactionDescriptors.length = 1;
			this.connection.inTransaction = false;
			this.connection.emit("rollbackTransaction");
		}
		onColMetadata(token) {
			if (!this.request.canceled) if (this.connection.config.options.useColumnNames) {
				const columns = Object.create(null);
				for (let j = 0, len = token.columns.length; j < len; j++) {
					const col = token.columns[j];
					if (columns[col.colName] == null) columns[col.colName] = col;
				}
				this.request.emit("columnMetadata", columns);
			} else this.request.emit("columnMetadata", token.columns);
		}
		onOrder(token) {
			if (!this.request.canceled) this.request.emit("order", token.orderColumns);
		}
		onRow(token) {
			if (!this.request.canceled) {
				if (this.connection.config.options.rowCollectionOnRequestCompletion) this.request.rows.push(token.columns);
				if (this.connection.config.options.rowCollectionOnDone) this.request.rst.push(token.columns);
				this.request.emit("row", token.columns);
			}
		}
		onReturnStatus(token) {
			if (!this.request.canceled) this.connection.procReturnStatusValue = token.value;
		}
		onReturnValue(token) {
			if (!this.request.canceled) this.request.emit("returnValue", token.paramName, token.value, token.metadata);
		}
		onDoneProc(token) {
			if (!this.request.canceled) {
				if (token.sqlError && !this.request.error) this.request.error = new _errors.RequestError("An unknown error has occurred.", "UNKNOWN");
				this.request.emit("doneProc", token.rowCount, token.more, this.connection.procReturnStatusValue, this.request.rst);
				this.connection.procReturnStatusValue = void 0;
				if (token.rowCount !== void 0) this.request.rowCount += token.rowCount;
				if (this.connection.config.options.rowCollectionOnDone) this.request.rst = [];
			}
		}
		onDoneInProc(token) {
			if (!this.request.canceled) {
				this.request.emit("doneInProc", token.rowCount, token.more, this.request.rst);
				if (token.rowCount !== void 0) this.request.rowCount += token.rowCount;
				if (this.connection.config.options.rowCollectionOnDone) this.request.rst = [];
			}
		}
		onDone(token) {
			if (!this.request.canceled) {
				if (token.sqlError && !this.request.error) this.request.error = new _errors.RequestError("An unknown error has occurred.", "UNKNOWN");
				this.request.emit("done", token.rowCount, token.more, this.request.rst);
				if (token.rowCount !== void 0) this.request.rowCount += token.rowCount;
				if (this.connection.config.options.rowCollectionOnDone) this.request.rst = [];
			}
		}
		onResetConnection(token) {
			this.connection.emit("resetConnection");
		}
	};
	/**
	* A handler for the attention acknowledgement message.
	*
	* This message only contains a `DONE` token that acknowledges
	* that the attention message was received by the server.
	*/
	exports.RequestTokenHandler = RequestTokenHandler;
	var AttentionTokenHandler = class extends TokenHandler {
		/**
		* Returns whether an attention acknowledgement was received.
		*/
		constructor(connection, request) {
			super();
			this.connection = connection;
			this.request = request;
			this.attentionReceived = false;
		}
		onDone(token) {
			if (token.attention) this.attentionReceived = true;
		}
	};
	exports.AttentionTokenHandler = AttentionTokenHandler;
}));
//#endregion
//#region node_modules/tedious/lib/connection.js
var require_connection = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = void 0;
	var _crypto = _interopRequireDefault(__require("crypto"));
	var _os = _interopRequireDefault(__require("os"));
	var tls = _interopRequireWildcard(__require("tls"));
	var net = _interopRequireWildcard(__require("net"));
	var _dns = _interopRequireDefault(__require("dns"));
	var _constants = _interopRequireDefault(__require("constants"));
	var _stream = __require("stream");
	var _identity = require_commonjs();
	var _coreAuth = require_commonjs$1();
	var _bulkLoad = _interopRequireDefault(require_bulk_load());
	var _debug = _interopRequireDefault(require_debug());
	var _events = __require("events");
	var _instanceLookup = require_instance_lookup();
	var _transientErrorLookup = require_transient_error_lookup();
	var _packet = require_packet();
	var _preloginPayload = _interopRequireDefault(require_prelogin_payload());
	var _login7Payload = _interopRequireDefault(require_login7_payload());
	var _ntlmPayload = _interopRequireDefault(require_ntlm_payload());
	var _request = _interopRequireDefault(require_request$1());
	var _rpcrequestPayload = _interopRequireDefault(require_rpcrequest_payload());
	var _sqlbatchPayload = _interopRequireDefault(require_sqlbatch_payload());
	var _messageIo = _interopRequireDefault(require_message_io());
	var _tokenStreamParser = require_token_stream_parser();
	var _transaction = require_transaction$1();
	var _errors = require_errors();
	var _connector = require_connector();
	var _library = require_library();
	var _tdsVersions = require_tds_versions();
	var _message = _interopRequireDefault(require_message());
	var _ntlm = require_ntlm();
	var _dataType = require_data_type();
	var _bulkLoadPayload = require_bulk_load_payload();
	var _specialStoredProcedure = _interopRequireDefault(require_special_stored_procedure());
	var _package = (init_package(), __toCommonJS(package_exports).default);
	var _url = __require("url");
	var _handler = require_handler();
	function _interopRequireWildcard(e, t) {
		if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
		return (_interopRequireWildcard = function(e, t) {
			if (!t && e && e.__esModule) return e;
			var o, i, f = {
				__proto__: null,
				default: e
			};
			if (null === e || "object" != typeof e && "function" != typeof e) return f;
			if (o = t ? n : r) {
				if (o.has(e)) return o.get(e);
				o.set(e, f);
			}
			for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
			return f;
		})(e, t);
	}
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	/**
	* @private
	*/
	var KEEP_ALIVE_INITIAL_DELAY = 3e4;
	/**
	* @private
	*/
	var DEFAULT_CONNECT_TIMEOUT = 15e3;
	/**
	* @private
	*/
	var DEFAULT_CLIENT_REQUEST_TIMEOUT = 15e3;
	/**
	* @private
	*/
	var DEFAULT_CANCEL_TIMEOUT = 5e3;
	/**
	* @private
	*/
	var DEFAULT_CONNECT_RETRY_INTERVAL = 500;
	/**
	* @private
	*/
	var DEFAULT_PACKET_SIZE = 4096;
	/**
	* @private
	*/
	var DEFAULT_TEXTSIZE = 2147483647;
	/**
	* @private
	*/
	var DEFAULT_DATEFIRST = 7;
	/**
	* @private
	*/
	var DEFAULT_PORT = 1433;
	/**
	* @private
	*/
	var DEFAULT_TDS_VERSION = "7_4";
	/**
	* @private
	*/
	var DEFAULT_LANGUAGE = "us_english";
	/**
	* @private
	*/
	var DEFAULT_DATEFORMAT = "mdy";
	/** Structure that defines the options that are necessary to authenticate the Tedious.JS instance with an `@azure/identity` token credential. */
	/**
	* @private
	*/
	/**
	* Helper function, equivalent to `Promise.withResolvers()`.
	*
	* @returns An object with the properties `promise`, `resolve`, and `reject`.
	*/
	function withResolvers() {
		let resolve;
		let reject;
		return {
			promise: new Promise((res, rej) => {
				resolve = res;
				reject = rej;
			}),
			resolve,
			reject
		};
	}
	/**
	* A [[Connection]] instance represents a single connection to a database server.
	*
	* ```js
	* var Connection = require('tedious').Connection;
	* var config = {
	*  "authentication": {
	*    ...,
	*    "options": {...}
	*  },
	*  "options": {...}
	* };
	* var connection = new Connection(config);
	* ```
	*
	* Only one request at a time may be executed on a connection. Once a [[Request]]
	* has been initiated (with [[Connection.callProcedure]], [[Connection.execSql]],
	* or [[Connection.execSqlBatch]]), another should not be initiated until the
	* [[Request]]'s completion callback is called.
	*/
	var Connection = class extends _events.EventEmitter {
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* Whether an attention message was sent to the server to cancel the
		* currently active request.
		*
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* Note: be aware of the different options field:
		* 1. config.authentication.options
		* 2. config.options
		*
		* ```js
		* const { Connection } = require('tedious');
		*
		* const config = {
		*  "authentication": {
		*    ...,
		*    "options": {...}
		*  },
		*  "options": {...}
		* };
		*
		* const connection = new Connection(config);
		* ```
		*
		* @param config
		*/
		constructor(config) {
			super();
			if (typeof config !== "object" || config === null) throw new TypeError("The \"config\" argument is required and must be of type Object.");
			if (typeof config.server !== "string") throw new TypeError("The \"config.server\" property is required and must be of type string.");
			this.fedAuthRequired = false;
			let authentication;
			if (config.authentication !== void 0) {
				if (typeof config.authentication !== "object" || config.authentication === null) throw new TypeError("The \"config.authentication\" property must be of type Object.");
				const type = config.authentication.type;
				const options = config.authentication.options === void 0 ? {} : config.authentication.options;
				if (typeof type !== "string") throw new TypeError("The \"config.authentication.type\" property must be of type string.");
				if (type !== "default" && type !== "ntlm" && type !== "token-credential" && type !== "azure-active-directory-password" && type !== "azure-active-directory-access-token" && type !== "azure-active-directory-msi-vm" && type !== "azure-active-directory-msi-app-service" && type !== "azure-active-directory-service-principal-secret" && type !== "azure-active-directory-default") throw new TypeError("The \"type\" property must one of \"default\", \"ntlm\", \"token-credential\", \"azure-active-directory-password\", \"azure-active-directory-access-token\", \"azure-active-directory-default\", \"azure-active-directory-msi-vm\" or \"azure-active-directory-msi-app-service\" or \"azure-active-directory-service-principal-secret\".");
				if (typeof options !== "object" || options === null) throw new TypeError("The \"config.authentication.options\" property must be of type object.");
				if (type === "ntlm") {
					if (typeof options.domain !== "string") throw new TypeError("The \"config.authentication.options.domain\" property must be of type string.");
					if (options.userName !== void 0 && typeof options.userName !== "string") throw new TypeError("The \"config.authentication.options.userName\" property must be of type string.");
					if (options.password !== void 0 && typeof options.password !== "string") throw new TypeError("The \"config.authentication.options.password\" property must be of type string.");
					authentication = {
						type: "ntlm",
						options: {
							userName: options.userName,
							password: options.password,
							domain: options.domain && options.domain.toUpperCase()
						}
					};
				} else if (type === "token-credential") {
					if (!(0, _coreAuth.isTokenCredential)(options.credential)) throw new TypeError("The \"config.authentication.options.credential\" property must be an instance of the token credential class.");
					authentication = {
						type: "token-credential",
						options: { credential: options.credential }
					};
				} else if (type === "azure-active-directory-password") {
					if (typeof options.clientId !== "string") throw new TypeError("The \"config.authentication.options.clientId\" property must be of type string.");
					if (options.userName !== void 0 && typeof options.userName !== "string") throw new TypeError("The \"config.authentication.options.userName\" property must be of type string.");
					if (options.password !== void 0 && typeof options.password !== "string") throw new TypeError("The \"config.authentication.options.password\" property must be of type string.");
					if (options.tenantId !== void 0 && typeof options.tenantId !== "string") throw new TypeError("The \"config.authentication.options.tenantId\" property must be of type string.");
					authentication = {
						type: "azure-active-directory-password",
						options: {
							userName: options.userName,
							password: options.password,
							tenantId: options.tenantId,
							clientId: options.clientId
						}
					};
				} else if (type === "azure-active-directory-access-token") {
					if (typeof options.token !== "string") throw new TypeError("The \"config.authentication.options.token\" property must be of type string.");
					authentication = {
						type: "azure-active-directory-access-token",
						options: { token: options.token }
					};
				} else if (type === "azure-active-directory-msi-vm") {
					if (options.clientId !== void 0 && typeof options.clientId !== "string") throw new TypeError("The \"config.authentication.options.clientId\" property must be of type string.");
					authentication = {
						type: "azure-active-directory-msi-vm",
						options: { clientId: options.clientId }
					};
				} else if (type === "azure-active-directory-default") {
					if (options.clientId !== void 0 && typeof options.clientId !== "string") throw new TypeError("The \"config.authentication.options.clientId\" property must be of type string.");
					authentication = {
						type: "azure-active-directory-default",
						options: { clientId: options.clientId }
					};
				} else if (type === "azure-active-directory-msi-app-service") {
					if (options.clientId !== void 0 && typeof options.clientId !== "string") throw new TypeError("The \"config.authentication.options.clientId\" property must be of type string.");
					authentication = {
						type: "azure-active-directory-msi-app-service",
						options: { clientId: options.clientId }
					};
				} else if (type === "azure-active-directory-service-principal-secret") {
					if (typeof options.clientId !== "string") throw new TypeError("The \"config.authentication.options.clientId\" property must be of type string.");
					if (typeof options.clientSecret !== "string") throw new TypeError("The \"config.authentication.options.clientSecret\" property must be of type string.");
					if (typeof options.tenantId !== "string") throw new TypeError("The \"config.authentication.options.tenantId\" property must be of type string.");
					authentication = {
						type: "azure-active-directory-service-principal-secret",
						options: {
							clientId: options.clientId,
							clientSecret: options.clientSecret,
							tenantId: options.tenantId
						}
					};
				} else {
					if (options.userName !== void 0 && typeof options.userName !== "string") throw new TypeError("The \"config.authentication.options.userName\" property must be of type string.");
					if (options.password !== void 0 && typeof options.password !== "string") throw new TypeError("The \"config.authentication.options.password\" property must be of type string.");
					authentication = {
						type: "default",
						options: {
							userName: options.userName,
							password: options.password
						}
					};
				}
			} else authentication = {
				type: "default",
				options: {
					userName: void 0,
					password: void 0
				}
			};
			this.config = {
				server: config.server,
				authentication,
				options: {
					abortTransactionOnError: false,
					appName: void 0,
					camelCaseColumns: false,
					cancelTimeout: DEFAULT_CANCEL_TIMEOUT,
					columnEncryptionKeyCacheTTL: 72e5,
					columnEncryptionSetting: false,
					columnNameReplacer: void 0,
					connectionRetryInterval: DEFAULT_CONNECT_RETRY_INTERVAL,
					connectTimeout: DEFAULT_CONNECT_TIMEOUT,
					connector: void 0,
					connectionIsolationLevel: _transaction.ISOLATION_LEVEL.READ_COMMITTED,
					cryptoCredentialsDetails: {},
					database: void 0,
					datefirst: DEFAULT_DATEFIRST,
					dateFormat: DEFAULT_DATEFORMAT,
					debug: {
						data: false,
						packet: false,
						payload: false,
						token: false
					},
					enableAnsiNull: true,
					enableAnsiNullDefault: true,
					enableAnsiPadding: true,
					enableAnsiWarnings: true,
					enableArithAbort: true,
					enableConcatNullYieldsNull: true,
					enableCursorCloseOnCommit: null,
					enableImplicitTransactions: false,
					enableNumericRoundabort: false,
					enableQuotedIdentifier: true,
					encrypt: true,
					fallbackToDefaultDb: false,
					encryptionKeyStoreProviders: void 0,
					instanceName: void 0,
					isolationLevel: _transaction.ISOLATION_LEVEL.READ_COMMITTED,
					language: DEFAULT_LANGUAGE,
					localAddress: void 0,
					maxRetriesOnTransientErrors: 3,
					multiSubnetFailover: false,
					packetSize: DEFAULT_PACKET_SIZE,
					port: DEFAULT_PORT,
					readOnlyIntent: false,
					requestTimeout: DEFAULT_CLIENT_REQUEST_TIMEOUT,
					rowCollectionOnDone: false,
					rowCollectionOnRequestCompletion: false,
					serverName: void 0,
					serverSupportsColumnEncryption: false,
					tdsVersion: DEFAULT_TDS_VERSION,
					textsize: DEFAULT_TEXTSIZE,
					trustedServerNameAE: void 0,
					trustServerCertificate: false,
					useColumnNames: false,
					useUTC: true,
					workstationId: void 0,
					lowerCaseGuids: false
				}
			};
			if (config.options) {
				if (config.options.port && config.options.instanceName) throw new Error("Port and instanceName are mutually exclusive, but " + config.options.port + " and " + config.options.instanceName + " provided");
				if (config.options.abortTransactionOnError !== void 0) {
					if (typeof config.options.abortTransactionOnError !== "boolean" && config.options.abortTransactionOnError !== null) throw new TypeError("The \"config.options.abortTransactionOnError\" property must be of type string or null.");
					this.config.options.abortTransactionOnError = config.options.abortTransactionOnError;
				}
				if (config.options.appName !== void 0) {
					if (typeof config.options.appName !== "string") throw new TypeError("The \"config.options.appName\" property must be of type string.");
					this.config.options.appName = config.options.appName;
				}
				if (config.options.camelCaseColumns !== void 0) {
					if (typeof config.options.camelCaseColumns !== "boolean") throw new TypeError("The \"config.options.camelCaseColumns\" property must be of type boolean.");
					this.config.options.camelCaseColumns = config.options.camelCaseColumns;
				}
				if (config.options.cancelTimeout !== void 0) {
					if (typeof config.options.cancelTimeout !== "number") throw new TypeError("The \"config.options.cancelTimeout\" property must be of type number.");
					this.config.options.cancelTimeout = config.options.cancelTimeout;
				}
				if (config.options.columnNameReplacer) {
					if (typeof config.options.columnNameReplacer !== "function") throw new TypeError("The \"config.options.cancelTimeout\" property must be of type function.");
					this.config.options.columnNameReplacer = config.options.columnNameReplacer;
				}
				if (config.options.connectionIsolationLevel !== void 0) {
					(0, _transaction.assertValidIsolationLevel)(config.options.connectionIsolationLevel, "config.options.connectionIsolationLevel");
					this.config.options.connectionIsolationLevel = config.options.connectionIsolationLevel;
				}
				if (config.options.connectTimeout !== void 0) {
					if (typeof config.options.connectTimeout !== "number") throw new TypeError("The \"config.options.connectTimeout\" property must be of type number.");
					this.config.options.connectTimeout = config.options.connectTimeout;
				}
				if (config.options.connector !== void 0) {
					if (typeof config.options.connector !== "function") throw new TypeError("The \"config.options.connector\" property must be a function.");
					this.config.options.connector = config.options.connector;
				}
				if (config.options.cryptoCredentialsDetails !== void 0) {
					if (typeof config.options.cryptoCredentialsDetails !== "object" || config.options.cryptoCredentialsDetails === null) throw new TypeError("The \"config.options.cryptoCredentialsDetails\" property must be of type Object.");
					this.config.options.cryptoCredentialsDetails = config.options.cryptoCredentialsDetails;
				}
				if (config.options.database !== void 0) {
					if (typeof config.options.database !== "string") throw new TypeError("The \"config.options.database\" property must be of type string.");
					this.config.options.database = config.options.database;
				}
				if (config.options.datefirst !== void 0) {
					if (typeof config.options.datefirst !== "number" && config.options.datefirst !== null) throw new TypeError("The \"config.options.datefirst\" property must be of type number.");
					if (config.options.datefirst !== null && (config.options.datefirst < 1 || config.options.datefirst > 7)) throw new RangeError("The \"config.options.datefirst\" property must be >= 1 and <= 7");
					this.config.options.datefirst = config.options.datefirst;
				}
				if (config.options.dateFormat !== void 0) {
					if (typeof config.options.dateFormat !== "string" && config.options.dateFormat !== null) throw new TypeError("The \"config.options.dateFormat\" property must be of type string or null.");
					this.config.options.dateFormat = config.options.dateFormat;
				}
				if (config.options.debug) {
					if (config.options.debug.data !== void 0) {
						if (typeof config.options.debug.data !== "boolean") throw new TypeError("The \"config.options.debug.data\" property must be of type boolean.");
						this.config.options.debug.data = config.options.debug.data;
					}
					if (config.options.debug.packet !== void 0) {
						if (typeof config.options.debug.packet !== "boolean") throw new TypeError("The \"config.options.debug.packet\" property must be of type boolean.");
						this.config.options.debug.packet = config.options.debug.packet;
					}
					if (config.options.debug.payload !== void 0) {
						if (typeof config.options.debug.payload !== "boolean") throw new TypeError("The \"config.options.debug.payload\" property must be of type boolean.");
						this.config.options.debug.payload = config.options.debug.payload;
					}
					if (config.options.debug.token !== void 0) {
						if (typeof config.options.debug.token !== "boolean") throw new TypeError("The \"config.options.debug.token\" property must be of type boolean.");
						this.config.options.debug.token = config.options.debug.token;
					}
				}
				if (config.options.enableAnsiNull !== void 0) {
					if (typeof config.options.enableAnsiNull !== "boolean" && config.options.enableAnsiNull !== null) throw new TypeError("The \"config.options.enableAnsiNull\" property must be of type boolean or null.");
					this.config.options.enableAnsiNull = config.options.enableAnsiNull;
				}
				if (config.options.enableAnsiNullDefault !== void 0) {
					if (typeof config.options.enableAnsiNullDefault !== "boolean" && config.options.enableAnsiNullDefault !== null) throw new TypeError("The \"config.options.enableAnsiNullDefault\" property must be of type boolean or null.");
					this.config.options.enableAnsiNullDefault = config.options.enableAnsiNullDefault;
				}
				if (config.options.enableAnsiPadding !== void 0) {
					if (typeof config.options.enableAnsiPadding !== "boolean" && config.options.enableAnsiPadding !== null) throw new TypeError("The \"config.options.enableAnsiPadding\" property must be of type boolean or null.");
					this.config.options.enableAnsiPadding = config.options.enableAnsiPadding;
				}
				if (config.options.enableAnsiWarnings !== void 0) {
					if (typeof config.options.enableAnsiWarnings !== "boolean" && config.options.enableAnsiWarnings !== null) throw new TypeError("The \"config.options.enableAnsiWarnings\" property must be of type boolean or null.");
					this.config.options.enableAnsiWarnings = config.options.enableAnsiWarnings;
				}
				if (config.options.enableArithAbort !== void 0) {
					if (typeof config.options.enableArithAbort !== "boolean" && config.options.enableArithAbort !== null) throw new TypeError("The \"config.options.enableArithAbort\" property must be of type boolean or null.");
					this.config.options.enableArithAbort = config.options.enableArithAbort;
				}
				if (config.options.enableConcatNullYieldsNull !== void 0) {
					if (typeof config.options.enableConcatNullYieldsNull !== "boolean" && config.options.enableConcatNullYieldsNull !== null) throw new TypeError("The \"config.options.enableConcatNullYieldsNull\" property must be of type boolean or null.");
					this.config.options.enableConcatNullYieldsNull = config.options.enableConcatNullYieldsNull;
				}
				if (config.options.enableCursorCloseOnCommit !== void 0) {
					if (typeof config.options.enableCursorCloseOnCommit !== "boolean" && config.options.enableCursorCloseOnCommit !== null) throw new TypeError("The \"config.options.enableCursorCloseOnCommit\" property must be of type boolean or null.");
					this.config.options.enableCursorCloseOnCommit = config.options.enableCursorCloseOnCommit;
				}
				if (config.options.enableImplicitTransactions !== void 0) {
					if (typeof config.options.enableImplicitTransactions !== "boolean" && config.options.enableImplicitTransactions !== null) throw new TypeError("The \"config.options.enableImplicitTransactions\" property must be of type boolean or null.");
					this.config.options.enableImplicitTransactions = config.options.enableImplicitTransactions;
				}
				if (config.options.enableNumericRoundabort !== void 0) {
					if (typeof config.options.enableNumericRoundabort !== "boolean" && config.options.enableNumericRoundabort !== null) throw new TypeError("The \"config.options.enableNumericRoundabort\" property must be of type boolean or null.");
					this.config.options.enableNumericRoundabort = config.options.enableNumericRoundabort;
				}
				if (config.options.enableQuotedIdentifier !== void 0) {
					if (typeof config.options.enableQuotedIdentifier !== "boolean" && config.options.enableQuotedIdentifier !== null) throw new TypeError("The \"config.options.enableQuotedIdentifier\" property must be of type boolean or null.");
					this.config.options.enableQuotedIdentifier = config.options.enableQuotedIdentifier;
				}
				if (config.options.encrypt !== void 0) {
					if (typeof config.options.encrypt !== "boolean") {
						if (config.options.encrypt !== "strict") throw new TypeError("The \"encrypt\" property must be set to \"strict\", or of type boolean.");
					}
					this.config.options.encrypt = config.options.encrypt;
				}
				if (config.options.fallbackToDefaultDb !== void 0) {
					if (typeof config.options.fallbackToDefaultDb !== "boolean") throw new TypeError("The \"config.options.fallbackToDefaultDb\" property must be of type boolean.");
					this.config.options.fallbackToDefaultDb = config.options.fallbackToDefaultDb;
				}
				if (config.options.instanceName !== void 0) {
					if (typeof config.options.instanceName !== "string") throw new TypeError("The \"config.options.instanceName\" property must be of type string.");
					this.config.options.instanceName = config.options.instanceName;
					this.config.options.port = void 0;
				}
				if (config.options.isolationLevel !== void 0) {
					(0, _transaction.assertValidIsolationLevel)(config.options.isolationLevel, "config.options.isolationLevel");
					this.config.options.isolationLevel = config.options.isolationLevel;
				}
				if (config.options.language !== void 0) {
					if (typeof config.options.language !== "string" && config.options.language !== null) throw new TypeError("The \"config.options.language\" property must be of type string or null.");
					this.config.options.language = config.options.language;
				}
				if (config.options.localAddress !== void 0) {
					if (typeof config.options.localAddress !== "string") throw new TypeError("The \"config.options.localAddress\" property must be of type string.");
					this.config.options.localAddress = config.options.localAddress;
				}
				if (config.options.multiSubnetFailover !== void 0) {
					if (typeof config.options.multiSubnetFailover !== "boolean") throw new TypeError("The \"config.options.multiSubnetFailover\" property must be of type boolean.");
					this.config.options.multiSubnetFailover = config.options.multiSubnetFailover;
				}
				if (config.options.packetSize !== void 0) {
					if (typeof config.options.packetSize !== "number") throw new TypeError("The \"config.options.packetSize\" property must be of type number.");
					this.config.options.packetSize = config.options.packetSize;
				}
				if (config.options.port !== void 0) {
					if (typeof config.options.port !== "number") throw new TypeError("The \"config.options.port\" property must be of type number.");
					if (config.options.port <= 0 || config.options.port >= 65536) throw new RangeError("The \"config.options.port\" property must be > 0 and < 65536");
					this.config.options.port = config.options.port;
					this.config.options.instanceName = void 0;
				}
				if (config.options.readOnlyIntent !== void 0) {
					if (typeof config.options.readOnlyIntent !== "boolean") throw new TypeError("The \"config.options.readOnlyIntent\" property must be of type boolean.");
					this.config.options.readOnlyIntent = config.options.readOnlyIntent;
				}
				if (config.options.requestTimeout !== void 0) {
					if (typeof config.options.requestTimeout !== "number") throw new TypeError("The \"config.options.requestTimeout\" property must be of type number.");
					this.config.options.requestTimeout = config.options.requestTimeout;
				}
				if (config.options.maxRetriesOnTransientErrors !== void 0) {
					if (typeof config.options.maxRetriesOnTransientErrors !== "number") throw new TypeError("The \"config.options.maxRetriesOnTransientErrors\" property must be of type number.");
					if (config.options.maxRetriesOnTransientErrors < 0) throw new TypeError("The \"config.options.maxRetriesOnTransientErrors\" property must be equal or greater than 0.");
					this.config.options.maxRetriesOnTransientErrors = config.options.maxRetriesOnTransientErrors;
				}
				if (config.options.connectionRetryInterval !== void 0) {
					if (typeof config.options.connectionRetryInterval !== "number") throw new TypeError("The \"config.options.connectionRetryInterval\" property must be of type number.");
					if (config.options.connectionRetryInterval <= 0) throw new TypeError("The \"config.options.connectionRetryInterval\" property must be greater than 0.");
					this.config.options.connectionRetryInterval = config.options.connectionRetryInterval;
				}
				if (config.options.rowCollectionOnDone !== void 0) {
					if (typeof config.options.rowCollectionOnDone !== "boolean") throw new TypeError("The \"config.options.rowCollectionOnDone\" property must be of type boolean.");
					this.config.options.rowCollectionOnDone = config.options.rowCollectionOnDone;
				}
				if (config.options.rowCollectionOnRequestCompletion !== void 0) {
					if (typeof config.options.rowCollectionOnRequestCompletion !== "boolean") throw new TypeError("The \"config.options.rowCollectionOnRequestCompletion\" property must be of type boolean.");
					this.config.options.rowCollectionOnRequestCompletion = config.options.rowCollectionOnRequestCompletion;
				}
				if (config.options.tdsVersion !== void 0) {
					if (typeof config.options.tdsVersion !== "string") throw new TypeError("The \"config.options.tdsVersion\" property must be of type string.");
					this.config.options.tdsVersion = config.options.tdsVersion;
				}
				if (config.options.textsize !== void 0) {
					if (typeof config.options.textsize !== "number" && config.options.textsize !== null) throw new TypeError("The \"config.options.textsize\" property must be of type number or null.");
					if (config.options.textsize > 2147483647) throw new TypeError("The \"config.options.textsize\" can't be greater than 2147483647.");
					else if (config.options.textsize < -1) throw new TypeError("The \"config.options.textsize\" can't be smaller than -1.");
					this.config.options.textsize = config.options.textsize | 0;
				}
				if (config.options.trustServerCertificate !== void 0) {
					if (typeof config.options.trustServerCertificate !== "boolean") throw new TypeError("The \"config.options.trustServerCertificate\" property must be of type boolean.");
					this.config.options.trustServerCertificate = config.options.trustServerCertificate;
				}
				if (config.options.serverName !== void 0) {
					if (typeof config.options.serverName !== "string") throw new TypeError("The \"config.options.serverName\" property must be of type string.");
					this.config.options.serverName = config.options.serverName;
				}
				if (config.options.useColumnNames !== void 0) {
					if (typeof config.options.useColumnNames !== "boolean") throw new TypeError("The \"config.options.useColumnNames\" property must be of type boolean.");
					this.config.options.useColumnNames = config.options.useColumnNames;
				}
				if (config.options.useUTC !== void 0) {
					if (typeof config.options.useUTC !== "boolean") throw new TypeError("The \"config.options.useUTC\" property must be of type boolean.");
					this.config.options.useUTC = config.options.useUTC;
				}
				if (config.options.workstationId !== void 0) {
					if (typeof config.options.workstationId !== "string") throw new TypeError("The \"config.options.workstationId\" property must be of type string.");
					this.config.options.workstationId = config.options.workstationId;
				}
				if (config.options.lowerCaseGuids !== void 0) {
					if (typeof config.options.lowerCaseGuids !== "boolean") throw new TypeError("The \"config.options.lowerCaseGuids\" property must be of type boolean.");
					this.config.options.lowerCaseGuids = config.options.lowerCaseGuids;
				}
			}
			this.secureContextOptions = this.config.options.cryptoCredentialsDetails;
			if (this.secureContextOptions.secureOptions === void 0) this.secureContextOptions = Object.create(this.secureContextOptions, { secureOptions: { value: _constants.default.SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS } });
			this.debug = this.createDebug();
			this.inTransaction = false;
			this.transactionDescriptors = [Buffer.from([
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0
			])];
			this.transactionDepth = 0;
			this.isSqlBatch = false;
			this.closed = false;
			this.messageBuffer = Buffer.alloc(0);
			this.curTransientRetryCount = 0;
			this.transientErrorLookup = new _transientErrorLookup.TransientErrorLookup();
			this.state = this.STATE.INITIALIZED;
			this.attentionSent = false;
			this._cancelAfterRequestSent = () => {
				this.messageIo.sendMessage(_packet.TYPE.ATTENTION);
				this.attentionSent = true;
				this.createCancelTimer();
			};
			this._onSocketClose = () => {
				this.socketClose();
			};
			this._onSocketEnd = () => {
				this.socketEnd();
			};
			this._onSocketError = (error) => {
				this.dispatchEvent("socketError", error);
				process.nextTick(() => {
					this.emit("error", this.wrapSocketError(error));
				});
			};
		}
		connect(connectListener) {
			if (this.state !== this.STATE.INITIALIZED) throw new _errors.ConnectionError("`.connect` can not be called on a Connection in `" + this.state.name + "` state.");
			if (connectListener) {
				const onConnect = (err) => {
					this.removeListener("error", onError);
					connectListener(err);
				};
				const onError = (err) => {
					this.removeListener("connect", onConnect);
					connectListener(err);
				};
				this.once("connect", onConnect);
				this.once("error", onError);
			}
			this.transitionTo(this.STATE.CONNECTING);
			this.initialiseConnection().then(() => {
				process.nextTick(() => {
					this.emit("connect");
				});
			}, (err) => {
				this.transitionTo(this.STATE.FINAL);
				this.closed = true;
				process.nextTick(() => {
					this.emit("connect", err);
				});
				process.nextTick(() => {
					this.emit("end");
				});
			});
		}
		/**
		* The server has reported that the charset has changed.
		*/
		/**
		* The attempt to connect and validate has completed.
		*/
		/**
		* The server has reported that the active database has changed.
		* This may be as a result of a successful login, or a `use` statement.
		*/
		/**
		* A debug message is available. It may be logged or ignored.
		*/
		/**
		* Internal error occurs.
		*/
		/**
		* The server has issued an error message.
		*/
		/**
		* The connection has ended.
		*
		* This may be as a result of the client calling [[close]], the server
		* closing the connection, or a network error.
		*/
		/**
		* The server has issued an information message.
		*/
		/**
		* The server has reported that the language has changed.
		*/
		/**
		* The connection was reset.
		*/
		/**
		* A secure connection has been established.
		*/
		on(event, listener) {
			return super.on(event, listener);
		}
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		/**
		* @private
		*/
		emit(event, ...args) {
			return super.emit(event, ...args);
		}
		/**
		* Closes the connection to the database.
		*
		* The [[Event_end]] will be emitted once the connection has been closed.
		*/
		close() {
			this.transitionTo(this.STATE.FINAL);
			this.cleanupConnection();
		}
		/**
		* @private
		*/
		async initialiseConnection() {
			const timeoutController = new AbortController();
			const connectTimer = setTimeout(() => {
				const hostPostfix = this.config.options.port ? `:${this.config.options.port}` : `\\${this.config.options.instanceName}`;
				const message = `Failed to connect to ${this.routingData ? this.routingData.server : this.config.server}${this.routingData ? `:${this.routingData.port}` : hostPostfix}${this.routingData ? ` (redirected from ${this.config.server}${hostPostfix})` : ""} in ${this.config.options.connectTimeout}ms`;
				this.debug.log(message);
				timeoutController.abort(new _errors.ConnectionError(message, "ETIMEOUT"));
			}, this.config.options.connectTimeout);
			try {
				let signal = timeoutController.signal;
				let port = this.config.options.port;
				if (!port) try {
					port = await (0, _instanceLookup.instanceLookup)({
						server: this.config.server,
						instanceName: this.config.options.instanceName,
						timeout: this.config.options.connectTimeout,
						signal
					});
				} catch (err) {
					signal.throwIfAborted();
					throw new _errors.ConnectionError(err.message, "EINSTLOOKUP", { cause: err });
				}
				let socket;
				try {
					socket = await this.connectOnPort(port, this.config.options.multiSubnetFailover, signal, this.config.options.connector);
				} catch (err) {
					signal.throwIfAborted();
					throw this.wrapSocketError(err);
				}
				try {
					const controller = new AbortController();
					const onError = (err) => {
						controller.abort(this.wrapSocketError(err));
					};
					const onClose = () => {
						this.debug.log("connection to " + this.config.server + ":" + this.config.options.port + " closed");
					};
					const onEnd = () => {
						this.debug.log("socket ended");
						const error = /* @__PURE__ */ new Error("socket hang up");
						error.code = "ECONNRESET";
						controller.abort(this.wrapSocketError(error));
					};
					socket.once("error", onError);
					socket.once("close", onClose);
					socket.once("end", onEnd);
					try {
						signal = AbortSignal.any([signal, controller.signal]);
						socket.setKeepAlive(true, KEEP_ALIVE_INITIAL_DELAY);
						this.messageIo = new _messageIo.default(socket, this.config.options.packetSize, this.debug);
						this.messageIo.on("secure", (cleartext) => {
							this.emit("secure", cleartext);
						});
						this.socket = socket;
						this.closed = false;
						this.debug.log("connected to " + this.config.server + ":" + this.config.options.port);
						this.sendPreLogin();
						this.transitionTo(this.STATE.SENT_PRELOGIN);
						const preloginResponse = await this.readPreloginResponse(signal);
						await this.performTlsNegotiation(preloginResponse, signal);
						this.sendLogin7Packet();
						try {
							const { authentication } = this.config;
							switch (authentication.type) {
								case "token-credential":
								case "azure-active-directory-password":
								case "azure-active-directory-msi-vm":
								case "azure-active-directory-msi-app-service":
								case "azure-active-directory-service-principal-secret":
								case "azure-active-directory-default":
									this.transitionTo(this.STATE.SENT_LOGIN7_WITH_FEDAUTH);
									this.routingData = await this.performSentLogin7WithFedAuth(signal);
									break;
								case "ntlm":
									this.transitionTo(this.STATE.SENT_LOGIN7_WITH_NTLM);
									this.routingData = await this.performSentLogin7WithNTLMLogin(signal);
									break;
								default:
									this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
									this.routingData = await this.performSentLogin7WithStandardLogin(signal);
							}
						} catch (err) {
							if (isTransientError(err)) {
								this.debug.log("Initiating retry on transient error");
								this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
								return await this.performTransientFailureRetry();
							}
							throw err;
						}
						if (this.routingData) {
							this.transitionTo(this.STATE.REROUTING);
							return await this.performReRouting();
						}
						this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
						await this.performLoggedInSendingInitialSql(signal);
					} finally {
						socket.removeListener("error", onError);
						socket.removeListener("close", onClose);
						socket.removeListener("end", onEnd);
					}
				} catch (err) {
					socket.destroy();
					throw err;
				}
				socket.on("error", this._onSocketError);
				socket.on("close", this._onSocketClose);
				socket.on("end", this._onSocketEnd);
				this.transitionTo(this.STATE.LOGGED_IN);
			} finally {
				clearTimeout(connectTimer);
			}
		}
		/**
		* @private
		*/
		cleanupConnection() {
			if (!this.closed) {
				this.clearRequestTimer();
				this.clearCancelTimer();
				this.closeConnection();
				process.nextTick(() => {
					this.emit("end");
				});
				const request = this.request;
				if (request) {
					const err = new _errors.RequestError("Connection closed before request completed.", "ECLOSE");
					request.callback(err);
					this.request = void 0;
				}
				this.attentionSent = false;
				this.closed = true;
			}
		}
		/**
		* @private
		*/
		createDebug() {
			const debug = new _debug.default(this.config.options.debug);
			debug.on("debug", (message) => {
				this.emit("debug", message);
			});
			return debug;
		}
		/**
		* @private
		*/
		createTokenStreamParser(message, handler) {
			return new _tokenStreamParser.Parser(message, this.debug, handler, this.config.options);
		}
		async wrapWithTls(socket, signal) {
			signal.throwIfAborted();
			const secureContext = tls.createSecureContext(this.secureContextOptions);
			const serverName = !net.isIP(this.config.server) ? this.config.server : "";
			const encryptOptions = {
				host: this.config.server,
				socket,
				ALPNProtocols: ["tds/8.0"],
				secureContext,
				servername: this.config.options.serverName ? this.config.options.serverName : serverName
			};
			const { promise, resolve, reject } = withResolvers();
			const encryptsocket = tls.connect(encryptOptions);
			try {
				const onAbort = () => {
					reject(signal.reason);
				};
				signal.addEventListener("abort", onAbort, { once: true });
				try {
					const onError = reject;
					const onConnect = () => {
						resolve(encryptsocket);
					};
					encryptsocket.once("error", onError);
					encryptsocket.once("secureConnect", onConnect);
					try {
						return await promise;
					} finally {
						encryptsocket.removeListener("error", onError);
						encryptsocket.removeListener("connect", onConnect);
					}
				} finally {
					signal.removeEventListener("abort", onAbort);
				}
			} catch (err) {
				encryptsocket.destroy();
				throw err;
			}
		}
		async connectOnPort(port, multiSubnetFailover, signal, customConnector) {
			const connectOpts = {
				host: this.routingData ? this.routingData.server : this.config.server,
				port: this.routingData ? this.routingData.port : port,
				localAddress: this.config.options.localAddress
			};
			let socket = await (customConnector || (multiSubnetFailover ? _connector.connectInParallel : _connector.connectInSequence))(connectOpts, _dns.default.lookup, signal);
			if (this.config.options.encrypt === "strict") try {
				socket = await this.wrapWithTls(socket, signal);
			} catch (err) {
				socket.end();
				throw err;
			}
			return socket;
		}
		/**
		* @private
		*/
		closeConnection() {
			if (this.socket) this.socket.destroy();
		}
		/**
		* @private
		*/
		createCancelTimer() {
			this.clearCancelTimer();
			const timeout = this.config.options.cancelTimeout;
			if (timeout > 0) this.cancelTimer = setTimeout(() => {
				this.cancelTimeout();
			}, timeout);
		}
		/**
		* @private
		*/
		createRequestTimer() {
			this.clearRequestTimer();
			const request = this.request;
			const timeout = request.timeout !== void 0 ? request.timeout : this.config.options.requestTimeout;
			if (timeout) this.requestTimer = setTimeout(() => {
				this.requestTimeout();
			}, timeout);
		}
		/**
		* @private
		*/
		cancelTimeout() {
			const message = `Failed to cancel request in ${this.config.options.cancelTimeout}ms`;
			this.debug.log(message);
			this.dispatchEvent("socketError", new _errors.ConnectionError(message, "ETIMEOUT"));
		}
		/**
		* @private
		*/
		requestTimeout() {
			this.requestTimer = void 0;
			const request = this.request;
			request.cancel();
			const message = "Timeout: Request failed to complete in " + (request.timeout !== void 0 ? request.timeout : this.config.options.requestTimeout) + "ms";
			request.error = new _errors.RequestError(message, "ETIMEOUT");
		}
		/**
		* @private
		*/
		clearCancelTimer() {
			if (this.cancelTimer) {
				clearTimeout(this.cancelTimer);
				this.cancelTimer = void 0;
			}
		}
		/**
		* @private
		*/
		clearRequestTimer() {
			if (this.requestTimer) {
				clearTimeout(this.requestTimer);
				this.requestTimer = void 0;
			}
		}
		/**
		* @private
		*/
		transitionTo(newState) {
			if (this.state === newState) {
				this.debug.log("State is already " + newState.name);
				return;
			}
			if (this.state && this.state.exit) this.state.exit.call(this, newState);
			this.debug.log("State change: " + (this.state ? this.state.name : "undefined") + " -> " + newState.name);
			this.state = newState;
			if (this.state.enter) this.state.enter.apply(this);
		}
		/**
		* @private
		*/
		getEventHandler(eventName) {
			const handler = this.state.events[eventName];
			if (!handler) throw new Error(`No event '${eventName}' in state '${this.state.name}'`);
			return handler;
		}
		/**
		* @private
		*/
		dispatchEvent(eventName, ...args) {
			const handler = this.state.events[eventName];
			if (handler) handler.apply(this, args);
			else {
				this.emit("error", /* @__PURE__ */ new Error(`No event '${eventName}' in state '${this.state.name}'`));
				this.close();
			}
		}
		/**
		* @private
		*/
		wrapSocketError(error) {
			if (this.state === this.STATE.CONNECTING || this.state === this.STATE.SENT_TLSSSLNEGOTIATION) {
				const hostPostfix = this.config.options.port ? `:${this.config.options.port}` : `\\${this.config.options.instanceName}`;
				const message = `Failed to connect to ${this.routingData ? this.routingData.server : this.config.server}${this.routingData ? `:${this.routingData.port}` : hostPostfix}${this.routingData ? ` (redirected from ${this.config.server}${hostPostfix})` : ""} - ${error.message}`;
				return new _errors.ConnectionError(message, "ESOCKET", { cause: error });
			} else {
				const message = `Connection lost - ${error.message}`;
				return new _errors.ConnectionError(message, "ESOCKET", { cause: error });
			}
		}
		/**
		* @private
		*/
		socketEnd() {
			this.debug.log("socket ended");
			if (this.state !== this.STATE.FINAL) {
				const error = /* @__PURE__ */ new Error("socket hang up");
				error.code = "ECONNRESET";
				this.dispatchEvent("socketError", error);
				process.nextTick(() => {
					this.emit("error", this.wrapSocketError(error));
				});
			}
		}
		/**
		* @private
		*/
		socketClose() {
			this.debug.log("connection to " + this.config.server + ":" + this.config.options.port + " closed");
			this.transitionTo(this.STATE.FINAL);
			this.cleanupConnection();
		}
		/**
		* @private
		*/
		sendPreLogin() {
			const [, major, minor, build] = /^(\d+)\.(\d+)\.(\d+)/.exec(_package.version) ?? [
				"0.0.0",
				"0",
				"0",
				"0"
			];
			const payload = new _preloginPayload.default({
				encrypt: typeof this.config.options.encrypt === "boolean" && this.config.options.encrypt,
				version: {
					major: Number(major),
					minor: Number(minor),
					build: Number(build),
					subbuild: 0
				}
			});
			this.messageIo.sendMessage(_packet.TYPE.PRELOGIN, payload.data);
			this.debug.payload(function() {
				return payload.toString("  ");
			});
		}
		/**
		* @private
		*/
		sendLogin7Packet() {
			const payload = new _login7Payload.default({
				tdsVersion: _tdsVersions.versions[this.config.options.tdsVersion],
				packetSize: this.config.options.packetSize,
				clientProgVer: 0,
				clientPid: process.pid,
				connectionId: 0,
				clientTimeZone: (/* @__PURE__ */ new Date()).getTimezoneOffset(),
				clientLcid: 1033
			});
			const { authentication } = this.config;
			switch (authentication.type) {
				case "azure-active-directory-password":
					payload.fedAuth = {
						type: "ADAL",
						echo: this.fedAuthRequired,
						workflow: "default"
					};
					break;
				case "azure-active-directory-access-token":
					payload.fedAuth = {
						type: "SECURITYTOKEN",
						echo: this.fedAuthRequired,
						fedAuthToken: authentication.options.token
					};
					break;
				case "token-credential":
				case "azure-active-directory-msi-vm":
				case "azure-active-directory-default":
				case "azure-active-directory-msi-app-service":
				case "azure-active-directory-service-principal-secret":
					payload.fedAuth = {
						type: "ADAL",
						echo: this.fedAuthRequired,
						workflow: "integrated"
					};
					break;
				case "ntlm":
					payload.sspi = (0, _ntlm.createNTLMRequest)({ domain: authentication.options.domain });
					break;
				default:
					payload.userName = authentication.options.userName;
					payload.password = authentication.options.password;
			}
			payload.hostname = this.config.options.workstationId || _os.default.hostname();
			payload.serverName = this.routingData ? `${this.routingData.server}${this.routingData.instance ? "\\" + this.routingData.instance : ""}` : this.config.server;
			payload.appName = this.config.options.appName || "Tedious";
			payload.libraryName = _library.name;
			payload.language = this.config.options.language;
			payload.database = this.config.options.database;
			payload.clientId = Buffer.from([
				1,
				2,
				3,
				4,
				5,
				6
			]);
			payload.readOnlyIntent = this.config.options.readOnlyIntent;
			payload.initDbFatal = !this.config.options.fallbackToDefaultDb;
			this.routingData = void 0;
			this.messageIo.sendMessage(_packet.TYPE.LOGIN7, payload.toBuffer());
			this.debug.payload(function() {
				return payload.toString("  ");
			});
		}
		/**
		* @private
		*/
		sendFedAuthTokenMessage(token) {
			const accessTokenLen = Buffer.byteLength(token, "ucs2");
			const data = Buffer.alloc(8 + accessTokenLen);
			let offset = 0;
			offset = data.writeUInt32LE(accessTokenLen + 4, offset);
			offset = data.writeUInt32LE(accessTokenLen, offset);
			data.write(token, offset, "ucs2");
			this.messageIo.sendMessage(_packet.TYPE.FEDAUTH_TOKEN, data);
		}
		/**
		* @private
		*/
		sendInitialSql() {
			const payload = new _sqlbatchPayload.default(this.getInitialSql(), this.currentTransactionDescriptor(), this.config.options);
			const message = new _message.default({ type: _packet.TYPE.SQL_BATCH });
			this.messageIo.outgoingMessageStream.write(message);
			_stream.Readable.from(payload).pipe(message);
		}
		/**
		* @private
		*/
		getInitialSql() {
			const options = [];
			if (this.config.options.enableAnsiNull === true) options.push("set ansi_nulls on");
			else if (this.config.options.enableAnsiNull === false) options.push("set ansi_nulls off");
			if (this.config.options.enableAnsiNullDefault === true) options.push("set ansi_null_dflt_on on");
			else if (this.config.options.enableAnsiNullDefault === false) options.push("set ansi_null_dflt_on off");
			if (this.config.options.enableAnsiPadding === true) options.push("set ansi_padding on");
			else if (this.config.options.enableAnsiPadding === false) options.push("set ansi_padding off");
			if (this.config.options.enableAnsiWarnings === true) options.push("set ansi_warnings on");
			else if (this.config.options.enableAnsiWarnings === false) options.push("set ansi_warnings off");
			if (this.config.options.enableArithAbort === true) options.push("set arithabort on");
			else if (this.config.options.enableArithAbort === false) options.push("set arithabort off");
			if (this.config.options.enableConcatNullYieldsNull === true) options.push("set concat_null_yields_null on");
			else if (this.config.options.enableConcatNullYieldsNull === false) options.push("set concat_null_yields_null off");
			if (this.config.options.enableCursorCloseOnCommit === true) options.push("set cursor_close_on_commit on");
			else if (this.config.options.enableCursorCloseOnCommit === false) options.push("set cursor_close_on_commit off");
			if (this.config.options.datefirst !== null) options.push(`set datefirst ${this.config.options.datefirst}`);
			if (this.config.options.dateFormat !== null) options.push(`set dateformat ${this.config.options.dateFormat}`);
			if (this.config.options.enableImplicitTransactions === true) options.push("set implicit_transactions on");
			else if (this.config.options.enableImplicitTransactions === false) options.push("set implicit_transactions off");
			if (this.config.options.language !== null) options.push(`set language ${this.config.options.language}`);
			if (this.config.options.enableNumericRoundabort === true) options.push("set numeric_roundabort on");
			else if (this.config.options.enableNumericRoundabort === false) options.push("set numeric_roundabort off");
			if (this.config.options.enableQuotedIdentifier === true) options.push("set quoted_identifier on");
			else if (this.config.options.enableQuotedIdentifier === false) options.push("set quoted_identifier off");
			if (this.config.options.textsize !== null) options.push(`set textsize ${this.config.options.textsize}`);
			if (this.config.options.connectionIsolationLevel !== null) options.push(`set transaction isolation level ${this.getIsolationLevelText(this.config.options.connectionIsolationLevel)}`);
			if (this.config.options.abortTransactionOnError === true) options.push("set xact_abort on");
			else if (this.config.options.abortTransactionOnError === false) options.push("set xact_abort off");
			return options.join("\n");
		}
		/**
		* Execute the SQL batch represented by [[Request]].
		* There is no param support, and unlike [[Request.execSql]],
		* it is not likely that SQL Server will reuse the execution plan it generates for the SQL.
		*
		* In almost all cases, [[Request.execSql]] will be a better choice.
		*
		* @param request A [[Request]] object representing the request.
		*/
		execSqlBatch(request) {
			this.makeRequest(request, _packet.TYPE.SQL_BATCH, new _sqlbatchPayload.default(request.sqlTextOrProcedure, this.currentTransactionDescriptor(), this.config.options));
		}
		/**
		*  Execute the SQL represented by [[Request]].
		*
		* As `sp_executesql` is used to execute the SQL, if the same SQL is executed multiples times
		* using this function, the SQL Server query optimizer is likely to reuse the execution plan it generates
		* for the first execution. This may also result in SQL server treating the request like a stored procedure
		* which can result in the [[Event_doneInProc]] or [[Event_doneProc]] events being emitted instead of the
		* [[Event_done]] event you might expect. Using [[execSqlBatch]] will prevent this from occurring but may have a negative performance impact.
		*
		* Beware of the way that scoping rules apply, and how they may [affect local temp tables](http://weblogs.sqlteam.com/mladenp/archive/2006/11/03/17197.aspx)
		* If you're running in to scoping issues, then [[execSqlBatch]] may be a better choice.
		* See also [issue #24](https://github.com/pekim/tedious/issues/24)
		*
		* @param request A [[Request]] object representing the request.
		*/
		execSql(request) {
			try {
				request.validateParameters(this.databaseCollation);
			} catch (error) {
				request.error = error;
				process.nextTick(() => {
					this.debug.log(error.message);
					request.callback(error);
				});
				return;
			}
			const parameters = [];
			parameters.push({
				type: _dataType.TYPES.NVarChar,
				name: "statement",
				value: request.sqlTextOrProcedure,
				output: false,
				length: void 0,
				precision: void 0,
				scale: void 0
			});
			if (request.parameters.length) {
				parameters.push({
					type: _dataType.TYPES.NVarChar,
					name: "params",
					value: request.makeParamsParameter(request.parameters),
					output: false,
					length: void 0,
					precision: void 0,
					scale: void 0
				});
				parameters.push(...request.parameters);
			}
			this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(_specialStoredProcedure.default.Sp_ExecuteSql, parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
		}
		/**
		* Creates a new BulkLoad instance.
		*
		* @param table The name of the table to bulk-insert into.
		* @param options A set of bulk load options.
		*/
		newBulkLoad(table, callbackOrOptions, callback) {
			let options;
			if (callback === void 0) {
				callback = callbackOrOptions;
				options = {};
			} else options = callbackOrOptions;
			if (typeof options !== "object") throw new TypeError("\"options\" argument must be an object");
			return new _bulkLoad.default(table, this.databaseCollation, this.config.options, options, callback);
		}
		/**
		* Execute a [[BulkLoad]].
		*
		* ```js
		* // We want to perform a bulk load into a table with the following format:
		* // CREATE TABLE employees (first_name nvarchar(255), last_name nvarchar(255), day_of_birth date);
		*
		* const bulkLoad = connection.newBulkLoad('employees', (err, rowCount) => {
		*   // ...
		* });
		*
		* // First, we need to specify the columns that we want to write to,
		* // and their definitions. These definitions must match the actual table,
		* // otherwise the bulk load will fail.
		* bulkLoad.addColumn('first_name', TYPES.NVarchar, { nullable: false });
		* bulkLoad.addColumn('last_name', TYPES.NVarchar, { nullable: false });
		* bulkLoad.addColumn('date_of_birth', TYPES.Date, { nullable: false });
		*
		* // Execute a bulk load with a predefined list of rows.
		* //
		* // Note that these rows are held in memory until the
		* // bulk load was performed, so if you need to write a large
		* // number of rows (e.g. by reading from a CSV file),
		* // passing an `AsyncIterable` is advisable to keep memory usage low.
		* connection.execBulkLoad(bulkLoad, [
		*   { 'first_name': 'Steve', 'last_name': 'Jobs', 'day_of_birth': new Date('02-24-1955') },
		*   { 'first_name': 'Bill', 'last_name': 'Gates', 'day_of_birth': new Date('10-28-1955') }
		* ]);
		* ```
		*
		* @param bulkLoad A previously created [[BulkLoad]].
		* @param rows A [[Iterable]] or [[AsyncIterable]] that contains the rows that should be bulk loaded.
		*/
		execBulkLoad(bulkLoad, rows) {
			bulkLoad.executionStarted = true;
			if (rows) {
				if (bulkLoad.streamingMode) throw new Error("Connection.execBulkLoad can't be called with a BulkLoad that was put in streaming mode.");
				if (bulkLoad.firstRowWritten) throw new Error("Connection.execBulkLoad can't be called with a BulkLoad that already has rows written to it.");
				const rowStream = _stream.Readable.from(rows);
				rowStream.on("error", (err) => {
					bulkLoad.rowToPacketTransform.destroy(err);
				});
				bulkLoad.rowToPacketTransform.on("error", (err) => {
					rowStream.destroy(err);
				});
				rowStream.pipe(bulkLoad.rowToPacketTransform);
			} else if (!bulkLoad.streamingMode) bulkLoad.rowToPacketTransform.end();
			const onCancel = () => {
				request.cancel();
			};
			const payload = new _bulkLoadPayload.BulkLoadPayload(bulkLoad);
			const request = new _request.default(bulkLoad.getBulkInsertSql(), (error) => {
				bulkLoad.removeListener("cancel", onCancel);
				if (error) {
					if (error.code === "UNKNOWN") error.message += " This is likely because the schema of the BulkLoad does not match the schema of the table you are attempting to insert into.";
					bulkLoad.error = error;
					bulkLoad.callback(error);
					return;
				}
				this.makeRequest(bulkLoad, _packet.TYPE.BULK_LOAD, payload);
			});
			bulkLoad.once("cancel", onCancel);
			this.execSqlBatch(request);
		}
		/**
		* Prepare the SQL represented by the request.
		*
		* The request can then be used in subsequent calls to
		* [[execute]] and [[unprepare]]
		*
		* @param request A [[Request]] object representing the request.
		*   Parameters only require a name and type. Parameter values are ignored.
		*/
		prepare(request) {
			const parameters = [];
			parameters.push({
				type: _dataType.TYPES.Int,
				name: "handle",
				value: void 0,
				output: true,
				length: void 0,
				precision: void 0,
				scale: void 0
			});
			parameters.push({
				type: _dataType.TYPES.NVarChar,
				name: "params",
				value: request.parameters.length ? request.makeParamsParameter(request.parameters) : null,
				output: false,
				length: void 0,
				precision: void 0,
				scale: void 0
			});
			parameters.push({
				type: _dataType.TYPES.NVarChar,
				name: "stmt",
				value: request.sqlTextOrProcedure,
				output: false,
				length: void 0,
				precision: void 0,
				scale: void 0
			});
			request.preparing = true;
			request.on("returnValue", (name, value) => {
				if (name === "handle") request.handle = value;
				else request.error = new _errors.RequestError(`Tedious > Unexpected output parameter ${name} from sp_prepare`);
			});
			this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(_specialStoredProcedure.default.Sp_Prepare, parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
		}
		/**
		* Release the SQL Server resources associated with a previously prepared request.
		*
		* @param request A [[Request]] object representing the request.
		*   Parameters only require a name and type.
		*   Parameter values are ignored.
		*/
		unprepare(request) {
			const parameters = [];
			parameters.push({
				type: _dataType.TYPES.Int,
				name: "handle",
				value: request.handle,
				output: false,
				length: void 0,
				precision: void 0,
				scale: void 0
			});
			this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(_specialStoredProcedure.default.Sp_Unprepare, parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
		}
		/**
		* Execute previously prepared SQL, using the supplied parameters.
		*
		* @param request A previously prepared [[Request]].
		* @param parameters  An object whose names correspond to the names of
		*   parameters that were added to the [[Request]] before it was prepared.
		*   The object's values are passed as the parameters' values when the
		*   request is executed.
		*/
		execute(request, parameters) {
			const executeParameters = [];
			executeParameters.push({
				type: _dataType.TYPES.Int,
				name: "",
				value: request.handle,
				output: false,
				length: void 0,
				precision: void 0,
				scale: void 0
			});
			try {
				for (let i = 0, len = request.parameters.length; i < len; i++) {
					const parameter = request.parameters[i];
					executeParameters.push({
						...parameter,
						value: parameter.type.validate(parameters ? parameters[parameter.name] : null, this.databaseCollation)
					});
				}
			} catch (error) {
				request.error = error;
				process.nextTick(() => {
					this.debug.log(error.message);
					request.callback(error);
				});
				return;
			}
			this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(_specialStoredProcedure.default.Sp_Execute, executeParameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
		}
		/**
		* Call a stored procedure represented by [[Request]].
		*
		* @param request A [[Request]] object representing the request.
		*/
		callProcedure(request) {
			try {
				request.validateParameters(this.databaseCollation);
			} catch (error) {
				request.error = error;
				process.nextTick(() => {
					this.debug.log(error.message);
					request.callback(error);
				});
				return;
			}
			this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(request.sqlTextOrProcedure, request.parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
		}
		/**
		* Start a transaction.
		*
		* @param callback
		* @param name A string representing a name to associate with the transaction.
		*   Optional, and defaults to an empty string. Required when `isolationLevel`
		*   is present.
		* @param isolationLevel The isolation level that the transaction is to be run with.
		*
		*   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
		*   * `READ_UNCOMMITTED`
		*   * `READ_COMMITTED`
		*   * `REPEATABLE_READ`
		*   * `SERIALIZABLE`
		*   * `SNAPSHOT`
		*
		*   Optional, and defaults to the Connection's isolation level.
		*/
		beginTransaction(callback, name = "", isolationLevel = this.config.options.isolationLevel) {
			(0, _transaction.assertValidIsolationLevel)(isolationLevel, "isolationLevel");
			const transaction = new _transaction.Transaction(name, isolationLevel);
			if (this.config.options.tdsVersion < "7_2") return this.execSqlBatch(new _request.default("SET TRANSACTION ISOLATION LEVEL " + transaction.isolationLevelToTSQL() + ";BEGIN TRAN " + transaction.name, (err) => {
				this.transactionDepth++;
				if (this.transactionDepth === 1) this.inTransaction = true;
				callback(err);
			}));
			const request = new _request.default(void 0, (err) => {
				return callback(err, this.currentTransactionDescriptor());
			});
			return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.beginPayload(this.currentTransactionDescriptor()));
		}
		/**
		* Commit a transaction.
		*
		* There should be an active transaction - that is, [[beginTransaction]]
		* should have been previously called.
		*
		* @param callback
		* @param name A string representing a name to associate with the transaction.
		*   Optional, and defaults to an empty string. Required when `isolationLevel`is present.
		*/
		commitTransaction(callback, name = "") {
			const transaction = new _transaction.Transaction(name);
			if (this.config.options.tdsVersion < "7_2") return this.execSqlBatch(new _request.default("COMMIT TRAN " + transaction.name, (err) => {
				this.transactionDepth--;
				if (this.transactionDepth === 0) this.inTransaction = false;
				callback(err);
			}));
			const request = new _request.default(void 0, callback);
			return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.commitPayload(this.currentTransactionDescriptor()));
		}
		/**
		* Rollback a transaction.
		*
		* There should be an active transaction - that is, [[beginTransaction]]
		* should have been previously called.
		*
		* @param callback
		* @param name A string representing a name to associate with the transaction.
		*   Optional, and defaults to an empty string.
		*   Required when `isolationLevel` is present.
		*/
		rollbackTransaction(callback, name = "") {
			const transaction = new _transaction.Transaction(name);
			if (this.config.options.tdsVersion < "7_2") return this.execSqlBatch(new _request.default("ROLLBACK TRAN " + transaction.name, (err) => {
				this.transactionDepth--;
				if (this.transactionDepth === 0) this.inTransaction = false;
				callback(err);
			}));
			const request = new _request.default(void 0, callback);
			return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.rollbackPayload(this.currentTransactionDescriptor()));
		}
		/**
		* Set a savepoint within a transaction.
		*
		* There should be an active transaction - that is, [[beginTransaction]]
		* should have been previously called.
		*
		* @param callback
		* @param name A string representing a name to associate with the transaction.\
		*   Optional, and defaults to an empty string.
		*   Required when `isolationLevel` is present.
		*/
		saveTransaction(callback, name) {
			const transaction = new _transaction.Transaction(name);
			if (this.config.options.tdsVersion < "7_2") return this.execSqlBatch(new _request.default("SAVE TRAN " + transaction.name, (err) => {
				this.transactionDepth++;
				callback(err);
			}));
			const request = new _request.default(void 0, callback);
			return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.savePayload(this.currentTransactionDescriptor()));
		}
		/**
		* Run the given callback after starting a transaction, and commit or
		* rollback the transaction afterwards.
		*
		* This is a helper that employs [[beginTransaction]], [[commitTransaction]],
		* [[rollbackTransaction]], and [[saveTransaction]] to greatly simplify the
		* use of database transactions and automatically handle transaction nesting.
		*
		* @param cb
		* @param isolationLevel
		*   The isolation level that the transaction is to be run with.
		*
		*   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
		*   * `READ_UNCOMMITTED`
		*   * `READ_COMMITTED`
		*   * `REPEATABLE_READ`
		*   * `SERIALIZABLE`
		*   * `SNAPSHOT`
		*
		*   Optional, and defaults to the Connection's isolation level.
		*/
		transaction(cb, isolationLevel) {
			if (typeof cb !== "function") throw new TypeError("`cb` must be a function");
			const useSavepoint = this.inTransaction;
			const name = "_tedious_" + _crypto.default.randomBytes(10).toString("hex");
			const txDone = (err, done, ...args) => {
				if (err) if (this.inTransaction && this.state === this.STATE.LOGGED_IN) this.rollbackTransaction((txErr) => {
					done(txErr || err, ...args);
				}, name);
				else done(err, ...args);
				else if (useSavepoint) {
					if (this.config.options.tdsVersion < "7_2") this.transactionDepth--;
					done(null, ...args);
				} else this.commitTransaction((txErr) => {
					done(txErr, ...args);
				}, name);
			};
			if (useSavepoint) return this.saveTransaction((err) => {
				if (err) return cb(err);
				if (isolationLevel) return this.execSqlBatch(new _request.default("SET transaction isolation level " + this.getIsolationLevelText(isolationLevel), (err) => {
					return cb(err, txDone);
				}));
				else return cb(null, txDone);
			}, name);
			else return this.beginTransaction((err) => {
				if (err) return cb(err);
				return cb(null, txDone);
			}, name, isolationLevel);
		}
		/**
		* @private
		*/
		makeRequest(request, packetType, payload) {
			if (this.state !== this.STATE.LOGGED_IN) {
				const message = "Requests can only be made in the " + this.STATE.LOGGED_IN.name + " state, not the " + this.state.name + " state";
				this.debug.log(message);
				request.callback(new _errors.RequestError(message, "EINVALIDSTATE"));
			} else if (request.canceled) process.nextTick(() => {
				request.callback(new _errors.RequestError("Canceled.", "ECANCEL"));
			});
			else {
				if (packetType === _packet.TYPE.SQL_BATCH) this.isSqlBatch = true;
				else this.isSqlBatch = false;
				this.request = request;
				this.attentionSent = false;
				request.connection = this;
				request.rowCount = 0;
				request.rows = [];
				request.rst = [];
				const onCancel = () => {
					payloadStream.unpipe(message);
					payloadStream.destroy();
					request.error ??= new _errors.RequestError("Canceled.", "ECANCEL");
					message.ignore = true;
					message.end();
					if (request instanceof _request.default && request.paused) request.resume();
				};
				request.once("cancel", onCancel);
				this.createRequestTimer();
				const message = new _message.default({
					type: packetType,
					resetConnection: this.resetConnectionOnNextRequest
				});
				this.messageIo.outgoingMessageStream.write(message);
				this.transitionTo(this.STATE.SENT_CLIENT_REQUEST);
				message.once("finish", () => {
					request.removeListener("cancel", onCancel);
					request.prependOnceListener("cancel", this._cancelAfterRequestSent);
					this.resetConnectionOnNextRequest = false;
					this.debug.payload(function() {
						return payload.toString("  ");
					});
				});
				const payloadStream = _stream.Readable.from(payload);
				payloadStream.once("error", (error) => {
					payloadStream.unpipe(message);
					request.error ??= error;
					message.ignore = true;
					message.end();
				});
				payloadStream.pipe(message);
			}
		}
		/**
		* Cancel currently executed request.
		*/
		cancel() {
			if (!this.request) return false;
			if (this.request.canceled) return false;
			this.request.cancel();
			return true;
		}
		/**
		* Reset the connection to its initial state.
		* Can be useful for connection pool implementations.
		*
		* @param callback
		*/
		reset(callback) {
			const request = new _request.default(this.getInitialSql(), (err) => {
				if (this.config.options.tdsVersion < "7_2") this.inTransaction = false;
				callback(err);
			});
			this.resetConnectionOnNextRequest = true;
			this.execSqlBatch(request);
		}
		/**
		* @private
		*/
		currentTransactionDescriptor() {
			return this.transactionDescriptors[this.transactionDescriptors.length - 1];
		}
		/**
		* @private
		*/
		getIsolationLevelText(isolationLevel) {
			switch (isolationLevel) {
				case _transaction.ISOLATION_LEVEL.READ_UNCOMMITTED: return "read uncommitted";
				case _transaction.ISOLATION_LEVEL.REPEATABLE_READ: return "repeatable read";
				case _transaction.ISOLATION_LEVEL.SERIALIZABLE: return "serializable";
				case _transaction.ISOLATION_LEVEL.SNAPSHOT: return "snapshot";
				default: return "read committed";
			}
		}
		/**
		* @private
		*/
		async performTlsNegotiation(preloginPayload, signal) {
			signal.throwIfAborted();
			const { promise: signalAborted, reject } = withResolvers();
			const onAbort = () => {
				reject(signal.reason);
			};
			signal.addEventListener("abort", onAbort, { once: true });
			try {
				if (preloginPayload.fedAuthRequired === 1) this.fedAuthRequired = true;
				if ("strict" !== this.config.options.encrypt && (preloginPayload.encryptionString === "ON" || preloginPayload.encryptionString === "REQ")) {
					if (!this.config.options.encrypt) throw new _errors.ConnectionError("Server requires encryption, set 'encrypt' config option to true.", "EENCRYPT");
					this.transitionTo(this.STATE.SENT_TLSSSLNEGOTIATION);
					await Promise.race([this.messageIo.startTls(this.secureContextOptions, this.config.options.serverName ? this.config.options.serverName : this.routingData?.server ?? this.config.server, this.config.options.trustServerCertificate).catch((err) => {
						throw this.wrapSocketError(err);
					}), signalAborted]);
				}
			} finally {
				signal.removeEventListener("abort", onAbort);
			}
		}
		async readPreloginResponse(signal) {
			signal.throwIfAborted();
			let messageBuffer = Buffer.alloc(0);
			const { promise: signalAborted, reject } = withResolvers();
			const onAbort = () => {
				reject(signal.reason);
			};
			signal.addEventListener("abort", onAbort, { once: true });
			try {
				const iterator = (await Promise.race([this.messageIo.readMessage().catch((err) => {
					throw this.wrapSocketError(err);
				}), signalAborted]))[Symbol.asyncIterator]();
				try {
					while (true) {
						const { done, value } = await Promise.race([iterator.next(), signalAborted]);
						if (done) break;
						messageBuffer = Buffer.concat([messageBuffer, value]);
					}
				} finally {
					if (iterator.return) await iterator.return();
				}
			} finally {
				signal.removeEventListener("abort", onAbort);
			}
			const preloginPayload = new _preloginPayload.default(messageBuffer);
			this.debug.payload(function() {
				return preloginPayload.toString("  ");
			});
			return preloginPayload;
		}
		/**
		* @private
		*/
		async performReRouting() {
			this.socket.removeListener("error", this._onSocketError);
			this.socket.removeListener("close", this._onSocketClose);
			this.socket.removeListener("end", this._onSocketEnd);
			this.socket.destroy();
			this.debug.log("connection to " + this.config.server + ":" + this.config.options.port + " closed");
			this.emit("rerouting");
			this.debug.log("Rerouting to " + this.routingData.server + ":" + this.routingData.port);
			this.transitionTo(this.STATE.CONNECTING);
			await this.initialiseConnection();
		}
		/**
		* @private
		*/
		async performTransientFailureRetry() {
			this.curTransientRetryCount++;
			this.socket.removeListener("error", this._onSocketError);
			this.socket.removeListener("close", this._onSocketClose);
			this.socket.removeListener("end", this._onSocketEnd);
			this.socket.destroy();
			this.debug.log("connection to " + this.config.server + ":" + this.config.options.port + " closed");
			const server = this.routingData ? this.routingData.server : this.config.server;
			const port = this.routingData ? this.routingData.port : this.config.options.port;
			this.debug.log("Retry after transient failure connecting to " + server + ":" + port);
			const { promise, resolve } = withResolvers();
			setTimeout(resolve, this.config.options.connectionRetryInterval);
			await promise;
			this.emit("retry");
			this.transitionTo(this.STATE.CONNECTING);
			await this.initialiseConnection();
		}
		/**
		* @private
		*/
		async performSentLogin7WithStandardLogin(signal) {
			signal.throwIfAborted();
			const { promise: signalAborted, reject } = withResolvers();
			const onAbort = () => {
				reject(signal.reason);
			};
			signal.addEventListener("abort", onAbort, { once: true });
			try {
				const message = await Promise.race([this.messageIo.readMessage().catch((err) => {
					throw this.wrapSocketError(err);
				}), signalAborted]);
				const handler = new _handler.Login7TokenHandler(this);
				const tokenStreamParser = this.createTokenStreamParser(message, handler);
				await (0, _events.once)(tokenStreamParser, "end");
				if (handler.loginAckReceived) return handler.routingData;
				else if (this.loginError) throw this.loginError;
				else throw new _errors.ConnectionError("Login failed.", "ELOGIN");
			} finally {
				this.loginError = void 0;
				signal.removeEventListener("abort", onAbort);
			}
		}
		/**
		* @private
		*/
		async performSentLogin7WithNTLMLogin(signal) {
			signal.throwIfAborted();
			const { promise: signalAborted, reject } = withResolvers();
			const onAbort = () => {
				reject(signal.reason);
			};
			signal.addEventListener("abort", onAbort, { once: true });
			try {
				while (true) {
					const message = await Promise.race([this.messageIo.readMessage().catch((err) => {
						throw this.wrapSocketError(err);
					}), signalAborted]);
					const handler = new _handler.Login7TokenHandler(this);
					const tokenStreamParser = this.createTokenStreamParser(message, handler);
					await Promise.race([(0, _events.once)(tokenStreamParser, "end"), signalAborted]);
					if (handler.loginAckReceived) return handler.routingData;
					else if (this.ntlmpacket) {
						const authentication = this.config.authentication;
						const payload = new _ntlmPayload.default({
							domain: authentication.options.domain,
							userName: authentication.options.userName,
							password: authentication.options.password,
							ntlmpacket: this.ntlmpacket
						});
						this.messageIo.sendMessage(_packet.TYPE.NTLMAUTH_PKT, payload.data);
						this.debug.payload(function() {
							return payload.toString("  ");
						});
						this.ntlmpacket = void 0;
					} else if (this.loginError) throw this.loginError;
					else throw new _errors.ConnectionError("Login failed.", "ELOGIN");
				}
			} finally {
				this.loginError = void 0;
				signal.removeEventListener("abort", onAbort);
			}
		}
		/**
		* @private
		*/
		async performSentLogin7WithFedAuth(signal) {
			signal.throwIfAborted();
			const { promise: signalAborted, reject } = withResolvers();
			const onAbort = () => {
				reject(signal.reason);
			};
			signal.addEventListener("abort", onAbort, { once: true });
			try {
				const message = await Promise.race([this.messageIo.readMessage().catch((err) => {
					throw this.wrapSocketError(err);
				}), signalAborted]);
				const handler = new _handler.Login7TokenHandler(this);
				const tokenStreamParser = this.createTokenStreamParser(message, handler);
				await Promise.race([(0, _events.once)(tokenStreamParser, "end"), signalAborted]);
				if (handler.loginAckReceived) return handler.routingData;
				const fedAuthInfoToken = handler.fedAuthInfoToken;
				if (fedAuthInfoToken && fedAuthInfoToken.stsurl && fedAuthInfoToken.spn) {
					/** Federated authentication configation. */
					const authentication = this.config.authentication;
					/** Permission scope to pass to Entra ID when requesting an authentication token. */
					const tokenScope = new _url.URL("/.default", fedAuthInfoToken.spn).toString();
					/** Instance of the token credential to use to authenticate to the resource. */
					let credentials;
					switch (authentication.type) {
						case "token-credential":
							credentials = authentication.options.credential;
							break;
						case "azure-active-directory-password":
							credentials = new _identity.UsernamePasswordCredential(authentication.options.tenantId ?? "common", authentication.options.clientId, authentication.options.userName, authentication.options.password);
							break;
						case "azure-active-directory-msi-vm":
						case "azure-active-directory-msi-app-service":
							const msiArgs = authentication.options.clientId ? [authentication.options.clientId, {}] : [{}];
							credentials = new _identity.ManagedIdentityCredential(...msiArgs);
							break;
						case "azure-active-directory-default":
							const args = authentication.options.clientId ? { managedIdentityClientId: authentication.options.clientId } : {};
							credentials = new _identity.DefaultAzureCredential(args);
							break;
						case "azure-active-directory-service-principal-secret": credentials = new _identity.ClientSecretCredential(authentication.options.tenantId, authentication.options.clientId, authentication.options.clientSecret);
					}
					/** Access token retrieved from Entra ID for the configured permission scope(s). */
					let tokenResponse;
					try {
						tokenResponse = await Promise.race([credentials.getToken(tokenScope), signalAborted]);
					} catch (err) {
						signal.throwIfAborted();
						throw new AggregateError([new _errors.ConnectionError("Security token could not be authenticated or authorized.", "EFEDAUTH"), err]);
					}
					if (tokenResponse === null) throw new AggregateError([new _errors.ConnectionError("Security token could not be authenticated or authorized.", "EFEDAUTH")]);
					this.sendFedAuthTokenMessage(tokenResponse.token);
					this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
					return await this.performSentLogin7WithStandardLogin(signal);
				} else if (this.loginError) throw this.loginError;
				else throw new _errors.ConnectionError("Login failed.", "ELOGIN");
			} finally {
				this.loginError = void 0;
				signal.removeEventListener("abort", onAbort);
			}
		}
		/**
		* @private
		*/
		async performLoggedInSendingInitialSql(signal) {
			signal.throwIfAborted();
			const { promise: signalAborted, reject } = withResolvers();
			const onAbort = () => {
				reject(signal.reason);
			};
			signal.addEventListener("abort", onAbort, { once: true });
			try {
				this.sendInitialSql();
				const message = await Promise.race([this.messageIo.readMessage().catch((err) => {
					throw this.wrapSocketError(err);
				}), signalAborted]);
				const tokenStreamParser = this.createTokenStreamParser(message, new _handler.InitialSqlTokenHandler(this));
				await Promise.race([(0, _events.once)(tokenStreamParser, "end"), signalAborted]);
			} finally {
				signal.removeEventListener("abort", onAbort);
			}
		}
	};
	function isTransientError(error) {
		if (error instanceof AggregateError) error = error.errors[0];
		return error instanceof _errors.ConnectionError && !!error.isTransient;
	}
	exports.default = Connection;
	module.exports = Connection;
	Connection.prototype.STATE = {
		INITIALIZED: {
			name: "Initialized",
			events: {}
		},
		CONNECTING: {
			name: "Connecting",
			events: {}
		},
		SENT_PRELOGIN: {
			name: "SentPrelogin",
			events: {}
		},
		REROUTING: {
			name: "ReRouting",
			events: {}
		},
		TRANSIENT_FAILURE_RETRY: {
			name: "TRANSIENT_FAILURE_RETRY",
			events: {}
		},
		SENT_TLSSSLNEGOTIATION: {
			name: "SentTLSSSLNegotiation",
			events: {}
		},
		SENT_LOGIN7_WITH_STANDARD_LOGIN: {
			name: "SentLogin7WithStandardLogin",
			events: {}
		},
		SENT_LOGIN7_WITH_NTLM: {
			name: "SentLogin7WithNTLMLogin",
			events: {}
		},
		SENT_LOGIN7_WITH_FEDAUTH: {
			name: "SentLogin7WithFedauth",
			events: {}
		},
		LOGGED_IN_SENDING_INITIAL_SQL: {
			name: "LoggedInSendingInitialSql",
			events: {}
		},
		LOGGED_IN: {
			name: "LoggedIn",
			events: { socketError: function() {
				this.transitionTo(this.STATE.FINAL);
				this.cleanupConnection();
			} }
		},
		SENT_CLIENT_REQUEST: {
			name: "SentClientRequest",
			enter: function() {
				(async () => {
					let message;
					try {
						message = await this.messageIo.readMessage();
					} catch (err) {
						this.dispatchEvent("socketError", err);
						process.nextTick(() => {
							this.emit("error", this.wrapSocketError(err));
						});
						return;
					}
					this.clearRequestTimer();
					const tokenStreamParser = this.createTokenStreamParser(message, new _handler.RequestTokenHandler(this, this.request));
					if (this.request?.canceled && this.attentionSent) return this.transitionTo(this.STATE.SENT_ATTENTION);
					const onResume = () => {
						tokenStreamParser.resume();
					};
					const onPause = () => {
						tokenStreamParser.pause();
						this.request?.once("resume", onResume);
					};
					this.request?.on("pause", onPause);
					if (this.request instanceof _request.default && this.request.paused) onPause();
					const onCancel = () => {
						if (!this.attentionSent) return;
						tokenStreamParser.removeListener("end", onEndOfMessage);
						if (this.request instanceof _request.default && this.request.paused) this.request.resume();
						this.request?.removeListener("pause", onPause);
						this.request?.removeListener("resume", onResume);
						this.transitionTo(this.STATE.SENT_ATTENTION);
					};
					const onEndOfMessage = () => {
						this.request?.removeListener("cancel", this._cancelAfterRequestSent);
						this.request?.removeListener("cancel", onCancel);
						this.request?.removeListener("pause", onPause);
						this.request?.removeListener("resume", onResume);
						this.transitionTo(this.STATE.LOGGED_IN);
						const sqlRequest = this.request;
						this.request = void 0;
						if (this.config.options.tdsVersion < "7_2" && sqlRequest.error && this.isSqlBatch) this.inTransaction = false;
						sqlRequest.callback(sqlRequest.error, sqlRequest.rowCount, sqlRequest.rows);
					};
					tokenStreamParser.once("end", onEndOfMessage);
					this.request?.once("cancel", onCancel);
				})();
			},
			exit: function(nextState) {
				this.clearRequestTimer();
			},
			events: { socketError: function(err) {
				const sqlRequest = this.request;
				this.request = void 0;
				this.transitionTo(this.STATE.FINAL);
				this.cleanupConnection();
				sqlRequest.callback(err);
			} }
		},
		SENT_ATTENTION: {
			name: "SentAttention",
			enter: function() {
				(async () => {
					let message;
					try {
						message = await this.messageIo.readMessage();
					} catch (err) {
						this.dispatchEvent("socketError", err);
						process.nextTick(() => {
							this.emit("error", this.wrapSocketError(err));
						});
						return;
					}
					const handler = new _handler.AttentionTokenHandler(this, this.request);
					const tokenStreamParser = this.createTokenStreamParser(message, handler);
					await (0, _events.once)(tokenStreamParser, "end");
					if (handler.attentionReceived) {
						this.attentionSent = false;
						this.clearCancelTimer();
						const sqlRequest = this.request;
						this.request = void 0;
						this.transitionTo(this.STATE.LOGGED_IN);
						if (sqlRequest.error && sqlRequest.error instanceof _errors.RequestError && sqlRequest.error.code === "ETIMEOUT") sqlRequest.callback(sqlRequest.error);
						else sqlRequest.callback(new _errors.RequestError("Canceled.", "ECANCEL"));
					}
				})().catch((err) => {
					process.nextTick(() => {
						throw err;
					});
				});
			},
			events: { socketError: function(err) {
				const sqlRequest = this.request;
				this.request = void 0;
				this.transitionTo(this.STATE.FINAL);
				this.cleanupConnection();
				sqlRequest.callback(err);
			} }
		},
		FINAL: {
			name: "Final",
			events: {}
		}
	};
}));
//#endregion
//#region node_modules/tedious/lib/tedious.js
var require_tedious$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	Object.defineProperty(exports, "BulkLoad", {
		enumerable: true,
		get: function() {
			return _bulkLoad.default;
		}
	});
	Object.defineProperty(exports, "Connection", {
		enumerable: true,
		get: function() {
			return _connection.default;
		}
	});
	Object.defineProperty(exports, "ConnectionError", {
		enumerable: true,
		get: function() {
			return _errors.ConnectionError;
		}
	});
	Object.defineProperty(exports, "ISOLATION_LEVEL", {
		enumerable: true,
		get: function() {
			return _transaction.ISOLATION_LEVEL;
		}
	});
	Object.defineProperty(exports, "Request", {
		enumerable: true,
		get: function() {
			return _request.default;
		}
	});
	Object.defineProperty(exports, "RequestError", {
		enumerable: true,
		get: function() {
			return _errors.RequestError;
		}
	});
	Object.defineProperty(exports, "TDS_VERSION", {
		enumerable: true,
		get: function() {
			return _tdsVersions.versions;
		}
	});
	Object.defineProperty(exports, "TYPES", {
		enumerable: true,
		get: function() {
			return _dataType.TYPES;
		}
	});
	exports.connect = connect;
	exports.library = void 0;
	var _bulkLoad = _interopRequireDefault(require_bulk_load());
	var _connection = _interopRequireDefault(require_connection());
	var _request = _interopRequireDefault(require_request$1());
	var _library = require_library();
	var _errors = require_errors();
	var _dataType = require_data_type();
	var _transaction = require_transaction$1();
	var _tdsVersions = require_tds_versions();
	function _interopRequireDefault(e) {
		return e && e.__esModule ? e : { default: e };
	}
	exports.library = { name: _library.name };
	function connect(config, connectListener) {
		const connection = new _connection.default(config);
		connection.connect(connectListener);
		return connection;
	}
}));
//#endregion
//#region node_modules/mssql/lib/tedious/connection-pool.js
var require_connection_pool = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var tds = require_tedious$1();
	var debug = require_src()("mssql:tedi");
	var BaseConnectionPool = require_connection_pool$1();
	var { IDS } = require_utils();
	var shared = require_shared();
	var ConnectionError = require_connection_error();
	var { CHANNELS, publish } = require_diagnostics();
	var ConnectionPool = class extends BaseConnectionPool {
		_config() {
			const cfg = {
				server: this.config.server,
				options: Object.assign({
					encrypt: typeof this.config.encrypt === "boolean" ? this.config.encrypt : true,
					trustServerCertificate: typeof this.config.trustServerCertificate === "boolean" ? this.config.trustServerCertificate : false
				}, this.config.options),
				authentication: Object.assign({
					type: this.config.domain !== void 0 ? "ntlm" : this.config.authentication_type !== void 0 ? this.config.authentication_type : "default",
					options: Object.entries({
						userName: this.config.user,
						password: this.config.password,
						domain: this.config.domain,
						clientId: this.config.clientId,
						clientSecret: this.config.clientSecret,
						tenantId: this.config.tenantId,
						token: this.config.token,
						msiEndpoint: this.config.msiEndpoint,
						msiSecret: this.config.msiSecret
					}).reduce((acc, [key, val]) => {
						if (typeof val !== "undefined") return {
							...acc,
							[key]: val
						};
						return acc;
					}, {})
				}, this.config.authentication)
			};
			cfg.options.database = cfg.options.database || this.config.database;
			cfg.options.port = cfg.options.port || this.config.port;
			cfg.options.connectTimeout = cfg.options.connectTimeout ?? this.config.connectionTimeout ?? this.config.timeout ?? 15e3;
			cfg.options.requestTimeout = cfg.options.requestTimeout ?? this.config.requestTimeout ?? this.config.timeout ?? 15e3;
			cfg.options.tdsVersion = cfg.options.tdsVersion || "7_4";
			cfg.options.rowCollectionOnDone = cfg.options.rowCollectionOnDone || false;
			cfg.options.rowCollectionOnRequestCompletion = cfg.options.rowCollectionOnRequestCompletion || false;
			cfg.options.useColumnNames = cfg.options.useColumnNames || false;
			cfg.options.appName = cfg.options.appName || "node-mssql";
			if (cfg.options.instanceName) delete cfg.options.port;
			if (isNaN(cfg.options.requestTimeout)) cfg.options.requestTimeout = 15e3;
			if (cfg.options.requestTimeout === Infinity || cfg.options.requestTimeout < 0) cfg.options.requestTimeout = 0;
			if (!cfg.options.debug && this.config.debug) cfg.options.debug = {
				packet: true,
				token: true,
				data: true,
				payload: true
			};
			return cfg;
		}
		_poolCreate() {
			return new shared.Promise((resolve, reject) => {
				const resolveOnce = (v) => {
					resolve(v);
					resolve = reject = () => {};
				};
				const rejectOnce = (e) => {
					reject(e);
					resolve = reject = () => {};
				};
				let tedious;
				try {
					tedious = new tds.Connection(this._config());
				} catch (err) {
					rejectOnce(err);
					return;
				}
				tedious.connect((err) => {
					if (err) {
						err = new ConnectionError(err);
						return rejectOnce(err);
					}
					debug("connection(%d): established", IDS.get(tedious));
					this.collation = tedious.databaseCollation;
					publish(CHANNELS.CONNECTION_CREATE, () => ({
						connectionId: IDS.get(tedious),
						poolId: IDS.get(this),
						server: this.config.server,
						database: this.config.database
					}));
					resolveOnce(tedious);
				});
				IDS.add(tedious, "Connection");
				debug("pool(%d): connection #%d created", IDS.get(this), IDS.get(tedious));
				debug("connection(%d): establishing", IDS.get(tedious));
				tedious.on("end", () => {
					const err = new ConnectionError("The connection ended without ever completing the connection");
					rejectOnce(err);
				});
				tedious.on("error", (err) => {
					if (err.code === "ESOCKET") tedious.hasError = true;
					else this.emit("error", err);
					rejectOnce(err);
				});
				if (this.config.debug) tedious.on("debug", this.emit.bind(this, "debug", tedious));
				if (typeof this.config.beforeConnect === "function") this.config.beforeConnect(tedious);
			});
		}
		_poolValidate(tedious) {
			if (!tedious || tedious.closed || tedious.hasError) return false;
			const mode = this.config.validateConnection;
			if (!mode) return true;
			if (mode === "socket") {
				if (tedious.state !== tedious.STATE.LOGGED_IN) return false;
				if (!tedious.socket || tedious.socket.destroyed || !tedious.socket.writable) return false;
				return true;
			}
			return new shared.Promise((resolve) => {
				const req = new tds.Request("SELECT 1;", (err) => {
					resolve(!err);
				});
				tedious.execSql(req);
			});
		}
		_poolDestroy(tedious) {
			return new shared.Promise((resolve, reject) => {
				if (!tedious) {
					resolve();
					return;
				}
				debug("connection(%d): destroying", IDS.get(tedious));
				const connectionId = IDS.get(tedious);
				const poolId = IDS.get(this);
				if (tedious.closed) {
					debug("connection(%d): already closed", IDS.get(tedious));
					resolve();
				} else {
					tedious.once("end", () => {
						debug("connection(%d): destroyed", IDS.get(tedious));
						publish(CHANNELS.CONNECTION_DESTROY, () => ({
							connectionId,
							poolId
						}));
						resolve();
					});
					tedious.close();
				}
			});
		}
	};
	module.exports = ConnectionPool;
}));
//#endregion
//#region node_modules/mssql/lib/tedious/transaction.js
var require_transaction = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var debug = require_src()("mssql:tedi");
	var BaseTransaction = require_transaction$2();
	var { IDS } = require_utils();
	var TransactionError = require_transaction_error();
	var { CHANNELS, publish } = require_diagnostics();
	var Transaction = class extends BaseTransaction {
		constructor(parent, overrides) {
			super(parent, overrides);
			this._abort = () => {
				if (!this._rollbackRequested) {
					const pc = this._acquiredConnection;
					setImmediate(this.parent.release.bind(this.parent), pc);
					this._acquiredConnection.removeListener("rollbackTransaction", this._abort);
					this._acquiredConnection = null;
					this._acquiredConfig = null;
					this._aborted = true;
					this._abortReason = this._abortReason || /* @__PURE__ */ new Error("Transaction was rolled back by the server");
					publish(CHANNELS.TRANSACTION_ROLLBACK, () => ({
						transactionId: IDS.get(this),
						aborted: true
					}));
					this.emit("rollback", true);
				}
			};
		}
		_begin(isolationLevel, callback) {
			super._begin(isolationLevel, (err) => {
				if (err) return callback(err);
				debug("transaction(%d): begin", IDS.get(this));
				this.parent.acquire(this, (err, connection, config) => {
					if (err) return callback(err);
					this._acquiredConnection = connection;
					this._acquiredConnection.on("rollbackTransaction", this._abort);
					this._acquiredConfig = config;
					connection.beginTransaction((err) => {
						if (err) err = new TransactionError(err);
						debug("transaction(%d): begun", IDS.get(this));
						callback(err);
					}, this.name, this.isolationLevel);
				});
			});
		}
		_commit(callback) {
			super._commit((err) => {
				if (err) return callback(err);
				debug("transaction(%d): commit", IDS.get(this));
				this._acquiredConnection.commitTransaction((err) => {
					if (err) err = new TransactionError(err);
					this._acquiredConnection.removeListener("rollbackTransaction", this._abort);
					this.parent.release(this._acquiredConnection);
					this._acquiredConnection = null;
					this._acquiredConfig = null;
					if (!err) debug("transaction(%d): commited", IDS.get(this));
					callback(err);
				});
			});
		}
		_rollback(callback) {
			super._rollback((err) => {
				if (err) return callback(err);
				debug("transaction(%d): rollback", IDS.get(this));
				this._acquiredConnection.rollbackTransaction((err) => {
					if (err) err = new TransactionError(err);
					this._acquiredConnection.removeListener("rollbackTransaction", this._abort);
					this.parent.release(this._acquiredConnection);
					this._acquiredConnection = null;
					this._acquiredConfig = null;
					if (!err) debug("transaction(%d): rolled back", IDS.get(this));
					callback(err);
				});
			});
		}
	};
	module.exports = Transaction;
}));
//#endregion
//#region node_modules/mssql/lib/udt.js
var require_udt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ensureBytes = (buffer, needed) => {
		if (buffer.position + needed > buffer.length) throw new Error(`Corrupt or truncated spatial data: expected ${needed} bytes at position ${buffer.position}, but only ${buffer.length - buffer.position} bytes remain`);
	};
	var Point = class {
		constructor() {
			this.x = 0;
			this.y = 0;
			this.z = null;
			this.m = null;
		}
	};
	var parsePoints = (buffer, count, isGeometryPoint) => {
		const points = [];
		if (count < 1) return points;
		ensureBytes(buffer, count * 16);
		if (isGeometryPoint) for (let i = 1; i <= count; i++) {
			const point = new Point();
			points.push(point);
			point.x = buffer.readDoubleLE(buffer.position);
			point.y = buffer.readDoubleLE(buffer.position + 8);
			buffer.position += 16;
		}
		else for (let i = 1; i <= count; i++) {
			const point = new Point();
			points.push(point);
			point.lat = buffer.readDoubleLE(buffer.position);
			point.lng = buffer.readDoubleLE(buffer.position + 8);
			point.x = point.lat;
			point.y = point.lng;
			buffer.position += 16;
		}
		return points;
	};
	var parseZ = (buffer, points) => {
		if (points < 1) return;
		ensureBytes(buffer, points.length * 8);
		points.forEach((point) => {
			point.z = buffer.readDoubleLE(buffer.position);
			buffer.position += 8;
		});
	};
	var parseM = (buffer, points) => {
		if (points < 1) return;
		ensureBytes(buffer, points.length * 8);
		points.forEach((point) => {
			point.m = buffer.readDoubleLE(buffer.position);
			buffer.position += 8;
		});
	};
	var parseFigures = (buffer, count, properties) => {
		const figures = [];
		if (count < 1) return figures;
		if (properties.P) figures.push({
			attribute: 1,
			pointOffset: 0
		});
		else if (properties.L) figures.push({
			attribute: 1,
			pointOffset: 0
		});
		else {
			ensureBytes(buffer, count * 5);
			for (let i = 1; i <= count; i++) {
				figures.push({
					attribute: buffer.readUInt8(buffer.position),
					pointOffset: buffer.readInt32LE(buffer.position + 1)
				});
				buffer.position += 5;
			}
		}
		return figures;
	};
	var parseShapes = (buffer, count, properties) => {
		const shapes = [];
		if (count < 1) return shapes;
		if (properties.P) shapes.push({
			parentOffset: -1,
			figureOffset: 0,
			type: 1
		});
		else if (properties.L) shapes.push({
			parentOffset: -1,
			figureOffset: 0,
			type: 2
		});
		else {
			ensureBytes(buffer, count * 9);
			for (let i = 1; i <= count; i++) {
				shapes.push({
					parentOffset: buffer.readInt32LE(buffer.position),
					figureOffset: buffer.readInt32LE(buffer.position + 4),
					type: buffer.readUInt8(buffer.position + 8)
				});
				buffer.position += 9;
			}
		}
		return shapes;
	};
	var parseSegments = (buffer, count) => {
		const segments = [];
		if (count < 1) return segments;
		ensureBytes(buffer, count);
		for (let i = 1; i <= count; i++) {
			segments.push({ type: buffer.readUInt8(buffer.position) });
			buffer.position++;
		}
		return segments;
	};
	var parseGeography = (buffer, isUsingGeometryPoints) => {
		ensureBytes(buffer, 6);
		const srid = buffer.readInt32LE(0);
		if (srid === -1) return null;
		const value = {
			srid,
			version: buffer.readUInt8(4)
		};
		const flags = buffer.readUInt8(5);
		buffer.position = 6;
		const properties = {
			Z: (flags & 1) > 0,
			M: (flags & 2) > 0,
			V: (flags & 4) > 0,
			P: (flags & 8) > 0,
			L: (flags & 16) > 0
		};
		if (value.version === 2) properties.H = (flags & 32) > 0;
		let numberOfPoints;
		if (properties.P) numberOfPoints = 1;
		else if (properties.L) numberOfPoints = 2;
		else {
			ensureBytes(buffer, 4);
			numberOfPoints = buffer.readUInt32LE(buffer.position);
			buffer.position += 4;
		}
		value.points = parsePoints(buffer, numberOfPoints, isUsingGeometryPoints);
		if (properties.Z) parseZ(buffer, value.points);
		if (properties.M) parseM(buffer, value.points);
		let numberOfFigures;
		if (properties.P) numberOfFigures = 1;
		else if (properties.L) numberOfFigures = 1;
		else {
			ensureBytes(buffer, 4);
			numberOfFigures = buffer.readUInt32LE(buffer.position);
			buffer.position += 4;
		}
		value.figures = parseFigures(buffer, numberOfFigures, properties);
		let numberOfShapes;
		if (properties.P) numberOfShapes = 1;
		else if (properties.L) numberOfShapes = 1;
		else {
			ensureBytes(buffer, 4);
			numberOfShapes = buffer.readUInt32LE(buffer.position);
			buffer.position += 4;
		}
		value.shapes = parseShapes(buffer, numberOfShapes, properties);
		if (value.version === 2 && buffer.position + 4 <= buffer.length) {
			const numberOfSegments = buffer.readUInt32LE(buffer.position);
			buffer.position += 4;
			value.segments = parseSegments(buffer, numberOfSegments);
		} else value.segments = [];
		return value;
	};
	module.exports.PARSERS = {
		geography(buffer) {
			return parseGeography(buffer, false);
		},
		geometry(buffer) {
			return parseGeography(buffer, true);
		}
	};
}));
//#endregion
//#region node_modules/mssql/lib/tedious/request.js
var require_request = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var tds = require_tedious$1();
	var debug = require_src()("mssql:tedi");
	var BaseRequest = require_request$2();
	var RequestError = require_request_error();
	var { IDS, objectHasProperty } = require_utils();
	var { TYPES, DECLARATIONS, declare, cast } = require_datatypes();
	var Table = require_table();
	var { PARSERS: UDT } = require_udt();
	var { valueHandler } = require_shared();
	var JSON_COLUMN_ID = "JSON_F52E2B61-18A1-11d1-B105-00805F49916B";
	var XML_COLUMN_ID = "XML_F52E2B61-18A1-11d1-B105-00805F49916B";
	var N_TYPES = {
		BitN: 104,
		DateTimeN: 111,
		DecimalN: 106,
		FloatN: 109,
		IntN: 38,
		MoneyN: 110,
		NumericN: 108
	};
	var getTediousType = function(type) {
		switch (type) {
			case TYPES.VarChar: return tds.TYPES.VarChar;
			case TYPES.NVarChar: return tds.TYPES.NVarChar;
			case TYPES.Text: return tds.TYPES.Text;
			case TYPES.Int: return tds.TYPES.Int;
			case TYPES.BigInt: return tds.TYPES.BigInt;
			case TYPES.TinyInt: return tds.TYPES.TinyInt;
			case TYPES.SmallInt: return tds.TYPES.SmallInt;
			case TYPES.Bit: return tds.TYPES.Bit;
			case TYPES.Float: return tds.TYPES.Float;
			case TYPES.Decimal: return tds.TYPES.Decimal;
			case TYPES.Numeric: return tds.TYPES.Numeric;
			case TYPES.Real: return tds.TYPES.Real;
			case TYPES.Money: return tds.TYPES.Money;
			case TYPES.SmallMoney: return tds.TYPES.SmallMoney;
			case TYPES.Time: return tds.TYPES.Time;
			case TYPES.Date: return tds.TYPES.Date;
			case TYPES.DateTime: return tds.TYPES.DateTime;
			case TYPES.DateTime2: return tds.TYPES.DateTime2;
			case TYPES.DateTimeOffset: return tds.TYPES.DateTimeOffset;
			case TYPES.SmallDateTime: return tds.TYPES.SmallDateTime;
			case TYPES.UniqueIdentifier: return tds.TYPES.UniqueIdentifier;
			case TYPES.Xml: return tds.TYPES.NVarChar;
			case TYPES.Char: return tds.TYPES.Char;
			case TYPES.NChar: return tds.TYPES.NChar;
			case TYPES.NText: return tds.TYPES.NVarChar;
			case TYPES.Image: return tds.TYPES.Image;
			case TYPES.Binary: return tds.TYPES.Binary;
			case TYPES.VarBinary: return tds.TYPES.VarBinary;
			case TYPES.UDT:
			case TYPES.Geography:
			case TYPES.Geometry: return tds.TYPES.UDT;
			case TYPES.TVP: return tds.TYPES.TVP;
			case TYPES.Variant: return tds.TYPES.Variant;
			default: return type;
		}
	};
	var getMssqlType = function(type, length) {
		if (typeof type !== "object") return void 0;
		switch (type) {
			case tds.TYPES.Char: return TYPES.Char;
			case tds.TYPES.NChar: return TYPES.NChar;
			case tds.TYPES.VarChar: return TYPES.VarChar;
			case tds.TYPES.NVarChar: return TYPES.NVarChar;
			case tds.TYPES.Text: return TYPES.Text;
			case tds.TYPES.NText: return TYPES.NText;
			case tds.TYPES.Int: return TYPES.Int;
			case tds.TYPES.BigInt: return TYPES.BigInt;
			case tds.TYPES.TinyInt: return TYPES.TinyInt;
			case tds.TYPES.SmallInt: return TYPES.SmallInt;
			case tds.TYPES.Bit: return TYPES.Bit;
			case tds.TYPES.Float: return TYPES.Float;
			case tds.TYPES.Real: return TYPES.Real;
			case tds.TYPES.Money: return TYPES.Money;
			case tds.TYPES.SmallMoney: return TYPES.SmallMoney;
			case tds.TYPES.Numeric: return TYPES.Numeric;
			case tds.TYPES.Decimal: return TYPES.Decimal;
			case tds.TYPES.DateTime: return TYPES.DateTime;
			case tds.TYPES.Time: return TYPES.Time;
			case tds.TYPES.Date: return TYPES.Date;
			case tds.TYPES.DateTime2: return TYPES.DateTime2;
			case tds.TYPES.DateTimeOffset: return TYPES.DateTimeOffset;
			case tds.TYPES.SmallDateTime: return TYPES.SmallDateTime;
			case tds.TYPES.UniqueIdentifier: return TYPES.UniqueIdentifier;
			case tds.TYPES.Image: return TYPES.Image;
			case tds.TYPES.Binary: return TYPES.Binary;
			case tds.TYPES.VarBinary: return TYPES.VarBinary;
			case tds.TYPES.Xml: return TYPES.Xml;
			case tds.TYPES.UDT: return TYPES.UDT;
			case tds.TYPES.TVP: return TYPES.TVP;
			case tds.TYPES.Variant: return TYPES.Variant;
			default: switch (type.id) {
				case N_TYPES.BitN: return TYPES.Bit;
				case N_TYPES.NumericN: return TYPES.Numeric;
				case N_TYPES.DecimalN: return TYPES.Decimal;
				case N_TYPES.IntN:
					if (length === 8) return TYPES.BigInt;
					if (length === 4) return TYPES.Int;
					if (length === 2) return TYPES.SmallInt;
					return TYPES.TinyInt;
				case N_TYPES.FloatN:
					if (length === 8) return TYPES.Float;
					return TYPES.Real;
				case N_TYPES.MoneyN:
					if (length === 8) return TYPES.Money;
					return TYPES.SmallMoney;
				case N_TYPES.DateTimeN:
					if (length === 8) return TYPES.DateTime;
					return TYPES.SmallDateTime;
			}
		}
	};
	var createColumns = function(metadata, arrayRowMode) {
		let out = {};
		if (arrayRowMode) out = [];
		for (let index = 0, length = metadata.length; index < length; index++) {
			const column = metadata[index];
			const outColumn = {
				index,
				name: column.colName,
				length: column.dataLength,
				type: getMssqlType(column.type, column.dataLength),
				scale: column.scale,
				precision: column.precision,
				nullable: !!(column.flags & 1),
				caseSensitive: !!(column.flags & 2),
				identity: !!(column.flags & 16),
				readOnly: !(column.flags & 12)
			};
			if (column.udtInfo) {
				outColumn.udt = {
					name: column.udtInfo.typeName,
					database: column.udtInfo.dbname,
					schema: column.udtInfo.owningSchema,
					assembly: column.udtInfo.assemblyName
				};
				if (DECLARATIONS[column.udtInfo.typeName]) outColumn.type = DECLARATIONS[column.udtInfo.typeName];
			}
			if (arrayRowMode) out.push(outColumn);
			else out[column.colName] = outColumn;
		}
		return out;
	};
	var valueCorrection = function(value, metadata) {
		const type = getMssqlType(metadata.type, metadata.dataLength);
		if (valueHandler.has(type)) return valueHandler.get(type)(value);
		else if (metadata.type === tds.TYPES.UDT && value != null) if (UDT[metadata.udtInfo.typeName]) return UDT[metadata.udtInfo.typeName](value);
		else return value;
		else return value;
	};
	var parameterCorrection = function(value) {
		if (value instanceof Table) {
			const tvp = {
				name: value.name,
				schema: value.schema,
				columns: [],
				rows: value.rows
			};
			for (const col of value.columns) {
				const tediousType = getTediousType(col.type);
				if (tediousType === tds.TYPES.Variant) throw new RequestError(`Column '${col.name}' in TVP '${value.schema ? value.schema + "." : ""}${value.name}' uses sql_variant which is not supported by the tedious driver for TVP column types. Consider using a more specific data type.`, "EARGS");
				tvp.columns.push({
					name: col.name,
					type: tediousType,
					length: col.length,
					scale: col.scale,
					precision: col.precision
				});
			}
			return tvp;
		} else return value;
	};
	var Request = class extends BaseRequest {
		_batch(batch, callback) {
			this._isBatch = true;
			this._query(batch, callback);
		}
		_bulk(table, options, callback) {
			super._bulk(table, options, (err) => {
				if (err) return callback(err);
				try {
					table._makeBulk();
				} catch (e) {
					return callback(new RequestError(e, "EREQUEST"));
				}
				if (!table.name) return callback(new RequestError("Table name must be specified for bulk insert.", "ENAME"));
				if (table.name.charAt(0) === "@") return callback(new RequestError("You can't use table variables for bulk insert.", "ENAME"));
				const errors = [];
				const errorHandlers = {};
				let hasReturned = false;
				const handleError = (doReturn, connection, info) => {
					let err = new Error(info.message);
					err.info = info;
					err = new RequestError(err, "EREQUEST");
					if (this.stream) this.emit("error", err);
					else if (doReturn && !hasReturned) {
						if (connection) {
							for (const event in errorHandlers) connection.removeListener(event, errorHandlers[event]);
							this.parent.release(connection);
						}
						hasReturned = true;
						callback(err);
					}
					errors.push(err);
				};
				const handleInfo = (msg) => {
					this.emit("info", {
						message: msg.message,
						number: msg.number,
						state: msg.state,
						class: msg.class,
						lineNumber: msg.lineNumber,
						serverName: msg.serverName,
						procName: msg.procName
					});
				};
				this.parent.acquire(this, (err, connection) => {
					const callbackWithRelease = (err, ...args) => {
						try {
							this.parent.release(connection);
						} catch (e) {}
						if (this.parent._aborted) {
							const reason = err || errors[errors.length - 1];
							if (reason) this.parent._abortReason = reason;
						}
						callback(err, ...args);
					};
					if (err) return callbackWithRelease(err);
					debug("connection(%d): borrowed to request #%d", IDS.get(connection), IDS.get(this));
					if (this.canceled) {
						debug("request(%d): canceled", IDS.get(this));
						return callbackWithRelease(new RequestError("Canceled.", "ECANCEL"));
					}
					this._cancel = () => {
						debug("request(%d): cancel", IDS.get(this));
						connection.cancel();
					};
					connection.on("infoMessage", errorHandlers.infoMessage = handleInfo);
					connection.on("errorMessage", errorHandlers.errorMessage = handleError.bind(null, false, connection));
					connection.on("error", errorHandlers.error = handleError.bind(null, true, connection));
					const done = (err, rowCount) => {
						if (err && (!errors.length || errors.length && err.message !== errors[errors.length - 1].message)) {
							err = new RequestError(err, "EREQUEST");
							if (this.stream) this.emit("error", err);
							errors.push(err);
						}
						delete this._cancel;
						let error;
						if (errors.length && !this.stream) {
							error = errors.pop();
							error.precedingErrors = errors;
						}
						if (!hasReturned) {
							for (const event in errorHandlers) connection.removeListener(event, errorHandlers[event]);
							hasReturned = true;
							if (this.stream) callbackWithRelease(null, rowCount);
							else callbackWithRelease(error, rowCount);
						}
					};
					const bulk = connection.newBulkLoad(table.path, options, done);
					for (const col of table.columns) bulk.addColumn(col.name, getTediousType(col.type), {
						nullable: col.nullable,
						length: col.length,
						scale: col.scale,
						precision: col.precision
					});
					if (table.create) {
						const objectid = table.temporary ? `tempdb..[${table.name}]` : table.path;
						const req = new tds.Request(`if object_id('${objectid.replace(/'/g, "''")}') is null ${table.declare()}`, (err) => {
							if (err) return done(err);
							connection.execBulkLoad(bulk, table.rows);
						});
						if (typeof this.overrides.requestTimeout === "number") req.setTimeout(this.overrides.requestTimeout);
						this._setCurrentRequest(req);
						connection.execSqlBatch(req);
					} else connection.execBulkLoad(bulk, table.rows);
				});
			});
		}
		_query(command, callback) {
			super._query(command, (err) => {
				if (err) return callback(err);
				const recordsets = [];
				const recordsetcolumns = [];
				const errors = [];
				const errorHandlers = {};
				const output = {};
				const rowsAffected = [];
				let columns = {};
				let recordset = [];
				let batchLastRow = null;
				let batchHasOutput = false;
				let isChunkedRecordset = false;
				let chunksBuffer = null;
				let hasReturned = false;
				const handleError = (doReturn, connection, info) => {
					let err = new Error(info.message);
					err.info = info;
					err = new RequestError(err, "EREQUEST");
					if (this.stream) this.emit("error", err);
					else if (doReturn && !hasReturned) {
						if (connection) {
							for (const event in errorHandlers) connection.removeListener(event, errorHandlers[event]);
							this.parent.release(connection);
						}
						hasReturned = true;
						callback(err);
					}
					errors.push(err);
				};
				const handleInfo = (msg) => {
					this.emit("info", {
						message: msg.message,
						number: msg.number,
						state: msg.state,
						class: msg.class,
						lineNumber: msg.lineNumber,
						serverName: msg.serverName,
						procName: msg.procName
					});
				};
				this.parent.acquire(this, (err, connection, config) => {
					if (err) return callback(err);
					debug("connection(%d): borrowed to request #%d", IDS.get(connection), IDS.get(this));
					let row;
					if (this.canceled) {
						debug("request(%d): canceled", IDS.get(this));
						this.parent.release(connection);
						return callback(new RequestError("Canceled.", "ECANCEL"));
					}
					this._cancel = () => {
						debug("request(%d): cancel", IDS.get(this));
						connection.cancel();
					};
					connection.on("infoMessage", errorHandlers.infoMessage = handleInfo);
					connection.on("errorMessage", errorHandlers.errorMessage = handleError.bind(null, false, connection));
					connection.on("error", errorHandlers.error = handleError.bind(null, true, connection));
					debug("request(%d): query", IDS.get(this), command);
					const req = new tds.Request(command, (err) => {
						(err?.errors ? err.errors : [err]).forEach((e, i, { length }) => {
							if (e && (!errors.length || errors.length && errors.length >= length && e.message !== errors[errors.length - length + i].message)) {
								e = new RequestError(e, "EREQUEST");
								if (this.stream) this.emit("error", e);
								errors.push(e);
							}
						});
						if (batchHasOutput) {
							if (!this.stream) batchLastRow = recordsets.pop()?.[0];
							for (const name in batchLastRow) {
								const value = batchLastRow[name];
								if (name !== "___return___") output[name] = value;
							}
						}
						delete this._cancel;
						let error;
						if (errors.length && !this.stream) {
							error = errors.pop();
							error.precedingErrors = errors;
						}
						if (!hasReturned) {
							for (const event in errorHandlers) connection.removeListener(event, errorHandlers[event]);
							this.parent.release(connection);
							if (this.parent._aborted) {
								const reason = error || errors[errors.length - 1];
								if (reason) this.parent._abortReason = reason;
							}
							hasReturned = true;
							if (error) debug("request(%d): failed", IDS.get(this), error);
							else debug("request(%d): completed", IDS.get(this));
							if (this.stream) callback(null, null, output, rowsAffected, recordsetcolumns);
							else callback(error, recordsets, output, rowsAffected, recordsetcolumns);
						}
					});
					if (typeof this.overrides.requestTimeout === "number") req.setTimeout(this.overrides.requestTimeout);
					this._setCurrentRequest(req);
					req.on("columnMetadata", (metadata) => {
						columns = createColumns(metadata, this.arrayRowMode);
						isChunkedRecordset = false;
						if (metadata.length === 1 && (metadata[0].colName === JSON_COLUMN_ID || metadata[0].colName === XML_COLUMN_ID)) {
							isChunkedRecordset = true;
							chunksBuffer = [];
						}
						if (this.stream) if (this._isBatch) {
							if (!columns.___return___) this.emit("recordset", columns);
						} else this.emit("recordset", columns);
						if (this.arrayRowMode) recordsetcolumns.push(columns);
					});
					const doneHandler = (rowCount, more) => {
						if (rowCount != null) {
							rowsAffected.push(rowCount);
							if (this.stream) this.emit("rowsaffected", rowCount);
						}
						if (Object.keys(columns).length === 0) return;
						if (isChunkedRecordset) {
							const concatenatedChunks = chunksBuffer.join("");
							if (columns[JSON_COLUMN_ID] && config.parseJSON === true) try {
								if (concatenatedChunks === "") row = null;
								else row = JSON.parse(concatenatedChunks);
							} catch (ex) {
								row = null;
								const ex2 = new RequestError(/* @__PURE__ */ new Error(`Failed to parse incoming JSON. ${ex.message}`), "EJSON");
								if (this.stream) this.emit("error", ex2);
								errors.push(ex2);
							}
							else {
								row = {};
								row[Object.keys(columns)[0]] = concatenatedChunks;
							}
							chunksBuffer = null;
							if (this.stream) this.emit("row", row);
							else recordset.push(row);
						}
						if (!this.stream) {
							Object.defineProperty(recordset, "columns", {
								enumerable: false,
								configurable: true,
								value: columns
							});
							Object.defineProperty(recordset, "toTable", {
								enumerable: false,
								configurable: true,
								value(name) {
									return Table.fromRecordset(this, name);
								}
							});
							recordsets.push(recordset);
						}
						recordset = [];
						columns = {};
					};
					req.on("doneInProc", doneHandler);
					req.on("done", doneHandler);
					req.on("returnValue", (parameterName, value, metadata) => {
						output[parameterName] = value;
					});
					req.on("row", (columns) => {
						if (!recordset) recordset = [];
						if (isChunkedRecordset) return chunksBuffer.push(columns[0].value);
						if (this.arrayRowMode) row = [];
						else row = {};
						for (const col of columns) {
							col.value = valueCorrection(col.value, col.metadata);
							if (this.arrayRowMode) row.push(col.value);
							else {
								const exi = row[col.metadata.colName];
								if (exi !== void 0) if (exi instanceof Array) exi.push(col.value);
								else row[col.metadata.colName] = [exi, col.value];
								else row[col.metadata.colName] = col.value;
							}
						}
						if (this.stream) if (this._isBatch) if (row.___return___) batchLastRow = row;
						else this.emit("row", row);
						else this.emit("row", row);
						else recordset.push(row);
					});
					if (this._isBatch) {
						if (Object.keys(this.parameters).length) {
							for (const name in this.parameters) {
								if (!objectHasProperty(this.parameters, name)) continue;
								const param = this.parameters[name];
								try {
									param.value = getTediousType(param.type).validate(param.value, this.parent.collation);
								} catch (e) {
									e.message = `Validation failed for parameter '${name}'. ${e.message}`;
									const err = new RequestError(e, "EPARAM");
									delete this._cancel;
									if (!hasReturned) {
										for (const event in errorHandlers) connection.removeListener(event, errorHandlers[event]);
										this.parent.release(connection);
										hasReturned = true;
										return callback(err);
									}
									return;
								}
							}
							const declarations = [];
							for (const name in this.parameters) {
								if (!objectHasProperty(this.parameters, name)) continue;
								const param = this.parameters[name];
								declarations.push(`@${name} ${declare(param.type, param)}`);
							}
							const assigns = [];
							for (const name in this.parameters) {
								if (!objectHasProperty(this.parameters, name)) continue;
								const param = this.parameters[name];
								assigns.push(`@${name} = ${cast(param.value, param.type, param)}`);
							}
							const selects = [];
							for (const name in this.parameters) {
								if (!objectHasProperty(this.parameters, name)) continue;
								if (this.parameters[name].io === 2) selects.push(`@${name} as [${name}]`);
							}
							batchHasOutput = selects.length > 0;
							req.sqlTextOrProcedure = `declare ${declarations.join(", ")};select ${assigns.join(", ")};${req.sqlTextOrProcedure};${batchHasOutput ? `select 1 as [___return___], ${selects.join(", ")}` : ""}`;
						}
					}
					try {
						if (!this._isBatch) for (const name in this.parameters) {
							if (!objectHasProperty(this.parameters, name)) continue;
							const param = this.parameters[name];
							if (param.io === 1) req.addParameter(param.name, getTediousType(param.type), parameterCorrection(param.value), {
								length: param.length,
								scale: param.scale,
								precision: param.precision
							});
							else req.addOutputParameter(param.name, getTediousType(param.type), parameterCorrection(param.value), {
								length: param.length,
								scale: param.scale,
								precision: param.precision
							});
						}
						connection[this._isBatch ? "execSqlBatch" : "execSql"](req);
					} catch (error) {
						handleError(true, connection, error);
					}
				});
			});
		}
		_execute(procedure, callback) {
			super._execute(procedure, (err) => {
				if (err) return callback(err);
				const recordsets = [];
				const recordsetcolumns = [];
				const errors = [];
				const errorHandlers = {};
				const output = {};
				const rowsAffected = [];
				let columns = {};
				let recordset = [];
				let returnValue = 0;
				let isChunkedRecordset = false;
				let chunksBuffer = null;
				let hasReturned = false;
				const handleError = (doReturn, connection, info) => {
					let err = new Error(info.message);
					err.info = info;
					err = new RequestError(err, "EREQUEST");
					if (this.stream) this.emit("error", err);
					else if (doReturn && !hasReturned) {
						if (connection) {
							for (const event in errorHandlers) connection.removeListener(event, errorHandlers[event]);
							this.parent.release(connection);
						}
						hasReturned = true;
						callback(err);
					}
					errors.push(err);
				};
				const handleInfo = (msg) => {
					this.emit("info", {
						message: msg.message,
						number: msg.number,
						state: msg.state,
						class: msg.class,
						lineNumber: msg.lineNumber,
						serverName: msg.serverName,
						procName: msg.procName
					});
				};
				this.parent.acquire(this, (err, connection, config) => {
					if (err) return callback(err);
					debug("connection(%d): borrowed to request #%d", IDS.get(connection), IDS.get(this));
					let row;
					if (this.canceled) {
						debug("request(%d): canceled", IDS.get(this));
						this.parent.release(connection);
						return callback(new RequestError("Canceled.", "ECANCEL"));
					}
					this._cancel = () => {
						debug("request(%d): cancel", IDS.get(this));
						connection.cancel();
					};
					connection.on("infoMessage", errorHandlers.infoMessage = handleInfo);
					connection.on("errorMessage", errorHandlers.errorMessage = handleError.bind(null, false, connection));
					connection.on("error", errorHandlers.error = handleError.bind(null, true, connection));
					if (debug.enabled) {
						const params = Object.keys(this.parameters).map((k) => this.parameters[k]);
						const logValue = (s) => typeof s === "string" && s.length > 50 ? s.substring(0, 47) + "..." : s;
						const logName = (param) => param.name + " [sql." + param.type.name + "]";
						const logParams = {};
						params.forEach((p) => {
							logParams[logName(p)] = logValue(p.value);
						});
						debug("request(%d): execute %s %O", IDS.get(this), procedure, logParams);
					}
					const req = new tds.Request(procedure, (err) => {
						if (err && (!errors.length || errors.length && err.message !== errors[errors.length - 1].message)) {
							err = new RequestError(err, "EREQUEST");
							if (this.stream) this.emit("error", err);
							errors.push(err);
						}
						delete this._cancel;
						let error;
						if (errors.length && !this.stream) {
							error = errors.pop();
							error.precedingErrors = errors;
						}
						if (!hasReturned) {
							for (const event in errorHandlers) connection.removeListener(event, errorHandlers[event]);
							this.parent.release(connection);
							if (this.parent._aborted) {
								const reason = error || errors[errors.length - 1];
								if (reason) this.parent._abortReason = reason;
							}
							hasReturned = true;
							if (error) debug("request(%d): failed", IDS.get(this), error);
							else debug("request(%d): complete", IDS.get(this));
							if (this.stream) callback(null, null, output, returnValue, rowsAffected, recordsetcolumns);
							else callback(error, recordsets, output, returnValue, rowsAffected, recordsetcolumns);
						}
					});
					if (typeof this.overrides.requestTimeout === "number") req.setTimeout(this.overrides.requestTimeout);
					this._setCurrentRequest(req);
					req.on("columnMetadata", (metadata) => {
						columns = createColumns(metadata, this.arrayRowMode);
						isChunkedRecordset = false;
						if (metadata.length === 1 && (metadata[0].colName === JSON_COLUMN_ID || metadata[0].colName === XML_COLUMN_ID)) {
							isChunkedRecordset = true;
							chunksBuffer = [];
						}
						if (this.stream) this.emit("recordset", columns);
						if (this.arrayRowMode) recordsetcolumns.push(columns);
					});
					req.on("row", (columns) => {
						if (!recordset) recordset = [];
						if (isChunkedRecordset) return chunksBuffer.push(columns[0].value);
						if (this.arrayRowMode) row = [];
						else row = {};
						for (const col of columns) {
							col.value = valueCorrection(col.value, col.metadata);
							if (this.arrayRowMode) row.push(col.value);
							else {
								const exi = row[col.metadata.colName];
								if (exi != null) if (exi instanceof Array) exi.push(col.value);
								else row[col.metadata.colName] = [exi, col.value];
								else row[col.metadata.colName] = col.value;
							}
						}
						if (this.stream) this.emit("row", row);
						else recordset.push(row);
					});
					req.on("doneInProc", (rowCount, more) => {
						if (rowCount != null) {
							rowsAffected.push(rowCount);
							if (this.stream) this.emit("rowsaffected", rowCount);
						}
						if (Object.keys(columns).length === 0) return;
						if (isChunkedRecordset) {
							if (columns[JSON_COLUMN_ID] && config.parseJSON === true) try {
								if (chunksBuffer.length === 0) row = null;
								else row = JSON.parse(chunksBuffer.join(""));
							} catch (ex) {
								row = null;
								const ex2 = new RequestError(/* @__PURE__ */ new Error(`Failed to parse incoming JSON. ${ex.message}`), "EJSON");
								if (this.stream) this.emit("error", ex2);
								errors.push(ex2);
							}
							else {
								row = {};
								row[Object.keys(columns)[0]] = chunksBuffer.join("");
							}
							chunksBuffer = null;
							if (this.stream) this.emit("row", row);
							else recordset.push(row);
						}
						if (!this.stream) {
							Object.defineProperty(recordset, "columns", {
								enumerable: false,
								configurable: true,
								value: columns
							});
							Object.defineProperty(recordset, "toTable", {
								enumerable: false,
								configurable: true,
								value(name) {
									return Table.fromRecordset(this, name);
								}
							});
							recordsets.push(recordset);
						}
						recordset = [];
						columns = {};
					});
					req.on("doneProc", (rowCount, more, returnStatus) => {
						returnValue = returnStatus;
					});
					req.on("returnValue", (parameterName, value, metadata) => {
						output[parameterName] = value;
					});
					try {
						for (const name in this.parameters) {
							if (!objectHasProperty(this.parameters, name)) continue;
							const param = this.parameters[name];
							if (param.io === 1) req.addParameter(param.name, getTediousType(param.type), parameterCorrection(param.value), {
								length: param.length,
								scale: param.scale,
								precision: param.precision
							});
							else req.addOutputParameter(param.name, getTediousType(param.type), parameterCorrection(param.value), {
								length: param.length,
								scale: param.scale,
								precision: param.precision
							});
						}
						connection.callProcedure(req);
					} catch (error) {
						const err = error instanceof RequestError ? error : new RequestError(error, "EREQUEST");
						delete this._cancel;
						if (!hasReturned) {
							for (const event in errorHandlers) connection.removeListener(event, errorHandlers[event]);
							this.parent.release(connection);
							hasReturned = true;
							callback(err);
						}
					}
				});
			});
		}
		_pause() {
			super._pause();
			if (this._currentRequest) this._currentRequest.pause();
		}
		_resume() {
			super._resume();
			if (this._currentRequest) this._currentRequest.resume();
		}
	};
	module.exports = Request;
}));
//#endregion
//#region node_modules/mssql/lib/tedious/index.js
var require_tedious = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var base = require_base();
	var ConnectionPool = require_connection_pool();
	var Transaction = require_transaction();
	var Request = require_request();
	module.exports = Object.assign({
		ConnectionPool,
		Transaction,
		Request,
		PreparedStatement: base.PreparedStatement
	}, base.exports);
	Object.defineProperty(module.exports, "Promise", {
		enumerable: true,
		get: () => {
			return base.Promise;
		},
		set: (value) => {
			base.Promise = value;
		}
	});
	Object.defineProperty(module.exports, "valueHandler", {
		enumerable: true,
		value: base.valueHandler,
		writable: false,
		configurable: false
	});
	base.driver.name = "tedious";
	base.driver.ConnectionPool = ConnectionPool;
	base.driver.Transaction = Transaction;
	base.driver.Request = Request;
}));
//#endregion
//#region node_modules/mssql/index.js
var require_mssql = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_tedious();
}));
//#endregion
export { require_mssql as t };
