/*
  Diagnose license / version / hotfix for RSS + Redsun (and all active).
  Run ON central:
    sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "rpmassure" -P "..." -C -i 390_Diagnose_License_Version_Hotfix.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

PRINT N'=== Dim_Customer (RSS, RSR) ===';
SELECT CustomerCode, DisplayName, Active, SqlInstanceName, UpdatedAt
FROM dbo.Dim_Customer
WHERE CustomerCode IN (N'RSS', N'RSR')
ORDER BY CustomerCode;

PRINT N'=== Syspro_SystemLicense latest per instance ===';
;WITH x AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY InstanceName ORDER BY SnapshotDate DESC, ImportedAt DESC) AS rn
  FROM dbo.Syspro_SystemLicense WITH (NOLOCK)
)
SELECT InstanceName, SnapshotDate, ProductName, ProductVersion, LicenseType, Users,
  LicenseExpiry, CustomerCode, CustomerName, ImportedAt,
  CASE WHEN RawXml IS NULL THEN 0 ELSE LEN(RawXml) END AS XmlLen
FROM x WHERE rn = 1
ORDER BY InstanceName;

PRINT N'=== Syspro_VersionInfo latest ===';
;WITH x AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY InstanceName ORDER BY SnapshotDate DESC, ImportedAt DESC) AS rn
  FROM dbo.Syspro_VersionInfo WITH (NOLOCK)
)
SELECT InstanceName, SnapshotDate, ProductName, ProductVersion, BuildNumber, Users, LicenseExpiry, ImportedAt
FROM x WHERE rn = 1
ORDER BY InstanceName;

PRINT N'=== Hotfix counts (latest snap) KB vs all ===';
;WITH m AS (
  SELECT InstanceName, MAX(SnapshotDate) AS SnapshotDate
  FROM dbo.Syspro_Hotfix WITH (NOLOCK)
  GROUP BY InstanceName
)
SELECT h.InstanceName, h.SnapshotDate,
  SUM(CASE WHEN h.HotfixCode LIKE N'KB%' THEN 1 ELSE 0 END) AS KbCount,
  COUNT(*) AS AllCount,
  MAX(CASE WHEN h.HotfixCode LIKE N'KB%' THEN h.HotfixCode END) AS SampleKb,
  MAX(h.SourceTable) AS SampleSource
FROM dbo.Syspro_Hotfix AS h WITH (NOLOCK)
INNER JOIN m ON m.InstanceName = h.InstanceName AND m.SnapshotDate = h.SnapshotDate
GROUP BY h.InstanceName, h.SnapshotDate
ORDER BY h.InstanceName;

PRINT N'=== Join check: Dim vs license/version/HF for RSS+RSR ===';
SELECT
  c.CustomerCode,
  c.SqlInstanceName,
  lic.ProductVersion AS LicVersion,
  lic.ProductName AS LicProduct,
  ver.ProductVersion AS VerVersion,
  ver.BuildNumber AS VerBuild,
  hf.KbCount,
  hf.AllCount
FROM dbo.Dim_Customer AS c
OUTER APPLY (
  SELECT TOP 1 ProductVersion, ProductName
  FROM dbo.Syspro_SystemLicense WITH (NOLOCK)
  WHERE InstanceName = c.SqlInstanceName
  ORDER BY SnapshotDate DESC, ImportedAt DESC
) AS lic
OUTER APPLY (
  SELECT TOP 1 ProductVersion, BuildNumber
  FROM dbo.Syspro_VersionInfo WITH (NOLOCK)
  WHERE InstanceName = c.SqlInstanceName
  ORDER BY SnapshotDate DESC, ImportedAt DESC
) AS ver
OUTER APPLY (
  SELECT
    SUM(CASE WHEN h.HotfixCode LIKE N'KB%' THEN 1 ELSE 0 END) AS KbCount,
    COUNT(*) AS AllCount
  FROM dbo.Syspro_Hotfix AS h WITH (NOLOCK)
  WHERE h.InstanceName = c.SqlInstanceName
    AND h.SnapshotDate = (
      SELECT MAX(SnapshotDate) FROM dbo.Syspro_Hotfix WITH (NOLOCK) WHERE InstanceName = c.SqlInstanceName
    )
) AS hf
WHERE c.CustomerCode IN (N'RSS', N'RSR') OR c.Active = 1
ORDER BY c.CustomerCode;

PRINT N'Done. If LicVersion NULL -> re-run license collect on customer.';
PRINT N'If VerBuild NULL but LicVersion set -> UI will fall back after app update; re-collect still recommended.';
PRINT N'If KbCount=0 and AllCount>0 -> modules only (no SYSPRODeployment KBs). Deploy collect or grant read on SYSPRODeployment.';
PRINT N'If SqlInstanceName mismatch vs InstanceName in tables -> fix Dim_Customer.SqlInstanceName.';
GO
