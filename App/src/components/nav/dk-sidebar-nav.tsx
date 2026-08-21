import { CircleHelp, FileText, Home, Settings } from "lucide-react";
import { CustomerSwitcher, type SwitcherCustomer } from "@/components/nav/customer-switcher";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";
import { SETTINGS_MENU_ENABLED } from "@/lib/auth/features";

function headerMode(pathname: string): "eco" | "reports" | "settings" | "help" | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/help" || path.startsWith("/help/")) return "help";
  if (path === "/settings" || path.startsWith("/settings/")) return "settings";
  if (path === "/reports" || path.startsWith("/reports/")) return "reports";
  if (path === "/" || path.startsWith("/customers/")) return "eco";
  return null;
}

export function DkSidebarNav({
  pathname,
  customers = [],
  currentCode,
}: {
  pathname: string;
  customers?: SwitcherCustomer[];
  currentCode?: string | null;
  layout?: "side" | "top";
}) {
  const mode = headerMode(pathname);

  return (
    <nav className="dk-nav is-top" aria-label="Main">
      <SpaLink href="/" className={cn("dk-link", mode === "eco" && "is-active")}>
        <Home className="dk-ico" />
        <span className="dk-text">Eco-System</span>
      </SpaLink>
      <CustomerSwitcher
        customers={customers}
        currentCode={currentCode}
        variant="nav"
      />
      <SpaLink
        href="/reports"
        className={cn("dk-link", mode === "reports" && "is-active")}
      >
        <FileText className="dk-ico" />
        <span className="dk-text">Reporting</span>
      </SpaLink>
      {SETTINGS_MENU_ENABLED ? (
        <SpaLink
          href="/settings"
          className={cn("dk-link", mode === "settings" && "is-active")}
        >
          <Settings className="dk-ico" />
          <span className="dk-text">Configuration</span>
        </SpaLink>
      ) : null}
      <SpaLink href="/help" className={cn("dk-link", mode === "help" && "is-active")}>
        <CircleHelp className="dk-ico" />
        <span className="dk-text">Help</span>
      </SpaLink>
    </nav>
  );
}