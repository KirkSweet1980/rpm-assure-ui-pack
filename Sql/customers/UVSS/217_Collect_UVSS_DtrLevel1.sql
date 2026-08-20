/*
  UVSS DTR L1+ fallback - ALL SysproCompany* DBs
  - Prefers InformationLevel = 1
  - If no L1 rows, takes MIN(InformationLevel) present (often 2 or 3)
  - Uses @rc OUTPUT so counts are real

  sqlcmd -S "." -U "Rpm_collect" -P "RpmCollect#AHIC2026" -C -b -i 217_Collect_UVSS_DtrLevel1.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'UVSS';
DECLARE @InstanceName nvarchar(100) = N'UVSS-SYSPRO';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== UVSS DTR multi-company ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'UVSS not active on central.', 16, 1);
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

DECLARE @CompanyDb sysname;
DECLARE @sql nvarchar(max);
DECLARE @rc int, @total int = 0, @srcCnt int, @lvl1 int, @minLvl int;

DECLARE @Companies TABLE (DbName sysname PRIMARY KEY);
INSERT INTO @Companies (DbName)
SELECT name FROM sys.databases
WHERE state_desc = N'ONLINE'
  AND (name LIKE N'SysproCompany%' OR name LIKE N'Syspro%Company%');

IF NOT EXISTS (SELECT 1 FROM @Companies)
BEGIN
    PRINT N'No SysproCompany* databases found on this instance.';
    PRINT N'Listing online DBs for diagnosis:';
    SELECT name FROM sys.databases WHERE state_desc=N'ONLINE' ORDER BY 1;
    RETURN;
END;

PRINT N'Company DBs:';
SELECT DbName FROM @Companies ORDER BY 1;

DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT DbName FROM @Companies ORDER BY 1;
OPEN c;
FETCH NEXT FROM c INTO @CompanyDb;
WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT CONCAT(N'-- DB ', @CompanyDb);

    /* ---------- INV ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrInvBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrInvBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  INV src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrInvBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Dimension1, Warehouse, Description,
  InvOpenBalance, InvCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), COALESCE(s.Warehouse, N'')))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), COALESCE(s.Warehouse, N'')))),
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.InvOpenBalance),
  TRY_CONVERT(decimal(18,2), s.InvCloseBalance),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrInvBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrInvBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrInvBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  INV inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  INV missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  INV FAIL: ', ERROR_MESSAGE());
    END CATCH

    /* ---------- AP ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrApBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrApBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  AP src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrApBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Dimension1, Branch, Description,
  ApOpenBalance, ApCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  NULL, NULL,
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.ApOpenBalance),
  TRY_CONVERT(decimal(18,2), s.ApCloseBalance),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrApBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrApBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrApBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  AP inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  AP missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  AP FAIL: ', ERROR_MESSAGE());
    END CATCH

    /* ---------- AR ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrArBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrArBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  AR src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrArBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Dimension1, Branch, Description,
  ArOpenBalance, ArCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  NULL, NULL,
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.ArOpenBalance),
  TRY_CONVERT(decimal(18,2), s.ArCloseBalance),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrArBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrArBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrArBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  AR inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  AR missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  AR FAIL: ', ERROR_MESSAGE());
    END CATCH

    /* ---------- CB ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrCbBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrCbBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  CB src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrCbBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Dimension1, Description,
  CbOpenBalance, CbCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  NULL,
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.CbOpenBalance),
  TRY_CONVERT(decimal(18,2), s.CbCloseBalance),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrCbBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrCbBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrCbBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  CB inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  CB missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  CB FAIL: ', ERROR_MESSAGE());
    END CATCH

    /* ---------- WIP ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrWipBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrWipBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  WIP src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrWipBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Dimension1, Description,
  WipOpenBalance, WipCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  NULL,
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.WipOpenBalance),
  TRY_CONVERT(decimal(18,2), s.WipCloseBalance),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrWipBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrWipBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrWipBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  WIP inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  WIP missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  WIP FAIL: ', ERROR_MESSAGE());
    END CATCH

    /* ---------- ASS ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrAssBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrAssBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  ASS src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrAssBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Description, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrAssBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrAssBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrAssBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  ASS inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  ASS missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  ASS FAIL: ', ERROR_MESSAGE());
    END CATCH

    /* ---------- DN ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrDnBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrDnBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  DN src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrDnBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Description, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrDnBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrDnBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrDnBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  DN inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  DN missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  DN FAIL: ', ERROR_MESSAGE());
    END CATCH

    /* ---------- GIT ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrGitBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrGitBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  GIT src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrGitBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Description, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrGitBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrGitBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrGitBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  GIT inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  GIT missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  GIT FAIL: ', ERROR_MESSAGE());
    END CATCH

    /* ---------- GRN ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrGrnBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrGrnBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  GRN src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrGrnBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Description, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrGrnBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrGrnBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrGrnBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  GRN inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  GRN missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  GRN FAIL: ', ERROR_MESSAGE());
    END CATCH

    /* ---------- WPI ---------- */
    BEGIN TRY
      IF OBJECT_ID(QUOTENAME(@CompanyDb) + N'.dbo.DtrWpiBalances') IS NOT NULL
      BEGIN
        SET @sql = N'
SELECT @srcCnt = COUNT(*),
       @lvl1 = SUM(CASE WHEN TRY_CONVERT(int, InformationLevel) = 1 THEN 1 ELSE 0 END),
       @minLvl = MIN(TRY_CONVERT(int, InformationLevel))
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrWpiBalances;';
        EXEC sp_executesql @sql,
          N'@srcCnt int OUTPUT, @lvl1 int OUTPUT, @minLvl int OUTPUT',
          @srcCnt=@srcCnt OUTPUT, @lvl1=@lvl1 OUTPUT, @minLvl=@minLvl OUTPUT;
        PRINT CONCAT(N'  WPI src=', ISNULL(@srcCnt,0), N' L1=', ISNULL(@lvl1,0), N' minLvl=', ISNULL(@minLvl,-1));

        IF ISNULL(@srcCnt,0) > 0
        BEGIN
          SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrWpiBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Description, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @Snap, @Inst, @Db, @Cust,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
  LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
  TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
  TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
  TRY_CONVERT(decimal(18,2), s.Variance),
  TRY_CONVERT(datetime2(3), s.RefreshDate),
  SYSUTCDATETIME()
FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrWpiBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = CASE
  WHEN EXISTS (SELECT 1 FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrWpiBalances x WHERE TRY_CONVERT(int, x.InformationLevel) = 1)
  THEN 1
  ELSE (SELECT MIN(TRY_CONVERT(int, y.InformationLevel)) FROM ' + QUOTENAME(@CompanyDb) + N'.dbo.DtrWpiBalances y WHERE TRY_CONVERT(int, y.InformationLevel) IS NOT NULL)
END;
SET @rcOut = @@ROWCOUNT;';
          SET @rc = 0;
          EXEC sp_executesql @sql,
            N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @Cust nvarchar(50), @rcOut int OUTPUT',
            @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode, @rc OUTPUT;
          SET @total += ISNULL(@rc, 0);
          PRINT CONCAT(N'  WPI inserted=', ISNULL(@rc,0));
        END
      END
      ELSE PRINT N'  WPI missing';
    END TRY BEGIN CATCH
      PRINT CONCAT(N'  WPI FAIL: ', ERROR_MESSAGE());
    END CATCH

    FETCH NEXT FROM c INTO @CompanyDb;
END
CLOSE c; DEALLOCATE c;

PRINT CONCAT(N'Total DTR rows written: ', @total);
PRINT N'=== Done UVSS DTR ===';
