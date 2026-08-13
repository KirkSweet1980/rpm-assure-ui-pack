import { t as getRequest } from "./server-CjldIDVK.mjs";
import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { r as hasSqlConfig, t as getDataMode } from "./sql-config-BAM-cI78.mjs";
import { n as getPool, r as import_mssql } from "./sql-pool-kLXZ0UEv.mjs";
import { n as authConfigured, t as auth } from "./server-DhYyBlji.mjs";
import { n as isStaffRole, t as adminEmailsFromEnv } from "./roles-D3FgOqTF.mjs";
import { appendAdminAudit } from "./admin-audit-NxU6BQp5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-accounts-0DbXpjYO.js
/**
* Platform-admin user account control.
* - Better Auth (PGLite/Postgres): email/password identity
* - SQL Server App_User: role, active, customer scope
*/
function normEmail(e) {
	return e.trim().toLowerCase();
}
async function sessionEmail() {
	if (!authConfigured) return adminEmailsFromEnv()[0] ?? null;
	const request = getRequest();
	if (!request) return null;
	const session = await auth.api.getSession({ headers: request.headers });
	return session?.user?.email ? normEmail(session.user.email) : null;
}
async function requirePlatformAdmin() {
	const email = await sessionEmail();
	if (!email) throw new Error("Sign in required.");
	if (adminEmailsFromEnv().includes(email)) return { email };
	if (hasSqlConfig() && getDataMode() !== "demo") try {
		const pool = await getPool();
		if (pool) {
			const row = (await pool.request().input("email", import_mssql.default.NVarChar(256), email).query(`
            SELECT TOP 1
              CAST(IsPlatformAdmin AS bit) AS IsPlatformAdmin,
              StaffRole,
              CAST(IsActive AS bit) AS IsActive
            FROM dbo.App_User
            WHERE LOWER(Email) = @email
          `)).recordset?.[0];
			if (row?.IsActive && (row.IsPlatformAdmin || row.StaffRole === "PlatformAdmin")) return { email };
		}
	} catch {}
	throw new Error("Platform admin only — user management is restricted.");
}
async function ensureStaffRoleColumn(pool) {
	await pool.request().query(`
    IF COL_LENGTH(N'dbo.App_User', N'StaffRole') IS NULL
      ALTER TABLE dbo.App_User ADD StaffRole nvarchar(30) NULL;
  `);
}
async function authContext() {
	return await auth.$context;
}
async function listAuthUsers() {
	try {
		const ctx = await authContext();
		const users = await ctx.adapter.findMany({ model: "user" });
		const out = [];
		for (const u of users ?? []) {
			const hasPassword = (await ctx.internalAdapter.findAccounts(u.id) ?? []).some((a) => a.providerId === "credential" && Boolean(a.password));
			out.push({
				id: u.id,
				email: normEmail(u.email),
				name: u.name || u.email,
				hasPassword,
				twoFactorEnabled: Boolean(u.twoFactorEnabled)
			});
		}
		return out;
	} catch (e) {
		console.warn("[admin-accounts] listAuthUsers", e);
		return [];
	}
}
async function getAppUserIdByEmail(email) {
	if (!hasSqlConfig() || getDataMode() === "demo") return null;
	const pool = await getPool();
	if (!pool) return null;
	const idR = await pool.request().input("email", import_mssql.default.NVarChar(256), normEmail(email)).query(`SELECT CONVERT(nvarchar(36), AppUserId) AS id FROM dbo.App_User WHERE LOWER(Email) = @email`);
	return String(idR.recordset?.[0]?.id ?? "") || null;
}
async function upsertSqlAppUser(opts) {
	if (!hasSqlConfig() || getDataMode() === "demo") return {
		ok: true,
		appUserId: null,
		message: "SQL skipped (demo/no config)"
	};
	const pool = await getPool();
	if (!pool) return {
		ok: false,
		appUserId: null,
		message: "SQL not connected"
	};
	await ensureStaffRoleColumn(pool);
	const email = normEmail(opts.email);
	const displayName = opts.displayName.trim() || email;
	const userName = (email.split("@")[0] || "user").slice(0, 100);
	const isAdmin = opts.staffRole === "PlatformAdmin";
	try {
		await pool.request().input("email", import_mssql.default.NVarChar(256), email).input("dn", import_mssql.default.NVarChar(200), displayName).input("un", import_mssql.default.NVarChar(100), userName).input("role", import_mssql.default.NVarChar(30), opts.staffRole).input("admin", import_mssql.default.Bit, isAdmin).input("active", import_mssql.default.Bit, opts.isActive).query(`
        IF EXISTS (SELECT 1 FROM dbo.App_User WHERE LOWER(Email) = @email)
          UPDATE dbo.App_User
          SET DisplayName = @dn, UserName = @un, StaffRole = @role,
              IsPlatformAdmin = @admin, IsActive = @active, UpdatedAt = SYSUTCDATETIME()
          WHERE LOWER(Email) = @email;
        ELSE
          INSERT INTO dbo.App_User (UserName, Email, DisplayName, StaffRole, IsPlatformAdmin, IsActive)
          VALUES (@un, @email, @dn, @role, @admin, @active);
      `);
		return {
			ok: true,
			appUserId: await getAppUserIdByEmail(email),
			message: "App_User saved"
		};
	} catch (e) {
		return {
			ok: false,
			appUserId: null,
			message: e instanceof Error ? e.message : String(e)
		};
	}
}
async function createOrResetAuthPassword(email, name, password) {
	if (password.length < 8) return {
		ok: false,
		authUserId: null,
		message: "Password must be at least 8 characters."
	};
	try {
		const ctx = await authContext();
		const hash = await ctx.password.hash(password);
		const existing = await ctx.internalAdapter.findUserByEmail(normEmail(email));
		if (existing?.user) {
			if ((await ctx.internalAdapter.findAccounts(existing.user.id) ?? []).find((a) => a.providerId === "credential")) await ctx.internalAdapter.updatePassword(existing.user.id, hash);
			else await ctx.internalAdapter.linkAccount({
				userId: existing.user.id,
				providerId: "credential",
				accountId: existing.user.id,
				password: hash
			});
			if (name && name !== existing.user.name) await ctx.internalAdapter.updateUser(existing.user.id, { name });
			return {
				ok: true,
				authUserId: existing.user.id,
				message: "Password updated"
			};
		}
		const created = await ctx.internalAdapter.createUser({
			email: normEmail(email),
			name: name || email,
			emailVerified: true
		});
		if (!created?.id) return {
			ok: false,
			authUserId: null,
			message: "Failed to create auth user"
		};
		await ctx.internalAdapter.linkAccount({
			userId: created.id,
			providerId: "credential",
			accountId: created.id,
			password: hash
		});
		return {
			ok: true,
			authUserId: created.id,
			message: "Auth account created"
		};
	} catch (e) {
		return {
			ok: false,
			authUserId: null,
			message: e instanceof Error ? e.message : String(e)
		};
	}
}
async function setCustomerAssignmentsInternal(appUserId, role, codes) {
	if (role === "PlatformAdmin") codes = [];
	const pool = await getPool();
	if (!pool) return;
	const assignRole = role === "PlatformAdmin" || role === "Operator" ? "Operator" : role === "ExCo" ? "ExCo" : "TechnicalReadOnly";
	await pool.request().input("id", import_mssql.default.UniqueIdentifier, appUserId).query(`DELETE FROM dbo.App_UserCustomer WHERE AppUserId = @id`);
	for (const code of codes) {
		const c = code.trim();
		if (!c) continue;
		await pool.request().input("id", import_mssql.default.UniqueIdentifier, appUserId).input("code", import_mssql.default.NVarChar(50), c).input("role", import_mssql.default.NVarChar(30), assignRole).query(`
        INSERT INTO dbo.App_UserCustomer (AppUserId, CustomerCode, Role)
        VALUES (@id, @code, @role)
      `);
	}
}
var listManagedUsers_createServerFn_handler = createServerRpc({
	id: "450e93adbc92ad25161b13a4721d56081b344e9f3ebe186335279a042bdaef23",
	name: "listManagedUsers",
	filename: "src/lib/auth/admin-accounts.ts"
}, (opts) => listManagedUsers.__executeServer(opts));
var listManagedUsers = createServerFn({ method: "GET" }).handler(listManagedUsers_createServerFn_handler, async () => {
	try {
		await requirePlatformAdmin();
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e),
			users: [],
			customers: []
		};
	}
	const authUsers = await listAuthUsers();
	const byEmail = /* @__PURE__ */ new Map();
	for (const a of authUsers) byEmail.set(a.email, {
		email: a.email,
		displayName: a.name,
		staffRole: "TechnicalReadOnly",
		isActive: true,
		isPlatformAdmin: adminEmailsFromEnv().includes(a.email),
		appUserId: null,
		authUserId: a.id,
		hasPassword: a.hasPassword,
		twoFactorEnabled: a.twoFactorEnabled,
		customerCodes: [],
		allCustomers: true,
		sources: ["auth"]
	});
	let customers = [];
	if (hasSqlConfig() && getDataMode() !== "demo") try {
		const pool = await getPool();
		if (pool) {
			await ensureStaffRoleColumn(pool);
			const r = await pool.request().query(`
          SELECT
            CONVERT(nvarchar(36), u.AppUserId) AS appUserId,
            u.Email AS email,
            u.DisplayName AS displayName,
            COALESCE(u.StaffRole, CASE WHEN u.IsPlatformAdmin = 1 THEN N'PlatformAdmin' ELSE N'TechnicalReadOnly' END) AS staffRole,
            CAST(u.IsPlatformAdmin AS bit) AS isPlatformAdmin,
            CAST(u.IsActive AS bit) AS isActive
          FROM dbo.App_User u
          ORDER BY u.DisplayName, u.Email
        `);
			for (const row of r.recordset ?? []) {
				const email = normEmail(String(row.email ?? ""));
				if (!email) continue;
				let role = "TechnicalReadOnly";
				if (row.isPlatformAdmin || row.staffRole === "PlatformAdmin") role = "PlatformAdmin";
				else if (isStaffRole(String(row.staffRole))) role = row.staffRole;
				const existing = byEmail.get(email);
				if (existing) {
					existing.displayName = String(row.displayName || existing.displayName);
					existing.staffRole = role;
					existing.isActive = Boolean(row.isActive);
					existing.isPlatformAdmin = role === "PlatformAdmin";
					existing.appUserId = String(row.appUserId);
					existing.sources = [.../* @__PURE__ */ new Set([...existing.sources, "sql"])];
				} else byEmail.set(email, {
					email,
					displayName: String(row.displayName || email),
					staffRole: role,
					isActive: Boolean(row.isActive),
					isPlatformAdmin: role === "PlatformAdmin",
					appUserId: String(row.appUserId),
					authUserId: null,
					hasPassword: false,
					twoFactorEnabled: false,
					customerCodes: [],
					allCustomers: role === "PlatformAdmin",
					sources: ["sql"]
				});
			}
			try {
				const assign = await pool.request().query(`
            SELECT CONVERT(nvarchar(36), AppUserId) AS appUserId, CustomerCode
            FROM dbo.App_UserCustomer
          `);
				const byId = /* @__PURE__ */ new Map();
				for (const row of assign.recordset ?? []) {
					const id = String(row.appUserId);
					const code = String(row.CustomerCode);
					if (!byId.has(id)) byId.set(id, []);
					byId.get(id).push(code);
				}
				for (const u of byEmail.values()) if (u.appUserId && byId.has(u.appUserId)) {
					u.customerCodes = byId.get(u.appUserId);
					u.allCustomers = u.staffRole === "PlatformAdmin" || u.customerCodes.length === 0;
				}
			} catch {}
			try {
				customers = ((await pool.request().query(`
            SELECT CustomerCode AS code, DisplayName AS name
            FROM dbo.Dim_Customer
            WHERE Active = 1
            ORDER BY DisplayName
          `)).recordset ?? []).map((row) => ({
					code: String(row.code),
					name: String(row.name || row.code)
				}));
			} catch {
				customers = [];
			}
		}
	} catch (e) {
		console.warn("[admin-accounts] SQL list", e);
	}
	for (const adminEmail of adminEmailsFromEnv()) {
		const u = byEmail.get(adminEmail);
		if (u) {
			u.staffRole = "PlatformAdmin";
			u.isPlatformAdmin = true;
			u.allCustomers = true;
			if (!u.sources.includes("env-admin")) u.sources.push("env-admin");
		}
	}
	const users = [...byEmail.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
	return {
		ok: true,
		message: `${users.length} user(s)`,
		users,
		customers
	};
});
var adminCreateUser_createServerFn_handler = createServerRpc({
	id: "655c2ff891a9ffe4067fb9597e22b84995284ecd6d55da4aca79d4be4f81ea23",
	name: "adminCreateUser",
	filename: "src/lib/auth/admin-accounts.ts"
}, (opts) => adminCreateUser.__executeServer(opts));
var adminCreateUser = createServerFn({ method: "POST" }).validator((data) => data).handler(adminCreateUser_createServerFn_handler, async ({ data }) => {
	try {
		await requirePlatformAdmin();
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e)
		};
	}
	const email = normEmail(data.email);
	if (!email || !email.includes("@")) return {
		ok: false,
		message: "Valid email required."
	};
	let role = "TechnicalReadOnly";
	if (isStaffRole(data.staffRole)) role = data.staffRole;
	const isActive = data.isActive !== false;
	const displayName = data.displayName.trim() || email;
	const authRes = await createOrResetAuthPassword(email, displayName, data.password);
	if (!authRes.ok) return {
		ok: false,
		message: authRes.message
	};
	const sqlRes = await upsertSqlAppUser({
		email,
		displayName,
		staffRole: role,
		isActive
	});
	if (!sqlRes.ok) return {
		ok: false,
		message: `Auth OK, but App_User failed: ${sqlRes.message}`
	};
	if (data.customerCodes && data.customerCodes.length > 0 && sqlRes.appUserId) try {
		await setCustomerAssignmentsInternal(sqlRes.appUserId, role, data.customerCodes);
	} catch (e) {
		return {
			ok: true,
			message: `User created; customer scope failed: ` + (e instanceof Error ? e.message : String(e))
		};
	}
	const actor = await sessionEmail();
	appendAdminAudit({
		actorEmail: actor ?? "platform-admin",
		action: "user.create",
		target: email,
		detail: `role=${role} active=${isActive}`,
		ok: true
	});
	return {
		ok: true,
		message: `User ${email} created — they can sign in now.`
	};
});
var adminUpdateUser_createServerFn_handler = createServerRpc({
	id: "3860f8f488890094b805b54995721f94f0430ff486f937a1dbecd6566a78fd3e",
	name: "adminUpdateUser",
	filename: "src/lib/auth/admin-accounts.ts"
}, (opts) => adminUpdateUser.__executeServer(opts));
var adminUpdateUser = createServerFn({ method: "POST" }).validator((data) => data).handler(adminUpdateUser_createServerFn_handler, async ({ data }) => {
	try {
		await requirePlatformAdmin();
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e)
		};
	}
	const email = normEmail(data.email);
	let role = "TechnicalReadOnly";
	if (data.staffRole && isStaffRole(data.staffRole)) role = data.staffRole;
	else {
		const cur = (await listManagedUsers()).users.find((u) => u.email === email);
		if (cur) role = cur.staffRole;
	}
	const displayName = data.displayName?.trim() || email;
	const isActive = data.isActive !== false;
	if (data.password && data.password.length > 0) {
		const authRes = await createOrResetAuthPassword(email, displayName, data.password);
		if (!authRes.ok) return {
			ok: false,
			message: authRes.message
		};
	}
	const sqlRes = await upsertSqlAppUser({
		email,
		displayName,
		staffRole: role,
		isActive
	});
	if (!sqlRes.ok) return {
		ok: false,
		message: sqlRes.message
	};
	if (data.customerCodes !== void 0 && sqlRes.appUserId) try {
		await setCustomerAssignmentsInternal(sqlRes.appUserId, role, data.customerCodes ?? []);
	} catch (e) {
		return {
			ok: false,
			message: "Profile saved; customer scope failed: " + (e instanceof Error ? e.message : String(e))
		};
	}
	if (!isActive) try {
		const ctx = await authContext();
		const found = await ctx.internalAdapter.findUserByEmail(email);
		if (found?.user?.id) await ctx.internalAdapter.deleteUserSessions(found.user.id);
	} catch {}
	const actor = await sessionEmail();
	appendAdminAudit({
		actorEmail: actor ?? "platform-admin",
		action: "user.update",
		target: email,
		detail: `role=${role} active=${isActive} passwordReset=${Boolean(data.password)}`,
		ok: true
	});
	return {
		ok: true,
		message: `User ${email} updated.`
	};
});
var adminDeleteAuthUser_createServerFn_handler = createServerRpc({
	id: "7e21663ebff32c4a98b430e9ff6385320d86fd75c7caa51fcbbeba58eeec7875",
	name: "adminDeleteAuthUser",
	filename: "src/lib/auth/admin-accounts.ts"
}, (opts) => adminDeleteAuthUser.__executeServer(opts));
var adminDeleteAuthUser = createServerFn({ method: "POST" }).validator((data) => data).handler(adminDeleteAuthUser_createServerFn_handler, async ({ data }) => {
	try {
		await requirePlatformAdmin();
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e)
		};
	}
	const email = normEmail(data.email);
	if (await sessionEmail() === email) return {
		ok: false,
		message: "You cannot delete your own account while signed in."
	};
	try {
		const ctx = await authContext();
		const found = await ctx.internalAdapter.findUserByEmail(email);
		if (found?.user?.id) {
			await ctx.internalAdapter.deleteUserSessions(found.user.id);
			await ctx.internalAdapter.deleteUser(found.user.id);
		}
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e)
		};
	}
	if (data.removeAppUser && hasSqlConfig()) try {
		const pool = await getPool();
		if (pool) await pool.request().input("email", import_mssql.default.NVarChar(256), email).query(`
              DELETE FROM dbo.App_UserCustomer
              WHERE AppUserId IN (SELECT AppUserId FROM dbo.App_User WHERE LOWER(Email) = @email);
              DELETE FROM dbo.App_User WHERE LOWER(Email) = @email;
            `);
	} catch (e) {
		return {
			ok: false,
			message: "Auth deleted, but App_User delete failed: " + (e instanceof Error ? e.message : String(e))
		};
	}
	else if (hasSqlConfig()) {
		if (await getAppUserIdByEmail(email)) await upsertSqlAppUser({
			email,
			displayName: email,
			staffRole: "TechnicalReadOnly",
			isActive: false
		});
	}
	const actor = await sessionEmail();
	appendAdminAudit({
		actorEmail: actor ?? "platform-admin",
		action: "user.delete",
		target: email,
		detail: `removeAppUser=${Boolean(data.removeAppUser)}`,
		ok: true
	});
	return {
		ok: true,
		message: `Removed sign-in for ${email}.`
	};
});
var adminSetUserCustomers_createServerFn_handler = createServerRpc({
	id: "0dc950cade5305cb25c0e54ebd4949901e7aa0be58da596ed5d5d830b5b7ecd2",
	name: "adminSetUserCustomers",
	filename: "src/lib/auth/admin-accounts.ts"
}, (opts) => adminSetUserCustomers.__executeServer(opts));
var adminSetUserCustomers = createServerFn({ method: "POST" }).validator((data) => data).handler(adminSetUserCustomers_createServerFn_handler, async ({ data }) => {
	try {
		await requirePlatformAdmin();
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : String(e)
		};
	}
	const email = normEmail(data.email);
	const appUserId = await getAppUserIdByEmail(email);
	if (!appUserId) return {
		ok: false,
		message: "App_User missing — save role/profile first."
	};
	let role = "Operator";
	try {
		const pool = await getPool();
		if (pool) {
			const row = (await pool.request().input("email", import_mssql.default.NVarChar(256), email).query(`
            SELECT StaffRole, CAST(IsPlatformAdmin AS bit) AS IsPlatformAdmin
            FROM dbo.App_User WHERE LOWER(Email) = @email
          `)).recordset?.[0];
			if (row?.IsPlatformAdmin || row?.StaffRole === "PlatformAdmin") role = "PlatformAdmin";
			else if (isStaffRole(String(row?.StaffRole))) role = row.StaffRole;
		}
	} catch {}
	try {
		await setCustomerAssignmentsInternal(appUserId, role, data.customerCodes);
		return {
			ok: true,
			message: data.customerCodes.length === 0 ? "Customer scope cleared (all customers)." : `Scoped to ${data.customerCodes.length} customer(s).`
		};
	} catch (e) {
		return {
			ok: false,
			message: (e instanceof Error ? e.message : String(e)) + " — SQL login may need rights on App_UserCustomer."
		};
	}
});
//#endregion
export { adminCreateUser_createServerFn_handler, adminDeleteAuthUser_createServerFn_handler, adminSetUserCustomers_createServerFn_handler, adminUpdateUser_createServerFn_handler, listManagedUsers_createServerFn_handler };
