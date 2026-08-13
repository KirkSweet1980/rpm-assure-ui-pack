/*
  CENTRAL 373 - Hotfix waivers + gap views respect waivers
  MissingMandatory / ops counts exclude Active waivers.

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i 373_Hotfix_Waivers.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.Dim_Syspro_HotfixWaiver', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Syspro_HotfixWaiver
  (
    WaiverId        uniqueidentifier NOT NULL
      CONSTRAINT DF_Dim_HfWaiver_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode    nvarchar(50) NOT NULL,
    HotfixCode     nvarchar(50) NOT NULL,
    Reason          nvarchar(500) NOT NULL,
    WaivedBy        nvarchar(100) NULL,
    WaivedAtUtc     datetime2(3) NOT NULL
      CONSTRAINT DF_Dim_HfWaiver_At DEFAULT (SYSUTCDATETIME()),
    ReviewByUtc     datetime2(3) NULL,
    Active          bit NOT NULL
      CONSTRAINT DF_Dim_HfWaiver_Active DEFAULT (1),
    CONSTRAINT PK_Dim_Syspro_HotfixWaiver PRIMARY KEY (WaiverId),
    CONSTRAINT UQ_Dim_Syspro_HotfixWaiver UNIQUE (CustomerCode, HotfixCode)
  );
  PRINT N'Created Dim_Syspro_HotfixWaiver';
END
ELSE
  PRINT N'Dim_Syspro_HotfixWaiver OK';
GO

/* Example (commented) - Crystal waive when no Crystal:
INSERT INTO dbo.Dim_Syspro_HotfixWaiver (CustomerCode, HotfixCode, Reason, WaivedBy, ReviewByUtc)
VALUES
 (N'AHIC', N'KB8100663', N'No Crystal Reports in production use', N'PlatformAdmin', DATEADD(year, 1, SYSUTCDATETIME())),
 (N'UVSS', N'KB8100663', N'No Crystal Reports in production use', N'PlatformAdmin', DATEADD(year, 1, SYSUTCDATETIME()));
*/

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_HotfixGap
AS
WITH cust AS (
  SELECT
    c.CustomerCode,
    c.DisplayName,
    c.SqlInstanceName AS InstanceName,
    c.Active,
    v.ProductVersion,
    CASE
      WHEN NULLIF(LTRIM(RTRIM(v.ProductVersion)), N'') IS NULL THEN NULL
      WHEN PARSENAME(REPLACE(LTRIM(RTRIM(v.ProductVersion)), N'-', N'.'), 3) IS NOT NULL
        THEN TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(v.ProductVersion)), N'-', N'.'), 3) AS int) * 100
           + TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(v.ProductVersion)), N'-', N'.'), 2) AS int)
      WHEN PARSENAME(REPLACE(LTRIM(RTRIM(v.ProductVersion)), N'-', N'.'), 2) IS NOT NULL
        THEN TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(v.ProductVersion)), N'-', N'.'), 2) AS int) * 100
           + TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(v.ProductVersion)), N'-', N'.'), 1) AS int)
      ELSE NULL
    END AS CustomerVerKey
  FROM dbo.Dim_Customer AS c WITH (NOLOCK)
  OUTER APPLY (
    SELECT TOP (1) vi.ProductVersion
    FROM dbo.Syspro_VersionInfo AS vi WITH (NOLOCK)
    WHERE vi.InstanceName = c.SqlInstanceName
    ORDER BY vi.SnapshotDate DESC, vi.ImportedAt DESC
  ) AS v
  WHERE c.Active = 1
),
base AS (
  SELECT
    b.HotfixCode,
    b.Title,
    b.Severity,
    b.ReleaseLabel,
    b.KbUrl,
    CASE
      WHEN b.ReleaseLabel IS NULL OR LTRIM(RTRIM(b.ReleaseLabel)) = N'' THEN NULL
      WHEN b.ReleaseLabel LIKE N'[0-9].[0-9]%'
        OR b.ReleaseLabel LIKE N'[0-9][0-9].[0-9]%'
        THEN
          CASE
            WHEN PARSENAME(REPLACE(LTRIM(RTRIM(b.ReleaseLabel)), N'-', N'.'), 3) IS NOT NULL
              THEN TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(b.ReleaseLabel)), N'-', N'.'), 3) AS int) * 100
                 + TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(b.ReleaseLabel)), N'-', N'.'), 2) AS int)
            WHEN PARSENAME(REPLACE(LTRIM(RTRIM(b.ReleaseLabel)), N'-', N'.'), 2) IS NOT NULL
              THEN TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(b.ReleaseLabel)), N'-', N'.'), 2) AS int) * 100
                 + TRY_CAST(PARSENAME(REPLACE(LTRIM(RTRIM(b.ReleaseLabel)), N'-', N'.'), 1) AS int)
            ELSE NULL
          END
      ELSE NULL
    END AS ReleaseVerKey
  FROM dbo.Dim_Syspro_HotfixBaseline AS b WITH (NOLOCK)
  WHERE b.Active = 1
    AND b.HotfixCode LIKE N'KB%'
    AND (b.Title IS NULL OR b.Title NOT LIKE N'Sample%')
),
inst AS (
  SELECT i.InstanceName, i.HotfixCode, i.InstalledAt, i.Source
  FROM dbo.Syspro_HotfixInstalled AS i WITH (NOLOCK)
  INNER JOIN (
    SELECT InstanceName, MAX(SnapshotDate) AS mx
    FROM dbo.Syspro_HotfixInstalled WITH (NOLOCK)
    GROUP BY InstanceName
  ) AS m ON m.InstanceName = i.InstanceName AND m.mx = i.SnapshotDate
  WHERE i.HotfixCode LIKE N'KB%'
)
SELECT
  c.CustomerCode,
  c.DisplayName,
  c.InstanceName,
  c.ProductVersion AS CustomerProductVersion,
  c.CustomerVerKey,
  b.HotfixCode,
  b.Title,
  b.Severity,
  b.ReleaseLabel,
  b.ReleaseVerKey,
  b.KbUrl,
  CASE WHEN i.HotfixCode IS NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsMissing,
  CASE WHEN w.HotfixCode IS NOT NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsWaived,
  w.Reason AS WaiverReason,
  w.ReviewByUtc AS WaiverReviewByUtc,
  i.InstalledAt,
  i.Source AS InstalledSource
