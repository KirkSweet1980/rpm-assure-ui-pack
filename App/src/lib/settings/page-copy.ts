export const SETTINGS_PAGE_COPY: Record<string, { title: string; description: string }> = {
  "/settings/infrastructure": {
    title: "Assure Infrastructure Status",
    description: "Platform connections, collect APIs, and SQL-host agents.",
  },
  "/settings/sql": {
    title: "SQL Server",
    description: "Central database connections used by Live SQL and tools.",
  },
  "/settings/ssl": {
    title: "SSL / HTTPS",
    description: "Public hostname, Let's Encrypt, or your own certificate.",
  },
  "/settings/smtp": {
    title: "Email",
    description: "SMTP and Report To for scheduled packs.",
  },
  "/settings/integrations": {
    title: "Integrations",
    description: "Collect connections for SYSPRO, RMM, Backup, EPP, and Microsoft CSP.",
  },
  "/settings/dashboard": {
    title: "Dashboard Layout",
    description: "Which KPI tiles and panes appear on Customer Eco-System.",
  },
  "/settings/chrome": {
    title: "Menu Style",
    description: "Selected tab, chips, and top-nav appearance.",
  },
  "/settings/theme": {
    title: "Theme Tokens",
    description: "Light and dark palette used across the application.",
  },
  "/settings/labels": {
    title: "UI Labels",
    description: "Rename services, cover chips, and page titles without a code deploy.",
  },
  "/settings/rag": {
    title: "RAG Thresholds",
    description: "Red / Amber / Green rules for jobs, FinSight, and stale collect.",
  },
  "/settings/alerts": {
    title: "Alert Rules",
    description: "In-app alerts for Red health, job errors, and stale collect.",
  },
  "/settings/collect": {
    title: "Collect Inventory",
    description: "Last import per customer and schedule health.",
  },
  "/settings/agents": {
    title: "RPM Assure SQL Agent Status",
    description: "SQL-host Windows service heartbeat and SYSPRO collect.",
  },
  "/settings/reports": {
    title: "Report Packs",
    description: "On-screen packs and scheduled email to Kirk.",
  },
  "/settings/query": {
    title: "SQL Query",
    description: "Read-only explorer against the primary SQL connection.",
  },
  "/settings/users": {
    title: "Users",
    description: "Staff accounts, roles, customer scope, and sign-in access.",
  },
  "/settings/profile": {
    title: "My Profile",
    description: "Display name, password, and account details.",
  },
  "/settings/security": {
    title: "Security & 2FA",
    description: "Authenticator app and backup codes for your account.",
  },
  "/settings/audit": {
    title: "Audit Log",
    description: "Who changed users and platform settings.",
  },
  "/settings/about": {
    title: "About",
    description: "Product notes and roadmap.",
  },
};

export function settingsPageCopy(pathname: string) {
  return (
    SETTINGS_PAGE_COPY[pathname] ??
    Object.entries(SETTINGS_PAGE_COPY).find(([k]) => pathname.startsWith(k))?.[1] ?? {
      title: "Configuration",
      description: "Platform configuration.",
    }
  );
}
