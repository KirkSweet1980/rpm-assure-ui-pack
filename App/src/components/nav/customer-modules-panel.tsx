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
  Ticket,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";
import { HelpTip } from "@/components/ui/help-tip";
import { CoverTag, StatusRobot } from "@/components/ui/status-robot";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { isDormantCover } from "@/lib/data/cover";
import type { CustomerCover } from "@/lib/data/types";
import type { LiveFlag } from "@/lib/data/live-status";

type Props = {
  code: string;
  cover?: CustomerCover | null;
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> };
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
  modulesHeading: string;
  overview: string;
  icon: LucideIcon;
  color: string;
  covered: (c: CustomerCover | null | undefined) => boolean;
  modules: NavItem[];
}[] = [
  {
    id: "syspro",
    title: "SYSPRO Landscape",
    modulesHeading: "SYSPRO Service Modules",
    overview: "/syspro",
    icon: Database,
    color: "#0d9488",
    covered: (c) => Boolean(c?.syspro),
    modules: [
      { label: "Overview", path: "/syspro", icon: LayoutDashboard, color: "#0d9488" },
      { label: "Finance Modules", path: "/syspro/dtr", icon: Scale, color: "#d97706" },
      { label: "Licence", path: "/syspro/license", icon: KeyRound, color: "#7c3aed" },
      { label: "Hotfixes", path: "/syspro/hotfixes", icon: Wrench, color: "#ea580c" },
      { label: "Operators", path: "/syspro/operators", icon: Users, color: "#2563eb" },
      { label: "Job Logging", path: "/syspro/jobs", icon: ClipboardList, color: "#dc2626" },
      { label: "Day End", path: "/syspro/day-end", icon: Moon, color: "#4f46e5" },
      { label: "Health", path: "/syspro/health", icon: HeartPulse, color: "#16a34a" },
      { label: "Security", path: "/syspro/security", icon: Lock, color: "#334155" },
      { label: "SQL", path: "/syspro/sql", icon: Database, color: "#0891b2" },
      { label: "Service SLA", path: "/syspro/sla", icon: Gauge, color: "#7c3aed" },
    ],
  },
  {
    id: "rmm",
    title: "RPM Remote Management",
    modulesHeading: "RMM Service Modules",
    overview: "/rmm",
    icon: Server,
    color: "#2563eb",
    covered: (c) => Boolean(c?.rmm),
    modules: [
      { label: "Overview", path: "/rmm", icon: LayoutDashboard, color: "#2563eb" },
      { label: "Servers", path: "/rmm/devices", icon: Server, color: "#1d4ed8" },
      { label: "Workstations", path: "/rmm/workstations", icon: Monitor, color: "#0284c7" },
      { label: "Patch Compliance", path: "/rmm/patch", icon: Package, color: "#059669" },
      { label: "Server Alerts", path: "/rmm/alerts", icon: Bell, color: "#dc2626" },
      { label: "Disk Performance", path: "/rmm/iops", icon: HardDrive, color: "#0f766e" },
      { label: "Windows Events", path: "/rmm/events", icon: ClipboardList, color: "#b45309" },
      { label: "Service SLA", path: "/rmm/sla", icon: Gauge, color: "#7c3aed" },
    ],
  },
  {
    id: "cove",
    title: "RPM Cloud Backup",
    modulesHeading: "Backup Service Modules",
    overview: "/cove",
    icon: Cloud,
    color: "#7c3aed",
    covered: (c) => Boolean(c?.cove),
    modules: [
      { label: "Overview", path: "/cove", icon: LayoutDashboard, color: "#7c3aed" },
      { label: "Backup Agents", path: "/cove/devices", icon: HardDrive, color: "#6d28d9" },
      { label: "Recovery Testing", path: "/cove/recovery", icon: RotateCcw, color: "#2563eb" },
      { label: "Backup Retention", path: "/cove/retention", icon: Archive, color: "#d97706" },
      { label: "Service SLA", path: "/cove/sla", icon: Gauge, color: "#7c3aed" },
    ],
  },
  {
    id: "epp",
    title: "RPM End Point Protection",
    modulesHeading: "EPP Service Modules",
    overview: "/epp",
    icon: Shield,
    color: "#dc2626",
    covered: (c) => Boolean(c?.epp),
    modules: [
      { label: "Overview", path: "/epp", icon: LayoutDashboard, color: "#dc2626" },
      { label: "EndPoint Agents", path: "/epp/endpoints", icon: Monitor, color: "#b91c1c" },
      { label: "Policies & Modules", path: "/epp/modules", icon: FileKey2, color: "#7c3aed" },
      { label: "Security Incidents", path: "/epp/incidents", icon: Siren, color: "#ea580c" },
      { label: "Quarantine", path: "/epp/quarantine", icon: Ban, color: "#334155" },
      { label: "Service SLA", path: "/epp/sla", icon: Gauge, color: "#7c3aed" },
    ],
  },
  {
    id: "csp",
    title: "Microsoft 365 CSP",
    modulesHeading: "CSP Service Modules",
    overview: "/csp",
    icon: Mail,
    color: "#ea580c",
    covered: (c) => Boolean(c?.csp),
    modules: [
      { label: "Tenant Health", path: "/csp", icon: Building2, color: "#ea580c" },
      { label: "Secure Score", path: "/csp/secure-score", icon: ShieldCheck, color: "#16a34a" },
      { label: "Global Admins", path: "/csp/global-admins", icon: UserCog, color: "#dc2626" },
      { label: "MFA Registration", path: "/csp/mfa", icon: KeyRound, color: "#2563eb" },
      { label: "Licensed Users", path: "/csp/users", icon: Users, color: "#0891b2" },
      { label: "License Stats", path: "/csp/licenses", icon: KeyRound, color: "#7c3aed" },
      { label: "Service SLA", path: "/csp/sla", icon: Gauge, color: "#7c3aed" },
    ],
  },
  {
    id: "tickets",
    title: "RPM Service Desk",
    modulesHeading: "Ticket Service Modules",
    overview: "/tickets",
    icon: Ticket,
    color: "#0f766e",
    covered: (c) => Boolean(c?.tickets),
    modules: [
      { label: "Overview", path: "/tickets", icon: LayoutDashboard, color: "#0f766e" },
      { label: "Open Tickets", path: "/tickets/open", icon: AlertTriangle, color: "#d97706" },
      { label: "Resolved Tickets", path: "/tickets/resolved", icon: ClipboardList, color: "#2563eb" },
      { label: "Closed Tickets", path: "/tickets/closed", icon: Archive, color: "#334155" },
      { label: "Service SLA", path: "/tickets/sla", icon: Gauge, color: "#7c3aed" },
    ],
  },
];

