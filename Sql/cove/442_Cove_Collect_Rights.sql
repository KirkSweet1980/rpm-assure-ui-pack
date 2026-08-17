/* Grant Rpm_collect load rights. DDL stays sysadmin-only. */
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NULL
BEGIN
  RAISERROR('Cove_DeviceStatistics missing - run 430_Ensure_Cove_Map.sql as sysadmin', 16, 1);
  RETURN;
END
GO

IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryPlanType') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryPlanType int NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryPlanLabel') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryPlanLabel nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryVerification') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryVerification nvarchar(400) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryTestStatus') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryTestStatus nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'Physicality') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD Physicality nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'LastRecoveryTestAt') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD LastRecoveryTestAt datetime2(3) NULL;
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
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Cove_DeviceStatistics TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NOT NULL
    GRANT SELECT ON dbo.Dim_Cove_PartnerMap TO [Rpm_collect];
  PRINT 'Granted Rpm_collect load rights on Cove_DeviceStatistics';
END
ELSE
  PRINT 'Rpm_collect login missing in this database';
GO
