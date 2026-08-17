export type DriveBus = "NVMe" | "SAS" | "SSD" | "SATA";

/** Physical bus/media from Windows label first, else IOPS + latency signature. */
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

  if (lat != null) {
    if (lat <= 0.45) return "NVMe";
    if (lat <= 2.2) return "SSD";
    if (lat <= 6.5 && (iops >= 180 || lat <= 5)) return "SAS";
    if (lat >= 7.5) return "SATA";
  }
  if (iops >= 10000) return "NVMe";
  if (iops >= 2500) return "SSD";
  if (iops >= 400) return "SAS";
  if (iops >= 40) return "SATA";
  return null;
}

export function busToKind(bus: DriveBus | null, fallback: DriveKind): DriveKind {
  if (bus === "NVMe") return "nvme";
  if (bus === "SAS") return "sas-ssd";
  if (bus === "SSD") return "sata-ssd";
  if (bus === "SATA") return "sata-hdd";
  return fallback;
}