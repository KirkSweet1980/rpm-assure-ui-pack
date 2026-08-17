# RPM Assure - Windows Critical / Error event log collect.
# Pushes Application + System Critical and Error events to dbo.Agent_EventLog.
param(
  [string]$ConfigPath = "",
  [string]$AgentRoot = "C:\RPM-Assure\Agent",
  [int]$LookbackHours = 6,
  [int]$MaxEvents = 200
)

$ErrorActionPreference = "Stop"
if ($LookbackHours -lt 1) { $LookbackHours = 1 }
if ($LookbackHours -gt 48) { $LookbackHours = 48 }
if ($MaxEvents -lt 20) { $MaxEvents = 20 }
if ($MaxEvents -gt 500) { $MaxEvents = 500 }

function W([string]$m) {
  Write-Host ((Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z " + $m)
}
function Sql-Lit([string]$s) {
  if ($null -eq $s) { return "NULL" }
  if ($s.Length -gt 1800) { $s = $s.Substring(0, 1800) }
  return "N'" + ($s.Replace("'", "''")) + "'"
}

function Invoke-AdoSql {
  param([string]$Server, [string]$Db, [string]$User, [string]$Pass, [string]$SqlText)
  $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $csb["Data Source"] = $Server
  $csb["Initial Catalog"] = $Db
  $csb["User ID"] = $User
  $csb["Password"] = $Pass
  $csb["Encrypt"] = $true
  $csb["TrustServerCertificate"] = $true
  $csb["Connect Timeout"] = 45
  $conn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
  try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandTimeout = 120
    $cmd.CommandText = $SqlText
    [void]$cmd.ExecuteNonQuery()
    return @{ ExitCode = 0; Text = "" }
  } catch {
    return @{ ExitCode = 1; Text = $_.Exception.Message }
  } finally { $conn.Dispose() }
}

$tried = @()
if ($ConfigPath) { $tried += $ConfigPath }
$tried += (Join-Path $AgentRoot "Agent.Config.ps1")
foreach ($p in $tried) {
  if ($p -and (Test-Path -LiteralPath $p)) { . $p; break }
}
$lib = Join-Path $AgentRoot "Lib-SecureConfig.ps1"
if (Test-Path $lib) {
  . $lib
  $script:RpmaAgentRoot = $AgentRoot
  if (Get-Command Import-RpmaAgentSecrets -EA SilentlyContinue) { try { Import-RpmaAgentSecrets } catch {} }
}
if (-not $CentralDataSource) { throw "CentralDataSource missing" }
if (-not $CentralDatabase) { $CentralDatabase = "RPMAssure_App" }
if (-not $CentralSqlUser -or -not $CentralSqlPassword) { throw "Central SQL login missing" }
if (-not $CustomerCode) { $CustomerCode = $env:COMPUTERNAME }
$HostName = $env:COMPUTERNAME
W "START eventlog host=$HostName customer=$CustomerCode lookback=${LookbackHours}h"

$since = (Get-Date).AddHours(-$LookbackHours)
$levels = @(1, 2)
$logs = @("System", "Application")
$found = New-Object System.Collections.Generic.List[object]
foreach ($log in $logs) {
  try {
    $ev = Get-WinEvent -FilterHashtable @{
      LogName = $log
      Level = $levels
      StartTime = $since
    } -MaxEvents $MaxEvents -ErrorAction SilentlyContinue
    foreach ($e in @($ev)) { [void]$found.Add($e) }
  } catch {
    W ("WARN $log " + $_.Exception.Message)
  }
}

$found = @($found | Sort-Object TimeCreated -Descending | Select-Object -First $MaxEvents)
W ("events=" + $found.Count)

$rows = New-Object System.Collections.Generic.List[string]
foreach ($e in $found) {
  $lvl = "Error"
  if ([int]$e.Level -eq 1) { $lvl = "Critical" }
  $msg = ""
  try { $msg = [string]$e.Message } catch { $msg = "" }
  $when = $e.TimeCreated.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
  $prov = [string]$e.ProviderName
  $id = [int]$e.Id
  $logn = [string]$e.LogName
  [void]$rows.Add(("SELECT {0} TimeCreatedUtc, {1} LogName, {2} EventId, {3} LevelName, {4} ProviderName, {5} MessageText" -f `
    (Sql-Lit $when), (Sql-Lit $logn), $id, (Sql-Lit $lvl), (Sql-Lit $prov), (Sql-Lit $msg)))
}

if ($rows.Count -eq 0) {
  $union = "SELECT CAST(NULL AS datetime2) TimeCreatedUtc, CAST(NULL AS nvarchar(40)) LogName, CAST(NULL AS int) EventId, CAST(NULL AS nvarchar(16)) LevelName, CAST(NULL AS nvarchar(200)) ProviderName, CAST(NULL AS nvarchar(1800)) MessageText WHERE 1=0"
} else {
  $union = $rows -join "`nUNION ALL`n"
}

$snap = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
$sql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Agent_EventLog', N'U') IS NULL
BEGIN
  RAISERROR(N'Agent_EventLog missing - run 470_Ensure_Agent_Tables.sql as sysadmin', 16, 1);
  RETURN;
END

DECLARE @Snap datetime2(0) = CONVERT(datetime2(0), $(Sql-Lit $snap), 126);

INSERT INTO dbo.Agent_EventLog (
  SnapshotUtc, CustomerCode, HostName, TimeCreatedUtc, LogName, EventId, LevelName, ProviderName, MessageText
)
SELECT @Snap, $(Sql-Lit $CustomerCode), $(Sql-Lit $HostName), TimeCreatedUtc, LogName, EventId, LevelName, ProviderName, MessageText
FROM (
$union
) x
WHERE x.TimeCreatedUtc IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM dbo.Agent_EventLog e
    WHERE e.CustomerCode = $(Sql-Lit $CustomerCode)
      AND e.HostName = $(Sql-Lit $HostName)
      AND e.TimeCreatedUtc = x.TimeCreatedUtc
      AND e.LogName = x.LogName
      AND e.EventId = x.EventId
  );

DELETE FROM dbo.Agent_EventLog
WHERE TimeCreatedUtc < DATEADD(day, -14, SYSUTCDATETIME());
"@

$r = Invoke-AdoSql -Server $CentralDataSource -Db $CentralDatabase -User $CentralSqlUser -Pass $CentralSqlPassword -SqlText $sql
if ($r.ExitCode -ne 0) {
  W ("FAIL sql " + $r.Text)
  exit 1
}
W ("DONE events=$($found.Count) snap=$snap")
exit 0
