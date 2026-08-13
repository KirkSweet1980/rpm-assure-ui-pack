# Install Monday 07:00 Task Scheduler job for weekly RPM Assure email.
# Run as Administrator on the app host. Pure ASCII.
param(
  [string]$BaseUrl = 'http://127.0.0.1:8081',
  [string]$TaskName = 'RPMAssure-Weekly-Email',
  [string]$RunScript = 'C:\RPM-Assure\deploy\weekly-email\Run-Weekly-Email.ps1',
  [string]$StartTime = '07:00'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $RunScript)) {
  throw ('Missing ' + $RunScript + ' - expand weekly-email pack first')
}

$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $RunScript + '" -BaseUrl "' + $BaseUrl + '"'

# Always use cmd so missing-task messages do not become PS terminating errors
cmd.exe /c "schtasks /Delete /TN `"$TaskName`" /F >nul 2>&1" | Out-Null

$create = 'schtasks /Create /F /TN "' + $TaskName + '" /TR "' + $tr + '" /SC WEEKLY /D MON /ST ' + $StartTime + ' /RU SYSTEM /RL HIGHEST'
cmd.exe /c $create
if ($LASTEXITCODE -ne 0) {
  throw ('schtasks create failed exit=' + $LASTEXITCODE)
}

Write-Host ('OK task ' + $TaskName + ' Monday ' + $StartTime + ' -> ' + $RunScript) -ForegroundColor Green
Write-Host 'Test now:'
Write-Host ('  powershell -NoProfile -ExecutionPolicy Bypass -File "' + $RunScript + '"')
Write-Host ('  Start-ScheduledTask -TaskName "' + $TaskName + '"')
