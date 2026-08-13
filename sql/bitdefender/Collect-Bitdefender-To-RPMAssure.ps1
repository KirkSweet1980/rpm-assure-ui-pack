# Collect Bitdefender GravityZone endpoints → RPMAssure_App (EPP pillar)
# Auth: Basic base64(ApiKey + ":")
# Map: Dim_Bitdefender_NameMap patterns against Name+Fqdn; optional default RPMINT for staff

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
. (Join-Path $here 'Bitdefender.Config.ps1')

# Optional SQL overrides in config; else defaults used on central
if (-not $SqlServer)   { $SqlServer = '102.222.21.220,14333' }
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

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
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

function Invoke-SqlText([string]$SqlText, [string]$Label) {
  $sqlcmd = Find-Sqlcmd
  $f = Join-Path $logDir ("{0}_{1:yyyyMMdd_HHmmss}.sql" -f $Label, (Get-Date))
  [IO.File]::WriteAllText($f, $SqlText, [Text.UTF8Encoding]::new($false))
  Write-Log ("SQL " + $Label + " -> " + $f)
  & $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -b -i $f
  if ($LASTEXITCODE -ne 0) { throw ("sqlcmd failed " + $LASTEXITCODE + " on " + $Label) }
}

function Invoke-GzRpc {
  param(
    [string]$Service,
    [string]$Method,
    [hashtable]$Params = @{},
    [string]$ApiVersion = 'v1.0'
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

function Sql-Str([string]$s) {
  if ($null -eq $s -or $s -eq '') { return 'NULL' }
  return ("N'{0}'" -f ($s.Replace("'", "''")))
}

function Sql-Bit($v) {
  if ($null -eq $v) { return 'NULL' }
  if ($v -eq $true -or "$v" -eq '1' -or "$v" -eq 'True') { return '1' }
  return '0'
}

function Sql-Int($v) {
  if ($null -eq $v -or "$v" -eq '') { return 'NULL' }
  $n = 0
  if ([int]::TryParse("$v", [ref]$n)) { return [string]$n }
  return 'NULL'
}

Write-Log '=== Bitdefender EPP collect start ==='
Write-Log ("SQL=" + $SqlServer + " / " + $SqlDatabase)
Write-Log ("API=" + $baseApi)

# Schema must already exist (Apply-Bitdefender-450 as admin). Soft re-seed map only.
$seedMap = @'
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NULL
BEGIN
  RAISERROR(N'Dim_Bitdefender_NameMap missing — run 450 as SQL admin first.', 16, 1);
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

function Resolve-CompanyCode([string]$CompanyName) {
  if ([string]::IsNullOrWhiteSpace($CompanyName)) { return $null }
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

function Resolve-CustomerCode([string]$Name, [string]$Fqdn) {
  # Returns @{ Code = ...; Priority = n } or $null. Lower Priority = stronger.
  $n = if ($Name) { $Name.ToUpperInvariant() } else { '' }
  $f = if ($Fqdn) { $Fqdn.ToUpperInvariant() } else { '' }
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

# Discover companies (MSP multi-tenant)
$companyTargets = New-Object System.Collections.Generic.List[object]
try {
  $rawCo = Invoke-GzRpc -Service 'companies' -Method 'getCompaniesList' -Params @{}
  [IO.File]::WriteAllText((Join-Path $logDir 'last_companies.json'), $rawCo, [Text.UTF8Encoding]::new($false))
  if ($rawCo -notmatch '"error"') {
    $jo = $rawCo | ConvertFrom-Json
    $items = @()
    if ($jo.result.items) { $items = @($jo.result.items) }
    elseif ($jo.result -is [System.Array]) { $items = @($jo.result) }
    foreach ($it in $items) {
      if ($it.id) {
        $companyTargets.Add([pscustomobject]@{ Id = [string]$it.id; Name = [string]$it.name })
        Write-Log ("Company list: " + $it.name + " id=" + $it.id)
      }
    }
  } else {
    Write-Log ("getCompaniesList: " + $rawCo.Substring(0, [Math]::Min(160, $rawCo.Length)))
  }
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
    $rawKids = Invoke-GzRpc -Service 'network' -Method 'getNetworkInventoryItems' -Params @{ parentId = $cfId; page = 1; perPage = 100 }
    if ($rawKids -notmatch '"error"') {
      $jk = $rawKids | ConvertFrom-Json
      foreach ($it in @($jk.result.items)) {
        if ($it.id -and $it.name) {
          $companyTargets.Add([pscustomobject]@{ Id = [string]$it.id; Name = [string]$it.name })
          Write-Log ("Inventory company: " + $it.name + " id=" + $it.id)
        }
      }
    }
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
      $params = @{ page = $page; perPage = 50 }
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
          $epBag[$eid] = @{
            Ep          = $it
            CompanyId   = $co.Id
            CompanyName = $co.Name
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
  } while ($page -le $pages -and $page -le 40)
}

Write-Log ("Unique endpoints from API=" + $epBag.Count)
if ($epBag.Count -eq 0) { throw 'No endpoints from GravityZone' }

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

$snap = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
$values = New-Object System.Collections.Generic.List[string]
$codeCounts = @{}
$unmapped = 0

foreach ($eid in $epBag.Keys) {
  $bag = $epBag[$eid]
  $ep = $bag.Ep
  $id = $eid
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
  if ($hasCoCols) {
    $values.Add((
      "({0},{1},{2},{3},{4},{5},{6},{7},{8},{9},{10},{11},{12},{13},{14})" -f `
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
        (Sql-Str $coName)
    ))
  } else {
    $values.Add((
      "({0},{1},{2},{3},{4},{5},{6},{7},{8},{9},{10},{11},{12})" -f `
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
        (Sql-Str $macs)
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

# Load endpoints (replace today's snapshot)
if ($hasCoCols) {
  $load = @"
SET NOCOUNT ON;
SET XACT_ABORT ON;
DELETE FROM dbo.Bitdefender_Endpoints WHERE SnapshotDate = '$snap';
INSERT INTO dbo.Bitdefender_Endpoints (
  SnapshotDate, EndpointId, CustomerCode, DeviceName, Fqdn, IpAddress, GroupId,
  IsManaged, MachineType, OperatingSystem, PolicyId, PolicyName, MacAddresses, CompanyId, CompanyName
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
  IsManaged, MachineType, OperatingSystem, PolicyId, PolicyName, MacAddresses
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

# Build id → customer map for incidents/quarantine stamping
$epCodeById = @{}
foreach ($eid in $epBag.Keys) {
  $bag = $epBag[$eid]
  $ep = $bag.Ep
  $coName = [string]$bag.CompanyName
  if ($coName -eq '(api-key-company)') { $coName = '' }
  $code = Resolve-EndpointCode ([string]$ep.name) ([string]$ep.fqdn) $coName
  if ($code) { $epCodeById[$eid] = $code }
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
        for ($pg = 2; $pg -le [Math]::Min($pages, 10); $pg++) {
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
Write-Log '=== Bitdefender EPP collect done ==='
Write-Host 'If Unmapped > 0: SELECT DeviceName, Fqdn FROM dbo.vw_Bitdefender_Unmapped_Latest; add Dim_Bitdefender_NameMap patterns; re-run.'
