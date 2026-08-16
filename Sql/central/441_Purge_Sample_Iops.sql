/*
  441 — Remove demo / sample IOPS so every IOPS window is evidence-only.
  Pulseway v3 does not publish IOPS. Live rows come from Assure agents only.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Agent_DiskIops', N'U') IS NOT NULL
BEGIN
  DELETE FROM dbo.Agent_DiskIops
  WHERE HostName LIKE N'DEMO%'
     OR HostName LIKE N'SAMPLE%'
     OR HostName LIKE N'TEST-%'
     OR HostName LIKE N'FAKE%'
     OR CustomerCode LIKE N'DEMO%';
  PRINT CONCAT(N'Agent_DiskIops sample rows deleted: ', @@ROWCOUNT);
END
ELSE PRINT N'Agent_DiskIops missing — skip';

IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Pulseway_Disks', N'ReadIops') IS NOT NULL
BEGIN
  UPDATE dbo.Pulseway_Disks
  SET ReadIops = NULL, WriteIops = NULL, TotalIops = NULL
  WHERE DeviceId LIKE N'DEMO%'
     OR DeviceName LIKE N'DEMO%';
  PRINT CONCAT(N'Pulseway_Disks demo IOPS cleared: ', @@ROWCOUNT);
END
GO
