import { createFileRoute } from "@tanstack/react-router";
import { cronSecretOk, runReportSlot } from "@/lib/mail/report-schedule";
import type { ReportScheduleSlot } from "@/lib/settings/types";

function slotOf(url: URL): ReportScheduleSlot {
  const raw = (url.searchParams.get("slot") || "").toLowerCase();
  if (raw === "daily" || raw === "weekly" || raw === "monthly") return raw;
  const now = new Date();
  const sast = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
  if (sast.getDate() === 1) return "monthly";
  if (sast.getDay() === 5) return "weekly";
  return "daily";
}

function secretOf(req: Request, url: URL): string {
  const q = url.searchParams.get("secret") || "";
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return q || bearer;
}

async function handle(req: Request) {
  const url = new URL(req.url);
  if (!cronSecretOk(secretOf(req, url))) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const slot = slotOf(url);
  const result = await runReportSlot(slot);
  return new Response(JSON.stringify(result), {
    status: result.ok || result.sent > 0 ? 200 : 422,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/cron/weekly-report")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
