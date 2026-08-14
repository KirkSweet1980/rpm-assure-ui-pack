# One-shot for EVERY remaining SYSPRO SQL host. Administrator.
# Installs Git, pulls rpm-assure-ui-pack, installs RPMAssure-Edge + tray + auto-update.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Bootstrap-Customer-Agent.ps1
param(
  [string]$RepoUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git',
  [string]$Root = 'C:\RPM-Assure'
)

$ErrorActionPreference = 'Stop'
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run as Administrator on the customer SYSPRO SQL server.' }

Write-Host '========================================'
Write-Host ' RPM Assure - customer agent bootstrap'
Write-Host '========================================'

$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$git = $null
if (Get-Command git -EA SilentlyContinue) { $git = (Get-Command git).Source }
if (-not $git -and (Test-Path 'C:\Program Files\Git\cmd\git.exe')) { $git = 'C:\Program Files\Git\cmd\git.exe' }
if (-not $git) {
  Write-Host 'Installing Git for Windows...'
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $tmp = Join-Path $env:TEMP 'Git-64-bit.exe'
  Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' -OutFile $tmp
  Start-Process -FilePath $tmp -ArgumentList '/VERYSILENT','/NORESTART','/NOCANCEL','/SP-' -Wait
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  if (Test-Path 'C:\Program Files\Git\cmd\git.exe') { $git = 'C:\Program Files\Git\cmd\git.exe' }
}
if (-not $git) { throw 'Git installed. Open a NEW Administrator window and run this script again.' }
Write-Host ("git = " + $git)

$Pack = Join-Path $Root 'deploy\ui-pack'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null
if (Test-Path (Join-Path $Pack '.git')) {
  & $git -C $Pack fetch --all --prune
  & $git -C $Pack reset --hard origin/main
} else {
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  & $git clone --depth 1 --branch main $RepoUrl $Pack
}

$deploy = Join-Path $Pack 'Sql\agent\Deploy-Syspro-Customer-Agent.ps1'
if (-not (Test-Path $deploy)) { throw "Missing $deploy after git" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $deploy

# Always leave a start-edge + nssm start (covers Start-Service failures)
$agent = Join-Path $Root 'Agent'
New-Item -ItemType Directory -Force -Path $agent, (Join-Path $agent 'logs') | Out-Null
@(
  '@echo off',
  'cd /d C:\RPM-Assure\Agent',
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Agent\RpmAssure-Agent-Loop.ps1" -AgentRoot "C:\RPM-Assure\Agent"'
) | Set-Content -LiteralPath (Join-Path $agent 'start-edge.cmd') -Encoding ASCII

$updSrc = Join-Path $Pack 'Sql\agent\Update-Agent-From-Central.ps1'
if (Test-Path $updSrc) {
  Get-Content $updSrc -Raw | Set-Content (Join-Path $agent 'Update-From-Assure.ps1') -Encoding ASCII
  cmd /c copy /Y "C:\RPM-Assure\Agent\Update-From-Assure.ps1" "C:\RPM-Assure\Agent\Update-Agent-From-Central.ps1" | Out-Null
}

$nssm = Join-Path $agent 'tools\nssm.exe'
if (-not (Test-Path $nssm)) { $nssm = 'C:\RPM-Assure\Tools\nssm.exe' }
if (Test-Path $nssm) {
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $nssm set RPMAssure-Edge Application (Join-Path $agent 'start-edge.cmd')
  & $nssm set RPMAssure-Edge AppDirectory $agent
  & $nssm start RPMAssure-Edge
  Start-Sleep 4
  $ErrorActionPreference = $old
}

Get-Service RPMAssure-Edge -EA SilentlyContinue | Format-Table Name, Status, StartType -AutoSize
Write-Host 'Auto-update: v2.2.0  |  tray: RPM Assure by the clock'
Write-Host 'Hard-refresh Assure Configuration'
Write-Host '========================================'
