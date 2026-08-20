/*
  UVSS - diagnose DTR then try INV insert with full error text
  sqlcmd -S "." -U "Rpm_collect" -P "RpmCollect#AHIC2026" -C -b -i 217c_Diagnose_And_Collect_Dtr.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'UVSS';
DECLARE @InstanceName nvarchar(100) = N'UVSS-SYSPRO';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT N'=== 1) Linked server + customer ===';
BEGIN TRY
  SELECT TOP 1 CustomerCode, Active, SqlInstanceName
  FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = @CustomerCode;
END TRY BEGIN CATCH
  PRINT CONCAT(N'CENTRAL FAIL: ', ERROR_MESSAGE());
  RETURN;
END CATCH;

PRINT N'=== 2) Online databases ===';
SELECT name AS DbName, state_desc FROM sys.databases WHERE state_desc = N'ONLINE' ORDER BY 1;

PRINT N'=== 3) Find Dtr%Balances in every DB ===';
DECLARE @db sysname, @sql nvarchar(max);
DECLARE @found int = 0;
DECLARE dbs CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases WHERE state_desc = N'ONLINE' AND database_id > 4;
OPEN dbs;
FETCH NEXT FROM dbs INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'
  SELECT N''' + REPLACE(@db,'''','''''') + N''' AS DbName, t.name AS TableName
  FROM ' + QUOTENAME(@db) + N'.sys.tables t
  WHERE t.name LIKE N''Dtr%Balances'';';
  BEGIN TRY
    EXEC sp_executesql @sql;
    IF EXISTS (
      SELECT 1 FROM sys.databases WHERE name = @db
    )
    BEGIN
      SET @sql = N'
      IF EXISTS (SELECT 1 FROM ' + QUOTENAME(@db) + N'.sys.tables WHERE name LIKE N''Dtr%Balances'')
        SELECT 1 AS x;';
    END
  END TRY BEGIN CATCH
    PRINT CONCAT(N'  scan fail ', @db, N': ', ERROR_MESSAGE());
  END CATCH
  FETCH NEXT FROM dbs INTO @db;
END
CLOSE dbs; DEALLOCATE dbs;

PRINT N'=== 4) Per company DB INV counts ===';
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases
  WHERE state_desc = N'ONLINE'
    AND (name LIKE N'SysproCompany%' OR name LIKE N'%Company%');
OPEN c;
FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF OBJECT_ID(QUOTENAME(@db) + N'.dbo.DtrInvBalances') IS NOT NULL
  BEGIN
    SET @found = 1;
    SET @sql = N'
    SELECT N''' + REPLACE(@db,'''','''''') + N''' AS Db,
      COUNT(*) AS InvAll,
      SUM(CASE WHEN TRY_CONVERT(int, InformationLevel)=1 THEN 1 ELSE 0 END) AS L1,
      MIN(TRY_CONVERT(int, InformationLevel)) AS MinLvl,
      MAX(TRY_CONVERT(int, InformationLevel)) AS MaxLvl
    FROM ' + QUOTENAME(@db) + N'.dbo.DtrInvBalances;';
    BEGIN TRY EXEC sp_executesql @sql; END TRY
    BEGIN CATCH PRINT CONCAT(@db, N' count fail: ', ERROR_MESSAGE()); END CATCH

    /* columns */
    SET @sql = N'
    SELECT N''' + REPLACE(@db,'''','''''') + N''' AS Db, c.name AS ColName, ty.name AS Typ
    FROM ' + QUOTENAME(@db) + N'.sys.columns c
    JOIN ' + QUOTENAME(@db) + N'.sys.types ty ON ty.user_type_id = c.user_type_id
    WHERE c.object_id = OBJECT_ID(N''' + @db + N'.dbo.DtrInvBalances'')
    ORDER BY c.column_id;';
    BEGIN TRY EXEC sp_executesql @sql; END TRY
    BEGIN CATCH PRINT CONCAT(@db, N' cols fail: ', ERROR_MESSAGE()); END CATCH
  END
  ELSE
    PRINT CONCAT(N'  ', @db, N': no DtrInvBalances');
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;

IF @found = 0
BEGIN
  PRINT N'*** NO DtrInvBalances tables found in any SysproCompany* DB ***';
  PRINT N'Datarapt is not installed or not in company DBs. Ops/jobs/license still OK.';
  PRINT N'=== Done (nothing to collect) ===';
  RETURN;
END

PRINT N'=== 5) Try insert INV (all levels if no L1) ===';
/* wipe today */
BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrInvBalances
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
END TRY BEGIN CATCH
  PRINT CONCAT(N'DELETE FAIL: ', ERROR_MESSAGE());
END CATCH;

DECLARE @rc int = 0, @total int = 0;
DECLARE c2 CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases
  WHERE state_desc = N'ONLINE' AND name LIKE N'SysproCompany%';
OPEN c2;
FETCH NEXT FROM c2 INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF OBJECT_ID(QUOTENAME(@db) + N'.dbo.DtrInvBalances') IS NULL
  BEGIN
    FETCH NEXT FROM c2 INTO @db;
    CONTINUE;
  END

  /* Prefer columns that exist: Inv* or Sub* */
  SET @sql = N'
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrInvBalances
  (
    SnapshotDate, InstanceName, CompanyDb, CustomerCode,
    GlYear, GlPeriod, InformationLevel, LevelKey, GlCode, Dimension1, Warehouse, Description,
    InvOpenBalance, InvCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
  )
  SELECT
    @Snap, @Inst, @Db, @Cust,
    TRY_CONVERT(int, s.GlYear),
    TRY_CONVERT(int, s.GlPeriod),
    TRY_CONVERT(tinyint, s.InformationLevel),
    LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
    LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
    LTRIM(RTRIM(CONVERT(nvarchar(50), s.Warehouse))),
    LTRIM(RTRIM(CONVERT(nvarchar(50), s.Warehouse))),
    LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
    TRY_CONVERT(decimal(18,2), s.InvOpenBalance),
    TRY_CONVERT(decimal(18,2), s.InvCloseBalance),
    TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
    TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
    TRY_CONVERT(decimal(18,2), s.Variance),
    TRY_CONVERT(datetime2(3), s.RefreshDate),
    SYSUTCDATETIME()
  FROM ' + QUOTENAME(@db) + N'.dbo.DtrInvBalances AS s
  WHERE TRY_CONVERT(int, s.InformationLevel) IS NOT NULL;
  SET @rcOut = @@ROWCOUNT;';

  BEGIN TRY
    SET @rc = 0;
    EXEC sp_executesql @sql,
      N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
      @SnapshotDate, @InstanceName, @db, @CustomerCode, @rc OUTPUT;
    SET @total += ISNULL(@rc, 0);
    PRINT CONCAT(N'  INSERT ', @db, N' rows=', ISNULL(@rc,0));
  END TRY BEGIN CATCH
    PRINT CONCAT(N'  INSERT FAIL ', @db, N': ', ERROR_MESSAGE());
  END CATCH

  FETCH NEXT FROM c2 INTO @db;
END
CLOSE c2; DEALLOCATE c2;

PRINT CONCAT(N'Total INV rows written: ', @total);

PRINT N'=== 6) Central count ===';
BEGIN TRY
  SELECT COUNT(*) AS CentralInv, MAX(ImportedAt) AS LastAt
  FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrInvBalances
  WHERE InstanceName = @InstanceName;
END TRY BEGIN CATCH
  PRINT CONCAT(N'Central count FAIL: ', ERROR_MESSAGE());
END CATCH

PRINT N'=== Done diagnose ===';
GO
