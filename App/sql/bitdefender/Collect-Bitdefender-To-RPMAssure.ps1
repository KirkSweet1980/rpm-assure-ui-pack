# Collect Bitdefender GravityZone endpoints → RPMAssure_App (EPP pillar)
# Auth: Basic base64(ApiKey + ":")
# Map: Dim_Bitdefender_NameMap patterns against Name+Fqdn; optional default RPMINT for staff

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$cfg = $null
foreach ($c in @(
    (Join-Path $here 'Bitdefender.Config.ps1'),
    'C:\RPM-Assure\Sql\bitdefender\Bitdefender.Config.ps1',
    'C:\RPM-Assure\deploy\ui-pack\Sql\bitdefender\Bitdefender.Config.ps1'
  )) {
  if (Test-Path -LiteralPath $c) { $cfg = $c; break }
}
if (-not $cfg) { throw 'Missing Bitdefender.Config.ps1 - copy Bitdefender.Config.example.ps1 next to the collector and set $ApiKey' }
. $cfg

# Optional SQL overrides in config; else local instance (do not use public 14333)
if (-not $SqlServer -or $SqlServer -match '14333|102\.222\.21\.220') {
  if (Get-Service -Name 'MSSQL$RPMREPORTS' -ErrorAction SilentlyContinue) { $SqlServer = '.\RPMREPORTS' }
}
if (-not $SqlServer)   { $SqlServer = '.\RPMREPORTS' }
if (-not $SqlDatabase) { $SqlDatabase = 'RPMAssure_App' }
if (-not $SqlUser)     { $SqlUser = 'Rpm_collect' }
if (-not $SqlPassword) { $SqlPassword = 'RpmCollect#AHIC2026' }
if (-not $DefaultUnmappedCode) { $DefaultUnmappedCode = '' } # set 'RPMINT' to stamp staff devices

if ([string]::IsNullOrWhiteSpace($ApiKey) -or $ApiKey -like 'PASTE*') { throw 'Set $ApiKey in Bitdefender.Config.ps1' }
if ([string]::IsNullOrWhiteSpace($AccessUrl)) { $AccessUrl = 'https://cloud.gravityzone.bitdefender.com' }
$AccessUrl = $AccessUrl.TrimEnd('/')
$baseApi = if ($AccessUrl -match '/api$') { $AccessUrl } else { $AccessUrl + '/api' }

$logDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("bd_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))
$script:RpcId = 0

function Write-Log {
  param([AllowEmptyString()][AllowNull()]$m)
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), [string]$m)
  Add-Content -LiteralPath $log -Value $line -ErrorAction SilentlyContinue
  Write-Host $line
}

function Get-AuthHeader {
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($ApiKey + ':')))
  return ('Basic ' + $b64)
}

function ConvertTo-Text($c) {
  if ($null -eq $c) { return '' }
  if ($c -is [string]) { return $c }
  if ($c -is [byte[]]) { return [Text.Encoding]::UTF8.GetString($c) }
  try { return [Text.Encoding]::UTF8.GetString([byte[]]$c) } catch { return [string]$c }
}

function Find-Sqlcmd {
  $c = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $paths = @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
  )
  foreach ($p in $paths) { if (Test-Path $p) { return $p } }
  throw 'sqlcmd not found'
}

function Invoke-SqlText {
  param(
    [AllowEmptyString()][AllowNull()]$SqlText,
    [AllowEmptyString()][AllowNull()]$Label = 'sql'
  )
  if ([string]::IsNullOrWhiteSpace([string]$SqlText)) { throw 'Invoke-SqlText empty SQL' }
  $sqlcmd = Find-Sqlcmd
  $tag = if ([string]::IsNullOrWhiteSpace([string]$Label)) { 'sql' } else { ([string]$Label -replace '[^\w\-]', '_') }
  $f = Join-Path $logDir ("{0}_{1:yyyyMMdd_HHmmss}.sql" -f $tag, (Get-Date))
  [IO.File]::WriteAllText($f, [string]$SqlText, [Text.UTF8Encoding]::new($false))
  Write-Log ("SQL " + $tag + " -> " + $f)
  $a = @('-S', $SqlServer, '-d', $SqlDatabase, '-C', '-b', '-i', $f)
  if ($SqlUser -and $SqlPassword) { $a = @('-S', $SqlServer, '-d', $SqlDatabase, '-U', $SqlUser, '-P', $SqlPassword, '-C', '-b', '-i', $f) }
  else { $a = @('-S', $SqlServer, '-d', $SqlDatabase, '-E', '-C', '-b', '-i', $f) }
  & $sqlcmd @a
  if ($LASTEXITCODE -ne 0) { throw ("sqlcmd failed " + $LASTEXITCODE + " on " + $tag) }
}

function Invoke-GzRpc {
  param(
    [AllowEmptyString()][string]$Service = 'network',
    [AllowEmptyString()][string]$Method = 'getEndpointsList',
    [hashtable]$Params = @{},
    [AllowEmptyString()][string]$ApiVersion = 'v1.0'
  )
  $script:RpcId++
  $uri = '{0}/{1}/jsonrpc/{2}' -f $baseApi, $ApiVersion, $Service
  $body = (@{
      jsonrpc = '2.0'
      id      = [string]$script:RpcId
      method  = $Method
      params  = $Params
    } | ConvertTo-Json -Depth 12 -Compress)
  try {
    $resp = Invoke-WebRequest -Uri $uri -Method POST -Headers @{
      Authorization  = (Get-AuthHeader)
      'Content-Type' = 'application/json'
    } -Body $body -UseBasicParsing -TimeoutSec 90
    return (ConvertTo-Text $resp.Content)
  } catch {
    $errBody = ''
    try {
      if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $errBody = $reader.ReadToEnd()
        }
      }
    } catch {}
    if ($errBody) { return $errBody }
    return (@{ jsonrpc='2.0'; id=[string]$script:RpcId; error=@{ message=$_.Exception.Message } } | ConvertTo-Json -Compress)
  }
}

function Sql-Str {
  param($s)
  if ($null -eq $s) { return 'NULL' }
  $t = [string]$s
  if ($t -eq '') { return 'NULL' }
  return ("N'{0}'" -f ($t.Replace("'", "''")))
}

function Sql-Bit($v) {
  if ($null -eq $v) { return 'NULL' }
  if ($v -eq $true -or "$v" -eq '1' -or "$v" -eq 'True') { return '1' }
  return '0'
}

function Sql-Int($v) {
  if ($null -eq $v -or "$v" -eq '') { return 'NULL' }
  try {
    $n = [int64]$v
    return [string]$n
  } catch {
    return 'NULL'
  }
}

function Sql-Dt($v) {
  if ($null -eq $v -or "$v" -eq '') { return 'NULL' }
  try {
    if ($v -is [datetime]) {
      $dto = [datetime]$v
      if ($dto.Kind -eq [DateTimeKind]::Local) { $dto = $dto.ToUniversalTime() }
      elseif ($dto.Kind -eq [DateTimeKind]::Unspecified) {
        $dto = [datetime]::SpecifyKind($dto, [DateTimeKind]::Utc)
      }
      return ("'{0:yyyy-MM-ddTHH:mm:ss}'" -f $dto)
    }
    $s = ([string]$v).Trim()
    if ($s -match '^\d{10,13}(\.\d+)?$') {
      $n = [int64][double]$s
      if ($n -gt 20000000000) { $n = [int64]($n / 1000) }
      $dto = [datetime]::SpecifyKind(([datetime]'1970-01-01'), [DateTimeKind]::Utc).AddSeconds($n)
      return ("'{0:yyyy-MM-ddTHH:mm:ss}'" -f $dto)
    }
    $dto = [datetime]::Parse($s, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AdjustToUniversal -bor [Globalization.DateTimeStyles]::AssumeUniversal)
    return ("'{0:yyyy-MM-ddTHH:mm:ss}'" -f $dto.ToUniversalTime())
  } catch {
    try {
      $dto = [datetime]::Parse("$v", [Globalization.CultureInfo]::CurrentCulture, [Globalization.DateTimeStyles]::AssumeLocal)
      return ("'{0:yyyy-MM-ddTHH:mm:ss}'" -f $dto.ToUniversalTime())
    } catch { return 'NULL' }
  }
}

function Get-EppScanInfo($obj) {
  $out = @{ Date = $null; Name = $null }
  if ($null -eq $obj) { return $out }
  $scan = $null
  try { $scan = $obj.lastSuccessfulScan } catch { $scan = $null }
  if ($null -eq $scan) {
    try { $scan = $obj.LastSuccessfulScan } catch { $scan = $null }
  }
  if ($null -eq $scan) { return $out }
  if ($scan -is [datetime] -or ($scan -is [string] -and "$scan")) {
    $out.Date = $scan
    return $out
  }
  try { if ($scan.date) { $out.Date = $scan.date } } catch {}
  try { if (-not $out.Date -and $scan.timestamp) { $out.Date = $scan.timestamp } } catch {}
  try { if ($scan.name) { $out.Name = [string]$scan.name } } catch {}
  return $out
}

