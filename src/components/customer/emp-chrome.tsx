import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";
import { CustomerSwitcher } from "@/components/nav/customer-switcher";
import { useCustomerList } from "@/lib/nav/customer-list-context";
import { CUSTOMER_PILLARS, ECOSYSTEM_MODULES } from "@/components/nav/customer-modules-panel";
import type { LiveFlag, LiveTone } from "@/lib/data/live-status";
import { EmpInspector } from "@/components/chrome/emp-inspector";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type RibbonItem = { label: string; rel: string; icon: LucideIcon };
type RibbonGroup = { id: string; title: string; match: string; items: RibbonItem[] };

const GROUP_TITLE: Record<string, string> = {
  estate: "Customer Eco System",
  syspro: "SYSPRO Landscape",
  rmm: "RMM | Infrastructure Management",
  cove: "RPM Cloud Backup",
  epp: "RPM End Point Protection",
  csp: "Microsoft 365",
  tickets: "RPM Service Desk",
};

const SHORT: Record<string, string> = {
  "Tenant Overview": "Overview",
  "Customer Assurance": "Assurance",
  "Customer Incidents": "Incidents",
  "Customer Risks": "Risks",
  "Customer SLA": "SLA",
  "Job Logging": "Jobs",
  "Patch Compliance": "Patch",
  "Disk IOPS": "IOPS",
  "Event Logs": "Events",
  "Service SLA": "SLA",
  "Backup Devices": "Devices",
  "Security Incidents": "Incidents",
  "Open Tickets": "Open",
  "Resolved Tickets": "Resolved",
  "Closed Tickets": "Closed",
  "Secure Score": "Score",
  "Global Admins": "Admins",
};

function shortLabel(label: string) {
  return SHORT[label] ?? label;
}

const RIBBON: RibbonGroup[] = [
  {
    id: "estate",
    title: GROUP_TITLE.estate,
    match: "",
    items: ECOSYSTEM_MODULES.map((m) => ({
      label: shortLabel(m.label),
      rel: m.path,
      icon: m.icon,
    })),
  },
  ...CUSTOMER_PILLARS.map((p) => ({
    id: p.id,
    title: GROUP_TITLE[p.id] ?? p.title,
    match: p.overview,
    items: p.modules.map((m) => ({
      label: shortLabel(m.label),
      rel: m.path,
      icon: m.icon,
    })),
  })),
];

function ragOf(
  rel: string,
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> },
): LiveTone {
  const m = live?.modules[rel];
  if (m?.rag) return m.rag;
  if (rel.startsWith("/syspro")) return live?.pillars.syspro?.rag ?? "Off";
  if (rel.startsWith("/rmm")) return live?.pillars.rmm?.rag ?? "Off";
  if (rel.startsWith("/cove")) return live?.pillars.cove?.rag ?? "Off";
  if (rel.startsWith("/epp")) return live?.pillars.epp?.rag ?? "Off";
  if (rel.startsWith("/csp")) return live?.pillars.csp?.rag ?? "Off";
  if (rel.startsWith("/tickets") || rel.startsWith("/ams")) {
    return live?.pillars.tickets?.rag ?? live?.pillars.ams?.rag ?? "Off";
  }
  return live?.pillars.eco?.rag ?? "Off";
}

function worstRag(
  g: RibbonGroup,
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> },
): LiveTone {
  const tones = g.items.map((it) => ragOf(it.rel, live));
  if (tones.includes("Red")) return "Red";
  if (tones.includes("Amber")) return "Amber";
  if (tones.includes("Green")) return "Green";
  return "Off";
}

export function EmpChrome({
  customerCode,
  customerName,
  live,
  lastImportAt,
  children,
}: {
  customerCode: string;
  customerName: string;
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> };
  lastImportAt?: string | null;
  children: ReactNode;
}) {
  const { customers } = useCustomerList();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/customers/${encodeURIComponent(customerCode)}`;
  const rest = pathname.replace(base, "") || "";
  const group =
    RIBBON.find((g) => g.match && (rest === g.match || rest.startsWith(`${g.match}/`))) ??
    RIBBON[0];
  const item =
    [...group.items].reverse().find((it) => it.rel && (rest === it.rel || rest.startsWith(`${it.rel}/`))) ??
    group.items[0];
  const flag = live?.modules[item.rel] ?? live?.modules[rest] ?? live?.pillars[group.id];
  const ctx = {
    service: group.title,
    module: item.label,
    cover: flag?.cover ?? true,
    health: ragOf(item.rel, live),
    slaHref: `${base}${group.match || "/ams"}/sla`.replace("//", "/"),
  };

  return (
    <div className="rpma-emp">
      <div className="rpma-emp-title">
        <span className="rpma-emp-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <strong>{customerName}</strong>
        <em>Enterprise Management Platform</em>
        <div className="rpma-emp-win">
          <CustomerSwitcher
            customers={customers}
            currentCode={customerCode}
            variant="inline"
            label={customerName}
          />
        </div>
      </div>
      <nav className="rpma-emp-menu" aria-label="Application">
        <SpaLink href={base} className={!rest ? "is-on" : undefined}>
          Customer Ecosystem Home
        </SpaLink>
        <SpaLink href={`${base}/tickets`} className={rest.startsWith("/tickets") ? "is-on" : undefined}>
          Customer Service Overview
        </SpaLink>
      </nav>
      <div className="rpma-emp-ribbon is-opt6" role="toolbar">
        <div className="rpma-emp-titles">
          {RIBBON.map((g) => {
            const on =
              g.match === ""
                ? rest === "" || rest.startsWith("/ams")
                : rest === g.match || rest.startsWith(`${g.match}/`);
            const href = `${base}${g.items[0]?.rel ?? g.match}`;
            const tone = worstRag(g, live);
            return (
              <SpaLink
                key={g.id}
                href={href}
                className={cn("rpma-emp-gtab", on && "is-on")}
                data-rag={tone}
              >
                {g.title}
              </SpaLink>
            );
          })}
        </div>
        <div className="rpma-emp-tools">
          {group.items.map((it) => {
            const Icon = it.icon;
            const href = `${base}${it.rel}`;
            const active = (it.rel === "" && rest === "") || rest === it.rel;
            const rag = ragOf(it.rel, live);
            return (
              <SpaLink
                key={it.rel || "home"}
                href={href}
                className={cn("rpma-emp-tool", active && "is-on")}
                data-rag={rag}
                title={`${it.label} · ${rag}`}
              >
                <span className="rpma-emp-ico">
                  <Icon className="size-5" />
                </span>
                <span>{it.label}</span>
              </SpaLink>
            );
          })}
        </div>
      </div>
      <div className="rpma-emp-work">
        <div className="rpma-emp-body">{children}</div>
        <EmpInspector
          name={customerName}
          service={ctx.service}
          module={ctx.module}
          cover={ctx.cover}
          health={ctx.health}
          lastUtc={lastImportAt}
          slaHref={ctx.slaHref}
        />
      </div>
    </div>
  );
}
