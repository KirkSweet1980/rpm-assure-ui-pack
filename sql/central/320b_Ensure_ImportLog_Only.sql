USE RPMAssure_App;
GO
SET NOCOUNT ON;
GO
IF OBJECT_ID(N'dbo.Dim_Syspro_HotfixBaseline', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Syspro_HotfixBaseline (
    BaselineId uniqueidentifier NOT NULL CONSTRAINT DF_HfBase_Id DEFAULT (NEWSEQUENTIALID()),
    ProductFamily nvarchar(50) NOT NULL CONSTRAINT DF_HfBase_Fam DEFAULT (N'SYSPRO8'),
    ReleaseLabel nvarchar(50) NULL,
    HotfixCode nvarchar(50) NOT NULL,
    Title nvarchar(300) NULL,
    Synopsis nvarchar(max) NULL,
    Severity nvarchar(30) NULL,
    KbUrl nvarchar(500) NULL,
    SourceFile nvarchar(260) NULL,
    Active bit NOT NULL CONSTRAINT DF_HfBase_Act DEFAULT (1),
    ImportedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_HfBase_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Syspro_HotfixBaseline PRIMARY KEY (BaselineId)
  );
  PRINT N'Created Dim_Syspro_HotfixBaseline';
END
ELSE PRINT N'Dim_Syspro_HotfixBaseline exists';
GO
IF OBJECT_ID(N'dbo.Syspro_HotfixInstalled', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_HotfixInstalled (
    SnapshotDate date NOT NULL,
    InstanceName nvarchar(100) NOT NULL,
    HotfixCode nvarchar(50) NOT NULL,
    Title nvarchar(300) NULL,
    InstalledAt datetime2(3) NULL,
    Source nvarchar(50) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_HfInst_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_HotfixInstalled PRIMARY KEY (SnapshotDate, InstanceName, HotfixCode)
  );
  PRINT N'Created Syspro_HotfixInstalled';
END
GO
IF OBJECT_ID(N'dbo.Syspro_HotfixImportLog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_HotfixImportLog (
    LogId bigint NOT NULL IDENTITY(1,1) CONSTRAINT PK_Syspro_HotfixImportLog PRIMARY KEY,
    ImportKind nvarchar(30) NOT NULL,
    CustomerCode nvarchar(50) NULL,
    InstanceName nvarchar(100) NULL,
    SourceFile nvarchar(260) NULL,
    RowsImported int NULL,
    Notes nvarchar(500) NULL,
    ImportedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_HfImpLog_At DEFAULT (SYSUTCDATETIME())
  );
  PRINT N'Created Syspro_HotfixImportLog';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Syspro_HotfixImportLog', N'RowCount') IS NOT NULL
     AND COL_LENGTH(N'dbo.Syspro_HotfixImportLog', N'RowsImported') IS NULL
    EXEC sp_rename N'dbo.Syspro_HotfixImportLog.RowCount', N'RowsImported', N'COLUMN';
  PRINT N'Syspro_HotfixImportLog exists';
END
GO
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_Syspro_HotfixBaseline TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Syspro_HotfixInstalled TO [Rpm_collect];
  GRANT SELECT, INSERT ON dbo.Syspro_HotfixImportLog TO [Rpm_collect];
END
GO
PRINT N'320b done';
GO
