/*
  452 - Expand Bitdefender name map, re-stamp endpoints, incidents/quarantine tables
  Run as SQL admin (Windows auth). Then re-run Collect-Bitdefender-To-RPMAssure.ps1
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

-- Broader hostname / FQDN patterns (safe re-run)
IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Bitdefender_NameMap AS t
  USING (VALUES
    -- AHI Carrier
    (N'AHIC', N'AHIC', N'Prefix', 10, N'AHI prefix'),
    (N'AHI-', N'AHIC', N'Prefix', 12, N'AHI- hosts'),
    (N'ahi-carrier', N'AHIC', N'Contains', 20, N'FQDN domain'),
    (N'AHI CARRIER', N'AHIC', N'Contains', 25, N'display name'),
    -- Hydrasales
    (N'HYDRA', N'HYDRA', N'Prefix', 10, N'Hydra prefix'),
    (N'HYDRASRV', N'HYDRA', N'Prefix', 8, N'HYDRASRV'),
    (N'hydrasales', N'HYDRA', N'Contains', 20, N'display'),
    -- Redsun
    (N'RSR', N'RSR', N'Prefix', 12, N'RSR prefix'),
    (N'RSR-', N'RSR', N'Prefix', 10, N'RSR-'),
    (N'REDSUN', N'RSR', N'Contains', 20, N'Redsun'),
    -- UVSS
    (N'UVSS', N'UVSS', N'Prefix', 10, N'UVSS'),
    (N'VENTILATION', N'UVSS', N'Contains', 30, N'Unique Ventilation'),
    -- RPM Internal
    (N'RPM', N'RPMINT', N'Prefix', 28, N'RPM hosts'),
    (N'RPM-', N'RPMINT', N'Prefix', 10, N'RPM-'),
    (N'RPMWINRM', N'RPMINT', N'Prefix', 8, N'Central'),
    (N'RPMPET', N'RPMINT', N'Prefix', 8, N'rpmpet'),
    (N'rpmresources', N'RPMINT', N'Contains', 18, N'FQDN'),
    (N'LUKERPM', N'RPMINT', N'Prefix', 8, N'staff'),
    -- Able
    (N'ABLE', N'ABLE', N'Prefix', 10, N'Able'),
    (N'AT-', N'ABLE', N'Prefix', 15, N'AT-SERVER style'),
    (N'ATSERVER', N'ABLE', N'Contains', 20, N'AT server'),
    -- RSS
    (N'RSS', N'RSS', N'Prefix', 12, N'RSS'),
    (N'RSS-', N'RSS', N'Prefix', 10, N'RSS-'),
    (N'REMOTE SITE', N'RSS', N'Contains', 25, N'Remote Site'),
    -- BHF / PCNS
    (N'PCNS', N'BHF', N'Prefix', 10, N'PCNS'),
    (N'BHF', N'BHF', N'Prefix', 15, N'BHF'),
    (N'HEALTHCARE', N'BHF', N'Contains', 30, N'Board of Healthcare'),
    -- SBS
    (N'SBS', N'SBS', N'Prefix', 12, N'SBS'),
    (N'SBS-', N'SBS', N'Prefix', 10, N'SBS-'),
    (N'SIMPLY', N'SBS', N'Contains', 20, N'Simply Bright'),
    -- Metsi
    (N'METSI', N'METSI', N'Prefix', 10, N'Metsi'),
    -- Others commonly on master
    (N'MEDIPOS', N'MEDIPOS', N'Prefix', 10, N'MEDiPOS'),
    (N'INTERBRAND', N'IB', N'Contains', 15, N'Interbrand'),
    (N'VAULT', N'VAULT', N'Prefix', 12, N'Vault'),
    (N'YLJ', N'YLJ', N'Prefix', 10, N'YLJ'),
    (N'SIRFRUIT', N'SIR', N'Contains', 15, N'Sir Fruit alias if used'),
    (N'SIR-FRUIT', N'SIR', N'Contains', 15, N'Sir Fruit')
  ) AS s(Pattern, CustomerCode, MatchType, Priority, Notes)
  ON t.Pattern = s.Pattern AND t.CustomerCode = s.CustomerCode
  WHEN MATCHED THEN UPDATE SET
    MatchType = s.MatchType, Priority = s.Priority, Notes = s.Notes,
    Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (Pattern, CustomerCode, MatchType, Priority, Notes, Active)
    VALUES (s.Pattern, s.CustomerCode, s.MatchType, s.Priority, s.Notes, 1);

  -- Auto-seed Prefix patterns from Dim_Customer.CustomerCode (every active code)
  IF OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NOT NULL
  BEGIN
    INSERT INTO dbo.Dim_Bitdefender_NameMap (Pattern, CustomerCode, MatchType, Priority, Notes, Active)
    SELECT c.CustomerCode, c.CustomerCode, N'Prefix', 40,
           N'Auto from Dim_Customer', 1
    FROM dbo.Dim_Customer AS c
    WHERE c.Active = 1
      AND LEN(LTRIM(RTRIM(c.CustomerCode))) >= 2
      AND NOT EXISTS (
        SELECT 1 FROM dbo.Dim_Bitdefender_NameMap m
        WHERE m.Pattern = c.CustomerCode AND m.CustomerCode = c.CustomerCode
      );
    PRINT N'Auto-seeded Dim_Customer codes into name map';
  END
  PRINT N'Name map expanded';
END
GO

-- Re-stamp ALL latest endpoints (including already-mapped) using best priority match
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
  ),
  ranked AS (
    SELECT c.SnapshotDate, c.EndpointId, m.CustomerCode AS NewCode,
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
  SET CustomerCode = r.NewCode
  FROM dbo.Bitdefender_Endpoints AS e
  INNER JOIN ranked AS r
    ON r.SnapshotDate = e.SnapshotDate AND r.EndpointId = e.EndpointId AND r.rn = 1
  WHERE ISNULL(e.CustomerCode, N'') <> r.NewCode
     OR e.CustomerCode IS NULL;
  PRINT N'Re-stamped endpoints from expanded name map';
END
GO

-- Incidents table
IF OBJECT_ID(N'dbo.Bitdefender_Incidents', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_Incidents (
    SnapshotDate     date           NOT NULL,
    IncidentId       nvarchar(80)   NOT NULL,
    CustomerCode     nvarchar(50)   NULL,
    EndpointId       nvarchar(40)   NULL,
    DeviceName       nvarchar(200)  NULL,
    Severity         nvarchar(40)   NULL,
    Status           nvarchar(40)   NULL,
    IncidentType     nvarchar(100)  NULL,
    Summary          nvarchar(500)  NULL,
    DetectedAt       datetime2(3)   NULL,
    RawJson          nvarchar(max)  NULL,
    ImportedAt       datetime2(3)   NOT NULL CONSTRAINT DF_BdInc_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_Incidents PRIMARY KEY (SnapshotDate, IncidentId)
  );
  CREATE INDEX IX_BdInc_Code ON dbo.Bitdefender_Incidents (CustomerCode, SnapshotDate);
  PRINT N'Bitdefender_Incidents created';
END
GO

-- Quarantine table
IF OBJECT_ID(N'dbo.Bitdefender_Quarantine', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_Quarantine (
    SnapshotDate     date           NOT NULL,
    ItemId           nvarchar(80)   NOT NULL,
    CustomerCode     nvarchar(50)   NULL,
    EndpointId       nvarchar(40)   NULL,
    DeviceName       nvarchar(200)  NULL,
    ThreatName       nvarchar(200)  NULL,
    FilePath         nvarchar(500)  NULL,
    Status           nvarchar(40)   NULL,
    QuarantinedAt    datetime2(3)   NULL,
    RawJson          nvarchar(max)  NULL,
    ImportedAt       datetime2(3)   NOT NULL CONSTRAINT DF_BdQuar_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_Quarantine PRIMARY KEY (SnapshotDate, ItemId)
  );
  CREATE INDEX IX_BdQuar_Code ON dbo.Bitdefender_Quarantine (CustomerCode, SnapshotDate);
  PRINT N'Bitdefender_Quarantine created';
END
GO

-- Collect status (API capability flags)
IF OBJECT_ID(N'dbo.Bitdefender_CollectStatus', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_CollectStatus (
    SnapshotDate        date          NOT NULL,
    EndpointsTotal      int           NULL,
    EndpointsMapped     int           NULL,
    EndpointsUnmapped   int           NULL,
    IncidentsOk         bit           NULL,
    IncidentsCount      int           NULL,
    QuarantineOk        bit           NULL,
    QuarantineCount     int           NULL,
    IncidentsMessage    nvarchar(400) NULL,
    QuarantineMessage   nvarchar(400) NULL,
    ImportedAt          datetime2(3)  NOT NULL CONSTRAINT DF_BdStat_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_CollectStatus PRIMARY KEY (SnapshotDate)
  );
  PRINT N'Bitdefender_CollectStatus created';
END
GO

-- PillarBitdefender on for mapped customers
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NOT NULL
BEGIN
  UPDATE a
  SET PillarBitdefender = 1,
      UpdatedAt = SYSUTCDATETIME(),
      UpdatedBy = N'452_Epp_Expand'
  FROM dbo.Dim_Customer_AmsConfig AS a
  WHERE EXISTS (
    SELECT 1 FROM dbo.Bitdefender_Endpoints e WITH (NOLOCK)
    WHERE UPPER(LTRIM(RTRIM(e.CustomerCode))) = UPPER(LTRIM(RTRIM(a.CustomerCode)))
  )
  AND ISNULL(a.PillarBitdefender, 0) = 0;
  PRINT N'PillarBitdefender set for mapped customers';
END
GO

-- Grants
DECLARE @principals TABLE (name sysname);
INSERT INTO @principals(name) VALUES (N'Rpm_collect'), (N'Rpm_app'), (N'rpm_app'), (N'rpmassure');
DECLARE @p sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM @principals;
OPEN c; FETCH NEXT FROM c INTO @p;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @p)
  BEGIN
    BEGIN TRY
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_Endpoints TO ' + QUOTENAME(@p); EXEC sp_executesql @sql;
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_LicenseSnapshot TO ' + QUOTENAME(@p); EXEC sp_executesql @sql;
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Dim_Bitdefender_NameMap TO ' + QUOTENAME(@p); EXEC sp_executesql @sql;
      IF OBJECT_ID(N'dbo.Bitdefender_Incidents', N'U') IS NOT NULL
        BEGIN SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_Incidents TO ' + QUOTENAME(@p); EXEC sp_executesql @sql; END
      IF OBJECT_ID(N'dbo.Bitdefender_Quarantine', N'U') IS NOT NULL
        BEGIN SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_Quarantine TO ' + QUOTENAME(@p); EXEC sp_executesql @sql; END
      IF OBJECT_ID(N'dbo.Bitdefender_CollectStatus', N'U') IS NOT NULL
        BEGIN SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_CollectStatus TO ' + QUOTENAME(@p); EXEC sp_executesql @sql; END
      IF OBJECT_ID(N'dbo.vw_Kpi_Epp_Summary', N'V') IS NOT NULL
        BEGIN SET @sql = N'GRANT SELECT ON OBJECT::dbo.vw_Kpi_Epp_Summary TO ' + QUOTENAME(@p); EXEC sp_executesql @sql; END
      IF OBJECT_ID(N'dbo.vw_Bitdefender_Unmapped_Latest', N'V') IS NOT NULL
        BEGIN SET @sql = N'GRANT SELECT ON OBJECT::dbo.vw_Bitdefender_Unmapped_Latest TO ' + QUOTENAME(@p); EXEC sp_executesql @sql; END
      PRINT N'Granted ' + @p;
    END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
  END
  FETCH NEXT FROM c INTO @p;
END
CLOSE c; DEALLOCATE c;
GO

PRINT N'=== EPP mapped counts (latest) ===';
SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
GROUP BY CustomerCode
ORDER BY CustomerCode;

PRINT N'=== Still unmapped (latest) ===';
SELECT TOP 40 DeviceName, Fqdn, IpAddress
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
ORDER BY DeviceName;
GO
