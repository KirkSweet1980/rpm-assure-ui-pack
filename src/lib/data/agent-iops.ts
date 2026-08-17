/** Demo / seed hosts must never appear in an IOPS window. */
export function isSampleIopsHost(hostName: string | null | undefined): boolean {
  const h = String(hostName ?? "").trim();
  if (!h) return true;
  return /^(DEMO[-_]?|SAMPLE[-_]?|TEST[-_]?|FAKE[-_])/i.test(h);
}

export function keepLiveIops<T extends { hostName?: string | null }>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((r) => !isSampleIopsHost(r.hostName));
}

export type DriveKind = "nvme" | "sata-ssd" | "sata-hdd" | "sas-ssd" | "sas-hdd" | "virtual" | "unknown";

export const DRIVE_STATS: Record<
  DriveKind,
  { label: string; iops: number; latencyMs: number }
> = {
  nvme: { label: "NVMe", iops: 20000, latencyMs: 0.2 },
  "sata-ssd": { label: "SATA SSD", iops: 4000, latencyMs: 0.8 },
  "sata-hdd": { label: "SATA HDD", iops: 120, latencyMs: 12 },
  "sas-ssd": { label: "SAS SSD", iops: 8000, latencyMs: 0.4 },
  "sas-hdd": { label: "SAS HDD", iops: 200, latencyMs: 8 },
  virtual: { label: "Virtual", iops: 800, latencyMs: 5 },
  unknown: { label: "Unknown", iops: 800, latencyMs: 5 },
};

export function classifyDrive(media: string | null | undefined): DriveKind {
  const m = String(media ?? "").toLowerCase();
  if (/nvme|nvm express|optane/.test(m)) return "nvme";
  if (/virtual|vhd|vhdx|msft virtual|hyper-v|file.?back/.test(m)) return "virtual";
  const sas = /\bsas\b|scsi/.test(m);
  const sata = /\bsata\b|\bata\b/.test(m);
  const ssd = /ssd|flash|solid/.test(m);
  const hdd = /hdd|spin|mechanical|rotat|hard disk/.test(m);
  if (sas && ssd) return "sas-ssd";
  if (sas) return "sas-hdd";
  if (sata && ssd) return "sata-ssd";
  if (sata && hdd) return "sata-hdd";
  if (ssd) return "sata-ssd";
  if (hdd) return "sata-hdd";
  if (sata) return "sata-hdd";
  return "unknown";
}

export function expectedIopsForMedia(media: string | null | undefined): number {
  return DRIVE_STATS[classifyDrive(media)].iops;
}

export function expectedLatencyMsForMedia(media: string | null | undefined): number {
  return DRIVE_STATS[classifyDrive(media)].latencyMs;
}

export type IopsBand = "idle" | "healthy" | "busy" | "hot";

export function iopsBand(actual: number, expected: number, queue: number | null): IopsBand {
  if (!Number.isFinite(actual) || actual < 0.5) return "idle";
  if ((queue ?? 0) >= 4 || actual >= expected) return "hot";
  if (actual >= expected * 0.7 || (queue ?? 0) >= 2) return "busy";
  return "healthy";
}
