/**
 * FinSight automated recon workflow — server functions.
 * Requires Fact_FinSight_ReconCase (312_FinSight_L23_Workflow.sql).
 */
import { createServerFn } from "@tanstack/react-start";
import { getPool } from "@/lib/data/sql-pool";
import { hasSqlConfig } from "@/lib/data/sql-config";
import type { FinSightReconCase, FinSightReconStatus } from "@/lib/data/types";

function mapCase(r: Record<string, unknown>): FinSightReconCase {
  return {
    reconCaseId: String(r.ReconCaseId),
    customerCode: String(r.CustomerCode),
    balanceTypeCode: String(r.BalanceTypeCode),
    snapshotDate: r.SnapshotDate ? String(r.SnapshotDate).slice(0, 10) : null,
    status: r.Status as FinSightReconStatus,
    oobLines: Number(r.OobLines) || 0,
    absVariance: r.AbsVariance != null ? Number(r.AbsVariance) : null,
    closeBalance: r.CloseBalance != null ? Number(r.CloseBalance) : null,
    ownerName: r.OwnerName != null ? String(r.OwnerName) : null,
    title: String(r.Title ?? ""),
    notes: r.Notes != null ? String(r.Notes) : null,
    sourceLevel: r.SourceLevel != null ? Number(r.SourceLevel) : null,
    levelKey: r.LevelKey != null ? String(r.LevelKey) : null,
    createdAtUtc: r.CreatedAtUtc
      ? new Date(r.CreatedAtUtc as string | Date).toISOString()
      : null,
    updatedAtUtc: r.UpdatedAtUtc
      ? new Date(r.UpdatedAtUtc as string | Date).toISOString()
      : null,
  };
}

type AutoOpenInput = { customerCode: string };
type UpdateInput = {
  reconCaseId: string;
  status?: FinSightReconStatus;
  ownerName?: string | null;
  notes?: string | null;
  actorName?: string | null;
  stepNote?: string | null;
};

/** Open one recon case per L1 control with Out of Balance lines (idempotent for open statuses). */
export const autoOpenFinSightReconCases = createServerFn({ method: "POST" })
  .validator((data: AutoOpenInput) => data)
  .handler(async ({ data }: { data: AutoOpenInput }) => {
    const code = (data.customerCode || "").trim().toUpperCase();
    if (!code) {
      return { ok: false as const, message: "customerCode required", opened: 0, cases: [] as FinSightReconCase[] };
    }
    if (!hasSqlConfig()) {
      return { ok: false as const, message: "SQL not configured", opened: 0, cases: [] as FinSightReconCase[] };
    }
    const pool = await getPool();
    if (!pool) {
      return { ok: false as const, message: "SQL pool unavailable", opened: 0, cases: [] as FinSightReconCase[] };
    }

    const oob = await pool.request().input("code", code).query(`
SELECT
  d.BalanceTypeCode,
  ISNULL(d.VarianceLineCount, 0) AS OobLines,
  d.AbsVariance,
  d.TotalCloseBalance,
  d.AsOfDate
FROM (
  SELECT
    t.BalanceTypeCode,
    ISNULL(v.VarianceLineCount, 0) AS VarianceLineCount,
    v.AbsVariance,
    a.TotalCloseBalance,
    COALESCE(v.AsOfDate, a.AsOfDate) AS AsOfDate
  FROM dbo.Dim_DtrBalanceType AS t
  OUTER APPLY (
    SELECT COUNT_BIG(*) AS VarianceLineCount, SUM(ABS(d.Variance)) AS AbsVariance, MAX(d.AsOfDate) AS AsOfDate
    FROM dbo.vw_Kpi_FinSight_Variance_Latest AS d
    WHERE d.CustomerCode = @code AND d.SourceArea = t.BalanceTypeCode
  ) AS v
  OUTER APPLY (
    SELECT SUM(COALESCE(b.SubCloseBalance, b.GlCloseBalance)) AS TotalCloseBalance, MAX(b.SnapshotDate) AS AsOfDate
    FROM dbo.vw_FinSight_ControlBalances_All AS b WITH (NOLOCK)
    WHERE b.CustomerCode = @code AND b.BalanceTypeCode = t.BalanceTypeCode
      AND (b.InformationLevel = 1 OR b.InformationLevel IS NULL)
      AND b.SnapshotDate = (
        SELECT MAX(b2.SnapshotDate) FROM dbo.vw_FinSight_ControlBalances_All b2 WITH (NOLOCK)
        WHERE b2.CustomerCode = @code AND b2.BalanceTypeCode = t.BalanceTypeCode
      )
  ) AS a
  WHERE t.Active = 1
) AS d
WHERE ISNULL(d.VarianceLineCount, 0) > 0;
`);

    let opened = 0;
    for (const row of oob.recordset ?? []) {
      const mod = String(row.BalanceTypeCode);
      const exists = await pool.request().input("code", code).input("mod", mod).query(`
SELECT TOP 1 CAST(ReconCaseId AS nvarchar(36)) AS Id
FROM dbo.Fact_FinSight_ReconCase WITH (NOLOCK)
WHERE CustomerCode = @code AND BalanceTypeCode = @mod
  AND Status IN (N'Open', N'Investigating', N'WaitingFinance', N'Cleared', N'Accepted');
`);
      if (exists.recordset?.length) continue;
      const oobLines = Number(row.OobLines) || 0;
      const absVar = row.AbsVariance != null ? Number(row.AbsVariance) : null;
      const close = row.TotalCloseBalance != null ? Number(row.TotalCloseBalance) : null;
      const title = `${mod} control recon — ${oobLines} Out of Balance line(s)`;
      const ins = await pool
        .request()
        .input("code", code)
        .input("mod", mod)
        .input("snap", row.AsOfDate ?? null)
        .input("oob", oobLines)
        .input("abs", absVar)
        .input("close", close)
        .input("title", title)
        .input(
          "notes",
          "Auto-opened by FinSight recon workflow from L1 control variance. Drill L2 then L3 in the customer FinSight page.",
        )
        .query(`
INSERT INTO dbo.Fact_FinSight_ReconCase
  (CustomerCode, BalanceTypeCode, SnapshotDate, Status, OobLines, AbsVariance, CloseBalance, Title, Notes, SourceLevel)
OUTPUT CAST(INSERTED.ReconCaseId AS nvarchar(36)) AS ReconCaseId
VALUES
  (@code, @mod, @snap, N'Open', @oob, @abs, @close, @title, @notes, 1);
`);
      const newId = ins.recordset?.[0]?.ReconCaseId as string | undefined;
      if (newId) {
        opened++;
        await pool.request().input("id", newId).query(`
INSERT INTO dbo.Fact_FinSight_ReconStep (ReconCaseId, ActorName, FromStatus, ToStatus, Note)
VALUES (@id, N'System', NULL, N'Open', N'Auto-opened from FinSight L1 Out of Balance controls.');
`);
      }
    }

    const list = await pool.request().input("code", code).query(`
SELECT TOP 100
  CAST(ReconCaseId AS nvarchar(36)) AS ReconCaseId, CustomerCode, BalanceTypeCode, SnapshotDate, Status,
  OobLines, AbsVariance, CloseBalance, OwnerName, Title, Notes, SourceLevel, LevelKey, CreatedAtUtc, UpdatedAtUtc
FROM dbo.Fact_FinSight_ReconCase WITH (NOLOCK)
WHERE CustomerCode = @code AND Status <> N'Closed'
ORDER BY UpdatedAtUtc DESC;
`);
    return {
      ok: true as const,
      message: opened ? `Opened ${opened} new recon case(s).` : "No new cases (already open or no Out of Balance).",
      opened,
      cases: (list.recordset ?? []).map((r) => mapCase(r as Record<string, unknown>)),
    };
  });

