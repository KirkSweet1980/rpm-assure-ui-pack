import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";
import { CUSTOMER_PILLARS, ECOSYSTEM_MODULES } from "@/components/nav/customer-modules-panel";
import type { LiveFlag, LiveTone } from "@/lib/data/live-status";
import { EmpInspector } from "@/components/chrome/emp-inspector";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type RibbonItem = { label: string; full: string; rel: string; icon: LucideIcon };
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

const ALWAYS_ON = new Set(["", "/ams", "/ams/sla", "/ams/incidents", "/ams/risks", "/tickets", "/tickets/open", "/tickets/resolved", "/tickets/closed", "/tickets/sla"]);

const RIBBON: RibbonGroup[] = [
  {
    id: "estate",
    title: GROUP_TITLE.estate,
    match: "",
    items: ECOSYSTEM_MODULES.map((m) => ({
      label: shortLabel(m.label),
      full: m.label,
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
      full: m.label,
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
  if (/\/sla$/.test(it.rel) || /\/(syspro|rmm|cove|epp|csp|tickets)$/.test(it.rel)) {
    const p = it.rel.split("/")[1];
    if (p && live?.pillars[p]?.cover) return true;
  }
  const flag = live?.modules[it.rel];
  if (flag) return flag.cover;
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

  const [open, setOpen] = useState<string>(group.id);
  const ready = Boolean(live);
  const tree = useMemo(() => {
    return RIBBON.filter((g) => g.id === group.id || pillarCovered(g.id, live)).map((g) => ({
      ...g,
      items: g.items.filter((it) => itemVisible(it, rest, live)),
    }));
  }, [live, group.id, rest]);

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
      </div>
      <div className="rpma-emp-ribbon is-opt6" role="toolbar">
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
              >
                {g.title}
              </SpaLink>
            );
          })}
        </div>
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
                <span className="rpma-emp-ico">
                  <Icon className="size-5" />
                </span>
                <span>{it.label}</span>
              </SpaLink>
            );
          })}
        </div>
      </div>
      <div className="rpma-emp-work is-tree">
        <aside className="rpma-ttree-nav rpma-emp-tree" aria-label="Live modules">
          <h2>Live tree</h2>
          {!ready ? <p className="rpma-tree-wait">Loading cover…</p> : null}
          <ul>
            {tree.map((g) => {
              const expanded = open === g.id || g.id === group.id;
              return (
                <li key={g.id} className="rpma-tree-group">
                  <button
                    type="button"
                    className={cn("rpma-tree-ghead", g.id === group.id && "is-on")}
                    onClick={() => setOpen(expanded && g.id !== group.id ? group.id : g.id)}
                  >
                    {g.title}
                    <em>{g.items.length}</em>
                  </button>
                  {expanded
                    ? g.items.map((it) => {
                        const href = `${base}${it.rel}`;
                        const active = (it.rel === "" && (rest === "" || rest === "/ams")) || rest === it.rel;
                        const rag = ragOf(it.rel, live);
                        const hint = live?.modules[it.rel]?.hint;
                        return (
                          <SpaLink
                            key={it.rel || "home"}
                            href={href}
                            className={cn("rpma-ttree-item", active && "is-on")}
                            data-rag={rag}
                          >
                            <i data-tone={rag.toLowerCase()} />
                            <span>
                              <strong>{it.full}</strong>
                              {hint ? <em>{hint}</em> : null}
                            </span>
                          </SpaLink>
                        );
                      })
                    : null}
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="rpma-emp-body">{children}</div>
        <EmpInspector
          name={customerName}
          customerCode={customerCode}
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
