/*
  Demo IP/CPU/Mem/Online% + disks for AHIC sample devices (after 421 seed).
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

-- ensure columns
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'IpAddress') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD IpAddress nvarchar(64) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'CpuUsagePct') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD CpuUsagePct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'MemoryUsagePct') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD MemoryUsagePct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OnlinePct') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD OnlinePct decimal(6,2) NULL;

DECLARE @snap date = (
  SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WHERE CustomerCode = N'AHIC'
);
IF @snap IS NULL
BEGIN
  PRINT N'No AHIC devices — run 421_Seed_Rmm_Sample_Demo.sql first.';
  RETURN;
END

UPDATE dbo.Pulseway_Devices SET
  IpAddress = N'10.10.1.10', CpuUsagePct = 22, MemoryUsagePct = 61, OnlinePct = 99.8
WHERE CustomerCode = N'AHIC' AND DeviceId = N'DEMO-AHIC-DC01' AND SnapshotDate = @snap;

UPDATE dbo.Pulseway_Devices SET
  IpAddress = N'10.10.1.20', CpuUsagePct = 0, MemoryUsagePct = 0, OnlinePct = 0
WHERE CustomerCode = N'AHIC' AND DeviceId = N'DEMO-AHIC-FS01' AND SnapshotDate = @snap;

UPDATE dbo.Pulseway_Devices SET
  IpAddress = N'10.10.2.45', CpuUsagePct = 38, MemoryUsagePct = 72, OnlinePct = 97.2
WHERE CustomerCode = N'AHIC' AND DeviceId = N'DEMO-AHIC-WS01' AND SnapshotDate = @snap;

DELETE FROM dbo.Pulseway_Disks WHERE CustomerCode = N'AHIC' AND SnapshotDate = @snap;

INSERT INTO dbo.Pulseway_Disks (SnapshotDate, DeviceId, DriveLetter, CustomerCode, DeviceName, TotalGb, FreeGb, UsedPct, ImportedAt)
VALUES
(@snap, N'DEMO-AHIC-DC01', N'C:', N'AHIC', N'AHI-DC01', 120, 48, 60, SYSUTCDATETIME()),
(@snap, N'DEMO-AHIC-DC01', N'D:', N'AHIC', N'AHI-DC01', 500, 210, 58, SYSUTCDATETIME()),
(@snap, N'DEMO-AHIC-FS01', N'C:', N'AHIC', N'AHI-FS01', 200, 16, 92, SYSUTCDATETIME()),
(@snap, N'DEMO-AHIC-FS01', N'E:', N'AHIC', N'AHI-FS01', 2000, 400, 80, SYSUTCDATETIME()),
(@snap, N'DEMO-AHIC-WS01', N'C:', N'AHIC', N'AHI-ACC01', 512, 90, 82.4, SYSUTCDATETIME());

PRINT N'451 device stats + disks seeded for AHIC demo devices.';
GO
