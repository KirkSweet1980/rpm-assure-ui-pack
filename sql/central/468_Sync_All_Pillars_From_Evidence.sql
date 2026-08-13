/*
  468 - Sync Dim_Customer_AmsConfig pillars from live warehouse evidence
  for EVERY active customer. App is data-first; flags keep EXCO/SQL audits aligned.

  Rules:
    SYSPRO  = 1 when SqlInstanceName has warehouse footprint; else 0
              HYDRA forced 0 (deferred No Cover)
    RMM     = 1 when Pulseway devices or org map / PulsewayOrgName
    Cove    = 1 when Cove_DeviceStatistics rows (mapped CustomerCode)
    EPP     = 1 when Bitdefender_Endpoints mapped
    CSP     = 1 when Csp users or licenses (PillarCsp column)

  sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 468_Sync_All_Pillars_From_Evidence.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

/* Ensure AmsConfig for every active customer */
INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode)
SELECT c.CustomerCode
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
WHERE c.Active = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.Dim_Customer_AmsConfig a WHERE a.CustomerCode = c.CustomerCode
  );
PRINT CONCAT('AmsConfig rows inserted: ', @@ROWCOUNT);
GO

/* Optional columns */
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCsp') IS NULL
BEGIN
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarCsp bit NULL;
  PRINT 'PillarCsp column added';
END
GO
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NULL
BEGIN
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarBitdefender bit NULL;
  PRINT 'PillarBitdefender column added';
END
GO
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'AmsEnabled') IS NOT NULL
  UPDATE dbo.Dim_Customer_AmsConfig
  SET AmsEnabled = 1
  WHERE CustomerCode IN (SELECT CustomerCode FROM dbo.Dim_Customer WHERE Active = 1)
    AND ISNULL(AmsEnabled, 0) = 0;
GO

/* ---- SYSPRO evidence by SqlInstanceName ---- */
IF OBJECT_ID(N'tempdb..#SysproInst') IS NOT NULL DROP TABLE #SysproInst;
CREATE TABLE #SysproInst (InstanceName nvarchar(100) NOT NULL PRIMARY KEY);

INSERT INTO #SysproInst (InstanceName)
SELECT DISTINCT LTRIM(RTRIM(InstanceName))
FROM (
  SELECT InstanceName FROM dbo.Syspro_Operators WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION SELECT InstanceName FROM dbo.Syspro_SystemLicense WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION SELECT InstanceName FROM dbo.Syspro_JobLogging WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION SELECT InstanceName FROM dbo.Syspro_TaskGroup WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION SELECT InstanceName FROM dbo.Syspro_OperGroup WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION SELECT InstanceName FROM dbo.Syspro_DtrInvBalances WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION SELECT InstanceName FROM dbo.Syspro_DtrApBalances WITH (NOLOCK) WHERE InstanceName IS NOT NULL
  UNION SELECT InstanceName FROM dbo.Syspro_HealthLog WITH (NOLOCK) WHERE InstanceName IS NOT NULL
) x
WHERE NULLIF(LTRIM(RTRIM(InstanceName)), N'') IS NOT NULL;

IF OBJECT_ID(N'tempdb..#SysproCover') IS NOT NULL DROP TABLE #SysproCover;
SELECT c.CustomerCode
INTO #SysproCover
FROM dbo.Dim_Customer c WITH (NOLOCK)
WHERE c.Active = 1
  AND NULLIF(LTRIM(RTRIM(c.SqlInstanceName)), N'') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM #SysproInst h
    WHERE h.InstanceName = LTRIM(RTRIM(c.SqlInstanceName))
  )
  AND c.CustomerCode <> N'HYDRA';

UPDATE a SET PillarSyspro = 1
FROM dbo.Dim_Customer_AmsConfig a
INNER JOIN #SysproCover k ON k.CustomerCode = a.CustomerCode
WHERE ISNULL(a.PillarSyspro, 0) <> 1;
PRINT CONCAT('PillarSyspro=1: ', @@ROWCOUNT);

