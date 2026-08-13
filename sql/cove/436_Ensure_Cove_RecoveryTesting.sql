/*
  436 - Cove recovery testing columns + KPI summary
  API: EnumerateAccountStatistics columns I80 (plan), I81 (physicality), F19 (verification)
  Docs: https://developer.n-able.com/n-able-cove/docs/column-codes

  Note: VDR session fields (RV0/RVJ/RVO/RVL/RVK) are often empty until the first
  automated Recovery Testing restore completes (typically 14/30 day cadence).
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryPlanType') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryPlanType int NULL; -- I80: 0 none, 1 RT, 2 Standby
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryPlanLabel') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryPlanLabel nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryVerification') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryVerification nvarchar(400) NULL; -- F19
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryTestStatus') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryTestStatus nvarchar(40) NULL; -- Success/Failed/Unknown/NotInPlan/NotStarted
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'Physicality') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD Physicality nvarchar(40) NULL; -- I81
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'LastRecoveryTestAt') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD LastRecoveryTestAt datetime2(3) NULL; -- RVO/RVL
  PRINT N'Cove_DeviceStatistics recovery columns ready';
END
ELSE
  PRINT N'Cove_DeviceStatistics missing - run 430 first';
GO

/* CREATE OR ALTER avoids DROP permission / "does not exist" failures under -b */
CREATE OR ALTER VIEW dbo.vw_Kpi_Cove_Recovery_Latest
AS
SELECT
  d.CustomerCode,
  d.SnapshotDate AS AsOfDate,
  COUNT(*) AS DeviceCount,
  SUM(CASE WHEN ISNULL(d.RecoveryPlanType, 0) = 1 THEN 1 ELSE 0 END) AS RecoveryTestingCount,
  SUM(CASE WHEN ISNULL(d.RecoveryPlanType, 0) = 2 THEN 1 ELSE 0 END) AS StandbyImageCount,
  SUM(CASE WHEN ISNULL(d.RecoveryPlanType, 0) = 0 OR d.RecoveryPlanType IS NULL THEN 1 ELSE 0 END) AS NoPlanCount,
  SUM(CASE WHEN d.RecoveryTestStatus = N'Success' THEN 1 ELSE 0 END) AS TestSuccessCount,
  SUM(CASE WHEN d.RecoveryTestStatus = N'Failed' THEN 1 ELSE 0 END) AS TestFailedCount,
  SUM(CASE WHEN d.RecoveryTestStatus IN (N'Unknown', N'InProgress', N'NotStarted') AND ISNULL(d.RecoveryPlanType, 0) IN (1, 2) THEN 1 ELSE 0 END) AS TestUnknownCount,
  MAX(d.LastRecoveryTestAt) AS LastRecoveryTestAt,
  MAX(d.ImportedAt) AS ImportedAt
FROM dbo.Cove_DeviceStatistics AS d WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  GROUP BY CustomerCode
) m ON m.CustomerCode = d.CustomerCode AND m.mx = d.SnapshotDate
WHERE d.CustomerCode IS NOT NULL
GROUP BY d.CustomerCode, d.SnapshotDate;
GO
PRINT N'vw_Kpi_Cove_Recovery_Latest ready';
GO
