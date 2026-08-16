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
  if ($blob -match "NVME|NVM EXPRESS") { return "NVMe" }
  if ($blob -match "SSD|SOLID") { return "SSD" }
  if ($blob -match "SCM|3DXPOINT|OPTANE") { return "SCM" }
  if ($raw -eq "4" -or $raw -eq "SSD") { return "SSD" }
  if ($raw -eq "3" -or $raw -eq "HDD" -or $blob -match "HDD|ROTAT|HARD DISK") { return "HDD" }
  if ($bus -match "17|NVMe") { return "NVMe" }
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
if (-not $CentralDataSource) { throw "CentralDataSource missing - run from the Edge Agent or pass -ConfigPath Customer.Config.ps1" }
if (-not $CentralDatabase) { $CentralDatabase = "RPMAssure_App" }
if (-not $CentralSqlUser) { throw "CentralSqlUser missing" }
if (-not $CentralSqlPassword) { throw "CentralSqlPassword missing" }
if (-not $CustomerCode) { $CustomerCode = $env:COMPUTERNAME }
$HostName = $env:COMPUTERNAME
W ("START iops host=$HostName customer=$CustomerCode sample=${SampleSec}s v2.5.4")

# --- counters: drop the first sample (almost always 0) ---
$paths = @(
  "\LogicalDisk(*)\Disk Reads/sec",
  "\LogicalDisk(*)\Disk Writes/sec",
  "\LogicalDisk(*)\Disk Transfers/sec",
  "\LogicalDisk(*)\Current Disk Queue Length",
  "\LogicalDisk(*)\Avg. Disk sec/Read",
  "\LogicalDisk(*)\Avg. Disk sec/Write"
)
$samples = $null
try {
  $samples = Get-Counter -Counter $paths -SampleInterval $SampleSec -MaxSamples 2 -ErrorAction Stop
} catch {
  W ("WARN Get-Counter failed: " + $_.Exception.Message)
  throw
}

$setList = @($samples)
if ($samples.CounterSamples) { $setList = @($samples) }
# Get-Counter -MaxSamples 2 returns an array of PerformanceCounterSampleSet
$sets = @($samples)
if ($sets.Count -gt 1) { $sets = @($sets | Select-Object -Last 1) }

$byInst = @{}
foreach ($set in $sets) {
  $rows = @()
  if ($set.CounterSamples) { $rows = @($set.CounterSamples) } else { $rows = @($set) }
  foreach ($s in $rows) {
    $inst = [string]$s.InstanceName
    if (-not $inst -or $inst -eq "_Total") { continue }
    if ($inst -match "HarddiskVolume") { continue }
    $letter = $inst.Trim()
    if ($letter -match "^([A-Za-z]):") { $letter = $Matches[1].ToUpper() + ":" }
    if (-not $byInst.ContainsKey($letter)) {
      $byInst[$letter] = @{ Read = $null; Write = $null; Total = $null; Queue = $null; LatR = $null; LatW = $null }
    }
    $path = [string]$s.Path
    $val = [double]$s.CookedValue
    if ([double]::IsNaN($val) -or [double]::IsInfinity($val) -or $val -lt 0) { continue }
    if ($path -match "Disk Reads/sec") { $byInst[$letter].Read = [math]::Round($val, 2) }
    elseif ($path -match "Disk Writes/sec") { $byInst[$letter].Write = [math]::Round($val, 2) }
    elseif ($path -match "Disk Transfers/sec") { $byInst[$letter].Total = [math]::Round($val, 2) }
    elseif ($path -match "Current Disk Queue Length") { $byInst[$letter].Queue = [math]::Round($val, 2) }
    elseif ($path -match "Avg. Disk sec/Read") { $byInst[$letter].LatR = [math]::Round($val * 1000, 2) }
    elseif ($path -match "Avg. Disk sec/Write") { $byInst[$letter].LatW = [math]::Round($val * 1000, 2) }
  }
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