Write-Log '=== Bitdefender EPP collect start ==='
Write-Log ("SQL=" + $SqlServer + " / " + $SqlDatabase)
Write-Log ("API=" + $baseApi)

# Schema must already exist (Apply-Bitdefender-450 as admin). Soft re-seed map only.
$seedMap = @'
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NULL
BEGIN
  RAISERROR(N'Dim_Bitdefender_NameMap missing - run 450 as SQL admin first.', 16, 1);
  RETURN;
END
-- Soft seed: insert missing patterns only (no MERGE multi-match)
;WITH src AS (
  SELECT * FROM (VALUES
  (N'AHIC', N'AHIC', N'Prefix', 10, N'AHI'),
  (N'ahi-carrier', N'AHIC', N'Contains', 20, N'FQDN'),
  (N'HYDRA', N'HYDRA', N'Prefix', 10, N'Hydra'),
  (N'HYDRASRV', N'HYDRA', N'Prefix', 8, N'HYDRASRV'),
  (N'RSR', N'RSR', N'Prefix', 12, N'Redsun'),
  (N'RSR-', N'RSR', N'Prefix', 10, N'Redsun Raisins'),
  (N'REDSUN', N'RSR', N'Contains', 20, N'Redsun'),
  (N'UVSS', N'UVSS', N'Prefix', 10, N'UVSS'),
  (N'RPM', N'RPMINT', N'Prefix', 28, N'RPM hosts'),
  (N'RPM-', N'RPMINT', N'Prefix', 10, N'RPM Resources servers'),
  (N'rpmresources', N'RPMINT', N'Contains', 20, N'RPM FQDN'),
  (N'RPMWINRM', N'RPMINT', N'Prefix', 10, N'Central winrm'),
  (N'RPMPET', N'RPMINT', N'Prefix', 8, N'rpmpet'),
  (N'LUKERPM', N'RPMINT', N'Prefix', 30, N'RPM staff'),
  (N'METSI', N'METSI', N'Prefix', 10, N'Metsi'),
  (N'ABLE', N'ABLE', N'Prefix', 10, N'Able Tracers'),
  (N'AT-', N'ABLE', N'Prefix', 15, N'AT-SERVER'),
  (N'RSS', N'RSS', N'Prefix', 12, N'RSS'),
  (N'RSS-', N'RSS', N'Prefix', 10, N'Remote Site Solutions'),
  (N'PCNS', N'BHF', N'Prefix', 10, N'BHF / PCNS'),
  (N'BHF', N'BHF', N'Prefix', 15, N'BHF'),
  (N'SBS', N'SBS', N'Prefix', 12, N'SBS'),
  (N'SBS-', N'SBS', N'Prefix', 10, N'Simply Bright'),
  (N'SIMPLY', N'SBS', N'Contains', 20, N'Simply Bright'),
  (N'KIRK', N'RPMINT', N'Prefix', 5, N'staff'),
  (N'ADELE', N'RPMINT', N'Prefix', 5, N'staff'),
  (N'VTSERVER', N'VAULT', N'Exact', 1, N'Vault Tech VTSERVER')
  ) AS v(Pattern, CustomerCode, MatchType, Priority, Notes)
)
INSERT INTO dbo.Dim_Bitdefender_NameMap (Pattern, CustomerCode, MatchType, Priority, Notes, Active)
SELECT s.Pattern, s.CustomerCode, s.MatchType, s.Priority, s.Notes, 1
FROM src s
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.Dim_Bitdefender_NameMap t
  WHERE t.Pattern = s.Pattern AND t.CustomerCode = s.CustomerCode
);
'@
try {
  Invoke-SqlText -SqlText $seedMap -Label 'bd_seed_map'
} catch {
  Write-Log ("WARN seed map: " + $_.Exception.Message)
}

# Load name map from SQL
$mapSql = @'
SET NOCOUNT ON;
SELECT Pattern, CustomerCode, MatchType, Priority
FROM dbo.Dim_Bitdefender_NameMap WITH (NOLOCK)
WHERE Active = 1
ORDER BY Priority ASC, Pattern ASC;
'@
$mapFile = Join-Path $logDir 'name_map_query.sql'
[IO.File]::WriteAllText($mapFile, $mapSql, [Text.UTF8Encoding]::new($false))
$sqlcmd = Find-Sqlcmd
$mapRaw = & $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -h -1 -W -s '|' -i $mapFile 2>&1 | Out-String
$maps = New-Object System.Collections.Generic.List[object]
foreach ($line in ($mapRaw -split "`r?`n")) {
  if ($line -notmatch '\|') { continue }
  if ($line -match 'Pattern|rows affected|---') { continue }
  $parts = $line.Split('|')
  if ($parts.Count -lt 3) { continue }
  $maps.Add([pscustomobject]@{
      Pattern      = $parts[0].Trim()
      CustomerCode = $parts[1].Trim()
      MatchType    = $parts[2].Trim()
      Priority     = if ($parts.Count -gt 3) { [int]($parts[3].Trim()) } else { 100 }
    })
}
Write-Log ("Name map rules=" + $maps.Count)

# Company map (MSP)
$coMapSql = @'
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NULL RETURN;
SELECT CompanyName, CustomerCode, MatchType, Priority, ISNULL(CompanyId,N'')
FROM dbo.Dim_Bitdefender_CompanyMap WITH (NOLOCK)
WHERE Active = 1
ORDER BY Priority ASC;
'@
$coMaps = New-Object System.Collections.Generic.List[object]
try {
  $coFile = Join-Path $logDir 'co_map_query.sql'
  [IO.File]::WriteAllText($coFile, $coMapSql, [Text.UTF8Encoding]::new($false))
  $coRaw = & $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -h -1 -W -s '|' -i $coFile 2>&1 | Out-String
  foreach ($line in ($coRaw -split "`r?`n")) {
    if ($line -notmatch '\|') { continue }
    if ($line -match 'CompanyName|rows affected|---') { continue }
    $parts = $line.Split('|')
    if ($parts.Count -lt 2) { continue }
    $coMaps.Add([pscustomobject]@{
        CompanyName  = $parts[0].Trim()
        CustomerCode = $parts[1].Trim()
        MatchType    = if ($parts.Count -gt 2) { $parts[2].Trim() } else { 'Contains' }
        Priority     = if ($parts.Count -gt 3) { [int]($parts[3].Trim()) } else { 100 }
        CompanyId    = if ($parts.Count -gt 4) { $parts[4].Trim() } else { '' }
      })
  }
} catch {
  Write-Log ("Company map soft-fail: " + $_.Exception.Message)
}
Write-Log ("Company map rules=" + $coMaps.Count)

function Resolve-CompanyCode {
  param($CompanyName)
  if ([string]::IsNullOrWhiteSpace([string]$CompanyName)) { return $null }
  if ($CompanyName -eq '(api-key-company)') { return $null }
  $hay = $CompanyName.ToUpperInvariant()
  # Exact SQL map first (priority order already sorted)
  foreach ($m in $coMaps) {
    $pat = $m.CompanyName.ToUpperInvariant()
    $mt = if ($m.MatchType) { $m.MatchType } else { 'Contains' }
    if ($mt -eq 'Exact') {
      if ($hay -eq $pat) { return $m.CustomerCode }
    }
  }
  foreach ($m in $coMaps) {
    $pat = $m.CompanyName.ToUpperInvariant()
    $mt = if ($m.MatchType) { $m.MatchType } else { 'Contains' }
    if ($mt -ne 'Exact') {
      # Never use inverted Contains (short hay matching long pat)
      if ($pat.Length -ge 3 -and $hay.Contains($pat)) { return $m.CustomerCode }
    }
  }
  # fallbacks for GZ inventory names
  if ($hay -match 'ABLE') { return 'ABLE' }
  if ($hay -match 'AHI|CARRIER') { return 'AHIC' }
  if ($hay -match 'BHF|PCNS|HEALTHCARE|FUNDER') { return 'BHF' }
  if ($hay -match 'HYDRA') { return 'HYDRA' }
  if ($hay -match 'MEDIPOS|MEDIPOS') { return 'MEDIPOS' }
  if ($hay -match 'METSI') { return 'METSI' }
  if ($hay -match 'REDSUN|RSR') { return 'RSR' }
  if ($hay -match '\bRSS\b|REMOTE.?SITE') { return 'RSS' }
  if ($hay -match 'UVSS|VENTILATION') { return 'UVSS' }
  if ($hay -match '\bYLJ\b') { return 'YLJ' }
  if ($hay -match 'SIMPLY|SBS') { return 'SBS' }
  if ($hay -match 'RPM INTERNAL|RPM RESOURCES') { return 'RPMINT' }
  return $null
}

