import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";

/**
 * Serve a Cove Continuity boot-console screenshot collected by
 * Collect-Cove-To-RPMAssure.ps1. Files live under the private data dir
 * (not public /downloads).
 */
const ROOTS = [
  "C:\\RPM-Assure\\data\\cove-recovery",
  "C:\\RPM-Assure\\downloads\\cove-recovery",
  path.join(process.cwd(), "data", "cove-recovery"),
];

export const Route = createFileRoute("/api/cove/screenshot/$accountId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { authConfigured, requireUserId } = await import("@/lib/auth/verify.server");
          if (authConfigured) await requireUserId();
        } catch {
          return new Response("unauthorized", { status: 401 });
        }
        const raw = String((params as { accountId?: string }).accountId ?? "").trim();
        if (!/^\d{1,20}$/.test(raw)) {
          return new Response("not found", { status: 404 });
        }
        const id = raw;
        const name = `${id}.png`;
        for (const root of ROOTS) {
          const full = path.join(root, name);
          if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            const buf = fs.readFileSync(full);
            return new Response(buf, {
              status: 200,
              headers: {
                "content-type": "image/png",
                "cache-control": "private, max-age=300",
                "content-length": String(buf.length),
                "content-disposition": `inline; filename="${name}"`,
              },
            });
          }
        }
        return new Response("not found", { status: 404 });
      },
    },
  },
});
