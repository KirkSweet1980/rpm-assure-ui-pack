/*
  CENTRAL 372 - Version-scoped hotfix gap
  Only count baseline KBs applicable to customer product version:
    - ReleaseLabel like 8.10 / 8.11 / 8.12  => include when release <= customer major.minor
    - Non-version labels (e.g. 2025, empty) => always in scope (prereqs)
  Sample / non-KB rows stay excluded (same as 371).

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i 372_Version_Scoped_Hotfix_Gap.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;
GO

/* Keep sample filter active */
IF OBJECT_ID(N'dbo.Dim_Syspro_HotfixBaseline', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Dim_Syspro_HotfixBaseline
  SET Active = 0,
      ImportedAtUtc = SYSUTCDATETIME()
  WHERE Active = 1
    AND (
      HotfixCode NOT LIKE N'KB%'
      OR Title LIKE N'Sample%'
      OR Title LIKE N'Sample %'
      OR Title LIKE N'%Sample mandatory%'
      OR Title LIKE N'%Sample optional%'
      OR Title LIKE N'%Sample ledger%'
    );
  PRINT CONCAT(N'Deactivated sample/non-KB baseline rows: ', @@ROWCOUNT);
END
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_HotfixGap
AS
WITH cust AS (
  SELECT
    c.CustomerCode,
    c.DisplayName,
    c.SqlInstanceName AS InstanceName,
    c.Active,
    v.ProductVersion,
    /* 8.10.0000 -> 810 ; 8.11.0000 -> 811 */
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
    /* 8.11 -> 811 ; 8.12 -> 812 ; 2025 / other -> NULL (always in scope) */
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
  SELECT
    i.InstanceName,
    i.HotfixCode,
    i.InstalledAt,
    i.Source
  FROM dbo.Syspro_HotfixInstalled AS i WITH (NOLOCK)
  INNER JOIN (
    SELECT InstanceName, MAX(SnapshotDate) AS mx
    FROM dbo.Syspro_HotfixInstalled WITH (NOLOCK)
    GROUP BY InstanceName
  ) AS m
    ON m.InstanceName = i.InstanceName
   AND m.mx = i.SnapshotDate
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
  i.InstalledAt,
  i.Source AS InstalledSource
FROM cust AS c
INNER JOIN base AS b
  ON (
    /* Unknown customer version: keep full baseline (safe default) */
    c.CustomerVerKey IS NULL
    /* Non-version release labels (Crystal 2025 etc.): always in scope */
    OR b.ReleaseVerKey IS NULL
    /* Versioned HF: only if release <= installed product */
    OR b.ReleaseVerKey <= c.CustomerVerKey
  )
LEFT JOIN inst AS i
  ON i.InstanceName = c.InstanceName
 AND (
      i.HotfixCode = b.HotfixCode
      OR REPLACE(UPPER(i.HotfixCode), N'KB', N'') = REPLACE(UPPER(b.HotfixCode), N'KB', N'')
     );
GO

PRINT N'vw_Kpi_Syspro_HotfixGap (version-scoped) OK';
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
  SUM(CASE WHEN IsMissing = 1 THEN 1 ELSE 0 END) AS MissingCount,
  SUM(CASE WHEN IsMissing = 0 THEN 1 ELSE 0 END) AS InstalledMatchCount,
  SUM(CASE WHEN IsMissing = 1 AND Severity LIKE N'%Mandat%' THEN 1 ELSE 0 END) AS MissingMandatory,
  SUM(CASE WHEN Severity LIKE N'%Mandat%' THEN 1 ELSE 0 END) AS MandatoryBaselineCount
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
  SUM(CASE WHEN IsMissing = 1 THEN 1 ELSE 0 END) AS MissingMandatory,
  SUM(CASE WHEN IsMissing = 0 THEN 1 ELSE 0 END) AS MandatoryInstalled
FROM dbo.vw_Kpi_Syspro_HotfixGap WITH (NOLOCK)
WHERE Severity LIKE N'%Mandat%'
GROUP BY CustomerCode, DisplayName, InstanceName;
GO

PRINT N'vw_Kpi_Syspro_HotfixGap_Mandatory OK';
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap_Summary TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Kpi_Syspro_HotfixGap_Mandatory TO [Rpm_collect];
  PRINT N'Grants OK';
END
GO

/* Verify */
SELECT
  CustomerCode,
  CustomerProductVersion,
  CustomerVerKey,
  MissingMandatory,
  MissingCount,
  BaselineCount,
  MandatoryBaselineCount
FROM dbo.vw_Kpi_Syspro_HotfixGap_Summary WITH (NOLOCK)
WHERE CustomerCode IN (N'AHIC', N'UVSS')
ORDER BY CustomerCode;

SELECT
  CustomerCode,
  HotfixCode,
  Severity,
  ReleaseLabel,
  ReleaseVerKey,
  LEFT(Title, 70) AS Title
FROM dbo.vw_Kpi_Syspro_HotfixGap WITH (NOLOCK)
WHERE CustomerCode IN (N'AHIC', N'UVSS')
  AND IsMissing = 1
  AND Severity LIKE N'%Mandat%'
ORDER BY CustomerCode, HotfixCode;

PRINT N'=== 372 version-scoped hotfix gap complete ===';
GO
