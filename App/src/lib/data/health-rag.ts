import type { CustomerCover, HealthRag } from "./types";
import type { RagThresholdConfig } from "@/lib/settings/types";
import { DEFAULT_RAG } from "@/lib/settings/types";

/**
 * Default SYSPRO portfolio RAG thresholds (AMS Phase A).
 * Prefer Settings → RAG thresholds at runtime (no redeploy).
 */
export const HEALTH_RAG = { ...DEFAULT_RAG } as const;

export function healthFor(
  input: {
    operatorCount: number;
    jobErrorCount: number;
    dtrVariance: number;
    activeUserCount?: number;
    /** When true, empty operators does not force Amber (RMM-only / no SYSPRO) */
    skipNoOperatorsAmber?: boolean;
  },
  thresholds?: Partial<RagThresholdConfig> | null,
): { rag: HealthRag; summary: string } {
  const t: RagThresholdConfig = { ...DEFAULT_RAG, ...(thresholds ?? {}) };
  const ops = input.operatorCount;
  const jobs = input.jobErrorCount;
  const dtr = input.dtrVariance;
  const active = input.activeUserCount ?? 0;
  const redAt = Math.max(1, t.jobErrorsRedAt);
  const amberFrom = Math.max(0, Math.min(t.jobErrorsAmberFrom, redAt));

  if (jobs >= redAt) {
    return {
      rag: "Red",
      summary: `${jobs} SYSPRO job error(s) (threshold ≥ ${redAt}).`,
    };
  }

  if (t.dtrVarianceRedAt > 0 && dtr >= t.dtrVarianceRedAt) {
    return {
      rag: "Red",
      summary: `${dtr} FinSight variance line(s) (Red threshold ≥ ${t.dtrVarianceRedAt}).`,
    };
  }

  if (jobs >= amberFrom && jobs > 0) {
    return {
      rag: "Amber",
      summary: `${jobs} SYSPRO job error(s) — below Red threshold (${redAt}). Ops ${ops}.`,
    };
  }

  if (t.dtrVarianceIsAmber && dtr > 0) {
    return {
      rag: "Amber",
      summary: `${dtr} FinSight variance line(s). Operators: ${ops}.`,
    };
  }

  if (t.noOperatorsIsAmber && ops <= 0 && !input.skipNoOperatorsAmber) {
    return {
      rag: "Amber",
      summary: "No SYSPRO operator snapshot yet.",
    };
  }

  if (ops <= 0 && input.skipNoOperatorsAmber) {
    return {
      rag: "Green",
      summary: "No SYSPRO operator data (RMM / other pillars only).",
    };
  }

  return {
    rag: "Green",
    summary: `Healthy — ${ops} operators, ${active} active (30d), no job errors / FinSight variance.`,
  };
}

/** Pulseway / RMM device health for portfolio + ExCo */
export function rmmHealthFor(input: {
  deviceCount: number;
  offlineCount: number;
  criticalAlerts: number;
  elevatedAlerts?: number;
}): { rag: HealthRag; summary: string } {
  const devices = input.deviceCount || 0;
  const offline = input.offlineCount || 0;
  const critical = input.criticalAlerts || 0;
  const elevated = input.elevatedAlerts || 0;
  if (devices <= 0) {
    return { rag: "Green", summary: "No RMM devices mapped." };
  }
  if (critical > 0 || offline >= 5) {
    return {
      rag: "Red",
      summary: `RMM: ${offline} offline, ${critical} critical of ${devices} device(s).`,
    };
  }
  if (offline > 0 || elevated > 0) {
    return {
      rag: "Amber",
      summary: `RMM: ${offline} offline, ${elevated} elevated of ${devices} device(s).`,
    };
  }
  return {
    rag: "Green",
    summary: `RMM healthy — ${devices} online/monitored, no critical alerts.`,
  };
}

export function combineHealthRag(a: HealthRag, b: HealthRag): HealthRag {
  if (a === "Red" || b === "Red") return "Red";
  if (a === "Amber" || b === "Amber") return "Amber";
  return "Green";
}

export function ragSortKey(rag: HealthRag): number {
  return rag === "Red" ? 0 : rag === "Amber" ? 1 : 2;
}



/** Combine only pillars that are covered. Uncovered pillars do not affect RAG. */
export function finalizeEstateHealth(input: {
  cover: CustomerCover;
  syspro?: { rag: HealthRag; summary: string } | null;
  rmm?: { rag: HealthRag; summary: string } | null;
  cove?: { rag: HealthRag; summary: string } | null;
}): { rag: HealthRag; summary: string } {
  const parts: { rag: HealthRag; summary: string }[] = [];
  if (input.cover.syspro && input.syspro) parts.push(input.syspro);
  if (input.cover.rmm && input.rmm) parts.push(input.rmm);
  if (input.cover.cove && input.cove) parts.push(input.cove);
  if (parts.length === 0) {
    return {
      rag: "Amber",
      summary: "No cover — no SYSPRO, RMM, or Cyber Backup in scope for this customer.",
    };
  }
  let rag: HealthRag = "Green";
  for (const p of parts) {
    rag = combineHealthRag(rag, p.rag);
  }
  const bad = parts.filter((p) => p.rag !== "Green");
  if (bad.length === 0) {
    return {
      rag: "Green",
      summary: parts.map((p) => p.summary).filter(Boolean).slice(0, 2).join(" · ") || "Healthy across covered services.",
    };
  }
  return {
    rag,
    summary: bad.map((p) => p.summary).join(" · "),
  };
}

export function coveHealthFor(input: {
  deviceCount: number;
  failedCount: number;
  staleCount: number;
}): { rag: HealthRag; summary: string } {
  const n = input.deviceCount || 0;
  const failed = input.failedCount || 0;
  const stale = input.staleCount || 0;
  if (n <= 0) {
    return { rag: "Amber", summary: "Cyber Backup covered — no device snapshot yet." };
  }
  if (failed > 0) {
    return {
      rag: "Red",
      summary: `Cyber Backup: ${failed} failed of ${n} device(s).`,
    };
  }
  if (stale > 0) {
    return {
      rag: "Amber",
      summary: `Cyber Backup: ${stale} stale of ${n} device(s).`,
    };
  }
  return {
    rag: "Green",
    summary: `Cyber Backup healthy — ${n} device(s) OK.`,
  };
}


/** Map RAG to a 0–100 score for composite assurance / SLA estimates. */
export function ragToScorePct(rag: HealthRag | null | undefined): number | null {
  if (!rag) return null;
  if (rag === "Green") return 98;
  if (rag === "Amber") return 88;
  return 72;
}

/** Availability estimate from RAG (covered legs only — call after finalize). */
export function ragToAvailabilityPct(rag: HealthRag | null | undefined): number | null {
  if (!rag) return null;
  if (rag === "Green") return 99.7;
  if (rag === "Amber") return 99.2;
  return 98.5;
}

/** Health score chip 0–100 from estate RAG. */
export function healthScorePctFromRag(rag: HealthRag): number {
  return rag === "Green" ? 88 : rag === "Amber" ? 58 : 28;
}
