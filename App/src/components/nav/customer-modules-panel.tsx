import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Ban,
  Bell,
  Building2,
  ClipboardList,
  Cloud,
  Database,
  FileKey2,
  Gauge,
  HardDrive,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  Monitor,
  Moon,
  Package,
  RotateCcw,
  Scale,
  Server,
  Shield,
  ShieldCheck,
  Siren,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { CustomerCover } from "@/lib/data/types";

type Props = {
  code: string;
  cover?: CustomerCover | null;
};

type NavItem = { label: string; path: string; icon: LucideIcon; color: string };

export const ECOSYSTEM_MODULES: NavItem[] = [
  { label: "Tenant Overview", path: "", icon: LayoutDashboard, color: "#0d9488" },
  { label: "Customer Assurance", path: "/ams", icon: ShieldCheck, color: "#2563eb" },
  { label: "Customer Incidents", path: "/ams/incidents", icon: AlertTriangle, color: "#dc2626" },
  { label: "Customer Risks", path: "/ams/risks", icon: Activity, color: "#d97706" },
  { label: "Customer SLA", path: "/ams/sla", icon: Gauge, color: "#7c3aed" },
];

export const CUSTOMER_PILLARS: {
  id: keyof CustomerCover;
  title: string;
  overview: string;
  icon: LucideIcon;
  color: string;
  covered: (c: CustomerCover | null | undefined) => boolean;
  modules: NavItem[];
}[] = [
  {
    id: "syspro",
    title: "SYSPRO EcoSystem",
    overview: "/syspro",
    icon: Database,
    color: "#0d9488",
    covered: (c) => Boolean(c?.syspro),
    modules: [
      { label: "Overview", path: "/syspro", icon: LayoutDashboard, color: "#0d9488" },
      { label: "FinSight", path: "/syspro/dtr", icon: Scale, color: "#d97706" },
      { label: "Licence", path: "/syspro/license", icon: KeyRound, color: "#7c3aed" },
      { label: "Hotfixes", path: "/syspro/hotfixes", icon: Wrench, color: "#ea580c" },
      { label: "Operators", path: "/syspro/operators", icon: Users, color: "#2563eb" },
      { label: "Job Logging", path: "/syspro/jobs", icon: ClipboardList, color: "#dc2626" },
      { label: "Day End", path: "/syspro/day-end", icon: Moon, color: "#4f46e5" },
      { label: "Health", path: "/syspro/health", icon: HeartPulse, color: "#16a34a" },
      { label: "Security", path: "/syspro/security", icon: Lock, color: "#334155" },
      { label: "SQL", path: "/syspro/sql", icon: Database, color: "#0891b2" },
    ],
  },
  {
    id: "rmm",
    title: "RPM Remote Management",
    overview: "/rmm",
    icon: Server,
    color: "#2563eb",
    covered: (c) => Boolean(c?.rmm),
    modules: [
      { label: "Overview", path: "/rmm", icon: LayoutDashboard, color: "#2563eb" },
      { label: "Servers", path: "/rmm/devices", icon: Server, color: "#1d4ed8" },
      { label: "Workstations", path: "/rmm/workstations", icon: Monitor, color: "#0284c7" },
      { label: "Patch Compliance", path: "/rmm/patch", icon: Package, color: "#059669" },
      { label: "Alerts", path: "/rmm/alerts", icon: Bell, color: "#dc2626" },
      { label: "Service SLA", path: "/rmm/sla", icon: Gauge, color: "#7c3aed" },
    ],
  },
  {
    id: "cove",
    title: "RPM Cloud Backup",
    overview: "/cove",
    icon: Cloud,
    color: "#7c3aed",
    covered: (c) => Boolean(c?.cove),
    modules: [
      { label: "Overview", path: "/cove", icon: LayoutDashboard, color: "#7c3aed" },
      { label: "Backup Devices", path: "/cove/devices", icon: HardDrive, color: "#6d28d9" },
      { label: "Recovery", path: "/cove/recovery", icon: RotateCcw, color: "#2563eb" },
      { label: "Retention", path: "/cove/retention", icon: Archive, color: "#d97706" },
      { label: "Service SLA", path: "/cove/sla", icon: Gauge, color: "#7c3aed" },
    ],
  },
  {
    id: "epp",
    title: "RPM Endpoint Security",
    overview: "/epp",
    icon: Shield,
    color: "#dc2626",
    covered: (c) => Boolean(c?.epp),
    modules: [
      { label: "Overview", path: "/epp", icon: LayoutDashboard, color: "#dc2626" },
      { label: "Endpoints", path: "/epp/endpoints", icon: Monitor, color: "#b91c1c" },
      { label: "Policies", path: "/epp/modules", icon: FileKey2, color: "#7c3aed" },
      { label: "Security Incidents", path: "/epp/incidents", icon: Siren, color: "#ea580c" },
      { label: "Quarantine", path: "/epp/quarantine", icon: Ban, color: "#334155" },
      { label: "Service SLA", path: "/epp/sla", icon: Gauge, color: "#7c3aed" },
    ],
  },
  {
    id: "csp",
    title: "Microsoft 365 CSP",
    overview: "/csp",
    icon: Mail,
    color: "#ea580c",
    covered: (c) => Boolean(c?.csp),
    modules: [
      { label: "Tenant", path: "/csp", icon: Building2, color: "#ea580c" },
      { label: "Secure Score", path: "/csp/secure-score", icon: ShieldCheck, color: "#16a34a" },
      { label: "Global Admins", path: "/csp/global-admins", icon: UserCog, color: "#dc2626" },
      { label: "MFA", path: "/csp/mfa", icon: KeyRound, color: "#2563eb" },
      { label: "Users", path: "/csp/users", icon: Users, color: "#0891b2" },
      { label: "Licences", path: "/csp/licenses", icon: KeyRound, color: "#7c3aed" },
    ],
  },
];

