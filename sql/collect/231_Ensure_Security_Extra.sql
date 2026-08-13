/*
  CENTRAL — tables for security / license-product / health-detail collects
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i thisfile.sql
*/
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Syspro_OperGroup', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_OperGroup
  (
    RowId bigint NOT NULL IDENTITY(1,1),
    SnapshotDate date NOT NULL,
    InstanceName nvarchar(100) NOT NULL,
    OperatorCode nvarchar(50) NULL,
    GroupCode nvarchar(50) NULL,
    GroupName nvarchar(200) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Syspro_OG_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_OperGroup PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Syspro_OG_Snap ON dbo.Syspro_OperGroup (SnapshotDate, InstanceName);
  PRINT N'Created Syspro_OperGroup';
END
GO

IF OBJECT_ID(N'dbo.Syspro_OperAmend', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_OperAmend
  (
    RowId bigint NOT NULL IDENTITY(1,1),
    SnapshotDate date NOT NULL,
    InstanceName nvarchar(100) NOT NULL,
    OperatorCode nvarchar(50) NULL,
    AmendDate datetime2(3) NULL,
    AmendType nvarchar(50) NULL,
    Detail nvarchar(500) NULL,
    ChangedBy nvarchar(50) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Syspro_OA_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_OperAmend PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Syspro_OA_Snap ON dbo.Syspro_OperAmend (SnapshotDate, InstanceName);
  PRINT N'Created Syspro_OperAmend';
END
GO

IF OBJECT_ID(N'dbo.Syspro_UserProduct', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_UserProduct
  (
    RowId bigint NOT NULL IDENTITY(1,1),
    SnapshotDate date NOT NULL,
    InstanceName nvarchar(100) NOT NULL,
    ProductCode nvarchar(50) NULL,
    ProductName nvarchar(200) NULL,
    LicensedUsers int NULL,
    ExtraJson nvarchar(max) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Syspro_UP_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_UserProduct PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Syspro_UP_Snap ON dbo.Syspro_UserProduct (SnapshotDate, InstanceName);
  PRINT N'Created Syspro_UserProduct';
END
GO

PRINT N'Security/extra tables ready.';
GO
