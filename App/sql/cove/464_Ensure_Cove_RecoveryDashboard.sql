-- Continuity Recovery Testing dashboard columns (DRaaS actual-statistics).
SET NOCOUNT ON;
USE RPMAssure_App;
GO

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
  PRINT N'464 Cove recovery dashboard columns ready';
END
ELSE
  PRINT N'Cove_DeviceStatistics missing';
GO
