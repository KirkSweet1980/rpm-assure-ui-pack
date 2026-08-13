# One-time setup on AHIC (207 needs sa; 209 needs sa; then test as Rpm_collect)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\AHI_Local_Config.ps1"

# sa only for CREATE LOGIN + linked server (one-time)
$SetupUser = 'sa'
$SetupPass = '$y$pr0123'   # AHI sa — setup only

Write-Host "1) Create local Rpm_collect (as sa)..." -ForegroundColor Cyan
sqlcmd -S $AhiSqlServer -U $SetupUser -P $SetupPass -C -b -i (Join-Path $PSScriptRoot '207_AHIC_Create_Rpm_collect_Local.sql')
if ($LASTEXITCODE -ne 0) { throw '207 failed' }

Write-Host "2) Linked server RPM_CENTRAL (as sa)..." -ForegroundColor Cyan
sqlcmd -S $AhiSqlServer -U $SetupUser -P $SetupPass -C -b -i (Join-Path $PSScriptRoot '209_AHIC_LinkedServer_Central.sql')
if ($LASTEXITCODE -ne 0) { throw '209 failed' }

Write-Host "3) Test local as Rpm_collect..." -ForegroundColor Cyan
sqlcmd -S $AhiSqlServer -U $RpmCollectUser -P $RpmCollectPassword -C -Q "SELECT SUSER_SNAME(), COUNT(*) AS OperCnt FROM Sysprodb.dbo.AdmOperator;"
if ($LASTEXITCODE -ne 0) { throw 'Local Rpm_collect test failed' }

Write-Host "Setup done. Daily collect: .\Run-AHIC-Collect.ps1" -ForegroundColor Green
