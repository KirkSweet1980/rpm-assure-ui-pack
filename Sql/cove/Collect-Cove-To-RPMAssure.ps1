# Central collect: Cove API -> RPMAssure_App.Cove_DeviceStatistics
# ASCII only. Never use $PID (read-only automatic variable).
# Creates partner map + device fact if missing (needs CREATE TABLE rights).
# Does NOT require Dim_Customer for collect to succeed.

param(
  [string]$SqlServer = '102.222.21.220,14333',
  [string]$SqlDatabase = 'RPMAssure_App',
  [string]$SqlUser = 'Rpm_collect',
  [string]$SqlPassword = 'RpmCollect#AHIC2026',
  [string]$ConfigPath = '',
  [int]$FallbackPartnerId = 2601580
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if (-not $ConfigPath) {
  foreach ($c in @(
      (Join-Path $here 'Cove.Config.ps1'),
      'C:\RPM-Assure\Sql\cove\Cove.Config.ps1',
      'C:\RPM-Assure\deploy\ui-pack\Sql\cove\Cove.Config.ps1',
      'C:\RPM-Assure\deploy\ui-pack\sql\cove\Cove.Config.ps1',
      'C:\RPM-Assure\config\Cove.Config.ps1'
    )) {
    if (Test-Path -LiteralPath $c) { $ConfigPath = $c; break }
  }
}
if (-not $ConfigPath -or -not (Test-Path -LiteralPath $ConfigPath)) {
  Write-Host 'SKIP Cove — missing Cove.Config.ps1 (copy Cove.Config.example.ps1 to C:\RPM-Assure\Sql\cove\Cove.Config.ps1)'
  exit 2
}
. $ConfigPath
if ([string]::IsNullOrWhiteSpace($Username) -or $Username -like 'PASTE*') { throw 'Set $Username in Cove.Config.ps1' }
if ([string]::IsNullOrWhiteSpace($Password) -or $Password -like 'PASTE*') { throw 'Set $Password in Cove.Config.ps1' }

if ([string]::IsNullOrWhiteSpace($ApiUrl)) { $ApiUrl = 'https://api.backup.management/jsonapi' }
$logDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("cove_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function ConvertTo-Text($content) {
  if ($null -eq $content) { return '' }
  if ($content -is [byte[]]) {
    return [System.Text.Encoding]::UTF8.GetString($content)
  }
  if ($content -is [System.Array] -and $content.Length -gt 0 -and $content[0] -is [byte]) {
    return [System.Text.Encoding]::UTF8.GetString([byte[]]$content)
  }
  return [string]$content
}

function Invoke-CoveRaw {
  param([hashtable]$Body)
  $json = $Body | ConvertTo-Json -Depth 12 -Compress
  $resp = Invoke-WebRequest -Uri $ApiUrl -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) `
    -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 180
  return (ConvertTo-Text $resp.Content)
}

function Get-PartnerIdFromVisa([string]$Visa) {
  if ([string]::IsNullOrWhiteSpace($Visa)) { return 0 }
  $parts = $Visa.Split('-')
  $n = 0
  if ($parts.Count -ge 1 -and [int]::TryParse($parts[0], [ref]$n)) { return $n }
  return 0
}

function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @(
    'D:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
  )) {
    if (Test-Path $p) { return $p }
  }
  throw 'sqlcmd not found'
}

function Invoke-SqlFile([string]$SqlText, [string]$Label) {
  $sqlcmd = Find-Sqlcmd
  $f = Join-Path $logDir ("{0}_{1:yyyyMMdd_HHmmss}.sql" -f $Label, (Get-Date))
  $out = Join-Path $logDir ("{0}_{1:yyyyMMdd_HHmmss}.out.txt" -f $Label, (Get-Date))
  [System.IO.File]::WriteAllText($f, $SqlText, [System.Text.UTF8Encoding]::new($false))
  Write-Log ("SQL " + $Label + " -> " + $f)
  $tries = @(
    @{ Mode = 'sql'; Args = @('-S', $SqlServer, '-d', $SqlDatabase, '-U', $SqlUser, '-P', $SqlPassword, '-C', '-b', '-I', '-i', $f) }
    @{ Mode = 'win'; Args = @('-S', $SqlServer, '-d', $SqlDatabase, '-E', '-C', '-b', '-I', '-i', $f) }
  )
  if ([string]::IsNullOrWhiteSpace($SqlUser) -or [string]::IsNullOrWhiteSpace($SqlPassword)) {
    $tries = @($tries[1])
  }
  $last = ''
  foreach ($t in $tries) {
    Write-Log ("sqlcmd " + $t.Mode + " " + $Label)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $sqlcmd @($t.Args) 1> $out 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -eq 0) { return }
    $tail = ''
    if (Test-Path -LiteralPath $out) {
      $lines = @(Get-Content -LiteralPath $out -ErrorAction SilentlyContinue)
      if ($lines.Count -gt 0) {
        $from = [Math]::Max(0, $lines.Count - 12)
        $tail = ($lines[$from..($lines.Count - 1)] -join ' | ')
        Write-Log ("sqlcmd out: " + $tail)
      }
    }
    $last = "sqlcmd " + $t.Mode + " failed " + $code + " on " + $Label
    if ($tail) { $last = $last + " :: " + $tail }
    Write-Log $last
  }
  throw $last
}

function Get-Setting($row, $key) {
  if ($null -eq $row) { return $null }
  # Top-level property
  $top = $row.PSObject.Properties[$key]
  if ($top -and $null -ne $top.Value -and "$($top.Value)" -ne "") { return [string]$top.Value }
  $settings = $row.Settings
  if ($null -eq $settings) { return $null }
  # Settings as single object / hashtable
  if ($settings -isnot [System.Array] -and $settings.PSObject) {
    $p = $settings.PSObject.Properties[$key]
    if ($p -and $null -ne $p.Value -and "$($p.Value)" -ne "") { return [string]$p.Value }
  }
  foreach ($s in @($settings)) {
    if ($null -eq $s) { continue }
    # Shape: { I80 = 1 } or { "I80": "1" }
    $prop = $s.PSObject.Properties[$key]
    if ($prop -and $null -ne $prop.Value -and "$($prop.Value)" -ne "") { return [string]$prop.Value }
    # Shape: { Name = "I80"; Value = "1" } / Column / Code
    $name = $null
    foreach ($nk in @("Name","Column","Code","Key","Id")) {
      $np = $s.PSObject.Properties[$nk]
      if ($np -and "$($np.Value)" -eq $key) { $name = $key; break }
    }
    if ($name) {
      foreach ($vk in @("Value","Val","Data","Text")) {
        $vp = $s.PSObject.Properties[$vk]
        if ($vp -and $null -ne $vp.Value -and "$($vp.Value)" -ne "") { return [string]$vp.Value }
      }
    }
  }
  return $null
}

function Epoch-ToSql([string]$epoch) {
  if ([string]::IsNullOrWhiteSpace($epoch)) { return 'NULL' }
  $raw = $epoch.Trim()
  # ISO date already
  if ($raw -match '^\d{4}-\d{2}-\d{2}') {
    try {
      $dto = [DateTimeOffset]::Parse($raw)
      return ("'{0:yyyy-MM-ddTHH:mm:ss}'" -f $dto.UtcDateTime)
    } catch { }
  }
  $n = 0L
  if (-not [long]::TryParse(($raw -replace '[^0-9]',''), [ref]$n) -or $n -le 0) { return 'NULL' }
  # ms vs seconds (ms epochs are ~1e12+)
  if ($n -gt 100000000000) {
    $dt = [DateTimeOffset]::FromUnixTimeMilliseconds($n).UtcDateTime
  } else {
    $dt = [DateTimeOffset]::FromUnixTimeSeconds($n).UtcDateTime
  }
  return ("'{0:yyyy-MM-ddTHH:mm:ss}'" -f $dt)
}

function Sql-Str([string]$s) {
  if ($null -eq $s) { return 'NULL' }
  return ("N'{0}'" -f ($s.Replace("'", "''")))
}

function Get-JsonStringField([string]$Raw, [string]$FieldName) {
  $pattern = '"' + $FieldName + '"\s*:\s*"([^"]+)"'
  $m = [regex]::Match($Raw, $pattern, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($m.Success) { return $m.Groups[1].Value }
  return $null
}

function Get-JsonIntField([string]$Raw, [string]$FieldName) {
  $pattern = '"' + $FieldName + '"\s*:\s*(\d+)'
  $m = [regex]::Match($Raw, $pattern, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($m.Success) {
    $n = 0
    if ([int]::TryParse($m.Groups[1].Value, [ref]$n)) { return $n }
  }
  return 0
}

function Get-TextPrefix([string]$Text, [int]$MaxLen) {
  if ([string]::IsNullOrEmpty($Text)) { return '' }
  if ($Text.Length -le $MaxLen) { return $Text }
  return $Text.Substring(0, $MaxLen)
}

Write-Log '=== Cove collect start ==='
Write-Log ("SQL=" + $SqlServer + " / " + $SqlDatabase)

# Schema: NO Dim_Customer dependency (Rpm_collect may lack rights / table may live elsewhere)
$ensureSql = @'
SET NOCOUNT ON;

IF OBJECT_ID(N''dbo.Dim_Cove_PartnerMap'', N''U'') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Cove_PartnerMap
  (
    PartnerMapId uniqueidentifier NOT NULL
      CONSTRAINT DF_Dim_Cove_PartnerMap_Id DEFAULT (NEWSEQUENTIALID()),
    PartnerName nvarchar(200) NOT NULL,
    PartnerId int NULL,
    CustomerCode nvarchar(50) NOT NULL,
    Active bit NOT NULL CONSTRAINT DF_Dim_Cove_PartnerMap_Active DEFAULT (1),
    Notes nvarchar(400) NULL,
    CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Dim_Cove_PartnerMap_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Dim_Cove_PartnerMap_Updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Cove_PartnerMap PRIMARY KEY (PartnerMapId),
    CONSTRAINT UQ_Dim_Cove_PartnerMap_Name UNIQUE (PartnerName)
  );
  CREATE INDEX IX_Dim_Cove_PartnerMap_Customer ON dbo.Dim_Cove_PartnerMap (CustomerCode) WHERE Active = 1;
  PRINT ''Created Dim_Cove_PartnerMap'';
END

IF OBJECT_ID(N''dbo.Cove_DeviceStatistics'', N''U'') IS NULL
BEGIN
  CREATE TABLE dbo.Cove_DeviceStatistics
  (
    SnapshotDate date NOT NULL,
    AccountId bigint NOT NULL,
    PartnerId int NULL,
    CustomerCode nvarchar(50) NULL,
    DeviceName nvarchar(200) NULL,
    MachineName nvarchar(200) NULL,
    UsedBytes bigint NULL,
    SelectedBytes bigint NULL,
    LastSuccessTime datetime2(3) NULL,
    LastBackupStatus nvarchar(100) NULL,
    Product nvarchar(100) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Cove_Dev_ImportedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Cove_DeviceStatistics PRIMARY KEY (SnapshotDate, AccountId)
  );
  CREATE INDEX IX_Cove_Device_Customer ON dbo.Cove_DeviceStatistics (CustomerCode, SnapshotDate);
  PRINT ''Created Cove_DeviceStatistics'';
END

;WITH src AS (
  SELECT * FROM (VALUES
    (N''AHI Carriers'', N''AHIC'', 2602886),
    (N''UVSS'', N''UVSS'', 2814015),
    (N''Able Tracers'', N''ABLE'', NULL),
    (N''Hydra Sales'', N''HYDRA'', NULL),
    (N''Redsun Raisins Northen Cape'', N''RSR'', NULL),
    (N''BHF (PNCS)'', N''PCNS'', 2925801),
    (N''Remote Site Solutions (Pty) Ltd'', N''RSS'', NULL),
    (N''Simply Bright Consulting'', N''SBS'', NULL),
    (N''RPM Resources'', N''RPMINT'', 2601580)
  ) v(PartnerName, CustomerCode, PartnerId)
)
MERGE dbo.Dim_Cove_PartnerMap AS t
USING src AS s ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  PartnerId = COALESCE(s.PartnerId, t.PartnerId),
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active)
  VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1);

SELECT COUNT(*) AS PartnerMapRows FROM dbo.Dim_Cove_PartnerMap;
'@
$ensureSql = $ensureSql.Replace("''", "'")

try {
  Invoke-SqlFile -SqlText $ensureSql -Label 'ensure_map'
} catch {
  Write-Log ("ensure_map as Rpm_collect failed: " + $_.Exception.Message)
  Write-Log 'RETRY: run 430 as Windows admin (sqlcmd -E) then re-run collect'
  throw
}

# --- Login ---
$loginBody = [ordered]@{
  jsonrpc = '2.0'
  method  = 'Login'
  params  = @{ username = $Username; password = $Password }
  id = '1'
}
if ($Partner) { $loginBody.params['partner'] = $Partner }

$loginRaw = ConvertTo-Text (Invoke-CoveRaw -Body $loginBody)
[System.IO.File]::WriteAllText((Join-Path $logDir 'last_login.json'), $loginRaw, [System.Text.UTF8Encoding]::new($false))

if ($loginRaw -match '"error"') {
  $errMsg = Get-JsonStringField $loginRaw 'message'
  if (-not $errMsg) { $errMsg = Get-TextPrefix $loginRaw 300 }
  throw ("Cove Login error: " + $errMsg)
}

$visa = Get-JsonStringField $loginRaw 'visa'
if (-not $visa) {
  try {
    $loginObj = $loginRaw | ConvertFrom-Json
    if ($loginObj.visa) { $visa = [string]$loginObj.visa }
    elseif ($loginObj.Visa) { $visa = [string]$loginObj.Visa }
  } catch {}
}
if (-not $visa) {
  Write-Log ('Login raw prefix: ' + (Get-TextPrefix $loginRaw 200))
  throw 'Login returned no visa (see logs\last_login.json)'
}

$rootPartnerId = Get-JsonIntField $loginRaw 'PartnerId'
if ($rootPartnerId -le 0) {
  $rootPartnerId = Get-PartnerIdFromVisa $visa
  Write-Log ("PartnerId from visa prefix=" + $rootPartnerId)
}
if ($rootPartnerId -le 0 -and $FallbackPartnerId -gt 0) {
  $rootPartnerId = $FallbackPartnerId
  Write-Log ("PartnerId fallback=" + $rootPartnerId)
}
if ($rootPartnerId -le 0) { throw 'Could not resolve PartnerId (need > 0)' }
Write-Log ("Login OK PartnerId=" + $rootPartnerId + " visaLen=" + $visa.Length)

$allRows = New-Object System.Collections.Generic.List[object]
$start = 0
$pageSize = 500
do {
  $statBody = [ordered]@{
    jsonrpc = '2.0'
    visa    = $visa
    method  = 'EnumerateAccountStatistics'
    params  = @{
      query = @{
        PartnerId         = [int]$rootPartnerId
        RecordsCount      = [int]$pageSize
        StartRecordNumber = [int]$start
        Columns           = @('AU','AR','AN','MN','CD','TS','TL','US','TB','PN','OP','OV','FR','SR','HR','ZR','WR','NR','XR','PR','I80','I81','F19','F00','RV0','RVJ','RVQ','RVO','RVL','RVK','RV7','T07')
        Filter            = ''
      }
    }
    id = ('p' + $start)
  }
  $statRaw = ConvertTo-Text (Invoke-CoveRaw -Body $statBody)
  if ($start -eq 0) {
    [System.IO.File]::WriteAllText((Join-Path $logDir 'last_stats.json'), $statRaw, [System.Text.UTF8Encoding]::new($false))
  }
  if ($statRaw -match '"error"') {
    throw ("EnumerateAccountStatistics: " + (Get-JsonStringField $statRaw 'message'))
  }

  $statObj = $statRaw | ConvertFrom-Json
  $batch = $null
  if ($statObj.result -and $statObj.result.result) { $batch = $statObj.result.result }
  elseif ($statObj.result) { $batch = $statObj.result }
  $batchArr = @($batch | Where-Object { $_ -ne $null })
  Write-Log ("Page start=" + $start + " got=" + $batchArr.Count)
  foreach ($r in $batchArr) { [void]$allRows.Add($r) }
  if ($batchArr.Count -lt $pageSize) { break }
  $start += $pageSize
} while ($true)

Write-Log ("Devices from API=" + $allRows.Count)
if ($allRows.Count -eq 0) { throw 'No devices returned from Cove' }

$snap = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
$values = New-Object System.Collections.Generic.List[string]


function Map-RestoreStatus([object]$code, [int]$errCount, [string]$verifyText) {
  if ($null -ne $code -and "$code" -ne '') {
    $s = ("$code").Trim()
    $sl = $s.ToLowerInvariant()
    if ($sl -match 'success|completed|complete|passed|ok|verified') { return 'Success' }
    if ($sl -match 'fail|error|abort|fault|cancel') { return 'Failed' }
    if ($sl -match 'progress|running|active') { return 'InProgress' }
    if ($sl -match 'not.?start|pending|queued|await') { return 'NotStarted' }
    $c = 0
    if ([int]::TryParse(($s -replace '[^0-9\-]',''), [ref]$c)) {
      switch ($c) {
        2 { return 'Failed' }
        3 { return 'Failed' }
        6 { return 'Failed' }
        8 { return 'Failed' }
        9 { return 'Failed' }
        10 { return 'Failed' }
        5 { return 'Success' }
        1 { return 'InProgress' }
        7 { return 'NotStarted' }
        12 { return 'InProgress' }
        0 { } # fall through
      }
    }
  }
  if ($errCount -gt 0) { return 'Failed' }
  if ($verifyText) {
    $vl = $verifyText.ToLowerInvariant()
    if ($vl -match 'success|passed|ok|verified|complete') { return 'Success' }
    if ($vl -match 'fail|error|abort|fault') { return 'Failed' }
  }
  return 'Unknown'
}

function Parse-BackupDurationSec([object]$raw, [object]$tsEpoch, [object]$tlEpoch) {
  $n = 0L
  if ($raw -and [long]::TryParse(("$raw"), [ref]$n)) {
    if ($n -ge 1000000000) {
      $tsn = 0L
      if ($tsEpoch -and [long]::TryParse(("$tsEpoch"), [ref]$tsn) -and $tsn -gt $n -and ($tsn - $n) -le 86400) {
        return [int]($tsn - $n)
      }
      return $null
    }
    if ($n -ge 0 -and $n -le 86400) { return [int]$n }
  }
  $a = 0L; $b = 0L
  if ($tsEpoch -and $tlEpoch -and [long]::TryParse(("$tsEpoch"), [ref]$a) -and [long]::TryParse(("$tlEpoch"), [ref]$b)) {
    $d = [math]::Abs($a - $b)
    if ($d -gt 0 -and $d -le 86400) { return [int]$d }
  }
  return $null
}

foreach ($row in $allRows) {
  $au = Get-Setting $row 'AU'
  if (-not $au -and $row.AccountId) { $au = [string]$row.AccountId }
  if (-not $au) { continue }

  $ar = Get-Setting $row 'AR'
  $an = Get-Setting $row 'AN'
  $mn = Get-Setting $row 'MN'
  $us = Get-Setting $row 'US'
  $tb = Get-Setting $row 'TB'
  $ts = Get-Setting $row 'TS'
  $pn = Get-Setting $row 'PN'   # Retention Policy name
  $op = Get-Setting $row 'OP'   # Profile
  $fr = Get-Setting $row 'FR'   # Files and Folders retention
  $sr = Get-Setting $row 'SR'   # System State
  $hr = Get-Setting $row 'HR'   # Hyper-V
  $zr = Get-Setting $row 'ZR'   # VSS MS SQL
  $wr = Get-Setting $row 'WR'   # VMware
  $nr = Get-Setting $row 'NR'   # Network shares
  $t07 = Get-Setting $row 'T07' # Last session duration (seconds) or epoch
  $tl = Get-Setting $row 'TL'   # Last session time
  $durSec = Parse-BackupDurationSec $t07 $ts $tl
  $durSql = if ($null -eq $durSec) { 'NULL' } else { [string]$durSec }

  $covePartnerId = $null
  if ($row.PSObject.Properties['PartnerId']) { $covePartnerId = $row.PartnerId }
  if ($null -eq $covePartnerId -or "$covePartnerId" -eq '') { $covePartnerIdSql = 'NULL' }
  else { $covePartnerIdSql = [string]$covePartnerId }

  $usSql = 'NULL'
  if ($us) {
    $ub = 0L
    if ([long]::TryParse($us, [ref]$ub)) { $usSql = [string]$ub }
  }
  $tbSql = 'NULL'
  if ($tb) {
    $tbn = 0L
    if ([long]::TryParse($tb, [ref]$tbn)) { $tbSql = [string]$tbn }
  }

  $status = 'Unknown'
  if ($ts) {
    $n = 0L
    if ([long]::TryParse($ts, [ref]$n) -and $n -gt 0) {
      $ageH = ([DateTimeOffset]::UtcNow - [DateTimeOffset]::FromUnixTimeSeconds($n)).TotalHours
      if ($ageH -le 36) { $status = 'OK' }
      elseif ($ageH -le 72) { $status = 'Stale' }
      else { $status = 'Overdue' }
    }
  }

  # Recovery Testing / Continuity (I80): 0 None, 1 Recovery Testing, 2 Standby Image
  # VDR restore session: RV0/RVJ status, RVO/RVL timestamps, RVK verification details
  $i80 = Get-Setting $row 'I80'
  $planType = 0
  if ($i80 -ne $null -and "$i80" -ne '') {
    $pt = 0
    if ([int]::TryParse(("$i80" -replace '[^0-9\-]','') , [ref]$pt)) { $planType = $pt }
  }
  $planLabel = 'None'
  if ($planType -eq 1) { $planLabel = 'Recovery Testing' }
  elseif ($planType -eq 2) { $planLabel = 'Standby Image' }

  $i81 = Get-Setting $row 'I81'
  $physicality = if ($i81) { [string]$i81 } else { $null }

  # Prefer VDR restore verification (RVK) over generic F19
  $rvk = Get-Setting $row 'RVK'
  $f19 = Get-Setting $row 'F19'
  $verify = $null
  if ($rvk) { $verify = [string]$rvk }
  elseif ($f19) { $verify = [string]$f19 }
  if ($verify -and $verify.Length -gt 400) { $verify = $verify.Substring(0, 400) }

  # Session status: prefer last completed (RVJ), then last successful (RVQ), then last (RV0)
  $rv0 = Get-Setting $row 'RV0'
  $rvj = Get-Setting $row 'RVJ'
  $rvq = Get-Setting $row 'RVQ'
  $rvStatus = $null
  foreach ($cand in @($rvj, $rvq, $rv0)) {
    if ($null -eq $cand -or "$cand" -eq '') { continue }
    $rvStatus = $cand
    break
  }
  $rv7 = Get-Setting $row 'RV7'
  $rvErr = 0
  if ($rv7 -ne $null -and "$rv7" -ne '') {
    [void][int]::TryParse(("$rv7" -replace '[^0-9\-]','') , [ref]$rvErr)
  }

  # Last test time: prefer completed session RVO, else successful RVL
  $rvo = Get-Setting $row 'RVO'
  $rvl = Get-Setting $row 'RVL'
  $lastTestSql = 'NULL'
  foreach ($ep in @($rvo, $rvl)) {
    if ($ep -and "$ep" -ne '' -and "$ep" -ne '0') {
      $lastTestSql = Epoch-ToSql ([string]$ep)
      if ($lastTestSql -ne 'NULL') { break }
    }
  }


  $testStatus = 'NotInPlan'
  if ($planType -eq 1 -or $planType -eq 2) {
    $testStatus = Map-RestoreStatus $rvStatus $rvErr $verify
    if ($testStatus -eq 'Unknown' -and $lastTestSql -eq 'NULL' -and -not $verify) {
      $testStatus = 'NotStarted'  # plan on, no completed restore session yet
    }
  } elseif ($null -ne $rvStatus -or $lastTestSql -ne 'NULL') {
    # Has VDR restore history even without I80 plan flag
    $testStatus = Map-RestoreStatus $rvStatus $rvErr $verify
    if ($planType -eq 0) { $planLabel = 'VDR restore (no plan flag)'; $planType = 1 }
  }

  $values.Add((
    "({0},{1},{2},{3},{4},{5},{6},{7},{8},{9},{10},{11},{12},{13},{14},{15},{16},{17},{18},{19},{20},{21},{22},{23},{24})" -f `
      ("'{0}'" -f $snap),
      $au,
      $covePartnerIdSql,
      (Sql-Str $ar),
      (Sql-Str $an),
      (Sql-Str $mn),
      $usSql,
      $tbSql,
      (Epoch-ToSql $ts),
      (Sql-Str $status),
      $planType,
      (Sql-Str $planLabel),
      (Sql-Str $verify),
      (Sql-Str $testStatus),
      (Sql-Str $physicality),
      $lastTestSql,
      (Sql-Str $pn),
      (Sql-Str $op),
      (Sql-Str $fr),
      (Sql-Str $sr),
      (Sql-Str $hr),
      (Sql-Str $zr),
      (Sql-Str $wr),
      (Sql-Str $nr),
      $durSql
  ))
}

