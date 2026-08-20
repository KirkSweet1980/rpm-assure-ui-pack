/*
  RSS job logging → central Syspro_JobLogging
  ON RSS-PROD:

  sqlcmd -S "." -U "rpmassure" -P "RpmCollect#AHIC2026" -C -b -i "C:\RPM-Assure\Sql\collect\213_Collect_AHIC_JobLogging.sql"

  Tries classic AdmJobLogging columns in Sysprodb + AHICAR_I/Y/Z.
  If 0 rows, run 211 discover and we will map real table names.
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'RSS';
DECLARE @InstanceName nvarchar(100) = N'RSS-PROD';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);
DECLARE @Days int = 14;
DECLARE @Total int = 0;

PRINT CONCAT(N'=== RSS job logging ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'RSS not active on central Dim_Customer.', 16, 1);
    RETURN;
END;

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_JobLogging
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

DECLARE @db sysname, @sql nvarchar(max), @rc int;

DECLARE dbs CURSOR LOCAL FAST_FORWARD FOR
SELECT name FROM sys.databases
WHERE name IN (N'Sysprodb', N'AHICAR_I', N'AHICAR_Y', N'AHICAR_Z')
  AND state_desc = N'ONLINE';

OPEN dbs;
FETCH NEXT FROM dbs INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
    /* Prefer AdmJobLogging if present */
    SET @sql = N'
    IF OBJECT_ID(N''' + QUOTENAME(@db) + N'.dbo.AdmJobLogging'', N''U'') IS NOT NULL
    BEGIN
      INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_JobLogging
      (SnapshotDate, InstanceName, CompanyDb, ProgramName, Operator, Message,
       ProgErrorCode, ErrorStatusCode, TransactionStatus, ProgRunDate, ImpactDate, ImportedAt)
      SELECT
        @snap, @inst, @cdb,
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
      WHERE TRY_CONVERT(datetime2(3), j.ProgRunDate) >= DATEADD(DAY, -@days, CAST(@snap AS datetime2))
         OR j.ProgRunDate IS NULL;
      SET @rc = @@ROWCOUNT;
    END
    ELSE
      SET @rc = -1;';

    BEGIN TRY
        EXEC sys.sp_executesql @sql,
            N'@snap date, @inst nvarchar(100), @cdb nvarchar(100), @days int, @rc int OUTPUT',
            @snap = @SnapshotDate, @inst = @InstanceName, @cdb = @db, @days = @Days, @rc = @rc OUTPUT;
        IF @rc = -1
            PRINT CONCAT(N'  ', @db, N': no dbo.AdmJobLogging');
        ELSE
        BEGIN
            SET @Total += @rc;
            PRINT CONCAT(N'  ', @db, N'.AdmJobLogging rows=', @rc);
        END
    END TRY
    BEGIN CATCH
        PRINT CONCAT(N'  ', @db, N' FAIL: ', ERROR_MESSAGE());
    END CATCH

    FETCH NEXT FROM dbs INTO @db;
END
CLOSE dbs; DEALLOCATE dbs;

PRINT CONCAT(N'Total job rows written: ', @Total);

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer_SyncLog
    (ActionType, CustomerCode, Detail, DryRun)
VALUES (
    N'SysproJobCollect',
    @CustomerCode,
    CONCAT(N'rows=', @Total, N' snap=', CONVERT(char(10), @SnapshotDate, 23)),
    0
);

PRINT N'=== Done RSS job logging ===';
GO
