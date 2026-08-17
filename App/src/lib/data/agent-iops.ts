/** Demo / seed hosts must never appear in an IOPS window. */
export function isSampleIopsHost(hostName: string | null | undefined): boolean {
  const h = String(hostName ?? "").trim();
  if (!h) return true;
  return /^(DEMO[-_]?|SAMPLE[-_]?|TEST[-_]?|FAKE[-_])/i.test(h);
}

export function keepLiveIops<T extends { hostName?: string | null }>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((r) => !isSampleIopsHost(r.hostName));
}

export {
  DRIVE_STATS,
  classifyDrive,
  expectedIopsForMedia,
  expectedLatencyMsForMedia,
  iopsBand,
} from "./drive-stats";
export type { DriveKind, IopsBand } from "./drive-stats";
