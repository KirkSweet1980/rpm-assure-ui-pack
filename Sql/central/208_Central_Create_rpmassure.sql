/*
  CENTRAL — create/reset rpmassure. Password from sqlcmd -v RpmSqlPassword=...
  Never embed a password in this file.
*/
USE master;
GO
SET NOCOUNT ON;
DECLARE @LoginName sysname = N'rpmassure';
DECLARE @Password  nvarchar(128) = N'$(RpmSqlPassword)';
IF @Password IN (N'', N'$(RpmSqlPassword)')
BEGIN
  RAISERROR(N'Pass sqlcmd -v RpmSqlPassword=... — no default in this script', 16, 1);
  RETURN;
END
DECLARE @DbName    sysname = N'RPMAssure_App';
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @LoginName)
BEGIN
  DECLARE @sql nvarchar(max) = N'CREATE LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') + N', CHECK_POLICY = ON, DEFAULT_DATABASE = ' + QUOTENAME(@DbName) + N';';
  EXEC sys.sp_executesql @sql;
  PRINT N'Login created: rpmassure';
END
ELSE
BEGIN
  DECLARE @sql2 nvarchar(max) = N'ALTER LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') + N', DEFAULT_DATABASE = ' + QUOTENAME(@DbName) + N';';
  EXEC sys.sp_executesql @sql2;
  PRINT N'Login password reset: rpmassure';
END
GO
USE [RPMAssure_App];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
  CREATE USER [rpmassure] FOR LOGIN [rpmassure];
ALTER ROLE db_datareader ADD MEMBER [rpmassure];
ALTER ROLE db_datawriter ADD MEMBER [rpmassure];
PRINT N'Central rpmassure user ready.';
GO
