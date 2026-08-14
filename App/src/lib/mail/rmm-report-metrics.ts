import type { RmmDeviceRow, RmmOrgSummary } from "@/lib/data/types";
import { isRmmServer, isRmmWorkstation } from "@/lib/data/rmm-device-class";

function num(n: number | null | undefined): number | null {
  return n == null || !Number.isFinite(Number(n)) ? null : Number(n);
}

function avg(vals: Array<number | null | undefined>): number | null {
  const xs = vals.map(num).filter((n): n is number => n != null);
  if (!xs.length) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}

function pct(n: number, d: number): number | null {
  if (!d) return null;
  return Math.round((n / d) * 1000) / 10;
}

export function splitRmmDevices(devices: RmmDeviceRow[] | undefined) {
  const all = Array.isArray(devices) ? devices : [];
  return {
    all,
    servers: all.filter((d) => isRmmServer(d)),
    workstations: all.filter((d) => isRmmWorkstation(d)),
  };
}

export function availabilityOf(list: RmmDeviceRow[]) {
  const online = list.filter((d) => d.isOnline === true).length;
  const offline = list.filter((d) => d.isOnline === false).length;
  const known = online + offline;
  return {
    online,
    offline,
    known,
    onlinePctNow: pct(online, known),
    avgOnlinePct: avg(list.map((d) => d.onlinePct)),
    offlineHours7d: avg(list.map((d) => d.offlineHours7d)),
    offlineHours30d: avg(list.map((d) => d.offlineHours30d)),
    maxRebootDays: (() => {
      const xs = list.map((d) => num(d.daysSinceReboot)).filter((n): n is number => n != null);
      return xs.length ? Math.max(...xs) : null;
    })(),
  };
}

export function patchOf(list: RmmDeviceRow[]) {
  const reporting = list.filter((d) => d.patchMissing != null || d.patchInstalled != null);
  const compliant = reporting.filter((d) => (d.patchMissing ?? 0) === 0).length;
  const missing = reporting.reduce((s, d) => s + (d.patchMissing ?? 0), 0);
  const pending = reporting.reduce((s, d) => s + (d.patchPending ?? 0), 0);
  return {
    reporting: reporting.length,
    compliant,
    compliancePct: pct(compliant, reporting.length),
    missing,
    pending,
    offenders: [...reporting].sort((a, b) => (b.patchMissing ?? 0) - (a.patchMissing ?? 0)),
  };
}

export function capacityOf(list: RmmDeviceRow[]) {
  const disks = list.flatMap((d) => d.disks ?? []);
  const atRisk = disks.filter((v) => (v.usedPct ?? 0) >= 85);
  const cpuHot = list.filter((d) => (d.cpuPct ?? 0) >= 80).length;
  const memHot = list.filter((d) => (d.memoryPct ?? 0) >= 85).length;
  return {
    diskUsedGb: sum(list.map((d) => d.diskUsedGb)),
    diskFreeGb: sum(list.map((d) => d.diskFreeGb)),
    diskTotalGb: sum(list.map((d) => d.diskTotalGb)),
    volumes: disks.length,
    atRiskVolumes: atRisk.length,
    avgCpu: avg(list.map((d) => d.cpuPct)),
    avgMem: avg(list.map((d) => d.memoryPct)),
    cpuHot,
    memHot,
    maxIops: (() => {
      const xs = list.map((d) => num(d.diskIopsMax)).filter((n): n is number => n != null);
      return xs.length ? Math.max(...xs) : null;
    })(),
  };
}

function sum(vals: Array<number | null | undefined>): number | null {
  const xs = vals.map(num).filter((n): n is number => n != null);
  if (!xs.length) return null;
  return Math.round(xs.reduce((a, b) => a + b, 0) * 10) / 10;
}

export function fmtN(n: number | null | undefined, suffix = ""): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n}${suffix}`;
}

export function rmmFreshness(summary: RmmOrgSummary | undefined | null): string {
  return summary?.lastImportAt || summary?.asOfDate || "";
}