function pillarIdFromPath(path: string, base: string) {
  const rest = path.slice(base.length).replace(/^\//, "");
  const first = rest.split("/")[0];
  if (first === "ams") return null;
  return CUSTOMER_PILLARS.some((p) => p.id === first) ? first : null;
}

export function CustomerPillarRail({ code, cover }: Props) {
  const path = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  const base = `/customers/${encodeURIComponent(code)}`;
  const fromUrl = pillarIdFromPath(path, base);
  const [picked, setPicked] = useState<string | null>(fromUrl);

  useEffect(() => {
    setPicked(fromUrl);
  }, [fromUrl]);

  const active = CUSTOMER_PILLARS.find((p) => p.id === picked);

  return (
    <aside className="rpma-pillar-rail" aria-label="Customer navigation">
      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>Customer EcoSystem</h2>
        </div>
        <div className="rpma-eco-list">
          {ECOSYSTEM_MODULES.map((m) => {
            const href = m.path ? `${base}${m.path}` : base;
            const selected = path === href || path === `${href}/`;
            const Icon = m.icon;
            return (
              <SpaLink
                key={href}
                href={href}
                title={`${m.label} — Customer EcoSystem`}
                className={cn("rpma-eco-item", selected && "is-on")}
                onClick={() => setPicked(null)}
              >
                <Icon className="rpma-nav-ico" style={{ color: m.color }} aria-hidden />
                {m.label}
              </SpaLink>
            );
          })}
        </div>
      </section>

      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>RPM Services</h2>
        </div>
        <div className="rpma-svc-static" role="navigation" aria-label="RPM Services">
          {CUSTOMER_PILLARS.map((p) => {
            const on = p.covered(cover);
            const Icon = p.icon;
            const selected = picked === p.id;
            return (
              <SpaLink
                key={p.id}
                href={`${base}${p.overview}`}
                title={`${p.title} — ${on ? "Cover" : "No cover"}`}
                className={cn("rpma-svc-row", selected && "is-on")}
                onClick={() => setPicked(p.id)}
              >
                <Icon className="rpma-svc-glyph" style={{ color: p.color }} aria-hidden />
                <span className="rpma-svc-row-name">{p.title}</span>
                <span
                  className={cn("rpma-svc-lamp", on ? "is-on-cover" : "is-off-cover")}
                  title={on ? "Cover" : "No cover"}
                  aria-label={on ? "Cover" : "No cover"}
                />
              </SpaLink>
            );
          })}
        </div>
      </section>

      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>Service Modules</h2>
        </div>
        <div className="rpma-mod-static" role="navigation" aria-label="Service Modules">
          {active ? (
            active.modules.map((m) => {
              const href = `${base}${m.path}`;
              const selected = path === href || path === `${href}/`;
              const Icon = m.icon;
              return (
                <SpaLink
                  key={href}
                  href={href}
                  className={cn("rpma-mod-row", selected && "is-on")}
                >
                  <Icon className="rpma-nav-ico" style={{ color: m.color }} aria-hidden />
                  {m.label}
                </SpaLink>
              );
            })
          ) : (
            <p className="rpma-list-empty">Select an RPM Service</p>
          )}
        </div>
      </section>
    </aside>
  );
}

export function customerPathParts(pathname: string, code: string) {
  const base = `/customers/${encodeURIComponent(code)}`;
  const path = pathname.replace(/\/$/, "");
  const rest = path.startsWith(base) ? path.slice(base.length).replace(/^\//, "") : "";
  const segs = rest ? rest.split("/") : [];
  const onAms = segs[0] === "ams";
  const pillarId = onAms ? null : segs[0] || null;
  const pillar = CUSTOMER_PILLARS.find((p) => p.id === pillarId) ?? null;
  const href = segs.length ? `${base}/${segs.join("/")}` : base;
  const ecoItem = ECOSYSTEM_MODULES.find((m) => (m.path ? `${base}${m.path}` : base) === href);
  const moduleItem = pillar
    ? pillar.modules.find((m) => `${base}${m.path}` === href) ??
      pillar.modules.find((m) => m.path === `/${segs.join("/")}`) ??
      null
    : ecoItem ?? null;
  return {
    base,
    pillar,
    serviceTitle: pillar?.title ?? (onAms || !segs.length ? "Ecosystem" : null),
    moduleLabel:
      moduleItem?.label ??
      (segs.length <= 1 && pillar ? "Overview" : segs[segs.length - 1] ?? null),
    isModule: Boolean((pillar && segs.length > 0) || onAms),
    isDeepModule: Boolean(
      (pillar && moduleItem && moduleItem.path !== pillar.overview) ||
        (onAms && href !== `${base}/ams` && href !== base),
    ),
    overviewHref: pillar
      ? `${base}${pillar.overview}`
      : onAms
        ? `${base}/ams`
        : base,
  };
}

export function CustomerPathTrail({
  code,
  pathname,
  onCustomers,
}: {
  code: string;
  pathname: string;
  onCustomers?: () => void;
}) {
  const { base, pillar, moduleLabel } = customerPathParts(pathname, code);
  const ecoLabel =
    !pillar && moduleLabel && moduleLabel !== "Overview" ? moduleLabel : "Overview";
  return (
    <nav className="rpma-crumb" aria-label="Customer path">
      <SpaLink href={base} className="rpma-crumb-a" onClick={onCustomers}>
        Customer
      </SpaLink>
      <span className="rpma-crumb-arr" aria-hidden>
        ›
      </span>
      <SpaLink href={base} className="rpma-crumb-a">
        Ecosystem
      </SpaLink>
      <span className="rpma-crumb-arr" aria-hidden>
        ›
      </span>
      {pillar ? (
        <SpaLink href={`${base}${pillar.overview}`} className="rpma-crumb-a">
          {pillar.title}
        </SpaLink>
      ) : (
        <span className={cn("rpma-crumb-now", !pillar && "is-eco")}>{ecoLabel}</span>
      )}
      {pillar ? (
        <>
          <span className="rpma-crumb-arr" aria-hidden>
            ›
          </span>
          <span className="rpma-crumb-now">{moduleLabel ?? "Module"}</span>
        </>
      ) : null}
    </nav>
  );
}
