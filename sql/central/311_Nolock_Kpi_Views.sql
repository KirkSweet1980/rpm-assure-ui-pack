/*
  CENTRAL — re-apply key KPI views with NOLOCK on base tables
  (reporting DB; reduces reader blocking during collect)
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Sql_BackupLatest
AS
SELECT
  b.InstanceName,
  b.SnapshotDate,
  b.DatabaseName,
  b.LastFullBackup,
  b.LastDiffBackup,
  b.LastLogBackup,
  b.LastBackupStatus,
  b.FullAgeHours,
  b.ImportedAt
FROM dbo.Sql_Backups AS b WITH (NOLOCK)
INNER JOIN (
  SELECT InstanceName, MAX(SnapshotDate) AS mx
  FROM dbo.Sql_Backups WITH (NOLOCK)
  GROUP BY InstanceName
) AS m ON m.InstanceName = b.InstanceName AND m.mx = b.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Sql_BackupSummary
AS
SELECT
  c.CustomerCode,
  c.DisplayName,
  c.SqlInstanceName AS InstanceName,
  COUNT(*) AS DatabaseCount,
  SUM(CASE WHEN b.LastBackupStatus IN (N'Missing', N'Stale', N'Fail') THEN 1 ELSE 0 END) AS ProblemCount,
  SUM(CASE WHEN b.LastFullBackup IS NULL THEN 1 ELSE 0 END) AS NeverFullCount,
  MAX(b.LastFullBackup) AS NewestFullBackup,
  MIN(b.LastFullBackup) AS OldestFullBackup,
  MAX(b.ImportedAt) AS LastImportAt
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
INNER JOIN dbo.vw_Kpi_Sql_BackupLatest AS b
  ON b.InstanceName = c.SqlInstanceName
WHERE c.Active = 1
GROUP BY c.CustomerCode, c.DisplayName, c.SqlInstanceName;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_Version_Latest
AS
SELECT
  c.CustomerCode,
  c.DisplayName,
  v.InstanceName,
  v.SnapshotDate,
  v.ProductName,
  v.ProductVersion,
  v.BuildNumber,
  v.LicenseType,
  v.Users,
  v.CompanyCount,
  v.LicenseExpiry,
  v.CustomerName,
  v.ImportedAt
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
INNER JOIN dbo.Syspro_VersionInfo AS v WITH (NOLOCK)
  ON v.InstanceName = c.SqlInstanceName
INNER JOIN (
  SELECT InstanceName, MAX(SnapshotDate) AS mx
  FROM dbo.Syspro_VersionInfo WITH (NOLOCK)
  GROUP BY InstanceName
) AS m ON m.InstanceName = v.InstanceName AND m.mx = v.SnapshotDate
WHERE c.Active = 1;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_Hotfix_Latest
AS
SELECT
  c.CustomerCode,
  h.InstanceName,
  h.SnapshotDate,
  h.HotfixCode,
  h.HotfixName,
  h.Description,
  h.Installed,
  h.InstalledAt,
  h.SourceTable
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
INNER JOIN dbo.Syspro_Hotfix AS h WITH (NOLOCK)
  ON h.InstanceName = c.SqlInstanceName
INNER JOIN (
  SELECT InstanceName, MAX(SnapshotDate) AS mx
  FROM dbo.Syspro_Hotfix WITH (NOLOCK)
  GROUP BY InstanceName
) AS m ON m.InstanceName = h.InstanceName AND m.mx = h.SnapshotDate
WHERE c.Active = 1;
GO

PRINT N'311 NOLOCK KPI views applied.';
GO
