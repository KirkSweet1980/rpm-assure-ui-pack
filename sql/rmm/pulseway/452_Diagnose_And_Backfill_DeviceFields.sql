/*
  Diagnose Pulseway device inventory gaps + ensure stats columns exist.
  Run on central: RPMAssure_App
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

-- Ensure stats columns
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'IpAddress') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD IpAddress nvarchar(64) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'CpuUsagePct') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD CpuUsagePct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'MemoryUsagePct') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD MemoryUsagePct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OnlinePct') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD OnlinePct decimal(6,2) NULL;
GO

PRINT N'=== Latest devices per customer (sample) ===';
;WITH latest AS (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL
  GROUP BY CustomerCode
)
SELECT TOP 40
  d.CustomerCode, d.Name, d.DeviceId, d.IsOnline, d.OsName, d.DeviceType,
  d.IpAddress, d.CpuUsagePct, d.MemoryUsagePct, d.OnlinePct, d.LastSeenOnline, d.SnapshotDate
FROM dbo.Pulseway_Devices d WITH (NOLOCK)
INNER JOIN latest m ON m.CustomerCode = d.CustomerCode AND m.mx = d.SnapshotDate
ORDER BY d.CustomerCode, d.Name;

PRINT N'=== Disks present (counts) ===';
SELECT CustomerCode, COUNT(*) AS DiskRows, COUNT(DISTINCT DeviceId) AS DevicesWithDisks
FROM dbo.Pulseway_Disks WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Disks WITH (NOLOCK))
GROUP BY CustomerCode
ORDER BY 1;

PRINT N'=== Cove devices by CustomerCode (latest) ===';
SELECT CustomerCode, COUNT(*) AS Cnt, MAX(SnapshotDate) AS Snap
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE CustomerCode IS NOT NULL
GROUP BY CustomerCode
ORDER BY 1;

PRINT N'=== Cove unmapped (null CustomerCode) partners on latest snap ===';
SELECT TOP 30
  ISNULL(Product, N'(blank)') AS PartnerOrProduct,
  PartnerId,
  COUNT(*) AS Devices
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
GROUP BY Product, PartnerId
ORDER BY COUNT(*) DESC;

PRINT N'Done. Map partners via Dim_Cove_PartnerMap then UPDATE Cove_DeviceStatistics SET CustomerCode=...';
GO
