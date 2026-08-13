import type { RagThresholdConfig } from "@/lib/settings/types";
import { DEFAULT_RAG } from "@/lib/settings/types";
import { healthFor } from "./health-rag";

export type LiveRagSample = {
  customerCode: string;
  displayName: string;
  active: boolean;
  jobErrors: number;
  dtrVarLines: number;
  opsCount: number;
  hoursSinceOps: number | null;
};

export type RagTuneResult = {
  suggested: RagThresholdConfig;
  rationale: string[];
  samples: Array<
    LiveRagSample & {
      currentRag: string;
      suggestedRag: string;
    }
  >;
  estate: {
    activeCount: number;
    withCollect: number;
    maxJobErrors: number;
    p75JobErrors: number;
    maxDtr: number;
    maxHoursSinceOps: number | null;
  };
};

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0]!;
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo]!;
  const w = idx - lo;
  return sortedAsc[lo]! * (1 - w) + sortedAsc[hi]! * w;
}

/**
 * Derive RAG thresholds from live estate samples (no code deploy).
 *
 * Goals for ExCo / AMS:
 * - Amber = watch (any material job noise or FinSight Out of Balance)
 * - Red = needs attention this week (outlier job volume)
 * - Don't paint whole estate Red if baseline Out of Balance is chronically high
 * - Stale collect reflects schedule (15 min) with operational buffer
 */
