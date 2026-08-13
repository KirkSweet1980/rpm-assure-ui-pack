/*
  List Pulseway org names from latest devices + map helpers.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

PRINT '=== Latest device org names ===';
SELECT
  ISNULL(NULLIF(LTRIM(RTRIM(OrganizationName)), N''), N'(blank)') AS OrganizationName,
  OrganizationId,
  COUNT(*) AS Devices,
  SUM(CASE WHEN CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode))=N'' THEN 1 ELSE 0 END) AS Unmapped
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
GROUP BY OrganizationName, OrganizationId
ORDER BY Devices DESC;

PRINT '=== Managed customers (valid map targets) ===';
SELECT CustomerCode, DisplayName, SqlInstanceName
FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE Active = 1 AND NULLIF(LTRIM(RTRIM(SqlInstanceName)), N'') IS NOT NULL
ORDER BY DisplayName;

PRINT '=== Current map ===';
SELECT * FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK) ORDER BY OrganizationName;

/*
-- EXAMPLE: map an org after you see the exact name above
MERGE dbo.Dim_Pulseway_OrgAlias AS t
USING (SELECT N'Exact Org Name From List' AS OrganizationName, N'AHIC' AS CustomerCode) s
  ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
  VALUES (s.OrganizationName, s.CustomerCode, 1, N'manual');

-- then re-stamp + summary:
-- powershell Collect-Pulseway-To-RPMAssure.ps1
-- or run 441_AutoMap_Pulseway_Orgs.sql
*/
GO
