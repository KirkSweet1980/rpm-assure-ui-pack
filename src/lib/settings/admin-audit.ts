/**
 * Lightweight admin audit log (JSONL on app host).
 * Who did what in Settings → Users / platform actions.
 */
import fs from "node:fs";
import path from "node:path";

export type AdminAuditEntry = {
  atUtc: string;
  actorEmail: string;
  action: string;
  target?: string;
  detail?: string;
  ok: boolean;
};

const FILE = "admin-audit.jsonl";
const MAX_LINES = 2000;

function auditPath(): string {
  return path.join(process.cwd(), "data", FILE);
}

export function appendAdminAudit(entry: Omit<AdminAuditEntry, "atUtc"> & { atUtc?: string }): void {
  try {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const row: AdminAuditEntry = {
      atUtc: entry.atUtc ?? new Date().toISOString(),
      actorEmail: entry.actorEmail || "unknown",
      action: entry.action,
      target: entry.target,
      detail: entry.detail,
      ok: entry.ok,
    };
    fs.appendFileSync(auditPath(), JSON.stringify(row) + "\n", "utf8");
  } catch (e) {
    console.warn("[admin-audit] append failed", e);
  }
}

export function readAdminAudit(limit = 200): AdminAuditEntry[] {
  try {
    const p = auditPath();
    if (!fs.existsSync(p)) return [];
    const text = fs.readFileSync(p, "utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    // keep file from growing forever
    if (lines.length > MAX_LINES) {
      const trimmed = lines.slice(-MAX_LINES);
      fs.writeFileSync(p, trimmed.join("\n") + "\n", "utf8");
      return trimmed
        .slice(-limit)
        .map((l) => {
          try {
            return JSON.parse(l) as AdminAuditEntry;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .reverse() as AdminAuditEntry[];
    }
    return lines
      .slice(-limit)
      .map((l) => {
        try {
          return JSON.parse(l) as AdminAuditEntry;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse() as AdminAuditEntry[];
  } catch {
    return [];
  }
}
