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
Write-Host 'Agents, RequestSyncUtc, vendor maps, and pillar columns are in place.'
Write-Host 'Hard-refresh Assure. Redsun Cloud Backup is green if a Cove partner map exists.'
