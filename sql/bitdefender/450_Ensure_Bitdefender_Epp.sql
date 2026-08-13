/*
  450 - Bitdefender GravityZone / RPM End Point Protection tables
  Source: network/getEndpointsList + hostname→CustomerCode map
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Bitdefender_NameMap (
    Pattern        nvarchar(100)  NOT NULL,  -- match against Name + Fqdn (LIKE or starts-with)
    CustomerCode   nvarchar(50)   NOT NULL,
    MatchType      nvarchar(20)   NOT NULL CONSTRAINT DF_BdNameMap_Type DEFAULT (N'Contains'), -- Contains|Prefix|Exact
    Priority       int            NOT NULL CONSTRAINT DF_BdNameMap_Pri DEFAULT (100),
    Notes          nvarchar(200)  NULL,
    Active         bit            NOT NULL CONSTRAINT DF_BdNameMap_Active DEFAULT (1),
    UpdatedAtUtc   datetime2(3)   NOT NULL CONSTRAINT DF_BdNameMap_Upd DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Bitdefender_NameMap PRIMARY KEY (Pattern, CustomerCode)
  );
  PRINT N'Dim_Bitdefender_NameMap created';
END
GO

-- Seed high-confidence hostname patterns (safe re-run)
MERGE dbo.Dim_Bitdefender_NameMap AS t
USING (VALUES
  (N'AHIC', N'AHIC', N'Prefix', 10, N'AHI Carrier servers'),
  (N'ahi-carrier', N'AHIC', N'Contains', 20, N'FQDN domain'),
  (N'HYDRA', N'HYDRA', N'Prefix', 10, N'Hydrasales'),
  (N'RSR-', N'RSR', N'Prefix', 10, N'Redsun Raisins'),
  (N'UVSS', N'UVSS', N'Prefix', 10, N'UVSS'),
  (N'RPM-', N'RPMINT', N'Prefix', 10, N'RPM Resources servers'),
  (N'rpmresources', N'RPMINT', N'Contains', 20, N'RPM FQDN'),
  (N'RPMWINRM', N'RPMINT', N'Prefix', 10, N'Central winrm'),
  (N'LUKERPM', N'RPMINT', N'Prefix', 30, N'RPM staff'),
  (N'METSI', N'METSI', N'Prefix', 10, N'Metsi'),
  (N'ABLE', N'ABLE', N'Prefix', 10, N'Able Tracers'),
  (N'RSS-', N'RSS', N'Prefix', 10, N'Remote Site Solutions'),
  (N'PCNS', N'BHF', N'Prefix', 10, N'BHF / PCNS'),
  (N'SBS-', N'SBS', N'Prefix', 10, N'Simply Bright')
) AS s(Pattern, CustomerCode, MatchType, Priority, Notes)
ON t.Pattern = s.Pattern AND t.CustomerCode = s.CustomerCode
WHEN MATCHED THEN UPDATE SET
  MatchType = s.MatchType, Priority = s.Priority, Notes = s.Notes, Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (Pattern, CustomerCode, MatchType, Priority, Notes, Active)
  VALUES (s.Pattern, s.CustomerCode, s.MatchType, s.Priority, s.Notes, 1);
PRINT N'Dim_Bitdefender_NameMap seeded';
GO

IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_Endpoints (
    SnapshotDate            date            NOT NULL,
    EndpointId              nvarchar(40)    NOT NULL,
    CustomerCode            nvarchar(50)    NULL,
    DeviceName              nvarchar(200)   NULL,
    Fqdn                    nvarchar(255)   NULL,
    IpAddress               nvarchar(64)    NULL,
    GroupId                 nvarchar(40)    NULL,
    IsManaged               bit             NULL,
    MachineType             int             NULL,  -- GZ machineType
    OperatingSystem         nvarchar(200)   NULL,
    PolicyId                nvarchar(40)    NULL,
    PolicyName              nvarchar(200)   NULL,
    MacAddresses            nvarchar(400)   NULL,
    ImportedAt              datetime2(3)    NOT NULL CONSTRAINT DF_BdEp_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_Endpoints PRIMARY KEY (SnapshotDate, EndpointId)
  );
  CREATE INDEX IX_Bitdefender_Endpoints_Code ON dbo.Bitdefender_Endpoints (CustomerCode, SnapshotDate);
  PRINT N'Bitdefender_Endpoints created';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'PolicyName') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD PolicyName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'MacAddresses') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD MacAddresses nvarchar(400) NULL;
  PRINT N'Bitdefender_Endpoints ready';
END
GO

IF OBJECT_ID(N'dbo.Bitdefender_LicenseSnapshot', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_LicenseSnapshot (
    SnapshotDate       date          NOT NULL,
    UsedSlots          int           NULL,
    ReservedSlots      int           NULL,
    TotalSlots         int           NULL,
    EndSubscription    date          NULL,
    ExpiryDate         date          NULL,
    RawJson            nvarchar(max) NULL,
    ImportedAt         datetime2(3)  NOT NULL CONSTRAINT DF_BdLic_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_LicenseSnapshot PRIMARY KEY (SnapshotDate)
  );
  PRINT N'Bitdefender_LicenseSnapshot created';
END
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Epp_Summary
AS
SELECT
  e.CustomerCode,
  e.SnapshotDate AS AsOfDate,
  COUNT(*) AS DeviceCount,
  SUM(CASE WHEN e.IsManaged = 1 THEN 1 ELSE 0 END) AS ManagedCount,
  SUM(CASE WHEN ISNULL(e.IsManaged, 0) = 0 THEN 1 ELSE 0 END) AS UnmanagedCount,
  SUM(CASE WHEN e.MachineType = 5 THEN 1 ELSE 0 END) AS WorkstationCount, -- type 5 often workstations
  SUM(CASE WHEN e.MachineType = 6 THEN 1 ELSE 0 END) AS ServerCount,      -- type 6 often servers
  MAX(e.ImportedAt) AS LastImportAt
FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  GROUP BY CustomerCode
) m ON m.CustomerCode = e.CustomerCode AND m.mx = e.SnapshotDate
WHERE e.CustomerCode IS NOT NULL
GROUP BY e.CustomerCode, e.SnapshotDate;
GO
PRINT N'vw_Kpi_Epp_Summary ready';
GO

CREATE OR ALTER VIEW dbo.vw_Bitdefender_Unmapped_Latest
AS
SELECT
  e.DeviceName,
  e.Fqdn,
  e.EndpointId,
  e.SnapshotDate,
  e.IpAddress,
  e.OperatingSystem
FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
WHERE e.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND (e.CustomerCode IS NULL OR LTRIM(RTRIM(e.CustomerCode)) = N'');
GO
PRINT N'vw_Bitdefender_Unmapped_Latest ready';
GO
