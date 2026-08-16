# Test Windows disk performance counters, then POST to RPM Assure.
# Run as Administrator on the server BEFORE you add it to Pulseway.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\Temp\Test-DiskIops.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\Temp\Test-DiskIops.ps1 -Post -AssureSecret 'YOUR-SECRET'
#
# ASCII. Windows PowerShell 5.1. Do not paste line-by-line.

param(
  [string]$AssureUrl = 'https://assure.rpmresources.co.za/api/iops',
  [string]$AssureSecret = '',
  [int]$SampleSec = 6,
  [switch]$Post
)

$ErrorActionPreference = 'Continue'
if ($SampleSec -lt 4) { $SampleSec = 4 }
if (-not $AssureSecret) { $AssureSecret = [string]$env:RPM_ASSURE_IOPS_SECRET }
if (-not $AssureSecret) { $AssureSecret = [string]$env:PULSEWAY_WEBHOOK_SECRET }

Write-Host ("TEST host=" + $env:COMPUTERNAME + " sample=" + $SampleSec + "s")

function Drive-Key([string]$inst) {
  if (-not $inst) { return $null }
  $t = $inst.Trim()
  if ($t -eq '_Total' -or $t -eq 'Total') { return $null }
  if ($t -match 'HarddiskVolume') { return $null }
  if ($t -match '([A-Za-z]):') { return $Matches[1].ToUpper() + ':' }
  if ($t -match '^[A-Za-z]$') { return $t.ToUpper() + ':' }
  if ($t -match '^(\d+)$') { return 'PD' + $Matches[1] }
  return $t
}

$by = @{}
function Bucket([string]$k) {
  if (-not $by.ContainsKey($k)) {
    $by[$k] = @{ letter = $k; read = $null; write = $null; total = $null; queue = $null; latR = $null; latW = $null; totGb = $null; freeGb = $null; used = $null }
  }
  return $by[$k]
}
function SetN($o, [string]$n, $v) {
  if ($null -eq $v) { return }
  try {
    $x = [double]$v
    if ([double]::IsNaN($x) -or [double]::IsInfinity($x) -or $x -lt 0) { return }
    $o[$n] = [math]::Round($x, 2)
  } catch {}
}

Write-Host 'enabling diskperf -Y'
try {
  Start-Process -FilePath 'diskperf.exe' -ArgumentList '-Y' -Wait -WindowStyle Hidden -ErrorAction SilentlyContinue | Out-Null
} catch {
  Write-Host ('WARN diskperf ' + $_.Exception.Message)
}

$paths = @(
  '\LogicalDisk(*)\Disk Reads/sec',
  '\LogicalDisk(*)\Disk Writes/sec',
  '\LogicalDisk(*)\Disk Transfers/sec',
  '\LogicalDisk(*)\Current Disk Queue Length',
  '\LogicalDisk(*)\Avg. Disk sec/Read',
  '\LogicalDisk(*)\Avg. Disk sec/Write'
)
$method = 'none'
$samples = $null
try {
  $samples = Get-Counter -Counter $paths -SampleInterval $SampleSec -MaxSamples 2 -ErrorAction Stop
} catch {
  Write-Host ('WARN Get-Counter ' + $_.Exception.Message)
  $samples = $null
}
if ($samples) {
  $sets = @($samples)
  if ($sets.Count -gt 1) { $sets = @($sets | Select-Object -Last 1) }
  foreach ($set in $sets) {
    foreach ($s in @($set.CounterSamples)) {
      $k = Drive-Key ([string]$s.InstanceName)
      if (-not $k) { continue }
      $b = Bucket $k
      $p = [string]$s.Path
      $v = $null
      try { $v = [double]$s.CookedValue } catch { continue }
      if ($p -match 'Disk Reads/sec') { SetN $b 'read' $v }
      if ($p -match 'Disk Writes/sec') { SetN $b 'write' $v }
      if ($p -match 'Disk Transfers/sec') { SetN $b 'total' $v }
      if ($p -match 'Current Disk Queue Length') { SetN $b 'queue' $v }
      if ($p -match 'Avg\. Disk sec/Read') { SetN $b 'latR' ($v * 1000) }
      if ($p -match 'Avg\. Disk sec/Write') { SetN $b 'latW' ($v * 1000) }
    }
  }
  if ($by.Count -gt 0) { $method = 'Get-Counter LogicalDisk' }
}
if ($by.Count -eq 0) {
  Write-Host 'trying WMI LogicalDisk'
  try {
    foreach ($row in @(Get-CimInstance -ClassName Win32_PerfFormattedData_PerfDisk_LogicalDisk -ErrorAction Stop)) {
      $k = Drive-Key ([string]$row.Name)
      if (-not $k) { continue }
      $b = Bucket $k
      SetN $b 'read' $row.DiskReadsPersec
      SetN $b 'write' $row.DiskWritesPersec
      SetN $b 'total' $row.DiskTransfersPersec
      SetN $b 'queue' $row.CurrentDiskQueueLength
    }
    if ($by.Count -gt 0) { $method = 'WMI LogicalDisk' }
  } catch {
    Write-Host ('WARN WMI ' + $_.Exception.Message)
  }
}

