# Apply-Rmm-Device-Map.ps1
# APP SQL: remap Pulseway devices so hostname wins (SBS-PROD -> Simply Bright).
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\rmm\pulseway\Apply-Rmm-Device-Map.ps1

$ErrorActionPreference = 'Stop'
function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

$sqlFile = Join-Path $PSScriptRoot '461_Fix_Rmm_Device_Customer_Map.sql'
if (-not (Test-Path -LiteralPath $sqlFile)) {
  $sqlFile = 'C:\RPM-Assure\Sql\rmm\pulseway\461_Fix_Rmm_Device_Customer_Map.sql'
}
if (-not (Test-Path -LiteralPath $sqlFile)) { throw "Missing 461_Fix_Rmm_Device_Customer_Map.sql" }

$sqlcmd = $null
foreach ($p in @(
    'D:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
  )) {
  if (Test-Path -LiteralPath $p) { $sqlcmd = $p; break }
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
if (Test-Path -LiteralPath $envFile) {
  Get-Content -LiteralPath $envFile | ForEach-Object {
    if ($_ -match '^\s*RPM_ASSURE_SQL_SERVER=(.+)$') { if (-not $server) { $server = $Matches[1].Trim() } }
    if ($_ -match '^\s*RPM_ASSURE_SQL_DATABASE=(.+)$') { if (-not $db) { $db = $Matches[1].Trim() } }
    if ($_ -match '^\s*RPM_ASSURE_SQL_USER=(.+)$') { if (-not $user) { $user = $Matches[1].Trim() } }
    if ($_ -match '^\s*RPM_ASSURE_SQL_PASSWORD=(.+)$') { if (-not $pass) { $pass = $Matches[1].Trim() } }
  }
}
if (-not $db) { $db = 'RPMAssure_App' }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - remap RMM devices'
Write-Host '========================================' -ForegroundColor Cyan
W Cyan ("sqlcmd = " + $sqlcmd)
W Cyan ("file   = " + $sqlFile)

$ok = $false
function Invoke-Map([string]$s, [string[]]$extra) {
  W Cyan ("Trying " + $s)
  & $sqlcmd -S $s -d $db -C -b -i $sqlFile @extra
  return ($LASTEXITCODE -eq 0)
}

if (Invoke-Map '.\RPMREPORTS' @('-E')) { $ok = $true }
if (-not $ok) { if (Invoke-Map '(local)\RPMREPORTS' @('-E')) { $ok = $true } }
if (-not $ok -and $server) {
  if ($user -and $pass) { if (Invoke-Map $server @('-U', $user, '-P', $pass)) { $ok = $true } }
  if (-not $ok) { if (Invoke-Map $server @('-E')) { $ok = $true } }
}
if (-not $ok) { if (Invoke-Map '102.222.21.220,14333' @('-E')) { $ok = $true } }

if (-not $ok) { throw 'Remap failed. Run as Windows sysadmin on the APP SQL box.' }

W Green 'RMM device remap OK'
Write-Host 'SBS-PROD is Simply Bright. Hard-refresh RMM on every customer.'
