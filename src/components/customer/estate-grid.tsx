import { useMemo, useState } from "react";
import { CheckCircle2, Star, XCircle } from "lucide-react";
import { tenantAssetBelongs } from "@/lib/data/rmm-device-owner";
import { classifyRmmDevice } from "@/lib/data/rmm-device-class";
import { coverFromDetail, isDormantCover } from "@/lib/data/cover";
import { ticketStats } from "@/lib/data/ticket-feed";
import type { CustomerDetailPayload, FactIncidentRow } from "@/lib/data/types";
import { SpaLink } from "@/components/nav/spa-link";
import { CoverTag } from "@/components/ui/status-robot";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { customerLiveStatus } from "@/lib/data/live-status";
import { cn, formatSastDateTime } from "@/lib/utils";

const PAGE = 11;

function keyOf(s: string | null | undefined) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .split(".")[0]
    .replace(/[^a-z0-9-]/g, "");
}

function openTickets(list: FactIncidentRow[]) {
  return list.filter((t) => {
    const s = String(t.status ?? "").toLowerCase();
    return s && !s.includes("close") && !s.includes("resolv");
  });
}

function ticketsForHost(list: FactIncidentRow[], host: string) {
  const k = keyOf(host);
  if (!k) return 0;
  return openTickets(list).filter((t) =>
    keyOf(`${t.title} ${t.externalRef ?? ""} ${t.ownerName ?? ""}`).includes(k),
  ).length;
}

function ageLabel(iso: string | null | undefined) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return formatSastDateTime(iso);
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

type Row = {
  id: string;
  orgId: string;
  org: string;
  site: string;
  host: string;
  status: "Online" | "Offline" | "Maintenance";
  estate: string;
  sysproId: string;
  backup: "ok" | "fail" | "none";
  epp: "Protected" | "Warning" | "—";
  tickets: number;
  last: string;
  ip: string;
  location: string;
};

