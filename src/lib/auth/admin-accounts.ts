/**
 * Platform-admin user account control.
 * - Better Auth (PGLite/Postgres): email/password identity
 * - SQL Server App_User: role, active, customer scope
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth, authConfigured } from "@/lib/auth/server";
import { adminEmailsFromEnv, isStaffRole, type StaffRole } from "@/lib/auth/roles";
import { getPool, sql as sqlTypes } from "@/lib/data/sql-pool";
import { appendAdminAudit } from "@/lib/settings/admin-audit";
import { getDataMode, hasSqlConfig } from "@/lib/data/sql-config";

export type ManagedUser = {
  email: string;
  displayName: string;
  staffRole: StaffRole;
  isActive: boolean;
  isPlatformAdmin: boolean;
  appUserId: string | null;
  authUserId: string | null;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  customerCodes: string[];
  /** true = all customers (PlatformAdmin or empty assignment) */
  allCustomers: boolean;
  sources: string[];
};

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

async function sessionEmail(): Promise<string | null> {
  if (!authConfigured) {
    return adminEmailsFromEnv()[0] ?? null;
  }
  const request = getRequest();
  if (!request) return null;
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.email ? normEmail(session.user.email) : null;
}

async function requirePlatformAdmin(): Promise<{ email: string }> {
  const email = await sessionEmail();
  if (!email) throw new Error("Sign in required.");

  if (adminEmailsFromEnv().includes(email)) {
    return { email };
  }

  if (hasSqlConfig() && getDataMode() !== "demo") {
    try {
      const pool = await getPool();
      if (pool) {
        const r = await pool
          .request()
          .input("email", sqlTypes.NVarChar(256), email)
          .query(`
            SELECT TOP 1
              CAST(IsPlatformAdmin AS bit) AS IsPlatformAdmin,
              StaffRole,
              CAST(IsActive AS bit) AS IsActive
            FROM dbo.App_User
            WHERE LOWER(Email) = @email
          `);
        const row = r.recordset?.[0] as
          | { IsPlatformAdmin: boolean; StaffRole: string | null; IsActive: boolean }
          | undefined;
        if (row?.IsActive && (row.IsPlatformAdmin || row.StaffRole === "PlatformAdmin")) {
          return { email };
        }
      }
    } catch {
      /* fall through */
    }
  }

  throw new Error("Platform admin only — user management is restricted.");
}

async function ensureStaffRoleColumn(pool: NonNullable<Awaited<ReturnType<typeof getPool>>>) {
  await pool.request().query(`
    IF COL_LENGTH(N'dbo.App_User', N'StaffRole') IS NULL
      ALTER TABLE dbo.App_User ADD StaffRole nvarchar(30) NULL;
  `);
}

async function authContext() {
  return await auth.$context;
}

async function listAuthUsers(): Promise<
  Array<{
    id: string;
    email: string;
    name: string;
    hasPassword: boolean;
    twoFactorEnabled: boolean;
  }>
> {
  try {
    const ctx = await authContext();
    const users = (await ctx.adapter.findMany({
      model: "user",
    })) as Array<{ id: string; email: string; name: string; twoFactorEnabled?: boolean }>;
    const out: Array<{
      id: string;
      email: string;
      name: string;
      hasPassword: boolean;
      twoFactorEnabled: boolean;
    }> = [];
    for (const u of users ?? []) {
      const accounts = await ctx.internalAdapter.findAccounts(u.id);
      const hasPassword = (accounts ?? []).some(
        (a: { providerId?: string; password?: string | null }) =>
          a.providerId === "credential" && Boolean(a.password),
      );
      out.push({
        id: u.id,
        email: normEmail(u.email),
        name: u.name || u.email,
        hasPassword,
        twoFactorEnabled: Boolean(u.twoFactorEnabled),
      });
    }
    return out;
  } catch (e) {
    console.warn("[admin-accounts] listAuthUsers", e);
    return [];
  }
}

