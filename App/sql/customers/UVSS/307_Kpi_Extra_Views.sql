/*
  CENTRAL - KPI views for Audit / Diag / SqlHealth
*/
USE RPMAssure_App;
GO

SET NOCOUNT ON;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_Audit_Latest AS
SELECT
  c.CustomerCode,
  c.DisplayName,
  a.InstanceName,
  a.SnapshotDate,
  COUNT(*) AS AuditEventCount,
  COUNT(DISTINCT a.OperatorCode) AS AuditOperatorCount,
  MAX(a.EventAt) AS LastEventAt,
  MAX(a.ImportedAt) AS LastImportAt
FROM dbo.Dim_Customer c
INNER JOIN dbo.Syspro_SystemAuditLog a
  ON a.InstanceName = c.SqlInstanceName
INNER JOIN (
  SELECT InstanceName, MAX(SnapshotDate) AS mx
  FROM dbo.Syspro_SystemAuditLog
  GROUP BY InstanceName
) m ON m.InstanceName = a.InstanceName AND m.mx = a.SnapshotDate
WHERE c.Active = 1
GROUP BY c.CustomerCode, c.DisplayName, a.InstanceName, a.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_Diag_Latest AS
SELECT
  c.CustomerCode,
  c.DisplayName,
  d.InstanceName,
  d.SnapshotDate,
  COUNT(*) AS DiagRowCount,
  MAX(d.ImportedAt) AS LastImportAt
FROM dbo.Dim_Customer c
INNER JOIN dbo.Syspro_DiagSummary d
  ON d.InstanceName = c.SqlInstanceName
INNER JOIN (
  SELECT InstanceName, MAX(SnapshotDate) AS mx
  FROM dbo.Syspro_DiagSummary
  GROUP BY InstanceName
) m ON m.InstanceName = d.InstanceName AND m.mx = d.SnapshotDate
WHERE c.Active = 1
GROUP BY c.CustomerCode, c.DisplayName, d.InstanceName, d.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_SqlHealth_Latest AS
SELECT
  c.CustomerCode,
  c.DisplayName,
  h.InstanceName,
  h.SnapshotDate,
  COUNT(*) AS HealthRowCount,
  COUNT(DISTINCT h.CompanyDb) AS CompanyCount,
  MAX(h.ImportedAt) AS LastImportAt
FROM dbo.Dim_Customer c
INNER JOIN dbo.Syspro_SqlHealthBal h
  ON h.InstanceName = c.SqlInstanceName
INNER JOIN (
  SELECT InstanceName, MAX(SnapshotDate) AS mx
  FROM dbo.Syspro_SqlHealthBal
  GROUP BY InstanceName
) m ON m.InstanceName = h.InstanceName AND m.mx = h.SnapshotDate
WHERE c.Active = 1
GROUP BY c.CustomerCode, c.DisplayName, h.InstanceName, h.SnapshotDate;
GO

PRINT N'KPI views for extra collectors ready.';
GO
