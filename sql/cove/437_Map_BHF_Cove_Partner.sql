/*
  437 - Map Board of Healthcare Funders + re-stamp Cove CustomerCode
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

/* Prefer customer code BHF if present, else PCNS (legacy map) */
DECLARE @BhfCode nvarchar(50) =
  CASE
    WHEN EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'BHF') THEN N'BHF'
    WHEN EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'PCNS') THEN N'PCNS'
    ELSE N'BHF'
  END;

PRINT N'Target CustomerCode for Board of Healthcare Funders = ' + @BhfCode;

/* Alias table if used by auto-map */
IF OBJECT_ID(N'dbo.Dim_Cove_PartnerAlias', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.Dim_Cove_PartnerAlias
    WHERE LTRIM(RTRIM(PartnerName)) IN (
      N'Board of Healthcare Funders',
      N'Board of Health Care Funders',
      N'BHF Global',
      N'BHF'
    )
  )
  BEGIN
    INSERT INTO dbo.Dim_Cove_PartnerAlias (PartnerName, CustomerCode, Notes)
    VALUES
      (N'Board of Healthcare Funders', @BhfCode, N'Cove Product name'),
      (N'BHF Global', @BhfCode, N'alias'),
      (N'BHF', @BhfCode, N'alias short');
    PRINT N'Aliases inserted';
  END
  ELSE
    PRINT N'Aliases already present';
END
ELSE
  PRINT N'Dim_Cove_PartnerAlias missing - map only';

/* Partner map */
MERGE dbo.Dim_Cove_PartnerMap AS t
USING (
  SELECT N'Board of Healthcare Funders' AS PartnerName, @BhfCode AS CustomerCode, CAST(NULL AS int) AS PartnerId
  UNION ALL SELECT N'BHF Global', @BhfCode, NULL
  UNION ALL SELECT N'BHF', @BhfCode, NULL
) AS s
ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  Active = 1,
  Notes = ISNULL(t.Notes, N'BHF Cove map')
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active, Notes)
  VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1, N'BHF Cove map');
PRINT N'Partner map upserted for BHF names';

/* Re-stamp devices from map (Product = partner name) */
UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Cove_DeviceStatistics AS d
INNER JOIN dbo.Dim_Cove_PartnerMap AS m
  ON m.Active = 1
 AND LTRIM(RTRIM(m.PartnerName)) = LTRIM(RTRIM(ISNULL(d.Product, N'')))
WHERE d.CustomerCode IS NULL
   OR LTRIM(RTRIM(d.CustomerCode)) = N''
   OR d.CustomerCode <> m.CustomerCode;
PRINT N'Re-stamped rows: ' + CAST(@@ROWCOUNT AS nvarchar(20));

/* Report */
SELECT ISNULL(CustomerCode, N'(null)') AS CustomerCode,
       ISNULL(Product, N'(null)') AS Product,
       COUNT(*) AS DeviceRows,
       MAX(SnapshotDate) AS MaxSnap
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
GROUP BY CustomerCode, Product
ORDER BY CustomerCode, Product;

SELECT COUNT(*) AS TotalRows,
  SUM(CASE WHEN CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode))=N'' THEN 1 ELSE 0 END) AS UnmappedRows
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK));
GO
