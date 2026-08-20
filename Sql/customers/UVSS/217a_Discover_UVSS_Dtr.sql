SET NOCOUNT ON;
PRINT N'=== UVSS DTR discover ===';
SELECT name AS DbName FROM sys.databases
WHERE state_desc = N'ONLINE' AND name LIKE N'SysproCompany%'
ORDER BY 1;

DECLARE @db sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases WHERE state_desc=N'ONLINE' AND name LIKE N'SysproCompany%';
OPEN c;
FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  PRINT CONCAT(N'-- ', @db);
  SET @sql = N'
SELECT t.name AS DtrTable
FROM ' + QUOTENAME(@db) + N'.sys.tables t
WHERE t.name LIKE N''Dtr%Balances''
ORDER BY 1;';
  BEGIN TRY EXEC sp_executesql @sql; END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH

  SET @sql = N'
IF OBJECT_ID(N''' + @db + N'.dbo.DtrInvBalances'') IS NOT NULL
  SELECT N''' + @db + N''' AS Db,
    COUNT(*) AS InvAll,
    SUM(CASE WHEN TRY_CONVERT(int, InformationLevel)=1 THEN 1 ELSE 0 END) AS InvL1,
    MIN(TRY_CONVERT(int, InformationLevel)) AS MinLvl,
    MAX(TRY_CONVERT(int, InformationLevel)) AS MaxLvl
  FROM ' + QUOTENAME(@db) + N'.dbo.DtrInvBalances;
ELSE
  SELECT N''' + @db + N''' AS Db, -1 AS InvAll, -1 AS InvL1, NULL AS MinLvl, NULL AS MaxLvl;';
  BEGIN TRY EXEC sp_executesql @sql; END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH

  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
PRINT N'=== end discover ===';
