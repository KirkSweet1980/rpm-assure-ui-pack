# Update-AppServer.ps1
# CANONICAL update for the RPM Assure APP server.
# Prefers git pull. If git is missing, downloads the GitHub zipball
# (github.com / codeload — not raw.githubusercontent.com).
# Always writes scripts + zip to %USERPROFILE%\Downloads.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Update-AppServer.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File $env:USERPROFILE\Downloads\Update-AppServer.ps1

param(
  [string]$Repo = 'KirkSweet1980/rpm-assure-ui-pack',
  [string]$Root = 'C:\RPM-Assure',
  [switch]$SyncApis
)

$ErrorActionPreference = 'Stop'
$Downloads = Join-Path $env:USERPROFILE 'Downloads'
$Pack = Join-Path $Root 'deploy\ui-pack'
$App = Join-Path $Root 'App'
$SvcName = 'RPMAssure-App'
$Zip = Join-Path $Downloads 'rpm-assure-ui-pack-main.zip'
$Extract = Join-Path $Downloads 'rpm-assure-ui-pack-extract'

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

function Assert-Admin {
  $ok = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $ok) { throw 'Run this in an Administrator PowerShell.' }
}

function Get-SourceFromGit {
  $git = Get-Command git -ErrorAction SilentlyContinue
  if (-not $git) { return $null }
  $url = "https://github.com/$Repo.git"
  if (Test-Path (Join-Path $Pack '.git')) {
    W Cyan ("git pull " + $Pack)
    & git -C $Pack fetch --all --prune
    if ($LASTEXITCODE -ne 0) { return $null }
    & git -C $Pack reset --hard origin/main
    if ($LASTEXITCODE -ne 0) { return $null }
  } else {
    W Cyan ("git clone " + $url)
    if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
    & git clone --depth 1 --branch main $url $Pack
    if ($LASTEXITCODE -ne 0) { return $null }
  }
  return $Pack
}

function Get-SourceFromZipball {
  $uris = @(
    ("https://codeload.github.com/" + $Repo + "/zip/refs/heads/main"),
    ("https://github.com/" + $Repo + "/archive/refs/heads/main.zip"),
    ("https://api.github.com/repos/" + $Repo + "/zipball/main")
  )
  $ok = $false
  foreach ($u in $uris) {
    try {
      W Cyan ("GET " + $u)
      Invoke-WebRequest -Uri $u -OutFile $Zip -UseBasicParsing -Headers @{ 'User-Agent' = 'RPMAssure-Deploy' }
      if ((Test-Path $Zip) -and ((Get-Item $Zip).Length -gt 50000)) { $ok = $true; break }
    } catch { W Yellow $_.Exception.Message }
  }
  if (-not $ok) { throw 'Zipball download failed. Retry in a minute.' }
  W Green ("ZIP " + (Get-Item $Zip).Length + " bytes in Downloads")
  if (Test-Path $Extract) { Remove-Item $Extract -Recurse -Force }
  Expand-Archive -LiteralPath $Zip -DestinationPath $Extract -Force
  return $Extract
}

function Find-SrcRoot([string]$root) {
  $idx = Get-ChildItem $root -Recurse -Filter 'index.tsx' |
    Where-Object { $_.FullName -match 'src\\routes\\index.tsx$' } |
    Select-Object -First 1
  if (-not $idx) { throw "src\routes\index.tsx not found under $root" }
  return $idx.Directory.Parent.Parent.FullName
}

Assert-Admin
New-Item -ItemType Directory -Force -Path $Downloads, (Join-Path $Root 'deploy') | Out-Null
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - Update App Server'
Write-Host '========================================' -ForegroundColor Cyan

$tree = Get-SourceFromGit
if (-not $tree) {
  W Yellow 'Git not available or pull failed — using zipball.'
  $tree = Get-SourceFromZipball
}
$srcRoot = Find-SrcRoot $tree
$packRoot = $srcRoot
if ((Split-Path $srcRoot -Leaf) -eq 'App') { $packRoot = Split-Path $srcRoot -Parent }
W Green ("Source " + $srcRoot)

if (-not (Test-Path $App)) { throw "Missing $App" }
$svcObj = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
if ($svcObj -and $svcObj.Status -ne 'Stopped') {
  Stop-Service -Name $SvcName -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

$bak = Join-Path $Root ('backup\src-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $bak | Out-Null
if (Test-Path (Join-Path $App 'src')) {
  robocopy (Join-Path $App 'src') $bak /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$destSrc = Join-Path $App 'src'
New-Item -ItemType Directory -Force -Path $destSrc | Out-Null
robocopy (Join-Path $srcRoot 'src') $destSrc /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed $LASTEXITCODE" }

foreach ($name in @('Update-AppServer.ps1','Update-From-Git.ps1','Deploy-NoGit.ps1','Deploy-RpmAssure.ps1','Sync-All-Apis-Now.ps1','Install-RpmAssure-Full-UI.ps1')) {
  $from = Join-Path $packRoot $name
  if (Test-Path $from) {
    Copy-Item $from (Join-Path $Downloads $name) -Force
    Copy-Item $from (Join-Path $Root ('deploy\' + $name)) -Force
  }
}

if ($svcObj) {
  Start-Service -Name $SvcName
  Start-Sleep -Seconds 4
  W Green ($SvcName + ' = ' + (Get-Service -Name $SvcName).Status)
}

if ($SyncApis) {
  $sync = Join-Path $Root 'Sql\ops\Sync-All-Apis-Now.ps1'
  $syncDl = Join-Path $Downloads 'Sync-All-Apis-Now.ps1'
  if (-not (Test-Path $sync) -and (Test-Path $syncDl)) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Root 'Sql\ops') | Out-Null
    Copy-Item $syncDl $sync -Force
  }
  if (Test-Path $sync) { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $sync }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' UPDATE COMPLETE'
Write-Host (" Backup : " + $bak)
Write-Host ' Hard-refresh (Ctrl+F5).'
Write-Host '========================================' -ForegroundColor Cyan
