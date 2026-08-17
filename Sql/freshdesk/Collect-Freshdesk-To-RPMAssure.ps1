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

$cfg = Join-Path $here 'Freshdesk.Config.ps1'
if (-not (Test-Path -LiteralPath $cfg)) {
  throw "Missing $cfg - copy Freshdesk.Config.example.ps1 and set Domain + ApiKey"
}
. $cfg

if ([string]::IsNullOrWhiteSpace($FreshdeskDomain)) { throw 'FreshdeskDomain not set' }
if ([string]::IsNullOrWhiteSpace($FreshdeskApiKey)) { throw 'FreshdeskApiKey not set' }
$FreshdeskDomain = $FreshdeskDomain.Trim() -replace '^https?://', '' -replace '/$', ''
if (-not $FreshdeskSqlServer) { $FreshdeskSqlServer = '.\RPMREPORTS' }
if (-not $FreshdeskSqlDatabase) { $FreshdeskSqlDatabase = 'RPMAssure_App' }
if (-not $FreshdeskLookbackDays) { $FreshdeskLookbackDays = 30 }

Write-Log '=== Freshdesk collect start ==='
Write-Log ('domain=' + $FreshdeskDomain + ' lookbackDays=' + $FreshdeskLookbackDays)

$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${FreshdeskApiKey}:X"))
$hdr = @{
  Authorization  = "Basic $b64"
  'Content-Type' = 'application/json'
  Accept         = 'application/json'
}

function Invoke-FdGet([string]$PathQuery) {
  $url = "https://$FreshdeskDomain/api/v2/$($PathQuery.TrimStart('/'))"
  $attempt = 0
  while ($true) {
    $attempt++
    try {
      return Invoke-RestMethod -Uri $url -Headers $hdr -Method GET -TimeoutSec 120
    } catch {
      $code = $null
      try { $code = [int]$_.Exception.Response.StatusCode } catch {}
      if ($code -eq 429 -and $attempt -lt 5) {
        $wait = [Math]::Min(60, 5 * $attempt)
        Write-Log ('rate limit 429 - sleep ' + $wait + 's')
        Start-Sleep -Seconds $wait
        continue
      }
      throw
    }
  }
}

function Status-Name([int]$id) {
  switch ($id) { 2 { 'Open' } 3 { 'Pending' } 4 { 'Resolved' } 5 { 'Closed' } default { "Status$id" } }
}
function Priority-Name([int]$id) {
  switch ($id) { 1 { 'Low' } 2 { 'Medium' } 3 { 'High' } 4 { 'Urgent' } default { "P$id" } }
}

