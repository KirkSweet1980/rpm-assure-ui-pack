# Remove RPM Assure Edge from THIS host (service, tray, tasks, files).
# Does not delete the customer in Assure SQL.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Uninstall-Assure-Agent.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Uninstall-Assure-Agent.ps1 -KeepFiles
param(
  [string]$Root = 'C:\RPM-Assure',
  [switch]$KeepFiles
)

$ErrorActionPreference = 'Continue'
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run as Administrator.' }

Write-Host '========================================'
Write-Host ' RPM Assure - uninstall Edge agent'
Write-Host (' Host  ' + $env:COMPUTERNAME)
Write-Host (' Root  ' + $Root)
Write-Host '========================================'

$Agent = Join-Path $Root 'Agent'

Write-Host 'Stopping tray / agent PowerShell...'
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'Start-Agent-Tray|RpmAssure-Agent|RpmAssure-Agent-Loop' } |
  ForEach-Object {
    Write-Host ('  kill pid ' + $_.ProcessId)
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Write-Host 'Removing scheduled tasks...'
$taskNames = @(
  'RPMAssure-Edge-Tray',
  'RPMAssure-ApplyPack',
  'RPMAssure-Edge-Agent',
  'RPMAssure-App-OnStart'
)
Get-ScheduledTask -ErrorAction SilentlyContinue |
  Where-Object {
    $_.TaskName -like 'RPMAssure*' -or
    $_.TaskName -in $taskNames
  } |
  ForEach-Object {
    Write-Host ('  task ' + $_.TaskName)
    Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction SilentlyContinue
    cmd.exe /c ('schtasks /Delete /TN "' + $_.TaskName + '" /F >nul 2>&1') | Out-Null
  }
foreach ($tn in $taskNames) {
  cmd.exe /c ('schtasks /Delete /TN "' + $tn + '" /F >nul 2>&1') | Out-Null
}

Write-Host 'Removing service RPMAssure-Edge...'
$nssm = $null
foreach ($p in @(
  (Join-Path $Agent 'tools\nssm.exe'),
  (Join-Path $Root 'Tools\nssm.exe'),
  (Join-Path $Root 'deploy\ui-pack\Sql\agent\tools\nssm.exe')
)) { if (Test-Path $p) { $nssm = $p; break } }

if (Get-Service RPMAssure-Edge -ErrorAction SilentlyContinue) {
  if ($nssm) {
    & $nssm stop RPMAssure-Edge confirm 2>$null | Out-Null
    Start-Sleep -Seconds 2
    & $nssm remove RPMAssure-Edge confirm 2>$null | Out-Null
  }
  Stop-Service RPMAssure-Edge -Force -ErrorAction SilentlyContinue
  sc.exe stop RPMAssure-Edge | Out-Null
  Start-Sleep -Seconds 1
  sc.exe delete RPMAssure-Edge | Out-Null
  Start-Sleep -Seconds 2
}
if (Get-Service RPMAssure-Edge -ErrorAction SilentlyContinue) {
  Write-Host 'WARN: service still listed. Reboot, then re-run this script.'
} else {
  Write-Host 'Service gone.'
}

if (-not $KeepFiles) {
  Write-Host ('Removing ' + $Root + ' ...')
  if (Test-Path $Root) {
    takeown /F $Root /R /D Y | Out-Null
    icacls $Root /grant Administrators:F /T /C /Q | Out-Null
    Get-ChildItem $Root -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
      try { $_.Attributes = 'Normal' } catch {}
    }
    Remove-Item -LiteralPath $Root -Recurse -Force -ErrorAction SilentlyContinue
  }
  foreach ($extra in @(
    (Join-Path $env:TEMP 'rpm-assure-agent.zip'),
    (Join-Path $env:TEMP 'Deploy-Assure-Agent.ps1'),
    (Join-Path $env:TEMP 'Onboard-IB-Syspro.ps1'),
    (Join-Path $env:TEMP 'Uninstall-Assure-Agent.ps1')
  )) {
    if (Test-Path $extra) { Remove-Item -LiteralPath $extra -Force -ErrorAction SilentlyContinue }
  }
  if (Test-Path $Root) {
    Write-Host 'WARN: some files still locked (EPP). Reboot and delete C:\RPM-Assure.'
  } else {
    Write-Host 'Files removed.'
  }
} else {
  Write-Host 'KeepFiles: left C:\RPM-Assure on disk.'
}

Write-Host ''
Write-Host 'Done. This host will drop off Assure after the next missed heartbeat.'
Write-Host 'IB customer + SYSPRO data on Assure SQL are unchanged.'
Write-Host '========================================'
