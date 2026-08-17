/** Demo / seed hosts must never appear in an IOPS window. */
export function isSampleIopsHost(hostName: string | null | undefined): boolean {
  const h = String(hostName ?? "").trim();
  if (!h) return true;
  return /^(DEMO[-_]?|SAMPLE[-_]?|TEST[-_]?|FAKE[-_])/i.test(h);
}

export function keepLiveIops<T extends { hostName?: string | null }>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((r) => !isSampleIopsHost(r.hostName));
}

/** Media baseline IOPS for a single volume — planning guide, not a signed SLA. */
export function expectedIopsForMedia(media: string | null | undefined): number {
  const m = String(media ?? "").toLowerCase();
  if (/nvme|optane/.test(m)) return 20000;
  if (/ssd|flash|solid/.test(m)) return 5000;
  if (/virtual|vhd|vhdx|msft virtual|hyper-v/.test(m)) return 800;
  if (/hdd|spin|mechanical|sata|sas/.test(m)) return 150;
  return 800;
}

export type IopsBand = "idle" | "healthy" | "busy" | "hot";

export function iopsBand(actual: number, expected: number, queue: number | null): IopsBand {
  if (!Number.isFinite(actual) || actual < 0.5) return "idle";
  if ((queue ?? 0) >= 4 || actual >= expected) return "hot";
  if (actual >= expected * 0.7 || (queue ?? 0) >= 2) return "busy";
  return "healthy";
}
