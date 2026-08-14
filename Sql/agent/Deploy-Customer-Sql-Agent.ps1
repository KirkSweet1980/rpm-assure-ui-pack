# Deploy-Customer-Sql-Agent.ps1
# SAME script on every customer SYSPRO SQL host. Run as Administrator.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Deploy-Customer-Sql-Agent.ps1
#
# 1) Installs Git if missing
# 2) git clone/pull rpm-assure-ui-pack
# 3) Copies Sql\agent + collect runner
# 4) Installs Windows service RPMAssure-Edge
# 5) First collect + heartbeat to central Assure
#
param(
  [string]$RepoUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git',
  [string]$Root = 'C:\RPM-Assure'
)

$ErrorActionPreference = 'Stop'
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run this as Administrator on the customer SQL server.' }

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

Write-Host '========================================'
Write-Host ' RPM Assure - Git + SQL agent (every customer)'
Write-Host '========================================'

function Find-Git {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  $g = Get-Command git -ErrorAction SilentlyContinue
  if ($g) { return $g.Source }
  foreach ($p in @(
      'C:\Program Files\Git\cmd\git.exe',
      'C:\Program Files (x86)\Git\cmd\git.exe'
    )) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

function Ensure-Git {
  $g = Find-Git
  if ($g) { return $g }
  W Cyan 'Git not found - installing Git for Windows...'
  $wg = Get-Command winget -ErrorAction SilentlyContinue
  if ($wg) {
    & winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements --silent
  } else {
    $tmp = Join-Path $env:TEMP 'Git-64-bit.exe'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' -OutFile $tmp
    Start-Process -FilePath $tmp -ArgumentList '/VERYSILENT','/NORESTART','/NOCANCEL','/SP-','/CLOSEAPPLICATIONS','/COMPONENTS=ext,ext\shellhere,assoc,assoc_sh' -Wait
  }
  $g = Find-Git
  if (-not $g) { throw 'Git install finished but git.exe not on PATH. Close this window, open a new Administrator PowerShell, re-run this script.' }
  return $g
}

$git = Ensure-Git
W Green ("git = " + $git)

$Pack = Join-Path $Root 'deploy\ui-pack'
$SqlRoot = Join-Path $Root 'Sql'
$AgentSrc = Join-Path $SqlRoot 'agent'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy'), $SqlRoot, $AgentSrc | Out-Null

if (Test-Path (Join-Path $Pack '.git')) {
  W Cyan ("git pull " + $Pack)
  & $git -C $Pack fetch --all --prune
  if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
  & $git -C $Pack reset --hard origin/main
  if ($LASTEXITCODE -ne 0) { throw 'git reset failed' }
} else {
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  W Cyan ("git clone " + $RepoUrl)
  & $git clone --depth 1 --branch main $RepoUrl $Pack
  if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
}

$fromAgent = Join-Path $Pack 'Sql\agent'
if (-not (Test-Path $fromAgent)) { throw "Repo missing Sql\agent under $Pack" }
robocopy $fromAgent $AgentSrc /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

$baseSrc = Join-Path $Pack 'Sql\base\syspro-direct'
if (Test-Path $baseSrc) {
  $baseDest = Join-Path $SqlRoot 'base\syspro-direct'
  New-Item -ItemType Directory -Force -Path $baseDest | Out-Null
  robocopy $baseSrc $baseDest /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$cfgs = @(Get-ChildItem (Join-Path $SqlRoot 'customers') -Filter 'Customer.Config.ps1' -Recurse -ErrorAction SilentlyContinue)
if ($cfgs.Count -eq 0) {
  W Yellow 'No Customer.Config.ps1 yet. Run onboard first, then re-run this script.'
} else {
  W Green ('Customers on this host: ' + (($cfgs | ForEach-Object { $_.Directory.Name }) -join ', '))
}

$schema = Join-Path $AgentSrc '470_Ensure_Agent_Tables.sql'
if ((Test-Path $schema) -and $cfgs.Count -gt 0) {
  . $cfgs[0].FullName
  $sqlcmd = $null
  foreach ($c in @(
      'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
      'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
    )) { if (Test-Path $c) { $sqlcmd = $c; break } }
  if (-not $sqlcmd) {
    $gc = Get-Command sqlcmd.exe -ErrorAction SilentlyContinue
    if ($gc) { $sqlcmd = $gc.Source }
  }
  if ($sqlcmd -and $CentralDataSource -and $CentralSqlUser) {
    W Cyan 'Applying central agent tables...'
    & $sqlcmd -S $CentralDataSource -d $CentralDatabase -U $CentralSqlUser -P $CentralSqlPassword -C -b -i $schema
    if ($LASTEXITCODE -ne 0) { W Yellow 'WARN: 470 schema apply failed (run on central if first customer).' }
    else { W Green 'Central agent tables OK' }
  }
}

$install = Join-Path $AgentSrc 'Install-Agent-Service.ps1'
if (-not (Test-Path $install)) { throw "Missing $install" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install -RunOnce

Write-Host '========================================'
Write-Host ' CUSTOMER SQL AGENT DEPLOYED'
Get-Service RPMAssure-Edge -ErrorAction SilentlyContinue | Format-Table Name, Status, StartType -AutoSize
Write-Host ' Hard-refresh Assure: Configuration > Edge Agents'
Write-Host '========================================'
