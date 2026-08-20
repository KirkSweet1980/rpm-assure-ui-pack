/*
  UVSS AdmDiagSummary columns:
  LogDate, DiagCategory, AvantiFlag, Company, Operator, DiagFileName,
  DiagFileSize, DiagText, DiagSource, TimeStamp (rowversion - ignore)
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'UVSS';
DECLARE @InstanceName nvarchar(100) = N'UVSS-SYSPRO';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== UVSS DiagSummary ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
  SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
  PRINT N'UVSS not active'; RETURN;
END

IF OBJECT_ID(N'Sysprodb.dbo.AdmDiagSummary') IS NULL
BEGIN
  PRINT N'AdmDiagSummary missing'; RETURN;
END

DECLARE @rc int;
SELECT @rc = COUNT(*) FROM Sysprodb.dbo.AdmDiagSummary;
PRINT CONCAT(N'Source rows: ', @rc);

BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DiagSummary
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
END TRY BEGIN CATCH
  PRINT CONCAT(N'DELETE FAIL: ', ERROR_MESSAGE()); RETURN;
END CATCH

BEGIN TRY
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_DiagSummary
  (
    SnapshotDate, InstanceName, CompanyDb, DiagCode, DiagName, Severity, StatusText,
    MessageText, CheckedAt, ImportedAt
  )
  SELECT
    @SnapshotDate,
    @InstanceName,
    N'Sysprodb',
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(50), d.DiagCategory))), 50),
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(200), COALESCE(NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(200), d.DiagFileName))), N''), d.DiagSource, N'Diag')))), 200),
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(50), d.DiagSource))), 50),
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(100), d.Company))), 100),
    CONVERT(nvarchar(max),
      CONCAT(
        N'Operator=', LTRIM(RTRIM(CONVERT(nvarchar(50), d.Operator))),
        N' | Size=', CONVERT(nvarchar(30), d.DiagFileSize),
        N' | ', CONVERT(nvarchar(max), d.DiagText)
      )),
    TRY_CONVERT(datetime2(3), d.LogDate),
    SYSUTCDATETIME()
  FROM Sysprodb.dbo.AdmDiagSummary AS d;

  PRINT CONCAT(N'DiagSummary rows: ', @@ROWCOUNT);
END TRY BEGIN CATCH
  PRINT CONCAT(N'Diag INSERT FAIL: ', ERROR_MESSAGE());
END CATCH

PRINT N'=== Done DiagSummary ===';
GO
