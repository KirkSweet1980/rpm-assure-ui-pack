/*
  457 - RMM devices latest view (includes patch columns) + quick diagnose
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.Pulseway_Devices', N'PatchInstalledCount') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD PatchInstalledCount int NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'PatchMissingCount') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD PatchMissingCount int NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'PatchPendingCount') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD PatchPendingCount int NULL;
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Devices_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Rmm_Devices_Latest;
GO
CREATE VIEW dbo.vw_Kpi_Rmm_Devices_Latest
AS
SELECT
  d.CustomerCode,
  d.DeviceId,
  d.Name,
  d.IsOnline,
  d.OsName,
  d.DeviceType,
  d.CriticalNotifications,
  d.ElevatedNotifications,
  d.LastSeenOnline,
  d.OrganizationName,
  d.IpAddress,
  d.CpuUsagePct,
  d.MemoryUsagePct,
  d.OnlinePct,
  d.UptimeDays,
  d.LastBootAt,
  d.PatchInstalledCount,
  d.PatchMissingCount,
  d.PatchPendingCount,
  d.SnapshotDate,
  d.ImportedAt
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  GROUP BY CustomerCode
) m ON m.CustomerCode = d.CustomerCode AND m.mx = d.SnapshotDate
WHERE d.CustomerCode IS NOT NULL;
GO
PRINT N'vw_Kpi_Rmm_Devices_Latest ready (with Patch*).';
GO

-- Diagnose: latest snapshot patch coverage
SELECT
  SnapshotDate,
  COUNT(*) AS Devices,
  SUM(CASE WHEN PatchInstalledCount IS NOT NULL OR PatchMissingCount IS NOT NULL OR PatchPendingCount IS NOT NULL THEN 1 ELSE 0 END) AS ReportingPatch,
  SUM(ISNULL(PatchMissingCount, 0)) AS SumMissing,
  SUM(ISNULL(PatchInstalledCount, 0)) AS SumInstalled,
  SUM(ISNULL(PatchPendingCount, 0)) AS SumPending
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
GROUP BY SnapshotDate;
GO
