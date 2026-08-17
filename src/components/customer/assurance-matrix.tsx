import { useMemo, useState } from "react";
import {
  Building2,
  Cloud,
  Monitor,
  Server,
  Shield,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { CUSTOMER_PILLARS } from "@/components/nav/customer-modules-panel";
import { coverFromDetail, isPillarCovered, type PillarId } from "@/lib/data/cover";
import { customerLiveStatus, type LiveTone } from "@/lib/data/live-status";
import { ticketStats } from "@/lib/data/ticket-feed";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { cn, formatSastDateTime } from "@/lib/utils";

type RowId = "syspro" | "rmm" | "cove" | "epp" | "tickets";

const ROWS: {
  id: RowId;
  pillar: PillarId;
  name: string;
  sub: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { id: "syspro", pillar: "syspro", name: "SYSPRO", sub: "ERP Platform", href: "/syspro", icon: Server },
  { id: "rmm", pillar: "rmm", name: "RMM", sub: "Remote Monitoring & Management", href: "/rmm", icon: Monitor },
  { id: "cove", pillar: "cove", name: "Cloud Backup", sub: "Backup & Disaster Recovery", href: "/cove", icon: Cloud },
  { id: "epp", pillar: "epp", name: "EPP", sub: "Endpoint Protection", href: "/epp", icon: Shield },
  { id: "tickets", pillar: "tickets", name: "Tickets", sub: "Service Desk", href: "/tickets", icon: Ticket },
];

function dash(v: string | null | undefined) {
  return v && v.trim() ? v : "—";
}

function healthLabel(rag: LiveTone, on: boolean): { text: string; cls: string } {
  if (!on) return { text: "—", cls: "text-muted" };
  if (rag === "Green") return { text: "Healthy", cls: "text-emerald-400" };
  if (rag === "Amber") return { text: "Watch", cls: "text-amber-300" };
  if (rag === "Red") return { text: "Miss", cls: "text-red-400" };
  return { text: "—", cls: "text-muted" };
}

export function AssuranceMatrix({ data }: { data: CustomerDetailPayload }) {
  const { customer } = data;
  const cover = coverFromDetail(data);
  const live = customerLiveStatus(customer.customerCode, customer, cover, data);
  const tix = ticketStats(data.incidents);
  const base = `/customers/${encodeURIComponent(customer.customerCode)}`;
  const [sel, setSel] = useState<RowId>("syspro");

  const last = [
    customer.lastImportAt,
    customer.pulsewayLastImportAt,
    customer.coveLastImportAt,
    customer.eppLastImportAt,
  ].reduce<string | null>((best, v) => {
    if (!v) return best;
    if (!best) return v;
    return new Date(v).getTime() > new Date(best).getTime() ? v : best;
  }, null);

  const nextRefresh = last
    ? new Date(new Date(last).getTime() + 15 * 60 * 1000).toISOString()
    : null;

  const jobErr = Math.max(0, Number(customer.sysproJobErrorCount) || 0);
  const rmmAlerts = Math.max(0, Number(data.rmm?.summary?.criticalAlerts ?? customer.pulsewayCriticalAlerts) || 0);
  const inst = Math.max(0, Number(data.rmm?.summary?.patchInstalled ?? customer.patchInstalled) || 0);
  const miss = Math.max(0, Number(data.rmm?.summary?.patchMissing ?? customer.patchMissing) || 0);
  const patchPct = inst + miss > 0 ? Math.round((inst / (inst + miss)) * 100) : null;
  const coveOk = Number(data.cove?.summary?.okCount ?? customer.coveOkDeviceCount) || 0;
  const coveFail = Number(data.cove?.summary?.failedCount ?? customer.coveFailedDeviceCount) || 0;
  const covePct = coveOk + coveFail > 0 ? ((coveOk / (coveOk + coveFail)) * 100).toFixed(1) : null;
  const companies =
    data.sysproVersion?.companyCount ?? data.license?.companyCount ?? null;
  const version =
    data.sysproVersion?.productVersion ?? data.license?.productVersion ?? null;

  const rows = useMemo(() => {
    return ROWS.map((r) => {
      const on = r.id === "tickets" ? true : isPillarCovered(cover, r.pillar);
      const rag = live.pillars[r.pillar]?.rag ?? "Off";
      const h = healthLabel(rag, on);
      let jobs = "—";
      if (r.id === "syspro" && on) jobs = `${jobErr} err`;
      if (r.id === "rmm" && on) jobs = `${rmmAlerts} err`;
      if (r.id === "cove" && on) jobs = `${coveFail} err`;
      if (r.id === "epp" && on) jobs = "0 err";
      const patch =
        r.id === "rmm" && on && patchPct != null
          ? `${patchPct}%`
          : r.id === "epp" && on
            ? "Up to date"
            : "—";
      const backup = r.id === "cove" && on && covePct != null ? `${covePct}%` : "—";
      const open = tix.open;
      return { ...r, on, rag, health: h, jobs, patch, backup, open };
    });
  }, [cover, live, jobErr, rmmAlerts, coveFail, covePct, patchPct, tix.open]);

  const active = rows.find((r) => r.id === sel) ?? rows[0];

  return (
    <div className="rpma-amx">
      <div className="rpma-amx-main">
        <header className="rpma-amx-head">
          <h2>{customer.displayName}</h2>
          <p>Assurance matrix drill-down</p>
        </header>
        <nav className="rpma-amx-chips" aria-label="Services">
          {rows.map((r) => (
            <SpaLink
              key={r.id}
              href={`${base}${r.href}`}
              className={cn("rpma-amx-chip", sel === r.id && "is-on")}
              onClick={() => setSel(r.id)}
            >
              {r.name}
            </SpaLink>
          ))}
        </nav>
        <div className="rpma-amx-table-wrap">
          <table className="rpma-amx-table">
            <thead>
              <tr>
                <th>Cover</th>
                <th>Health</th>
                <th>Jobs</th>
                <th className="hide-sm">Patch</th>
                <th className="hide-sm">Backup</th>
                <th>Tickets</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const Icon = r.icon;
                return (
                  <tr
                    key={r.id}
                    className={cn(sel === r.id && "is-on")}
                    onClick={() => setSel(r.id)}
                  >
                    <td>
                      <SpaLink href={`${base}${r.href}`} className="rpma-amx-svc">
                        <span className="rpma-amx-ico">
                          <Icon className="size-3.5" />
                        </span>
                        <span>
                          <strong>{r.name}</strong>
                          <em>{r.sub}</em>
                        </span>
                      </SpaLink>
                      <div className="rpma-amx-fly" role="menu">
                        {(CUSTOMER_PILLARS.find((p) => p.id === r.id)?.modules ?? [])
                          .filter((m) => m.path !== r.href)
                          .slice(0, 8)
                          .map((m) => (
                            <SpaLink key={m.path} href={`${base}${m.path}`} className="rpma-amx-fly-a">
                              {m.label}
                            </SpaLink>
                          ))}
                      </div>
                    </td>
                    <td>
                      <span className={cn("rpma-amx-pill", r.on ? "is-cover" : "is-off")}>
                        {r.on ? "Cover" : "—"}
                      </span>
                    </td>
                    <td className={r.health.cls}>
                      {r.on && r.health.text !== "—" ? (
                        <span className="rpma-amx-dot" data-rag={r.rag} />
                      ) : null}
                      {r.health.text}
                    </td>
                    <td>{r.jobs}</td>
                    <td className="hide-sm">{r.patch}</td>
                    <td className="hide-sm">{r.backup}</td>
                    <td>
                      <span className={cn(r.open > 0 && r.id === "tickets" && "text-amber-300")}>
                        {r.id === "tickets" || r.open > 0 ? `${r.open} open` : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="rpma-amx-side" aria-label="Selected service">
        <div className="rpma-amx-card">
          <span className="rpma-amx-ico lg">
            <Building2 className="size-5" />
          </span>
          <div>
            <strong>{customer.displayName}</strong>
            <em>
              {active.name}
              {active.id === "syspro" && version ? ` · Version ${version}` : ""}
            </em>
          </div>
        </div>
        <dl className="rpma-amx-dl">
          <div>
            <dt>Companies</dt>
            <dd>{companies != null && companies > 0 ? companies : "—"}</dd>
          </div>
          <div>
            <dt>SLA cover</dt>
            <dd className={active.on ? "text-emerald-400" : "text-muted"}>
              {active.on ? "Covered" : "Out of scope"}
            </dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd className={active.health.cls}>{active.health.text}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{dash(formatSastDateTime(last))}</dd>
          </div>
          <div>
            <dt>Next refresh</dt>
            <dd>{dash(formatSastDateTime(nextRefresh))}</dd>
          </div>
        </dl>
        <SpaLink href={`${base}${active.href}/sla`} className="rpma-amx-sla">
          View SLA history
        </SpaLink>
      </aside>
    </div>
  );
}
