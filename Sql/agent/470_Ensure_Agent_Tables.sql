/* RPM Assure Edge Agent - central tables
   Run on RPMAssure_App (admin): sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 470_Ensure_Agent_Tables.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Agent_Registry', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_Registry (
    AgentId           uniqueidentifier NOT NULL CONSTRAINT DF_Agent_Registry_Id DEFAULT NEWSEQUENTIALID(),
    CustomerCode      nvarchar(32)     NOT NULL,
    HostName          nvarchar(128)    NOT NULL,
    InstanceName      nvarchar(128)    NULL,
    AgentVersion      nvarchar(32)     NOT NULL CONSTRAINT DF_Agent_Registry_Ver DEFAULT N'1.0.0',
    RoleTags          nvarchar(256)    NULL,  -- e.g. syspro,sql,file
    InstallPath       nvarchar(512)    NULL,
    IsEnabled         bit              NOT NULL CONSTRAINT DF_Agent_Registry_En DEFAULT 1,
    FirstSeenUtc      datetime2(0)     NOT NULL CONSTRAINT DF_Agent_Registry_Fs DEFAULT SYSUTCDATETIME(),
    LastHeartbeatUtc  datetime2(0)     NULL,
    LastJobUtc        datetime2(0)     NULL,
    LastStatus        nvarchar(32)     NULL,
    LastMessage       nvarchar(1000)   NULL,
    CONSTRAINT PK_Agent_Registry PRIMARY KEY (AgentId),
    CONSTRAINT UQ_Agent_Registry_Host UNIQUE (CustomerCode, HostName)
  );
  PRINT 'Agent_Registry created';
END
ELSE PRINT 'Agent_Registry exists';
GO
IF COL_LENGTH(N'dbo.Agent_Registry', N'RequestSyncUtc') IS NULL
BEGIN
  ALTER TABLE dbo.Agent_Registry ADD RequestSyncUtc datetime2(0) NULL;
  PRINT 'RequestSyncUtc added';
END
GO

IF OBJECT_ID(N'dbo.Agent_Heartbeat', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_Heartbeat (
    HeartbeatId       bigint IDENTITY(1,1) NOT NULL,
    CustomerCode      nvarchar(32)  NOT NULL,
    HostName          nvarchar(128) NOT NULL,
    AgentVersion      nvarchar(32)  NULL,
    ReportedAtUtc     datetime2(0)  NOT NULL CONSTRAINT DF_Agent_Hb_At DEFAULT SYSUTCDATETIME(),
    OsCaption         nvarchar(256) NULL,
    CpuPct            decimal(5,2)  NULL,
    MemFreeMb         int           NULL,
    DiskFreeGb        decimal(12,2) NULL,
    JobQueueDepth     int           NULL,
    DetailJson        nvarchar(max) NULL,
    CONSTRAINT PK_Agent_Heartbeat PRIMARY KEY (HeartbeatId)
  );
  CREATE INDEX IX_Agent_Heartbeat_Host ON dbo.Agent_Heartbeat (CustomerCode, HostName, ReportedAtUtc DESC);
  PRINT 'Agent_Heartbeat created';
END
ELSE PRINT 'Agent_Heartbeat exists';
GO

IF OBJECT_ID(N'dbo.Agent_JobRun', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_JobRun (
    JobRunId          bigint IDENTITY(1,1) NOT NULL,
    CustomerCode      nvarchar(32)  NOT NULL,
    HostName          nvarchar(128) NOT NULL,
    JobName           nvarchar(64)  NOT NULL,
    StartedUtc        datetime2(0)  NOT NULL,
    FinishedUtc       datetime2(0)  NULL,
    ExitCode          int           NULL,
    Success           bit           NULL,
    DurationSec       int           NULL,
    RowsPushed        int           NULL,
    Message           nvarchar(2000) NULL,
    LogTail           nvarchar(max) NULL,
    CONSTRAINT PK_Agent_JobRun PRIMARY KEY (JobRunId)
  );
  CREATE INDEX IX_Agent_JobRun_Host ON dbo.Agent_JobRun (CustomerCode, HostName, StartedUtc DESC);
  CREATE INDEX IX_Agent_JobRun_Job ON dbo.Agent_JobRun (JobName, StartedUtc DESC);
  PRINT 'Agent_JobRun created';
END
ELSE PRINT 'Agent_JobRun exists';
GO

IF OBJECT_ID(N'dbo.Agent_DiskIops', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_DiskIops (
    SnapshotUtc   datetime2(0)  NOT NULL,
    CustomerCode  nvarchar(32)  NOT NULL,
    HostName      nvarchar(128) NOT NULL,
    DriveLetter   nvarchar(16)  NOT NULL,
    TotalGb       decimal(18,2) NULL,
    FreeGb        decimal(18,2) NULL,
    UsedPct       decimal(6,2)  NULL,
    MediaType     nvarchar(40)  NULL,
    ReadIops      decimal(18,2) NULL,
    WriteIops     decimal(18,2) NULL,
    TotalIops     decimal(18,2) NULL,
    QueueLen      decimal(18,2) NULL,
    SampleSec     decimal(6,2)  NULL,
    ImportedAt    datetime2(3)  NOT NULL CONSTRAINT DF_Agent_DiskIops_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Agent_DiskIops PRIMARY KEY (SnapshotUtc, CustomerCode, HostName, DriveLetter)
  );
  CREATE INDEX IX_Agent_DiskIops_Cust ON dbo.Agent_DiskIops (CustomerCode, HostName, SnapshotUtc DESC);
  PRINT 'Agent_DiskIops created';
END
ELSE PRINT 'Agent_DiskIops exists';
GO

IF OBJECT_ID(N'dbo.Agent_EventLog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_EventLog (
    SnapshotUtc     datetime2(0)  NOT NULL,
    CustomerCode    nvarchar(32)  NOT NULL,
    HostName        nvarchar(128) NOT NULL,
    TimeCreatedUtc  datetime2(0)  NOT NULL,
    LogName         nvarchar(40)  NOT NULL,
    EventId         int           NOT NULL,
    LevelName       nvarchar(16)  NOT NULL,
    ProviderName    nvarchar(200) NULL,
    MessageText     nvarchar(1800) NULL,
    ImportedAt      datetime2(3)  NOT NULL CONSTRAINT DF_Agent_EventLog_Imp DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_Agent_EventLog_Cust ON dbo.Agent_EventLog (CustomerCode, HostName, TimeCreatedUtc DESC);
  PRINT 'Agent_EventLog created';
END
ELSE PRINT 'Agent_EventLog exists';
GO

IF OBJECT_ID(N'dbo.Agent_LinkProbe', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_LinkProbe (
    SnapshotUtc    datetime2(0)  NOT NULL,
    CustomerCode   nvarchar(32)  NOT NULL,
    HostName       nvarchar(128) NOT NULL,
    SqlOk          bit           NOT NULL,
    HttpOk         bit           NOT NULL,
    HttpStatus     int           NULL,
    LatencyMs      int           NULL,
    Message        nvarchar(400) NULL,
    ImportedAt     datetime2(3)  NOT NULL CONSTRAINT DF_Agent_LinkProbe_Imp DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_Agent_LinkProbe_Cust ON dbo.Agent_LinkProbe (CustomerCode, HostName, SnapshotUtc DESC);
  PRINT 'Agent_LinkProbe created';
END
ELSE PRINT 'Agent_LinkProbe exists';
GO

IF OBJECT_ID(N'dbo.Agent_JobDefinition', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_JobDefinition (
    JobName           nvarchar(64)  NOT NULL,
    DisplayName       nvarchar(128) NOT NULL,
    DefaultIntervalMin int          NOT NULL CONSTRAINT DF_Agent_JobDef_Int DEFAULT 15,
    ScriptRelativePath nvarchar(512) NULL, -- under agent install or Sql root
    IsEnabled         bit           NOT NULL CONSTRAINT DF_Agent_JobDef_En DEFAULT 1,
    AppliesToRoles    nvarchar(256) NULL, -- comma: syspro,api,all
    Notes             nvarchar(500) NULL,
    CONSTRAINT PK_Agent_JobDefinition PRIMARY KEY (JobName)
  );
  PRINT 'Agent_JobDefinition created';
END
ELSE PRINT 'Agent_JobDefinition exists';
GO

MERGE dbo.Agent_JobDefinition AS t
USING (VALUES
  (N'syspro-core',     N'SYSPRO core collect',     15, N'jobs\Run-Syspro-Core.ps1',     1, N'syspro', N'Operators license health DTR'),
  (N'syspro-native',   N'SYSPRO FinSight native',  15, N'jobs\Run-Syspro-Native.ps1',   1, N'syspro', N'INV AP AR WIP L1-3 without Datarapt'),
  (N'syspro-jobs',     N'SYSPRO full jobs',      1440, N'jobs\Run-Syspro-Jobs.ps1',     1, N'syspro', N'Nightly full job extract'),
  (N'host-iops',       N'Host disk IOPS',          15, N'Collect-Host-Iops.ps1',           1, N'syspro', N'Windows LogicalDisk IOPS on this SQL host'),
  (N'win-eventlog',    N'Windows critical events', 15, N'Collect-Windows-EventLog.ps1',    1, N'all',    N'Application + System Critical/Error'),
  (N'assure-link',     N'Assure App link',          5, N'Probe-Assure-Link.ps1',           1, N'all',    N'Prove SQL path to central Assure'),
  (N'heartbeat-only',  N'Heartbeat only',           5, NULL,                               1, N'all',    N'No payload job')
) AS s (JobName, DisplayName, DefaultIntervalMin, ScriptRelativePath, IsEnabled, AppliesToRoles, Notes)
ON t.JobName = s.JobName
WHEN NOT MATCHED THEN INSERT (JobName, DisplayName, DefaultIntervalMin, ScriptRelativePath, IsEnabled, AppliesToRoles, Notes)
  VALUES (s.JobName, s.DisplayName, s.DefaultIntervalMin, s.ScriptRelativePath, s.IsEnabled, s.AppliesToRoles, s.Notes);
PRINT 'Agent_JobDefinition seeded';
GO

CREATE OR ALTER VIEW dbo.vw_Agent_Status_Latest
AS
SELECT
  r.CustomerCode,
  r.HostName,
  r.InstanceName,
  r.AgentVersion,
  r.RoleTags,
  r.IsEnabled,
  r.LastHeartbeatUtc,
  r.LastJobUtc,
  r.LastStatus,
  r.LastMessage,
  CASE
    WHEN r.LastHeartbeatUtc IS NULL THEN N'NEVER'
    WHEN r.LastHeartbeatUtc < DATEADD(minute, -20, SYSUTCDATETIME()) THEN N'STALE'
    ELSE N'ONLINE'
  END AS HealthStatus,
  DATEDIFF(minute, r.LastHeartbeatUtc, SYSUTCDATETIME()) AS MinutesSinceHeartbeat
FROM dbo.Agent_Registry r;
GO

PRINT 'vw_Agent_Status_Latest ready';
GO

-- Grants (soft-fail if principals missing)
BEGIN TRY
  GRANT SELECT, INSERT, UPDATE ON dbo.Agent_Registry TO [Rpm_collect];
  GRANT SELECT, INSERT ON dbo.Agent_Heartbeat TO [Rpm_collect];
  GRANT SELECT, INSERT ON dbo.Agent_JobRun TO [Rpm_collect];
  GRANT SELECT, INSERT, DELETE ON dbo.Agent_DiskIops TO [Rpm_collect];
  GRANT SELECT, INSERT, DELETE ON dbo.Agent_EventLog TO [Rpm_collect];
  GRANT SELECT, INSERT, DELETE ON dbo.Agent_LinkProbe TO [Rpm_collect];
  GRANT SELECT ON dbo.Agent_JobDefinition TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Agent_Status_Latest TO [Rpm_collect];
  PRINT 'Granted Rpm_collect';
END TRY BEGIN CATCH PRINT 'Grant Rpm_collect soft-fail: ' + ERROR_MESSAGE(); END CATCH
GO
BEGIN TRY
  GRANT SELECT, INSERT, UPDATE ON dbo.Agent_Registry TO [rpmassure];
  GRANT SELECT, INSERT ON dbo.Agent_Heartbeat TO [rpmassure];
  GRANT SELECT, INSERT ON dbo.Agent_JobRun TO [rpmassure];
  GRANT SELECT, INSERT, DELETE ON dbo.Agent_DiskIops TO [rpmassure];
  GRANT SELECT, INSERT, DELETE ON dbo.Agent_EventLog TO [rpmassure];
  GRANT SELECT, INSERT, DELETE ON dbo.Agent_LinkProbe TO [rpmassure];
  GRANT SELECT ON dbo.Agent_JobDefinition TO [rpmassure];
  GRANT SELECT ON dbo.vw_Agent_Status_Latest TO [rpmassure];
  PRINT 'Granted rpmassure write';
END TRY BEGIN CATCH PRINT 'Grant rpmassure write soft-fail: ' + ERROR_MESSAGE(); END CATCH
GO
