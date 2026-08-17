# Map-Freshdesk-Companies.ps1
# Map Freshdesk companies ONLY to existing Dim_Customer rows. Never create customers.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\freshdesk\Map-Freshdesk-Companies.ps1

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$cfg = Join-Path $here 'Freshdesk.Config.ps1'
if (-not (Test-Path $cfg)) { throw "Missing $cfg" }
. $cfg
if (-not $FreshdeskSqlServer) { $FreshdeskSqlServer = '.\RPMREPORTS' }
if (-not $FreshdeskSqlDatabase) { $FreshdeskSqlDatabase = 'RPMAssure_App' }
$FreshdeskDomain = $FreshdeskDomain.Trim() -replace '^https?://', '' -replace '/$', ''

function Norm([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return '' }
  $t = $s.ToLowerInvariant()
  $t = [regex]::Replace($t, '\(pty\)\.?\s*ltd\.?|\bpty\.?\s*ltd\.?|\blimited\b|\binc\.?\b', ' ')
  $t = [regex]::Replace($t, '[^a-z0-9]+', ' ')
  return $t.Trim()
}

function One-Val($v) {
  if ($null -eq $v) { return $null }
  if ($v -is [System.Array]) {
    if ($v.Length -eq 0) { return $null }
    return $v[0]
  }
  return $v
}

function To-Int64OrNull($v) {
  $v = One-Val $v
  if ($null -eq $v) { return $null }
  $n = [int64]0
  if ([int64]::TryParse(([string]$v), [ref]$n)) { return $n }
  return $null
}

# Prefer Freshdesk company id (exact). Never invent customers. Never map SBS Tanks -> SBS.
$idMaps = @{
  '48001891723' = 'AHIC'     # AHI Carrier
  '48002537448' = 'RSS'      # Remote Site Solutions
  '48002073040' = 'UVSS'     # UVSS
  '48002532561' = 'IB'       # Interbrand
  '48002600047' = 'MEDIPOS'  # Medipos
  '48001751035' = 'RPMINT'   # RPM Resources
  '48002584815' = 'RPMINT'   # RPM Resources (UK)
  '48005599640' = 'SBT'      # SBS Tanks (not Simply Bright)
}

$aliases = @(
  @{ n = 'ahi carrier'; c = 'AHIC' },
  @{ n = 'remote site solutions'; c = 'RSS' },
  @{ n = 'unique ventilation'; c = 'UVSS' },
  @{ n = 'interbrand'; c = 'IB' },
  @{ n = 'medipos'; c = 'MEDIPOS' },
  @{ n = 'rpm resources uk'; c = 'RPMINT' },
  @{ n = 'rpm resources'; c = 'RPMINT' },
  @{ n = 'redsun raisins'; c = 'RSR' },
  @{ n = 'redsun'; c = 'RSR' },
  @{ n = 'hydra sales'; c = 'HYDRA' },
  @{ n = 'hydrasales'; c = 'HYDRA' },
  @{ n = 'able tracers'; c = 'ABLE' },
  @{ n = 'board of healthcare'; c = 'BHF' },
  @{ n = 'board of health'; c = 'BHF' },
  @{ n = 'sir fruit'; c = 'SIRF' },
  @{ n = 'metsiwater'; c = 'METSI' },
  @{ n = 'metsi water'; c = 'METSI' },
  @{ n = 'ylj health'; c = 'YLJ' },
  @{ n = 'oratouch'; c = 'YLJ' },
  @{ n = 'ora touch'; c = 'YLJ' },
  @{ n = 'vault tech'; c = 'VAULT' },
  @{ n = 'vaulttech'; c = 'VAULT' },
  @{ n = 'sbs tanks'; c = 'SBT' },
  @{ n = 'simply bright solutions'; c = 'SBS' },
  @{ n = 'simply bright'; c = 'SBS' },
  @{ n = 'board of healthcare funders'; c = 'BHF' },
  @{ n = 'board of healthcare'; c = 'BHF' },
  @{ n = 'bhf global'; c = 'BHF' }
)

$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }

$custTxt = & $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -h -1 -W -s '|' -Q "SET NOCOUNT ON; SELECT CustomerCode, DisplayName FROM dbo.Dim_Customer WHERE Active = 1;"
$customers = @()
foreach ($line in @($custTxt)) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $p = $line.Split('|')
  if ($p.Length -lt 2) { continue }
  $code = $p[0].Trim(); $name = $p[1].Trim()
  if (-not $code) { continue }
  $customers += [pscustomobject]@{ Code = $code; Name = $name; Norm = (Norm $name); CodeNorm = (Norm $code) }
}
if ($customers.Count -eq 0) { throw 'No active Dim_Customer rows' }
Write-Host ('Assure customers=' + $customers.Count)
$valid = @{}
foreach ($c in $customers) { $valid[$c.Code.ToUpperInvariant()] = $true }

