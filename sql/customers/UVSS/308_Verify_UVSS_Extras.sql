USE RPMAssure_App;
GO
SET NOCOUNT ON;
SELECT 'Audit' t, COUNT(*) c, MAX(ImportedAt) m FROM dbo.Syspro_SystemAuditLog WHERE InstanceName=N'UVSS-SYSPRO'
UNION ALL SELECT 'Diag', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_DiagSummary WHERE InstanceName=N'UVSS-SYSPRO'
UNION ALL SELECT 'SqlHealth', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_SqlHealthBal WHERE InstanceName=N'UVSS-SYSPRO';
GO