async function getAppUserIdByEmail(email: string): Promise<string | null> {
  if (!hasSqlConfig() || getDataMode() === "demo") return null;
  const pool = await getPool();
  if (!pool) return null;
  const idR = await pool
    .request()
    .input("email", sqlTypes.NVarChar(256), normEmail(email))
    .query(
      `SELECT CONVERT(nvarchar(36), AppUserId) AS id FROM dbo.App_User WHERE LOWER(Email) = @email`,
    );
  return String(idR.recordset?.[0]?.id ?? "") || null;
}

async function upsertSqlAppUser(opts: {
  email: string;
  displayName: string;
  staffRole: StaffRole;
  isActive: boolean;
}): Promise<{ ok: boolean; appUserId: string | null; message: string }> {
  if (!hasSqlConfig() || getDataMode() === "demo") {
    return { ok: true, appUserId: null, message: "SQL skipped (demo/no config)" };
  }
  const pool = await getPool();
  if (!pool) return { ok: false, appUserId: null, message: "SQL not connected" };

  await ensureStaffRoleColumn(pool);
  const email = normEmail(opts.email);
  const displayName = opts.displayName.trim() || email;
  const userName = (email.split("@")[0] || "user").slice(0, 100);
  const isAdmin = opts.staffRole === "PlatformAdmin";

  try {
    await pool
      .request()
      .input("email", sqlTypes.NVarChar(256), email)
      .input("dn", sqlTypes.NVarChar(200), displayName)
      .input("un", sqlTypes.NVarChar(100), userName)
      .input("role", sqlTypes.NVarChar(30), opts.staffRole)
      .input("admin", sqlTypes.Bit, isAdmin)
      .input("active", sqlTypes.Bit, opts.isActive)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.App_User WHERE LOWER(Email) = @email)
          UPDATE dbo.App_User
          SET DisplayName = @dn, UserName = @un, StaffRole = @role,
              IsPlatformAdmin = @admin, IsActive = @active, UpdatedAt = SYSUTCDATETIME()
          WHERE LOWER(Email) = @email;
        ELSE
          INSERT INTO dbo.App_User (UserName, Email, DisplayName, StaffRole, IsPlatformAdmin, IsActive)
          VALUES (@un, @email, @dn, @role, @admin, @active);
      `);

    const appUserId = await getAppUserIdByEmail(email);
    return { ok: true, appUserId, message: "App_User saved" };
  } catch (e) {
    return {
      ok: false,
      appUserId: null,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

async function createOrResetAuthPassword(
  email: string,
  name: string,
  password: string,
): Promise<{ ok: boolean; authUserId: string | null; message: string }> {
  if (password.length < 8) {
    return { ok: false, authUserId: null, message: "Password must be at least 8 characters." };
  }
  try {
    const ctx = await authContext();
    const hash = await ctx.password.hash(password);
    const existing = await ctx.internalAdapter.findUserByEmail(normEmail(email));
    if (existing?.user) {
      const accounts = await ctx.internalAdapter.findAccounts(existing.user.id);
      const cred = (accounts ?? []).find(
        (a: { providerId?: string }) => a.providerId === "credential",
      );
      if (cred) {
        await ctx.internalAdapter.updatePassword(existing.user.id, hash);
      } else {
        await ctx.internalAdapter.linkAccount({
          userId: existing.user.id,
          providerId: "credential",
          accountId: existing.user.id,
          password: hash,
        });
      }
      if (name && name !== existing.user.name) {
        await ctx.internalAdapter.updateUser(existing.user.id, { name });
      }
      return { ok: true, authUserId: existing.user.id, message: "Password updated" };
    }

    const created = await ctx.internalAdapter.createUser({
      email: normEmail(email),
      name: name || email,
      emailVerified: true,
    });
    if (!created?.id) {
      return { ok: false, authUserId: null, message: "Failed to create auth user" };
    }
    await ctx.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: hash,
    });
    return { ok: true, authUserId: created.id, message: "Auth account created" };
  } catch (e) {
    return {
      ok: false,
      authUserId: null,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

async function setCustomerAssignmentsInternal(
  appUserId: string,
  role: StaffRole,
  codes: string[],
): Promise<void> {
  if (role === "PlatformAdmin") {
    codes = [];
  }
  const pool = await getPool();
  if (!pool) return;
  const assignRole =
    role === "PlatformAdmin" || role === "Operator"
      ? "Operator"
      : role === "ExCo"
        ? "ExCo"
        : "TechnicalReadOnly";

  await pool
    .request()
    .input("id", sqlTypes.UniqueIdentifier, appUserId)
    .query(`DELETE FROM dbo.App_UserCustomer WHERE AppUserId = @id`);

  for (const code of codes) {
    const c = code.trim();
    if (!c) continue;
    await pool
      .request()
      .input("id", sqlTypes.UniqueIdentifier, appUserId)
      .input("code", sqlTypes.NVarChar(50), c)
      .input("role", sqlTypes.NVarChar(30), assignRole)
      .query(`
        INSERT INTO dbo.App_UserCustomer (AppUserId, CustomerCode, Role)
        VALUES (@id, @code, @role)
      `);
  }
}

export const listManagedUsers = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requirePlatformAdmin();
  } catch (e) {
    return {
      ok: false as const,
      message: e instanceof Error ? e.message : String(e),
      users: [] as ManagedUser[],
      customers: [] as Array<{ code: string; name: string }>,
    };
  }

  const authUsers = await listAuthUsers();
  const byEmail = new Map<string, ManagedUser>();

  for (const a of authUsers) {
    byEmail.set(a.email, {
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
      sources: ["auth"],
    });
  }

  let customers: Array<{ code: string; name: string }> = [];

  if (hasSqlConfig() && getDataMode() !== "demo") {
    try {
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
          let role: StaffRole = "TechnicalReadOnly";
          if (row.isPlatformAdmin || row.staffRole === "PlatformAdmin") role = "PlatformAdmin";
          else if (isStaffRole(String(row.staffRole))) role = row.staffRole as StaffRole;

          const existing = byEmail.get(email);
          if (existing) {
            existing.displayName = String(row.displayName || existing.displayName);
            existing.staffRole = role;
            existing.isActive = Boolean(row.isActive);
            existing.isPlatformAdmin = role === "PlatformAdmin";
            existing.appUserId = String(row.appUserId);
            existing.sources = [...new Set([...existing.sources, "sql"])];
          } else {
            byEmail.set(email, {
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
              sources: ["sql"],
            });
          }
        }

        try {
          const assign = await pool.request().query(`
            SELECT CONVERT(nvarchar(36), AppUserId) AS appUserId, CustomerCode
            FROM dbo.App_UserCustomer
          `);
          const byId = new Map<string, string[]>();
          for (const row of assign.recordset ?? []) {
            const id = String(row.appUserId);
            const code = String(row.CustomerCode);
            if (!byId.has(id)) byId.set(id, []);
            byId.get(id)!.push(code);
          }
          for (const u of byEmail.values()) {
            if (u.appUserId && byId.has(u.appUserId)) {
              u.customerCodes = byId.get(u.appUserId)!;
              u.allCustomers = u.staffRole === "PlatformAdmin" || u.customerCodes.length === 0;
            }
          }
        } catch {
          /* optional DENY */
        }

        try {
          const c = await pool.request().query(`
            SELECT CustomerCode AS code, DisplayName AS name
            FROM dbo.Dim_Customer
            WHERE Active = 1
            ORDER BY DisplayName
          `);
          customers = (c.recordset ?? []).map((row: { code: string; name: string }) => ({
            code: String(row.code),
            name: String(row.name || row.code),
          }));
        } catch {
          customers = [];
        }
      }
    } catch (e) {
      console.warn("[admin-accounts] SQL list", e);
    }
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

  const users = [...byEmail.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  return {
    ok: true as const,
    message: `${users.length} user(s)`,
    users,
    customers,
  };
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email: string;
      displayName: string;
      staffRole: string;
      password: string;
      isActive?: boolean;
      customerCodes?: string[];
      emailWelcome?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      await requirePlatformAdmin();
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : String(e) };
    }

    const email = normEmail(data.email);
    if (!email || !email.includes("@")) {
      return { ok: false as const, message: "Valid email required." };
    }
    let role: StaffRole = "TechnicalReadOnly";
    if (isStaffRole(data.staffRole)) role = data.staffRole;
    const isActive = data.isActive !== false;
    const displayName = data.displayName.trim() || email;

    const authRes = await createOrResetAuthPassword(email, displayName, data.password);
    if (!authRes.ok) return { ok: false as const, message: authRes.message };

    const sqlRes = await upsertSqlAppUser({
      email,
      displayName,
      staffRole: role,
      isActive,
    });
    if (!sqlRes.ok) {
      return {
        ok: false as const,
        message: `Auth OK, but App_User failed: ${sqlRes.message}`,
      };
    }

    if (data.customerCodes && data.customerCodes.length > 0 && sqlRes.appUserId) {
      try {
        await setCustomerAssignmentsInternal(sqlRes.appUserId, role, data.customerCodes);
      } catch (e) {
        return {
          ok: true as const,
          message:
            `User created; customer scope failed: ` +
            (e instanceof Error ? e.message : String(e)),
        };
      }
    }

    const actor = await sessionEmail();
    appendAdminAudit({
      actorEmail: actor ?? "platform-admin",
      action: "user.create",
      target: email,
      detail: `role=${role} active=${isActive} tenants=${(data.customerCodes ?? []).join(",") || (role === "PlatformAdmin" ? "all" : "none")}`,
      ok: true,
    });

    let mailNote = "";
    if (data.emailWelcome) {
      try {
        const { getSmtpConfig } = await import("@/lib/settings/settings-store");
        const { sendMailWithSmtp } = await import("@/lib/mail/send");
        const smtp = getSmtpConfig();
        const origin =
          process.env.RPM_ASSURE_PUBLIC_URL?.trim() ||
          "https://assure.rpmresources.co.za";
        const tenantLine =
          role === "PlatformAdmin"
            ? "You can open every customer tenant."
            : (data.customerCodes ?? []).length
              ? `Tenants: ${(data.customerCodes ?? []).join(", ")}.`
              : "No tenants assigned yet — ask an admin to grant access.";
        const sent = await sendMailWithSmtp(smtp, {
          to: email,
          subject: "RPM Assure — your access",
          text:
            `An RPM Assure account was created for you.\n\n` +
            `Sign in: ${origin}/login\n` +
            `Email: ${email}\n` +
            `Temporary password: ${data.password}\n` +
            `Role: ${role}\n` +
            `${tenantLine}\n\n` +
            `Change the password after first sign-in. Enable 2FA from Profile if required.`,
        });
        mailNote = sent.ok ? " Welcome email sent." : ` Email not sent: ${sent.error}`;
      } catch (e) {
        mailNote = ` Email not sent: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    return {
      ok: true as const,
      message: `User ${email} created — they can sign in now.${mailNote}`,
    };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email: string;
      displayName?: string;
      staffRole?: string;
      isActive?: boolean;
      password?: string;
      customerCodes?: string[] | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      await requirePlatformAdmin();
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : String(e) };
    }

    const email = normEmail(data.email);
    let role: StaffRole = "TechnicalReadOnly";
    if (data.staffRole && isStaffRole(data.staffRole)) {
      role = data.staffRole;
    } else {
      const listed = await listManagedUsers();
      const cur = listed.users.find((u) => u.email === email);
      if (cur) role = cur.staffRole;
    }

    const displayName = data.displayName?.trim() || email;
    const isActive = data.isActive !== false;

    if (data.password && data.password.length > 0) {
      const authRes = await createOrResetAuthPassword(email, displayName, data.password);
      if (!authRes.ok) return { ok: false as const, message: authRes.message };
    }

    const sqlRes = await upsertSqlAppUser({
      email,
      displayName,
      staffRole: role,
      isActive,
    });
    if (!sqlRes.ok) return { ok: false as const, message: sqlRes.message };

    if (data.customerCodes !== undefined && sqlRes.appUserId) {
      try {
        await setCustomerAssignmentsInternal(
          sqlRes.appUserId,
          role,
          data.customerCodes ?? [],
        );
      } catch (e) {
        return {
          ok: false as const,
          message:
            "Profile saved; customer scope failed: " +
            (e instanceof Error ? e.message : String(e)),
        };
      }
    }

    if (!isActive) {
      try {
        const ctx = await authContext();
        const found = await ctx.internalAdapter.findUserByEmail(email);
        if (found?.user?.id) {
          await ctx.internalAdapter.deleteUserSessions(found.user.id);
        }
      } catch {
        /* optional */
      }
    }

    const actor = await sessionEmail();
    appendAdminAudit({
      actorEmail: actor ?? "platform-admin",
      action: "user.update",
      target: email,
      detail: `role=${role} active=${isActive} passwordReset=${Boolean(data.password)}`,
      ok: true,
    });
    return { ok: true as const, message: `User ${email} updated.` };
  });

