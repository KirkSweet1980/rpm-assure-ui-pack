$ErrorActionPreference = 'Stop'
$f = 'C:\RPM-Assure\Sql\customers\RSR\303c_Force_rpmassure_Map.sql'
sqlcmd -S '.' -U 'SYSPROAdmin' -P 'Syspr0SA' -C -b -i $f
if ($LASTEXITCODE -ne 0) { throw "fix map failed $LASTEXITCODE" }
Write-Host 'Now re-run diagnose or collect.' -ForegroundColor Green
