# RPM Assure - local disk IOPS on this SYSPRO / SQL host.
# Pulseway REST v3 does not publish IOPS. The Edge Agent samples Windows counters
# and writes dbo.Agent_DiskIops on central Assure.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File Collect-Host-Iops.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File Collect-Host-Iops.ps1 -ConfigPath C:\RPM-Assure\Sql\customers\SIRF\Customer.Config.ps1
param(
  [string]$ConfigPath = "",
  [int]$SampleSec = 4,
  [string]$AgentRoot = "C:\RPM-Assure\Agent"
)

$ErrorActionPreference = "Stop"
if ($SampleSec -lt 2) { $SampleSec = 2 }
if ($SampleSec -gt 15) { $SampleSec = 15 }

function W([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z " + $m
  Write-Host $line
}

function Sql-Lit([string]$s) {
  if ($null -eq $s) { return "NULL" }
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

# --- config (Customer.Config or Agent.Config + DPAPI secrets) ---
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
W ("START iops host=$HostName customer=$CustomerCode sample=${SampleSec}s")

# --- sample LogicalDisk counters (two samples = a real rate) ---
$paths = @(
  "\LogicalDisk(*)\Disk Reads/sec",
  "\LogicalDisk(*)\Disk Writes/sec",
  "\LogicalDisk(*)\Disk Transfers/sec",
  "\LogicalDisk(*)\Current Disk Queue Length"
)
$samples = $null
try {
  $samples = Get-Counter -Counter $paths -SampleInterval $SampleSec -MaxSamples 2 -ErrorAction Stop
} catch {
  W ("WARN Get-Counter failed: " + $_.Exception.Message)
  throw
}

$byInst = @{}
foreach ($set in @($samples.CounterSamples)) {
  foreach ($s in @($set)) {
    $inst = [string]$s.InstanceName
    if (-not $inst -or $inst -eq "_Total") { continue }
    if ($inst -match "HarddiskVolume") { continue }
    $letter = $inst.Trim()
    if ($letter -match "^([A-Za-z]):") { $letter = $Matches[1].ToUpper() + ":" }
    if (-not $byInst.ContainsKey($letter)) {
      $byInst[$letter] = @{ Read = @(); Write = @(); Total = @(); Queue = @() }
    }
    $path = [string]$s.Path
    $val = [double]$s.CookedValue
    if ([double]::IsNaN($val) -or [double]::IsInfinity($val) -or $val -lt 0) { continue }
    if ($path -match "Disk Reads/sec") { $byInst[$letter].Read += $val }
    elseif ($path -match "Disk Writes/sec") { $byInst[$letter].Write += $val }
    elseif ($path -match "Disk Transfers/sec") { $byInst[$letter].Total += $val }
    elseif ($path -match "Current Disk Queue Length") { $byInst[$letter].Queue += $val }
  }
}

function Avg($arr) {
  if (-not $arr -or $arr.Count -eq 0) { return $null }
  $sum = 0.0
  foreach ($x in $arr) { $sum += $x }
  return [math]::Round($sum / $arr.Count, 2)
}

# Drive size + media
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
try {
  $pd = @(Get-PhysicalDisk -EA SilentlyContinue)
  if ($pd.Count -eq 1 -and $pd[0].MediaType) {
    $mt = [string]$pd[0].MediaType
    foreach ($k in @($ldisks.Keys)) { $ldisks[$k].Media = $mt }
  }
} catch {}

$snap = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
$rows = New-Object System.Collections.Generic.List[string]
$n = 0
$letters = @($byInst.Keys | Sort-Object)
if ($letters.Count -eq 0) { $letters = @($ldisks.Keys | Sort-Object) }
foreach ($let in $letters) {
  $c = $byInst[$let]
  $r = $null; $w = $null; $t = $null; $q = $null
  if ($c) {
    $r = Avg $c.Read
    $w = Avg $c.Write
    $t = Avg $c.Total
    $q = Avg $c.Queue
  }
  if ($null -eq $t -and ($null -ne $r -or $null -ne $w)) {
    $t = [math]::Round(($(if ($null -ne $r) { $r } else { 0 }) + $(if ($null -ne $w) { $w } else { 0 })), 2)
  }
  $sz = $ldisks[$let]
  $tot = $null; $free = $null; $used = $null; $media = $null
  if ($sz) { $tot = $sz.Total; $free = $sz.Free; $used = $sz.Used; $media = $sz.Media }
  [void]$rows.Add(("SELECT {0} DriveLetter, {1} TotalGb, {2} FreeGb, {3} UsedPct, {4} MediaType, {5} ReadIops, {6} WriteIops, {7} TotalIops, {8} QueueLen" -f `
    (Sql-Lit $let), (Sql-Dec $tot), (Sql-Dec $free), (Sql-Dec $used), (Sql-Lit $media), (Sql-Dec $r), (Sql-Dec $w), (Sql-Dec $t), (Sql-Dec $q)))
  $n++
  W ("  $let read=$r write=$w total=$t queue=$q used=$used%")
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
    SnapshotUtc   datetime2(0)  NOT NULL,
    CustomerCode  nvarchar(32)  NOT NULL,
    HostName      nvarchar(128) NOT NULL,
    DriveLetter   nvarchar(16)  NOT NULL,
    TotalGb       decimal(18,2) NULL,
    FreeGb        decimal(18,2) NULL,
    UsedPct       decimal(6,2)  NULL,
    MediaType     nvarchar(40)  NULL,
    ReadIops      decimal(18,2) NULL,
    WriteIops     decimal(18,2) NULL,
    TotalIops     decimal(18,2) NULL,
    QueueLen      decimal(18,2) NULL,
    SampleSec     decimal(6,2)  NULL,
    ImportedAt    datetime2(3)  NOT NULL CONSTRAINT DF_Agent_DiskIops_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Agent_DiskIops PRIMARY KEY (SnapshotUtc, CustomerCode, HostName, DriveLetter)
  );
  CREATE INDEX IX_Agent_DiskIops_Cust ON dbo.Agent_DiskIops (CustomerCode, SnapshotUtc DESC);
END
BEGIN TRY
  GRANT SELECT, INSERT, DELETE ON dbo.Agent_DiskIops TO [rpmassure];
END TRY BEGIN CATCH END CATCH

DECLARE @Snap datetime2(0) = CONVERT(datetime2(0), $(Sql-Lit $snap), 126);
DECLARE @Sec decimal(6,2) = $(Sql-Dec $SampleSec);

INSERT INTO dbo.Agent_DiskIops (
  SnapshotUtc, CustomerCode, HostName, DriveLetter,
  TotalGb, FreeGb, UsedPct, MediaType, ReadIops, WriteIops, TotalIops, QueueLen, SampleSec
)
SELECT @Snap, $(Sql-Lit $CustomerCode), $(Sql-Lit $HostName), DriveLetter,
  TotalGb, FreeGb, UsedPct, MediaType, ReadIops, WriteIops, TotalIops, QueueLen, @Sec
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
