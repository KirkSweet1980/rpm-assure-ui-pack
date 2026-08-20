USE RPMAssure_App;
GO
SET NOCOUNT ON;
PRINT N'=== Tables exist? ===';
SELECT name FROM sys.tables
WHERE name IN (N'Syspro_SystemAuditLog', N'Syspro_DiagSummary', N'Syspro_SqlHealthBal')
ORDER BY 1;

PRINT N'=== Grants for Rpm_collect ===';
SELECT dp.name AS Principal, p.permission_name, p.state_desc, o.name AS Obj
FROM sys.database_permissions p
JOIN sys.database_principals dp ON dp.principal_id = p.grantee_principal_id
LEFT JOIN sys.objects o ON o.object_id = p.major_id
WHERE dp.name IN (N'Rpm_collect', N'rpm_collect')
ORDER BY 1, 4;

PRINT N'=== Row counts all instances ===';
IF OBJECT_ID(N'dbo.Syspro_SystemAuditLog') IS NOT NULL
  SELECT InstanceName, COUNT(*) c, MAX(ImportedAt) m FROM dbo.Syspro_SystemAuditLog GROUP BY InstanceName;
IF OBJECT_ID(N'dbo.Syspro_DiagSummary') IS NOT NULL
  SELECT InstanceName, COUNT(*) c, MAX(ImportedAt) m FROM dbo.Syspro_DiagSummary GROUP BY InstanceName;
IF OBJECT_ID(N'dbo.Syspro_SqlHealthBal') IS NOT NULL
  SELECT InstanceName, COUNT(*) c, MAX(ImportedAt) m FROM dbo.Syspro_SqlHealthBal GROUP BY InstanceName;
GO
