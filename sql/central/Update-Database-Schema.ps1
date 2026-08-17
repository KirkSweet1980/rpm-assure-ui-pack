# Update-Database-Schema.ps1
# APP / central SQL. Creates missing tables and columns (agents, maps, pillars).
# Run as Administrator (Windows sysadmin on the SQL instance).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\central\Update-Database-Schema.ps1

$ErrorActionPreference = 'Stop'

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

$sqlFile = Join-Path $PSScriptRoot '480_Update_Schema_Now.sql'
if (-not (Test-Path $sqlFile)) {
  $sqlFile = 'C:\RPM-Assure\Sql\central\480_Update_Schema_Now.sql'
}
if (-not (Test-Path $sqlFile)) { throw "Missing 480_Update_Schema_Now.sql" }

$sqlcmd = $null
foreach ($c in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
  )) {
  if (Test-Path $c) { $sqlcmd = $c; break }
}
if (-not $sqlcmd) {
  $g = Get-Command sqlcmd.exe -ErrorAction SilentlyContinue
  if ($g) { $sqlcmd = $g.Source }
}
if (-not $sqlcmd) { throw 'sqlcmd.exe not found' }

$server = $env:RPM_ASSURE_SQL_SERVER
$db = $env:RPM_ASSURE_SQL_DATABASE
$user = $env:RPM_ASSURE_SQL_USER
$pass = $env:RPM_ASSURE_SQL_PASSWORD
$envFile = 'C:\RPM-Assure\App\.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*RPM_ASSURE_SQL_SERVER=(.+)$') { if (-not $server) { $server = $Matches[1].Trim() } }
    if ($_ -match '^\s*RPM_ASSURE_SQL_DATABASE=(.+)$') { if (-not $db) { $db = $Matches[1].Trim() } }
    if ($_ -match '^\s*RPM_ASSURE_SQL_USER=(.+)$') { if (-not $user) { $user = $Matches[1].Trim() } }
    if ($_ -match '^\s*RPM_ASSURE_SQL_PASSWORD=(.+)$') { if (-not $pass) { $pass = $Matches[1].Trim() } }
  }
}
if (-not $db) { $db = 'RPMAssure_App' }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - Update database schema'
Write-Host '========================================' -ForegroundColor Cyan
W Cyan ("sqlcmd = " + $sqlcmd)
W Cyan ("file   = " + $sqlFile)

$ok = $false
$tried = @()

function Invoke-Schema([string]$s, [string[]]$extra) {
  $script:tried += $s
  W Cyan ("Trying " + $s)
  & $sqlcmd -S $s -d $db -C -b -i $sqlFile @extra
  return ($LASTEXITCODE -eq 0)
}

if (Invoke-Schema '.\RPMREPORTS' @('-E')) { $ok = $true }
if (-not $ok) {
  if (Invoke-Schema '(local)\RPMREPORTS' @('-E')) { $ok = $true }
}
if (-not $ok -and $server) {
  if ($user -and $pass) {
    if (Invoke-Schema $server @('-U', $user, '-P', $pass)) { $ok = $true }
  }
  if (-not $ok) {
    if (Invoke-Schema $server @('-E')) { $ok = $true }
  }
}
if (-not $ok) {
  if (Invoke-Schema '102.222.21.220,14333' @('-E')) { $ok = $true }
}

if (-not $ok) {
  W Yellow ('Tried: ' + ($tried -join ', '))
  throw 'Schema update failed. Run this on the APP SQL box as a Windows sysadmin (Administrator PowerShell).'
}

W Green 'SCHEMA UPDATE OK'

$restamp = Join-Path $PSScriptRoot '440_Restamp_Cove_Epp_CustomerCodes.sql'
if (-not (Test-Path $restamp)) { $restamp = 'C:\RPM-Assure\Sql\central\440_Restamp_Cove_Epp_CustomerCodes.sql' }
if (Test-Path $restamp) {
  W Cyan '--- Restamp Cove + EPP CustomerCode (blank rows only) ---'
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $restamp @extra
  if ($LASTEXITCODE -eq 0) { W Green 'Cove/EPP restamp OK' } else { W Yellow 'Cove/EPP restamp warned - UI will still try a live restamp.' }
}

$bhfCove = Join-Path $PSScriptRoot '..\cove\443_BHF_Cove_Restamp.sql'
if (-not (Test-Path $bhfCove)) { $bhfCove = 'C:\RPM-Assure\Sql\cove\443_BHF_Cove_Restamp.sql' }
if (Test-Path $bhfCove) {
  W Cyan '--- BHF Cove map + restamp ---'
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $bhfCove @extra
  if ($LASTEXITCODE -eq 0) { W Green 'BHF Cove restamp OK' } else { W Yellow 'BHF Cove restamp warned.' }
}

$coveRights = Join-Path $PSScriptRoot '..\cove\442_Cove_Collect_Rights.sql'
if (-not (Test-Path $coveRights)) { $coveRights = 'C:\RPM-Assure\Sql\cove\442_Cove_Collect_Rights.sql' }
if (Test-Path $coveRights) {
  W Cyan '--- Cove collect rights (Rpm_collect INSERT, no ALTER) ---'
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $coveRights @extra
  if ($LASTEXITCODE -eq 0) { W Green 'Cove collect rights OK' } else { W Yellow 'Cove collect rights warned.' }
}

