# Optional: schedule Cove collect every 30 minutes (central host)
$ErrorActionPreference = 'Stop'
$ps1 = 'C:\RPM-Assure\Sql\cove\Collect-Cove-To-RPMAssure.ps1'
if (-not (Test-Path $ps1)) { throw "Missing $ps1" }
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $ps1 + '"'
schtasks /Create /F /TN 'RPMAssure-Cove-CyberBackup' /TR $tr /SC MINUTE /MO 30 /RU SYSTEM /RL HIGHEST
Write-Host 'Scheduled: RPMAssure-Cove-CyberBackup every 30 min' -ForegroundColor Green
Get-ScheduledTask -TaskName 'RPMAssure-Cove-CyberBackup' | Format-Table TaskName, State
