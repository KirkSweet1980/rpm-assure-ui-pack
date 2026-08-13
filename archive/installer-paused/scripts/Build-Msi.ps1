# Build RPMAssure-x.y.z.msi using WiX Toolset 5 (core only)
param(
  [string]$Version = '',
  [string]$AppSource = 'C:\RPM-Assure\App',
  [switch]$SkipPayload,
  [switch]$SkipNodeDownload
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

if (-not $Version) {
  $Version = (Get-Content (Join-Path $Root 'VERSION.txt') -Raw).Trim()
}
# MSI ProductVersion: up to 3 parts (Major.Minor.Build)
if ($Version -notmatch '^\d+\.\d+\.\d+') {
  throw "VERSION.txt must be like 1.0.0 (got '$Version')"
}
Write-Host "=== Build MSI v$Version ===" -ForegroundColor Cyan

if (-not $SkipPayload) {
  & (Join-Path $PSScriptRoot 'Prepare-Payload.ps1') -AppSource $AppSource -SkipNodeDownload:$SkipNodeDownload
}

function Get-Wix {
  $cmd = Get-Command wix -EA SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $tools = Join-Path $env:USERPROFILE '.dotnet\tools\wix.exe'
  if (Test-Path $tools) { return $tools }
  return $null
}

$wix = Get-Wix
if (-not $wix) {
  Write-Host 'Installing WiX CLI...' -ForegroundColor Yellow
  $dotnet = Get-Command dotnet -EA SilentlyContinue
  if (-not $dotnet) { throw 'dotnet SDK required: https://dotnet.microsoft.com/download' }
  & dotnet tool update --global wix --version 5.0.2
  $env:PATH = "$(Join-Path $env:USERPROFILE '.dotnet\tools');$env:PATH"
  $wix = Get-Wix
  if (-not $wix) { throw 'wix not found after install' }
}
Write-Host "wix = $wix"
try { & $wix --version } catch {}

$payloadZip = Join-Path $Root 'payload\payload.zip'
if (-not (Test-Path $payloadZip)) { throw "Missing $payloadZip" }
Write-Host ("payload.zip size = {0:N1} MB" -f ((Get-Item $payloadZip).Length / 1MB))

# Ensure required source files exist
$required = @(
  'payload\README.txt',
  'wizard\RpmAssure-ConfigWizard.ps1',
  'wizard\Apply-SilentConfig.ps1',
  'wizard\Test-SqlConnection.ps1',
  'winsw\RPMAssure-App.xml',
  'service\Start-Service.ps1',
  'service\Stop-Service.ps1',
  'service\Install-Service.ps1',
  'service\Uninstall-Service.ps1',
  'service\Expand-Payload.ps1',
  'resources\app.env.example',
  'wix\Package.wxs',
  'wix\Service.wxs',
  'wix\Shortcuts.wxs',
  'wix\Registry.wxs',
  'wix\Payload.wxs'
)
foreach ($r in $required) {
  $p = Join-Path $Root $r
  if (-not (Test-Path $p)) { throw "Missing source file: $p" }
}

$outDir = Join-Path $Root 'dist'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$msi = Join-Path $outDir "RPMAssure-$Version.msi"
$log = Join-Path $outDir "wix-build-$Version.log"
if (Test-Path $msi) { Remove-Item $msi -Force }

$wixDir = Join-Path $Root 'wix'
$sources = @(
  (Join-Path $wixDir 'Package.wxs'),
  (Join-Path $wixDir 'Service.wxs'),
  (Join-Path $wixDir 'Shortcuts.wxs'),
  (Join-Path $wixDir 'Registry.wxs'),
  (Join-Path $wixDir 'Payload.wxs')
)

# WiX 5 define: use var.ProductVersion in sources
$argList = @(
  'build'
) + $sources + @(
  '-d', "ProductVersion=$Version",
  '-b', $Root,
  '-o', $msi,
  '-arch', 'x64',
  '-culture', 'en-US',
  '-nologo',
  '-v'
)

Write-Host 'wix build args:' -ForegroundColor Cyan
Write-Host ($argList -join ' ')
Write-Host "Log: $log"

# Capture ALL output
$oldEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$output = & $wix @argList 2>&1 | ForEach-Object { $_.ToString() }
$code = $LASTEXITCODE
$ErrorActionPreference = $oldEap

$output | Set-Content -Path $log -Encoding UTF8
$output | ForEach-Object { Write-Host $_ }

if ($code -ne 0 -or -not (Test-Path $msi)) {
  Write-Host ''
  Write-Host "=== WIX FAILED exit=$code ===" -ForegroundColor Red
  Write-Host "Full log: $log"
  Write-Host '--- errors/warnings ---' -ForegroundColor Yellow
  $output | Where-Object { $_ -match 'error|warning|WIX' } | ForEach-Object { Write-Host $_ }
  throw "wix build failed exit $code (see $log)"
}

Write-Host "MSI OK: $msi" -ForegroundColor Green
Write-Host ("Size: {0:N1} MB" -f ((Get-Item $msi).Length / 1MB))
Write-Host '=== Done ==='
