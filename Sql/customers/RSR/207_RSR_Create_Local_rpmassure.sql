USE master;
SET NOCOUNT ON;
PRINT '=== Create local rpmassure (optional) ===';
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'rpmassure')
BEGIN
  CREATE LOGIN [rpmassure] WITH PASSWORD = N'', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
  PRINT 'Login rpmassure created';
END
ELSE PRINT 'Login rpmassure exists';

DECLARE @db sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases
  WHERE name IN (N'SysproDB', N'SysproCompanyRSL', N'SysproCompanyRST') AND state_desc = N'ONLINE';
OPEN c; FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'USE ' + QUOTENAME(@db) + N';
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''rpmassure'')
  CREATE USER [rpmassure] FOR LOGIN [rpmassure];
ALTER ROLE db_datareader ADD MEMBER [rpmassure];
PRINT N''Granted reader on ' + @db + N''';';
  BEGIN TRY EXEC(@sql); END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
PRINT '=== Done local rpmassure ===';
