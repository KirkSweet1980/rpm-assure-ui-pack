# Fix WiX WIX0144 - rebuild MSI without UI extensions
$ErrorActionPreference = 'Stop'
Write-Host '=== Fix WiX no-extension build ===' -ForegroundColor Cyan
$Root = 'C:\RPM-Assure\installer'
$App = 'C:\RPM-Assure\App'
if (-not (Test-Path $Root)) { throw "Missing $Root - extract installer zip first" }

# Overwrite Package.wxs + Build-Msi.ps1 from embedded ASCII (written by this deploy when used as patch)
# Prefer files already updated if user re-extracted zip; this script rewrites critical two files.

$packagePath = Join-Path $Root 'wix\Package.wxs'
$buildMsiPath = Join-Path $Root 'scripts\Build-Msi.ps1'

# If caller saved new zip, tell them to re-extract; also try Downloads zip refresh
$Dl = Join-Path $env:USERPROFILE 'Downloads'
$zip = Get-ChildItem $Dl -Filter 'RPMAssure-Windows-Installer*.zip' -EA SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($zip) {
  Write-Host "Refreshing installer from $($zip.Name) ..." -ForegroundColor Cyan
  $tmp = Join-Path $env:TEMP ('rpma_wixfix_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($zip.FullName, $tmp)
  $src = Join-Path $tmp 'installer'
  if (-not (Test-Path $src)) {
    $hit = Get-ChildItem $tmp -Recurse -Filter 'Build-Msi.ps1' | Select-Object -First 1
    if ($hit) { $src = Split-Path (Split-Path $hit.FullName -Parent) -Parent }
  }
  if (Test-Path $src) {
    if (Test-Path $Root) { Remove-Item $Root -Recurse -Force }
    Copy-Item $src $Root -Recurse -Force
    Write-Host "Refreshed $Root" -ForegroundColor Green
  }
}

# Ensure core Package.wxs has no WixUI
$pkg = Get-Content (Join-Path $Root 'wix\Package.wxs') -Raw
if ($pkg -match 'WixUI|wixext') {
  Write-Host 'WARNING: Package.wxs still references UI extension - re-download latest zip' -ForegroundColor Yellow
} else {
  Write-Host 'Package.wxs is core-only (good)' -ForegroundColor Green
}

# Run build
$env:PATH = "$(Join-Path $env:USERPROFILE '.dotnet\tools');$env:PATH"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'scripts\Build-Msi.ps1') -AppSource $App
$msi = Get-ChildItem (Join-Path $Root 'dist') -Filter 'RPMAssure-*.msi' -EA SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $msi) { throw 'Still no MSI' }
Write-Host "MSI READY: $($msi.FullName)" -ForegroundColor Green
Write-Host "Install: msiexec /i `"$($msi.FullName)`""
