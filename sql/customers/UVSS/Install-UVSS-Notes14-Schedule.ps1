$ErrorActionPreference = 'Stop'
# Installs Notes14 daily task for UVSS (backups + version/hotfix)
# Requires: C:\RPM-Assure\Sql\customers\UVSS\Run-UVSS-Notes14.ps1 already present

$Dir = 'C:\RPM-Assure\Sql\customers\UVSS'
$Run = Join-Path $Dir 'Run-UVSS-Notes14.ps1'
if (-not (Test-Path -LiteralPath $Run)) {
  Write-Host 'Missing Run-UVSS-Notes14.ps1 — install TrackA files first:' -ForegroundColor Red
  Write-Host '  Expand TrackA_Data.zip, copy customers\UVSS\* to C:\RPM-Assure\Sql\customers\UVSS\'
  throw "Missing $Run"
}

# Ensure append helper exists (for manual call)
$Append = Join-Path $Dir 'Append-Notes14-To-Schedule.ps1'
@'
$ErrorActionPreference = "Continue"
& powershell -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Sql\customers\UVSS\Run-UVSS-Notes14.ps1"
'@ | Set-Content -LiteralPath $Append -Encoding ASCII

$taskName = 'RPMAssure-UVSS-Notes14'
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $Run + '"'

# Daily 03:15 (after main collect if you have one at night)
schtasks /Create /F /TN $taskName /TR $tr /SC DAILY /ST 03:15 /RU SYSTEM /RL HIGHEST | Out-Null
Write-Host "Scheduled task created: $taskName (daily 03:15 SYSTEM)" -ForegroundColor Green

# Optional: also run once now to prove
Write-Host 'Running once now...' -ForegroundColor Cyan
Start-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Get-ScheduledTask -TaskName $taskName | Format-Table TaskName, State -AutoSize
Get-ScheduledTaskInfo -TaskName $taskName | Format-List LastRunTime, LastTaskResult, NextRunTime
Write-Host 'Done. Notes14 will run daily; main collect can stay as-is.' -ForegroundColor Green
