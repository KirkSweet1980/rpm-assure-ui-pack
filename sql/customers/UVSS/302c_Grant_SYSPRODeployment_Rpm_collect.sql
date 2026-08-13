/*
  UVSS — grant Rpm_collect read on SYSPRODeployment (true hotfix source)
  Run ON UVSS-SYSPRO as sa / SYSPROAdmin:

  sqlcmd -S "." -U "SYSPROAdmin" -P "..." -C -b -i 302c_Grant_SYSPRODeployment_Rpm_collect.sql
*/
USE master;
GO
SET NOCOUNT ON;

IF DB_ID(N'SYSPRODeployment') IS NULL
BEGIN
  RAISERROR(N'SYSPRODeployment database not found.', 16, 1);
  RETURN;
END

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'Rpm_collect')
BEGIN
  RAISERROR(N'Login Rpm_collect missing — run 302 first.', 16, 1);
  RETURN;
END

USE SYSPRODeployment;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  CREATE USER [Rpm_collect] FOR LOGIN [Rpm_collect];

ALTER ROLE db_datareader ADD MEMBER [Rpm_collect];

/* Explicit grants (belt + braces) */
IF OBJECT_ID(N'dbo.CustomerHotfixes', N'U') IS NOT NULL
  GRANT SELECT ON dbo.CustomerHotfixes TO [Rpm_collect];
IF OBJECT_ID(N'dbo.CustomerInstalls', N'U') IS NOT NULL
  GRANT SELECT ON dbo.CustomerInstalls TO [Rpm_collect];
IF OBJECT_ID(N'dbo.ReleaseHotfixes', N'U') IS NOT NULL
  GRANT SELECT ON dbo.ReleaseHotfixes TO [Rpm_collect];
IF OBJECT_ID(N'dbo.ReleaseProducts', N'U') IS NOT NULL
  GRANT SELECT ON dbo.ReleaseProducts TO [Rpm_collect];
IF OBJECT_ID(N'dbo.ReleaseMaster', N'U') IS NOT NULL
  GRANT SELECT ON dbo.ReleaseMaster TO [Rpm_collect];
IF OBJECT_ID(N'dbo.Customers', N'U') IS NOT NULL
  GRANT SELECT ON dbo.Customers TO [Rpm_collect];
IF OBJECT_ID(N'dbo.CustomerMachineNames', N'U') IS NOT NULL
  GRANT SELECT ON dbo.CustomerMachineNames TO [Rpm_collect];
IF OBJECT_ID(N'dbo.DeploymentGroups', N'U') IS NOT NULL
  GRANT SELECT ON dbo.DeploymentGroups TO [Rpm_collect];

PRINT N'Granted db_datareader on SYSPRODeployment to Rpm_collect.';
GO
