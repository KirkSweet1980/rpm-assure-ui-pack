# Install-Customer-Agent.ps1
# One shot on the CUSTOMER SQL host (Administrator).
# Pulls the agent from git (or uses C:\RPM-Assure\Sql\agent), installs
# Windows service RPMAssure-Edge, runs first collect, heartbeats to central.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Customer-Agent.ps1
#
param(
  [string]$RepoUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git',
  [string]$Root = 'C:\RPM-Assure',
  [switch]$SkipGit
)

$ErrorActionPreference = 'Stop'
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run this as Administrator on the customer SQL server.' }

Write-Host '========================================'
Write-Host ' RPM Assure - Customer SQL agent'
Write-Host '========================================'

$SqlRoot = Join-Path $Root 'Sql'
$AgentSrc = Join-Path $SqlRoot 'agent'
$Pack = Join-Path $Root 'deploy\ui-pack'

function Find-Git {
  $g = Get-Command git -EA SilentlyContinue
  if ($g) { return $g.Source }
  foreach ($p in @('C:\Program Files\Git\cmd\git.exe','C:\Program Files (x86)\Git\cmd\git.exe')) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

if (-not $SkipGit) {
  $git = Find-Git
  if ($git) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null
    if (Test-Path (Join-Path $Pack '.git')) {
      Write-Host "git pull $Pack"
      & $git -C $Pack fetch --all --prune
      & $git -C $Pack reset --hard origin/main
    } else {
      if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
      Write-Host "git clone $RepoUrl"
      & $git clone --depth 1 --branch main $RepoUrl $Pack
    }
    if (Test-Path (Join-Path $Pack 'Sql\agent')) {
      New-Item -ItemType Directory -Force -Path $AgentSrc | Out-Null
      robocopy (Join-Path $Pack 'Sql\agent') $AgentSrc /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    }
    $baseSrc = Join-Path $Pack 'Sql\base\syspro-direct'
    if (Test-Path $baseSrc) {
      $baseDest = Join-Path $SqlRoot 'base\syspro-direct'
      New-Item -ItemType Directory -Force -Path $baseDest | Out-Null
      robocopy $baseSrc $baseDest /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    }
  } else {
    Write-Host 'Git not on this host - using files already under C:\RPM-Assure\Sql\agent' -ForegroundColor Yellow
  }
}

$install = Join-Path $AgentSrc 'Install-Agent-Service.ps1'
if (-not (Test-Path $install)) {
  throw "Missing $install - copy Sql\agent from the app server or install Git and re-run."
}

$schema = Join-Path $AgentSrc '470_Ensure_Agent_Tables.sql'
$cfgGuess = Get-ChildItem (Join-Path $SqlRoot 'customers') -Filter 'Customer.Config.ps1' -Recurse -EA SilentlyContinue | Select-Object -First 1
if ((Test-Path $schema) -and $cfgGuess) {
  Write-Host 'Applying central agent tables (best effort)...'
  . $cfgGuess.FullName
  $sqlcmd = $null
  foreach ($c in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
  )) { if (Test-Path $c) { $sqlcmd = $c; break } }
  if (-not $sqlcmd) {
    $g = Get-Command sqlcmd.exe -EA SilentlyContinue
    if ($g) { $sqlcmd = $g.Source }
  }
  if ($sqlcmd -and $CentralDataSource -and $CentralSqlUser) {
    & $sqlcmd -S $CentralDataSource -d $CentralDatabase -U $CentralSqlUser -P $CentralSqlPassword -C -b -i $schema
    if ($LASTEXITCODE -ne 0) { Write-Host 'WARN: schema apply failed - run 470 on central if tables missing' -ForegroundColor Yellow }
    else { Write-Host 'Central agent tables OK' -ForegroundColor Green }
  }
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install -RunOnce
Write-Host '=== Customer agent done ==='
Get-Service RPMAssure-Edge -EA SilentlyContinue | Format-Table Name, Status, StartType -AutoSize
