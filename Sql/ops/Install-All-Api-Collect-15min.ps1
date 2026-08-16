# Install ONE Windows task: Pulseway + Cove + Bitdefender + CSP every 15 minutes.
param(
  [string]$Root = "C:\RPM-Assure",
  [int]$Minutes = 15,
  [switch]$RunNow
)
$ErrorActionPreference = "Stop"
if ($Minutes -lt 10) { $Minutes = 10 }
if ($Minutes -gt 60) { $Minutes = 60 }

$ops = Join-Path $Root "Sql\ops"
$logDir = Join-Path $ops "logs"
New-Item -ItemType Directory -Force -Path $ops, $logDir | Out-Null

$runnerSrc = Join-Path $PSScriptRoot "Run-All-Api-Collects-Scheduled.ps1"
if (-not (Test-Path $runnerSrc)) {
  $runnerSrc = "C:\RPM-Assure\deploy\ui-pack\Sql\ops\Run-All-Api-Collects-Scheduled.ps1"
}
$runner = Join-Path $ops "Run-All-Api-Collects-Scheduled.ps1"
if (Test-Path $runnerSrc) { Copy-Item $runnerSrc $runner -Force }
if (-not (Test-Path $runner)) { throw "Missing $runner" }

$taskName = "RPMAssure-All-Api-Collect"
foreach ($t in @("RPMAssure-Pulseway-Collect", "RPMAssure-Cove-CyberBackup", "RPMAssure-Exco-Data-Refresh")) {
  try { Disable-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue | Out-Null } catch {}
}

$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '" -Root "' + $Root + '"'
cmd.exe /c ("schtasks /Delete /TN `"" + $taskName + "`" /F >nul 2>&1") | Out-Null
cmd.exe /c ('schtasks /Create /F /TN "' + $taskName + '" /TR "' + $tr + '" /SC MINUTE /MO ' + $Minutes + ' /RU SYSTEM /RL HIGHEST')
if ($LASTEXITCODE -ne 0) { throw "schtasks create failed exit=$LASTEXITCODE - run as Administrator" }

Write-Host "INSTALLED $taskName every $Minutes min"
Write-Host "  Runner $runner"
Write-Host "  Legs: Pulseway, Cove (cloud backup stays), Bitdefender, Microsoft Graph"
if ($RunNow) { Start-ScheduledTask -TaskName $taskName }
Get-ScheduledTask -TaskName $taskName | Format-Table TaskName, State -AutoSize