function Resolve-CustomerCode {
  param($Name, $Fqdn)
  # Returns @{ Code = ...; Priority = n } or $null. Lower Priority = stronger.
  $n = ([string]$Name).ToUpperInvariant()
  $f = ([string]$Fqdn).ToUpperInvariant()
  $hay = ($n + ' ' + $f).Trim()
  foreach ($m in $maps) {
    $pat = $m.Pattern.ToUpperInvariant()
    if ([string]::IsNullOrWhiteSpace($pat)) { continue }
    # Guard: very short patterns (1-2 chars) only Exact
    if ($pat.Length -lt 3 -and $m.MatchType -ne 'Exact') { continue }
    $mt = $m.MatchType
    $hit = $false
    if ($mt -eq 'Exact') {
      if ($n -eq $pat -or $f -eq $pat) { $hit = $true }
      # strip MAC suffix DEVICE-xxxxxxxxxxxx
      if (-not $hit -and $n -match '^(.+)-[0-9A-F]{12}$') {
        if ($Matches[1] -eq $pat) { $hit = $true }
      }
    } elseif ($mt -eq 'Prefix') {
      # True prefix only on device name / FQDN start (not mid-string Contains)
      if ($n.StartsWith($pat) -or $f.StartsWith($pat)) { $hit = $true }
      # Allow token after separator: FOO-RSR-01, but not mid-token (VTSERVER must not match RSR)
      if (-not $hit -and $hay -match ("(?:^|[^A-Z0-9])" + [regex]::Escape($pat) + "(?:[^A-Z0-9]|$)")) {
        $hit = $true
      }
    } else {
      # Contains: require pattern length >= 4 to avoid false hits
      if ($pat.Length -ge 4 -and $hay.Contains($pat)) { $hit = $true }
    }
    if ($hit) {
      return @{ Code = $m.CustomerCode; Priority = [int]$m.Priority }
    }
  }
  # Soft heuristics (weak priority 90)
  $soft = $null
  if ($hay -match 'AHI|CARRIER') { $soft = 'AHIC' }
  elseif ($hay -match 'BHF|PCNS|HEALTHCARE|FUNDERS') { $soft = 'BHF' }
  elseif ($hay -match 'HYDRA') { $soft = 'HYDRA' }
  elseif ($hay -match 'REDSUN|(?:^|[^A-Z0-9])RSR(?:[^A-Z0-9]|$)|RSR-') { $soft = 'RSR' }
  elseif ($hay -match 'REMOTE.?SITE|(?:^|[^A-Z0-9])RSS(?:[^A-Z0-9]|$)|RSS-') { $soft = 'RSS' }
  elseif ($hay -match 'UVSS|VENTILATION') { $soft = 'UVSS' }
  elseif ($hay -match 'ABLE|(?:^|[^A-Z0-9])AT-') { $soft = 'ABLE' }
  elseif ($hay -match '(?:^|[^A-Z0-9])VTSERVER') { $soft = 'VAULT' }
  elseif ($hay -match '(?:^|[^A-Z0-9])RPM|RPMPET|RPMWINRM|LUKERPM|RPMRESOURCES') { $soft = 'RPMINT' }
  elseif ($hay -match 'SIMPLY|(?:^|[^A-Z0-9])SBS(?:[^A-Z0-9]|$)|SBS-') { $soft = 'SBS' }
  elseif ($hay -match 'METSI') { $soft = 'METSI' }
  elseif ($hay -match 'MEDIPOS') { $soft = 'MEDIPOS' }
  elseif ($hay -match 'INTERBRAND') { $soft = 'IB' }
  elseif ($hay -match 'VAULT') { $soft = 'VAULT' }
  elseif ($hay -match '(?:^|[^A-Z0-9])YLJ(?:[^A-Z0-9]|$)') { $soft = 'YLJ' }
  elseif ($DefaultUnmappedCode) { $soft = $DefaultUnmappedCode }
  if ($soft) { return @{ Code = $soft; Priority = 90 } }
  return $null
}

function Resolve-EndpointCode([string]$Name, [string]$Fqdn, [string]$CompanyName) {
  # Hostname map wins over company map when host matched with Priority <= 50.
  # Company only used for generic desktops under a customer company tree.
  $hostHit = Resolve-CustomerCode $Name $Fqdn
  $coCode = Resolve-CompanyCode $CompanyName
  if ($hostHit -and [int]$hostHit.Priority -le 50) {
    return [string]$hostHit.Code
  }
  if ($coCode) { return $coCode }
  if ($hostHit) { return [string]$hostHit.Code }
  return $null
}

# Discover companies (MSP multi-tenant) - page until short
$companyTargets = New-Object System.Collections.Generic.List[object]
try {
  $pg = 1; $pages = 1
  do {
    $rawCo = Invoke-GzRpc -Service 'companies' -Method 'getCompaniesList' -Params @{ page = $pg; perPage = 50 }
    if ($pg -eq 1) {
      [IO.File]::WriteAllText((Join-Path $logDir 'last_companies.json'), $rawCo, [Text.UTF8Encoding]::new($false))
    }
    if ($rawCo -match '"error"\s*:\s*\{') {
      Write-Log ("getCompaniesList: " + $rawCo.Substring(0, [Math]::Min(160, $rawCo.Length)))
      break
    }
    $jo = $rawCo | ConvertFrom-Json
    $items = @()
    if ($jo.result.items) { $items = @($jo.result.items) }
    elseif ($jo.result -is [System.Array]) { $items = @($jo.result) }
    if ($jo.result.pagesCount) { $pages = [int]$jo.result.pagesCount }
    if ($pages -lt 1) { $pages = 1 }
    foreach ($it in $items) {
      if ($it.id) {
        $companyTargets.Add([pscustomobject]@{ Id = [string]$it.id; Name = [string]$it.name })
        Write-Log ("Company list: " + $it.name + " id=" + $it.id)
      }
    }
    if ($items.Count -lt 50) { break }
    $pg++
  } while ($pg -le $pages -and $pg -le 40)
} catch {
  Write-Log ("getCompaniesList soft-fail: " + $_.Exception.Message)
}

# Inventory Companies folder
try {
  $rawRoot = Invoke-GzRpc -Service 'network' -Method 'getNetworkInventoryItems' -Params @{ page = 1; perPage = 50 }
  $jo = $rawRoot | ConvertFrom-Json
  $cfId = $null
  foreach ($it in @($jo.result.items)) {
    if ([string]$it.name -eq 'Companies') { $cfId = [string]$it.id }
  }
  if ($cfId) {
    $ipg = 1; $ipages = 1
    do {
      $rawKids = Invoke-GzRpc -Service 'network' -Method 'getNetworkInventoryItems' -Params @{ parentId = $cfId; page = $ipg; perPage = 100 }
      if ($rawKids -match '"error"\s*:\s*\{') { break }
      $jk = $rawKids | ConvertFrom-Json
      if ($jk.result.pagesCount) { $ipages = [int]$jk.result.pagesCount }
      if ($ipages -lt 1) { $ipages = 1 }
      $kids = @($jk.result.items)
      foreach ($it in $kids) {
        if ($it.id -and $it.name) {
          $companyTargets.Add([pscustomobject]@{ Id = [string]$it.id; Name = [string]$it.name })
          Write-Log ("Inventory company: " + $it.name + " id=" + $it.id)
        }
      }
      if ($kids.Count -lt 100) { break }
      $ipg++
    } while ($ipg -le $ipages -and $ipg -le 20)
  }
} catch {
  Write-Log ("inventory companies soft-fail: " + $_.Exception.Message)
}

# Always include flat (API key company) as empty parentId
$companyTargets.Add([pscustomobject]@{ Id = ''; Name = '(api-key-company)' })

# Fetch endpoints per company + flat; dedupe by endpoint id
$epBag = @{}  # id -> @{ ep; companyId; companyName }
foreach ($co in $companyTargets) {
  $page = 1; $pages = 1
  do {
    try {
      $params = @{ page = $page; perPage = 100; options = @{ includeScanLogs = $true; returnProductOutdated = $true } }
      if ($co.Id) { $params['parentId'] = $co.Id }
      $raw = Invoke-GzRpc -Service 'network' -Method 'getEndpointsList' -Params $params
      if ($page -eq 1 -and -not $co.Id) {
        [IO.File]::WriteAllText((Join-Path $logDir 'last_endpoints.json'), $raw, [Text.UTF8Encoding]::new($false))
      }
      if ($raw -match '"error"') {
        if ($page -eq 1) { Write-Log ("getEndpointsList parent=$($co.Name) skip: " + $raw.Substring(0, [Math]::Min(100, $raw.Length))) }
        break
      }
      $eo = $raw | ConvertFrom-Json
      $pages = [int]$eo.result.pagesCount
      if ($pages -lt 1) { $pages = 1 }
      $got = @($eo.result.items).Count
      Write-Log ('Endpoints parent=' + [string]$co.Name + ' page=' + $page + '/' + $pages + ' got=' + $got + ' total=' + [string]$eo.result.total)
      foreach ($it in @($eo.result.items)) {
        $eid = [string]$it.id
        if (-not $eid) { continue }
        if (-not $epBag.ContainsKey($eid)) {
          $info = Get-EppScanInfo $it
          $outdated = $null
          try { if ($null -ne $it.productOutdated) { $outdated = [bool]$it.productOutdated } } catch {}
          $epBag[$eid] = @{
            Ep             = $it
            CompanyId      = $co.Id
            CompanyName    = $co.Name
            LastScan       = $info.Date
            ScanName       = $info.Name
            ProductOutdated = $outdated
          }
        } elseif ($co.Id -and -not $epBag[$eid].CompanyId) {
          $epBag[$eid].CompanyId = $co.Id
          $epBag[$eid].CompanyName = $co.Name
        }
      }
    } catch {
      Write-Log ("getEndpointsList parent=$($co.Name) err: " + $_.Exception.Message)
      break
    }
    $page++
  } while ($page -le $pages -and $page -le 80)
}

