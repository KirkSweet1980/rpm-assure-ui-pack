# Install / start the RPM Assure tray icon on this SQL host.
# Run as the user who sits at the console (Administrator OK).
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Agent\Install-Agent-Tray.ps1
param([string]$AgentRoot = 'C:\RPM-Assure\Agent')

$ErrorActionPreference = 'Stop'
$srcDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $srcDir 'Start-Agent-Tray.ps1'
$destTray = Join-Path $AgentRoot 'Start-Agent-Tray.ps1'
if ((Test-Path $src) -and ((Resolve-Path $src).Path -ne (Resolve-Path -LiteralPath $destTray -ErrorAction SilentlyContinue).Path)) {
  Copy-Item $src $destTray -Force
}
$iconSrc = Join-Path $srcDir 'tray'
$iconDst = Join-Path $AgentRoot 'tray'
if ((Test-Path $iconSrc) -and ((Resolve-Path $iconSrc).Path -ne (Resolve-Path -LiteralPath $iconDst -ErrorAction SilentlyContinue).Path)) {
  New-Item -ItemType Directory -Force -Path $iconDst | Out-Null
  Copy-Item (Join-Path $iconSrc '*') $iconDst -Force
}
$tray = Join-Path $AgentRoot 'Start-Agent-Tray.ps1'
if (-not (Test-Path $tray)) { throw "Missing $tray" }

$trayTask = 'RPMAssure-Edge-Tray'
$tr = 'powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "' + $tray + '" -AgentRoot "' + $AgentRoot + '"'
cmd.exe /c ('schtasks /Delete /TN "' + $trayTask + '" /F >nul 2>&1') | Out-Null
cmd.exe /c ('schtasks /Create /F /TN "' + $trayTask + '" /TR "' + $tr + '" /SC ONLOGON /RL LIMITED')
if ($LASTEXITCODE -ne 0) { Write-Host 'WARN: logon task not created (run as Administrator). Tray will still start now.' }

Get-Process powershell -EA SilentlyContinue | Where-Object {
  $_.CommandLine -and $_.CommandLine -match 'Start-Agent-Tray'
} | Out-Null

Start-Process powershell.exe -ArgumentList @('-WindowStyle','Hidden','-NoProfile','-ExecutionPolicy','Bypass','-File',$tray,'-AgentRoot',$AgentRoot)
Write-Host 'RPM Assure tray started. Look next to the clock.'
Write-Host 'Right-click or left-click: status, Sync now, Restart agent, Settings, Exit tray.'
