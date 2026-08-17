import type { VisionRetrievalConfig, VisionSourceId } from "@/lib/settings/types";
import { SOURCE_LABEL, VISION_CORPUS } from "./corpus";

const STOP = new Set(["the", "a", "an", "and", "or", "to", "of", "for", "in", "on", "is", "it", "we", "you", "me", "my", "can", "how", "what", "where", "do", "does"]);

function tokens(q: string) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

const PATH_SOURCE: { test: RegExp; source: VisionSourceId }[] = [
  { test: /\/ams\/sla|\/sla/, source: "sla" },
  { test: /ticket|incident|ams/, source: "tickets" },
  { test: /\/rmm/, source: "rmm" },
  { test: /\/epp/, source: "epp" },
  { test: /\/cove|\/backup/, source: "backup" },
  { test: /\/syspro/, source: "syspro" },
  { test: /\/csp/, source: "csp" },
];

export type RetrievedHit = {
  id: string;
  source: VisionSourceId;
  title: string;
  text: string;
  score: number;
};

export function retrieveVision(
  message: string,
  cfg: VisionRetrievalConfig,
  path?: string,
): RetrievedHit[] {
  if (!cfg.enabled) return [];
  const terms = tokens(message);
  if (!terms.length) return [];
  const phrase = message.toLowerCase();
  const pathBoost = new Set<VisionSourceId>();
  if (cfg.includePath && path) {
    for (const p of PATH_SOURCE) if (p.test.test(path)) pathBoost.add(p.source);
  }

  const hits: RetrievedHit[] = [];
  for (const chunk of VISION_CORPUS) {
    if (!cfg.sources[chunk.source]) continue;
    let score = 0;
    for (const k of chunk.keys) {
      if (phrase.includes(k)) score += 2.4;
    }
    const hay = `${chunk.title} ${chunk.text} ${chunk.keys.join(" ")}`.toLowerCase();
    for (const t of terms) {
      if (hay.includes(t)) score += 1;
    }
    if (pathBoost.has(chunk.source)) score += 0.8;
    if (score >= cfg.minScore) {
      hits.push({
        id: chunk.id,
        source: chunk.source,
        title: chunk.title,
        text: chunk.text,
        score: Math.round(score * 10) / 10,
      });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, cfg.topK);
}

export function composeVisionAnswer(
  hits: RetrievedHit[],
  path?: string,
  customer?: string,
  includePath?: boolean,
  includeCustomer?: boolean,
) {
  if (!hits.length) {
    return "I did not retrieve a strong match. Try SLA import, tickets, IOPS, EPP last scan, Cloud Backup, SYSPRO, cover, or agent deploy — or turn on more sources under Configuration → Vision.";
  }
  const body = hits
    .map((h, i) => `${i === 0 ? h.text : `${SOURCE_LABEL[h.source]} · ${h.title}: ${h.text}`}`)
    .join("\n\n");
  const ctx = [
    includeCustomer && customer ? `Customer ${customer}.` : "",
    includePath && path ? `You are on ${path}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return ctx ? `${body}\n\n${ctx}` : body;
}
