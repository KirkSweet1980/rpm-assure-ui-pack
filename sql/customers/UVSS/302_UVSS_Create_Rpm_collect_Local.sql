/*
  UVSS-SYSPRO — create local Rpm_collect (db_datareader)
  Edit @Password then run as sa on UVSS-SYSPRO:

  sqlcmd -S "." -U sa -P "..." -C -b -i 302_UVSS_Create_Rpm_collect_Local.sql
*/
USE master;
GO
SET NOCOUNT ON;

DECLARE @LoginName sysname = N'Rpm_collect';
/* Prefer same password as central Rpm_collect (AHIC used RpmCollect#AHIC2026) */
DECLARE @Password  nvarchar(128) = N'RpmCollect#AHIC2026';

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @LoginName)
BEGIN
  DECLARE @sql nvarchar(max) = N'CREATE LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') + N', CHECK_POLICY = ON;';
  EXEC sys.sp_executesql @sql;
  PRINT N'Login created: Rpm_collect';
END
ELSE
  PRINT N'Login exists: Rpm_collect';

DECLARE @Dbs TABLE (DbName sysname);
INSERT @Dbs (DbName) VALUES
  (N'Sysprodb'),
  (N'SysproCompanyE'),
  (N'SysproCompanyI'),
  (N'SysproCompanyM'),
  (N'SysproCompanyR'),
  (N'SysproCompanyU');
  /* SRS / SYSPRODeployment usually not needed for AMS collect */

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
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''Rpm_collect'')
  CREATE USER [Rpm_collect] FOR LOGIN [Rpm_collect];
ALTER ROLE db_datareader ADD MEMBER [Rpm_collect];
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

PRINT N'UVSS local Rpm_collect ready.';
GO
