/*
  Automate Cove partner -> Customer map cleanup
  - Creates Dim_Cove_PartnerAlias (manual/permanent aliases)
  - High-confidence auto-map into Dim_Cove_PartnerMap
  - Re-stamps Cove_DeviceStatistics.CustomerCode from map (Product holds partner name)
  - Lists remaining unmapped

  Run (admin once for objects, then Rpm_collect OK for map if granted):
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i 434_AutoMap_Cove_Partners.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

/* --- Alias table: permanent PartnerName overrides --- */
IF OBJECT_ID(N'dbo.Dim_Cove_PartnerAlias', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Cove_PartnerAlias
  (
    AliasId uniqueidentifier NOT NULL
      CONSTRAINT DF_Dim_Cove_PartnerAlias_Id DEFAULT (NEWSEQUENTIALID()),
    PartnerName nvarchar(200) NOT NULL,
    CustomerCode nvarchar(50) NOT NULL,
    PartnerId int NULL,
    Active bit NOT NULL CONSTRAINT DF_Dim_Cove_PartnerAlias_Active DEFAULT (1),
    Notes nvarchar(400) NULL,
    CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Dim_Cove_PartnerAlias_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Cove_PartnerAlias PRIMARY KEY (AliasId),
    CONSTRAINT UQ_Dim_Cove_PartnerAlias_Name UNIQUE (PartnerName)
  );
  PRINT 'Created Dim_Cove_PartnerAlias';
END
GO

/* Grants for collect account */
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_Cove_PartnerMap TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_Cove_PartnerAlias TO [Rpm_collect];
  GRANT SELECT, UPDATE ON dbo.Cove_DeviceStatistics TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NOT NULL
    GRANT SELECT ON dbo.Dim_Customer TO [Rpm_collect];
  PRINT 'Granted Rpm_collect for auto-map';
END
GO

/* Seed common aliases (idempotent)  extend as needed */
;WITH a AS (
  SELECT * FROM (VALUES
    (N'AHI Carriers', N'AHIC', 2602886, N'seed'),
    (N'AHI Carrier', N'AHIC', NULL, N'seed alias'),
    (N'UVSS', N'UVSS', 2814015, N'seed'),
    (N'Unique Ventilation Systems', N'UVSS', NULL, N'seed alias'),
    (N'Able Tracers', N'ABLE', NULL, N'seed'),
    (N'Able Traces', N'ABLE', NULL, N'seed alias'),
    (N'Hydra Sales', N'HYDRA', NULL, N'seed'),
    (N'Hydra', N'HYDRA', NULL, N'seed alias'),
    (N'Redsun Raisins Northen Cape', N'RSR', NULL, N'seed typo Northern'),
    (N'Redsun Raisins Northern Cape', N'RSR', NULL, N'seed'),
    (N'Redsun Raisins', N'RSR', NULL, N'seed alias'),
    (N'BHF (PNCS)', N'PCNS', 2925801, N'seed'),
    (N'PCNS', N'PCNS', NULL, N'seed alias'),
    (N'Remote Site Solutions (Pty) Ltd', N'RSS', NULL, N'seed'),
    (N'Remote Site Solutions', N'RSS', NULL, N'seed alias'),
    (N'Simply Bright Consulting', N'SBS', NULL, N'seed'),
    (N'Simply Bright', N'SBS', NULL, N'seed alias'),
    (N'RPM Resources', N'RPMINT', 2601580, N'seed'),
    (N'RPM Internal', N'RPMINT', NULL, N'seed alias')
  ) v(PartnerName, CustomerCode, PartnerId, Notes)
)
MERGE dbo.Dim_Cove_PartnerAlias AS t
USING a AS s ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  PartnerId = COALESCE(s.PartnerId, t.PartnerId),
  Active = 1,
  Notes = COALESCE(t.Notes, s.Notes)
WHEN NOT MATCHED THEN INSERT (PartnerName, CustomerCode, PartnerId, Active, Notes)
  VALUES (s.PartnerName, s.CustomerCode, s.PartnerId, 1, s.Notes);
GO

/* Ensure partner map exists */
IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NULL
BEGIN
  RAISERROR(N'Dim_Cove_PartnerMap missing  run 430_Ensure_Cove_Map_Admin.sql first.', 16, 1);
  RETURN;
END
GO

/* --- 1) Apply aliases (always win) --- */
MERGE dbo.Dim_Cove_PartnerMap AS t
USING (
  SELECT PartnerName, CustomerCode, PartnerId
  FROM dbo.Dim_Cove_PartnerAlias
  WHERE Active = 1
) AS s ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  PartnerId = COALESCE(s.PartnerId, t.PartnerId),
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME(),
  Notes = COALESCE(t.Notes, N'from alias')
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active, Notes)
  VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1, N'from alias');

PRINT 'Aliases applied to Dim_Cove_PartnerMap';
GO

