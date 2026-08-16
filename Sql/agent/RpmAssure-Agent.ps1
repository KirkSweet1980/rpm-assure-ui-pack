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
$lib = Join-Path $AgentRoot "Lib-SecureConfig.ps1"
if (Test-Path $lib) {
  . $lib
  $script:RpmaAgentRoot = $AgentRoot
  Import-RpmaAgentSecrets
}

$AgentVersion = "2.5.4"
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

function Write-RpmaStatusFile {
  param([bool]$Online, [string]$Message, [bool]$HadError = $false)
  $lastSync = $null
  $sf = Get-ChildItem $LogDir -Filter 'last_syspro-core-*.txt' -EA SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($sf) {
    try { $lastSync = (Get-Content $sf.FullName -Raw).Trim() } catch {}
  }
  $obj = [ordered]@{
    online           = $Online
    lastHeartbeatUtc = (Get-Date).ToUniversalTime().ToString('o')
    lastSyncUtc      = $lastSync
    lastMessage      = $Message
    error            = [bool]$HadError
    host             = $HostName
    customer         = $CustomerCode
    version          = $AgentVersion
  }
  try {
    ($obj | ConvertTo-Json -Compress) | Set-Content -LiteralPath (Join-Path $AgentRoot 'status.json') -Encoding UTF8
  } catch {}
}

function Sql-Lit([string]$s) {
  if ($null -eq $s) { return "NULL" }
  return "N'" + ($s.Replace("'", "''")) + "'"
}

function Invoke-AdoSql {
  param([string]$Server, [string]$Db, [string]$User, [string]$Pass, [string]$SqlText, [switch]$Tsv)
  $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $csb['Data Source'] = $Server
  $csb['Initial Catalog'] = $Db
  $csb['User ID'] = $User
  $csb['Password'] = $Pass
  $csb['Encrypt'] = $true
  $csb['TrustServerCertificate'] = $true
  $csb['Connect Timeout'] = 45
  $conn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
  try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandTimeout = 180
    $cmd.CommandText = $SqlText
    if ($Tsv) {
      $reader = $cmd.ExecuteReader()
      $lines = New-Object System.Collections.Generic.List[string]
      while ($reader.Read()) {
        $cols = New-Object System.Collections.Generic.List[string]
        for ($i = 0; $i -lt $reader.FieldCount; $i++) {
          if ($reader.IsDBNull($i)) { [void]$cols.Add('') }
          else { [void]$cols.Add([string]$reader.GetValue($i)) }
        }
        [void]$lines.Add(($cols.ToArray() -join '|'))
      }
      $reader.Close()
      return @{ ExitCode = 0; Text = ($lines.ToArray() -join "`n") }
    }
    [void]$cmd.ExecuteNonQuery()
    return @{ ExitCode = 0; Text = '' }
  } catch {
    return @{ ExitCode = 1; Text = $_.Exception.Message }
  } finally {
    $conn.Dispose()
  }
}

function Invoke-CentralSql {
  param([string]$SqlText, [switch]$Tsv)
  $ado = Invoke-AdoSql -Server $CentralDataSource -Db $CentralDatabase -User $CentralSqlUser -Pass $CentralSqlPassword -SqlText $SqlText -Tsv:$Tsv
  if ($ado.ExitCode -eq 0) { return $ado }

  $sqlcmd = $null
  foreach ($c in @(
    "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE",
    "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE",
    "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE"
  )) { if (Test-Path $c) { $sqlcmd = $c; break } }
  if (-not $sqlcmd) {
    $g = Get-Command sqlcmd.exe -EA SilentlyContinue
    if ($g) { $sqlcmd = $g.Source }
  }
  if (-not $sqlcmd) { return $ado }

  $tmp = Join-Path $env:TEMP ("rpma_agent_" + [guid]::NewGuid().ToString("N") + ".sql")
  [IO.File]::WriteAllText($tmp, $SqlText, [Text.UTF8Encoding]::new($false))
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $args = @("-S", $CentralDataSource, "-d", $CentralDatabase, "-U", $CentralSqlUser, "-C", "-b", "-I")
    if ($Tsv) { $args += @("-h", "-1", "-W", "-s", "|") }
    $args += @("-i", $tmp)
    $prev = $env:SQLCMDPASSWORD
    $env:SQLCMDPASSWORD = $CentralSqlPassword
    $out = & $sqlcmd @args 2>&1 | Out-String
    $code = $LASTEXITCODE
    if ($out -match 'Data source name not found') { return $ado }
    return @{ ExitCode = $code; Text = $out }
  } finally {
    $ErrorActionPreference = $old
    if ($null -eq $prev) { Remove-Item Env:SQLCMDPASSWORD -EA SilentlyContinue }
    else { $env:SQLCMDPASSWORD = $prev }
    Remove-Item $tmp -Force -EA SilentlyContinue
  }
}