export function EstateGrid({ data }: { data: CustomerDetailPayload }) {
  const { customer } = data;
  const [page, setPage] = useState(1);
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [compact, setCompact] = useState(true);

  const rows = useMemo(() => {
    const org = customer.displayName;
    const orgId = customer.customerCode;
    const syspro = customer.sqlInstanceName || data.sysproVersion?.serverName || "";
    const rmm = data.rmm?.devices ?? [];
    const cove = data.cove?.devices ?? [];
    const epp = data.epp?.devices ?? [];
    const tix = data.incidents ?? [];

    const coveBy = new Map<string, (typeof cove)[0]>();
    for (const c of cove) {
      const k = keyOf(c.machineName) || keyOf(c.deviceName);
      if (k) coveBy.set(k, c);
    }
    const eppBy = new Map<string, (typeof epp)[0]>();
    for (const e of epp) {
      const k = keyOf(e.deviceName) || keyOf(e.fqdn);
      if (k) eppBy.set(k, e);
    }

    const seen = new Set<string>();
    const out: Row[] = [];

    function push(partial: Omit<Row, "orgId" | "org"> & { id: string }) {
      const k = keyOf(partial.host) || partial.id;
      if (seen.has(k)) return;
      if (
        !tenantAssetBelongs(orgId, {
          host: partial.host,
          org: partial.site !== org ? partial.site : null,
        })
      ) {
        return;
      }
      seen.add(k);
      out.push({ ...partial, orgId, org });
    }

    rmm.forEach((d, i) => {
      const host = d.name || d.deviceId || `device-${i + 1}`;
      const k = keyOf(host);
      const cv = coveBy.get(k);
      const ep = eppBy.get(k);
      const cls = classifyRmmDevice(d);
      const estate =
        cls === "server"
          ? "Server"
          : cls === "workstation"
            ? "Workstation"
            : d.deviceType || "Device";
      const backup = !cv
        ? "none"
        : /fail|error/i.test(String(cv.lastBackupStatus ?? ""))
          ? "fail"
          : "ok";
      const eppLabel = !ep
        ? "—"
        : ep.infected || ep.malwareDetected || ep.productOutdated || ep.signatureOutdated
          ? "Warning"
          : "Protected";
      if (estate !== "Server") return;
      push({
        id: d.deviceId || host,
        site: d.organizationName || org,
        host,
        status: d.isOnline === false ? "Offline" : "Online",
        estate,
        sysproId:
          syspro && (cls === "server" || /sql|syspro|app/i.test(host)) ? syspro : "—",
        backup,
        epp: eppLabel,
        tickets: ticketsForHost(tix, host),
        last: ageLabel(d.lastSeenOnline),
        ip: d.ipAddress || "—",
        location: d.organizationName || "—",
      });
    });

    cove.forEach((c, i) => {
      const host = c.machineName || c.deviceName || `backup-${i + 1}`;
      const k = keyOf(host);
      if (seen.has(k)) return;
      const ep = eppBy.get(k);
      const estate = /server|sql|srv/i.test(host) ? "Server" : "Device";
      if (estate !== "Server") return;
      push({
        id: String(c.accountId ?? host),
        site: c.partnerName || org,
        host,
        status: "Online",
        estate,
        sysproId: "—",
        backup: /fail|error/i.test(String(c.lastBackupStatus ?? "")) ? "fail" : "ok",
        epp:
          !ep
            ? "—"
            : ep.infected || ep.malwareDetected
              ? "Warning"
              : "Protected",
        tickets: ticketsForHost(tix, host),
        last: ageLabel(c.lastSuccessTime),
        ip: "—",
        location: c.partnerName || "—",
      });
    });

    epp.forEach((e, i) => {
      const host = e.deviceName || e.fqdn || `epp-${i + 1}`;
      const k = keyOf(host);
      if (seen.has(k)) return;
      const estate = e.machineType === 6 ? "Server" : "Workstation";
      if (estate !== "Server") return;
      push({
        id: e.endpointId || host,
        site: org,
        host,
        status: "Online",
        estate,
        sysproId: "—",
        backup: "none",
        epp: e.infected || e.malwareDetected ? "Warning" : "Protected",
        tickets: ticketsForHost(tix, host),
        last: ageLabel(e.lastSeenAt || e.lastSuccessfulScanAt),
        ip: e.ipAddress || "—",
        location: "—",
      });
    });

    return out;
  }, [customer, data]);

  const cover = coverFromDetail(data);
  const dormant = isDormantCover(cover);
  const tix = ticketStats(data.incidents);
  const code = customer.customerCode;
  const base = `/customers/${code}`;
  const lastCollect = [
    customer.lastImportAt,
    customer.pulsewayLastImportAt,
    customer.coveLastImportAt,
    customer.eppLastImportAt,
    customer.cspLastImportAt,
  ].reduce<string | null>((best, v) => {
    if (!v) return best;
    if (!best) return v;
    return new Date(v).getTime() > new Date(best).getTime() ? v : best;
  }, null);
  const score = data.operationalAssurance?.scorePct;
  const openRisks = (data.risks ?? []).filter((r) => !/closed/i.test(String(r.status ?? "")));
  const jobs = customer.sysproJobErrorCount ?? 0;
  const dtr = customer.sysproDtrVarianceLines ?? 0;
  const srvOn = customer.pulsewayServerOnline ?? 0;
  const srvOff = customer.pulsewayServerOffline ?? 0;
  const coveFail = (customer.coveFailedDeviceCount ?? 0) + (customer.coveStaleDeviceCount ?? 0);
  const coveN = customer.coveDeviceCount ?? data.cove?.devices?.length ?? 0;
  const eppN = customer.eppDeviceCount ?? data.epp?.devices?.length ?? 0;
  const infected = customer.bdInfectedCount ?? 0;
  const iopsN = data.rmm?.agentIops?.length ?? 0;
  const live = customerLiveStatus(code, customer, cover, data);

  const banners = [
    {
      on: cover.syspro,
      name: "SYSPRO Landscape",
      href: `${base}/syspro`,
      bar: "#0d9488",
      rag: live.pillars.syspro?.rag ?? (cover.syspro ? "Green" : "Off"),
      bits: [
        `${customer.operatorCount || data.operators?.length || 0} operators`,
        `${jobs} job errors`,
        `${dtr} FinSight OOB`,
      ],
    },
    {
      on: cover.rmm,
      name: "RMM Management",
      href: `${base}/rmm`,
      bar: "#2563eb",
      rag: live.pillars.rmm?.rag ?? (cover.rmm ? "Green" : "Off"),
      bits: [`${srvOn} online`, `${srvOff} offline`, `${iopsN} IOPS vols`],
    },
    {
      on: cover.cove,
      name: "RPM Cloud Backup",
      href: `${base}/cove`,
      bar: "#7c3aed",
      rag: live.pillars.cove?.rag ?? (cover.cove ? "Green" : "Off"),
      bits: [`${coveN} agents`, `${coveFail} failed / stale`],
    },
    {
      on: Boolean(cover.epp),
      name: "RPM End Point Protection",
      href: `${base}/epp`,
      bar: "#dc2626",
      rag: live.pillars.epp?.rag ?? (cover.epp ? "Green" : "Off"),
      bits: [`${eppN} agents`, infected ? `${infected} infected` : "clean"],
    },
  ];

  const heat = [
    { label: "Finance Modules", href: `${base}/syspro/dtr`, on: cover.syspro, rag: live.modules["/syspro/dtr"]?.rag ?? live.pillars.syspro?.rag },
    { label: "Operators", href: `${base}/syspro/operators`, on: cover.syspro, rag: live.modules["/syspro/operators"]?.rag ?? live.pillars.syspro?.rag },
    { label: "Servers", href: `${base}/rmm/devices`, on: cover.rmm, rag: live.modules["/rmm/devices"]?.rag ?? live.pillars.rmm?.rag },
    { label: "Workstations", href: `${base}/rmm/workstations`, on: cover.rmm, rag: live.modules["/rmm/workstations"]?.rag ?? "Off" },
    { label: "Backup Agents", href: `${base}/cove/devices`, on: cover.cove, rag: live.modules["/cove/devices"]?.rag ?? live.pillars.cove?.rag },
    { label: "Recovery Testing", href: `${base}/cove/recovery`, on: cover.cove, rag: live.modules["/cove/recovery"]?.rag ?? live.pillars.cove?.rag },
    { label: "EndPoint Agents", href: `${base}/epp`, on: Boolean(cover.epp), rag: live.pillars.epp?.rag },
    { label: "Open Tickets", href: `${base}/tickets/open`, on: Boolean(cover.tickets), rag: tix.open > 0 ? "Amber" : "Green" },
  ].map((h) => ({
    ...h,
    tone: !h.on ? "off" : h.rag === "Red" ? "red" : h.rag === "Amber" ? "amber" : "green",
  }));

  const kpis = [
    { label: "Assurance", value: dormant || score == null ? "—" : `${score}%`, href: `${base}/ams` },
    { label: "Open tickets", value: tix.open, href: `${base}/tickets/open` },
    { label: "Open risks", value: openRisks.length, href: `${base}/ams/risks` },
    { label: "Job errors", value: cover.syspro ? jobs : "—", href: `${base}/syspro/jobs` },
    { label: "Servers offline", value: cover.rmm ? srvOff : "—", href: `${base}/rmm/devices` },
    { label: "Backup issues", value: cover.cove ? coveFail : "—", href: `${base}/cove/devices` },
  ];

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safe = Math.min(page, pages);
  const slice = rows.slice((safe - 1) * PAGE, safe * PAGE);
  const from = rows.length === 0 ? 0 : (safe - 1) * PAGE + 1;
  const to = Math.min(safe * PAGE, rows.length);

  return (
    <div className={cn("rpma-est", compact && "is-compact")}>
      <header className="rpma-eco-head">
        <div className="rpma-eco-head-row">
          <RagBadge rag={dormant ? "Off" : customer.healthRag} title={customer.healthSummary} />
          <div>
            <h2>{customer.displayName}</h2>
            <p>Customer Eco System · last collect {formatSastDateTime(lastCollect)}</p>
          </div>
        </div>
        {dormant ? (
          <div className="rpma-dormant-banner" role="status">
            <strong>Dormant customer</strong>
            <span>
              Tickets only — no Assure agent and no SYSPRO, RMM, Backup, or EPP cover.
              SLA is not scored and RAG lights stay off until an agent or a covered service lands.
            </span>
          </div>
        ) : null}
        <div className="rpma-eco-kpis">
          {kpis.map((k) => (
            <SpaLink key={k.label} href={k.href} className="rpma-eco-kpi">
              <em>{k.label}</em>
              <strong>{k.value}</strong>
            </SpaLink>
          ))}
        </div>
        <div className="rpma-cmd-banners">
          {banners.map((s) => (
            <SpaLink
              key={s.name}
              href={s.href}
              className={cn("rpma-cmd-banner", s.on ? "is-on" : "is-off")}
            >
              <i style={{ background: s.bar }} />
              <div>
                <strong>{s.name}</strong>
                <span>{s.on ? s.bits.join(" · ") : "No Cover"}</span>
              </div>
              <CoverTag on={s.on} />
            </SpaLink>
          ))}
        </div>
        <div className="rpma-cmd-heat" aria-label="Module heat">
          {heat.map((h) => (
            <SpaLink key={h.label} href={h.href} className={cn("rpma-cmd-cell", `is-${h.tone}`)}>
              <em>{h.label}</em>
              <strong>{h.on ? (h.rag === "Off" ? "Cover" : String(h.rag)) : "No Cover"}</strong>
            </SpaLink>
          ))}
        </div>
      </header>
      <div className="rpma-est-scroll">
        <table className="rpma-est-table">
          <thead>
            <tr>
              <th className="w-star" />
              <th>Org ID</th>
              <th>Organization</th>
              <th>Site</th>
              <th>Device / Hostname</th>
              <th>Status</th>
              <th>Estate type</th>
              <th>SYSPRO ID</th>
              <th>Backup</th>
              <th>EPP</th>
              <th>Tickets</th>
              <th>Last active</th>
              <th>IP address</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={14} className="rpma-est-empty">
                  No estate devices on last collect for {customer.displayName}.
                </td>
              </tr>
            ) : (
              slice.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <button
                      type="button"
                      className={cn("rpma-est-star", starred[r.id] && "is-on")}
                      onClick={() => setStarred((s) => ({ ...s, [r.id]: !s[r.id] }))}
                      aria-label="Star"
                    >
                      <Star className="size-3.5" />
                    </button>
                  </td>
                  <td className="mono">{r.orgId}-{String((safe - 1) * PAGE + i + 1).padStart(3, "0")}</td>
                  <td>{r.org}</td>
                  <td>{r.site}</td>
                  <td className="strong">{r.host}</td>
                  <td>
                    <span
                      className={cn(
                        "rpma-est-st",
                        r.status === "Online" && "is-ok",
                        r.status === "Offline" && "is-bad",
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.estate}</td>
                  <td className="mono">{r.sysproId}</td>
                  <td className="center">
                    {r.backup === "ok" ? (
                      <CheckCircle2 className="rpma-est-ok" />
                    ) : r.backup === "fail" ? (
                      <XCircle className="rpma-est-bad" />
                    ) : (
                      <span className="muted">N/A</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={cn(
                        "rpma-est-st",
                        r.epp === "Protected" && "is-ok",
                        r.epp === "Warning" && "is-warn",
                      )}
                    >
                      {r.epp}
                    </span>
                  </td>
                  <td className={cn(r.tickets > 0 && "warn")}>{r.tickets}</td>
                  <td>{r.last}</td>
                  <td className="mono">{r.ip}</td>
                  <td>{r.location}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer className="rpma-est-foot">
        <span>
          Showing {from} to {to} of {rows.length} entries
        </span>
        <nav className="rpma-est-pages" aria-label="Pages">
          <button type="button" disabled={safe <= 1} onClick={() => setPage(safe - 1)}>
            ‹
          </button>
          {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={n === safe ? "is-on" : undefined}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          {pages > 5 ? <span>… {pages}</span> : null}
          <button type="button" disabled={safe >= pages} onClick={() => setPage(safe + 1)}>
            ›
          </button>
        </nav>
        <label className="rpma-est-compact">
          Compact
          <input
            type="checkbox"
            checked={compact}
            onChange={(e) => setCompact(e.target.checked)}
          />
        </label>
      </footer>
    </div>
  );
}
