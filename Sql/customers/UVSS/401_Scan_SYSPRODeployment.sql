/*
  UVSS — scan SYSPRODeployment (and similar) for hotfix/product tables
  Run ON UVSS-SYSPRO as Rpm_collect or sa
  sqlcmd -S "." -U Rpm_collect -P "..." -C -i 401_Scan_SYSPRODeployment.sql
*/
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET ANSI_WARNINGS ON;

PRINT N'=== Scan SYSPRODeployment / Installer catalogs ===';

DECLARE @db sysname, @sql nvarchar(max);

DECLARE dbs CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases WITH (NOLOCK)
  WHERE state_desc = N'ONLINE'
    AND name NOT IN (N'master',N'model',N'msdb',N'tempdb')
    AND (
      name LIKE N'%Deploy%'
      OR name LIKE N'%SYSPRO%Deploy%'
      OR name = N'SYSPRODeployment'
      OR name LIKE N'%Installer%'
    )
  ORDER BY name;

OPEN dbs;
FETCH NEXT FROM dbs INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  PRINT CONCAT(N'--- DB ', @db, N' ---');
  SET @sql = N'
  SELECT TABLE_SCHEMA, TABLE_NAME
  FROM ' + QUOTENAME(@db) + N'.INFORMATION_SCHEMA.TABLES
  WHERE TABLE_TYPE = ''BASE TABLE''
    AND (
      TABLE_NAME LIKE ''%Hotfix%'' OR TABLE_NAME LIKE ''%hotfix%''
      OR TABLE_NAME LIKE ''%Product%'' OR TABLE_NAME LIKE ''%Release%''
      OR TABLE_NAME LIKE ''%Package%'' OR TABLE_NAME LIKE ''%Patch%''
      OR TABLE_NAME LIKE ''%KB%'' OR TABLE_NAME LIKE ''%Deploy%''
      OR TABLE_NAME LIKE ''%Machine%'' OR TABLE_NAME LIKE ''%Install%''
    )
  ORDER BY TABLE_NAME;';
  BEGIN TRY
    EXEC sp_executesql @sql;
  END TRY BEGIN CATCH
    PRINT CONCAT(N'  FAIL list tables: ', ERROR_MESSAGE());
  END CATCH

  /* sample row counts for Hotfix-like */
  SET @sql = N'
  DECLARE @t sysname, @q nvarchar(max), @n bigint;
  DECLARE c CURSOR LOCAL FAST_FORWARD FOR
    SELECT TABLE_SCHEMA + ''.'' + TABLE_NAME
    FROM ' + QUOTENAME(@db) + N'.INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = ''BASE TABLE''
      AND (TABLE_NAME LIKE ''%Hotfix%'' OR TABLE_NAME LIKE ''%Product%'' OR TABLE_NAME LIKE ''%Release%'');
  OPEN c; FETCH NEXT FROM c INTO @t;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @q = N''SELECT @n = COUNT_BIG(*) FROM ' + QUOTENAME(@db) + N'.'' + @t;
    BEGIN TRY
      EXEC sp_executesql @q, N''@n bigint OUTPUT'', @n OUTPUT;
      PRINT CONCAT(N''  '', @t, N'' rows='', @n);
    END TRY BEGIN CATCH
      PRINT CONCAT(N''  '', @t, N'' count FAIL'');
    END CATCH
    FETCH NEXT FROM c INTO @t;
  END
  CLOSE c; DEALLOCATE c;';
  BEGIN TRY EXEC sp_executesql @sql; END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH

  FETCH NEXT FROM dbs INTO @db;
END
CLOSE dbs; DEALLOCATE dbs;

/* Also list all non-system DBs for awareness */
PRINT N'--- All user DBs ---';
SELECT name, state_desc FROM sys.databases WITH (NOLOCK)
WHERE database_id > 4 ORDER BY name;

PRINT N'=== Scan done — paste output for collector design ===';
GO
