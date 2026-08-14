# Central collect: Pulseway API v3 -> RPMAssure_App
# Base URL: https://rpmresourcesza.pulseway.com/api/v3
# ASCII only. Never use $PID.

param(
  [string]$ConfigPath = '',
  # 0 = use env PULSEWAY_MAX_DETAIL or default 400
  [int]$MaxDeviceDetail = 0,
  # Stay under Pulseway caps: 100/5s and 1000/min (default 15 rps)
  [double]$MaxRequestsPerSecond = 0,
  [int]$MaxRetries = 0,
  # Skip per-device metric subpaths (devices/{id} only) - safer for large estates
  [switch]$DetailOnly
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if (-not $ConfigPath) { $ConfigPath = Join-Path $here 'Pulseway.Config.ps1' }
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Missing $ConfigPath - run Write-PulsewayConfig.ps1 first" }
. $ConfigPath

# Rate-limit defaults (env overrides)
if ($MaxRequestsPerSecond -le 0) {
  if ($env:PULSEWAY_RPS) { try { $MaxRequestsPerSecond = [double]$env:PULSEWAY_RPS } catch { $MaxRequestsPerSecond = 15 } }
  else { $MaxRequestsPerSecond = 15 }
}
if ($MaxRetries -le 0) {
  if ($env:PULSEWAY_MAX_RETRIES) { try { $MaxRetries = [int]$env:PULSEWAY_MAX_RETRIES } catch { $MaxRetries = 5 } }
  else { $MaxRetries = 5 }
}
if ($MaxRequestsPerSecond -gt 18) { $MaxRequestsPerSecond = 18 }  # hard ceiling under 100/5s

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = 'https://rpmresourcesza.pulseway.com/api/v3'
}
$BaseUrl = $BaseUrl.TrimEnd('/')
if ([string]::IsNullOrWhiteSpace($TokenId) -or $TokenId -like 'PASTE*') { throw 'Set TokenId in Pulseway.Config.ps1' }
if ([string]::IsNullOrWhiteSpace($TokenSecret) -or $TokenSecret -like 'PASTE*') { throw 'Set TokenSecret in Pulseway.Config.ps1' }
if ([string]::IsNullOrWhiteSpace($SqlServer)) { $SqlServer = '102.222.21.220,14333' }
if ([string]::IsNullOrWhiteSpace($SqlDatabase)) { $SqlDatabase = 'RPMAssure_App' }
if ([string]::IsNullOrWhiteSpace($SqlUser)) { $SqlUser = 'Rpm_collect' }
if ([string]::IsNullOrWhiteSpace($SqlPassword)) { $SqlPassword = 'RpmCollect#AHIC2026' }

# Rate-limit runtime (Write-Log later)
$script:PwMaxRps = [double]$MaxRequestsPerSecond
$script:PwMaxRetries = [int]$MaxRetries


$logDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("pulseway_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}
Write-Log ("Rate limit: maxRps=$($script:PwMaxRps) maxRetries=$($script:PwMaxRetries) (Pulseway caps 100/5s, 1000/min)")

function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @(
    'D:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
  )) { if (Test-Path $p) { return $p } }
  throw 'sqlcmd not found'
}

function Get-BasicAuthHeader {
  $pair = '{0}:{1}' -f $TokenId, $TokenSecret
  $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  return @{ Authorization = "Basic $b64"; Accept = 'application/json' }
}

# --- Pulseway rate limits: 100 req / 5s, 1000 req / 1 min (account token) ---
$script:PwRequestTimes = New-Object 'System.Collections.Generic.Queue[datetime]'
$script:PwLastRequestUtc = $null
$script:PwRequestCount = 0
$script:PwRetryCount = 0
$script:PwThrottleWaits = 0

function Wait-PwRateLimit {
  # Soft caps leave headroom under official limits
  $softPer5s = 90
  $softPer60s = 950
  $minIntervalMs = [math]::Ceiling(1000.0 / [math]::Max(1.0, [double]$script:PwMaxRps))

  $guard = 0
  while ($guard -lt 40) {
    $guard++
    $now = [datetime]::UtcNow
    while ($script:PwRequestTimes.Count -gt 0 -and ($now - $script:PwRequestTimes.Peek()).TotalSeconds -gt 60) {
      [void]$script:PwRequestTimes.Dequeue()
    }
    $in5 = 0
    foreach ($ts in $script:PwRequestTimes) {
      if (($now - $ts).TotalSeconds -le 5) { $in5++ }
    }
    $in60 = $script:PwRequestTimes.Count

    if ($in5 -ge $softPer5s) {
      $script:PwThrottleWaits++
      Start-Sleep -Milliseconds 1200
      continue
    }
    if ($in60 -ge $softPer60s) {
      $script:PwThrottleWaits++
      Start-Sleep -Seconds 5
      continue
    }
    if ($null -ne $script:PwLastRequestUtc) {
      $elapsed = ($now - $script:PwLastRequestUtc).TotalMilliseconds
      if ($elapsed -lt $minIntervalMs) {
        $script:PwThrottleWaits++
        Start-Sleep -Milliseconds ([int]([math]::Max(1, $minIntervalMs - $elapsed)))
        continue
      }
    }
    break
  }
}

function Register-PwRequest {
  $now = [datetime]::UtcNow
  $script:PwLastRequestUtc = $now
  $script:PwRequestTimes.Enqueue($now)
  $script:PwRequestCount++
}

function Invoke-PwGet([string]$Path) {
  $url = if ($Path.StartsWith('http')) { $Path } else { "$BaseUrl/$($Path.TrimStart('/'))" }
  $attempt = 0
  $maxAttempts = [math]::Max(1, [int]$script:PwMaxRetries) + 1

  while ($attempt -lt $maxAttempts) {
    $attempt++
    Wait-PwRateLimit
    try {
      $resp = Invoke-WebRequest -Uri $url -Headers (Get-BasicAuthHeader) -Method GET -UseBasicParsing -TimeoutSec 180
      Register-PwRequest
      $obj = $null
      try { $obj = $resp.Content | ConvertFrom-Json } catch { }
      return [pscustomobject]@{ Ok = $true; Status = [int]$resp.StatusCode; Url = $url; Json = $obj; Raw = $resp.Content; Error = $null }
    } catch {
      $status = $null; $raw = $null
      if ($_.Exception.Response) {
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        try {
          $stream = $_.Exception.Response.GetResponseStream()
          if ($stream) { $raw = (New-Object System.IO.StreamReader($stream)).ReadToEnd() }
        } catch {}
      }
      $msg = $_.Exception.Message
      $is429 = ($status -eq 429) -or ($msg -match '(?i)too many requests|rate limit|throttl')
      $is5xx = ($null -ne $status -and $status -ge 500 -and $status -lt 600)
      if (($is429 -or $is5xx) -and $attempt -lt $maxAttempts) {
        $script:PwRetryCount++
        # 429: 30s, 60s, 90s... ; 5xx: shorter
        $backoffSec = if ($is429) { 30 * $attempt } else { 5 * $attempt }
        if ($backoffSec -gt 120) { $backoffSec = 120 }
        Write-Log ("API retry attempt=$attempt status=$status wait=${backoffSec}s url=$Path")
        Start-Sleep -Seconds $backoffSec
        continue
      }
      Register-PwRequest  # still count failed attempts against window
      return [pscustomobject]@{ Ok = $false; Status = $status; Url = $url; Json = $null; Raw = $raw; Error = $msg }
    }
  }
  return [pscustomobject]@{ Ok = $false; Status = 429; Url = $url; Json = $null; Raw = $null; Error = 'Max retries exceeded' }
}

function Get-DataArray($json) {
  if ($null -eq $json) { return @() }
  if ($json -is [System.Array]) { return @($json) }
  foreach ($prop in @('Data', 'data', 'Items', 'items', 'Results', 'results', 'Devices', 'devices', 'Organizations', 'organizations', 'Notifications', 'notifications')) {
    if ($json.PSObject.Properties.Name -contains $prop -and $null -ne $json.$prop) {
      return @($json.$prop)
    }
  }
  return @($json)
}


function Get-Prop($obj, [string[]]$names) {
  if ($null -eq $obj) { return $null }
  foreach ($n in $names) {
    if ($obj.PSObject.Properties.Name -contains $n) {
      $v = $obj.$n
      if ($null -ne $v -and "$v" -ne '') { return $v }
    }
  }
  return $null
}

function Get-NestedProp($obj, [string[]]$paths) {
  # paths like "Network.LocalIp" or single property names
  if ($null -eq $obj) { return $null }
  foreach ($path in $paths) {
    $cur = $obj
    $ok = $true
    foreach ($seg in ($path -split '\.')) {
      if ($null -eq $cur) { $ok = $false; break }
      if ($cur.PSObject.Properties.Name -contains $seg) { $cur = $cur.$seg }
      else { $ok = $false; break }
    }
    if ($ok -and $null -ne $cur -and "$cur" -ne '') { return $cur }
  }
  return $null
}

function Coerce-Online($v) {
  if ($null -eq $v) { return $null }
  $s = "$v".Trim().ToLowerInvariant()
  if ($s -in @('1','true','yes','online','up','available','connected')) { return $true }
  if ($s -in @('0','false','no','offline','down','unavailable','disconnected')) { return $false }
  $n = 0
  if ([int]::TryParse($s, [ref]$n)) { return ($n -ne 0) }
  return $null
}

function Coerce-Pct($v) {
  if ($null -eq $v -or "$v" -eq '') { return $null }
  $n = 0.0
  if ([double]::TryParse(("$v" -replace '%',''), [ref]$n)) {
    if ($n -le 1.0 -and $n -gt 0) { $n = $n * 100 } # 0.42 -> 42
    return [math]::Round($n, 2)
  }
  return $null
}


function Parse-UptimeDays($v) {
  # Pulseway often sends Uptime as a display string, not seconds.
  # Examples: "Online 23d 4h 12m", "Offline", "up 5 days", 1987200 (seconds), 21 (days)
  if ($null -eq $v) { return $null }
  if ($v -is [bool]) { return $null }  # Online flag, not duration

  # Numeric raw values
  if ($v -is [ValueType] -and -not ($v -is [string]) -and -not ($v -is [datetime])) {
    try {
      $n = [double]$v
      if (-not [double]::IsFinite($n) -or $n -lt 0) { return $null }
      # Unix epoch ms / s mistaken for uptime? reject
      if ($n -gt 1e12) { return $null }
      if ($n -gt 1e10) { return $null }
      # seconds (typical agent uptime)
      if ($n -ge 86400) { return [math]::Round($n / 86400.0, 2) }
      # hours (48h .. 86399 treated as hours only if > 48; else days)
      if ($n -gt 48 -and $n -lt 86400) { return [math]::Round($n / 24.0, 2) }
      # small numbers: treat as days
      return [math]::Round($n, 2)
    } catch { return $null }
  }

  if ($v -is [datetime]) {
    try {
      return [math]::Round(([datetime]::UtcNow - ([datetime]$v).ToUniversalTime()).TotalDays, 2)
    } catch { return $null }
  }

  $s = ("$v").Trim()
  if (-not $s) { return $null }
  # Pure status — no duration
  if ($s -match '^(?i)(true|false|online|offline|null|n/?a|unknown|-)$') { return $null }

  # ISO / date string as last boot
  if ($s -match '^\d{4}-\d{2}-\d{2}') {
    try {
      $bt = [datetime]::Parse($s, [cultureinfo]::InvariantCulture)
      return [math]::Round(([datetime]::UtcNow - $bt.ToUniversalTime()).TotalDays, 2)
    } catch {}
  }

  # Normalize separators: "23d:04h:12m" "23d, 4h" "23 days, 4 hours"
  $norm = $s -replace '[:,]', ' '
  $norm = $norm -replace '\s+', ' '

  $days = 0.0; $hours = 0.0; $mins = 0.0; $secs = 0.0; $hit = $false

  # days
  if ($norm -match '(?i)(\d+(?:\.\d+)?)\s*d(?:ay)?s?\b') {
    $days = [double]$Matches[1]; $hit = $true
  }
  # hours (avoid matching "h" inside other words — use h / hr / hour)
  if ($norm -match '(?i)(\d+(?:\.\d+)?)\s*h(?:r|ours?)?\b') {
    $hours = [double]$Matches[1]; $hit = $true
  }
  # minutes — require min or m as whole unit (not just trailing m in random words)
  if ($norm -match '(?i)(\d+(?:\.\d+)?)\s*(?:min(?:ute)?s?|m)\b') {
    # careful: "23d 4h 12m" — m is minutes
    $mins = [double]$Matches[1]; $hit = $true
  }
  if ($norm -match '(?i)(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?\b') {
    # only if we already have d/h or string looks like duration
    if ($hit -or $norm -match '(?i)sec') {
      $secs = [double]$Matches[1]; $hit = $true
    }
  }

  if ($hit) {
    return [math]::Round($days + $hours / 24.0 + $mins / 1440.0 + $secs / 86400.0, 2)
  }

  # "Online 23" / "up 23" without unit -> days
  if ($norm -match '(?i)(?:online|up|uptime)\s+(\d+(?:\.\d+)?)\s*$') {
    return [math]::Round([double]$Matches[1], 2)
  }

  # TimeSpan-like "7.04:12:00" (days.hours:min:sec) or "04:12:00" hours
  if ($norm -match '^(?i)(?:online|offline|up)?\s*(\d+)\.(\d{1,2}):(\d{2})(?::(\d{2}))?') {
    $d = [double]$Matches[1]; $h = [double]$Matches[2]; $m = [double]$Matches[3]
    $sec = if ($Matches[4]) { [double]$Matches[4] } else { 0 }
    return [math]::Round($d + $h / 24.0 + $m / 1440.0 + $sec / 86400.0, 2)
  }
  if ($norm -match '^(\d{1,3}):(\d{2}):(\d{2})$') {
    $h = [double]$Matches[1]; $m = [double]$Matches[2]; $sec = [double]$Matches[3]
    return [math]::Round($h / 24.0 + $m / 1440.0 + $sec / 86400.0, 2)
  }

  # bare number string
  if ($norm -match '^(?i)(\d+(?:\.\d+)?)$') {
    return (Parse-UptimeDays ([double]$Matches[1]))
  }

  return $null
}

