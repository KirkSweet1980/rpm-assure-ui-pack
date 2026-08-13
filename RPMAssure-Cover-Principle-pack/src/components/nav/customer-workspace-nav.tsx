import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { SpaLink } from "@/components/nav/spa-link";
import { warmHrefsIdle } from "@/lib/nav/preload";
import { cn } from "@/lib/utils";
import type { CustomerCover } from "@/lib/data/types";
import { NoCover } from "@/components/ui/no-cover";
import { useUiLabels } from "@/lib/settings/use-ui-labels";
import type { UiLabelsConfig } from "@/lib/settings/types";

/**
 * Customer workspace IA — pillars + modules as shadcn Tabs visual pattern (Phase 2)
 * Pillar display names come from Settings → Labels (useUiLabels).
 */
type PillarKey = keyof CustomerCover;

type DomainDef = {
  id: string;
  match: (p: string, base: string) => boolean;
  href: (base: string) => string;
  pillar: PillarKey | null;
  labelOf: (L: UiLabelsConfig) => string;
  shortOf: (L: UiLabelsConfig) => string;
};

const domains: DomainDef[] = [
  {
    id: "exec",
    match: (p, base) => p === base || p === `${base}/`,
    href: (base) => base,
    pillar: null,
    labelOf: (L) => L.ecosystem,
    shortOf: (L) => L.ecosystemShort,
  },
  {
    id: "syspro",
    match: (p, base) => p.startsWith(`${base}/syspro`),
    href: (base) => `${base}/syspro`,
    pillar: "syspro",
    labelOf: (L) => L.syspro,
    shortOf: (L) => L.sysproShort,
  },
  {
    id: "rmm",
    match: (p, base) => p.startsWith(`${base}/rmm`),
    href: (base) => `${base}/rmm/devices`,
    pillar: "rmm",
    labelOf: (L) => L.rmm,
    shortOf: (L) => L.rmmShort,
  },
  {
    id: "cove",
    match: (p, base) => p.startsWith(`${base}/cove`),
    href: (base) => `${base}/cove`,
    pillar: "cove",
    labelOf: (L) => L.cove,
    shortOf: (L) => L.coveShort,
  },
  {
    id: "epp",
    match: (p, base) => p.startsWith(`${base}/epp`),
    href: (base) => `${base}/epp`,
    pillar: "epp",
    labelOf: (L) => L.epp,
    shortOf: (L) => L.eppShort,
  },
  {
    id: "csp",
    match: (p, base) => p.startsWith(`${base}/csp`),
    href: (base) => `${base}/csp`,
    pillar: "csp",
    labelOf: (L) => L.csp,
    shortOf: (L) => L.cspShort,
  },
  {
    id: "ams",
    match: (p, base) => p.startsWith(`${base}/ams`),
    href: (base) => `${base}/ams`,
    pillar: null,
    labelOf: (L) => L.assurePack,
    shortOf: (L) => L.assurePackShort,
  },
];

const sysproLeaves = [
  { label: "Overview", path: "" },
  { label: "FinSight", path: "dtr" },
  { label: "License", path: "license" },
  { label: "Hotfixes", path: "hotfixes" },
  { label: "Operators", path: "operators" },
  { label: "Jobs", path: "jobs" },
  { label: "Health", path: "health" },
  { label: "Security", path: "security" },
  { label: "SQL", path: "sql" },
];

const rmmLeaves = [
  { label: "Servers", path: "devices" },
  { label: "Workstations", path: "workstations" },
  { label: "Server Patch Management", path: "patch" },
  { label: "Server Alerts", path: "alerts" },
];

const coveLeaves = [
  { label: "Devices on Cloud Backup", path: "devices" },
  { label: "Backup Recovery Testing", path: "recovery" },
  { label: "Retention policies", path: "retention" },
];

// EPP-MENUS-20260812 — GravityZone modules exposed in UI
const eppLeaves = [
  { label: "Overview", path: "" },
  { label: "Endpoints", path: "endpoints" },
  { label: "Policies", path: "modules" },
  { label: "Incidents", path: "incidents" },
  { label: "Quarantine", path: "quarantine" },
];

// M365-MENUS-20260812 — full CSP module row (do not shrink)
const cspLeaves = [
  { label: "Tenant health", path: "" },
  { label: "Secure Score", path: "secure-score" },
  { label: "Global Admins", path: "global-admins" },
  { label: "MFA registration", path: "mfa" },
  { label: "Licensed users", path: "users" },
  { label: "License stats", path: "licenses" },
];

const amsLeaves = [
  { label: "Overview", path: "" },
  { label: "Incidents", path: "incidents" },
  { label: "Risks", path: "risks" },
  { label: "SLA", path: "sla" },
];

function pillarCovered(
  cover: CustomerCover | null | undefined,
  pillar: PillarKey | null,
): boolean {
  if (!pillar) return true;
  if (!cover) return false;
  return cover[pillar] === true;
}

