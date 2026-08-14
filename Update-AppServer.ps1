# Update-AppServer.ps1
# Canonical APP server update: Git first. Nothing is written to Downloads.
# Clone / pull: C:\RPM-Assure\deploy\ui-pack
# Then copy App\src, apply schema, restart RPMAssure-App.
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
  throw 'Git is not installed. Install Git for Windows, then re-run this script.'
}

function Find-SrcRoot([string]$root) {
  $idx = Get-ChildItem $root -Recurse -Filter 'index.tsx' |
    Where-Object { $_.FullName -match 'src\\routes\\index.tsx$' } |
    Select-Object -First 1
  if (-not $idx) { throw "src\routes\index.tsx not found under $root" }
  return $idx.Directory.Parent.Parent.FullName
}

function Remove-DirHard([string]$path) {
  if (-not (Test-Path $path)) { return }
  cmd /c "attrib -R `"$path\*`" /S /D >nul 2>nul"
  cmd /c "rmdir /s /q `"$path`""
  Start-Sleep -Seconds 1
  if (Test-Path $path) {
    Get-ChildItem $path -Force -Recurse -EA SilentlyContinue | ForEach-Object {
      $_.Attributes = 'Normal'
    }
    Remove-Item $path -Recurse -Force -EA SilentlyContinue
  }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - Update from Git'
Write-Host '========================================' -ForegroundColor Cyan

$git = Ensure-Git
W Green ("git = " + $git)
& $git config --system core.longpaths true
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null

$lock = Join-Path $Pack '.git\index.lock'
if (Test-Path $lock) { Remove-Item $lock -Force -EA SilentlyContinue }

$got = $false
if (Test-Path (Join-Path $Pack '.git')) {
  W Cyan ("git pull " + $Pack)
  & $git -C $Pack -c core.longpaths=true -c core.protectNTFS=false fetch --all --prune
  & $git -C $Pack -c core.longpaths=true -c core.protectNTFS=false reset --hard origin/main
  if ($LASTEXITCODE -eq 0) { $got = $true }
}
if (-not $got) {
  W Cyan ("git clone " + $RepoUrl)
  Remove-DirHard $Pack
  $tmp = Join-Path $Root ('deploy\ui-pack-new-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  & $git -c core.longpaths=true -c core.protectNTFS=false clone --depth 1 --branch main $RepoUrl $tmp
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $tmp 'App\src\routes\index.tsx'))) {
    throw 'git clone / checkout failed. Close Explorer windows on C:\RPM-Assure\deploy and retry.'
  }
  Remove-DirHard $Pack
  Rename-Item $tmp $Pack
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

$agentSrc = Join-Path $Pack 'Sql\agent'
if (Test-Path $agentSrc) {
  $agentDest = Join-Path $Root 'Sql\agent'
  New-Item -ItemType Directory -Force -Path $agentDest | Out-Null
  W Cyan '--- Copy Sql\agent from git ---'
  robocopy $agentSrc $agentDest /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$centralSrc = Join-Path $Pack 'Sql\central'
if (Test-Path $centralSrc) {
  $centralDest = Join-Path $Root 'Sql\central'
  New-Item -ItemType Directory -Force -Path $centralDest | Out-Null
  W Cyan '--- Copy Sql\central from git ---'
  robocopy $centralSrc $centralDest /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  $schemaPs1 = Join-Path $centralDest 'Update-Database-Schema.ps1'
  if (Test-Path $schemaPs1) {
    W Cyan '--- Update database schema ---'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $schemaPs1
    if ($LASTEXITCODE -ne 0) {
      W Yellow 'Schema update warned - UI still copied. Re-run Sql\central\Update-Database-Schema.ps1 as sysadmin if tables are missing.'
    }
  }
}

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
