import { createFileRoute } from "@tanstack/react-router";
import { buildReportPreview } from "@/lib/mail/report-build";

/**
 * Reliable JSON endpoint for AMS report preview.
 * GET  /api/report-preview?format=day-end&customer=UVSS&fields=health_rag,rmm_fleet
 * POST /api/report-preview  { "format":"custom-pack", "customerCode":"UVSS", "fields":["..."] }
 */
export const Route = createFileRoute("/api/report-preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const format = url.searchParams.get("format") || "ams-full";
        const customerCode =
          url.searchParams.get("customer") ||
          url.searchParams.get("customerCode") ||
          undefined;
        const fields =
          url.searchParams.get("fields") ||
          url.searchParams.get("sections") ||
          undefined;
        const result = await buildReportPreview({ format, customerCode, fields });
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 400,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
      POST: async ({ request }) => {
        let body: {
          format?: string;
          customerCode?: string;
          customer?: string;
          fields?: string[] | string;
          sections?: string[] | string;
        } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* empty body ok */
        }
        const result = await buildReportPreview({
          format: body.format,
          customerCode: body.customerCode || body.customer,
          fields: body.fields ?? body.sections,
        });
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 400,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
