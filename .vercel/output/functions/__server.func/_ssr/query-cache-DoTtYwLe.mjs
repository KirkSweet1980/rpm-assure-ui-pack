//#region node_modules/.nitro/vite/services/ssr/assets/query-cache-DoTtYwLe.js
var store = /* @__PURE__ */ new Map();
/** In-flight promises so parallel loaders do not stampede SQL */
var inflight = /* @__PURE__ */ new Map();
function cacheGet(key, ttlMs) {
	const e = store.get(key);
	if (!e) return void 0;
	if (Date.now() - e.at > ttlMs) {
		store.delete(key);
		return;
	}
	return e.value;
}
function cacheSet(key, value) {
	if (value === null || value === void 0) return;
	store.set(key, {
		at: Date.now(),
		value
	});
}
function cacheInvalidate(prefix) {
	if (!prefix) {
		store.clear();
		inflight.clear();
		return;
	}
	for (const k of [...store.keys()]) if (k === prefix || k.startsWith(prefix)) store.delete(k);
	for (const k of [...inflight.keys()]) if (k === prefix || k.startsWith(prefix)) inflight.delete(k);
}
/**
* Coalesce concurrent loaders for the same key.
* First caller runs `fn`; others await the same promise.
* Null results are returned but not stored (see cacheSet).
*/
async function cacheGetOrLoad(key, ttlMs, fn) {
	const hit = cacheGet(key, ttlMs);
	if (hit !== void 0) return hit;
	const pending = inflight.get(key);
	if (pending) return pending;
	const p = (async () => {
		try {
			const value = await fn();
			cacheSet(key, value);
			return value;
		} finally {
			inflight.delete(key);
		}
	})();
	inflight.set(key, p);
	return p;
}
/** Portfolio TTL — keep estate snappy without hammering SQL */
var PORTFOLIO_TTL_MS = 12e4;
/** Customer detail TTL — longer so pillar/module clicks stay instant */
var CUSTOMER_TTL_MS = 18e4;
//#endregion
export { CUSTOMER_TTL_MS, PORTFOLIO_TTL_MS, cacheGet, cacheGetOrLoad, cacheInvalidate };
