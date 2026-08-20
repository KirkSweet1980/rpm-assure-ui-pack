/*
  Run ON customer SQL as sa (once) if backup collect fails
*/
USE msdb;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  CREATE USER [Rpm_collect] FOR LOGIN [Rpm_collect];
GO
GRANT SELECT ON dbo.backupset TO [Rpm_collect];
GRANT SELECT ON dbo.sysjobs TO [Rpm_collect];
GRANT SELECT ON dbo.sysjobhistory TO [Rpm_collect];
PRINT N'msdb grants for Rpm_collect done (backupset, sysjobs, sysjobhistory).';
GO
