import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { t as Badge } from "./badge-BccjJCAV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rag-badge--H4DTZx7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var done = /* @__PURE__ */ new Map();
var inflight = /* @__PURE__ */ new Map();
var active = 0;
var queue = [];
var DONE_TTL_MS = 9e4;
var MAX_CONCURRENT = 2;
function normalizeHref(href) {
	if (!href) return "";
	try {
		if (/^https?:\/\//i.test(href)) {
			const u = new URL(href);
			return (u.pathname.replace(/\/$/, "") || "/") + (u.search || "");
		}
	} catch {}
	const bare = (href.split("#")[0] || "").replace(/\/$/, "") || "/";
	return bare.startsWith("/") ? bare : `/${bare}`;
}
function pump() {
	while (active < MAX_CONCURRENT && queue.length > 0) queue.shift()?.();
}
/**
* Preload a route by in-app href. Safe to call frequently.
* Returns immediately; work is scheduled with concurrency limit.
*/
function preloadHref(router, href, opts) {
	if (!router || !href) return;
	if (typeof window === "undefined") return;
	const key = normalizeHref(href);
	if (!key || key === "#") return;
	try {
		if (normalizeHref(router.state?.location?.pathname || window.location.pathname) === key) {
			done.set(key, Date.now());
			return;
		}
	} catch {}
	const now = Date.now();
	if (!opts?.force) {
		const at = done.get(key);
		if (at != null && now - at < DONE_TTL_MS) return;
		if (inflight.has(key)) return;
	}
	const run = () => {
		active += 1;
		const p = (async () => {
			try {
				const loc = typeof router.buildLocation === "function" ? router.buildLocation({
					to: key,
					href: key
				}) : null;
				if (typeof router.preloadRoute === "function") await Promise.resolve(router.preloadRoute({
					to: key,
					href: key,
					...loc ? { from: loc } : {}
				}));
				else if (typeof router.load === "function") await Promise.resolve(router.load({
					to: key,
					href: key
				}));
				done.set(key, Date.now());
			} catch {
				done.delete(key);
			} finally {
				inflight.delete(key);
				active = Math.max(0, active - 1);
				pump();
			}
		})();
		inflight.set(key, p);
	};
	if (opts?.priority === "high" && active < MAX_CONCURRENT) run();
	else {
		queue.push(run);
		if (opts?.priority === "high" && queue.length > 1) {
			const job = queue.pop();
			queue.unshift(job);
		}
		pump();
	}
}
/**
* Warm a list of hrefs during browser idle time (after paint).
* Used when landing on a customer workspace to preload covered pillars.
*/
function warmHrefsIdle(router, hrefs, opts) {
	if (!router || typeof window === "undefined") return () => {};
	const delay = opts?.delayMs ?? 120;
	const max = opts?.max ?? 8;
	const list = [...new Set(hrefs.map(normalizeHref).filter(Boolean))].slice(0, max);
	let cancelled = false;
	let idleId = null;
	let timeoutId = null;
	let i = 0;
	const step = () => {
		if (cancelled || i >= list.length) return;
		const href = list[i++];
		preloadHref(router, href, { priority: "low" });
		if (i < list.length) schedule();
	};
	const schedule = () => {
		if (cancelled) return;
		const ric = window.requestIdleCallback;
		if (typeof ric === "function") idleId = ric(() => step(), { timeout: 1200 });
		else timeoutId = setTimeout(step, 80);
	};
	timeoutId = setTimeout(() => {
		if (!cancelled) schedule();
	}, delay);
	return () => {
		cancelled = true;
		if (timeoutId != null) clearTimeout(timeoutId);
		if (idleId != null) {
			const cic = window.cancelIdleCallback;
			cic?.(idleId);
		}
	};
}
/** Default intent delay — avoid preload storm when sweeping across the nav. */
var INTENT_DELAY_MS = 45;
/**
* Client-side navigation without a full document reload.
* Intent preload (hover/focus/touch) is debounced + deduped via shared strategy.
* forwardRef so Radix DropdownMenuItem asChild works (Phase 3).
*/
var SpaLink = (0, import_react.forwardRef)(function SpaLink({ href, className, children, onClick, replace = false, preload = true, ...rest }, ref) {
	const router = useRouter();
	const timer = (0, import_react.useRef)(null);
	const cancelIntent = () => {
		if (timer.current != null) {
			clearTimeout(timer.current);
			timer.current = null;
		}
	};
	const scheduleIntent = () => {
		if (!preload) return;
		cancelIntent();
		timer.current = setTimeout(() => {
			timer.current = null;
			preloadHref(router, href, { priority: "high" });
		}, INTENT_DELAY_MS);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		ref,
		href,
		className,
		onMouseEnter: scheduleIntent,
		onMouseLeave: cancelIntent,
		onFocus: scheduleIntent,
		onBlur: cancelIntent,
		onTouchStart: () => {
			if (preload) preloadHref(router, href, { priority: "high" });
		},
		onClick: (e) => {
			onClick?.(e);
			if (e.defaultPrevented) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
			const target = e.currentTarget.target;
			if (target && target !== "_self") return;
			e.preventDefault();
			cancelIntent();
			if (preload) preloadHref(router, href, { priority: "high" });
			router.navigate({
				href,
				replace,
				resetScroll: false
			});
		},
		...rest,
		children
	});
});
/** Programmatic SPA navigation (customer switcher, etc.) */
function useSpaNavigate() {
	const router = useRouter();
	return (href, opts) => {
		preloadHref(router, href, { priority: "high" });
		router.navigate({
			href,
			replace: opts?.replace,
			resetScroll: false
		});
	};
}
function RagBadge({ rag, className }) {
	const variant = rag === "Red" ? "red" : rag === "Amber" ? "amber" : "green";
	const dot = rag === "Red" ? "bg-rag-red" : rag === "Amber" ? "bg-rag-amber" : "bg-rag-green";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
		variant,
		className: cn("gap-1.5 font-semibold", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("h-1.5 w-1.5 shrink-0 rounded-full", dot),
			"aria-hidden": true
		}), rag]
	});
}
//#endregion
export { warmHrefsIdle as i, SpaLink as n, useSpaNavigate as r, RagBadge as t };
