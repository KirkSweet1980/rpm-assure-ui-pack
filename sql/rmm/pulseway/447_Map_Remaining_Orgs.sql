/*
  Map remaining Pulseway orgs to Dim_Customer.
  Never maps: RPM Internal. BHF Global only if you add a customer later.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

PRINT N'=== Active customers ===';
SELECT CustomerCode, DisplayName
FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE Active = 1
ORDER BY DisplayName;

IF OBJECT_ID(N'tempdb..#Want') IS NOT NULL DROP TABLE #Want;
CREATE TABLE #Want (
  OrganizationName nvarchar(200) NOT NULL,
  CustomerCode nvarchar(50) NOT NULL
);

INSERT INTO #Want (OrganizationName, CustomerCode) VALUES
  (N'Interbrand',             N'IB'),
  (N'Interbrand',             N'INTERBRAND'),
  (N'Metsi Water Solutions',  N'METSI'),
  (N'YLJ Health',             N'YLJ'),
  (N'MEDiPOS Medical Scheme', N'MEDIPOS'),
  (N'Hydrasales',             N'HYDRA'),
  (N'Able Tracers',           N'ABLE'),
  (N'Vault Tech',             N'VAULT'),
  (N'AHI Carriers',           N'AHIC'),
  (N'Redsun Raisins',         N'RSR'),
  (N'Remote Site Solutions',  N'RSS'),
  (N'UVSS',                   N'UVSS'),
  (N'RPM Resources',          N'RPMINT');

IF OBJECT_ID(N'tempdb..#Valid') IS NOT NULL DROP TABLE #Valid;
SELECT OrganizationName, CustomerCode
INTO #Valid
FROM (
  SELECT w.OrganizationName, w.CustomerCode,
    ROW_NUMBER() OVER (PARTITION BY w.OrganizationName ORDER BY w.CustomerCode) AS rn
  FROM #Want w
  INNER JOIN dbo.Dim_Customer c
    ON c.CustomerCode = w.CustomerCode AND c.Active = 1
) x
WHERE rn = 1;

PRINT N'Explicit aliases that matched a Dim_Customer:';
SELECT OrganizationName, CustomerCode FROM #Valid ORDER BY 1;

MERGE dbo.Dim_Pulseway_OrgAlias AS t
USING #Valid AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'447 remaining'
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
  VALUES (s.OrganizationName, s.CustomerCode, 1, N'447 remaining');

/* Fuzzy unmapped orgs vs DisplayName */
IF OBJECT_ID(N'tempdb..#Unmapped') IS NOT NULL DROP TABLE #Unmapped;
SELECT DISTINCT LTRIM(RTRIM(OrganizationName)) AS OrganizationName
INTO #Unmapped
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
  AND OrganizationName NOT IN (N'RPM Internal', N'BHF Global')
  AND NULLIF(LTRIM(RTRIM(OrganizationName)), N'') IS NOT NULL;

IF OBJECT_ID(N'tempdb..#Best') IS NOT NULL DROP TABLE #Best;
SELECT OrganizationName, CustomerCode, DisplayName, Score
INTO #Best
FROM (
  SELECT
    u.OrganizationName,
    c.CustomerCode,
    c.DisplayName,
    CASE
      WHEN LOWER(c.DisplayName) = LOWER(u.OrganizationName) THEN 100
      WHEN LOWER(c.DisplayName) LIKE N'%' + LOWER(u.OrganizationName) + N'%' THEN 80
      WHEN LOWER(u.OrganizationName) LIKE N'%' + LOWER(c.DisplayName) + N'%' THEN 70
      WHEN LOWER(REPLACE(c.DisplayName, N' ', N'')) LIKE N'%' + LOWER(REPLACE(u.OrganizationName, N' ', N'')) + N'%' THEN 60
      ELSE 0
    END AS Score,
    ROW_NUMBER() OVER (
      PARTITION BY u.OrganizationName
      ORDER BY
        CASE
          WHEN LOWER(c.DisplayName) = LOWER(u.OrganizationName) THEN 100
          WHEN LOWER(c.DisplayName) LIKE N'%' + LOWER(u.OrganizationName) + N'%' THEN 80
          WHEN LOWER(u.OrganizationName) LIKE N'%' + LOWER(c.DisplayName) + N'%' THEN 70
          WHEN LOWER(REPLACE(c.DisplayName, N' ', N'')) LIKE N'%' + LOWER(REPLACE(u.OrganizationName, N' ', N'')) + N'%' THEN 60
          ELSE 0
        END DESC,
        c.CustomerCode
    ) AS rn
  FROM #Unmapped u
  CROSS JOIN dbo.Dim_Customer c
  WHERE c.Active = 1
) z
WHERE rn = 1 AND Score >= 60;

PRINT N'Fuzzy matches:';
SELECT OrganizationName, CustomerCode, DisplayName, Score FROM #Best ORDER BY 1;

MERGE dbo.Dim_Pulseway_OrgAlias AS t
USING #Best AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  Active = 1,
  Notes = CONCAT(N'fuzzy->', s.DisplayName)
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
  VALUES (s.OrganizationName, s.CustomerCode, 1, CONCAT(N'fuzzy->', s.DisplayName));

MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (
  SELECT a.OrganizationName, a.CustomerCode, a.OrganizationId
  FROM dbo.Dim_Pulseway_OrgAlias a
  INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
  WHERE a.Active = 1
    AND a.OrganizationName <> N'RPM Internal'
) AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME(),
  Notes = N'447'
WHEN NOT MATCHED THEN INSERT (OrganizationName, OrganizationId, CustomerCode, Active, Notes, UpdatedAtUtc)
  VALUES (s.OrganizationName, s.OrganizationId, s.CustomerCode, 1, N'447', SYSUTCDATETIME());

DELETE FROM dbo.Dim_Pulseway_OrgMap WHERE OrganizationName = N'RPM Internal';
DELETE FROM dbo.Dim_Pulseway_OrgAlias WHERE OrganizationName = N'RPM Internal';

UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Devices AS d
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.OrganizationName = d.OrganizationName;

UPDATE dbo.Pulseway_Devices
SET CustomerCode = NULL
WHERE OrganizationName = N'RPM Internal';

UPDATE n
SET n.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Notifications AS n
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.OrganizationName = n.OrganizationName;

UPDATE dbo.Pulseway_Notifications
SET CustomerCode = NULL
WHERE OrganizationName = N'RPM Internal';

DECLARE @Snap date = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
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
  AND d.CustomerCode IS NOT NULL
  AND LTRIM(RTRIM(d.CustomerCode)) <> N''
  AND EXISTS (
    SELECT 1 FROM dbo.Dim_Customer c
    WHERE c.CustomerCode = d.CustomerCode AND c.Active = 1
  )
GROUP BY d.CustomerCode;

PRINT N'=== Map ===';
SELECT OrganizationName, CustomerCode
FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
WHERE Active = 1
ORDER BY CustomerCode;

PRINT N'=== Summary ===';
SELECT CustomerCode, OrganizationName, DeviceCount
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
GO
