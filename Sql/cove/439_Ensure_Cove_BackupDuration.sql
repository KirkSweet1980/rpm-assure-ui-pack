USE RPMAssure_App;
GO
SET NOCOUNT ON;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'LastBackupDurationSec') IS NULL
BEGIN
  ALTER TABLE dbo.Cove_DeviceStatistics ADD LastBackupDurationSec int NULL;
  PRINT 'Added Cove_DeviceStatistics.LastBackupDurationSec';
END
ELSE
  PRINT 'LastBackupDurationSec already present';
GO