if ($values.Count -eq 0) { throw 'No device rows built for SQL insert' }
Write-Log ("Rows to insert=" + $values.Count)
# Diagnostic: first device with Recovery Testing plan
foreach ($row in $allRows) {
  $i80s = Get-Setting $row 'I80'
  if ("$i80s" -eq '1' -or "$i80s" -eq '2') {
    Write-Log ("Recovery sample AN=" + (Get-Setting $row 'AN') + " I80=" + $i80s + " I81=" + (Get-Setting $row 'I81') + " RV0=" + (Get-Setting $row 'RV0') + " RVJ=" + (Get-Setting $row 'RVJ') + " RVQ=" + (Get-Setting $row 'RVQ') + " RVO=" + (Get-Setting $row 'RVO') + " RVL=" + (Get-Setting $row 'RVL') + " RVK=" + (Get-Setting $row 'RVK') + " F19=" + (Get-Setting $row 'F19'))
    break
  }
}
# Retention sample (first device with PN)
foreach ($row in $allRows) {
  $pns = Get-Setting $row 'PN'
  if ($pns) {
    Write-Log ("Retention sample AN=" + (Get-Setting $row 'AN') + " PN=" + $pns + " OP=" + (Get-Setting $row 'OP') + " FR=" + (Get-Setting $row 'FR') + " SR=" + (Get-Setting $row 'SR') + " HR=" + (Get-Setting $row 'HR') + " ZR=" + (Get-Setting $row 'ZR'))
    break
  }
}


