/*
  457 — Pillar cover vs evidence (ops audit)
  Run as admin / Rpm_collect with read rights.
  Aligns with app P1 Pillar cover audit panel.
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

;WITH cust AS (
  SELECT
    c.CustomerCode,
    c.DisplayName,
    c.SqlInstanceName,
    c.PulsewayOrgName,
    a.PillarSyspro,
    a.PillarPulseway,
    a.PillarCove,
    a.PillarBitdefender AS PillarEpp
  FROM dbo.Dim_Customer AS c WITH (NOLOCK)
  LEFT JOIN dbo.Dim_Customer_AmsConfig AS a WITH (NOLOCK)
    ON a.CustomerCode = c.CustomerCode
  WHERE c.Active = 1
),
syspro_ev AS (
  SELECT DISTINCT InstanceName
  FROM dbo.Syspro_Operators WITH (NOLOCK)
  WHERE InstanceName IS NOT NULL
),
rmm_ev AS (
  SELECT CustomerCode, COUNT(*) AS DeviceCount
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
    AND CustomerCode IS NOT NULL
  GROUP BY CustomerCode
),
cove_ev AS (
  SELECT CustomerCode, COUNT(*) AS DeviceCount
  FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
    AND CustomerCode IS NOT NULL
  GROUP BY CustomerCode
),
epp_ev AS (
  SELECT CustomerCode, COUNT(*) AS DeviceCount
  FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
    AND CustomerCode IS NOT NULL
  GROUP BY CustomerCode
)
SELECT
  c.CustomerCode,
  c.DisplayName,
  CASE WHEN c.PillarSyspro = 0 THEN 0
       WHEN c.SqlInstanceName IS NOT NULL OR s.InstanceName IS NOT NULL THEN 1
       ELSE ISNULL(c.PillarSyspro, 0) END AS SysproCovered_Suggest,
  CASE WHEN c.SqlInstanceName IS NOT NULL OR s.InstanceName IS NOT NULL THEN 1 ELSE 0 END AS SysproEvidence,
  CASE WHEN ISNULL(r.DeviceCount, 0) > 0 OR c.PulsewayOrgName IS NOT NULL THEN 1 ELSE 0 END AS RmmEvidence,
  CASE WHEN ISNULL(v.DeviceCount, 0) > 0 THEN 1 ELSE 0 END AS CoveEvidence,
  CASE WHEN ISNULL(e.DeviceCount, 0) > 0 THEN 1 ELSE 0 END AS EppEvidence,
  ISNULL(r.DeviceCount, 0) AS RmmDevices,
  ISNULL(v.DeviceCount, 0) AS CoveDevices,
  ISNULL(e.DeviceCount, 0) AS EppEndpoints,
  c.PillarSyspro,
  c.PillarPulseway,
  c.PillarCove,
  c.PillarEpp
FROM cust AS c
LEFT JOIN syspro_ev AS s ON s.InstanceName = c.SqlInstanceName
LEFT JOIN rmm_ev AS r ON r.CustomerCode = c.CustomerCode
LEFT JOIN cove_ev AS v ON v.CustomerCode = c.CustomerCode
LEFT JOIN epp_ev AS e ON e.CustomerCode = c.CustomerCode
ORDER BY c.DisplayName;
GO
