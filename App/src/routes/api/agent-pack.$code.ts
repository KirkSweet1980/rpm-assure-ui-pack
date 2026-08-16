import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth/verify.server";
import { buildCustomerAgentZip } from "@/lib/agent/build-customer-pack";

export const Route = createFileRoute("/api/agent-pack/$code")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const user = await getSessionUser();
        if (!user) {
          return new Response("Sign in required", { status: 401 });
        }
        try {
          const pack = await buildCustomerAgentZip(params.code);
          if (!pack) {
            return new Response("Unknown customer", { status: 404 });
          }
          return new Response(new Uint8Array(pack.bytes), {
            status: 200,
            headers: {
              "content-type": "application/zip",
              "content-disposition": `attachment; filename="${pack.fileName}"`,
              "cache-control": "no-store",
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
