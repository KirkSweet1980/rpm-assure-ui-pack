SET NOCOUNT ON;
SELECT CustomerCode, DisplayName, Active, SqlInstanceName, UpdatedAt
FROM dbo.Dim_Customer WHERE CustomerCode = N'RSS';
SELECT N'Operators' AS Src, COUNT(*) AS Cnt, MAX(ImportedAt) AS LastAt
FROM dbo.Syspro_Operators WHERE InstanceName = N'RSS-PROD'
UNION ALL
SELECT N'Jobs', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_JobLogging WHERE InstanceName = N'RSS-PROD'
UNION ALL
SELECT N'License', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_SystemLicense WHERE InstanceName = N'RSS-PROD'
UNION ALL
SELECT N'Tasks', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_TaskGroup WHERE InstanceName = N'RSS-PROD'
UNION ALL
SELECT N'HealthLog', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_HealthLog WHERE InstanceName = N'RSS-PROD';
GO
