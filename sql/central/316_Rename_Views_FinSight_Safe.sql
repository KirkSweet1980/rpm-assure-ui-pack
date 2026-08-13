/*
  316 — Safe FinSight view names (no drop of old names)
  Creates thin FinSight-named views that read existing Datarapt/Dtr views.
  Old names stay for collect scripts / older packs.
  Then app switches to FinSight names.

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i "C:\RPM-Assure\Sql\central\316_Rename_Views_FinSight_Safe.sql"
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;
GO

/* Guard: base view must exist */
IF OBJECT_ID(N'dbo.vw_Datarapt_DtrBalances_All', N'V') IS NULL
BEGIN
  RAISERROR(N'Missing dbo.vw_Datarapt_DtrBalances_All — deploy 005 / 100 DTR pack first.', 16, 1);
END
GO

/* -------------------------------------------------------------------------- */
/*  FinSight control balances (new canonical name)                             */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.vw_FinSight_ControlBalances_All', N'V') IS NOT NULL
  DROP VIEW dbo.vw_FinSight_ControlBalances_All;
GO
CREATE VIEW dbo.vw_FinSight_ControlBalances_All
AS
SELECT *
FROM dbo.vw_Datarapt_DtrBalances_All WITH (NOLOCK);
GO

/* Level rollup check (optional — only if source exists) */
IF OBJECT_ID(N'dbo.vw_Datarapt_Dtr_LevelRollup_Check', N'V') IS NOT NULL
BEGIN
  IF OBJECT_ID(N'dbo.vw_FinSight_ControlLevelRollup_Check', N'V') IS NOT NULL
    DROP VIEW dbo.vw_FinSight_ControlLevelRollup_Check;
END
GO

IF OBJECT_ID(N'dbo.vw_Datarapt_Dtr_LevelRollup_Check', N'V') IS NOT NULL
  AND OBJECT_ID(N'dbo.vw_FinSight_ControlLevelRollup_Check', N'V') IS NULL
BEGIN
  EXEC(N'
CREATE VIEW dbo.vw_FinSight_ControlLevelRollup_Check
AS
SELECT * FROM dbo.vw_Datarapt_Dtr_LevelRollup_Check WITH (NOLOCK);
');
END
GO

/* KPI aliases */
IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_DtrVariance_Latest', N'V') IS NOT NULL
BEGIN
  IF OBJECT_ID(N'dbo.vw_Kpi_FinSight_Variance_Latest', N'V') IS NOT NULL
    DROP VIEW dbo.vw_Kpi_FinSight_Variance_Latest;
END
GO
IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_DtrVariance_Latest', N'V') IS NOT NULL
BEGIN
  EXEC(N'
CREATE VIEW dbo.vw_Kpi_FinSight_Variance_Latest
AS
SELECT * FROM dbo.vw_Kpi_Syspro_DtrVariance_Latest WITH (NOLOCK);
');
END
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_DtrVarianceCounts', N'V') IS NOT NULL
BEGIN
  IF OBJECT_ID(N'dbo.vw_Kpi_FinSight_VarianceCounts', N'V') IS NOT NULL
    DROP VIEW dbo.vw_Kpi_FinSight_VarianceCounts;
END
GO
IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_DtrVarianceCounts', N'V') IS NOT NULL
BEGIN
  EXEC(N'
CREATE VIEW dbo.vw_Kpi_FinSight_VarianceCounts
AS
SELECT * FROM dbo.vw_Kpi_Syspro_DtrVarianceCounts WITH (NOLOCK);
');
END
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_DtrVariance_Level1', N'V') IS NOT NULL
BEGIN
  IF OBJECT_ID(N'dbo.vw_Kpi_FinSight_Variance_Level1', N'V') IS NOT NULL
    DROP VIEW dbo.vw_Kpi_FinSight_Variance_Level1;
END
GO
IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_DtrVariance_Level1', N'V') IS NOT NULL
BEGIN
  EXEC(N'
CREATE VIEW dbo.vw_Kpi_FinSight_Variance_Level1
AS
SELECT * FROM dbo.vw_Kpi_Syspro_DtrVariance_Level1 WITH (NOLOCK);
');
END
GO

/* Point FinSight detail view at new control balances name when present */
IF OBJECT_ID(N'dbo.vw_FinSight_DtrDetail_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_FinSight_DtrDetail_Latest;
GO
CREATE VIEW dbo.vw_FinSight_DtrDetail_Latest
AS
WITH ranked AS (
  SELECT
    b.CustomerCode,
    b.BalanceTypeCode,
    b.InformationLevel,
    b.LevelKey,
    b.ParentLevelKey,
    b.GlCode,
    b.Dimension1,
    b.Description,
    b.SubCloseBalance,
    b.GlCloseBalance,
    b.Variance,
    b.SnapshotDate,
    b.InstanceName,
    b.CompanyDb,
    ROW_NUMBER() OVER (
      PARTITION BY b.CustomerCode, b.BalanceTypeCode, b.InformationLevel, b.LevelKey, b.GlCode, b.Description
      ORDER BY b.SnapshotDate DESC, b.ImportedAt DESC
    ) AS rn
  FROM dbo.vw_FinSight_ControlBalances_All AS b WITH (NOLOCK)
  WHERE b.InformationLevel IN (1, 2, 3)
)
SELECT
  CustomerCode, BalanceTypeCode, InformationLevel, LevelKey, ParentLevelKey,
  GlCode, Dimension1, Description, SubCloseBalance, GlCloseBalance, Variance,
  SnapshotDate, InstanceName, CompanyDb
FROM ranked
WHERE rn = 1;
GO

/* Friendly alias without Dtr in the name */
IF OBJECT_ID(N'dbo.vw_FinSight_ControlDetail_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_FinSight_ControlDetail_Latest;
GO
CREATE VIEW dbo.vw_FinSight_ControlDetail_Latest
AS
SELECT * FROM dbo.vw_FinSight_DtrDetail_Latest WITH (NOLOCK);
GO

PRINT '316 OK — FinSight view names ready; old vw_Datarapt_* / vw_Kpi_Syspro_Dtr* still present.';
SELECT name
FROM sys.views
WHERE name LIKE N'vw_FinSight%'
   OR name LIKE N'vw_Datarapt%'
   OR name LIKE N'vw_Kpi_FinSight%'
   OR name LIKE N'vw_Kpi_Syspro_Dtr%'
ORDER BY name;
GO
