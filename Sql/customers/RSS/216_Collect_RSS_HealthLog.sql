/*
  RSS — AdmSysHealthLog → Syspro_HealthLog (last 90 days)
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'RSS';
DECLARE @InstanceName nvarchar(100) = N'RSS-PROD';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);
DECLARE @Days int = 90;

PRINT CONCAT(N'=== RSS HealthLog ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'RSS not active on central.', 16, 1);
    RETURN;
END;

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_HealthLog
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_HealthLog
(
    SnapshotDate, InstanceName, CompanyDb, RunDateTime, Operator,
    HealthFunction, Description, StatusFlag, Message, ImportedAt
)
SELECT
    @SnapshotDate,
    @InstanceName,
    N'Sysprodb',
    h.RunDateTime,
    LTRIM(RTRIM(CONVERT(nvarchar(50), h.Operator))),
    LTRIM(RTRIM(CONVERT(nvarchar(100), h.HealthFunction))),
    LTRIM(RTRIM(CONVERT(nvarchar(500), h.Description))),
    LTRIM(RTRIM(CONVERT(nvarchar(50), h.StatusFlag))),
    CONVERT(nvarchar(max), h.Message),
    SYSUTCDATETIME()
FROM Sysprodb.dbo.AdmSysHealthLog AS h
WHERE h.RunDateTime >= DATEADD(DAY, -@Days, CAST(@SnapshotDate AS datetime2))
   OR h.RunDateTime IS NULL;

PRINT CONCAT(N'HealthLog rows: ', @@ROWCOUNT);
PRINT N'=== Done RSS HealthLog ===';
GO
