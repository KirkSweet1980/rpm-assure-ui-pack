import { createFileRoute } from "@tanstack/react-router";
import {
  ensureBootstrapAdmin,
  runAdminBootstrapNow,
} from "@/lib/auth/bootstrap-admin";

// Ensure admin exists when this module loads (every server boot).
void ensureBootstrapAdmin();

/**
 * GET /api/bootstrap-admin — create/reset Platform Admin from env or bootstrap file.
 * Does not return the password.
 */
export const Route = createFileRoute("/api/bootstrap-admin")({
  server: {
    handlers: {
      GET: async () => {
        const result = await runAdminBootstrapNow();
        return new Response(
          JSON.stringify({
            ...result,
            hint: "Sign in with username RPMAdmin (or rpmadmin@rpm.local). Password from admin-bootstrap.json / RPM_ASSURE_ADMIN_PASSWORD.",
          }),
          {
            status: result.ok ? 200 : 500,
            headers: { "content-type": "application/json" },
          },
        );
      },
      POST: async () => {
        const result = await runAdminBootstrapNow();
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