export function suggestRagFromSamples(
  samples: LiveRagSample[],
  current?: Partial<RagThresholdConfig> | null,
): RagTuneResult {
  const base = { ...DEFAULT_RAG, ...(current ?? {}) };
  const active = samples.filter((s) => s.active);
  const withCollect = active.filter((s) => s.opsCount > 0 || s.hoursSinceOps != null);
  const jobSeries = active.map((s) => s.jobErrors).sort((a, b) => a - b);
  const jobNonZero = jobSeries.filter((j) => j > 0);
  const dtrSeries = active.map((s) => s.dtrVarLines).sort((a, b) => a - b);
  const hourSeries = active
    .map((s) => s.hoursSinceOps)
    .filter((h): h is number => h != null && Number.isFinite(h))
    .sort((a, b) => a - b);

  const maxJob = jobSeries.length ? jobSeries[jobSeries.length - 1]! : 0;
  const p75Job = Math.round(percentile(jobSeries, 0.75));
  const p90Job = Math.round(percentile(jobSeries, 0.9));
  const maxDtr = dtrSeries.length ? dtrSeries[dtrSeries.length - 1]! : 0;
  const p75Dtr = Math.round(percentile(dtrSeries, 0.75));
  const maxHours = hourSeries.length ? hourSeries[hourSeries.length - 1]! : null;
  const p50Hours = hourSeries.length ? percentile(hourSeries, 0.5) : null;

  const rationale: string[] = [];

  // Job amber: default 1; soften for small estates with only mid-single-digit noise
  let amberFrom = 1;
  if (jobNonZero.length >= 2 && maxJob > 0 && maxJob < 10) {
    // e.g. UVSS=3, AHIC=6 → Amber from 4 so quieter site stays Green on jobs
    const sortedNz = [...jobNonZero].sort((a, b) => a - b);
    const secondWorst = sortedNz[sortedNz.length - 2]!;
    amberFrom = Math.max(1, secondWorst + 1);
    rationale.push(
      `Job Amber from ${amberFrom}: estate max job errors = ${maxJob} (<10). Sites at ≤${secondWorst} stay Green on jobs; mid-band = Amber.`,
    );
  } else if (jobNonZero.length >= 2) {
    const minNz = Math.min(...jobNonZero);
    if (minNz >= 5 && maxJob <= minNz * 2) {
      amberFrom = Math.max(1, minNz);
      rationale.push(
        `Job Amber from ${amberFrom}: all sites with errors sit near a floor (~${minNz}); treat below as normal noise.`,
      );
    } else {
      rationale.push(
        `Job Amber from 1: any job error is a watch signal (min non-zero = ${minNz || 0}).`,
      );
    }
  } else if (jobNonZero.length === 1) {
    rationale.push(
      `Job Amber from 1: single site with ${jobNonZero[0]} error(s); keep early watch signal.`,
    );
  } else {
    rationale.push("Job Amber from 1: no job errors on active customers today.");
  }

  // Job red: above typical estate — between p75*1.5 and max+buffer, floor 5
  let redAt = Math.max(5, Math.ceil(Math.max(p75Job * 1.5, p90Job + 1, maxJob > 0 ? maxJob + 1 : 5)));
  // If max is small (e.g. 6), keep classic AMS bar of 10 so mid-single digits stay Amber
  if (maxJob > 0 && maxJob < 10) {
    redAt = Math.max(10, redAt);
    rationale.push(
      `Job Red at ${redAt}: max live errors = ${maxJob} (estate still mid-single digits) — Red stays a material bar, not "anyone with jobs".`,
    );
  } else if (maxJob >= 10) {
    // Ensure current worst is at least Amber, and ideally Red if clear outlier
    const second = jobSeries.length >= 2 ? jobSeries[jobSeries.length - 2]! : 0;
    if (maxJob >= second * 2 && maxJob >= 10) {
      redAt = Math.max(10, Math.ceil((second + maxJob) / 2));
      rationale.push(
        `Job Red at ${redAt}: worst site (${maxJob}) is an outlier vs next (${second}).`,
      );
    } else {
      redAt = Math.max(10, Math.ceil(p75Job * 1.5) || 10);
      rationale.push(
        `Job Red at ${redAt}: p75=${p75Job}, p90=${p90Job}, max=${maxJob} across ${active.length} active customer(s).`,
      );
    }
  } else {
    redAt = 10;
    rationale.push("Job Red at 10: clean estate — keep standard AMS threshold.");
  }
  if (amberFrom >= redAt) amberFrom = Math.max(0, redAt - 1);

  // Out of Balance: chronic Out of Balance is common on unreconciled sites — Amber yes, Red only at extreme
  const dtrVarianceIsAmber = true;
  let dtrVarianceRedAt = 0;
  if (maxDtr > 0) {
    if (maxDtr >= 100 && p75Dtr >= 50) {
      dtrVarianceRedAt = Math.max(100, Math.ceil(p75Dtr * 2));
      rationale.push(
        `FinSight Red at ${dtrVarianceRedAt} lines (optional hard Red): chronic Out of Balance present (max ${maxDtr}, p75 ${p75Dtr}). Any Out of Balance still Amber.`,
      );
    } else {
      dtrVarianceRedAt = 0;
      rationale.push(
        `FinSight Red off (0): max Out of Balance lines = ${maxDtr} — keep as Amber control signal, not Red outage.`,
      );
    }
  } else {
    rationale.push("Out of Balance: no out-of-balance lines on sampled modules — Amber-on-variance stays on for early warning.");
  }

  // Collect stale: 15-min schedule → 24h board when estate is sub-hour fresh
  let collectStaleHours = base.collectStaleHours || 48;
  if (p50Hours != null && maxHours != null) {
    if (maxHours < 2) {
      collectStaleHours = 24;
      rationale.push(
        `Collect stale at 24h: live ages are sub-hour (max ~${maxHours.toFixed(1)}h); 15-min schedule is healthy.`,
      );
    } else {
      const opsStale = Math.max(6, Math.ceil(p50Hours * 3 + 1));
      collectStaleHours = Math.min(72, Math.max(24, opsStale));
      rationale.push(
        `Collect stale at ${collectStaleHours}h: median age ~${p50Hours.toFixed(1)}h, max ~${maxHours.toFixed(1)}h.`,
      );
    }
  } else {
    collectStaleHours = 48;
    rationale.push("Collect stale at 48h: limited last-import samples — keep board default.");
  }

  const suggested: RagThresholdConfig = {
    jobErrorsRedAt: redAt,
    jobErrorsAmberFrom: amberFrom,
    dtrVarianceIsAmber,
    dtrVarianceRedAt,
    noOperatorsIsAmber: true,
    collectStaleHours,
  };

  const samplesOut = samples.map((s) => {
    const cur = healthFor(
      {
        operatorCount: s.opsCount,
        jobErrorCount: s.jobErrors,
        dtrVariance: s.dtrVarLines,
      },
      base,
    );
    const sug = healthFor(
      {
        operatorCount: s.opsCount,
        jobErrorCount: s.jobErrors,
        dtrVariance: s.dtrVarLines,
      },
      suggested,
    );
    return {
      ...s,
      currentRag: cur.rag,
      suggestedRag: sug.rag,
    };
  });

  return {
    suggested,
    rationale,
    samples: samplesOut,
    estate: {
      activeCount: active.length,
      withCollect: withCollect.length,
      maxJobErrors: maxJob,
      p75JobErrors: p75Job,
      maxDtr,
      maxHoursSinceOps: maxHours,
    },
  };
}
