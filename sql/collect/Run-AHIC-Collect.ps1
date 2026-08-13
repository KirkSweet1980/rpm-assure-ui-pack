# Daily: same Rpm_collect for local read + central write (via linked server)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\AHI_Local_Config.ps1"

$sql = Join-Path $PSScriptRoot '210_Collect_AHIC_To_RPMAssure_App.sql'
if (-not (Test-Path $sql)) { throw "Missing $sql" }

Write-Host "User: $RpmCollectUser | Local: $AhiSqlServer | Central via $LinkedServer -> $CentralSql" -ForegroundColor Yellow
sqlcmd -S $AhiSqlServer -U $RpmCollectUser -P $RpmCollectPassword -C -b -i $sql
if ($LASTEXITCODE -ne 0) { throw "Collect failed $LASTEXITCODE" }
Write-Host 'Done.' -ForegroundColor Green
