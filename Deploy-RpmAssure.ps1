# Deploy-RpmAssure.ps1
# One-shot: pull latest ZIP from GitHub, install UI, restart service.
# Optional: -SyncApis after install.
# Run as Administrator on the APP server:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Deploy-RpmAssure.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Deploy-RpmAssure.ps1 -SyncApis

param(
  [string]$Repo = 'KirkSweet1980/rpm-assure-ui-pack',
  [string]$ZipName = 'RPMAssure-Full-UI.zip',
  [string]$Root = 'C:\RPM-Assure',
  [string]$Token = $env:GITHUB_TOKEN,
  [switch]$SyncApis,
  [switch]$SkipDownload
)

$ErrorActionPreference = 'Stop'
$Downloads = Join-Path $env:USERPROFILE 'Downloads'
$App = Join-Path $Root 'App'
$SvcName = 'RPMAssure-App'
$Work = Join-Path $Root 'deploy\Full-UI'
$PackGit = Join-Path $Root 'deploy\ui-pack'
$LogDir = Join-Path $Root 'deploy\logs'
$ZipInDownloads = Join-Path $Downloads $ZipName

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

function Assert-Admin {
  $ok = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $ok) { throw 'Run this in an Administrator PowerShell.' }
}

function Find-LocalZip {
  $places = @(
    $ZipInDownloads,
    (Join-Path $Work $ZipName),
    (Join-Path $PackGit $ZipName),
    (Join-Path $PSScriptRoot $ZipName)
  )
  foreach ($p in $places) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  return $null
}

function Get-GitHubToken {
  if ($Token) { return $Token }
  if ($env:GH_TOKEN) { return $env:GH_TOKEN }
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) {
    try {
      $t = & gh auth token 2>$null
      if ($t) { return ($t | Out-String).Trim() }
    } catch {}
  }
  return $null
}

function Copy-ToDownloads([string]$from) {
  if (-not $from -or -not (Test-Path -LiteralPath $from)) { return }
  New-Item -ItemType Directory -Force -Path $Downloads | Out-Null
  $dest = Join-Path $Downloads (Split-Path $from -Leaf)
  Copy-Item -LiteralPath $from -Destination $dest -Force
  W Green ("Downloads: " + $dest)
}

function Get-ZipFromGitHub([string]$dest) {
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  $tok = Get-GitHubToken
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) {
    W Cyan '--- Download ZIP via gh -> Downloads ---'
    & gh api -H 'Accept: application/vnd.github.raw' ("repos/" + $Repo + "/contents/" + $ZipName) --output $dest
    if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 10000)) { return $true }
  }
  if ($tok) {
    W Cyan '--- Download ZIP via GitHub API -> Downloads ---'
    $headers = @{
      Authorization = "Bearer $tok"
      Accept = 'application/vnd.github.raw'
      'User-Agent' = 'RPMAssure-Deploy'
    }
    $uri = "https://api.github.com/repos/$Repo/contents/$ZipName"
    Invoke-WebRequest -Uri $uri -Headers $headers -OutFile $dest -UseBasicParsing
    if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 10000)) { return $true }
  }
  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git) {
    W Cyan '--- git pull / clone pack repo ---'
    if (Test-Path (Join-Path $PackGit '.git')) {
      & git -C $PackGit pull --ff-only
    } else {
      New-Item -ItemType Directory -Force -Path (Split-Path $PackGit) | Out-Null
      if (Test-Path $PackGit) { Remove-Item $PackGit -Recurse -Force }
      $cloneUrl = "https://github.com/$Repo.git"
      if ($tok) { $cloneUrl = "https://x-access-token:$tok@github.com/$Repo.git" }
      & git clone --depth 1 $cloneUrl $PackGit
    }
    $from = Join-Path $PackGit $ZipName
    if (Test-Path $from) {
      Copy-Item $from $dest -Force
      return $true
    }
  }
  return $false
}

function Expand-Pack([string]$zip) {
  if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $Work | Out-Null
  W Cyan ("--- Extract " + $zip + " ---")
  Expand-Archive -LiteralPath $zip -DestinationPath $Work -Force
  $idx = Get-ChildItem -Path $Work -Recurse -Filter 'index.tsx' | Where-Object { $_.FullName -match 'src\\routes\\index.tsx$' } | Select-Object -First 1
  if (-not $idx) { throw "ZIP extracted but App\src\routes\index.tsx was not found under $Work" }
  $srcRoot = $idx.Directory.Parent.Parent.FullName
  return $srcRoot
}