Write-Log ("Unique endpoints from API=" + $epBag.Count + " withScan=" + @($epBag.Values | Where-Object { $_.LastScan }).Count)
if ($epBag.Count -eq 0) { throw 'No endpoints from RPM EPP' }

# Collapse clean-name + name-MAC duplicates (same FQDN/IP) before SQL insert
function Get-EppIdentityKey($ep) {
  $fq = ([string]$ep.fqdn).Trim().ToLowerInvariant()
  if ($fq) { return ("fqdn:" + $fq) }
  $ip = ''
  if ($ep.ip) { $ip = ([string]$ep.ip).Trim() }
  if ($ip) { return ("ip:" + $ip) }
  $n = ([string]$ep.name)
  if ($n -match '-[0-9a-fA-F]{12}$') { $n = $n.Substring(0, $n.Length - 13) }
  if ($n) { return ("name:" + $n.ToLowerInvariant()) }
  return ("id:" + [string]$ep.id)
}
function Get-EppScore($ep) {
  $s = 0
  if ($ep.isManaged -eq $true) { $s += 20 }
  $pol = ''
  if ($ep.policy -and $ep.policy.name) { $pol = [string]$ep.policy.name }
  if ($pol -and ($pol -notmatch 'Default')) { $s += 12 }
  elseif ($pol) { $s += 2 }
  $n = [string]$ep.name
  if ($n -and ($n -notmatch '-[0-9a-fA-F]{12}$')) { $s += 10 }
  $s -= [Math]::Min($n.Length, 80) * 0.05
  return $s
}
$deduped = @{}
foreach ($eid in @($epBag.Keys)) {
  $bag = $epBag[$eid]
  $ep = $bag.Ep
  $key = Get-EppIdentityKey $ep
  if (-not $deduped.ContainsKey($key)) {
    $deduped[$key] = $bag
  } else {
    $prev = $deduped[$key]
    if ((Get-EppScore $ep) -ge (Get-EppScore $prev.Ep)) {
      # Keep new; maybe steal clean name / better policy from prev
      $pn = [string]$ep.name
      $on = [string]$prev.Ep.name
      if ($pn -match '-[0-9a-fA-F]{12}$' -and $on -and ($on -notmatch '-[0-9a-fA-F]{12}$')) {
        try { $ep.name = $on } catch {}
      }
      $deduped[$key] = $bag
    } else {
      $pn = [string]$prev.Ep.name
      $on = [string]$ep.name
      if ($pn -match '-[0-9a-fA-F]{12}$' -and $on -and ($on -notmatch '-[0-9a-fA-F]{12}$')) {
        try { $prev.Ep.name = $on } catch {}
      }
    }
  }
}
Write-Log ("After host de-dupe=" + $deduped.Count + " (removed " + ($epBag.Count - $deduped.Count) + " MAC twin rows)")
$epBag = $deduped

# Enrich managed endpoints: last scan, malware, outdated.
# Use GravityZone endpoint id (not the fqdn: de-dupe key).
# Parse JSON-RPC result (do NOT regex-match "error" - scan logs nest that word).
$detailCap = 400
$detailN = 0
$detailOk = 0
$detailErrLogged = 0
$detailSkip = 0
foreach ($key in @($epBag.Keys)) {
  $bag = $epBag[$key]
  $ep = $bag.Ep
  $gzId = [string]$ep.id
  if (-not $gzId) { $gzId = [string]$key }
  if ($ep.isManaged -ne $true) { $detailSkip++; continue }
  # List already has lastSuccessfulScan for most hosts — still pull details for malware/outdated.
  if ($detailN -ge $detailCap) { break }
  $detailN++
  try {
    $rawD = Invoke-GzRpc -Service 'network' -Method 'getManagedEndpointDetails' -Params @{
      endpointId = $gzId
      options    = @{ includeScanLogs = $true }
    }
    $det = $null
    try { $det = $rawD | ConvertFrom-Json } catch { $det = $null }
    if ($det -and $det.error) {
      $raw2 = Invoke-GzRpc -Service 'network' -Method 'getManagedEndpointDetails' -Params @{
        endpointId = $gzId
      }
      try { $det = $raw2 | ConvertFrom-Json } catch { $det = $null }
    }
    if (-not $det -or $det.error) {
      if ($detailErrLogged -lt 4) {
        $em = ''
        try { $em = [string]$det.error.message + ' ' + [string]$det.error.data.details } catch { $em = $rawD }
        if ($em.Length -gt 220) { $em = $em.Substring(0, 220) }
        Write-Log ("detail err id=$gzId $em")
        $detailErrLogged++
      }
      continue
    }
    $res = $det.result
    if (-not $res) { continue }
    $info = Get-EppScanInfo $res
    if ($info.Date) { $bag.LastScan = $info.Date }
    if ($info.Name) { $bag.ScanName = $info.Name }
    try {
      if ($res.lastSeen) { $bag.LastSeen = $res.lastSeen }
    } catch {}
    try {
      if ($null -ne $res.malwareStatus.detection) { $bag.MalwareDetected = [bool]$res.malwareStatus.detection }
      elseif ($null -ne $res.detection) { $bag.MalwareDetected = [bool]$res.detection }
    } catch {}
    try {
      if ($null -ne $res.malwareStatus.infected) { $bag.Infected = [bool]$res.malwareStatus.infected }
      elseif ($null -ne $res.infected) { $bag.Infected = [bool]$res.infected }
    } catch {}
    try {
      if ($null -ne $res.productOutdated) { $bag.ProductOutdated = [bool]$res.productOutdated }
    } catch {}
    try {
      if ($null -ne $res.signatureOutdated) { $bag.SignatureOutdated = [bool]$res.signatureOutdated }
    } catch {}
    $detailOk++
    Start-Sleep -Milliseconds 60
  } catch {
    Write-Log ("detail skip id=$gzId err=$($_.Exception.Message)")
  }
}
Write-Log ("Endpoint detail enrich tried=$detailN ok=$detailOk skipUnmanaged=$detailSkip withScan=" + @($epBag.Values | Where-Object { $_.LastScan }).Count)
if ($detailN -gt 0 -and $detailOk -eq 0) {
  Write-Log 'HINT: GravityZone API key needs Network (Computers) rights. In GZ: My Account → API keys → edit key → enable Network.'
}

$hasCoCols = $false
try {
  $colChk = @'
SET NOCOUNT ON;
SELECT CASE WHEN COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyName') IS NOT NULL THEN 1 ELSE 0 END;
'@
  $cf = Join-Path $logDir 'col_chk.sql'
  [IO.File]::WriteAllText($cf, $colChk, [Text.UTF8Encoding]::new($false))
  $cr = (& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -h -1 -W -i $cf 2>&1 | Out-String)
  if ($cr -match '1') { $hasCoCols = $true }
} catch {}
Write-Log ("Company columns on table=" + $hasCoCols)

try {
  Invoke-SqlText -SqlText @"
SET NOCOUNT ON;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSeenAt') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSeenAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSuccessfulScanAt') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSuccessfulScanAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSuccessfulScanName') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSuccessfulScanName nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'MalwareDetected') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD MalwareDetected bit NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'Infected') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD Infected bit NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'ProductOutdated') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD ProductOutdated bit NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'SignatureOutdated') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD SignatureOutdated bit NULL;
"@ -Label 'bd_endpoint_detail_cols'
} catch {
  Write-Log ("WARN detail cols (need ALTER rights): " + $_.Exception.Message)
}
$hasDetailCols = $false
try {
  $dcf = Join-Path $logDir 'detail_col_chk.sql'
  [IO.File]::WriteAllText($dcf, "SET NOCOUNT ON; SELECT CASE WHEN COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSeenAt') IS NOT NULL THEN 1 ELSE 0 END;", [Text.UTF8Encoding]::new($false))
  $dcr = (& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -h -1 -W -i $dcf 2>&1 | Out-String)
  if ($dcr -match '1') { $hasDetailCols = $true }
} catch {}
Write-Log ("Detail columns on table=" + $hasDetailCols)
$hasScanName = $false
try {
  $snf = Join-Path $logDir 'scan_name_col.sql'
  [IO.File]::WriteAllText($snf, "SET NOCOUNT ON; SELECT CASE WHEN COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSuccessfulScanName') IS NOT NULL THEN 1 ELSE 0 END;", [Text.UTF8Encoding]::new($false))
  $snr = (& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -h -1 -W -i $snf 2>&1 | Out-String)
  if ($snr -match '1') { $hasScanName = $true }
} catch {}
Write-Log ("Scan name column on table=" + $hasScanName)

