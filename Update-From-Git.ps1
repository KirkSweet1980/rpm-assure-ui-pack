# Update-From-Git.ps1
# Lives on the APP server. Pulls latest UI from GitHub and deploys.
# First time:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Update-From-Git.ps1
# After that, same command. Always copies scripts to Downloads.

param(
  [string]$RepoUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git',
  [string]$Root = 'C:\RPM-Assure',
  [switch]$SyncApis
)

$ErrorActionPreference = 'Stop'
$Downloads = Join-Path $env:USERPROFILE 'Downloads'
$Pack = Join-Path $Root 'deploy\ui-pack'
$App = Join-Path $Root 'App'
$SvcName = 'RPMAssure-App'

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run this in an Administrator PowerShell.' }

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) { throw 'git is not installed. Install Git for Windows, then re-run.' }

New-Item -ItemType Directory -Force -Path $Downloads, (Join-Path $Root 'deploy') | Out-Null

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - deploy from Git'
Write-Host '========================================' -ForegroundColor Cyan

if (Test-Path (Join-Path $Pack '.git')) {
  W Cyan ("--- git pull " + $Pack + " ---")
  & git -C $Pack fetch --all --prune
  if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
  & git -C $Pack reset --hard origin/main
  if ($LASTEXITCODE -ne 0) { throw 'git reset --hard origin/main failed' }
} else {
  W Cyan ("--- git clone " + $RepoUrl + " ---")
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  & git clone --depth 1 --branch main $RepoUrl $Pack
  if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
}

$idx = Get-ChildItem -Path $Pack -Recurse -Filter 'index.tsx' |
  Where-Object { $_.FullName -match 'src\\routes\\index.tsx$' } |
  Select-Object -First 1
if (-not $idx) { throw "Repo cloned but src\routes\index.tsx not found in $Pack" }
$srcRoot = $idx.Directory.Parent.Parent.FullName
W Green ("Source: " + $srcRoot)

if (-not (Test-Path $App)) { throw "Missing $App" }

$svcObj = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
W Cyan '--- Stop service ---'
if ($svcObj -and $svcObj.Status -ne 'Stopped') {
  Stop-Service -Name $SvcName -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bak = Join-Path $Root ("backup\src-" + $stamp)
New-Item -ItemType Directory -Force -Path $bak | Out-Null
if (Test-Path (Join-Path $App 'src')) {
  W Cyan ("--- Backup -> " + $bak + " ---")
  robocopy (Join-Path $App 'src') $bak /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

W Cyan '--- Copy UI from git ---'
$destSrc = Join-Path $App 'src'
New-Item -ItemType Directory -Force -Path $destSrc | Out-Null
robocopy (Join-Path $srcRoot 'src') $destSrc /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy src failed exit $LASTEXITCODE" }

foreach ($rel in @('vite.config.ts', 'tsconfig.json')) {
  $from = Join-Path $srcRoot $rel
  if (Test-Path $from) { Copy-Item $from (Join-Path $App $rel) -Force }
}

W Cyan '--- Copy scripts to Downloads ---'
foreach ($name in @('Update-From-Git.ps1','Deploy-RpmAssure.ps1','Install-RpmAssure-Full-UI.ps1','Sync-All-Apis-Now.ps1','Run-Deploy.cmd')) {
  $from = Join-Path $Pack $name
  if (Test-Path $from) {
    Copy-Item $from (Join-Path $Downloads $name) -Force
    Copy-Item $from (Join-Path $Root ("deploy\" + $name)) -Force
    W Green ("Downloads: " + (Join-Path $Downloads $name))
  }
}

if ($svcObj) {
  W Cyan '--- Start service ---'
  Start-Service -Name $SvcName
  Start-Sleep -Seconds 4
  W Green ($SvcName + ' = ' + (Get-Service -Name $SvcName).Status)
}

foreach ($url in @('http://127.0.0.1:8081/login','http://127.0.0.1:8080/login')) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 8
    W Green ("PROOF OK: " + $url + " HTTP " + [int]$r.StatusCode)
    break
  } catch { W Yellow ("PROOF wait: " + $url) }
}

if ($SyncApis) {
  $sync = Join-Path $Root 'Sql\ops\Sync-All-Apis-Now.ps1'
  $syncDl = Join-Path $Downloads 'Sync-All-Apis-Now.ps1'
  if (-not (Test-Path $sync) -and (Test-Path $syncDl)) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Root 'Sql\ops') | Out-Null
    Copy-Item $syncDl $sync -Force
  }
  if (Test-Path $sync) {
    W Cyan '--- Sync all APIs ---'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $sync
  }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' GIT DEPLOY COMPLETE'
Write-Host (" Pack   : " + $Pack)
Write-Host (" Backup : " + $bak)
Write-Host ' Hard-refresh (Ctrl+F5).'
Write-Host '========================================' -ForegroundColor Cyan
