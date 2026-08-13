import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as signOut, t as authClient } from "./client-GruXRyhu.mjs";
import { n as useCurrentUserState } from "./use-current-user-CsON5Gdz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/idle-logout-CvUgb-Vj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Default idle timeout: 5 minutes */
var IDLE_LOGOUT_MS = 3e5;
/** Coalesce activity (mousemove etc.) — was firing on every pixel and resetting timers constantly */
var ACTIVITY_THROTTLE_MS = 2e3;
var ACTIVITY_EVENTS = [
	"mousedown",
	"keydown",
	"touchstart",
	"pointerdown",
	"scroll"
];
/**
* Signs the user out after `timeoutMs` of no activity.
* Mount once inside authenticated layout (AppShell).
*/
function useIdleLogout(timeoutMs = IDLE_LOGOUT_MS) {
	const { user, isPending } = useCurrentUserState();
	const timer = (0, import_react.useRef)(null);
	const armed = (0, import_react.useRef)(false);
	const lastActivity = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		if (isPending || !user) {
			if (timer.current) clearTimeout(timer.current);
			armed.current = false;
			return;
		}
		armed.current = true;
		const logout = () => {
			if (!armed.current) return;
			armed.current = false;
			(async () => {
				try {
					await signOut();
				} catch {
					try {
						await authClient.signOut();
					} catch {}
				}
				if (typeof window !== "undefined") window.location.href = "/login?reason=idle";
			})();
		};
		const reset = () => {
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(logout, timeoutMs);
		};
		const onActivity = () => {
			const now = Date.now();
			if (now - lastActivity.current < ACTIVITY_THROTTLE_MS) return;
			lastActivity.current = now;
			reset();
		};
		reset();
		for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, {
			passive: true,
			capture: true
		});
		window.addEventListener("mousemove", onActivity, { passive: true });
		window.addEventListener("wheel", onActivity, { passive: true });
		return () => {
			armed.current = false;
			if (timer.current) clearTimeout(timer.current);
			for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity, true);
			window.removeEventListener("mousemove", onActivity);
			window.removeEventListener("wheel", onActivity);
		};
	}, [
		user,
		isPending,
		timeoutMs
	]);
}
/** Shown on login when redirected after idle timeout */
function IdleLogoutBanner() {
	if (typeof window === "undefined") return null;
	if (new URLSearchParams(window.location.search).get("reason") !== "idle") return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "status",
		className: "mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-fg",
		children: "You were signed out after 5 minutes of inactivity."
	});
}
//#endregion
export { useIdleLogout as n, IdleLogoutBanner as t };
