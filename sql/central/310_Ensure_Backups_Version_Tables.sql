/*
  CENTRAL — SQL backups detail + SYSPRO version/hotfix
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i 310_Ensure_Backups_Version_Tables.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.Sql_Backups', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Sql_Backups
  (
    SnapshotDate     date NOT NULL,
    InstanceName     nvarchar(100) NOT NULL,
    DatabaseName     nvarchar(128) NOT NULL,
    LastFullBackup   datetime2(3) NULL,
    LastDiffBackup   datetime2(3) NULL,
    LastLogBackup    datetime2(3) NULL,
    LastBackupStatus nvarchar(30) NULL,
    FullAgeHours     int NULL,
    ImportedAt       datetime2(3) NOT NULL
      CONSTRAINT DF_Sql_Backups_ImportedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Sql_Backups PRIMARY KEY (SnapshotDate, InstanceName, DatabaseName)
  );
  PRINT N'Created Sql_Backups';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Sql_Backups', N'LastBackupStatus') IS NULL
    ALTER TABLE dbo.Sql_Backups ADD LastBackupStatus nvarchar(30) NULL;
  IF COL_LENGTH(N'dbo.Sql_Backups', N'FullAgeHours') IS NULL
    ALTER TABLE dbo.Sql_Backups ADD FullAgeHours int NULL;
  PRINT N'Sql_Backups ready (columns checked)';
END
GO

IF OBJECT_ID(N'dbo.Sql_BackupFailures', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Sql_BackupFailures
  (
    SnapshotDate   date NOT NULL,
    InstanceName   nvarchar(100) NOT NULL,
    FailureAt      datetime2(3) NULL,
    JobName        nvarchar(200) NULL,
    DatabaseName   nvarchar(128) NULL,
    StepName       nvarchar(200) NULL,
    Message        nvarchar(max) NULL,
    RunStatus      int NULL,
    ImportedAt     datetime2(3) NOT NULL
      CONSTRAINT DF_Sql_BackupFailures_Imp DEFAULT (SYSUTCDATETIME()),
    RowId          bigint NOT NULL IDENTITY(1,1)
      CONSTRAINT PK_Sql_BackupFailures PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Sql_BackupFailures_Snap
    ON dbo.Sql_BackupFailures (SnapshotDate, InstanceName);
  PRINT N'Created Sql_BackupFailures';
END
ELSE PRINT N'Sql_BackupFailures exists';
GO

IF OBJECT_ID(N'dbo.Syspro_VersionInfo', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_VersionInfo
  (
    SnapshotDate     date NOT NULL,
    InstanceName     nvarchar(100) NOT NULL,
    ProductName      nvarchar(100) NULL,
    ProductVersion   nvarchar(50) NULL,
    BuildNumber      nvarchar(50) NULL,
    LicenseType      nvarchar(20) NULL,
    Users            int NULL,
    CompanyCount     int NULL,
    LicenseExpiry    datetime2(3) NULL,
    CustomerName     nvarchar(200) NULL,
    ImportDate       datetime2(3) NULL,
    ServerName       nvarchar(100) NULL,
    ImportedAt       datetime2(3) NOT NULL
      CONSTRAINT DF_Syspro_VersionInfo_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_VersionInfo PRIMARY KEY (SnapshotDate, InstanceName)
  );
  PRINT N'Created Syspro_VersionInfo';
END
ELSE PRINT N'Syspro_VersionInfo exists';
GO

IF OBJECT_ID(N'dbo.Syspro_Hotfix', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_Hotfix
  (
    SnapshotDate     date NOT NULL,
    InstanceName     nvarchar(100) NOT NULL,
    HotfixCode      nvarchar(50) NOT NULL,
    HotfixName      nvarchar(200) NULL,
    Description      nvarchar(max) NULL,
    Installed        bit NOT NULL
      CONSTRAINT DF_Syspro_Hotfix_Installed DEFAULT (1),
    InstalledAt      datetime2(3) NULL,
    SourceTable      nvarchar(100) NULL,
    ImportedAt       datetime2(3) NOT NULL
      CONSTRAINT DF_Syspro_Hotfix_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Syspro_Hotfix PRIMARY KEY (SnapshotDate, InstanceName, HotfixCode)
  );
  PRINT N'Created Syspro_Hotfix';
END
ELSE PRINT N'Syspro_Hotfix exists';
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Sql_Backups TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Sql_BackupFailures TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Syspro_VersionInfo TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Syspro_Hotfix TO [Rpm_collect];
  PRINT N'Granted rights to Rpm_collect';
END
GO

PRINT N'310 done.';
GO
