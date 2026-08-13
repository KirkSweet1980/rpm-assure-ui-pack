//#region node_modules/.nitro/vite/services/ssr/assets/roles-D3FgOqTF.js
var STAFF_ROLES = [
	"PlatformAdmin",
	"Operator",
	"ExCo",
	"TechnicalReadOnly"
];
function isStaffRole(v) {
	return STAFF_ROLES.includes(v);
}
function permissionsFor(role) {
	switch (role) {
		case "PlatformAdmin": return {
			role,
			canViewPortfolio: true,
			canViewCustomer: true,
			canViewTechnicalDetail: true,
			canEdit: true,
			canManageStaff: true,
			canAccessPlatformSettings: true,
			label: "Platform admin"
		};
		case "Operator": return {
			role,
			canViewPortfolio: true,
			canViewCustomer: true,
			canViewTechnicalDetail: true,
			canEdit: true,
			canManageStaff: false,
			canAccessPlatformSettings: false,
			label: "Operator"
		};
		case "ExCo": return {
			role,
			canViewPortfolio: true,
			canViewCustomer: true,
			canViewTechnicalDetail: false,
			canEdit: false,
			canManageStaff: false,
			canAccessPlatformSettings: false,
			label: "ExCo"
		};
		case "TechnicalReadOnly": return {
			role,
			canViewPortfolio: true,
			canViewCustomer: true,
			canViewTechnicalDetail: true,
			canEdit: false,
			canManageStaff: false,
			canAccessPlatformSettings: false,
			label: "Technical (read-only)"
		};
		default: return {
			role: "TechnicalReadOnly",
			canViewPortfolio: true,
			canViewCustomer: true,
			canViewTechnicalDetail: true,
			canEdit: false,
			canManageStaff: false,
			canAccessPlatformSettings: false,
			label: "Technical (read-only)"
		};
	}
}
/** Env list of PlatformAdmin emails (comma-separated), case-insensitive */
function adminEmailsFromEnv() {
	return (process.env.RPM_ASSURE_ADMIN_EMAILS ?? "rpmadmin@rpm.local,rpmadmin,rpmroot@rpm.local,rpmroot,admin@rpm.local").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).map((s) => s.includes("@") ? s : `${s}@rpm.local`);
}
//#endregion
export { isStaffRole as n, permissionsFor as r, adminEmailsFromEnv as t };