function Get-DeviceUptimeRaw($d) {
  # Prefer human Uptime string from Pulseway v3 detail
  $raw = Get-Prop $d @('Uptime','uptime','AgentUptime','SystemUptime','UpTime','ComputerUptime')
  if ($null -ne $raw -and "$raw" -ne '' -and -not ($raw -is [bool])) { return $raw }
  $raw = Get-NestedProp $d @('Status.Uptime','Agent.Uptime','Computer.Uptime','System.Uptime','Performance.Uptime')
  if ($null -ne $raw -and "$raw" -ne '' -and -not ($raw -is [bool])) { return $raw }
  $raw = Get-Prop $d @('UptimeSeconds','UptimeDays','DaysSinceReboot','SystemUpTimeSeconds')
  if ($null -ne $raw) { return $raw }
  return $null
}
function Convert-ToGb($v) {
  if ($null -eq $v -or "$v" -eq '') { return $null }
  if ($v -is [bool]) { return $null }
  $s = ("$v").Trim()
  if ($s -match '^(?i)true|false|online|offline|null|n/a$') { return $null }
  # "100 GB" / "50.5GB" / "1024 MB" / "1 TB"
  if ($s -match '(?i)^\s*([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|MB|KB|B|TiB|GiB|MiB)?\s*$') {
    $n = [double]$Matches[1]
    $u = $Matches[2]
    if (-not $u) {
      # bare number: treat as bytes if huge, else GB if reasonable volume size, else bytes if > 1e6
      if ($n -gt 1e12) { return [math]::Round($n / 1GB, 2) }
      if ($n -gt 1e9) { return [math]::Round($n / 1GB, 2) }  # bytes
      if ($n -gt 1e6) { return [math]::Round($n / 1MB, 2) }  # maybe MB? prefer bytes/GB
      # values like 476.5 likely already GB
      if ($n -le 100000) { return [math]::Round($n, 2) }
      return [math]::Round($n / 1GB, 2)
    }
    switch ($u.ToUpper()) {
      'TB' { return [math]::Round($n * 1024, 2) }
      'TIB' { return [math]::Round($n * 1024, 2) }
      'GB' { return [math]::Round($n, 2) }
      'GIB' { return [math]::Round($n, 2) }
      'MB' { return [math]::Round($n / 1024, 2) }
      'MIB' { return [math]::Round($n / 1024, 2) }
      'KB' { return [math]::Round($n / 1048576, 2) }
      'B' { return [math]::Round($n / 1GB, 2) }
      default { return [math]::Round($n, 2) }
    }
  }
  try {
    $n = [double]$s
    if ($n -gt 1e9) { return [math]::Round($n / 1GB, 2) }
    if ($n -gt 1e6 -and $n -lt 1e9) { return [math]::Round($n / 1MB / 1024, 2) }
    return [math]::Round($n, 2)
  } catch { return $null }
}

function Convert-LooseDouble($v) {
  if ($null -eq $v -or "$v" -eq '') { return $null }
  if ($v -is [bool]) { return $null }
  try {
    if ($v -is [double] -or $v -is [float] -or $v -is [decimal] -or $v -is [int] -or $v -is [long] -or $v -is [uint32] -or $v -is [uint64]) {
      return [double]$v
    }
  } catch {}
  $s = ("$v").Trim() -replace '\s','' -replace ',', '.'
  $n = 0.0
  if ([double]::TryParse($s, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$n)) {
    return $n
  }
  return $null
}

function Get-DiskSizePair($drv) {
  $total = $null; $free = $null; $usedPct = $null
  if ($null -eq $drv) { return @{ Total = $null; Free = $null; UsedPct = $null } }
  if ($drv -is [string] -or $drv -is [ValueType]) {
    return @{ Total = $null; Free = $null; UsedPct = $null }
  }

  # --- Pulseway v3 primary shape: Name, System, FreePercentage, TotalValue (KB) ---
  $hasPwTotal = $false
  if ($drv.PSObject.Properties.Name -contains 'TotalValue' -and $null -ne $drv.TotalValue) {
    $tvn = Convert-LooseDouble $drv.TotalValue
    if ($null -ne $tvn -and $tvn -gt 0) {
      # Pulseway TotalValue is kilobytes (confirmed from live estate)
      $total = [math]::Round($tvn / 1048576.0, 2)
      $hasPwTotal = $true
      # Guard: if "GB" would be absurdly small for disk (<0.05) and value looks like bytes, re-interpret
      if ($total -lt 0.05 -and $tvn -gt 1e6) {
        $total = [math]::Round($tvn / 1GB, 2)
      }
      # Guard: if KB conversion yields multi-petabyte nonsense, try bytes
      if ($total -gt 1000000) {
        $asBytes = [math]::Round($tvn / 1GB, 2)
        if ($asBytes -ge 0.1 -and $asBytes -le 1000000) { $total = $asBytes }
      }
    }
  }

  $fp = $null
  if ($drv.PSObject.Properties.Name -contains 'FreePercentage' -and $null -ne $drv.FreePercentage) {
    $fp = Convert-LooseDouble $drv.FreePercentage
  }
  if ($null -eq $fp) {
    $fp = Convert-LooseDouble (Get-Prop $drv @('PercentFree','FreePercent','FreePct','PercentAvailable','FreePercentValue'))
  }
  if ($null -ne $fp) {
    if ($fp -lt 0) { $fp = 0 }
    if ($fp -gt 100) { $fp = 100 }
    $usedPct = [math]::Round(100.0 - $fp, 2)
    if ($null -ne $total) {
      $free = [math]::Round([double]$total * ($fp / 100.0), 2)
    }
  }

  # --- Generic fallbacks when not Pulseway shape ---
  if (-not $hasPwTotal) {
    foreach ($wrap in @('Size','Space','Capacity','Usage','Stats','Metrics','Volume','Disk')) {
      if ($drv.PSObject.Properties.Name -notcontains $wrap) { continue }
      $w = $drv.$wrap
      if ($null -eq $w -or $w -is [string] -or $w -is [ValueType]) { continue }
      foreach ($prop in $w.PSObject.Properties) {
        $drv | Add-Member -NotePropertyName ($wrap + '_' + $prop.Name) -NotePropertyValue $prop.Value -Force
        $drv | Add-Member -NotePropertyName $prop.Name -NotePropertyValue $prop.Value -Force
      }
    }
    $totalRaw = Get-Prop $drv @(
      'TotalGb','SizeGb','CapacityGb','TotalSizeGb','TotalSpaceGb','SizeInGb','CapacityInGb',
      'Total','Size','Capacity','TotalSize','TotalSpace','SizeBytes','TotalBytes','CapacityBytes',
      'SizeInBytes','TotalSizeBytes','CapacityInBytes','TotalCapacity','DiskSize','VolumeSize',
      'Size_Total','Size_Value','Space_Total','Capacity_Total','Size_Size'
    )
    $freeRaw = Get-Prop $drv @(
      'FreeGb','AvailableGb','FreeSpaceGb','FreeSizeGb','FreeInGb',
      'Free','FreeSpace','Available','Remaining','FreeBytes','AvailableBytes','FreeSpaceBytes',
      'FreeSize','AvailableSpace','Size_Free','Space_Free','Capacity_Free','FreeSpaceInBytes'
    )
    $usedRaw = Get-Prop $drv @(
      'UsedGb','UsedSpaceGb','UsedBytes','Used','UsedSpace','Size_Used','Space_Used'
    )
    if ($null -eq $total) { $total = Convert-ToGb $totalRaw }
    if ($null -eq $free) { $free = Convert-ToGb $freeRaw }
    $used = Convert-ToGb $usedRaw
    if ($null -eq $total -and $null -ne $free -and $null -ne $used) {
      try { $total = [math]::Round([double]$free + [double]$used, 2) } catch {}
    }
    if ($null -eq $free -and $null -ne $total -and $null -ne $used) {
      try { $free = [math]::Round([double]$total - [double]$used, 2) } catch {}
    }
  }

  if ($null -eq $usedPct) {
    $usedPct = Coerce-Pct (Get-Prop $drv @('UsedPct','Usage','PercentUsed','used_pct','UsedPercent','PercentFull','Utilization'))
  }
  # Free from used% when free still missing
  if ($null -eq $free -and $null -ne $total -and $null -ne $usedPct) {
    try {
      $free = [math]::Round([double]$total * ((100.0 - [double]$usedPct) / 100.0), 2)
    } catch {}
  }
  if ($null -eq $usedPct -and $null -ne $total -and $null -ne $free -and [double]$total -gt 0) {
    try { $usedPct = [math]::Round((([double]$total - [double]$free) / [double]$total) * 100, 2) } catch {}
  }

  # Sample log once
  if (-not $script:LoggedDiskSizeMath -and $null -ne $total) {
    $script:LoggedDiskSizeMath = $true
    $nm = Get-Prop $drv @('Name','DriveLetter','Letter','MountPoint')
    Write-Log ("disk size math name={0} totalGb={1} freeGb={2} usedPct={3} totalValueRaw={4} freePctRaw={5}" -f $nm, $total, $free, $usedPct, (Get-Prop $drv @('TotalValue')), (Get-Prop $drv @('FreePercentage')))
  }
  return @{ Total = $total; Free = $free; UsedPct = $usedPct }
}



function Get-DiskMediaType($drv) {
  if ($null -eq $drv -or $drv -is [string] -or $drv -is [ValueType]) { return $null }
  $raw = Get-Prop $drv @(
    'MediaType','DriveType','DiskType','InterfaceType','BusType','StorageType','Type',
    'Media','DriveMediaType','PhysicalMediaType','HardwareType','DeviceType'
  )
  if ($null -eq $raw -or "$raw" -eq '') {
    foreach ($wrap in @('Hardware','PhysicalDisk','Disk','Drive','Info')) {
      if ($drv.PSObject.Properties.Name -notcontains $wrap) { continue }
      $w = $drv.$wrap
      if ($null -eq $w -or $w -is [string] -or $w -is [ValueType]) { continue }
      $raw = Get-Prop $w @('MediaType','DriveType','InterfaceType','BusType','Type')
      if ($null -ne $raw -and "$raw" -ne '') { break }
    }
  }
  if ($null -eq $raw -or "$raw" -eq '') { return $null }
  $s = ("$raw").Trim()
  if ($s.Length -gt 40) { $s = $s.Substring(0, 40) }
  return $s
}

