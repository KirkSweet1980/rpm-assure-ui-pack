SET NOCOUNT ON;
IF DB_ID(N'RPMAssure_App') IS NOT NULL USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Agent_HostFirewall', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_HostFirewall (
    SnapshotUtc    datetime2(0)  NOT NULL,
    CustomerCode   nvarchar(32)  NOT NULL,
    HostName       nvarchar(128) NOT NULL,
    ProfileName    nvarchar(16)  NOT NULL,
    Enabled        bit           NOT NULL CONSTRAINT DF_Agent_HostFw_En DEFAULT (0),
    Active         bit           NOT NULL CONSTRAINT DF_Agent_HostFw_Act DEFAULT (0),
    PortsJson      nvarchar(max) NULL,
    Source         nvarchar(40)  NULL,
    ImportedAt     datetime2(3)  NOT NULL CONSTRAINT DF_Agent_HostFw_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Agent_HostFirewall PRIMARY KEY (SnapshotUtc, CustomerCode, HostName, ProfileName)
  );
  CREATE INDEX IX_Agent_HostFirewall_Cust ON dbo.Agent_HostFirewall (CustomerCode, HostName, SnapshotUtc DESC);
  PRINT 'Agent_HostFirewall created';
END
ELSE PRINT 'Agent_HostFirewall exists';

IF COL_LENGTH(N'dbo.Agent_HostFirewall', N'Enabled') IS NULL
  ALTER TABLE dbo.Agent_HostFirewall ADD Enabled bit NOT NULL CONSTRAINT DF_Agent_HostFw_En2 DEFAULT (0);
IF COL_LENGTH(N'dbo.Agent_HostFirewall', N'Active') IS NULL
  ALTER TABLE dbo.Agent_HostFirewall ADD Active bit NOT NULL CONSTRAINT DF_Agent_HostFw_Act2 DEFAULT (0);
IF COL_LENGTH(N'dbo.Agent_HostFirewall', N'PortsJson') IS NULL
  ALTER TABLE dbo.Agent_HostFirewall ADD PortsJson nvarchar(max) NULL;
IF COL_LENGTH(N'dbo.Agent_HostFirewall', N'Source') IS NULL
  ALTER TABLE dbo.Agent_HostFirewall ADD Source nvarchar(40) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  PRINT 'Rpm_collect missing — skip grants';
ELSE
BEGIN
  GRANT SELECT, INSERT, DELETE, UPDATE ON dbo.Agent_HostFirewall TO [Rpm_collect];
END
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
  GRANT SELECT, INSERT, DELETE, UPDATE ON dbo.Agent_HostFirewall TO [rpmassure];
PRINT '521 Agent_HostFirewall ready';
GO
