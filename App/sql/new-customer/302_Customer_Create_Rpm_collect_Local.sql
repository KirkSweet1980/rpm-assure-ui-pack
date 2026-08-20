/*
  CUSTOMER SQL — create local read login Rpm_collect (edit password + DB list)
  Run as sa on customer instance:

  sqlcmd -S "." -U sa -P "..." -C -b -i 302_Customer_Create_Rpm_collect_Local.sql
*/
USE master;
GO
SET NOCOUNT ON;

/* ========= EDIT ========= */
DECLARE @LoginName sysname = N'Rpm_collect';
DECLARE @Password  nvarchar(128) = N'CHANGE_ME_STRONG_PASSWORD';  -- same as central
/* Company / SYSPRO DBs to grant db_datareader */
DECLARE @Dbs TABLE (DbName sysname);
INSERT @Dbs (DbName) VALUES
  (N'Sysprodb');
  -- (N'COMPANY_I'), (N'COMPANY_Y'), (N'COMPANY_Z');
/* ======================== */

IF @Password = N'CHANGE_ME_STRONG_PASSWORD'
BEGIN
  RAISERROR(N'Set @Password before running.', 16, 1);
  RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @LoginName)
BEGIN
  DECLARE @sql nvarchar(max) = N'CREATE LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') + N', CHECK_POLICY = ON;';
  EXEC sys.sp_executesql @sql;
  PRINT CONCAT(N'Login created: ', @LoginName);
END
ELSE
  PRINT CONCAT(N'Login exists: ', @LoginName);

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

PRINT N'Local Rpm_collect ready.';
GO
