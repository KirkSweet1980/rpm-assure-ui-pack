/*
  CUSTOMER SQL (RSS-PROD) — create standard collect login
  Run as SYSPROAdmin (or sa):

  sqlcmd -S "." -U SYSPROAdmin -P "$y$pr0" -C -b -i 302_RSS_Create_Collect_Login.sql

  Creates:
    Login rpmassure / (set locally — not in git)
    db_datareader on listed SYSPRO DBs
*/
USE master;
GO
SET NOCOUNT ON;
DECLARE @LoginName sysname = N'rpmassure';
DECLARE @Password nvarchar(128) = N'';
DECLARE @Dbs TABLE (DbName sysname);
INSERT @Dbs (DbName) VALUES
  (N'Sysprodb'),
  (N'SysproCompanyF'),
  (N'SysproCompanyR'),
  (N'SysproCompanyR_SRS'),
  (N'SysproCompanyS'),
  (N'SysproCompanyS_SRS'),
  (N'SysproCompanyW'),
  (N'SYSPRODeployment');
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @LoginName)
BEGIN
  DECLARE @sql nvarchar(max) = N'CREATE LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') + N', CHECK_POLICY = ON;';
  EXEC sys.sp_executesql @sql;
  PRINT N'Login created: rpmassure';
END
ELSE
BEGIN
  DECLARE @sql2 nvarchar(max) = N'ALTER LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') + N';';
  EXEC sys.sp_executesql @sql2;
  PRINT N'Login password updated: rpmassure';
END
DECLARE @db sysname;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT DbName FROM @Dbs;
OPEN c;
FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF DB_ID(@db) IS NOT NULL
  BEGIN
    DECLARE @g nvarchar(max) = N'
USE ' + QUOTENAME(@db) + N';
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''rpmassure'')
  CREATE USER ' + QUOTENAME(@LoginName) + N' FOR LOGIN ' + QUOTENAME(@LoginName) + N';
ALTER ROLE db_datareader ADD MEMBER ' + QUOTENAME(@LoginName) + N';
';
    BEGIN TRY
      EXEC sys.sp_executesql @g;
      PRINT CONCAT(N'Granted db_datareader on ', @db);
    END TRY
    BEGIN CATCH
      PRINT CONCAT(N'Grant FAIL ', @db, N': ', ERROR_MESSAGE());
    END CATCH
  END
  ELSE
    PRINT CONCAT(N'Skip missing DB: ', @db);
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
PRINT N'Local rpmassure ready on RSS-PROD.';
GO
