# Install-RpmAssure-Full-UI.ps1
# Deploys the latest RPM Assure UI onto C:\RPM-Assure\App and restarts the service.
# Run as Administrator:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-RpmAssure-Full-UI.ps1

$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$Svc = 'RPMAssure-App'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Here) { $Here = (Get-Location).Path }

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - full UI deploy'
Write-Host '========================================' -ForegroundColor Cyan

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  throw 'Run this in an Administrator PowerShell.'
}

$srcRoot = Join-Path $Here 'App'
if (-not (Test-Path (Join-Path $srcRoot 'src\routes\index.tsx'))) {
  $alt = Join-Path $Here 'src\routes\index.tsx'
  if (Test-Path $alt) { $srcRoot = $Here }
}
if (-not (Test-Path (Join-Path $srcRoot 'src\routes\index.tsx'))) {
  $zipGuess = @(
    (Join-Path $Here 'RPMAssure-Full-UI.zip'),
    (Join-Path $env:USERPROFILE 'Downloads\RPMAssure-Full-UI.zip')
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($zipGuess) {
    W Cyan ("--- Auto-extract " + $zipGuess + " ---")
    $tmp = Join-Path $env:TEMP 'RPMAssure-Full-UI'
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Expand-Archive -LiteralPath $zipGuess -DestinationPath $tmp -Force
    $idx = Get-ChildItem $tmp -Recurse -Filter 'index.tsx' | Where-Object { $_.FullName -match 'src\\routes\\index.tsx$' } | Select-Object -First 1
    if ($idx) { $srcRoot = $idx.Directory.Parent.Parent.FullName }
  }
}
if (-not (Test-Path (Join-Path $srcRoot 'src\routes\index.tsx'))) {
  throw "Missing App\src\routes\index.tsx next to this script. Extract the full ZIP first."
}
if (-not (Test-Path $App)) {
  throw "Missing $App - the existing app folder was not found."
}

W Cyan '--- Stop service ---'
$svcObj = Get-Service -Name $Svc -ErrorAction SilentlyContinue
if ($svcObj) {
  if ($svcObj.Status -ne 'Stopped') {
    Stop-Service -Name $Svc -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
  W Green ("Stopped $Svc")
} else {
  W Yellow ("Service $Svc not found - will copy files only")
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bak = "C:\RPM-Assure\backup\src-$stamp"
New-Item -ItemType Directory -Force -Path $bak | Out-Null
if (Test-Path (Join-Path $App 'src')) {
  W Cyan ("--- Backup existing src to $bak ---")
  robocopy (Join-Path $App 'src') $bak /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

W Cyan '--- Copy UI source ---'
$destSrc = Join-Path $App 'src'
New-Item -ItemType Directory -Force -Path $destSrc | Out-Null
robocopy (Join-Path $srcRoot 'src') $destSrc /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy src failed exit $LASTEXITCODE" }

foreach ($rel in @('vite.config.ts', 'tsconfig.json', 'styles.css')) {
  $from = Join-Path $srcRoot $rel
  if (Test-Path $from) {
    Copy-Item $from (Join-Path $App $rel) -Force
  }
}

$pubFrom = Join-Path $srcRoot 'public'
$pubTo = Join-Path $App 'public'
if (Test-Path $pubFrom) {
  New-Item -ItemType Directory -Force -Path $pubTo | Out-Null
  robocopy $pubFrom $pubTo /E /NFL /NDL /NJH /NJS /nc /ns /np /XD downloads | Out-Null
}

W Green 'Files copied.'

if ($svcObj) {
  W Cyan '--- Start service ---'
  Start-Service -Name $Svc
  Start-Sleep -Seconds 4
  $svcObj.Refresh()
  W Green ("$Svc = " + (Get-Service $Svc).Status)
}

W Cyan '--- Proof ---'
$ok = $false
foreach ($url in @('http://127.0.0.1:8081/login', 'http://127.0.0.1:8080/login')) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 8
    W Green ("PROOF OK: $url HTTP " + [int]$r.StatusCode)
    $ok = $true
    break
  } catch {
    W Yellow ("PROOF wait: $url")
  }
}
if (-not $ok) { W Yellow 'Service is up. Hard-refresh the browser if the old UI is cached.' }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' DEPLOY COMPLETE'
Write-Host (" Backup : " + $bak)
Write-Host ' Hard-refresh the browser (Ctrl+F5).'
Write-Host '========================================' -ForegroundColor Cyan
