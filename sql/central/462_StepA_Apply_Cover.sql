/*
  462 — Step A apply cover helpers
  1) Ensure AmsConfig rows
  2) Auto PillarSyspro where SqlInstanceName set
  3) Auto PillarPulseway where org map exists
  4) Does NOT turn on Cove/EPP/CSP (you choose in Step B+)
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Customer_AmsConfig (
    CustomerCode nvarchar(50) NOT NULL PRIMARY KEY,
    AmsEnabled bit NOT NULL CONSTRAINT DF_AmsCfg_En2 DEFAULT (1),
    PillarSyspro bit NOT NULL CONSTRAINT DF_AmsCfg_Sys2 DEFAULT (0),
    PillarSql bit NOT NULL CONSTRAINT DF_AmsCfg_Sql2 DEFAULT (0),
    PillarCove bit NOT NULL CONSTRAINT DF_AmsCfg_Cove2 DEFAULT (0),
    PillarPulseway bit NOT NULL CONSTRAINT DF_AmsCfg_Pw2 DEFAULT (0),
    PillarBitdefender bit NOT NULL CONSTRAINT DF_AmsCfg_Bd2 DEFAULT (0),
    PillarMicrosoftCsp bit NOT NULL CONSTRAINT DF_AmsCfg_Csp2 DEFAULT (0),
    Notes nvarchar(500) NULL,
    UpdatedAt datetime2(3) NULL,
    UpdatedBy nvarchar(100) NULL
  );
END
GO

INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, PillarSql, PillarCove, PillarPulseway, PillarBitdefender, PillarMicrosoftCsp, UpdatedAt, UpdatedBy)
SELECT c.CustomerCode, 1, 0, 0, 0, 0, 0, 0, SYSUTCDATETIME(), N'462_stepA'
FROM dbo.Dim_Customer c
WHERE c.Active = 1
  AND NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig a WHERE a.CustomerCode = c.CustomerCode);
PRINT CONCAT(N'AmsConfig rows inserted: ', @@ROWCOUNT);
GO

UPDATE a
SET PillarSyspro = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'462_stepA_syspro'
FROM dbo.Dim_Customer_AmsConfig a
INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode
WHERE c.Active = 1
  AND NULLIF(LTRIM(RTRIM(ISNULL(c.SqlInstanceName, N''))), N'') IS NOT NULL
  AND a.PillarSyspro = 0;
PRINT CONCAT(N'PillarSyspro set: ', @@ROWCOUNT);
GO

IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NOT NULL
BEGIN
  UPDATE a
  SET PillarPulseway = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'462_stepA_rmm'
  FROM dbo.Dim_Customer_AmsConfig a
  WHERE a.PillarPulseway = 0
    AND EXISTS (
      SELECT 1 FROM dbo.Dim_Pulseway_OrgMap m
      WHERE m.CustomerCode = a.CustomerCode AND m.Active = 1
    );
  PRINT CONCAT(N'PillarPulseway set from map: ', @@ROWCOUNT);
END
GO

/* Keep Cove/EPP/CSP off unless already set by you */
PRINT N'Cove/EPP/CSP left unchanged (set only when service is sold).';

SELECT
  c.CustomerCode,
  c.DisplayName,
  a.PillarSyspro,
  a.PillarPulseway,
  a.PillarCove,
  a.PillarBitdefender,
  a.PillarMicrosoftCsp
FROM dbo.Dim_Customer c
INNER JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = c.CustomerCode
WHERE c.Active = 1
ORDER BY c.DisplayName;

PRINT N'462 Step A cover apply complete.';
GO