function Get-DiskIops($drv) {
  # Returns @{ Read; Write; Total } from Pulseway disk/metric payloads when present
  $empty = @{ Read = $null; Write = $null; Total = $null }
  if ($null -eq $drv -or $drv -is [string] -or $drv -is [ValueType]) { return $empty }
  $read = Get-Prop $drv @(
    'ReadIops','ReadIOPS','IopsRead','IOPSRead','ReadsPerSecond','DiskReadsPerSec',
    'ReadOps','ReadOperations','ReadsPerSec','DiskReadIops'
  )
  $write = Get-Prop $drv @(
    'WriteIops','WriteIOPS','IopsWrite','IOPSWrite','WritesPerSecond','DiskWritesPerSec',
    'WriteOps','WriteOperations','WritesPerSec','DiskWriteIops'
  )
  $total = Get-Prop $drv @(
    'TotalIops','Iops','IOPS','DiskIops','DiskIOPS','IopsTotal','TotalIOPS',
    'OperationsPerSecond','OpsPerSec','IOOperationsPerSec'
  )
  foreach ($wrap in @('Performance','Metrics','Stats','Io','IO','Throughput','Counters')) {
    if ($drv.PSObject.Properties.Name -notcontains $wrap) { continue }
    $w = $drv.$wrap
    if ($null -eq $w -or $w -is [string] -or $w -is [ValueType]) { continue }
    if ($null -eq $read) {
      $read = Get-Prop $w @('ReadIops','ReadIOPS','IopsRead','ReadsPerSecond','DiskReadsPerSec','ReadOps')
    }
    if ($null -eq $write) {
      $write = Get-Prop $w @('WriteIops','WriteIOPS','IopsWrite','WritesPerSecond','DiskWritesPerSec','WriteOps')
    }
    if ($null -eq $total) {
      $total = Get-Prop $w @('TotalIops','Iops','IOPS','DiskIops','OperationsPerSecond')
    }
  }
  $r = $null; $wr = $null; $t = $null
  foreach ($pair in @(@{n='r';v=$read}, @{n='w';v=$write}, @{n='t';v=$total})) {
    if ($null -eq $pair.v -or "$($pair.v)" -eq '') { continue }
    try {
      $n = [double](("$($pair.v)").Replace(',','.'))
      if ($n -lt 0 -or $n -gt 100000000) { continue }
      $rounded = [math]::Round($n, 2)
      if ($pair.n -eq 'r') { $r = $rounded }
      elseif ($pair.n -eq 'w') { $wr = $rounded }
      else { $t = $rounded }
    } catch {}
  }
  if ($null -eq $t -and ($null -ne $r -or $null -ne $wr)) {
    $sum = 0.0
    if ($null -ne $r) { $sum += $r }
    if ($null -ne $wr) { $sum += $wr }
    $t = [math]::Round($sum, 2)
  }
  return @{ Read = $r; Write = $wr; Total = $t }
}


function SqlEsc([string]$s) {

  if ($null -eq $s) { return 'NULL' }
  return "N'" + ($s.Replace("'", "''")) + "'"
}
function SqlInt($v) {
  if ($null -eq $v -or "$v" -eq '') { return 'NULL' }
  try {
    return ([int][math]::Round([double]$v)).ToString([Globalization.CultureInfo]::InvariantCulture)
  } catch {}
  $s = ("$v").Trim() -replace '\s','' -replace ',', '.'
  $n = 0
  if ([int]::TryParse($s, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$n)) {
    return $n.ToString([Globalization.CultureInfo]::InvariantCulture)
  }
  $d = 0.0
  if ([double]::TryParse($s, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$d)) {
    return ([int][math]::Round($d)).ToString([Globalization.CultureInfo]::InvariantCulture)
  }
  return 'NULL'
}
function SqlDec($v) {
  # Always emit invariant (dot) decimals — SA locale would produce "1099,37" and break SQL inserts
  if ($null -eq $v -or "$v" -eq '') { return 'NULL' }
  try {
    $n = [double]$v
    if ([double]::IsNaN($n) -or [double]::IsInfinity($n)) { return 'NULL' }
    return $n.ToString('0.######', [Globalization.CultureInfo]::InvariantCulture)
  } catch {}
  $s = ("$v" -replace '%','').Trim() -replace '\s','' -replace ',', '.'
  $n = 0.0
  if ([double]::TryParse($s, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$n)) {
    return $n.ToString('0.######', [Globalization.CultureInfo]::InvariantCulture)
  }
  return 'NULL'
}

function SqlBit($v) {
  if ($null -eq $v) { return 'NULL' }
  if ($v -eq $true -or "$v" -eq '1' -or "$v" -eq 'True' -or "$v" -eq 'true') { return '1' }
  if ($v -eq $false -or "$v" -eq '0' -or "$v" -eq 'False' -or "$v" -eq 'false') { return '0' }
  # Pulseway sometimes returns Online as string Online/Offline
  if ("$v" -match '^(online|up|yes)$') { return '1' }
  if ("$v" -match '^(offline|down|no)$') { return '0' }
  return 'NULL'
}
function SqlDt($v) {
  if ($null -eq $v -or "$v" -eq '') { return 'NULL' }
  try {
    $d = [datetime]::Parse("$v", [Globalization.CultureInfo]::InvariantCulture)
    return ("'{0:yyyy-MM-ddTHH:mm:ss.fff}'" -f $d.ToUniversalTime())
  } catch { return 'NULL' }
}

function Invoke-SqlFile {
  param([string]$SqlText, [string]$Label, [switch]$Soft)
  $sqlcmd = Find-Sqlcmd
  $tmp = Join-Path $logDir ("{0}_{1:HHmmss}.sql" -f $Label, (Get-Date))
  [IO.File]::WriteAllText($tmp, $SqlText, [Text.UTF8Encoding]::new($false))
  & $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -b -i $tmp *>&1 | ForEach-Object {
    $t = "$_"
    Add-Content -LiteralPath $log -Value $t
    Write-Host $t
  }
  if ($LASTEXITCODE -ne 0) {
    if ($Soft) {
      Write-Log ("SQL soft-fail " + $Label + " exit=" + $LASTEXITCODE)
      return $false
    }
    throw "sqlcmd failed $LASTEXITCODE for $Label"
  }
  return $true
}

Write-Log '=== Pulseway collect start ==='
Write-Log ("BaseUrl=" + $BaseUrl)
Write-Log ("SQL=" + $SqlServer + "/" + $SqlDatabase)

Write-Log 'GET environment'
$envRes = Invoke-PwGet 'environment'
if (-not $envRes.Ok) {
  Write-Log ("Auth FAIL " + $envRes.Status + " " + $envRes.Error)
  throw 'Pulseway auth/environment failed'
}
Write-Log ('environment OK ' + $envRes.Status)

$snap = (Get-Date).ToString('yyyy-MM-dd')
$imported = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fff')

# --- load maps from SQL (alias + map) ---
$orgMap = @{}   # name lower -> code
$idMap = @{}    # id -> code

function Add-Map([string]$name, $id, [string]$code) {
  if ([string]::IsNullOrWhiteSpace($code)) { return }
  if (-not [string]::IsNullOrWhiteSpace($name)) {
    $orgMap[$name.Trim().ToLowerInvariant()] = $code.Trim()
  }
  if ($null -ne $id -and "$id" -match '^\d+$') {
    $idMap[[int]$id] = $code.Trim()
  }
}

