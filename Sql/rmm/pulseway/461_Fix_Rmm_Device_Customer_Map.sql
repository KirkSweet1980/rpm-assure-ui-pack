/*
  461 - Device hostname map wins over Pulseway org.

  SBS-PROD is Simply Bright (SBS), not RPM Resources (RPMINT).
  Same rule for every customer: Name prefix / org alias -> CustomerCode.

  Safe to re-run.
*/
SET NOCOUNT ON;
IF DB_ID(N'RPMAssure_App') IS NOT NULL
  USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Dim_Pulseway_NameMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Pulseway_NameMap (
    NameLike      nvarchar(80)  NOT NULL,
    CustomerCode  nvarchar(50)  NOT NULL,
    Priority      int           NOT NULL CONSTRAINT DF_PwNameMap_Pri DEFAULT (100),
    Active        bit           NOT NULL CONSTRAINT DF_PwNameMap_Act DEFAULT (1),
    Notes         nvarchar(200) NULL,
    CONSTRAINT PK_Dim_Pulseway_NameMap PRIMARY KEY (NameLike)
  );
  PRINT 'Dim_Pulseway_NameMap created';
END
GO

/* Explicit hostname patterns. Longest / highest Priority wins. */
MERGE dbo.Dim_Pulseway_NameMap AS t
USING (VALUES
  (N'SBS-%',           N'SBS',    200, N'Simply Bright host prefix'),
  (N'SBS[_]%',         N'SBS',    200, N'Simply Bright underscore'),
  (N'SBSPROD%',        N'SBS',    190, N'SBS-PROD compact'),
  (N'SIMPLY%',         N'SBS',    180, N'Simply Bright name'),
  (N'SIRZA%',          N'SIRF',   200, N'Sir Fruit host'),
  (N'SIRF-%',          N'SIRF',   200, N'Sir Fruit prefix'),
  (N'SIRFRUIT%',       N'SIRF',   190, N'Sir Fruit compact'),
  (N'AHIC-%',          N'AHIC',   200, N'AHI Carriers'),
  (N'AHI-%',           N'AHIC',   180, N'AHI short'),
  (N'RSR-%',           N'RSR',    200, N'Redsun Raisins'),
  (N'REDSUN%',         N'RSR',    180, N'Redsun name'),
  (N'UVSS-%',          N'UVSS',   200, N'UVSS'),
  (N'UVSS%',           N'UVSS',   170, N'UVSS start'),
  (N'RSS-%',           N'RSS',    200, N'Remote Site Solutions'),
  (N'HYDRA%',          N'HYDRA',  180, N'Hydrasales'),
  (N'ABLE-%',          N'ABLE',   200, N'Able Tracers'),
  (N'METSI%',          N'METSI',  180, N'Metsi Water'),
  (N'YLJ-%',           N'YLJ',    200, N'YLJ Health'),
  (N'MEDIPOS%',        N'MEDIPOS',180, N'MEDiPOS'),
  (N'BHF-%',           N'BHF',    200, N'BHF Global'),
  (N'VAULT%',          N'VAULT',  180, N'Vault Tech'),
  (N'IB-%',            N'IB',     200, N'Interbrand'),
  (N'INTERBRAND%',     N'IB',     190, N'Interbrand name'),
  (N'RPM-%',           N'RPMINT', 150, N'RPM Resources host prefix')
) AS s(NameLike, CustomerCode, Priority, Notes)
ON t.NameLike = s.NameLike
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  Priority = s.Priority,
  Active = 1,
  Notes = s.Notes
WHEN NOT MATCHED THEN INSERT (NameLike, CustomerCode, Priority, Active, Notes)
  VALUES (s.NameLike, s.CustomerCode, s.Priority, 1, s.Notes);
PRINT 'Name map seeded';
GO

