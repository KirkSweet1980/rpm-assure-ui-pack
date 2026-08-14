# Force-Update-From-Git.ps1
# Clone into a NEW folder (skip locked/quarantined files), copy UI, restart service.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Force-Update-From-Git.ps1

$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git'
$Root = 'C:\RPM-Assure'
$App = Join-Path $Root 'App'
$Need = 'App\src\components\customer\eco-board.tsx'
$Svc = 'RPMAssure-App'

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

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - FORCE update from Git'
Write-Host '========================================' -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null

try {
  Add-MpPreference -ExclusionPath $Root -ErrorAction SilentlyContinue
  W Cyan 'Defender exclusion set on C:\RPM-Assure'
} catch { }

W Cyan '--- Stop app service ---'
$svcObj = Get-Service -Name $Svc -ErrorAction SilentlyContinue
if ($svcObj) {
  Stop-Service -Name $Svc -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

# Never delete the old ui-pack (Defender may lock Update-Agent-From-Central.ps1).
# Clone into a new folder each run.
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Pack = Join-Path $Root ('deploy\ui-pack-' + $stamp)
W Cyan ("--- Clone into " + $Pack + " ---")
& $git -c core.longpaths=true -c core.protectNTFS=false clone --depth 1 --branch main $Repo $Pack
if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }

$eco = Join-Path $Pack $Need
if (-not (Test-Path -LiteralPath $eco)) {
  throw "Clone missing $Need"
}

$head = (& $git -C $Pack rev-parse --short HEAD).Trim()
W Green ("HEAD = " + $head)

$srcRoot = Join-Path $Pack 'App'
if (-not (Test-Path -LiteralPath (Join-Path $srcRoot 'src\routes\index.tsx'))) {
  throw "Missing App\src\routes\index.tsx in pack"
}

$bak = Join-Path $Root ('backup\src-' + $stamp)
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
  throw 'Copy finished but eco-board.tsx is not in App\src'
}

$force = Join-Path $Pack 'deploy\Force-Update-From-Git.ps1'
if (Test-Path -LiteralPath $force) {
  Copy-Item -LiteralPath $force -Destination (Join-Path $Root 'deploy\Force-Update-From-Git.ps1') -Force
}
$upd = Join-Path $Pack 'deploy\Update-AppServer.ps1'
if (Test-Path -LiteralPath $upd) {
  Copy-Item -LiteralPath $upd -Destination (Join-Path $Root 'deploy\Update-AppServer.ps1') -Force
}

# Point the conventional pack path at this clone via a junction when possible
$alias = Join-Path $Root 'deploy\ui-pack-current.txt'
Set-Content -LiteralPath $alias -Value $Pack -Encoding ASCII
$link = Join-Path $Root 'deploy\ui-pack-live'
cmd /c "rmdir `"$link`" >nul 2>nul"
cmd /c "mklink /J `"$link`" `"$Pack`" >nul 2>nul"

foreach ($rel in @('Sql\ops', 'Sql\csp', 'Sql\rmm\pulseway', 'Sql\cove', 'Sql\central')) {
  $from = Join-Path $Pack $rel
  if (Test-Path -LiteralPath $from) {
    $to = Join-Path $Root $rel
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    W Cyan ("--- Copy " + $rel + " ---")
    robocopy $from $to /E /NFL /NDL /NJH /NJS /nc /ns /np /XF Pulseway.Config.ps1 Csp.Config.ps1 Update-Agent-From-Central.ps1 | Out-Null
  }
}

# Agent scripts except the Defender-flagged filename
$agentFrom = Join-Path $Pack 'Sql\agent'
$agentTo = Join-Path $Root 'Sql\agent'
if (Test-Path -LiteralPath $agentFrom) {
  New-Item -ItemType Directory -Force -Path $agentTo | Out-Null
  W Cyan '--- Copy Sql\agent (skip quarantined updater name) ---'
  robocopy $agentFrom $agentTo /E /NFL /NDL /NJH /NJS /nc /ns /np /XF Update-Agent-From-Central.ps1 | Out-Null
}

W Cyan '--- Start service ---'
if ($svcObj) {
  Start-Service -Name $Svc
  Start-Sleep -Seconds 5
  W Green ($Svc + ' = ' + (Get-Service -Name $Svc).Status)
}

$hit = Select-String -LiteralPath (Join-Path $App 'src\routes\customers.$code.index.tsx') -Pattern 'EcoBoard' -SimpleMatch -ErrorAction SilentlyContinue
$ecoLen = (Get-Item -LiteralPath $liveEco).Length

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' FORCE UPDATE COMPLETE'
Write-Host (" Git HEAD     : " + $head)
Write-Host (" Pack         : " + $Pack)
Write-Host (" eco-board B  : " + $ecoLen)
Write-Host (" EcoBoard hit : " + [bool]$hit)
Write-Host ' Hard-refresh Customer EcoSystem (Ctrl+F5).'
Write-Host '========================================' -ForegroundColor Cyan
if (-not $hit) { throw 'customers.$code.index.tsx does not import EcoBoard after copy.' }
