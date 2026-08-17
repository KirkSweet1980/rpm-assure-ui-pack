import type { CustomerCover } from "@/lib/data/cover";
import type { IndustryPillarKey } from "@/lib/data/sla-metrics";

export type SlaKpiOverrides = Partial<Record<IndustryPillarKey, number>>;

let kpiOverrides: SlaKpiOverrides | undefined;

export function withSlaKpis<T>(kpis: SlaKpiOverrides | undefined, fn: () => T): T {
  const prev = kpiOverrides;
  kpiOverrides = kpis;
  try {
    return fn();
  } finally {
    kpiOverrides = prev;
  }
}

export function slaKpiFor(pillar: IndustryPillarKey): number | undefined {
  return kpiOverrides?.[pillar];
}

export function kpisOnCover(
  cover: CustomerCover,
  kpis: Partial<Record<IndustryPillarKey, number>> | undefined,
): SlaKpiOverrides {
  const out: SlaKpiOverrides = {};
  if (!kpis) return out;
  const on: Record<IndustryPillarKey, boolean> = {
    syspro: Boolean(cover.syspro),
    rmm: Boolean(cover.rmm),
    cove: Boolean(cover.cove),
    epp: Boolean(cover.epp),
    csp: Boolean(cover.csp),
    tickets: true,
  };
  for (const k of Object.keys(on) as IndustryPillarKey[]) {
    if (!on[k]) continue;
    const n = Number(kpis[k]);
    if (Number.isFinite(n) && n > 0 && n <= 100) out[k] = Math.round(n * 10) / 10;
  }
  return out;
}
