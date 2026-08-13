/*
  471b - Step B APPLY (fixed PillarCove compile issue)
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Cove_PartnerMap
  (
    PartnerMapId uniqueidentifier NOT NULL
      CONSTRAINT DF_Dim_Cove_PartnerMap_Id2 DEFAULT (NEWSEQUENTIALID()),
    PartnerName nvarchar(200) NOT NULL,
    PartnerId int NULL,
    CustomerCode nvarchar(50) NOT NULL,
    Active bit NOT NULL CONSTRAINT DF_Dim_Cove_PartnerMap_Active2 DEFAULT (1),
    Notes nvarchar(400) NULL,
    CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Dim_Cove_PartnerMap_Created2 DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Dim_Cove_PartnerMap_Updated2 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Cove_PartnerMap2 PRIMARY KEY (PartnerMapId),
    CONSTRAINT UQ_Dim_Cove_PartnerMap_Name2 UNIQUE (PartnerName)
  );
END
GO

;WITH canon AS (
  SELECT * FROM (VALUES
    (N'AHI Carriers',                    N'AHIC',   2760329, N'live PartnerId from devices'),
    (N'AHI Carrier',                     N'AHIC',   2760329, N'alias'),
    (N'UVSS',                            N'UVSS',   2814015, N'live'),
    (N'Unique Ventilation Systems',      N'UVSS',   2814015, N'alias'),
    (N'Able Tracers',                    N'ABLE',   2602723, N'live'),
    (N'Able Traces',                     N'ABLE',   2602723, N'alias old spelling'),
    (N'Hydra Sales',                     N'HYDRA',  2660606, N'live'),
    (N'Hydra',                           N'HYDRA',  2660606, N'alias'),
    (N'Redsun Raisins Northen Cape',     N'RSR',    2867685, N'Cove spelling Northen'),
    (N'Redsun Raisins Northern Cape',    N'RSR',    2867685, N'alias correct spelling'),
    (N'Redsun Raisins',                  N'RSR',    2867685, N'alias'),
    (N'Remote Site Solutions (Pty) Ltd', N'RSS',    2602886, N'live Product name'),
    (N'Remote Site Solutions',           N'RSS',    2602886, N'alias'),
    (N'RPM Resources',                   N'RPMINT', 2601586, N'live'),
    (N'RPM Internal',                    N'RPMINT', 2601586, N'alias'),
    (N'BHF (PNCS)',                      N'BHF',    2925801, N'BHF estate / was PCNS code'),
    (N'PCNS',                            N'BHF',    2925801, N'alias old code name'),
    (N'Simply Bright Consulting',        N'SBS',    2932715, N'not on master 12'),
    (N'Simply Bright',                   N'SBS',    2932715, N'alias')
  ) v(PartnerName, CustomerCode, PartnerId, Notes)
)
MERGE dbo.Dim_Cove_PartnerMap AS t
USING canon AS s
  ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  PartnerId    = s.PartnerId,
  Notes        = s.Notes,
  Active       = 1,
  UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active, Notes)
  VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1, s.Notes);

PRINT N'Merge applied - see B6';
GO

/* SBS customer for map FK - use dynamic insert only if missing columns ok */
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'SBS')
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Customer', N'CreatedAt') IS NOT NULL
    EXEC(N'INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
           VALUES (N''SBS'', N''Simply Bright Consulting'', 0, NULL, SYSUTCDATETIME(), SYSUTCDATETIME())');
  ELSE
    EXEC(N'INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active)
           VALUES (N''SBS'', N''Simply Bright Consulting'', 0)');
  PRINT N'Inserted SBS (Active=0)';
END
GO

UPDATE m
SET Active = 0,
    Notes = ISNULL(Notes, N'') + N' | deactivated Step B orphan',
    UpdatedAtUtc = SYSUTCDATETIME()
FROM dbo.Dim_Cove_PartnerMap m
WHERE m.Active = 1
  AND NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = m.CustomerCode)
  AND m.CustomerCode NOT IN (N'SBS');

PRINT N'Deactivated orphan maps: ' + CAST(@@ROWCOUNT AS nvarchar(20));
GO

UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Cove_DeviceStatistics d
INNER JOIN dbo.Dim_Cove_PartnerMap m
  ON m.Active = 1
 AND d.PartnerId IS NOT NULL
 AND m.PartnerId = d.PartnerId
WHERE ISNULL(d.CustomerCode, N'') <> m.CustomerCode;

PRINT N'Device rows restamped by PartnerId: ' + CAST(@@ROWCOUNT AS nvarchar(20));
GO

UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Cove_DeviceStatistics d
INNER JOIN dbo.Dim_Cove_PartnerMap m
  ON m.Active = 1
 AND m.PartnerName = d.Product
WHERE ISNULL(d.CustomerCode, N'') <> m.CustomerCode;

PRINT N'Device rows restamped by Product name: ' + CAST(@@ROWCOUNT AS nvarchar(20));
GO

/* AmsConfig PillarCove - column is on AmsConfig not Dim_Customer */
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCove') IS NULL
  BEGIN
    ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarCove bit NOT NULL
      CONSTRAINT DF_AmsCfg_PillarCove_471 DEFAULT (0);
    PRINT N'Added Dim_Customer_AmsConfig.PillarCove';
  END
END
GO

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, PillarSql, PillarCove, PillarPulseway, PillarBitdefender, PillarMicrosoftCsp, UpdatedAt, UpdatedBy)
  SELECT c.CustomerCode, 1, 0, 0, 0, 0, 0, 0, SYSUTCDATETIME(), N'471_stepB'
  FROM dbo.Dim_Customer c
  WHERE c.Active = 1
    AND NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig a WHERE a.CustomerCode = c.CustomerCode);

  EXEC(N'
  UPDATE a
  SET PillarCove = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N''471_stepB''
  FROM dbo.Dim_Customer_AmsConfig a
  INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = a.CustomerCode
  WHERE c.Active = 1
    AND EXISTS (
      SELECT 1 FROM dbo.Dim_Cove_PartnerMap m
      WHERE m.CustomerCode = c.CustomerCode AND m.Active = 1
    )
    AND EXISTS (
      SELECT 1 FROM dbo.Cove_DeviceStatistics d
      WHERE d.CustomerCode = c.CustomerCode
    );
  PRINT N''AmsConfig PillarCove rows updated: '' + CAST(@@ROWCOUNT AS nvarchar(20));
  ');
END
GO

/* Optional Dim_Customer.PillarCove via dynamic SQL only if column exists */
IF COL_LENGTH(N'dbo.Dim_Customer', N'PillarCove') IS NOT NULL
BEGIN
  EXEC(N'
  UPDATE c
  SET PillarCove = 1
  FROM dbo.Dim_Customer c
  WHERE c.Active = 1
    AND EXISTS (SELECT 1 FROM dbo.Dim_Cove_PartnerMap m WHERE m.CustomerCode = c.CustomerCode AND m.Active = 1)
    AND EXISTS (SELECT 1 FROM dbo.Cove_DeviceStatistics d WHERE d.CustomerCode = c.CustomerCode);
  PRINT N''Dim_Customer.PillarCove set: '' + CAST(@@ROWCOUNT AS nvarchar(20));
  ');
END
ELSE
  PRINT N'Dim_Customer has no PillarCove column (OK - using AmsConfig only)';
GO

PRINT N'=== B6) Active map after cleanup ===';
SELECT PartnerName, PartnerId, CustomerCode, Active, Notes
FROM dbo.Dim_Cove_PartnerMap
WHERE Active = 1
ORDER BY CustomerCode, PartnerName;

PRINT N'=== B7) Device counts by CustomerCode (latest snap) ===';
;WITH latest AS (SELECT MAX(SnapshotDate) AS d FROM dbo.Cove_DeviceStatistics)
SELECT
  d.CustomerCode,
  c.DisplayName,
  COUNT(*) AS Devices,
  SUM(CASE WHEN d.LastBackupStatus = N'OK' THEN 1 ELSE 0 END) AS OkCnt,
  SUM(CASE WHEN d.LastBackupStatus <> N'OK' OR d.LastBackupStatus IS NULL THEN 1 ELSE 0 END) AS NotOkCnt
FROM dbo.Cove_DeviceStatistics d
INNER JOIN latest l ON l.d = d.SnapshotDate
LEFT JOIN dbo.Dim_Customer c ON c.CustomerCode = d.CustomerCode
GROUP BY d.CustomerCode, c.DisplayName
ORDER BY d.CustomerCode;

PRINT N'=== B8) PillarCove flags (AmsConfig) ===';
SELECT c.CustomerCode, c.DisplayName, ISNULL(a.PillarCove,0) AS PillarCove
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = c.CustomerCode
WHERE c.Active = 1
ORDER BY c.DisplayName;

PRINT N'471b Step B APPLY complete.';
GO
