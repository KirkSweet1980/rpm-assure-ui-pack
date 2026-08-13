# Install Cove collect schedule on CENTRAL (rpmwinrm / app host)
# Default: every 30 minutes. Use -Minutes 15 for tighter cadence.
# Run as Administrator.
param(
  [int]$Minutes = 30
)

$ErrorActionPreference = 'Stop'
$here = 'C:\RPM-Assure\Sql\cove'
$runner = Join-Path $here 'Run-Cove-Collect-Scheduled.ps1'
$collect = Join-Path $here 'Collect-Cove-To-RPMAssure.ps1'

if (-not (Test-Path -LiteralPath $collect)) {
  throw "Missing $collect - copy Collect-Cove-To-RPMAssure.ps1 first"
}
if (-not (Test-Path -LiteralPath $runner)) {
  throw "Missing $runner - copy Run-Cove-Collect-Scheduled.ps1 first"
}
if ($Minutes -lt 5) { $Minutes = 5 }
if ($Minutes -gt 120) { $Minutes = 120 }

$taskName = 'RPMAssure-Cove-CyberBackup'
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '"'

# Delete if exists (ignore missing)
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

schtasks /Create /F /TN $taskName /TR $tr /SC MINUTE /MO $Minutes /RU SYSTEM /RL HIGHEST
if ($LASTEXITCODE -ne 0) { throw "schtasks create failed $LASTEXITCODE" }

Write-Host ("Scheduled: " + $taskName + " every " + $Minutes + " min") -ForegroundColor Green
Get-ScheduledTask -TaskName $taskName | Format-Table TaskName, State
Write-Host 'Test now:'
Write-Host ('  Start-ScheduledTask -TaskName "' + $taskName + '"')
Write-Host ('  Get-Content (Get-ChildItem ' + $here + '\logs\sched_cove_* | Sort LastWriteTime -Descending | Select -First 1).FullName -Tail 30')