export const adminDeleteAuthUser = createServerFn({ method: "POST" })
  .validator((data: { email: string; removeAppUser?: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      await requirePlatformAdmin();
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : String(e) };
    }
    const email = normEmail(data.email);
    const me = await sessionEmail();
    if (me === email) {
      return { ok: false as const, message: "You cannot delete your own account while signed in." };
    }

    try {
      const ctx = await authContext();
      const found = await ctx.internalAdapter.findUserByEmail(email);
      if (found?.user?.id) {
        await ctx.internalAdapter.deleteUserSessions(found.user.id);
        await ctx.internalAdapter.deleteUser(found.user.id);
      }
    } catch (e) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : String(e),
      };
    }

    if (data.removeAppUser && hasSqlConfig()) {
      try {
        const pool = await getPool();
        if (pool) {
          await pool
            .request()
            .input("email", sqlTypes.NVarChar(256), email)
            .query(`
              DELETE FROM dbo.App_UserCustomer
              WHERE AppUserId IN (SELECT AppUserId FROM dbo.App_User WHERE LOWER(Email) = @email);
              DELETE FROM dbo.App_User WHERE LOWER(Email) = @email;
            `);
        }
      } catch (e) {
        return {
          ok: false as const,
          message:
            "Auth deleted, but App_User delete failed: " +
            (e instanceof Error ? e.message : String(e)),
        };
      }
    } else if (hasSqlConfig()) {
      const id = await getAppUserIdByEmail(email);
      if (id) {
        await upsertSqlAppUser({
          email,
          displayName: email,
          staffRole: "TechnicalReadOnly",
          isActive: false,
        });
      }
    }

    const actor = await sessionEmail();
    appendAdminAudit({
      actorEmail: actor ?? "platform-admin",
      action: "user.delete",
      target: email,
      detail: `removeAppUser=${Boolean(data.removeAppUser)}`,
      ok: true,
    });
    return { ok: true as const, message: `Removed sign-in for ${email}.` };
  });

