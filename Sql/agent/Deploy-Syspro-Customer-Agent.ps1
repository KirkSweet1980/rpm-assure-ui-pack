# Deploy-Syspro-Customer-Agent.ps1
# Same pack on EVERY remaining SYSPRO SQL host. Administrator.
# Installs Git, pulls rpm-assure-ui-pack, installs RPMAssure-Edge + tray.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Deploy-Syspro-Customer-Agent.ps1
param(
  [string]$RepoUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git',
  [string]$Root = 'C:\RPM-Assure'
)

$ErrorActionPreference = 'Stop'
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run as Administrator on the customer SYSPRO SQL server.' }

Write-Host '========================================'
Write-Host ' RPM Assure - SYSPRO customer agent'
Write-Host '========================================'

function Find-Git {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  $g = Get-Command git -EA SilentlyContinue
  if ($g) { return $g.Source }
  foreach ($p in @('C:\Program Files\Git\cmd\git.exe', 'C:\Program Files (x86)\Git\cmd\git.exe')) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

$git = Find-Git
if (-not $git) {
  Write-Host 'Installing Git...'
  $wg = Get-Command winget -EA SilentlyContinue
  if ($wg) {
    & winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements --silent
  } else {
    $tmp = Join-Path $env:TEMP 'Git-64-bit.exe'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' -OutFile $tmp
    Start-Process -FilePath $tmp -ArgumentList '/VERYSILENT', '/NORESTART', '/NOCANCEL', '/SP-' -Wait
  }
  $git = Find-Git
  if (-not $git) { throw 'Git installed. Open a NEW Administrator PowerShell and run this script again.' }
}
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

$from = Join-Path $Pack 'Sql\agent'
if (-not (Test-Path $from)) { throw "Repo missing Sql\agent under $Pack" }
$agentSql = Join-Path $Root 'Sql\agent'
$agentRoot = Join-Path $Root 'Agent'
New-Item -ItemType Directory -Force -Path $agentSql, $agentRoot, (Join-Path $agentRoot 'tray') | Out-Null
robocopy $from $agentSql /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
robocopy $from $agentRoot /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

$baseSrc = Join-Path $Pack 'Sql\base\syspro-direct'
if (Test-Path $baseSrc) {
  $baseDest = Join-Path $Root 'Sql\base\syspro-direct'
  New-Item -ItemType Directory -Force -Path $baseDest | Out-Null
  robocopy $baseSrc $baseDest /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$cfgs = @(Get-ChildItem (Join-Path $Root 'Sql\customers') -Filter 'Customer.Config.ps1' -Recurse -EA SilentlyContinue)
if ($cfgs.Count -eq 0) {
  Write-Host 'WARN: no Customer.Config.ps1 - onboard this customer first, then re-run.' -ForegroundColor Yellow
} else {
  Write-Host ('Customers: ' + (($cfgs | ForEach-Object { $_.Directory.Name }) -join ', '))
}

$install = Join-Path $agentRoot 'Install-Agent-Service.ps1'
if (-not (Test-Path $install)) { $install = Join-Path $agentSql 'Install-Agent-Service.ps1' }
if (-not (Test-Path $install)) { throw 'Install-Agent-Service.ps1 missing after git pull' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install -RunOnce

$tray = Join-Path $agentRoot 'Install-Agent-Tray.ps1'
if (Test-Path $tray) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $tray
}

Write-Host '========================================'
Write-Host ' SYSPRO AGENT DEPLOYED'
Get-Service RPMAssure-Edge -EA SilentlyContinue | Format-Table Name, Status, StartType -AutoSize
Write-Host ' Tray: RPM Assure by the clock (green = OK)'
Write-Host ' Hard-refresh Assure Configuration'
Write-Host '========================================'
