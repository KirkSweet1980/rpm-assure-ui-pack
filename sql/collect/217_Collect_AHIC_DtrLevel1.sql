/*
  AHIC — Datarapt DTR Level 1 → RPMAssure_App Syspro_Dtr*Balances
  Source: AHICAR_I (primary). InformationLevel = 1 only.

  ON AHIC:
  sqlcmd -S "." -U Rpm_collect -P "RpmCollect#AHIC2026" -C -b -i thisfile.sql

  After run, central DTR variance KPIs / module health can light up.
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'AHIC';
DECLARE @InstanceName nvarchar(100) = N'AHIC-SSQL-SRV';
DECLARE @CompanyDb    nvarchar(100) = N'AHICAR_I';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== AHIC DTR L1 ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'AHIC not active on central.', 16, 1);
    RETURN;
END;

IF DB_ID(N'AHICAR_I') IS NULL
BEGIN
    RAISERROR(N'AHICAR_I database missing.', 16, 1);
    RETURN;
END;

/* Wipe today's snapshot for this instance across all 10 */
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

DECLARE @rc int, @total int = 0;

/* ---- INV (known columns from discover) ---- */
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrInvBalances
(
  SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
  LevelKey, GlCode, Dimension1, Warehouse, Description,
  InvOpenBalance, InvCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
)
SELECT
  @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode,
  TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
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
FROM AHICAR_I.dbo.DtrInvBalances AS s
WHERE TRY_CONVERT(int, s.InformationLevel) = 1;
SET @rc = @@ROWCOUNT; SET @total += @rc; PRINT CONCAT(N'  INV L1 rows=', @rc);

/* ---- AP ---- */
BEGIN TRY
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrApBalances
  (
    SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
    LevelKey, GlCode, Dimension1, Branch, Description,
    ApOpenBalance, ApCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
  )
  SELECT
    @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode,
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
  FROM AHICAR_I.dbo.DtrApBalances AS s
  WHERE TRY_CONVERT(int, s.InformationLevel) = 1;
  SET @rc = @@ROWCOUNT; SET @total += @rc; PRINT CONCAT(N'  AP L1 rows=', @rc);
END TRY BEGIN CATCH PRINT CONCAT(N'  AP FAIL: ', ERROR_MESSAGE()); END CATCH

/* ---- AR ---- */
BEGIN TRY
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrArBalances
  (
    SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
    LevelKey, GlCode, Dimension1, Branch, Description,
    ArOpenBalance, ArCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
  )
  SELECT
    @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode,
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
  FROM AHICAR_I.dbo.DtrArBalances AS s
  WHERE TRY_CONVERT(int, s.InformationLevel) = 1;
  SET @rc = @@ROWCOUNT; SET @total += @rc; PRINT CONCAT(N'  AR L1 rows=', @rc);
END TRY BEGIN CATCH PRINT CONCAT(N'  AR FAIL: ', ERROR_MESSAGE()); END CATCH


/* ---- ASS (GL + variance only; column names vary by site) ---- */
BEGIN TRY
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DtrAssBalances
  (
    SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
    LevelKey, GlCode, Description, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
  )
  SELECT
    @SnapshotDate, @InstanceName, @CompanyDb, @CustomerCode,
    TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
    LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
    LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
    LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
    TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
    TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
    TRY_CONVERT(decimal(18,2), s.Variance),
    TRY_CONVERT(datetime2(3), s.RefreshDate),
    SYSUTCDATETIME()
  FROM AHICAR_I.dbo.DtrAssBalances AS s
  WHERE TRY_CONVERT(int, s.InformationLevel) = 1;
  SET @rc = @@ROWCOUNT; SET @total += @rc; PRINT CONCAT(N'  ASS L1 rows=', @rc);
END TRY BEGIN CATCH PRINT CONCAT(N'  ASS FAIL: ', ERROR_MESSAGE()); END CATCH

/* ---- Generic Sub* types: CB, DN, GIT, GRN, WIP, WPI ---- */
DECLARE @map TABLE (Src sysname, Dest sysname, SubOpen sysname, SubClose sysname);
INSERT @map VALUES
 (N'DtrCbBalances',  N'Syspro_DtrCbBalances',  N'CbOpenBalance',  N'CbCloseBalance'),
 (N'DtrDnBalances',  N'Syspro_DtrDnBalances',  N'DnOpenBalance',  N'DnCloseBalance'),
 (N'DtrGitBalances', N'Syspro_DtrGitBalances', N'GitOpenBalance', N'GitCloseBalance'),
 (N'DtrGrnBalances', N'Syspro_DtrGrnBalances', N'GrnOpenBalance', N'GrnCloseBalance'),
 (N'DtrWipBalances', N'Syspro_DtrWipBalances', N'WipOpenBalance', N'WipCloseBalance'),
 (N'DtrWpiBalances', N'Syspro_DtrWpiBalances', N'WpiOpenBalance', N'WpiCloseBalance');

