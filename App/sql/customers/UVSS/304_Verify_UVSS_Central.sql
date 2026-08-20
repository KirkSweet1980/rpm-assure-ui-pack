/*
  CENTRAL verify UVSS collect
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "Rpm_collect" -P "RpmCollect#AHIC2026" -C -i 304_Verify_UVSS_Central.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

PRINT N'=== Dim_Customer UVSS ===';
SELECT CustomerCode, DisplayName, Active, SqlInstanceName, UpdatedAt
FROM dbo.Dim_Customer
WHERE CustomerCode = N'UVSS';

PRINT N'=== Source row counts ===';
SELECT N'Operators' AS Src, COUNT(*) AS Cnt, MAX(ImportedAt) AS LastAt
FROM dbo.Syspro_Operators WHERE InstanceName = N'UVSS-SYSPRO'
UNION ALL
SELECT N'Jobs', COUNT(*), MAX(ImportedAt)
FROM dbo.Syspro_JobLogging WHERE InstanceName = N'UVSS-SYSPRO'
UNION ALL
SELECT N'License', COUNT(*), MAX(ImportedAt)
FROM dbo.Syspro_SystemLicense WHERE InstanceName = N'UVSS-SYSPRO'
UNION ALL
SELECT N'TaskGroup', COUNT(*), MAX(ImportedAt)
FROM dbo.Syspro_TaskGroup WHERE InstanceName = N'UVSS-SYSPRO'
UNION ALL
SELECT N'TaskItem', COUNT(*), MAX(ImportedAt)
FROM dbo.Syspro_TaskItem WHERE InstanceName = N'UVSS-SYSPRO'
UNION ALL
SELECT N'HealthLog', COUNT(*), MAX(ImportedAt)
FROM dbo.Syspro_HealthLog WHERE InstanceName = N'UVSS-SYSPRO'
UNION ALL
SELECT N'DtrInv', COUNT(*), MAX(ImportedAt)
FROM dbo.Syspro_DtrInvBalances WHERE InstanceName = N'UVSS-SYSPRO'
UNION ALL
SELECT N'DtrAp', COUNT(*), MAX(ImportedAt)
FROM dbo.Syspro_DtrApBalances WHERE InstanceName = N'UVSS-SYSPRO'
UNION ALL
SELECT N'DtrAr', COUNT(*), MAX(ImportedAt)
FROM dbo.Syspro_DtrArBalances WHERE InstanceName = N'UVSS-SYSPRO'
UNION ALL
SELECT N'DtrAllModules', (
  (SELECT COUNT(*) FROM dbo.Syspro_DtrInvBalances WHERE InstanceName = N'UVSS-SYSPRO') +
  (SELECT COUNT(*) FROM dbo.Syspro_DtrApBalances WHERE InstanceName = N'UVSS-SYSPRO') +
  (SELECT COUNT(*) FROM dbo.Syspro_DtrArBalances WHERE InstanceName = N'UVSS-SYSPRO') +
  (SELECT COUNT(*) FROM dbo.Syspro_DtrCbBalances WHERE InstanceName = N'UVSS-SYSPRO') +
  (SELECT COUNT(*) FROM dbo.Syspro_DtrWipBalances WHERE InstanceName = N'UVSS-SYSPRO')
), NULL
UNION ALL
SELECT N'OperGroup', COUNT(*), MAX(ImportedAt)
FROM dbo.Syspro_OperGroup WHERE InstanceName = N'UVSS-SYSPRO';

PRINT N'=== Active operators (login in 30 days) ===';
SELECT COUNT(*) AS ActiveOps30d
FROM dbo.Syspro_Operators
WHERE InstanceName = N'UVSS-SYSPRO'
  AND LastLoginDate >= DATEADD(DAY, -30, SYSUTCDATETIME());

PRINT N'=== Done verify UVSS ===';
GO
