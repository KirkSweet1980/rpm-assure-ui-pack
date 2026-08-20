/*
  UVSS job logging → central Syspro_JobLogging
  Central column is Operator (not OperatorCode).
  Source: {CompanyDb}.dbo.AdmJobLogging

  sqlcmd -S "." -U "Rpm_collect" -P "RpmCollect#AHIC2026" -C -b -i thisfile.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'UVSS';
DECLARE @InstanceName nvarchar(100) = N'UVSS-SYSPRO';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);
DECLARE @Days int = 14;
DECLARE @Total int = 0;

PRINT CONCAT(N'=== UVSS job logging ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'UVSS not active.', 16, 1);
    RETURN;
END;

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_JobLogging
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

DECLARE @Dbs TABLE (DbName sysname);
INSERT @Dbs VALUES
  (N'Sysprodb'),
  (N'SysproCompanyE'),
  (N'SysproCompanyI'),
  (N'SysproCompanyM'),
  (N'SysproCompanyR'),
  (N'SysproCompanyU');

DECLARE @db sysname;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT DbName FROM @Dbs;
OPEN c;
FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF DB_ID(@db) IS NULL
  BEGIN
    PRINT CONCAT(N'  skip missing ', @db);
    FETCH NEXT FROM c INTO @db;
    CONTINUE;
  END

  IF OBJECT_ID(QUOTENAME(@db) + N'.dbo.AdmJobLogging', N'U') IS NULL
  BEGIN
    PRINT CONCAT(N'  ', @db, N': no AdmJobLogging');
    FETCH NEXT FROM c INTO @db;
    CONTINUE;
  END

  /* Central uses Operator (not OperatorCode) — match AHIC 213 */
  DECLARE @sql nvarchar(max) = N'
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_JobLogging
  (
    SnapshotDate, InstanceName, CompanyDb, ProgramName, Operator, Message,
    ProgErrorCode, ErrorStatusCode, TransactionStatus, ProgRunDate, ImpactDate, ImportedAt
  )
  SELECT TOP (8000)
    @snap,
    @inst,
    @cdb,
    LTRIM(RTRIM(CONVERT(nvarchar(200), j.ProgramName))),
    LTRIM(RTRIM(CONVERT(nvarchar(50), j.Operator))),
    CONVERT(nvarchar(max), j.Message),
    TRY_CONVERT(decimal(18,2), j.ProgErrorCode),
    NULL,
    TRY_CONVERT(nvarchar(100), j.TransactionStatus),
    TRY_CONVERT(datetime2(3), j.ProgRunDate),
    TRY_CONVERT(datetime2(3), j.ProgRunDate),
    SYSUTCDATETIME()
  FROM ' + QUOTENAME(@db) + N'.dbo.AdmJobLogging AS j
  WHERE (
          (j.ProgErrorCode IS NOT NULL AND j.ProgErrorCode <> 0)
       OR (j.TransactionStatus LIKE N''%Fail%'')
       OR (j.Message LIKE N''%error%'')
      )
    AND (
          TRY_CONVERT(datetime2(3), j.ProgRunDate) >= DATEADD(DAY, -@days, CAST(@snap AS datetime2))
       OR j.ProgRunDate IS NULL
      )
  ORDER BY j.ProgRunDate DESC;';

  BEGIN TRY
    DECLARE @rc int = 0;
    EXEC sys.sp_executesql @sql,
      N'@snap date, @inst nvarchar(100), @cdb nvarchar(100), @days int',
      @snap = @SnapshotDate, @inst = @InstanceName, @cdb = @db, @days = @Days;
    SET @rc = @@ROWCOUNT;
    SET @Total += @rc;
    PRINT CONCAT(N'  ', @db, N'.AdmJobLogging rows=', @rc);
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'  ', @db, N' FAIL: ', ERROR_MESSAGE());
  END CATCH

  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;

PRINT CONCAT(N'Total job rows written: ', @Total);

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer_SyncLog
  (ActionType, CustomerCode, Detail, DryRun)
VALUES (
  N'SysproJobCollect',
  @CustomerCode,
  CONCAT(N'UVSS rows=', @Total, N' snap=', CONVERT(char(10), @SnapshotDate, 23)),
  0
);

PRINT N'=== Done UVSS job logging ===';
GO
