import { Link, Outlet, createFileRoute, Navigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Bell, Database, FileText, KeyRound, LayoutDashboard, Mail, Palette, Plug, Server, Shield, Tags, Users } from "lucide-react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { Button } from "@/components/ui/button";
import { CorpPathTrail, CorpWorkspaceRail, type CorpService } from "@/components/nav/corp-workspace-rail";
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
    icon: Server,
    color: "#0d9488",
    modules: [
      { label: "Infrastructure", path: "/settings/infrastructure", icon: Server, color: "#0d9488" },
      { label: "Collect", path: "/settings/collect", icon: Database, color: "#2563eb" },
      { label: "RAG", path: "/settings/rag", icon: Shield, color: "#d97706" },
    ],
  },
  {
    id: "service-config",
    title: "Service Config",
    overview: "/settings/smtp",
    icon: Mail,
    color: "#2563eb",
    modules: [
      { label: "SMTP", path: "/settings/smtp", icon: Mail, color: "#2563eb" },
      { label: "SQL Server", path: "/settings/sql", icon: Database, color: "#0891b2" },
      { label: "SQL Query", path: "/settings/query", icon: FileText, color: "#4f46e5" },
      { label: "SSL / HTTPS", path: "/settings/ssl", icon: KeyRound, color: "#7c3aed" },
      { label: "Integrations", path: "/settings/integrations", icon: Plug, color: "#ea580c" },
    ],
  },
  {
    id: "access",
    title: "Access",
    overview: "/settings/users",
    icon: Users,
    color: "#dc2626",
    modules: [
      { label: "Users", path: "/settings/users", icon: Users, color: "#dc2626" },
      { label: "Audit Log", path: "/settings/audit", icon: FileText, color: "#334155" },
    ],
  },
  {
    id: "customization",
    title: "Customization",
    overview: "/settings/theme",
    icon: Palette,
    color: "#7c3aed",
    modules: [
      { label: "Theme Tokens", path: "/settings/theme", icon: Palette, color: "#7c3aed" },
      { label: "Menu Style", path: "/settings/chrome", icon: LayoutDashboard, color: "#0d9488" },
      { label: "Nav mockups", path: "/settings/nav-lab", icon: LayoutDashboard, color: "#14b8a6" },
      { label: "UI Labels", path: "/settings/labels", icon: Tags, color: "#d97706" },
      { label: "Dashboard Layout", path: "/settings/dashboard", icon: LayoutDashboard, color: "#2563eb" },
      { label: "Alert Rules", path: "/settings/alerts", icon: Bell, color: "#dc2626" },
      { label: "Report Packs", path: "/settings/reports", icon: FileText, color: "#0891b2" },
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
          <>
            <div className="rpma-context-bar" role="navigation" aria-label="Configuration path">
              <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-2 text-[12px]">
                <Link to="/">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Link>
              </Button>
              <CorpPathTrail
                rootLabel="Configuration"
                rootHref="/settings/infrastructure"
                service={svc?.title}
                moduleLabel={mod?.label}
              />
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[12px]">
                <Link to="/">Exco</Link>
              </Button>
              <h2 className="text-[15px] font-bold tracking-tight text-fg sm:text-base">
                Configuration
              </h2>
              <span className="hidden text-[11px] text-muted sm:inline">
                {mod?.label ?? svc?.title ?? "Overview"}
              </span>
            </div>
            <div className="rpma-d3-workspace is-tool">
              <CorpWorkspaceRail
                heading="Configuration"
                homeHref="/settings/infrastructure"
                homeLabel="Overview"
                services={CONFIG_SERVICES}
                pathname={pathname}
                servicesHeading="Services"
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
          </>
        )}
      </AppShell>
    </RequireAuth>
  );
}
