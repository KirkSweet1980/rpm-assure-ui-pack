# Install Let's Encrypt watchdog for app HTTPS + agent HTTPS (same Caddy cert).
# Tasks:
#   RPMAssure-Https-Renew          daily 04:15
#   RPMAssure-Https-Renew-PM       daily 16:15
#   RPMAssure-Https-Renew-OnStart  after reboot (+2 min)
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Install-Https-Renew-Task.ps1

$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$Deploy = Join-Path $Root 'deploy'
$Logs = Join-Path $Deploy 'logs'
New-Item -ItemType Directory -Force -Path $Logs, $Deploy | Out-Null

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach ($name in @('Renew-Assure-Https.ps1', 'Ensure-Https-443.ps1')) {
  $from = Join-Path $here $name
  $to = Join-Path $Deploy $name
  if ((Test-Path $from) -and ($from -ne $to)) { Copy-Item -Force $from $to }
}

$ps1 = Join-Path $Deploy 'Renew-Assure-Https.ps1'
if (-not (Test-Path $ps1)) { throw 'Missing Renew-Assure-Https.ps1' }

$wrapper = Join-Path $Logs 'renew-https.cmd'
@(
  '@echo off',
  'cd /d C:\RPM-Assure\deploy',
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Renew-Assure-Https.ps1 >> C:\RPM-Assure\deploy\logs\https-renew-task.log 2>&1'
) | Set-Content -LiteralPath $wrapper -Encoding ASCII

function Install-RpmaTask([string]$Name, [string]$Schedule, [string]$Extra) {
  cmd.exe /c ('schtasks /Delete /TN "' + $Name + '" /F >nul 2>&1') | Out-Null
  $cmd = 'schtasks /Create /F /TN "' + $Name + '" /TR "' + $wrapper + '" /RU SYSTEM /RL HIGHEST ' + $Schedule
  if ($Extra) { $cmd = $cmd + ' ' + $Extra }
  cmd.exe /c $cmd
  if ($LASTEXITCODE -ne 0) { throw ('schtasks create failed for ' + $Name) }
  Write-Host ('INSTALLED ' + $Name + '  ' + $Schedule + ' ' + $Extra)
}

Install-RpmaTask 'RPMAssure-Https-Renew'         '/SC DAILY /ST 04:15' ''
Install-RpmaTask 'RPMAssure-Https-Renew-PM'      '/SC DAILY /ST 16:15' ''
Install-RpmaTask 'RPMAssure-Https-Renew-OnStart' '/SC ONSTART'         '/DELAY 0002:00'

Write-Host ''
Write-Host 'Caddy renews Let''s Encrypt while it is running (TLS-ALPN-01 on 443).'
Write-Host 'These tasks keep Caddy up and force reload/restart if the cert is under 30/21 days.'
Write-Host 'One cert covers the website AND every agent (heartbeat, ingest, pack download).'
Write-Host ''
foreach ($t in @('RPMAssure-Https-Renew', 'RPMAssure-Https-Renew-PM', 'RPMAssure-Https-Renew-OnStart')) {
  schtasks /Query /TN $t /FO LIST /V | Select-String -Pattern 'Task Name|Status|Next Run|Task To Run'
  Write-Host '---'
}

Write-Host 'Running a check now...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ps1
Write-Host ('Log: ' + (Join-Path $Logs 'https-renew-task.log'))
Write-Host ('Status JSON: ' + (Join-Path $Logs 'https-renew-status.json'))
