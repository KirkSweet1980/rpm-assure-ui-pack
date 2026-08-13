import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as createServerFn } from "./ssr.mjs";
import { t as createSsrRpc } from "./createSsrRpc-C1p7zOu_.mjs";
import { n as useCurrentUserState } from "./use-current-user-CsON5Gdz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-staff-profile-CtJQjgds.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var fetchStaffProfile = createServerFn({ method: "GET" }).validator((data) => data).handler(createSsrRpc("db9649bf2839603866fd1f3a2323271f30b411578fdfe26dcf59b1ccd7b8ef6e"));
var profileCache = /* @__PURE__ */ new Map();
var PROFILE_TTL = 12e4;
function useStaffProfile() {
	const { user, isPending: userPending } = useCurrentUserState();
	const email = user?.primaryEmail ?? null;
	const cached = email && profileCache.has(email.toLowerCase()) ? profileCache.get(email.toLowerCase()) : null;
	const fresh = cached && Date.now() - cached.at < PROFILE_TTL ? cached.profile : null;
	const [profile, setProfile] = (0, import_react.useState)(fresh);
	const [loading, setLoading] = (0, import_react.useState)(!fresh && !!email);
	(0, import_react.useEffect)(() => {
		if (userPending) return;
		if (!email) {
			setProfile(null);
			setLoading(false);
			return;
		}
		const key = email.toLowerCase();
		const hit = profileCache.get(key);
		if (hit && Date.now() - hit.at < PROFILE_TTL) {
			setProfile(hit.profile);
			setLoading(false);
			return;
		}
		if (hit?.profile) {
			setProfile(hit.profile);
			setLoading(false);
		}
		let cancelled = false;
		if (!hit?.profile) setLoading(true);
		fetchStaffProfile({ data: {
			email,
			displayName: user?.displayName
		} }).then((p) => {
			if (cancelled) return;
			if (p) profileCache.set(key, {
				at: Date.now(),
				profile: p
			});
			setProfile(p);
		}).catch(() => {
			if (!cancelled) setProfile(null);
		}).finally(() => {
			if (!cancelled) setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [
		email,
		user?.displayName,
		userPending
	]);
	return {
		profile,
		isPending: userPending || loading,
		userPending
	};
}
//#endregion
export { useStaffProfile as t };
