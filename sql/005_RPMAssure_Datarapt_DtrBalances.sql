/*
================================================================================
  RPM Assure — Datarapt DTR balance tables (SYSPRO control reconciliation)
  Database : RPMAssure
  Server   : rpmwinrm\RPMREPORTS
================================================================================
  Source product: Datarapt
  Naming: dbo.Syspro_Dtr* (matches existing Ap/Ar/Inv)

  Tables:
    Syspro_DtrApBalances   Accounts Payable      (may already exist)
    Syspro_DtrArBalances   Accounts Receivable   (may already exist)
    Syspro_DtrAssBalances  Assets
    Syspro_DtrCbBalances   Cashbook
    Syspro_DtrDnBalances   Dispatch Notes
    Syspro_DtrGitBalances  Goods In Transit
    Syspro_DtrGrnBalances  GRN Suspense
    Syspro_DtrInvBalances  Inventory             (may already exist)
    Syspro_DtrWipBalances  Work In Progress
    Syspro_DtrWpiBalances  WIP Inspection

  Information Level:
    Level 3  detail  → rolls into Level 2
    Level 2  mid     → rolls into Level 1
    Level 1  total

  Columns InformationLevel (1/2/3), LevelKey, ParentLevelKey support rollup.
  Existing Ap/Ar/Inv tables are ALTERed if level columns are missing.
================================================================================
*/
USE [RPMAssure];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/* -------------------------------------------------------------------------- */
/*  Catalog of DTR balance types                                               */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Dim_DtrBalanceType', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_DtrBalanceType
    (
        BalanceTypeCode   nvarchar(10)  NOT NULL,  -- AP, AR, ASS, CB, DN, GIT, GRN, INV, WIP, WPI
        BalanceTypeName   nvarchar(100) NOT NULL,
        TableName         nvarchar(128) NOT NULL,
        SortOrder         int           NOT NULL,
        Active            bit           NOT NULL
            CONSTRAINT DF_Dim_DtrBalanceType_Active DEFAULT (1),
        CONSTRAINT PK_Dim_DtrBalanceType PRIMARY KEY CLUSTERED (BalanceTypeCode)
    );
END
GO

MERGE dbo.Dim_DtrBalanceType AS t
USING (VALUES
    (N'AP',  N'Accounts Payable',     N'Syspro_DtrApBalances',  1),
    (N'AR',  N'Accounts Receivable',  N'Syspro_DtrArBalances',  2),
    (N'ASS', N'Assets',               N'Syspro_DtrAssBalances', 3),
    (N'CB',  N'Cashbook',             N'Syspro_DtrCbBalances',  4),
    (N'DN',  N'Dispatch Notes',       N'Syspro_DtrDnBalances',  5),
    (N'GIT', N'Goods In Transit',     N'Syspro_DtrGitBalances', 6),
    (N'GRN', N'GRN Suspense',         N'Syspro_DtrGrnBalances', 7),
    (N'INV', N'Inventory',            N'Syspro_DtrInvBalances', 8),
    (N'WIP', N'Work In Progress',     N'Syspro_DtrWipBalances', 9),
    (N'WPI', N'WIP Inspection',       N'Syspro_DtrWpiBalances',10)
) AS s (BalanceTypeCode, BalanceTypeName, TableName, SortOrder)
ON t.BalanceTypeCode = s.BalanceTypeCode
WHEN MATCHED THEN
    UPDATE SET BalanceTypeName = s.BalanceTypeName, TableName = s.TableName, SortOrder = s.SortOrder, Active = 1
WHEN NOT MATCHED THEN
    INSERT (BalanceTypeCode, BalanceTypeName, TableName, SortOrder, Active)
    VALUES (s.BalanceTypeCode, s.BalanceTypeName, s.TableName, s.SortOrder, 1);
GO

/* -------------------------------------------------------------------------- */
/*  Helper: add column if missing                                              */
/* -------------------------------------------------------------------------- */
GO
CREATE OR ALTER PROCEDURE dbo.usp_AddColumnIfMissing
    @TableName  sysname,
    @ColumnName sysname,
    @ColumnDef  nvarchar(500)
AS
BEGIN
    SET NOCOUNT ON;
    IF OBJECT_ID(N'dbo.' + @TableName, N'U') IS NULL
        RETURN;
    IF COL_LENGTH(N'dbo.' + @TableName, @ColumnName) IS NULL
    BEGIN
        DECLARE @sql nvarchar(max) =
            N'ALTER TABLE dbo.' + QUOTENAME(@TableName) +
            N' ADD ' + QUOTENAME(@ColumnName) + N' ' + @ColumnDef + N';';
        EXEC sys.sp_executesql @sql;
        PRINT N'Added ' + @TableName + N'.' + @ColumnName;
    END
END
GO

/* -------------------------------------------------------------------------- */
/*  Ensure level columns on EXISTING Ap / Ar / Inv                             */
/* -------------------------------------------------------------------------- */
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrApBalances',  N'InformationLevel', N'tinyint NULL';
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrApBalances',  N'LevelKey',         N'nvarchar(50) NULL';
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrApBalances',  N'ParentLevelKey',   N'nvarchar(50) NULL';
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrApBalances',  N'CustomerCode',     N'nvarchar(50) NULL';

EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrArBalances',  N'InformationLevel', N'tinyint NULL';
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrArBalances',  N'LevelKey',         N'nvarchar(50) NULL';
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrArBalances',  N'ParentLevelKey',   N'nvarchar(50) NULL';
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrArBalances',  N'CustomerCode',     N'nvarchar(50) NULL';

EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrInvBalances', N'InformationLevel', N'tinyint NULL';
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrInvBalances', N'LevelKey',         N'nvarchar(50) NULL';
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrInvBalances', N'ParentLevelKey',   N'nvarchar(50) NULL';
EXEC dbo.usp_AddColumnIfMissing N'Syspro_DtrInvBalances', N'CustomerCode',     N'nvarchar(50) NULL';
GO

/* -------------------------------------------------------------------------- */
/*  Generic creator for a DTR balance table                                    */
/*  Dimension1 = Branch / Warehouse / Account / etc. (source-specific)         */
/*  Sub* = subledger side; Gl* = GL side                                       */
/* -------------------------------------------------------------------------- */
GO
CREATE OR ALTER PROCEDURE dbo.usp_EnsureDtrBalanceTable
    @TableName sysname
AS
BEGIN
    SET NOCOUNT ON;
    IF OBJECT_ID(N'dbo.' + @TableName, N'U') IS NOT NULL
    BEGIN
        PRINT N'Exists: ' + @TableName;
        /* still ensure level columns */
        EXEC dbo.usp_AddColumnIfMissing @TableName, N'InformationLevel', N'tinyint NULL';
        EXEC dbo.usp_AddColumnIfMissing @TableName, N'LevelKey',         N'nvarchar(50) NULL';
        EXEC dbo.usp_AddColumnIfMissing @TableName, N'ParentLevelKey',   N'nvarchar(50) NULL';
        EXEC dbo.usp_AddColumnIfMissing @TableName, N'CustomerCode',     N'nvarchar(50) NULL';
        EXEC dbo.usp_AddColumnIfMissing @TableName, N'Dimension1',       N'nvarchar(50) NULL';
        EXEC dbo.usp_AddColumnIfMissing @TableName, N'SubOpenBalance',   N'decimal(18,2) NULL';
        EXEC dbo.usp_AddColumnIfMissing @TableName, N'SubCloseBalance',  N'decimal(18,2) NULL';
        RETURN;
    END

    DECLARE @sql nvarchar(max) = N'
    CREATE TABLE dbo.' + QUOTENAME(@TableName) + N'
    (
        SnapshotDate        date            NOT NULL,
        InstanceName        nvarchar(100)   NOT NULL,
        CompanyDb           nvarchar(100)   NOT NULL,
        CustomerCode        nvarchar(50)    NULL,
        GlYear              int             NULL,
        GlPeriod            int             NULL,
        InformationLevel    tinyint         NULL,
            /* 1 = total, 2 = mid, 3 = detail; 3→2→1 */
        LevelKey            nvarchar(50)    NULL,
        ParentLevelKey      nvarchar(50)    NULL,
        GlCode              nvarchar(50)    NULL,
        Dimension1          nvarchar(50)    NULL,
            /* Branch, Warehouse, Bank, etc. */
        Description         nvarchar(200)   NULL,
        SubOpenBalance      decimal(18, 2)  NULL,
        SubCloseBalance     decimal(18, 2)  NULL,
        GlOpenBalance       decimal(18, 2)  NULL,
        GlCloseBalance      decimal(18, 2)  NULL,
        Variance            decimal(18, 2)  NULL,
        RefreshDate         datetime2(3)    NULL,
        ImportedAt          datetime2(3)    NOT NULL
            CONSTRAINT DF_' + @TableName + N'_ImportedAt DEFAULT (SYSUTCDATETIME()),
        RowId               bigint          NOT NULL IDENTITY(1, 1),
        CONSTRAINT PK_' + @TableName + N' PRIMARY KEY CLUSTERED (RowId),
        CONSTRAINT CK_' + @TableName + N'_Level CHECK (
            InformationLevel IS NULL OR InformationLevel IN (1, 2, 3))
    );
    CREATE INDEX IX_' + @TableName + N'_Snap_Inst
        ON dbo.' + QUOTENAME(@TableName) + N' (SnapshotDate, InstanceName, CompanyDb);
    CREATE INDEX IX_' + @TableName + N'_Customer
        ON dbo.' + QUOTENAME(@TableName) + N' (CustomerCode, SnapshotDate)
        WHERE CustomerCode IS NOT NULL;
    CREATE INDEX IX_' + @TableName + N'_Level
        ON dbo.' + QUOTENAME(@TableName) + N' (InstanceName, CompanyDb, SnapshotDate, InformationLevel, LevelKey);
    ';
    EXEC sys.sp_executesql @sql;
    PRINT N'Created: ' + @TableName;
END
GO

/* Create / ensure all 10 */
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrApBalances';
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrArBalances';
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrAssBalances';
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrCbBalances';
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrDnBalances';
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrGitBalances';
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrGrnBalances';
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrInvBalances';
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrWipBalances';
EXEC dbo.usp_EnsureDtrBalanceTable N'Syspro_DtrWpiBalances';
GO

/* -------------------------------------------------------------------------- */
/*  Map legacy Ap/Ar/Inv amount column names into a unified view               */
/*  Existing: ApOpenBalance / ArOpenBalance / InvOpenBalance + Gl* + Variance  */
/*  New tables: SubOpenBalance / SubCloseBalance + Gl* + Variance              */
/* -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW dbo.vw_Datarapt_DtrBalances_All
AS
/* AP */
SELECT
    N'AP' AS BalanceTypeCode,
    N'Accounts Payable' AS BalanceTypeName,
    a.SnapshotDate,
    a.InstanceName,
    a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode) AS CustomerCode,
    a.GlYear,
    a.GlPeriod,
    a.InformationLevel,
    a.LevelKey,
    a.ParentLevelKey,
    a.GlCode,
    a.Branch AS Dimension1,
    a.Description,
    a.ApOpenBalance AS SubOpenBalance,
    a.ApCloseBalance AS SubCloseBalance,
    a.GlOpenBalance,
    a.GlCloseBalance,
    a.Variance,
    a.RefreshDate,
    a.ImportedAt
FROM dbo.Syspro_DtrApBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1

UNION ALL

/* AR */
SELECT
    N'AR', N'Accounts Receivable',
    a.SnapshotDate, a.InstanceName, a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode),
    a.GlYear, a.GlPeriod, a.InformationLevel, a.LevelKey, a.ParentLevelKey,
    a.GlCode, a.Branch, a.Description,
    a.ArOpenBalance, a.ArCloseBalance,
    a.GlOpenBalance, a.GlCloseBalance, a.Variance, a.RefreshDate, a.ImportedAt
FROM dbo.Syspro_DtrArBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1

UNION ALL

/* INV */
SELECT
    N'INV', N'Inventory',
    a.SnapshotDate, a.InstanceName, a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode),
    a.GlYear, a.GlPeriod, a.InformationLevel, a.LevelKey, a.ParentLevelKey,
    a.GlCode, a.Warehouse, a.Description,
    a.InvOpenBalance, a.InvCloseBalance,
    a.GlOpenBalance, a.GlCloseBalance, a.Variance, a.RefreshDate, a.ImportedAt
FROM dbo.Syspro_DtrInvBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1

UNION ALL

/* ASS */
SELECT
    N'ASS', N'Assets',
    a.SnapshotDate, a.InstanceName, a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode),
    a.GlYear, a.GlPeriod, a.InformationLevel, a.LevelKey, a.ParentLevelKey,
    a.GlCode, a.Dimension1, a.Description,
    a.SubOpenBalance, a.SubCloseBalance,
    a.GlOpenBalance, a.GlCloseBalance, a.Variance, a.RefreshDate, a.ImportedAt
FROM dbo.Syspro_DtrAssBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1

UNION ALL

/* CB */
SELECT
    N'CB', N'Cashbook',
    a.SnapshotDate, a.InstanceName, a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode),
    a.GlYear, a.GlPeriod, a.InformationLevel, a.LevelKey, a.ParentLevelKey,
    a.GlCode, a.Dimension1, a.Description,
    a.SubOpenBalance, a.SubCloseBalance,
    a.GlOpenBalance, a.GlCloseBalance, a.Variance, a.RefreshDate, a.ImportedAt
FROM dbo.Syspro_DtrCbBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1

UNION ALL

/* DN */
SELECT
    N'DN', N'Dispatch Notes',
    a.SnapshotDate, a.InstanceName, a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode),
    a.GlYear, a.GlPeriod, a.InformationLevel, a.LevelKey, a.ParentLevelKey,
    a.GlCode, a.Dimension1, a.Description,
    a.SubOpenBalance, a.SubCloseBalance,
    a.GlOpenBalance, a.GlCloseBalance, a.Variance, a.RefreshDate, a.ImportedAt
FROM dbo.Syspro_DtrDnBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1

UNION ALL

/* GIT */
SELECT
    N'GIT', N'Goods In Transit',
    a.SnapshotDate, a.InstanceName, a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode),
    a.GlYear, a.GlPeriod, a.InformationLevel, a.LevelKey, a.ParentLevelKey,
    a.GlCode, a.Dimension1, a.Description,
    a.SubOpenBalance, a.SubCloseBalance,
    a.GlOpenBalance, a.GlCloseBalance, a.Variance, a.RefreshDate, a.ImportedAt
FROM dbo.Syspro_DtrGitBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1

UNION ALL

/* GRN */
SELECT
    N'GRN', N'GRN Suspense',
    a.SnapshotDate, a.InstanceName, a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode),
    a.GlYear, a.GlPeriod, a.InformationLevel, a.LevelKey, a.ParentLevelKey,
    a.GlCode, a.Dimension1, a.Description,
    a.SubOpenBalance, a.SubCloseBalance,
    a.GlOpenBalance, a.GlCloseBalance, a.Variance, a.RefreshDate, a.ImportedAt
FROM dbo.Syspro_DtrGrnBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1

UNION ALL

/* WIP */
SELECT
    N'WIP', N'Work In Progress',
    a.SnapshotDate, a.InstanceName, a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode),
    a.GlYear, a.GlPeriod, a.InformationLevel, a.LevelKey, a.ParentLevelKey,
    a.GlCode, a.Dimension1, a.Description,
    a.SubOpenBalance, a.SubCloseBalance,
    a.GlOpenBalance, a.GlCloseBalance, a.Variance, a.RefreshDate, a.ImportedAt
FROM dbo.Syspro_DtrWipBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1

UNION ALL

/* WPI */
SELECT
    N'WPI', N'WIP Inspection',
    a.SnapshotDate, a.InstanceName, a.CompanyDb,
    COALESCE(a.CustomerCode, c.CustomerCode),
    a.GlYear, a.GlPeriod, a.InformationLevel, a.LevelKey, a.ParentLevelKey,
    a.GlCode, a.Dimension1, a.Description,
    a.SubOpenBalance, a.SubCloseBalance,
    a.GlOpenBalance, a.GlCloseBalance, a.Variance, a.RefreshDate, a.ImportedAt
FROM dbo.Syspro_DtrWpiBalances AS a
LEFT JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = a.InstanceName AND c.Active = 1;
GO

/* -------------------------------------------------------------------------- */
/*  Level rollup check: Level3 sum vs Level2 parent, Level2 vs Level1          */
/*  (by Instance/Company/Snap/BalanceType/ParentLevelKey)                      */
/* -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW dbo.vw_Datarapt_Dtr_LevelRollup_Check
AS
SELECT
    d.BalanceTypeCode,
    d.BalanceTypeName,
    d.CustomerCode,
    d.InstanceName,
    d.CompanyDb,
    d.SnapshotDate,
    d.GlYear,
    d.GlPeriod,
    p.InformationLevel AS ParentLevel,
    p.LevelKey AS ParentLevelKey,
    p.SubCloseBalance AS ParentSubClose,
    p.GlCloseBalance AS ParentGlClose,
    p.Variance AS ParentVariance,
    SUM(c.SubCloseBalance) AS ChildSubCloseSum,
    SUM(c.GlCloseBalance) AS ChildGlCloseSum,
    SUM(c.Variance) AS ChildVarianceSum,
    CAST(ISNULL(p.SubCloseBalance, 0) - ISNULL(SUM(c.SubCloseBalance), 0) AS decimal(18, 2)) AS SubCloseRollupDiff,
    CAST(ISNULL(p.Variance, 0) - ISNULL(SUM(c.Variance), 0) AS decimal(18, 2)) AS VarianceRollupDiff
FROM dbo.vw_Datarapt_DtrBalances_All AS p
INNER JOIN dbo.vw_Datarapt_DtrBalances_All AS c
    ON c.BalanceTypeCode = p.BalanceTypeCode
   AND c.InstanceName = p.InstanceName
   AND c.CompanyDb = p.CompanyDb
   AND c.SnapshotDate = p.SnapshotDate
   AND ISNULL(c.GlYear, -1) = ISNULL(p.GlYear, -1)
   AND ISNULL(c.GlPeriod, -1) = ISNULL(p.GlPeriod, -1)
   AND c.ParentLevelKey = p.LevelKey
   AND c.InformationLevel = p.InformationLevel + 1
WHERE p.InformationLevel IN (1, 2)
GROUP BY
    d.BalanceTypeCode, d.BalanceTypeName, d.CustomerCode, d.InstanceName, d.CompanyDb,
    d.SnapshotDate, d.GlYear, d.GlPeriod,
    p.InformationLevel, p.LevelKey, p.SubCloseBalance, p.GlCloseBalance, p.Variance,
    d.BalanceTypeCode
-- fix: use p not d for group - rewrite simpler below
;
GO

/* Recreate rollup view correctly */
CREATE OR ALTER VIEW dbo.vw_Datarapt_Dtr_LevelRollup_Check
AS
SELECT
    p.BalanceTypeCode,
    p.BalanceTypeName,
    p.CustomerCode,
    p.InstanceName,
    p.CompanyDb,
    p.SnapshotDate,
    p.GlYear,
    p.GlPeriod,
    p.InformationLevel AS ParentLevel,
    p.LevelKey AS ParentLevelKey,
    p.SubCloseBalance AS ParentSubClose,
    p.GlCloseBalance AS ParentGlClose,
    p.Variance AS ParentVariance,
    SUM(ch.SubCloseBalance) AS ChildSubCloseSum,
    SUM(ch.GlCloseBalance) AS ChildGlCloseSum,
    SUM(ch.Variance) AS ChildVarianceSum,
    CAST(ISNULL(p.SubCloseBalance, 0) - ISNULL(SUM(ch.SubCloseBalance), 0) AS decimal(18, 2)) AS SubCloseRollupDiff,
    CAST(ISNULL(p.Variance, 0) - ISNULL(SUM(ch.Variance), 0) AS decimal(18, 2)) AS VarianceRollupDiff
FROM dbo.vw_Datarapt_DtrBalances_All AS p
INNER JOIN dbo.vw_Datarapt_DtrBalances_All AS ch
    ON ch.BalanceTypeCode = p.BalanceTypeCode
   AND ch.InstanceName = p.InstanceName
   AND ch.CompanyDb = p.CompanyDb
   AND ch.SnapshotDate = p.SnapshotDate
   AND ISNULL(ch.GlYear, -1) = ISNULL(p.GlYear, -1)
   AND ISNULL(ch.GlPeriod, -1) = ISNULL(p.GlPeriod, -1)
   AND ch.ParentLevelKey = p.LevelKey
   AND ch.InformationLevel = p.InformationLevel + 1
WHERE p.InformationLevel IN (1, 2)
  AND p.LevelKey IS NOT NULL
GROUP BY
    p.BalanceTypeCode, p.BalanceTypeName, p.CustomerCode, p.InstanceName, p.CompanyDb,
    p.SnapshotDate, p.GlYear, p.GlPeriod,
    p.InformationLevel, p.LevelKey, p.SubCloseBalance, p.GlCloseBalance, p.Variance;
GO

/* -------------------------------------------------------------------------- */
/*  Replace variance KPI views to include ALL DTR types                        */
/* -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_DtrVariance_Latest
AS
SELECT
    v.CustomerCode,
    v.AsOfDate,
    v.BalanceTypeCode AS SourceArea,
    v.BalanceTypeName,
    v.InstanceName,
    v.CompanyDb,
    v.InformationLevel,
    v.LevelKey,
    v.GlCode,
    v.Dimension1,
    v.Description,
    v.Variance,
    v.SubCloseBalance,
    v.GlCloseBalance
FROM (
    SELECT
        d.*,
        d.SnapshotDate AS AsOfDate,
        MAX(d.SnapshotDate) OVER (PARTITION BY d.InstanceName, d.BalanceTypeCode) AS MaxSnap
    FROM dbo.vw_Datarapt_DtrBalances_All AS d
    WHERE d.Variance IS NOT NULL
      AND d.Variance <> 0
) AS v
WHERE v.SnapshotDate = v.MaxSnap
  AND v.CustomerCode IS NOT NULL;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_DtrVarianceCounts
AS
SELECT
    CustomerCode,
    AsOfDate,
    COUNT(*) AS VarianceLineCount,
    SUM(CASE WHEN SourceArea = N'AP'  THEN 1 ELSE 0 END) AS ApVarianceLines,
    SUM(CASE WHEN SourceArea = N'AR'  THEN 1 ELSE 0 END) AS ArVarianceLines,
    SUM(CASE WHEN SourceArea = N'ASS' THEN 1 ELSE 0 END) AS AssVarianceLines,
    SUM(CASE WHEN SourceArea = N'CB'  THEN 1 ELSE 0 END) AS CbVarianceLines,
    SUM(CASE WHEN SourceArea = N'DN'  THEN 1 ELSE 0 END) AS DnVarianceLines,
    SUM(CASE WHEN SourceArea = N'GIT' THEN 1 ELSE 0 END) AS GitVarianceLines,
    SUM(CASE WHEN SourceArea = N'GRN' THEN 1 ELSE 0 END) AS GrnVarianceLines,
    SUM(CASE WHEN SourceArea = N'INV' THEN 1 ELSE 0 END) AS InvVarianceLines,
    SUM(CASE WHEN SourceArea = N'WIP' THEN 1 ELSE 0 END) AS WipVarianceLines,
    SUM(CASE WHEN SourceArea = N'WPI' THEN 1 ELSE 0 END) AS WpiVarianceLines,
    /* Prefer Level 1 totals for “control” variance count when levels populated */
    SUM(CASE WHEN InformationLevel = 1 OR InformationLevel IS NULL THEN 1 ELSE 0 END) AS VarianceLinesLevel1OrUnknown
FROM dbo.vw_Kpi_Syspro_DtrVariance_Latest
GROUP BY CustomerCode, AsOfDate;
GO

/* Level-1 only variance (exec-friendly) */
CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_DtrVariance_Level1
AS
SELECT *
FROM dbo.vw_Kpi_Syspro_DtrVariance_Latest
WHERE InformationLevel = 1
   OR InformationLevel IS NULL;  /* legacy rows without level → treat as reportable */
GO

PRINT N'Datarapt DTR tables + views ready.';
PRINT N'Tables: AP AR ASS CB DN GIT GRN INV WIP WPI';
PRINT N'Levels: InformationLevel 3 → 2 → 1 (ParentLevelKey points to parent LevelKey)';
GO
