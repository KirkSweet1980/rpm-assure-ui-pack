import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";
import { authorizeIngest, ingestConfigured } from "@/lib/security/ingest-secret";

const ALLOW = new Set([
  "VERSION",
  "rpm-assure-agent.zip",
  "Deploy-Assure-Agent.ps1",
  "Onboard-IB-Syspro.ps1",
]);

const ROOTS = [
  "C:\\RPM-Assure\\downloads",
  "C:\\RPM-Assure\\App\\public\\downloads",
  "C:\\RPM-Assure\\deploy\\ui-pack\\public\\downloads",
];

export const Route = createFileRoute("/api/agent/pack")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const name = (url.searchParams.get("name") || "VERSION").trim();
        if (!ALLOW.has(name)) return Response.json({ ok: false, error: "unknown file" }, { status: 404 });
        const needSecret = name.endsWith(".zip") || name.endsWith(".ps1");
        if (needSecret) {
          if (!ingestConfigured("agent") || !authorizeIngest(request, "agent")) {
            return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
          }
        }
        for (const root of ROOTS) {
          const full = path.join(root, name);
          if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            const buf = fs.readFileSync(full);
            const type = name.endsWith(".zip") ? "application/zip" : "text/plain; charset=utf-8";
            return new Response(buf, {
              status: 200,
              headers: { "content-type": type, "cache-control": "no-store", "content-length": String(buf.length) },
            });
          }
        }
        return Response.json({ ok: false, error: "not published yet", name }, { status: 404 });
      },
    },
  },
});
