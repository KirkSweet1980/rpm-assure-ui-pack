/*
  Optional sample RMM data for AHIC (safe re-run: tagged DEMO-RMM).
  Use only when Pulseway API collect is not yet wired.

  sqlcmd ... -i 421_Seed_Rmm_Sample_Demo.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'AHIC' AND Active = 1)
BEGIN
  PRINT N'AHIC not active — skip RMM demo seed';
  RETURN;
END

DECLARE @snap date = CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date);

MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (SELECT N'AHI Carrier' AS OrganizationName, 1001 AS OrganizationId, N'AHIC' AS CustomerCode) AS s
ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, OrganizationId = s.OrganizationId, Active = 1
WHEN NOT MATCHED THEN INSERT (OrganizationName, OrganizationId, CustomerCode, Active, Notes)
  VALUES (s.OrganizationName, s.OrganizationId, s.CustomerCode, 1, N'DEMO-RMM map');

UPDATE dbo.Dim_Customer
SET PulsewayOrgName = N'AHI Carrier',
    PulsewayOrgId = 1001,
    UpdatedAt = SYSUTCDATETIME()
WHERE CustomerCode = N'AHIC';

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = N'AHIC')
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, PillarSql, PillarCove, PillarPulseway, PillarBitdefender, PillarMicrosoftCsp)
    VALUES (N'AHIC', 1, 1, 1, 0, 1, 0, 0);
  ELSE
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarPulseway = 1, UpdatedAt = SYSUTCDATETIME() WHERE CustomerCode = N'AHIC';
END

DELETE FROM dbo.Pulseway_Devices WHERE CustomerCode = N'AHIC' AND SnapshotDate = @snap AND DeviceId LIKE N'DEMO-%';
DELETE FROM dbo.Pulseway_Notifications WHERE CustomerCode = N'AHIC' AND SnapshotDate = @snap AND NotificationId LIKE N'DEMO-%';
DELETE FROM dbo.Pulseway_OrgSummary WHERE CustomerCode = N'AHIC' AND SnapshotDate = @snap;

INSERT INTO dbo.Pulseway_OrgSummary (
  SnapshotDate, CustomerCode, OrganizationName,
  DeviceCount, OnlineCount, OfflineCount, MaintenanceCount,
  CriticalAlerts, ElevatedAlerts, NormalAlerts, LowAlerts,
  DiskHighCount, ServerCount, WorkstationCount, NotificationCount, ImportedAt
) VALUES (
  @snap, N'AHIC', N'AHI Carrier',
  12, 10, 2, 0,
  1, 2, 0, 0,
  1, 4, 8, 3, SYSUTCDATETIME()
);

INSERT INTO dbo.Pulseway_Devices (
  SnapshotDate, DeviceId, CustomerCode, Name, OrganizationId, OrganizationName,
  IsOnline, OsName, DeviceType, CriticalNotifications, ElevatedNotifications, LastSeenOnline, ImportedAt
) VALUES
(@snap, N'DEMO-AHIC-DC01', N'AHIC', N'AHI-DC01', 1001, N'AHI Carrier', 1, N'Windows Server 2022', N'Server', 0, 0, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@snap, N'DEMO-AHIC-FS01', N'AHIC', N'AHI-FS01', 1001, N'AHI Carrier', 0, N'Windows Server 2019', N'Server', 1, 0, DATEADD(HOUR, -6, SYSUTCDATETIME()), SYSUTCDATETIME()),
(@snap, N'DEMO-AHIC-WS01', N'AHIC', N'AHI-ACC01', 1001, N'AHI Carrier', 1, N'Windows 11', N'Workstation', 0, 1, SYSUTCDATETIME(), SYSUTCDATETIME());

INSERT INTO dbo.Pulseway_Notifications (
  SnapshotDate, NotificationId, CustomerCode, DeviceId, DeviceName, Severity, Title, Message, RaisedAt, IsActive, OrganizationName, ImportedAt
) VALUES
(@snap, N'DEMO-N1', N'AHIC', N'DEMO-AHIC-FS01', N'AHI-FS01', N'Critical', N'Agent offline', N'Device not reporting for 6h', DATEADD(HOUR, -6, SYSUTCDATETIME()), 1, N'AHI Carrier', SYSUTCDATETIME()),
(@snap, N'DEMO-N2', N'AHIC', N'DEMO-AHIC-WS01', N'AHI-ACC01', N'Elevated', N'Disk space low', N'C: at 92% used', DATEADD(HOUR, -2, SYSUTCDATETIME()), 1, N'AHI Carrier', SYSUTCDATETIME());

IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NOT NULL
  UPDATE dbo.Dim_Connection
  SET Status = N'Active', LastSyncAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME(),
      Notes = N'DEMO-RMM sample on AHIC — replace with API collect'
  WHERE ConnectionCode = N'PULSEWAY';

SELECT * FROM dbo.vw_Kpi_Rmm_OrgSummary_Latest WHERE CustomerCode = N'AHIC';
PRINT N'421 DEMO RMM seed for AHIC complete.';
GO
