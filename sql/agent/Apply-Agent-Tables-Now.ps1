# Apply-Agent-Tables-Now.ps1
# Run on the APP / central SQL server as Administrator (sysadmin Windows login).
# Prints sqlcmd output. Tries local instance first.
$ErrorActionPreference = 'Continue'
$outDir = 'C:\RPM-Assure\Sql\agent'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$sql = Join-Path $outDir '470_Ensure_Agent_Tables.sql'

$txt = @'
SET NOCOUNT ON;
USE RPMAssure_App;
GO
IF OBJECT_ID(N'dbo.Agent_Registry', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_Registry (
    AgentId uniqueidentifier NOT NULL CONSTRAINT DF_Agent_Registry_Id DEFAULT NEWSEQUENTIALID(),
    CustomerCode nvarchar(32) NOT NULL,
    HostName nvarchar(128) NOT NULL,
    InstanceName nvarchar(128) NULL,
    AgentVersion nvarchar(32) NOT NULL CONSTRAINT DF_Agent_Registry_Ver DEFAULT N'1.0.0',
    RoleTags nvarchar(256) NULL,
    InstallPath nvarchar(512) NULL,
    IsEnabled bit NOT NULL CONSTRAINT DF_Agent_Registry_En DEFAULT 1,
    FirstSeenUtc datetime2(0) NOT NULL CONSTRAINT DF_Agent_Registry_Fs DEFAULT SYSUTCDATETIME(),
    LastHeartbeatUtc datetime2(0) NULL,
    LastJobUtc datetime2(0) NULL,
    LastStatus nvarchar(32) NULL,
    LastMessage nvarchar(1000) NULL,
    CONSTRAINT PK_Agent_Registry PRIMARY KEY (AgentId),
    CONSTRAINT UQ_Agent_Registry_Host UNIQUE (CustomerCode, HostName)
  );
  PRINT 'Agent_Registry created';
END
ELSE PRINT 'Agent_Registry exists';
GO
IF OBJECT_ID(N'dbo.Agent_Heartbeat', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_Heartbeat (
    HeartbeatId bigint IDENTITY(1,1) NOT NULL,
    CustomerCode nvarchar(32) NOT NULL,
    HostName nvarchar(128) NOT NULL,
    AgentVersion nvarchar(32) NULL,
    ReportedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_Agent_Hb_At DEFAULT SYSUTCDATETIME(),
    OsCaption nvarchar(256) NULL,
    CpuPct decimal(5,2) NULL,
    MemFreeMb int NULL,
    DiskFreeGb decimal(12,2) NULL,
    JobQueueDepth int NULL,
    DetailJson nvarchar(max) NULL,
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
    JobRunId bigint IDENTITY(1,1) NOT NULL,
    CustomerCode nvarchar(32) NOT NULL,
    HostName nvarchar(128) NOT NULL,
    JobName nvarchar(64) NOT NULL,
    StartedUtc datetime2(0) NOT NULL,
    FinishedUtc datetime2(0) NULL,
    ExitCode int NULL,
    Success bit NULL,
    DurationSec int NULL,
    RowsPushed int NULL,
    Message nvarchar(2000) NULL,
    LogTail nvarchar(max) NULL,
    CONSTRAINT PK_Agent_JobRun PRIMARY KEY (JobRunId)
  );
  CREATE INDEX IX_Agent_JobRun_Host ON dbo.Agent_JobRun (CustomerCode, HostName, StartedUtc DESC);
  PRINT 'Agent_JobRun created';
END
ELSE PRINT 'Agent_JobRun exists';
GO
IF OBJECT_ID(N'dbo.Agent_JobDefinition', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_JobDefinition (
    JobName nvarchar(64) NOT NULL,
    DisplayName nvarchar(128) NOT NULL,
    DefaultIntervalMin int NOT NULL CONSTRAINT DF_Agent_JobDef_Int DEFAULT 15,
    ScriptRelativePath nvarchar(512) NULL,
    IsEnabled bit NOT NULL CONSTRAINT DF_Agent_JobDef_En DEFAULT 1,
    AppliesToRoles nvarchar(256) NULL,
    Notes nvarchar(500) NULL,
    CONSTRAINT PK_Agent_JobDefinition PRIMARY KEY (JobName)
  );
  PRINT 'Agent_JobDefinition created';
END
ELSE PRINT 'Agent_JobDefinition exists';
GO
CREATE OR ALTER VIEW dbo.vw_Agent_Status_Latest AS
SELECT r.CustomerCode, r.HostName, r.InstanceName, r.AgentVersion, r.RoleTags, r.IsEnabled,
  r.LastHeartbeatUtc, r.LastJobUtc, r.LastStatus, r.LastMessage,
  CASE WHEN r.LastHeartbeatUtc IS NULL THEN N'NEVER'
       WHEN r.LastHeartbeatUtc < DATEADD(minute, -20, SYSUTCDATETIME()) THEN N'STALE'
       ELSE N'ONLINE' END AS HealthStatus,
  DATEDIFF(minute, r.LastHeartbeatUtc, SYSUTCDATETIME()) AS MinutesSinceHeartbeat
FROM dbo.Agent_Registry r;
GO
BEGIN TRY
  GRANT SELECT, INSERT, UPDATE ON dbo.Agent_Registry TO [rpmassure];
  GRANT SELECT, INSERT ON dbo.Agent_Heartbeat TO [rpmassure];
  GRANT SELECT, INSERT ON dbo.Agent_JobRun TO [rpmassure];
  GRANT SELECT ON dbo.vw_Agent_Status_Latest TO [rpmassure];
  PRINT 'Granted rpmassure';
END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
GO
SELECT name FROM sys.tables WHERE name LIKE 'Agent_%';
GO
'@
[IO.File]::WriteAllText($sql, $txt, [Text.UTF8Encoding]::new($false))
Write-Host "Wrote $sql"

$sqlcmd = @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sqlcmd) { $sqlcmd = (Get-Command sqlcmd.exe -EA Stop).Source }
Write-Host "sqlcmd = $sqlcmd"

$targets = @(
  @{ S = '.\RPMREPORTS'; Auth = @('-E') },
  @{ S = 'localhost\RPMREPORTS'; Auth = @('-E') },
  @{ S = '102.222.21.220,14333'; Auth = @('-E') }
)

$ok = $false
foreach ($t in $targets) {
  Write-Host ""
  Write-Host ("TRY -S " + $t.S + " " + ($t.Auth -join ' '))
  $args = @('-S', $t.S, '-d', 'RPMAssure_App', '-C', '-b', '-i', $sql) + $t.Auth
  & $sqlcmd @args
  Write-Host ("exit=" + $LASTEXITCODE)
  if ($LASTEXITCODE -eq 0) { $ok = $true; break }
}

if (-not $ok) {
  Write-Host ""
  Write-Host 'Windows auth failed. Trying RPM_ASSURE_SQL_PASSWORD / secrets (no hardcoded login).'
  $gp = @(
    'C:\RPM-Assure\Sql\ops\Get-RpmSqlPassword.ps1',
    (Join-Path $PSScriptRoot '..\ops\Get-RpmSqlPassword.ps1')
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  $pwd = $env:RPM_ASSURE_SQL_PASSWORD
  if ($gp) { . $gp; $pwd = Get-RpmSqlPassword -Current $pwd }
  if ([string]::IsNullOrWhiteSpace($pwd)) { throw 'SQL password missing — run Harden-Production.ps1' }
  $user = if ($env:RPM_ASSURE_SQL_USER) { $env:RPM_ASSURE_SQL_USER } else { 'Rpm_collect' }
  & $sqlcmd -S '.\RPMREPORTS' -d RPMAssure_App -U $user -P $pwd -C -b -i $sql
  Write-Host ("exit=" + $LASTEXITCODE)
  if ($LASTEXITCODE -eq 0) { $ok = $true }
}

if ($ok) { Write-Host 'SUCCESS - Agent tables ready. Restart RPMAssure-Edge on SIRZAAPSQL01.' }
else { Write-Host 'FAILED - copy the TRY output above (Msg ...) and send it.' }
