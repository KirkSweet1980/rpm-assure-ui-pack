USE RPMAssure_App;
GO
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Agent_DiskIops', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_DiskIops (
    SnapshotUtc    datetime2(0)  NOT NULL,
    CustomerCode   nvarchar(32)  NOT NULL,
    HostName       nvarchar(128) NOT NULL,
    DriveLetter    nvarchar(16)  NOT NULL,
    TotalGb        decimal(18,2) NULL,
    FreeGb         decimal(18,2) NULL,
    UsedPct        decimal(6,2)  NULL,
    MediaType      nvarchar(40)  NULL,
    ReadIops       decimal(18,2) NULL,
    WriteIops      decimal(18,2) NULL,
    TotalIops      decimal(18,2) NULL,
    QueueLen       decimal(18,2) NULL,
    ReadLatencyMs  decimal(18,2) NULL,
    WriteLatencyMs decimal(18,2) NULL,
    SampleSec      decimal(6,2)  NULL,
    Source         nvarchar(40)  NULL,
    ImportedAt     datetime2(3)  NOT NULL CONSTRAINT DF_Agent_DiskIops_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Agent_DiskIops PRIMARY KEY (SnapshotUtc, CustomerCode, HostName, DriveLetter)
  );
  PRINT 'Created Agent_DiskIops';
END
GO
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'TotalGb') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD TotalGb decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'FreeGb') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD FreeGb decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'UsedPct') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD UsedPct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'MediaType') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD MediaType nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'ReadIops') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD ReadIops decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'WriteIops') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD WriteIops decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'TotalIops') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD TotalIops decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'QueueLen') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD QueueLen decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'ReadLatencyMs') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD ReadLatencyMs decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'WriteLatencyMs') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD WriteLatencyMs decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'SampleSec') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD SampleSec decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'Source') IS NULL ALTER TABLE dbo.Agent_DiskIops ADD Source nvarchar(40) NULL;
PRINT 'Agent_DiskIops columns ready';
GO
