/*
  CENTRAL ? hotfix gap ready for Deployment catalogue import
  1) Ensures baseline / installed / import log
  2) Gap views: match HotfixCode; prefer Mandatory for ExCo summary
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
      CONSTRAINT DF_Dim_HfBaseline_Id2 DEFAULT (NEWSEQUENTIALID()),
    ProductFamily    nvarchar(50) NOT NULL
      CONSTRAINT DF_Dim_HfBaseline_Fam2 DEFAULT (N'SYSPRO8'),
    ReleaseLabel     nvarchar(50) NULL,
    HotfixCode      nvarchar(50) NOT NULL,
    Title            nvarchar(300) NULL,
    Synopsis         nvarchar(max) NULL,
    Severity         nvarchar(30) NULL,
    KbUrl            nvarchar(500) NULL,
    SourceFile       nvarchar(260) NULL,
    HotfixGuid      uniqueidentifier NULL,
    ReleaseId        uniqueidentifier NULL,
    Active           bit NOT NULL
      CONSTRAINT DF_Dim_HfBaseline_Active2 DEFAULT (1),
    ImportedAtUtc    datetime2(3) NOT NULL
      CONSTRAINT DF_Dim_HfBaseline_Imp2 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Syspro_HotfixBaseline2 PRIMARY KEY (BaselineId)
  );
  CREATE UNIQUE INDEX UX_Dim_HfBaseline_Code
    ON dbo.Dim_Syspro_HotfixBaseline (ProductFamily, HotfixCode, ReleaseLabel)
    WHERE ReleaseLabel IS NOT NULL;
  PRINT N'Created Dim_Syspro_HotfixBaseline';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Syspro_HotfixBaseline', N'HotfixGuid') IS NULL
    ALTER TABLE dbo.Dim_Syspro_HotfixBaseline ADD HotfixGuid uniqueidentifier NULL;
  IF COL_LENGTH(N'dbo.Dim_Syspro_HotfixBaseline', N'ReleaseId') IS NULL
    ALTER TABLE dbo.Dim_Syspro_HotfixBaseline ADD ReleaseId uniqueidentifier NULL;
  PRINT N'Dim_Syspro_HotfixBaseline exists';
END
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
    HotfixGuid      uniqueidentifier NULL,
    ImportedAt       datetime2(3) NOT NULL
      CONSTRAINT DF_Syspro_HfInst_Imp2 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_HotfixInstalled2 PRIMARY KEY (SnapshotDate, InstanceName, HotfixCode)
  );
  PRINT N'Created Syspro_HotfixInstalled';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Syspro_HotfixInstalled', N'HotfixGuid') IS NULL
    ALTER TABLE dbo.Syspro_HotfixInstalled ADD HotfixGuid uniqueidentifier NULL;
  PRINT N'Syspro_HotfixInstalled exists';
END
GO

/* Prefer installed mirror from Syspro_Hotfix when present */
BEGIN TRY
  ;WITH latest AS (
    SELECT InstanceName, MAX(SnapshotDate) AS SnapshotDate
    FROM dbo.Syspro_Hotfix WITH (NOLOCK)
    GROUP BY InstanceName
  )
  MERGE dbo.Syspro_HotfixInstalled AS t
  USING (
    SELECT h.SnapshotDate, h.InstanceName, h.HotfixCode,
           LEFT(ISNULL(h.HotfixName, h.Description), 300) AS Title,
           h.InstalledAt,
           N'Syspro_Hotfix' AS Source,
           h.HotfixGuid
    FROM dbo.Syspro_Hotfix AS h WITH (NOLOCK)
    INNER JOIN latest AS m
      ON m.InstanceName = h.InstanceName AND m.SnapshotDate = h.SnapshotDate
    WHERE NULLIF(LTRIM(RTRIM(h.HotfixCode)), N'') IS NOT NULL
  ) AS s
  ON t.SnapshotDate = s.SnapshotDate
 AND t.InstanceName = s.InstanceName
 AND t.HotfixCode = s.HotfixCode
  WHEN NOT MATCHED THEN
    INSERT (SnapshotDate, InstanceName, HotfixCode, Title, InstalledAt, Source, HotfixGuid)
    VALUES (s.SnapshotDate, s.InstanceName, s.HotfixCode, s.Title, s.InstalledAt, s.Source, s.HotfixGuid);
  PRINT CONCAT(N'Mirrored Syspro_Hotfix -> Installed rows affected approx ', @@ROWCOUNT);