$colList = 'SnapshotDate, AccountId, PartnerId, PartnerName, DeviceName, MachineName, UsedBytes, SelectedBytes, LastSuccessTime, LastBackupStatus, RecoveryPlanType, RecoveryPlanLabel, RecoveryVerification, RecoveryTestStatus, Physicality, LastRecoveryTestAt, RetentionPolicy, ProfileName, RetentionFiles, RetentionSystemState, RetentionHyperV, RetentionSql, RetentionVmware, RetentionNetwork, LastBackupDurationSec'

$ddl = @"
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF OBJECT_ID('tempdb..#cove') IS NOT NULL DROP TABLE #cove;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryPlanType') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryPlanType int NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryPlanLabel') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryPlanLabel nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryVerification') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryVerification nvarchar(400) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RecoveryTestStatus') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RecoveryTestStatus nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'Physicality') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD Physicality nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'LastRecoveryTestAt') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD LastRecoveryTestAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionPolicy') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionPolicy nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'ProfileName') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD ProfileName nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionFiles') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionFiles nvarchar(80) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionSystemState') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionSystemState nvarchar(80) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionHyperV') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionHyperV nvarchar(80) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionSql') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionSql nvarchar(80) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionVmware') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionVmware nvarchar(80) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionNetwork') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionNetwork nvarchar(80) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'LastBackupDurationSec') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD LastBackupDurationSec int NULL;
GO
CREATE TABLE #cove (
  SnapshotDate date NOT NULL,
  AccountId bigint NOT NULL,
  PartnerId int NULL,
  PartnerName nvarchar(200) NULL,
  DeviceName nvarchar(200) NULL,
  MachineName nvarchar(200) NULL,
  UsedBytes bigint NULL,
  SelectedBytes bigint NULL,
  LastSuccessTime datetime2(3) NULL,
  LastBackupStatus nvarchar(100) NULL,
  RecoveryPlanType int NULL,
  RecoveryPlanLabel nvarchar(40) NULL,
  RecoveryVerification nvarchar(400) NULL,
  RecoveryTestStatus nvarchar(40) NULL,
  Physicality nvarchar(40) NULL,
  LastRecoveryTestAt datetime2(3) NULL,
  RetentionPolicy nvarchar(200) NULL,
  ProfileName nvarchar(200) NULL,
  RetentionFiles nvarchar(80) NULL,
  RetentionSystemState nvarchar(80) NULL,
  RetentionHyperV nvarchar(80) NULL,
  RetentionSql nvarchar(80) NULL,
  RetentionVmware nvarchar(80) NULL,
  RetentionNetwork nvarchar(80) NULL,
  LastBackupDurationSec int NULL
);
"@

