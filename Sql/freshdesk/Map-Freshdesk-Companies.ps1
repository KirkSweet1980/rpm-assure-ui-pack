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

$aliases = @(
  @{ n = 'ahi carrier'; c = 'AHIC' },
  @{ n = 'ahi carriers'; c = 'AHIC' },
  @{ n = 'ahic'; c = 'AHIC' },
  @{ n = 'redsun raisins'; c = 'RSR' },
  @{ n = 'redsun'; c = 'RSR' },
  @{ n = 'rsr'; c = 'RSR' },
  @{ n = 'remote site solutions'; c = 'RSS' },
  @{ n = 'rss'; c = 'RSS' },
  @{ n = 'unique ventilation'; c = 'UVSS' },
  @{ n = 'uvss'; c = 'UVSS' },
  @{ n = 'hydra sales'; c = 'HYDRA' },
  @{ n = 'hydrasales'; c = 'HYDRA' },
  @{ n = 'hydra'; c = 'HYDRA' },
  @{ n = 'able tracers'; c = 'ABLE' },
  @{ n = 'able traces'; c = 'ABLE' },
  @{ n = 'simply bright'; c = 'SBS' },
  @{ n = 'sbs'; c = 'SBS' },
  @{ n = 'board of healthcare funders'; c = 'BHF' },
  @{ n = 'bhf'; c = 'BHF' },
  @{ n = 'pcns'; c = 'BHF' },
  @{ n = 'sirf'; c = 'SIRF' },
  @{ n = 'rpm resources'; c = 'RPMINT' },
  @{ n = 'rpm internal'; c = 'RPMINT' },
  @{ n = 'rpmint'; c = 'RPMINT' },
  @{ n = 'interbrand'; c = 'IB' },
  @{ n = 'metsiwater'; c = 'METSI' },
  @{ n = 'metsi'; c = 'METSI' },
  @{ n = 'ylj health'; c = 'YLJ' },
  @{ n = 'ylj'; c = 'YLJ' },
  @{ n = 'medipos'; c = 'MEDIPOS' },
  @{ n = 'vault tech'; c = 'VAULT' },
  @{ n = 'vault-tech'; c = 'VAULT' }
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

function Resolve-Code([string]$fdName) {
  $n = Norm $fdName
  if (-not $n) { return $null }
  foreach ($c in $customers) {
    if ($n -eq $c.Norm -or $n -eq $c.CodeNorm) { return $c.Code }
  }
  foreach ($a in $aliases) {
    if ($n -eq $a.n -or $n.Contains($a.n) -or $a.n.Contains($n)) {
      $up = $a.c.ToUpperInvariant()
      if ($valid.ContainsKey($up)) { return $up }
    }
  }
  foreach ($c in $customers) {
    if ($c.Norm.Length -ge 4 -and ($n.Contains($c.Norm) -or $c.Norm.Contains($n))) { return $c.Code }
  }
  return $null
}

$mapped = New-Object System.Collections.Generic.List[object]
$unmapped = New-Object System.Collections.Generic.List[object]
foreach ($co in $companies) {
  $name = [string](One-Val $co.name)
  $code = Resolve-Code $name
  $row = [pscustomobject]@{ CompanyId = (To-Int64OrNull $co.id); CompanyName = $name; CustomerCode = $code }
  if ($code) { [void]$mapped.Add($row) } else { [void]$unmapped.Add($row) }
}

Write-Host ''
Write-Host '=== MAP (Assure customer exists) ==='
$mapped | Format-Table CompanyName, CustomerCode, CompanyId -AutoSize
Write-Host '=== UNMAPPED (left out on purpose) ==='
$unmapped | Format-Table CompanyName, CompanyId -AutoSize

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
