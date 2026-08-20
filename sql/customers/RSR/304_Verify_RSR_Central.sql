USE RPMAssure_App;
GO
SET NOCOUNT ON;
SELECT CustomerCode, DisplayName, Active, SqlInstanceName FROM dbo.Dim_Customer WHERE CustomerCode = N'RSR';
SELECT 'Operators' AS Src, COUNT(*) AS Cnt, MAX(ImportedAt) AS LastAt FROM dbo.Syspro_Operators WHERE InstanceName = N'RSR-SQLSRV-DB'
UNION ALL SELECT 'Jobs', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_JobLogging WHERE InstanceName = N'RSR-SQLSRV-DB'
UNION ALL SELECT 'License', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_SystemLicense WHERE InstanceName = N'RSR-SQLSRV-DB'
UNION ALL SELECT 'Tasks', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_TaskGroup WHERE InstanceName = N'RSR-SQLSRV-DB'
UNION ALL SELECT 'HealthLog', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_HealthLog WHERE InstanceName = N'RSR-SQLSRV-DB';
GO
