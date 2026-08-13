/*
  438 - SYSPRO cover diagnostic: customers missing SqlInstanceName + warehouse probe
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

PRINT N'=== Dim_Customer SYSPRO mapping ===';
SELECT
  c.CustomerCode,
  c.DisplayName,
  ISNULL(c.SqlInstanceName, N'(none)') AS SqlInstanceName,
  a.PillarSyspro,
  CASE
    WHEN NULLIF(LTRIM(RTRIM(c.SqlInstanceName)), N'') IS NOT NULL THEN N'COVER (instance)'
    WHEN a.PillarSyspro = 1 THEN N'COVER (flag)'
    ELSE N'NO COVER until SqlInstanceName set'
  END AS CoverHint
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig AS a WITH (NOLOCK)
  ON a.CustomerCode = c.CustomerCode
WHERE c.Active = 1
ORDER BY c.CustomerCode;

PRINT N'=== Warehouse instance names (sample) ===';
SELECT TOP 40 InstanceName, COUNT(*) AS RowsSeen
FROM (
  SELECT InstanceName FROM dbo.Syspro_OperGroup WITH (NOLOCK)
  UNION ALL
  SELECT InstanceName FROM dbo.Syspro_License WITH (NOLOCK)
) x
WHERE InstanceName IS NOT NULL
GROUP BY InstanceName
ORDER BY InstanceName;

PRINT N'=== HYDRA / Hydra specifically ===';
SELECT CustomerCode, DisplayName, SqlInstanceName, Active
FROM dbo.Dim_Customer WITH (NOLOCK)
WHERE CustomerCode LIKE N'%HYDR%'
   OR DisplayName LIKE N'%Hydra%';

/* Optional: set HYDRA instance when you know the exact warehouse name:
UPDATE dbo.Dim_Customer
SET SqlInstanceName = N'YOUR_SYSPRO_INSTANCE_NAME', UpdatedAt = SYSUTCDATETIME()
WHERE CustomerCode = N'HYDRA';
*/
GO