$eppRights = Join-Path $PSScriptRoot '..\bitdefender\456_Epp_Collect_Rights.sql'
if (-not (Test-Path $eppRights)) { $eppRights = 'C:\RPM-Assure\Sql\bitdefender\456_Epp_Collect_Rights.sql' }
if (Test-Path $eppRights) {
  W Cyan '--- EPP collect rights (Rpm_collect INSERT, no ALTER) ---'
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $eppRights @extra
  if ($LASTEXITCODE -eq 0) { W Green 'EPP collect rights OK' } else { W Yellow 'EPP collect rights warned.' }
}

$agentHttps = Join-Path $PSScriptRoot '..\agent\443_Agent_Https.sql'
if (-not (Test-Path $agentHttps)) { $agentHttps = 'C:\RPM-Assure\Sql\agent\443_Agent_Https.sql' }
if (Test-Path $agentHttps) {
  W Cyan '--- Agent HTTPS heartbeat columns ---'
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $agentHttps @extra
  if ($LASTEXITCODE -eq 0) { W Green 'Agent HTTPS columns OK' } else { W Yellow 'Agent HTTPS columns warned.' }
}

$iopsSrc = Join-Path $PSScriptRoot '443_Agent_DiskIops_Source.sql'
if (-not (Test-Path $iopsSrc)) { $iopsSrc = 'C:\RPM-Assure\Sql\central\443_Agent_DiskIops_Source.sql' }
if (Test-Path $iopsSrc) {
  W Cyan '--- Agent_DiskIops.Source column ---'
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $iopsSrc @extra
  if ($LASTEXITCODE -eq 0) { W Green 'Agent_DiskIops.Source OK' } else { W Yellow 'Agent_DiskIops.Source warned.' }
}

$iopsPurge = Join-Path $PSScriptRoot '441_Purge_Sample_Iops.sql'
if (-not (Test-Path $iopsPurge)) { $iopsPurge = 'C:\RPM-Assure\Sql\central\441_Purge_Sample_Iops.sql' }
if (Test-Path $iopsPurge) {
  W Cyan '--- Purge demo / sample IOPS ---'
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $iopsPurge @extra
  if ($LASTEXITCODE -eq 0) { W Green 'Sample IOPS purge OK' } else { W Yellow 'Sample IOPS purge warned.' }
}

$rmmMap = 'C:\RPM-Assure\Sql\rmm\pulseway\461_Fix_Rmm_Device_Customer_Map.sql'
if (-not (Test-Path -LiteralPath $rmmMap)) { $rmmMap = Join-Path (Split-Path $PSScriptRoot -Parent) 'rmm\pulseway\461_Fix_Rmm_Device_Customer_Map.sql' }
if (Test-Path -LiteralPath $rmmMap) {
  W Cyan '--- Remap Pulseway devices (hostname wins; SBS-PROD -> Simply Bright) ---'
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $rmmMap @extra
  if ($LASTEXITCODE -eq 0) { W Green 'RMM device remap OK' } else { W Yellow 'RMM device remap warned.' }
}

$patchTbl = 'C:\RPM-Assure\Sql\rmm\pulseway\462_Ensure_Pulseway_DevicePatches.sql'
if (-not (Test-Path -LiteralPath $patchTbl)) { $patchTbl = Join-Path (Split-Path $PSScriptRoot -Parent) 'rmm\pulseway\462_Ensure_Pulseway_DevicePatches.sql' }
if (Test-Path -LiteralPath $patchTbl) {
  W Cyan '--- Pulseway device patch list table ---'
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $patchTbl @extra
  if ($LASTEXITCODE -eq 0) { W Green 'Pulseway_DevicePatches OK' } else { W Yellow 'Pulseway_DevicePatches warned.' }
}

foreach ($fdRel in @(
  'freshdesk\510_Ensure_Freshdesk_Tickets.sql',
  'freshdesk\513_Sync_Freshdesk_To_Fact_Incident.sql'
)) {
  $fd = Join-Path (Split-Path $PSScriptRoot -Parent) $fdRel
  if (-not (Test-Path -LiteralPath $fd)) { $fd = Join-Path 'C:\RPM-Assure\Sql' $fdRel }
  if (-not (Test-Path -LiteralPath $fd)) { continue }
  W Cyan ('--- ' + $fdRel + ' ---')
  $extra = @()
  if ($user -and $pass -and $server) { $extra = @('-U', $user, '-P', $pass) } else { $extra = @('-E') }
  $target = if ($server) { $server } else { '.\RPMREPORTS' }
  & $sqlcmd -S $target -d $db -C -b -i $fd @extra
  if ($LASTEXITCODE -eq 0) { W Green ($fdRel + ' OK') } else { W Yellow ($fdRel + ' warned.') }
}

Write-Host 'Agents, RequestSyncUtc, vendor maps, and pillar columns are in place.'
Write-Host 'Hard-refresh Assure. Cloud Backup and EPP fill from stamped devices, not just the map lamp.'
