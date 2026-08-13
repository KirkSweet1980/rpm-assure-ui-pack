/*
================================================================================
  CENTRAL — 102.222.21.220,14333
  Create Rpm_collect for write into RPMAssure_App
  Password MUST match AHIC local Rpm_collect + 209 linked server
================================================================================
*/
USE [master];
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'Rpm_collect')
BEGIN
    CREATE LOGIN [Rpm_collect]
        WITH PASSWORD = N'RpmCollect#AHIC2026',
             CHECK_POLICY = ON,
             CHECK_EXPIRATION = OFF;
    PRINT N'Login Rpm_collect created on central.';
END
ELSE
BEGIN
    ALTER LOGIN [Rpm_collect] WITH PASSWORD = N'RpmCollect#AHIC2026';
    PRINT N'Login Rpm_collect password reset on central.';
END
GO

USE [RPMAssure_App];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
    CREATE USER [Rpm_collect] FOR LOGIN [Rpm_collect];
GO

ALTER ROLE [db_datareader] ADD MEMBER [Rpm_collect];
ALTER ROLE [db_datawriter] ADD MEMBER [Rpm_collect];
GO

IF OBJECT_ID(N'dbo.App_User', N'U') IS NOT NULL
    DENY SELECT, INSERT, UPDATE, DELETE ON dbo.App_User TO [Rpm_collect];
IF OBJECT_ID(N'dbo.App_UserCustomer', N'U') IS NOT NULL
    DENY SELECT, INSERT, UPDATE, DELETE ON dbo.App_UserCustomer TO [Rpm_collect];
GO

PRINT N'Central Rpm_collect ready on RPMAssure_App.';
PRINT N'Test: sqlcmd -S "102.222.21.220,14333" -d RPMAssure_App -U Rpm_collect -P "RpmCollect#AHIC2026" -Q "SELECT DB_NAME();"';
GO
