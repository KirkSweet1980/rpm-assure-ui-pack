/*
  CENTRAL RPMAssure_App — ensure tables for Tier 1 SYSPRO collects
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 230_Ensure_Tier1_Tables.sql
*/
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Syspro_SystemLicense', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_SystemLicense
  (
    RowId           int NOT NULL IDENTITY(1,1),
    SnapshotDate    date NOT NULL,
    InstanceName    nvarchar(100) NOT NULL,
    ImportDate      datetime2(3) NULL,
    LicenseType     nvarchar(10) NULL,
    Users           int NULL,
    UserType        nvarchar(10) NULL,
    CompanyCount    int NULL,
    LicenseStart    datetime2(3) NULL,
    LicenseExpiry   datetime2(3) NULL,
    ProductName     nvarchar(100) NULL,
    ProductVersion  nvarchar(50) NULL,
    LicenseRegion   nvarchar(20) NULL,
    CustomerCode    nvarchar(50) NULL,
    CustomerName    nvarchar(200) NULL,
    LicenseSite     nvarchar(50) NULL,
    CustomerId      nvarchar(50) NULL,
    SaaS            nvarchar(5) NULL,
    ExcessUserFlag  nvarchar(5) NULL,
    ExcessUserExpiry datetime2(3) NULL,
    RawXml          nvarchar(max) NULL,
    ImportedAt      datetime2(3) NOT NULL CONSTRAINT DF_Syspro_Lic_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_SystemLicense PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Syspro_Lic_Snap ON dbo.Syspro_SystemLicense (SnapshotDate, InstanceName);
  PRINT N'Created Syspro_SystemLicense';
END
GO

IF OBJECT_ID(N'dbo.Syspro_TaskGroup', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_TaskGroup
  (
    RowId bigint NOT NULL IDENTITY(1,1),
    SnapshotDate date NOT NULL,
    InstanceName nvarchar(100) NOT NULL,
    OperatorCode nvarchar(50) NULL,
    TaskGroup nvarchar(100) NULL,
    AutoRun decimal(18,2) NULL,
    AutoCheck decimal(18,2) NULL,
    AutoMarkComplete decimal(18,2) NULL,
    PromptBetTasks decimal(18,2) NULL,
    SuppressErrors decimal(18,2) NULL,
    StopIfError decimal(18,2) NULL,
    AutoLockout decimal(18,2) NULL,
    KillAll decimal(18,2) NULL,
    EmailLogFile decimal(18,2) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Syspro_TG_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_TaskGroup PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Syspro_TG_Snap ON dbo.Syspro_TaskGroup (SnapshotDate, InstanceName);
  PRINT N'Created Syspro_TaskGroup';
END
GO

IF OBJECT_ID(N'dbo.Syspro_TaskItem', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_TaskItem
  (
    RowId bigint NOT NULL IDENTITY(1,1),
    SnapshotDate date NOT NULL,
    InstanceName nvarchar(100) NOT NULL,
    OperatorCode nvarchar(50) NULL,
    TaskGroup nvarchar(100) NULL,
    StartDate datetime2(3) NULL,
    SequenceNumber decimal(18,2) NULL,
    Description nvarchar(200) NULL,
    Comment nvarchar(200) NULL,
    TaskType nvarchar(20) NULL,
    ProgramName nvarchar(200) NULL,
    StartFolder nvarchar(200) NULL,
    Occurrance nvarchar(20) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Syspro_TI_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_TaskItem PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Syspro_TI_Snap ON dbo.Syspro_TaskItem (SnapshotDate, InstanceName);
  PRINT N'Created Syspro_TaskItem';
END
GO

/* HealthLog already in 100_Create — ensure exists */
IF OBJECT_ID(N'dbo.Syspro_HealthLog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_HealthLog
  (
    RowId int NOT NULL IDENTITY(1,1),
    SnapshotDate date NOT NULL,
    InstanceName nvarchar(100) NOT NULL,
    CompanyDb nvarchar(100) NULL,
    RunDateTime datetime2(3) NULL,
    Operator nvarchar(50) NULL,
    HealthFunction nvarchar(100) NULL,
    Description nvarchar(500) NULL,
    StatusFlag nvarchar(50) NULL,
    Message nvarchar(max) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Syspro_Health_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_HealthLog PRIMARY KEY (RowId)
  );
  PRINT N'Created Syspro_HealthLog';
END
GO

PRINT N'Tier 1 tables ready.';
GO
