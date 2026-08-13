/*
  453 - Map unmapped personal/staff Bitdefender endpoints to RPMINT
  Run as admin (sqlcmd -E).
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

-- Explicit host → RPMINT for current unmapped person-named devices
IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Bitdefender_NameMap AS t
  USING (VALUES
    (N'ADELE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'ANTON', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'BATMAN', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'CARLA', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'CLARE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'DELLPRE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'DESKTOP-K5BHVOB', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'DOUGLAS', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'HENNIE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'JAGGER', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'JANINE', N'RPMINT', N'Prefix', 5, N'staff'),
    (N'KIRK', N'RPMINT', N'Prefix', 5, N'staff Kirk'),
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
    (N'VTSERVER', N'RPMINT', N'Prefix', 5, N'RPM VTSERVER 102.213.5.10'),
    (N'WENDY', N'RPMINT', N'Prefix', 5, N'staff')
  ) AS s(Pattern, CustomerCode, MatchType, Priority, Notes)
  ON t.Pattern = s.Pattern AND t.CustomerCode = s.CustomerCode
  WHEN MATCHED THEN UPDATE SET
    MatchType = s.MatchType, Priority = s.Priority, Notes = s.Notes,
    Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (Pattern, CustomerCode, MatchType, Priority, Notes, Active)
    VALUES (s.Pattern, s.CustomerCode, s.MatchType, s.Priority, s.Notes, 1);
  PRINT N'Staff host patterns added → RPMINT';
END
GO

-- Re-stamp unmapped on latest snapshot
IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
BEGIN
  ;WITH latest AS (
    SELECT MAX(SnapshotDate) AS mx FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
  ),
  candidates AS (
    SELECT e.SnapshotDate, e.EndpointId, e.DeviceName, e.Fqdn
    FROM dbo.Bitdefender_Endpoints AS e
    CROSS JOIN latest
    WHERE e.SnapshotDate = latest.mx
      AND (e.CustomerCode IS NULL OR LTRIM(RTRIM(e.CustomerCode)) = N'')
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
      ))
      OR (m.MatchType = N'Contains' AND (
        UPPER(ISNULL(c.DeviceName,N'') + N' ' + ISNULL(c.Fqdn,N'')) LIKE N'%' + UPPER(m.Pattern) + N'%'
      ))
  )
  UPDATE e
  SET CustomerCode = r.NewCode
  FROM dbo.Bitdefender_Endpoints AS e
  INNER JOIN ranked AS r
    ON r.SnapshotDate = e.SnapshotDate AND r.EndpointId = e.EndpointId AND r.rn = 1;
  PRINT N'Re-stamped previously unmapped endpoints';
END
GO

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NOT NULL
BEGIN
  UPDATE dbo.Dim_Customer_AmsConfig
  SET PillarBitdefender = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'453_staff_map'
  WHERE CustomerCode = N'RPMINT' AND ISNULL(PillarBitdefender, 0) = 0;
END
GO

PRINT N'=== Mapped after 453 ===';
SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
GROUP BY CustomerCode
ORDER BY CustomerCode;

PRINT N'=== Still unmapped ===';
SELECT DeviceName, Fqdn, IpAddress
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
ORDER BY DeviceName;
GO
