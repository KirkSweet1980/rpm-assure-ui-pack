/*
  456 — De-duplicate Bitdefender endpoints in KPI view.
  GravityZone often returns the same host twice:
    AHICFSAPPDEV
    AHICFSAPPDEV-00155d15120e
  Same FQDN/IP, different EndpointId.
  Prefer clean hostname + non-default policy.
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Epp_Summary
AS
WITH ranked AS (
  SELECT
    e.CustomerCode,
    e.SnapshotDate,
    e.IsManaged,
    e.MachineType,
    e.ImportedAt,
    e.EndpointId,
    ROW_NUMBER() OVER (
      PARTITION BY
        e.CustomerCode,
        e.SnapshotDate,
        COALESCE(
          NULLIF(LOWER(LTRIM(RTRIM(e.Fqdn))), N''),
          NULLIF(LTRIM(RTRIM(e.IpAddress)), N''),
          LOWER(CASE
            WHEN e.DeviceName LIKE N'%-[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'
              THEN LEFT(e.DeviceName, LEN(e.DeviceName) - 13)
            ELSE e.DeviceName
          END)
        )
      ORDER BY
        CASE WHEN e.IsManaged = 1 THEN 0 ELSE 1 END,
        CASE
          WHEN e.PolicyName IS NOT NULL
           AND e.PolicyName NOT LIKE N'%Default%'
          THEN 0 ELSE 1
        END,
        CASE
          WHEN e.DeviceName LIKE N'%-[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'
          THEN 1 ELSE 0
        END,
        LEN(ISNULL(e.DeviceName, N'')),
        e.EndpointId
    ) AS rn
  FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
  WHERE e.CustomerCode IS NOT NULL
    AND LTRIM(RTRIM(e.CustomerCode)) <> N''
),
latest AS (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  GROUP BY CustomerCode
)
SELECT
  r.CustomerCode,
  r.SnapshotDate AS AsOfDate,
  COUNT(*) AS DeviceCount,
  SUM(CASE WHEN r.IsManaged = 1 THEN 1 ELSE 0 END) AS ManagedCount,
  SUM(CASE WHEN ISNULL(r.IsManaged, 0) = 0 THEN 1 ELSE 0 END) AS UnmanagedCount,
  SUM(CASE WHEN r.MachineType = 5 THEN 1 ELSE 0 END) AS WorkstationCount,
  SUM(CASE WHEN r.MachineType = 6 THEN 1 ELSE 0 END) AS ServerCount,
  MAX(r.ImportedAt) AS LastImportAt
FROM ranked AS r
INNER JOIN latest AS m
  ON m.CustomerCode = r.CustomerCode
 AND m.mx = r.SnapshotDate
WHERE r.rn = 1
GROUP BY r.CustomerCode, r.SnapshotDate;
GO
PRINT N'vw_Kpi_Epp_Summary de-duplicated by FQDN/IP/clean name';
GO
