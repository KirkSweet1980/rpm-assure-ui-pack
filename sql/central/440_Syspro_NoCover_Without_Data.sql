/*
  440 - SYSPRO No Cover for customers WITHOUT warehouse data
  - Has data (instance + ops/license/jobs/dtr recently or ever): PillarSyspro = 1
  - No data: PillarSyspro = 0 (hard No Cover in app)
  Does not touch Pulseway / Cove pillars.
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

/* Ensure AmsConfig row exists for every active customer */
INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro)
SELECT c.CustomerCode, 1, NULL
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
WHERE c.Active = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.Dim_Customer_AmsConfig a WHERE a.CustomerCode = c.CustomerCode
  );

/* Instances that have any real SYSPRO warehouse footprint */
IF OBJECT_ID(N'tempdb..#HasSyspro') IS NOT NULL DROP TABLE #HasSyspro;
CREATE TABLE #HasSyspro (
  InstanceName nvarchar(100) NOT NULL PRIMARY KEY
);

INSERT INTO #HasSyspro (InstanceName)
SELECT DISTINCT LTRIM(RTRIM(InstanceName))
FROM (
  SELECT InstanceName FROM dbo.Syspro_Operators WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION
  SELECT InstanceName FROM dbo.Syspro_SystemLicense WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION
  SELECT InstanceName FROM dbo.Syspro_JobLogging WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION
  SELECT InstanceName FROM dbo.Syspro_TaskGroup WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION
  SELECT InstanceName FROM dbo.Syspro_OperGroup WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION
  SELECT InstanceName FROM dbo.Syspro_DtrInvBalances WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION
  SELECT InstanceName FROM dbo.Syspro_DtrApBalances WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION
  SELECT InstanceName FROM dbo.Syspro_HealthLog WITH (NOLOCK) WHERE InstanceName IS NOT NULL
) x
WHERE LTRIM(RTRIM(InstanceName)) <> N'';

PRINT N'Instances with SYSPRO data: ' + CAST(@@ROWCOUNT AS nvarchar(20));

/* Customers WITH syspro data: instance mapped AND present in warehouse */
IF OBJECT_ID(N'tempdb..#Covered') IS NOT NULL DROP TABLE #Covered;
SELECT c.CustomerCode
INTO #Covered
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
WHERE c.Active = 1
  AND NULLIF(LTRIM(RTRIM(c.SqlInstanceName)), N'') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM #HasSyspro h
    WHERE h.InstanceName = LTRIM(RTRIM(c.SqlInstanceName))
  );

PRINT N'Customers WITH SYSPRO data (keep cover): ' + CAST(@@ROWCOUNT AS nvarchar(20));

/* Set PillarSyspro = 1 for covered */
UPDATE a
SET a.PillarSyspro = 1
FROM dbo.Dim_Customer_AmsConfig AS a
INNER JOIN #Covered k ON k.CustomerCode = a.CustomerCode
WHERE ISNULL(a.PillarSyspro, 0) <> 1;
PRINT N'Set PillarSyspro=1: ' + CAST(@@ROWCOUNT AS nvarchar(20));

/* Everyone else active: PillarSyspro = 0 */
UPDATE a
SET a.PillarSyspro = 0
FROM dbo.Dim_Customer_AmsConfig AS a
INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
WHERE NOT EXISTS (SELECT 1 FROM #Covered k WHERE k.CustomerCode = a.CustomerCode)
  AND ISNULL(a.PillarSyspro, 1) <> 0;  /* only flip when not already 0; treat null as needing set */
PRINT N'Set PillarSyspro=0 (no data): ' + CAST(@@ROWCOUNT AS nvarchar(20));

/* Force 0 even if already 0 for reporting - re-run full set for nulls */
UPDATE a
SET a.PillarSyspro = 0
FROM dbo.Dim_Customer_AmsConfig AS a
INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
WHERE NOT EXISTS (SELECT 1 FROM #Covered k WHERE k.CustomerCode = a.CustomerCode)
  AND a.PillarSyspro IS NULL;
PRINT N'Set PillarSyspro=0 from NULL: ' + CAST(@@ROWCOUNT AS nvarchar(20));

/* Optional: clear SqlInstanceName only when no warehouse data for that name
   (avoids false cover signals). Keep name if it matches warehouse. */
UPDATE c
SET c.SqlInstanceName = NULL,
    c.UpdatedAt = SYSUTCDATETIME()
FROM dbo.Dim_Customer AS c
WHERE c.Active = 1
  AND NULLIF(LTRIM(RTRIM(c.SqlInstanceName)), N'') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM #HasSyspro h
    WHERE h.InstanceName = LTRIM(RTRIM(c.SqlInstanceName))
  );
PRINT N'Cleared orphan SqlInstanceName: ' + CAST(@@ROWCOUNT AS nvarchar(20));

/* Report */
PRINT N'=== SYSPRO cover result ===';
SELECT
  c.CustomerCode,
  c.DisplayName,
  ISNULL(c.SqlInstanceName, N'(none)') AS SqlInstanceName,
  a.PillarSyspro,
  CASE WHEN k.CustomerCode IS NOT NULL THEN N'COVERED (has data)' ELSE N'NO COVER (no data)' END AS SysproStatus
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig AS a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
LEFT JOIN #Covered k ON k.CustomerCode = c.CustomerCode
WHERE c.Active = 1
ORDER BY
  CASE WHEN k.CustomerCode IS NOT NULL THEN 0 ELSE 1 END,
  c.CustomerCode;

PRINT N'Done. Hard-refresh app. Explicit PillarSyspro=0 = hard No Cover in UI.';
GO
