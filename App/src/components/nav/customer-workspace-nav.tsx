/** QUARANTINED: not mounted by production routes. Canonical chrome is AppShell + EmpChrome + EmpWindow. */
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  Cloud,
  Database,
  Home,
  LayoutDashboard,
  Monitor,
  Shield,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { warmHrefsIdle } from "@/lib/nav/preload";
import { cn } from "@/lib/utils";
import type { CustomerCover } from "@/lib/data/types";
import { NoCover } from "@/components/ui/no-cover";
import { useUiLabels } from "@/lib/settings/use-ui-labels";
import type { UiLabelsConfig } from "@/lib/settings/types";

type PillarKey = keyof CustomerCover;

type DomainDef = {
  id: string;
  match: (p: string, base: string) => boolean;
  href: (base: string) => string;
  pillar: PillarKey | null;
  labelOf: (L: UiLabelsConfig) => string;
  shortOf: (L: UiLabelsConfig) => string;
  Icon: typeof Home;
};

const domains: DomainDef[] = [
  {
    id: "exec",
    match: (p, base) => p === base || p === `${base}/`,
    href: (base) => base,
    pillar: null,
    labelOf: (L) => L.ecosystem,
    shortOf: (L) => L.ecosystemShort,
    Icon: Home,
  },
  {
    id: "syspro",
    match: (p, base) => p.startsWith(`${base}/syspro`),
    href: (base) => `${base}/syspro`,
    pillar: "syspro",
    labelOf: (L) => L.syspro,
    shortOf: (L) => L.sysproShort,
    Icon: Database,
  },
  {
    id: "rmm",
    match: (p, base) => p.startsWith(`${base}/rmm`),
    href: (base) => `${base}/rmm/devices`,
    pillar: "rmm",
    labelOf: (L) => L.rmm,
    shortOf: (L) => L.rmmShort,
    Icon: Monitor,
  },
  {
    id: "cove",
    match: (p, base) => p.startsWith(`${base}/cove`),
    href: (base) => `${base}/cove`,
    pillar: "cove",
    labelOf: (L) => L.cove,
    shortOf: (L) => L.coveShort,
    Icon: Cloud,
  },
  {
    id: "epp",
    match: (p, base) => p.startsWith(`${base}/epp`),
    href: (base) => `${base}/epp`,
    pillar: "epp",
    labelOf: (L) => L.epp,
    shortOf: (L) => L.eppShort,
    Icon: Shield,
  },
  {
    id: "csp",
    match: (p, base) => p.startsWith(`${base}/csp`),
    href: (base) => `${base}/csp`,
    pillar: "csp",
    labelOf: (L) => L.csp,
    shortOf: (L) => L.cspShort,
    Icon: LayoutDashboard,
  },
  {
    id: "tickets",
    match: (p, base) => p.startsWith(`${base}/tickets`),
    href: (base) => `${base}/tickets`,
    pillar: "tickets",
    labelOf: (L) => L.tickets,
    shortOf: (L) => L.ticketsShort,
    Icon: Ticket,
  },
  {
    id: "ams",
    match: (p, base) => p.startsWith(`${base}/ams`),
    href: (base) => `${base}/ams`,
    pillar: null,
    labelOf: (L) => L.assurePack,
    shortOf: (L) => L.assurePackShort,
    Icon: ShieldCheck,
  },
];

const sysproLeaves = [
  { label: "Overview", path: "" },
  { label: "Finance Modules", path: "dtr" },
  { label: "Licence", path: "license" },
  { label: "Hotfixes", path: "hotfixes" },
  { label: "Operators", path: "operators" },
  { label: "Job Logging", path: "jobs" },
  { label: "Day End", path: "day-end" },
  { label: "Health", path: "health" },
  { label: "Security", path: "security" },
  { label: "SQL", path: "sql" },
];

const rmmLeaves = [
  { label: "Servers", path: "devices" },
  { label: "Workstations", path: "workstations" },
  { label: "Patch Compliance", path: "patch" },
  { label: "Server Alerts", path: "alerts" },
];

const coveLeaves = [
  { label: "Backup Agents", path: "devices" },
  { label: "Recovery Testing", path: "recovery" },
  { label: "Backup Retention", path: "retention" },
];

const eppLeaves = [
  { label: "Overview", path: "" },
  { label: "EndPoint Agents", path: "endpoints" },
  { label: "Policies & Modules", path: "modules" },
  { label: "Security Incidents", path: "incidents" },
  { label: "Quarantine", path: "quarantine" },
  { label: "Service SLA", path: "sla" },
];

