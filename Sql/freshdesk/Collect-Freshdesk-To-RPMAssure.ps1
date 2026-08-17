# Collect-Freshdesk-To-RPMAssure.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\freshdesk\Collect-Freshdesk-To-RPMAssure.ps1

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$logDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log = Join-Path $logDir ("freshdesk_{0}.log" -f $stamp)

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
if (-not $FreshdeskSqlUser -and $SqlUser) { $FreshdeskSqlUser = $SqlUser }
if (-not $FreshdeskSqlPassword -and $SqlPassword) { $FreshdeskSqlPassword = $SqlPassword }
if (-not $FreshdeskSqlUser) { $FreshdeskSqlUser = 'Rpm_collect' }
if (-not $FreshdeskSqlPassword) { $FreshdeskSqlPassword = 'RpmCollect#AHIC2026' }

Write-Log '=== Freshdesk collect start ==='
Write-Log ('domain=' + $FreshdeskDomain + ' lookbackDays=' + $FreshdeskLookbackDays)

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

$since = (Get-Date).ToUniversalTime().AddDays(-[int]$FreshdeskLookbackDays)
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
  } while ($page -le 50 -and $batch.Count -eq 100)
} catch {
  Write-Log ('list-since warn ' + $_.Exception.Message)
}
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

# Company catalog (id -> name) so blank company_id rows can be mapped
$companyName = @{}
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

Write-Log ('tickets pulled=' + $all.Count)

# 3) Force-get tickets pinned in Dim_Freshdesk_TicketMap (BHF test 16248, etc.)
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

$maxStats = [Math]::Min(400, $all.Count)
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

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('SET NOCOUNT ON;')
[void]$sb.AppendLine("DECLARE @Snap date = CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS date);")
[void]$sb.AppendLine('DECLARE @Imp datetime2(3) = SYSUTCDATETIME();')
[void]$sb.AppendLine('IF OBJECT_ID(N''dbo.Freshdesk_Tickets'', N''U'') IS NULL BEGIN RAISERROR(N''Freshdesk_Tickets missing - run 510_Ensure_Freshdesk_Tickets.sql'', 16, 1); RETURN; END')
[void]$sb.AppendLine('DELETE FROM dbo.Freshdesk_Tickets WHERE SnapshotDate = @Snap;')

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

  $line = 'INSERT INTO dbo.Freshdesk_Tickets (SnapshotDate, TicketId, CustomerCode, Subject, StatusId, StatusName, PriorityId, PriorityName, SourceId, TypeName, RequesterId, RequesterEmail, ResponderId, GroupId, CompanyId, CompanyName, CreatedAtUtc, UpdatedAtUtc, DueByUtc, FirstRespondedAtUtc, ResolvedAtUtc, ClosedAtUtc, TagsJson, CustomFieldsJson, ImportedAt) VALUES (@Snap, ' +
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
[IO.File]::WriteAllText($sqlFile, $sb.ToString())
Write-Log ('SQL written ' + $sqlFile)

Invoke-FdSql $sqlFile
if ($LASTEXITCODE -ne 0) {
  Write-Log ('sqlcmd failed exit=' + $LASTEXITCODE)
  throw ('sqlcmd failed ' + $LASTEXITCODE)
}

Write-Log ('=== Freshdesk collect done tickets=' + $all.Count + ' log=' + $log + ' ===')

foreach ($sqlName in @(
  '518_Ensure_Customers_From_Freshdesk.sql',
  '512_Register_SBT_And_Map_BHF.sql',
  '514_Fuzzy_Map_Freshdesk_Companies.sql',
  '513_Sync_Freshdesk_To_Fact_Incident.sql'
)) {
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

