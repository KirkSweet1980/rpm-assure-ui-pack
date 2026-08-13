import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";
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
  covered: (c: CustomerCover | null | undefined) => boolean;
  modules: { label: string; path: string }[];
}[] = [
  {
    id: "syspro",
    title: "SYSPRO",
    overview: "/syspro",
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

function NavDropdown({
  title,
  value,
  placeholder,
  tone,
  open,
  onToggle,
  children,
}: {
  title: string;
  value: string | null;
  placeholder: string;
  tone: "cover" | "nocover" | "neutral";
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rpma-nav-block">
      <div className="rpma-pillar-rail-head">
        <h2>{title}</h2>
      </div>
      <div className="rpma-dd">
        <button
          type="button"
          className={cn("rpma-dd-trigger", open && "is-open")}
          aria-expanded={open}
          onClick={onToggle}
        >
          <i className={cn("rpma-dd-pip", `is-${tone}`)} aria-hidden />
          <span className={cn("truncate", !value && "is-ph")}>{value ?? placeholder}</span>
          <ChevronDown className={cn("rpma-dd-chev", open && "rot")} />
        </button>
        {open ? (
          <div className="rpma-dd-menu" role="listbox">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CustomerPillarRail({ code, cover }: Props) {
  const path = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  const base = `/customers/${encodeURIComponent(code)}`;
  const fromUrl = pillarIdFromPath(path, base);
  const [picked, setPicked] = useState<string | null>(fromUrl);
  const [open, setOpen] = useState<"svc" | "mod" | null>(fromUrl ? "mod" : "svc");
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPicked(fromUrl);
    setOpen(fromUrl ? "mod" : "svc");
  }, [fromUrl]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = CUSTOMER_PILLARS.find((p) => p.id === picked);
  const currentMod =
    active?.modules.find((m) => {
      const href = `${base}${m.path}`;
      return path === href || path === `${href}/`;
    }) ?? null;
  const svcOn = active ? active.covered(cover) : true;

  return (
    <aside ref={rootRef} className="rpma-pillar-rail" aria-label="Customer navigation">
      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>Ecosystem</h2>
        </div>
        <div className="rpma-pillar-mods is-eco">
          {ECOSYSTEM_MODULES.map((m) => {
            const href = m.path ? `${base}${m.path}` : base;
            const selected = path === href || path === `${href}/`;
            return (
              <SpaLink
                key={href}
                href={href}
                title={`${m.label} — Ecosystem`}
                className={cn("rpma-modbtn is-cover", selected && "is-on")}
                onClick={() => {
                  setPicked(null);
                  setOpen(null);
                }}
              >
                {m.label}
              </SpaLink>
            );
          })}
        </div>
      </section>

      <NavDropdown
        title="RPM Services"
        value={active?.title ?? null}
        placeholder="Select a service"
        tone={active ? (svcOn ? "cover" : "nocover") : "neutral"}
        open={open === "svc"}
        onToggle={() => setOpen((v) => (v === "svc" ? null : "svc"))}
      >
        {CUSTOMER_PILLARS.map((p) => {
          const on = p.covered(cover);
          return (
            <SpaLink
              key={p.id}
              href={`${base}${p.overview}`}
              role="option"
              aria-selected={picked === p.id}
              className={cn("rpma-dd-item", picked === p.id && "is-on")}
              onClick={() => {
                setPicked(p.id);
                setOpen("mod");
              }}
            >
              <span className="rpma-dd-name">{p.title}</span>
              <span className="rpma-dd-meta">
                <span className={cn("rpma-dd-status", on ? "is-cover" : "is-nocover")}>
                  {on ? "Cover" : "No cover"}
                </span>
                {picked === p.id ? <Check className="rpma-dd-check" /> : null}
              </span>
            </SpaLink>
          );
        })}
      </NavDropdown>

      <NavDropdown
        title="Service Modules"
        value={currentMod?.label ?? null}
        placeholder={active ? "Select a service module" : "Select a service first"}
        tone={active ? (svcOn ? "cover" : "nocover") : "neutral"}
        open={open === "mod"}
        onToggle={() => active && setOpen((v) => (v === "mod" ? null : "mod"))}
      >
        {active ? (
          active.modules.map((m) => {
            const href = `${base}${m.path}`;
            const selected = path === href || path === `${href}/`;
            const on = active.covered(cover);
            return (
              <SpaLink
                key={href}
                href={href}
                role="option"
                aria-selected={selected}
                className={cn("rpma-dd-item", selected && "is-on")}
                onClick={() => setOpen(null)}
              >
                <span className="rpma-dd-name">{m.label}</span>
                <span className="rpma-dd-meta">
                  <span className={cn("rpma-dd-status", on ? "is-cover" : "is-nocover")}>
                    {on ? "Cover" : "No cover"}
                  </span>
                  {selected ? <Check className="rpma-dd-check" /> : null}
                </span>
              </SpaLink>
            );
          })
        ) : (
          <p className="rpma-list-empty">Select an RPM Service</p>
        )}
      </NavDropdown>
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
  onCustomers: () => void;
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
