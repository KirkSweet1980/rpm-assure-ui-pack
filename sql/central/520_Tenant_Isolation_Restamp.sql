/*
  520 - Tenant isolation restamp.

  AHIC was seeded with Cove PartnerId 2602886 (Remote Site Solutions).
  That pulled RSS-PROD onto the AHI estate. Hostname + legal name win.
  PartnerId is only used when it belongs to exactly one customer.

  Safe to re-run.
*/
SET NOCOUNT ON;
IF DB_ID(N'RPMAssure_App') IS NOT NULL
  USE RPMAssure_App;
GO

/* ---- Cove partner IDs (live, from 470/471) ---- */
IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Cove_PartnerMap AS t
  USING (VALUES
    (N'AHI Carriers',                    N'AHIC',   2760329),
    (N'AHI Carrier',                     N'AHIC',   2760329),
    (N'Remote Site Solutions (Pty) Ltd', N'RSS',    2602886),
    (N'Remote Site Solutions',           N'RSS',    2602886),
    (N'UVSS',                            N'UVSS',   2814015),
    (N'Unique Ventilation Systems',      N'UVSS',   2814015),
    (N'Able Tracers',                    N'ABLE',   2602723),
    (N'Hydra Sales',                     N'HYDRA',  2660606),
    (N'HydraSales',                      N'HYDRA',  2660606),
    (N'Redsun Raisins Northern Cape',    N'RSR',    2867685),
    (N'Redsun Raisins Northen Cape',     N'RSR',    2867685),
    (N'Redsun Raisins',                  N'RSR',    2867685),
    (N'RPM Resources',                   N'RPMINT', 2601586),
    (N'BHF (PNCS)',                      N'BHF',    2925801),
    (N'BHF (PCNS)',                      N'BHF',    2925801),
    (N'Simply Bright Consulting',        N'SBS',    2932715),
    (N'Simply Bright',                   N'SBS',    2932715)
  ) AS s(PartnerName, CustomerCode, PartnerId)
  ON t.PartnerName = s.PartnerName
  WHEN MATCHED THEN UPDATE SET
    CustomerCode = s.CustomerCode,
    PartnerId = s.PartnerId,
    Active = 1,
    UpdatedAtUtc = SYSUTCDATETIME(),
    Notes = N'520 tenant isolation'
  WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active, Notes)
    VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1, N'520 tenant isolation');

  /* Never leave AHIC pointing at RSS's partner id */
  UPDATE dbo.Dim_Cove_PartnerMap
  SET PartnerId = 2760329, CustomerCode = N'AHIC', Active = 1,
      Notes = N'520 AHIC id was 2602886 (RSS) — corrected'
  WHERE CustomerCode = N'AHIC' AND ISNULL(PartnerId, 0) IN (2602886, 0);

  UPDATE dbo.Dim_Cove_PartnerMap
  SET CustomerCode = N'RSS', PartnerId = 2602886, Active = 1
  WHERE PartnerName LIKE N'%Remote Site%';
END
GO

/* Cove devices: product name first */
IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
  AND OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NOT NULL
BEGIN
  UPDATE d SET d.CustomerCode = m.CustomerCode
  FROM dbo.Cove_DeviceStatistics AS d
  INNER JOIN dbo.Dim_Cove_PartnerMap AS m
    ON m.Active = 1
   AND UPPER(LTRIM(RTRIM(ISNULL(d.Product, N'')))) = UPPER(LTRIM(RTRIM(m.PartnerName)))
  WHERE ISNULL(d.CustomerCode, N'') <> m.CustomerCode;
  PRINT CONCAT('Cove restamp by Product: ', @@ROWCOUNT);

  /* Unique PartnerId only */
  ;WITH Uniq AS (
    SELECT PartnerId, MIN(CustomerCode) AS CustomerCode
    FROM dbo.Dim_Cove_PartnerMap
    WHERE Active = 1 AND PartnerId IS NOT NULL
    GROUP BY PartnerId
    HAVING COUNT(DISTINCT CustomerCode) = 1
  )
  UPDATE d SET d.CustomerCode = u.CustomerCode
  FROM dbo.Cove_DeviceStatistics AS d
  INNER JOIN Uniq AS u ON u.PartnerId = d.PartnerId
  WHERE ISNULL(d.CustomerCode, N'') <> u.CustomerCode
    AND (
      d.Product IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM dbo.Dim_Cove_PartnerMap m
        WHERE m.Active = 1
          AND UPPER(LTRIM(RTRIM(m.PartnerName))) = UPPER(LTRIM(RTRIM(d.Product)))
      )
    );
  PRINT CONCAT('Cove restamp by unique PartnerId: ', @@ROWCOUNT);
