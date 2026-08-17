export type DriveKind = "nvme" | "sata-ssd" | "sata-hdd" | "sas-ssd" | "sas-hdd" | "virtual" | "unknown";
export type DriveBus = "NVMe" | "SAS" | "SSD" | "SATA";

export const DRIVE_STATS: Record<DriveKind, { label: string; iops: number; latencyMs: number }> = {
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
  if (/fixed hard disk/.test(m)) return "sata-hdd";
  return "unknown";
}

/** Host-aware kind for IOPS chips when the volume has no media string. */
export function resolveDriveKind(opts: {
  media?: string | null;
  hostKind?: "virtual" | "physical" | "unknown" | null;
  totalIops?: number | null;
  readLatencyMs?: number | null;
  writeLatencyMs?: number | null;
}): DriveKind {
  const reported = classifyDrive(opts.media);
  if (reported !== "unknown") return reported;
  const bus = inferDriveBus({
    media: opts.media,
    totalIops: opts.totalIops,
    readLatencyMs: opts.readLatencyMs,
    writeLatencyMs: opts.writeLatencyMs,
  });
  if (bus) return busToKind(bus, opts.hostKind === "virtual" ? "virtual" : "unknown");
  if (opts.hostKind === "virtual") return "virtual";
  if (opts.hostKind === "physical") return "sata-ssd";
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

/** Physical bus from Windows label first, else IOPS + latency signature. */
export function inferDriveBus(opts: {
  media?: string | null;
  totalIops?: number | null;
  readLatencyMs?: number | null;
  writeLatencyMs?: number | null;
}): DriveBus | null {
  const kind = classifyDrive(opts.media);
  if (kind === "nvme") return "NVMe";
  if (kind === "sas-ssd" || kind === "sas-hdd") return "SAS";
  if (kind === "sata-ssd") return "SSD";
  if (kind === "sata-hdd") return "SATA";

  const iops = Number(opts.totalIops) || 0;
  const lats = [opts.readLatencyMs, opts.writeLatencyMs].filter(
    (n): n is number => n != null && Number.isFinite(n) && n > 0,
  );
  const lat = lats.length ? Math.min(...lats) : null;
  const virtual = kind === "virtual" || kind === "unknown";

  // Latency is the tell. IOPS on an idle volume must not become "SATA".
  if (lat != null) {
    if (lat <= 0.45) return "NVMe";
    if (lat <= 2.5) return "SSD";
    if (lat <= 5.5) return virtual ? "SSD" : "SAS";
    if (lat >= 10) return "SATA";
    return virtual ? "SSD" : "SAS";
  }
  if (iops >= 10000) return "NVMe";
  if (iops >= 2500) return "SSD";
  if (iops >= 800) return virtual ? "SSD" : "SAS";
  return null;
}

export function busToKind(bus: DriveBus | null, fallback: DriveKind): DriveKind {
  if (bus === "NVMe") return "nvme";
  if (bus === "SAS") return "sas-ssd";
  if (bus === "SSD") return "sata-ssd";
  if (bus === "SATA") return "sata-hdd";
  return fallback;
}
