/*
  RSR-SQLSRV-DB: create rpmassure + grants
  Run as SYSPROAdmin
  sqlcmd -S "." -U "SYSPROAdmin" -P "Syspr0SA" -C -b -i thisfile
*/
USE master;
GO
SET NOCOUNT ON;

DECLARE @Login sysname = N'rpmassure';
DECLARE @Pwd   nvarchar(128) = N'';
DECLARE @sql   nvarchar(max);

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @Login)
BEGIN
  SET @sql = N'CREATE LOGIN ' + QUOTENAME(@Login) + N' WITH PASSWORD = N''' + REPLACE(@Pwd, '''', '''''') + N''', CHECK_POLICY = OFF, DEFAULT_DATABASE = [master];';
  EXEC sp_executesql @sql;
  PRINT N'Login rpmassure created on RSR-SQLSRV-DB';
END
ELSE
  PRINT N'Login exists: rpmassure';

-- Ensure server login can connect
IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @Login AND is_disabled = 1)
  ALTER LOGIN [rpmassure] ENABLE;

-- User + datareader on each DB
DECLARE @Dbs TABLE (DbName sysname);
INSERT @Dbs (DbName)
SELECT name FROM sys.databases
WHERE name IN (N'SysproDB', N'SysproDB', N'SysproCompanyRSL', N'SysproCompanyRST', N'SYSPRODeployment')
  AND state_desc = N'ONLINE';

DECLARE @db sysname;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT DbName FROM @Dbs;
OPEN c;
FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  BEGIN TRY
    SET @sql = N'USE ' + QUOTENAME(@db) + N';
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''rpmassure'')
  CREATE USER [rpmassure] FOR LOGIN [rpmassure];
ALTER ROLE db_datareader ADD MEMBER [rpmassure];
';
    EXEC sp_executesql @sql;
    PRINT CONCAT(N'Granted db_datareader on ', @db);
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'Grant fail ', @db, N': ', ERROR_MESSAGE());
  END CATCH
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;

PRINT N'RSR local rpmassure ready.';
GO