END
GO

/* Pulseway legal-name aliases */
IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgAlias', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Pulseway_OrgAlias AS t
  USING (VALUES
    (N'Remote Site Solutions (Pty) Ltd', N'RSS'),
    (N'Remote Site Solutions',           N'RSS'),
    (N'AHI Carriers',                    N'AHIC'),
    (N'AHI Carrier',                     N'AHIC')
  ) AS s(OrganizationName, CustomerCode)
  ON t.OrganizationName = s.OrganizationName
  WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1
  WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
    VALUES (s.OrganizationName, s.CustomerCode, 1, N'520 isolation');
END

IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Pulseway_OrgMap AS t
  USING (VALUES
    (N'Remote Site Solutions (Pty) Ltd', N'RSS'),
    (N'Remote Site Solutions',           N'RSS'),
    (N'AHI Carriers',                    N'AHIC'),
    (N'AHI Carrier',                     N'AHIC')
  ) AS s(OrganizationName, CustomerCode)
  ON t.OrganizationName = s.OrganizationName
  WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes, UpdatedAtUtc)
    VALUES (s.OrganizationName, s.CustomerCode, 1, N'520 isolation', SYSUTCDATETIME());
END
GO

/* Hostname map wins on Pulseway */
IF OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NOT NULL
  AND OBJECT_ID(N'dbo.Dim_Pulseway_NameMap', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Pulseway_NameMap WHERE NameLike = N'RSS-%')
    INSERT INTO dbo.Dim_Pulseway_NameMap (NameLike, CustomerCode, Priority, Active, Notes)
    VALUES (N'RSS-%', N'RSS', 200, 1, N'520');

  ;WITH Hit AS (
    SELECT d.SnapshotDate, d.DeviceId, m.CustomerCode,
      ROW_NUMBER() OVER (PARTITION BY d.SnapshotDate, d.DeviceId ORDER BY m.Priority DESC, LEN(m.NameLike) DESC) AS rn
    FROM dbo.Pulseway_Devices d
    INNER JOIN dbo.Dim_Pulseway_NameMap m ON m.Active = 1 AND d.Name LIKE m.NameLike
  )
  UPDATE d SET d.CustomerCode = h.CustomerCode
  FROM dbo.Pulseway_Devices d
  INNER JOIN Hit h ON h.SnapshotDate = d.SnapshotDate AND h.DeviceId = d.DeviceId AND h.rn = 1
  WHERE ISNULL(d.CustomerCode, N'') <> h.CustomerCode;
  PRINT CONCAT('Pulseway hostname remaps: ', @@ROWCOUNT);

  UPDATE d SET d.CustomerCode = m.CustomerCode
  FROM dbo.Pulseway_Devices d
  INNER JOIN dbo.Dim_Pulseway_OrgMap m
    ON m.Active = 1 AND LTRIM(RTRIM(d.OrganizationName)) = LTRIM(RTRIM(m.OrganizationName))
  WHERE ISNULL(d.CustomerCode, N'') <> m.CustomerCode
    AND NOT EXISTS (
      SELECT 1 FROM dbo.Dim_Pulseway_NameMap n
      WHERE n.Active = 1 AND d.Name LIKE n.NameLike
    );
  PRINT CONCAT('Pulseway org remaps: ', @@ROWCOUNT);
END
GO

PRINT N'=== Cove devices by customer (latest snap) ===';
IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
  SELECT ISNULL(CustomerCode, N'(none)') AS CustomerCode, Product, COUNT(*) AS Devices
  FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
  GROUP BY ISNULL(CustomerCode, N'(none)'), Product
  ORDER BY 1, 2;

PRINT N'=== Pulseway RSS / AHIC hosts ===';
IF OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NOT NULL
  SELECT Name, OrganizationName, CustomerCode
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
    AND (
      Name LIKE N'RSS%' OR Name LIKE N'AHIC%'
      OR OrganizationName LIKE N'%Remote Site%'
      OR OrganizationName LIKE N'%AHI%'
    )
  ORDER BY CustomerCode, Name;

PRINT '520 tenant isolation done.';
GO
