import { Outlet, createFileRoute, Navigate, useRouterState } from "@tanstack/react-router";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { CorpPathTrail, CorpWorkspaceRail, type CorpService } from "@/components/nav/corp-workspace-rail";
import { USER_PROFILE_ENABLED, TWO_FACTOR_ENABLED, SETTINGS_MENU_ENABLED } from "@/lib/auth/features";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/settings/sql": { title: "SQL Server", subtitle: "Connections and credentials for Live SQL and tools." },
  "/settings/ssl": { title: "SSL / HTTPS", subtitle: "Let's Encrypt or upload your own certificate for the public hostname." },
  "/settings/smtp": { title: "Email", subtitle: "Outbound email is disabled in this release." },
  "/settings/integrations": { title: "Integrations", subtitle: "Live collect connections: SYSPRO, Remote Management, Cloud Backup, EPP, Microsoft 365 Tenant." },
  "/settings/dashboard": { title: "Dashboard Configuration", subtitle: "Which KPI cards and panels show on Exco Insight and customer workspaces." },
  "/settings/chrome": { title: "Menu style", subtitle: "Pick how selected tabs and nav chips look. Applies immediately." },
  "/settings/theme": { title: "Theme tokens", subtitle: "CSS variables that paint the UI. Light / dark maps and palette presets." },
  "/settings/labels": { title: "UI Labels", subtitle: "Rename modules, cover chips, and pack titles without a code deploy." },
  "/settings/rag": { title: "RAG thresholds", subtitle: "Job error and FinSight rules for Red / Amber / Green — no code deploy." },
  "/settings/alerts": { title: "Alerts", subtitle: "In-app rules for Red health, job errors, and stale collect." },
  "/settings/collect": { title: "Collect inventory", subtitle: "Last import per customer / instance and schedule health." },
  "/settings/agents": { title: "RPM Assure SQL Agent Status", subtitle: "SQL-host Windows service: heartbeat and SYSPRO collect." },
  "/settings/reports": { title: "Reports", subtitle: "On-screen report packs (email schedules off)." },
  "/settings/query": { title: "SQL Query", subtitle: "Read-only explorer against the configured database." },
  "/settings/users": { title: "Users", subtitle: "Staff accounts, roles, scope, plus your profile and 2FA." },
  "/settings/profile": { title: "My profile", subtitle: "Display name, password, and account details." },
  "/settings/security": { title: "Security & 2FA", subtitle: "Authenticator app and backup codes for your account." },
  "/settings/audit": { title: "Audit log", subtitle: "Who created or disabled users and changed platform settings." },
  "/settings/about": { title: "About", subtitle: "Product notes and roadmap." },
};

const CONFIG_SERVICES: CorpService[] = [
  {
    id: "assure-app",
    title: "Assure Application",
    overview: "/settings/integrations",
    modules: [
      { label: "Integrations", path: "/settings/integrations" },
      { label: "RAG", path: "/settings/rag" },
      { label: "Reports", path: "/settings/reports" },
      { label: "Collect", path: "/settings/collect" },
      { label: "RPM Assure Agent", path: "/settings/agents" },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    overview: "/settings/sql",
    modules: [
      { label: "SQL Server", path: "/settings/sql" },
      { label: "SQL Query", path: "/settings/query" },
      { label: "Users", path: "/settings/users" },
      { label: "Audit Log", path: "/settings/audit" },
      { label: "SSL", path: "/settings/ssl" },
      { label: "Integrations", path: "/settings/integrations" },
    ],
  },
  {
    id: "customization",
    title: "Customization",
    overview: "/settings/theme",
    modules: [
      { label: "Theme", path: "/settings/theme" },
      { label: "UI Labels", path: "/settings/labels" },
      { label: "Dashboard", path: "/settings/dashboard" },
      { label: "Alerts", path: "/settings/alerts" },
      { label: "Report Schedules", path: "/settings/reports" },
    ],
  },
];

function SettingsLayout() {
  const { profile } = useStaffProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = profile?.permissions.canAccessPlatformSettings === true;
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

  const svc =
    CONFIG_SERVICES.find((s) =>
      s.modules.some((m) => pathname === m.path || pathname.startsWith(`${m.path}/`)),
    ) ?? null;
  const mod = svc?.modules.find((m) => pathname === m.path || pathname.startsWith(`${m.path}/`));

  return (
    <RequireAuth>
      <AppShell>
        {!canAccess ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
            <p className="font-medium text-fg">Platform Admin only</p>
            <p className="mt-2">
              Platform settings are for Platform Admins. Role:{" "}
              <strong className="text-fg">{profile?.permissions.label ?? "—"}</strong>.
            </p>
          </div>
        ) : (
          <div className="rpma-d3-workspace">
            <CorpWorkspaceRail
              heading="Configuration"
              homeHref="/settings"
              services={CONFIG_SERVICES}
              pathname={pathname}
              servicesHeading="Settings"
              modulesHeading="Service Modules"
            />
            <div className="rpma-d3-detail min-w-0">
              <div className="rpma-modnav">
                <CorpPathTrail
                  rootLabel="Configuration"
                  rootHref="/settings"
                  service={svc?.title}
                  moduleLabel={mod?.label}
                />
              </div>
              <div className="rpma-saas-settings-body min-w-0 space-y-4">
                <Outlet />
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
}