function pillarIdFromPath(path: string, base: string): string {
  const rest = path.slice(base.length).replace(/^\//, "");
  const first = rest.split("/")[0];
  if (!first || first === "ams") return "eco";
  return CUSTOMER_PILLARS.some((p) => p.id === first) ? first : "eco";
}

const ECO_PILLAR = {
  id: "eco",
  title: "Tenant",
  short: "Tenant",
  modulesHeading: "RPM Service Modules",
  overview: "",
  icon: LayoutDashboard,
  color: "#0d9488",
};

export function CustomerPillarRail({ code, cover, live }: Props) {
  const path = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  const base = `/customers/${encodeURIComponent(code)}`;
  const fromUrl = pillarIdFromPath(path, base);
  const [picked, setPicked] = useState<string>(fromUrl);

  useEffect(() => {
    setPicked(fromUrl);
  }, [fromUrl]);

  const active = CUSTOMER_PILLARS.find((p) => p.id === picked) ?? null;
  const isEco = picked === "eco" || !active;
  const modules = isEco ? ECOSYSTEM_MODULES : active.modules;
  const modulesHeading = isEco ? ECO_PILLAR.modulesHeading : active.modulesHeading;
  const serviceCover = isEco ? true : active.covered(cover);

  const iconItems: {
    id: string;
    title: string;
    short: string;
    href: string;
    Icon: LucideIcon;
    color: string;
    on: boolean;
    rag: LiveFlag["rag"];
    hint?: string;
  }[] = [
    {
      id: "eco",
      title: "Tenant / Customer Ecosystem",
      short: "Tenant",
      href: base,
      Icon: ECO_PILLAR.icon,
      color: ECO_PILLAR.color,
      on: !isDormantCover(cover),
      rag: live?.pillars.eco?.rag ?? (isDormantCover(cover) ? "Off" : "Green"),
      hint: live?.pillars.eco?.hint,
    },
    ...CUSTOMER_PILLARS.map((p) => {
      const on = p.covered(cover);
      const flag = live?.pillars[p.id];
      return {
        id: p.id,
        title: p.title,
        short:
          p.id === "syspro"
            ? "SYSPRO"
            : p.id === "rmm"
              ? "RMM"
              : p.id === "cove"
                ? "Backup"
                : p.id === "epp"
                  ? "EPP"
                  : p.id === "csp"
                    ? "M365"
                    : "Tickets",
        href: `${base}${p.overview}`,
        Icon: p.icon,
        color: p.color,
        on,
        rag: flag?.rag ?? (on ? "Green" : "Off"),
        hint: flag?.hint,
      };
    }),
  ];

  return (
    <aside className="rpma-pillar-rail rpma-dual-rail" aria-label="Customer navigation">
      <nav className="rpma-icon-rail" aria-label="RPM Services">
        {iconItems.map((it) => {
          const selected = picked === it.id;
          const Icon = it.Icon;
          return (
            <SpaLink
              key={it.id}
              href={it.href}
              title={`${it.title} — ${it.on ? "Cover" : "No cover"} · ${it.hint ?? "live status"}`}
              className={cn("rpma-icon-btn", selected && "is-on", !it.on && "is-off")}
              onClick={() => setPicked(it.id)}
            >
              <span className="rpma-icon-mark">
                <Icon style={{ color: it.color }} aria-hidden />
                <span className={cn("rpma-icon-pip", it.on ? "is-cover" : "is-nocover")} />
              </span>
              <em>{it.short}</em>
              <StatusRobot rag={it.rag} title={it.hint} />
            </SpaLink>
          );
        })}
      </nav>

      <section className="rpma-mod-col">
        <div className="rpma-pillar-rail-head">
          <h2>RPM Service Modules</h2>
          <HelpTip text="Modules for the selected service. Status lamp is live RAG. Cover chip is scope." />
        </div>
        <div className="rpma-mod-static" role="navigation" aria-label={modulesHeading}>
          {modules.map((m) => {
            const href = m.path ? `${base}${m.path}` : base;
            const selected = path === href || path === `${href}/`;
            const Icon = m.icon;
            const flag = live?.modules[m.path] ?? (isEco ? live?.pillars.eco : live?.modules[m.path]);
            const dest = href;
            return (
              <SpaLink
                key={href}
                href={dest}
                title={flag?.hint ?? m.label}
                className={cn("rpma-mod-row", selected && "is-on")}
              >
                <Icon className="rpma-nav-ico" style={{ color: m.color }} aria-hidden />
                <span className="min-w-0 flex-1">{m.label}</span>
                <CoverTag on={serviceCover} />
                <StatusRobot
                  rag={flag?.rag ?? (serviceCover ? "Green" : "Off")}
                  title={flag?.hint}
                />
              </SpaLink>
            );
          })}
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
