# Capture full WiX errors - run after re-extracting latest zip
$ErrorActionPreference = 'Continue'
Write-Host '=== WiX diagnostic build ===' -ForegroundColor Cyan
$Root = 'C:\RPM-Assure\installer'
$App = 'C:\RPM-Assure\App'
$Dl = Join-Path $env:USERPROFILE 'Downloads'

# Refresh from latest zip
$zip = Get-ChildItem $Dl -Filter 'RPMAssure-Windows-Installer*.zip' -EA SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($zip) {
  Write-Host "Using zip: $($zip.FullName) $($zip.LastWriteTime)"
  $tmp = Join-Path $env:TEMP ('rpma_wix_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($zip.FullName, $tmp)
  $src = Join-Path $tmp 'installer'
  if (-not (Test-Path $src)) {
    $hit = Get-ChildItem $tmp -Recurse -Filter 'Build-Msi.ps1' | Select-Object -First 1
    if ($hit) { $src = Split-Path (Split-Path $hit.FullName -Parent) -Parent }
  }
  if (Test-Path $Root) { Remove-Item $Root -Recurse -Force }
  Copy-Item $src $Root -Recurse -Force
  Write-Host "Refreshed $Root"
} else {
  Write-Host 'No zip in Downloads - using existing installer folder' -ForegroundColor Yellow
}

$env:PATH = "$(Join-Path $env:USERPROFILE '.dotnet\tools');$env:PATH"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'scripts\Build-Msi.ps1') -AppSource $App
Write-Host ''
$log = Get-ChildItem (Join-Path $Root 'dist') -Filter 'wix-build-*.log' -EA SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($log) {
  Write-Host "=== LOG TAIL $($log.Name) ===" -ForegroundColor Cyan
  Get-Content $log.FullName -Tail 80
  Write-Host "=== FULL LOG: $($log.FullName) ==="
}
