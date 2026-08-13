import { FileText, Home, Settings } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";
import { SETTINGS_MENU_ENABLED } from "@/lib/auth/features";
import type { SwitcherCustomer } from "@/components/nav/customer-switcher";

export function DkSidebarNav({
  pathname,
}: {
  pathname: string;
  customers?: SwitcherCustomer[];
  currentCode?: string | null;
  layout?: "side" | "top";
}) {
  const path = pathname.replace(/\/$/, "") || "/";

  return (
    <nav className="dk-nav is-top" aria-label="Main">
      <SpaLink href="/" className={cn("dk-link", path === "/" && "is-active")}>
        <Home className="dk-ico" />
        <span className="dk-text">Estate</span>
      </SpaLink>
      <SpaLink
        href="/reports"
        className={cn("dk-link", path.startsWith("/reports") && "is-active")}
      >
        <FileText className="dk-ico" />
        <span className="dk-text">Reporting</span>
      </SpaLink>
      {SETTINGS_MENU_ENABLED ? (
        <SpaLink
          href="/settings"
          className={cn("dk-link", path.startsWith("/settings") && "is-active")}
        >
          <Settings className="dk-ico" />
          <span className="dk-text">Configuration</span>
        </SpaLink>
      ) : null}
    </nav>
  );
}