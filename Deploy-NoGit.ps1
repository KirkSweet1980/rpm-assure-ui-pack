# Deploy-NoGit.ps1
# No Git required. Downloads the repo zipball from github.com (not raw CDN),
# installs UI, copies scripts to Downloads, restarts RPMAssure-App.
# Paste-run as Administrator.

$ErrorActionPreference = 'Stop'
$Downloads = Join-Path $env:USERPROFILE 'Downloads'
$Root = 'C:\RPM-Assure'
$App = Join-Path $Root 'App'
$SvcName = 'RPMAssure-App'
$Zip = Join-Path $Downloads 'rpm-assure-ui-pack-main.zip'
$Extract = Join-Path $Downloads 'rpm-assure-ui-pack-extract'

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run this in an Administrator PowerShell.' }

New-Item -ItemType Directory -Force -Path $Downloads, (Join-Path $Root 'deploy') | Out-Null
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - deploy (no Git)'
Write-Host '========================================' -ForegroundColor Cyan

$uris = @(
  'https://codeload.github.com/KirkSweet1980/rpm-assure-ui-pack/zip/refs/heads/main',
  'https://github.com/KirkSweet1980/rpm-assure-ui-pack/archive/refs/heads/main.zip',
  'https://api.github.com/repos/KirkSweet1980/rpm-assure-ui-pack/zipball/main'
)
$ok = $false
foreach ($u in $uris) {
  try {
    W Cyan ("GET " + $u)
    Invoke-WebRequest -Uri $u -OutFile $Zip -UseBasicParsing -Headers @{ 'User-Agent' = 'RPMAssure-Deploy' }
    if ((Test-Path $Zip) -and ((Get-Item $Zip).Length -gt 50000)) { $ok = $true; break }
  } catch {
    W Yellow $_.Exception.Message
  }
}
if (-not $ok) { throw 'Download failed. Wait a minute and re-run, or install Git for Windows.' }
W Green ("ZIP " + (Get-Item $Zip).Length + " bytes -> " + $Zip)

if (Test-Path $Extract) { Remove-Item $Extract -Recurse -Force }
Expand-Archive -LiteralPath $Zip -DestinationPath $Extract -Force
$idx = Get-ChildItem $Extract -Recurse -Filter 'index.tsx' |
  Where-Object { $_.FullName -match 'src\\routes\\index.tsx$' } |
  Select-Object -First 1
if (-not $idx) { throw 'ZIP extracted but src\routes\index.tsx not found.' }
$srcRoot = $idx.Directory.Parent.Parent.FullName
$packRoot = $srcRoot
if ((Split-Path $srcRoot -Leaf) -eq 'App') { $packRoot = Split-Path $srcRoot -Parent }
W Green ("Source " + $srcRoot)

if (-not (Test-Path $App)) { throw "Missing $App" }

$svcObj = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
if ($svcObj -and $svcObj.Status -ne 'Stopped') {
  W Cyan '--- Stop service ---'
  Stop-Service -Name $SvcName -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bak = Join-Path $Root ("backup\src-" + $stamp)
New-Item -ItemType Directory -Force -Path $bak | Out-Null
if (Test-Path (Join-Path $App 'src')) {
  robocopy (Join-Path $App 'src') $bak /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

W Cyan '--- Copy UI ---'
$destSrc = Join-Path $App 'src'
New-Item -ItemType Directory -Force -Path $destSrc | Out-Null
robocopy (Join-Path $srcRoot 'src') $destSrc /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed $LASTEXITCODE" }

foreach ($name in @('Update-From-Git.ps1','Deploy-RpmAssure.ps1','Deploy-NoGit.ps1','Install-RpmAssure-Full-UI.ps1','Sync-All-Apis-Now.ps1')) {
  $from = Join-Path $packRoot $name
  if (Test-Path $from) {
    Copy-Item $from (Join-Path $Downloads $name) -Force
    Copy-Item $from (Join-Path $Root ("deploy\" + $name)) -Force
    W Green ("Downloads: " + $name)
  }
}

if ($svcObj) {
  Start-Service -Name $SvcName
  Start-Sleep -Seconds 4
  W Green ($SvcName + ' = ' + (Get-Service -Name $SvcName).Status)
}

# Optional: install Git so next time Update-From-Git.ps1 works
$winget = Get-Command winget -ErrorAction SilentlyContinue
if ($winget -and -not (Get-Command git -ErrorAction SilentlyContinue)) {
  W Cyan '--- Installing Git for Windows (for next time) ---'
  try {
    & winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements --silent
  } catch { W Yellow 'winget Git install skipped' }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' DEPLOY COMPLETE  (no Git)'
Write-Host (" Backup : " + $bak)
Write-Host ' Hard-refresh (Ctrl+F5).'
Write-Host '========================================' -ForegroundColor Cyan
