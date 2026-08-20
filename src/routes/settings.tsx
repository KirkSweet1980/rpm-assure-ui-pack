import { Link, Outlet, createFileRoute, Navigate, useRouterState } from "@tanstack/react-router";
import { Bell, CircleHelp, Database, FileText, KeyRound, LayoutDashboard, Mail, Palette, Plug, Server, Shield, Sparkles, Tags, Users } from "lucide-react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { EmpWindow, type EmpGroup } from "@/components/chrome/emp-window";
import type { CorpService } from "@/components/nav/corp-workspace-rail";
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
      { label: "Vision", path: "/settings/vision", icon: Sparkles, color: "#14b8a6" },
    ],
  },
  {
    id: "service-config",
    title: "Service Config",
    overview: "/settings/smtp",
    icon: Mail,
    color: "#2563eb",
    modules: [
      { label: "SMTP / Email", path: "/settings/smtp", icon: Mail, color: "#2563eb" },
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
      { label: "My profile", path: "/settings/profile", icon: Users, color: "#be123c" },
      { label: "Audit Log", path: "/settings/audit", icon: FileText, color: "#334155" },
    ],
  },
  {
    id: "customization",
    title: "UI Customize",
    overview: "/settings/theme",
    icon: Palette,
    color: "#7c3aed",
    modules: [
      { label: "Templates & palettes", path: "/settings/theme", icon: Palette, color: "#7c3aed" },
      { label: "Menu Style", path: "/settings/chrome", icon: LayoutDashboard, color: "#0d9488" },
      { label: "Nav mockups", path: "/settings/nav-lab", icon: LayoutDashboard, color: "#14b8a6" },
      { label: "UI Labels", path: "/settings/labels", icon: Tags, color: "#d97706" },
      { label: "Dashboard Layout", path: "/settings/dashboard", icon: LayoutDashboard, color: "#2563eb" },
      { label: "Alert Rules", path: "/settings/alerts", icon: Bell, color: "#dc2626" },
      { label: "Report Packs", path: "/settings/reports", icon: FileText, color: "#0891b2" },
      { label: "Application help", path: "/help", icon: CircleHelp, color: "#0f766e" },
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
          <EmpWindow
            title="Configuration"
            menu={[
              { label: "Customer Ecosystem Home", href: "/", on: false },
              { label: "Customer Service Overview", href: "/reports?format=ams-monthly" },
            ]}
            groups={CONFIG_SERVICES.map((s): EmpGroup => ({
              id: s.id,
              title: s.title,
              on: svc?.id === s.id,
              color: s.color,
              icon: s.icon,
              items: s.modules.map((m) => ({
                label: m.label,
                href: m.path,
                icon: m.icon,
                rag: pathname === m.path || pathname.startsWith(`${m.path}/`) ? "Green" : "Off",
                active: pathname === m.path || pathname.startsWith(`${m.path}/`),
              })),
            }))}
          >
            <Outlet />
          </EmpWindow>
        )}
      </AppShell>
    </RequireAuth>
  );
}
