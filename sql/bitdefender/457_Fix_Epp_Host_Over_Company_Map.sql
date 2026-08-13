/*
  457 - EPP mapping hygiene for ALL customers
  - Force known infra hosts (VTSERVER, staff) to RPMINT
  - Prefer hostname NameMap over stale CustomerCode
  - Prefix match = true prefix only (not mid-string Contains)
  - Audit latest snap by customer + flag suspicious rows
  Run: sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 457_...
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

-- 1) High-confidence host overrides
IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Bitdefender_NameMap AS t
  USING (VALUES
    -- Infra / RPM Internal (priority 1 = wins everything)
    (N'VTSERVER', N'RPMINT', N'Exact', 1, N'RPM VTSERVER - never customer estate'),
    (N'VTSERVER-', N'RPMINT', N'Prefix', 1, N'VTSERVER with MAC suffix'),
    (N'RPMWINRM', N'RPMINT', N'Prefix', 2, N'central'),
    (N'RPMPET', N'RPMINT', N'Prefix', 2, N'rpmpet'),
    (N'RPM-PROD', N'RPMINT', N'Prefix', 2, N'rpm prod'),
    (N'RPM-DEV', N'RPMINT', N'Prefix', 2, N'rpm dev'),
    (N'RPM-FIN', N'RPMINT', N'Prefix', 2, N'rpm fin'),
    (N'102-213-5', N'RPMINT', N'Contains', 5, N'RPM public IP host style'),
    -- Staff (from 453, keep pri 5)
    (N'ADELE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'ANTON', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'BATMAN', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'CARLA', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'CLARE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'DELLPRE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'DOUGLAS', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'HENNIE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'JAGGER', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'JANINE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'KIRK', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'LAPTOP-IUK5DRCA', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'LENSFFM', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'MARIA', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'NADIA', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'NATASHA', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'NICKY', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'RHLENOVO', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'RYNOG', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'RYNO', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'THABI', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'WENDY', N'RPMINT', N'Prefix', 5, N'staff'),
    -- Customer-safe prefixes (tight)
    (N'RSR-', N'RSR', N'Prefix', 8, N'Redsun host prefix only'),
    (N'REDSUN', N'RSR', N'Contains', 20, N'Redsun name'),
    (N'AHIC', N'AHIC', N'Prefix', 8, N'AHI'),
    (N'AHI-', N'AHIC', N'Prefix', 8, N'AHI-'),
    (N'HYDRASRV', N'HYDRA', N'Prefix', 6, N'Hydra server'),
    (N'HYDRA', N'HYDRA', N'Prefix', 10, N'Hydra'),
    (N'UVSS', N'UVSS', N'Prefix', 8, N'UVSS'),
    (N'RSS-', N'RSS', N'Prefix', 8, N'RSS-'),
    (N'RSSPROD', N'RSS', N'Prefix', 8, N'RSS prod'),
    (N'PCNS', N'BHF', N'Prefix', 8, N'BHF/PCNS'),
    (N'SBS-', N'SBS', N'Prefix', 8, N'SBS'),
    (N'ABLE', N'ABLE', N'Prefix', 10, N'Able'),
    (N'AT-', N'ABLE', N'Prefix', 8, N'AT-'),
    (N'ATSERVER', N'ABLE', N'Prefix', 6, N'ATSERVER only as prefix not mid-string'),
    (N'METSI', N'METSI', N'Prefix', 8, N'Metsi'),
    (N'YLJ', N'YLJ', N'Prefix', 8, N'YLJ')
  ) AS s(Pattern, CustomerCode, MatchType, Priority, Notes)
  ON t.Pattern = s.Pattern AND t.CustomerCode = s.CustomerCode
  WHEN MATCHED THEN UPDATE SET
    MatchType = s.MatchType, Priority = s.Priority, Notes = s.Notes,
    Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (Pattern, CustomerCode, MatchType, Priority, Notes, Active)
    VALUES (s.Pattern, s.CustomerCode, s.MatchType, s.Priority, s.Notes, 1);

  -- Deactivate dangerous mid-string patterns
  -- RSR as bare Prefix was OK with true prefix; keep it but lower risk by requiring RSR- when possible
  -- Deactivate ATSERVER Contains if present (matched mid-host incorrectly in old restamp)
  UPDATE dbo.Dim_Bitdefender_NameMap
  SET Active = 0, Notes = ISNULL(Notes,N'') + N' [disabled 457]', UpdatedAtUtc = SYSUTCDATETIME()
  WHERE Active = 1
    AND (
      (Pattern = N'ATSERVER' AND MatchType = N'Contains')
      OR (Pattern = N'SERVER' AND LEN(Pattern) <= 6)
      OR (LEN(Pattern) <= 2 AND MatchType <> N'Exact')
    );

  -- Bare RSR Prefix: keep but note; re-stamp uses true prefix only
  PRINT N'Name map overrides ready';
END
GO

-- 2) Re-stamp ALL latest endpoints with true Prefix (no mid-string)
IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NOT NULL
BEGIN
  ;WITH latest AS (
    SELECT MAX(SnapshotDate) AS mx FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
  ),
  candidates AS (
    SELECT e.SnapshotDate, e.EndpointId, e.DeviceName, e.Fqdn, e.CustomerCode, e.CompanyName
    FROM dbo.Bitdefender_Endpoints AS e
    CROSS JOIN latest
    WHERE e.SnapshotDate = latest.mx
  ),
  ranked AS (
    SELECT
      c.SnapshotDate,
      c.EndpointId,
      m.CustomerCode AS NewCode,
      m.Pattern,
      m.Priority,
      ROW_NUMBER() OVER (
        PARTITION BY c.SnapshotDate, c.EndpointId
        ORDER BY m.Priority ASC, LEN(m.Pattern) DESC
      ) AS rn
    FROM candidates AS c
    INNER JOIN dbo.Dim_Bitdefender_NameMap AS m ON m.Active = 1
    WHERE
      (m.MatchType = N'Exact' AND (
        UPPER(LTRIM(RTRIM(ISNULL(c.DeviceName,N'')))) = UPPER(m.Pattern)
        OR UPPER(LTRIM(RTRIM(ISNULL(c.Fqdn,N'')))) = UPPER(m.Pattern)
        OR UPPER(LTRIM(RTRIM(ISNULL(c.DeviceName,N'')))) LIKE UPPER(m.Pattern) + N'-[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'
      ))
      OR (m.MatchType = N'Prefix' AND (
        UPPER(ISNULL(c.DeviceName,N'')) LIKE UPPER(m.Pattern) + N'%'
        OR UPPER(ISNULL(c.Fqdn,N'')) LIKE UPPER(m.Pattern) + N'%'
      ))
      OR (m.MatchType = N'Contains' AND LEN(m.Pattern) >= 4 AND (
        UPPER(ISNULL(c.DeviceName,N'') + N' ' + ISNULL(c.Fqdn,N'')) LIKE N'%' + UPPER(m.Pattern) + N'%'
      ))
  )
  UPDATE e
  SET CustomerCode = r.NewCode
  FROM dbo.Bitdefender_Endpoints AS e
  INNER JOIN ranked AS r
    ON r.SnapshotDate = e.SnapshotDate
   AND r.EndpointId = e.EndpointId
   AND r.rn = 1
  WHERE ISNULL(e.CustomerCode, N'') <> r.NewCode
     OR e.CustomerCode IS NULL;

  PRINT N'Re-stamped latest endpoints (hostname NameMap wins)';
END
GO

-- 3) Force VTSERVER (and MAC-suffix) to RPMINT regardless
IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
BEGIN
  UPDATE e
  SET CustomerCode = N'RPMINT'
  FROM dbo.Bitdefender_Endpoints AS e
  WHERE e.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
    AND (
      UPPER(ISNULL(e.DeviceName,N'')) = N'VTSERVER'
      OR UPPER(ISNULL(e.DeviceName,N'')) LIKE N'VTSERVER-%'
      OR UPPER(ISNULL(e.Fqdn,N'')) LIKE N'VTSERVER%'
    )
    AND ISNULL(e.CustomerCode, N'') <> N'RPMINT';
  PRINT N'Forced VTSERVER* -> RPMINT';
END
GO

-- 4) Cover flag for customers with endpoints
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NOT NULL
BEGIN
  UPDATE a
  SET PillarBitdefender = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'457_epp_map'
  FROM dbo.Dim_Customer_AmsConfig AS a
  WHERE EXISTS (
    SELECT 1 FROM dbo.Bitdefender_Endpoints e WITH (NOLOCK)
    WHERE e.CustomerCode = a.CustomerCode
      AND e.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  )
  AND ISNULL(a.PillarBitdefender, 0) = 0;
END
GO

PRINT N'=== EPP counts by customer (latest) ===';
SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
GROUP BY CustomerCode
ORDER BY CustomerCode;

PRINT N'=== VTSERVER rows (must be RPMINT) ===';
SELECT DeviceName, Fqdn, IpAddress, CustomerCode, CompanyName
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND (
    UPPER(ISNULL(DeviceName,N'')) LIKE N'VTSERVER%'
    OR UPPER(ISNULL(Fqdn,N'')) LIKE N'VTSERVER%'
  );

PRINT N'=== RSR devices (review - no VTSERVER) ===';
SELECT DeviceName, Fqdn, IpAddress, CustomerCode, CompanyName
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CustomerCode = N'RSR'
ORDER BY DeviceName;

PRINT N'=== Suspicious: RSR code but host does not look like Redsun ===';
SELECT DeviceName, Fqdn, IpAddress, CustomerCode, CompanyName
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CustomerCode = N'RSR'
  AND UPPER(ISNULL(DeviceName,N'') + N' ' + ISNULL(Fqdn,N'')) NOT LIKE N'%RSR%'
  AND UPPER(ISNULL(DeviceName,N'') + N' ' + ISNULL(Fqdn,N'')) NOT LIKE N'%REDSUN%';

PRINT N'=== Still unmapped ===';
SELECT DeviceName, Fqdn, IpAddress, CompanyName
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
ORDER BY DeviceName;
GO
