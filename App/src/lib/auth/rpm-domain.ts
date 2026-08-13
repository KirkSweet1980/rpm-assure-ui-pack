/** Domain helpers (domain lock disabled for now). */
export const RPM_STAFF_EMAIL_DOMAIN = "rpmresources.co.za";

/** Domain restriction OFF — allow any email. */
export function isAllowedRpmStaffEmail(_email: string): boolean {
  return true;
}

export function normalizeStaffEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function assertAllowedRpmStaffEmail(email: string): string {
  const e = normalizeStaffEmail(email);
  if (!e.includes("@") || !e.includes(".")) {
    throw new Error("Enter a valid email address.");
  }
  return e;
}
