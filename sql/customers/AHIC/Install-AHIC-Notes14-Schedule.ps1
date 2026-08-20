$ErrorActionPreference = 'Stop'
$Dir = 'C:\RPM-Assure\Sql\customers\AHIC'
$Run = Join-Path $Dir 'Run-AHIC-Notes14.ps1'
if (-not (Test-Path -LiteralPath $Run)) {
  Write-Host 'Missing Run-AHIC-Notes14.ps1 — copy TrackA customers\AHIC\* first' -ForegroundColor Red
  throw "Missing $Run"
}
$Append = Join-Path $Dir 'Append-Notes14-To-Schedule.ps1'
@'
$ErrorActionPreference = "Continue"
& powershell -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Sql\customers\AHIC\Run-AHIC-Notes14.ps1"
'@ | Set-Content -LiteralPath $Append -Encoding ASCII

$taskName = 'RPMAssure-AHIC-Notes14'
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $Run + '"'
schtasks /Create /F /TN $taskName /TR $tr /SC DAILY /ST 03:20 /RU SYSTEM /RL HIGHEST | Out-Null
Write-Host "Scheduled task created: $taskName (daily 03:20 SYSTEM)" -ForegroundColor Green
Write-Host 'Running once now...' -ForegroundColor Cyan
Start-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Get-ScheduledTask -TaskName $taskName | Format-Table TaskName, State -AutoSize
Get-ScheduledTaskInfo -TaskName $taskName | Format-List LastRunTime, LastTaskResult, NextRunTime
Write-Host 'Done.' -ForegroundColor Green
