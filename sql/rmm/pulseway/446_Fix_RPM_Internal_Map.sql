/*
  User rule: map RPM Resources -> RPMINT only.
  Do NOT map Pulseway org "RPM Internal".
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

/* Remove bad aliases / map rows for RPM Internal */
DELETE FROM dbo.Dim_Pulseway_OrgAlias WHERE OrganizationName = N'RPM Internal';
DELETE FROM dbo.Dim_Pulseway_OrgMap WHERE OrganizationName = N'RPM Internal';

/* Ensure RPM Resources -> RPMINT if customer exists */
IF EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'RPMINT' AND Active = 1)
BEGIN
  MERGE dbo.Dim_Pulseway_OrgAlias AS t
  USING (SELECT N'RPM Resources' AS OrganizationName, N'RPMINT' AS CustomerCode) s
    ON t.OrganizationName = s.OrganizationName
  WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'RPM Resources only'
  WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
    VALUES (s.OrganizationName, s.CustomerCode, 1, N'RPM Resources only');

  MERGE dbo.Dim_Pulseway_OrgMap AS t
  USING (SELECT N'RPM Resources' AS OrganizationName, N'RPMINT' AS CustomerCode) s
    ON t.OrganizationName = s.OrganizationName
  WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'RPM Resources only', UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes, UpdatedAtUtc)
    VALUES (s.OrganizationName, s.CustomerCode, 1, N'RPM Resources only', SYSUTCDATETIME());
END
ELSE
  PRINT N'WARN: RPMINT not in Dim_Customer - skip RPM Resources map';

/* Unstamp devices that were RPM Internal */
UPDATE dbo.Pulseway_Devices
SET CustomerCode = NULL
WHERE OrganizationName = N'RPM Internal';

UPDATE dbo.Pulseway_Notifications
SET CustomerCode = NULL
WHERE OrganizationName = N'RPM Internal';

/* Restamp everything from map (safe names only) */
UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Devices AS d
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.OrganizationName = d.OrganizationName
WHERE m.OrganizationName <> N'RPM Internal';

UPDATE n
SET n.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Notifications AS n
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.OrganizationName = n.OrganizationName
WHERE m.OrganizationName <> N'RPM Internal';

/* Rebuild summary */
DECLARE @Snap date = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
DELETE FROM dbo.Pulseway_OrgSummary WHERE SnapshotDate = @Snap;

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
WHERE d.SnapshotDate = @Snap
  AND d.CustomerCode IS NOT NULL AND LTRIM(RTRIM(d.CustomerCode)) <> N''
  AND EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = d.CustomerCode AND c.Active = 1)
GROUP BY d.CustomerCode;

PRINT N'=== Active map (no RPM Internal) ===';
SELECT OrganizationName, CustomerCode, Notes
FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
WHERE Active = 1
ORDER BY CustomerCode, OrganizationName;

PRINT N'=== Summary ===';
SELECT CustomerCode, OrganizationName, DeviceCount
FROM dbo.Pulseway_OrgSummary WITH (NOLOCK)
WHERE SnapshotDate = @Snap
ORDER BY DeviceCount DESC;

PRINT N'=== Unmapped orgs (expected: RPM Internal + others) ===';
SELECT OrganizationName, COUNT(*) AS Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = @Snap
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
GROUP BY OrganizationName
ORDER BY Devices DESC;
GO
