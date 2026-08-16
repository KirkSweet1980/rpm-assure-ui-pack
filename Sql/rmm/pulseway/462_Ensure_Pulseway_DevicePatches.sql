/*
  Per-device Windows Update list from Pulseway (installed / missing / pending).
  Safe re-run.
*/
SET NOCOUNT ON;
USE RPMAssure_App;

IF OBJECT_ID(N'dbo.Pulseway_DevicePatches', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_DevicePatches (
    SnapshotDate date NOT NULL,
    DeviceId nvarchar(80) NOT NULL,
    Title nvarchar(400) NOT NULL,
    KbArticle nvarchar(40) NULL,
    Status nvarchar(40) NOT NULL,
    InstalledUtc datetime2(3) NULL,
    Classification nvarchar(80) NULL,
    CustomerCode nvarchar(50) NULL,
    DeviceName nvarchar(200) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Pulseway_DevicePatches_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Pulseway_DevicePatches PRIMARY KEY (SnapshotDate, DeviceId, Title)
  );
  CREATE INDEX IX_Pulseway_DevicePatches_Cust ON dbo.Pulseway_DevicePatches (CustomerCode, SnapshotDate);
  CREATE INDEX IX_Pulseway_DevicePatches_Status ON dbo.Pulseway_DevicePatches (SnapshotDate, Status);
END

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pulseway_DevicePatches TO [Rpm_collect];
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
  GRANT SELECT ON dbo.Pulseway_DevicePatches TO [rpmassure];

PRINT N'462 Pulseway_DevicePatches ready';
