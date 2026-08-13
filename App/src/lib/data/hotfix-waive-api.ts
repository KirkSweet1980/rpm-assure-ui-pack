import { createServerFn } from "@tanstack/react-start";
import { getPool, getLastPoolError, sql } from "@/lib/data/sql-pool";

export type WaiveHotfixInput = {
  customerCode: string;
  hotfixCode: string;
  reason: string;
  waivedBy?: string;
  /** months until review (default 12) */
  reviewMonths?: number;
};

export type UnwaiveHotfixInput = {
  customerCode: string;
  hotfixCode: string;
};

export const waiveHotfix = createServerFn({ method: "POST" })
  .validator((data: WaiveHotfixInput) => data)
  .handler(async ({ data }) => {
    const code = (data?.customerCode ?? "").trim().toUpperCase();
    const hf = (data?.hotfixCode ?? "").trim().toUpperCase();
    const reason = (data?.reason ?? "").trim();
    if (!code || !hf) {
      return { ok: false as const, error: "customerCode and hotfixCode required" };
    }
    if (reason.length < 4) {
      return { ok: false as const, error: "Reason must be at least 4 characters" };
    }
    const pool = await getPool();
    if (!pool) {
      return { ok: false as const, error: getLastPoolError() || "SQL not connected" };
    }
    const months = Math.min(36, Math.max(1, Number(data.reviewMonths) || 12));
    const by = (data.waivedBy ?? "app").slice(0, 100);
    try {
      await pool
        .request()
        .input("c", sql.NVarChar(50), code)
        .input("h", sql.NVarChar(50), hf)
        .input("r", sql.NVarChar(500), reason.slice(0, 500))
        .input("by", sql.NVarChar(100), by)
        .input("m", sql.Int, months)
        .query(`
MERGE dbo.Dim_Syspro_HotfixWaiver AS t
USING (SELECT @c AS CustomerCode, @h AS HotfixCode) AS s
ON t.CustomerCode = s.CustomerCode AND t.HotfixCode = s.HotfixCode
WHEN MATCHED THEN UPDATE SET
  Reason = @r,
  WaivedBy = @by,
  WaivedAtUtc = SYSUTCDATETIME(),
  ReviewByUtc = DATEADD(month, @m, SYSUTCDATETIME()),
  Active = 1
WHEN NOT MATCHED THEN INSERT (CustomerCode, HotfixCode, Reason, WaivedBy, ReviewByUtc, Active)
  VALUES (@c, @h, @r, @by, DATEADD(month, @m, SYSUTCDATETIME()), 1);
`);
      return { ok: true as const, customerCode: code, hotfixCode: hf };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false as const,
        error:
          msg.includes("permission") || msg.includes("denied")
            ? msg + " — run central 376_Hotfix_Waiver_Grants.sql"
            : msg,
      };
    }
  });

export const unwaiveHotfix = createServerFn({ method: "POST" })
  .validator((data: UnwaiveHotfixInput) => data)
  .handler(async ({ data }) => {
    const code = (data?.customerCode ?? "").trim().toUpperCase();
    const hf = (data?.hotfixCode ?? "").trim().toUpperCase();
    if (!code || !hf) {
      return { ok: false as const, error: "customerCode and hotfixCode required" };
    }
    const pool = await getPool();
    if (!pool) {
      return { ok: false as const, error: getLastPoolError() || "SQL not connected" };
    }
    try {
      await pool
        .request()
        .input("c", sql.NVarChar(50), code)
        .input("h", sql.NVarChar(50), hf)
        .query(`
UPDATE dbo.Dim_Syspro_HotfixWaiver
SET Active = 0
WHERE CustomerCode = @c AND HotfixCode = @h;
`);
      return { ok: true as const, customerCode: code, hotfixCode: hf };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });
