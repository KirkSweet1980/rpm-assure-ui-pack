/*
  CENTRAL — SYSPRO hotfix baseline + installed + gap
  Tables: ok as Rpm_collect if they have CREATE TABLE
  Views: need db_owner / ddladmin — skipped with warning if no permission
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.Dim_Syspro_HotfixBaseline', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Syspro_HotfixBaseline
  (
    BaselineId       uniqueidentifier NOT NULL
      CONSTRAINT DF_Dim_HfBaseline_Id DEFAULT (NEWSEQUENTIALID()),
    ProductFamily    nvarchar(50) NOT NULL
      CONSTRAINT DF_Dim_HfBaseline_Fam DEFAULT (N'SYSPRO8'),
    ReleaseLabel     nvarchar(50) NULL,
    HotfixCode      nvarchar(50) NOT NULL,
    Title            nvarchar(300) NULL,
    Synopsis         nvarchar(max) NULL,
    Severity         nvarchar(30) NULL,
    KbUrl            nvarchar(500) NULL,
    SourceFile       nvarchar(260) NULL,
    Active           bit NOT NULL
      CONSTRAINT DF_Dim_HfBaseline_Active DEFAULT (1),
    ImportedAtUtc    datetime2(3) NOT NULL
      CONSTRAINT DF_Dim_HfBaseline_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Syspro_HotfixBaseline PRIMARY KEY (BaselineId),
    CONSTRAINT UQ_Dim_Syspro_HotfixBaseline UNIQUE (ProductFamily, HotfixCode, ReleaseLabel)
  );
  PRINT N'Created Dim_Syspro_HotfixBaseline';
END
ELSE PRINT N'Dim_Syspro_HotfixBaseline exists';
GO

IF OBJECT_ID(N'dbo.Syspro_HotfixInstalled', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_HotfixInstalled
  (
    SnapshotDate     date NOT NULL,
    InstanceName     nvarchar(100) NOT NULL,
    HotfixCode      nvarchar(50) NOT NULL,
    Title            nvarchar(300) NULL,
    InstalledAt      datetime2(3) NULL,
    Source           nvarchar(50) NULL,
    ImportedAt       datetime2(3) NOT NULL
      CONSTRAINT DF_Syspro_HfInst_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_HotfixInstalled PRIMARY KEY (SnapshotDate, InstanceName, HotfixCode)
  );
  PRINT N'Created Syspro_HotfixInstalled';
END
ELSE PRINT N'Syspro_HotfixInstalled exists';
GO

IF OBJECT_ID(N'dbo.Syspro_HotfixImportLog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_HotfixImportLog
  (
    LogId            bigint NOT NULL IDENTITY(1,1)
      CONSTRAINT PK_Syspro_HotfixImportLog PRIMARY KEY,
    ImportKind       nvarchar(30) NOT NULL,
    CustomerCode     nvarchar(50) NULL,
    InstanceName     nvarchar(100) NULL,
    SourceFile       nvarchar(260) NULL,
    RowsImported     int NULL,
    Notes            nvarchar(500) NULL,
    ImportedAtUtc    datetime2(3) NOT NULL
      CONSTRAINT DF_Syspro_HfImpLog_At DEFAULT (SYSUTCDATETIME())
  );
  PRINT N'Created Syspro_HotfixImportLog';
END
ELSE
BEGIN
  IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID(N'dbo.Syspro_HotfixImportLog')
        AND name = N'RowCount')
     AND NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID(N'dbo.Syspro_HotfixImportLog')
        AND name = N'RowsImported')
  BEGIN
    EXEC sys.sp_rename
      @objname = N'dbo.Syspro_HotfixImportLog.[RowCount]',
      @newname = N'RowsImported',
      @objtype = N'COLUMN';
    PRINT N'Renamed [RowCount] -> RowsImported';
  END
  ELSE
    PRINT N'Syspro_HotfixImportLog exists';
END
GO

/* Views — optional for Rpm_collect; admin can re-run later */
BEGIN TRY
  EXEC(N'
CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_HotfixGap
AS
SELECT
  c.CustomerCode,
  c.DisplayName,
  c.SqlInstanceName AS InstanceName,
  b.HotfixCode,
  b.Title,
  b.Severity,
  b.ReleaseLabel,
  b.KbUrl,
  CASE WHEN i.HotfixCode IS NULL THEN 1 ELSE 0 END AS IsMissing,
  i.InstalledAt,
  i.Source AS InstalledSource
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
CROSS JOIN dbo.Dim_Syspro_HotfixBaseline AS b WITH (NOLOCK)
LEFT JOIN (
  SELECT inst.*
  FROM dbo.Syspro_HotfixInstalled AS inst WITH (NOLOCK)
  INNER JOIN (
    SELECT InstanceName, MAX(SnapshotDate) AS mx
    FROM dbo.Syspro_HotfixInstalled WITH (NOLOCK)
    GROUP BY InstanceName
  ) AS m ON m.InstanceName = inst.InstanceName AND m.mx = inst.SnapshotDate
) AS i
  ON i.InstanceName = c.SqlInstanceName
 AND i.HotfixCode = b.HotfixCode
WHERE c.Active = 1
  AND b.Active = 1;
');
  PRINT N'vw_Kpi_Syspro_HotfixGap OK';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'VIEW gap skipped (need elevated login): ', ERROR_MESSAGE());
END CATCH
GO

BEGIN TRY
  EXEC(N'
CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_HotfixGap_Summary
AS
SELECT
  CustomerCode,
  DisplayName,
  InstanceName,
  COUNT(*) AS BaselineCount,
  SUM(CASE WHEN IsMissing = 1 THEN 1 ELSE 0 END) AS MissingCount,
  SUM(CASE WHEN IsMissing = 0 THEN 1 ELSE 0 END) AS InstalledMatchCount,
  SUM(CASE WHEN IsMissing = 1 AND Severity LIKE N''%Mandat%'' THEN 1 ELSE 0 END) AS MissingMandatory
FROM dbo.vw_Kpi_Syspro_HotfixGap WITH (NOLOCK)
GROUP BY CustomerCode, DisplayName, InstanceName;
');
  PRINT N'vw_Kpi_Syspro_HotfixGap_Summary OK';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'VIEW summary skipped: ', ERROR_MESSAGE());
END CATCH
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  BEGIN TRY
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_Syspro_HotfixBaseline TO [Rpm_collect];
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Syspro_HotfixInstalled TO [Rpm_collect];
    GRANT SELECT, INSERT ON dbo.Syspro_HotfixImportLog TO [Rpm_collect];
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'Table grant note: ', ERROR_MESSAGE());
  END CATCH
  BEGIN TRY
    IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_HotfixGap', N'V') IS NOT NULL
      GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap TO [Rpm_collect];
    IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_HotfixGap_Summary', N'V') IS NOT NULL
      GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap_Summary TO [Rpm_collect];
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'View grant note: ', ERROR_MESSAGE());
  END CATCH
END
GO
PRINT N'320 hotfix baseline ready.';
GO