function Deploy-Ui([string]$srcRoot) {
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
    W Cyan ("--- Backup src -> " + $bak + " ---")
    robocopy (Join-Path $App 'src') $bak /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  }

  W Cyan '--- Copy UI source ---'
  $destSrc = Join-Path $App 'src'
  New-Item -ItemType Directory -Force -Path $destSrc | Out-Null
  robocopy (Join-Path $srcRoot 'src') $destSrc /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy src failed exit $LASTEXITCODE" }

  foreach ($rel in @('vite.config.ts', 'tsconfig.json', 'styles.css')) {
    $from = Join-Path $srcRoot $rel
    if (Test-Path $from) { Copy-Item $from (Join-Path $App $rel) -Force }
  }
  $pubFrom = Join-Path $srcRoot 'public'
  $pubTo = Join-Path $App 'public'
  if (Test-Path $pubFrom) {
    New-Item -ItemType Directory -Force -Path $pubTo | Out-Null
    robocopy $pubFrom $pubTo /E /NFL /NDL /NJH /NJS /nc /ns /np /XD downloads | Out-Null
  }

  $syncSrc = @(
    (Join-Path $srcRoot '..\Sync-All-Apis-Now.ps1'),
    (Join-Path $PackGit 'Sync-All-Apis-Now.ps1'),
    (Join-Path $PSScriptRoot 'Sync-All-Apis-Now.ps1')
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($syncSrc) {
    $ops = Join-Path $Root 'Sql\ops'
    New-Item -ItemType Directory -Force -Path $ops | Out-Null
    Copy-Item $syncSrc (Join-Path $ops 'Sync-All-Apis-Now.ps1') -Force
    W Green 'Copied Sync-All-Apis-Now.ps1 to Sql\ops'
  }

  if ($svcObj) {
    W Cyan '--- Start service ---'
    Start-Service -Name $SvcName
    Start-Sleep -Seconds 4
    W Green ($SvcName + ' = ' + (Get-Service -Name $SvcName).Status)
  }
  return $bak
}

function Prove-App {
  foreach ($url in @('http://127.0.0.1:8081/login', 'http://127.0.0.1:8080/login')) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 8
      W Green ("PROOF OK: " + $url + " HTTP " + [int]$r.StatusCode)
      return
    } catch {
      W Yellow ("PROOF wait: " + $url)
    }
  }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - automated deploy'
Write-Host '========================================' -ForegroundColor Cyan
Assert-Admin
New-Item -ItemType Directory -Force -Path $Downloads, $Work, $LogDir | Out-Null

$zip = $null
if (-not $SkipDownload) {
  if (Get-ZipFromGitHub $ZipInDownloads) { $zip = $ZipInDownloads }
}
if (-not $zip) {
  $zip = Find-LocalZip
  if ($zip) {
    if ($zip -ne $ZipInDownloads) {
      Copy-Item -LiteralPath $zip -Destination $ZipInDownloads -Force
      $zip = $ZipInDownloads
    }
    W Yellow ("Using ZIP in Downloads: " + $zip)
  }
}
if (-not $zip) {
  throw 'Could not get RPMAssure-Full-UI.zip. Sign in with gh, set GITHUB_TOKEN, or put the ZIP in Downloads.'
}

Copy-ToDownloads (Join-Path $PSScriptRoot 'Deploy-RpmAssure.ps1')
Copy-ToDownloads (Join-Path $PSScriptRoot 'Install-RpmAssure-Full-UI.ps1')
Copy-ToDownloads (Join-Path $PSScriptRoot 'Sync-All-Apis-Now.ps1')
Copy-ToDownloads (Join-Path $PSScriptRoot 'Run-Deploy.cmd')
Copy-ToDownloads $zip

$srcRoot = Expand-Pack $zip
$bak = Deploy-Ui $srcRoot
Prove-App

if ($SyncApis) {
  $sync = Join-Path $Root 'Sql\ops\Sync-All-Apis-Now.ps1'
  if (Test-Path $sync) {
    W Cyan '--- Sync all APIs ---'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $sync
  } else {
    W Yellow 'Sync script not found - skipped'
  }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' DEPLOY COMPLETE'
Write-Host (" Backup : " + $bak)
Write-Host ' Hard-refresh the browser (Ctrl+F5).'
Write-Host '========================================' -ForegroundColor Cyan
