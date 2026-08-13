/*
  Cove KPI helpers + unmapped partner list
  Note: collect stores Cove partner name in Cove_DeviceStatistics.Product
  Run: sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i 432_...
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

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

PRINT 'Cove KPI views ready.';
GO

SELECT PartnerName, PartnerId, DeviceCount, LastSnapshotDate, LastImportAt
FROM dbo.vw_Cove_UnmappedPartners
ORDER BY DeviceCount DESC, PartnerName;
GO
