# Force-Update-From-Git.ps1
# Wipe pack, clone latest main, copy UI, restart RPMAssure-App.
# Run as Administrator:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Force-Update-From-Git.ps1

$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git'
$Root = 'C:\RPM-Assure'
$Pack = Join-Path $Root 'deploy\ui-pack'
$App = Join-Path $Root 'App'
$Need = 'App\src\components\customer\eco-board.tsx'
$Svc = 'RPMAssure-App'
$ExpectSha = '6878567'

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run this in an Administrator PowerShell.' }

$git = $null
foreach ($p in @(
    'C:\Program Files\Git\cmd\git.exe',
    'C:\Program Files (x86)\Git\cmd\git.exe'
  )) {
  if (Test-Path -LiteralPath $p) { $git = $p; break }
}
if (-not $git) {
  $gc = Get-Command git.exe -ErrorAction SilentlyContinue
  if ($gc) { $git = $gc.Source }
}
if (-not $git) { throw 'Git for Windows is not installed.' }
W Green ("git = " + $git)

function Kill-Dir([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return }
  cmd /c "attrib -R `"$path\*`" /S /D >nul 2>nul"
  $lock = Join-Path $path '.git\index.lock'
  if (Test-Path -LiteralPath $lock) { Remove-Item -LiteralPath $lock -Force -EA SilentlyContinue }
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
Write-Host ' RPM Assure - FORCE update from Git'
Write-Host '========================================' -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null

W Cyan '--- Stop app service (unlocks App\src) ---'
$svcObj = Get-Service -Name $Svc -ErrorAction SilentlyContinue
if ($svcObj) {
  Stop-Service -Name $Svc -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

W Cyan '--- Fresh clone (ignore old pack / index.lock) ---'
Kill-Dir $Pack
$tmp = Join-Path $Root ('deploy\ui-pack-new-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
& $git -c core.longpaths=true -c core.protectNTFS=false clone --depth 1 --branch main $Repo $tmp
if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
$eco = Join-Path $tmp $Need
if (-not (Test-Path -LiteralPath $eco)) {
  throw "Clone missing $Need - repo layout unexpected"
}
Kill-Dir $Pack
Rename-Item -LiteralPath $tmp -NewName 'ui-pack'
$Pack = Join-Path $Root 'deploy\ui-pack'

$head = (& $git -C $Pack rev-parse --short HEAD).Trim()
W Green ("HEAD = " + $head)

$srcRoot = Join-Path $Pack 'App'
if (-not (Test-Path -LiteralPath (Join-Path $srcRoot 'src\routes\index.tsx'))) {
  throw "Missing App\src\routes\index.tsx in pack"
}

$bak = Join-Path $Root ('backup\src-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $bak | Out-Null
if (Test-Path -LiteralPath (Join-Path $App 'src')) {
  W Cyan ("--- Backup " + $bak + " ---")
  robocopy (Join-Path $App 'src') $bak /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

W Cyan '--- Copy UI into App\src ---'
$destSrc = Join-Path $App 'src'
New-Item -ItemType Directory -Force -Path $destSrc | Out-Null
robocopy (Join-Path $srcRoot 'src') $destSrc /E /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed $LASTEXITCODE" }

$liveEco = Join-Path $App 'src\components\customer\eco-board.tsx'
if (-not (Test-Path -LiteralPath $liveEco)) {
  throw 'Copy finished but eco-board.tsx is not in App\src - update did not land.'
}

$upd = Join-Path $Pack 'deploy\Update-AppServer.ps1'
if (Test-Path -LiteralPath $upd) {
  Copy-Item -LiteralPath $upd -Destination (Join-Path $Root 'deploy\Update-AppServer.ps1') -Force
}
$force = Join-Path $Pack 'deploy\Force-Update-From-Git.ps1'
if (Test-Path -LiteralPath $force) {
  Copy-Item -LiteralPath $force -Destination (Join-Path $Root 'deploy\Force-Update-From-Git.ps1') -Force
}

foreach ($rel in @('Sql\agent', 'Sql\ops', 'Sql\csp', 'Sql\rmm\pulseway', 'Sql\cove', 'Sql\central')) {
  $from = Join-Path $Pack $rel
  if (Test-Path -LiteralPath $from) {
    $to = Join-Path $Root $rel
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    W Cyan ("--- Copy " + $rel + " ---")
    robocopy $from $to /E /NFL /NDL /NJH /NJS /nc /ns /np /XF Pulseway.Config.ps1 Csp.Config.ps1 | Out-Null
  }
}

W Cyan '--- Start service ---'
if ($svcObj) {
  Start-Service -Name $Svc
  Start-Sleep -Seconds 5
  W Green ($Svc + ' = ' + (Get-Service -Name $Svc).Status)
}

$hit = Select-String -LiteralPath (Join-Path $App 'src\routes\customers.$code.index.tsx') -Pattern 'EcoBoard' -SimpleMatch -ErrorAction SilentlyContinue
$ecoLen = (Get-Item -LiteralPath $liveEco).Length
$ecoWhen = (Get-Item -LiteralPath $liveEco).LastWriteTime

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' FORCE UPDATE COMPLETE'
Write-Host (" Git HEAD     : " + $head + " (want " + $ExpectSha + " or newer)")
Write-Host (" eco-board    : " + $liveEco)
Write-Host (" eco-board B  : " + $ecoLen)
Write-Host (" eco-board at : " + $ecoWhen)
Write-Host (" EcoBoard hit : " + [bool]$hit)
Write-Host ' Open Customer EcoSystem and hard-refresh (Ctrl+F5).'
Write-Host '========================================' -ForegroundColor Cyan
if (-not $hit) { throw 'customers.$code.index.tsx does not import EcoBoard after copy.' }
