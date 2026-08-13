# Install Windows scheduled task - Pulseway collect every 20 minutes
# Run as Administrator. ASCII only.
# Rate limits: 100/5s, 1000/min - 20 min spacing avoids overlapping runs.
$ErrorActionPreference = 'Continue'
$here = 'C:\RPM-Assure\Sql\rmm\pulseway'
$ps1 = Join-Path $here 'Run-Pulseway-Collect-Scheduled.ps1'
if (-not (Test-Path -LiteralPath $ps1)) { throw "Missing $ps1 - expand Pulseway pack first" }
if (-not (Test-Path -LiteralPath (Join-Path $here 'Pulseway.Config.ps1'))) {
  Write-Host 'WARN: Pulseway.Config.ps1 missing - create with Write-PulsewayConfig.ps1 before first run' -ForegroundColor Yellow
}

$taskName = 'RPMAssure-Pulseway-Collect'
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $ps1 + '"'

cmd /c "schtasks /Delete /TN `"$taskName`" /F >nul 2>&1"
$create = cmd /c "schtasks /Create /F /TN `"$taskName`" /TR `"$tr`" /SC MINUTE /MO 20 /RU SYSTEM /RL HIGHEST"
Write-Host $create
if ($LASTEXITCODE -ne 0) {
  throw "schtasks Create failed $LASTEXITCODE - run this script as Administrator"
}

Write-Host ("Created task " + $taskName + " every 20 min") -ForegroundColor Green
Write-Host 'Test now:'
Write-Host ('  Start-ScheduledTask -TaskName "' + $taskName + '"')
Write-Host ('  Get-ScheduledTaskInfo -TaskName "' + $taskName + '"')
Write-Host ('  OR: powershell -NoProfile -ExecutionPolicy Bypass -File "' + $ps1 + '"')
