import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import {
  ensureBootstrapAdmin,
  runAdminBootstrapNow,
} from "@/lib/auth/bootstrap-admin";

void ensureBootstrapAdmin();

function headerSecret(request: Request): string {
  return (
    request.headers.get("x-assure-bootstrap") ||
    request.headers.get("x-assure-secret") ||
    ""
  ).trim();
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  try {
    return timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

function bootstrapHttpAllowed(request: Request): boolean {
  const lock = String(process.env.RPM_ASSURE_BOOTSTRAP_LOCK ?? "1").trim().toLowerCase();
  const locked = lock === "" || ["1", "true", "yes", "on"].includes(lock);
  if (!locked) return true;
  const want = (process.env.RPM_ASSURE_BOOTSTRAP_SECRET || "").trim();
  if (!want) return false;
  const got = headerSecret(request);
  return Boolean(got) && same(got, want);
}

/**
 * GET/POST /api/bootstrap-admin — locked in production.
 * Requires header X-Assure-Bootstrap: <RPM_ASSURE_BOOTSTRAP_SECRET>
 * or RPM_ASSURE_BOOTSTRAP_LOCK=0 (emergency only).
 */
export const Route = createFileRoute("/api/bootstrap-admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!bootstrapHttpAllowed(request)) {
          return new Response(JSON.stringify({ ok: false, error: "not found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }
        const result = await runAdminBootstrapNow();
        return new Response(JSON.stringify({ ok: result.ok, message: result.message }), {
          status: result.ok ? 200 : 500,
          headers: { "content-type": "application/json" },
        });
      },
      POST: async ({ request }) => {
        if (!bootstrapHttpAllowed(request)) {
          return new Response(JSON.stringify({ ok: false, error: "not found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }
        const result = await runAdminBootstrapNow();
        return new Response(JSON.stringify({ ok: result.ok, message: result.message }), {
          status: result.ok ? 200 : 500,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
