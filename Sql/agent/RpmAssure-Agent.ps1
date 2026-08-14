# RPM Assure Edge Agent - single cycle (heartbeat + due jobs + push status)
# Called by scheduled task every 5 minutes. Pure ASCII.
param(
  [string]$AgentRoot = "C:\RPM-Assure\Agent",
  [string]$ConfigPath = "",
  [switch]$HeartbeatOnly,
  [string]$ForceJob = ""
)

$ErrorActionPreference = "Stop"
if (-not $ConfigPath) { $ConfigPath = Join-Path $AgentRoot "Agent.Config.ps1" }
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Missing config: $ConfigPath" }
. $ConfigPath

$AgentVersion = "2.0.0"
$HostName = $env:COMPUTERNAME
if (-not $CentralDataSource) { throw "CentralDataSource missing" }
if (-not $CentralDatabase) { $CentralDatabase = "RPMAssure_App" }
if (-not $CentralSqlUser) { throw "CentralSqlUser missing" }
if (-not $RoleTags) { $RoleTags = "syspro" }
if (-not $SqlRoot) { $SqlRoot = "C:\RPM-Assure\Sql" }
if (-not $LogDir) { $LogDir = Join-Path $AgentRoot "logs" }
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
if (-not $CustomerCode) {
  $guess = Get-ChildItem (Join-Path $SqlRoot "customers") -Directory -EA SilentlyContinue | Select-Object -First 1
  if ($guess) { $CustomerCode = $guess.Name }
}
if (-not $CustomerCode) { $CustomerCode = $HostName }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $LogDir ("agent_" + $stamp + ".log")
function W([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z " + $m
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function Sql-Lit([string]$s) {
  if ($null -eq $s) { return "NULL" }
  return "N'" + ($s.Replace("'", "''")) + "'"
}

function Invoke-CentralSql {
  param([string]$SqlText, [switch]$Tsv)
  $sqlcmd = $null
  foreach ($c in @(
    "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE",
    "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE"
  )) { if (Test-Path $c) { $sqlcmd = $c; break } }
  if (-not $sqlcmd) {
    $g = Get-Command sqlcmd.exe -EA SilentlyContinue
    if ($g) { $sqlcmd = $g.Source }
  }
  if (-not $sqlcmd) { throw "sqlcmd.exe not found" }

  $tmp = Join-Path $env:TEMP ("rpma_agent_" + [guid]::NewGuid().ToString("N") + ".sql")
  [IO.File]::WriteAllText($tmp, $SqlText, [Text.UTF8Encoding]::new($false))
  try {
    $args = @("-S", $CentralDataSource, "-d", $CentralDatabase, "-U", $CentralSqlUser, "-P", $CentralSqlPassword, "-C", "-b", "-I")
    if ($Tsv) { $args += @("-h", "-1", "-W", "-s", "|") }
    $args += @("-i", $tmp)
    $out = & $sqlcmd @args 2>&1 | Out-String
    $code = $LASTEXITCODE
    return @{ ExitCode = $code; Text = $out }
  } finally {
    Remove-Item $tmp -Force -EA SilentlyContinue
  }
}

W "=== Agent cycle start v$AgentVersion host=$HostName customer=$CustomerCode ==="

# --- Heartbeat metrics (best effort) ---
$os = $null; $cpu = $null; $mem = $null; $disk = $null
try {
  $os = (Get-CimInstance Win32_OperatingSystem -EA Stop).Caption
  $osCim = Get-CimInstance Win32_OperatingSystem
  $mem = [int]($osCim.FreePhysicalMemory / 1024)
  $diskObj = Get-PSDrive -Name C -EA SilentlyContinue
  if ($diskObj) { $disk = [math]::Round($diskObj.Free / 1GB, 2) }
} catch {}

$detail = @{
  host = $HostName
  roles = $RoleTags
  agentRoot = $AgentRoot
  sqlRoot = $SqlRoot
} | ConvertTo-Json -Compress

$hbSql = @"
SET NOCOUNT ON;
MERGE dbo.Agent_Registry AS t
USING (SELECT $(Sql-Lit $CustomerCode) AS CustomerCode, $(Sql-Lit $HostName) AS HostName) s
ON t.CustomerCode = s.CustomerCode AND t.HostName = s.HostName
WHEN MATCHED THEN UPDATE SET
  LastHeartbeatUtc = SYSUTCDATETIME(),
  AgentVersion = $(Sql-Lit $AgentVersion),
  RoleTags = $(Sql-Lit $RoleTags),
  InstanceName = $(Sql-Lit $InstanceName),
  InstallPath = $(Sql-Lit $AgentRoot),
  LastStatus = N'ONLINE',
  LastMessage = N'heartbeat ok'
WHEN NOT MATCHED THEN INSERT (CustomerCode, HostName, InstanceName, AgentVersion, RoleTags, InstallPath, LastHeartbeatUtc, LastStatus, LastMessage)
  VALUES ($(Sql-Lit $CustomerCode), $(Sql-Lit $HostName), $(Sql-Lit $InstanceName), $(Sql-Lit $AgentVersion), $(Sql-Lit $RoleTags), $(Sql-Lit $AgentRoot), SYSUTCDATETIME(), N'ONLINE', N'registered');

INSERT INTO dbo.Agent_Heartbeat (CustomerCode, HostName, AgentVersion, OsCaption, MemFreeMb, DiskFreeGb, DetailJson)
VALUES ($(Sql-Lit $CustomerCode), $(Sql-Lit $HostName), $(Sql-Lit $AgentVersion), $(Sql-Lit $os), $(if ($null -eq $mem) { 'NULL' } else { $mem }), $(if ($null -eq $disk) { 'NULL' } else { $disk }), $(Sql-Lit $detail));
"@
$r = Invoke-CentralSql -SqlText $hbSql
if ($r.ExitCode -ne 0) { W "WARN heartbeat push: $($r.Text.Substring(0, [Math]::Min(400, $r.Text.Length)))" }
else { W "Heartbeat pushed" }

if ($HeartbeatOnly) {
  W "HeartbeatOnly - done"
  exit 0
}

# --- Job catalog: every Customer.Config.ps1 on this SQL host ---
$jobs = @()
if ($AgentJobs -and $AgentJobs.Count -gt 0) {
  $jobs = $AgentJobs
} else {
  $sysproRunner = Join-Path $SqlRoot "base\syspro-direct\Run-Syspro-Collect-Direct.ps1"
  $nativeRunner = Join-Path $SqlRoot "base\syspro-direct\Collect-Dtr-Native-Fallback.ps1"
  $configs = @()
  $custRoot = Join-Path $SqlRoot "customers"
  if (Test-Path $custRoot) {
    $configs = @(Get-ChildItem -Path $custRoot -Filter "Customer.Config.ps1" -Recurse -EA SilentlyContinue)
  }
  if ($configs.Count -eq 0 -and $CustomerCode) {
    $one = Join-Path $SqlRoot "customers\$CustomerCode\Customer.Config.ps1"
    if (Test-Path $one) { $configs = @(Get-Item $one) }
  }
  if ($configs.Count -eq 0) { W "WARN no Customer.Config.ps1 under $custRoot" }
  foreach ($cfg in $configs) {
    $code = $cfg.Directory.Name
    if (Test-Path $sysproRunner) {
      $jobs += @{
        Name = "syspro-core-$code"
        Customer = $code
        IntervalMin = 30
        Script = $sysproRunner
        Args = @("-ConfigPath", $cfg.FullName, "-JobsErrorsOnly")
      }
      $jobs += @{
        Name = "syspro-jobs-$code"
        Customer = $code
        IntervalMin = 1440
        Script = $sysproRunner
        Args = @("-ConfigPath", $cfg.FullName, "-IncludeJobs")
      }
    }
    if (Test-Path $nativeRunner) {
      $jobs += @{
        Name = "syspro-native-$code"
        Customer = $code
        IntervalMin = 30
        Script = $nativeRunner
        Args = @("-ConfigPath", $cfg.FullName)
      }
    }
  }
  W ("jobs queued: " + $jobs.Count + " from " + $configs.Count + " config(s)")
}

function Test-JobDue([string]$Name, [int]$IntervalMin) {
  $stateFile = Join-Path $LogDir ("last_" + $Name + ".txt")
  if ($ForceJob -and $ForceJob -eq $Name) { return $true }
  if (-not (Test-Path $stateFile)) { return $true }
  try {
    $last = [datetime]::Parse((Get-Content $stateFile -Raw).Trim(), [Globalization.CultureInfo]::InvariantCulture)
    return ((Get-Date).ToUniversalTime() - $last.ToUniversalTime()).TotalMinutes -ge ($IntervalMin - 0.5)
  } catch { return $true }
}

function Set-JobRan([string]$Name) {
  $stateFile = Join-Path $LogDir ("last_" + $Name + ".txt")
  [IO.File]::WriteAllText($stateFile, (Get-Date).ToUniversalTime().ToString("o"))
}

function Report-JobRun {
  param($Name, $Started, $Finished, $ExitCode, $Message, $LogTail, $Code)
  if (-not $Code) { $Code = $CustomerCode }
  $dur = [int]([datetime]$Finished - [datetime]$Started).TotalSeconds
  $ok = if ($ExitCode -eq 0) { 1 } else { 0 }
  $msg = $Message
  if ($msg.Length -gt 1900) { $msg = $msg.Substring(0, 1900) }
  $tail = $LogTail
  if ($tail -and $tail.Length -gt 8000) { $tail = $tail.Substring($tail.Length - 8000) }
  $sql = @"
SET NOCOUNT ON;
INSERT INTO dbo.Agent_JobRun (CustomerCode, HostName, JobName, StartedUtc, FinishedUtc, ExitCode, Success, DurationSec, Message, LogTail)
VALUES ($(Sql-Lit $Code), $(Sql-Lit $HostName), $(Sql-Lit $Name), $(Sql-Lit $Started.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")), $(Sql-Lit $Finished.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")), $ExitCode, $ok, $dur, $(Sql-Lit $msg), $(Sql-Lit $tail));
UPDATE dbo.Agent_Registry
SET LastJobUtc = SYSUTCDATETIME(),
    LastStatus = $(Sql-Lit $(if ($ok -eq 1) { 'OK' } else { 'JOB_FAIL' })),
    LastMessage = $(Sql-Lit ($Name + " exit=" + $ExitCode))
WHERE CustomerCode = $(Sql-Lit $Code) AND HostName = $(Sql-Lit $HostName);
"@
  $rr = Invoke-CentralSql -SqlText $sql
  if ($rr.ExitCode -ne 0) { W "WARN job report: $($rr.Text.Substring(0, [Math]::Min(300, $rr.Text.Length)))" }
}

foreach ($j in $jobs) {
  $name = $j.Name
  $interval = [int]$j.IntervalMin
  if (-not (Test-JobDue -Name $name -IntervalMin $interval)) {
    W "SKIP $name not due (interval ${interval}m)"
    continue
  }
  if (-not (Test-Path -LiteralPath $j.Script)) {
    W "SKIP $name missing script $($j.Script)"
    continue
  }
  W "RUN $name -> $($j.Script)"
  $started = Get-Date
  $outFile = Join-Path $LogDir ("job_" + $name + "_" + $stamp + ".txt")
  $code = 1
  try {
    $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $j.Script) + @($j.Args)
    $p = Start-Process -FilePath "powershell.exe" -ArgumentList $argList `
      -Wait -PassThru -NoNewWindow `
      -RedirectStandardOutput $outFile `
      -RedirectStandardError (Join-Path $LogDir ("job_" + $name + "_" + $stamp + "_err.txt"))
    $code = $p.ExitCode
  } catch {
    $code = 1
    Set-Content -LiteralPath $outFile -Value $_.Exception.Message
  }
  $finished = Get-Date
  $tail = ""
  if (Test-Path $outFile) { $tail = (Get-Content $outFile -Raw -EA SilentlyContinue) }
  W "DONE $name exit=$code"
  Report-JobRun -Name $name -Started $started -Finished $finished -ExitCode $code -Message ("exit=" + $code) -LogTail $tail -Code $(if ($j.Customer) { $j.Customer } else { $CustomerCode })
  if ($code -eq 0) { Set-JobRan -Name $name }
}

W "=== Agent cycle done log=$log ==="
exit 0
