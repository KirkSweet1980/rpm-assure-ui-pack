import fs from "node:fs";
import path from "node:path";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-audit-NxU6BQp5.js
/**
* Lightweight admin audit log (JSONL on app host).
* Who did what in Settings → Users / platform actions.
*/
var FILE = "admin-audit.jsonl";
var MAX_LINES = 2e3;
function auditPath() {
	return path.join(process.cwd(), "data", FILE);
}
function appendAdminAudit(entry) {
	try {
		const dir = path.join(process.cwd(), "data");
		fs.mkdirSync(dir, { recursive: true });
		const row = {
			atUtc: entry.atUtc ?? (/* @__PURE__ */ new Date()).toISOString(),
			actorEmail: entry.actorEmail || "unknown",
			action: entry.action,
			target: entry.target,
			detail: entry.detail,
			ok: entry.ok
		};
		fs.appendFileSync(auditPath(), JSON.stringify(row) + "\n", "utf8");
	} catch (e) {
		console.warn("[admin-audit] append failed", e);
	}
}
function readAdminAudit(limit = 200) {
	try {
		const p = auditPath();
		if (!fs.existsSync(p)) return [];
		const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);
		if (lines.length > MAX_LINES) {
			const trimmed = lines.slice(-2e3);
			fs.writeFileSync(p, trimmed.join("\n") + "\n", "utf8");
			return trimmed.slice(-limit).map((l) => {
				try {
					return JSON.parse(l);
				} catch {
					return null;
				}
			}).filter(Boolean).reverse();
		}
		return lines.slice(-limit).map((l) => {
			try {
				return JSON.parse(l);
			} catch {
				return null;
			}
		}).filter(Boolean).reverse();
	} catch {
		return [];
	}
}
//#endregion
export { appendAdminAudit, readAdminAudit };
