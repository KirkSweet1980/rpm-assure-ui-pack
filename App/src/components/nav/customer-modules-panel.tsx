import { useEffect, useState } from "react";
import {
  Cloud,
  Database,
  Mail,
  Server,
  Shield,
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

export const ECOSYSTEM_MODULES: { label: string; path: string }[] = [
  { label: "Tenant Overview", path: "" },
  { label: "Customer Assurance", path: "/ams" },
  { label: "Incidents", path: "/ams/incidents" },
  { label: "Risks", path: "/ams/risks" },
  { label: "SLA", path: "/ams/sla" },
];

export const CUSTOMER_PILLARS: {
  id: keyof CustomerCover;
  title: string;
  overview: string;
  icon: LucideIcon;
  covered: (c: CustomerCover | null | undefined) => boolean;
  modules: { label: string; path: string }[];
}[] = [
  {
    id: "syspro",
    title: "SYSPRO EcoSystem",
    overview: "/syspro",
    icon: Database,
    covered: (c) => Boolean(c?.syspro),
    modules: [
      { label: "Overview", path: "/syspro" },
      { label: "FinSight", path: "/syspro/dtr" },
      { label: "Licence", path: "/syspro/license" },
      { label: "Hotfixes", path: "/syspro/hotfixes" },
      { label: "Operators", path: "/syspro/operators" },
      { label: "Job Logging", path: "/syspro/jobs" },
      { label: "Day End", path: "/syspro/day-end" },
      { label: "Health", path: "/syspro/health" },
      { label: "Security", path: "/syspro/security" },
      { label: "SQL", path: "/syspro/sql" },
    ],
  },
  {
    id: "rmm",
    title: "RPM Remote Management",
    overview: "/rmm",
    icon: Server,
    covered: (c) => Boolean(c?.rmm),
    modules: [
      { label: "Overview", path: "/rmm" },
      { label: "Servers", path: "/rmm/devices" },
      { label: "Workstations", path: "/rmm/workstations" },
      { label: "Patch Compliance", path: "/rmm/patch" },
      { label: "Alerts", path: "/rmm/alerts" },
    ],
  },
  {
    id: "cove",
    title: "RPM Cloud Backup",
    overview: "/cove",
    icon: Cloud,
    covered: (c) => Boolean(c?.cove),
    modules: [
      { label: "Overview", path: "/cove" },
      { label: "Backup Devices", path: "/cove/devices" },
      { label: "Recovery", path: "/cove/recovery" },
      { label: "Retention", path: "/cove/retention" },
    ],
  },
  {
    id: "epp",
    title: "RPM Endpoint Security",
    overview: "/epp",
    icon: Shield,
    covered: (c) => Boolean(c?.epp),
    modules: [
      { label: "Overview", path: "/epp" },
      { label: "Endpoints", path: "/epp/endpoints" },
      { label: "Policies", path: "/epp/modules" },
      { label: "Security Incidents", path: "/epp/incidents" },
      { label: "Quarantine", path: "/epp/quarantine" },
    ],
  },
  {
    id: "csp",
    title: "Microsoft 365 CSP",
    overview: "/csp",
    icon: Mail,
    covered: (c) => Boolean(c?.csp),
    modules: [
      { label: "Tenant", path: "/csp" },
      { label: "Secure Score", path: "/csp/secure-score" },
      { label: "Global Admins", path: "/csp/global-admins" },
      { label: "MFA", path: "/csp/mfa" },
      { label: "Users", path: "/csp/users" },
      { label: "Licences", path: "/csp/licenses" },
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
          <h2>Ecosystem</h2>
        </div>
        <div className="rpma-eco-list">
          {ECOSYSTEM_MODULES.map((m) => {
            const href = m.path ? `${base}${m.path}` : base;
            const selected = path === href || path === `${href}/`;
            return (
              <SpaLink
                key={href}
                href={href}
                title={`${m.label} — Ecosystem`}
                className={cn("rpma-eco-item", selected && "is-on")}
                onClick={() => setPicked(null)}
              >
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
                <Icon className="rpma-svc-glyph" aria-hidden />
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
              return (
                <SpaLink
                  key={href}
                  href={href}
                  className={cn("rpma-mod-row", selected && "is-on")}
                >
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
