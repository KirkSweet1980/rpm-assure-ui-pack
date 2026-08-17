import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";

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

function mimeOf(name: string): string {
  if (name.endsWith(".zip")) return "application/zip";
  if (name.endsWith(".ps1")) return "text/plain; charset=utf-8";
  return "text/plain; charset=utf-8";
}

export const Route = createFileRoute("/downloads/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = String((params as { _splat?: string; $?: string })._splat ?? (params as { $?: string }).$ ?? "");
        const name = raw.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "";
        if (!ALLOW.has(name)) return new Response("not found", { status: 404 });
        for (const root of ROOTS) {
          const full = path.join(root, name);
          if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            const buf = fs.readFileSync(full);
            return new Response(buf, {
              status: 200,
              headers: {
                "content-type": mimeOf(name),
                "cache-control": "no-store",
                "content-length": String(buf.length),
              },
            });
          }
        }
        return new Response("not found", { status: 404 });
      },
    },
  },
});
