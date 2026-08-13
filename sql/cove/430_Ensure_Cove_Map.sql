/*
  RPM Cyber Backup - partner map + customer pillar flag
  Run on central: RPMAssure_App
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.Dim_Customer', N'PillarCove') IS NULL
BEGIN
  ALTER TABLE dbo.Dim_Customer ADD PillarCove bit NOT NULL
    CONSTRAINT DF_Dim_Customer_PillarCove DEFAULT (0);
  PRINT 'Added Dim_Customer.PillarCove';
END
GO

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

/* Ensure Cove_DeviceStatistics has expected columns (idempotent) */
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

PRINT 'Cove map ready.';
GO
