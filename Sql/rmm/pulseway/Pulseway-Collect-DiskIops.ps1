# Pulseway Automation body. No file path. No input variables.
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$AssureUrl = 'https://assure.rpmresources.co.za/api/iops'
$AssureSecret = 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz'
Write-Host ('IOPS start host=' + $env:COMPUTERNAME + ' ps=' + $PSVersionTable.PSVersion)

function Drive-Key([string]$inst) {
  if (-not $inst) { return $null }
  $t = $inst.Trim()
  if ($t -eq '_Total' -or $t -eq 'Total') { return $null }
  if ($t -match 'HarddiskVolume') { return $null }
  if ($t -match '([A-Za-z]):') { return ($Matches[1].ToUpper() + ':') }
  if ($t -match '^[A-Za-z]$') { return ($t.ToUpper() + ':') }
  return $null
}

$by = @{}
function Bucket([string]$k) {
  if (-not $by.ContainsKey($k)) {
    $by[$k] = @{ letter = $k; read = $null; write = $null; total = $null; queue = $null; totGb = $null; freeGb = $null; used = $null }
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
  Write-Host ('cim volumes=' + $by.Count)
} catch {
  Write-Host ('cim skip ' + $_.Exception.Message)
}

if ($by.Count -eq 0) {
  try {
    $paths = @('\LogicalDisk(*)\Disk Reads/sec', '\LogicalDisk(*)\Disk Writes/sec', '\LogicalDisk(*)\Disk Transfers/sec')
    $samples = Get-Counter -Counter $paths -SampleInterval 2 -MaxSamples 2 -ErrorAction Stop
    $set = @($samples) | Select-Object -Last 1
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
    }
    Write-Host ('counter volumes=' + $by.Count)
  } catch {
    Write-Host ('counter skip ' + $_.Exception.Message)
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

if ($by.Count -eq 0) {
  $b = Bucket 'C:'
  SetN $b 'read' 0
  SetN $b 'write' 0
  SetN $b 'total' 0
  Write-Host 'fallback C: zeros so POST still happens'
}

$volumes = @()
foreach ($k in @($by.Keys | Sort-Object)) {
  $b = $by[$k]
  $t = $b.total
  if ($null -eq $t) {
    $rd = 0; $wr = 0
    if ($null -ne $b.read) { $rd = $b.read }
    if ($null -ne $b.write) { $wr = $b.write }
    $t = [math]::Round(($rd + $wr), 2)
  }
  $volumes += @{
    driveLetter = $b.letter
    totalGb     = $b.totGb
    freeGb      = $b.freeGb
    usedPct     = $b.used
    readIops    = $b.read
    writeIops   = $b.write
    totalIops   = $t
    queueLen    = $b.queue
  }
}
Write-Host ('post volumes=' + $volumes.Count)

$bodyObj = @{
  hostName  = $env:COMPUTERNAME
  source    = 'pulseway'
  sampleSec = 2
  volumes   = $volumes
}
$body = $bodyObj | ConvertTo-Json -Depth 6 -Compress
Write-Host ('json len=' + $body.Length)

try {
  $resp = Invoke-WebRequest -Uri $AssureUrl -Method POST -UseBasicParsing -TimeoutSec 45 -Headers @{ 'X-Assure-Secret' = $AssureSecret; 'Content-Type' = 'application/json' } -Body $body
  Write-Host ('OK ' + $resp.StatusCode + ' ' + $resp.Content)
  exit 0
} catch {
  $msg = $_.Exception.Message
  try {
    if ($_.Exception.Response) {
      $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
      $msg = $sr.ReadToEnd()
    }
  } catch {}
  Write-Host ('FAIL post ' + $msg)
  exit 1
}
