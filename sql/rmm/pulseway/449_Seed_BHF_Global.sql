/*
  Add BHF Global customer + Pulseway map (user request item 3).
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

MERGE dbo.Dim_Customer AS t
USING (SELECT N'BHF' AS CustomerCode, N'BHF Global' AS DisplayName) s
  ON t.CustomerCode = s.CustomerCode
WHEN MATCHED THEN UPDATE SET
  DisplayName = s.DisplayName,
  Active = 1,
  PulsewayOrgName = N'BHF Global',
  Notes = COALESCE(t.Notes, N'Pulseway RMM'),
  UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (
  CustomerCode, DisplayName, Active, SqlInstanceName, Notes, PulsewayOrgName, CreatedAt, UpdatedAt
) VALUES (
  s.CustomerCode, s.DisplayName, 1, NULL, N'Pulseway RMM', N'BHF Global', SYSUTCDATETIME(), SYSUTCDATETIME()
);

MERGE dbo.Dim_Customer_AmsConfig AS t
USING (SELECT N'BHF' AS CustomerCode) s ON t.CustomerCode = s.CustomerCode
WHEN MATCHED THEN UPDATE SET AmsEnabled = 1, PillarPulseway = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'449'
WHEN NOT MATCHED THEN INSERT (
  CustomerCode, AmsEnabled, PillarSyspro, PillarSql, PillarCove, PillarPulseway, PillarBitdefender, PillarMicrosoftCsp,
  Notes, UpdatedAt, UpdatedBy
) VALUES (
  s.CustomerCode, 1, 0, 0, 0, 1, 0, 0, N'BHF Pulseway', SYSUTCDATETIME(), N'449'
);

MERGE dbo.Dim_Pulseway_OrgAlias AS t
USING (SELECT N'BHF Global' AS OrganizationName, N'BHF' AS CustomerCode) s
  ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'449 BHF'
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
  VALUES (s.OrganizationName, s.CustomerCode, 1, N'449 BHF');

MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (SELECT N'BHF Global' AS OrganizationName, N'BHF' AS CustomerCode) s
  ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'449', UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes, UpdatedAtUtc)
  VALUES (s.OrganizationName, s.CustomerCode, 1, N'449', SYSUTCDATETIME());

UPDATE d SET d.CustomerCode = N'BHF'
FROM dbo.Pulseway_Devices d
WHERE d.OrganizationName = N'BHF Global';

UPDATE n SET n.CustomerCode = N'BHF'
FROM dbo.Pulseway_Notifications n
WHERE n.OrganizationName = N'BHF Global';

DECLARE @Snap date = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
IF @Snap IS NOT NULL
BEGIN
  DELETE FROM dbo.Pulseway_OrgSummary WHERE SnapshotDate = @Snap AND CustomerCode = N'BHF';
  INSERT INTO dbo.Pulseway_OrgSummary (
    SnapshotDate, CustomerCode, OrganizationName, DeviceCount, OnlineCount, OfflineCount,
    MaintenanceCount, CriticalAlerts, ElevatedAlerts, NormalAlerts, LowAlerts,
    DiskHighCount, ServerCount, WorkstationCount, NotificationCount, ImportedAt
  )
  SELECT
    @Snap, d.CustomerCode, MAX(d.OrganizationName), COUNT_BIG(*),
    SUM(CASE WHEN d.IsOnline = 1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.IsOnline = 0 OR d.IsOnline IS NULL THEN 1 ELSE 0 END),
    0, SUM(ISNULL(d.CriticalNotifications,0)), SUM(ISNULL(d.ElevatedNotifications,0)),
    0, 0, 0,
    SUM(CASE WHEN d.DeviceType = N'Server' THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.DeviceType = N'Workstation' THEN 1 ELSE 0 END),
    0, SYSUTCDATETIME()
  FROM dbo.Pulseway_Devices d
  WHERE d.SnapshotDate = @Snap AND d.CustomerCode = N'BHF'
  GROUP BY d.CustomerCode;
END

PRINT N'BHF Global mapped to BHF';
SELECT CustomerCode, DisplayName, Active, PulsewayOrgName FROM dbo.Dim_Customer WHERE CustomerCode = N'BHF';
SELECT OrganizationName, CustomerCode FROM dbo.Dim_Pulseway_OrgMap WHERE OrganizationName = N'BHF Global';
SELECT CustomerCode, DeviceCount, OfflineCount, CriticalAlerts FROM dbo.Pulseway_OrgSummary
WHERE CustomerCode = N'BHF' AND SnapshotDate = @Snap;
GO