DECLARE @src sysname, @dest sysname, @so sysname, @sc sysname, @sql nvarchar(max);
DECLARE m CURSOR LOCAL FAST_FORWARD FOR SELECT Src, Dest, SubOpen, SubClose FROM @map;
OPEN m; FETCH NEXT FROM m INTO @src, @dest, @so, @sc;
WHILE @@FETCH_STATUS = 0
BEGIN
  /* Prefer named *OpenBalance; fallback SubOpenBalance if present — try primary names first */
  SET @sql = N'
  BEGIN TRY
    INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.' + QUOTENAME(@dest) + N'
    (SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
     LevelKey, GlCode, Dimension1, Description,
     SubOpenBalance, SubCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt)
    SELECT
      @snap, @inst, @cdb, @cust,
      TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
      LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
      LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
      NULL,
      LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
      TRY_CONVERT(decimal(18,2), s.' + QUOTENAME(@so) + N'),
      TRY_CONVERT(decimal(18,2), s.' + QUOTENAME(@sc) + N'),
      TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
      TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
      TRY_CONVERT(decimal(18,2), s.Variance),
      TRY_CONVERT(datetime2(3), s.RefreshDate),
      SYSUTCDATETIME()
    FROM AHICAR_I.dbo.' + QUOTENAME(@src) + N' AS s
    WHERE TRY_CONVERT(int, s.InformationLevel) = 1;
    SET @rc = @@ROWCOUNT;
  END TRY
  BEGIN CATCH
    /* fallback: only GL + variance (no sub open/close) */
    BEGIN TRY
      INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.' + QUOTENAME(@dest) + N'
      (SnapshotDate, InstanceName, CompanyDb, CustomerCode, GlYear, GlPeriod, InformationLevel,
       LevelKey, GlCode, Description, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt)
      SELECT
        @snap, @inst, @cdb, @cust,
        TRY_CONVERT(int, s.GlYear), TRY_CONVERT(int, s.GlPeriod), TRY_CONVERT(tinyint, s.InformationLevel),
        LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
        LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),
        LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),
        TRY_CONVERT(decimal(18,2), s.GlOpenBalance),
        TRY_CONVERT(decimal(18,2), s.GlCloseBalance),
        TRY_CONVERT(decimal(18,2), s.Variance),
        TRY_CONVERT(datetime2(3), s.RefreshDate),
        SYSUTCDATETIME()
      FROM AHICAR_I.dbo.' + QUOTENAME(@src) + N' AS s
      WHERE TRY_CONVERT(int, s.InformationLevel) = 1;
      SET @rc = @@ROWCOUNT;
    END TRY
    BEGIN CATCH
      SET @rc = -1;
      PRINT ERROR_MESSAGE();
    END CATCH
  END CATCH';

  BEGIN TRY
    EXEC sys.sp_executesql @sql,
      N'@snap date, @inst nvarchar(100), @cdb nvarchar(100), @cust nvarchar(50), @rc int OUTPUT',
      @snap=@SnapshotDate, @inst=@InstanceName, @cdb=@CompanyDb, @cust=@CustomerCode, @rc=@rc OUTPUT;
    IF @rc = -1
      PRINT CONCAT(N'  ', @src, N' FAIL');
    ELSE
    BEGIN
      SET @total += ISNULL(@rc, 0);
      PRINT CONCAT(N'  ', @src, N' L1 rows=', @rc);
    END
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'  ', @src, N' EXEC FAIL: ', ERROR_MESSAGE());
  END CATCH

  FETCH NEXT FROM m INTO @src, @dest, @so, @sc;
END
CLOSE m; DEALLOCATE m;

PRINT CONCAT(N'Total DTR L1 rows written: ', @total);

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer_SyncLog
  (ActionType, CustomerCode, Detail, DryRun)
VALUES (N'SysproDtrL1Collect', @CustomerCode,
  CONCAT(N'rows=', @total, N' snap=', CONVERT(char(10), @SnapshotDate, 23)), 0);

PRINT N'=== Done AHIC DTR L1 ===';
GO
