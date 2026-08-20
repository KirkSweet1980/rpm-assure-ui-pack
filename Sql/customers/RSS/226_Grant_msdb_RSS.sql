/*
  Run ON customer SQL as sa (once) if backup collect fails
*/
USE msdb;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
  CREATE USER [rpmassure] FOR LOGIN [rpmassure];
GO
GRANT SELECT ON dbo.backupset TO [rpmassure];
GRANT SELECT ON dbo.sysjobs TO [rpmassure];
GRANT SELECT ON dbo.sysjobhistory TO [rpmassure];
PRINT N'msdb grants for rpmassure done (backupset, sysjobs, sysjobhistory).';
GO
