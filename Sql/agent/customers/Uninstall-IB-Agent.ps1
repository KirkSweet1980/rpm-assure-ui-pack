# Interbrand (IB-SQL01). Administrator PowerShell.
# Removes RPMAssure-Edge, tray, tasks, and C:\RPM-Assure.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Uninstall-IB-Agent.ps1
param(
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za',
  [switch]$KeepFiles
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$u = Join-Path $env:TEMP 'Uninstall-Assure-Agent.ps1'
try {
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 `
    -Uri ($AppHttpsUrl.TrimEnd('/') + '/downloads/Uninstall-Assure-Agent.ps1') `
    -OutFile $u
} catch {
  $local = 'C:\RPM-Assure\Agent\Uninstall-Assure-Agent.ps1'
  if (-not (Test-Path $local)) { $local = 'C:\RPM-Assure\Sql\agent\Uninstall-Assure-Agent.ps1' }
  if (Test-Path $local) { $u = $local }
  else { throw ('Download failed and no local copy: ' + $_.Exception.Message) }
}
$args = @()
if ($KeepFiles) { $args += '-KeepFiles' }
& $u @args
