/*
  Fix blockers then continue 004 + 005
  Run on: rpmwinrm\RPMREPORTS / RPMAssure
*/
USE [RPMAssure];
GO
SET NOCOUNT ON;

PRINT '=== 1) Dim_Customer key check ===';
-- Duplicate CustomerCodes?
SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Dim_Customer
GROUP BY CustomerCode
HAVING COUNT(*) > 1;

-- Existing PK/unique on CustomerCode?
SELECT i.name, i.is_primary_key, i.is_unique
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = i.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID(N'dbo.Dim_Customer') AND c.name = N'CustomerCode';
GO

-- Add UNIQUE if missing (required for Fact_* FKs)
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = i.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'dbo.Dim_Customer')
      AND c.name = N'CustomerCode'
      AND (i.is_unique = 1 OR i.is_primary_key = 1)
      AND i.has_filter = 0
)
BEGIN
    PRINT 'Adding UX_Dim_Customer_CustomerCode...';
    ALTER TABLE dbo.Dim_Customer
        ADD CONSTRAINT UX_Dim_Customer_CustomerCode UNIQUE (CustomerCode);
    PRINT 'Unique constraint added.';
END
ELSE
    PRINT 'CustomerCode already unique/PK — OK.';
GO

PRINT '=== 2) What Fact/App objects exist ===';
SELECT name, type_desc FROM sys.objects
WHERE name LIKE 'Fact_%' OR name LIKE 'App_%' OR name IN ('Dim_SlaPolicy', 'Dim_DtrBalanceType')
   OR name LIKE 'vw_Kpi_%' OR name LIKE 'vw_Datarapt%'
ORDER BY type_desc, name;
GO

PRINT '=== 3) Done pre-fix — now re-run 004 then 005 ===';
GO
