/*
  461 — Step A estate hygiene REPORT (read-only)
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

PRINT N'=== A1) Master customer names ===';
SELECT CustomerCode, DisplayName, Active, SqlInstanceName
FROM dbo.Dim_Customer
WHERE CustomerCode IN (
  N'RPMINT',N'AHIC',N'IB',N'MEDIPOS',N'YLJ',N'UVSS',
  N'RSR',N'ABLE',N'BHF',N'HYDRA',N'VAULT',N'RSS'
)
ORDER BY DisplayName;

PRINT N'=== A2) Other active customers ===';
SELECT CustomerCode, DisplayName, Active, SqlInstanceName
FROM dbo.Dim_Customer
WHERE Active = 1
  AND CustomerCode NOT IN (
    N'RPMINT',N'AHIC',N'IB',N'MEDIPOS',N'YLJ',N'UVSS',
    N'RSR',N'ABLE',N'BHF',N'HYDRA',N'VAULT',N'RSS'
  )
ORDER BY CustomerCode;

PRINT N'=== A3) Pillar flags ===';
SELECT
  c.CustomerCode,
  c.DisplayName,
  c.Active,
  ISNULL(a.PillarSyspro, 0)       AS FlagSyspro,
  ISNULL(a.PillarPulseway, 0)     AS FlagRmm,
  ISNULL(a.PillarCove, 0)         AS FlagCove,
  ISNULL(a.PillarBitdefender, 0)  AS FlagEpp,
  ISNULL(a.PillarMicrosoftCsp, 0) AS FlagCsp,
  CASE WHEN NULLIF(LTRIM(RTRIM(c.SqlInstanceName)), N'') IS NOT NULL THEN 1 ELSE 0 END AS HasSqlInstance
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = c.CustomerCode
WHERE c.Active = 1
ORDER BY c.DisplayName;

PRINT N'=== A4) SYSPRO operators freshness ===';
SELECT
  c.CustomerCode,
  c.DisplayName,
  c.SqlInstanceName,
  (SELECT COUNT(*) FROM dbo.Syspro_Operators so
   WHERE so.InstanceName = c.SqlInstanceName) AS OpsCnt,
  (SELECT MAX(ImportedAt) FROM dbo.Syspro_Operators so
   WHERE so.InstanceName = c.SqlInstanceName) AS LastImport
FROM dbo.Dim_Customer c
WHERE c.Active = 1
  AND NULLIF(LTRIM(RTRIM(ISNULL(c.SqlInstanceName, N''))), N'') IS NOT NULL
ORDER BY LastImport DESC;

PRINT N'=== A5) Pulseway org map ===';
IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NOT NULL
  SELECT OrganizationName, CustomerCode, Active FROM dbo.Dim_Pulseway_OrgMap ORDER BY CustomerCode;
ELSE IF OBJECT_ID(N'dbo.Dim_PulsewayOrgMap', N'U') IS NOT NULL
  SELECT * FROM dbo.Dim_PulsewayOrgMap;
ELSE
  PRINT N'(no Pulseway map table)';

PRINT N'=== A6) Cove map / partners (preview for Step B) ===';
IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NOT NULL
  SELECT * FROM dbo.Dim_Cove_PartnerMap;
ELSE IF OBJECT_ID(N'dbo.Dim_CovePartnerMap', N'U') IS NOT NULL
  SELECT * FROM dbo.Dim_CovePartnerMap;
ELSE
  PRINT N'(no Cove map yet - expected)';

IF OBJECT_ID(N'dbo.Cove_Partners', N'U') IS NOT NULL
  SELECT TOP 40 * FROM dbo.Cove_Partners;
ELSE IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
BEGIN
  PRINT N'Cove_DeviceStatistics partners (distinct):';
  SELECT TOP 40 * FROM dbo.Cove_DeviceStatistics;
END
ELSE
  PRINT N'(no Cove device tables yet)';

PRINT N'=== Step A REPORT complete ===';
GO
