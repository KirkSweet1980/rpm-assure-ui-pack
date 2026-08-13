/*
  470 — Step B REPORT: Cove partner map hygiene
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

PRINT N'=== B1) Active partner map (current) ===';
SELECT PartnerName, PartnerId, CustomerCode, Active, Notes
FROM dbo.Dim_Cove_PartnerMap
ORDER BY CustomerCode, PartnerName;

PRINT N'=== B2) Map points to missing / inactive customer ===';
SELECT m.PartnerName, m.PartnerId, m.CustomerCode, c.DisplayName, c.Active
FROM dbo.Dim_Cove_PartnerMap m
LEFT JOIN dbo.Dim_Customer c ON c.CustomerCode = m.CustomerCode
WHERE m.Active = 1
  AND (c.CustomerCode IS NULL OR c.Active = 0)
ORDER BY m.CustomerCode;

PRINT N'=== B3) Latest snapshot PartnerId + Product vs map CustomerCode ===';
;WITH latest AS (
  SELECT MAX(SnapshotDate) AS d FROM dbo.Cove_DeviceStatistics
),
dev AS (
  SELECT
    d.PartnerId,
    d.Product AS PartnerName,
    d.CustomerCode AS DeviceCustomerCode,
    COUNT(*) AS DeviceCnt,
    SUM(CASE WHEN d.LastBackupStatus NOT IN (N'OK', N'Success', N'success')
              OR d.LastBackupStatus IS NULL THEN 1 ELSE 0 END) AS NotOkCnt
  FROM dbo.Cove_DeviceStatistics d
  INNER JOIN latest l ON l.d = d.SnapshotDate
  GROUP BY d.PartnerId, d.Product, d.CustomerCode
)
SELECT
  dev.PartnerId,
  dev.PartnerName,
  dev.DeviceCustomerCode,
  dev.DeviceCnt,
  dev.NotOkCnt,
  m.CustomerCode AS MapCustomerCode,
  m.PartnerName AS MapPartnerName
FROM dev
LEFT JOIN dbo.Dim_Cove_PartnerMap m
  ON m.Active = 1
 AND (
      (dev.PartnerId IS NOT NULL AND m.PartnerId = dev.PartnerId)
   OR (m.PartnerName = dev.PartnerName)
 )
ORDER BY dev.PartnerName;

PRINT N'=== B4) Unmapped devices (no map by PartnerId or Product) ===';
;WITH latest AS (
  SELECT MAX(SnapshotDate) AS d FROM dbo.Cove_DeviceStatistics
)
SELECT d.PartnerId, d.Product, d.CustomerCode, COUNT(*) AS Cnt
FROM dbo.Cove_DeviceStatistics d
INNER JOIN latest l ON l.d = d.SnapshotDate
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.Dim_Cove_PartnerMap m
  WHERE m.Active = 1
    AND (
      (d.PartnerId IS NOT NULL AND m.PartnerId = d.PartnerId)
      OR m.PartnerName = d.Product
      OR m.CustomerCode = d.CustomerCode
    )
)
GROUP BY d.PartnerId, d.Product, d.CustomerCode
ORDER BY d.Product;

PRINT N'=== B5) Proposed canonical map (read-only preview) ===';
PRINT N'AHIC=2760329, UVSS=2814015, ABLE=2602723, HYDRA=2660606, RSR=2867685, RSS=2602886?, RPMINT=2601586, BHF=2925801, SBS=2932715';
PRINT N'=== Step B REPORT complete — run 471 to apply cleanup ===';
GO
