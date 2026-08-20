import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { CUSTOMER_PILLARS, ECOSYSTEM_MODULES } from "@/components/nav/customer-modules-panel";
import type { LiveFlag, LiveTone } from "@/lib/data/live-status";
import { RagLamps } from "@/components/chrome/rag-lamps";
import { StatusRobot } from "@/components/ui/status-robot";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type RibbonItem = { label: string; full: string; rel: string; icon: LucideIcon; color: string };
type RibbonGroup = { id: string; title: string; match: string; color: string; icon: LucideIcon; items: RibbonItem[] };

const GROUP_TITLE: Record<string, string> = {
  estate: "Customer Eco-System",
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
  "Tenant Health": "Tenant Health",
  "MFA Registration": "MFA Registration",
  "Licensed Users": "Licensed Users",
  "License Stats": "License Stats",
};

function shortLabel(label: string) {
  return SHORT[label] ?? label;
}

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
  if (m) {
    if (!m.cover) return "Off";
    if (m.rag && m.rag !== "Off") return m.rag;
    return "Green";
  }
  if (rel.startsWith("/syspro")) return live?.pillars.syspro?.cover ? (live.pillars.syspro.rag === "Off" ? "Green" : live.pillars.syspro.rag) : "Off";
  if (rel.startsWith("/rmm")) return live?.pillars.rmm?.cover ? (live.pillars.rmm.rag === "Off" ? "Green" : live.pillars.rmm.rag) : "Off";
  if (rel.startsWith("/cove")) return live?.pillars.cove?.cover ? (live.pillars.cove.rag === "Off" ? "Green" : live.pillars.cove.rag) : "Off";
  if (rel.startsWith("/epp")) return live?.pillars.epp?.cover ? (live.pillars.epp.rag === "Off" ? "Green" : live.pillars.epp.rag) : "Off";
  if (rel.startsWith("/csp")) return live?.pillars.csp?.cover ? (live.pillars.csp.rag === "Off" ? "Green" : live.pillars.csp.rag) : "Off";
  if (rel.startsWith("/tickets") || rel.startsWith("/ams")) {
    const p = live?.pillars.tickets ?? live?.pillars.ams;
    if (p?.cover) return p.rag === "Off" ? "Green" : p.rag;
    return "Off";
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

function toneRank(t: LiveTone): number {
  if (t === "Red") return 0;
  if (t === "Amber") return 1;
  if (t === "Green") return 2;
  return 3;
}

/** Module that is driving this service's RAG — used so the click lands on the alert. */
function alertItem(
  g: RibbonGroup,
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> },
): RibbonItem {
  return [...g.items].sort((a, b) => toneRank(ragOf(a.rel, live)) - toneRank(ragOf(b.rel, live)))[0] ?? g.items[0];
}

function alertHref(
  g: RibbonGroup,
  live: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> } | undefined,
  base: string,
  tone: LiveTone,
): string {
  if (tone !== "Red" && tone !== "Amber") {
    return `${base}${g.items[0]?.rel ?? g.match}`;
  }
  if (g.id !== "estate") {
    return `${base}${alertItem(g, live).rel}`;
  }
  const services = ALWAYS_SHOW_SERVICES.filter((s) => s.id !== "estate");
  const topSvc = [...services].sort((a, b) => {
    const ta = pillarCovered(a.id, live) ? worstRag(a, live) : "Off";
    const tb = pillarCovered(b.id, live) ? worstRag(b, live) : "Off";
    return toneRank(ta) - toneRank(tb);
  })[0];
  const svcTone = topSvc && pillarCovered(topSvc.id, live) ? worstRag(topSvc, live) : "Off";
  const ecoMods = g.items.filter((it) => it.rel);
  const topEco = [...ecoMods].sort((a, b) => toneRank(ragOf(a.rel, live)) - toneRank(ragOf(b.rel, live)))[0];
  const ecoTone = topEco ? ragOf(topEco.rel, live) : "Off";
  if ((svcTone === "Red" || svcTone === "Amber") && toneRank(svcTone) <= toneRank(ecoTone)) {
    return `${base}${alertItem(topSvc, live).rel}`;
  }
  if (topEco && (ecoTone === "Red" || ecoTone === "Amber")) {
    return `${base}${topEco.rel}`;
  }
  return `${base}${g.items[0]?.rel ?? ""}`;
}

function pillarCovered(
  id: string,
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> },
) {
  if (id === "estate" || id === "tickets") return true;
  return live?.pillars[id]?.cover === true;
}

/** Every tenant sees the same RPM Services list. Cover only changes the chip — never hide a service. */
const ALWAYS_SHOW_SERVICES = RIBBON;

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
            {ALWAYS_SHOW_SERVICES.map((g) => {
              const on =
                g.match === ""
                  ? rest === "" || rest.startsWith("/ams")
                  : rest === g.match || rest.startsWith(`${g.match}/`);
              const covered = pillarCovered(g.id, live);
              const tone = covered ? worstRag(g, live) : "Off";
              const href = alertHref(g, live, base, covered ? tone : "Off");
              return (
                <SpaLink
                  key={g.id}
                  href={href}
                  className={cn("rpma-emp-gtab", on && "is-on", !covered && "is-nocover")}
                  data-rag={tone}
                  title={`${g.title} · ${covered ? tone : "No Cover"}`}
                >
                  <g.icon className="rpma-emp-gtab-ico" style={{ color: g.color }} aria-hidden />
                  <span className="rpma-emp-gtab-name">{g.title}</span>
                  {covered ? <RagLamps tone={tone} /> : <em className="rpma-emp-nocover">No Cover</em>}
                </SpaLink>
              );
            })}
          </div>
          <p className="rpma-side-h">RPM Service Modules</p>
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
                  className={cn("rpma-emp-tool", active && "is-on", rag === "Off" && "is-nocover")}
                  data-rag={rag}
                  title={`${it.label} · ${rag === "Off" ? "No Cover" : rag}`}
                >
                  <span className="rpma-emp-ico" style={{ color: it.color }}>
                    <Icon className="size-4" />
                  </span>
                  <span className="rpma-emp-tool-name">{it.label}</span>
                  {rag === "Off" ? (
                    <em className="rpma-emp-nocover">No Cover</em>
                  ) : (
                    <StatusRobot rag={rag} title={it.label} size={14} />
                  )}
                </SpaLink>
              );
            })}
          </div>
        </nav>
        <div className="rpma-emp-work">
          <section className="rpma-win is-fill rpma-work-window" data-rag={ctx.health}>
            <header className="rpma-win-head">
              <h2>{item.label}</h2>
              <p>{group.title}</p>
            </header>
            <div className="rpma-emp-body rpma-work-scroll">{children}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