export function CustomerWorkspaceNav({
  code,
  cover,
}: {
  code: string;
  cover?: CustomerCover | null;
}) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { labels } = useUiLabels();
  const base = `/customers/${encodeURIComponent(code)}`;
  const path = pathname.replace(/\/$/, "") || "/";

  const pillarTabs = useMemo(
    () =>
      domains.map((d) => ({
        ...d,
        label: d.labelOf(labels),
        short: d.shortOf(labels),
      })),
    [labels],
  );

  const inSyspro = path.startsWith(`${base}/syspro`);
  const inCove = path.startsWith(`${base}/cove`);
  const inRmm = path.startsWith(`${base}/rmm`);
  const inEpp = path.startsWith(`${base}/epp`);
  const inCsp = path.startsWith(`${base}/csp`);
  const inAms = path.startsWith(`${base}/ams`);

  useEffect(() => {
    const pillarHrefs = domains
      .filter((d) => pillarCovered(cover, d.pillar))
      .map((d) => d.href(base));

    let moduleHrefs: string[] = [];
    if (inSyspro) {
      moduleHrefs = sysproLeaves.map((l) =>
        l.path ? `${base}/syspro/${l.path}` : `${base}/syspro`,
      );
    } else if (inRmm) {
      moduleHrefs = rmmLeaves.map((l) =>
        l.path ? `${base}/rmm/${l.path}` : `${base}/rmm`,
      );
    } else if (inCove) {
      moduleHrefs = coveLeaves.map((l) =>
        l.path ? `${base}/cove/${l.path}` : `${base}/cove`,
      );
    } else if (inEpp) {
      moduleHrefs = eppLeaves.map((l) =>
        l.path ? `${base}/epp/${l.path}` : `${base}/epp`,
      );
    } else if (inCsp) {
      moduleHrefs = cspLeaves.map((l) =>
        l.path ? `${base}/csp/${l.path}` : `${base}/csp`,
      );
    } else if (inAms) {
      moduleHrefs = amsLeaves.map((l) =>
        l.path ? `${base}/ams/${l.path}` : `${base}/ams`,
      );
    }

    return warmHrefsIdle(router, [...moduleHrefs, ...pillarHrefs], {
      delayMs: 150,
      max: 10,
    });
  }, [router, base, cover, inSyspro, inRmm, inCove, inEpp, inCsp, inAms]);

  return (
    <div className="rpma-workspace-nav space-y-2.5">
      <div
        className="rpma-tabs-list rpma-pillar-track flex w-full flex-wrap gap-0.5 rounded-lg bg-surface-2/90 p-1"
        role="tablist"
        aria-label="Customer service pillars"
      >
        {pillarTabs.map((d) => {
          const active = d.match(path, base);
          const covered = pillarCovered(cover, d.pillar);
          const noCover = d.pillar != null && !covered;
          return (
            <SpaLink
              key={d.id}
              href={d.href(base)}
              role="tab"
              aria-selected={active}
              title={
                d.pillar
                  ? `${d.label} — ${covered ? labels.coverOn : labels.noCover}`
                  : d.label
              }
              data-state={active ? "active" : "inactive"}
              className={cn(
                "rpma-tabs-trigger rpma-pillar-btn inline-flex min-h-9 min-w-0 flex-1 flex-col items-center justify-center rounded-md px-1.5 py-1.5 text-center sm:px-2",
                "text-[11px] font-semibold leading-tight tracking-tight sm:text-[12px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                active
                  ? "is-active"
                  : "text-muted hover:text-fg hover:bg-surface/80",
                noCover && !active && "opacity-55",
              )}
            >
              <span className="hidden truncate sm:inline">{d.label}</span>
              <span className="truncate sm:hidden">{d.short}</span>
              {d.pillar ? (
                <span
                  className={cn(
                    "mt-0.5 text-[9px] font-bold uppercase tracking-wide",
                    covered ? "text-rag-green" : "text-amber-600",
                  )}
                >
                  {covered ? labels.coverOn : labels.noCover}
                </span>
              ) : null}
            </SpaLink>
          );
        })}
      </div>

      {inSyspro ? (
        <ModuleRow base={`${base}/syspro`} leaves={sysproLeaves} aria="SYSPRO modules" />
      ) : null}
      {inRmm ? (
        <ModuleRow base={`${base}/rmm`} leaves={rmmLeaves} aria="RMM modules" />
      ) : null}
      {inCove ? (
        <ModuleRow base={`${base}/cove`} leaves={coveLeaves} aria="Backup modules" />
      ) : null}
      {inEpp ? (
        <ModuleRow base={`${base}/epp`} leaves={eppLeaves} aria="EPP modules" />
      ) : null}
      {inCsp ? (
        <ModuleRow base={`${base}/csp`} leaves={cspLeaves} aria="M365 modules" />
      ) : null}
      {inAms ? (
        <ModuleRow
          base={`${base}/ams`}
          leaves={amsLeaves}
          aria={`${labels.assurePack} pack`}
        />
      ) : null}
    </div>
  );
}

function ModuleRow({
  base,
  leaves,
  aria,
}: {
  base: string;
  leaves: { label: string; path: string }[];
  aria: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const path = pathname.replace(/\/$/, "") || "/";
  return (
    <div
      className="rpma-module-track flex flex-wrap gap-1 rounded-lg border border-border/60 bg-surface/50 p-1"
      role="tablist"
      aria-label={aria}
    >
      {leaves.map((l) => {
        const href = l.path ? `${base}/${l.path}` : base;
        const active =
          path === href ||
          path === `${href}/` ||
          (l.path === "" && (path === base || path === `${base}/`));
        return (
          <SpaLink
            key={href}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[11px] font-semibold sm:text-xs",
              active
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            {l.label}
          </SpaLink>
        );
      })}
    </div>
  );
}

/** Re-export for callers that showed cover elsewhere */
export function PillarNoCoverNote({ show }: { show: boolean }) {
  if (!show) return null;
  return <NoCover />;
}