function Get-RpmaServiceCover([string]$Code) {
  $cover = [ordered]@{
    syspro = $null
    rmm    = $null
    cove   = $null
    epp    = $null
    csp    = $null
    instance = ""
  }
  $q = @"
SET NOCOUNT ON;
SELECT
  ISNULL(CAST(a.PillarSyspro AS int), -1),
  ISNULL(CAST(a.PillarPulseway AS int), -1),
  ISNULL(CAST(a.PillarCove AS int), -1),
  ISNULL(CAST(a.PillarBitdefender AS int), -1),
  ISNULL(CAST(ISNULL(a.PillarCsp, 0) AS int), -1),
  ISNULL(c.SqlInstanceName, N'')
FROM dbo.Dim_Customer c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = $(Sql-Lit $Code);
"@
  $r = Invoke-CentralSql -SqlText $q -Tsv
  if ($r.ExitCode -eq 0 -and $r.Text) {
    foreach ($line in ($r.Text -split "`r?`n")) {
      $t = $line.Trim()
      if (-not $t -or $t -match 'Pillar|SqlInstance|---') { continue }
      $p = $t.Split('|')
      if ($p.Count -lt 5) { continue }
      $cover.syspro = $(if ($p[0] -eq '0') { $false } elseif ($p[0] -eq '1') { $true } else { $null })
      $cover.rmm    = $(if ($p[1] -eq '0') { $false } elseif ($p[1] -eq '1') { $true } else { $null })
      $cover.cove   = $(if ($p[2] -eq '0') { $false } elseif ($p[2] -eq '1') { $true } else { $null })
      $cover.epp    = $(if ($p[3] -eq '0') { $false } elseif ($p[3] -eq '1') { $true } else { $null })
      $cover.csp    = $(if ($p[4] -eq '0') { $false } elseif ($p[4] -eq '1') { $true } else { $null })
      if ($p.Count -gt 5) { $cover.instance = $p[5] }
      break
    }
  }
  return $cover
}

