# Pulseway Automation — no Assure Edge agent. Paste THIS BODY into the script.
# Pulseway user-defined INPUT (name exactly):
#   AssureSecret  = RPM_ASSURE_IOPS_SECRET from the website host .env.local
# Optional: CustomerCode, OrganizationName
# URL is hardcoded. Do not use a file path. Scope: Windows servers.

$ErrorActionPreference = 'Continue'
function Pick-In {
  param([string[]]$Names)
  foreach ($n in $Names) {
    if (Get-Variable -Name $n -ErrorAction SilentlyContinue) {
      $v = [string](Get-Variable -Name $n -ValueOnly -ErrorAction SilentlyContinue)
      if ($v -and $v.Trim() -ne '' -and $v -notmatch '^%%' -and $v -notmatch '^\{\{') { return $v.Trim() }
    }
  }
  return $null
}

$AssureUrl = Pick-In @('AssureUrl','IopsUrl','Url')
if (-not $AssureUrl) { $AssureUrl = 'https://assure.rpmresources.co.za/api/iops' }
$AssureSecret = Pick-In @('AssureSecret','Secret','IopsSecret','RPM_ASSURE_IOPS_SECRET','PULSEWAY_WEBHOOK_SECRET')
if (-not $AssureSecret) { $AssureSecret = [string]$env:RPM_ASSURE_IOPS_SECRET }
if (-not $AssureSecret) { $AssureSecret = [string]$env:PULSEWAY_WEBHOOK_SECRET }
$CustomerCode = Pick-In @('CustomerCode','Customer','Code')
$OrganizationName = Pick-In @('OrganizationName','Organization','Org')
$SampleSec = 6
$secFlag = 'MISSING'
if ($AssureSecret) { $secFlag = 'set' }
Write-Host ("IOPS start host=" + $env:COMPUTERNAME + " url=" + $AssureUrl + " secret=" + $secFlag + " customer=" + $CustomerCode)

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

try { & diskperf.exe -Y | Out-Null } catch {}

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
  $volumes += @{
    driveLetter    = $b.letter
    totalGb        = $b.totGb
    freeGb         = $b.freeGb
    usedPct        = $b.used
    mediaType      = $b.media
    readIops       = $b.read
    writeIops      = $b.write
    totalIops      = $t
    queueLen       = $b.queue
    readLatencyMs  = $b.latR
    writeLatencyMs = $b.latW
  }
}

if ($volumes.Count -eq 0) {
  Write-Host 'FAIL no disk performance counters on this host'
  exit 1
}
if (-not $AssureSecret) {
  Write-Host 'FAIL user-defined input AssureSecret is empty. Script → Variables → Input → Name=AssureSecret (exact) → paste website secret.'
  exit 1
}

$bodyObj = @{
  hostName  = $env:COMPUTERNAME
  source    = 'pulseway'
  sampleSec = $SampleSec
  volumes   = $volumes
}
if ($CustomerCode) { $bodyObj.customerCode = [string]$CustomerCode }
if ($OrganizationName) { $bodyObj.organizationName = [string]$OrganizationName }
$body = $bodyObj | ConvertTo-Json -Depth 6 -Compress

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
