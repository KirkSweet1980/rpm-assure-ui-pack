/**
 * Cove Executive Summary Report model.
 * Layout matches N-able / Cove ESR (UVSS July 2026 sample).
 */
import type { CoveDeviceRow, CustomerDetailPayload } from "./types";

export const COVE_SAFEGUARDS = [
  { id: "offsite", label: "Off-site cloud storage" },
  { id: "e2e", label: "End-to-end encryption" },
  { id: "immutable", label: "Immutable backup copy" },
  { id: "iso", label: "Secure ISO certified data-center" },
  { id: "soc2", label: "SOC2 compliant" },
  { id: "tfa", label: "2 factor authentication (2FA)" },
  { id: "keys", label: "Private & generated keys" },
  { id: "rbac", label: "Role-based access control" },
  { id: "creds", label: "Separate backup credentials" },
  { id: "retention", label: "Long-term retention" },
  { id: "isolation", label: "Data isolation & segmentation" },
] as const;

export type CoveEsrSlice = { label: string; count: number; pct: number };

export type CoveEsrMachine = {
  deviceName: string;
  machineName: string;
  kind: string;
  status: string;
  sizeLabel: string;
  durationLabel: string;
  lastSuccessLabel: string;
  rpoOk: boolean;
};

export type CoveEsr = {
  customerName: string;
  customerCode: string;
  periodLabel: string;
  generatedLabel: string;
  covered: boolean;
  safeguardsOn: number;
  safeguardsTotal: number;
  successPct: number | null;
  successCaption: string;
  dataBackedUpLabel: string;
  usedStorageLabel: string;
  avgBackupTimeLabel: string;
  deviceCount: number;
  okCount: number;
  failedCount: number;
  staleCount: number;
  rpoDailyPct: number | null;
  rpoLabel: string;
  restoreCaption: string;
  restoreSuccessPct: number | null;
  restoreCount: number;
  recoveryTested: number;
  recoverabilityPct: number | null;
  recoverabilityCount: number;
  assets: CoveEsrSlice[];
  deviceTypes: CoveEsrSlice[];
  retention: CoveEsrSlice[];
  machines: CoveEsrMachine[];
};

function durationLabel(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "—";
  if (sec < 60) return "< 1 min";
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = sec / 3600;
  return `${h >= 10 ? Math.round(h) : h.toFixed(1)} h`;
}

function bytesLabel(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 10 || i < 2 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

function hoursAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 36e5;
}

function slices(map: Map<string, number>, total: number): CoveEsrSlice[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      pct: total ? Math.round((count / total) * 1000) / 10 : 0,
    }));
}

function assetKind(d: CoveDeviceRow): string {
  const p = (d.physicality || "").toLowerCase();
  if (p.includes("virt") || p.includes("hyper") || p.includes("vmware") || p.includes("hyper-v")) {
    return "Virtual";
  }
  if (p.includes("work") || p.includes("laptop") || p.includes("desk")) return "Workstation";
  if (p.includes("phys")) return "Physical";
  return p ? d.physicality! : "Unclassified";
}

function deviceKind(d: CoveDeviceRow): string {
  const p = (d.physicality || "").toLowerCase();
  const n = `${d.deviceName || ""} ${d.machineName || ""}`.toLowerCase();
  if (p.includes("work") || p.includes("laptop") || n.includes("wks") || n.includes("laptop")) {
    return "Workstations";
  }
  return "Servers";
}