$mapSql = @'
SET NOCOUNT ON;
SELECT LTRIM(RTRIM(OrganizationName)) AS N, OrganizationId AS I, LTRIM(RTRIM(CustomerCode)) AS C
FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK) WHERE Active = 1
UNION ALL
SELECT LTRIM(RTRIM(OrganizationName)), OrganizationId, LTRIM(RTRIM(CustomerCode))
FROM dbo.Dim_Pulseway_OrgAlias WITH (NOLOCK) WHERE Active = 1;
'@
try {
  $sqlcmd = Find-Sqlcmd
  $tmp = Join-Path $logDir 'read_map.sql'
  [IO.File]::WriteAllText($tmp, $mapSql, [Text.UTF8Encoding]::new($false))
  $rawOut = & $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -W -s "`t" -h -1 -i $tmp 2>&1 | Out-String
  foreach ($line in ($rawOut -split "`r?`n")) {
    if ($line -match 'rows affected' -or $line -match '^-+' -or [string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line -split "`t"
    if ($parts.Count -ge 3) {
      Add-Map $parts[0].Trim() $parts[1].Trim() $parts[2].Trim()
    }
  }
} catch {
  Write-Log ('Map load soft-fail: ' + $_.Exception.Message)
}
Write-Log ('Org map names=' + $orgMap.Count + ' ids=' + $idMap.Count)

# Also seed Dim_Customer.PulsewayOrgName if set
try {
  $tmp = Join-Path $logDir 'read_cust_pw.sql'
  $q = "SET NOCOUNT ON; SELECT LTRIM(RTRIM(PulsewayOrgName)), PulsewayOrgId, LTRIM(RTRIM(CustomerCode)) FROM dbo.Dim_Customer WITH (NOLOCK) WHERE Active=1 AND NULLIF(LTRIM(RTRIM(PulsewayOrgName)),'') IS NOT NULL;"
  [IO.File]::WriteAllText($tmp, $q, [Text.UTF8Encoding]::new($false))
  $rawOut = & (Find-Sqlcmd) -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -W -s "`t" -h -1 -i $tmp 2>&1 | Out-String
  foreach ($line in ($rawOut -split "`r?`n")) {
    if ($line -match 'rows affected' -or [string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line -split "`t"
    if ($parts.Count -ge 3) { Add-Map $parts[0].Trim() $parts[1].Trim() $parts[2].Trim() }
  }
  Write-Log ('Org map after Dim_Customer: names=' + $orgMap.Count)
} catch { }

# Always recognise Sir Fruit / SIRF even if the Pulseway org name drifted
Add-Map 'sir fruit' $null 'SIRF'
Add-Map 'redsun raisins' $null 'RSR'
Add-Map 'redsun' $null 'RSR'
Add-Map 'sirfruit' $null 'SIRF'
Add-Map 'sir fruit (pty) ltd' $null 'SIRF'
Add-Map 'sir fruit pty ltd' $null 'SIRF'
Add-Map 'sir fruit (pty) ltd.' $null 'SIRF'
Add-Map 'sirf' $null 'SIRF'
Add-Map 'sirza' $null 'SIRF'
Add-Map 'sir za' $null 'SIRF'
Write-Log ('Org map after SIRF aliases: names=' + $orgMap.Count)

function Resolve-Customer([string]$orgName, $orgId) {
  if ($null -ne $orgId -and "$orgId" -match '^\d+$') {
    $ii = [int]$orgId
    if ($idMap.ContainsKey($ii)) { return $idMap[$ii] }
  }
  if (-not [string]::IsNullOrWhiteSpace($orgName)) {
    $k = $orgName.Trim().ToLowerInvariant()
    if ($orgMap.ContainsKey($k)) { return $orgMap[$k] }
    # contains match against keys
    foreach ($key in @($orgMap.Keys)) {
      if ($k -like ("*" + $key + "*") -or $key -like ("*" + $k + "*")) {
        if ($key.Length -ge 4 -or $k.Length -ge 4) { return $orgMap[$key] }
      }
    }
  }
  return $null
}

function Get-PwMeta($json) {
  if ($null -eq $json -or -not $json.PSObject) { return $null }
  foreach ($n in @('Meta','meta','Pagination','pagination')) {
    if ($json.PSObject.Properties.Name -contains $n) { return $json.$n }
  }
  return $null
}

function Get-PwAll([string]$Path) {
  $all = New-Object System.Collections.Generic.List[object]
  $seen = @{}
  $top = 100
  $skip = 0
  $maxPages = 80
  for ($page = 1; $page -le $maxPages; $page++) {
    $sep = if ($Path -match '\?') { '&' } else { '?' }
    $odata = $Path + $sep + '$top=' + $top + '&$skip=' + $skip
    $res = Invoke-PwGet $odata
    if (-not $res.Ok -and $skip -eq 0) { $res = Invoke-PwGet $Path }
    if (-not $res.Ok) {
      Write-Log ("GET $Path page=$page FAIL status=" + $res.Status)
      break
    }
    $arr = @(Get-DataArray $res.Json)
    if ($arr.Count -eq 0) {
      Write-Log ("GET $Path page=$page empty - done skip=$skip")
      break
    }
    $new = 0
    foreach ($item in $arr) {
      # Identifier first — OrganizationId is shared by every device in an org
      $id = Get-Prop $item @('Identifier','DeviceId','Id','id','Name')
      $key = if ($id) { "$id" } else { 'row-' + $all.Count }
      if ($seen.ContainsKey($key)) { continue }
      $seen[$key] = 1
      [void]$all.Add($item)
      $new++
    }
    Write-Log ("GET $Path page=$page got=$($arr.Count) new=$new total=$($all.Count) skip=$skip")
    if ($new -eq 0) { break }
    $skip += $arr.Count
    if ($arr.Count -lt $top) { break }
  }
  Write-Log ("GET $Path ALL count=$($all.Count)")
  return $all
}

function Flatten-PwItems($x) {
  $out = New-Object System.Collections.Generic.List[object]
  foreach ($i in @($x)) {
    if ($null -eq $i) { continue }
    if ($i -is [System.Management.Automation.PSCustomObject]) { [void]$out.Add($i); continue }
    $isEnum = ($i -is [System.Collections.IEnumerable]) -and -not ($i -is [string])
    if ($isEnum) {
      foreach ($j in $i) { if ($null -ne $j) { [void]$out.Add($j) } }
      continue
    }
    [void]$out.Add($i)
  }
  return $out
}

# --- API fetch ---
Write-Log 'GET organizations (all pages)'
$orgs = Flatten-PwItems (Get-PwAll 'organizations')
$orgById = @{}
foreach ($o in $orgs) {
  $oid = Get-Prop $o @('Id','OrganizationId','id')
  $oname = [string](Get-Prop $o @('Name','OrganizationName','name'))
  if ($oid -and $oname) { $orgById["$oid"] = $oname }
}
Write-Log ('organizations unique=' + $orgs.Count + ' names=' + (($orgs | ForEach-Object { Get-Prop $_ @('Name','OrganizationName','name') }) -join '; '))

$sirfOrgIds = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($o in $orgs) {
  $oname = [string](Get-Prop $o @('Name','OrganizationName','name'))
  $oid = Get-Prop $o @('Id','OrganizationId','id')
  if ($oname -match '(?i)fruit|sirf' -and $oid) {
    [void]$sirfOrgIds.Add("$oid")
    if ("$oid" -match '^\d+$') { $idMap[[int]$oid] = 'SIRF' }
    Write-Log ("SIRF org hit name=$oname id=$oid")
  }
}

Write-Log 'GET sites / groups (tree: org > site > group)'
$sites = @()
$groups = @()
try { $sites = Flatten-PwItems (Get-PwAll 'sites') } catch { Write-Log ('sites skip ' + $_.Exception.Message) }
try { $groups = Flatten-PwItems (Get-PwAll 'groups') } catch { Write-Log ('groups skip ' + $_.Exception.Message) }
Write-Log ('sites=' + $sites.Count + ' groups=' + $groups.Count)
foreach ($s in @($sites + $groups)) {
  $sn = [string](Get-Prop $s @('Name','SiteName','GroupName','name'))
  $parent = [string](Get-Prop $s @('OrganizationName','Organization','ParentName','name'))
  $parentOid = Get-Prop $s @('OrganizationId','organization_id','ParentId','id')
  if ($sn -match '(?i)fruit|sirf' -or $parent -match '(?i)fruit|sirf') {
    Write-Log ("SIRF tree node name=$sn parent=$parent orgId=$parentOid")
    if ($parentOid) { [void]$sirfOrgIds.Add("$parentOid") }
  }
  if ($parentOid -and $sirfOrgIds.Contains("$parentOid") -and "$parentOid" -match '^\d+$') {
    $idMap[[int]$parentOid] = 'SIRF'
  }
}

Write-Log 'GET devices (all pages, OData $top/$skip)'
$devices = Flatten-PwItems (Get-PwAll 'devices')
if ($devices.Count -lt 1) {
  $devRes = Invoke-PwGet 'devices'
  if (-not $devRes.Ok) { throw 'devices required' }
  $devices = Flatten-PwItems (Get-DataArray $devRes.Json)
}
Write-Log ('devices count=' + $devices.Count)

# Pull devices that sit under Sir Fruit even if the global list omitted them
$devById = @{}
foreach ($d in $devices) {
  $did = Get-Prop $d @('Id','DeviceId','Identifier','id')
  if ($did) { $devById["$did"] = $d }
}
foreach ($oid in @($sirfOrgIds)) {
  if (-not $oid) { continue }
  foreach ($p in @(
      ("devices?organizationid=$oid"),
      ("organizations/$oid/devices")
    )) {
    try {
      $extra = Flatten-PwItems (Get-PwAll $p)
    } catch { $extra = @() }
    $added = 0
    foreach ($d in $extra) {
      $did = Get-Prop $d @('Id','DeviceId','Identifier','id')
      if (-not $did -or $devById.ContainsKey("$did")) { continue }
      $devById["$did"] = $d
      $devices += $d
      $added++
    }
    Write-Log ("SIRF extra $p added=$added")
  }
}
Write-Log ('devices after SIRF org pull=' + $devices.Count)

# Sample first device property names for log
if ($devices.Count -gt 0) {
  $sample = $devices[0]
  $props = ($sample.PSObject.Properties.Name -join ',')
  Write-Log ('device fields: ' + $props)
  $rawSample = ($sample | ConvertTo-Json -Depth 4 -Compress)
  if ($rawSample.Length -gt 800) { $rawSample = $rawSample.Substring(0, 800) }
  Write-Log ('device sample: ' + $rawSample)
}

# Enrich list payloads: devices/{id} + systems + assets + disk/metric subpaths
function Merge-PwOntoDevice($d, $src) {
  if ($null -eq $d -or $null -eq $src) { return $false }
  $merged = $false
  # If src is array, take first object-like item
  if ($src -is [System.Array]) {
    if ($src.Count -eq 0) { return $false }
    $src = $src[0]
  }
  if ($null -eq $src.PSObject) { return $false }
  foreach ($prop in $src.PSObject.Properties) {
    $name = $prop.Name
    $val = $prop.Value
    if ($null -eq $val -or "$val" -eq '') { continue }
    if ($d.PSObject.Properties.Name -contains $name) {
      $cur = $d.$name
      if ($null -eq $cur -or "$cur" -eq '') {
        $d.$name = $val
        $merged = $true
      } elseif (($cur -is [System.Array] -or ($cur.PSObject -and $cur.PSObject.Properties.Name.Count -eq 0)) -and $val) {
        $d.$name = $val
        $merged = $true
      }
    } else {
      $d | Add-Member -NotePropertyName $name -NotePropertyValue $val -Force
      $merged = $true
    }
  }
  foreach ($wrap in @('Computer','System','Network','Performance','Stats','Agent','Hardware','OperatingSystem','Storage','Disks','Drives','Volumes','Metrics','Asset','Assets','Memory','Cpu','Processor')) {
    if ($src.PSObject.Properties.Name -notcontains $wrap) { continue }
    $w = $src.$wrap
    if ($null -eq $w) { continue }
    if ($w -is [System.Array]) {
      $d | Add-Member -NotePropertyName $wrap -NotePropertyValue $w -Force
      $merged = $true
      continue
    }
    if ($w -is [string] -or $w -is [ValueType]) {
      $d | Add-Member -NotePropertyName $wrap -NotePropertyValue $w -Force
      $merged = $true
      continue
    }
    foreach ($prop in $w.PSObject.Properties) {
      $pn = $prop.Name
      $pv = $prop.Value
      if ($null -eq $pv -or "$pv" -eq '') { continue }
      $d | Add-Member -NotePropertyName $pn -NotePropertyValue $pv -Force
      $merged = $true
    }
    $d | Add-Member -NotePropertyName $wrap -NotePropertyValue $w -Force
  }
  return $merged
}

function Get-PwEntity($res) {
  if (-not $res -or -not $res.Ok) { return $null }
  $arr = Get-DataArray $res.Json
  if ($arr.Count -gt 0) {
    # Prefer single object if array of one, else return first for merge or whole array
    return $arr
  }
  if ($null -ne $res.Json) {
    if ($res.Json.PSObject.Properties.Name -contains 'Data' -and $null -ne $res.Json.Data -and -not ($res.Json.Data -is [System.Array])) {
      return @($res.Json.Data)
    }
    return @($res.Json)
  }
  return $null
}

$MaxDetail = 400
if ($env:PULSEWAY_MAX_DETAIL) {
  try { $MaxDetail = [int]$env:PULSEWAY_MAX_DETAIL } catch {}
}
if ($MaxDeviceDetail -gt 0) { $MaxDetail = [int]$MaxDeviceDetail }
Write-Log ("MaxDeviceDetail=$MaxDetail DetailOnly=$DetailOnly deviceList=$($devices.Count)")

# Index devices by Identifier for bulk merges
$devById = @{}
foreach ($d in $devices) {
  $k = Get-Prop $d @('Id','DeviceId','Identifier','id','device_id')
  if ($k) { $devById["$k"] = $d }
}

# Bulk: systems (v2-style, often richer than devices list)
Write-Log 'GET systems (bulk metrics)'
$sysRes = Invoke-PwGet 'systems'
$sysMerged = 0
if ($sysRes.Ok) {
  $systems = Get-DataArray $sysRes.Json
  Write-Log ('systems count=' + $systems.Count)
  if ($systems.Count -gt 0) {
    $sp = ($systems[0].PSObject.Properties.Name -join ',')
    Write-Log ('systems fields: ' + $sp)
    $ss = ($systems[0] | ConvertTo-Json -Depth 5 -Compress)
    if ($ss.Length -gt 900) { $ss = $ss.Substring(0, 900) }
    Write-Log ('systems sample: ' + $ss)
  }
  foreach ($s in $systems) {
    $sid = Get-Prop $s @('Id','DeviceId','Identifier','id','device_id','SystemId','InstanceId')
    if (-not $sid) { continue }
    if (-not $devById.ContainsKey("$sid")) {
      # try match by name later - skip
      continue
    }
    if (Merge-PwOntoDevice $devById["$sid"] $s) { $sysMerged++ }
  }
  Write-Log ("systems merge hit=$sysMerged")
} else {
  Write-Log ('systems skip status=' + $sysRes.Status)
}

# Bulk: assets
Write-Log 'GET assets (bulk)'
$assetRes = Invoke-PwGet 'assets'
$assetMerged = 0
if ($assetRes.Ok) {
  $assets = Get-DataArray $assetRes.Json
  Write-Log ('assets count=' + $assets.Count)
  if ($assets.Count -gt 0) {
    $ap = ($assets[0].PSObject.Properties.Name -join ',')
    Write-Log ('assets fields: ' + $ap)
    $as = ($assets[0] | ConvertTo-Json -Depth 5 -Compress)
    if ($as.Length -gt 900) { $as = $as.Substring(0, 900) }
    Write-Log ('assets sample: ' + $as)
  }
  foreach ($a in $assets) {
    $aid = Get-Prop $a @('Id','DeviceId','Identifier','id','device_id','SystemId','AssetId')
    if (-not $aid) { continue }
    if (-not $devById.ContainsKey("$aid")) { continue }
    if (Merge-PwOntoDevice $devById["$aid"] $a) { $assetMerged++ }
  }
  Write-Log ("assets merge hit=$assetMerged")
} else {
  Write-Log ('assets skip status=' + $assetRes.Status)
}


function Get-IntLoose($v) {
  if ($null -eq $v -or "$v" -eq '') { return $null }
  $n = 0
  $s = ("$v").Trim()
  if ($s -match '^-?\d+$') { return [int]$s }
  if ([int]::TryParse($s, [ref]$n)) { return $n }
  # strip non-digits except leading minus
  $s2 = ($s -replace '[^0-9-]', '')
  if ($s2 -match '^-?\d+$') { return [int]$s2 }
  return $null
}

function Get-PatchCountsFromObject($obj) {
  # Returns hashtable Inst/Miss/Pend or $null if nothing found
  if ($null -eq $obj) { return $null }
  $inst = $null; $miss = $null; $pend = $null

  # Direct count-style properties (object or first row)
  $candidates = @($obj)
  if ($obj -is [System.Array]) { $candidates = @($obj) }
  elseif ($obj.PSObject -and $obj.PSObject.Properties.Name -contains 'Data' -and $null -ne $obj.Data) {
    if ($obj.Data -is [System.Array]) { $candidates = @($obj.Data) }
    else { $candidates = @($obj.Data) + @($obj) }
  }

  foreach ($o in $candidates) {
    if ($null -eq $o -or $o -is [string] -or $o -is [int] -or $o -is [long]) { continue }
    $names = @()
    try { $names = @($o.PSObject.Properties.Name) } catch { continue }
    # Aggregate counters
    $mi = Get-Prop $o @('PatchMissingCount','MissingUpdates','MissingPatches','UpdatesMissing','WindowsUpdateMissing','FailedUpdates','AvailableUpdates','AvailableUpdateCount','MissingCount','UpdatesAvailable','NumberOfMissingUpdates','OutstandingUpdates','CriticalUpdatesMissing','SecurityUpdatesMissing')
    $ii = Get-Prop $o @('PatchInstalledCount','InstalledUpdates','InstalledPatches','UpdatesInstalled','WindowsUpdateInstalled','InstalledCount','InstalledUpdateCount','NumberOfInstalledUpdates')
    $pi = Get-Prop $o @('PatchPendingCount','PendingUpdates','PendingPatches','UpdatesPending','WindowsUpdatePending','PendingCount','PendingRebootUpdates','UpdatesPendingReboot','PendingInstallCount')
    if ($null -ne $mi -or $null -ne $ii -or $null -ne $pi) {
      if ($null -ne $mi) { $miss = Get-IntLoose $mi }
      if ($null -ne $ii) { $inst = Get-IntLoose $ii }
      if ($null -ne $pi) { $pend = Get-IntLoose $pi }
      if ($null -ne $miss -or $null -ne $inst -or $null -ne $pend) {
        return @{ Inst = $inst; Miss = $miss; Pend = $pend; Source = 'counts' }
      }
    }
  }

  # Array of update rows — count by status
  $rows = @()
  if ($obj -is [System.Array]) { $rows = @($obj) }
  elseif ($obj.PSObject.Properties.Name -contains 'Data' -and $obj.Data -is [System.Array]) { $rows = @($obj.Data) }
  elseif ($obj.PSObject.Properties.Name -contains 'Updates' -and $obj.Updates -is [System.Array]) { $rows = @($obj.Updates) }
  elseif ($obj.PSObject.Properties.Name -contains 'Items' -and $obj.Items -is [System.Array]) { $rows = @($obj.Items) }

  if ($rows.Count -eq 0) { return $null }

  $cInst = 0; $cMiss = 0; $cPend = 0; $cOther = 0; $looksUpdate = 0
  foreach ($u in $rows) {
    if ($null -eq $u) { continue }
    $st = ''
    try {
      $st = [string](Get-Prop $u @('Status','State','UpdateStatus','InstallationStatus','InstallStatus','Result','ApprovalStatus','Category'))
    } catch { $st = '' }
    $title = ''
    try { $title = [string](Get-Prop $u @('Title','Name','UpdateName','KbArticle','KB','Id')) } catch {}
    if ($st -or $title) { $looksUpdate++ }
    $sl = $st.ToLowerInvariant()
    if ($sl -match 'install|success|complete|applied') { $cInst++ }
    elseif ($sl -match 'pend|download|reboot|scheduled|queued|waiting') { $cPend++ }
    elseif ($sl -match 'fail|error|abort') { $cMiss++ }  # treat failed as outstanding
    elseif ($sl -match 'avail|missing|needed|not.?install|approved|outstanding|required|new') { $cMiss++ }
    elseif ($title -match '(?i)KB\d{5,}') {
      # bare KB row without status — count as missing if no Status at all
      if (-not $st) { $cMiss++ } else { $cOther++ }
    } else { $cOther++ }
  }
  if ($looksUpdate -eq 0) { return $null }
  # If everything landed in other, still report total as missing unknown list length
  if ($cInst -eq 0 -and $cMiss -eq 0 -and $cPend -eq 0 -and $looksUpdate -gt 0) {
    $cMiss = $looksUpdate
  }
  return @{ Inst = $cInst; Miss = $cMiss; Pend = $cPend; Source = 'list' }
}

function Set-DevicePatchNote($d, $counts, [string]$via) {
  if ($null -eq $counts) { return $false }
  $set = $false
  if ($null -ne $counts.Inst) {
    $d | Add-Member -NotePropertyName 'PatchInstalledCount' -NotePropertyValue ([int]$counts.Inst) -Force
    $set = $true
  }
  if ($null -ne $counts.Miss) {
    $d | Add-Member -NotePropertyName 'PatchMissingCount' -NotePropertyValue ([int]$counts.Miss) -Force
    $set = $true
  }
  if ($null -ne $counts.Pend) {
    $d | Add-Member -NotePropertyName 'PatchPendingCount' -NotePropertyValue ([int]$counts.Pend) -Force
    $set = $true
  }
  if ($set -and -not $script:LoggedPatchHit) {
    $script:LoggedPatchHit = $true
    Write-Log ("patch hit via=$via source=$($counts.Source) inst=$($counts.Inst) miss=$($counts.Miss) pend=$($counts.Pend)")
  }
  return $set
}

function Get-PatchFromUpdatesObject($d) {
  # Pulseway v3 device detail: Updates = { Critical, Important, Unspecified }
  if ($null -eq $d) { return $null }
  $u = $null
  if ($d.PSObject.Properties.Name -contains 'Updates' -and $null -ne $d.Updates) { $u = $d.Updates }
  elseif ($d.PSObject.Properties.Name -contains 'WindowsUpdates' -and $null -ne $d.WindowsUpdates) { $u = $d.WindowsUpdates }
  if ($null -eq $u) { return $null }
  if ($u -is [string] -or $u -is [ValueType]) { return $null }
  $crit = Get-IntLoose (Get-Prop $u @('Critical','critical','CriticalCount'))
  $imp = Get-IntLoose (Get-Prop $u @('Important','important','ImportantCount'))
  $mod = Get-IntLoose (Get-Prop $u @('Moderate','moderate'))
  $low = Get-IntLoose (Get-Prop $u @('Low','low','Optional','optional'))
  $uns = Get-IntLoose (Get-Prop $u @('Unspecified','unspecified','Other','other'))
  # Any of these present means agent reported patch status
  if ($null -eq $crit -and $null -eq $imp -and $null -eq $uns -and $null -eq $mod -and $null -eq $low) {
    return $null
  }
  $miss = 0
  foreach ($x in @($crit, $imp, $mod, $low, $uns)) {
    if ($null -ne $x) { $miss += [int]$x }
  }
  # Installed count is not on this object - leave null
  return @{ Inst = $null; Miss = $miss; Pend = 0; Source = 'Updates.Critical/Important/Unspecified' }
}

function Enrich-DevicePatch($d, [string]$did) {
  # 1) Pulseway real shape: Updates { Critical, Important, Unspecified }
  $fromU = Get-PatchFromUpdatesObject $d
  if ($fromU) {
    if (Set-DevicePatchNote $d $fromU 'Updates-object') { return $true }
  }

  # 2) Other count-style props already merged onto device
  $c0 = Get-PatchCountsFromObject $d
  if ($c0) { if (Set-DevicePatchNote $d $c0 'device-object') { return $true } }

  # 3) Do NOT storm subpaths every collect (was 13 GETs x N devices).
  # Only probe once per run for the first few devices if still empty (diagnostics).
  if (-not $script:PatchProbeN) { $script:PatchProbeN = 0 }
  if ($script:PatchProbeN -ge 2) { return $false }
  $script:PatchProbeN++

  $paths = @(
    ("devices/{0}/updates" -f $did),
    ("devices/{0}/windowsupdates" -f $did),
    ("systems/{0}/updates" -f $did)
  )
  foreach ($path in $paths) {
    $er = Invoke-PwGet $path
    if (-not $er.Ok) { continue }
    $json = $er.Json
    if ($null -eq $json -and $er.Raw) {
      try { $json = $er.Raw | ConvertFrom-Json } catch { $json = $null }
    }
    if ($null -eq $json) { continue }
    $counts = Get-PatchCountsFromObject $json
    if (-not $counts) {
      $ents = Get-DataArray $json
      if ($ents.Count -gt 0) { $counts = Get-PatchCountsFromObject $ents }
    }
    if ($counts) {
      if (Set-DevicePatchNote $d $counts $path) { return $true }
    }
  }
  return $false
}


Write-Log ("Enriching up to $MaxDetail devices via GET devices/{id} + metric subpaths")
$detailN = 0
$detailOk = 0
$metricOk = 0
$diskPathHits = 0
for ($i = 0; $i -lt $devices.Count -and $detailN -lt $MaxDetail; $i++) {
  $d = $devices[$i]
  $did = Get-Prop $d @('Id','DeviceId','Identifier','id','device_id')
  if (-not $did) { continue }
  $detailN++

  # Primary detail - always merge devices/{id}
  $dr = Invoke-PwGet ("devices/{0}" -f $did)
  if ($dr.Ok) {
    $ents = Get-PwEntity $dr
    if ($ents) {
      foreach ($e in $ents) {
        if (Merge-PwOntoDevice $d $e) { $detailOk++ }
      }
    }
  }

  # Metric / disk subpaths only when still missing (rate-limit friendly)
  $needMetrics = -not $DetailOnly
  if ($needMetrics) {
    $hasCpu = $null -ne (Get-Prop $d @('CpuUsagePct','CpuUsage','CPU','CpuPercent','CpuLoad'))
    $hasMem = $null -ne (Get-Prop $d @('MemoryUsagePct','MemoryUsage','RamUsage','MemoryPercent','UsedMemory'))
    $hasDisks = ($d.PSObject.Properties.Name -contains 'Disks' -and $d.Disks) -or ($d.PSObject.Properties.Name -contains 'Drives' -and $d.Drives)
    if ($hasCpu -and $hasMem -and $hasDisks) { $needMetrics = $false }
  }
  $extraPaths = @()
  if ($needMetrics) {
    $extraPaths = @(
      ("devices/{0}/disks" -f $did),
      ("devices/{0}/drives" -f $did),
      ("devices/{0}/storage" -f $did),
      ("devices/{0}/hardware" -f $did),
      ("devices/{0}/metrics" -f $did),
      ("devices/{0}/performance" -f $did),
      ("devices/{0}/assets" -f $did),
      ("systems/{0}" -f $did),
      ("assets/{0}" -f $did)
    )
  }
  foreach ($path in $extraPaths) {
    $er = Invoke-PwGet $path
    if (-not $er.Ok) { continue }
    $ents = Get-PwEntity $er
    if (-not $ents) { continue }
    $hit = $false
    foreach ($e in $ents) {
      # If array of disk-like rows, attach as Disks
      if ($e.PSObject.Properties.Name -contains 'DriveLetter' -or $e.PSObject.Properties.Name -contains 'Letter' -or $e.PSObject.Properties.Name -contains 'MountPoint') {
        $existing = @()
        if ($d.PSObject.Properties.Name -contains 'Disks' -and $d.Disks) { $existing = @($d.Disks) }
        $existing += $e
        $d | Add-Member -NotePropertyName 'Disks' -NotePropertyValue $existing -Force
        $diskPathHits++
        $hit = $true
      } else {
        if (Merge-PwOntoDevice $d $e) { $hit = $true }
      }
    }
    # Whole response is array of disks
    if ($ents.Count -gt 1) {
      $looksDisk = $false
      $first = $ents[0]
      if ($first.PSObject.Properties.Name -contains 'DriveLetter' -or $first.PSObject.Properties.Name -contains 'FreeSpace' -or $first.PSObject.Properties.Name -contains 'Size' -or $first.PSObject.Properties.Name -contains 'TotalSize') {
        $looksDisk = $true
      }
      if ($looksDisk) {
        $d | Add-Member -NotePropertyName 'Disks' -NotePropertyValue @($ents) -Force
        $diskPathHits++
        $hit = $true
      }
    }
    if ($hit) {
      $metricOk++
      if ($detailN -le 3 -or $path -match 'disk|storage|drive') {
        Write-Log ("metric OK id=$did path=$path")
      }
    }
  }

  # Patch / OS updates — dedicated endpoints (not on base device payload)
  if (-not $script:PatchHits) { $script:PatchHits = 0 }
  if (-not $script:PatchTried) { $script:PatchTried = 0 }
  $script:PatchTried++
  try {
    if (Enrich-DevicePatch $d ([string]$did)) { $script:PatchHits++ }
  } catch {
    Write-Log ("patch enrich warn id=$did err=$($_.Exception.Message)")
  }

  if (($detailN % 25) -eq 0) { Write-Log ("detail progress $detailN / $($devices.Count) patchHits=$($script:PatchHits)") }
}
Write-Log ("detail enrich done tried=$detailN deviceDetailOk=$detailOk metricHits=$metricOk diskPathHits=$diskPathHits patchTried=$($script:PatchTried) patchHits=$($script:PatchHits)")
# Log first device Updates object for mapping confirmation
if ($devices.Count -gt 0 -and $devices[0].PSObject.Properties.Name -contains 'Updates') {
  try {
    $uj = ($devices[0].Updates | ConvertTo-Json -Compress -Depth 4)
    if ($uj.Length -gt 300) { $uj = $uj.Substring(0, 300) }
    Write-Log ('Updates sample: ' + $uj)
  } catch {}
}

if ($devices.Count -gt 0) {
  $sample2 = $devices[0]
  $props2 = ($sample2.PSObject.Properties.Name -join ',')
  Write-Log ('device fields AFTER detail: ' + $props2)
  $raw2 = ($sample2 | ConvertTo-Json -Depth 6 -Compress)
  if ($raw2.Length -gt 1500) { $raw2 = $raw2.Substring(0, 1500) }
  Write-Log ('device sample AFTER detail: ' + $raw2)
}

Write-Log ("API stats: requests=$($script:PwRequestCount) retries=$($script:PwRetryCount) throttleWaits=$($script:PwThrottleWaits)")
Write-Log 'GET notifications'
$notifRes = Invoke-PwGet 'notifications'
$notifs = @()
if ($notifRes.Ok) {
  $notifs = Get-DataArray $notifRes.Json
  Write-Log ('notifications count=' + $notifs.Count)
} else {
  Write-Log ('notifications skip ' + $notifRes.Status)
}

# --- Build device rows in PowerShell with mapping ---
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('SET NOCOUNT ON; SET XACT_ABORT OFF;')
[void]$sb.AppendLine("DECLARE @Snap date = '$snap';")
[void]$sb.AppendLine("DECLARE @Imp datetime2(3) = '$imported';")

# Organizations
if ($orgs.Count -gt 0) {
  [void]$sb.AppendLine('IF OBJECT_ID(N''dbo.Pulseway_Organizations'',N''U'') IS NOT NULL BEGIN')
  [void]$sb.AppendLine('DELETE FROM dbo.Pulseway_Organizations WHERE SnapshotDate = @Snap;')
  foreach ($o in $orgs) {
    $oid = Get-Prop $o @('Id','OrganizationId','id')
    $oname = [string](Get-Prop $o @('Name','OrganizationName','name'))
    if (-not $oid) { continue }
    $code = Resolve-Customer $oname $oid
    $dc = Get-Prop $o @('DeviceCount','DevicesCount','device_count')
    [void]$sb.AppendLine(("INSERT INTO dbo.Pulseway_Organizations (SnapshotDate, OrganizationId, OrganizationName, CustomerCode, DeviceCount, ImportedAt) VALUES (@Snap, {0}, {1}, {2}, {3}, @Imp);" -f (SqlInt $oid), (SqlEsc $oname), (SqlEsc $code), (SqlInt $dc)))
  }
  [void]$sb.AppendLine('END')
}

[void]$sb.AppendLine('DELETE FROM dbo.Pulseway_Devices WHERE SnapshotDate = @Snap;')
if (-not (Get-Variable -Name diskSb -ErrorAction SilentlyContinue)) { $diskSb = New-Object System.Text.StringBuilder }
$diskSb = New-Object System.Text.StringBuilder
$script:LoggedDiskSample = $false
$script:UptimeLogN = 0
$devN = 0
$mappedN = 0
$orgNameCounts = @{}
foreach ($d in $devices) {
  $uptimeDays = $null; $lastBoot = $null; $patchInst = $null; $patchMiss = $null; $patchPend = $null
  $did = Get-Prop $d @('Id','DeviceId','Identifier','id','device_id')
  if (-not $did) { continue }
  $name = [string](Get-Prop $d @('Name','ComputerName','DisplayName','name'))
  $oid = Get-Prop $d @('OrganizationId','organization_id','OrgId','CompanyId')
  $oname = [string](Get-Prop $d @('OrganizationName','organization_name','CompanyName','Company'))
  if (-not $oname -and $d.Organization) {
    $oname = [string](Get-Prop $d.Organization @('Name','name'))
    if (-not $oid) { $oid = Get-Prop $d.Organization @('Id','id') }
  }
  if (-not $oname -and $oid -and $orgById.ContainsKey("$oid")) {
    $oname = $orgById["$oid"]
  }
  if ($oname) {
    $ok = $oname.Trim()
    if ($orgNameCounts.ContainsKey($ok)) { $orgNameCounts[$ok]++ } else { $orgNameCounts[$ok] = 1 }
  }
  # Pulseway v3 detail (real fields from GET devices/{id}):
  #   Description, Uptime ("Online 23d..."), ExternalIpAddress, Type, Critical/ElevatedNotifications
  $uptimeStr = [string](Get-Prop $d @('Uptime','uptime','AgentUptime'))
  $onlineRaw = Get-Prop $d @('Online','IsOnline','online','is_online','IsUp','Status','IsAvailable','Available','AgentStatus','ConnectionStatus','IsConnected')
  if ($null -eq $onlineRaw) {
    $onlineRaw = Get-NestedProp $d @('Status.Online','Status.IsOnline','State.Online','Agent.Online','Agent.IsOnline','Computer.Online')
  }
  $online = Coerce-Online $onlineRaw
  if ($null -eq $online -and $uptimeStr) {
    if ($uptimeStr -match '^(?i)online') { $online = $true }
    elseif ($uptimeStr -match '^(?i)offline') { $online = $false }
  }
  # Description holds OS text on Pulseway (e.g. Windows Server 2019 Standard)
  $os = [string](Get-Prop $d @('OsName','OperatingSystem','OS','os_name','Platform','OsType','OperatingSystemName','OSName','OsEdition','SystemName','Description'))
  if (-not $os) {
    $os = [string](Get-NestedProp $d @('OperatingSystem.Name','Os.Name','System.OperatingSystem','Computer.OperatingSystem','Computer.OS','Hardware.OS'))
  }
  if ($os.StartsWith('{') -or $os.StartsWith('[')) { $os = '' }
  # Canonical DeviceType: Server | Workstation only (never leave raw "Windows")
  # Workstations must NOT be stored as Server and must not enter server SLA counts.
  $dtype = [string](Get-Prop $d @('Type','DeviceType','type','device_type','AgentType','ComputerType','AssetType','GroupName'))
  $gn = [string](Get-Prop $d @('GroupName','group_name'))
  $nameForClass = [string](Get-Prop $d @('Name','DisplayName','ComputerName','Hostname','DeviceName'))
  $blob = (($dtype + ' ' + $os + ' ' + $gn + ' ' + $nameForClass)).ToLowerInvariant()
  if ($blob -match 'windows\s*server|server\s*20(1|2)|domain\s*controller|\b(hyper-v|esxi|vcenter)\b' -or $dtype -match '(?i)server|domain\s*controller') {
    $dtype = 'Server'
  }
  elseif ($blob -match 'windows\s*1[01]|windows\s*[789]|windows\s*vista|macos|mac\s*os|laptop|notebook|surface|desktop|workstation' -or $dtype -match '(?i)work|desktop|laptop|pc|notebook') {
    $dtype = 'Workstation'
  }
  elseif ($dtype -match '(?i)server') { $dtype = 'Server' }
  elseif ($dtype -match '(?i)work|desktop|laptop|pc') { $dtype = 'Workstation' }
  elseif ($os -match '(?i)server') { $dtype = 'Server' }
  elseif ($os -match '(?i)windows|mac') { $dtype = 'Workstation' }
  else {
    # Unknown OS/type: treat as Workstation so it never inflates server SLA
    $dtype = 'Workstation'
  }
  $crit = Get-Prop $d @('CriticalNotifications','CriticalAlerts','critical_notifications')

  $elev = Get-Prop $d @('ElevatedNotifications','ElevatedAlerts','elevated_notifications')
  $last = Get-Prop $d @('LastSeenOnline','LastSeen','LastOnline','last_seen_online','LastSeenDateTime','LastContacted','LastUpdate','LastSeenDate','UpdatedAt','LastCheckIn')
  $ip = Get-Prop $d @('ExternalIpAddress','PublicIpAddress','IpAddress','IP','LocalIp','PrivateIp','ip_address','ExternalIp','PublicIp','IPv4','LocalIPAddress','PrimaryIp')
  if (-not $ip) {
    $ip = Get-NestedProp $d @('Network.IpAddress','Network.LocalIp','Network.IP','Networking.IpAddress','Computer.IpAddress','Computer.IP','Network.IPv4')
  }
  $cpu = Coerce-Pct (Get-Prop $d @('CpuUsagePct','CpuUsage','CPU','CpuPercent','cpu_usage','Cpu','ProcessorUsage','Processor','CpuLoad','Load','AverageCpu','CpuUtilization'))
  if ($null -eq $cpu) { $cpu = Coerce-Pct (Get-NestedProp $d @('Performance.Cpu','Metrics.Cpu','Stats.CpuUsage','Performance.CpuUsage','Computer.CpuUsage','Hardware.Cpu','Cpu.Usage','Processor.Usage')) }
  $mem = Coerce-Pct (Get-Prop $d @('MemoryUsagePct','MemoryUsage','RamUsage','MemoryPercent','memory_usage','Memory','Ram','RamPercent','UsedMemory','MemoryUtilization'))
  if ($null -eq $mem) { $mem = Coerce-Pct (Get-NestedProp $d @('Performance.Memory','Metrics.Memory','Stats.MemoryUsage','Performance.MemoryUsage','Computer.MemoryUsage','Hardware.Memory','Memory.Usage','Ram.Usage')) }
  # Absolute memory -> pct if TotalMemory present
  if ($null -eq $mem) {
    $usedM = Get-Prop $d @('UsedMemoryMb','UsedMemory','MemoryUsed','RamUsed')
    $totM = Get-Prop $d @('TotalMemoryMb','TotalMemory','MemoryTotal','RamTotal','PhysicalMemory')
    if ($null -ne $usedM -and $null -ne $totM) {
      try {
        $um = [double]"$usedM"; $tm = [double]"$totM"
        if ($tm -gt 100000) { $um = $um / 1MB; $tm = $tm / 1MB }
        if ($tm -gt 0) { $mem = [math]::Round(($um / $tm) * 100, 2) }
      } catch {}
    }
  }
  $onlinePct = Coerce-Pct (Get-Prop $d @('OnlinePct','UptimePercent','Availability','online_pct','AvailabilityPercent'))
  # Do NOT invent OnlinePct from IsOnline alone — that zeros OfflineHours7d for all online boxes
  # and pretends 100% availability without a real availability metric from Pulseway.
  if ($null -eq $online -and $null -ne $last) {
    try {
      $dt = [datetime]::Parse([string]$last)
      $ageMin = ([datetime]::UtcNow - $dt.ToUniversalTime()).TotalMinutes
      if ($ageMin -le 30) { $online = $true }
      elseif ($ageMin -gt 120) { $online = $false }
    } catch {}
  }
  # Days since reboot — Pulseway Uptime string is primary (not Online bool)
  $uptimeRaw = Get-DeviceUptimeRaw $d
  if (-not $uptimeStr -and $uptimeRaw) { $uptimeStr = [string]$uptimeRaw }
  $uptimeDays = Parse-UptimeDays $uptimeStr
  if ($null -eq $uptimeDays -and $null -ne $uptimeRaw) {
    $uptimeDays = Parse-UptimeDays $uptimeRaw
  }
  if ($null -eq $uptimeDays) {
    $uptimeDays = Parse-UptimeDays (Get-Prop $d @('UptimeDays','UptimeSeconds','SystemUptime','DaysSinceReboot','SystemUpTimeSeconds'))
  }
  $lastBoot = Get-Prop $d @('LastBootAt','LastBoot','LastReboot','BootTime','LastRestart','LastBootTime','LastStartTime')
  if ($null -eq $lastBoot) {
    $lastBoot = Get-NestedProp $d @('System.LastBoot','Computer.LastBoot','Status.LastBoot')
  }
  # Only derive LastBoot from uptime when ONLINE (Offline Xd is offline duration, not uptime)
  $uptimeIsOffline = $false
  if ($uptimeStr -and ("$uptimeStr" -match '(?i)^\s*offline')) { $uptimeIsOffline = $true }
  if ($null -eq $uptimeDays -and $null -ne $lastBoot -and -not $uptimeIsOffline) {
    $uptimeDays = Parse-UptimeDays $lastBoot
  }
  if ($null -eq $lastBoot -and $null -ne $uptimeDays -and $uptimeDays -ge 0 -and -not $uptimeIsOffline -and $online -ne $false) {
    try { $lastBoot = [datetime]::UtcNow.AddDays(-1.0 * [double]$uptimeDays) } catch {}
  }
  # Offline hours
  $offlineHrsCur = $null
  $offlineHrs7 = $null
  $offlineHrs30 = $null
  if ($uptimeIsOffline -and $null -ne $uptimeDays) {
    # "Offline 1d 22h 30m" — duration is offline stretch
    $offlineHrsCur = [math]::Round([double]$uptimeDays * 24.0, 2)
    if ($null -eq $online) { $online = $false }
  } elseif ($online -eq $false) {
    if ($null -ne $last) {
      try {
        $dtOff = [datetime]::Parse([string]$last)
        $offlineHrsCur = [math]::Round(([datetime]::UtcNow - $dtOff.ToUniversalTime()).TotalHours, 2)
        if ($offlineHrsCur -lt 0) { $offlineHrsCur = $null }
      } catch {}
    }
    # if we parsed Offline duration as uptimeDays by mistake on offline host without "Offline" prefix
    if ($null -eq $offlineHrsCur -and $null -ne $uptimeDays -and $uptimeDays -gt 0) {
      # Prefer lastSeen; leave null if ambiguous
    }
  } elseif ($online -eq $true) {
    $offlineHrsCur = 0
  }
  # When online, UptimeDays = days since reboot; when offline-from-string, clear UptimeDays for reboot age
  if ($uptimeIsOffline) {
    $uptimeDays = $null
    $lastBoot = $null
  }
  # 7d/30d only from real OnlinePct (availability), never from instantaneous online flag
  if ($null -ne $onlinePct) {
    try {
      $op = [double]$onlinePct
      if ($op -lt 0) { $op = 0 }
      if ($op -gt 100) { $op = 100 }
      $offFrac = (100.0 - $op) / 100.0
      $offlineHrs7 = [math]::Round($offFrac * 7.0 * 24.0, 2)
      $offlineHrs30 = [math]::Round($offFrac * 30.0 * 24.0, 2)
    } catch {}
  }
  # Sample log (first 5 devices) so we can verify parsing
  if (-not $script:UptimeLogN) { $script:UptimeLogN = 0 }
  if ($script:UptimeLogN -lt 5) {
    $script:UptimeLogN++
    $rawShow = if ($uptimeStr) { $uptimeStr } else { [string]$uptimeRaw }
    if ($rawShow.Length -gt 80) { $rawShow = $rawShow.Substring(0, 80) }
    Write-Log ("uptime sample name={0} raw=[{1}] days={2}" -f $name, $rawShow, $uptimeDays)
  }
  $patchInst = Get-Prop $d @('PatchInstalledCount','InstalledUpdates','InstalledPatches','UpdatesInstalled','WindowsUpdateInstalled','InstalledUpdateCount','InstalledCount','NumberOfInstalledUpdates')
  $patchMiss = Get-Prop $d @('PatchMissingCount','MissingUpdates','MissingPatches','UpdatesMissing','WindowsUpdateMissing','FailedUpdates','AvailableUpdates','AvailableUpdateCount','MissingCount','UpdatesAvailable','NumberOfMissingUpdates','OutstandingUpdates')
  $patchPend = Get-Prop $d @('PatchPendingCount','PendingUpdates','PendingPatches','UpdatesPending','WindowsUpdatePending','PendingCount','PendingRebootUpdates','UpdatesPendingReboot')
  # Pulseway real: Updates.Critical + Important + Unspecified = outstanding patches
  if ($null -eq $patchMiss -or $null -eq $patchInst) {
    $fromU = Get-PatchFromUpdatesObject $d
    if ($fromU) {
      if ($null -eq $patchMiss -and $null -ne $fromU.Miss) { $patchMiss = $fromU.Miss }
      if ($null -eq $patchInst -and $null -ne $fromU.Inst) { $patchInst = $fromU.Inst }
      if ($null -eq $patchPend -and $null -ne $fromU.Pend) { $patchPend = $fromU.Pend }
    }
  }
  if ($null -eq $patchMiss) {
    $patchMiss = Get-NestedProp $d @('Updates.Missing','WindowsUpdate.Missing','Patch.Missing','PatchManagement.Missing','OsUpdates.Missing','SoftwareUpdates.Missing')
  }
  if ($null -eq $patchInst) {
    $patchInst = Get-NestedProp $d @('Updates.Installed','WindowsUpdate.Installed','Patch.Installed','PatchManagement.Installed','OsUpdates.Installed')
  }
  if ($null -eq $patchPend) {
    $patchPend = Get-NestedProp $d @('Updates.Pending','WindowsUpdate.Pending','Patch.Pending','PatchManagement.Pending')
  }
  if ($null -ne $patchInst) { $patchInst = Get-IntLoose $patchInst }
  if ($null -ne $patchMiss) { $patchMiss = Get-IntLoose $patchMiss }
  if ($null -ne $patchPend) { $patchPend = Get-IntLoose $patchPend }
  $code = Resolve-Customer $oname $oid
  if (-not $code -and $oid -and $sirfOrgIds -and $sirfOrgIds.Contains("$oid")) {
    $code = 'SIRF'
    if (-not $oname) { $oname = 'Sir Fruit' }
  }
  if (-not $code) {
    $nmLow = ([string]$name).ToLowerInvariant()
    $onLow = ([string]$oname).ToLowerInvariant()
    if ($onLow -match 'fruit' -or $nmLow -match 'fruit|sirfruit|^sirza') {
      $code = 'SIRF'
    }
  }
  if ($code) { $mappedN++ }
  # Prefer extended insert; fallback without stats columns if SQL rejects (old schema)
  [void]$sb.AppendLine((
    "INSERT INTO dbo.Pulseway_Devices (SnapshotDate, DeviceId, CustomerCode, Name, OrganizationId, OrganizationName, IsOnline, OsName, DeviceType, CriticalNotifications, ElevatedNotifications, LastSeenOnline, IpAddress, CpuUsagePct, MemoryUsagePct, OnlinePct, UptimeDays, LastBootAt, PatchInstalledCount, PatchMissingCount, PatchPendingCount, OfflineHoursCurrent, OfflineHours7d, OfflineHours30d, ImportedAt) VALUES (@Snap, {0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, {11}, {12}, {13}, {14}, {15}, {16}, {17}, {18}, {19}, {20}, {21}, {22}, @Imp);" -f `
      (SqlEsc ([string]$did)), (SqlEsc $code), (SqlEsc $name), (SqlInt $oid), (SqlEsc $oname), (SqlBit $online), (SqlEsc $os), (SqlEsc $dtype), (SqlInt $crit), (SqlInt $elev), (SqlDt $last), (SqlEsc ([string]$ip)), (SqlDec $cpu), (SqlDec $mem), (SqlDec $onlinePct), (SqlDec $uptimeDays), (SqlDt $lastBoot), (SqlInt $patchInst), (SqlInt $patchMiss), (SqlInt $patchPend), (SqlDec $offlineHrsCur), (SqlDec $offlineHrs7), (SqlDec $offlineHrs30)
  ))

  # Disks nested on device (sizes via Get-DiskSizePair)
  $drives = @()
  foreach ($dp in @('Disks','Drives','Volumes','Storage','disks','drives','LogicalDisks','Partitions','VolumeList','LogicalDisk','FixedDisks')) {
    if ($d.PSObject.Properties.Name -contains $dp -and $null -ne $d.$dp) {
      $cand = $d.$dp
      if ($cand -is [System.Array]) { $drives = @($cand) }
      elseif ($cand.PSObject -and $cand.PSObject.Properties.Name -contains 'Data') { $drives = @($cand.Data) }
      elseif ($cand.PSObject -and $cand.PSObject.Properties.Name -contains 'Items') { $drives = @($cand.Items) }
      else { $drives = @($cand) }
      if ($drives.Count -gt 0) { break }
    }
  }
  # Log first disk sample once per collect for mapping
  if ($drives.Count -gt 0 -and -not $script:LoggedDiskSample) {
    $script:LoggedDiskSample = $true
    $sampleDrv = $drives[0]
    if ($sampleDrv -is [string]) {
      Write-Log ('disk sample is STRING: ' + $sampleDrv)
    } else {
      $df = ($sampleDrv.PSObject.Properties.Name -join ',')
      Write-Log ('disk fields: ' + $df)
      $dj = ($sampleDrv | ConvertTo-Json -Depth 6 -Compress)
      if ($dj.Length -gt 900) { $dj = $dj.Substring(0, 900) }
      Write-Log ('disk sample: ' + $dj)
    }
  }
  foreach ($drv in $drives) {
    if ($null -eq $drv) { continue }
    $letter = $null
    if ($drv -is [string]) {
      $letter = $drv.Trim()
    } else {
      $letter = [string](Get-Prop $drv @('DriveLetter','Letter','Name','MountPoint','drive_letter','Label','Caption','DeviceID','VolumeName','Path','Drive','Id','Volume','Disk'))
    }
    if (-not $letter) { continue }
    $letter = $letter.Trim()
    # Normalize "C:\" -> "C:"
    if ($letter -match '^([A-Za-z]):') { $letter = $Matches[1].ToUpper() + ':' }
    # Linux: keep /dev/... and mount labels; column is nvarchar(128)
    if ($letter.Length -gt 120) { $letter = $letter.Substring(0, 120) }
    $pair = Get-DiskSizePair $drv
    $total = $pair.Total
    $free = $pair.Free
    $usedPct = $pair.UsedPct
    $media = Get-DiskMediaType $drv
    $iops = Get-DiskIops $drv
    [void]$diskSb.AppendLine((
      "INSERT INTO dbo.Pulseway_Disks (SnapshotDate, DeviceId, DriveLetter, CustomerCode, DeviceName, TotalGb, FreeGb, UsedPct, MediaType, ReadIops, WriteIops, TotalIops, ImportedAt) VALUES (@Snap, {0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, @Imp);" -f `
        (SqlEsc ([string]$did)), (SqlEsc $letter), (SqlEsc $code), (SqlEsc $name), (SqlDec $total), (SqlDec $free), (SqlDec $usedPct), (SqlEsc $media), (SqlDec $iops.Read), (SqlDec $iops.Write), (SqlDec $iops.Total)
    ))

  }
  $devN++
}
Write-Log ("Device inserts=$devN pre-map CustomerCode set=$mappedN")
# Sample how many devices have patch note props before SQL
$pSample = 0
foreach ($d in $devices) {
  if ($null -ne (Get-Prop $d @('PatchMissingCount','PatchInstalledCount','PatchPendingCount'))) { $pSample++ }
}
Write-Log ("devices with patch note props before SQL=$pSample / $($devices.Count) (API patchHits=$($script:PatchHits))")
Write-Log 'Pulseway org names on devices:'
foreach ($k in ($orgNameCounts.Keys | Sort-Object)) {
  Write-Log ("  org='" + $k + "' devices=" + $orgNameCounts[$k])
}

# Notifications
if ($notifs.Count -gt 0) {
  [void]$sb.AppendLine('IF OBJECT_ID(N''dbo.Pulseway_Notifications'',N''U'') IS NOT NULL BEGIN')
  [void]$sb.AppendLine('DELETE FROM dbo.Pulseway_Notifications WHERE SnapshotDate = @Snap;')
  $nN = 0
  foreach ($n in $notifs) {
    $nid = Get-Prop $n @('Id','NotificationId','id')
    if (-not $nid) { continue }
    $did = Get-Prop $n @('DeviceId','InstanceId','device_id')
    $dname = [string](Get-Prop $n @('DeviceName','ComputerName','device_name'))
    $sev = [string](Get-Prop $n @('Priority','Severity','priority','severity','Level'))
    $title = [string](Get-Prop $n @('Message','Title','Subject','message','title'))
    if ($title.Length -gt 300) { $title = $title.Substring(0, 300) }
    $msg = [string](Get-Prop $n @('Details','Body','Text','details'))
    $raised = Get-Prop $n @('DateTime','RaisedAt','Created','Timestamp','date_time')
    $active = Get-Prop $n @('Active','IsActive','active')
    $oname = [string](Get-Prop $n @('OrganizationName','Organization','organization_name'))
    $oid = Get-Prop $n @('OrganizationId','organization_id')
    if (-not $oname -and $oid -and $orgById.ContainsKey("$oid")) { $oname = $orgById["$oid"] }
    $code = Resolve-Customer $oname $oid
    [void]$sb.AppendLine((
      "INSERT INTO dbo.Pulseway_Notifications (SnapshotDate, NotificationId, CustomerCode, DeviceId, DeviceName, Severity, Title, Message, RaisedAt, IsActive, OrganizationName, ImportedAt) VALUES (@Snap, {0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, @Imp);" -f `
        (SqlEsc ([string]$nid)), (SqlEsc $code), (SqlEsc ([string]$did)), (SqlEsc $dname), (SqlEsc $sev), (SqlEsc $title), (SqlEsc $msg), (SqlDt $raised), (SqlBit $active), (SqlEsc $oname)
    ))
    $nN++
    if ($nN -ge 2000) { break }
  }
  [void]$sb.AppendLine('END')
  Write-Log ("Notification inserts=$nN")
}

[void]$sb.AppendLine('SELECT COUNT(*) AS DevicesToday FROM dbo.Pulseway_Devices WHERE SnapshotDate = @Snap;')
[void]$sb.AppendLine("UPDATE d SET d.CustomerCode = m.CustomerCode FROM dbo.Pulseway_Devices d INNER JOIN dbo.Dim_Pulseway_OrgMap m ON LTRIM(RTRIM(d.OrganizationName)) = LTRIM(RTRIM(m.OrganizationName)) AND ISNULL(m.Active,1)=1 WHERE d.SnapshotDate = @Snap AND (d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode))=N'');")
[void]$sb.AppendLine("UPDATE dbo.Pulseway_Devices SET CustomerCode = N'SIRF' WHERE SnapshotDate = @Snap AND (OrganizationName LIKE N'%Fruit%' OR OrganizationName LIKE N'%SIRF%' OR OrganizationName LIKE N'%Sir Fruit%' OR Name LIKE N'SIRZA%' OR Name LIKE N'%SirFruit%' OR Name LIKE N'%Sir Fruit%');")
if ($sirfOrgIds.Count -gt 0) {
  $idList = (@($sirfOrgIds) | Where-Object { $_ -match '^\d+$' }) -join ','
  if ($idList) {
    [void]$sb.AppendLine("UPDATE dbo.Pulseway_Devices SET CustomerCode = N'SIRF', OrganizationName = COALESCE(NULLIF(LTRIM(RTRIM(OrganizationName)),N''), N'Sir Fruit') WHERE SnapshotDate = @Snap AND OrganizationId IN ($idList);")
  }
}
[void]$sb.AppendLine("UPDATE dbo.Pulseway_Devices SET CustomerCode = N'RSR' WHERE SnapshotDate = @Snap AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode))=N'' OR CustomerCode = N'RSR') AND (OrganizationName LIKE N'%Redsun%' OR OrganizationName LIKE N'%Raisin%');")
[void]$sb.AppendLine("UPDATE dbo.Pulseway_Devices SET CustomerCode = N'RSR' WHERE SnapshotDate = @Snap AND OrganizationName LIKE N'%Redsun%';")
[void]$sb.AppendLine("SELECT OrganizationName, COUNT(*) AS Cnt, SUM(CASE WHEN CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode))=N'' THEN 1 ELSE 0 END) AS Unmapped FROM dbo.Pulseway_Devices WHERE SnapshotDate = @Snap GROUP BY OrganizationName ORDER BY Cnt DESC;")

Write-Log 'Writing devices/orgs/notifications to SQL...'
# Ensure stats columns exist (best effort)
$ensureCols = @'
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'IpAddress') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD IpAddress nvarchar(64) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'CpuUsagePct') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD CpuUsagePct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'MemoryUsagePct') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD MemoryUsagePct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OnlinePct') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD OnlinePct decimal(6,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'UptimeDays') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD UptimeDays decimal(10,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'LastBootAt') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD LastBootAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'PatchInstalledCount') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD PatchInstalledCount int NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'PatchMissingCount') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD PatchMissingCount int NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'PatchPendingCount') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD PatchPendingCount int NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OfflineHoursCurrent') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD OfflineHoursCurrent decimal(12,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OfflineHours7d') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD OfflineHours7d decimal(12,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OfflineHours30d') IS NULL ALTER TABLE dbo.Pulseway_Devices ADD OfflineHours30d decimal(12,2) NULL;
-- Disk DDL (CREATE only). Widening DriveLetter requires SQL admin (458 script) - do not DROP/ALTER here (Rpm_collect often lacks rights).
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NULL
CREATE TABLE dbo.Pulseway_Disks (
  SnapshotDate date NOT NULL, DeviceId nvarchar(100) NOT NULL, DriveLetter nvarchar(128) NOT NULL,
  CustomerCode nvarchar(50) NULL, DeviceName nvarchar(200) NULL,
  TotalGb decimal(18,2) NULL, FreeGb decimal(18,2) NULL, UsedPct decimal(6,2) NULL,
  MediaType nvarchar(40) NULL,
  ReadIops decimal(18,2) NULL, WriteIops decimal(18,2) NULL, TotalIops decimal(18,2) NULL,
  ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwDisk_ImpX DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT PK_Pulseway_Disks PRIMARY KEY (SnapshotDate, DeviceId, DriveLetter)
);
-- Soft ADD only (no DROP VIEW / no ALTER COLUMN)
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Pulseway_Disks', N'MediaType') IS NULL
BEGIN TRY
  ALTER TABLE dbo.Pulseway_Disks ADD MediaType nvarchar(40) NULL;
END TRY BEGIN CATCH END CATCH
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Pulseway_Disks', N'ReadIops') IS NULL
BEGIN TRY
  ALTER TABLE dbo.Pulseway_Disks ADD ReadIops decimal(18,2) NULL;
END TRY BEGIN CATCH END CATCH
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Pulseway_Disks', N'WriteIops') IS NULL
BEGIN TRY
  ALTER TABLE dbo.Pulseway_Disks ADD WriteIops decimal(18,2) NULL;
END TRY BEGIN CATCH END CATCH
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Pulseway_Disks', N'TotalIops') IS NULL
BEGIN TRY
  ALTER TABLE dbo.Pulseway_Disks ADD TotalIops decimal(18,2) NULL;
END TRY BEGIN CATCH END CATCH
'@

Invoke-SqlFile -SqlText $ensureCols -Label 'ensure_stats_cols' -Soft | Out-Null

Invoke-SqlFile -SqlText $sb.ToString() -Label 'collect_write' -Soft | Out-Null

# Disks
if ($diskSb -and $diskSb.Length -gt 0) {
  $diskSql = New-Object System.Text.StringBuilder
  [void]$diskSql.AppendLine('SET NOCOUNT ON; DECLARE @Snap date = CAST(SYSUTCDATETIME() AT TIME ZONE ''UTC'' AT TIME ZONE ''South Africa Standard Time'' AS date); DECLARE @Imp datetime2(3) = SYSUTCDATETIME();')
  [void]$diskSql.AppendLine('IF OBJECT_ID(N''dbo.Pulseway_Disks'',N''U'') IS NOT NULL BEGIN')
  [void]$diskSql.AppendLine('DELETE FROM dbo.Pulseway_Disks WHERE SnapshotDate = @Snap;')
  [void]$diskSql.AppendLine($diskSb.ToString())
  [void]$diskSql.AppendLine('END')
  $diskIns = ([regex]::Matches($diskSb.ToString(), 'INSERT INTO')).Count
  Write-Log ("Writing disks... insertRows=$diskIns")
  # Sample first disk INSERT for culture/decimal check
  $dm = [regex]::Match($diskSb.ToString(), 'INSERT INTO dbo\.Pulseway_Disks[^;]+;')
  if ($dm.Success) {
    $snip = $dm.Value
    if ($snip.Length -gt 280) { $snip = $snip.Substring(0, 280) }
    Write-Log ('disk insert sample: ' + $snip)
  }
  Invoke-SqlFile -SqlText $diskSql.ToString() -Label 'collect_disks' -Soft | Out-Null

} else {
  Write-Log 'No disk objects on device payload (API list may be thin - stats stay NULL until detail enrichment).'
}

# Auto-map
$autoSql = Join-Path $here '441_AutoMap_Pulseway_Orgs.sql'
if (Test-Path $autoSql) {
  Write-Log 'Auto-map orgs...'
  Invoke-SqlFile -SqlText ([IO.File]::ReadAllText($autoSql)) -Label 'automap' -Soft | Out-Null
}

# Rebuild summary (always)
$summarySql = @'
SET NOCOUNT ON;
DECLARE @Snap date = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
IF @Snap IS NULL BEGIN PRINT 'No devices'; RETURN; END

DELETE FROM dbo.Pulseway_OrgSummary WHERE SnapshotDate = @Snap;

INSERT INTO dbo.Pulseway_OrgSummary (
  SnapshotDate, CustomerCode, OrganizationName, DeviceCount, OnlineCount, OfflineCount,
  MaintenanceCount, CriticalAlerts, ElevatedAlerts, NormalAlerts, LowAlerts,
  DiskHighCount, ServerCount, WorkstationCount, NotificationCount, ImportedAt
)
SELECT
  @Snap,
  d.CustomerCode,
  MAX(d.OrganizationName),
  COUNT_BIG(*),
  SUM(CASE WHEN d.IsOnline = 1 THEN 1 ELSE 0 END),
  SUM(CASE WHEN d.IsOnline = 0 OR d.IsOnline IS NULL THEN 1 ELSE 0 END),
  0,
  SUM(ISNULL(d.CriticalNotifications, 0)),
  SUM(ISNULL(d.ElevatedNotifications, 0)),
  0, 0, 0,
  SUM(CASE WHEN d.DeviceType = N'Server' THEN 1 ELSE 0 END),
  SUM(CASE WHEN d.DeviceType = N'Workstation' THEN 1 ELSE 0 END),
  0,
  SYSUTCDATETIME()
FROM dbo.Pulseway_Devices AS d
WHERE d.SnapshotDate = @Snap
  AND d.CustomerCode IS NOT NULL
  AND LTRIM(RTRIM(d.CustomerCode)) <> N''
  AND EXISTS (SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = d.CustomerCode)
GROUP BY d.CustomerCode;

-- notification counts
IF OBJECT_ID(N'dbo.Pulseway_Notifications', N'U') IS NOT NULL
BEGIN
  UPDATE s
  SET NotificationCount = x.Cnt,
      CriticalAlerts = CASE WHEN x.Crit > ISNULL(s.CriticalAlerts,0) THEN x.Crit ELSE s.CriticalAlerts END,
      ElevatedAlerts = CASE WHEN x.Elev > ISNULL(s.ElevatedAlerts,0) THEN x.Elev ELSE s.ElevatedAlerts END
  FROM dbo.Pulseway_OrgSummary AS s
  INNER JOIN (
    SELECT CustomerCode,
      COUNT_BIG(*) AS Cnt,
      SUM(CASE WHEN Severity LIKE N'%Crit%' OR Severity LIKE N'%High%' OR Severity IN (N'3',N'Critical') THEN 1 ELSE 0 END) AS Crit,
      SUM(CASE WHEN Severity LIKE N'%Elev%' OR Severity LIKE N'%Med%' OR Severity IN (N'2',N'Elevated') THEN 1 ELSE 0 END) AS Elev
    FROM dbo.Pulseway_Notifications
    WHERE SnapshotDate = @Snap AND CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
    GROUP BY CustomerCode
  ) AS x ON x.CustomerCode = s.CustomerCode
  WHERE s.SnapshotDate = @Snap;
END

SELECT COUNT(*) AS DevicesToday FROM dbo.Pulseway_Devices WHERE SnapshotDate = @Snap;
SELECT COUNT(*) AS MappedCustomers FROM dbo.Pulseway_OrgSummary WHERE SnapshotDate = @Snap;
SELECT COUNT(*) AS UnmappedDevices FROM dbo.Pulseway_Devices WHERE SnapshotDate = @Snap AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'');
PRINT N'=== Org map ===';
SELECT OrganizationName, CustomerCode, Notes FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK) WHERE Active = 1 ORDER BY 1;
PRINT N'=== Still unmapped orgs (map these) ===';
SELECT OrganizationName, COUNT(*) AS Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = @Snap AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
GROUP BY OrganizationName
ORDER BY Devices DESC;
'@

Write-Log 'Rebuild org summary...'
Invoke-SqlFile -SqlText $summarySql -Label 'summary' -Soft | Out-Null

Write-Log '=== Pulseway collect done ==='
Write-Log ("log=" + $log)
Write-Log 'If MappedCustomers=0: insert aliases into Dim_Pulseway_OrgAlias then re-run collect.'
exit 0