const cspLeaves = [
  { label: "Tenant", path: "" },
  { label: "Secure Score", path: "secure-score" },
  { label: "Global Admins", path: "global-admins" },
  { label: "MFA", path: "mfa" },
  { label: "Users", path: "users" },
  { label: "Licences", path: "licenses" },
];

const ticketsLeaves = [
  { label: "Overview", path: "" },
  { label: "Open Tickets", path: "open" },
  { label: "Resolved Tickets", path: "resolved" },
  { label: "Closed Tickets", path: "closed" },
  { label: "Service SLA", path: "sla" },
];

const amsLeaves = [
  { label: "Overview", path: "" },
  { label: "Incidents", path: "incidents" },
  { label: "Risks", path: "risks" },
  { label: "SLA", path: "sla" },
];

function leavesFor(id: string) {
  if (id === "syspro") return sysproLeaves;
  if (id === "rmm") return rmmLeaves;
  if (id === "cove") return coveLeaves;
  if (id === "epp") return eppLeaves;
  if (id === "csp") return cspLeaves;
  if (id === "tickets") return ticketsLeaves;
  if (id === "ams") return amsLeaves;
  return [];
}

function pillarCovered(
  cover: CustomerCover | null | undefined,
  pillar: PillarKey | null,
): boolean {
  if (!pillar) return true;
  if (!cover) return false;
  return cover[pillar] === true;
}

export type ModuleFlag = {
  tone: "red" | "amber";
  count?: number;
};

export function CustomerWorkspaceNav({
  code,
  cover,
  modulesOnly = false,
  flags,
}: {
  code: string;
  cover?: CustomerCover | null;
  modulesOnly?: boolean;
  flags?: Record<string, ModuleFlag>;
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
        leaves: leavesFor(d.id),
      })),
    [labels],
  );

  const active = pillarTabs.find((d) => d.match(path, base));
  const activeLeaves = active?.leaves ?? [];
  const moduleBase = active
    ? active.id === "exec"
      ? base
      : `${base}/${active.id}`
    : base;

  useEffect(() => {
    const pillarHrefs = domains
      .filter((d) => pillarCovered(cover, d.pillar))
      .map((d) => d.href(base));
    const moduleHrefs = activeLeaves.map((l) =>
      l.path ? `${moduleBase}/${l.path}` : moduleBase,
    );
    return warmHrefsIdle(router, [...moduleHrefs, ...pillarHrefs], {
      delayMs: 150,
      max: 10,
    });
  }, [router, base, cover, moduleBase, activeLeaves]);

  return (
    <div className="dk-modstrip">
      {!modulesOnly ? (
      <nav className="hmd-pillars" aria-label="Customer pillars">
        {pillarTabs.map((d) => {
          const isOn = d.match(path, base);
          const covered = pillarCovered(cover, d.pillar);
          const noCover = d.pillar != null && !covered;
          const Icon = d.Icon;
          return (
            <SpaLink
              key={d.id}
              href={d.href(base)}
              title={
                d.pillar
                  ? `${d.label} — ${covered ? labels.coverOn : labels.noCover}`
                  : d.label
              }
              data-pillar={d.id}
              className={cn(
                "hmd-plink",
                isOn && "is-active",
                noCover && !isOn && "is-off",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{d.label}</span>
              <span className="sm:hidden">{d.short}</span>
              {d.pillar ? (
                <span
                  className={cn("rpma-cover-dot", covered ? "is-on" : "is-off")}
                  aria-label={covered ? labels.coverOn : labels.noCover}
                />
              ) : null}
            </SpaLink>
          );
        })}
      </nav>
      ) : null}

      {activeLeaves.length > 0 ? (
        <nav className="dk-mbar" aria-label={`${active?.label ?? ""} modules`}>
          {activeLeaves.map((l) => {
            const href = l.path ? `${moduleBase}/${l.path}` : moduleBase;
            const on =
              path === href ||
              path === `${href}/` ||
              (l.path === "" && (path === moduleBase || path === `${moduleBase}/`));
            const key = l.path || "overview";
            const flag = flags?.[key] ?? flags?.[l.path];
            return (
              <SpaLink
                key={href}
                href={href}
                className={cn(
                  "dk-mbtn",
                  on && "is-on",
                  flag?.tone === "red" && "has-red",
                  flag?.tone === "amber" && "has-amber",
                )}
              >
                {l.label}
                {flag ? (
                  <span className={cn("dk-mflag", `is-${flag.tone}`)}>
                    {flag.count != null ? flag.count : "!"}
                  </span>
                ) : null}
              </SpaLink>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

export function PillarNoCoverNote({ show }: { show: boolean }) {
  if (!show) return null;
  return <NoCover />;
}
