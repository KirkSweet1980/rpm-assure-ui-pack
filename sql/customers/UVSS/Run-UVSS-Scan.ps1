# Full UVSS SYSPRO scan - run ON UVSS-SYSPRO
$ErrorActionPreference = 'Stop'
$Dir = 'C:\RPM-Assure\Sql\customers\UVSS'
$Sql = Join-Path $Dir '400_Scan_UVSS_Syspro.sql'
$LogDir = Join-Path $Dir 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Out = Join-Path $LogDir ('uvss_scan_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.txt')

if (-not (Test-Path -LiteralPath $Sql)) {
  throw ('Missing ' + $Sql)
}

$sqlcmd = (Get-Command sqlcmd -ErrorAction SilentlyContinue).Source
if (-not $sqlcmd) {
  foreach ($p in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe'
  )) {
    if (Test-Path -LiteralPath $p) { $sqlcmd = $p; break }
  }
}
if (-not $sqlcmd) { throw 'sqlcmd not found' }

Write-Host 'Scanning UVSS SYSPRO databases...' -ForegroundColor Cyan
Write-Host ('Output: ' + $Out)

& $sqlcmd -S '.' -U 'Rpm_collect' -P 'RpmCollect#AHIC2026' -C -W -s '|' -i $Sql -o $Out
$code = $LASTEXITCODE
Write-Host ('sqlcmd exit=' + $code)
Write-Host ''
Write-Host '--- preview (last 80 lines) ---' -ForegroundColor Yellow
Get-Content -LiteralPath $Out -Tail 80
Write-Host ''
Write-Host ('Full log: ' + $Out) -ForegroundColor Green
Write-Host 'Paste the log (or section 5 + 7) back if you want next collectors.'
