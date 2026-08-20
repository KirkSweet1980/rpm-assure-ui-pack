# Collect-Freshdesk-To-RPMAssure.ps1
#   1-min incremental (SLA clocks) + 15-min full catch-up
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\freshdesk\Collect-Freshdesk-To-RPMAssure.ps1 -Mode Auto

param(
  [ValidateSet('Auto', 'Incremental', 'Full')]
  [string]$Mode = 'Auto'
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$logDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log = Join-Path $logDir ("freshdesk_{0}.log" -f $stamp)
$lock = Join-Path $logDir 'freshdesk.collect.lock'

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function Invoke-FdSql([string]$File) {
  if ($FreshdeskSqlUser -and $FreshdeskSqlPassword) {
    & $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -U $FreshdeskSqlUser -P $FreshdeskSqlPassword -C -I -b -i $File
  } else {
    & $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -I -b -i $File
  }
}

$cfg = Join-Path $here 'Freshdesk.Config.ps1'
if (-not (Test-Path -LiteralPath $cfg)) {
  Write-Host 'SKIP Freshdesk - missing Freshdesk.Config.ps1'
  exit 2
}
. $cfg

if ([string]::IsNullOrWhiteSpace($FreshdeskDomain)) { Write-Host 'SKIP Freshdesk - domain not set'; exit 2 }
if ([string]::IsNullOrWhiteSpace($FreshdeskApiKey)) { Write-Host 'SKIP Freshdesk - api key not set'; exit 2 }
$FreshdeskDomain = $FreshdeskDomain.Trim() -replace '^https?://', '' -replace '/$', ''
if (-not $FreshdeskSqlServer -or $FreshdeskSqlServer -match '14333|102\.222\.21\.220') { $FreshdeskSqlServer = '.\RPMREPORTS' }
if (-not $FreshdeskSqlServer) { $FreshdeskSqlServer = '.\RPMREPORTS' }
if (-not $FreshdeskSqlDatabase) { $FreshdeskSqlDatabase = 'RPMAssure_App' }
if (-not $FreshdeskLookbackDays) { $FreshdeskLookbackDays = 90 }
if (-not $FreshdeskLookbackMinutes) { $FreshdeskLookbackMinutes = 15 }
if (-not $FreshdeskSqlUser -and $SqlUser) { $FreshdeskSqlUser = $SqlUser }
if (-not $FreshdeskSqlPassword -and $SqlPassword) { $FreshdeskSqlPassword = $SqlPassword }
if (-not $FreshdeskSqlUser) { $FreshdeskSqlUser = 'Rpm_collect' }
if (-not $FreshdeskSqlPassword) { $FreshdeskSqlPassword = 'RpmCollect#AHIC2026' }

if ($Mode -eq 'Auto') {
  $min = [int](Get-Date).Minute
  $Mode = if (($min % 15) -eq 0) { 'Full' } else { 'Incremental' }
}
$isFull = ($Mode -eq 'Full')

if (Test-Path -LiteralPath $lock) {
  try {
    $ageMin = ((Get-Date) - (Get-Item -LiteralPath $lock).LastWriteTime).TotalMinutes
    if ($ageMin -lt 12) {
      Write-Host ('SKIP Freshdesk - collect already running (' + [int]$ageMin + ' min)')
      exit 0
    }
    Write-Host ('stale lock ' + [int]$ageMin + ' min - taking over')
  } catch {}
}
[IO.File]::WriteAllText($lock, (Get-Date).ToUniversalTime().ToString('o'))

Write-Log '=== Freshdesk collect start ==='
Write-Log ('domain=' + $FreshdeskDomain + ' mode=' + $Mode + ' lookbackDays=' + $FreshdeskLookbackDays)

$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }

$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${FreshdeskApiKey}:X"))
$hdr = @{
  Authorization  = "Basic $b64"
  'Content-Type' = 'application/json'
  Accept         = 'application/json'
}

