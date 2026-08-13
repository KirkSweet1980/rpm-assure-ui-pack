import { useMemo, useState } from "react";
import {
  ChevronDown,
  Cloud,
  Database,
  FileText,
  Home,
  LayoutDashboard,
  Monitor,
  Settings,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";
import { SETTINGS_MENU_ENABLED } from "@/lib/auth/features";
import type { SwitcherCustomer } from "@/components/nav/customer-switcher";

const PILLARS = [
  { id: "exec", label: "Ecosystem", Icon: Home, href: (b: string) => b, match: (p: string, b: string) => p === b || p === `${b}/` },
  { id: "syspro", label: "SYSPRO", Icon: Database, href: (b: string) => `${b}/syspro`, match: (p: string, b: string) => p.startsWith(`${b}/syspro`) },
  { id: "rmm", label: "Remote", Icon: Monitor, href: (b: string) => `${b}/rmm/devices`, match: (p: string, b: string) => p.startsWith(`${b}/rmm`) },
  { id: "cove", label: "Backup", Icon: Cloud, href: (b: string) => `${b}/cove`, match: (p: string, b: string) => p.startsWith(`${b}/cove`) },
  { id: "epp", label: "Protection", Icon: Shield, href: (b: string) => `${b}/epp`, match: (p: string, b: string) => p.startsWith(`${b}/epp`) },
  { id: "csp", label: "Microsoft 365", Icon: LayoutDashboard, href: (b: string) => `${b}/csp`, match: (p: string, b: string) => p.startsWith(`${b}/csp`) },
  { id: "ams", label: "Assure", Icon: ShieldCheck, href: (b: string) => `${b}/ams`, match: (p: string, b: string) => p.startsWith(`${b}/ams`) },
] as const;

export function DkSidebarNav({
  pathname,
  customers,
  currentCode,
}: {
  pathname: string;
  customers: SwitcherCustomer[];
  currentCode?: string | null;
}) {
  const path = pathname.replace(/\/$/, "") || "/";
  const base = currentCode ? `/customers/${encodeURIComponent(currentCode)}` : "";
  const [pickOpen, setPickOpen] = useState(false);
  const current = useMemo(
    () => customers.find((c) => c.code === currentCode),
    [customers, currentCode],
  );

  return (
    <nav className="dk-nav" aria-label="Main">
      <p className="dk-caption">Workspace</p>
      <SpaLink href="/" className={cn("dk-link", path === "/" && "is-active")}>
        <Home className="dk-ico" />
        <span className="dk-text">EcoSystem</span>
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

      <p className="dk-caption">Tenant</p>
      <button
        type="button"
        className={cn("dk-link dk-collapse", currentCode && "is-active")}
        onClick={() => setPickOpen((v) => !v)}
      >
        <Users className="dk-ico" />
        <span className="dk-text">{current?.name ?? "Choose tenant"}</span>
        <ChevronDown className={cn("dk-arrow", pickOpen && "rot")} />
      </button>
      {pickOpen ? (
        <ul className="dk-picker">
          {customers.length === 0 ? (
            <li className="dk-empty">No customers</li>
          ) : (
            customers.map((c) => (
              <li key={c.code}>
                <SpaLink
                  href={`/customers/${encodeURIComponent(c.code)}`}
                  className={cn("dk-sublink", currentCode === c.code && "is-active")}
                  onClick={() => setPickOpen(false)}
                >
                  {c.name}
                </SpaLink>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {currentCode && base ? (
        <>
          <p className="dk-caption">Pillars</p>
          {PILLARS.map((p) => {
            const Icon = p.Icon;
            const on = p.match(path, base);
            return (
              <SpaLink
                key={p.id}
                href={p.href(base)}
                className={cn("dk-link", on && "is-active")}
              >
                <Icon className="dk-ico" />
                <span className="dk-text">{p.label}</span>
              </SpaLink>
            );
          })}
        </>
      ) : null}
    </nav>
  );
}
