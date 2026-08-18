/*
  Run ONCE as Windows admin / sa (CREATE TABLE rights):
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i "C:\RPM-Assure\Sql\cove\430_Ensure_Cove_Map_Admin.sql"

  Does not require Dim_Customer.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Cove_PartnerMap
  (
    PartnerMapId uniqueidentifier NOT NULL
      CONSTRAINT DF_Dim_Cove_PartnerMap_Id DEFAULT (NEWSEQUENTIALID()),
    PartnerName nvarchar(200) NOT NULL,
    PartnerId int NULL,
    CustomerCode nvarchar(50) NOT NULL,
    Active bit NOT NULL CONSTRAINT DF_Dim_Cove_PartnerMap_Active DEFAULT (1),
    Notes nvarchar(400) NULL,
    CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Dim_Cove_PartnerMap_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Dim_Cove_PartnerMap_Updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Cove_PartnerMap PRIMARY KEY (PartnerMapId),
    CONSTRAINT UQ_Dim_Cove_PartnerMap_Name UNIQUE (PartnerName)
  );
  CREATE INDEX IX_Dim_Cove_PartnerMap_Customer ON dbo.Dim_Cove_PartnerMap (CustomerCode) WHERE Active = 1;
  PRINT 'Created Dim_Cove_PartnerMap';
END
GO

IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Cove_DeviceStatistics
  (
    SnapshotDate date NOT NULL,
    AccountId bigint NOT NULL,
    PartnerId int NULL,
    CustomerCode nvarchar(50) NULL,
    DeviceName nvarchar(200) NULL,
    MachineName nvarchar(200) NULL,
    UsedBytes bigint NULL,
    SelectedBytes bigint NULL,
    LastSuccessTime datetime2(3) NULL,
    LastBackupStatus nvarchar(100) NULL,
    Product nvarchar(100) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Cove_Dev_ImportedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Cove_DeviceStatistics PRIMARY KEY (SnapshotDate, AccountId)
  );
  CREATE INDEX IX_Cove_Device_Customer ON dbo.Cove_DeviceStatistics (CustomerCode, SnapshotDate);
  PRINT 'Created Cove_DeviceStatistics';
END
GO

;WITH src AS (
  SELECT * FROM (VALUES
    (N'AHI Carriers', N'AHIC', 2760329),
    (N'UVSS', N'UVSS', 2814015),
    (N'Able Tracers', N'ABLE', NULL),
    (N'Hydra Sales', N'HYDRA', NULL),
    (N'Redsun Raisins Northen Cape', N'RSR', NULL),
    (N'BHF (PNCS)', N'PCNS', 2925801),
    (N'Remote Site Solutions (Pty) Ltd', N'RSS', NULL),
    (N'Simply Bright Consulting', N'SBS', NULL),
    (N'RPM Resources', N'RPMINT', 2601580)
  ) v(PartnerName, CustomerCode, PartnerId)
)
MERGE dbo.Dim_Cove_PartnerMap AS t
USING src AS s ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  PartnerId = COALESCE(s.PartnerId, t.PartnerId),
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active)
  VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1);
GO

/* Grant collect login rights for ongoing loads */
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_Cove_PartnerMap TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Cove_DeviceStatistics TO [Rpm_collect];
  PRINT 'Granted Rpm_collect on Cove tables';
END
GO

SELECT COUNT(*) AS PartnerMapRows FROM dbo.Dim_Cove_PartnerMap;
PRINT 'Cove admin ensure complete.';
GO
