//#region node_modules/.nitro/vite/services/ssr/assets/root-admin-vQ7nqsRE.js
var ROOT_ADMIN_EMAIL = "rpmadmin@rpm.local";
/** Map username or email → auth email (Better Auth needs an email). */
function normalizeLoginIdentifier(raw) {
	const s = raw.trim().toLowerCase();
	if (!s) return s;
	if (s.includes("@")) return s;
	if (s === "rpmadmin" || s === "rpmadmin" || s === "rpmroot") return ROOT_ADMIN_EMAIL;
	return `${s}@rpm.local`;
}
//#endregion
export { normalizeLoginIdentifier as n, ROOT_ADMIN_EMAIL as t };