function Sql-Esc([string]$s) {
  if ($null -eq $s) { return 'NULL' }
  $t = $s -replace "'", "''"
  if ($t.Length -gt 4000) { $t = $t.Substring(0, 4000) }
  return "N'$t'"
}
function Sql-Dt($v) {
  if ($null -eq $v -or [string]::IsNullOrWhiteSpace([string]$v)) { return 'NULL' }
  try {
    $d = [datetime]::Parse([string]$v, [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    return ("'{0:yyyy-MM-dd HH:mm:ss}'" -f $d)
  } catch { return 'NULL' }
}
function Sql-Num($v) {
  if ($null -eq $v -or [string]::IsNullOrWhiteSpace([string]$v)) { return 'NULL' }
  return ([string]$v)
}

$since = (Get-Date).ToUniversalTime().AddDays(-[int]$FreshdeskLookbackDays).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")
$all = New-Object System.Collections.Generic.List[object]
$page = 1
do {
  $path = "tickets?per_page=100&page=$page&updated_since=$since&order_by=updated_at&order_type=asc"
  $batch = @(Invoke-FdGet $path)
  if ($batch.Count -eq 0) { break }
  foreach ($t in $batch) { [void]$all.Add($t) }
  Write-Log ('page=' + $page + ' got=' + $batch.Count + ' total=' + $all.Count)
  $page++
  Start-Sleep -Milliseconds 250
} while ($page -le 300 -and $batch.Count -eq 100)

Write-Log ('tickets pulled=' + $all.Count)

$maxStats = [Math]::Min(80, $all.Count)
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

  $statusId = $t.status
  $priId = $t.priority
  $reqEmail = $null
  if ($t._requester -and $t._requester.email) { $reqEmail = [string]$t._requester.email }
  elseif ($t.email) { $reqEmail = [string]$t.email }

  $coId = $null; $coName = $null
  if ($t._company) {
    if ($t._company.id) { $coId = $t._company.id }
    if ($t._company.name) { $coName = [string]$t._company.name }
  }
  if (-not $coId -and $t.company_id) { $coId = $t.company_id }

  $firstR = $null; $resolved = $null; $closed = $null
  if ($t._stats) {
    $firstR = $t._stats.first_responded_at
    $resolved = $t._stats.resolved_at
    $closed = $t._stats.closed_at
  }

  $subj = [string]$t.subject
  if ($subj.Length -gt 480) { $subj = $subj.Substring(0, 480) }

  $tagsJson = 'NULL'
  if ($t.tags) {
    try { $tagsJson = Sql-Esc ($t.tags | ConvertTo-Json -Compress -Depth 3) } catch {}
  }
  $cfJson = 'NULL'
  if ($t.custom_fields) {
    try { $cfJson = Sql-Esc ($t.custom_fields | ConvertTo-Json -Compress -Depth 5) } catch {}
  }

  $codeExpr = 'NULL'
  if ($coName) {
    $codeExpr = "(SELECT TOP 1 CustomerCode FROM dbo.Dim_Freshdesk_CompanyMap WITH (NOLOCK) WHERE Active = 1 AND LTRIM(RTRIM(CompanyName)) = LTRIM(RTRIM($(Sql-Esc $coName))) )"
  }

  [void]$sb.AppendLine((
    "INSERT INTO dbo.Freshdesk_Tickets (SnapshotDate, TicketId, CustomerCode, Subject, StatusId, StatusName, PriorityId, PriorityName, SourceId, TypeName, RequesterId, RequesterEmail, ResponderId, GroupId, CompanyId, CompanyName, CreatedAtUtc, UpdatedAtUtc, DueByUtc, FirstRespondedAtUtc, ResolvedAtUtc, ClosedAtUtc, TagsJson, CustomFieldsJson, ImportedAt) VALUES (@Snap, {0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, {11}, {12}, {13}, {14}, {15}, {16}, {17}, {18}, {19}, {20}, {21}, {22}, @Imp);" -f `
      (Sql-Num $tid),
      $codeExpr,
      (Sql-Esc $subj),
      (Sql-Num $statusId),
      (Sql-Esc (Status-Name ([int]$statusId))),
      (Sql-Num $priId),
      (Sql-Esc (Priority-Name ([int]$priId))),
      (Sql-Num $t.source),
      (Sql-Esc ([string]$t.type)),
      (Sql-Num $t.requester_id),
      (Sql-Esc $reqEmail),
      (Sql-Num $t.responder_id),
      (Sql-Num $t.group_id),
      (Sql-Num $coId),
      (Sql-Esc $coName),
      (Sql-Dt $t.created_at),
      (Sql-Dt $t.updated_at),
      (Sql-Dt $t.due_by),
      (Sql-Dt $firstR),
      (Sql-Dt $resolved),
      (Sql-Dt $closed),
      $tagsJson,
      $cfJson
  ))
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

$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }

& $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -b -i $sqlFile
if ($LASTEXITCODE -ne 0) {
  Write-Log ('sqlcmd failed exit=' + $LASTEXITCODE)
  throw ('sqlcmd failed ' + $LASTEXITCODE)
}

Write-Log ('=== Freshdesk collect done tickets=' + $all.Count + ' log=' + $log + ' ===')
Write-Log 'Map companies: INSERT Dim_Freshdesk_CompanyMap (CompanyName, CustomerCode) then re-run.'
