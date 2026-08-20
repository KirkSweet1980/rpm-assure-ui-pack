/*
  Gold views the UI is allowed to read for Cloud Backup.
  CustomerCode is already stamped (usp_StampCoveFromIdentity).
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryColorBar') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryColorBar nvarchar(400) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryStatus') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryStatus nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryErrors') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryErrors int NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'LastCompletedSessionAt') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD LastCompletedSessionAt datetime2(3) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'BackupSessionAt') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD BackupSessionAt datetime2(3) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryDurationSec') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryDurationSec int NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryDurationLabel') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryDurationLabel nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'BootStatus') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD BootStatus nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoverySessionId') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoverySessionId nvarchar(80) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'ScreenshotPresented') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD ScreenshotPresented bit NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'ScreenshotPath') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD ScreenshotPath nvarchar(400) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryPlanType') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryPlanType int NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryPlanLabel') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryPlanLabel nvarchar(120) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryTestStatus') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryTestStatus nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'LastRecoveryTestAt') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD LastRecoveryTestAt datetime2(3) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryVerification') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryVerification nvarchar(400) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'Physicality') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD Physicality nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionPolicy') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionPolicy nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'ProfileName') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD ProfileName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionFiles') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionFiles nvarchar(80) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionSystemState') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionSystemState nvarchar(80) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionHyperV') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionHyperV nvarchar(80) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionSql') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionSql nvarchar(80) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionVmware') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionVmware nvarchar(80) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionNetwork') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionNetwork nvarchar(80) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'LastBackupDurationSec') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD LastBackupDurationSec int NULL;
END
GO

IF OBJECT_ID(N'dbo.usp_StampCoveFromIdentity', N'P') IS NOT NULL
  EXEC dbo.usp_StampCoveFromIdentity;
GO

IF OBJECT_ID(N'dbo.vw_Cove_Devices_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Cove_Devices_Latest;
GO
CREATE VIEW dbo.vw_Cove_Devices_Latest
AS
SELECT
  d.CustomerCode,
  d.AccountId,
  d.DeviceName,
  d.MachineName,
  d.Product AS PartnerName,
  d.Product,
  d.PartnerId,
  d.LastBackupStatus,
  d.LastSuccessTime,
  d.UsedBytes,
  d.SelectedBytes,
  d.SnapshotDate,
  d.ImportedAt,
  d.RecoveryPlanType,
  d.RecoveryPlanLabel,
  d.RecoveryVerification,
  d.RecoveryTestStatus,
  d.Physicality,
  d.LastRecoveryTestAt,
  d.RetentionPolicy,
  d.ProfileName,
  d.RetentionFiles,
  d.RetentionSystemState,
  d.RetentionHyperV,
  d.RetentionSql,
  d.RetentionVmware,
  d.RetentionNetwork,
  d.LastBackupDurationSec,
  d.RecoveryColorBar,
  d.RecoveryStatus,
  d.RecoveryErrors,
  d.LastCompletedSessionAt,
  d.BackupSessionAt,
  d.RecoveryDurationSec,
  d.RecoveryDurationLabel,
  d.BootStatus,
  d.RecoverySessionId,
  d.ScreenshotPresented,
  d.ScreenshotPath
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
INNER JOIN (
  SELECT AccountId, MAX(SnapshotDate) AS SnapshotDate
  FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
  GROUP BY AccountId
) AS x
  ON x.AccountId = d.AccountId AND x.SnapshotDate = d.SnapshotDate
WHERE d.CustomerCode IS NOT NULL
  AND LTRIM(RTRIM(d.CustomerCode)) <> N'';
GO

IF OBJECT_ID(N'dbo.vw_Cove_Recovery_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Cove_Recovery_Latest;
GO
CREATE VIEW dbo.vw_Cove_Recovery_Latest
AS
SELECT *
FROM dbo.vw_Cove_Devices_Latest
WHERE ISNULL(RecoveryPlanType, 0) > 0
   OR LastRecoveryTestAt IS NOT NULL
   OR LastCompletedSessionAt IS NOT NULL
   OR RecoveryColorBar IS NOT NULL
   OR BootStatus IS NOT NULL
   OR RecoveryStatus IS NOT NULL
   OR RecoveryTestStatus IN (N'Success', N'Failed', N'InProgress', N'NotStarted', N'Unknown', N'Completed');
GO

/* Keep the old KPI name pointing at gold so Exco / cover still work. */
IF OBJECT_ID(N'dbo.vw_Kpi_Cove_DeviceLatest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Cove_DeviceLatest;
GO
CREATE VIEW dbo.vw_Kpi_Cove_DeviceLatest
AS
SELECT * FROM dbo.vw_Cove_Devices_Latest;
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT ON dbo.vw_Cove_Devices_Latest TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Cove_Recovery_Latest TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Kpi_Cove_DeviceLatest TO [Rpm_collect];
END
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
BEGIN
  GRANT SELECT ON dbo.vw_Cove_Devices_Latest TO [rpmassure];
  GRANT SELECT ON dbo.vw_Cove_Recovery_Latest TO [rpmassure];
  GRANT SELECT ON dbo.vw_Kpi_Cove_DeviceLatest TO [rpmassure];
END
GO

PRINT N'466 Cove gold views ready';
GO
