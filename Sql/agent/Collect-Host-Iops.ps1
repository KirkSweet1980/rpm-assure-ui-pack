# RPM Assure - local disk IOPS on this host.
# Pulseway REST v3 does not publish IOPS. The Edge Agent samples Windows counters
# and writes dbo.Agent_DiskIops on central Assure.
param(
  [string]$ConfigPath = "",
  [int]$SampleSec = 8,
  [string]$AgentRoot = "C:\RPM-Assure\Agent"
)

$ErrorActionPreference = "Stop"
if ($SampleSec -lt 4) { $SampleSec = 4 }
if ($SampleSec -gt 20) { $SampleSec = 20 }

function W([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z " + $m
  Write-Host $line
}

function Sql-Lit([string]$s) {
  if ($null -eq $s -or $s.Trim() -eq "" -or $s -match "^(Unspecified|Unknown|Fixed hard disk)") { return "NULL" }
  return "N'" + ($s.Replace("'", "''")) + "'"
}
function Sql-Dec($v) {
  if ($null -eq $v -or "$v" -eq "") { return "NULL" }
  try {
    $n = [double]$v
    if ([double]::IsNaN($n) -or [double]::IsInfinity($n)) { return "NULL" }
    return $n.ToString("0.##", [Globalization.CultureInfo]::InvariantCulture)
  } catch { return "NULL" }
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
  if ($isSas) { return "SAS HDD" }
  if ($isSata) { return "SATA HDD" }
  if ($model -and $model.Trim() -ne "") { return $model.Trim() }
  return $null
}

# --- config ---
$tried = @()
if ($ConfigPath) { $tried += $ConfigPath }
$tried += (Join-Path $AgentRoot "Agent.Config.ps1")
$custRoot = "C:\RPM-Assure\Sql\customers"
if (Test-Path $custRoot) {
  $one = Get-ChildItem $custRoot -Filter "Customer.Config.ps1" -Recurse -EA SilentlyContinue | Select-Object -First 1
  if ($one) { $tried += $one.FullName }
}
$loaded = $false
foreach ($p in $tried) {
  if ($p -and (Test-Path -LiteralPath $p)) {
    . $p
    $loaded = $true
    W ("config " + $p)
    break
  }
}
$lib = Join-Path $AgentRoot "Lib-SecureConfig.ps1"
if (Test-Path $lib) {
  . $lib
  $script:RpmaAgentRoot = $AgentRoot
  if (Get-Command Import-RpmaAgentSecrets -EA SilentlyContinue) {
    try { Import-RpmaAgentSecrets } catch {}
  }
}
$httpsLib = Join-Path $AgentRoot "Lib-RpmaHttps.ps1"
if (Test-Path $httpsLib) { . $httpsLib }
if (-not $PreferHttps) { $PreferHttps = $true }
if (-not $CentralDatabase) { $CentralDatabase = "RPMAssure_App" }
if (-not $CustomerCode) { $CustomerCode = $env:COMPUTERNAME }
$HostName = $env:COMPUTERNAME
if (-not $PreferHttps) {
  if (-not $CentralDataSource) { throw "CentralDataSource missing - run from the Edge Agent or pass -ConfigPath Customer.Config.ps1" }
  if (-not $CentralSqlUser) { throw "CentralSqlUser missing" }
  if (-not $CentralSqlPassword) { throw "CentralSqlPassword missing" }
}
W ("START iops host=$HostName customer=$CustomerCode sample=${SampleSec}s https=$PreferHttps")

# --- Windows disk performance counters (PowerShell) ---
# Pulseway does not publish IOPS. This host must have:
#   1) diskperf enabled  (we turn it on)
#   2) LogicalDisk or PhysicalDisk counters
# Get-Counter is preferred (interval sample). WMI is the fallback when
# counters are localized, disabled, or the PDH query fails.

function New-IopsBucket {
  return @{ Read = $null; Write = $null; Total = $null; Queue = $null; LatR = $null; LatW = $null }
}
function Drive-Key([string]$inst) {
  if (-not $inst) { return $null }
  $t = $inst.Trim()
  if ($t -eq "_Total" -or $t -eq "Total") { return $null }
  if ($t -match "HarddiskVolume") { return $null }
  if ($t -match "([A-Za-z]):") { return $Matches[1].ToUpper() + ":" }
  if ($t -match "^[A-Za-z]$") { return $t.ToUpper() + ":" }
  if ($t -match "^(\d+)$") { return "PD" + $Matches[1] }
  return $t
}
function Ensure-Bucket($map, [string]$key) {
  if (-not $map.ContainsKey($key)) { $map[$key] = New-IopsBucket }
  return $map[$key]
}
function Set-IopsField($bucket, [string]$kind, $val) {
  if ($null -eq $val) { return }
  try {
    $n = [double]$val
    if ([double]::IsNaN($n) -or [double]::IsInfinity($n) -or $n -lt 0) { return }
    if ($kind -eq "Read") { $bucket.Read = [math]::Round($n, 2) }
    if ($kind -eq "Write") { $bucket.Write = [math]::Round($n, 2) }
    if ($kind -eq "Total") { $bucket.Total = [math]::Round($n, 2) }
    if ($kind -eq "Queue") { $bucket.Queue = [math]::Round($n, 2) }
    if ($kind -eq "LatR") { $bucket.LatR = [math]::Round($n, 2) }
    if ($kind -eq "LatW") { $bucket.LatW = [math]::Round($n, 2) }
  } catch {}
}
function Ingest-CounterSet($map, $samples) {
  if (-not $samples) { return 0 }
  $sets = @($samples)
  if ($sets.Count -gt 1) { $sets = @($sets | Select-Object -Last 1) }
  $n = 0
  foreach ($set in $sets) {
    $rows = @()
    if ($set.CounterSamples) { $rows = @($set.CounterSamples) } else { $rows = @($set) }
    foreach ($s in $rows) {
      $key = Drive-Key ([string]$s.InstanceName)
      if (-not $key) { continue }
      $b = Ensure-Bucket $map $key
      $path = [string]$s.Path
      $val = $null
      try { $val = [double]$s.CookedValue } catch { continue }
      if ($path -match "Disk Reads/sec") { Set-IopsField $b "Read" $val; $n++ }
      if ($path -match "Disk Writes/sec") { Set-IopsField $b "Write" $val; $n++ }
      if ($path -match "Disk Transfers/sec") { Set-IopsField $b "Total" $val; $n++ }
      if ($path -match "Current Disk Queue Length") { Set-IopsField $b "Queue" $val; $n++ }
      if ($path -match "Avg\. Disk sec/Read") { Set-IopsField $b "LatR" ($val * 1000); $n++ }
      if ($path -match "Avg\. Disk sec/Write") { Set-IopsField $b "LatW" ($val * 1000); $n++ }
    }
  }
  return $n
}
function Try-GetCounter([string[]]$paths) {
  try {
    return Get-Counter -Counter $paths -SampleInterval $SampleSec -MaxSamples 2 -ErrorAction Stop
  } catch {
    W ("WARN Get-Counter: " + $_.Exception.Message)
    return $null
  }
}
function Ingest-WmiFormatted($map, [string]$className) {
  $n = 0
  try {
    foreach ($row in @(Get-CimInstance -ClassName $className -ErrorAction Stop)) {
      $key = Drive-Key ([string]$row.Name)
      if (-not $key) { continue }
      $b = Ensure-Bucket $map $key
      Set-IopsField $b "Read" $row.DiskReadsPersec
      Set-IopsField $b "Write" $row.DiskWritesPersec
      Set-IopsField $b "Total" $row.DiskTransfersPersec
      Set-IopsField $b "Queue" $row.CurrentDiskQueueLength
      if ($null -ne $row.AvgDisksecPerRead) { Set-IopsField $b "LatR" ([double]$row.AvgDisksecPerRead * 1000) }
      if ($null -ne $row.AvgDisksecPerWrite) { Set-IopsField $b "LatW" ([double]$row.AvgDisksecPerWrite * 1000) }
      $n++
    }
  } catch {
    W ("WARN " + $className + ": " + $_.Exception.Message)
  }
  return $n
}
function Ingest-WmiRaw($map, [string]$className) {
  try {
    $first = @(Get-CimInstance -ClassName $className -ErrorAction Stop)
    Start-Sleep -Seconds $SampleSec
    $second = @(Get-CimInstance -ClassName $className -ErrorAction Stop)
    $prevBy = @{}
    foreach ($row in $first) { $prevBy[[string]$row.Name] = $row }
    $n = 0
    foreach ($row in $second) {
      $name = [string]$row.Name
      $key = Drive-Key $name
      if (-not $key) { continue }
      $prev = $prevBy[$name]
      if (-not $prev) { continue }
      $freq = 0.0; $t1 = 0.0; $t2 = 0.0
      try { $freq = [double]$row.Frequency_PerfTime } catch {}
      try { $t1 = [double]$prev.Timestamp_PerfTime } catch {}
      try { $t2 = [double]$row.Timestamp_PerfTime } catch {}
      if ($freq -le 0 -or $t2 -le $t1) { continue }
      $sec = ($t2 - $t1) / $freq
      if ($sec -le 0) { continue }
      $bk = Ensure-Bucket $map $key
      Set-IopsField $bk "Read" (([double]$row.DiskReadsPersec - [double]$prev.DiskReadsPersec) / $sec)
      Set-IopsField $bk "Write" (([double]$row.DiskWritesPersec - [double]$prev.DiskWritesPersec) / $sec)
      Set-IopsField $bk "Total" (([double]$row.DiskTransfersPersec - [double]$prev.DiskTransfersPersec) / $sec)
      Set-IopsField $bk "Queue" $row.CurrentDiskQueueLength
      $n++
    }
    return $n
  } catch {
    W ("WARN raw " + $className + ": " + $_.Exception.Message)
    return 0
  }
}

W "enabling disk performance counters (diskperf -Y)"
try {
  & diskperf.exe -Y | Out-Null
  W "diskperf ok"
} catch {
  W ("WARN diskperf: " + $_.Exception.Message)
}

$byInst = @{}
$method = "none"
$logicalPaths = @(
  "\LogicalDisk(*)\Disk Reads/sec",
  "\LogicalDisk(*)\Disk Writes/sec",
  "\LogicalDisk(*)\Disk Transfers/sec",
  "\LogicalDisk(*)\Current Disk Queue Length",
  "\LogicalDisk(*)\Avg. Disk sec/Read",
  "\LogicalDisk(*)\Avg. Disk sec/Write"
)
$physicalPaths = @(
  "\PhysicalDisk(*)\Disk Reads/sec",
  "\PhysicalDisk(*)\Disk Writes/sec",
  "\PhysicalDisk(*)\Disk Transfers/sec",
  "\PhysicalDisk(*)\Current Disk Queue Length",
  "\PhysicalDisk(*)\Avg. Disk sec/Read",
  "\PhysicalDisk(*)\Avg. Disk sec/Write"
)

$got = Ingest-CounterSet $byInst (Try-GetCounter $logicalPaths)
if ($got -gt 0) { $method = "Get-Counter LogicalDisk" }
if ($got -eq 0) {
  $got = Ingest-CounterSet $byInst (Try-GetCounter $physicalPaths)
  if ($got -gt 0) { $method = "Get-Counter PhysicalDisk" }
}
if ($got -eq 0) {
  $got = Ingest-WmiFormatted $byInst "Win32_PerfFormattedData_PerfDisk_LogicalDisk"
  if ($got -gt 0) { $method = "WMI LogicalDisk formatted" }
}
if ($got -eq 0) {
  $got = Ingest-WmiFormatted $byInst "Win32_PerfFormattedData_PerfDisk_PhysicalDisk"
  if ($got -gt 0) { $method = "WMI PhysicalDisk formatted" }
}
if ($got -eq 0) {
  $got = Ingest-WmiRaw $byInst "Win32_PerfRawData_PerfDisk_LogicalDisk"
  if ($got -gt 0) { $method = "WMI LogicalDisk raw interval" }
}
if ($got -eq 0) {
  $got = Ingest-WmiRaw $byInst "Win32_PerfRawData_PerfDisk_PhysicalDisk"
  if ($got -gt 0) { $method = "WMI PhysicalDisk raw interval" }
}
W ("counters method=$method hits=$got drives=" + $byInst.Count)
if ($byInst.Count -eq 0) {
  W "FAIL no disk performance counters available on this host"
  W "  Run elevated: diskperf -Y"
  W "  Then: Get-Counter '\LogicalDisk(*)\Disk Transfers/sec'"
  exit 1
}

# Drive size
$ldisks = @{}
try {
  foreach ($d in @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" -EA SilentlyContinue)) {
    $let = ([string]$d.DeviceID).Trim()
    if (-not $let) { continue }
    if ($let -notmatch ":$") { $let = $let + ":" }
    $tot = $null; $free = $null; $used = $null
    if ($d.Size -and $d.Size -gt 0) {
      $tot = [math]::Round([double]$d.Size / 1GB, 2)
      $free = [math]::Round([double]$d.FreeSpace / 1GB, 2)
      $used = [math]::Round((($d.Size - $d.FreeSpace) / $d.Size) * 100, 1)
    }
    $ldisks[$let] = @{ Total = $tot; Free = $free; Used = $used; Media = $null }
  }
} catch {}

# Map each volume letter -> physical media (Storage cmdlets, then WMI)
try {
  $pdByNum = @{}
  foreach ($pd in @(Get-PhysicalDisk -EA SilentlyContinue)) {
    $id = $null
    try { $id = [string]$pd.DeviceId } catch {}
    if (-not $id) { try { $id = [string]$pd.Number } catch {} }
    $media = Normalize-Media ([string]$pd.MediaType) ([string]$pd.BusType) ([string]$pd.FriendlyName)
    if ($id) { $pdByNum[$id] = $media }
  }
  foreach ($part in @(Get-Partition -EA SilentlyContinue)) {
    $let = $null
    try { if ($part.DriveLetter) { $let = ([string]$part.DriveLetter).ToUpper() + ":" } } catch {}
    if (-not $let) { continue }
    $num = $null
    try { $num = [string]$part.DiskNumber } catch {}
    if ($num -and $pdByNum.ContainsKey($num) -and $ldisks.ContainsKey($let)) {
      $ldisks[$let].Media = $pdByNum[$num]
    }
  }
} catch {}

if (@($ldisks.Values | Where-Object { $_.Media }).Count -eq 0) {
  try {
    $drives = @(Get-CimInstance Win32_DiskDrive -EA SilentlyContinue)
    $parts = @(Get-CimInstance Win32_DiskDriveToDiskPartition -EA SilentlyContinue)
    $logs = @(Get-CimInstance Win32_LogicalDiskToPartition -EA SilentlyContinue)
    foreach ($log in $logs) {
      $let = $null
      if ($log.Dependent -match 'DeviceID="([A-Z]:)"') { $let = $Matches[1] }
      if (-not $let) { continue }
      $partPath = [string]$log.Antecedent
      $drv = $parts | Where-Object { [string]$_.Dependent -eq $partPath } | Select-Object -First 1
      if (-not $drv) { continue }
      $disk = $drives | Where-Object { [string]$_.Path -eq [string]$drv.Antecedent -or ($_.__PATH -and [string]$_.__PATH -eq [string]$drv.Antecedent) } | Select-Object -First 1
      if (-not $disk) {
        $disk = $drives | Where-Object { $drv.Antecedent -match [regex]::Escape($_.DeviceID) } | Select-Object -First 1
      }
      if ($disk -and $ldisks.ContainsKey($let)) {
        $ldisks[$let].Media = Normalize-Media ([string]$disk.MediaType) ([string]$disk.InterfaceType) ([string]$disk.Model)
      }
    }
  } catch {}
}

$snap = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
$rows = New-Object System.Collections.Generic.List[string]
$n = 0
$letters = @($ldisks.Keys | Sort-Object)
if ($letters.Count -eq 0) { $letters = @($byInst.Keys | Sort-Object) }
foreach ($let in $letters) {
  $c = $byInst[$let]
  $r = $null; $w = $null; $t = $null; $q = $null; $lr = $null; $lw = $null
  if ($c) {
    $r = $c.Read; $w = $c.Write; $t = $c.Total; $q = $c.Queue; $lr = $c.LatR; $lw = $c.LatW
  }
  if ($null -eq $t -and ($null -ne $r -or $null -ne $w)) {
    $t = [math]::Round(($(if ($null -ne $r) { $r } else { 0 }) + $(if ($null -ne $w) { $w } else { 0 })), 2)
  }
  $sz = $ldisks[$let]
  $tot = $null; $free = $null; $used = $null; $media = $null
  if ($sz) { $tot = $sz.Total; $free = $sz.Free; $used = $sz.Used; $media = $sz.Media }
  [void]$rows.Add(("SELECT {0} DriveLetter, {1} TotalGb, {2} FreeGb, {3} UsedPct, {4} MediaType, {5} ReadIops, {6} WriteIops, {7} TotalIops, {8} QueueLen, {9} ReadLatencyMs, {10} WriteLatencyMs" -f `
    (Sql-Lit $let), (Sql-Dec $tot), (Sql-Dec $free), (Sql-Dec $used), (Sql-Lit $media), (Sql-Dec $r), (Sql-Dec $w), (Sql-Dec $t), (Sql-Dec $q), (Sql-Dec $lr), (Sql-Dec $lw)))
  $n++
  W ("  $let read=$r write=$w total=$t q=$q latR=${lr}ms latW=${lw}ms used=$used% media=$media")
}

if ($n -eq 0) {
  W "No logical disks sampled"
  exit 1
}

$union = $rows -join "`nUNION ALL`n"

$volObjs = @()
foreach ($let in $letters) {
  $c = $byInst[$let]
  $sz = $ldisks[$let]
  $volObjs += @{
    driveLetter    = $let
    totalGb        = $(if ($sz) { $sz.Total } else { $null })
    freeGb         = $(if ($sz) { $sz.Free } else { $null })
    usedPct        = $(if ($sz) { $sz.Used } else { $null })
    mediaType      = $(if ($sz) { $sz.Media } else { $null })
    readIops       = $(if ($c) { $c.Read } else { $null })
    writeIops      = $(if ($c) { $c.Write } else { $null })
    totalIops      = $(if ($c) { $c.Total } else { $null })
    queueLen       = $(if ($c) { $c.Queue } else { $null })
    readLatencyMs  = $(if ($c) { $c.LatR } else { $null })
    writeLatencyMs = $(if ($c) { $c.LatW } else { $null })
  }
}
if (Get-Command Send-RpmaHttpsIops -ErrorAction SilentlyContinue) {
  try {
    $ir = Send-RpmaHttpsIops -HostName $HostName -Volumes $volObjs -SampleSec $SampleSec
    if ($ir.StatusCode -ge 200 -and $ir.StatusCode -lt 300) {
      W ("DONE https rows=$n snap=$snap")
      exit 0
    }
    W ("WARN https iops " + $ir.Text)
  } catch { W ("WARN https iops " + $_.Exception.Message) }
}
if ($PreferHttps) {
  W "FAIL https IOPS required (no SQL fallback)"
  exit 1
}
$sql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Agent_DiskIops', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_DiskIops (
    SnapshotUtc    datetime2(0)  NOT NULL,
    CustomerCode   nvarchar(32)  NOT NULL,
    HostName       nvarchar(128) NOT NULL,
    DriveLetter    nvarchar(16)  NOT NULL,
    TotalGb        decimal(18,2) NULL,
    FreeGb         decimal(18,2) NULL,
    UsedPct        decimal(6,2)  NULL,
    MediaType      nvarchar(40)  NULL,
    ReadIops       decimal(18,2) NULL,
    WriteIops      decimal(18,2) NULL,
    TotalIops      decimal(18,2) NULL,
    QueueLen       decimal(18,2) NULL,
    ReadLatencyMs  decimal(18,2) NULL,
    WriteLatencyMs decimal(18,2) NULL,
    SampleSec      decimal(6,2)  NULL,
    ImportedAt     datetime2(3)  NOT NULL CONSTRAINT DF_Agent_DiskIops_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Agent_DiskIops PRIMARY KEY (SnapshotUtc, CustomerCode, HostName, DriveLetter)
  );
  CREATE INDEX IX_Agent_DiskIops_Cust ON dbo.Agent_DiskIops (CustomerCode, SnapshotUtc DESC);
END
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'ReadLatencyMs') IS NULL
  ALTER TABLE dbo.Agent_DiskIops ADD ReadLatencyMs decimal(18,2) NULL;
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'WriteLatencyMs') IS NULL
  ALTER TABLE dbo.Agent_DiskIops ADD WriteLatencyMs decimal(18,2) NULL;
BEGIN TRY
  GRANT SELECT, INSERT, DELETE ON dbo.Agent_DiskIops TO [rpmassure];
END TRY BEGIN CATCH END CATCH

DECLARE @Snap datetime2(0) = CONVERT(datetime2(0), $(Sql-Lit $snap), 126);
DECLARE @Sec decimal(6,2) = $(Sql-Dec $SampleSec);

INSERT INTO dbo.Agent_DiskIops (
  SnapshotUtc, CustomerCode, HostName, DriveLetter,
  TotalGb, FreeGb, UsedPct, MediaType, ReadIops, WriteIops, TotalIops, QueueLen, ReadLatencyMs, WriteLatencyMs, SampleSec
)
SELECT @Snap, $(Sql-Lit $CustomerCode), $(Sql-Lit $HostName), DriveLetter,
  TotalGb, FreeGb, UsedPct, MediaType, ReadIops, WriteIops, TotalIops, QueueLen, ReadLatencyMs, WriteLatencyMs, @Sec
FROM (
$union
) x;

DELETE FROM dbo.Agent_DiskIops
WHERE SnapshotUtc < DATEADD(day, -14, SYSUTCDATETIME());
"@

$r = Invoke-AdoSql -Server $CentralDataSource -Db $CentralDatabase -User $CentralSqlUser -Pass $CentralSqlPassword -SqlText $sql
if ($r.ExitCode -ne 0) {
  W ("FAIL sql " + $r.Text)
  exit 1
}
W ("DONE rows=$n snap=$snap")
exit 0