function Invoke-FdGet([string]$Url) {
  if ($Url -notmatch '^https://') {
    $Url = "https://$FreshdeskDomain/api/v2/$($Url.TrimStart('/'))"
  }
  $attempt = 0
  while ($true) {
    $attempt++
    try {
      $r = Invoke-WebRequest -Uri $Url -Headers $hdr -Method GET -TimeoutSec 120 -UseBasicParsing
      if (-not $r.Content) { return $null }
      return ($r.Content | ConvertFrom-Json)
    } catch {
      $code = $null
      $body = ''
      try { $code = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $sr.ReadToEnd()
      } catch {}
      if ($code -eq 429 -and $attempt -lt 5) {
        $wait = [Math]::Min(60, 5 * $attempt)
        Write-Log ('rate limit 429 - sleep ' + $wait + 's')
        Start-Sleep -Seconds $wait
        continue
      }
      Write-Log ('HTTP ' + $code + ' ' + $Url)
      if ($body) { Write-Log ('body ' + $body.Substring(0, [Math]::Min(300, $body.Length))) }
      throw
    }
  }
}

function Status-Name($id) {
  switch ([string]$id) { '2' { 'Open' } '3' { 'Pending' } '4' { 'Resolved' } '5' { 'Closed' } default { 'Status' + $id } }
}
function Priority-Name($id) {
  switch ([string]$id) { '1' { 'Low' } '2' { 'Medium' } '3' { 'High' } '4' { 'Urgent' } default { 'P' + $id } }
}

function One-Val($v) {
  if ($null -eq $v) { return $null }
  if ($v -is [System.Array]) {
    if ($v.Length -eq 0) { return $null }
    return $v[0]
  }
  return $v
}

