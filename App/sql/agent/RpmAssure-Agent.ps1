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
$httpsLib = Join-Path $AgentRoot 'Lib-RpmaHttps.ps1'
if (Test-Path $httpsLib) { . $httpsLib }

$AgentVersion = "2.9.11"
$HostName = $env:COMPUTERNAME
if (-not $PreferHttps) { $PreferHttps = $true }
if (-not $CentralDataSource) { $CentralDataSource = 'https-only' }
if (-not $CentralDatabase) { $CentralDatabase = "RPMAssure_App" }
if (-not $CentralSqlUser) { $CentralSqlUser = 'https' }
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
$ex = Join-Path $AgentRoot 'Ensure-Assure-Exclusion.ps1'
if (Test-Path $ex) {
  try { & $ex -Root 'C:\RPM-Assure' } catch { W ('WARN exclusion ' + $_.Exception.Message) }
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
  $trust = $true
  if (Get-Command Get-RpmaAgentSettings -ErrorAction SilentlyContinue) {
    try {
      $stEnc = Get-RpmaAgentSettings
      if ($null -ne $stEnc.trustSqlCert) { $trust = [bool]$stEnc.trustSqlCert }
      elseif ($Server -match '^[A-Za-z]') { $trust = $false }
    } catch {}
  }
  $csb['TrustServerCertificate'] = $trust
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
  if ($PreferHttps -or (Test-Path (Join-Path $AgentRoot 'Lib-RpmaHttps.ps1'))) {
    if (Get-Command Invoke-RpmaAssureHttps -ErrorAction SilentlyContinue) {
      try {
        $hr = Invoke-RpmaAssureHttps -Path '/api/agent/sql' -Method POST -TimeoutSec 120 -Body @{
          sql = $SqlText; tsv = [bool]$Tsv; customerCode = $CustomerCode; hostName = $HostName
        }
        if ($hr.Json -and $hr.Json.ok) { return @{ ExitCode = 0; Text = [string]$hr.Json.text } }
        if ($PreferHttps) {
          return @{ ExitCode = 1; Text = $(if ($hr.Json.error) { [string]$hr.Json.error } else { [string]$hr.Text }) }
        }
      } catch {
        if ($PreferHttps) { return @{ ExitCode = 1; Text = $_.Exception.Message } }
      }
    }
  }
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
  if (Get-Command Send-RpmaHttpsCover -ErrorAction SilentlyContinue) {
    try {
      $cr = Send-RpmaHttpsCover -CustomerCode $Code
      if ($cr.Json -and $cr.Json.ok) {
        $j = $cr.Json
        $cover.syspro = $j.syspro
        $cover.rmm = $j.rmm
        $cover.cove = $j.cove
        $cover.epp = $j.epp
        $cover.csp = $j.csp
        if ($j.instanceName) { $cover.instance = [string]$j.instanceName }
        return $cover
      }
    } catch {
      W ("WARN https cover $Code : " + $_.Exception.Message)
    }
  }
  if ($PreferHttps) { return $cover }
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
  $cands = @(
    (Join-Path $SqlRoot ("agent\" + $Name)),
    "C:\RPM-Assure\deploy\ui-pack\Sql\agent\$Name"
  )
  $src = $null
  foreach ($c in $cands) {
    if (Test-Path -LiteralPath $c) { $src = $c; break }
  }
  if (-not $src) {
    if (Test-Path -LiteralPath $dest) { return $dest }
    return $null
  }
  $need = $true
  if (Test-Path -LiteralPath $dest) {
    $srcTime = (Get-Item -LiteralPath $src).LastWriteTimeUtc
    $dstTime = (Get-Item -LiteralPath $dest).LastWriteTimeUtc
    $need = $srcTime -gt $dstTime.AddSeconds(2)
  }
  if ($need) {
    New-Item -ItemType Directory -Force -Path $AgentRoot | Out-Null
    Get-Content -LiteralPath $src -Raw | Set-Content -LiteralPath $dest -Encoding ASCII
    W ("pushed $Name to agent")
  }
  return $dest
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
    $out += [pscustomobject]@{
      Code     = $CustomerCode.ToUpperInvariant()
      Instance = $env:COMPUTERNAME
      Path     = $ConfigPath
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
$os = $null; $cpu = $null; $mem = $null; $disk = $null; $productType = $null
try {
  $osCim = Get-CimInstance Win32_OperatingSystem -EA Stop
  $os = $osCim.Caption
  $productType = [int]$osCim.ProductType
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
$script:NeedHttpsUpdate = $false
$script:NeedHttpsSync = $false
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
    WHEN t.LastStatus IN (N'UPDATE', N'UPDATING', N'QUEUED') THEN t.LastStatus
    ELSE N'ONLINE'
  END,
  LastMessage = CASE
    WHEN t.LastStatus IN (N'UPDATE', N'UPDATING', N'QUEUED') THEN t.LastMessage
    ELSE N'heartbeat ok'
  END
WHEN NOT MATCHED THEN INSERT (CustomerCode, HostName, InstanceName, AgentVersion, RoleTags, InstallPath, LastHeartbeatUtc, LastStatus, LastMessage)
  VALUES ($(Sql-Lit $cc), $(Sql-Lit $HostName), $(Sql-Lit $hc.Instance), $(Sql-Lit $AgentVersion), $(Sql-Lit $RoleTags), $(Sql-Lit $AgentRoot), SYSUTCDATETIME(), N'ONLINE', N'registered');

INSERT INTO dbo.Agent_Heartbeat (CustomerCode, HostName, AgentVersion, OsCaption, MemFreeMb, DiskFreeGb, DetailJson)
VALUES ($(Sql-Lit $cc), $(Sql-Lit $HostName), $(Sql-Lit $AgentVersion), $(Sql-Lit $os), $(if ($null -eq $mem) { 'NULL' } else { $mem }), $(if ($null -eq $disk) { 'NULL' } else { $disk }), $(Sql-Lit $detail));
"@
  $r = $null
  $httpsOk = $false
  if (Get-Command Send-RpmaHttpsHeartbeat -ErrorAction SilentlyContinue) {
    try {
      $hr = Send-RpmaHttpsHeartbeat -CustomerCode $cc -HostName $HostName -AgentVersion $AgentVersion `
        -RoleTags $RoleTags -InstanceName $hc.Instance -InstallPath $AgentRoot `
        -OsCaption $os -MemFreeMb $mem -DiskFreeGb $disk -DetailJson $detail -ProductType $productType
      if ($hr.StatusCode -ge 200 -and $hr.StatusCode -lt 300) {
        $httpsOk = $true
        W ("Heartbeat HTTPS $cc@$HostName")
        if ($hr.Json) {
          if ($hr.Json.requestUpdate) { $script:NeedHttpsUpdate = $true; W 'Assure requested UPDATE via HTTPS' }
          if ($hr.Json.requestSync) { $script:NeedHttpsSync = $true; W 'Assure requested SYNC via HTTPS' }
        }
      }
    } catch {
      W ("WARN https heartbeat $cc : " + $_.Exception.Message)
      if ($PreferHttps) { $hbFailed = $true }
    }
  }
  if (-not $httpsOk) {
    if ($PreferHttps) {
      W "WARN heartbeat $cc skipped SQL (HTTPS only)"
      $hbFailed = $true
    } else {
      $r = Invoke-CentralSql -SqlText $hbSql
      if ($r.ExitCode -ne 0) {
        W ("WARN heartbeat $cc : " + $r.Text.Substring(0, [Math]::Min(400, $r.Text.Length)))
        $hbFailed = $true
      } else {
        W "Heartbeat SQL $cc@$HostName"
      }
    }
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
  $needUp = [bool]$script:NeedHttpsUpdate
  if ($ur.ExitCode -eq 0 -and $ur.Text) {
    foreach ($line in ($ur.Text -split "`r?`n")) {
      if ($line.Trim() -and $line -notmatch 'LastMessage|---') { $needUp = $true }
    }
  }
  $pack = "C:\RPM-Assure\deploy\ui-pack"
  $packVerFile = Join-Path $pack "Sql\agent\VERSION"
  if (-not (Test-Path $packVerFile)) { $packVerFile = Join-Path $pack "sql\agent\VERSION" }
  if (-not (Test-Path $packVerFile)) { $packVerFile = Join-Path $pack "VERSION" }
  $fetchStamp = Join-Path $LogDir "last_pack_fetch.txt"
  $fetchDue = $true
  if (Test-Path $fetchStamp) {
    try {
      $lf = [datetime]::Parse((Get-Content $fetchStamp -Raw).Trim(), [Globalization.CultureInfo]::InvariantCulture)
      if (((Get-Date).ToUniversalTime() - $lf.ToUniversalTime()).TotalMinutes -lt 60) { $fetchDue = $false }
    } catch {}
  }
  $httpsBase = "https://assure.rpmresources.co.za"
  if (Get-Command Get-RpmaAssureUrl -ErrorAction SilentlyContinue) {
    try { $httpsBase = Get-RpmaAssureUrl } catch {}
  }
  # Rule: compare remote VERSION and fetch zip every hour. Heartbeat requestUpdate is immediate.
  $remoteVer = $null
  if ($needUp -or $fetchDue) {
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $wcVer = New-Object Net.WebClient
      $wcVer.Headers['Cache-Control'] = 'no-cache'
      $remoteVer = (($wcVer.DownloadString($httpsBase.TrimEnd('/') + '/downloads/VERSION')) -replace '\s', '')
    } catch {
      W ("WARN remote VERSION " + $_.Exception.Message)
    }
    if ($remoteVer) {
      W ("pack VERSION local=$AgentVersion remote=$remoteVer")
      if ($remoteVer -ne $AgentVersion) { $needUp = $true }
    }
  }
  if ($needUp -or $fetchDue) {
    W "pack fetch HTTPS (needUp=$needUp fetchDue=$fetchDue remote=$remoteVer local=$AgentVersion)"
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $dlDir = "C:\RPM-Assure\downloads"
      New-Item -ItemType Directory -Force -Path $dlDir | Out-Null
      $zip = Join-Path $dlDir "rpm-assure-agent.zip"
      $uri = $httpsBase.TrimEnd('/') + "/downloads/rpm-assure-agent.zip"
      $got = $false
      $attempt = 0
      while (-not $got -and $attempt -lt 3) {
        $attempt++
        try {
          if (Get-Command Start-BitsTransfer -EA SilentlyContinue) {
            Start-BitsTransfer -Source $uri -Destination $zip -ErrorAction Stop
            $got = $true
          }
        } catch { W ("WARN BITS try$attempt " + $_.Exception.Message) }
        if (-not $got) {
          try {
            $wc = New-Object Net.WebClient
            $wc.Headers['Cache-Control'] = 'no-cache'
            $wc.DownloadFile($uri, $zip)
            $got = $true
          } catch { W ("WARN WebClient try$attempt " + $_.Exception.Message); Start-Sleep -Seconds (2 * $attempt) }
        }
      }
      if ((Test-Path $zip) -and (Get-Item $zip).Length -gt 1000) {
        Get-ChildItem $pack -Force -EA SilentlyContinue | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force -EA SilentlyContinue
        New-Item -ItemType Directory -Force -Path $pack | Out-Null
        $tar = Join-Path $env:SystemRoot "System32\tar.exe"
        if (Test-Path $tar) { & $tar -xf $zip -C $pack }
        else {
          Add-Type -AssemblyName System.IO.Compression.FileSystem
          [IO.Compression.ZipFile]::ExtractToDirectory($zip, $pack)
        }
        [IO.File]::WriteAllText($fetchStamp, (Get-Date).ToUniversalTime().ToString("o"))
        W ("pack fetch HTTPS ok bytes=" + (Get-Item $zip).Length)
      } else {
        W "WARN pack fetch empty"
      }
    } catch {
      W ("WARN pack fetch HTTPS " + $_.Exception.Message)
    }
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
    if (-not (Test-Path (Join-Path $from "RpmAssure-Agent.ps1"))) { $from = Join-Path $pack "sql\agent" }
    $applied = $false
    if (Test-Path (Join-Path $from "RpmAssure-Agent.ps1")) {
      $stage = Join-Path $AgentRoot "_next"
      if (Test-Path $stage) { Remove-Item $stage -Recurse -Force -EA SilentlyContinue }
      New-Item -ItemType Directory -Force -Path $stage | Out-Null
      robocopy $from $stage /E /XF Agent.Secrets.bin Agent.Config.ps1 Agent.Settings.json status.json request-sync.flag Update-Agent-From-Central.ps1 /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
      $sysFrom = Join-Path $pack "Sql\base\syspro-direct"
      if (-not (Test-Path $sysFrom)) { $sysFrom = Join-Path $pack "sql\base\syspro-direct" }
      $sysTo = "C:\RPM-Assure\Sql\base\syspro-direct"
      if (Test-Path $sysFrom) {
        New-Item -ItemType Directory -Force -Path $sysTo | Out-Null
        robocopy $sysFrom $sysTo "Collect-Dtr-Native-Fallback.ps1" "Lib-Sqlcmd.ps1" /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
      }
      robocopy $from $AgentRoot /E /XF Agent.Secrets.bin Agent.Config.ps1 Agent.Settings.json status.json request-sync.flag RpmAssure-Agent.ps1 RpmAssure-Agent-Loop.ps1 /XD logs _next /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
      $apply = Join-Path $AgentRoot "Apply-Staged-Pack.ps1"
      if (-not (Test-Path $apply)) { Copy-Item -Force (Join-Path $from "Apply-Staged-Pack.ps1") $apply -EA SilentlyContinue }
      if (Test-Path $apply) {
        schtasks /Create /TN "RPMAssure-ApplyPack" /SC MINUTE /MO 1 /RU SYSTEM /RL HIGHEST /F /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$apply`"" | Out-Null
        W "UPDATE staged - RPMAssure-ApplyPack will copy after this cycle (no hidden cmd)"
      } else {
        W "WARN Apply-Staged-Pack.ps1 missing"
      }
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
      if (Get-Command Send-RpmaHttpsStatus -ErrorAction SilentlyContinue) {
        try { [void](Send-RpmaHttpsStatus -HostName $HostName -Status 'ONLINE' -Message ("updated " + $newVer)) } catch {}
      } elseif (-not $PreferHttps) {
      [void](Invoke-CentralSql -SqlText @"
SET NOCOUNT ON;
UPDATE dbo.Agent_Registry
SET LastStatus = N'ONLINE', LastMessage = N'updated $newVer', AgentVersion = $(Sql-Lit $newVer)
WHERE HostName = $(Sql-Lit $HostName);
"@)
      }
      W "UPDATE applied $newVer - next cycle uses new files"
    } else {
      W "WARN update files missing on this host"
    }
  }
} catch { W ("WARN update check " + $_.Exception.Message) }

$forceCodes = @()
$flag = Join-Path $AgentRoot 'request-sync.flag'
if (Test-Path $flag) {
  W 'SYNC flag from tray'
  if ($CustomerCode) { $forceCodes += $CustomerCode.ToUpperInvariant() }
  Remove-Item $flag -Force -EA SilentlyContinue
}

# Honour Assure UI sync button (RequestSyncUtc) - HTTPS first, SQL fallback
try {
  $httpsSync = $false
  if (Get-Command Invoke-RpmaAssureHttps -ErrorAction SilentlyContinue) {
    try {
      $srH = Invoke-RpmaAssureHttps -Path ('/api/agent/sync?hostName=' + [uri]::EscapeDataString($HostName)) -Method GET
      if ($srH.Json -and $srH.Json.ok) {
        $httpsSync = $true
        foreach ($c in @($srH.Json.requestSync)) {
          if ($c) { $forceCodes += ([string]$c).ToUpperInvariant() }
        }
      }
    } catch { W ("WARN https sync " + $_.Exception.Message) }
  }
  if (-not $httpsSync -and -not $PreferHttps) {
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

    $fwRunner = Ensure-RpmaAgentScript "Collect-Host-Firewall.ps1"
    if ($fwRunner) {
      $jobs += @{
        Name = "host-firewall-$code"
        Customer = $code
        IntervalMin = 60
        Script = $fwRunner
        Args = @("-ConfigPath", $cfg.FullName, "-AgentRoot", $AgentRoot)
      }
    }

    $patchRunner = Ensure-RpmaAgentScript "Collect-Host-Patches.ps1"
    if ($patchRunner) {
      $jobs += @{
        Name = "host-patches-$code"
        Customer = $code
        IntervalMin = 60
        Script = $patchRunner
        Args = @("-ConfigPath", $cfg.FullName, "-AgentRoot", $AgentRoot, "-CustomerCode", $code)
      }
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
    LastStatus = $(Sql-Lit $(if ($ok -eq 1) { "OK" } elseif ($Name -like "syspro-core-*") { "JOB_FAIL" } else { "ONLINE" })),
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
  elseif ($name -like 'syspro-*') { $script:RpmaJobFailed = $true }
  else { W ("WARN $name exit=$code (soft - does not trip tray)") }
}

# Always drop a stale SYNCING flag so the tray / Assure do not sit on "syncing"
$clr = @"
SET NOCOUNT ON;
UPDATE dbo.Agent_Registry
SET LastStatus = N'ONLINE',
    LastMessage = N'sync complete',
    RequestSyncUtc = NULL
WHERE HostName = $(Sql-Lit $HostName)
  AND LastStatus = N'SYNCING';
"@
[void](Invoke-CentralSql -SqlText $clr)
if ($forceCodes.Count) { W "SYNC cleared" }

W "=== Agent cycle done log=$log ==="
Write-RpmaStatusFile -Online (-not $hbFailed) -Message $(if ($script:RpmaJobFailed) { 'job error' } elseif ($hbFailed) { 'disconnected' } else { 'cycle done' }) -HadError ([bool]$script:RpmaJobFailed)
exit 0
