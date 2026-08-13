import { createServerFn } from "@tanstack/react-start";
import {
  adminEmailsFromEnv,
  isStaffRole,
  permissionsFor,
  type StaffPermissions,
  type StaffRole,
} from "@/lib/auth/roles";
import { getPool, sql } from "./sql-pool";
import { getDataMode, hasSqlConfig } from "./sql-config";
import { ROOT_ADMIN_EMAIL } from "@/lib/auth/root-admin";

export type StaffProfile = {
  email: string;
  displayName: string | null;
  role: StaffRole;
  permissions: StaffPermissions;
  source: "sql" | "env-admin" | "default-readonly" | "denied";
  allowedCustomerCodes: string[] | null; // null = all active customers
};

async function resolveProfile(
  email: string,
  displayName: string | null,
): Promise<StaffProfile> {
  const norm = email.trim().toLowerCase();
  const admins = adminEmailsFromEnv();

  // Try SQL App_User
  if (hasSqlConfig() && getDataMode() !== "demo") {
    try {
      const pool = await getPool();
      if (pool) {
        const r = await pool
          .request()
          .input("email", sql.NVarChar(256), norm)
          .query<{
            DisplayName: string;
            StaffRole: string | null;
            IsPlatformAdmin: boolean;
            IsActive: boolean;
            AppUserId: string;
          }>(`
            SELECT TOP 1
              DisplayName,
              StaffRole,
              IsPlatformAdmin,
              IsActive,
              CONVERT(nvarchar(36), AppUserId) AS AppUserId
            FROM dbo.App_User
            WHERE LOWER(Email) = @email
          `);

        const row = r.recordset[0];
        if (row && row.IsActive) {
          let role: StaffRole = "TechnicalReadOnly";
          if (row.IsPlatformAdmin || row.StaffRole === "PlatformAdmin") {
            role = "PlatformAdmin";
          } else if (isStaffRole(row.StaffRole)) {
            role = row.StaffRole;
          }

          // Env root admin always PlatformAdmin even if SQL row is weaker
          if (admins.includes(norm) || norm === ROOT_ADMIN_EMAIL) {
            role = "PlatformAdmin";
          }

          let allowed: string[] | null = null;
          if (role !== "PlatformAdmin") {
            const cust = await pool
              .request()
              .input("id", sql.UniqueIdentifier, row.AppUserId)
              .query<{ CustomerCode: string }>(`
                SELECT CustomerCode
                FROM dbo.App_UserCustomer
                WHERE AppUserId = @id
              `);
            const codes = (cust.recordset ?? []).map((c) => c.CustomerCode);
            allowed = codes.length > 0 ? codes : null;
          }

          return {
            email: norm,
            displayName: row.DisplayName || displayName,
            role,
            permissions: permissionsFor(role),
            source: "sql",
            allowedCustomerCodes: allowed,
          };
        }

        if (row && !row.IsActive) {
          return {
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
              label: "Inactive",
            },
            source: "denied",
            allowedCustomerCodes: [],
          };
        }
      }
    } catch (e) {
      console.warn("[staff-profile] SQL lookup failed", e);
    }
  }

  if (admins.includes(norm) || norm === ROOT_ADMIN_EMAIL) {
    const role: StaffRole = "PlatformAdmin";
    return {
      email: norm,
      displayName: displayName || "RPM Root",
      role,
      permissions: permissionsFor(role),
      source: "env-admin",
      allowedCustomerCodes: null,
    };
  }

  // Signed-in but not provisioned: portfolio only — NEVER platform settings
  const role: StaffRole = "TechnicalReadOnly";
  return {
    email: norm,
    displayName,
    role,
    permissions: permissionsFor(role),
    source: "default-readonly",
    allowedCustomerCodes: null,
  };
}

export const fetchStaffProfile = createServerFn({ method: "GET" })
  .validator((data: { email: string; displayName?: string | null }) => data)
  .handler(async ({ data }): Promise<StaffProfile | null> => {
    if (!data.email?.trim()) return null;
    return resolveProfile(data.email, data.displayName ?? null);
  });
