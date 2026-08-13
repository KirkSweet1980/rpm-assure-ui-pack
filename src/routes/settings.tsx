import { Outlet, createFileRoute, Navigate, useRouterState } from "@tanstack/react-router";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { SpaLink } from "@/components/nav/spa-link";
import { USER_PROFILE_ENABLED, TWO_FACTOR_ENABLED, SETTINGS_MENU_ENABLED } from "@/lib/auth/features";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/settings/sql": {
    title: "SQL Server",
    subtitle: "Connections and credentials for Live SQL and tools.",
  },
  "/settings/ssl": {
    title: "SSL / HTTPS",
    subtitle: "Let's Encrypt or upload your own certificate for the public hostname.",
  },
  "/settings/smtp": {
    title: "Email",
    subtitle: "Outbound email is disabled in this release.",
  },
  "/settings/integrations": {
    title: "Integrations",
    subtitle: "Live collect connections: SYSPRO, Remote Management, Cloud Backup, EPP, Microsoft 365 Tenant.",
  },
  "/settings/dashboard": {
    title: "Dashboard Configuration",
    subtitle: "Which KPI cards and panels show on Exco Insight and customer workspaces.",
  },
  "/settings/chrome": {
    title: "Menu style",
    subtitle: "Pick how selected tabs and nav chips look. Applies immediately.",
  },
  "/settings/theme": {
    title: "Theme tokens",
    subtitle: "CSS variables that paint the UI. Light / dark maps and palette presets.",
  },
  "/settings/labels": {
    title: "UI Labels",
    subtitle: "Rename modules, cover chips, and pack titles without a code deploy.",
  },
  "/settings/rag": {
    title: "RAG thresholds",
    subtitle: "Job error and FinSight rules for Red / Amber / Green — no code deploy.",
  },
  "/settings/alerts": {
    title: "Alerts",
    subtitle: "In-app rules for Red health, job errors, and stale collect.",
  },
  "/settings/collect": {
    title: "Collect inventory",
    subtitle: "Last import per customer / instance and schedule health.",
  },
  "/settings/reports": {
    title: "Report schedules",
    subtitle: "On-screen report packs (email schedules off).",
  },
  "/settings/query": {
    title: "SQL Query",
    subtitle: "Read-only explorer against the configured database.",
  },
  "/settings/users": {
    title: "Users",
    subtitle: "Staff accounts, roles, scope, plus your profile and 2FA.",
  },
  "/settings/profile": {
    title: "My profile",
    subtitle: "Display name, password, and account details.",
  },
  "/settings/security": {
    title: "Security & 2FA",
    subtitle: "Authenticator app and backup codes for your account.",
  },
  "/settings/audit": {
    title: "Audit log",
    subtitle: "Who created or disabled users and changed platform settings.",
  },
  "/settings/about": {
    title: "About",
    subtitle: "Product notes and roadmap.",
  },
};


function SettingsLayout() {
  const { profile } = useStaffProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = profile?.permissions.canAccessPlatformSettings === true;
  // Profile / 2FA temporarily deferred (feature flags)
  const isSelfService =
    (USER_PROFILE_ENABLED &&
      (pathname === "/settings/profile" || pathname.startsWith("/settings/profile/"))) ||
    (TWO_FACTOR_ENABLED &&
      (pathname === "/settings/security" || pathname.startsWith("/settings/security/")));
  const canAccess = isAdmin || isSelfService;

  if (!SETTINGS_MENU_ENABLED) {
    return <Navigate to="/" />;
  }
  const meta =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? {
      title: "Configuration",
      subtitle: "Platform configuration — SQL, SSL, and tools.",
    };

  return (
    <RequireAuth>
      <AppShell title={meta.title} subtitle={meta.subtitle}>
        {!canAccess ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
            <p className="font-medium text-fg">Platform Admin only</p>
            <p className="mt-2">
              Platform settings (SQL, Query, Integrations, …) are for Platform Admins.
              User accounts, profiles, and 2FA are temporarily disabled. Role:{" "}
              <strong className="text-fg">{profile?.permissions.label ?? "—"}</strong>.
            </p>
          </div>
        ) : (
          <div className="rpma-saas-settings-body min-w-0 max-w-5xl space-y-4">
            {pathname !== "/settings" && pathname !== "/settings/" ? (
              <SpaLink
                href="/settings"
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-white hover:text-[#739abb]"
              >
                ← Configuration
              </SpaLink>
            ) : null}
            <Outlet />
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
}
