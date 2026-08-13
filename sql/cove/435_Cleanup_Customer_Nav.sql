/*
  Keep top-nav / portfolio on managed SYSPRO customers.
  Review then optionally deactivate shells with no SQL instance and no operators.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

PRINT '=== Active customers (all) ===';
SELECT CustomerCode, DisplayName, SqlInstanceName, Active
FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE Active = 1
ORDER BY DisplayName;

PRINT '=== Will STAY in nav (managed: has SqlInstanceName) ===';
SELECT CustomerCode, DisplayName, SqlInstanceName
FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE Active = 1
  AND NULLIF(LTRIM(RTRIM(SqlInstanceName)), N'') IS NOT NULL
ORDER BY DisplayName;

PRINT '=== Hidden from nav after UI filter (no SqlInstanceName) ===';
SELECT CustomerCode, DisplayName, SqlInstanceName
FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE Active = 1
  AND NULLIF(LTRIM(RTRIM(SqlInstanceName)), N'') IS NULL
ORDER BY DisplayName;

PRINT '=== Cove partners mapped to non-managed customers (review) ===';
SELECT m.PartnerName, m.CustomerCode, c.DisplayName, c.SqlInstanceName
FROM dbo.Dim_Cove_PartnerMap AS m WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer AS c WITH (NOLOCK) ON c.CustomerCode = m.CustomerCode
WHERE m.Active = 1
  AND (
    c.CustomerCode IS NULL
    OR NULLIF(LTRIM(RTRIM(c.SqlInstanceName)), N'') IS NULL
  )
ORDER BY m.PartnerName;

/*
-- OPTIONAL: deactivate empty shells (UNCOMMENT after review)
UPDATE dbo.Dim_Customer
SET Active = 0, UpdatedAt = SYSUTCDATETIME()
WHERE Active = 1
  AND NULLIF(LTRIM(RTRIM(SqlInstanceName)), N'') IS NULL
  AND CustomerCode NOT IN (N'AHIC', N'UVSS');  -- keep any codes you still want
*/

PRINT 'Done. UI filter hides rows without SqlInstanceName even if Active=1.';
GO