UPDATE a SET PillarSyspro = 0
FROM dbo.Dim_Customer_AmsConfig a
INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
WHERE NOT EXISTS (SELECT 1 FROM #SysproCover k WHERE k.CustomerCode = a.CustomerCode)
  AND ISNULL(a.PillarSyspro, 1) <> 0;
PRINT CONCAT('PillarSyspro=0: ', @@ROWCOUNT);

/* HYDRA hard off */
UPDATE dbo.Dim_Customer_AmsConfig SET PillarSyspro = 0 WHERE CustomerCode = N'HYDRA';
UPDATE dbo.Dim_Customer SET SqlInstanceName = NULL WHERE CustomerCode = N'HYDRA'
  AND NULLIF(LTRIM(RTRIM(SqlInstanceName)), N'') IS NOT NULL;
PRINT 'HYDRA SYSPRO hard No Cover';
GO

/* ---- RMM ---- */
IF OBJECT_ID(N'tempdb..#RmmCover') IS NOT NULL DROP TABLE #RmmCover;
SELECT DISTINCT x.CustomerCode
INTO #RmmCover
FROM (
  SELECT CustomerCode
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
    AND NULLIF(LTRIM(RTRIM(CustomerCode)), N'') IS NOT NULL
  UNION
  SELECT CustomerCode
  FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
  WHERE Active = 1 AND NULLIF(LTRIM(RTRIM(CustomerCode)), N'') IS NOT NULL
  UNION
  SELECT CustomerCode
  FROM dbo.Dim_Customer WITH (NOLOCK)
  WHERE Active = 1 AND NULLIF(LTRIM(RTRIM(PulsewayOrgName)), N'') IS NOT NULL
) x;

UPDATE a SET PillarPulseway = 1
FROM dbo.Dim_Customer_AmsConfig a
INNER JOIN #RmmCover k ON k.CustomerCode = a.CustomerCode
WHERE ISNULL(a.PillarPulseway, 0) <> 1;
PRINT CONCAT('PillarPulseway=1: ', @@ROWCOUNT);

UPDATE a SET PillarPulseway = 0
FROM dbo.Dim_Customer_AmsConfig a
INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
WHERE NOT EXISTS (SELECT 1 FROM #RmmCover k WHERE k.CustomerCode = a.CustomerCode)
  AND ISNULL(a.PillarPulseway, 1) <> 0;
PRINT CONCAT('PillarPulseway=0: ', @@ROWCOUNT);
GO

/* ---- Cove ---- */
IF OBJECT_ID(N'tempdb..#CoveCover') IS NOT NULL DROP TABLE #CoveCover;
SELECT DISTINCT CustomerCode
INTO #CoveCover
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
  AND NULLIF(LTRIM(RTRIM(CustomerCode)), N'') IS NOT NULL;

UPDATE a SET PillarCove = 1
FROM dbo.Dim_Customer_AmsConfig a
INNER JOIN #CoveCover k ON k.CustomerCode = a.CustomerCode
WHERE ISNULL(a.PillarCove, 0) <> 1;
PRINT CONCAT('PillarCove=1: ', @@ROWCOUNT);

UPDATE a SET PillarCove = 0
FROM dbo.Dim_Customer_AmsConfig a
INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
WHERE NOT EXISTS (SELECT 1 FROM #CoveCover k WHERE k.CustomerCode = a.CustomerCode)
  AND ISNULL(a.PillarCove, 1) <> 0;
PRINT CONCAT('PillarCove=0: ', @@ROWCOUNT);
GO

/* ---- EPP Bitdefender ---- */
IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NOT NULL
BEGIN
  IF OBJECT_ID(N'tempdb..#EppCover') IS NOT NULL DROP TABLE #EppCover;
  SELECT DISTINCT CustomerCode
  INTO #EppCover
  FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
    AND NULLIF(LTRIM(RTRIM(CustomerCode)), N'') IS NOT NULL;

  UPDATE a SET PillarBitdefender = 1
  FROM dbo.Dim_Customer_AmsConfig a
  INNER JOIN #EppCover k ON k.CustomerCode = a.CustomerCode
  WHERE ISNULL(a.PillarBitdefender, 0) <> 1;
  PRINT CONCAT('PillarBitdefender=1: ', @@ROWCOUNT);

  UPDATE a SET PillarBitdefender = 0
  FROM dbo.Dim_Customer_AmsConfig a
  INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
  WHERE NOT EXISTS (SELECT 1 FROM #EppCover k WHERE k.CustomerCode = a.CustomerCode)
    AND ISNULL(a.PillarBitdefender, 1) <> 0;
  PRINT CONCAT('PillarBitdefender=0: ', @@ROWCOUNT);
END
GO

/* ---- Microsoft 365 CSP ---- */
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCsp') IS NOT NULL
BEGIN
  IF OBJECT_ID(N'tempdb..#CspCover') IS NOT NULL DROP TABLE #CspCover;
  CREATE TABLE #CspCover (CustomerCode nvarchar(50) NOT NULL PRIMARY KEY);

  IF OBJECT_ID(N'dbo.Csp_Users', N'U') IS NOT NULL
    INSERT INTO #CspCover (CustomerCode)
    SELECT DISTINCT CustomerCode
    FROM dbo.Csp_Users WITH (NOLOCK)
    WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Csp_Users WITH (NOLOCK))
      AND NULLIF(LTRIM(RTRIM(CustomerCode)), N'') IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM #CspCover t WHERE t.CustomerCode = Csp_Users.CustomerCode);

  IF OBJECT_ID(N'dbo.Csp_Licenses', N'U') IS NOT NULL
    INSERT INTO #CspCover (CustomerCode)
    SELECT DISTINCT CustomerCode
    FROM dbo.Csp_Licenses WITH (NOLOCK)
    WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Csp_Licenses WITH (NOLOCK))
      AND NULLIF(LTRIM(RTRIM(CustomerCode)), N'') IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM #CspCover t WHERE t.CustomerCode = Csp_Licenses.CustomerCode);

  IF OBJECT_ID(N'dbo.Dim_Csp_TenantMap', N'U') IS NOT NULL
    INSERT INTO #CspCover (CustomerCode)
    SELECT DISTINCT CustomerCode
    FROM dbo.Dim_Csp_TenantMap WITH (NOLOCK)
    WHERE Active = 1
      AND TenantId NOT LIKE N'pending-%'
      AND NULLIF(LTRIM(RTRIM(CustomerCode)), N'') IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM #CspCover t WHERE t.CustomerCode = Dim_Csp_TenantMap.CustomerCode);

  UPDATE a SET PillarCsp = 1
  FROM dbo.Dim_Customer_AmsConfig a
  INNER JOIN #CspCover k ON k.CustomerCode = a.CustomerCode
  WHERE ISNULL(a.PillarCsp, 0) <> 1;
  PRINT CONCAT('PillarCsp=1: ', @@ROWCOUNT);

  UPDATE a SET PillarCsp = 0
  FROM dbo.Dim_Customer_AmsConfig a
  INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode AND c.Active = 1
  WHERE NOT EXISTS (SELECT 1 FROM #CspCover k WHERE k.CustomerCode = a.CustomerCode)
    AND ISNULL(a.PillarCsp, 1) <> 0;
  PRINT CONCAT('PillarCsp=0: ', @@ROWCOUNT);
END
GO

/* ---- Estate proof matrix ---- */
PRINT '=== Cover matrix (flags after sync) ===';
SELECT
  c.CustomerCode,
  c.DisplayName,
  ISNULL(a.PillarSyspro, 0) AS Syspro,
  ISNULL(a.PillarPulseway, 0) AS Rmm,
  ISNULL(a.PillarCove, 0) AS Cove,
  ISNULL(a.PillarBitdefender, 0) AS Epp,
  ISNULL(a.PillarCsp, 0) AS M365
FROM dbo.Dim_Customer c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
WHERE c.Active = 1
ORDER BY c.DisplayName;
GO