FROM cust AS c
INNER JOIN base AS b
  ON (
    c.CustomerVerKey IS NULL
    OR b.ReleaseVerKey IS NULL
    OR b.ReleaseVerKey <= c.CustomerVerKey
  )
LEFT JOIN inst AS i
  ON i.InstanceName = c.InstanceName
 AND (
      i.HotfixCode = b.HotfixCode
      OR REPLACE(UPPER(i.HotfixCode), N'KB', N'') = REPLACE(UPPER(b.HotfixCode), N'KB', N'')
     )
LEFT JOIN dbo.Dim_Syspro_HotfixWaiver AS w WITH (NOLOCK)
  ON w.Active = 1
 AND w.CustomerCode = c.CustomerCode
 AND (
      w.HotfixCode = b.HotfixCode
      OR REPLACE(UPPER(w.HotfixCode), N'KB', N'') = REPLACE(UPPER(b.HotfixCode), N'KB', N'')
     );
GO

PRINT N'vw_Kpi_Syspro_HotfixGap (+waivers) OK';
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_HotfixGap_Summary
AS
SELECT
  CustomerCode,
  DisplayName,
  InstanceName,
  MAX(CustomerProductVersion) AS CustomerProductVersion,
  MAX(CustomerVerKey) AS CustomerVerKey,
  COUNT_BIG(*) AS BaselineCount,
  /* Active gap = missing and not waived */
  SUM(CASE WHEN IsMissing = 1 AND IsWaived = 0 THEN 1 ELSE 0 END) AS MissingCount,
  SUM(CASE WHEN IsMissing = 0 THEN 1 ELSE 0 END) AS InstalledMatchCount,
  SUM(CASE WHEN IsMissing = 1 AND IsWaived = 0 AND Severity LIKE N'%Mandat%' THEN 1 ELSE 0 END) AS MissingMandatory,
  SUM(CASE WHEN Severity LIKE N'%Mandat%' THEN 1 ELSE 0 END) AS MandatoryBaselineCount,
  SUM(CASE WHEN IsMissing = 1 AND IsWaived = 1 THEN 1 ELSE 0 END) AS WaivedMissingCount,
  /* Optional catalogue noise (not mandatory, not waived, still missing) */
  SUM(CASE WHEN IsMissing = 1 AND IsWaived = 0 AND (Severity IS NULL OR Severity NOT LIKE N'%Mandat%') THEN 1 ELSE 0 END) AS MissingOptional