$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${FreshdeskApiKey}:X"))
$hdr = @{ Authorization = "Basic $b64"; 'Content-Type' = 'application/json'; Accept = 'application/json' }

try {
  $me = Invoke-RestMethod -Uri "https://$FreshdeskDomain/api/v2/agents/me" -Headers $hdr -TimeoutSec 30
  Write-Host ('API key agent=' + $me.contact.name + ' scope=' + $me.ticket_scope)
} catch {
  Write-Host ('API key agent=UNKNOWN ' + $_.Exception.Message)
}

$companies = New-Object System.Collections.Generic.List[object]
$page = 1
do {
  $url = "https://$FreshdeskDomain/api/v2/companies?per_page=100&page=$page"
  $batch = @(Invoke-RestMethod -Uri $url -Headers $hdr -Method GET -TimeoutSec 60)
  if ($batch.Count -eq 0) { break }
  foreach ($co in $batch) { [void]$companies.Add($co) }
  Write-Host ('companies page=' + $page + ' got=' + $batch.Count)
  $page++
} while ($page -le 50 -and $batch.Count -eq 100)
Write-Host ('Freshdesk companies=' + $companies.Count)
if ($companies.Count -lt 10) {
  Write-Host 'WARN: expected ~79 companies (Janine). This key is scoped or config was overwritten. Check Freshdesk.Config.ps1'
}

function Resolve-Code([string]$fdName, $fdId) {
  $idKey = [string](One-Val $fdId)
  if ($idKey -and $idMaps.ContainsKey($idKey)) {
    $up = $idMaps[$idKey].ToUpperInvariant()
    if ($valid.ContainsKey($up)) { return $up }
  }
  $n = Norm $fdName
  if (-not $n) { return $null }
  foreach ($c in $customers) {
    if ($n -eq $c.Norm -or $n -eq $c.CodeNorm) { return $c.Code }
  }
  foreach ($a in $aliases) {
    if ($n -eq $a.n) {
      $up = $a.c.ToUpperInvariant()
      if ($valid.ContainsKey($up)) { return $up }
    }
  }
  foreach ($a in $aliases) {
    if ($a.n.Length -ge 6 -and $n.Contains($a.n)) {
      if ($a.c -eq 'SBS' -and $n -match 'tank') { continue }
      if ($a.c -eq 'HYDRA' -and $n -match 'hy.?line') { continue }
      $up = $a.c.ToUpperInvariant()
      if ($valid.ContainsKey($up)) { return $up }
    }
  }
  return $null
}

$mapped = New-Object System.Collections.Generic.List[object]
$unmapped = New-Object System.Collections.Generic.List[object]
foreach ($co in $companies) {
  $name = [string](One-Val $co.name)
  $code = Resolve-Code $name $co.id
  $row = [pscustomobject]@{ CompanyId = (To-Int64OrNull $co.id); CompanyName = $name; CustomerCode = $code }
  if ($code) { [void]$mapped.Add($row) } else { [void]$unmapped.Add($row) }
}

Write-Host ''
Write-Host '=== MAP (Assure customer exists) ==='
$mapped | Format-Table CompanyName, CustomerCode, CompanyId -AutoSize
Write-Host '=== UNMAPPED (left out on purpose) ==='
$unmapped | Format-Table CompanyName, CompanyId -AutoSize

Write-Host '=== SEARCH missing Assure names (autocomplete) ==='
$wanted = @(
  @{ q = 'Redsun Raisins'; c = 'RSR' },
  @{ q = 'Hydrasales'; c = 'HYDRA' },
  @{ q = 'Able Tracers'; c = 'ABLE' },
  @{ q = 'Board of Healthcare Funders'; c = 'BHF' },
  @{ q = 'Sir Fruit'; c = 'SIRF' },
  @{ q = 'Metsiwater'; c = 'METSI' },
  @{ q = 'YLJ Health'; c = 'YLJ' },
  @{ q = 'ORATouch'; c = 'YLJ' },
  @{ q = 'Vault-Tech'; c = 'VAULT' },
  @{ q = 'Simply Bright Solutions'; c = 'SBS' },
  @{ q = 'Simply Bright'; c = 'SBS' },
  @{ q = 'SBS Tanks'; c = 'SBT' },
  @{ q = 'BHF'; c = 'BHF' },
  @{ q = 'PCNS'; c = 'BHF' },
  @{ q = 'Board of Healthcare Funders'; c = 'BHF' },
  @{ q = 'Board of Healthcare'; c = 'BHF' }
)
foreach ($w in $wanted) {
  $already = @($mapped | Where-Object { $_.CustomerCode -eq $w.c })
  if ($already.Count -gt 0) {
    Write-Host ('HAVE  ' + $w.c + ' via ' + (($already | ForEach-Object { $_.CompanyName }) -join ', '))
    continue
  }
  $url = "https://$FreshdeskDomain/api/v2/companies/autocomplete?name=" + [uri]::EscapeDataString($w.q)
  try {
    $sr = Invoke-RestMethod -Uri $url -Headers $hdr -TimeoutSec 30
    $hits = @()
    if ($sr.companies) { $hits = @($sr.companies) }
    elseif ($sr.results) { $hits = @($sr.results) }
    else { $hits = @($sr) | Where-Object { $_.name } }
    if ($hits.Count -eq 0) {
      Write-Host ('MISS  ' + $w.c + ' q="' + $w.q + '"')
    } else {
      foreach ($h in $hits) {
        $hn = [string](One-Val $h.name)
        Write-Host ('HIT   ' + $w.c + ' -> ' + $hn + ' id=' + $h.id)
        $code = Resolve-Code $hn $h.id
        if (-not $code) { $code = $w.c }
        if ($valid.ContainsKey($code.ToUpperInvariant())) {
          $dup = $false
          foreach ($m in $mapped) { if ($m.CompanyName -eq $hn) { $dup = $true } }
          if (-not $dup) {
            [void]$mapped.Add([pscustomobject]@{
              CompanyId = (To-Int64OrNull $h.id)
              CompanyName = $hn
              CustomerCode = $code
            })
          }
        }
      }
    }
  } catch {
    Write-Host ('ERR   ' + $w.c + ' ' + $_.Exception.Message)
  }
}

