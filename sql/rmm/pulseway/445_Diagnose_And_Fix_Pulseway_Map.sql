/*
  Diagnose codes on devices vs Dim_Customer; re-seed aliases with flexible codes.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

PRINT N'=== Codes on devices (latest snap) ===';
SELECT
  ISNULL(NULLIF(LTRIM(RTRIM(d.CustomerCode)), N''), N'(null)') AS CustomerCode,
  d.OrganizationName,
  COUNT(*) AS Devices,
  CASE WHEN c.CustomerCode IS NULL THEN N'NO Dim_Customer' ELSE N'OK' END AS DimStatus
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer AS c WITH (NOLOCK)
  ON c.CustomerCode = d.CustomerCode AND c.Active = 1
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
GROUP BY d.CustomerCode, d.OrganizationName, c.CustomerCode
ORDER BY Devices DESC;

PRINT N'=== Active Dim_Customer ===';
SELECT CustomerCode, DisplayName FROM dbo.Dim_Customer WITH (NOLOCK) WHERE Active = 1 ORDER BY 1;

/* Flexible seed: try several code variants per org name */
;WITH Want AS (
  SELECT * FROM (VALUES
    (N'Able Tracers', N'ABLE'),
    (N'AHI Carriers', N'AHIC'),
    (N'AHI Carrier', N'AHIC'),
    (N'Hydrasales', N'HYDRA'),
    (N'Interbrand', N'IB'),
    (N'Interbrand', N'INTERBRAND'),
    (N'MEDiPOS Medical Scheme', N'MEDIPOS'),
    (N'Metsi Water Solutions', N'METSI'),
    (N'Redsun Raisins', N'RSR'),
    (N'Remote Site Solutions', N'RSS'),
    (N'RPM Internal', N'RPMINT'),
    (N'RPM Internal', N'RPM'),
    (N'UVSS', N'UVSS'),
    (N'Vault Tech', N'VAULT'),
    (N'YLJ Health', N'YLJ')
  ) v(OrganizationName, CustomerCode)
),
Valid AS (
  /* one best code per org: prefer existing Dim match, first by name order */
  SELECT OrganizationName, CustomerCode
  FROM (
    SELECT w.OrganizationName, w.CustomerCode,
      ROW_NUMBER() OVER (PARTITION BY w.OrganizationName ORDER BY w.CustomerCode) AS rn
    FROM Want w
    INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = w.CustomerCode AND c.Active = 1
  ) x
  WHERE rn = 1
)
MERGE dbo.Dim_Pulseway_OrgAlias AS t
USING Valid AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'flex seed'
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
  VALUES (s.OrganizationName, s.CustomerCode, 1, N'flex seed');

MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (
  SELECT a.OrganizationName, a.CustomerCode, a.OrganizationId
  FROM dbo.Dim_Pulseway_OrgAlias a
  INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
  WHERE a.Active = 1
) AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  OrganizationId = COALESCE(s.OrganizationId, t.OrganizationId),
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME(),
  Notes = N'flex seed'
WHEN NOT MATCHED THEN INSERT (OrganizationName, OrganizationId, CustomerCode, Active, Notes, UpdatedAtUtc)
  VALUES (s.OrganizationName, s.OrganizationId, s.CustomerCode, 1, N'flex seed', SYSUTCDATETIME());

/* Clear invalid codes then restamp from map */
UPDATE dbo.Pulseway_Devices
SET CustomerCode = NULL
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND CustomerCode IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM dbo.Dim_Customer c
    WHERE c.CustomerCode = Pulseway_Devices.CustomerCode AND c.Active = 1
  );

UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Devices AS d
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.OrganizationName = d.OrganizationName
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));

UPDATE n
SET n.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Notifications AS n
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.OrganizationName = n.OrganizationName
WHERE n.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));

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

PRINT N'=== Summary after fix ===';
SELECT CustomerCode, OrganizationName, DeviceCount
FROM dbo.Pulseway_OrgSummary WITH (NOLOCK)
WHERE SnapshotDate = @Snap
ORDER BY DeviceCount DESC;

PRINT N'=== Still unmapped orgs ===';
SELECT OrganizationName, COUNT(*) AS Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = @Snap
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
GROUP BY OrganizationName
ORDER BY Devices DESC;

PRINT N'=== Alias used ===';
SELECT OrganizationName, CustomerCode FROM dbo.Dim_Pulseway_OrgAlias WHERE Active = 1 ORDER BY 1;
GO
