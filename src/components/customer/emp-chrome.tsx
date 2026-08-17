import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Ban,
  Bell,
  ClipboardList,
  Cloud,
  Gauge,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Monitor,
  Package,
  RotateCcw,
  Scale,
  Server,
  Shield,
  ShieldCheck,
  Siren,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";
import { CustomerSwitcher } from "@/components/nav/customer-switcher";
import { useCustomerList } from "@/lib/nav/customer-list-context";
import type { LiveFlag, LiveTone } from "@/lib/data/live-status";
import { cn } from "@/lib/utils";

type RibbonItem = { label: string; rel: string; icon: LucideIcon };
type RibbonGroup = { id: string; title: string; match: string; items: RibbonItem[] };

const RIBBON: RibbonGroup[] = [
  {
    id: "estate",
    title: "Estate",
    match: "",
    items: [
      { label: "Overview", rel: "", icon: LayoutDashboard },
      { label: "Assurance", rel: "/ams", icon: ShieldCheck },
      { label: "Incidents", rel: "/ams/incidents", icon: AlertTriangle },
      { label: "Risks", rel: "/ams/risks", icon: Activity },
      { label: "SLA", rel: "/ams/sla", icon: Gauge },
    ],
  },
  {
    id: "syspro",
    title: "SYSPRO",
    match: "/syspro",
    items: [
      { label: "Overview", rel: "/syspro", icon: LayoutDashboard },
      { label: "FinSight", rel: "/syspro/dtr", icon: Scale },
      { label: "Licence", rel: "/syspro/license", icon: KeyRound },
      { label: "Jobs", rel: "/syspro/jobs", icon: ClipboardList },
      { label: "Health", rel: "/syspro/health", icon: Activity },
    ],
  },
  {
    id: "rmm",
    title: "RMM",
    match: "/rmm",
    items: [
      { label: "Overview", rel: "/rmm", icon: Server },
      { label: "Servers", rel: "/rmm/devices", icon: Server },
      { label: "Workstations", rel: "/rmm/workstations", icon: Monitor },
      { label: "Patch", rel: "/rmm/patch", icon: Package },
      { label: "Alerts", rel: "/rmm/alerts", icon: Bell },
    ],
  },
  {
    id: "backup",
    title: "Backup",
    match: "/cove",
    items: [
      { label: "Overview", rel: "/cove", icon: Cloud },
      { label: "Devices", rel: "/cove/devices", icon: HardDrive },
      { label: "Recovery", rel: "/cove/recovery", icon: RotateCcw },
      { label: "Retention", rel: "/cove/retention", icon: Archive },
      { label: "SLA", rel: "/cove/sla", icon: Gauge },
    ],
  },
  {
    id: "epp",
    title: "EPP",
    match: "/epp",
    items: [
      { label: "Overview", rel: "/epp", icon: Shield },
      { label: "Endpoints", rel: "/epp/endpoints", icon: Monitor },
      { label: "Policies", rel: "/epp/modules", icon: KeyRound },
      { label: "Incidents", rel: "/epp/incidents", icon: Siren },
      { label: "Quarantine", rel: "/epp/quarantine", icon: Ban },
    ],
  },
  {
    id: "tickets",
    title: "Tickets",
    match: "/tickets",
    items: [
      { label: "Overview", rel: "/tickets", icon: Ticket },
      { label: "Open", rel: "/tickets/open", icon: AlertTriangle },
      { label: "Resolved", rel: "/tickets/resolved", icon: ClipboardList },
      { label: "Closed", rel: "/tickets/closed", icon: Archive },
      { label: "SLA", rel: "/tickets/sla", icon: Gauge },
    ],
  },
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
  if (rel.startsWith("/tickets") || rel.startsWith("/ams")) return live?.pillars.tickets?.rag ?? live?.pillars.ams?.rag ?? "Off";
  return live?.pillars.eco?.rag ?? "Off";
}

export function EmpChrome({
  customerCode,
  customerName,
  live,
  children,
}: {
  customerCode: string;
  customerName: string;
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> };
  children: ReactNode;
}) {
  const { customers } = useCustomerList();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/customers/${encodeURIComponent(customerCode)}`;
  const rest = pathname.replace(base, "") || "";

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
        <SpaLink href="/">File</SpaLink>
        <SpaLink href={base} className={!rest ? "is-on" : undefined}>
          Home
        </SpaLink>
        <SpaLink href={`${base}/tickets`} className={rest.startsWith("/tickets") ? "is-on" : undefined}>
          Customer Service
        </SpaLink>
        <SpaLink href={`${base}/ams/sla`}>View</SpaLink>
      </nav>
      <div className="rpma-emp-ribbon" role="toolbar">
        {RIBBON.map((g) => {
          const on =
            g.match === ""
              ? rest === "" || rest.startsWith("/ams")
              : rest === g.match || rest.startsWith(`${g.match}/`);
          return (
            <div key={g.id} className={cn("rpma-emp-group", on && "is-on")}>
              <div className="rpma-emp-tools">
                {g.items.map((it) => {
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
                        <Icon className="size-4" />
                      </span>
                      <span>{it.label}</span>
                    </SpaLink>
                  );
                })}
              </div>
              <div className="rpma-emp-gtitle">{g.title}</div>
            </div>
          );
        })}
      </div>
      <div className="rpma-emp-body">{children}</div>
    </div>
  );
}
