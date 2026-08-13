/*
  AHIC — AdmJobLogging ERRORS ONLY → Syspro_JobLogging (fast)
  Replaces full 6705-row dump for scheduled runs.
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'AHIC';
DECLARE @InstanceName nvarchar(100) = N'AHIC-SSQL-SRV';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);
DECLARE @Days int = 30;
DECLARE @Total int = 0;

PRINT CONCAT(N'=== AHIC job ERRORS only ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'AHIC not active.', 16, 1);
    RETURN;
END;

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_JobLogging
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

DECLARE @db sysname = N'AHICAR_I';
DECLARE @sql nvarchar(max);
DECLARE @rc int;

IF OBJECT_ID(N'AHICAR_I.dbo.AdmJobLogging', N'U') IS NULL
BEGIN
    PRINT N'No AHICAR_I.dbo.AdmJobLogging';
    RETURN;
END;

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_JobLogging
(
  SnapshotDate, InstanceName, CompanyDb, ProgramName, Operator, Message,
  ProgErrorCode, ErrorStatusCode, TransactionStatus, ProgRunDate, ImpactDate, ImportedAt
)
SELECT
  @SnapshotDate,
  @InstanceName,
  @db,
  LTRIM(RTRIM(CONVERT(nvarchar(200), j.ProgramName))),
  LTRIM(RTRIM(CONVERT(nvarchar(50), j.Operator))),
  CONVERT(nvarchar(max), j.Message),
  TRY_CONVERT(decimal(18,2), j.ProgErrorCode),
  NULL,
  TRY_CONVERT(nvarchar(100), j.TransactionStatus),
  TRY_CONVERT(datetime2(3), j.ProgRunDate),
  TRY_CONVERT(datetime2(3), j.ProgRunDate),
  SYSUTCDATETIME()
FROM AHICAR_I.dbo.AdmJobLogging AS j
WHERE (
        (TRY_CONVERT(decimal(18,2), j.ProgErrorCode) IS NOT NULL
         AND TRY_CONVERT(decimal(18,2), j.ProgErrorCode) <> 0)
     OR (j.TransactionStatus LIKE N'%Fail%')
     OR (CONVERT(nvarchar(max), j.Message) LIKE N'%error%')
      )
  AND (
        TRY_CONVERT(datetime2(3), j.ProgRunDate) >= DATEADD(DAY, -@Days, CAST(@SnapshotDate AS datetime2))
     OR j.ProgRunDate IS NULL
      );

SET @Total = @@ROWCOUNT;
PRINT CONCAT(N'Error job rows written: ', @Total);
PRINT N'=== Done AHIC job errors only ===';
GO
