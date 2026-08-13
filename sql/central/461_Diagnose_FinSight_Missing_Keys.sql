/*
  Diagnose blank Key/Description/Sub on FinSight L1 tables.
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -Q "..."
  or: sqlcmd ... -i 461_Diagnose_FinSight_Missing_Keys.sql
*/
USE [RPMAssure_App];
SET NOCOUNT ON;

PRINT '=== FinSight latest snapshot sample (AP L1) ===';
SELECT TOP 20
  CustomerCode,
  CompanyDb,
  InformationLevel,
  LevelKey,
  GlCode,
  Dimension1,
  LEFT(Description, 40) AS Description,
  SubCloseBalance,
  GlCloseBalance,
  Variance
FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK)
WHERE BalanceTypeCode = N'AP'
  AND InformationLevel = 1
  AND SnapshotDate = (
    SELECT MAX(SnapshotDate) FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK)
  )
ORDER BY CustomerCode, ABS(ISNULL(Variance,0)) DESC;

PRINT '=== Null key counts on latest snap ===';
SELECT
  BalanceTypeCode,
  InformationLevel,
  COUNT(*) AS Rows,
  SUM(CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(LevelKey,N''))),N'') IS NULL THEN 1 ELSE 0 END) AS NullLevelKey,
  SUM(CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(GlCode,N''))),N'') IS NULL THEN 1 ELSE 0 END) AS NullGlCode,
  SUM(CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(Description,N''))),N'') IS NULL THEN 1 ELSE 0 END) AS NullDesc,
  SUM(CASE WHEN SubCloseBalance IS NULL THEN 1 ELSE 0 END) AS NullSub,
  SUM(CASE WHEN GlCloseBalance IS NOT NULL THEN 1 ELSE 0 END) AS HasGl
FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK)
WHERE SnapshotDate = (
  SELECT MAX(SnapshotDate) FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK)
)
GROUP BY BalanceTypeCode, InformationLevel
ORDER BY 1, 2;

PRINT '=== Backfill LevelKey/GlCode on AP where blank (safe) ===';
UPDATE dbo.Syspro_DtrApBalances
SET
  LevelKey = COALESCE(NULLIF(LTRIM(RTRIM(LevelKey)), N''), NULLIF(LTRIM(RTRIM(GlCode)), N''), NULLIF(LTRIM(RTRIM(Description)), N''), N'AP-TOTAL'),
  GlCode   = COALESCE(NULLIF(LTRIM(RTRIM(GlCode)), N''), NULLIF(LTRIM(RTRIM(LevelKey)), N''), NULLIF(LTRIM(RTRIM(Description)), N''))
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Syspro_DtrApBalances)
  AND (
    NULLIF(LTRIM(RTRIM(ISNULL(LevelKey, N''))), N'') IS NULL
    OR NULLIF(LTRIM(RTRIM(ISNULL(GlCode, N''))), N'') IS NULL
  );
PRINT CONCAT('AP rows touched=', @@ROWCOUNT);

UPDATE dbo.Syspro_DtrArBalances
SET
  LevelKey = COALESCE(NULLIF(LTRIM(RTRIM(LevelKey)), N''), NULLIF(LTRIM(RTRIM(GlCode)), N''), NULLIF(LTRIM(RTRIM(Description)), N''), N'AR-TOTAL'),
  GlCode   = COALESCE(NULLIF(LTRIM(RTRIM(GlCode)), N''), NULLIF(LTRIM(RTRIM(LevelKey)), N''), NULLIF(LTRIM(RTRIM(Description)), N''))
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Syspro_DtrArBalances)
  AND (
    NULLIF(LTRIM(RTRIM(ISNULL(LevelKey, N''))), N'') IS NULL
    OR NULLIF(LTRIM(RTRIM(ISNULL(GlCode, N''))), N'') IS NULL
  );
PRINT CONCAT('AR rows touched=', @@ROWCOUNT);

UPDATE dbo.Syspro_DtrInvBalances
SET
  LevelKey = COALESCE(NULLIF(LTRIM(RTRIM(LevelKey)), N''), NULLIF(LTRIM(RTRIM(GlCode)), N''), NULLIF(LTRIM(RTRIM(Description)), N''), N'INV-TOTAL'),
  GlCode   = COALESCE(NULLIF(LTRIM(RTRIM(GlCode)), N''), NULLIF(LTRIM(RTRIM(LevelKey)), N''), NULLIF(LTRIM(RTRIM(Description)), N''))
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Syspro_DtrInvBalances)
  AND (
    NULLIF(LTRIM(RTRIM(ISNULL(LevelKey, N''))), N'') IS NULL
    OR NULLIF(LTRIM(RTRIM(ISNULL(GlCode, N''))), N'') IS NULL
  );
PRINT CONCAT('INV rows touched=', @@ROWCOUNT);

PRINT 'Done. Hard-refresh FinSight. If Description still blank, source Dtr* tables have empty Description — re-run 217c collect.';