function Sql-Esc($s) {
  $v = One-Val $s
  if ($null -eq $v) { return 'NULL' }
  $t = [string]$v
  $t = $t.Replace("'", "''")
  if ($t.Length -gt 4000) { $t = $t.Substring(0, 4000) }
  return "N'$t'"
}
function Sql-Dt($v) {
  $v = One-Val $v
  if ($null -eq $v -or [string]::IsNullOrWhiteSpace([string]$v)) { return 'NULL' }
  try {
    $d = [datetime]::Parse([string]$v, [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    return ("'{0:yyyy-MM-dd HH:mm:ss}'" -f $d)
  } catch { return 'NULL' }
}
function Sql-Num($v) {
  $v = One-Val $v
  if ($null -eq $v -or [string]::IsNullOrWhiteSpace([string]$v)) { return 'NULL' }
  $t = [string]$v
  if ($t -notmatch '^-?\d+(\.\d+)?$') { return 'NULL' }
  return $t
}
function Sql-Json($obj) {
  if ($null -eq $obj) { return 'NULL' }
  try {
    $j = $obj | ConvertTo-Json -Compress -Depth 5
    if ($j -is [System.Array]) { $j = [string]::Join('', @($j)) }
    return (Sql-Esc ([string]$j))
  } catch { return 'NULL' }
}

if ($isFull) {
  $since = (Get-Date).ToUniversalTime().AddDays(-[int]$FreshdeskLookbackDays)
} else {
  $since = (Get-Date).ToUniversalTime().AddMinutes(-[int]$FreshdeskLookbackMinutes)
}
Write-Log ('updated_since=' + $since.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"))
$all = New-Object System.Collections.Generic.List[object]
$seen = @{}

function Add-Tickets($items, [string]$src) {
  $n = 0
  foreach ($t in @($items)) {
    $tid = One-Val $t.id
    if (-not $tid) { continue }
    $key = [string]$tid
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    [void]$all.Add($t)
    $n++
  }
  if ($n -gt 0) { Write-Log ('add ' + $src + ' +' + $n + ' total=' + $all.Count) }
}

# 1) List pages + all_tickets + updated_since (desc). company_id search is NOT valid on this plan.
try {
  $page = 1
  $sinceIso = [uri]::EscapeDataString($since.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"))
  do {
    $batch = @(Invoke-FdGet ("tickets?per_page=100&page=$page&order_by=updated_at&order_type=desc&updated_since=$sinceIso"))
    if ($batch.Count -eq 0) { break }
    Add-Tickets $batch ('list-since page=' + $page)
    $page++
    Start-Sleep -Milliseconds 200
  } while ($page -le $(if ($isFull) { 50 } else { 5 }) -and $batch.Count -eq 100)
} catch {
  Write-Log ('list-since warn ' + $_.Exception.Message)
}
if ($isFull) {
try {
  $page = 1
  do {
    $batch = @(Invoke-FdGet ("tickets?per_page=100&page=$page&order_by=updated_at&order_type=desc&filter=all_tickets"))
    if ($batch.Count -eq 0) { break }
    Add-Tickets $batch ('list-all page=' + $page)
    $page++
    Start-Sleep -Milliseconds 200
  } while ($page -le 20 -and $batch.Count -eq 100)
} catch {
  Write-Log ('list-all warn ' + $_.Exception.Message)
}
} else {
  Write-Log 'incremental - skip list-all'
}

# Company catalog (id -> name) so blank company_id rows can be mapped
$companyName = @{}
if ($isFull) {
try {
  $cp = 1
  do {
    $cos = @(Invoke-FdGet ("companies?per_page=100&page=$cp"))
    foreach ($c in $cos) {
      $cid = [string](One-Val $c.id)
      $cn = [string](One-Val $c.name)
      if ($cid -and $cn) { $companyName[$cid] = $cn }
    }
    Write-Log ('companies page=' + $cp + ' got=' + $cos.Count + ' catalog=' + $companyName.Count)
    $cp++
    Start-Sleep -Milliseconds 200
  } while ($cp -le 10 -and $cos.Count -eq 100)
} catch {
  Write-Log ('companies catalog warn ' + $_.Exception.Message)
}
} else {
  Write-Log 'incremental - skip companies catalog'
}

# 2) Pull tickets per mapped company_id (list filter + search)
$namesTxt = & $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -h -1 -W -s '|' -Q "SET NOCOUNT ON; SELECT DISTINCT LTRIM(RTRIM(CustomerCode)), CONVERT(varchar(30), CompanyId) FROM dbo.Dim_Freshdesk_CompanyMap WHERE Active = 1 AND CompanyId IS NOT NULL;"
$maps = @()
$seenId = @{}
foreach ($line in @($namesTxt)) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  if ($line -match 'Changed database') { continue }
  $p = $line.Split('|')
  if ($p.Length -lt 2) { continue }
  $code = $p[0].Trim(); $id = $p[1].Trim()
  if ($id -match '^\d+$' -and -not $seenId.ContainsKey($id)) {
    $seenId[$id] = $true
    $maps += [pscustomobject]@{ Code = $code; CompanyId = $id }
  }
}
# Always include known BHF company
if (-not $seenId.ContainsKey('48006116932')) {
  $maps += [pscustomobject]@{ Code = 'BHF'; CompanyId = '48006116932' }
  $seenId['48006116932'] = $true
}
Write-Log ('mapped company ids=' + $maps.Count)
Write-Log ('skip search-by-company_id (Freshdesk plan rejects that field)')

# Ticket-id pin (BHF 16248 etc.) + company maps in memory — no SQL COALESCE
$codeByTicket = @{}
$codeByCompanyId = @{}
$codeByCompanyName = @{}
try {
  $tm = & $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -h -1 -W -s '|' -Q "SET NOCOUNT ON; IF OBJECT_ID(N'dbo.Dim_Freshdesk_TicketMap') IS NOT NULL SELECT TicketId, CustomerCode FROM dbo.Dim_Freshdesk_TicketMap WHERE Active = 1;"
  foreach ($line in @($tm)) {
    if ($line -match '^\s*(\d+)\s*\|\s*(\S+)') { $codeByTicket[$Matches[1]] = $Matches[2].Trim() }
  }
} catch {}
$codeByTicket['16248'] = 'BHF'
try {
  $cm = & $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -h -1 -W -s '|' -Q "SET NOCOUNT ON; SELECT CONVERT(varchar(30), CompanyId), CustomerCode, CompanyName FROM dbo.Dim_Freshdesk_CompanyMap WHERE Active = 1;"
  foreach ($line in @($cm)) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line -match 'Changed database') { continue }
    $p = $line.Split('|')
    if ($p.Length -lt 2) { continue }
    $id = $p[0].Trim(); $code = $p[1].Trim(); $nm = if ($p.Length -ge 3) { $p[2].Trim() } else { '' }
    if ($id -match '^\d+$' -and $code) { $codeByCompanyId[$id] = $code }
    if ($nm -and $code) { $codeByCompanyName[$nm.ToLowerInvariant()] = $code }
  }
} catch {}
Write-Log ('maps ticket=' + $codeByTicket.Count + ' companyId=' + $codeByCompanyId.Count)

if ($isFull) {
foreach ($m in $maps) {
  try {
    $page = 1
    do {
      $batch = @(Invoke-FdGet ("tickets?per_page=100&page=$page&company_id=$($m.CompanyId)&order_by=updated_at&order_type=desc"))
      if ($batch.Count -eq 0) { break }
      Add-Tickets $batch ('list-co ' + $m.Code + ' id=' + $m.CompanyId + ' p' + $page)
      $page++
      Start-Sleep -Milliseconds 200
    } while ($page -le 10 -and $batch.Count -eq 100)
  } catch {
    Write-Log ('list-co warn ' + $m.Code + ' ' + $_.Exception.Message)
  }
}
} else {
  Write-Log 'incremental - skip per-company list'
}

Write-Log ('tickets pulled=' + $all.Count)

# 3) Force-get tickets pinned in Dim_Freshdesk_TicketMap (BHF test 16248, etc.)
if ($isFull) {
$forceTxt = & $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -h -1 -W -Q "SET NOCOUNT ON; IF OBJECT_ID(N'dbo.Dim_Freshdesk_TicketMap') IS NULL SELECT 16248 ELSE SELECT TicketId FROM dbo.Dim_Freshdesk_TicketMap WHERE Active = 1 UNION SELECT 16248;"
$forceIds = @()
foreach ($line in @($forceTxt)) {
  if ($line -match '^\s*(\d+)\s*$') { $forceIds += [int64]$Matches[1] }
}
if ($forceIds -notcontains 16248) { $forceIds += 16248 }
$haveIds = @{}
foreach ($t in $all) {
  $hid = One-Val $t.id
  if ($hid) { $haveIds[[string]$hid] = $true }
}
foreach ($fid in $forceIds) {
  if ($haveIds.ContainsKey([string]$fid)) {
    Write-Log ('force ticket already in set id=' + $fid)
    continue
  }
  try {
    $full = Invoke-FdGet ("tickets/{0}?include=stats,requester,company" -f $fid)
    if ($full) {
      Add-Tickets @($full) ('force-id ' + $fid)
      $haveIds[[string]$fid] = $true
    }
  } catch {
    Write-Log ('force-id fail ' + $fid + ' ' + $_.Exception.Message)
  }
  Start-Sleep -Milliseconds 200
}
} else {
  Write-Log 'incremental - skip force-id pins'
}

$maxStats = if ($isFull) { [Math]::Min(400, $all.Count) } else { $all.Count }
$statsOk = 0
for ($i = 0; $i -lt $maxStats; $i++) {
  $t = $all[$i]
  $tid = $t.id
  if (-not $tid) { continue }
  try {
    $full = Invoke-FdGet ("tickets/{0}?include=stats,requester,company" -f $tid)
    if ($full.stats) { $t | Add-Member -NotePropertyName '_stats' -NotePropertyValue $full.stats -Force }
    if ($full.requester) { $t | Add-Member -NotePropertyName '_requester' -NotePropertyValue $full.requester -Force }
    if ($full.company) { $t | Add-Member -NotePropertyName '_company' -NotePropertyValue $full.company -Force }
    $statsOk++
  } catch {
    Write-Log ('stats skip id=' + $tid + ' err=' + $_.Exception.Message)
  }
  Start-Sleep -Milliseconds 200
}
Write-Log ('stats enrich tried=' + $maxStats + ' ok=' + $statsOk)

function To-SlaMins($v) {
  if ($null -eq $v -or [string]::IsNullOrWhiteSpace([string]$v)) { return $null }
  $t = [string]$v
  if ($t -match '^(\d+):(\d+)$') {
    return (([int]$Matches[1]) * 60 + [int]$Matches[2])
  }
  $n = 0
  if (-not [int]::TryParse($t, [ref]$n)) { return $null }
  if ($n -le 0) { return $null }
  if ($n -ge 60) { return [int][Math]::Round($n / 60.0) }
  return $n
}
function Fd-PriBucket([string]$key) {
  $k = ($key | ForEach-Object { $_.ToLowerInvariant() })
  if ($k -match '4|urgent|critical|p1') { return 'Critical' }
  if ($k -match '3|high|p2') { return 'High' }
  if ($k -match '2|medium|normal|p3') { return 'Medium' }
  return 'Low'
}

$slaRows = New-Object System.Collections.Generic.List[object]
if ($isFull) {
try {
  $rawSla = Invoke-FdGet 'sla_policies'
  $policies = @()
  if ($rawSla -is [System.Array]) { $policies = @($rawSla) }
  elseif ($rawSla.sla_policies) { $policies = @($rawSla.sla_policies) }
  elseif ($rawSla) { $policies = @($rawSla) }
  Write-Log ('sla_policies count=' + $policies.Count)
  foreach ($p in $policies) {
    $pid = Sql-Num (One-Val $p.id)
    if ($pid -eq 'NULL') { continue }
    $pname = [string](One-Val $p.name)
    $isDef = if ($p.is_default -eq $true) { 1 } else { 0 }
    $pos = $null
    try { if ($null -ne $p.position) { $pos = [int](One-Val $p.position) } } catch {}
    $active = if ($p.active -eq $false) { 0 } else { 1 }
    $companyIds = @()
    try {
      $co = $p.applicable_to.company_ids
      if ($co) { $companyIds = @($co) }
    } catch {}
    $targets = @{}
    if ($p.sla_target) {
      foreach ($prop in $p.sla_target.PSObject.Properties) {
        $targets[$prop.Name] = $prop.Value
      }
    }
    if ($p.policy_metrics) {
      foreach ($m in @($p.policy_metrics)) {
        $pk = [string](One-Val $m.priority)
        if (-not $pk) { $pk = 'priority_2' }
        if (-not $targets.ContainsKey($pk)) { $targets[$pk] = [pscustomobject]@{} }
        $mt = [string](One-Val $m.metric_type)
        $mins = To-SlaMins (One-Val $m.target)
        if ($mt -match 'first_response|respond') { $targets[$pk] | Add-Member respond_within ($mins * 60) -Force }
        elseif ($mt -match 'resolv') { $targets[$pk] | Add-Member resolve_within ($mins * 60) -Force }
        if ($null -ne $m.business_hours) { $targets[$pk] | Add-Member business_hours $m.business_hours -Force }
      }
    }
    if ($targets.Count -eq 0) { continue }
    $codes = New-Object System.Collections.Generic.List[object]
    if ($companyIds.Count -eq 0 -or $isDef -eq 1) {
      [void]$codes.Add([pscustomobject]@{ CompanyId = $null; Code = $null })
    }
    foreach ($cid in $companyIds) {
      $id = [string](One-Val $cid)
      $code = $null
      if ($id -and $codeByCompanyId.ContainsKey($id)) { $code = $codeByCompanyId[$id] }
      [void]$codes.Add([pscustomobject]@{ CompanyId = $id; Code = $code })
    }
    foreach ($bucket in $targets.GetEnumerator()) {
      $pri = Fd-PriBucket ([string]$bucket.Key)
      $tv = $bucket.Value
      $resp = To-SlaMins (One-Val $tv.respond_within)
      $reso = To-SlaMins (One-Val $tv.resolve_within)
      if ($null -eq $resp -and $null -eq $reso) { continue }
      $bh = $null
      if ($tv.business_hours -eq $true) { $bh = 1 }
      elseif ($tv.business_hours -eq $false) { $bh = 0 }
      foreach ($c in $codes) {
        [void]$slaRows.Add([pscustomobject]@{
          PolicyId = [int64](One-Val $p.id)
          PolicyName = $pname
          IsDefault = $isDef
          Position = $pos
          Active = $active
          Priority = $pri
          RespondMins = $resp
          ResolveMins = $reso
          BusinessHours = $bh
          CompanyId = $c.CompanyId
          CustomerCode = $c.Code
        })
      }
    }
  }
} catch {
  Write-Log ('sla_policies warn ' + $_.Exception.Message)
}
} else {
  Write-Log 'incremental - skip sla_policies'
}
Write-Log ('sla rows=' + $slaRows.Count)

$slaSqlFile = $null
if ($slaRows.Count -gt 0) {
  $slaSb = New-Object System.Text.StringBuilder
  [void]$slaSb.AppendLine('SET NOCOUNT ON;')
  [void]$slaSb.AppendLine('IF OBJECT_ID(N''dbo.Freshdesk_SlaPolicy'', N''U'') IS NOT NULL DELETE FROM dbo.Freshdesk_SlaPolicy;')
  foreach ($r in $slaRows) {
    $co = if ($r.CompanyId) { $r.CompanyId } else { 'NULL' }
    $code = if ($r.CustomerCode) { Sql-Esc $r.CustomerCode } else { 'NULL' }
    $resp = if ($null -ne $r.RespondMins) { [string]$r.RespondMins } else { 'NULL' }
    $reso = if ($null -ne $r.ResolveMins) { [string]$r.ResolveMins } else { 'NULL' }
    $bh = if ($null -ne $r.BusinessHours) { [string]$r.BusinessHours } else { 'NULL' }
    $pos = if ($null -ne $r.Position) { [string][int]$r.Position } else { 'NULL' }
    [void]$slaSb.AppendLine(("INSERT INTO dbo.Freshdesk_SlaPolicy (PolicyId, PolicyName, IsDefault, Position, Active, Priority, RespondMins, ResolveMins, BusinessHours, CompanyId, CustomerCode, ImportedAt) VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, SYSUTCDATETIME());" -f `
      $r.PolicyId, (Sql-Esc $r.PolicyName), $r.IsDefault, $pos, $r.Active, (Sql-Esc $r.Priority), $resp, $reso, $bh, $co, $code))
  }
  [void]$slaSb.AppendLine(@"
IF OBJECT_ID(N'dbo.Dim_SlaPolicy', N'U') IS NOT NULL
BEGIN
  DELETE FROM dbo.Dim_SlaPolicy WHERE Source = N'FRESHDESK';
  INSERT INTO dbo.Dim_SlaPolicy (CustomerCode, Priority, RespondMins, ResolveMins, AvailabilityPct, Active, Source, PolicyName, BusinessHours, ExternalPolicyId, Position)
  SELECT CustomerCode, Priority, ISNULL(RespondMins, 0), ISNULL(ResolveMins, 0), NULL, Active, N'FRESHDESK', PolicyName, BusinessHours, PolicyId, Position
  FROM dbo.Freshdesk_SlaPolicy
  WHERE Active = 1 AND ISNULL(RespondMins, 0) > 0;
  IF EXISTS (SELECT 1 FROM dbo.Dim_SlaPolicy WHERE Source = N'FRESHDESK' AND Active = 1)
    UPDATE dbo.Dim_SlaPolicy
      SET Active = 0
      WHERE Active = 1 AND (Source IS NULL OR Source IN (N'SEED', N'CONTRACT')) AND CustomerCode IS NULL;
END
"@)
  $slaSqlFile = Join-Path $logDir ("freshdesk_sla_{0}.sql" -f $stamp)
  [IO.File]::WriteAllText($slaSqlFile, $slaSb.ToString())
  Write-Log ('SLA SQL written ' + $slaSqlFile)
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('SET NOCOUNT ON;')
[void]$sb.AppendLine("DECLARE @Snap date = CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS date);")
[void]$sb.AppendLine('DECLARE @Imp datetime2(3) = SYSUTCDATETIME();')
[void]$sb.AppendLine('IF OBJECT_ID(N''dbo.Freshdesk_Tickets'', N''U'') IS NULL BEGIN RAISERROR(N''Freshdesk_Tickets missing - run 510_Ensure_Freshdesk_Tickets.sql'', 16, 1); RETURN; END')
if ($isFull) {
  [void]$sb.AppendLine('DELETE FROM dbo.Freshdesk_Tickets WHERE SnapshotDate = @Snap;')
}

foreach ($t in $all) {
  $tid = $t.id
  if (-not $tid) { continue }

  $statusId = One-Val $t.status
  $priId = One-Val $t.priority
  $reqEmail = $null
  if ($t._requester -and $t._requester.email) { $reqEmail = [string](One-Val $t._requester.email) }
  elseif ($t.email) { $reqEmail = [string](One-Val $t.email) }

  $coId = $null; $coName = $null
  if ($t._company) {
    if ($t._company.id) { $coId = One-Val $t._company.id }
    if ($t._company.name) { $coName = [string](One-Val $t._company.name) }
  }
  if (-not $coId -and $t.company_id) { $coId = One-Val $t.company_id }
  if (-not $coName -and $coId -and $companyName.ContainsKey([string]$coId)) {
    $coName = $companyName[[string]$coId]
  }

  $firstR = $null; $resolved = $null; $closed = $null
  if ($t._stats) {
    $firstR = One-Val $t._stats.first_responded_at
    $resolved = One-Val $t._stats.resolved_at
    $closed = One-Val $t._stats.closed_at
  }

  $subj = [string](One-Val $t.subject)
  if ($subj.Length -gt 480) { $subj = $subj.Substring(0, 480) }

  $tagsJson = Sql-Json $t.tags
  $cfJson = Sql-Json $t.custom_fields

  $codeLit = 'NULL'
  $tidKey = [string](One-Val $tid)
  if ($codeByTicket.ContainsKey($tidKey)) {
    $codeLit = Sql-Esc $codeByTicket[$tidKey]
  } elseif ($coId -and $codeByCompanyId.ContainsKey([string]$coId)) {
    $codeLit = Sql-Esc $codeByCompanyId[[string]$coId]
  } elseif ($coName -and $codeByCompanyName.ContainsKey($coName.ToLowerInvariant())) {
    $codeLit = Sql-Esc $codeByCompanyName[$coName.ToLowerInvariant()]
  }

  $line = $(if ($isFull) { '' } else { 'DELETE FROM dbo.Freshdesk_Tickets WHERE SnapshotDate = @Snap AND TicketId = ' + (Sql-Num $tid) + '; ' }) +
    'INSERT INTO dbo.Freshdesk_Tickets (SnapshotDate, TicketId, CustomerCode, Subject, StatusId, StatusName, PriorityId, PriorityName, SourceId, TypeName, RequesterId, RequesterEmail, ResponderId, GroupId, CompanyId, CompanyName, CreatedAtUtc, UpdatedAtUtc, DueByUtc, FirstRespondedAtUtc, ResolvedAtUtc, ClosedAtUtc, TagsJson, CustomFieldsJson, ImportedAt) VALUES (@Snap, ' +
    (Sql-Num $tid) + ', ' +
    $codeLit + ', ' +
    (Sql-Esc $subj) + ', ' +
    (Sql-Num $statusId) + ', ' +
    (Sql-Esc (Status-Name $statusId)) + ', ' +
    (Sql-Num $priId) + ', ' +
    (Sql-Esc (Priority-Name $priId)) + ', ' +
    (Sql-Num (One-Val $t.source)) + ', ' +
    (Sql-Esc ([string](One-Val $t.type))) + ', ' +
    (Sql-Num (One-Val $t.requester_id)) + ', ' +
    (Sql-Esc $reqEmail) + ', ' +
    (Sql-Num (One-Val $t.responder_id)) + ', ' +
    (Sql-Num (One-Val $t.group_id)) + ', ' +
    (Sql-Num $coId) + ', ' +
    (Sql-Esc $coName) + ', ' +
    (Sql-Dt (One-Val $t.created_at)) + ', ' +
    (Sql-Dt (One-Val $t.updated_at)) + ', ' +
    (Sql-Dt (One-Val $t.due_by)) + ', ' +
    (Sql-Dt $firstR) + ', ' +
    (Sql-Dt $resolved) + ', ' +
    (Sql-Dt $closed) + ', ' +
    $tagsJson + ', ' +
    $cfJson + ', @Imp);'
  [void]$sb.AppendLine($line)
}

[void]$sb.AppendLine(@"
IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Dim_Connection', N'ConnectionCode') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Dim_Connection WHERE ConnectionCode = N'FRESHDESK')
    UPDATE dbo.Dim_Connection
      SET Status = N'Active', LastSyncAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME(),
          Notes = N'OK tickets=$($all.Count)'
      WHERE ConnectionCode = N'FRESHDESK';
  ELSE
    INSERT INTO dbo.Dim_Connection (ConnectionCode, DisplayName, SourceKind, Status, Notes, LastSyncAt)
    VALUES (N'FRESHDESK', N'Freshdesk Tickets', N'Ams', N'Active', N'OK tickets=$($all.Count)', SYSUTCDATETIME());
END
"@)

$sqlFile = Join-Path $logDir ("freshdesk_load_{0}.sql" -f $stamp)
if ($all.Count -gt 0) {
  [IO.File]::WriteAllText($sqlFile, $sb.ToString())
  Write-Log ('SQL written ' + $sqlFile)
  Invoke-FdSql $sqlFile
  if ($LASTEXITCODE -ne 0) {
    Write-Log ('sqlcmd failed exit=' + $LASTEXITCODE)
    throw ('sqlcmd failed ' + $LASTEXITCODE)
  }
} else {
  Write-Log 'no tickets this cycle - skip load'
}

try {
  $idFile = Join-Path $logDir ("identity_stamp_" + $stamp + ".sql")
  [IO.File]::WriteAllText($idFile, "SET NOCOUNT ON;`nEXEC dbo.usp_RefreshExternalIdentityFromMaps;`nEXEC dbo.usp_StampFreshdeskFromIdentity;`n")
  Invoke-FdSql $idFile
  Write-Log 'Identity stamp OK'
} catch {
  Write-Log ('identity stamp warn ' + $_.Exception.Message)
}

Write-Log ('=== Freshdesk collect done tickets=' + $all.Count + ' mode=' + $Mode + ' log=' + $log + ' ===')

$ensureSla = Join-Path $here '519_Ensure_Freshdesk_Sla.sql'
if ($isFull -and (Test-Path -LiteralPath $ensureSla)) {
  Write-Log 'SQL 519_Ensure_Freshdesk_Sla.sql'
  Invoke-FdSql $ensureSla
}
if ($isFull -and $slaSqlFile -and (Test-Path -LiteralPath $slaSqlFile)) {
  Write-Log 'SQL freshdesk_sla load'
  Invoke-FdSql $slaSqlFile
  if ($LASTEXITCODE -ne 0) { Write-Log ('sla load warned exit=' + $LASTEXITCODE) }
  else { Write-Log 'sla load OK' }
}

$postSql = if ($isFull) {
  @(
    '518_Ensure_Customers_From_Freshdesk.sql',
    '512_Register_SBT_And_Map_BHF.sql',
    '514_Fuzzy_Map_Freshdesk_Companies.sql',
    '513_Sync_Freshdesk_To_Fact_Incident.sql',
    '516_Stamp_Ticket_Sla_Flags.sql'
  )
} elseif ($all.Count -gt 0) {
  @(
    '513_Sync_Freshdesk_To_Fact_Incident.sql',
    '516_Stamp_Ticket_Sla_Flags.sql'
  )
} else {
  @()
}
foreach ($sqlName in $postSql) {
  $sync = Join-Path $here $sqlName
  if (-not (Test-Path -LiteralPath $sync)) { continue }
  Write-Log ('SQL ' + $sqlName)
  Invoke-FdSql $sync
  if ($LASTEXITCODE -ne 0) { Write-Log ($sqlName + ' warned exit=' + $LASTEXITCODE) }
  else { Write-Log ($sqlName + ' OK') }
}

$stampSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Dim_Connection WHERE ConnectionKind = N'FRESHDESK' OR SourceSystem = N'FRESHDESK')
    UPDATE dbo.Dim_Connection
      SET LastSuccessUtc = SYSUTCDATETIME(), Status = N'Active', LastMessage = N'collect ok tickets=$($all.Count)'
    WHERE ConnectionKind = N'FRESHDESK' OR SourceSystem = N'FRESHDESK';
  ELSE IF COL_LENGTH(N'dbo.Dim_Connection', N'ConnectionKind') IS NOT NULL
    INSERT INTO dbo.Dim_Connection (ConnectionKind, DisplayName, Status, LastSuccessUtc, LastMessage)
    VALUES (N'FRESHDESK', N'Freshdesk Tickets', N'Active', SYSUTCDATETIME(), N'collect ok tickets=$($all.Count)');
END
"@
$stampFile = Join-Path $logDir ("fd_stamp_" + $stamp + ".sql")
[IO.File]::WriteAllText($stampFile, $stampSql)
Invoke-FdSql $stampFile
Write-Log 'Dim_Connection FRESHDESK stamped Active'
Remove-Item -LiteralPath $lock -Force -ErrorAction SilentlyContinue

