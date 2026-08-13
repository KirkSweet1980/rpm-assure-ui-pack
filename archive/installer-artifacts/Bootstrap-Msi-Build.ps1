# RPM Assure - bootstrap MSI build (ASCII only)
# powershell -NoProfile -ExecutionPolicy Bypass -File $env:USERPROFILE\Downloads\Bootstrap-Msi-Build.ps1
$ErrorActionPreference = 'Stop'
Write-Host '=== Bootstrap MSI build ===' -ForegroundColor Cyan

$App = 'C:\RPM-Assure\App'
$InstallerRoot = 'C:\RPM-Assure\installer'
$Dl = Join-Path $env:USERPROFILE 'Downloads'

if (-not (Test-Path (Join-Path $App 'package.json'))) {
  throw "Missing $App\package.json"
}

function Get-NpmCmd {
  foreach ($c in @('C:\Nodejs\npm.cmd', 'C:\Program Files\nodejs\npm.cmd')) {
    if (Test-Path $c) { return $c }
  }
  $cmd = Get-Command npm.cmd -EA SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}
function Get-NodeExe {
  foreach ($c in @('C:\Nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
    if (Test-Path $c) { return $c }
  }
  $cmd = Get-Command node.exe -EA SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

$npm = Get-NpmCmd
$node = Get-NodeExe
if (-not $node) { throw 'node.exe not found' }
Write-Host "node = $node"
Write-Host "npm  = $npm"

# --- Extract / refresh installer from Downloads zip (always refresh if zip found) ---
$zip = Get-ChildItem -LiteralPath $Dl -Filter 'RPMAssure-Windows-Installer*.zip' -EA SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $zip) {
  $zip = Get-ChildItem -LiteralPath $Dl -Filter '*Installer*Phase*.zip' -EA SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

$needExtract = -not (Test-Path (Join-Path $InstallerRoot 'scripts\Build-Release.ps1'))
# Also re-extract if Prepare-Payload has non-ASCII (broken encoding)
$prep = Join-Path $InstallerRoot 'scripts\Prepare-Payload.ps1'
if (Test-Path $prep) {
  $bytes = [IO.File]::ReadAllBytes($prep)
  foreach ($bb in $bytes) { if ($bb -gt 127) { $needExtract = $true; break } }
  if ($needExtract) { Write-Host 'Re-extracting installer (non-ASCII or missing scripts)' -ForegroundColor Yellow }
}

if ($needExtract) {
  if (-not $zip) {
    throw "Installer zip not found in $Dl - download RPMAssure-Windows-Installer-Phase1-5.zip first"
  }
  Write-Host "Extracting $($zip.FullName) ..." -ForegroundColor Cyan
  $tmp = Join-Path $env:TEMP ('rpma_inst_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($zip.FullName, $tmp)
  $src = Join-Path $tmp 'installer'
  if (-not (Test-Path $src)) {
    $hit = Get-ChildItem $tmp -Recurse -Filter 'Build-Release.ps1' -EA SilentlyContinue | Select-Object -First 1
    if ($hit) { $src = Split-Path (Split-Path $hit.FullName -Parent) -Parent }
    else { $src = $tmp }
  }
  if (Test-Path $InstallerRoot) { Remove-Item $InstallerRoot -Recurse -Force }
  New-Item -ItemType Directory -Force -Path (Split-Path $InstallerRoot) | Out-Null
  Copy-Item $src $InstallerRoot -Recurse -Force
  Write-Host "Installer -> $InstallerRoot" -ForegroundColor Green
} else {
  Write-Host "Installer OK: $InstallerRoot" -ForegroundColor Green
}

Get-ChildItem $InstallerRoot -Recurse -Filter *.ps1 -EA SilentlyContinue | Unblock-File -EA SilentlyContinue

# --- Production build ---
$serverJs = Join-Path $App '.output\server\index.mjs'
Write-Host 'Building production node-server...' -ForegroundColor Cyan
Push-Location $App
try {
  $pkg = Join-Path $App 'package.json'
  $b = [IO.File]::ReadAllBytes($pkg)
  if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
    [IO.File]::WriteAllBytes($pkg, $b[3..($b.Length-1)])
  }
  $env:RPM_ASSURE_NITRO_PRESET = 'node-server'
  $env:NITRO_PRESET = 'node-server'
  [IO.File]::WriteAllText((Join-Path $App '.rpma-nitro-preset'), "node-server`n")

  if (Test-Path (Join-Path $App 'scripts\build-node.mjs')) {
    & $node (Join-Path $App 'scripts\build-node.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'build-node.mjs failed' }
  } elseif ($npm) {
    $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "`"$npm`" run build:node" -WorkingDirectory $App -Wait -PassThru -NoNewWindow
    if ($p.ExitCode -ne 0) { throw "npm run build:node failed exit $($p.ExitCode)" }
  } else {
    throw 'No build-node.mjs and no npm.cmd'
  }
  if (-not (Test-Path $serverJs)) { throw "Missing $serverJs" }
  Write-Host "BUILD OK: $serverJs" -ForegroundColor Green
} finally {
  Pop-Location
}

# --- MSI ---
$buildRelease = Join-Path $InstallerRoot 'scripts\Build-Release.ps1'
if (-not (Test-Path $buildRelease)) { throw "Missing $buildRelease" }

$nodeDir = Split-Path $node
$env:PATH = "$nodeDir;$env:PATH"
if ($npm) { $env:npm_config_script_shell = 'cmd.exe' }

Write-Host 'Running Build-Release.ps1 ...' -ForegroundColor Cyan
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $buildRelease -AppSource $App

$msi = Get-ChildItem (Join-Path $InstallerRoot 'dist') -Filter 'RPMAssure-*.msi' -EA SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($msi) {
  Write-Host ''
  Write-Host "MSI READY: $($msi.FullName)" -ForegroundColor Green
  Write-Host ("Size: {0:N1} MB" -f ($msi.Length / 1MB))
  Write-Host "Install: msiexec /i `"$($msi.FullName)`""
} else {
  Write-Host 'No MSI in dist\ - check WiX/dotnet errors above' -ForegroundColor Yellow
  Write-Host 'Need .NET SDK: https://dotnet.microsoft.com/download' -ForegroundColor Yellow
  throw 'Build-Release failed (no MSI in dist)'
}
Write-Host '=== Done ===' -ForegroundColor Green
