# Prove this host can still talk to the Assure App server (central SQL + optional HTTPS).
param(
  [string]$ConfigPath = "",
  [string]$AgentRoot = "C:\RPM-Assure\Agent"
)
$ErrorActionPreference = "Stop"
function W([string]$m) { Write-Host ((Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z " + $m) }
function Sql-Lit([string]$s) {
  if ($null -eq $s) { return "NULL" }
  return "N'" + ($s.Replace("'", "''")) + "'"
}

if ($ConfigPath -and (Test-Path $ConfigPath)) { . $ConfigPath }
elseif (Test-Path (Join-Path $AgentRoot "Agent.Config.ps1")) { . (Join-Path $AgentRoot "Agent.Config.ps1") }
$lib = Join-Path $AgentRoot "Lib-SecureConfig.ps1"
if (Test-Path $lib) {
  . $lib
  $script:RpmaAgentRoot = $AgentRoot
  if (Get-Command Import-RpmaAgentSecrets -EA SilentlyContinue) { try { Import-RpmaAgentSecrets } catch {} }
}
$httpsLib = Join-Path $AgentRoot 'Lib-RpmaHttps.ps1'
if (Test-Path $httpsLib) { . $httpsLib }
if (-not $CentralDataSource) { throw "CentralDataSource missing" }
if (-not $CentralDatabase) { $CentralDatabase = "RPMAssure_App" }
if (-not $CentralSqlUser -or -not $CentralSqlPassword) { throw "Central SQL login missing" }
if (-not $CustomerCode) { $CustomerCode = $env:COMPUTERNAME }
$HostName = $env:COMPUTERNAME

$appUrl = $null
if (Get-Command Get-RpmaAgentSettings -EA SilentlyContinue) {
  try {
    $st = Get-RpmaAgentSettings
    if ($st.appHttpsUrl) { $appUrl = [string]$st.appHttpsUrl }
  } catch {}
}

$sw = [Diagnostics.Stopwatch]::StartNew()
$csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$csb["Data Source"] = $CentralDataSource
$csb["Initial Catalog"] = $CentralDatabase
$csb["User ID"] = $CentralSqlUser
$csb["Password"] = $CentralSqlPassword
$csb["Encrypt"] = $true
$csb["TrustServerCertificate"] = $true
if (Get-Command Get-RpmaAgentSettings -EA SilentlyContinue) {
  try {
    $st2 = Get-RpmaAgentSettings
    if ($null -ne $st2.trustSqlCert) { $csb["TrustServerCertificate"] = [bool]$st2.trustSqlCert }
  } catch {}
}
$csb["Connect Timeout"] = 20
$conn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
$sqlOk = 0
$httpOk = 0
$httpStatus = "NULL"
$msg = "link fail"
$srv = ""
try {
  $conn.Open()
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = "SELECT @@SERVERNAME AS srv, DB_NAME() AS db"
  $r = $cmd.ExecuteReader()
  if ($r.Read()) { $srv = [string]$r["srv"] }
  $r.Close()
  $sqlOk = 1
  $msg = "sql ok $srv"
} catch {
  $msg = "sql fail " + $_.Exception.Message
}

if ($appUrl) {
  try {
    $wr = Invoke-WebRequest -UseBasicParsing -Uri $appUrl -TimeoutSec 15
    $httpStatus = [int]$wr.StatusCode
    if ($wr.StatusCode -ge 200 -and $wr.StatusCode -lt 400) { $httpOk = 1; $msg = $msg + " / https $($wr.StatusCode)" }
    else { $msg = $msg + " / https $($wr.StatusCode)" }
  } catch {
    $msg = $msg + " / https fail"
    $httpStatus = "NULL"
  }
}
$sw.Stop()
$ms = [int]$sw.ElapsedMilliseconds
if ($msg.Length -gt 400) { $msg = $msg.Substring(0, 400) }

if ($conn.State -eq "Open") {
  $ensure = $conn.CreateCommand()
  $ensure.CommandText = @"
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
END
INSERT INTO dbo.Agent_LinkProbe (SnapshotUtc, CustomerCode, HostName, SqlOk, HttpOk, HttpStatus, LatencyMs, Message)
VALUES (SYSUTCDATETIME(), $(Sql-Lit $CustomerCode), $(Sql-Lit $HostName), $sqlOk, $httpOk, $httpStatus, $ms, $(Sql-Lit $msg));
DELETE FROM dbo.Agent_LinkProbe WHERE SnapshotUtc < DATEADD(day, -14, SYSUTCDATETIME());
UPDATE dbo.Agent_Registry
SET LastHeartbeatUtc = SYSUTCDATETIME(),
    LastStatus = CASE WHEN LastStatus IN (N'QUEUED', N'SYNCING') THEN LastStatus WHEN $sqlOk = 1 THEN N'ONLINE' ELSE N'JOB_FAIL' END,
    LastMessage = $(Sql-Lit $msg)
WHERE CustomerCode = $(Sql-Lit $CustomerCode) AND HostName = $(Sql-Lit $HostName);
"@
  try { [void]$ensure.ExecuteNonQuery() } catch { W ("WARN write " + $_.Exception.Message) }
  $conn.Dispose()
}

if ($sqlOk -eq 1) { W "LINK OK $msg ${ms}ms"; exit 0 }
W "LINK FAIL $msg"
exit 1
