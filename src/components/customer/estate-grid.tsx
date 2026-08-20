import { useMemo, useState } from "react";
import { CheckCircle2, Star, XCircle } from "lucide-react";
import { tenantAssetBelongs } from "@/lib/data/rmm-device-owner";
import { classifyRmmDevice, isStrongRmmServer } from "@/lib/data/rmm-device-class";
import { coverFromDetail, isDormantCover } from "@/lib/data/cover";
import { ticketStats } from "@/lib/data/ticket-feed";
import { ServerKindIcon } from "@/components/customer/server-kind-icon";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { SpaLink } from "@/components/nav/spa-link";
import { CoverTag, StatusRobot } from "@/components/ui/status-robot";
import { TenantAccessCard } from "@/components/customer/tenant-access";
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

function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i >= 3 ? 2 : i >= 2 ? 1 : 0)} ${units[i]}`;
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
  rmm: "ok" | "fail" | "none";
  last: string;
  ip: string;
  location: string;
  os?: string;
  patchMissing?: number | null;
  backupStatus?: string;
  size?: string;
  recoveryPlan?: string;
  lastTest?: string;
  retention?: string;
  lastScan?: string;
  policy?: string;
  infected?: string;
  device?: {
    name?: string | null;
    osName?: string | null;
    deviceType?: string | null;
    disks?: { mediaType?: string | null }[] | null;
  };
};

type Col = { key: string; label: string; wide?: boolean; center?: boolean };

const COLS: Record<EstateFocus, Col[]> = {
  eco: [
    { key: "orgId", label: "Org ID" },
    { key: "org", label: "Organization", wide: true },
    { key: "site", label: "Site", wide: true },
    { key: "host", label: "Device / Hostname" },
    { key: "status", label: "Status" },
    { key: "estate", label: "Estate Type" },
    { key: "sysproId", label: "SYSPRO ID", wide: true },
    { key: "backup", label: "Cloud Backup", center: true },
    { key: "epp", label: "End-Point Protection" },
    { key: "rmm", label: "RPM RMM Status", center: true },
    { key: "last", label: "Last Active" },
    { key: "ip", label: "IP Address", wide: true },
    { key: "location", label: "Location", wide: true },
  ],
  rmm: [
    { key: "host", label: "Hostname" },
    { key: "status", label: "Status" },
    { key: "estate", label: "Type" },
    { key: "os", label: "Operating System", wide: true },
    { key: "ip", label: "IP Address", wide: true },
    { key: "last", label: "Last Active" },
    { key: "patch", label: "Outstanding Patches" },
  ],
  cove: [
    { key: "host", label: "Backup Agent" },
    { key: "machine", label: "Machine" },
    { key: "backupStatus", label: "Backup Status" },
    { key: "last", label: "Last Success" },
    { key: "size", label: "Protected Size" },
    { key: "recoveryPlan", label: "Recovery Plan" },
    { key: "lastTest", label: "Last Recovery Test" },
    { key: "retention", label: "Retention Policy" },
  ],
  epp: [
    { key: "host", label: "EndPoint Agent" },
    { key: "estate", label: "Type" },
    { key: "os", label: "Operating System" },
    { key: "lastScan", label: "Last Scan" },
    { key: "last", label: "Last Seen" },
    { key: "infected", label: "Threat Status" },
    { key: "policy", label: "Policy" },
  ],
  syspro: [
    { key: "host", label: "Hostname" },
    { key: "status", label: "Status" },
    { key: "os", label: "Operating System" },
    { key: "sysproId", label: "SYSPRO Instance" },
    { key: "last", label: "Last Active" },
    { key: "ip", label: "IP Address" },
  ],
};

export type EstateFocus = "eco" | "syspro" | "rmm" | "cove" | "epp";

const DECK_TITLE: Record<EstateFocus, string> = {
  eco: "Customer Eco System",
  syspro: "SYSPRO Landscape",
  rmm: "RMM Management",
  cove: "RPM Cloud Backup",
  epp: "RPM End Point Protection",
};

export function EstateGrid({
  data,
  focus = "eco",
}: {
  data: CustomerDetailPayload;
  focus?: EstateFocus;
}) {
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

    function belongs(host: string, site?: string | null, stamped?: string | null) {
      return tenantAssetBelongs(orgId, { host, org: site, stamped });
    }

    function push(partial: Omit<Row, "orgId" | "org"> & { id: string }, stamped?: string | null) {
      const k = keyOf(partial.host) || partial.id;
      if (seen.has(k)) return;
      if (!belongs(partial.host, partial.site, stamped ?? null)) return;
      seen.add(k);
      out.push({ ...partial, orgId, org });
    }

    if (focus === "cove") {
      cove.forEach((c, i) => {
        const host = c.machineName || c.deviceName || `backup-${i + 1}`;
        if (!belongs(host, c.partnerName, null)) return;
        const fail = /fail|error/i.test(String(c.lastBackupStatus ?? ""));
        out.push({
          id: String(c.accountId ?? host),
          orgId,
          org,
          site: c.partnerName || org,
          host,
          status: fail ? "Offline" : "Online",
          estate: c.physicality || "Agent",
          sysproId: "—",
          backup: fail ? "fail" : "ok",
          epp: "—",
          rmm: "none",
          last: ageLabel(c.lastSuccessTime),
          ip: "—",
          location: c.partnerName || "—",
          backupStatus: String(c.lastBackupStatus || "—"),
          size: fmtBytes(c.usedBytes ?? c.selectedBytes),
          recoveryPlan: c.recoveryPlanLabel || (c.recoveryPlanType === 1 ? "Recovery Testing" : c.recoveryPlanType === 2 ? "Standby Image" : "—"),
          lastTest: ageLabel(c.lastRecoveryTestAt),
          retention: c.retentionPolicy || "—",
          os: c.deviceName || "—",
          device: { name: host, deviceType: "Server" },
        });
      });
      out.sort((a, b) => a.host.localeCompare(b.host));
      return out;
    }

    if (focus === "epp") {
      epp.forEach((e, i) => {
        const host = e.deviceName || e.fqdn || `epp-${i + 1}`;
        if (!belongs(host, null, null)) return;
        const warn = Boolean(e.infected || e.malwareDetected || e.productOutdated || e.signatureOutdated);
        out.push({
          id: e.endpointId || host,
          orgId,
          org,
          site: org,
          host,
          status: "Online",
          estate: e.machineType === 6 ? "Server" : "Workstation",
          sysproId: "—",
          backup: "none",
          epp: warn ? "Warning" : "Protected",
          rmm: "none",
          last: ageLabel(e.lastSeenAt || e.lastSuccessfulScanAt),
          ip: e.ipAddress || "—",
          location: "—",
          os: e.operatingSystem || "—",
          lastScan: ageLabel(e.lastSuccessfulScanAt),
          policy: e.policyName || "—",
          infected: e.infected || e.malwareDetected ? "Threat" : "Clean",
          device: { name: host, osName: e.operatingSystem, deviceType: e.machineType === 6 ? "Server" : "Workstation" },
        });
      });
      out.sort((a, b) => a.host.localeCompare(b.host));
      return out;
    }

    rmm.forEach((d, i) => {
      const host = d.name || d.deviceId || `device-${i + 1}`;
      const k = keyOf(host);
      const cv = coveBy.get(k);
      const ep = eppBy.get(k);
      const cls = classifyRmmDevice(d);
      const estate =
        cls === "server" ? "Server" : cls === "workstation" ? "Workstation" : d.deviceType || "Device";
      if (focus === "syspro" && estate !== "Server") return;
      // Eco System is the real server estate. A PC with Cove/EPP (PCNS-PROD)
      // must not appear as a third BHF server.
      if (focus === "eco" && !isStrongRmmServer(d)) return;
      if (focus === "rmm" || focus === "syspro" || focus === "eco") {
        push({
          id: d.deviceId || host,
          site: d.organizationName || org,
          host,
          status: d.isOnline === false ? "Offline" : "Online",
          estate,
          sysproId: syspro && (cls === "server" || /sql|syspro|app/i.test(host)) ? syspro : "—",
          backup: !cv ? "none" : /fail|error/i.test(String(cv.lastBackupStatus ?? "")) ? "fail" : "ok",
          epp: !ep
            ? "—"
            : ep.infected || ep.malwareDetected || ep.productOutdated || ep.signatureOutdated
              ? "Warning"
              : "Protected",
          rmm: d.isOnline === false ? "fail" : "ok",
          last: ageLabel(d.lastSeenOnline),
          ip: d.ipAddress || "—",
          location: d.organizationName || "—",
          os: d.osName || "—",
          patchMissing: d.patchMissing ?? null,
          device: d,
        }, d.customerCode);
      }
    });

    if (focus === "eco") {
      cove.forEach((c, i) => {
        const host = c.machineName || c.deviceName || `backup-${i + 1}`;
        const k = keyOf(host);
        if (seen.has(k)) return;
        const ep = eppBy.get(k);
        const cls = classifyRmmDevice({ name: host, deviceType: c.physicality });
        if (!isStrongRmmServer({ name: host, deviceType: c.physicality })) return;
        const estate = cls === "server" || /server|sql|srv|web/i.test(host) ? "Server" : "Device";
        if (estate !== "Server") return;
        push({
          id: String(c.accountId ?? host),
          site: c.partnerName || org,
          host,
          status: "Online",
          estate,
          sysproId: "—",
          backup: /fail|error/i.test(String(c.lastBackupStatus ?? "")) ? "fail" : "ok",
          epp: !ep ? "—" : ep.infected || ep.malwareDetected ? "Warning" : "Protected",
          rmm: "none",
          last: ageLabel(c.lastSuccessTime),
          ip: "—",
          location: c.partnerName || "—",
          device: { name: host, deviceType: estate },
        });
      });
      epp.forEach((e, i) => {
        const host = e.deviceName || e.fqdn || `epp-${i + 1}`;
        const k = keyOf(host);
        if (seen.has(k)) return;
        if (!isStrongRmmServer({ name: host, osName: e.operatingSystem })) return;
        const estate = "Server";
        push({
          id: e.endpointId || host,
          site: org,
          host,
          status: "Online",
          estate,
          sysproId: "—",
          backup: "none",
          epp: e.infected || e.malwareDetected ? "Warning" : "Protected",
          rmm: "none",
          last: ageLabel(e.lastSeenAt || e.lastSuccessfulScanAt),
          ip: e.ipAddress || "—",
          location: "—",
          device: { name: host, osName: e.operatingSystem, deviceType: estate },
        });
      });
    }

    out.sort((a, b) => {
      const rank = (e: string) => (e === "Server" ? 0 : e === "Workstation" ? 1 : 2);
      const d = rank(a.estate) - rank(b.estate);
      if (d) return d;
      return a.host.localeCompare(b.host);
    });
    if (focus === "syspro") return out.filter((r) => r.estate === "Server");
    return out;
  }, [customer, data, focus]);

  const cover = coverFromDetail(data);
  const dormant = isDormantCover(cover);
  const tix = ticketStats(data.incidents, data.slaPolicies);
  const code = customer.customerCode;
  const base = `/customers/${code}`;
  const lastCollect = [
    focus === "rmm" ? customer.pulsewayLastImportAt : null,
    focus === "cove" ? customer.coveLastImportAt : null,
    focus === "epp" ? customer.eppLastImportAt : null,
    focus === "syspro" ? customer.lastImportAt : null,
    focus === "eco" ? customer.lastImportAt : null,
    focus === "eco" ? customer.pulsewayLastImportAt : null,
    focus === "eco" ? customer.coveLastImportAt : null,
    focus === "eco" ? customer.eppLastImportAt : null,
  ].reduce<string | null>((best, v) => {
    if (!v) return best;
    if (!best) return v;
    return new Date(v).getTime() > new Date(best).getTime() ? v : best;
  }, null);
  const score = data.operationalAssurance?.scorePct;
  const openRisks = (data.risks ?? []).filter((r) => !/closed/i.test(String(r.status ?? "")));
  const jobs = customer.sysproJobErrorCount ?? 0;
  const dtr = customer.sysproDtrVarianceLines ?? 0;
  const srvOn = rows.filter((r) => r.estate === "Server" && r.status === "Online").length || (customer.pulsewayServerOnline ?? 0);
  const srvOff = rows.filter((r) => r.estate === "Server" && r.status === "Offline").length || (customer.pulsewayServerOffline ?? 0);
  const coveFail = (customer.coveFailedDeviceCount ?? 0) + (customer.coveStaleDeviceCount ?? 0);
  const coveN = focus === "cove" ? rows.length : (customer.coveDeviceCount ?? data.cove?.devices?.length ?? 0);
  const eppN = focus === "epp" ? rows.length : (customer.eppDeviceCount ?? data.epp?.devices?.length ?? 0);
  const infected = customer.bdInfectedCount ?? 0;
  const iopsN = data.rmm?.agentIops?.length ?? 0;
  const live = customerLiveStatus(code, customer, cover, data);
  const rec = data.cove?.recovery ?? data.cove?.summary?.recovery;
  const wsN = rows.filter((r) => r.estate === "Workstation").length;

  const banners = [
    {
      on: cover.syspro,
      name: "SYSPRO Landscape",
      href: live.pillars.syspro?.href ?? `${base}/syspro`,
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
      href: live.pillars.rmm?.href ?? `${base}/rmm`,
      bar: "#2563eb",
      rag: live.pillars.rmm?.rag ?? (cover.rmm ? "Green" : "Off"),
      bits: [`${srvOn} online`, `${srvOff} offline`, `${iopsN} IOPS vols`],
    },
    {
      on: cover.cove,
      name: "RPM Cloud Backup",
      href: live.pillars.cove?.href ?? `${base}/cove`,
      bar: "#7c3aed",
      rag: live.pillars.cove?.rag ?? (cover.cove ? "Green" : "Off"),
      bits: [`${coveN} agents`, `${coveFail} failed / stale`],
    },
    {
      on: Boolean(cover.epp),
      name: "RPM End Point Protection",
      href: live.pillars.epp?.href ?? `${base}/epp`,
      bar: "#dc2626",
      rag: live.pillars.epp?.rag ?? (cover.epp ? "Green" : "Off"),
      bits: [`${eppN} agents`, infected ? `${infected} infected` : "clean"],
    },
  ];

  const heatAll = [
    { label: "Finance Modules", href: `${base}/syspro/dtr`, on: cover.syspro, rag: live.modules["/syspro/dtr"]?.rag ?? live.pillars.syspro?.rag },
    { label: "Operators", href: `${base}/syspro/operators`, on: cover.syspro, rag: live.modules["/syspro/operators"]?.rag ?? live.pillars.syspro?.rag },
    { label: "Job Logging", href: `${base}/syspro/jobs`, on: cover.syspro, rag: live.modules["/syspro/jobs"]?.rag ?? live.pillars.syspro?.rag },
    { label: "Day End", href: `${base}/syspro/day-end`, on: cover.syspro, rag: live.modules["/syspro/day-end"]?.rag ?? live.pillars.syspro?.rag },
    { label: "Servers", href: `${base}/rmm/devices`, on: cover.rmm, rag: live.modules["/rmm/devices"]?.rag ?? live.pillars.rmm?.rag },
    { label: "Workstations", href: `${base}/rmm/workstations`, on: Boolean(live.modules["/rmm/workstations"]?.cover), rag: live.modules["/rmm/workstations"]?.rag ?? "Off" },
    { label: "Patch Compliance", href: `${base}/rmm/patch`, on: cover.rmm, rag: live.modules["/rmm/patch"]?.rag ?? live.pillars.rmm?.rag },
    { label: "RMM Service SLA", href: `${base}/rmm/sla`, on: cover.rmm, rag: live.modules["/rmm/sla"]?.rag ?? "Off" },
    { label: "Disk Performance", href: `${base}/rmm/iops`, on: cover.rmm, rag: live.modules["/rmm/iops"]?.rag ?? live.pillars.rmm?.rag },
    { label: "Server Alerts", href: `${base}/rmm/alerts`, on: cover.rmm, rag: live.modules["/rmm/alerts"]?.rag ?? live.pillars.rmm?.rag },
    { label: "Windows Events", href: `${base}/rmm/events`, on: cover.rmm, rag: live.modules["/rmm/events"]?.rag ?? live.pillars.rmm?.rag },
    { label: "Backup Agents", href: `${base}/cove/devices`, on: cover.cove, rag: live.modules["/cove/devices"]?.rag ?? live.pillars.cove?.rag },
    { label: "Recovery Testing", href: `${base}/cove/recovery`, on: cover.cove, rag: live.modules["/cove/recovery"]?.rag ?? live.pillars.cove?.rag },
    { label: "Backup Retention", href: `${base}/cove/retention`, on: cover.cove, rag: live.modules["/cove/retention"]?.rag ?? live.pillars.cove?.rag },
    { label: "EPP Overview", href: `${base}/epp`, on: Boolean(cover.epp), rag: live.pillars.epp?.rag },
    { label: "EndPoint Agents", href: `${base}/epp/endpoints`, on: Boolean(cover.epp), rag: live.pillars.epp?.rag },
    { label: "Policies & Modules", href: `${base}/epp/modules`, on: Boolean(cover.epp), rag: live.modules["/epp/modules"]?.rag ?? live.pillars.epp?.rag },
    { label: "Security Incidents", href: `${base}/epp/incidents`, on: Boolean(cover.epp), rag: live.modules["/epp/incidents"]?.rag ?? live.pillars.epp?.rag },
    { label: "Quarantine", href: `${base}/epp/quarantine`, on: Boolean(cover.epp), rag: live.modules["/epp/quarantine"]?.rag ?? live.pillars.epp?.rag },
    { label: "Service SLA", href: `${base}/epp/sla`, on: Boolean(cover.epp), rag: live.modules["/epp/sla"]?.rag ?? live.pillars.epp?.rag },
    { label: "Open Tickets", href: `${base}/tickets/open`, on: Boolean(cover.tickets), rag: tix.open > 0 ? "Amber" : "Green" },
  ]
    .filter((h) => {
      if (focus === "syspro") return h.href.includes("/syspro");
      if (focus === "rmm") return h.href.includes("/rmm");
      if (focus === "cove") return h.href.includes("/cove");
      if (focus === "epp") return h.href.includes("/epp");
      return true;
    })
    .map((h) => ({
      ...h,
      tone: !h.on ? "off" : h.rag === "Red" ? "red" : h.rag === "Amber" ? "amber" : "green",
    }));

  const kpis =
    focus === "syspro"
      ? [
          { label: "Active Users", value: customer.activeUserCount, href: `${base}/syspro/operators` },
          { label: "Job Errors", value: jobs, href: `${base}/syspro/jobs` },
          { label: "FinSight OOB", value: dtr, href: `${base}/syspro/dtr` },
          { label: "Servers", value: rows.length, href: `${base}/syspro` },
        ]
      : focus === "rmm"
        ? [
            { label: "Servers Online", value: srvOn, href: `${base}/rmm/devices` },
            { label: "Servers Offline", value: srvOff, href: `${base}/rmm/devices` },
            { label: "Workstations", value: wsN, href: `${base}/rmm/workstations` },
            { label: "Disk Volumes", value: iopsN, href: `${base}/rmm/iops` },
          ]
        : focus === "cove"
          ? [
              { label: "Backup Agents", value: coveN, href: `${base}/cove/devices` },
              { label: "Backup Issues", value: coveFail, href: `${base}/cove/devices` },
              { label: "Recovery Testing", value: rec?.recoveryTestingCount ?? 0, href: `${base}/cove/recovery` },
              { label: "Last Test", value: rec?.lastRecoveryTestAt ? ageLabel(rec.lastRecoveryTestAt) : "—", href: `${base}/cove/recovery` },
            ]
          : focus === "epp"
            ? [
                { label: "EndPoint Agents", value: eppN, href: `${base}/epp/endpoints` },
                { label: "Infected", value: infected, href: `${base}/epp/incidents` },
                { label: "Clean", value: Math.max(0, eppN - infected), href: `${base}/epp/endpoints` },
                { label: "Policies", value: new Set(rows.map((r) => r.policy).filter((p) => p && p !== "—")).size, href: `${base}/epp/modules` },
              ]
            : [
                { label: "Assurance", value: dormant || score == null ? "—" : `${score}%`, href: `${base}/ams` },
                { label: "Open Tickets", value: tix.open, href: `${base}/tickets/open` },
                { label: "Open Risks", value: openRisks.length, href: `${base}/ams/risks` },
                { label: "Job Errors", value: cover.syspro ? jobs : "—", href: `${base}/syspro/jobs` },
                { label: "Servers Offline", value: cover.rmm ? srvOff : "—", href: `${base}/rmm/devices` },
                { label: "Backup Issues", value: cover.cove ? coveFail : "—", href: `${base}/cove/devices` },
              ];

  const cols = COLS[focus];
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safe = Math.min(page, pages);
  const slice = rows.slice((safe - 1) * PAGE, safe * PAGE);
  const from = rows.length === 0 ? 0 : (safe - 1) * PAGE + 1;
  const to = Math.min(safe * PAGE, rows.length);
  const emptyLabel =
    focus === "cove"
      ? `No backup agents on last collect for ${customer.displayName}.`
      : focus === "epp"
        ? `No endpoint agents on last collect for ${customer.displayName}.`
        : focus === "rmm"
          ? `No RMM devices on last collect for ${customer.displayName}.`
          : focus === "syspro"
            ? `No SYSPRO servers on last collect for ${customer.displayName}.`
            : `No estate devices on last collect for ${customer.displayName}.`;

  function cell(r: Row, col: Col, i: number) {
    switch (col.key) {
      case "orgId":
        return <td key={col.key} className="mono">{r.orgId}-{String((safe - 1) * PAGE + i + 1).padStart(3, "0")}</td>;
      case "org":
        return <td key={col.key} className="col-wide">{r.org}</td>;
      case "site":
        return <td key={col.key} className="col-wide">{r.site}</td>;
      case "host":
      case "machine":
        return (
          <td key={col.key} className="strong">
            <span className="inline-flex items-center gap-2">
              {r.device ? <ServerKindIcon device={r.device} size={18} /> : null}
              {col.key === "machine" ? r.os || r.host : r.host}
            </span>
          </td>
        );
      case "status":
        return (
          <td key={col.key}>
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
        );
      case "estate":
        return <td key={col.key}>{r.estate}</td>;
      case "sysproId":
        return <td key={col.key} className="mono col-wide">{r.sysproId}</td>;
      case "backup":
      case "rmm": {
        const v = col.key === "backup" ? r.backup : r.rmm;
        return (
          <td key={col.key} className="center">
            <span className="rpma-est-tick">
              {v === "ok" ? (
                <CheckCircle2 className="rpma-est-ok" />
              ) : v === "fail" ? (
                <XCircle className="rpma-est-bad" />
              ) : (
                <span className="muted">N/A</span>
              )}
            </span>
          </td>
        );
      }
      case "epp":
        return (
          <td key={col.key}>
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
        );
      case "last":
        return <td key={col.key}>{r.last}</td>;
      case "ip":
        return <td key={col.key} className="mono col-wide">{r.ip}</td>;
      case "location":
        return <td key={col.key} className="col-wide">{r.location}</td>;
      case "os":
        return <td key={col.key} className="col-wide">{r.os || "—"}</td>;
      case "patch":
        return (
          <td key={col.key} className={cn((r.patchMissing ?? 0) > 0 && "warn")}>
            {r.patchMissing == null ? "—" : r.patchMissing}
          </td>
        );
      case "backupStatus":
        return (
          <td key={col.key}>
            <span className={cn("rpma-est-st", r.backup === "ok" && "is-ok", r.backup === "fail" && "is-bad")}>
              {r.backupStatus || "—"}
            </span>
          </td>
        );
      case "size":
        return <td key={col.key} className="mono">{r.size || "—"}</td>;
      case "recoveryPlan":
        return <td key={col.key}>{r.recoveryPlan || "—"}</td>;
      case "lastTest":
        return <td key={col.key}>{r.lastTest || "—"}</td>;
      case "retention":
        return <td key={col.key}>{r.retention || "—"}</td>;
      case "lastScan":
        return <td key={col.key}>{r.lastScan || "—"}</td>;
      case "policy":
        return <td key={col.key}>{r.policy || "—"}</td>;
      case "infected":
        return (
          <td key={col.key}>
            <span className={cn("rpma-est-st", r.infected === "Clean" && "is-ok", r.infected === "Threat" && "is-bad")}>
              {r.infected || "—"}
            </span>
          </td>
        );
      default:
        return <td key={col.key}>—</td>;
    }
  }

  return (
    <div className={cn("rpma-est", compact && "is-compact")}>
      <header className="rpma-eco-head">
        <div className="rpma-eco-head-row">
          <RagBadge rag={dormant ? "Off" : customer.healthRag} title={customer.healthSummary} />
          <div>
            <h2>{customer.displayName}</h2>
            <p>{DECK_TITLE[focus]} · last collect {formatSastDateTime(lastCollect)}</p>
          </div>
          {focus === "eco" ? <TenantAccessCard customerCode={customer.customerCode} /> : null}
        </div>
        {dormant && focus === "eco" ? (
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
        {focus === "eco" ? (
          <div className="rpma-cmd-banners">
            {banners.map((s) => (
              <SpaLink
                key={s.name}
                href={s.href}
                className={cn(
                  "rpma-cmd-banner",
                  s.on ? "is-on" : "is-off",
                  (s.rag === "Red" || s.rag === "Amber") && `is-alert is-${String(s.rag).toLowerCase()}`,
                )}
                data-rag={s.rag}
              >
                <i style={{ background: s.bar }} />
                <StatusRobot rag={s.rag} title={s.name} size={14} />
                <div>
                  <strong>{s.name}</strong>
                  <span>{s.on ? s.bits.join(" · ") : "No Cover"}</span>
                </div>
                <CoverTag on={s.on} />
              </SpaLink>
            ))}
          </div>
        ) : null}
      </header>

      <div className="rpma-est-focus">
        <div className="rpma-est-scroll">
          <table className="rpma-est-table">
            <thead>
              <tr>
                <th className="w-star" />
                {cols.map((c) => (
                  <th key={c.key} className={cn(c.wide && "col-wide", c.center && "center")}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="rpma-est-empty">
                    {emptyLabel}
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
                    {cols.map((c) => cell(r, c, i))}
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
              aria-label="Compact table"
            />
          </label>
        </footer>
      </div>

      <div className="rpma-est-focus rpma-ams-cov">
        <div className="rpma-ams-cov-h">
          {focus === "eco" ? "AMS Coverage" : `${DECK_TITLE[focus]} Modules`}
        </div>
        <div className="rpma-cmd-heat" aria-label={focus === "eco" ? "AMS Coverage" : "Service Modules"}>
          {heatAll
            .filter((h) => h.on || h.href.includes("/epp"))
            .map((h) => (
            <SpaLink
              key={h.label}
              href={h.href}
              className={cn(
                "rpma-cmd-cell",
                `is-${h.tone}`,
                (h.tone === "red" || h.tone === "amber") && "is-alert",
              )}
              data-rag={h.on ? h.rag : "Off"}
            >
              <em>{h.label}</em>
              <strong>{!h.on ? "No Cover" : h.rag === "Off" ? "Cover" : String(h.rag)}</strong>
            </SpaLink>
          ))}
          {heatAll.filter((h) => h.on || h.href.includes("/epp")).length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-muted">No modules on cover for this service.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