export const adminSetUserCustomers = createServerFn({ method: "POST" })
  .validator((data: { email: string; customerCodes: string[] }) => data)
  .handler(async ({ data }) => {
    try {
      await requirePlatformAdmin();
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : String(e) };
    }
    const email = normEmail(data.email);
    const appUserId = await getAppUserIdByEmail(email);
    if (!appUserId) {
      return {
        ok: false as const,
        message: "App_User missing — save role/profile first.",
      };
    }

    // resolve current role from SQL
    let role: StaffRole = "Operator";
    try {
      const pool = await getPool();
      if (pool) {
        const r = await pool
          .request()
          .input("email", sqlTypes.NVarChar(256), email)
          .query(`
            SELECT StaffRole, CAST(IsPlatformAdmin AS bit) AS IsPlatformAdmin
            FROM dbo.App_User WHERE LOWER(Email) = @email
          `);
        const row = r.recordset?.[0];
        if (row?.IsPlatformAdmin || row?.StaffRole === "PlatformAdmin") role = "PlatformAdmin";
        else if (isStaffRole(String(row?.StaffRole))) role = row.StaffRole as StaffRole;
      }
    } catch {
      /* default Operator */
    }

    try {
      await setCustomerAssignmentsInternal(appUserId, role, data.customerCodes);
      return {
        ok: true as const,
        message:
          data.customerCodes.length === 0
            ? "Customer scope cleared (all customers)."
            : `Scoped to ${data.customerCodes.length} customer(s).`,
      };
    } catch (e) {
      return {
        ok: false as const,
        message:
          (e instanceof Error ? e.message : String(e)) +
          " — SQL login may need rights on App_UserCustomer.",
      };
    }
  });
