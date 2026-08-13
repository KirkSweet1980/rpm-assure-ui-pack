/* Run on AHIC-SSQL-SRV */
USE Sysprodb;
SELECT c.column_id, c.name, t.name AS DataType, c.max_length
FROM sys.columns c
JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'dbo.AdmOperator')
ORDER BY c.column_id;

IF OBJECT_ID(N'dbo.AdmOperatorLogin', N'U') IS NOT NULL
SELECT c.column_id, c.name, t.name AS DataType
FROM sys.columns c
JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'dbo.AdmOperatorLogin')
ORDER BY c.column_id;

-- Job-like tables in main company
USE AHICAR_I;
SELECT name FROM sys.tables
WHERE name LIKE '%Job%' OR name LIKE '%Log%' OR name LIKE 'Adm%'
ORDER BY 1;
GO
