USE RPMAssure_App;
GO
SET NOCOUNT ON;
/*
  Ensure AmsConfig pillars exist for multi-service cover.
  Inference also uses SqlInstanceName / maps / inventory when flags are off.
*/
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Customer_AmsConfig (
    CustomerCode nvarchar(50) NOT NULL PRIMARY KEY,
    AmsEnabled bit NOT NULL CONSTRAINT DF_AmsCfg_En DEFAULT (1),
    PillarSyspro bit NOT NULL CONSTRAINT DF_AmsCfg_Sys DEFAULT (0),
    PillarSql bit NOT NULL CONSTRAINT DF_AmsCfg_Sql DEFAULT (0),
    PillarCove bit NOT NULL CONSTRAINT DF_AmsCfg_Cove DEFAULT (0),
    PillarPulseway bit NOT NULL CONSTRAINT DF_AmsCfg_Pw DEFAULT (0),
    PillarBitdefender bit NOT NULL CONSTRAINT DF_AmsCfg_Bd DEFAULT (0),
    PillarMicrosoftCsp bit NOT NULL CONSTRAINT DF_AmsCfg_Csp DEFAULT (0),
    UpdatedAt datetime2(3) NULL,
    UpdatedBy nvarchar(100) NULL
  );
END
GO
-- Seed missing config rows (all pillars off — inference still applies)
INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, PillarSql, PillarCove, PillarPulseway, PillarBitdefender, PillarMicrosoftCsp)
SELECT c.CustomerCode, 1, 0, 0, 0, 0, 0, 0
FROM dbo.Dim_Customer c
WHERE c.Active = 1
  AND NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig a WHERE a.CustomerCode = c.CustomerCode);
GO
-- Auto-flag SYSPRO where instance present
UPDATE a SET PillarSyspro = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'460_cover'
FROM dbo.Dim_Customer_AmsConfig a
INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode
WHERE NULLIF(LTRIM(RTRIM(c.SqlInstanceName)), N'') IS NOT NULL AND a.PillarSyspro = 0;
GO
-- Auto-flag RMM where org map or pulseway org name
UPDATE a SET PillarPulseway = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'460_cover'
FROM dbo.Dim_Customer_AmsConfig a
INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode
WHERE a.PillarPulseway = 0
  AND (
    NULLIF(LTRIM(RTRIM(c.PulsewayOrgName)), N'') IS NOT NULL
    OR EXISTS (SELECT 1 FROM dbo.Dim_Pulseway_OrgMap m WHERE m.CustomerCode = c.CustomerCode AND m.Active = 1)
  );
GO
PRINT N'460 multi-pillar cover helpers applied.';
GO
