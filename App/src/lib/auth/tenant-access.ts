import { permissionsFor, type StaffPermissions, type StaffRole } from "./roles";

/** Roles allowed on App_UserCustomer.Role (CHECK constraint). */
export type TenantRole = "Operator" | "ExCo" | "TechnicalReadOnly";

export const TENANT_ROLES: TenantRole[] = ["Operator", "ExCo", "TechnicalReadOnly"];

export const TENANT_SERVICES: Array<{ id: string; label: string }> = [
  { id: "syspro", label: "SYSPRO" },
  { id: "rmm", label: "RMM" },
  { id: "cove", label: "Cloud Backup" },
  { id: "epp", label: "End Point Protection" },
  { id: "csp", label: "Microsoft 365" },
  { id: "tickets", label: "Service Desk" },
];

export type TenantGrant = {
  code: string;
  role: TenantRole;
  /** Empty = all RPM Services on this tenant. */
  services: string[];
};

export function isTenantRole(v: string | null | undefined): v is TenantRole {
  return TENANT_ROLES.includes(v as TenantRole);
}

export function tenantRoleFromStaff(role: StaffRole): TenantRole {
  if (role === "ExCo") return "ExCo";
  if (role === "TechnicalReadOnly") return "TechnicalReadOnly";
  return "Operator";
}

export function parseServices(raw: string | null | undefined): string[] {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => TENANT_SERVICES.some((x) => x.id === s));
}

export function serializeServices(services: string[]): string | null {
  const ids = [...new Set(services.map((s) => s.trim().toLowerCase()))].filter((s) =>
    TENANT_SERVICES.some((x) => x.id === s),
  );
  if (ids.length === 0 || ids.length >= TENANT_SERVICES.length) return null;
  return ids.join(",");
}

export function serviceAllowed(grant: TenantGrant | null | undefined, serviceId: string): boolean {
  if (!grant) return true;
  if (serviceId === "estate") return true;
  if (!grant.services.length) return true;
  return grant.services.includes(serviceId);
}

export function permissionsForTenant(grant: TenantGrant | null | undefined, fallback: StaffRole): StaffPermissions {
  const role = grant?.role ?? tenantRoleFromStaff(fallback);
  return permissionsFor(role);
}