function Ensure-RpmaAgentScript([string]$Name) {
  $dest = Join-Path $AgentRoot $Name
  if (Test-Path -LiteralPath $dest) { return $dest }
  $cands = @(
    (Join-Path $SqlRoot ("agent\" + $Name)),
    "C:\RPM-Assure\deploy\ui-pack\Sql\agent\$Name"
  )
  foreach ($c in $cands) {
    if (-not (Test-Path -LiteralPath $c)) { continue }
    New-Item -ItemType Directory -Force -Path $AgentRoot | Out-Null
    Get-Content -LiteralPath $c -Raw | Set-Content -LiteralPath $dest -Encoding ASCII
    W ("pushed missing $Name to agent")
    return $dest
  }
  return $null
}

function Test-RpmaServiceOnCover($flag, [string]$service, [string]$instanceName) {
  if ($flag -eq $false) { return $false }
  if ($flag -eq $true) { return $true }
  if ($service -eq 'syspro' -and $instanceName) { return $true }
  return $false
}

function Get-RpmaHostCustomers {
  $hostU = $env:COMPUTERNAME.ToUpperInvariant()
  $out = @()
  $custRoot = Join-Path $SqlRoot "customers"
  $files = @()
  if (Test-Path $custRoot) {
    $files = @(Get-ChildItem -Path $custRoot -Filter "Customer.Config.ps1" -Recurse -EA SilentlyContinue)
  }
  foreach ($f in $files) {
    $raw = ""
    try { $raw = Get-Content -LiteralPath $f.FullName -Raw -EA Stop } catch { continue }
    $code = $f.Directory.Name
    $m = [regex]::Match($raw, '(?m)^\s*\$CustomerCode\s*=\s*''([^'']+)''')
    if ($m.Success) { $code = $m.Groups[1].Value }
    $inst = ""
    $mi = [regex]::Match($raw, '(?m)^\s*\$InstanceName\s*=\s*''([^'']+)''')
    if ($mi.Success) { $inst = $mi.Groups[1].Value }
    $instU = $inst.ToUpperInvariant()
    $ok = $false
    if ($instU -and ($instU -eq $hostU -or $instU.Contains($hostU) -or $hostU.Contains($instU))) { $ok = $true }
    if ($ok) {
      $out += [pscustomobject]@{ Code = $code.ToUpperInvariant(); Instance = $inst; Path = $f.FullName }
    }
  }
  if ($out.Count -eq 0 -and $files.Count -eq 1) {
    $code = $files[0].Directory.Name
    $out += [pscustomobject]@{ Code = $code.ToUpperInvariant(); Instance = $env:COMPUTERNAME; Path = $files[0].FullName }
  }
  if ($out.Count -eq 0 -and $CustomerCode) {
    $one = Join-Path $SqlRoot "customers\$CustomerCode\Customer.Config.ps1"
    if (Test-Path $one) {
      $out += [pscustomobject]@{ Code = $CustomerCode.ToUpperInvariant(); Instance = $env:COMPUTERNAME; Path = $one }
    }
  }
  return $out
}

$hostCustomers = @(Get-RpmaHostCustomers)
if ($hostCustomers.Count) {
  $CustomerCode = $hostCustomers[0].Code
  if ($hostCustomers[0].Instance) { $InstanceName = $hostCustomers[0].Instance }
} else {
  Write-Host "WARN no Customer.Config.ps1 matched this host $HostName"
}
W "=== Agent cycle start v$AgentVersion host=$HostName customer=$CustomerCode matched=$($hostCustomers.Count) ==="
$script:RpmaJobFailed = $false
if ($hostCustomers.Count) {
  W ("Host customers: " + (($hostCustomers | ForEach-Object { $_.Code }) -join ','))
}

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

$hbFailed = $false
foreach ($hc in $hostCustomers) {
  $cc = $hc.Code
  $hbSql = @"
SET NOCOUNT ON;
MERGE dbo.Agent_Registry AS t
USING (SELECT $(Sql-Lit $cc) AS CustomerCode, $(Sql-Lit $HostName) AS HostName) s
ON t.CustomerCode = s.CustomerCode AND t.HostName = s.HostName
WHEN MATCHED THEN UPDATE SET
  LastHeartbeatUtc = SYSUTCDATETIME(),
  AgentVersion = $(Sql-Lit $AgentVersion),
  RoleTags = $(Sql-Lit $RoleTags),
  InstanceName = $(Sql-Lit $hc.Instance),
  InstallPath = $(Sql-Lit $AgentRoot),
  LastStatus = CASE
    WHEN t.LastStatus IN (N'UPDATE', N'UPDATING', N'QUEUED', N'SYNCING') THEN t.LastStatus
    ELSE N'ONLINE'
  END,
  LastMessage = CASE
    WHEN t.LastStatus IN (N'UPDATE', N'UPDATING', N'QUEUED', N'SYNCING') THEN t.LastMessage
    ELSE N'heartbeat ok'
  END
WHEN NOT MATCHED THEN INSERT (CustomerCode, HostName, InstanceName, AgentVersion, RoleTags, InstallPath, LastHeartbeatUtc, LastStatus, LastMessage)
  VALUES ($(Sql-Lit $cc), $(Sql-Lit $HostName), $(Sql-Lit $hc.Instance), $(Sql-Lit $AgentVersion), $(Sql-Lit $RoleTags), $(Sql-Lit $AgentRoot), SYSUTCDATETIME(), N'ONLINE', N'registered');

INSERT INTO dbo.Agent_Heartbeat (CustomerCode, HostName, AgentVersion, OsCaption, MemFreeMb, DiskFreeGb, DetailJson)
VALUES ($(Sql-Lit $cc), $(Sql-Lit $HostName), $(Sql-Lit $AgentVersion), $(Sql-Lit $os), $(if ($null -eq $mem) { 'NULL' } else { $mem }), $(if ($null -eq $disk) { 'NULL' } else { $disk }), $(Sql-Lit $detail));
"@
  $r = Invoke-CentralSql -SqlText $hbSql
  if ($r.ExitCode -ne 0) {
    W ("WARN heartbeat $cc : " + $r.Text.Substring(0, [Math]::Min(400, $r.Text.Length)))
    $hbFailed = $true
  } else {
    W "Heartbeat pushed $cc@$HostName"
  }
}
if (-not $hostCustomers.Count) { $hbFailed = $true }
Write-RpmaStatusFile -Online (-not $hbFailed) -Message $(if ($hbFailed) { 'heartbeat failed' } else { 'heartbeat ok' })

# Auto-update: SQL queue (UPDATE) and/or newer VERSION in local git pack
try {
  $qUp = @"
SET NOCOUNT ON;
SELECT TOP 1 LastMessage
FROM dbo.Agent_Registry WITH (NOLOCK)
WHERE HostName = $(Sql-Lit $HostName)
  AND (LastStatus IN (N'UPDATE', N'UPDATING') OR LastMessage LIKE N'update requested%');
"@
  $ur = Invoke-CentralSql -SqlText $qUp -Tsv
  $needUp = $false
  if ($ur.ExitCode -eq 0 -and $ur.Text) {
    foreach ($line in ($ur.Text -split "`r?`n")) {
      if ($line.Trim() -and $line -notmatch 'LastMessage|---') { $needUp = $true }
    }
  }
  $pack = "C:\RPM-Assure\deploy\ui-pack"
  $packVerFile = Join-Path $pack "Sql\agent\VERSION"
  $fetchStamp = Join-Path $LogDir "last_pack_fetch.txt"
  $fetchDue = $true
  if (Test-Path $fetchStamp) {
    try {
      $lf = [datetime]::Parse((Get-Content $fetchStamp -Raw).Trim(), [Globalization.CultureInfo]::InvariantCulture)
      if (((Get-Date).ToUniversalTime() - $lf.ToUniversalTime()).TotalMinutes -lt 360) { $fetchDue = $false }
    } catch {}
  }
  $gitExe = "C:\Program Files\Git\cmd\git.exe"
  if (($needUp -or $fetchDue) -and (Test-Path $gitExe) -and (Test-Path (Join-Path $pack ".git"))) {
    W "pack fetch (needUp=$needUp fetchDue=$fetchDue)"
    & $gitExe -C $pack fetch --all --prune 2>$null | Out-Null
    & $gitExe -C $pack reset --hard origin/main 2>$null | Out-Null
    [IO.File]::WriteAllText($fetchStamp, (Get-Date).ToUniversalTime().ToString("o"))
  }
  if (-not $needUp -and (Test-Path $packVerFile)) {
    $pv = (Get-Content $packVerFile -Raw).Trim()
    if ($pv -and $pv -ne $AgentVersion) {
      W "pack VERSION $pv != local $AgentVersion"
      $needUp = $true
    }
  }
  if ($needUp) {
    W "UPDATE - applying pack to $AgentRoot"
    [void](Invoke-CentralSql -SqlText @"
SET NOCOUNT ON;
UPDATE dbo.Agent_Registry
SET LastStatus = N'UPDATING', LastMessage = N'applying pack'
WHERE HostName = $(Sql-Lit $HostName);
"@)
    $from = Join-Path $pack "Sql\agent"
    $applied = $false
    if (Test-Path (Join-Path $from "RpmAssure-Agent.ps1")) {
      robocopy $from $AgentRoot /E /XF Agent.Secrets.bin Agent.Config.ps1 status.json request-sync.flag Update-Agent-From-Central.ps1 /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
      $applied = $true
    }
    if (-not $applied) {
      $upd = Join-Path $AgentRoot "Update-From-Assure.ps1"
      if (-not (Test-Path $upd)) { $upd = Join-Path $AgentRoot "Update-Agent-From-Central.ps1" }
      if (Test-Path $upd) {
        $old = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $out = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $upd -AgentRoot $AgentRoot 2>&1 | Out-String
        $ErrorActionPreference = $old
        W ("UPDATE script: " + $out.Substring(0, [Math]::Min(300, $out.Length)))
        $applied = $true
      }
    }
    if ($applied) {
      $newVer = $AgentVersion
      if (Test-Path (Join-Path $AgentRoot "VERSION")) {
        $newVer = (Get-Content (Join-Path $AgentRoot "VERSION") -Raw).Trim()
      }
      [void](Invoke-CentralSql -SqlText @"
SET NOCOUNT ON;
UPDATE dbo.Agent_Registry
SET LastStatus = N'ONLINE', LastMessage = N'updated $newVer', AgentVersion = $(Sql-Lit $newVer)
WHERE HostName = $(Sql-Lit $HostName);
"@)
      W "UPDATE applied $newVer - next cycle uses new files"
    }
    W "WARN update files missing on this host"
  }
} catch { W ("WARN update check " + $_.Exception.Message) }

$forceCodes = @()
$flag = Join-Path $AgentRoot 'request-sync.flag'
if (Test-Path $flag) {
  W 'SYNC flag from tray'
  if ($CustomerCode) { $forceCodes += $CustomerCode.ToUpperInvariant() }
  Remove-Item $flag -Force -EA SilentlyContinue
}

# Honour Assure UI sync button (RequestSyncUtc)
try {
  $qSync = @"
SET NOCOUNT ON;
SELECT CustomerCode
FROM dbo.Agent_Registry WITH (NOLOCK)
WHERE HostName = $(Sql-Lit $HostName)
  AND (
    LastStatus = N'QUEUED'
    OR LastMessage LIKE N'sync requested%'
  );
"@
  $sr = Invoke-CentralSql -SqlText $qSync -Tsv
  if ($sr.ExitCode -eq 0) {
    foreach ($line in ($sr.Text -split "`r?`n")) {
      $c = $line.Trim()
      if ($c -and $c -notmatch 'CustomerCode|---') { $forceCodes += $c.ToUpperInvariant() }
    }
  }
  if ($forceCodes.Count) {
    W ("SYNC requested for " + ($forceCodes -join ','))
    $u = @"
SET NOCOUNT ON;
UPDATE dbo.Agent_Registry
SET LastStatus = N'SYNCING', LastMessage = N'collect running'
WHERE HostName = $(Sql-Lit $HostName)
  AND (LastStatus = N'QUEUED' OR LastMessage LIKE N'sync requested%');
"@
    [void](Invoke-CentralSql -SqlText $u)
  }
} catch { W "WARN sync poll $($_.Exception.Message)" }

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
  foreach ($hc in $hostCustomers) {
    if (Test-Path $hc.Path) { $configs += Get-Item $hc.Path }
  }
  if ($configs.Count -eq 0) { W "WARN no host-matched Customer.Config.ps1" }
  foreach ($cfg in $configs) {
    $code = $cfg.Directory.Name
    $cover = Get-RpmaServiceCover $code
    $inst = $cover.instance
    if (-not $inst) { $inst = $InstanceName }
    $sysOn = Test-RpmaServiceOnCover $cover.syspro 'syspro' $inst
    $rmmOn = Test-RpmaServiceOnCover $cover.rmm 'rmm' ''
    $coveOn = Test-RpmaServiceOnCover $cover.cove 'cove' ''
    $eppOn = Test-RpmaServiceOnCover $cover.epp 'epp' ''
    $cspOn = Test-RpmaServiceOnCover $cover.csp 'csp' ''
    $tags = @()
    if ($sysOn) { $tags += 'syspro' }
    if ($rmmOn) { $tags += 'rmm' }
    if ($coveOn) { $tags += 'cove' }
    if ($eppOn) { $tags += 'epp' }
    if ($cspOn) { $tags += 'csp' }
    if (-not $tags.Count) { $tags = @('agent') }
    $RoleTags = ($tags -join ',')
    W ("cover $code syspro=$sysOn rmm=$rmmOn cove=$coveOn epp=$eppOn csp=$cspOn")

    $check = 2
    $sysproLight = 30
    $full = 1440
    if (Get-Command Get-RpmaAgentSettings -EA SilentlyContinue) {
      $st = Get-RpmaAgentSettings
      if ($st.collectIntervalMin) { $check = [int]$st.collectIntervalMin }
      if ($st.jobsIntervalMin) { $full = [int]$st.jobsIntervalMin }
      if ($st.sysproIntervalMin) { $sysproLight = [int]$st.sysproIntervalMin }
    }
    if ($check -lt 1) { $check = 2 }

    if (-not $sysOn) {
      W ("SKIP SYSPRO scripts for $code - no SYSPRO cover")
    } else {
      if (Test-Path $sysproRunner) {
        $jobs += @{
          Name = "syspro-core-$code"
          Customer = $code
          IntervalMin = $sysproLight
          Script = $sysproRunner
          Args = @("-ConfigPath", $cfg.FullName, "-JobsErrorsOnly")
        }
        $jobs += @{
          Name = "syspro-jobs-$code"
          Customer = $code
          IntervalMin = $full
          Script = $sysproRunner
          Args = @("-ConfigPath", $cfg.FullName, "-IncludeJobs")
        }
      }
      if (Test-Path $nativeRunner) {
        $jobs += @{
          Name = "syspro-native-$code"
          Customer = $code
          IntervalMin = $sysproLight
          Script = $nativeRunner
          Args = @("-ConfigPath", $cfg.FullName)
        }
      }
    }

    $iopsRunner = Ensure-RpmaAgentScript "Collect-Host-Iops.ps1"
    if ($iopsRunner) {
      $jobs += @{
        Name = "host-iops-$code"
        Customer = $code
        IntervalMin = $check
        Script = $iopsRunner
        Args = @("-ConfigPath", $cfg.FullName, "-AgentRoot", $AgentRoot)
      }
    } else {
      W "WARN Collect-Host-Iops.ps1 missing - cannot sample disk IOPS"
    }

    $evtRunner = Ensure-RpmaAgentScript "Collect-Windows-EventLog.ps1"
    if ($evtRunner) {
      $jobs += @{
        Name = "win-eventlog-$code"
        Customer = $code
        IntervalMin = $check
        Script = $evtRunner
        Args = @("-ConfigPath", $cfg.FullName, "-AgentRoot", $AgentRoot)
      }
    } else {
      W "WARN Collect-Windows-EventLog.ps1 missing"
    }

    if (-not $rmmOn) { W ("SKIP RMM scripts for $code - no RMM cover") }
    if (-not $coveOn) { W ("SKIP Cove scripts for $code - no Cove cover") }
    if (-not $eppOn) { W ("SKIP EPP scripts for $code - no EPP cover") }
    if (-not $cspOn) { W ("SKIP CSP scripts for $code - no CSP cover") }

    $linkRunner = Join-Path $AgentRoot "Probe-Assure-Link.ps1"
    if (-not (Test-Path $linkRunner)) { $linkRunner = Join-Path $SqlRoot "agent\Probe-Assure-Link.ps1" }
    if (Test-Path $linkRunner) {
      $jobs += @{
        Name = "assure-link-$code"
        Customer = $code
        IntervalMin = $check
        Script = $linkRunner
        Args = @("-ConfigPath", $cfg.FullName, "-AgentRoot", $AgentRoot)
      }
    }
  }
  W ("jobs queued: " + $jobs.Count + " from " + $configs.Count + " config(s)")
}

if (-not ($jobs | Where-Object { $_.Name -like 'host-iops-*' })) {
  $iopsRunner = Ensure-RpmaAgentScript "Collect-Host-Iops.ps1"
  if ($iopsRunner) {
    $jobs += @{
      Name = "host-iops-$CustomerCode"
      Customer = $CustomerCode
      IntervalMin = 2
      Script = $iopsRunner
      Args = @("-AgentRoot", $AgentRoot)
    }
    W "queued host-iops for $CustomerCode (no customer config match)"
  }
}
if (-not ($jobs | Where-Object { $_.Name -like 'win-eventlog-*' })) {
  $evtRunner = Ensure-RpmaAgentScript "Collect-Windows-EventLog.ps1"
  if (Test-Path $evtRunner) {
    $jobs += @{
      Name = "win-eventlog-$CustomerCode"
      Customer = $CustomerCode
      IntervalMin = 2
      Script = $evtRunner
      Args = @("-AgentRoot", $AgentRoot)
    }
    W "queued win-eventlog for $CustomerCode (no customer config match)"
  }
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
  $cust = if ($j.Customer) { [string]$j.Customer } else { $CustomerCode }
  $forced = $ForceJob -eq $name -or (($forceCodes -contains $cust.ToUpperInvariant()) -and ($name -like 'syspro-core-*' -or $name -like 'host-iops-*' -or $name -like 'win-eventlog-*' -or $name -like 'assure-link-*'))
  if (-not $forced -and -not (Test-JobDue -Name $name -IntervalMin $interval)) {
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
  else { $script:RpmaJobFailed = $true }
}

if ($forceCodes.Count) {
  $clr = @"
SET NOCOUNT ON;
UPDATE dbo.Agent_Registry
SET LastStatus = N'OK',
    LastMessage = N'sync complete'
WHERE HostName = $(Sql-Lit $HostName)
  AND (LastStatus IN (N'QUEUED', N'SYNCING') OR LastMessage LIKE N'sync requested%' OR LastMessage = N'collect running');
"@
  [void](Invoke-CentralSql -SqlText $clr)
  W "SYNC cleared"
}

W "=== Agent cycle done log=$log ==="
Write-RpmaStatusFile -Online (-not $hbFailed) -Message $(if ($script:RpmaJobFailed) { 'job error' } elseif ($hbFailed) { 'disconnected' } else { 'cycle done' }) -HadError ([bool]$script:RpmaJobFailed)
exit 0
