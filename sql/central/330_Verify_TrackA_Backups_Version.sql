/*
  CENTRAL verify — Track A (SQL backups + version/hotfix)
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 330_Verify_TrackA_Backups_Version.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

PRINT N'=== Tables ===';
SELECT name FROM sys.tables
WHERE name IN (N'Sql_Backups', N'Sql_BackupFailures', N'Syspro_VersionInfo', N'Syspro_Hotfix')
ORDER BY 1;

PRINT N'=== Latest backup status by instance ===';
SELECT InstanceName, COUNT(*) AS DbCnt,
  SUM(CASE WHEN LastBackupStatus = N'OK' THEN 1 ELSE 0 END) AS OkCnt,
  SUM(CASE WHEN LastBackupStatus IN (N'Stale', N'Missing') THEN 1 ELSE 0 END) AS ProblemCnt,
  MAX(ImportedAt) AS LastImport
FROM dbo.Sql_Backups WITH (NOLOCK)
GROUP BY InstanceName
ORDER BY 1;

PRINT N'=== Latest failures (top 10) ===';
SELECT TOP 10 InstanceName, FailureAt, JobName, StepName, LEFT(Message, 80) AS Msg
FROM dbo.Sql_BackupFailures WITH (NOLOCK)
ORDER BY ImportedAt DESC;

PRINT N'=== Version info ===';
SELECT InstanceName, ProductName, ProductVersion, BuildNumber, Users, LicenseExpiry, ImportedAt
FROM dbo.Syspro_VersionInfo WITH (NOLOCK)
ORDER BY ImportedAt DESC;

PRINT N'=== Hotfix counts ===';
SELECT InstanceName, COUNT(*) AS Cnt, MAX(ImportedAt) AS LastImport
FROM dbo.Syspro_Hotfix WITH (NOLOCK)
GROUP BY InstanceName
ORDER BY 1;

PRINT N'=== Done verify ===';
GO
