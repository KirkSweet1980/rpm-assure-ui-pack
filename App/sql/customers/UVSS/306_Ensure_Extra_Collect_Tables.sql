/*
  CENTRAL - ensure tables for Audit / Diag / SqlHealth collect
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i 306_Ensure_Extra_Collect_Tables.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Syspro_SystemAuditLog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_SystemAuditLog (
    SnapshotDate   date            NOT NULL,
    InstanceName   nvarchar(100)   NOT NULL,
    CompanyDb      nvarchar(100)   NULL,
    EventAt        datetime2(3)    NULL,
    OperatorCode   nvarchar(50)    NULL,
    ProgramName    nvarchar(100)   NULL,
    ActionCode     nvarchar(100)   NULL,
    Detail         nvarchar(max)   NULL,
    SourceTable    nvarchar(100)   NULL,
    ImportedAt     datetime2(3)    NOT NULL
      CONSTRAINT DF_Syspro_SystemAuditLog_Imp DEFAULT (SYSUTCDATETIME()),
    RowId          bigint          NOT NULL IDENTITY(1,1)
      CONSTRAINT PK_Syspro_SystemAuditLog PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Syspro_SystemAuditLog_Snap
    ON dbo.Syspro_SystemAuditLog (SnapshotDate, InstanceName);
  PRINT N'Created Syspro_SystemAuditLog';
END
ELSE PRINT N'Syspro_SystemAuditLog exists';

IF OBJECT_ID(N'dbo.Syspro_DiagSummary', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_DiagSummary (
    SnapshotDate   date            NOT NULL,
    InstanceName   nvarchar(100)   NOT NULL,
    CompanyDb      nvarchar(100)   NULL,
    DiagCode       nvarchar(50)    NULL,
    DiagName       nvarchar(200)   NULL,
    Severity       nvarchar(50)    NULL,
    StatusText     nvarchar(100)   NULL,
    MessageText    nvarchar(max)   NULL,
    CheckedAt      datetime2(3)    NULL,
    ImportedAt     datetime2(3)    NOT NULL
      CONSTRAINT DF_Syspro_DiagSummary_Imp DEFAULT (SYSUTCDATETIME()),
    RowId          bigint          NOT NULL IDENTITY(1,1)
      CONSTRAINT PK_Syspro_DiagSummary PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Syspro_DiagSummary_Snap
    ON dbo.Syspro_DiagSummary (SnapshotDate, InstanceName);
  PRINT N'Created Syspro_DiagSummary';
END
ELSE PRINT N'Syspro_DiagSummary exists';

IF OBJECT_ID(N'dbo.Syspro_SqlHealthBal', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Syspro_SqlHealthBal (
    SnapshotDate   date            NOT NULL,
    InstanceName   nvarchar(100)   NOT NULL,
    CompanyDb      nvarchar(100)   NOT NULL,
    HealthKey      nvarchar(100)   NULL,
    Description    nvarchar(200)   NULL,
    BalValue       decimal(18,2)   NULL,
    StatusText     nvarchar(100)   NULL,
    RefreshDate    datetime2(3)    NULL,
    ImportedAt     datetime2(3)    NOT NULL
      CONSTRAINT DF_Syspro_SqlHealthBal_Imp DEFAULT (SYSUTCDATETIME()),
    RowId          bigint          NOT NULL IDENTITY(1,1)
      CONSTRAINT PK_Syspro_SqlHealthBal PRIMARY KEY (RowId)
  );
  CREATE INDEX IX_Syspro_SqlHealthBal_Snap
    ON dbo.Syspro_SqlHealthBal (SnapshotDate, InstanceName, CompanyDb);
  PRINT N'Created Syspro_SqlHealthBal';
END
ELSE PRINT N'Syspro_SqlHealthBal exists';

/* Write rights for collect login */
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Syspro_SystemAuditLog TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Syspro_DiagSummary TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Syspro_SqlHealthBal TO [Rpm_collect];
  PRINT N'Granted SELECT/INSERT/UPDATE/DELETE to Rpm_collect on extra tables';
END
ELSE
  PRINT N'Login user Rpm_collect not in DB - grant manually after mapping user';

PRINT N'Extra collect tables ready.';
GO
