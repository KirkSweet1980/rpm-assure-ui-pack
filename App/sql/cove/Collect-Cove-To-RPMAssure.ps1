# Central collect: Cove API -> RPMAssure_App.Cove_DeviceStatistics
# ASCII only. Never use $PID (read-only automatic variable).
# Creates partner map + device fact if missing (needs CREATE TABLE rights).
# Does NOT require Dim_Customer for collect to succeed.

param(
  [string]$SqlServer = '',
  [string]$SqlDatabase = 'RPMAssure_App',
  [string]$SqlUser = 'Rpm_collect',
  [string]$SqlPassword = '',
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
if (-not $SqlServer -or $SqlServer -match '14333|102\.222\.21\.220') {
  if (Get-Service -Name 'MSSQL$RPMREPORTS' -ErrorAction SilentlyContinue) { $SqlServer = '.\RPMREPORTS' }
}
if (-not $SqlServer) { $SqlServer = '.\RPMREPORTS' }
if (-not $SqlDatabase) { $SqlDatabase = 'RPMAssure_App' }
if (-not $SqlUser) { $SqlUser = 'Rpm_collect' }
$gp = @(
  (Join-Path $here '..\ops\Get-RpmSqlPassword.ps1'),
  'C:\RPM-Assure\Sql\ops\Get-RpmSqlPassword.ps1'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($gp) { . $gp; $SqlPassword = Get-RpmSqlPassword -Current $SqlPassword }
elseif ([string]::IsNullOrWhiteSpace($SqlPassword)) { throw 'SQL password missing — run deploy\Harden-Production.ps1' }

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
  } elseif ($n -lt 1577836800) {
    # too small to be a 2020+ unix second (avoids treating status codes as dates)
    return 'NULL'
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
    (N''AHI Carriers'', N''AHIC'', 2760329),
    (N''AHI'', N''AHIC'', 2760329),
    (N''AHI Carrier'', N''AHIC'', 2760329),
    (N''UVSS'', N''UVSS'', 2814015),
    (N''Unique Ventilation Systems'', N''UVSS'', 2814015),
    (N''Able Tracers'', N''ABLE'', NULL),
    (N''Able Tracer'', N''ABLE'', NULL),
    (N''Hydra Sales'', N''HYDRA'', NULL),
    (N''Hydra'', N''HYDRA'', NULL),
    (N''Redsun Raisins Northen Cape'', N''RSR'', NULL),
    (N''Redsun Raisins'', N''RSR'', NULL),
    (N''BHF'', N''BHF'', NULL),
    (N''BHF (PNCS)'', N''BHF'', 2925801),
    (N''Board of Healthcare Funders'', N''BHF'', NULL),
    (N''PCNS'', N''BHF'', 2925801),
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

function One-Draas($v) {
  if ($null -eq $v) { return $null }
  if ($v -is [System.Array]) {
    if ($v.Length -eq 0) { return $null }
    return $v[0]
  }
  return $v
}
function Draas-Attr($item, [string]$name) {
  if ($null -eq $item) { return $null }
  $a = $null
  try { $a = $item.attributes } catch {}
  foreach ($src in @($a, $item)) {
    if ($null -eq $src) { continue }
    $p = $src.PSObject.Properties[$name]
    if ($p -and $null -ne $p.Value -and "$($p.Value)" -ne '') { return (One-Draas $p.Value) }
  }
  $relName = $name
  if ($name -match '_id$') { $relName = $name -replace '_id$', '' }
  try {
    $rel = $item.relationships
    if ($rel) {
      foreach ($rn in @($name, $relName)) {
        $rp = $rel.PSObject.Properties[$rn]
        if (-not $rp -or $null -eq $rp.Value) { continue }
        $data = $null
        try { $data = $rp.Value.data } catch {}
        if ($data -and $data.id) { return (One-Draas $data.id) }
      }
    }
  } catch {}
  return $null
}
function Draas-AttrRaw($item, [string]$name) {
  if ($null -eq $item) { return $null }
  $a = $null
  try { $a = $item.attributes } catch {}
  foreach ($src in @($a, $item)) {
    if ($null -eq $src) { continue }
    $p = $src.PSObject.Properties[$name]
    if ($p -and $null -ne $p.Value) { return $p.Value }
  }
  return $null
}
function Compact-CoveName([string]$n) {
  if ([string]::IsNullOrWhiteSpace($n)) { return '' }
  $s = $n.Trim().ToLowerInvariant()
  $s = [regex]::Replace($s, '_[a-z0-9]{4,8}$', '')
  return [regex]::Replace($s, '[^a-z0-9]', '')
}
function Parse-DurationSec($raw) {
  if ($null -eq $raw -or "$raw" -eq '') { return $null }
  $n = 0L
  if ([long]::TryParse(("$raw"), [ref]$n)) {
    if ($n -gt 86400 -and $n -lt 86400000) { return [int][Math]::Round($n / 1000.0) }
    if ($n -ge 0 -and $n -le 86400) { return [int]$n }
  }
  $s = ("$raw").ToLowerInvariant()
  $sec = 0
  $hm = [regex]::Match($s, '(\d+)\s*h')
  $mm = [regex]::Match($s, '(\d+)\s*m')
  $ss = [regex]::Match($s, '(\d+)\s*s')
  if ($hm.Success) { $sec += 3600 * [int]$hm.Groups[1].Value }
  if ($mm.Success) { $sec += 60 * [int]$mm.Groups[1].Value }
  if ($ss.Success) { $sec += [int]$ss.Groups[1].Value }
  if ($sec -gt 0) { return $sec }
  return $null
}
function Title-Status([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return $null }
  $t = $s.Replace('_', ' ').Replace('-', ' ').Trim()
  if ($t -match '^(?i)success') { return 'Success' }
  if ($t -match '^(?i)fail') { return 'Failed' }
  if ($t -match '^(?i)complete') { return 'Completed' }
  if ($t -match '^(?i)progress|running') { return 'In Progress' }
  if ($t.Length -eq 0) { return $null }
  return ($t.Substring(0,1).ToUpper() + $t.Substring(1).ToLower())
}
function ColorBar-Text($v) {
  if ($null -eq $v) { return $null }
  $items = @()
  if ($v -is [string]) {
    $s = [string]$v
    if ($s.StartsWith('{') -or $s.StartsWith('[')) {
      try {
        $j = $s | ConvertFrom-Json
        if ($j -is [System.Array]) { $items = @($j) }
        elseif ($j.data) { $items = @($j.data) }
        else { $items = @($j) }
      } catch { return $s }
    } else { return $s }
  } elseif ($v -is [System.Array]) { $items = @($v) }
  elseif ($v -is [System.Collections.IEnumerable]) { $items = @($v) }
  else {
    try {
      if ($v.data) { $items = @($v.data) }
      else { $items = @($v) }
    } catch { $items = @($v) }
  }
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($it in $items) {
    if ($null -eq $it) { continue }
    $st = $null
    if ($it -is [string] -or $it -is [ValueType]) { $st = [string]$it }
    else {
      foreach ($nm in @('status','state','result','recovery_status')) {
        try {
          $p = $it.PSObject.Properties[$nm]
          if ($p -and "$($p.Value)") { $st = [string]$p.Value; break }
        } catch {}
      }
      if (-not $st) {
        try {
          $aa = $it.attributes
          if ($aa) {
            foreach ($nm in @('status','state','result')) {
              $p = $aa.PSObject.Properties[$nm]
              if ($p -and "$($p.Value)") { $st = [string]$p.Value; break }
            }
          }
        } catch {}
      }
    }
    if ([string]::IsNullOrWhiteSpace($st)) { continue }
    if ($st.StartsWith('@{')) { continue }
    [void]$parts.Add($st.Trim())
  }
  if ($parts.Count -eq 0) { return $null }
  $joined = ($parts -join ',')
  if ($joined.Length -gt 390) { $joined = $joined.Substring(0, 390) }
  return $joined
}
function Format-DurationLabel($sec) {
  if ($null -eq $sec) { return $null }
  $n = 0
  if (-not [int]::TryParse("$sec", [ref]$n) -or $n -lt 0) { return $null }
  $h = [int][Math]::Floor($n / 3600)
  $m = [int][Math]::Floor(($n % 3600) / 60)
  $s = $n % 60
  if ($h -gt 0) { return ('{0}h {1}m {2}s' -f $h, $m, $s) }
  if ($m -gt 0) { return ('{0}m {1}s' -f $m, $s) }
  return ('{0}s' -f $s)
}

$script:DraasByAu = @{}
$script:DraasByName = @{}
$script:DraasMatched = @{}
$script:SeenAu = @{}
$script:DraasBarByKey = @{}
$shotDir = 'C:\RPM-Assure\data\cove-recovery'
try { New-Item -ItemType Directory -Force -Path $shotDir | Out-Null } catch {
  $shotDir = 'C:\RPM-Assure\downloads\cove-recovery'
  New-Item -ItemType Directory -Force -Path $shotDir | Out-Null
}
function Index-DraasName($it, [string]$nm) {
  if ([string]::IsNullOrWhiteSpace($nm)) { return }
  $k = $nm.Trim().ToLowerInvariant()
  if (-not $script:DraasByName.ContainsKey($k)) { $script:DraasByName[$k] = $it }
  $ck = Compact-CoveName $nm
  if ($ck.Length -ge 6 -and -not $script:DraasByName.ContainsKey($ck)) { $script:DraasByName[$ck] = $it }
}
try {
  $fields = @(
    'backup_cloud_device_id','backup_cloud_device_name','backup_cloud_device_alias','backup_cloud_device_machine_name',
    'backup_cloud_partner_name','colorbar','current_recovery_status','plan_name','device_recovery_frequency',
    'last_backup_session_timestamp','last_boot_test_screenshot_presented','last_boot_test_status',
    'last_boot_test_session_id','last_boot_test_backup_session_timestamp','last_recovery_duration_user','last_recovery_errors_count',
    'last_recovery_session_id','last_recovery_status','last_recovery_timestamp','type'
  )
  $offset = 0
  $draasN = 0
  while ($offset -lt 2000) {
    $q = 'offset={0}&limit=200&sort=last_recovery_timestamp&filter[type.in]=RECOVERY_TESTING,SELF_HOSTED,AZURE_SELF_HOSTED,ESXI_SELF_HOSTED' -f $offset
    $uri = 'https://api.backup.management/draas/actual-statistics/v1/dashboard/?' + $q
    $resp = Invoke-WebRequest -Uri $uri -Method GET -Headers @{ Authorization = ('Bearer ' + $visa) } -UseBasicParsing -TimeoutSec 120
    $body = ConvertTo-Text $resp.Content
    if ($offset -eq 0) {
      $rawCb = [regex]::Match($body, '"colorbar"\s*:\s*(\[[\s\S]{0,12000}\])')
      if ($rawCb.Success) {
        $snip = [string]$rawCb.Groups[1].Value
        if ($snip.Length -gt 700) { $snip = $snip.Substring(0, 700) }
        Write-Log ('raw colorbar=' + $snip)
      } else {
        Write-Log 'raw colorbar=NOTFOUND'
      }
    }
    try {
      Add-Type -AssemblyName System.Web.Extensions -ErrorAction SilentlyContinue
      $ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
      $ser.MaxJsonLength = 67108864
      $js = $ser.DeserializeObject($body)
      $jsData = $null
      try { $jsData = $js['data'] } catch { try { $jsData = $js.data } catch {} }
      $tickMax = 0
      $tickLog = New-Object System.Collections.Generic.List[string]
      foreach ($jit in @($jsData)) {
        if ($null -eq $jit) { continue }
        $attrs = $null
        try { $attrs = $jit['attributes'] } catch { try { $attrs = $jit.attributes } catch {} }
        if ($null -eq $attrs) { continue }
        $cb = $null
        try { $cb = $attrs['colorbar'] } catch { try { $cb = $attrs.colorbar } catch {} }
        $auJs = ''
        $idJs = ''
        try { $auJs = [string]$attrs['backup_cloud_device_id'] } catch {}
        try { $idJs = [string]$jit['id'] } catch {}
        $parts = New-Object System.Collections.Generic.List[string]
        if ($cb -is [System.Collections.IEnumerable] -and -not ($cb -is [string]) -and -not ($cb -is [System.Collections.IDictionary])) {
          foreach ($c in @($cb)) {
            $st = ''
            if ($c -is [System.Collections.IDictionary]) { try { $st = [string]$c['status'] } catch {} }
            elseif ($c -is [string]) { $st = [string]$c }
            else { try { $st = [string]$c.status } catch {} }
            if ($st) { [void]$parts.Add($st) }
          }
        } elseif ($cb -is [System.Collections.IDictionary]) {
          try { $st = [string]$cb['status'] } catch { $st = '' }
          if ($st) { [void]$parts.Add($st) }
        }
        if ($parts.Count -gt $tickMax) { $tickMax = $parts.Count }
        $nm = ''
        try { $nm = [string]$attrs['backup_cloud_device_name'] } catch {}
        if ($parts.Count -gt 0) {
          [void]$tickLog.Add(($nm + '=' + $parts.Count))
          if ($auJs) { $script:DraasBarByKey[$auJs] = $parts }
          if ($idJs) { $script:DraasBarByKey[$idJs] = $parts }
        }
      }
      Write-Log ('js colorbar devices=' + $script:DraasBarByKey.Count + ' maxTicks=' + $tickMax + ' ' + ($tickLog -join ','))
    } catch {
      Write-Log ('WARN js colorbar ' + $_.Exception.Message)
    }
    $obj = $null
    try { $obj = $body | ConvertFrom-Json } catch {}
    $items = @()
    if ($obj -and $obj.data) { $items = @($obj.data) }
    elseif ($obj -is [System.Array]) { $items = @($obj) }
    if ($items.Count -eq 0) { break }
    foreach ($it in $items) {
      $au = [string](Draas-Attr $it 'backup_cloud_device_id')
      if (-not $au -or $au -eq '') { $au = [string](One-Draas $it.id) }
      if ($au) { $script:DraasByAu[$au] = $it }
      Index-DraasName $it ([string](Draas-Attr $it 'backup_cloud_device_name'))
      Index-DraasName $it ([string](Draas-Attr $it 'backup_cloud_device_alias'))
      Index-DraasName $it ([string](Draas-Attr $it 'backup_cloud_device_machine_name'))
      $draasN++
    }
    if ($obj.included) { Write-Log ('DRaaS included=' + @($obj.included).Count) }
    if ($offset -eq 0 -and $items.Count -gt 0) {
      $sample = $items[0]
      $attrNames = @()
      try {
        if ($sample.attributes) { $attrNames = @($sample.attributes.PSObject.Properties.Name) }
        elseif ($sample.PSObject) { $attrNames = @($sample.PSObject.Properties.Name) }
      } catch {}
      Write-Log ('DRaaS sample id=' + (One-Draas $sample.id) + ' attrs=' + ($attrNames -join ','))
      $cb = Draas-AttrRaw $sample 'colorbar'
      $cbDump = ''
      try { $cbDump = ($cb | ConvertTo-Json -Compress -Depth 6) } catch { $cbDump = [string]$cb }
      if ($cbDump -is [System.Array]) { $cbDump = [string]::Join('', @($cbDump)) }
      $cbDump = [string]$cbDump
      if ($cbDump.Length -gt 360) { $cbDump = $cbDump.Substring(0, 360) }
      $cbType = if ($null -eq $cb) { 'null' } else { $cb.GetType().FullName }
      $cbN = @($cb).Count
      Write-Log ('DRaaS sample name=' + (Draas-Attr $sample 'backup_cloud_device_name') + ' au=' + (Draas-Attr $sample 'backup_cloud_device_id') + ' bar=' + (ColorBar-Text $cb) + ' barType=' + $cbType + ' barN=' + $cbN)
      Write-Log ('colorbar dump=' + $cbDump)
    }
    if ($items.Count -lt 200) { break }
    $offset += 200
  }
  Write-Log ('DRaaS recovery devices=' + $script:DraasByAu.Count + ' names=' + $script:DraasByName.Count)
} catch {
  Write-Log ('WARN DRaaS dashboard ' + $_.Exception.Message)
}

function Find-Draas([string]$au, [string]$an, [string]$mn) {
  if ($au -and $script:DraasByAu.ContainsKey($au)) { return $script:DraasByAu[$au] }
  foreach ($n in @($an, $mn)) {
    if ([string]::IsNullOrWhiteSpace($n)) { continue }
    $k = $n.Trim().ToLowerInvariant()
    if ($script:DraasByName.ContainsKey($k)) { return $script:DraasByName[$k] }
    $ck = Compact-CoveName $n
    if ($ck.Length -ge 6 -and $script:DraasByName.ContainsKey($ck)) { return $script:DraasByName[$ck] }
  }
  foreach ($n in @($an, $mn)) {
    $ck = Compact-CoveName $n
    if ($ck.Length -lt 8) { continue }
    foreach ($key in @($script:DraasByName.Keys)) {
      if ($key.Length -lt 6) { continue }
      if ($ck.Contains($key) -or $key.Contains($ck)) { return $script:DraasByName[$key] }
    }
  }
  return $null
}
function Mark-DraasMatched($draas) {
  if ($null -eq $draas) { return }
  $id = [string](Draas-Attr $draas 'backup_cloud_device_id')
  if (-not $id) { $id = [string](One-Draas $draas.id) }
  if ($id) { $script:DraasMatched[$id] = $true }
}
function Draas-Last14($draas, [string]$auKey) {
  $colorBar = ColorBar-Text (Draas-AttrRaw $draas 'colorbar')
  if ($null -eq $script:DraasBarByKey) { return $colorBar }
  $planKey = [string](One-Draas $draas.id)
  $auD = [string](Draas-Attr $draas 'backup_cloud_device_id')
  foreach ($k in @($planKey, $auD, $auKey)) {
    if ($k -and $script:DraasBarByKey.ContainsKey([string]$k) -and $script:DraasBarByKey[[string]$k].Count -gt 0) {
      return ($script:DraasBarByKey[[string]$k] -join ',')
    }
  }
  return $colorBar
}
function Draas-CbTime($draas, [string]$prop) {
  $cb = Draas-AttrRaw $draas 'colorbar'
  if ($null -eq $cb) { return $null }
  try {
    $p = $cb.PSObject.Properties[$prop]
    if ($p -and "$($p.Value)") { return [string]$p.Value }
  } catch {}
  return $null
}

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
        Columns           = @('AU','AR','AN','MN','CD','TS','TL','US','TB','PN','OP','OV','FR','SR','HR','ZR','WR','NR','XR','PR','I80','I81','I82','I83','I84','I85','I86','I88','F19','F00','F06','F08','F12','F15','F17','F18','RV0','RVJ','RVQ','RVO','RVL','RVK','RV7','RVA','RVB','T07','RT0','RT1','RT2','RT3','RT4','RT5')
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

# Continuity Recovery Testing last-14 counters live on RT0-RT5 (not RVO/RVL).
# Session timestamp is still not published. Guessed Continuity methods all return -32601.
$script:RecoveryByAu = @{}
Write-Log 'Recovery: using RT0-RT5 last-14 counters from EnumerateAccountStatistics'

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
  $i82 = Get-Setting $row 'I82'
  $f00 = Get-Setting $row 'F00'
  $f18 = Get-Setting $row 'F18'
  $rt0 = 0; $rt1 = 0; $rt2 = 0; $rt3 = 0; $rt4 = 0; $rt5 = 0
  [void][int]::TryParse((Get-Setting $row 'RT0'), [ref]$rt0)
  [void][int]::TryParse((Get-Setting $row 'RT1'), [ref]$rt1)
  [void][int]::TryParse((Get-Setting $row 'RT2'), [ref]$rt2)
  [void][int]::TryParse((Get-Setting $row 'RT3'), [ref]$rt3)
  [void][int]::TryParse((Get-Setting $row 'RT4'), [ref]$rt4)
  [void][int]::TryParse((Get-Setting $row 'RT5'), [ref]$rt5)
  $rtNote = ('last14 ok=' + $rt0 + ' fail=' + $rt1 + ' warn=' + $rt2 + ' rt3=' + $rt3 + ' rt4=' + $rt4 + ' rt5=' + $rt5)
  if (-not $verify) { $verify = $rtNote }
  elseif ($verify -notmatch 'last14') {
    $joined = $verify + ' | ' + $rtNote
    if ($joined.Length -gt 400) { $joined = $joined.Substring(0, 400) }
    $verify = $joined
  }
  $lastTestSql = 'NULL'
  foreach ($ep in @($rvo, $rvl, $f18)) {
    if ($ep -and "$ep" -ne '' -and "$ep" -ne '0' -and "$ep" -ne 'Yes' -and "$ep" -ne 'No') {
      $lastTestSql = Epoch-ToSql ([string]$ep)
      if ($lastTestSql -ne 'NULL') { break }
    }
  }
  $auKey = "$au"
  $script:SeenAu[$auKey] = $true
  if ($script:RecoveryByAu.ContainsKey($auKey)) {
    $hit = $script:RecoveryByAu[$auKey]
    if ($lastTestSql -eq 'NULL' -and $hit.When) {
      $lastTestSql = Epoch-ToSql ([string]$hit.When)
      if ($lastTestSql -eq 'NULL') {
        # ISO / date string
        try {
          $dto = [DateTimeOffset]::Parse([string]$hit.When)
          $lastTestSql = ("'{0:yyyy-MM-ddTHH:mm:ss}'" -f $dto.UtcDateTime)
        } catch {}
      }
    }
    if ($hit.Status -and -not $rvStatus) { $rvStatus = $hit.Status }
  }

  $draas = Find-Draas $auKey ([string]$an) ([string]$mn)
  Mark-DraasMatched $draas
  $colorBar = $null; $recStatus = $null; $bootStatus = $null
  $recErrN = $rvErr; $backupSessSql = 'NULL'; $durLabel = $null; $recDurSec = $null
  $recSessId = $null; $shotPresented = $null; $shotPath = $null
  if ($draas) {
    $planName = [string](Draas-Attr $draas 'plan_name')
    $freq = [string](Draas-Attr $draas 'device_recovery_frequency')
    if ($freq) { $planLabel = (Title-Status $freq); if ($planType -eq 0) { $planType = 1 } }
    elseif ($planName) { $planLabel = $planName; if ($planType -eq 0) { $planType = 1 } }
    $colorBar = Draas-Last14 $draas $auKey
    $recStatus = Title-Status ([string](Draas-Attr $draas 'last_recovery_status'))
    if (-not $recStatus) { $recStatus = Title-Status ([string](Draas-Attr $draas 'current_recovery_status')) }
    $bootStatus = Title-Status ([string](Draas-Attr $draas 'last_boot_test_status'))
    if (-not $bootStatus) { $bootStatus = Title-Status ([string](Draas-Attr $draas 'last_recovery_boot_status')) }
    $errRaw = Draas-Attr $draas 'last_recovery_errors_count'
    if ($null -ne $errRaw) { [void][int]::TryParse(("$errRaw"), [ref]$recErrN) }
    $durRaw = Draas-Attr $draas 'last_recovery_duration_user'
    if ($durRaw) {
      $recDurSec = Parse-DurationSec $durRaw
      if ($null -ne $recDurSec) { $durLabel = Format-DurationLabel $recDurSec }
      else { $durLabel = [string]$durRaw }
    }
    $recSessId = [string](Draas-Attr $draas 'last_recovery_session_id')
    if (-not $recSessId) { $recSessId = [string](Draas-Attr $draas 'last_boot_test_session_id') }
    $pres = Draas-Attr $draas 'last_boot_test_screenshot_presented'
    if ($pres -eq $true -or "$pres" -eq '1' -or "$pres" -eq 'True') { $shotPresented = 1 }
    elseif ($pres -eq $false -or "$pres" -eq '0') { $shotPresented = 0 }
    $rtWhen = Draas-Attr $draas 'last_recovery_timestamp'
    if ($lastTestSql -eq 'NULL' -and $rtWhen) { $lastTestSql = Epoch-ToSql ([string]$rtWhen) }
    if ($lastTestSql -eq 'NULL') {
      $cbRt = Draas-CbTime $draas 'recovery_session_timestamp'
      if ($cbRt) { $lastTestSql = Epoch-ToSql $cbRt }
    }
    $bkWhen = Draas-Attr $draas 'last_backup_session_timestamp'
    if (-not $bkWhen) { $bkWhen = Draas-Attr $draas 'last_boot_test_backup_session_timestamp' }
    if (-not $bkWhen) { $bkWhen = Draas-CbTime $draas 'backup_session_timestamp' }
    if ($bkWhen) { $backupSessSql = Epoch-ToSql ([string]$bkWhen) }
    if (-not $recSessId) { $recSessId = Draas-CbTime $draas 'session_id' }
    if ($null -eq $shotPresented) {
      $pres2 = Draas-Attr $draas 'last_recovery_screenshot_presented'
      if ($pres2 -eq $true -or "$pres2" -eq '1' -or "$pres2" -eq 'True') { $shotPresented = 1 }
    }
  }
  if (-not $colorBar) { $colorBar = ColorBar-Text (Get-Setting $row 'RVB') }
  if (-not $colorBar) { $colorBar = ColorBar-Text (Get-Setting $row 'F08') }
  if (-not $colorBar -and ($rt0 + $rt1 + $rt2) -gt 0 -and $rt0 -le 14 -and $rt1 -le 14 -and $rt2 -le 14) {
    $synth = New-Object System.Collections.Generic.List[string]
    $pad = 14 - [Math]::Min(14, ($rt0 + $rt1 + $rt2))
    for ($i = 0; $i -lt $pad; $i++) { [void]$synth.Add('NotStarted') }
    for ($i = 0; $i -lt [Math]::Min(14, $rt0); $i++) { [void]$synth.Add('Completed') }
    for ($i = 0; $i -lt [Math]::Min(14 - $synth.Count, $rt2); $i++) { [void]$synth.Add('CompletedWithErrors') }
    for ($i = 0; $i -lt [Math]::Min(14 - $synth.Count, $rt1); $i++) { [void]$synth.Add('Failed') }
    $colorBar = ($synth -join ',')
  }
  if (-not $recStatus -and $rvj) { $recStatus = Title-Status ([string]$rvj) }
  $f06 = Get-Setting $row 'F06'
  if ($recErrN -eq 0 -and $f06) { [void][int]::TryParse("$f06", [ref]$recErrN) }
  $f12 = Get-Setting $row 'F12'
  if ($null -eq $recDurSec -and $f12) { $recDurSec = Parse-DurationSec $f12 }
  if ($null -eq $durLabel -and $null -ne $recDurSec) { $durLabel = Format-DurationLabel $recDurSec }
  $f15 = Get-Setting $row 'F15'
  if ($backupSessSql -eq 'NULL' -and $f15) { $backupSessSql = Epoch-ToSql ([string]$f15) }
  $rva = Get-Setting $row 'RVA'
  if ($null -eq $recDurSec -and $rva) { $recDurSec = Parse-DurationSec $rva }
  if ($null -eq $durLabel -and $null -ne $recDurSec) { $durLabel = Format-DurationLabel $recDurSec }

  $bootSess = $null
  if ($draas) { $bootSess = [string](Draas-Attr $draas 'last_boot_test_session_id') }
  if (-not $bootSess) { $bootSess = $recSessId }
  if ($draas -and $bootSess) {
    $destPng = Join-Path $shotDir ($auKey + '.png')
    if (Test-Path $destPng) {
      if ((Get-Item $destPng).Length -gt 800) { $shotPresented = 1; $shotPath = 'cove-recovery/' + $auKey + '.png' }
    } elseif ($script:ShotTries -lt 80) {
      if ($null -eq $script:ShotTries) { $script:ShotTries = 0 }
      $script:ShotTries++
      try {
        $fUri = 'https://api.backup.management/draas/actual-statistics/v1/sessions/' + [uri]::EscapeDataString($bootSess) + '/files/?filter[file_type.in]=screenshot'
        $fRaw = Invoke-WebRequest -Uri $fUri -Method GET -Headers @{ Authorization = ('Bearer ' + $visa) } -UseBasicParsing -TimeoutSec 45
        $fObj = (ConvertTo-Text $fRaw.Content) | ConvertFrom-Json
        $fid = $null
        if ($fObj.data) {
          $first = @($fObj.data)[0]
          if ($first.id) { $fid = [string]$first.id }
        }
        if ($fid) {
          $tUri = 'https://api.backup.management/draas/actual-statistics/v1/sessions/' + [uri]::EscapeDataString($bootSess) + '/files/' + [uri]::EscapeDataString($fid) + '/get-temporary-url/'
          $tRaw = Invoke-WebRequest -Uri $tUri -Method POST -Headers @{ Authorization = ('Bearer ' + $visa); 'Content-Type' = 'application/json' } -Body '{}' -UseBasicParsing -TimeoutSec 45
          $tObj = (ConvertTo-Text $tRaw.Content) | ConvertFrom-Json
          $url = $null
          if ($tObj.data -and $tObj.data.attributes) { $url = [string]$tObj.data.attributes.url }
          if ($url) {
            Invoke-WebRequest -Uri $url -OutFile $destPng -UseBasicParsing -TimeoutSec 90
            if ((Test-Path $destPng) -and (Get-Item $destPng).Length -gt 800) {
              $shotPresented = 1
              $shotPath = 'cove-recovery/' + $auKey + '.png'
            }
          }
        }
      } catch { Write-Log ('WARN screenshot ' + $auKey + ' ' + $_.Exception.Message) }
    }
  }

  $testStatus = 'NotInPlan'
  if ($planType -eq 1 -or $planType -eq 2) {
    $testStatus = Map-RestoreStatus $rvStatus $rvErr $verify
    if ($rt1 -gt 0) { $testStatus = 'Failed' }
    elseif ($rt0 -gt 0) { $testStatus = 'Success' }
    elseif ($testStatus -eq 'Unknown' -and $lastTestSql -eq 'NULL' -and $rt0 -eq 0) {
      $testStatus = 'NotStarted'
    }
  } elseif ($null -ne $rvStatus -or $lastTestSql -ne 'NULL' -or $rt0 -gt 0) {
    $testStatus = Map-RestoreStatus $rvStatus $rvErr $verify
    if ($rt0 -gt 0 -and $rt1 -eq 0) { $testStatus = 'Success' }
    if ($planType -eq 0) { $planLabel = 'VDR restore (no plan flag)'; $planType = 1 }
  }
  if ($bootStatus -eq 'Success' -or $recStatus -eq 'Completed' -or $recStatus -eq 'Success') {
    if ($testStatus -in @('NotInPlan','Unknown','NotStarted')) { $testStatus = 'Success' }
  }
  if ($bootStatus -eq 'Failed' -or $recStatus -eq 'Failed') { $testStatus = 'Failed' }
  if (-not $recStatus -and $testStatus -and $testStatus -ne 'NotInPlan') { $recStatus = $testStatus }
  if ($null -eq $script:RtPatch) { $script:RtPatch = New-Object System.Collections.Generic.List[object] }
  [void]$script:RtPatch.Add([pscustomobject]@{
    AccountId = $auKey
    DeviceName = [string]$an
    MachineName = [string]$mn
    CompactKey = (Compact-CoveName ([string]$an + ' ' + [string]$mn))
    ColorBar = $colorBar
    RecStatus = $recStatus
    Errors = $recErrN
    LastCompleted = $lastTestSql
    BackupSession = $backupSessSql
    DurSec = $recDurSec
    DurLabel = $durLabel
    Boot = $bootStatus
    SessId = $recSessId
    Shot = $shotPresented
    ShotPath = $shotPath
    PlanLabel = $planLabel
    TestStatus = $testStatus
  })

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

# DRaaS-only recovery devices (Cove dashboard has them, EnumerateAccountStatistics missed I80)
if ($script:DraasByAu) {
  $extra = 0
  foreach ($kv in @($script:DraasByAu.GetEnumerator())) {
    $dkey = [string]$kv.Key
    if ($script:DraasMatched.ContainsKey($dkey)) { continue }
    if ($script:SeenAu.ContainsKey($dkey)) { continue }
    $draas = $kv.Value
    $anX = [string](Draas-Attr $draas 'backup_cloud_device_name')
    $mnX = [string](Draas-Attr $draas 'backup_cloud_device_machine_name')
    if (-not $mnX) { $mnX = [string](Draas-Attr $draas 'backup_cloud_device_alias') }
    $pnX = [string](Draas-Attr $draas 'backup_cloud_partner_name')
    $auNum = 0L
    if (-not [int64]::TryParse($dkey, [ref]$auNum) -or $auNum -le 0) { continue }
    $planName = [string](Draas-Attr $draas 'plan_name')
    $freq = [string](Draas-Attr $draas 'device_recovery_frequency')
    if ($freq) { $planName = Title-Status $freq }
    if (-not $planName) { $planName = 'Recovery Testing' }
    $colorBar = Draas-Last14 $draas ([string](Draas-Attr $draas 'backup_cloud_device_id'))
    $recStatus = Title-Status ([string](Draas-Attr $draas 'last_recovery_status'))
    if (-not $recStatus) { $recStatus = Title-Status ([string](Draas-Attr $draas 'current_recovery_status')) }
    $bootStatus = Title-Status ([string](Draas-Attr $draas 'last_boot_test_status'))
    if (-not $bootStatus) { $bootStatus = Title-Status ([string](Draas-Attr $draas 'last_recovery_boot_status')) }
    $recErrN = 0
    $errRaw = Draas-Attr $draas 'last_recovery_errors_count'
    if ($null -ne $errRaw) { [void][int]::TryParse(("$errRaw"), [ref]$recErrN) }
    $durRaw = Draas-Attr $draas 'last_recovery_duration_user'
    $recDurSec = $null; $durLabel = $null
    if ($durRaw) {
      $recDurSec = Parse-DurationSec $durRaw
      if ($null -ne $recDurSec) { $durLabel = Format-DurationLabel $recDurSec } else { $durLabel = [string]$durRaw }
    }
    $lastTestSql = 'NULL'
    $rtWhen = Draas-Attr $draas 'last_recovery_timestamp'
    if ($rtWhen) { $lastTestSql = Epoch-ToSql ([string]$rtWhen) }
    $backupSessSql = 'NULL'
    $bkWhen = Draas-Attr $draas 'last_backup_session_timestamp'
    if (-not $bkWhen) { $bkWhen = Draas-Attr $draas 'last_boot_test_backup_session_timestamp' }
    if ($bkWhen) { $backupSessSql = Epoch-ToSql ([string]$bkWhen) }
    $recSessId = [string](Draas-Attr $draas 'last_recovery_session_id')
    if (-not $recSessId) { $recSessId = [string](Draas-Attr $draas 'last_boot_test_session_id') }
    $testStatus = 'Success'
    if ($bootStatus -eq 'Failed' -or $recStatus -eq 'Failed') { $testStatus = 'Failed' }
    elseif ($recStatus) { $testStatus = $recStatus }
    if ($null -eq $script:RtPatch) { $script:RtPatch = New-Object System.Collections.Generic.List[object] }
    [void]$script:RtPatch.Add([pscustomobject]@{
      AccountId = $dkey
      DeviceName = $anX
      MachineName = $mnX
      CompactKey = (Compact-CoveName ($anX + ' ' + $mnX))
      ColorBar = $colorBar
      RecStatus = $recStatus
      Errors = $recErrN
      LastCompleted = $lastTestSql
      BackupSession = $backupSessSql
      DurSec = $recDurSec
      DurLabel = $durLabel
      Boot = $bootStatus
      SessId = $recSessId
      Shot = $null
      ShotPath = $null
      PlanLabel = $planName
      TestStatus = $testStatus
    })
    $values.Add((
      "({0},{1},{2},{3},{4},{5},{6},{7},{8},{9},{10},{11},{12},{13},{14},{15},{16},{17},{18},{19},{20},{21},{22},{23},{24})" -f `
        ("'{0}'" -f $snap),
        $dkey,
        'NULL',
        (Sql-Str $pnX),
        (Sql-Str $anX),
        (Sql-Str $mnX),
        'NULL',
        'NULL',
        'NULL',
        (Sql-Str 'OK'),
        1,
        (Sql-Str $planName),
        'NULL',
        (Sql-Str $testStatus),
        'NULL',
        $lastTestSql,
        'NULL','NULL','NULL','NULL','NULL','NULL','NULL','NULL','NULL'
    ))
    $script:SeenAu[$dkey] = $true
    $script:DraasMatched[$dkey] = $true
    $extra++
  }
  Write-Log ('DRaaS leftover recovery rows=' + $extra)
}

if ($values.Count -eq 0) { throw 'No device rows built for SQL insert' }
Write-Log ("Rows to insert=" + $values.Count)
# Diagnostic: first device with Recovery Testing plan
foreach ($row in $allRows) {
  $i80s = Get-Setting $row 'I80'
  if ("$i80s" -eq '1' -or "$i80s" -eq '2') {
    Write-Log ("Recovery sample AN=" + (Get-Setting $row 'AN') + " I80=" + $i80s + " I81=" + (Get-Setting $row 'I81') + " RT0=" + (Get-Setting $row 'RT0') + " RT1=" + (Get-Setting $row 'RT1') + " RT2=" + (Get-Setting $row 'RT2') + " I84=" + (Get-Setting $row 'I84') + " RVO=" + (Get-Setting $row 'RVO'))
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
  RecoveryPlanLabel nvarchar(120) NULL,
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
OUTER APPLY (
  SELECT TOP 1 x.CustomerCode
  FROM dbo.Dim_Cove_PartnerMap AS x
  WHERE x.Active = 1 AND (
    x.PartnerName = c.PartnerName
    OR (
      LEN(LTRIM(RTRIM(ISNULL(x.PartnerName, N'')))) >= 3
      AND NULLIF(LTRIM(RTRIM(c.PartnerName)), N'') IS NOT NULL
      AND (
        c.PartnerName LIKE x.PartnerName + N'%'
        OR x.PartnerName LIKE c.PartnerName + N'%'
      )
    )
  )
  ORDER BY CASE WHEN x.PartnerName = c.PartnerName THEN 0 ELSE 1 END, LEN(x.PartnerName) DESC
) m;

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

# Schema (530/464/466) is applied by Apply-UiPack as Windows admin. Collect only stamps.
if ($script:RtPatch -and $script:RtPatch.Count -gt 0) {
  $up = New-Object System.Text.StringBuilder
  [void]$up.AppendLine('SET NOCOUNT ON;')
  $nUp = 0
  foreach ($p in $script:RtPatch) {
    if (-not $p.ColorBar -and -not $p.RecStatus -and -not $p.Boot -and $p.LastCompleted -eq 'NULL' -and -not $p.ShotPath) { continue }
    $nUp++
    $set = @()
    if ($p.ColorBar) { $set += ('RecoveryColorBar = ' + (Sql-Str $p.ColorBar)) }
    if ($p.RecStatus) { $set += ('RecoveryStatus = ' + (Sql-Str $p.RecStatus)) }
    if ($null -ne $p.Errors) { $set += ('RecoveryErrors = ' + [int]$p.Errors) }
    if ($p.LastCompleted -and $p.LastCompleted -ne 'NULL') { $set += ('LastCompletedSessionAt = ' + $p.LastCompleted); $set += ('LastRecoveryTestAt = COALESCE(LastRecoveryTestAt, ' + $p.LastCompleted + ')') }
    if ($p.BackupSession -and $p.BackupSession -ne 'NULL') { $set += ('BackupSessionAt = ' + $p.BackupSession) }
    if ($null -ne $p.DurSec) { $set += ('RecoveryDurationSec = ' + [int]$p.DurSec) }
    if ($p.DurLabel) { $set += ('RecoveryDurationLabel = ' + (Sql-Str $p.DurLabel)) }
    if ($p.Boot) { $set += ('BootStatus = ' + (Sql-Str $p.Boot)) }
    if ($p.SessId) { $set += ('RecoverySessionId = ' + (Sql-Str $p.SessId)) }
    if ($null -ne $p.Shot) { $set += ('ScreenshotPresented = ' + [int]$p.Shot) }
    if ($p.ShotPath) { $set += ('ScreenshotPath = ' + (Sql-Str $p.ShotPath)) }
    if ($p.PlanLabel) { $set += ('RecoveryPlanLabel = ' + (Sql-Str $p.PlanLabel)) }
    if ($p.TestStatus) { $set += ('RecoveryTestStatus = ' + (Sql-Str $p.TestStatus)) }
    if ($set.Count -eq 0) { continue }
    $namePred = ''
    if ($p.DeviceName) { $namePred += ' OR DeviceName = ' + (Sql-Str $p.DeviceName) }
    if ($p.MachineName) { $namePred += ' OR MachineName = ' + (Sql-Str $p.MachineName) }
    $ck = [string]$p.CompactKey
    if ([string]::IsNullOrWhiteSpace($ck)) { $ck = Compact-CoveName ([string]$p.DeviceName + ' ' + [string]$p.MachineName) }
    if ($ck.Length -ge 8) {
      $namePred += " OR REPLACE(REPLACE(LOWER(ISNULL(DeviceName,N'') + ISNULL(MachineName,N'')), N'_', N''), N'-', N'') LIKE N'%" + $ck + "%'"
    }
    [void]$up.AppendLine(('UPDATE dbo.Cove_DeviceStatistics SET ' + ($set -join ', ') + ' WHERE SnapshotDate = ''' + $snap + ''' AND (AccountId = ' + $p.AccountId + $namePred + ');'))
  }
  Write-Log ('DRaaS overlay updates=' + $nUp)
  if ($nUp -gt 0) {
    try { Invoke-SqlFile -SqlText $up.ToString() -Label 'cove_rt_overlay' } catch { Write-Log ('rt overlay warn ' + $_.Exception.Message) }
  }
}

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
$restamp = Join-Path $here '465_Restamp_Cove_All_Customers.sql'
if (Test-Path -LiteralPath $restamp) {
  Write-Log 'Running 465 restamp all customers...'
  try {
    Invoke-SqlFile -SqlText ([IO.File]::ReadAllText($restamp)) -Label 'restamp465'
  } catch {
    Write-Log ('465 restamp warning: ' + $_.Exception.Message)
  }
}

try {
  Invoke-SqlFile -SqlText 'EXEC dbo.usp_RefreshExternalIdentityFromMaps; EXEC dbo.usp_StampCoveFromIdentity;' -Label 'identity_stamp'
  Write-Log 'Identity stamp OK'
} catch {
  Write-Log ('identity stamp warn ' + $_.Exception.Message)
}

try {
  if ($script:DraasByAu -and $script:DraasByAu.Count -gt 0) {
    $bronze = New-Object System.Collections.Generic.List[object]
    foreach ($kv in @($script:DraasByAu.GetEnumerator())) {
      $it = $kv.Value
      [void]$bronze.Add([ordered]@{
        id = [string]$kv.Key
        name = [string](Draas-Attr $it 'backup_cloud_device_name')
        partner = [string](Draas-Attr $it 'backup_cloud_partner_name')
        plan = [string](Draas-Attr $it 'plan_name')
        freq = [string](Draas-Attr $it 'device_recovery_frequency')
        bar = ColorBar-Text (Draas-AttrRaw $it 'colorbar')
        status = [string](Draas-Attr $it 'last_recovery_status')
        boot = [string](Draas-Attr $it 'last_boot_test_status')
        duration = [string](Draas-Attr $it 'last_recovery_duration_user')
        errors = [string](Draas-Attr $it 'last_recovery_errors_count')
        last = [string](Draas-Attr $it 'last_recovery_timestamp')
        shot = [string](Draas-Attr $it 'last_boot_test_screenshot_presented')
      })
    }
    $rawJson = $bronze | ConvertTo-Json -Compress -Depth 6
    $jsonText = ''
    if ($rawJson -is [System.Array]) {
      $sb = New-Object System.Text.StringBuilder
      foreach ($p in $rawJson) { [void]$sb.Append([string]$p) }
      $jsonText = $sb.ToString()
    } else {
      $jsonText = [string]$rawJson
    }
    if ($jsonText.Length -gt 400000) { $jsonText = $jsonText.Substring(0, 400000) }
    $esc = $jsonText.Replace("'", "''")
    Invoke-SqlFile -SqlText ("SET NOCOUNT ON; IF OBJECT_ID(N'dbo.Cove_Raw', N'U') IS NOT NULL INSERT INTO dbo.Cove_Raw (Kind, Payload) VALUES (N'draas-dashboard', N'$esc');") -Label 'cove_raw'
    Write-Log ('bronze draas rows=' + $bronze.Count + ' jsonChars=' + $jsonText.Length)
  }
} catch {
  Write-Log ('bronze warn ' + $_.Exception.Message)
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