FROM dbo.vw_Kpi_Syspro_HotfixGap WITH (NOLOCK)
GROUP BY CustomerCode, DisplayName, InstanceName;
GO

PRINT N'vw_Kpi_Syspro_HotfixGap_Summary OK';
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_HotfixGap_Mandatory
AS
SELECT
  CustomerCode,
  DisplayName,
  InstanceName,
  COUNT_BIG(*) AS MandatoryBaselineCount,
  SUM(CASE WHEN IsMissing = 1 AND IsWaived = 0 THEN 1 ELSE 0 END) AS MissingMandatory,
  SUM(CASE WHEN IsMissing = 0 THEN 1 ELSE 0 END) AS MandatoryInstalled,
  SUM(CASE WHEN IsMissing = 1 AND IsWaived = 1 THEN 1 ELSE 0 END) AS MandatoryWaived
FROM dbo.vw_Kpi_Syspro_HotfixGap WITH (NOLOCK)
WHERE Severity LIKE N'%Mandat%'
GROUP BY CustomerCode, DisplayName, InstanceName;
GO

PRINT N'vw_Kpi_Syspro_HotfixGap_Mandatory OK';
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT ON dbo.Dim_Syspro_HotfixWaiver TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap_Summary TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap_Mandatory TO [Rpm_collect];
  PRINT N'Grants OK';
END
GO

/* Optional seed Crystal waive - set @SeedCrystal = 1 to apply */
DECLARE @SeedCrystal bit = 0;
IF @SeedCrystal = 1
BEGIN
  MERGE dbo.Dim_Syspro_HotfixWaiver AS t
  USING (VALUES
    (N'AHIC', N'KB8100663', N'No Crystal Reports in production use'),
    (N'UVSS', N'KB8100663', N'No Crystal Reports in production use')
  ) AS s(CustomerCode, HotfixCode, Reason)
  ON t.CustomerCode = s.CustomerCode AND t.HotfixCode = s.HotfixCode
  WHEN MATCHED THEN UPDATE SET Reason = s.Reason, Active = 1, WaivedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (CustomerCode, HotfixCode, Reason, WaivedBy, ReviewByUtc)
    VALUES (s.CustomerCode, s.HotfixCode, s.Reason, N'373_seed', DATEADD(year, 1, SYSUTCDATETIME()));
  PRINT N'Crystal waivers seeded';
END
GO

SELECT CustomerCode, MissingMandatory, MissingOptional, WaivedMissingCount, MissingCount
FROM dbo.vw_Kpi_Syspro_HotfixGap_Summary WITH (NOLOCK)
WHERE CustomerCode IN (N'AHIC', N'UVSS');

SELECT CustomerCode, HotfixCode, ReleaseLabel, IsWaived, LEFT(Title, 60) Title
FROM dbo.vw_Kpi_Syspro_HotfixGap WITH (NOLOCK)
WHERE CustomerCode IN (N'AHIC', N'UVSS')
  AND IsMissing = 1 AND Severity LIKE N'%Mandat%' AND IsWaived = 0
ORDER BY 1, 2;

PRINT N'=== 373 hotfix waivers complete ===';
GO
