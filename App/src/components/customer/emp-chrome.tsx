import type { ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  Ban,
  Bell,
  Building2,
  ClipboardList,
  Cloud,
  FileText,
  Gauge,
  HardDrive,
  Home,
  KeyRound,
  LayoutDashboard,
  Monitor,
  Package,
  Plus,
  RotateCcw,
  Scale,
  Server,
  Shield,
  ShieldCheck,
  Siren,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";
import { CustomerSwitcher } from "@/components/nav/customer-switcher";
import { useCustomerList } from "@/lib/nav/customer-list-context";
import { cn } from "@/lib/utils";

type RibbonItem = { label: string; path: string; icon: LucideIcon; accent?: boolean };
type RibbonGroup = { id: string; title: string; items: RibbonItem[] };

function groups(base: string): RibbonGroup[] {
  return [
    {
      id: "estate",
      title: "Estate",
      items: [
        { label: "Dashboard", path: base, icon: LayoutDashboard },
        { label: "Organizations", path: `${base}/ams`, icon: Building2 },
        { label: "Sites", path: `${base}/rmm`, icon: Home },
        { label: "Devices", path: `${base}/rmm/devices`, icon: Server },
        { label: "Users", path: `${base}/syspro/operators`, icon: Users },
      ],
    },
    {
      id: "syspro",
      title: "SYSPRO",
      items: [
        { label: "Financials", path: `${base}/syspro/dtr`, icon: Scale },
        { label: "Sales", path: `${base}/syspro`, icon: ClipboardList },
        { label: "Purchasing", path: `${base}/syspro/jobs`, icon: Package },
        { label: "Inventory", path: `${base}/syspro/health`, icon: HardDrive },
        { label: "Reporting", path: `${base}/syspro/sla`, icon: FileText },
      ],
    },
    {
      id: "rmm",
      title: "RMM",
      items: [
        { label: "Devices", path: `${base}/rmm/devices`, icon: Monitor },
        { label: "Alerts", path: `${base}/rmm/alerts`, icon: Bell },
        { label: "Policies", path: `${base}/rmm/patch`, icon: ShieldCheck },
        { label: "Tasks", path: `${base}/rmm`, icon: ClipboardList },
        { label: "Remote Access", path: `${base}/rmm/events`, icon: Server },
      ],
    },
    {
      id: "backup",
      title: "Backup",
      items: [
        { label: "Jobs", path: `${base}/cove`, icon: Cloud },
        { label: "Vaults", path: `${base}/cove/devices`, icon: HardDrive },
        { label: "Policies", path: `${base}/cove/retention`, icon: Archive },
        { label: "Recovery", path: `${base}/cove/recovery`, icon: RotateCcw },
        { label: "Reports", path: `${base}/cove/sla`, icon: FileText },
      ],
    },
    {
      id: "epp",
      title: "EPP",
      items: [
        { label: "Endpoints", path: `${base}/epp/endpoints`, icon: Monitor },
        { label: "Threats", path: `${base}/epp/incidents`, icon: Siren },
        { label: "Quarantine", path: `${base}/epp/quarantine`, icon: Ban },
        { label: "Policies", path: `${base}/epp/modules`, icon: KeyRound },
        { label: "Policy Scan", path: `${base}/epp`, icon: Shield },
      ],
    },
    {
      id: "tickets",
      title: "Tickets",
      items: [
        { label: "All Tickets", path: `${base}/tickets`, icon: Ticket },
        { label: "Open", path: `${base}/tickets/open`, icon: AlertTriangle },
        { label: "Unassigned", path: `${base}/tickets/resolved`, icon: ClipboardList },
        { label: "SLA", path: `${base}/tickets/sla`, icon: Gauge },
        { label: "New Ticket", path: `${base}/tickets`, icon: Plus, accent: true },
      ],
    },
  ];
}

export function EmpChrome({
  customerCode,
  customerName,
  children,
}: {
  customerCode: string;
  customerName: string;
  children: ReactNode;
}) {
  const { customers } = useCustomerList();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/customers/${encodeURIComponent(customerCode)}`;
  const ribbon = groups(base);
  const rest = pathname.replace(base, "") || "/";

  function groupOn(g: RibbonGroup) {
    if (g.id === "estate") return rest === "/" || rest === "";
    if (g.id === "syspro") return rest.startsWith("/syspro") || rest.startsWith("/ams");
    if (g.id === "rmm") return rest.startsWith("/rmm");
    if (g.id === "backup") return rest.startsWith("/cove");
    if (g.id === "epp") return rest.startsWith("/epp");
    if (g.id === "tickets") return rest.startsWith("/tickets");
    return false;
  }

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
        <SpaLink href={base} className={rest === "/" || rest === "" ? "is-on" : undefined}>
          Home
        </SpaLink>
        <SpaLink
          href={`${base}/tickets`}
          className={rest.startsWith("/tickets") ? "is-on" : undefined}
        >
          Customer Service
        </SpaLink>
        <SpaLink href={`${base}/ams/sla`}>View</SpaLink>
      </nav>
      <div className="rpma-emp-ribbon" role="toolbar">
        {ribbon.map((g) => (
          <div key={g.id} className={cn("rpma-emp-group", groupOn(g) && "is-on")}>
            <div className="rpma-emp-tools">
              {g.items.map((it) => {
                const Icon = it.icon;
                const on = pathname === it.path || pathname === `${it.path}/`;
                return (
                  <SpaLink
                    key={it.label}
                    href={it.path}
                    className={cn("rpma-emp-tool", on && "is-on", it.accent && "is-accent")}
                    title={it.label}
                  >
                    <Icon className="size-4" />
                    <span>{it.label}</span>
                  </SpaLink>
                );
              })}
            </div>
            <div className="rpma-emp-gtitle">{g.title}</div>
          </div>
        ))}
      </div>
      <div className="rpma-emp-body">{children}</div>
    </div>
  );
}
