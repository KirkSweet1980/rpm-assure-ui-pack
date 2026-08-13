/**
 * Signed-in staff can update their own display name in SQL App_User.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth, authConfigured } from "@/lib/auth/server";
import { getPool, sql as sqlTypes } from "@/lib/data/sql-pool";
import { getDataMode, hasSqlConfig } from "@/lib/data/sql-config";

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator((data: { displayName: string }) => data)
  .handler(async ({ data }) => {
    if (!authConfigured) {
      return { ok: true as const, message: "Auth off — profile not persisted." };
    }
    const request = getRequest();
    if (!request) throw new Error("No request");
    const session = await auth.api.getSession({ headers: request.headers });
    const email = session?.user?.email ? normEmail(session.user.email) : null;
    if (!email) throw new Error("Sign in required.");

    const displayName = (data.displayName ?? "").trim();
    if (!displayName) throw new Error("Display name is required.");

    try {
      await auth.api.updateUser({
        body: { name: displayName },
        headers: request.headers,
      });
    } catch {
      /* client may have already updated */
    }

    if (!hasSqlConfig() || getDataMode() === "demo") {
      return { ok: true as const, message: "Profile updated (auth)." };
    }

    try {
      const pool = await getPool();
      if (!pool) return { ok: true as const, message: "Profile updated (auth; SQL offline)." };
      await pool
        .request()
        .input("email", sqlTypes.NVarChar(256), email)
        .input("dn", sqlTypes.NVarChar(200), displayName)
        .query(`
          IF EXISTS (SELECT 1 FROM dbo.App_User WHERE LOWER(Email) = @email)
            UPDATE dbo.App_User
            SET DisplayName = @dn, UpdatedAt = SYSUTCDATETIME()
            WHERE LOWER(Email) = @email;
        `);
      return { ok: true as const, message: "Profile updated." };
    } catch (e) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  });
