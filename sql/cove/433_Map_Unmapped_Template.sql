/*
  Map unmapped Cove partners -> CustomerCode
  1) Review:
     SELECT * FROM dbo.vw_Cove_UnmappedPartners ORDER BY DeviceCount DESC;
  2) Edit the VALUES list below, then run.
  3) Re-run Cove collect OR re-stamp CustomerCode on today's rows (optional UPDATE below).
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

;WITH src AS (
  SELECT * FROM (VALUES
    -- (PartnerName exactly as Cove AR, CustomerCode, PartnerId optional)
    -- (N'Some Partner Name', N'CUSCODE', NULL)
    (N'__EXAMPLE_REMOVE_ME__', N'XXXX', NULL)
  ) v(PartnerName, CustomerCode, PartnerId)
  WHERE PartnerName <> N'__EXAMPLE_REMOVE_ME__'
)
MERGE dbo.Dim_Cove_PartnerMap AS t
USING src AS s ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  PartnerId = COALESCE(s.PartnerId, t.PartnerId),
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active)
  VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1);

/* Re-apply map to latest snapshot rows (no API re-call needed) */
UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Cove_DeviceStatistics AS d
INNER JOIN dbo.Dim_Cove_PartnerMap AS m
  ON m.Active = 1 AND m.PartnerName = d.Product  -- collect stores partner name in Product
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics)
  AND (d.CustomerCode IS NULL OR d.CustomerCode <> m.CustomerCode);

/* Also match PartnerName if column exists as Product only — Product holds AR name */
PRINT 'Map applied. Unmapped remaining:';
SELECT PartnerName, DeviceCount FROM dbo.vw_Cove_UnmappedPartners ORDER BY 2 DESC;
GO
