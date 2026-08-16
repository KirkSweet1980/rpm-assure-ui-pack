import { Outlet, createFileRoute, Navigate, useRouterState } from "@tanstack/react-router";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { CorpWorkspaceRail, type CorpService } from "@/components/nav/corp-workspace-rail";
import { USER_PROFILE_ENABLED, TWO_FACTOR_ENABLED, SETTINGS_MENU_ENABLED } from "@/lib/auth/features";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

const CONFIG_SERVICES: CorpService[] = [
  {
    id: "assure-app",
    title: "Assure Application",
    overview: "/settings/infrastructure",
    modules: [
      { label: "Assure Infrastructure Status", path: "/settings/infrastructure" },
      { label: "RAG", path: "/settings/rag" },
      { label: "Collect", path: "/settings/collect" },
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
      { label: "SSL / HTTPS", path: "/settings/ssl" },
    ],
  },
  {
    id: "customization",
    title: "Customization",
    overview: "/settings/theme",
    modules: [
      { label: "Theme Tokens", path: "/settings/theme" },
      { label: "Menu Style", path: "/settings/chrome" },
      { label: "UI Labels", path: "/settings/labels" },
      { label: "Dashboard Layout", path: "/settings/dashboard" },
      { label: "Alert Rules", path: "/settings/alerts" },
      { label: "Report Packs", path: "/settings/reports" },
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
          <div className="rpma-d3-workspace is-tool">
            <CorpWorkspaceRail
              heading="Configuration"
              homeHref="/settings/infrastructure"
              services={CONFIG_SERVICES}
              pathname={pathname}
              servicesHeading="Settings"
              modulesHeading="Service Modules"
              stacked
            />
            <div className="rpma-d3-detail min-w-0">
              <div className="rpma-pane-menubar" role="banner">
                <h2 className="rpma-pane-menubar-title">
                  {mod?.label ?? svc?.title ?? "Configuration"}
                </h2>
              </div>
              <div className="rpma-d3-detail-body rpma-settings-body">
                <Outlet />
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
}