/*
  AHIC collect — Operator + Name only (no optional login columns)
  Run: sqlcmd -S "." -U Rpm_collect -P "RpmCollect#AHIC2026" -C -b -i thisfile.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode   nvarchar(50)  = N'AHIC';
DECLARE @InstanceName   nvarchar(100) = N'AHIC-SSQL-SRV';
DECLARE @SnapshotDate   date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== AHIC collect start ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'AHIC not found/active on central Dim_Customer.', 16, 1);
    RETURN;
END;

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer_SyncLog
    (ActionType, CustomerCode, Detail, DryRun)
VALUES (N'SysproCollectStart', @CustomerCode,
    CONCAT(N'AHIC operators snap=', CONVERT(char(10), @SnapshotDate, 23)), 0);

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

/* Safe columns only: Operator, Name */
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
(
    SnapshotDate, InstanceName, OperatorCode, OperatorName,
    GroupCode, Email, LastLoginDate, OperatorStatus, ImportedAt
)
SELECT
    @SnapshotDate,
    @InstanceName,
    LTRIM(RTRIM(CONVERT(nvarchar(50), o.Operator))),
    LTRIM(RTRIM(CONVERT(nvarchar(200), o.Name))),
    NULL,
    NULL,
    NULL,   -- LastLoginDate: map later after we know AdmOperatorLogin columns
    N'Active',
    SYSUTCDATETIME()
FROM Sysprodb.dbo.AdmOperator AS o
WHERE o.Operator IS NOT NULL
  AND LTRIM(RTRIM(CONVERT(nvarchar(50), o.Operator))) <> N'';

PRINT CONCAT(N'Operators rows written: ', @@ROWCOUNT);

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer_SyncLog
    (ActionType, CustomerCode, Detail, DryRun)
VALUES (N'SysproCollectEnd', @CustomerCode,
    CONCAT(N'AHIC complete snap=', CONVERT(char(10), @SnapshotDate, 23)), 0);

PRINT N'=== Done AHIC ===';
GO
