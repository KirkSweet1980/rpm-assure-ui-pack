/*
  Central — force-reset Rpm_collect password to known value
  Run as Windows admin / sa on central:

  sqlcmd -S "102.222.21.220,14333" -E -C -b -i 209b_Reset_Rpm_collect_Password.sql

  Then in app Settings type EXACTLY (no quotes):
    RpmCollect#AHIC2026
  length must be 19
*/
SET NOCOUNT ON;
USE master;
GO

-- Drop confusing duplicate casings if any (rare)
-- Keep single login Rpm_collect

IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'Rpm_collect')
BEGIN
  ALTER LOGIN [Rpm_collect] WITH PASSWORD = N'RpmCollect#AHIC2026', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
  ALTER LOGIN [Rpm_collect] ENABLE;
  PRINT 'ALTER LOGIN Rpm_collect password set to RpmCollect#AHIC2026 (len 19)';
END
ELSE
BEGIN
  CREATE LOGIN [Rpm_collect] WITH PASSWORD = N'RpmCollect#AHIC2026', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
  PRINT 'CREATE LOGIN Rpm_collect';
END
GO

USE [RPMAssure_App];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  CREATE USER [Rpm_collect] FOR LOGIN [Rpm_collect];

ALTER ROLE db_datareader ADD MEMBER [Rpm_collect];
ALTER ROLE db_datawriter ADD MEMBER [Rpm_collect];
PRINT 'User Rpm_collect mapped + datareader/datawriter on RPMAssure_App';
GO

-- Prove from SQL side (prints ok)
SELECT SUSER_SNAME() AS running_as;
GO