$snap = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
$values = New-Object System.Collections.Generic.List[string]
$codeCounts = @{}
$unmapped = 0

foreach ($key in $epBag.Keys) {
  $bag = $epBag[$key]
  $ep = $bag.Ep
  $id = [string]$ep.id
  if (-not $id) { $id = [string]$key }
  $name = [string]$ep.name
  $fqdn = [string]$ep.fqdn
  $coName = [string]$bag.CompanyName
  if ($coName -eq '(api-key-company)') { $coName = '' }
  $coId = [string]$bag.CompanyId

  # Hostname high-confidence map wins; company is fallback (fixes VTSERVER under wrong co)
  $code = Resolve-EndpointCode $name $fqdn $coName

  if (-not $code) { $unmapped++; $codeKey = '(unmapped)' } else { $codeKey = $code }
  if (-not $codeCounts.ContainsKey($codeKey)) { $codeCounts[$codeKey] = 0 }
  $codeCounts[$codeKey]++

  $ip = ''
  if ($ep.ip) { $ip = [string]$ep.ip }
  $gid = ''
  if ($ep.groupId) { $gid = [string]$ep.groupId }
  $os = ''
  if ($ep.operatingSystemVersion) { $os = [string]$ep.operatingSystemVersion }
  $polId = ''; $polName = ''
  if ($ep.policy) {
    if ($ep.policy.id) { $polId = [string]$ep.policy.id }
    if ($ep.policy.name) { $polName = [string]$ep.policy.name }
  }
  $macs = ''
  if ($ep.macs) {
    try { $macs = (@($ep.macs) -join ',') } catch { $macs = [string]$ep.macs }
    if ($macs.Length -gt 400) { $macs = $macs.Substring(0, 400) }
  }

  $codeSql = if ($code) { Sql-Str $code } else { 'NULL' }
  $scanAtSql = Sql-Dt $bag.LastScan
  $scanNameSql = Sql-Str $bag.ScanName
  $seenSql = Sql-Dt $bag.LastSeen
  $malSql = Sql-Bit $bag.MalwareDetected
  $infSql = Sql-Bit $bag.Infected
  $prodSql = Sql-Bit $bag.ProductOutdated
  $sigSql = Sql-Bit $bag.SignatureOutdated
  $detailVals = if ($hasDetailCols) {
    if ($hasScanName) { ",$scanAtSql,$scanNameSql,$seenSql,$malSql,$infSql,$prodSql,$sigSql" }
    else { ",$scanAtSql,$seenSql,$malSql,$infSql,$prodSql,$sigSql" }
  } else { '' }
  if ($hasCoCols) {
    $values.Add((
      "({0},{1},{2},{3},{4},{5},{6},{7},{8},{9},{10},{11},{12},{13},{14}{15})" -f `
        ("'{0}'" -f $snap),
        (Sql-Str $id),
        $codeSql,
        (Sql-Str $name),
        (Sql-Str $fqdn),
        (Sql-Str $ip),
        (Sql-Str $gid),
        (Sql-Bit $ep.isManaged),
        (Sql-Int $ep.machineType),
        (Sql-Str $os),
        (Sql-Str $polId),
        (Sql-Str $polName),
        (Sql-Str $macs),
        (Sql-Str $coId),
        (Sql-Str $coName),
        $detailVals
    ))
  } else {
    $values.Add((
      "({0},{1},{2},{3},{4},{5},{6},{7},{8},{9},{10},{11},{12}{13})" -f `
        ("'{0}'" -f $snap),
        (Sql-Str $id),
        $codeSql,
        (Sql-Str $name),
        (Sql-Str $fqdn),
        (Sql-Str $ip),
        (Sql-Str $gid),
        (Sql-Bit $ep.isManaged),
        (Sql-Int $ep.machineType),
        (Sql-Str $os),
        (Sql-Str $polId),
        (Sql-Str $polName),
        (Sql-Str $macs),
        $detailVals
    ))
  }
}

Write-Log '--- Map counts ---'
foreach ($k in ($codeCounts.Keys | Sort-Object)) {
  Write-Log ("  " + $k + " n=" + $codeCounts[$k])
}
Write-Log ("Unmapped=" + $unmapped)

# License
try {
  $licRaw = Invoke-GzRpc -Service 'licensing' -Method 'getLicenseInfo' -Params @{}
  [IO.File]::WriteAllText((Join-Path $logDir 'last_license.json'), $licRaw, [Text.UTF8Encoding]::new($false))
  $lic = ($licRaw | ConvertFrom-Json).result
  $used = Sql-Int $lic.usedSlots
  $res = Sql-Int $lic.reservedSlots
  $tot = Sql-Int $lic.totalSlots
  $endSub = 'NULL'
  $exp = 'NULL'
  if ($lic.endSubscription) {
    try { $endSub = ("'{0}'" -f ([datetime]$lic.endSubscription).ToString('yyyy-MM-dd')) } catch {}
  }
  if ($lic.expiryDate) {
    try { $exp = ("'{0}'" -f ([datetime]$lic.expiryDate).ToString('yyyy-MM-dd')) } catch {}
  }
  $rawJson = Sql-Str ($(if ($licRaw.Length -gt 4000) { $licRaw.Substring(0, 4000) } else { $licRaw }))
  $licSql = @"
SET NOCOUNT ON;
MERGE dbo.Bitdefender_LicenseSnapshot AS t
USING (SELECT CAST('$snap' AS date) AS SnapshotDate) s ON t.SnapshotDate = s.SnapshotDate
WHEN MATCHED THEN UPDATE SET
  UsedSlots=$used, ReservedSlots=$res, TotalSlots=$tot,
  EndSubscription=$endSub, ExpiryDate=$exp, RawJson=$rawJson, ImportedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (SnapshotDate, UsedSlots, ReservedSlots, TotalSlots, EndSubscription, ExpiryDate, RawJson)
  VALUES (s.SnapshotDate, $used, $res, $tot, $endSub, $exp, $rawJson);
"@
  Invoke-SqlText -SqlText $licSql -Label 'bd_license'
  Write-Log ("License used=$($lic.usedSlots)/$($lic.totalSlots)")
} catch {
  Write-Log ("License soft-fail: " + $_.Exception.Message)
}

# --- Policies + installed modules (getPoliciesList / getPolicyDetails) ---
function Get-EppModulesJsonFromRaw([string]$raw) {
  $pairs = @(
    @{ k = 'antimalware'; l = 'Antimalware' },
    @{ k = 'firewall'; l = 'Firewall' },
    @{ k = 'contentControl'; l = 'Content Control' },
    @{ k = 'deviceControl'; l = 'Device Control' },
    @{ k = 'edrSensor'; l = 'EDR' },
    @{ k = 'edr'; l = 'EDR' },
    @{ k = 'networkSandboxing'; l = 'Sandbox Analyzer' },
    @{ k = 'encryption'; l = 'Disk Encryption' },
    @{ k = 'patchManagement'; l = 'Patch Management' },
    @{ k = 'integrityMonitor'; l = 'Integrity Monitor' },
    @{ k = 'exchange'; l = 'Exchange Protection' },
    @{ k = 'networkAttackDefense'; l = 'Network Attack Defense' },
    @{ k = 'indicatorsOfRisk'; l = 'Risk Management' },
    @{ k = 'liveSearch'; l = 'Live Search' },
    @{ k = 'PHASR'; l = 'PHASR' },
    @{ k = 'relay'; l = 'Relay' },
    @{ k = 'storageProtection'; l = 'Storage Protection' },
    @{ k = 'advancedThreatControl'; l = 'Advanced Threat Control' },
    @{ k = 'atc'; l = 'Advanced Threat Control' },
    @{ k = 'networkMonitor'; l = 'Network Monitor' },
    @{ k = 'hyperDetect'; l = 'HyperDetect' },
    @{ k = 'sandboxAnalyzer'; l = 'Sandbox Analyzer' }
  )
  $bits = New-Object System.Collections.Generic.List[string]
  $seen = @{}
  foreach ($p in $pairs) {
    $k = [string]$p.k
    if ($seen.ContainsKey($p.l)) { continue }
    if ($raw -notmatch ('"' + [regex]::Escape($k) + '"\s*:')) { continue }
    $on = $true
    if ($raw -match ('"' + [regex]::Escape($k) + '"\s*:\s*false')) { $on = $false }
    $seen[$p.l] = $true
    $en = 'true'
    if (-not $on) { $en = 'false' }
    $bits.Add(('{{"id":"{0}","label":"{1}","enabled":{2}}}' -f $k, $p.l, $en))
  }
  if ($bits.Count -eq 0) { return '[]' }
  return '[' + ($bits -join ',') + ']'
}

try {
  Invoke-SqlText -SqlText @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Bitdefender_Policies', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_Policies (
    SnapshotDate date NOT NULL,
    PolicyId nvarchar(40) NOT NULL,
    PolicyName nvarchar(200) NULL,
    CustomerCode nvarchar(50) NOT NULL,
    DeviceCount int NULL,
    ModulesJson nvarchar(max) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_BdPol_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_Policies PRIMARY KEY (SnapshotDate, PolicyId, CustomerCode)
  );
