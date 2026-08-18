/*
  Seed Dim_Pulseway_OrgAlias from live Pulseway org names.
  Only maps where Dim_Customer.CustomerCode exists (FK-safe).
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

;WITH Want AS (
  SELECT * FROM (VALUES
    (N'Able Tracers',              N'ABLE'),
    (N'AHI Carriers',              N'AHIC'),
    (N'AHI Carrier',               N'AHIC'),
    (N'Hydrasales',                N'HYDRA'),
    (N'Hydra',                     N'HYDRA'),
    (N'Interbrand',                N'IB'),
    (N'MEDiPOS Medical Scheme',    N'MEDIPOS'),
    (N'Metsi Water Solutions',     N'METSI'),
    (N'Metsiwater Solutions',      N'METSI'),
    (N'Redsun Raisins',            N'RSR'),
    (N'Redsun Raisins Northern Cape', N'RSR'),
    (N'Redsun Raisins Northen Cape', N'RSR'),
    (N'BHF Global',                N'BHF'),
    (N'Remote Site Solutions',     N'RSS'),
    (N'Remote Site Solutions (Pty) Ltd', N'RSS'),
    (N'RPM Resources',             N'RPMINT'),
    (N'UVSS',                      N'UVSS'),
    (N'Unique Ventilation Systems',N'UVSS'),
    (N'Vault Tech',                N'VAULT'),
    (N'YLJ Health',                N'YLJ'),
    (N'Sir Fruit',                 N'SIRF'),
    (N'SIR Fruit',                 N'SIRF'),
    (N'SirFruit',                  N'SIRF'),
    (N'SIRF',                      N'SIRF'),
    (N'SIR FRUIT (PTY) LTD',       N'SIRF'),
    (N'Sir Fruit (Pty) Ltd',       N'SIRF'),
    (N'Simply Bright',             N'SBS'),
    (N'Simply Bright Consulting',  N'SBS'),
    (N'SBS',                       N'SBS')
  ) v(OrganizationName, CustomerCode)
),
Valid AS (
  SELECT w.OrganizationName, w.CustomerCode
  FROM Want w
  INNER JOIN dbo.Dim_Customer c WITH (NOLOCK)
    ON c.CustomerCode = w.CustomerCode
   AND c.Active = 1
)
MERGE dbo.Dim_Pulseway_OrgAlias AS t
USING Valid AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  Active = 1,
  Notes = N'seed exact Pulseway name'
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
  VALUES (s.OrganizationName, s.CustomerCode, 1, N'seed exact Pulseway name');

PRINT N'Alias merge complete';

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
  Notes = N'from alias seed'
WHEN NOT MATCHED THEN INSERT (OrganizationName, OrganizationId, CustomerCode, Active, Notes, UpdatedAtUtc)
  VALUES (s.OrganizationName, s.OrganizationId, s.CustomerCode, 1, N'from alias seed', SYSUTCDATETIME());

PRINT N'OrgMap merge complete';

UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Devices AS d
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.OrganizationName = d.OrganizationName
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
PRINT CONCAT(N'Devices stamped: ', CONVERT(nvarchar(20), @@ROWCOUNT));

UPDATE n
SET n.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Notifications AS n
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.OrganizationName = n.OrganizationName
WHERE n.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
PRINT CONCAT(N'Notifications stamped: ', CONVERT(nvarchar(20), @@ROWCOUNT));

DECLARE @Snap date = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
IF @Snap IS NOT NULL
BEGIN
  DELETE FROM dbo.Pulseway_OrgSummary WHERE SnapshotDate = @Snap;
  INSERT INTO dbo.Pulseway_OrgSummary (
    SnapshotDate, CustomerCode, OrganizationName, DeviceCount, OnlineCount, OfflineCount,
    MaintenanceCount, CriticalAlerts, ElevatedAlerts, NormalAlerts, LowAlerts,
    DiskHighCount, ServerCount, WorkstationCount, NotificationCount, ImportedAt
  )
  SELECT
    @Snap,
    d.CustomerCode,
    MAX(d.OrganizationName),
    COUNT_BIG(*),
    SUM(CASE WHEN d.IsOnline = 1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.IsOnline = 0 OR d.IsOnline IS NULL THEN 1 ELSE 0 END),
    0,
    SUM(ISNULL(d.CriticalNotifications, 0)),
    SUM(ISNULL(d.ElevatedNotifications, 0)),
    0, 0, 0,
    SUM(CASE WHEN d.DeviceType = N'Server' THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.DeviceType = N'Workstation' THEN 1 ELSE 0 END),
    0,
    SYSUTCDATETIME()
  FROM dbo.Pulseway_Devices AS d
  WHERE d.SnapshotDate = @Snap
    AND d.CustomerCode IS NOT NULL AND LTRIM(RTRIM(d.CustomerCode)) <> N''
    AND EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = d.CustomerCode)
  GROUP BY d.CustomerCode;
END

PRINT N'=== Org map ===';
SELECT OrganizationName, CustomerCode, Notes
FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
WHERE Active = 1
ORDER BY CustomerCode, OrganizationName;

PRINT N'=== Summary by customer ===';
SELECT CustomerCode, OrganizationName, DeviceCount, OnlineCount, OfflineCount
FROM dbo.Pulseway_OrgSummary WITH (NOLOCK)
WHERE SnapshotDate = @Snap
ORDER BY DeviceCount DESC;

PRINT N'=== Still unmapped ===';
SELECT OrganizationName, COUNT(*) AS Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = @Snap
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
GROUP BY OrganizationName
ORDER BY Devices DESC;

PRINT N'=== Active Dim_Customer codes ===';
SELECT CustomerCode, DisplayName
FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE Active = 1
ORDER BY 1;
GO
