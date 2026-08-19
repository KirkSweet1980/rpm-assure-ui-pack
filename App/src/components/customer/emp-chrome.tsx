import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { CUSTOMER_PILLARS, ECOSYSTEM_MODULES } from "@/components/nav/customer-modules-panel";
import type { LiveFlag, LiveTone } from "@/lib/data/live-status";
import { RagLamps } from "@/components/chrome/rag-lamps";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type RibbonItem = { label: string; full: string; rel: string; icon: LucideIcon; color: string };
type RibbonGroup = { id: string; title: string; match: string; color: string; icon: LucideIcon; items: RibbonItem[] };

const GROUP_TITLE: Record<string, string> = {
  estate: "Customer Eco System",
  syspro: "SYSPRO Landscape",
  rmm: "RMM Management",
  cove: "RPM Cloud Backup",
  epp: "RPM End Point Protection",
  csp: "Microsoft 365",
  tickets: "RPM Service Desk",
};

const SHORT: Record<string, string> = {
  "Tenant Overview": "Overview",
  "Customer Assurance": "Customer Assurance",
  "Customer Incidents": "Incidents",
  "Customer Risks": "Risks",
  "Customer SLA": "SLA",
  "Job Logging": "Jobs",
  "FinSight": "Finance Modules",
  "Finance Modules": "Finance Modules",
  "Patch Compliance": "Patch Compliance",
  "Server Alerts": "Server Alerts",
  "Disk IOPS": "Disk Performance",
  "Disk Performance": "Disk Performance",
  "Event Logs": "Windows Events",
  "Windows Events": "Windows Events",
  "Alerts": "Server Alerts",
  "Service SLA": "SLA",
  "Backup Devices": "Backup Agents",
  "Backup Agents": "Backup Agents",
  "Recovery": "Recovery Testing",
  "Recovery Testing": "Recovery Testing",
  "Retention": "Backup Retention",
  "Backup Retention": "Backup Retention",
  "Endpoints": "EndPoint Agents",
  "EndPoint Agents": "EndPoint Agents",
  "Policies": "Policies & Modules",
  "Policies & Modules": "Policies & Modules",
  "Security Incidents": "Incidents",
  "Open Tickets": "Open Tickets",
  "Resolved Tickets": "Resolved Tickets",
  "Closed Tickets": "Closed Tickets",
  "Secure Score": "Score",
  "Global Admins": "Admins",
};

function shortLabel(label: string) {
  return SHORT[label] ?? label;
}

const ALWAYS_ON = new Set(["", "/ams", "/ams/sla", "/ams/incidents", "/ams/risks", "/tickets", "/tickets/open", "/tickets/resolved", "/tickets/closed", "/tickets/sla"]);

const RIBBON: RibbonGroup[] = [
  {
    id: "estate",
    title: GROUP_TITLE.estate,
    match: "",
    color: "#0d9488",
    icon: Building2,
    items: ECOSYSTEM_MODULES.map((m) => ({
      label: shortLabel(m.label),
      full: m.label,
      rel: m.path,
      icon: m.icon,
      color: m.color,
    })),
  },
  ...CUSTOMER_PILLARS.map((p) => ({
    id: p.id,
    title: GROUP_TITLE[p.id] ?? p.title,
    match: p.overview,
    color: p.color,
    icon: p.icon,
    items: p.modules.map((m) => ({
      label: shortLabel(m.label),
      full: m.label,
      rel: m.path,
      icon: m.icon,
      color: m.color,
    })),
  })),
];

function ragOf(
  rel: string,
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> },
): LiveTone {
  const m = live?.modules[rel];
  if (m?.rag && m.rag !== "Off") return m.rag;
  if (m?.cover) return "Green";
  if (rel.startsWith("/syspro")) return live?.pillars.syspro?.cover ? (live.pillars.syspro.rag === "Off" ? "Green" : live.pillars.syspro.rag) : "Off";
  if (rel.startsWith("/rmm")) return live?.pillars.rmm?.cover ? (live.pillars.rmm.rag === "Off" ? "Green" : live.pillars.rmm.rag) : "Off";
  if (rel.startsWith("/cove")) return live?.pillars.cove?.cover ? (live.pillars.cove.rag === "Off" ? "Green" : live.pillars.cove.rag) : "Off";
  if (rel.startsWith("/epp")) return live?.pillars.epp?.cover ? (live.pillars.epp.rag === "Off" ? "Green" : live.pillars.epp.rag) : "Off";
  if (rel.startsWith("/csp")) return live?.pillars.csp?.cover ? (live.pillars.csp.rag === "Off" ? "Green" : live.pillars.csp.rag) : "Off";
  if (rel.startsWith("/tickets") || rel.startsWith("/ams")) {
    const p = live?.pillars.tickets ?? live?.pillars.ams;
    if (p?.cover) return p.rag === "Off" ? "Green" : p.rag;
    return "Green";
  }
  return live?.pillars.eco?.rag && live.pillars.eco.rag !== "Off" ? live.pillars.eco.rag : "Green";
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

function pillarCovered(
  id: string,
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> },
) {
  if (id === "estate" || id === "tickets") return true;
  return live?.pillars[id]?.cover === true;
}

function itemVisible(
  it: RibbonItem,
  rest: string,
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> },
) {
  if (ALWAYS_ON.has(it.rel)) return true;
  if ((it.rel === "" && (rest === "" || rest === "/ams")) || rest === it.rel) return true;
  const p = it.rel.replace(/^\//, "").split("/")[0];
  if (p && live?.pillars[p]?.cover) return true;
  if (it.rel.startsWith("/ams") || it.rel === "") return true;
  const flag = live?.modules[it.rel];
  if (flag) return Boolean(flag.cover);
  return ragOf(it.rel, live) !== "Off";
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
    <div className="rpma-emp is-side">
      <div className="rpma-emp-title">
        <span className="rpma-emp-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <strong>{customerName}</strong>
        <em>Enterprise Management Platform</em>
      </div>
      <div className="rpma-emp-bodyrow">
        <nav className="rpma-side" aria-label="Tenant navigation">
          <p className="rpma-side-h">RPM Services</p>
          <div className="rpma-emp-titles">
            {RIBBON.filter((g) => g.id === "estate" || g.id === group.id || pillarCovered(g.id, live)).map((g) => {
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
                  title={`${g.title} · ${tone}`}
                >
                  <g.icon className="rpma-emp-gtab-ico" style={{ color: g.color }} aria-hidden />
                  <span className="rpma-emp-gtab-name">{g.title}</span>
                  <RagLamps tone={tone} />
                </SpaLink>
              );
            })}
          </div>
          <p className="rpma-side-h">RPM Service Modules</p>
          <div className="rpma-emp-tools">
            {group.items.filter((it) => itemVisible(it, rest, live)).map((it) => {
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
                  <span className="rpma-emp-ico" style={{ color: it.color }}>
                    <Icon className="size-5" />
                  </span>
                  <span>{it.label}</span>
                </SpaLink>
              );
            })}
          </div>
        </nav>
        <div className="rpma-emp-work">
          <div className="rpma-emp-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