END
"@ -Label 'bd_policies_ddl'
} catch {
  Write-Log ("WARN policies ddl: " + $_.Exception.Message)
}

$policyById = @{}
try {
  $page = 1
  do {
    $rawP = Invoke-GzRpc -Service 'policies' -Method 'getPoliciesList' -Params @{ page = $page; perPage = 50 }
    if ($rawP -match '"error"\s*:\s*\{') {
      Write-Log ("getPoliciesList skip: " + $rawP.Substring(0, [Math]::Min(160, $rawP.Length)))
      break
    }
    $pj = $rawP | ConvertFrom-Json
    $items = @()
    if ($pj.result.items) { $items = @($pj.result.items) }
    elseif ($pj.result.result) { $items = @($pj.result.result) }
    elseif ($pj.result) { $items = @($pj.result) }
    Write-Log ("getPoliciesList page=$page n=$($items.Count)")
    foreach ($it in $items) {
      $gzPolId = [string]$it.id
      if (-not $gzPolId) { continue }
      $policyById[$gzPolId] = $it
    }
    $pages = 1
    try { if ($pj.result.pages) { $pages = [int]$pj.result.pages } } catch {}
    if ($page -ge $pages -or $items.Count -eq 0) { break }
    $page++
    if ($page -gt 20) { break }
  } while ($true)
} catch {
  Write-Log ("getPoliciesList fail: " + $_.Exception.Message)
}

# Also resolve policy ids from endpoints we already have
foreach ($eid in $epBag.Keys) {
  $ep = $epBag[$eid].Ep
  $gzPolId = ''
  if ($ep.policy -and $ep.policy.id) { $gzPolId = [string]$ep.policy.id }
  if ($gzPolId -and -not $policyById.ContainsKey($gzPolId)) {
    $policyById[$gzPolId] = [pscustomobject]@{ id = $gzPolId; name = $(if ($ep.policy.name) { $ep.policy.name } else { $gzPolId }) }
  }
}

$polDetails = @{}
foreach ($gzPolId in @($policyById.Keys)) {
  try {
    $rawD = Invoke-GzRpc -Service 'policies' -Method 'getPolicyDetails' -Params @{ policyId = [string]$gzPolId }
    $pre = $rawD
    if ($pre.Length -gt 180) { $pre = $pre.Substring(0, 180) }
    if ($rawD -match '"error"\s*:\s*\{') {
      Write-Log ("getPolicyDetails skip id=$gzPolId prefix=$pre")
      continue
    }
    $nm = ''
    $nmM = [regex]::Match($rawD, '"name"\s*:\s*"([^"]+)"')
    if ($nmM.Success) { $nm = $nmM.Groups[1].Value }
    if (-not $nm -and $policyById[$gzPolId].name) { $nm = [string]$policyById[$gzPolId].name }
    $modJson = Get-EppModulesJsonFromRaw $rawD
    $polDetails[$gzPolId] = [pscustomobject]@{ Name = $nm; ModulesJson = $modJson }
    Write-Log ("policy $nm modules=$modJson")
  } catch {
    Write-Log ("getPolicyDetails $gzPolId : " + $_.Exception.Message)
  }
}

# Map policy -> customer codes via endpoints
$polCust = @{}
foreach ($eid in $epBag.Keys) {
  $bag = $epBag[$eid]
  $ep = $bag.Ep
  $gzPolId = ''
  if ($ep.policy -and $ep.policy.id) { $gzPolId = [string]$ep.policy.id }
  $code = Resolve-EndpointCode ([string]$ep.name) ([string]$ep.fqdn) ([string]$bag.CompanyName)
  if (-not $gzPolId -or -not $code) { continue }
  $k = "$gzPolId|$code"
  if (-not $polCust.ContainsKey($k)) { $polCust[$k] = @{ PolicyId = $gzPolId; Code = $code; N = 0 } }
  $polCust[$k].N++
}

$polRows = New-Object System.Collections.Generic.List[string]
foreach ($k in $polCust.Keys) {
  $row = $polCust[$k]
  $det = $polDetails[$row.PolicyId]
  $nm = if ($det -and $det.Name) { $det.Name } elseif ($policyById[$row.PolicyId].name) { [string]$policyById[$row.PolicyId].name } else { $row.PolicyId }
  $json = '[]'
  if ($det -and $det.ModulesJson) { $json = [string]$det.ModulesJson }
  if (-not $json) { $json = '[]' }
  $polRows.Add(("({0},{1},{2},{3},{4},{5})" -f ("'{0}'" -f $snap), (Sql-Str $row.PolicyId), (Sql-Str $nm), (Sql-Str $row.Code), [int]$row.N, (Sql-Str $json)))
}
if ($polRows.Count -gt 0) {
  try {
    Invoke-SqlText -SqlText @"
SET NOCOUNT ON;
DELETE FROM dbo.Bitdefender_Policies WHERE SnapshotDate = '$snap';
INSERT INTO dbo.Bitdefender_Policies (SnapshotDate, PolicyId, PolicyName, CustomerCode, DeviceCount, ModulesJson)
VALUES
$($polRows -join ",`r`n");
"@ -Label 'bd_policies_load'
    Write-Log ("Policies loaded rows=" + $polRows.Count)
  } catch {
    Write-Log ("WARN policies load: " + $_.Exception.Message)
  }
} else {
  Write-Log 'Policies: no mapped policy/customer rows'
}

# Load endpoints (replace today's snapshot)
$detailInsertCols = ''
if ($hasDetailCols) {
  $detailInsertCols = ', LastSuccessfulScanAt, LastSeenAt, MalwareDetected, Infected, ProductOutdated, SignatureOutdated'
  if ($hasScanName) { $detailInsertCols = ', LastSuccessfulScanAt, LastSuccessfulScanName, LastSeenAt, MalwareDetected, Infected, ProductOutdated, SignatureOutdated' }
}
if ($hasCoCols) {
  $load = @"
SET NOCOUNT ON;
SET XACT_ABORT ON;
DELETE FROM dbo.Bitdefender_Endpoints WHERE SnapshotDate = '$snap';
INSERT INTO dbo.Bitdefender_Endpoints (
  SnapshotDate, EndpointId, CustomerCode, DeviceName, Fqdn, IpAddress, GroupId,
  IsManaged, MachineType, OperatingSystem, PolicyId, PolicyName, MacAddresses, CompanyId, CompanyName$detailInsertCols
) VALUES
$($values -join ",`r`n");

SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = '$snap'
GROUP BY CustomerCode
ORDER BY CustomerCode;

SELECT COUNT(*) AS Unmapped
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = '$snap' AND (CustomerCode IS NULL OR CustomerCode = N'');

SELECT ISNULL(CompanyName,N'(none)') AS CompanyName, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = '$snap'
GROUP BY CompanyName
ORDER BY Cnt DESC;
"@
} else {
  $load = @"
SET NOCOUNT ON;
SET XACT_ABORT ON;
DELETE FROM dbo.Bitdefender_Endpoints WHERE SnapshotDate = '$snap';
INSERT INTO dbo.Bitdefender_Endpoints (
  SnapshotDate, EndpointId, CustomerCode, DeviceName, Fqdn, IpAddress, GroupId,
  IsManaged, MachineType, OperatingSystem, PolicyId, PolicyName, MacAddresses$detailInsertCols
) VALUES
$($values -join ",`r`n");

SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = '$snap'
GROUP BY CustomerCode
ORDER BY CustomerCode;

SELECT COUNT(*) AS Unmapped
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = '$snap' AND (CustomerCode IS NULL OR CustomerCode = N'');
"@
}

Invoke-SqlText -SqlText $load -Label 'bd_endpoints_load'