Write-Host ''
Write-Host '=== ASSURE COVER (after search) ==='
foreach ($code in @('AHIC','RSR','RSS','UVSS','HYDRA','ABLE','SBS','SBT','BHF','SIRF','RPMINT','IB','METSI','YLJ','MEDIPOS','VAULT')) {
  $rows = @($mapped | Where-Object { $_.CustomerCode -eq $code })
  if ($rows.Count -eq 0) { Write-Host ('NO COMPANY  ' + $code) }
  else { Write-Host ('OK          ' + $code + ' <- ' + (($rows | ForEach-Object { $_.CompanyName }) -join '; ')) }
}

if ($mapped.Count -eq 0) {
  Write-Host 'Nothing to insert. Unmapped companies stay out of Assure.'
  return
}

$csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$csb['Data Source'] = $FreshdeskSqlServer
$csb['Initial Catalog'] = $FreshdeskSqlDatabase
$csb['Integrated Security'] = $true
$csb['TrustServerCertificate'] = $true
$cnn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
$cnn.Open()
try {
  foreach ($m in $mapped) {
    $cmd = $cnn.CreateCommand()
    $cmd.CommandText = @'
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @code)
  PRINT N'skip - customer not in Dim_Customer';
ELSE IF EXISTS (SELECT 1 FROM dbo.Dim_Freshdesk_CompanyMap WHERE CompanyName = @name)
  UPDATE dbo.Dim_Freshdesk_CompanyMap
    SET CustomerCode = @code, CompanyId = @id, Active = 1
    WHERE CompanyName = @name;
ELSE
  INSERT INTO dbo.Dim_Freshdesk_CompanyMap (CompanyId, CompanyName, CustomerCode, Notes)
  VALUES (@id, @name, @code, N'auto map existing customer only');
'@
    [void]$cmd.Parameters.AddWithValue('@code', [string]$m.CustomerCode)
    [void]$cmd.Parameters.AddWithValue('@name', [string]$m.CompanyName)
    if ($null -eq $m.CompanyId) {
      $pId = $cmd.Parameters.Add('@id', [Data.SqlDbType]::BigInt)
      $pId.Value = [DBNull]::Value
    } else {
      [void]$cmd.Parameters.AddWithValue('@id', [int64]$m.CompanyId)
    }
    [void]$cmd.ExecuteNonQuery()
  }

  $upd = $cnn.CreateCommand()
  $upd.CommandText = @'
UPDATE t SET t.CustomerCode = m.CustomerCode
FROM dbo.Freshdesk_Tickets t
JOIN dbo.Dim_Freshdesk_CompanyMap m ON m.Active = 1
 AND LTRIM(RTRIM(m.CompanyName)) = LTRIM(RTRIM(t.CompanyName))
WHERE t.CustomerCode IS NULL OR t.CustomerCode <> m.CustomerCode;
'@
  [void]$upd.ExecuteNonQuery()
} finally {
  $cnn.Close()
}

Write-Host ''
Write-Host '=== Dim_Freshdesk_CompanyMap now ==='
& $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -W -s ',' -Q "SET NOCOUNT ON; SELECT CompanyName, CustomerCode, CompanyId FROM dbo.Dim_Freshdesk_CompanyMap WHERE Active = 1 ORDER BY CustomerCode;"
Write-Host ('Mapped=' + $mapped.Count + ' Unmapped=' + $unmapped.Count)
Write-Host 'Non-Assure companies (e.g. Merlog) stay unmapped.'
