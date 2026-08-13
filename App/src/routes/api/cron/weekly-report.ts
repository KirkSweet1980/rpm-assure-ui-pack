import { createFileRoute } from "@tanstack/react-router";

/**
 * Outbound weekly email disabled — use in-app Reports.
 */
function gone() {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Weekly email cron is disabled. Use Reports in the app.",
    }),
    {
      status: 410,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export const Route = createFileRoute("/api/cron/weekly-report")({
  server: {
    handlers: {
      GET: async () => gone(),
      POST: async () => gone(),
    },
  },
});