if ($hasDetailCols) {
  $upd = New-Object System.Collections.Generic.List[string]
  [void]$upd.Add('SET NOCOUNT ON;')
  $scanN = 0
  foreach ($key in $epBag.Keys) {
    $bag = $epBag[$key]
    $ep = $bag.Ep
    $gzId = [string]$ep.id
    if (-not $gzId) { $gzId = [string]$key }
    if (-not $bag.LastSeen -and $null -eq $bag.MalwareDetected -and $null -eq $bag.ProductOutdated -and -not $bag.LastScan) { continue }
    if ($bag.LastScan) { $scanN++ }
    $setScanName = if ($hasScanName) { ", LastSuccessfulScanName={0}" -f (Sql-Str $bag.ScanName) } else { '' }
    [void]$upd.Add((
      "UPDATE dbo.Bitdefender_Endpoints SET LastSeenAt={0}, LastSuccessfulScanAt={1}, MalwareDetected={2}, Infected={3}, ProductOutdated={4}, SignatureOutdated={5}{6} WHERE SnapshotDate='{7}' AND EndpointId={8};" -f `
        (Sql-Dt $bag.LastSeen),
        (Sql-Dt $bag.LastScan),
        (Sql-Bit $bag.MalwareDetected),
        (Sql-Bit $bag.Infected),
        (Sql-Bit $bag.ProductOutdated),
        (Sql-Bit $bag.SignatureOutdated),
        $setScanName,
        $snap,
        (Sql-Str $gzId)
    ))
  }
  Write-Log ("Detail updates queued=" + [Math]::Max(0, $upd.Count - 1) + " withScan=" + $scanN)
  if ($upd.Count -gt 1) {
    try { Invoke-SqlText -SqlText ($upd -join "`r`n") -Label 'bd_endpoint_details' } catch {
      Write-Log ("WARN detail update: " + $_.Exception.Message)
    }
  }
}

# Build id → customer map for incidents/quarantine stamping
$epCodeById = @{}
foreach ($key in $epBag.Keys) {
  $bag = $epBag[$key]
  $ep = $bag.Ep
  $gzId = [string]$ep.id
  if (-not $gzId) { $gzId = [string]$key }
  $coName = [string]$bag.CompanyName
  if ($coName -eq '(api-key-company)') { $coName = '' }
  $code = Resolve-EndpointCode ([string]$ep.name) ([string]$ep.fqdn) $coName
  if ($code) { $epCodeById[$gzId] = $code }
}

# --- Incidents (soft) ---
# getIncidentsList is ONLY on API v1.2: /v1.2/jsonrpc/incidents
function Test-GzJsonError([string]$raw) {
  if ([string]::IsNullOrWhiteSpace($raw)) { return $true }
  # Only treat real JSON-RPC error objects as errors (avoid matching file paths containing "error")
  if ($raw -match '"error"\s*:\s*\{') { return $true }
  return $false
}

function Get-GzItems($raw) {
  $items = @()
  try {
    $jo = $raw | ConvertFrom-Json
    if ($null -eq $jo) { return @() }
    if ($jo.result -and $jo.result.items) { $items = @($jo.result.items) }
    elseif ($jo.result -is [System.Array]) { $items = @($jo.result) }
    elseif ($jo.result -and $jo.result.result) { $items = @($jo.result.result) }
  } catch {
    Write-Log ('JSON parse soft-fail: ' + $_.Exception.Message)
  }
  return $items
}

$incOk = 0; $incCount = 0; $incMsg = 'not attempted'
$incValues = New-Object System.Collections.Generic.List[string]
try {
  $seenInc = @{}
  $rawIncList = New-Object System.Collections.Generic.List[string]
  foreach ($ps in @(
    @{ page = 1; perPage = 100 },
    @{ page = 1; perPage = 50 }
  )) {
    try {
      $raw = Invoke-GzRpc -Service 'incidents' -Method 'getIncidentsList' -Params $ps -ApiVersion 'v1.2'
      $pdesc = (($ps.Keys | ForEach-Object { "$_=$($ps[$_])" }) -join ',')
      Write-Log ('Incidents v1.2 try params=' + $pdesc + ' len=' + $raw.Length)
      if (Test-GzJsonError $raw) {
        $incMsg = ('v1.2 error: ' + $(if ($raw.Length -gt 200) { $raw.Substring(0, 200) } else { $raw }))
        continue
      }
      $incOk = 1
      $incMsg = 'ok v1.2 getIncidentsList'
      [void]$rawIncList.Add($raw)
      # further pages
      try {
        $jo0 = $raw | ConvertFrom-Json
        $pages = 1
        if ($jo0.result.pagesCount) { $pages = [int]$jo0.result.pagesCount }
        for ($pg = 2; $pg -le [Math]::Min($pages, 40); $pg++) {
          $rawN = Invoke-GzRpc -Service 'incidents' -Method 'getIncidentsList' -Params @{ page = $pg; perPage = 100 } -ApiVersion 'v1.2'
          if (-not (Test-GzJsonError $rawN)) { [void]$rawIncList.Add($rawN) }
        }
      } catch {}
      break
    } catch {
      $incMsg = $_.Exception.Message
    }
  }

  if ($incOk -eq 1) {
    foreach ($rawInc in $rawIncList) {
      foreach ($it in (Get-GzItems $rawInc)) {
        $iid = [string]($it.id)
        if (-not $iid) { $iid = [string]($it.incidentId) }
        if (-not $iid) { continue }
        if ($seenInc.ContainsKey($iid)) { continue }
        $seenInc[$iid] = $true
        $eid = ''
        if ($it.endpointId) { $eid = [string]$it.endpointId }
        elseif ($it.mainEndpointId) { $eid = [string]$it.mainEndpointId }
        elseif ($it.endpoint -and $it.endpoint.id) { $eid = [string]$it.endpoint.id }
        $code = $null
        if ($eid -and $epCodeById.ContainsKey($eid)) { $code = $epCodeById[$eid] }
        $dname = ''
        if ($it.endpointName) { $dname = [string]$it.endpointName }
        elseif ($it.mainEndpointName) { $dname = [string]$it.mainEndpointName }
        elseif ($it.deviceName) { $dname = [string]$it.deviceName }
        elseif ($it.computerName) { $dname = [string]$it.computerName }
        if (-not $code -and $dname) {
          $__rh = Resolve-CustomerCode $dname ''
          $code = if ($__rh) { [string]$__rh.Code } else { $null }
        }
        if (-not $code -and $it.companyName) {
          $code = Resolve-CompanyCode ([string]$it.companyName)
        }
        $sev = ''; if ($null -ne $it.severity) { $sev = [string]$it.severity } elseif ($it.priority) { $sev = [string]$it.priority }
        $st = ''; if ($null -ne $it.status) { $st = [string]$it.status }
        $typ = ''; if ($it.type) { $typ = [string]$it.type } elseif ($it.incidentType) { $typ = [string]$it.incidentType }
        $sum = ''
        if ($it.summary) { $sum = [string]$it.summary }
        elseif ($it.name) { $sum = [string]$it.name }
        elseif ($it.description) { $sum = [string]$it.description }
        elseif ($it.incidentName) { $sum = [string]$it.incidentName }
        if ($sum.Length -gt 500) { $sum = $sum.Substring(0, 500) }
        $det = 'NULL'
        foreach ($k in @('created','createdAt','createdOn','detectionDate','lastUpdate','lastUpdated','lastOccurrence')) {
          if (($it.PSObject.Properties.Name -contains $k) -and $it.$k) {
            try { $det = ("'{0}'" -f ([datetime]$it.$k).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss')) } catch {}
            break
          }
        }
        $codeSql = if ($code) { Sql-Str $code } else { 'NULL' }
        $rawItem = Sql-Str (($it | ConvertTo-Json -Depth 4 -Compress))
        if ($rawItem.Length -gt 4000) { $rawItem = Sql-Str 'truncated' }
        $incValues.Add(("({0},{1},{2},{3},{4},{5},{6},{7},{8},{9},{10})" -f `
          ("'{0}'" -f $snap), (Sql-Str $iid), $codeSql, (Sql-Str $eid), (Sql-Str $dname),
          (Sql-Str $sev), (Sql-Str $st), (Sql-Str $typ), (Sql-Str $sum), $det, $rawItem))
        $incCount++
      }
    }
  }
  if ($incOk -eq 0) {
    $incMsg = 'getIncidentsList v1.2 failed - ' + $incMsg
  }
  if ($incValues.Count -gt 0) {
    $incSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Bitdefender_Incidents', N'U') IS NULL
BEGIN
  RAISERROR(N'Bitdefender_Incidents missing - run 460 as admin', 16, 1);
  RETURN;
END
DELETE FROM dbo.Bitdefender_Incidents WHERE SnapshotDate = '$snap';
INSERT INTO dbo.Bitdefender_Incidents (
  SnapshotDate, IncidentId, CustomerCode, EndpointId, DeviceName,
  Severity, Status, IncidentType, Summary, DetectedAt, RawJson
) VALUES
$($incValues -join ",`r`n");
"@
    try { Invoke-SqlText -SqlText $incSql -Label 'bd_incidents_load' } catch {
      Write-Log ('Incidents load soft-fail: ' + $_.Exception.Message)
    }
  } elseif ($incOk -eq 1) {
    try {
      Invoke-SqlText -SqlText @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Bitdefender_Incidents', N'U') IS NOT NULL
  DELETE FROM dbo.Bitdefender_Incidents WHERE SnapshotDate = '$snap';
"@ -Label 'bd_incidents_clear'
    } catch {}
    Write-Log 'Incidents API OK - 0 open items'
  } else {
    Write-Log ('Incidents SKIP: ' + $incMsg)
  }
} catch {
  $incMsg = $_.Exception.Message
  Write-Log ('Incidents soft-fail: ' + $incMsg)
}

