USE [RPMAssure];
GO
SET NOCOUNT ON;

SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName;

IF OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NULL
BEGIN
    RAISERROR('Dim_Customer missing — stop.', 16, 1);
    RETURN;
END

SELECT COUNT(*) AS CustomerRows FROM dbo.Dim_Customer;
SELECT COUNT(*) AS ActiveCustomers FROM dbo.Dim_Customer WHERE Active = 1;

-- Is CustomerCode unique?
SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Dim_Customer
GROUP BY CustomerCode
HAVING COUNT(*) > 1;

-- Unique / PK on CustomerCode?
SELECT i.name AS IndexName, i.is_primary_key, i.is_unique
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID(N'dbo.Dim_Customer')
  AND c.name = N'CustomerCode';

SELECT name FROM sys.tables WHERE name LIKE 'Fact_%' OR name LIKE 'vw_Kpi%' ORDER BY name;
GO
