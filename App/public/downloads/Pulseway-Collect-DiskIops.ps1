# Pulseway Automation script — sample Windows disk performance counters
# and POST them to RPM Assure. Pulseway REST v3 cannot return IOPS or
# script output, so the device must push.
#
# Pulseway → Automation → Scripts → New (PowerShell). Inputs:
#   AssureUrl    = https://assure.rpmresources.co.za/api/iops
#   AssureSecret = same value as PULSEWAY_WEBHOOK_SECRET / RPM_ASSURE_IOPS_SECRET
# Schedule every 15 min on Windows servers (and workstations you want on Disk IOPS).
#
# ASCII only. Windows PowerShell 5.1.

$ErrorActionPreference = 'Continue'
if (-not $AssureUrl) { $AssureUrl = 'https://assure.rpmresources.co.za/api/iops' }
if (-not $AssureSecret) { $AssureSecret = $env:RPM_ASSURE_IOPS_SECRET }
if (-not $AssureSecret) { $AssureSecret = $env:PULSEWAY_WEBHOOK_SECRET }
$SampleSec = 6
if ($SampleSec -lt 4) { $SampleSec = 4 }

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
    $by[$k] = @{ letter = $k; read = $null; write = $null; total = $null; queue = $null; latR = $null; latW = $null; totGb = $null; freeGb = $null; used = $null; media = $null }
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

try { Start-Process -FilePath 'diskperf.exe' -ArgumentList '-Y' -Wait -WindowStyle Hidden -ErrorAction SilentlyContinue | Out-Null } catch {}

$paths = @(
  '\LogicalDisk(*)\Disk Reads/sec',
  '\LogicalDisk(*)\Disk Writes/sec',
  '\LogicalDisk(*)\Disk Transfers/sec',
  '\LogicalDisk(*)\Current Disk Queue Length',
  '\LogicalDisk(*)\Avg. Disk sec/Read',
  '\LogicalDisk(*)\Avg. Disk sec/Write'
)
$samples = $null
try { $samples = Get-Counter -Counter $paths -SampleInterval $SampleSec -MaxSamples 2 -ErrorAction Stop } catch { $samples = $null }
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
}
if ($by.Count -eq 0) {
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
  } catch {}
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

function Normalize-Media([string]$raw, [string]$bus, [string]$model) {
  $blob = (($raw + " " + $bus + " " + $model) | Out-String).ToUpperInvariant()
  $isNvme = $blob -match "NVME|NVM EXPRESS" -or $bus -eq "17" -or $bus -match "NVMe"
  $isSas  = $blob -match "\bSAS\b" -or $bus -eq "10"
  $isSata = $blob -match "\bSATA\b|\bATA\b" -or $bus -eq "11" -or $bus -eq "3"
  $isVirt = $blob -match "VIRTUAL|VHD|MSFT VIRTUAL|HYPER-V" -or $bus -eq "14" -or $bus -eq "15"
  $isSsd  = $blob -match "SSD|SOLID" -or $raw -eq "4" -or $raw -eq "SSD"
  $isHdd  = $blob -match "HDD|ROTAT|HARD DISK|SPIN" -or $raw -eq "3" -or $raw -eq "HDD"
  if ($isNvme) { return "NVMe" }
  if ($isVirt) { return "Virtual" }
  if ($isSas -and $isSsd) { return "SAS SSD" }
  if ($isSas) { return "SAS HDD" }
  if ($isSata -and $isSsd) { return "SATA SSD" }
  if ($isSata -and $isHdd) { return "SATA HDD" }
  if ($isSsd) { return "SATA SSD" }
  if ($isHdd) { return "SATA HDD" }
  if ($model -and $model.Trim() -ne "") { return $model.Trim() }
  return $null
}

try {
  $pdByNum = @{}
  foreach ($pd in @(Get-PhysicalDisk -ErrorAction SilentlyContinue)) {
    $id = $null
    try { $id = [string]$pd.DeviceId } catch {}
    $media = Normalize-Media ([string]$pd.MediaType) ([string]$pd.BusType) ([string]$pd.FriendlyName)
    if ($id) { $pdByNum[$id] = $media }
  }
  foreach ($part in @(Get-Partition -ErrorAction SilentlyContinue)) {
    $let = $null
    try { if ($part.DriveLetter) { $let = ([string]$part.DriveLetter).ToUpper() + ":" } } catch {}
    if (-not $let) { continue }
    $num = $null
    try { $num = [string]$part.DiskNumber } catch {}
    if ($num -and $pdByNum.ContainsKey($num) -and $by.ContainsKey($let)) {
      $by[$let].media = $pdByNum[$num]
    }
  }
} catch {}

if (@($by.Values | Where-Object { $_.media }).Count -eq 0) {
  try {
    $drives = @(Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue)
    $parts = @(Get-CimInstance Win32_DiskDriveToDiskPartition -ErrorAction SilentlyContinue)
    $logs = @(Get-CimInstance Win32_LogicalDiskToPartition -ErrorAction SilentlyContinue)
    foreach ($log in $logs) {
      $let = $null
      if ($log.Dependent -match 'DeviceID="([A-Z]:)"') { $let = $Matches[1] }
      if (-not $let -or -not $by.ContainsKey($let)) { continue }
      $partPath = [string]$log.Antecedent
      $drv = $parts | Where-Object { [string]$_.Dependent -eq $partPath } | Select-Object -First 1
      if (-not $drv) { continue }
      $disk = $drives | Where-Object { [string]$_.Path -eq [string]$drv.Antecedent } | Select-Object -First 1
      if (-not $disk) { $disk = $drives | Where-Object { $drv.Antecedent -match [regex]::Escape([string]$_.DeviceID) } | Select-Object -First 1 }
      if ($disk) { $by[$let].media = Normalize-Media ([string]$disk.MediaType) ([string]$disk.InterfaceType) ([string]$disk.Model) }
    }
  } catch {}
}

$volumes = @()
foreach ($k in @($by.Keys | Sort-Object)) {
  $b = $by[$k]
  $t = $b.total
  if ($null -eq $t -and ($null -ne $b.read -or $null -ne $b.write)) {
    $t = [math]::Round(($(if ($null -ne $b.read) { $b.read } else { 0 }) + $(if ($null -ne $b.write) { $b.write } else { 0 })), 2)
  }
  $volumes += @{
    driveLetter   = $b.letter
    totalGb       = $b.totGb
    freeGb        = $b.freeGb
    usedPct       = $b.used
    mediaType     = $b.media
    readIops      = $b.read
    writeIops     = $b.write
    totalIops     = $t
    queueLen      = $b.queue
    readLatencyMs = $b.latR
    writeLatencyMs= $b.latW
  }
}

if ($volumes.Count -eq 0) {
  Write-Host 'FAIL no disk performance counters on this host'
  exit 1
}
if (-not $AssureSecret) {
  Write-Host 'FAIL AssureSecret input is empty — set it on the Pulseway script'
  exit 1
}

$body = @{
  hostName     = $env:COMPUTERNAME
  source       = 'pulseway'
  sampleSec    = $SampleSec
  volumes      = $volumes
} | ConvertTo-Json -Depth 6 -Compress

try {
  $resp = Invoke-WebRequest -Uri $AssureUrl -Method POST -UseBasicParsing -TimeoutSec 45 `
    -Headers @{ 'X-Assure-Secret' = $AssureSecret; 'Content-Type' = 'application/json' } `
    -Body $body
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