# --- Quarantine (soft) ---
# Docs: /v1.0/jsonrpc/quarantine/computers  method getQuarantineItemsList
$qOk = 0; $qCount = 0; $qMsg = 'not attempted'
$qValues = New-Object System.Collections.Generic.List[string]
try {
  $seenQ = @{}
  $rawQAll = New-Object System.Collections.Generic.List[string]
  $svc = 'quarantine/computers'
  $ver = 'v1.0'
  $raw = Invoke-GzRpc -Service $svc -Method 'getQuarantineItemsList' -Params @{ page = 1; perPage = 100 } -ApiVersion $ver
  Write-Log ('Quarantine try ' + $ver + '/' + $svc + ' len=' + $raw.Length + ' head=' + $(if ($raw.Length -gt 120) { $raw.Substring(0,120) } else { $raw }))
  if (Test-GzJsonError $raw) {
    $qMsg = ('error ' + $ver + '/' + $svc + ': ' + $(if ($raw.Length -gt 160) { $raw.Substring(0,160) } else { $raw }))
  } else {
    $qOk = 1
    $qMsg = ('ok ' + $ver + ' ' + $svc)
    [void]$rawQAll.Add($raw)
    $pages = 1
    try {
      $jo0 = $raw | ConvertFrom-Json
      if ($jo0.result.pagesCount) { $pages = [int]$jo0.result.pagesCount }
      elseif ($jo0.result.total -and $jo0.result.perPage) {
        $pages = [int][Math]::Ceiling([double]$jo0.result.total / [double]$jo0.result.perPage)
      }
    } catch {}
    Write-Log ('Quarantine pages=' + $pages + ' total~ from page1')
    for ($pg = 2; $pg -le [Math]::Min($pages, 20); $pg++) {
      try {
        $rawN = Invoke-GzRpc -Service $svc -Method 'getQuarantineItemsList' -Params @{ page = $pg; perPage = 100 } -ApiVersion $ver
        if (-not (Test-GzJsonError $rawN)) {
          [void]$rawQAll.Add($rawN)
          Write-Log ('Quarantine page ' + $pg + ' len=' + $rawN.Length)
        }
      } catch {
        Write-Log ('Quarantine page ' + $pg + ' soft-fail: ' + $_.Exception.Message)
      }
    }
  }

  if ($qOk -eq 1 -and $rawQAll.Count -gt 0) {
    foreach ($qRaw in $rawQAll) {
      foreach ($it in (Get-GzItems $qRaw)) {
        $qid = [string]($it.id)
        if (-not $qid) { $qid = [string]($it.itemId) }
        if (-not $qid) { continue }
        if ($seenQ.ContainsKey($qid)) { continue }
        $seenQ[$qid] = $true
        $eid = ''
        if ($it.endpointId) { $eid = [string]$it.endpointId }
        $code = $null
        if ($eid -and $epCodeById.ContainsKey($eid)) { $code = $epCodeById[$eid] }
        $dname = ''
        if ($it.endpointName) { $dname = [string]$it.endpointName }
        elseif ($it.computerName) { $dname = [string]$it.computerName }
        if (-not $code -and $dname) {
          $__rh = Resolve-CustomerCode $dname ''
          $code = if ($__rh) { [string]$__rh.Code } else { $null }
        }
        $threat = ''
        if ($it.threatName) { $threat = [string]$it.threatName }
        elseif ($it.malwareName) { $threat = [string]$it.malwareName }
        elseif ($it.details -and $it.details.threatName) { $threat = [string]$it.details.threatName }
        $path = ''
        if ($it.filePath) { $path = [string]$it.filePath }
        elseif ($it.path) { $path = [string]$it.path }
        elseif ($it.details -and $it.details.filePath) { $path = [string]$it.details.filePath }
        if ($path.Length -gt 500) { $path = $path.Substring(0, 500) }
        $st = ''
        if ($null -ne $it.actionStatus) { $st = [string]$it.actionStatus }
        elseif ($it.status) { $st = [string]$it.status }
        $qa = 'NULL'
        foreach ($k in @('quarantinedOn','quarantineDate','created')) {
          if (($it.PSObject.Properties.Name -contains $k) -and $it.$k) {
            try { $qa = ("'{0}'" -f ([datetime]$it.$k).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss')) } catch {}
            break
          }
        }
        $codeSql = if ($code) { Sql-Str $code } else { 'NULL' }
        $rawItem = Sql-Str (($it | ConvertTo-Json -Depth 3 -Compress))
        if ($rawItem.Length -gt 4000) { $rawItem = Sql-Str 'truncated' }
        $qValues.Add(("({0},{1},{2},{3},{4},{5},{6},{7},{8},{9})" -f `
          ("'{0}'" -f $snap), (Sql-Str $qid), $codeSql, (Sql-Str $eid), (Sql-Str $dname),
          (Sql-Str $threat), (Sql-Str $path), (Sql-Str $st), $qa, $rawItem))
        $qCount++
      }
    }
    Write-Log ('Quarantine parsed items=' + $qCount + ' from pages=' + $rawQAll.Count)
    if ($qValues.Count -gt 0) {
      # batch insert in chunks of 80
      $chunk = 80
      for ($i = 0; $i -lt $qValues.Count; $i += $chunk) {
        $take = [Math]::Min($chunk, $qValues.Count - $i)
        $slice = $qValues.GetRange($i, $take)
        $del = if ($i -eq 0) { "DELETE FROM dbo.Bitdefender_Quarantine WHERE SnapshotDate = '$snap';" } else { '' }
        $qSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Bitdefender_Quarantine', N'U') IS NULL
BEGIN
  RAISERROR(N'Bitdefender_Quarantine missing - run 460 as admin', 16, 1);
  RETURN;
END
$del
INSERT INTO dbo.Bitdefender_Quarantine (
  SnapshotDate, ItemId, CustomerCode, EndpointId, DeviceName,
  ThreatName, FilePath, Status, QuarantinedAt, RawJson
) VALUES
$($slice -join ",`r`n");
"@
        try { Invoke-SqlText -SqlText $qSql -Label ('bd_quarantine_load_' + $i) } catch {
          Write-Log ('Quarantine load soft-fail chunk ' + $i + ': ' + $_.Exception.Message)
        }
      }
    } else {
      try {
        Invoke-SqlText -SqlText @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Bitdefender_Quarantine', N'U') IS NOT NULL
  DELETE FROM dbo.Bitdefender_Quarantine WHERE SnapshotDate = '$snap';
"@ -Label 'bd_quarantine_clear'
      } catch {}
      Write-Log 'Quarantine API OK - 0 items after parse'
    }
  } else {
    if ($qOk -eq 0) {
      $qMsg = 'Quarantine API failed - ' + $qMsg
    }
    Write-Log ('Quarantine SKIP: ' + $qMsg)
  }
} catch {
  $qMsg = $_.Exception.Message
  Write-Log ('Quarantine soft-fail: ' + $qMsg)
}

# Collect status row
try {
  $mappedN = ($epBag.Count - $unmapped)
  $stSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Bitdefender_CollectStatus', N'U') IS NULL RETURN;
MERGE dbo.Bitdefender_CollectStatus AS t
USING (SELECT CAST('$snap' AS date) AS SnapshotDate) s ON t.SnapshotDate = s.SnapshotDate
WHEN MATCHED THEN UPDATE SET
  EndpointsTotal=$($epBag.Count), EndpointsMapped=$mappedN, EndpointsUnmapped=$unmapped,
  IncidentsOk=$incOk, IncidentsCount=$incCount, QuarantineOk=$qOk, QuarantineCount=$qCount,
  IncidentsMessage=$(Sql-Str $incMsg), QuarantineMessage=$(Sql-Str $qMsg),
  ImportedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (
  SnapshotDate, EndpointsTotal, EndpointsMapped, EndpointsUnmapped,
  IncidentsOk, IncidentsCount, QuarantineOk, QuarantineCount,
  IncidentsMessage, QuarantineMessage
) VALUES (
  s.SnapshotDate, $($epBag.Count), $mappedN, $unmapped,
  $incOk, $incCount, $qOk, $qCount,
  $(Sql-Str $incMsg), $(Sql-Str $qMsg)
);
"@
  Invoke-SqlText -SqlText $stSql -Label 'bd_collect_status'
} catch {
  Write-Log ("CollectStatus soft-fail: " + $_.Exception.Message)
}

Write-Log ("log=" + $log)
Write-Log ("Incidents ok=$incOk count=$incCount msg=$incMsg")
Write-Log ("Quarantine ok=$qOk count=$qCount msg=$qMsg")
try {
  Invoke-SqlText -SqlText @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NULL RETURN;
UPDATE dbo.Dim_Connection
SET LastSyncAt = SYSUTCDATETIME(),
    Status = N'Active',
    Notes = N'Bitdefender collect OK',
    UpdatedAt = SYSUTCDATETIME()
WHERE ConnectionCode IN (N'BITDEFENDER', N'EPP', N'GRAVITYZONE');
"@ -Label 'bd_stamp_conn'
  Write-Log 'Dim_Connection EPP stamped Active'
} catch {
  Write-Log ('stamp Dim_Connection skip: ' + $_.Exception.Message)
}
Write-Log '=== Bitdefender EPP collect done ==='
Write-Host 'If Unmapped > 0: SELECT DeviceName, Fqdn FROM dbo.vw_Bitdefender_Unmapped_Latest; add Dim_Bitdefender_NameMap patterns; re-run.'