/* --- 2) High-confidence auto-map from Dim_Customer --- */
;WITH LatestSnap AS (
  SELECT MAX(SnapshotDate) AS SnapshotDate
  FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
),
Unmapped AS (
  SELECT
    NULLIF(LTRIM(RTRIM(d.Product)), N'') AS PartnerName,
    MAX(d.PartnerId) AS PartnerId,
    COUNT_BIG(*) AS DeviceCount
  FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
  CROSS JOIN LatestSnap s
  WHERE d.SnapshotDate = s.SnapshotDate
    AND (d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode)) = N'')
    AND NULLIF(LTRIM(RTRIM(d.Product)), N'') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM dbo.Dim_Cove_PartnerMap m
      WHERE m.Active = 1 AND m.PartnerName = NULLIF(LTRIM(RTRIM(d.Product)), N'')
    )
  GROUP BY NULLIF(LTRIM(RTRIM(d.Product)), N'')
),
Norm AS (
  SELECT
    u.PartnerName,
    u.PartnerId,
    u.DeviceCount,
    LOWER(LTRIM(RTRIM(u.PartnerName))) AS pn,
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      LTRIM(RTRIM(u.PartnerName)),
      N'(Pty) Ltd', N''), N'Pty Ltd', N''), N' Pty', N''), N' Limited', N''), N'.', N''), N'  ', N' ')) AS pn_clean
  FROM Unmapped u
),
Cust AS (
  SELECT
    c.CustomerCode,
    c.DisplayName,
    LOWER(LTRIM(RTRIM(c.CustomerCode))) AS cc,
    LOWER(LTRIM(RTRIM(c.DisplayName))) AS dn,
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      LTRIM(RTRIM(c.DisplayName)),
      N'(Pty) Ltd', N''), N'Pty Ltd', N''), N' Pty', N''), N' Limited', N''), N'.', N''), N'  ', N' ')) AS dn_clean
  FROM dbo.Dim_Customer AS c WITH (NOLOCK)
  WHERE c.Active = 1
    AND NULLIF(LTRIM(RTRIM(c.SqlInstanceName)), N'') IS NOT NULL
),
Scored AS (
  SELECT
    n.PartnerName,
    n.PartnerId,
    n.DeviceCount,
    c.CustomerCode,
    CASE
      WHEN n.pn = c.cc THEN 100
      WHEN n.pn = c.dn THEN 98
      WHEN n.pn_clean = c.dn_clean THEN 96
      WHEN n.pn_clean LIKE c.dn_clean + N'%' OR c.dn_clean LIKE n.pn_clean + N'%' THEN 90
      WHEN n.pn LIKE N'%' + c.cc + N'%' AND LEN(c.cc) >= 3 THEN 88
      WHEN c.dn LIKE N'%' + n.PartnerName + N'%' AND LEN(n.PartnerName) >= 4 THEN 82
      WHEN n.pn LIKE N'%' + c.dn + N'%' AND LEN(c.dn) >= 4 THEN 80
      ELSE 0
    END AS Score
  FROM Norm n
  CROSS JOIN Cust c
),
Best AS (
  SELECT *
  FROM (
    SELECT
      s.*,
      ROW_NUMBER() OVER (PARTITION BY s.PartnerName ORDER BY s.Score DESC, s.CustomerCode) AS rn,
      COUNT(*) OVER (
        PARTITION BY s.PartnerName, CASE WHEN s.Score >= 88 THEN 1 ELSE 0 END
      ) AS TiesAt88
    FROM Scored s
    WHERE s.Score >= 88
  ) x
  WHERE rn = 1
    /* skip ambiguous: two different customers both score >= 88 */
    AND NOT EXISTS (
      SELECT 1 FROM Scored s2
      WHERE s2.PartnerName = x.PartnerName
        AND s2.CustomerCode <> x.CustomerCode
        AND s2.Score >= 88
        AND s2.Score >= x.Score - 2
    )
)
MERGE dbo.Dim_Cove_PartnerMap AS t
USING Best AS s ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  PartnerId = COALESCE(s.PartnerId, t.PartnerId),
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME(),
  Notes = CONCAT(N'auto score=', s.Score)
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active, Notes)
  VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1, CONCAT(N'auto score=', s.Score));

PRINT 'High-confidence auto-map complete';
GO

/* --- 3) Re-stamp device rows from map (Product = partner name from collect) --- */
UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Cove_DeviceStatistics AS d
INNER JOIN dbo.Dim_Cove_PartnerMap AS m
  ON m.Active = 1
 AND (
      m.PartnerName = d.Product
   OR (d.PartnerId IS NOT NULL AND m.PartnerId = d.PartnerId)
 )
WHERE d.CustomerCode IS NULL
   OR LTRIM(RTRIM(d.CustomerCode)) = N''
   OR d.CustomerCode <> m.CustomerCode;

PRINT CONCAT(N'Re-stamped rows: ', @@ROWCOUNT);
GO

/* --- 4) Report --- */
PRINT '=== Auto-map results ===';
SELECT PartnerName, CustomerCode, PartnerId, Notes, UpdatedAtUtc
FROM dbo.Dim_Cove_PartnerMap WITH (NOLOCK)
WHERE Active = 1
ORDER BY CustomerCode, PartnerName;

PRINT '=== Still unmapped (need alias or manual) ===';
SELECT
  NULLIF(LTRIM(RTRIM(d.Product)), N'') AS PartnerName,
  d.PartnerId,
  COUNT_BIG(*) AS DeviceCount
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
  AND (d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode)) = N'')
  AND NULLIF(LTRIM(RTRIM(d.Product)), N'') IS NOT NULL
GROUP BY NULLIF(LTRIM(RTRIM(d.Product)), N''), d.PartnerId
ORDER BY DeviceCount DESC, PartnerName;

PRINT 'Done. Add stubborn partners to Dim_Cove_PartnerAlias then re-run this script.';
GO
