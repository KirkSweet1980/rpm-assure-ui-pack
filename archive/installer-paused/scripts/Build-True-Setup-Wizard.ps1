# Build true Windows Setup wizard
# Prefer running via BUILD-SETUP.cmd after EXTRACT-AND-BUILD.cmd
$ErrorActionPreference = 'Stop'
Write-Host '=== Build true Windows Setup wizard ===' -ForegroundColor Cyan

$Installer = 'C:\RPM-Assure\installer'
$App = 'C:\RPM-Assure\App'
$Dl = Join-Path $env:USERPROFILE 'Downloads'

function Materialize-Ps1Txt([string]$root) {
  Get-ChildItem -LiteralPath $root -Recurse -Filter '*.ps1.txt' -EA SilentlyContinue | ForEach-Object {
    $dest = $_.FullName -replace '\.ps1\.txt$', '.ps1'
    Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
    Write-Host "Materialize $($dest.Substring($root.Length).TrimStart('\\'))"
  }
}

# If sources already on disk, just materialize + build (no zip re-extract)
$csproj = Join-Path $Installer 'setup-wizard\RpmAssure.Setup.csproj'
if (Test-Path $csproj) {
  Write-Host "Sources already present: $csproj" -ForegroundColor Green
  Materialize-Ps1Txt $Installer
} else {
  Write-Host 'Sources missing - extracting zip from Downloads...' -ForegroundColor Yellow
  $zip = Get-ChildItem $Dl -Filter 'RPMAssure-Windows-Installer*.zip' -EA SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $zip) { throw "No installer zip in $Dl and no $csproj" }

  $tmp = Join-Path $env:TEMP ('rpma_wiz_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($zip.FullName, $tmp)

  $proj = Get-ChildItem $tmp -Recurse -Filter 'RpmAssure.Setup.csproj' | Select-Object -First 1
  if (-not $proj) { throw 'Zip missing RpmAssure.Setup.csproj' }
  $src = Split-Path $proj.DirectoryName -Parent

  $keepPayload = Join-Path $Installer 'payload\payload.zip'
  $backup = $null
  if (Test-Path $keepPayload) {
    $backup = Join-Path $env:TEMP 'rpma_payload_backup.zip'
    Copy-Item $keepPayload $backup -Force
  }

  New-Item -ItemType Directory -Force -Path $Installer | Out-Null
  Copy-Item (Join-Path $src '*') $Installer -Recurse -Force
  if ($backup) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Installer 'payload') | Out-Null
    Copy-Item $backup $keepPayload -Force
  }
  Materialize-Ps1Txt $Installer
}

if (-not (Test-Path (Join-Path $Installer 'setup-wizard\RpmAssure.Setup.csproj'))) {
  throw "Missing setup-wizard project under $Installer"
}
Write-Host 'setup-wizard OK' -ForegroundColor Green
Get-ChildItem (Join-Path $Installer 'setup-wizard') | ForEach-Object { Write-Host "  - $($_.Name)" }

$dotnet = Get-Command dotnet -EA SilentlyContinue
if (-not $dotnet) { throw 'Install .NET 8 SDK from https://dotnet.microsoft.com/download' }
& dotnet --list-sdks

$serverJs = Join-Path $App '.output\server\index.mjs'
if (-not (Test-Path $serverJs)) {
  Write-Host 'Building app node-server...' -ForegroundColor Yellow
  $env:RPM_ASSURE_NITRO_PRESET = 'node-server'
  $env:NITRO_PRESET = 'node-server'
  $node = (Get-Command node -EA SilentlyContinue).Source
  if (-not $node) {
    foreach ($c in @('C:\Nodejs\node.exe','C:\Program Files\nodejs\node.exe')) {
      if (Test-Path $c) { $node = $c; break }
    }
  }
  if (-not $node) { throw 'node.exe not found' }
  Push-Location $App
  try {
    if (Test-Path 'scripts\build-node.mjs') { & $node 'scripts\build-node.mjs' }
    else { throw 'Missing build-node.mjs' }
  } finally { Pop-Location }
}
if (-not (Test-Path $serverJs)) { throw "Missing $serverJs" }

Set-Content (Join-Path $Installer 'VERSION.txt') '1.0.1' -Encoding ASCII

$payload = Join-Path $Installer 'payload\payload.zip'
$skip = $false
if (Test-Path $payload) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $z = [System.IO.Compression.ZipFile]::OpenRead($payload)
  try {
    $names = @($z.Entries | ForEach-Object { ($_.FullName -replace '\\','/') })
    $hasGood = $names | Where-Object { $_ -match 'app/.output/server/index\.mjs$' }
    $nested = $names | Where-Object { $_ -match 'app/.output/.output/' }
    if ($hasGood -and -not $nested) {
      Write-Host 'payload.zip OK - SkipPayload' -ForegroundColor Green
      $skip = $true
    }
  } finally { $z.Dispose() }
}

$build = Join-Path $Installer 'scripts\Build-SetupExe.ps1'
if (-not (Test-Path $build)) { throw "Missing $build - materialize failed?" }
if ($skip) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $build -AppSource $App -SkipPayload
} else {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $build -AppSource $App
}

$rel = Get-ChildItem (Join-Path $Installer 'dist') -Directory -Filter 'RPMAssure-Setup-*' -EA SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $rel) { throw 'No release folder under dist\' }
$exe = Join-Path $rel.FullName 'RPMAssure-Setup.exe'
Write-Host ''
Write-Host '=== READY ===' -ForegroundColor Green
Write-Host "Folder: $($rel.FullName)"
if (Test-Path $exe) {
  Write-Host "Exe:    $exe"
  Write-Host ("Size:   {0:N1} MB" -f ((Get-Item $exe).Length / 1MB))
}
Write-Host "Zip:    $($rel.FullName).zip"
Write-Host 'Run RPMAssure-Setup.exe as Administrator.'
