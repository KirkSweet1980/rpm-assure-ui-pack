# Remove RPM Assure Edge from THIS host (service, tray, tasks, files).
# Does not delete the customer in Assure SQL.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Uninstall-Assure-Agent.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Uninstall-Assure-Agent.ps1 -KeepFiles
param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za',
  [string]$AgentSecret = '',
  [string]$CustomerCode = '',
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

if (-not $CustomerCode) {
  $cfg = Join-Path $Agent 'Agent.Config.ps1'
  if (Test-Path $cfg) {
    try {
      . $cfg
      if ($CustomerCode) { $CustomerCode = ([string]$CustomerCode).Trim().ToUpperInvariant() }
    } catch {}
  }
}
if (-not $AgentSecret) {
  $setPath = Join-Path $Agent 'Agent.Settings.json'
  if (Test-Path $setPath) {
    try {
      $set = Get-Content $setPath -Raw | ConvertFrom-Json
      if ($set.agentSecret) { $AgentSecret = [string]$set.agentSecret }
      if ($set.appHttpsUrl) { $AppHttpsUrl = [string]$set.appHttpsUrl }
    } catch {}
  }
}

if ($CustomerCode -and $AgentSecret) {
  Write-Host ('Tell Assure this host is uninstalled (' + $CustomerCode + ')...')
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $body = '{"kind":"uninstall","customerCode":"' + $CustomerCode + '","hostName":"' + $env:COMPUTERNAME + '"}'
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 20 `
      -Uri ($AppHttpsUrl.TrimEnd('/') + '/api/agent/ingest') `
      -Method POST `
      -Headers @{ 'X-Assure-Secret' = $AgentSecret; 'Content-Type' = 'application/json' } `
      -Body $body
    Write-Host ('  Assure ' + $r.StatusCode + ' ' + $r.Content)
  } catch {
    Write-Host ('  WARN Assure uninstall stamp: ' + $_.Exception.Message)
  }
} else {
  Write-Host 'WARN: no customer/secret - SYSPRO cover drops after 2h silent heartbeat.'
}

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
Write-Host 'Done. This host is UNINSTALLED on Assure. SYSPRO cover drops when no live agent remains.'
Write-Host 'IB customer + SYSPRO warehouse rows stay. Cover comes back only after a new agent heartbeat.'
Write-Host '========================================'
