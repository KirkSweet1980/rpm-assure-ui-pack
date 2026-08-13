/*
  Create Rpm_collect on RPMAssure_App — SET PASSWORD LOCALLY, never commit real password.
  Run as sysadmin on 102.222.21.220,14333
*/
USE [master];
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'Rpm_collect')
    CREATE LOGIN [Rpm_collect] WITH PASSWORD = N'<<SET_PASSWORD_LOCALLY>>', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;
ELSE
    PRINT 'Login exists — rotate with ALTER LOGIN if needed';
GO
USE [RPMAssure_App];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
    CREATE USER [Rpm_collect] FOR LOGIN [Rpm_collect];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'db_rpm_collect' AND type = 'R')
    CREATE ROLE [db_rpm_collect];
GO
ALTER ROLE [db_rpm_collect] ADD MEMBER [Rpm_collect];
GO
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [db_rpm_collect];
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.App_User TO [db_rpm_collect];
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.App_UserCustomer TO [db_rpm_collect];
GO
PRINT 'Rpm_collect configured on RPMAssure_App';
GO
