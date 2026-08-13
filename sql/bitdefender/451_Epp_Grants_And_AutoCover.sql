/*
  451 - EPP grants + auto-cover for customers with mapped Bitdefender endpoints
  Run as SQL admin (Windows auth / sa) then re-run app (or hard refresh).
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

-- Ensure view exists
IF OBJECT_ID(N'dbo.vw_Kpi_Epp_Summary', N'V') IS NULL
BEGIN
  EXEC(N'
  CREATE VIEW dbo.vw_Kpi_Epp_Summary
  AS
  SELECT
    e.CustomerCode,
    e.SnapshotDate AS AsOfDate,
    COUNT(*) AS DeviceCount,
    SUM(CASE WHEN e.IsManaged = 1 THEN 1 ELSE 0 END) AS ManagedCount,
    SUM(CASE WHEN ISNULL(e.IsManaged, 0) = 0 THEN 1 ELSE 0 END) AS UnmanagedCount,
    SUM(CASE WHEN e.MachineType = 5 THEN 1 ELSE 0 END) AS WorkstationCount,
    SUM(CASE WHEN e.MachineType = 6 THEN 1 ELSE 0 END) AS ServerCount,
    MAX(e.ImportedAt) AS LastImportAt
  FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
  INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) AS mx
    FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
    WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''''
    GROUP BY CustomerCode
  ) m ON m.CustomerCode = e.CustomerCode AND m.mx = e.SnapshotDate
  WHERE e.CustomerCode IS NOT NULL
  GROUP BY e.CustomerCode, e.SnapshotDate;
  ');
  PRINT N'vw_Kpi_Epp_Summary created';
END
ELSE
BEGIN
  EXEC(N'
  ALTER VIEW dbo.vw_Kpi_Epp_Summary
  AS
  SELECT
    e.CustomerCode,
    e.SnapshotDate AS AsOfDate,
    COUNT(*) AS DeviceCount,
    SUM(CASE WHEN e.IsManaged = 1 THEN 1 ELSE 0 END) AS ManagedCount,
    SUM(CASE WHEN ISNULL(e.IsManaged, 0) = 0 THEN 1 ELSE 0 END) AS UnmanagedCount,
    SUM(CASE WHEN e.MachineType = 5 THEN 1 ELSE 0 END) AS WorkstationCount,
    SUM(CASE WHEN e.MachineType = 6 THEN 1 ELSE 0 END) AS ServerCount,
    MAX(e.ImportedAt) AS LastImportAt
  FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
  INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) AS mx
    FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
    WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''''
    GROUP BY CustomerCode
  ) m ON m.CustomerCode = e.CustomerCode AND m.mx = e.SnapshotDate
  WHERE e.CustomerCode IS NOT NULL
  GROUP BY e.CustomerCode, e.SnapshotDate;
  ');
  PRINT N'vw_Kpi_Epp_Summary altered';
END
GO

-- Extra hostname patterns (safe re-run)
IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Bitdefender_NameMap AS t
  USING (VALUES
    (N'AHIC', N'AHIC', N'Prefix', 10, N'AHI Carrier'),
    (N'ahi-carrier', N'AHIC', N'Contains', 20, N'FQDN'),
    (N'HYDRA', N'HYDRA', N'Prefix', 10, N'Hydrasales'),
    (N'RSR', N'RSR', N'Prefix', 15, N'Redsun'),
    (N'UVSS', N'UVSS', N'Prefix', 10, N'UVSS'),
    (N'RPM', N'RPMINT', N'Prefix', 25, N'RPM hosts'),
    (N'rpmresources', N'RPMINT', N'Contains', 20, N'RPM FQDN'),
    (N'RPMWINRM', N'RPMINT', N'Prefix', 10, N'Central'),
    (N'LUKERPM', N'RPMINT', N'Prefix', 30, N'RPM staff'),
    (N'METSI', N'METSI', N'Prefix', 10, N'Metsi'),
    (N'ABLE', N'ABLE', N'Prefix', 10, N'Able'),
    (N'RSS', N'RSS', N'Prefix', 15, N'Remote Site'),
    (N'PCNS', N'BHF', N'Prefix', 10, N'BHF/PCNS'),
    (N'SBS', N'SBS', N'Prefix', 15, N'Simply Bright'),
    (N'BHF', N'BHF', N'Prefix', 20, N'BHF name')
  ) AS s(Pattern, CustomerCode, MatchType, Priority, Notes)
  ON t.Pattern = s.Pattern AND t.CustomerCode = s.CustomerCode
  WHEN MATCHED THEN UPDATE SET MatchType=s.MatchType, Priority=s.Priority, Notes=s.Notes, Active=1, UpdatedAtUtc=SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (Pattern, CustomerCode, MatchType, Priority, Notes, Active)
    VALUES (s.Pattern, s.CustomerCode, s.MatchType, s.Priority, s.Notes, 1);
  PRINT N'Name map patterns merged';
END
GO

-- Re-stamp unmapped endpoints using name map (latest snapshot only)
IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NOT NULL
BEGIN
  ;WITH latest AS (
    SELECT MAX(SnapshotDate) AS mx FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
  ),
  candidates AS (
    SELECT e.SnapshotDate, e.EndpointId, e.DeviceName, e.Fqdn, e.CustomerCode
    FROM dbo.Bitdefender_Endpoints AS e
    CROSS JOIN latest
    WHERE e.SnapshotDate = latest.mx
      AND (e.CustomerCode IS NULL OR LTRIM(RTRIM(e.CustomerCode)) = N'')
  ),
  ranked AS (
    SELECT c.SnapshotDate, c.EndpointId, m.CustomerCode,
      ROW_NUMBER() OVER (
        PARTITION BY c.SnapshotDate, c.EndpointId
        ORDER BY m.Priority ASC, LEN(m.Pattern) DESC
      ) AS rn
    FROM candidates AS c
    INNER JOIN dbo.Dim_Bitdefender_NameMap AS m ON m.Active = 1
    WHERE
      (m.MatchType = N'Exact' AND (
        UPPER(ISNULL(c.DeviceName,N'')) = UPPER(m.Pattern)
        OR UPPER(ISNULL(c.Fqdn,N'')) = UPPER(m.Pattern)
      ))
      OR (m.MatchType = N'Prefix' AND (
        UPPER(ISNULL(c.DeviceName,N'')) LIKE UPPER(m.Pattern) + N'%'
        OR UPPER(ISNULL(c.Fqdn,N'')) LIKE UPPER(m.Pattern) + N'%'
        OR UPPER(ISNULL(c.DeviceName,N'') + N' ' + ISNULL(c.Fqdn,N'')) LIKE N'%' + UPPER(m.Pattern) + N'%'
      ))
      OR (m.MatchType = N'Contains' AND (
        UPPER(ISNULL(c.DeviceName,N'') + N' ' + ISNULL(c.Fqdn,N'')) LIKE N'%' + UPPER(m.Pattern) + N'%'
      ))
  )
  UPDATE e
  SET CustomerCode = r.CustomerCode
  FROM dbo.Bitdefender_Endpoints AS e
  INNER JOIN ranked AS r
    ON r.SnapshotDate = e.SnapshotDate AND r.EndpointId = e.EndpointId AND r.rn = 1;
  PRINT N'Re-stamped unmapped endpoints from name map';
END
GO

-- Ensure AmsConfig rows exist + PillarBitdefender = 1 when endpoints mapped
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NULL
  BEGIN
    ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarBitdefender bit NOT NULL
      CONSTRAINT DF_AmsCfg_Bd_Epp DEFAULT (0);
    PRINT N'Added PillarBitdefender column';
  END
END
GO

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
BEGIN
  ;WITH codes AS (
    SELECT DISTINCT LTRIM(RTRIM(CustomerCode)) AS CustomerCode
    FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
    WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  )
  INSERT INTO dbo.Dim_Customer_AmsConfig (
    CustomerCode, AmsEnabled, PillarSyspro, PillarSql, PillarCove, PillarPulseway,
    PillarBitdefender, PillarMicrosoftCsp, UpdatedAt, UpdatedBy
  )
  SELECT c.CustomerCode, 1, 0, 0, 0, 0, 1, 0, SYSUTCDATETIME(), N'451_Epp_AutoCover'
  FROM codes AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Dim_Customer_AmsConfig a WHERE a.CustomerCode = c.CustomerCode
  )
  AND EXISTS (SELECT 1 FROM dbo.Dim_Customer d WHERE d.CustomerCode = c.CustomerCode);

  UPDATE a
  SET PillarBitdefender = 1,
      UpdatedAt = SYSUTCDATETIME(),
      UpdatedBy = N'451_Epp_AutoCover'
  FROM dbo.Dim_Customer_AmsConfig AS a
  WHERE EXISTS (
    SELECT 1 FROM dbo.Bitdefender_Endpoints e WITH (NOLOCK)
    WHERE e.CustomerCode = a.CustomerCode
  )
  AND ISNULL(a.PillarBitdefender, 0) = 0;

  PRINT N'PillarBitdefender set for customers with mapped endpoints';
END
GO

-- Grants for common app/collect principals (ignore failures)
DECLARE @principals TABLE (name sysname);
INSERT INTO @principals(name) VALUES (N'Rpm_collect'), (N'Rpm_app'), (N'rpm_app'), (N'rpmassure');

DECLARE @p sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM @principals;
OPEN c;
FETCH NEXT FROM c INTO @p;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @p)
  BEGIN
    BEGIN TRY
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_Endpoints TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_LicenseSnapshot TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Dim_Bitdefender_NameMap TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      IF OBJECT_ID(N'dbo.vw_Kpi_Epp_Summary', N'V') IS NOT NULL
      BEGIN
        SET @sql = N'GRANT SELECT ON OBJECT::dbo.vw_Kpi_Epp_Summary TO ' + QUOTENAME(@p);
        EXEC sp_executesql @sql;
      END
      IF OBJECT_ID(N'dbo.vw_Bitdefender_Unmapped_Latest', N'V') IS NOT NULL
      BEGIN
        SET @sql = N'GRANT SELECT ON OBJECT::dbo.vw_Bitdefender_Unmapped_Latest TO ' + QUOTENAME(@p);
        EXEC sp_executesql @sql;
      END
      PRINT N'Granted SELECT to ' + @p;
    END TRY
    BEGIN CATCH
      PRINT N'Grant soft-fail ' + @p + N': ' + ERROR_MESSAGE();
    END CATCH
  END
  FETCH NEXT FROM c INTO @p;
END
CLOSE c; DEALLOCATE c;
GO

-- Quick proof
PRINT N'=== EPP mapped counts (latest snap) ===';
SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CustomerCode IS NOT NULL
GROUP BY CustomerCode
ORDER BY CustomerCode;

PRINT N'=== Unmapped on latest ===';
SELECT COUNT(*) AS Unmapped
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'');
GO