function monthRange(from: Date): string {
  const start = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(from.getFullYear(), from.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(start)} to ${fmt(end)}`;
}

export function buildCoveEsr(data: CustomerDetailPayload): CoveEsr {
  const c = data.customer;
  const cove = data.cove;
  const cs = cove?.summary;
  const rec = cove?.recovery ?? cs?.recovery ?? null;
  const devices = cove?.devices ?? [];
  const covered = Boolean(cove?.enabled || cs || devices.length);
  const ok = cs?.okCount ?? devices.filter((d) => {
    const s = (d.lastBackupStatus || "").toLowerCase();
    return s.includes("ok") || s.includes("success") || s.includes("complet");
  }).length;
  const failed = cs?.failedCount ?? 0;
  const stale = cs?.staleCount ?? 0;
  const denom = ok + failed;
  const successPct = denom > 0 ? Math.round((ok / denom) * 1000) / 10 : devices.length ? 100 : null;
  const successCaption =
    successPct == null
      ? "No backup jobs on latest collect"
      : successPct >= 99.5
        ? "Reliable and efficient data backup"
        : successPct >= 95
          ? "Within watch band"
          : "Below target — review failed jobs";

  const selected = devices.reduce((s, d) => s + (d.selectedBytes ?? d.usedBytes ?? 0), 0);
  const used = devices.reduce((s, d) => s + (d.usedBytes ?? 0), 0);
  const durs = devices
    .map((d) => d.backupDurationSec)
    .filter((n): n is number => n != null && Number.isFinite(n) && n >= 0 && n <= 86400);
  const avgDur = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : null;

  const within24 = devices.filter((d) => {
    const h = hoursAgo(d.lastSuccessTime);
    return h != null && h <= 24;
  }).length;
  const rpoDailyPct = devices.length ? Math.round((within24 / devices.length) * 1000) / 10 : null;

  const tOk = rec?.testSuccessCount ?? 0;
  const tFail = rec?.testFailedCount ?? 0;
  const restoreCount = tOk + tFail;
  const restoreSuccessPct = restoreCount > 0 ? Math.round((tOk / restoreCount) * 1000) / 10 : null;
  const restoreCaption =
    restoreCount === 0
      ? "Not applicable as no restores were initiated"
      : restoreSuccessPct != null && restoreSuccessPct >= 95
        ? "Restores completed successfully"
        : "Restore tests need review";

  const recoverable = devices.filter((d) => {
    const st = (d.recoveryTestStatus || "").toLowerCase();
    const plan = d.recoveryPlanType ?? 0;
    return plan > 0 || st.includes("success") || st.includes("pass");
  }).length;
  const recoverabilityPct = devices.length
    ? Math.round((recoverable / devices.length) * 1000) / 10
    : null;

  const assets = new Map<string, number>();
  const types = new Map<string, number>();
  const ret = new Map<string, number>();
  for (const d of devices) {
    const a = assetKind(d);
    assets.set(a, (assets.get(a) || 0) + 1);
    const t = deviceKind(d);
    types.set(t, (types.get(t) || 0) + 1);
    const pol = (d.retentionPolicy || d.retentionFiles || "Unassigned").trim() || "Unassigned";
    ret.set(pol, (ret.get(pol) || 0) + 1);
  }

  const snap = cs?.asOfDate || cs?.lastImportAt || devices[0]?.snapshotDate;
  const period = snap ? monthRange(new Date(snap)) : monthRange(new Date());

  const machines: CoveEsrMachine[] = devices
    .map((d) => {
      const h = hoursAgo(d.lastSuccessTime);
      const st = (d.lastBackupStatus || "").trim() || "Unknown";
      return {
        deviceName: (d.deviceName || "").trim() || "—",
        machineName: (d.machineName || "").trim() || (d.deviceName || "").trim() || "—",
        kind: deviceKind(d) === "Workstations" ? "Workstation" : "Server",
        status: st,
        sizeLabel: bytesLabel(d.usedBytes ?? d.selectedBytes ?? 0),
        durationLabel: durationLabel(d.backupDurationSec ?? null),
        lastSuccessLabel: d.lastSuccessTime
          ? new Date(d.lastSuccessTime).toLocaleString("en-ZA", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
        rpoOk: h != null && h <= 24,
      };
    })
    .sort((a, b) => a.machineName.localeCompare(b.machineName, "en"));

  return {
    customerName: c.displayName,
    customerCode: c.customerCode,
    periodLabel: period,
    generatedLabel: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    covered,
    safeguardsOn: covered ? COVE_SAFEGUARDS.length : 0,
    safeguardsTotal: COVE_SAFEGUARDS.length,
    successPct,
    successCaption,
    dataBackedUpLabel: bytesLabel(selected || used),
    usedStorageLabel: bytesLabel(used || selected),
    avgBackupTimeLabel: durationLabel(avgDur),
    deviceCount: cs?.deviceCount ?? devices.length,
    okCount: ok,
    failedCount: failed,
    staleCount: stale,
    rpoDailyPct,
    rpoLabel: "Daily (Every 24 hours)",
    restoreCaption,
    restoreSuccessPct,
    restoreCount,
    recoveryTested: rec?.recoveryTestingCount ?? recoverable,
    recoverabilityPct,
    recoverabilityCount: recoverable,
    assets: slices(assets, devices.length),
    deviceTypes: slices(types, devices.length),
    retention: slices(ret, devices.length),
    machines,
  };
}
