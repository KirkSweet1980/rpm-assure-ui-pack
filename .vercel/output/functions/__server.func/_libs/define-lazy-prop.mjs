import { n as __esmMin } from "../_runtime.mjs";
//#region node_modules/define-lazy-prop/index.js
function defineLazyProperty(object, propertyName, valueGetter) {
	const define = (value) => Object.defineProperty(object, propertyName, {
		value,
		enumerable: true,
		writable: true
	});
	Object.defineProperty(object, propertyName, {
		configurable: true,
		enumerable: true,
		get() {
			const result = valueGetter();
			define(result);
			return result;
		},
		set(value) {
			define(value);
		}
	});
	return object;
}
var init_define_lazy_prop = __esmMin((() => {}));
//#endregion
export { init_define_lazy_prop as n, defineLazyProperty as t };
