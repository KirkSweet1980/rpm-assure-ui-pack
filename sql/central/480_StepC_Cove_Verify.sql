/*
  480 - Step C verify: Cove health after map cleanup
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

PRINT N'=== C1) Ensure KPI views ===';
GO
IF OBJECT_ID(N'dbo.vw_Kpi_Cove_DeviceLatest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Cove_DeviceLatest;
GO
CREATE VIEW dbo.vw_Kpi_Cove_DeviceLatest
AS
SELECT d.*
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
INNER JOIN (
  SELECT AccountId, MAX(SnapshotDate) AS SnapshotDate
  FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
  GROUP BY AccountId
) AS x
  ON x.AccountId = d.AccountId AND x.SnapshotDate = d.SnapshotDate;
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Cove_Summary', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Cove_Summary;
GO
CREATE VIEW dbo.vw_Kpi_Cove_Summary
AS
SELECT
  d.CustomerCode,
  MAX(d.SnapshotDate) AS AsOfDate,
  COUNT_BIG(*) AS DeviceCount,
  SUM(CASE
        WHEN d.LastBackupStatus IN (N'OK', N'Succeeded', N'Success')
          OR d.LastBackupStatus LIKE N'OK%'
        THEN 1 ELSE 0 END) AS OkCount,
  SUM(CASE WHEN d.LastBackupStatus IN (N'Stale') THEN 1 ELSE 0 END) AS StaleCount,
  SUM(CASE
        WHEN d.LastBackupStatus IN (N'Overdue', N'Failed', N'Fail', N'Error')
          OR d.LastBackupStatus LIKE N'%Fail%'
          OR d.LastBackupStatus LIKE N'%Error%'
          OR d.LastBackupStatus LIKE N'%Overdue%'
        THEN 1 ELSE 0 END) AS FailedCount,
  SUM(CASE
        WHEN d.LastBackupStatus IS NULL
          OR LTRIM(RTRIM(d.LastBackupStatus)) = N''
          OR d.LastBackupStatus IN (N'Unknown')
        THEN 1 ELSE 0 END) AS UnknownCount,
  MAX(d.ImportedAt) AS LastImportAt,
  MAX(d.LastSuccessTime) AS LastSuccessAny
FROM dbo.vw_Kpi_Cove_DeviceLatest AS d
WHERE d.CustomerCode IS NOT NULL
  AND LTRIM(RTRIM(d.CustomerCode)) <> N''
GROUP BY d.CustomerCode;
GO

IF OBJECT_ID(N'dbo.vw_Cove_UnmappedPartners', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Cove_UnmappedPartners;
GO
CREATE VIEW dbo.vw_Cove_UnmappedPartners
AS
SELECT
  NULLIF(LTRIM(RTRIM(d.Product)), N'') AS PartnerName,
  d.PartnerId,
  COUNT_BIG(*) AS DeviceCount,
  MAX(d.SnapshotDate) AS LastSnapshotDate,
  MAX(d.ImportedAt) AS LastImportAt
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
  AND (d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode)) = N'')
  AND NULLIF(LTRIM(RTRIM(d.Product)), N'') IS NOT NULL
GROUP BY NULLIF(LTRIM(RTRIM(d.Product)), N''), d.PartnerId;
GO

PRINT N'=== C2) Summary by customer (latest devices) ===';
SELECT
  s.CustomerCode,
  c.DisplayName,
  s.AsOfDate,
  s.DeviceCount,
  s.OkCount,
  s.FailedCount,
  s.StaleCount,
  s.UnknownCount,
  s.LastImportAt,
  s.LastSuccessAny,
  ISNULL(a.PillarCove, 0) AS PillarCove
FROM dbo.vw_Kpi_Cove_Summary s
LEFT JOIN dbo.Dim_Customer c ON c.CustomerCode = s.CustomerCode
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = s.CustomerCode
ORDER BY s.CustomerCode;

PRINT N'=== C3) Unmapped partners (must be 0 rows) ===';
SELECT PartnerName, PartnerId, DeviceCount, LastSnapshotDate, LastImportAt
FROM dbo.vw_Cove_UnmappedPartners
ORDER BY DeviceCount DESC, PartnerName;

PRINT N'=== C4) Problem devices (not OK) latest snap ===';
;WITH latest AS (SELECT MAX(SnapshotDate) AS d FROM dbo.Cove_DeviceStatistics)
SELECT d.CustomerCode, d.DeviceName, d.MachineName, d.LastBackupStatus, d.LastSuccessTime, d.Product
FROM dbo.Cove_DeviceStatistics d
INNER JOIN latest l ON l.d = d.SnapshotDate
WHERE d.LastBackupStatus IS NULL
   OR d.LastBackupStatus NOT IN (N'OK', N'Success', N'Succeeded')
ORDER BY d.CustomerCode, d.DeviceName;

PRINT N'=== C5) Collect freshness ===';
SELECT
  MAX(SnapshotDate) AS MaxSnapshotDate,
  MAX(ImportedAt) AS MaxImportedAt,
  COUNT(*) AS TotalRowsLatest
FROM dbo.Cove_DeviceStatistics
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics);

PRINT N'=== Step C verify complete ===';
GO
