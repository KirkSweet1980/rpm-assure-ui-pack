# Update-AppServer.ps1
# Canonical APP server update: Git first. Never treat git stdout as a path.
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
  if ($g) { return [string]$g.Source }
  foreach ($p in @(
      'C:\Program Files\Git\cmd\git.exe',
      'C:\Program Files (x86)\Git\cmd\git.exe'
    )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  throw 'Git is not installed. Install Git for Windows, then re-run this script.'
}

function Invoke-Git {
  param([Parameter(Mandatory)][string[]]$GitArgs)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $out = & $script:GitExe @GitArgs 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  foreach ($line in @($out)) {
    if ($line -is [System.Management.Automation.ErrorRecord]) {
      $s = [string]$line.Exception.Message
    } else {
      $s = [string]$line
    }
    if ($s.Trim()) { Write-Host $s }
  }
  return $code
}

function Resolve-AppSrc([string]$packDir) {
  foreach ($try in @(
      (Join-Path $packDir 'App'),
      $packDir
    )) {
    if (Test-Path -LiteralPath (Join-Path $try 'src\routes\index.tsx')) { return $try }
  }
  throw "src\routes\index.tsx not found under $packDir"
}

function Remove-DirHard([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return }
  cmd /c "attrib -R `"$path\*`" /S /D >nul 2>nul"
  cmd /c "rmdir /s /q `"$path`""
  Start-Sleep -Seconds 1
  if (Test-Path -LiteralPath $path) {
    Get-ChildItem -LiteralPath $path -Force -Recurse -EA SilentlyContinue | ForEach-Object {
      $_.Attributes = 'Normal'
    }
    Remove-Item -LiteralPath $path -Recurse -Force -EA SilentlyContinue
  }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - Update from Git'
Write-Host '========================================' -ForegroundColor Cyan

$script:GitExe = Ensure-Git
W Green ("git = " + $script:GitExe)
[void](Invoke-Git @('config','--system','core.longpaths','true'))
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null

$lock = Join-Path $Pack '.git\index.lock'
if (Test-Path -LiteralPath $lock) { Remove-Item -LiteralPath $lock -Force -EA SilentlyContinue }

$got = $false
if (Test-Path -LiteralPath (Join-Path $Pack '.git')) {
  W Cyan ("git pull " + $Pack)
  [void](Invoke-Git @('-C',$Pack,'-c','core.longpaths=true','-c','core.protectNTFS=false','fetch','--all','--prune'))
  $rc = Invoke-Git @('-C',$Pack,'-c','core.longpaths=true','-c','core.protectNTFS=false','reset','--hard','origin/main')
  if ($rc -eq 0 -and (Test-Path -LiteralPath (Join-Path $Pack 'App\src\routes\index.tsx'))) { $got = $true }
}
if (-not $got) {
  W Cyan ("git clone " + $RepoUrl)
  Remove-DirHard $Pack
  $tmp = Join-Path $Root ('deploy\ui-pack-new-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  $rc = Invoke-Git @('-c','core.longpaths=true','-c','core.protectNTFS=false','clone','--depth','1','--branch','main',$RepoUrl,$tmp)
  if ($rc -ne 0 -or -not (Test-Path -LiteralPath (Join-Path $tmp 'App\src\routes\index.tsx'))) {
    throw 'git clone / checkout failed. Close Explorer windows on C:\RPM-Assure\deploy and retry.'
  }
  Remove-DirHard $Pack
  Rename-Item -LiteralPath $tmp -NewName (Split-Path $Pack -Leaf)
}

$srcRoot = Resolve-AppSrc $Pack
W Green ("Source " + $srcRoot)
if (-not (Test-Path -LiteralPath $App)) { throw "Missing $App" }

$self = Join-Path $Pack 'Update-AppServer.ps1'
if (Test-Path -LiteralPath $self) {
  Copy-Item -LiteralPath $self -Destination (Join-Path $Root 'deploy\Update-AppServer.ps1') -Force
}

$svcObj = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
if ($svcObj -and $svcObj.Status -ne 'Stopped') {
  W Cyan '--- Stop service ---'
  Stop-Service -Name $SvcName -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

$bak = Join-Path $Root ('backup\src-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $bak | Out-Null
if (Test-Path -LiteralPath (Join-Path $App 'src')) {
  W Cyan ("--- Backup " + $bak + " ---")
  robocopy (Join-Path $App 'src') $bak /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

W Cyan '--- Copy UI from git ---'
$destSrc = Join-Path $App 'src'
New-Item -ItemType Directory -Force -Path $destSrc | Out-Null
robocopy (Join-Path $srcRoot 'src') $destSrc /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed $LASTEXITCODE" }

$pubFrom = Join-Path $srcRoot 'public'
if (-not (Test-Path -LiteralPath $pubFrom)) { $pubFrom = Join-Path $Pack 'public' }
$pubTo = Join-Path $App 'public'
if (Test-Path -LiteralPath $pubFrom) {
  New-Item -ItemType Directory -Force -Path $pubTo | Out-Null
  W Cyan '--- Copy public brand assets from git ---'
  robocopy $pubFrom $pubTo /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$agentSrc = Join-Path $Pack 'Sql\agent'
if (Test-Path -LiteralPath $agentSrc) {
  $agentDest = Join-Path $Root 'Sql\agent'
  New-Item -ItemType Directory -Force -Path $agentDest | Out-Null
  W Cyan '--- Copy Sql\agent from git ---'
  robocopy $agentSrc $agentDest /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

foreach ($rel in @('Sql\ops', 'Sql\csp', 'Sql\rmm\pulseway', 'Sql\cove')) {
  $from = Join-Path $Pack $rel
  if (Test-Path -LiteralPath $from) {
    $to = Join-Path $Root $rel
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    W Cyan ("--- Copy " + $rel + " from git ---")
    robocopy $from $to /E /NFL /NDL /NJH /NJS /nc /ns /np /XF Pulseway.Config.ps1 Csp.Config.ps1 Csp.Config.*.ps1 | Out-Null
  }
}

$centralSrc = Join-Path $Pack 'Sql\central'
if (Test-Path -LiteralPath $centralSrc) {
  $centralDest = Join-Path $Root 'Sql\central'
  New-Item -ItemType Directory -Force -Path $centralDest | Out-Null
  W Cyan '--- Copy Sql\central from git ---'
  robocopy $centralSrc $centralDest /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  $schemaPs1 = Join-Path $centralDest 'Update-Database-Schema.ps1'
  if (Test-Path -LiteralPath $schemaPs1) {
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
  if (Test-Path -LiteralPath $sync) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Root 'Sql\ops') | Out-Null
    Copy-Item -LiteralPath $sync -Destination $ops -Force
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ops
  }
}

$apiSched = Join-Path $Root 'Sql\ops\Install-All-Api-Collect-15min.ps1'
$apiPack = Join-Path $Pack 'Sql\ops\Install-All-Api-Collect-15min.ps1'
if (Test-Path -LiteralPath $apiPack) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Root 'Sql\ops') | Out-Null
  Copy-Item -LiteralPath $apiPack -Destination $apiSched -Force
  $runPack = Join-Path $Pack 'Sql\ops\Run-All-Api-Collects-Scheduled.ps1'
  if (Test-Path -LiteralPath $runPack) {
    Copy-Item -LiteralPath $runPack -Destination (Join-Path $Root 'Sql\ops\Run-All-Api-Collects-Scheduled.ps1') -Force
  }
  W Cyan '--- API collect every 15 min (Pulseway + Cove + Bitdefender + CSP) ---'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $apiSched
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' GIT UPDATE COMPLETE'
Write-Host (" Pack   : " + $Pack)
Write-Host (" Source : " + $srcRoot)
Write-Host (" Backup : " + $bak)
Write-Host ' Hard-refresh (Ctrl+F5).'
Write-Host '========================================' -ForegroundColor Cyan
