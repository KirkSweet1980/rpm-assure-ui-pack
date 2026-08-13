/*
  Diagnose RMM agent patch status (Pulseway -> Pulseway_Devices)
  Missing = Critical + Important + Unspecified from Pulseway Updates object
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

PRINT N'========== LATEST SNAPSHOT ==========';
SELECT
  MAX(SnapshotDate) AS SnapshotDate,
  MAX(ImportedAt) AS LastImportAt,
  COUNT(*) AS Devices,
  SUM(CASE WHEN PatchMissingCount IS NOT NULL OR PatchInstalledCount IS NOT NULL OR PatchPendingCount IS NOT NULL THEN 1 ELSE 0 END) AS AgentsReportingPatch,
  SUM(CASE WHEN PatchMissingCount IS NULL AND PatchInstalledCount IS NULL AND PatchPendingCount IS NULL THEN 1 ELSE 0 END) AS AgentsNotReporting,
  SUM(ISNULL(PatchMissingCount, 0)) AS TotalOutstandingUpdates,
  SUM(CASE WHEN ISNULL(PatchMissingCount, 0) = 0 AND PatchMissingCount IS NOT NULL THEN 1 ELSE 0 END) AS CleanAgents,
  SUM(CASE WHEN ISNULL(PatchMissingCount, 0) BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS Light1to5,
  SUM(CASE WHEN ISNULL(PatchMissingCount, 0) BETWEEN 6 AND 20 THEN 1 ELSE 0 END) AS Moderate6to20,
  SUM(CASE WHEN ISNULL(PatchMissingCount, 0) >= 21 THEN 1 ELSE 0 END) AS Heavy21plus
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
GO

PRINT N'========== BY CUSTOMER ==========';
SELECT
  ISNULL(CustomerCode, N'(unmapped)') AS CustomerCode,
  ISNULL(OrganizationName, N'(unknown)') AS OrganizationName,
  COUNT(*) AS Devices,
  SUM(CASE WHEN PatchMissingCount IS NOT NULL THEN 1 ELSE 0 END) AS Reporting,
  SUM(ISNULL(PatchMissingCount, 0)) AS Outstanding,
  SUM(CASE WHEN ISNULL(PatchMissingCount, 0) > 0 THEN 1 ELSE 0 END) AS AgentsWithMissing,
  SUM(CASE WHEN ISNULL(PatchMissingCount, 0) = 0 AND PatchMissingCount IS NOT NULL THEN 1 ELSE 0 END) AS Clean,
  MAX(PatchMissingCount) AS WorstAgent
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
GROUP BY ISNULL(CustomerCode, N'(unmapped)'), ISNULL(OrganizationName, N'(unknown)')
ORDER BY Outstanding DESC, Devices DESC;
GO

PRINT N'========== TOP AGENTS WITH MISSING UPDATES ==========';
SELECT TOP 40
  CustomerCode,
  OrganizationName,
  Name AS AgentName,
  DeviceType,
  CASE WHEN IsOnline = 1 THEN N'Online' WHEN IsOnline = 0 THEN N'Offline' ELSE N'?' END AS OnlineStatus,
  PatchMissingCount AS Outstanding,
  PatchPendingCount AS Pending,
  PatchInstalledCount AS Installed,
  CpuUsagePct,
  MemoryUsagePct,
  UptimeDays,
  LastSeenOnline
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND ISNULL(PatchMissingCount, 0) > 0
ORDER BY PatchMissingCount DESC, Name;
GO

PRINT N'========== CLEAN AGENTS (0 outstanding, reporting) ==========';
SELECT TOP 20
  CustomerCode,
  Name AS AgentName,
  DeviceType,
  PatchMissingCount AS Outstanding,
  LastSeenOnline
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND PatchMissingCount = 0
ORDER BY Name;
GO

PRINT N'========== NOT REPORTING (NULL patch fields) ==========';
SELECT TOP 30
  CustomerCode,
  OrganizationName,
  Name AS AgentName,
  DeviceType,
  IsOnline,
  LastSeenOnline
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND PatchMissingCount IS NULL
  AND PatchInstalledCount IS NULL
  AND PatchPendingCount IS NULL
ORDER BY OrganizationName, Name;
GO

PRINT N'========== BY DEVICE TYPE ==========';
SELECT
  ISNULL(NULLIF(LTRIM(RTRIM(DeviceType)), N''), N'(blank)') AS DeviceType,
  COUNT(*) AS Devices,
  SUM(CASE WHEN PatchMissingCount IS NOT NULL THEN 1 ELSE 0 END) AS Reporting,
  SUM(ISNULL(PatchMissingCount, 0)) AS Outstanding,
  SUM(CASE WHEN ISNULL(PatchMissingCount, 0) > 0 THEN 1 ELSE 0 END) AS WithMissing
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(DeviceType)), N''), N'(blank)')
ORDER BY Devices DESC;
GO
