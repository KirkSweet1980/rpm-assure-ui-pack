import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { r as hasSqlConfig, t as getDataMode } from "./sql-config-BAM-cI78.mjs";
import { n as getPool, r as import_mssql } from "./sql-pool-kLXZ0UEv.mjs";
import { n as isStaffRole, r as permissionsFor, t as adminEmailsFromEnv } from "./roles-D3FgOqTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/staff-profile-CRbti-5X.js
async function resolveProfile(email, displayName) {
	const norm = email.trim().toLowerCase();
	const admins = adminEmailsFromEnv();
	if (hasSqlConfig() && getDataMode() !== "demo") try {
		const pool = await getPool();
		if (pool) {
			const row = (await pool.request().input("email", import_mssql.default.NVarChar(256), norm).query(`
            SELECT TOP 1
              DisplayName,
              StaffRole,
              IsPlatformAdmin,
              IsActive,
              CONVERT(nvarchar(36), AppUserId) AS AppUserId
            FROM dbo.App_User
            WHERE LOWER(Email) = @email
          `)).recordset[0];
			if (row && row.IsActive) {
				let role = "TechnicalReadOnly";
				if (row.IsPlatformAdmin || row.StaffRole === "PlatformAdmin") role = "PlatformAdmin";
				else if (isStaffRole(row.StaffRole)) role = row.StaffRole;
				if (admins.includes(norm) || norm === "rpmadmin@rpm.local") role = "PlatformAdmin";
				let allowed = null;
				if (role !== "PlatformAdmin") {
					const codes = ((await pool.request().input("id", import_mssql.default.UniqueIdentifier, row.AppUserId).query(`
                SELECT CustomerCode
                FROM dbo.App_UserCustomer
                WHERE AppUserId = @id
              `)).recordset ?? []).map((c) => c.CustomerCode);
					allowed = codes.length > 0 ? codes : null;
				}
				return {
					email: norm,
					displayName: row.DisplayName || displayName,
					role,
					permissions: permissionsFor(role),
					source: "sql",
					allowedCustomerCodes: allowed
				};
			}
			if (row && !row.IsActive) return {
				email: norm,
				displayName,
				role: "TechnicalReadOnly",
				permissions: {
					...permissionsFor("TechnicalReadOnly"),
					canViewPortfolio: false,
					canViewCustomer: false,
					canViewTechnicalDetail: false,
					canEdit: false,
					canManageStaff: false,
					canAccessPlatformSettings: false,
					label: "Inactive"
				},
				source: "denied",
				allowedCustomerCodes: []
			};
		}
	} catch (e) {
		console.warn("[staff-profile] SQL lookup failed", e);
	}
	if (admins.includes(norm) || norm === "rpmadmin@rpm.local") {
		const role = "PlatformAdmin";
		return {
			email: norm,
			displayName: displayName || "RPM Root",
			role,
			permissions: permissionsFor(role),
			source: "env-admin",
			allowedCustomerCodes: null
		};
	}
	const role = "TechnicalReadOnly";
	return {
		email: norm,
		displayName,
		role,
		permissions: permissionsFor(role),
		source: "default-readonly",
		allowedCustomerCodes: null
	};
}
var fetchStaffProfile_createServerFn_handler = createServerRpc({
	id: "db9649bf2839603866fd1f3a2323271f30b411578fdfe26dcf59b1ccd7b8ef6e",
	name: "fetchStaffProfile",
	filename: "src/lib/data/staff-profile.ts"
}, (opts) => fetchStaffProfile.__executeServer(opts));
var fetchStaffProfile = createServerFn({ method: "GET" }).validator((data) => data).handler(fetchStaffProfile_createServerFn_handler, async ({ data }) => {
	if (!data.email?.trim()) return null;
	return resolveProfile(data.email, data.displayName ?? null);
});
//#endregion
export { fetchStaffProfile_createServerFn_handler };
