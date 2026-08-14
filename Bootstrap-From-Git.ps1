# Bootstrap-From-Git.ps1
# First-time or missing Update-AppServer.ps1. Run as Administrator.
# Installs Git if needed, clones the pack, then:
#   - APP server  (RPMAssure-App)  -> Update-AppServer.ps1
#   - SQL host    (RPMAssure-Edge) -> copy agent + tray
$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$Pack = Join-Path $Root 'deploy\ui-pack'
$Repo = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git'

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run as Administrator.' }

function Find-Git {
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  $g = Get-Command git -ErrorAction SilentlyContinue
  if ($g) { return $g.Source }
  foreach ($p in @('C:\Program Files\Git\cmd\git.exe','C:\Program Files (x86)\Git\cmd\git.exe')) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

$git = Find-Git
if (-not $git) {
  Write-Host 'Installing Git...'
  $wg = Get-Command winget -ErrorAction SilentlyContinue
  if ($wg) {
    & winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements --silent
  } else {
    $tmp = Join-Path $env:TEMP 'Git-64-bit.exe'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' -OutFile $tmp
    Start-Process -FilePath $tmp -ArgumentList '/VERYSILENT','/NORESTART','/NOCANCEL','/SP-','/CLOSEAPPLICATIONS' -Wait
  }
  $git = Find-Git
  if (-not $git) { throw 'Git installed. Open a NEW Administrator PowerShell and paste this script again.' }
}
Write-Host ("git = " + $git)

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null
if (Test-Path (Join-Path $Pack '.git')) {
  & $git -C $Pack fetch --all --prune
  if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
  & $git -C $Pack reset --hard origin/main
} else {
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  & $git clone --depth 1 --branch main $Repo $Pack
  if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
}

$upd = Join-Path $Pack 'Update-AppServer.ps1'
if (Test-Path $upd) { Copy-Item $upd (Join-Path $Root 'deploy\Update-AppServer.ps1') -Force }

$hasApp = Get-Service -Name 'RPMAssure-App' -ErrorAction SilentlyContinue
$hasEdge = Get-Service -Name 'RPMAssure-Edge' -ErrorAction SilentlyContinue

if ($hasApp) {
  Write-Host 'This is the APP server - running Update-AppServer.ps1'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'deploy\Update-AppServer.ps1')
} elseif ($hasEdge -or (Test-Path (Join-Path $Root 'Sql\customers'))) {
  Write-Host 'This is a customer SQL host - updating agent + tray'
  $dest = Join-Path $Root 'Agent'
  New-Item -ItemType Directory -Force -Path $dest, (Join-Path $Root 'Sql\agent') | Out-Null
  robocopy (Join-Path $Pack 'Sql\agent') (Join-Path $Root 'Sql\agent') /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  Copy-Item (Join-Path $Pack 'Sql\agent\*') $dest -Force
  $tray = Join-Path $dest 'Install-Agent-Tray.ps1'
  if (Test-Path $tray) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $tray
  }
  Write-Host 'SQL host updated. Tray should appear by the clock.'
} else {
  Write-Host 'Pack cloned to C:\RPM-Assure\deploy\ui-pack'
  Write-Host 'No RPMAssure-App or Edge service found.'
  Write-Host 'On the APP server install the app service first.'
  Write-Host 'On a SQL host run Deploy-Customer-Sql-Agent.ps1'
}
