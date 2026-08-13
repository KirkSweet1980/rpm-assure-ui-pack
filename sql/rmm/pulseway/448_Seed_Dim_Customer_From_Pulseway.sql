/*
  Add Pulseway-managed customers to Dim_Customer + AmsConfig (Pulseway pillar).
  Skip: BHF Global if no code. RPM Internal = RPM Resources = RPMINT.
  Include: RPMINT for org "RPM Resources" and "RPM Internal".
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'tempdb..#Cust') IS NOT NULL DROP TABLE #Cust;
CREATE TABLE #Cust (
  CustomerCode nvarchar(50) NOT NULL PRIMARY KEY,
  DisplayName nvarchar(200) NOT NULL,
  PulsewayOrgName nvarchar(200) NULL,
  Notes nvarchar(200) NULL
);

INSERT INTO #Cust (CustomerCode, DisplayName, PulsewayOrgName, Notes) VALUES
  (N'ABLE',    N'Able Tracers',              N'Able Tracers',              N'Pulseway RMM'),
  (N'HYDRA',   N'Hydrasales',                N'Hydrasales',                N'Pulseway RMM'),
  (N'IB',      N'Interbrand',                N'Interbrand',                N'Pulseway RMM'),
  (N'MEDIPOS', N'MEDiPOS Medical Scheme',    N'MEDiPOS Medical Scheme',    N'Pulseway RMM'),
  (N'METSI',   N'Metsi Water Solutions',     N'Metsi Water Solutions',     N'Pulseway RMM'),
  (N'VAULT',   N'Vault Tech',                N'Vault Tech',                N'Pulseway RMM'),
  (N'YLJ',     N'YLJ Health',                N'YLJ Health',                N'Pulseway RMM'),
  (N'RPMINT',  N'RPM Resources',             N'RPM Resources',             N'Pulseway orgs: RPM Resources + RPM Internal');

/* Also ensure display names on existing four stay sensible */
IF NOT EXISTS (SELECT 1 FROM #Cust WHERE CustomerCode = N'AHIC')
  INSERT INTO #Cust VALUES (N'AHIC', N'AHI Carrier', N'AHI Carriers', N'SYSPRO+RMM');
IF NOT EXISTS (SELECT 1 FROM #Cust WHERE CustomerCode = N'RSR')
  INSERT INTO #Cust VALUES (N'RSR', N'Redsun Raisins', N'Redsun Raisins', N'RMM');
IF NOT EXISTS (SELECT 1 FROM #Cust WHERE CustomerCode = N'RSS')
  INSERT INTO #Cust VALUES (N'RSS', N'Remote Site Solutions', N'Remote Site Solutions', N'RMM');
IF NOT EXISTS (SELECT 1 FROM #Cust WHERE CustomerCode = N'UVSS')
  INSERT INTO #Cust VALUES (N'UVSS', N'Unique Ventilation Systems', N'UVSS', N'SYSPRO+RMM');

MERGE dbo.Dim_Customer AS t
USING #Cust AS s ON t.CustomerCode = s.CustomerCode
WHEN MATCHED THEN UPDATE SET
  DisplayName = CASE WHEN t.DisplayName IS NULL OR LTRIM(RTRIM(t.DisplayName)) = N'' THEN s.DisplayName ELSE t.DisplayName END,
  Active = 1,
  PulsewayOrgName = COALESCE(s.PulsewayOrgName, t.PulsewayOrgName),
  Notes = COALESCE(t.Notes, s.Notes),
  UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (
  CustomerCode, DisplayName, Active, SqlInstanceName, Notes, PulsewayOrgName, CreatedAt, UpdatedAt
) VALUES (
  s.CustomerCode, s.DisplayName, 1, NULL, s.Notes, s.PulsewayOrgName, SYSUTCDATETIME(), SYSUTCDATETIME()
);

PRINT N'Dim_Customer merge done';

/* AmsConfig - enable Pulseway pillar for these */
MERGE dbo.Dim_Customer_AmsConfig AS t
USING #Cust AS s ON t.CustomerCode = s.CustomerCode
WHEN MATCHED THEN UPDATE SET
  AmsEnabled = 1,
  PillarPulseway = 1,
  UpdatedAt = SYSUTCDATETIME(),
  UpdatedBy = N'448_Seed'
WHEN NOT MATCHED THEN INSERT (
  CustomerCode, AmsEnabled, PillarSyspro, PillarSql, PillarCove, PillarPulseway, PillarBitdefender, PillarMicrosoftCsp,
  Notes, UpdatedAt, UpdatedBy
) VALUES (
  s.CustomerCode, 1, 0, 0, 0, 1, 0, 0,
  N'Pulseway seed', SYSUTCDATETIME(), N'448_Seed'
);

PRINT N'AmsConfig merge done';

/* Aliases + map */
IF OBJECT_ID(N'tempdb..#Alias') IS NOT NULL DROP TABLE #Alias;
CREATE TABLE #Alias (
  OrganizationName nvarchar(200) NOT NULL PRIMARY KEY,
  CustomerCode nvarchar(50) NOT NULL
);

INSERT INTO #Alias (OrganizationName, CustomerCode) VALUES
  (N'Able Tracers', N'ABLE'),
  (N'AHI Carriers', N'AHIC'),
  (N'AHI Carrier', N'AHIC'),
  (N'Hydrasales', N'HYDRA'),
  (N'Interbrand', N'IB'),
  (N'MEDiPOS Medical Scheme', N'MEDIPOS'),
  (N'Metsi Water Solutions', N'METSI'),
  (N'Redsun Raisins', N'RSR'),
  (N'Remote Site Solutions', N'RSS'),
  (N'RPM Resources', N'RPMINT'),
  (N'RPM Internal', N'RPMINT'),
  (N'UVSS', N'UVSS'),
  (N'Unique Ventilation Systems', N'UVSS'),
  (N'Vault Tech', N'VAULT'),
  (N'YLJ Health', N'YLJ');

/* Only if customer exists */
DELETE a FROM #Alias a
WHERE NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = a.CustomerCode AND c.Active = 1);

MERGE dbo.Dim_Pulseway_OrgAlias AS t
USING #Alias AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'448 seed'
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
  VALUES (s.OrganizationName, s.CustomerCode, 1, N'448 seed');

/* RPM Internal maps to RPMINT (same as RPM Resources) */

MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (
  SELECT a.OrganizationName, a.CustomerCode, a.OrganizationId
  FROM dbo.Dim_Pulseway_OrgAlias a
  INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
  WHERE a.Active = 1
) AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME(),
  Notes = N'448'
WHEN NOT MATCHED THEN INSERT (OrganizationName, OrganizationId, CustomerCode, Active, Notes, UpdatedAtUtc)
  VALUES (s.OrganizationName, s.OrganizationId, s.CustomerCode, 1, N'448', SYSUTCDATETIME());

/* Restamp devices */
UPDATE d SET d.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Devices d
INNER JOIN dbo.Dim_Pulseway_OrgMap m ON m.Active = 1 AND m.OrganizationName = d.OrganizationName;

UPDATE dbo.Pulseway_Devices SET CustomerCode = N'RPMINT' WHERE OrganizationName IN (N'RPM Internal', N'RPM Resources');

UPDATE n SET n.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Notifications n
INNER JOIN dbo.Dim_Pulseway_OrgMap m ON m.Active = 1 AND m.OrganizationName = n.OrganizationName;

UPDATE dbo.Pulseway_Notifications SET CustomerCode = N'RPMINT' WHERE OrganizationName IN (N'RPM Internal', N'RPM Resources');

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
END

PRINT N'=== Active Dim_Customer ===';
SELECT CustomerCode, DisplayName, Active, PulsewayOrgName
FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE Active = 1
ORDER BY CustomerCode;

PRINT N'=== Pulseway summary ===';
SELECT CustomerCode, OrganizationName, DeviceCount
FROM dbo.Pulseway_OrgSummary WITH (NOLOCK)
WHERE SnapshotDate = @Snap
ORDER BY DeviceCount DESC;

PRINT N'=== Still unmapped (expect BHF Global if unmapped) ===';
SELECT OrganizationName, COUNT(*) AS Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = @Snap
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
GROUP BY OrganizationName
ORDER BY Devices DESC;
GO
