$ErrorActionPreference = 'Stop'
$Dir = 'C:\RPM-Assure\Sql\customers\AHIC'
$Run = Join-Path $Dir 'Run-AHIC-Deployment-Catalogue.ps1'
if (-not (Test-Path -LiteralPath $Run)) { throw "Missing $Run" }
$task = 'RPMAssure-AHIC-DeploymentCatalogue'
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $Run + '"'
# Daily 03:40 - after Notes14; needs sa for SYSPRODeployment write path
schtasks /Create /F /TN $task /TR $tr /SC DAILY /ST 03:40 /RU SYSTEM /RL HIGHEST | Out-Null
Write-Host ("Scheduled: $task daily 03:40 SYSTEM") -ForegroundColor Green
Get-ScheduledTask -TaskName $task | Format-Table TaskName, State -AutoSize
Write-Host 'Test now:' -ForegroundColor Cyan
Write-Host ('  powershell -NoProfile -ExecutionPolicy Bypass -File "' + $Run + '"')
