# Install Microsoft 365 Graph collect schedule (app server).
# Requires: Csp.Config.ps1. Run as Administrator.
param(
  [string]$Time = "05:30",
  [switch]$RunNow
)

$ErrorActionPreference = "Stop"
$here = "C:\RPM-Assure\Sql\csp"
$runner = Join-Path $here "Run-Csp-Collect-Scheduled.ps1"
$collect = Join-Path $here "Collect-Csp-Graph-To-RPMAssure.ps1"
$cfg = Join-Path $here "Csp.Config.ps1"
$logDir = Join-Path $here "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (-not (Test-Path -LiteralPath $collect)) { throw ("Missing " + $collect) }
if (-not (Test-Path -LiteralPath $runner)) { throw ("Missing " + $runner) }
if (-not (Test-Path -LiteralPath $cfg)) {
  throw ("Missing " + $cfg + " - run Write-Csp-Config.ps1 first")
}

try {
  icacls $cfg /grant "SYSTEM:(R)" "Administrators:(F)" 2>$null | Out-Null
  icacls $here /grant "SYSTEM:(OI)(CI)(RX)" 2>$null | Out-Null
} catch {}

$taskName = "RPMAssure-Csp-GraphCollect"
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '"'

Write-Host ("Creating scheduled task " + $taskName + " DAILY " + $Time) -ForegroundColor Cyan
cmd.exe /c ("schtasks /Delete /TN `"" + $taskName + "`" /F >nul 2>&1") | Out-Null
$create = 'schtasks /Create /F /TN "' + $taskName + '" /TR "' + $tr + '" /SC DAILY /ST ' + $Time + ' /RU SYSTEM /RL HIGHEST'
cmd.exe /c $create
if ($LASTEXITCODE -ne 0) {
  throw ("schtasks create failed exit=" + $LASTEXITCODE + " - run as Administrator")
}

Write-Host ("Scheduled: " + $taskName + " daily at " + $Time + " local time") -ForegroundColor Green
try {
  Get-ScheduledTask -TaskName $taskName -ErrorAction Stop | Format-Table TaskName, State -AutoSize
} catch {
  schtasks /Query /TN $taskName /FO LIST | Out-Host
}

Write-Host ""
Write-Host ("Logs: " + $logDir + "\sched_csp_*.log")
Write-Host ("Manual: powershell -NoProfile -ExecutionPolicy Bypass -File " + $collect + " -WindowsAuth -SkipSchema")

if ($RunNow) {
  Write-Host "Running once now..." -ForegroundColor Cyan
  Start-ScheduledTask -TaskName $taskName
  Start-Sleep -Seconds 3
  try {
    Get-ScheduledTask -TaskName $taskName | Format-Table TaskName, State -AutoSize
  } catch {}
}

Write-Host "=== Done ===" -ForegroundColor Green
