/*
  Grant Rpm_collect read on msdb backup history (no sysjobsteps required).
  Run ON CUSTOMER SQL as sa / sysadmin:
    sqlcmd -S "." -U sa -P "..." -C -b -i 226_Grant_msdb_Rpm_collect.sql
*/
SET NOCOUNT ON;
USE msdb;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  CREATE USER [Rpm_collect] FOR LOGIN [Rpm_collect];
  PRINT N'Created msdb user Rpm_collect';
END
ELSE PRINT N'msdb user Rpm_collect exists';
GO
GRANT SELECT ON OBJECT::dbo.backupset TO [Rpm_collect];
GRANT SELECT ON OBJECT::dbo.backupmediafamily TO [Rpm_collect];
GRANT SELECT ON OBJECT::dbo.backupmediaset TO [Rpm_collect];
GRANT SELECT ON OBJECT::dbo.sysjobs TO [Rpm_collect];
GRANT SELECT ON OBJECT::dbo.sysjobhistory TO [Rpm_collect];
-- optional if present
IF OBJECT_ID(N'dbo.sysjobsteps', N'U') IS NOT NULL
  GRANT SELECT ON OBJECT::dbo.sysjobsteps TO [Rpm_collect];
PRINT N'msdb grants applied for Rpm_collect';
GO
