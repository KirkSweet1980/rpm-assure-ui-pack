/* Map Freshdesk company names (including BHF aliases) then restamp tickets.
   Safe to re-run. Does not invent customers. */
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Dim_Freshdesk_CompanyMap', N'U') IS NULL
BEGIN
  PRINT '514 skip - Dim_Freshdesk_CompanyMap missing';
  RETURN;
END
GO

;WITH src AS (
  SELECT * FROM (VALUES
    (CONVERT(bigint, 48006116932), N'Board of Healthcare Funders', N'BHF'),
    (CAST(NULL AS bigint), N'Board of Healthcare Funders (Pty) Ltd', N'BHF'),
    (CAST(NULL AS bigint), N'BHF', N'BHF'),
    (CAST(NULL AS bigint), N'BHF Global', N'BHF'),
    (CAST(NULL AS bigint), N'BHF (PNCS)', N'BHF'),
    (CAST(NULL AS bigint), N'BHF (PCNS)', N'BHF'),
    (CAST(NULL AS bigint), N'PNCS', N'BHF'),
    (CAST(NULL AS bigint), N'PCNS', N'BHF'),
    (CAST(NULL AS bigint), N'Board of Healthcare Funders of Southern Africa', N'BHF'),
    (CAST(NULL AS bigint), N'AHI Carrier', N'AHIC'),
    (CAST(NULL AS bigint), N'AHI Carriers', N'AHIC'),
    (CAST(NULL AS bigint), N'AHIC', N'AHIC')
  ) v(CompanyId, CompanyName, CustomerCode)
)
MERGE dbo.Dim_Freshdesk_CompanyMap AS t
USING (
  SELECT s.CompanyId, s.CompanyName, s.CustomerCode
  FROM src s
  INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = s.CustomerCode AND c.Active = 1
) AS s
ON t.CompanyName = s.CompanyName
WHEN MATCHED THEN UPDATE SET
  t.CustomerCode = s.CustomerCode,
  t.CompanyId = COALESCE(s.CompanyId, t.CompanyId),
  t.Active = 1
WHEN NOT MATCHED THEN INSERT (CompanyId, CompanyName, CustomerCode, Notes, Active)
  VALUES (s.CompanyId, s.CompanyName, s.CustomerCode, N'514 alias', 1);

/* Auto-map any ticket company name we have not seen, using tokens only. */
INSERT INTO dbo.Dim_Freshdesk_CompanyMap (CompanyId, CompanyName, CustomerCode, Notes, Active)
SELECT DISTINCT t.CompanyId, LTRIM(RTRIM(t.CompanyName)), x.CustomerCode, N'514 fuzzy ticket name', 1
FROM dbo.Freshdesk_Tickets t
CROSS APPLY (
  SELECT CASE
    WHEN t.CompanyName LIKE N'%BHF%' OR t.CompanyName LIKE N'%Healthcare Funder%'
      OR t.CompanyName LIKE N'%PNCS%' OR t.CompanyName LIKE N'%PCNS%' THEN N'BHF'
    WHEN t.CompanyName LIKE N'%AHI Carrier%' OR t.CompanyName LIKE N'AHIC%' THEN N'AHIC'
    WHEN t.CompanyName LIKE N'%Hydra%' THEN N'HYDRA'
    WHEN t.CompanyName LIKE N'%Redsun%' THEN N'RSR'
    WHEN t.CompanyName LIKE N'%Remote Site%' THEN N'RSS'
    WHEN t.CompanyName LIKE N'%UVSS%' OR t.CompanyName LIKE N'%Unique Ventil%' THEN N'UVSS'
    WHEN t.CompanyName LIKE N'%Sir Fruit%' THEN N'SIRF'
    WHEN t.CompanyName LIKE N'%Able Tracer%' THEN N'ABLE'
    WHEN t.CompanyName LIKE N'%Metsi%' THEN N'METSI'
    WHEN t.CompanyName LIKE N'%YLJ%' THEN N'YLJ'
    WHEN t.CompanyName LIKE N'%Vault%' THEN N'VAULT'
    WHEN t.CompanyName LIKE N'%SBS Tank%' THEN N'SBT'
    WHEN t.CompanyName LIKE N'%Simply Bright%' THEN N'SBS'
    WHEN t.CompanyName LIKE N'%Medipos%' OR t.CompanyName LIKE N'%MEDiPOS%' THEN N'MEDIPOS'
    WHEN t.CompanyName LIKE N'%Interbrand%' THEN N'IB'
    WHEN t.CompanyName LIKE N'%RPM Resource%' THEN N'RPMINT'
    ELSE NULL
  END AS CustomerCode
) x
WHERE t.CompanyName IS NOT NULL
  AND LTRIM(RTRIM(t.CompanyName)) <> N''
  AND x.CustomerCode IS NOT NULL
  AND EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = x.CustomerCode AND c.Active = 1)
  AND NOT EXISTS (
    SELECT 1 FROM dbo.Dim_Freshdesk_CompanyMap m
    WHERE LTRIM(RTRIM(m.CompanyName)) = LTRIM(RTRIM(t.CompanyName))
  );

UPDATE t SET t.CustomerCode = m.CustomerCode
FROM dbo.Freshdesk_Tickets t
JOIN dbo.Dim_Freshdesk_CompanyMap m ON m.Active = 1
 AND (
      (t.CompanyId IS NOT NULL AND m.CompanyId IS NOT NULL AND t.CompanyId = m.CompanyId)
   OR LTRIM(RTRIM(ISNULL(t.CompanyName,N''))) = LTRIM(RTRIM(m.CompanyName))
 )
WHERE t.CustomerCode IS NULL OR t.CustomerCode <> m.CustomerCode;

PRINT '514 company map + ticket restamp done';

SELECT CompanyName, CustomerCode, CompanyId, Active
FROM dbo.Dim_Freshdesk_CompanyMap
WHERE CustomerCode = N'BHF' OR CompanyName LIKE N'%BHF%' OR CompanyName LIKE N'%PCNS%' OR CompanyName LIKE N'%PNCS%'
ORDER BY CompanyName;

SELECT ISNULL(CustomerCode, N'(unmapped)') AS CustomerCode, COUNT(*) AS Tickets
FROM dbo.Freshdesk_Tickets
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Freshdesk_Tickets)
GROUP BY CustomerCode
ORDER BY Tickets DESC;

PRINT '=== Unmapped company ids / names (latest snap) ===';
SELECT TOP 25
  ISNULL(CONVERT(nvarchar(30), CompanyId), N'(none)') AS CompanyId,
  ISNULL(NULLIF(LTRIM(RTRIM(CompanyName)), N''), N'(blank)') AS CompanyName,
  COUNT(*) AS Tickets
FROM dbo.Freshdesk_Tickets
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Freshdesk_Tickets)
  AND CustomerCode IS NULL
GROUP BY CompanyId, CompanyName
ORDER BY Tickets DESC;
GO