/* Pulseway org aliases for Simply Bright + keep RPM orgs on RPMINT */
IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgAlias', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Pulseway_OrgAlias AS t
  USING (VALUES
    (N'Simply Bright',            N'SBS'),
    (N'Simply Bright Consulting', N'SBS'),
    (N'SBS',                      N'SBS'),
    (N'RPM Resources',            N'RPMINT'),
    (N'RPM Internal',             N'RPMINT')
  ) AS s(OrganizationName, CustomerCode)
  ON t.OrganizationName = s.OrganizationName
  WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'461 name/org'
  WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
    VALUES (s.OrganizationName, s.CustomerCode, 1, N'461 name/org');
END

IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Pulseway_OrgMap AS t
  USING (VALUES
    (N'Simply Bright',            N'SBS'),
    (N'Simply Bright Consulting', N'SBS'),
    (N'SBS',                      N'SBS'),
    (N'RPM Resources',            N'RPMINT'),
    (N'RPM Internal',             N'RPMINT')
  ) AS s(OrganizationName, CustomerCode)
  ON t.OrganizationName = s.OrganizationName
  WHEN MATCHED THEN UPDATE SET
    CustomerCode = s.CustomerCode,
    Active = 1,
    Notes = N'461 org',
    UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes, UpdatedAtUtc)
    VALUES (s.OrganizationName, s.CustomerCode, 1, N'461 org', SYSUTCDATETIME());
END
GO

/* Ensure SBS customer + RMM pillar when devices exist */
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'SBS')
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active)
  VALUES (N'SBS', N'Simply Bright', 1);
ELSE
  UPDATE dbo.Dim_Customer SET DisplayName = N'Simply Bright', Active = 1 WHERE CustomerCode = N'SBS';
GO

/* 1) Stamp from org map (fill blanks / keep org default) */
UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Devices AS d
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1
 AND LTRIM(RTRIM(d.OrganizationName)) = LTRIM(RTRIM(m.OrganizationName))
WHERE d.CustomerCode IS NULL
   OR LTRIM(RTRIM(d.CustomerCode)) = N''
   OR d.CustomerCode <> m.CustomerCode;
PRINT CONCAT('Org-stamped devices: ', @@ROWCOUNT);
GO

/* 2) Hostname map WINS — SBS-PROD under RPM Internal becomes SBS */
;WITH Hit AS (
  SELECT
    d.SnapshotDate,
    d.DeviceId,
    m.CustomerCode,
    ROW_NUMBER() OVER (
      PARTITION BY d.SnapshotDate, d.DeviceId
      ORDER BY m.Priority DESC, LEN(m.NameLike) DESC
    ) AS rn
  FROM dbo.Pulseway_Devices AS d
  INNER JOIN dbo.Dim_Pulseway_NameMap AS m
    ON m.Active = 1
   AND d.Name LIKE m.NameLike
  INNER JOIN dbo.Dim_Customer AS c
    ON c.CustomerCode = m.CustomerCode AND c.Active = 1
)
UPDATE d
SET d.CustomerCode = h.CustomerCode
FROM dbo.Pulseway_Devices AS d
INNER JOIN Hit AS h
  ON h.SnapshotDate = d.SnapshotDate
 AND h.DeviceId = d.DeviceId
 AND h.rn = 1
WHERE ISNULL(d.CustomerCode, N'') <> h.CustomerCode;
PRINT CONCAT('Hostname remaps: ', @@ROWCOUNT);
GO

/* Notifications follow the device */
UPDATE n
SET n.CustomerCode = d.CustomerCode
FROM dbo.Pulseway_Notifications AS n
INNER JOIN dbo.Pulseway_Devices AS d
  ON d.DeviceId = n.DeviceId
 AND d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices)
WHERE n.SnapshotDate = d.SnapshotDate
  AND ISNULL(n.CustomerCode, N'') <> ISNULL(d.CustomerCode, N'');
PRINT CONCAT('Notifications remapped: ', @@ROWCOUNT);

IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
BEGIN
  UPDATE k
  SET k.CustomerCode = d.CustomerCode
  FROM dbo.Pulseway_Disks AS k
  INNER JOIN dbo.Pulseway_Devices AS d
    ON d.DeviceId = k.DeviceId
   AND d.SnapshotDate = k.SnapshotDate
  WHERE ISNULL(k.CustomerCode, N'') <> ISNULL(d.CustomerCode, N'');
  PRINT CONCAT('Disks remapped: ', @@ROWCOUNT);
END
GO

/* Turn RMM cover on for customers that now have devices */
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  UPDATE a
  SET a.PillarPulseway = 1
  FROM dbo.Dim_Customer_AmsConfig AS a
  WHERE EXISTS (
    SELECT 1 FROM dbo.Pulseway_Devices d
    WHERE d.CustomerCode = a.CustomerCode
      AND d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices)
  );
  PRINT CONCAT('PillarPulseway on: ', @@ROWCOUNT);
END
GO

/* Rebuild latest org summary */
DECLARE @Snap date = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
IF @Snap IS NOT NULL AND OBJECT_ID(N'dbo.Pulseway_OrgSummary', N'U') IS NOT NULL
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
    AND d.CustomerCode IS NOT NULL
    AND LTRIM(RTRIM(d.CustomerCode)) <> N''
  GROUP BY d.CustomerCode;
END
GO

PRINT '=== SBS-PROD and SBS* hosts ===';
SELECT
  d.Name,
  d.OrganizationName,
  d.CustomerCode,
  c.DisplayName,
  d.DeviceType,
  d.IsOnline
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer AS c ON c.CustomerCode = d.CustomerCode
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND (
    d.Name LIKE N'SBS%'
    OR d.OrganizationName LIKE N'%Simply%'
    OR d.OrganizationName LIKE N'SBS%'
    OR d.CustomerCode = N'SBS'
  )
ORDER BY d.Name;

PRINT '=== Devices still on RPMINT whose name belongs to another customer ===';
SELECT
  d.Name,
  d.OrganizationName,
  d.CustomerCode AS MappedTo,
  h.CustomerCode AS ShouldBe
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
CROSS APPLY (
  SELECT TOP (1) m.CustomerCode
  FROM dbo.Dim_Pulseway_NameMap AS m
  WHERE m.Active = 1 AND d.Name LIKE m.NameLike
  ORDER BY m.Priority DESC, LEN(m.NameLike) DESC
) AS h
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND d.CustomerCode IN (N'RPMINT', N'RPM')
  AND h.CustomerCode <> d.CustomerCode
ORDER BY d.Name;

PRINT '=== All customers x latest RMM devices ===';
SELECT
  ISNULL(c.CustomerCode, d.CustomerCode) AS CustomerCode,
  ISNULL(c.DisplayName, N'(unmapped)') AS DisplayName,
  COUNT(*) AS Devices,
  SUM(CASE WHEN d.IsOnline = 1 THEN 1 ELSE 0 END) AS Online,
  SUM(CASE WHEN d.DeviceType = N'Server' THEN 1 ELSE 0 END) AS Servers,
  MAX(d.OrganizationName) AS PulsewayOrg
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer AS c ON c.CustomerCode = d.CustomerCode
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
GROUP BY ISNULL(c.CustomerCode, d.CustomerCode), ISNULL(c.DisplayName, N'(unmapped)')
ORDER BY Devices DESC;

PRINT '=== Mismatch leftover (name map vs CustomerCode) ===';
SELECT
  d.Name,
  d.OrganizationName,
  d.CustomerCode AS MappedTo,
  h.CustomerCode AS ShouldBe
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
CROSS APPLY (
  SELECT TOP (1) m.CustomerCode
  FROM dbo.Dim_Pulseway_NameMap AS m
  WHERE m.Active = 1 AND d.Name LIKE m.NameLike
  ORDER BY m.Priority DESC, LEN(m.NameLike) DESC
) AS h
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND ISNULL(d.CustomerCode, N'') <> h.CustomerCode
ORDER BY d.Name;

PRINT '461 done. Hard-refresh RMM. SBS-PROD must list under Simply Bright.';
GO
