/*
  OPTIONAL: copy spine + latest-ish telemetry from existing [RPMAssure] → [RPMAssure_App]
  Run AFTER 100_Create. Does not drop or alter [RPMAssure].
  Adjust if column sets differ.
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF DB_ID(N'RPMAssure') IS NULL
BEGIN
    RAISERROR('Source database RPMAssure not found.', 16, 1);
    RETURN;
END

PRINT 'Copy Dim_Customer...';
INSERT INTO dbo.Dim_Customer
    (CustomerCode, DisplayName, Active, SqlInstanceName, CovePartnerId, CovePartnerName,
     Notes, PulsewayOrgName, PulsewayOrgId, BitdefenderCompany, BitdefenderCompanyId, CreatedAt, UpdatedAt)
SELECT s.CustomerCode, s.DisplayName, s.Active, s.SqlInstanceName, s.CovePartnerId, s.CovePartnerName,
       s.Notes, s.PulsewayOrgName, s.PulsewayOrgId, s.BitdefenderCompany, s.BitdefenderCompanyId, s.CreatedAt, s.UpdatedAt
FROM RPMAssure.dbo.Dim_Customer s
WHERE NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer t WHERE t.CustomerCode = s.CustomerCode);

PRINT 'Copy AmsConfig...';
INSERT INTO dbo.Dim_Customer_AmsConfig
    (CustomerCode, AmsEnabled, PillarSyspro, PillarSql, PillarCove, PillarPulseway, PillarBitdefender, PillarMicrosoftCsp, Notes, UpdatedAt, UpdatedBy)
SELECT s.CustomerCode, s.AmsEnabled, s.PillarSyspro, s.PillarSql, s.PillarCove, s.PillarPulseway, s.PillarBitdefender, s.PillarMicrosoftCsp, s.Notes, s.UpdatedAt, s.UpdatedBy
FROM RPMAssure.dbo.Dim_Customer_AmsConfig s
WHERE EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = s.CustomerCode)
  AND NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig t WHERE t.CustomerCode = s.CustomerCode);

PRINT 'Copy latest Pulseway_OrgSummary per customer...';
INSERT INTO dbo.Pulseway_OrgSummary
    (SnapshotDate, CustomerCode, OrganizationName, DeviceCount, OnlineCount, OfflineCount, MaintenanceCount,
     CriticalAlerts, ElevatedAlerts, NormalAlerts, LowAlerts, DiskHighCount, ServerCount, WorkstationCount, NotificationCount, ImportedAt)
SELECT s.SnapshotDate, s.CustomerCode, s.OrganizationName, s.DeviceCount, s.OnlineCount, s.OfflineCount, s.MaintenanceCount,
       s.CriticalAlerts, s.ElevatedAlerts, s.NormalAlerts, s.LowAlerts, s.DiskHighCount, s.ServerCount, s.WorkstationCount, s.NotificationCount, s.ImportedAt
FROM RPMAssure.dbo.Pulseway_OrgSummary s
INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) mx FROM RPMAssure.dbo.Pulseway_OrgSummary
    WHERE CustomerCode IS NOT NULL GROUP BY CustomerCode
) m ON m.CustomerCode = s.CustomerCode AND m.mx = s.SnapshotDate
WHERE EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = s.CustomerCode)
  AND NOT EXISTS (
      SELECT 1 FROM dbo.Pulseway_OrgSummary t
      WHERE t.CustomerCode = s.CustomerCode AND t.SnapshotDate = s.SnapshotDate);

PRINT 'Copy latest Cove_DeviceStatistics (all devices on max snap per customer)...';
INSERT INTO dbo.Cove_DeviceStatistics
    (SnapshotDate, AccountId, PartnerId, CustomerCode, DeviceName, MachineName, UsedBytes, SelectedBytes,
     LastSuccessTime, LastBackupStatus, Product, ImportedAt)
SELECT s.SnapshotDate, s.AccountId, s.PartnerId, s.CustomerCode, s.DeviceName, s.MachineName, s.UsedBytes, s.SelectedBytes,
       s.LastSuccessTime, s.LastBackupStatus, s.Product, s.ImportedAt
FROM RPMAssure.dbo.Cove_DeviceStatistics s
INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) mx FROM RPMAssure.dbo.Cove_DeviceStatistics
    WHERE CustomerCode IS NOT NULL GROUP BY CustomerCode
) m ON m.CustomerCode = s.CustomerCode AND m.mx = s.SnapshotDate
WHERE s.CustomerCode IS NOT NULL
  AND EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = s.CustomerCode)
  AND NOT EXISTS (
      SELECT 1 FROM dbo.Cove_DeviceStatistics t
      WHERE t.SnapshotDate = s.SnapshotDate AND t.AccountId = s.AccountId);

PRINT 'Copy latest Bitdefender_CompanySummary...';
INSERT INTO dbo.Bitdefender_CompanySummary
    (SnapshotDate, CustomerCode, CompanyName, EndpointCount, ManagedCount, OnlineCount, OfflineCount, UnmanagedCount,
     QuarantineCount, IncidentCount24h, IncidentCount7d, InfectedCount, SignatureOutdatedCnt, AvgRiskScorePct,
     MalwareUnresolvedCnt, PolicyNonCompliantCnt, ModulesDisabledCnt, ImportedAt)
SELECT s.SnapshotDate, s.CustomerCode, s.CompanyName, s.EndpointCount, s.ManagedCount, s.OnlineCount, s.OfflineCount, s.UnmanagedCount,
       s.QuarantineCount, s.IncidentCount24h, s.IncidentCount7d, s.InfectedCount, s.SignatureOutdatedCnt, s.AvgRiskScorePct,
       s.MalwareUnresolvedCnt, s.PolicyNonCompliantCnt, s.ModulesDisabledCnt, s.ImportedAt
FROM RPMAssure.dbo.Bitdefender_CompanySummary s
INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) mx FROM RPMAssure.dbo.Bitdefender_CompanySummary
    WHERE CustomerCode IS NOT NULL GROUP BY CustomerCode
) m ON m.CustomerCode = s.CustomerCode AND m.mx = s.SnapshotDate
WHERE EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = s.CustomerCode)
  AND NOT EXISTS (
      SELECT 1 FROM dbo.Bitdefender_CompanySummary t
      WHERE t.CustomerCode = s.CustomerCode AND t.SnapshotDate = s.SnapshotDate);

/* Fix possible wrong OfflineCount mapping if source has OfflineCount - re-copy note: used OfflineCount twice for Unmanaged - fix */
/* Optional fix update UnmanagedCount from source if column exists - skip for simplicity */

