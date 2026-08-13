import { t as getRequest } from "./server-CjldIDVK.mjs";
import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { r as hasSqlConfig, t as getDataMode } from "./sql-config-BAM-cI78.mjs";
import { n as getPool, r as import_mssql } from "./sql-pool-kLXZ0UEv.mjs";
import { n as authConfigured, t as auth } from "./server-DhYyBlji.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/self-profile-CmWodOrv.js
/**
* Signed-in staff can update their own display name in SQL App_User.
*/
function normEmail(e) {
	return e.trim().toLowerCase();
}
var updateMyProfile_createServerFn_handler = createServerRpc({
	id: "81651d552f545c58260a53aa0b7463876284192233f5b62e24f4b6efe55d5655",
	name: "updateMyProfile",
	filename: "src/lib/auth/self-profile.ts"
}, (opts) => updateMyProfile.__executeServer(opts));
var updateMyProfile = createServerFn({ method: "POST" }).validator((data) => data).handler(updateMyProfile_createServerFn_handler, async ({ data }) => {
	if (!authConfigured) return {
		ok: true,
		message: "Auth off — profile not persisted."
	};
	const request = getRequest();
	if (!request) throw new Error("No request");
	const session = await auth.api.getSession({ headers: request.headers });
	const email = session?.user?.email ? normEmail(session.user.email) : null;
	if (!email) throw new Error("Sign in required.");
	const displayName = (data.displayName ?? "").trim();
	if (!displayName) throw new Error("Display name is required.");
	try {
		await auth.api.updateUser({
			body: { name: displayName },
			headers: request.headers
		});
	} catch {}
	if (!hasSqlConfig() || getDataMode() === "demo") return {
		ok: true,
		message: "Profile updated (auth)."
	};
	try {
		const pool = await getPool();
		if (!pool) return {
			ok: true,
			message: "Profile updated (auth; SQL offline)."
		};
		await pool.request().input("email", import_mssql.default.NVarChar(256), email).input("dn", import_mssql.default.NVarChar(200), displayName).query(`
          IF EXISTS (SELECT 1 FROM dbo.App_User WHERE LOWER(Email) = @email)
            UPDATE dbo.App_User
            SET DisplayName = @dn, UpdatedAt = SYSUTCDATETIME()
            WHERE LOWER(Email) = @email;
        `);
		return {
			ok: true,
			message: "Profile updated."
		};
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e)
		};
	}
});
//#endregion
export { updateMyProfile_createServerFn_handler };
