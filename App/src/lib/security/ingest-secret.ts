import { timingSafeEqual } from "node:crypto";

function headerSecret(request: Request): string {
  return (
    request.headers.get("x-assure-secret") ||
    request.headers.get("x-agent-secret") ||
    request.headers.get("x-pulseway-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  ).trim();
}

function envList(...keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const v = (process.env[k] || "").trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function sameSecret(got: string, want: string): boolean {
  const a = Buffer.from(got, "utf8");
  const b = Buffer.from(want, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function ingestConfigured(kind: "iops" | "agent"): boolean {
  return secretsFor(kind).length > 0;
}

function secretsFor(kind: "iops" | "agent"): string[] {
  if (kind === "iops") {
    return envList(
      "RPM_ASSURE_IOPS_SECRET",
      "RPM_ASSURE_IOPS_SECRET_PREV",
      "PULSEWAY_WEBHOOK_SECRET",
      "RPM_ASSURE_INGEST_SECRET",
    );
  }
  return envList(
    "RPM_ASSURE_AGENT_SECRET",
    "RPM_ASSURE_IOPS_SECRET",
    "RPM_ASSURE_INGEST_SECRET",
  );
}

/** Timing-safe check against the configured secret set. */
export function authorizeIngest(request: Request, kind: "iops" | "agent"): boolean {
  const got = headerSecret(request);
  if (!got) return false;
  let ok = false;
  for (const want of secretsFor(kind)) {
    if (sameSecret(got, want)) ok = true;
  }
  return ok;
}
