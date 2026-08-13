USE [RPMAssure_App];
GO
SET NOCOUNT ON;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
  CREATE USER [rpmassure] FOR LOGIN [rpmassure];
DECLARE @t sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID(N'dbo')
    AND (name LIKE N'Syspro_%' OR name LIKE N'Dim_%' OR name LIKE N'Fact_%' OR name LIKE N'Sql_%');
OPEN c;
FETCH NEXT FROM c INTO @t;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.' + QUOTENAME(@t) + N' TO [rpmassure];';
  BEGIN TRY EXEC(@sql); END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
  FETCH NEXT FROM c INTO @t;
END
CLOSE c; DEALLOCATE c;
PRINT N'Granted DML on Dim_/Syspro_/Fact_/Sql_ to rpmassure';
GO
