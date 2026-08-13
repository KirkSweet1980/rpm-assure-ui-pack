/** Built-in Platform Admin identity (local bootstrap). Password is NEVER hardcoded — set via env or data/admin-bootstrap.json. */
export const ROOT_ADMIN_USERNAME = "rpmadmin";
export const ROOT_ADMIN_EMAIL = "rpmadmin@rpm.local";

/** Map username or email → auth email (Better Auth needs an email). */
export function normalizeLoginIdentifier(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return s;
  if (s.includes("@")) return s;
  if (s === ROOT_ADMIN_USERNAME || s === "rpmadmin" || s === "rpmroot") {
    return ROOT_ADMIN_EMAIL;
  }
  return `${s}@rpm.local`;
}
