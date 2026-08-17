# Dedicated Freshdesk pull every 15 minutes. Does not wait for Pulseway.
# Run as Administrator on the Assure app server (RPMWINRM).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Freshdesk-15min.ps1 -RunNow

param(
  [string]$Root = 'C:\RPM-Assure',
  [int]$Minutes = 15,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'
if ($Minutes -lt 10) { $Minutes = 10 }

$live = Join-Path $Root 'Sql\freshdesk'
$pack = Join-Path $Root 'deploy\ui-pack\Sql\freshdesk'
if (-not (Test-Path $pack)) { $pack = Join-Path $Root 'deploy\ui-pack\sql\freshdesk' }
New-Item -ItemType Directory -Force -Path $live, (Join-Path $live 'logs') | Out-Null

foreach ($name in @(
    'Collect-Freshdesk-To-RPMAssure.ps1',
    'Map-Freshdesk-Companies.ps1',
    '514_Fuzzy_Map_Freshdesk_Companies.sql',
    '513_Sync_Freshdesk_To_Fact_Incident.sql',
    '510_Ensure_Freshdesk_Tickets.sql'
  )) {
  $src = Join-Path $pack $name
  if (Test-Path $src) { Copy-Item -Force $src (Join-Path $live $name) }
}

$runner = Join-Path $live 'Collect-Freshdesk-To-RPMAssure.ps1'
if (-not (Test-Path $runner)) { throw "Missing $runner" }

$task = 'RPMAssure-Freshdesk-Collect'
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '"'
cmd.exe /c ('schtasks /Delete /TN "' + $task + '" /F >nul 2>&1') | Out-Null
cmd.exe /c ('schtasks /Create /F /TN "' + $task + '" /TR "' + $tr + '" /SC MINUTE /MO ' + $Minutes + ' /RU SYSTEM /RL HIGHEST')
if ($LASTEXITCODE -ne 0) { throw "schtasks create failed $LASTEXITCODE - run as Administrator" }

Write-Host ("INSTALLED $task every $Minutes min")
Write-Host ("  $runner")
if ($RunNow) {
  Write-Host 'Starting first collect now...'
  Start-ScheduledTask -TaskName $task
}
Get-ScheduledTask -TaskName $task | Get-ScheduledTaskInfo |
  Format-List TaskName, LastRunTime, LastTaskResult, NextRunTime
