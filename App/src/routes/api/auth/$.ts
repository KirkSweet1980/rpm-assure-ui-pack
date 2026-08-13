import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { ensureBootstrapAdmin } from "@/lib/auth/bootstrap-admin";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await ensureBootstrapAdmin();
        return auth.handler(request);
      },
      POST: async ({ request }) => {
        await ensureBootstrapAdmin();
        return auth.handler(request);
      },
    },
  },
});