$batchSize = 400
$insertParts = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $values.Count; $i += $batchSize) {
  $end = [Math]::Min($i + $batchSize - 1, $values.Count - 1)
  $chunk = $values[$i..$end]
  $insertParts.Add(("INSERT INTO #cove ({0}) VALUES`n{1};" -f $colList, ($chunk -join ",`n")))
}
Write-Log ("cove_load batches=" + $insertParts.Count + " rows=" + $values.Count)

$tail = @"
IF OBJECT_ID('tempdb..#mapped') IS NOT NULL DROP TABLE #mapped;
SELECT c.*, m.CustomerCode
INTO #mapped
FROM #cove c
LEFT JOIN dbo.Dim_Cove_PartnerMap m
  ON m.Active = 1 AND m.PartnerName = c.PartnerName;

DELETE d
FROM dbo.Cove_DeviceStatistics d
WHERE d.SnapshotDate = '$snap'
  AND d.AccountId IN (SELECT AccountId FROM #mapped);

INSERT INTO dbo.Cove_DeviceStatistics (
  SnapshotDate, AccountId, PartnerId, CustomerCode,
  DeviceName, MachineName, UsedBytes, SelectedBytes,
  LastSuccessTime, LastBackupStatus, Product, ImportedAt,
  RecoveryPlanType, RecoveryPlanLabel, RecoveryVerification, RecoveryTestStatus, Physicality, LastRecoveryTestAt,
  RetentionPolicy, ProfileName, RetentionFiles, RetentionSystemState, RetentionHyperV, RetentionSql, RetentionVmware, RetentionNetwork, LastBackupDurationSec
)
SELECT
  SnapshotDate, AccountId, PartnerId, CustomerCode,
  DeviceName, MachineName, UsedBytes, SelectedBytes,
  LastSuccessTime, LastBackupStatus, PartnerName, SYSUTCDATETIME(),
  RecoveryPlanType, RecoveryPlanLabel, RecoveryVerification, RecoveryTestStatus, Physicality, LastRecoveryTestAt,
  RetentionPolicy, ProfileName, RetentionFiles, RetentionSystemState, RetentionHyperV, RetentionSql, RetentionVmware, RetentionNetwork, LastBackupDurationSec
FROM #mapped;

SELECT COUNT(*) AS RowsToday, SUM(CASE WHEN CustomerCode IS NULL THEN 1 ELSE 0 END) AS Unmapped
FROM dbo.Cove_DeviceStatistics WHERE SnapshotDate = '$snap';

SELECT PartnerName, CustomerCode, COUNT(*) AS Cnt
FROM #mapped
GROUP BY PartnerName, CustomerCode
ORDER BY Cnt DESC;
"@

$loadSql = $ddl + "`r`n" + ($insertParts -join "`r`n") + "`r`n" + $tail

Invoke-SqlFile -SqlText $loadSql -Label 'cove_load'
# Auto-map unmapped partners + re-stamp CustomerCode
$autoMap = Join-Path $here 'Auto-Map-Cove-Partners.ps1'
$autoSql = Join-Path $here '434_AutoMap_Cove_Partners.sql'
if (Test-Path -LiteralPath $autoMap) {
  Write-Log 'Running auto-map cleanup...'
  try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $autoMap `
      -SqlServer $SqlServer -SqlDatabase $SqlDatabase -SqlUser $SqlUser -SqlPassword $SqlPassword
    Write-Log 'Auto-map finished'
  } catch {
    Write-Log ('Auto-map warning: ' + $_.Exception.Message)
  }
} elseif (Test-Path -LiteralPath $autoSql) {
  Write-Log 'Running 434 auto-map SQL...'
  try {
    Invoke-SqlFile -SqlText ([IO.File]::ReadAllText($autoSql)) -Label 'automap'
  } catch {
    Write-Log ('Auto-map SQL warning: ' + $_.Exception.Message)
  }
}

Write-Log '=== Cove collect done ==='
Write-Log ("log=" + $log)
try {
  Invoke-SqlFile -SqlText @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NULL RETURN;
UPDATE dbo.Dim_Connection
SET LastSyncAt = SYSUTCDATETIME(),
    Status = N'Active',
    Notes = N'Cove collect OK',
    UpdatedAt = SYSUTCDATETIME()
WHERE ConnectionCode IN (N'COVE', N'NABLE_COVE', N'BACKUP');
"@ -Label 'cove_stamp_conn'
  Write-Log 'Dim_Connection COVE stamped Active'
} catch {
  Write-Log ('stamp Dim_Connection skip: ' + $_.Exception.Message)
}


