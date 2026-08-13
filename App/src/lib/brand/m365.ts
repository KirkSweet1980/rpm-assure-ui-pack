/** Microsoft 365 Tenant (CSP) product language */

export const M365_PRODUCT = "Microsoft 365 Tenant";
export const M365_SHORT = "M365";
export const M365_TAGLINE =
  "Tenant health, seats, identity posture — Secure Score, MFA, admins under RPM CSP care.";

export const M365_EXCO_TIP =
  "Microsoft 365 tenants on cover: Secure Score average, MFA registration gaps, and excess Global Admins.";

export const M365_PAGES = {
  health: {
    title: "Tenant health",
    why: "Organisation identity, service health, and module overview for this Microsoft 365 tenant.",
  },
  secureScore: {
    title: "Secure Score",
    why: "Microsoft Secure Score (current vs max) from the latest Graph collect.",
  },
  globalAdmins: {
    title: "Global Admins",
    why: "Directory Global Administrator accounts — prefer two break-glass only.",
  },
  mfa: {
    title: "MFA registration",
    why: "Share of users with MFA methods registered (requires Reports.Read.All).",
  },
  licenses: {
    title: "License stats",
    why: "Purchased vs assigned seats by SKU. High unused seats are waste; full assignment with demand may need more licenses.",
  },
  users: {
    title: "Licensed users",
    why: "Directory users on the latest snapshot with assigned SKUs, department, and enabled state.",
  },
  posture: {
    title: "Identity & security posture",
    why: "Lean EXCO metrics: Secure Score, MFA registered %, Global Admins, guests, failed sign-ins (7 days).",
  },
} as const;

/** Sub-nav leaves under Microsoft 365 Tenant for every customer */
export const M365_NAV_LEAVES = [
  { label: "Tenant health", path: "" },
  { label: "Secure Score", path: "secure-score" },
  { label: "Global Admins", path: "global-admins" },
  { label: "MFA registration", path: "mfa" },
  { label: "Licensed users", path: "users" },
  { label: "License stats", path: "licenses" },
] as const;



/** Friendly product names when Graph only returns part numbers */
export const M365_SKU_NAMES: Record<string, string> = {
  O365_BUSINESS_PREMIUM: "Microsoft 365 Business Premium",
  SPE_E3: "Microsoft 365 E3",
  SPE_E5: "Microsoft 365 E5",
  ENTERPRISEPACK: "Office 365 E3",
  ENTERPRISEPREMIUM: "Office 365 E5",
  EXCHANGESTANDARD: "Exchange Online (Plan 1)",
  EXCHANGEENTERPRISE: "Exchange Online (Plan 2)",
  POWER_BI_PRO: "Power BI Pro",
  POWER_BI_STANDARD: "Power BI Free",
  VISIOCLIENT: "Visio Plan 2",
  PROJECTPROFESSIONAL: "Project Plan 3",
  FLOW_FREE: "Power Automate Free",
  TEAMS_EXPLORATORY: "Teams Exploratory",
};

export function m365SkuLabel(
  partNumber: string | null | undefined,
  productName?: string | null,
): string {
  if (productName && productName.trim() && productName !== partNumber) {
    return productName.trim();
  }
  const p = (partNumber || "").toUpperCase();
  if (M365_SKU_NAMES[p]) return M365_SKU_NAMES[p];
  if (productName?.trim()) return productName.trim();
  return partNumber || "License SKU";
}

export function m365UtilPct(assigned: number, total: number): number | null {
  if (!total || total <= 0) return null;
  return Math.round((assigned / total) * 100);
}

export function m365UtilLabel(pct: number | null): string {
  if (pct == null) return "—";
  if (pct >= 95) return `${pct}% · nearly full`;
  if (pct >= 70) return `${pct}% · healthy use`;
  if (pct >= 40) return `${pct}% · headroom`;
  return `${pct}% · low use`;
}