export const updateFinSightReconCase = createServerFn({ method: "POST" })
  .validator((data: UpdateInput) => data)
  .handler(async ({ data }: { data: UpdateInput }) => {
    if (!hasSqlConfig()) throw new Error("SQL not configured");
    const pool = await getPool();
    if (!pool) throw new Error("SQL pool unavailable");
    const id = data.reconCaseId;
    const cur = await pool.request().input("id", id).query(`
SELECT TOP 1 Status FROM dbo.Fact_FinSight_ReconCase WHERE ReconCaseId = @id;
`);
    if (!cur.recordset?.length) throw new Error("Case not found");
    const fromStatus = String(cur.recordset[0].Status);
    const toStatus = data.status ?? fromStatus;

    await pool
      .request()
      .input("id", id)
      .input("status", toStatus)
      .input("owner", data.ownerName ?? null)
      .input("notes", data.notes ?? null)
      .query(`
UPDATE dbo.Fact_FinSight_ReconCase
SET Status = @status,
    OwnerName = COALESCE(@owner, OwnerName),
    Notes = COALESCE(@notes, Notes),
    UpdatedAtUtc = SYSUTCDATETIME(),
    ClosedAtUtc = CASE WHEN @status IN (N'Closed', N'Cleared', N'Accepted') THEN SYSUTCDATETIME() ELSE ClosedAtUtc END
WHERE ReconCaseId = @id;
`);

    if (toStatus !== fromStatus || data.stepNote) {
      await pool
        .request()
        .input("id", id)
        .input("actor", data.actorName ?? "Staff")
        .input("from", fromStatus)
        .input("to", toStatus)
        .input("note", data.stepNote ?? data.notes ?? null)
        .query(`
INSERT INTO dbo.Fact_FinSight_ReconStep (ReconCaseId, ActorName, FromStatus, ToStatus, Note)
VALUES (@id, @actor, @from, @to, @note);
`);
    }

    const row = await pool.request().input("id", id).query(`
SELECT TOP 1
  CAST(ReconCaseId AS nvarchar(36)) AS ReconCaseId, CustomerCode, BalanceTypeCode, SnapshotDate, Status,
  OobLines, AbsVariance, CloseBalance, OwnerName, Title, Notes, SourceLevel, LevelKey, CreatedAtUtc, UpdatedAtUtc
FROM dbo.Fact_FinSight_ReconCase WHERE ReconCaseId = @id;
`);
    return { ok: true as const, case: mapCase(row.recordset[0] as Record<string, unknown>) };
  });