PRINT 'Copy latest Syspro_Operators by instance...';
INSERT INTO dbo.Syspro_Operators
    (SnapshotDate, InstanceName, OperatorCode, OperatorName, GroupCode, Email, LastLoginDate, OperatorStatus, ImportedAt)
SELECT s.SnapshotDate, s.InstanceName, s.OperatorCode, s.OperatorName, s.GroupCode, s.Email, s.LastLoginDate, s.OperatorStatus, s.ImportedAt
FROM RPMAssure.dbo.Syspro_Operators s
INNER JOIN (
    SELECT InstanceName, MAX(SnapshotDate) mx FROM RPMAssure.dbo.Syspro_Operators GROUP BY InstanceName
) m ON m.InstanceName = s.InstanceName AND m.mx = s.SnapshotDate
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Syspro_Operators t
    WHERE t.SnapshotDate = s.SnapshotDate AND t.InstanceName = s.InstanceName AND t.OperatorCode = s.OperatorCode);

PRINT 'Copy done. Check portfolio:';
SELECT TOP 30 CustomerCode, DisplayName, HealthRagProposed, ActiveUserCount, CoveFailedDeviceCount, PulsewayOfflineCount
FROM dbo.vw_Kpi_PortfolioDashboard
ORDER BY CASE HealthRagProposed WHEN N'Red' THEN 1 WHEN N'Amber' THEN 2 ELSE 3 END, CustomerCode;
GO
