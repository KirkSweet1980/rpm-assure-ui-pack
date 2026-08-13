/*
  Optional agent stats on Pulseway_Devices for RMM device detail UI.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.Pulseway_Devices', N'IpAddress') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD IpAddress nvarchar(64) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'CpuUsagePct') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD CpuUsagePct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'MemoryUsagePct') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD MemoryUsagePct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OnlinePct') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD OnlinePct decimal(6,2) NULL;

IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_Disks
  (
    SnapshotDate date NOT NULL,
    DeviceId nvarchar(100) NOT NULL,
    DriveLetter nvarchar(128) NOT NULL,
    CustomerCode nvarchar(50) NULL,
    DeviceName nvarchar(200) NULL,
    TotalGb decimal(18,2) NULL,
    FreeGb decimal(18,2) NULL,
    UsedPct decimal(6,2) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwDisk_Imported2 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Disks PRIMARY KEY (SnapshotDate, DeviceId, DriveLetter)
  );
END
GO
PRINT N'450 Pulseway device stats columns + disks table ready.';
GO
