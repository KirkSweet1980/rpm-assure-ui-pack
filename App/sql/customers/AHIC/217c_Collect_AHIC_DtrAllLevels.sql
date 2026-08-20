/*
  AHIC — FinSight DTR Levels 1+2+3 (all company DBs) → central Syspro_Dtr*
  Run ON the customer SYSPRO SQL host (linked server RPM_CENTRAL).

  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\collect\Run-Dtr-AllLevels.ps1 -CustomerCode AHIC
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'AHIC';
DECLARE @InstanceName nvarchar(100) = N'AHIC-SSQL-SRV';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== AHIC DTR L1+L2+L3 ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'AHIC not active on central Dim_Customer.', 16, 1);
    RETURN;
END;

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrApBalances  WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrArBalances  WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrAssBalances WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrCbBalances  WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrDnBalances  WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrGitBalances WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrGrnBalances WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrInvBalances WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrWipBalances WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrWpiBalances WHERE SnapshotDate=@SnapshotDate AND InstanceName=@InstanceName;

DECLARE @Companies TABLE (DbName sysname PRIMARY KEY);
INSERT INTO @Companies (DbName)
SELECT name FROM sys.databases
WHERE state_desc = N'ONLINE'
  AND (
    name LIKE N'SysproCompany%'
    OR name LIKE N'Syspro%Company%'
    OR name LIKE N'%AR_I'
    OR name = N'AHICAR_I'
  );

IF NOT EXISTS (SELECT 1 FROM @Companies)
BEGIN
  DECLARE @db0 sysname, @sql0 nvarchar(max);
  DECLARE d0 CURSOR LOCAL FAST_FORWARD FOR
    SELECT name FROM sys.databases WHERE state_desc=N'ONLINE' AND database_id > 4;
  OPEN d0; FETCH NEXT FROM d0 INTO @db0;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @sql0 = N'IF OBJECT_ID(N''' + REPLACE(@db0, N'''', N'''''') + N'.dbo.DtrInvBalances'', N''U'') IS NOT NULL
      OR OBJECT_ID(N''' + REPLACE(@db0, N'''', N'''''') + N'.dbo.DtrApBalances'', N''U'') IS NOT NULL
      INSERT INTO @Companies(DbName)
      SELECT N''' + REPLACE(@db0, N'''', N'''''') + N'''
      WHERE NOT EXISTS (SELECT 1 FROM @Companies WHERE DbName = N''' + REPLACE(@db0, N'''', N'''''') + N''');';
    BEGIN TRY EXEC sp_executesql @sql0; END TRY BEGIN CATCH END CATCH
    FETCH NEXT FROM d0 INTO @db0;
  END
  CLOSE d0; DEALLOCATE d0;
END

IF NOT EXISTS (SELECT 1 FROM @Companies)
BEGIN
  PRINT N'No company / DTR databases found. Datarapt may not be installed.';
  SELECT name AS OnlineDb FROM sys.databases WHERE state_desc=N'ONLINE' ORDER BY 1;
  RETURN;
END

PRINT N'Company DBs:';
SELECT DbName FROM @Companies ORDER BY 1;

DECLARE @CompanyDb sysname;
DECLARE @sql nvarchar(max);
DECLARE @rc int = 0, @total int = 0, @srcCnt int, @l1 int, @l2 int, @l3 int;

DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT DbName FROM @Companies ORDER BY 1;
OPEN c;
FETCH NEXT FROM c INTO @CompanyDb;
WHILE @@FETCH_STATUS = 0
BEGIN
  PRINT CONCAT(N'-- DB ', @CompanyDb);

  BEGIN TRY
    IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrInvBalances') IS NOT NULL
    BEGIN
      SET @sql = N'SELECT @srcCnt=COUNT(*),
        @l1=SUM(CASE WHEN TRY_CONVERT(int,InformationLevel)=1 THEN 1 ELSE 0 END),
        @l2=SUM(CASE WHEN TRY_CONVERT(int,InformationLevel)=2 THEN 1 ELSE 0 END),
        @l3=SUM(CASE WHEN TRY_CONVERT(int,InformationLevel)=3 THEN 1 ELSE 0 END)
        FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrInvBalances;';
      EXEC sp_executesql @sql, N'@srcCnt int OUTPUT,@l1 int OUTPUT,@l2 int OUTPUT,@l3 int OUTPUT',
        @srcCnt=@srcCnt OUTPUT,@l1=@l1 OUTPUT,@l2=@l2 OUTPUT,@l3=@l3 OUTPUT;
      PRINT CONCAT(N'  INV src=',ISNULL(@srcCnt,0),N' L1=',ISNULL(@l1,0),N' L2=',ISNULL(@l2,0),N' L3=',ISNULL(@l3,0));
      IF ISNULL(@srcCnt,0) > 0
      BEGIN
        SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrInvBalances
(SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,
 LevelKey,GlCode,Dimension1,Warehouse,Description,
 InvOpenBalance,InvCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt)
SELECT @Snap,@Inst,@Db,@Cust,
  TRY_CONVERT(int,s.GlYear),TRY_CONVERT(int,s.GlPeriod),TRY_CONVERT(tinyint,s.InformationLevel),
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50),COALESCE(s.GlCode,s.Description)))),N''''),
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50),s.GlCode))),N''''),
  LTRIM(RTRIM(CONVERT(nvarchar(50),s.Warehouse))),
  LTRIM(RTRIM(CONVERT(nvarchar(50),s.Warehouse))),
  LTRIM(RTRIM(CONVERT(nvarchar(200),s.Description))),
  TRY_CONVERT(decimal(18,2),s.InvOpenBalance),TRY_CONVERT(decimal(18,2),s.InvCloseBalance),
  TRY_CONVERT(decimal(18,2),s.GlOpenBalance),TRY_CONVERT(decimal(18,2),s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2),s.Variance),TRY_CONVERT(datetime2(3),s.RefreshDate),SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrInvBalances s
WHERE TRY_CONVERT(int,s.InformationLevel) IN (1,2,3);
SET @rcOut=@@ROWCOUNT;';
        SET @rc=0;
        EXEC sp_executesql @sql,
          N'@Snap date,@Inst nvarchar(100),@Db nvarchar(100),@Cust nvarchar(50),@rcOut int OUTPUT',
          @SnapshotDate,@InstanceName,@CompanyDb,@CustomerCode,@rc OUTPUT;
        SET @total += ISNULL(@rc,0);
        PRINT CONCAT(N'  INV inserted L1-3=',ISNULL(@rc,0));
      END
    END ELSE PRINT N'  INV missing';
  END TRY BEGIN CATCH PRINT CONCAT(N'  INV FAIL: ',ERROR_MESSAGE()); END CATCH

  BEGIN TRY
    IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrApBalances') IS NOT NULL
    BEGIN
      SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrApBalances
(SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,
 LevelKey,GlCode,Dimension1,Branch,Description,
 ApOpenBalance,ApCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt)
SELECT @Snap,@Inst,@Db,@Cust,
  TRY_CONVERT(int,s.GlYear),TRY_CONVERT(int,s.GlPeriod),TRY_CONVERT(tinyint,s.InformationLevel),
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50),COALESCE(s.GlCode,s.Description)))),N''''),
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50),s.GlCode))),N''''),
  NULL,NULL,
  LTRIM(RTRIM(CONVERT(nvarchar(200),s.Description))),
  TRY_CONVERT(decimal(18,2),s.ApOpenBalance),TRY_CONVERT(decimal(18,2),s.ApCloseBalance),
  TRY_CONVERT(decimal(18,2),s.GlOpenBalance),TRY_CONVERT(decimal(18,2),s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2),s.Variance),TRY_CONVERT(datetime2(3),s.RefreshDate),SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrApBalances s
WHERE TRY_CONVERT(int,s.InformationLevel) IN (1,2,3);
SET @rcOut=@@ROWCOUNT;';
      SET @rc=0;
      EXEC sp_executesql @sql,
        N'@Snap date,@Inst nvarchar(100),@Db nvarchar(100),@Cust nvarchar(50),@rcOut int OUTPUT',
        @SnapshotDate,@InstanceName,@CompanyDb,@CustomerCode,@rc OUTPUT;
      SET @total += ISNULL(@rc,0);
      PRINT CONCAT(N'  AP inserted L1-3=',ISNULL(@rc,0));
    END ELSE PRINT N'  AP missing';
  END TRY BEGIN CATCH PRINT CONCAT(N'  AP FAIL: ',ERROR_MESSAGE()); END CATCH

  BEGIN TRY
    IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrArBalances') IS NOT NULL
    BEGIN
      SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrArBalances
(SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,
 LevelKey,GlCode,Dimension1,Branch,Description,
 ArOpenBalance,ArCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt)
SELECT @Snap,@Inst,@Db,@Cust,
  TRY_CONVERT(int,s.GlYear),TRY_CONVERT(int,s.GlPeriod),TRY_CONVERT(tinyint,s.InformationLevel),
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50),COALESCE(s.GlCode,s.Description)))),N''''),
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50),s.GlCode))),N''''),
  NULL,NULL,
  LTRIM(RTRIM(CONVERT(nvarchar(200),s.Description))),
  TRY_CONVERT(decimal(18,2),s.ArOpenBalance),TRY_CONVERT(decimal(18,2),s.ArCloseBalance),
  TRY_CONVERT(decimal(18,2),s.GlOpenBalance),TRY_CONVERT(decimal(18,2),s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2),s.Variance),TRY_CONVERT(datetime2(3),s.RefreshDate),SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrArBalances s
WHERE TRY_CONVERT(int,s.InformationLevel) IN (1,2,3);
SET @rcOut=@@ROWCOUNT;';
      SET @rc=0;
      EXEC sp_executesql @sql,
        N'@Snap date,@Inst nvarchar(100),@Db nvarchar(100),@Cust nvarchar(50),@rcOut int OUTPUT',
        @SnapshotDate,@InstanceName,@CompanyDb,@CustomerCode,@rc OUTPUT;
      SET @total += ISNULL(@rc,0);
      PRINT CONCAT(N'  AR inserted L1-3=',ISNULL(@rc,0));
    END ELSE PRINT N'  AR missing';
  END TRY BEGIN CATCH PRINT CONCAT(N'  AR FAIL: ',ERROR_MESSAGE()); END CATCH

  DECLARE @mod sysname, @src sysname, @tgt sysname;
  DECLARE mods CURSOR LOCAL FAST_FORWARD FOR
    SELECT m, src, tgt FROM (VALUES
      (N'ASS', N'DtrAssBalances', N'Syspro_DtrAssBalances'),
      (N'CB',  N'DtrCbBalances',  N'Syspro_DtrCbBalances'),
      (N'DN',  N'DtrDnBalances',  N'Syspro_DtrDnBalances'),
      (N'GIT', N'DtrGitBalances', N'Syspro_DtrGitBalances'),
      (N'GRN', N'DtrGrnBalances', N'Syspro_DtrGrnBalances'),
      (N'WIP', N'DtrWipBalances', N'Syspro_DtrWipBalances'),
      (N'WPI', N'DtrWpiBalances', N'Syspro_DtrWpiBalances')
    ) v(m, src, tgt);
  OPEN mods;
  FETCH NEXT FROM mods INTO @mod, @src, @tgt;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.' + @src) IS NOT NULL
      BEGIN
        SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.' + QUOTENAME(@tgt) + N'
(SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,
 LevelKey,GlCode,Description,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt)
SELECT @Snap,@Inst,@Db,@Cust,
  TRY_CONVERT(int,s.GlYear),TRY_CONVERT(int,s.GlPeriod),TRY_CONVERT(tinyint,s.InformationLevel),
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50),COALESCE(s.GlCode,s.Description)))),N''''),
  NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50),s.GlCode))),N''''),
  LTRIM(RTRIM(CONVERT(nvarchar(200),s.Description))),
  TRY_CONVERT(decimal(18,2),s.GlOpenBalance),TRY_CONVERT(decimal(18,2),s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2),s.Variance),TRY_CONVERT(datetime2(3),s.RefreshDate),SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.' + QUOTENAME(@src) + N' s
WHERE TRY_CONVERT(int,s.InformationLevel) IN (1,2,3);
SET @rcOut=@@ROWCOUNT;';
        SET @rc=0;
        EXEC sp_executesql @sql,
          N'@Snap date,@Inst nvarchar(100),@Db nvarchar(100),@Cust nvarchar(50),@rcOut int OUTPUT',
          @SnapshotDate,@InstanceName,@CompanyDb,@CustomerCode,@rc OUTPUT;
        SET @total += ISNULL(@rc,0);
        PRINT CONCAT(N'  ',@mod,N' inserted L1-3=',ISNULL(@rc,0));
      END
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  ',@mod,N' FAIL: ',ERROR_MESSAGE());
    END CATCH
    FETCH NEXT FROM mods INTO @mod, @src, @tgt;
  END
  CLOSE mods; DEALLOCATE mods;

  FETCH NEXT FROM c INTO @CompanyDb;
END
CLOSE c; DEALLOCATE c;

PRINT CONCAT(N'=== AHIC DTR L1-3 total rows=', @total, N' ===');

SELECT N'AP-L1' AS Bucket, COUNT(*) AS Cnt FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrApBalances
WHERE InstanceName=@InstanceName AND SnapshotDate=@SnapshotDate AND InformationLevel=1
UNION ALL SELECT N'AP-L2', COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrApBalances
WHERE InstanceName=@InstanceName AND SnapshotDate=@SnapshotDate AND InformationLevel=2
UNION ALL SELECT N'AP-L3', COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrApBalances
WHERE InstanceName=@InstanceName AND SnapshotDate=@SnapshotDate AND InformationLevel=3
UNION ALL SELECT N'INV-L2', COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrInvBalances
WHERE InstanceName=@InstanceName AND SnapshotDate=@SnapshotDate AND InformationLevel=2
UNION ALL SELECT N'INV-L3', COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrInvBalances
WHERE InstanceName=@InstanceName AND SnapshotDate=@SnapshotDate AND InformationLevel=3;

PRINT N'Done. Hard-refresh FinSight for this customer.';
