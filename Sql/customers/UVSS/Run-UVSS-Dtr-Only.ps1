$ErrorActionPreference = 'Stop'
$Dir = 'C:\RPM-Assure\Sql\customers\UVSS'
$f1 = Join-Path $Dir '217a_Discover_UVSS_Dtr.sql'
$f2 = Join-Path $Dir '217_Collect_UVSS_DtrLevel1.sql'
$sqlcmd = (Get-Command sqlcmd -ErrorAction SilentlyContinue).Source
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }
Write-Host '=== DISCOVER ===' -ForegroundColor Cyan
& $sqlcmd -S '.' -U 'Rpm_collect' -P '' -C -b -i $f1
Write-Host '=== COLLECT DTR ===' -ForegroundColor Cyan
& $sqlcmd -S '.' -U 'Rpm_collect' -P '' -C -b -i $f2
Write-Host 'Done. Re-check central DtrInv/DtrAp counts.' -ForegroundColor Green
