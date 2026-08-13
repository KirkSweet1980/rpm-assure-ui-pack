# Build RPMAssure-Setup.exe (true Windows wizard installer)
# Requires: .NET 8 SDK
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File Build-SetupExe.ps1
param(
  [string]$AppSource = 'C:\RPM-Assure\App',
  [switch]$SkipPayload
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent   # installer\
$Wizard = Join-Path $Root 'setup-wizard'
$Dist = Join-Path $Root 'dist'
$OutDir = Join-Path $Dist 'setup'
New-Item -ItemType Directory -Force -Path $Dist, $OutDir | Out-Null

Write-Host '=== Build RPMAssure-Setup.exe ===' -ForegroundColor Cyan

# 1) Payload
if (-not $SkipPayload) {
  $prep = Join-Path $Root 'scripts\Prepare-Payload.ps1'
  if (-not (Test-Path $prep)) { throw "Missing $prep" }
  # ensure fixed prepare (no nested .output)
  & powershell -NoProfile -ExecutionPolicy Bypass -File $prep -AppSource $AppSource
}
$payload = Join-Path $Root 'payload\payload.zip'
if (-not (Test-Path $payload)) { throw "Missing $payload" }
Write-Host ("payload.zip = {0:N1} MB" -f ((Get-Item $payload).Length / 1MB))

# 2) Publish Setup.exe
$dotnet = Get-Command dotnet -EA SilentlyContinue
if (-not $dotnet) { throw '.NET SDK required: https://dotnet.microsoft.com/download' }
Push-Location $Wizard
try {
  & dotnet --version
  & dotnet restore
  & dotnet publish -c Release -r win-x64 --self-contained true `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:EnableCompressionInSingleFile=true `
    -o $OutDir
  if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed $LASTEXITCODE" }
} finally { Pop-Location }

$exe = Join-Path $OutDir 'RPMAssure-Setup.exe'
if (-not (Test-Path $exe)) {
  $exe = Get-ChildItem $OutDir -Filter 'RPMAssure-Setup.exe' -Recurse | Select-Object -First 1 -Expand FullName
}
if (-not $exe -or -not (Test-Path $exe)) { throw "Setup.exe not produced in $OutDir" }

# 3) Stage release folder: Setup.exe + payload.zip (double-click Setup)
$Release = Join-Path $Dist "RPMAssure-Setup-$((Get-Content (Join-Path $Root 'VERSION.txt') -Raw).Trim())"
if (Test-Path $Release) { Remove-Item $Release -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Release | Out-Null
Copy-Item $exe (Join-Path $Release 'RPMAssure-Setup.exe') -Force
Copy-Item $payload (Join-Path $Release 'payload.zip') -Force

# README for operators
@'
RPM Assure - Windows Setup
==========================

1. Copy this whole folder to the server (or a USB stick).
2. Right-click RPMAssure-Setup.exe -> Run as administrator
   (or double-click; it will request elevation).
3. Walk through the wizard:
     Welcome -> License -> Install folder -> SQL Server -> Install -> Finish
4. Open https://assure.rpmresources.co.za/login  (or http://127.0.0.1:8081/login)

Notes
- payload.zip must stay next to RPMAssure-Setup.exe
- Config is written to: C:\ProgramData\RPM Resources\RPM Assure\config\app.env
- App files: C:\Program Files\RPM Resources\RPM Assure\
- For public HTTPS, run Caddy (Fix-Public-Https.ps1) after install

'@ | Set-Content (Join-Path $Release 'README.txt') -Encoding ASCII

# Zip the release folder for easy copy
$relZip = "$Release.zip"
if (Test-Path $relZip) { Remove-Item $relZip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($Release, $relZip)

Write-Host ''
Write-Host "SETUP EXE:  $Release\RPMAssure-Setup.exe" -ForegroundColor Green
Write-Host "FOLDER:     $Release" -ForegroundColor Green
Write-Host "ZIP:        $relZip" -ForegroundColor Green
Write-Host ("Setup size: {0:N1} MB" -f ((Get-Item (Join-Path $Release 'RPMAssure-Setup.exe')).Length / 1MB))
Write-Host ("Pack size:  {0:N1} MB" -f ((Get-Item $relZip).Length / 1MB))
Write-Host ''
Write-Host 'Give operators the folder (or zip). They run RPMAssure-Setup.exe as Admin.'
Write-Host '=== Done ==='
