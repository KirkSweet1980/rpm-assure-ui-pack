import { SpaLink } from "@/components/nav/spa-link";
import { CUSTOMER_PILLARS } from "@/components/nav/customer-modules-panel";
import { CoverTag } from "@/components/ui/status-robot";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { coverFromDetail, isPillarCovered, type PillarId } from "@/lib/data/cover";
import { customerLiveStatus } from "@/lib/data/live-status";
import { ticketStats } from "@/lib/data/ticket-feed";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { cn, formatSastDateTime } from "@/lib/utils";

const PILLAR_SUB: Record<string, string> = {
  syspro: "SYSPRO Landscape",
  rmm: "RMM Management",
  cove: "RPM Cloud Backup",
  epp: "RPM End Point Protection",
  csp: "Microsoft 365",
  tickets: "RPM Service Desk",
};

function kpisFor(pillar: PillarId, data: CustomerDetailPayload) {
  const c = data.customer;
  const tix = ticketStats(data.incidents ?? []);
  if (pillar === "syspro") {
    return [
      { label: "Operators", value: c.operatorCount || data.operators?.length || 0 },
      { label: "Active users", value: c.activeUserCount || 0 },
      { label: "Job errors", value: c.sysproJobErrorCount || 0, warn: (c.sysproJobErrorCount || 0) > 0 },
      { label: "FinSight OOB", value: c.sysproDtrVarianceLines || 0, warn: (c.sysproDtrVarianceLines || 0) > 0 },
    ];
  }
  if (pillar === "rmm") {
    const s = data.rmm?.summary;
    const online = s?.serverOnline ?? c.pulsewayServerOnline ?? 0;
    const offline = s?.serverOffline ?? c.pulsewayServerOffline ?? 0;
    return [
      { label: "Servers online", value: online },
      { label: "Servers offline", value: offline, warn: offline > 0 },
      { label: "Critical alerts", value: s?.criticalAlerts ?? 0, warn: (s?.criticalAlerts ?? 0) > 0 },
      { label: "IOPS volumes", value: data.rmm?.agentIops?.length ?? 0 },
    ];
  }
  if (pillar === "cove") {
    const n = c.coveDeviceCount ?? data.cove?.devices?.length ?? 0;
    const fail = (c.coveFailedDeviceCount ?? 0) + (c.coveStaleDeviceCount ?? 0);
    return [
      { label: "Devices", value: n },
      { label: "Healthy", value: c.coveOkDeviceCount ?? Math.max(0, n - fail) },
      { label: "Failed / stale", value: fail, warn: fail > 0 },
      { label: "Tickets", value: tix.open, warn: tix.open > 0 },
    ];
  }
  if (pillar === "epp") {
    const devices = data.epp?.devices ?? [];
    const infected = devices.filter((d) => d.infected || d.malwareDetected).length;
    return [
      { label: "Endpoints", value: data.epp?.summary?.deviceCount ?? devices.length },
      { label: "Infected", value: infected, warn: infected > 0 },
      { label: "Incidents", value: data.epp?.incidents?.length ?? 0 },
      { label: "Quarantine", value: data.epp?.quarantine?.length ?? 0 },
    ];
  }
  if (pillar === "csp") {
    const p = data.csp?.posture;
    return [
      { label: "Users", value: c.cspUserCount ?? data.csp?.users?.length ?? 0 },
      { label: "Licences", value: c.cspLicenseSkuCount ?? data.csp?.licenses?.length ?? 0 },
      { label: "Secure Score", value: p?.secureScorePct != null ? `${Math.round(p.secureScorePct)}%` : "—" },
      { label: "MFA", value: p?.mfaRegisteredPct != null ? `${p.mfaRegisteredPct}%` : "—" },
    ];
  }
  return [
    { label: "Open", value: tix.open, warn: tix.open > 0 },
    { label: "Resolved", value: tix.resolved },
    { label: "Closed", value: tix.closed },
    { label: "SLA", value: tix.sla.overallPct != null ? `${tix.sla.overallPct}%` : "—", warn: (tix.sla.overallPct ?? 100) < 90 },
  ];
}

export function ServiceModuleMatrix({
  data,
  pillar,
}: {
  data: CustomerDetailPayload;
  pillar: PillarId;
}) {
  const { customer } = data;
  const cover = coverFromDetail(data);
  const live = customerLiveStatus(customer.customerCode, customer, cover, data);
  const on = isPillarCovered(cover, pillar);
  const rag = live.pillars[pillar]?.rag ?? (on ? "Green" : "Off");
  const def = CUSTOMER_PILLARS.find((p) => p.id === pillar);
  const base = `/customers/${encodeURIComponent(customer.customerCode)}`;
  const mods = def?.modules ?? [];
  const kpis = kpisFor(pillar, data);
  const last =
    pillar === "syspro"
      ? customer.lastImportAt
      : pillar === "rmm"
        ? customer.pulsewayLastImportAt
        : pillar === "cove"
          ? customer.coveLastImportAt
          : pillar === "epp"
            ? customer.eppLastImportAt
            : pillar === "csp"
              ? customer.cspLastImportAt
              : customer.lastImportAt;

  return (
    <div className="rpma-exco">
      <header className="rpma-eco-head">
        <div className="rpma-eco-head-row">
          <RagBadge rag={on ? rag : "Off"} title={live.pillars[pillar]?.hint} />
          <div>
            <h2>{PILLAR_SUB[pillar] ?? def?.title}</h2>
            <p>
              {customer.displayName} · {on ? "Cover" : "No Cover"} · last collect{" "}
              {formatSastDateTime(last)}
            </p>
          </div>
          <CoverTag on={on} />
        </div>
        <div className="rpma-eco-kpis">
          {kpis.map((k) => (
            <div key={k.label} className={cn("rpma-eco-kpi", k.warn && "is-warn")}>
              <em>{k.label}</em>
              <strong>{k.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <div className="rpma-eco-svcs" style={{ marginTop: 10 }}>
        {mods.map((m) => {
          const flag = live.modules[m.path];
          const hr = flag?.rag ?? rag;
          const href = `${base}${m.path}`;
          return (
            <SpaLink
              key={m.path}
              href={href}
              className={cn("rpma-eco-svc", on ? "is-on" : "is-off")}
            >
              <strong>{m.label}</strong>
              <span>
                {on ? "Cover" : "No Cover"}
                {on && flag?.hint ? ` · ${flag.hint}` : ""}
                {on ? ` · ${hr === "Green" ? "Healthy" : hr === "Amber" ? "Watch" : hr === "Red" ? "Miss" : "—"}` : ""}
              </span>
            </SpaLink>
          );
        })}
      </div>
    </div>
  );
}