try {
  foreach ($d in @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' -ErrorAction SilentlyContinue)) {
    $let = ([string]$d.DeviceID).Trim()
    if ($let -and $let -notmatch ':$') { $let = $let + ':' }
    if (-not $let) { continue }
    $b = Bucket $let
    if ($d.Size -and $d.Size -gt 0) {
      SetN $b 'totGb' ([double]$d.Size / 1GB)
      SetN $b 'freeGb' ([double]$d.FreeSpace / 1GB)
      SetN $b 'used' ((([double]$d.Size - [double]$d.FreeSpace) / [double]$d.Size) * 100)
    }
  }
} catch {}

$volumes = @()
foreach ($k in @($by.Keys | Sort-Object)) {
  $b = $by[$k]
  $t = $b.total
  if ($null -eq $t) {
    $rd = 0; $wr = 0
    if ($null -ne $b.read) { $rd = $b.read }
    if ($null -ne $b.write) { $wr = $b.write }
    if ($null -ne $b.read -or $null -ne $b.write) { $t = [math]::Round(($rd + $wr), 2) }
  }
  $volumes += [pscustomobject]@{
    driveLetter    = $b.letter
    totalGb        = $b.totGb
    freeGb         = $b.freeGb
    usedPct        = $b.used
    readIops       = $b.read
    writeIops      = $b.write
    totalIops      = $t
    queueLen       = $b.queue
    readLatencyMs  = $b.latR
    writeLatencyMs = $b.latW
  }
}

Write-Host ("method=" + $method + " volumes=" + $volumes.Count)
if ($volumes.Count -eq 0) {
  Write-Host 'FAIL no disk performance counters on this host'
  Write-Host '  Run elevated: diskperf -Y'
  Write-Host "  Then: Get-Counter '\\LogicalDisk(*)\\Disk Transfers/sec'"
  exit 1
}

$volumes | Format-Table driveLetter, totalGb, usedPct, readIops, writeIops, totalIops, queueLen -AutoSize
Write-Host 'Counters OK. Idle disks show 0 / near-0 — that is real, not sample data.'

if (-not $Post) {
  Write-Host 'Dry run only. To POST to Assure add -Post -AssureSecret ''YOUR-SECRET'''
  exit 0
}
if (-not $AssureSecret) {
  Write-Host 'FAIL -Post needs -AssureSecret (same as PULSEWAY_WEBHOOK_SECRET / RPM_ASSURE_IOPS_SECRET)'
  exit 1
}

$payload = @{
  hostName  = $env:COMPUTERNAME
  source    = 'pulseway-test'
  sampleSec = $SampleSec
  volumes   = @($volumes | ForEach-Object {
    @{
      driveLetter    = $_.driveLetter
      totalGb        = $_.totalGb
      freeGb         = $_.freeGb
      usedPct        = $_.usedPct
      readIops       = $_.readIops
      writeIops      = $_.writeIops
      totalIops      = $_.totalIops
      queueLen       = $_.queueLen
      readLatencyMs  = $_.readLatencyMs
      writeLatencyMs = $_.writeLatencyMs
    }
  })
}
$body = $payload | ConvertTo-Json -Depth 6 -Compress
Write-Host ("POST " + $AssureUrl)
try {
  $resp = Invoke-WebRequest -Uri $AssureUrl -Method POST -UseBasicParsing -TimeoutSec 45 -Headers @{ 'X-Assure-Secret' = $AssureSecret; 'Content-Type' = 'application/json' } -Body $body
  Write-Host ("OK " + $resp.StatusCode + " " + $resp.Content)
  exit 0
} catch {
  $msg = $_.Exception.Message
  try {
    $r = $_.Exception.Response
    if ($r) {
      $sr = New-Object IO.StreamReader($r.GetResponseStream())
      $msg = $sr.ReadToEnd()
    }
  } catch {}
  Write-Host ("FAIL post " + $msg)
  exit 1
}