END TRY
BEGIN CATCH
  PRINT CONCAT(N'Mirror skip: ', ERROR_MESSAGE());
END CATCH
GO

BEGIN TRY
  EXEC(N'
CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_HotfixGap
AS
/* Baseline (active) x customer, left join latest installed */
SELECT
  c.CustomerCode,
  c.DisplayName,
  c.SqlInstanceName AS InstanceName,
  b.HotfixCode,
  b.Title,
  b.Severity,
  b.ReleaseLabel,
  b.KbUrl,
  CASE WHEN i.HotfixCode IS NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsMissing,
  i.InstalledAt,
  i.Source AS InstalledSource
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
INNER JOIN dbo.Dim_Syspro_HotfixBaseline AS b WITH (NOLOCK)
  ON b.Active = 1
LEFT JOIN (
  SELECT inst.InstanceName, inst.HotfixCode, inst.InstalledAt, inst.Source
  FROM dbo.Syspro_HotfixInstalled AS inst WITH (NOLOCK)
  INNER JOIN (
    SELECT InstanceName, MAX(SnapshotDate) AS mx
    FROM dbo.Syspro_HotfixInstalled WITH (NOLOCK)
    GROUP BY InstanceName
  ) AS m ON m.InstanceName = inst.InstanceName AND m.mx = inst.SnapshotDate
) AS i
  ON i.InstanceName = c.SqlInstanceName
 AND (
      i.HotfixCode = b.HotfixCode
      OR REPLACE(UPPER(i.HotfixCode), N''KB'', N) = REPLACE(UPPER(b.HotfixCode), NKB, N)
     )
WHERE c.Active = 1;
');
  PRINT N'vw_Kpi_Syspro_HotfixGap OK';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'VIEW gap: ', ERROR_MESSAGE());
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
  SUM(CASE WHEN IsMissing = 1 AND Severity LIKE N''%Mandat%'' THEN 1 ELSE 0 END) AS MissingMandatory,
  SUM(CASE WHEN Severity LIKE N''%Mandat%'' THEN 1 ELSE 0 END) AS MandatoryBaselineCount
FROM dbo.vw_Kpi_Syspro_HotfixGap WITH (NOLOCK)
GROUP BY CustomerCode, DisplayName, InstanceName;
');
  PRINT N'vw_Kpi_Syspro_HotfixGap_Summary OK';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'VIEW summary: ', ERROR_MESSAGE());
END CATCH
GO

/* ExCo: mandatory-only gap per customer */
BEGIN TRY
  EXEC(N'
CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_HotfixGap_Mandatory
AS
SELECT
  CustomerCode,
  DisplayName,
  InstanceName,
  COUNT(*) AS MandatoryBaselineCount,
  SUM(CASE WHEN IsMissing = 1 THEN 1 ELSE 0 END) AS MissingMandatory,
  SUM(CASE WHEN IsMissing = 0 THEN 1 ELSE 0 END) AS MandatoryInstalled
FROM dbo.vw_Kpi_Syspro_HotfixGap WITH (NOLOCK)
WHERE Severity LIKE N''%Mandat%''
GROUP BY CustomerCode, DisplayName, InstanceName;
');
  PRINT N'vw_Kpi_Syspro_HotfixGap_Mandatory OK';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'VIEW mandatory: ', ERROR_MESSAGE());
END CATCH
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  BEGIN TRY
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_Syspro_HotfixBaseline TO [Rpm_collect];
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Syspro_HotfixInstalled TO [Rpm_collect];
    IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_HotfixGap', N'V') IS NOT NULL
      GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap TO [Rpm_collect];
    IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_HotfixGap_Summary', N'V') IS NOT NULL
      GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap_Summary TO [Rpm_collect];
    IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_HotfixGap_Mandatory', N'V') IS NOT NULL
      GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap_Mandatory TO [Rpm_collect];
  END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
END
GO

PRINT N'=== 370_Hotfix_Gap_Central ready ===';
GO
