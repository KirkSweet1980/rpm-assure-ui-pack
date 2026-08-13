$ErrorActionPreference = 'Stop'
$f = 'C:\RPM-Assure\Sql\customers\UVSS\217c_Diagnose_And_Collect_Dtr.sql'
if (-not (Test-Path -LiteralPath $f)) { throw ('Missing ' + $f) }
$sqlcmd = (Get-Command sqlcmd -ErrorAction SilentlyContinue).Source
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }
Write-Host 'Running DTR diagnose on this server...' -ForegroundColor Cyan
& $sqlcmd -S '.' -U 'Rpm_collect' -P 'RpmCollect#AHIC2026' -C -b -i $f
Write-Host 'Paste full output back for analysis.' -ForegroundColor Yellow
