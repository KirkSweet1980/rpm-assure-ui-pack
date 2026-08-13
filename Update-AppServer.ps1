# Update-AppServer.ps1
# Canonical APP server update: Git first. Nothing is written to Downloads.
# Clone / pull: C:\RPM-Assure\deploy\ui-pack
# Then copy App\src and restart RPMAssure-App.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Update-AppServer.ps1

param(
  [string]$RepoUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git',
  [string]$Root = 'C:\RPM-Assure',
  [switch]$SyncApis
)

$ErrorActionPreference = 'Stop'
$Pack = Join-Path $Root 'deploy\ui-pack'
$App = Join-Path $Root 'App'
$SvcName = 'RPMAssure-App'

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run this in an Administrator PowerShell.' }

function Ensure-Git {
  $g = Get-Command git -ErrorAction SilentlyContinue
  if ($g) { return $g.Source }
  foreach ($p in @(
      'C:\Program Files\Git\cmd\git.exe',
      'C:\Program Files (x86)\Git\cmd\git.exe'
    )) {
    if (Test-Path $p) { return $p }
  }
  $wg = Get-Command winget -ErrorAction SilentlyContinue
  if ($wg) {
    W Cyan 'Git not found - installing Git for Windows...'
    & winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements --silent
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    $g = Get-Command git -ErrorAction SilentlyContinue
    if ($g) { return $g.Source }
    if (Test-Path 'C:\Program Files\Git\cmd\git.exe') { return 'C:\Program Files\Git\cmd\git.exe' }
  }
  throw 'Git is not installed. Install Git for Windows, then re-run this script.'
}

function Find-SrcRoot([string]$root) {
  $idx = Get-ChildItem $root -Recurse -Filter 'index.tsx' |
    Where-Object { $_.FullName -match 'src\\routes\\index.tsx$' } |
    Select-Object -First 1
  if (-not $idx) { throw "src\routes\index.tsx not found under $root" }
  return $idx.Directory.Parent.Parent.FullName
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - Update from Git'
Write-Host '========================================' -ForegroundColor Cyan

$git = Ensure-Git
W Green ("git = " + $git)
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null

if (Test-Path (Join-Path $Pack '.git')) {
  W Cyan ("git pull " + $Pack)
  & $git -C $Pack fetch --all --prune
  if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
  & $git -C $Pack reset --hard origin/main
  if ($LASTEXITCODE -ne 0) { throw 'git reset failed' }
} else {
  W Cyan ("git clone " + $RepoUrl)
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  & $git clone --depth 1 --branch main $RepoUrl $Pack
  if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
}

$srcRoot = Find-SrcRoot $Pack
W Green ("Source " + $srcRoot)
if (-not (Test-Path $App)) { throw "Missing $App" }

$self = Join-Path $Pack 'Update-AppServer.ps1'
if (Test-Path $self) {
  Copy-Item $self (Join-Path $Root 'deploy\Update-AppServer.ps1') -Force
}

$svcObj = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
if ($svcObj -and $svcObj.Status -ne 'Stopped') {
  W Cyan '--- Stop service ---'
  Stop-Service -Name $SvcName -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

$bak = Join-Path $Root ('backup\src-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $bak | Out-Null
if (Test-Path (Join-Path $App 'src')) {
  W Cyan ("--- Backup " + $bak + " ---")
  robocopy (Join-Path $App 'src') $bak /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

W Cyan '--- Copy UI from git ---'
$destSrc = Join-Path $App 'src'
New-Item -ItemType Directory -Force -Path $destSrc | Out-Null
robocopy (Join-Path $srcRoot 'src') $destSrc /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed $LASTEXITCODE" }

if ($svcObj) {
  Start-Service -Name $SvcName
  Start-Sleep -Seconds 4
  W Green ($SvcName + ' = ' + (Get-Service -Name $SvcName).Status)
}

if ($SyncApis) {
  $sync = Join-Path $Pack 'Sync-All-Apis-Now.ps1'
  $ops = Join-Path $Root 'Sql\ops\Sync-All-Apis-Now.ps1'
  if (Test-Path $sync) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Root 'Sql\ops') | Out-Null
    Copy-Item $sync $ops -Force
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ops
  }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' GIT UPDATE COMPLETE'
Write-Host (" Pack   : " + $Pack)
Write-Host (" Backup : " + $bak)
Write-Host ' Hard-refresh (Ctrl+F5).'
Write-Host '========================================' -ForegroundColor Cyan
