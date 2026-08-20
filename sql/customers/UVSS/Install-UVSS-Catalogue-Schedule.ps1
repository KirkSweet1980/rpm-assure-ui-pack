$ErrorActionPreference = 'Stop'
$Dir = 'C:\RPM-Assure\Sql\customers\UVSS'
$Run = Join-Path $Dir 'Run-UVSS-Deployment-Catalogue.ps1'
if (-not (Test-Path -LiteralPath $Run)) { throw "Missing $Run" }
$task = 'RPMAssure-UVSS-DeploymentCatalogue'
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $Run + '"'
schtasks /Create /F /TN $task /TR $tr /SC DAILY /ST 03:45 /RU SYSTEM /RL HIGHEST | Out-Null
Write-Host ("Scheduled: $task daily 03:45 SYSTEM") -ForegroundColor Green
Get-ScheduledTask -TaskName $task | Format-Table TaskName, State -AutoSize
