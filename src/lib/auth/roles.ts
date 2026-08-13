/** Staff roles (decision checklist) */
export type StaffRole =
  | "PlatformAdmin"
  | "Operator"
  | "ExCo"
  | "TechnicalReadOnly";

export const STAFF_ROLES: StaffRole[] = [
  "PlatformAdmin",
  "Operator",
  "ExCo",
  "TechnicalReadOnly",
];

export function isStaffRole(v: string | null | undefined): v is StaffRole {
  return STAFF_ROLES.includes(v as StaffRole);
}

export type StaffPermissions = {
  role: StaffRole;
  /** See Portfolio multitenant list */
  canViewPortfolio: boolean;
  /** Open customer RPM Assure detail */
  canViewCustomer: boolean;
  /** Technical panels (operators full list, job raw, FinSight detail) */
  canViewTechnicalDetail: boolean;
  /** Edit facts / narratives */
  canEdit: boolean;
  /** Manage staff users */
  canManageStaff: boolean;
  /**
   * Platform Settings (SQL, SMTP, Query, Users, About).
   * ONLY PlatformAdmin — Operators/ExCo/Technical never see these views.
   */
  canAccessPlatformSettings: boolean;
  label: string;
};

export function permissionsFor(role: StaffRole): StaffPermissions {
  switch (role) {
    case "PlatformAdmin":
      return {
        role,
        canViewPortfolio: true,
        canViewCustomer: true,
        canViewTechnicalDetail: true,
        canEdit: true,
        canManageStaff: true,
        canAccessPlatformSettings: true,
        label: "Platform admin",
      };
    case "Operator":
      return {
        role,
        canViewPortfolio: true,
        canViewCustomer: true,
        canViewTechnicalDetail: true,
        canEdit: true,
        canManageStaff: false,
        canAccessPlatformSettings: false,
        label: "Operator",
      };
    case "ExCo":
      return {
        role,
        canViewPortfolio: true,
        canViewCustomer: true,
        canViewTechnicalDetail: false,
        canEdit: false,
        canManageStaff: false,
        canAccessPlatformSettings: false,
        label: "ExCo",
      };
    case "TechnicalReadOnly":
      return {
        role,
        canViewPortfolio: true,
        canViewCustomer: true,
        canViewTechnicalDetail: true,
        canEdit: false,
        canManageStaff: false,
        canAccessPlatformSettings: false,
        label: "Technical (read-only)",
      };
    default: {
      // Invalid / missing role from SQL — never return undefined (crashes as "reading '…'")
      const fallback: StaffRole = "TechnicalReadOnly";
      return {
        role: fallback,
        canViewPortfolio: true,
        canViewCustomer: true,
        canViewTechnicalDetail: true,
        canEdit: false,
        canManageStaff: false,
        canAccessPlatformSettings: false,
        label: "Technical (read-only)",
      };
    }
  }
}

/** Env list of PlatformAdmin emails (comma-separated), case-insensitive */
export function adminEmailsFromEnv(): string[] {
  const raw =
    process.env.RPM_ASSURE_ADMIN_EMAILS ??
    "rpmadmin@rpm.local,rpmadmin,rpmroot@rpm.local,rpmroot,admin@rpm.local";

  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (s.includes("@") ? s : `${s}@rpm.local`));
}
