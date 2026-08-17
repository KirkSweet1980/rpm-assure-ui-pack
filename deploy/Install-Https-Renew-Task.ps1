# Install daily Let's Encrypt watchdog (Caddy). No SQL bind.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Install-Https-Renew-Task.ps1

$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$Deploy = Join-Path $Root 'deploy'
$Logs = Join-Path $Deploy 'logs'
New-Item -ItemType Directory -Force -Path $Logs, $Deploy | Out-Null

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach ($name in @('Renew-Assure-Https.ps1')) {
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

$task = 'RPMAssure-Https-Renew'
cmd.exe /c ('schtasks /Delete /TN "' + $task + '" /F >nul 2>&1') | Out-Null
$tr = $wrapper
$create = 'schtasks /Create /F /TN "' + $task + '" /TR "' + $tr + '" /SC DAILY /ST 04:15 /RU SYSTEM /RL HIGHEST'
cmd.exe /c $create
if ($LASTEXITCODE -ne 0) { throw 'schtasks create failed for ' + $task }

Write-Host ('INSTALLED ' + $task + ' DAILY 04:15')
Write-Host 'Caddy renews Let''s Encrypt while it is running. This task restarts it if 443 is down or the cert is under 21 days.'
schtasks /Query /TN $task /FO LIST /V | Select-String -Pattern 'Task Name|Status|Next Run|Task To Run'
