import type { HealthRag } from "./types";

/**
 * One scoring story for the whole app.
 * Green ≥ 80 · Amber 55–79 · Red ≤ 54
 * A tenant cannot paint Red unless the worst covered service is Red.
 */
export const SCORE_GREEN_AT = 80;
export const SCORE_AMBER_AT = 55;

export type ScoreTone = "green" | "amber" | "red";

export function ragFromScorePct(score: number): HealthRag {
  if (score >= SCORE_GREEN_AT) return "Green";
  if (score >= SCORE_AMBER_AT) return "Amber";
  return "Red";
}

export function toneFromRag(rag: HealthRag | "Off" | null | undefined): ScoreTone {
  if (rag === "Red") return "red";
  if (rag === "Amber") return "amber";
  return "green";
}

/** Keep the number inside the band of the worst service RAG. */
export function floorScoreToRag(score: number, worst: HealthRag | "Off" | null | undefined): number {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const rag: HealthRag = worst === "Red" ? "Red" : worst === "Amber" ? "Amber" : "Green";
  if (rag === "Green") return Math.max(SCORE_GREEN_AT, s);
  if (rag === "Amber") return Math.min(SCORE_GREEN_AT - 1, Math.max(SCORE_AMBER_AT, s));
  return Math.min(SCORE_AMBER_AT - 1, s);
}

/** Colour from worst service, never from a raw number that drifted. */
export function assuranceTone(
  score: number,
  worst?: HealthRag | "Off" | null,
): ScoreTone {
  if (worst === "Red" || worst === "Amber" || worst === "Green") {
    return toneFromRag(worst);
  }
  return toneFromRag(ragFromScorePct(score));
}

export function combineRag(a: HealthRag, b: HealthRag): HealthRag {
  if (a === "Red" || b === "Red") return "Red";
  if (a === "Amber" || b === "Amber") return "Amber";
  if (a === "Off" && b === "Off") return "Off";
  if (a === "Off") return b;
  if (b === "Off") return a;
  return "Green";
}
