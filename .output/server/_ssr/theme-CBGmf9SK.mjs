import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/theme-CBGmf9SK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STORAGE_KEY$1 = "rpma-density";
var DensityContext = (0, import_react.createContext)(null);
function readStored() {
	if (typeof window === "undefined") return "compact";
	try {
		const v = localStorage.getItem(STORAGE_KEY$1);
		if (v === "comfortable" || v === "compact") return v;
	} catch {}
	if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) return "comfortable";
	return "compact";
}
function DensityProvider({ children }) {
	const [density, setDensityState] = (0, import_react.useState)("compact");
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setDensityState(readStored());
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		document.documentElement.dataset.density = density;
		try {
			localStorage.setItem(STORAGE_KEY$1, density);
		} catch {}
	}, [density, ready]);
	const setDensity = (0, import_react.useCallback)((d) => setDensityState(d), []);
	const toggle = (0, import_react.useCallback)(() => setDensityState((d) => d === "compact" ? "comfortable" : "compact"), []);
	const value = (0, import_react.useMemo)(() => ({
		density,
		setDensity,
		toggle,
		isCompact: density === "compact"
	}), [
		density,
		setDensity,
		toggle
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DensityContext.Provider, {
		value,
		children
	});
}
function useDensity() {
	const ctx = (0, import_react.useContext)(DensityContext);
	if (!ctx) return {
		density: "compact",
		setDensity: (_) => {},
		toggle: () => {},
		isCompact: true
	};
	return ctx;
}
var STORAGE_KEY = "rpma-theme";
var ThemeContext = (0, import_react.createContext)(null);
function systemPrefersDark() {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function readStoredPreference() {
	if (typeof window === "undefined") return "auto";
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v === "light" || v === "dark" || v === "auto") return v;
		if (v === "system") return "auto";
	} catch {}
	return "auto";
}
function resolve(pref) {
	if (pref === "auto") return systemPrefersDark() ? "dark" : "light";
	return pref;
}
function applyDom(mode) {
	document.documentElement.dataset.theme = mode;
	document.documentElement.style.colorScheme = mode;
	document.documentElement.classList.toggle("dark", mode === "dark");
}
function ThemeProvider({ children }) {
	const [preference, setPreferenceState] = (0, import_react.useState)("auto");
	const [theme, setThemeResolved] = (0, import_react.useState)("light");
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const pref = readStoredPreference();
		setPreferenceState(pref);
		const mode = resolve(pref);
		setThemeResolved(mode);
		applyDom(mode);
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => {
			if (preference === "auto") {
				const mode = resolve("auto");
				setThemeResolved(mode);
				applyDom(mode);
			}
		};
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, [preference, ready]);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		const mode = resolve(preference);
		setThemeResolved(mode);
		applyDom(mode);
		try {
			localStorage.setItem(STORAGE_KEY, preference);
		} catch {}
	}, [preference, ready]);
	const setPreference = (0, import_react.useCallback)((t) => {
		setPreferenceState(t);
	}, []);
	const setTheme = (0, import_react.useCallback)((t) => {
		setPreferenceState(t);
	}, []);
	const toggle = (0, import_react.useCallback)(() => {
		setPreferenceState((p) => {
			return resolve(p) === "light" ? "dark" : "light";
		});
	}, []);
	const value = (0, import_react.useMemo)(() => ({
		preference,
		theme,
		setPreference,
		setTheme,
		toggle,
		isDark: theme === "dark"
	}), [
		preference,
		theme,
		setPreference,
		setTheme,
		toggle
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeContext.Provider, {
		value,
		children
	});
}
function useTheme() {
	const ctx = (0, import_react.useContext)(ThemeContext);
	if (!ctx) return {
		preference: "auto",
		theme: "light",
		setPreference: (_) => {},
		setTheme: (_) => {},
		toggle: () => {},
		isDark: false
	};
	return ctx;
}
//#endregion
export { useTheme as i, ThemeProvider as n, useDensity as r, DensityProvider as t };
