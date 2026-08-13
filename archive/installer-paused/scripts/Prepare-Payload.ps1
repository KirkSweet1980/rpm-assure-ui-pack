# Prepare MSI payload - FIXED .output nesting
param(
  [string]$AppSource = 'C:\RPM-Assure\App',
  [string]$NodeVersion = '22.14.0',
  [switch]$SkipNodeDownload,
  [switch]$SkipWinSW
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Write-Host '=== Prepare Payload ===' -ForegroundColor Cyan

$serverJs = Join-Path $AppSource '.output\server\index.mjs'
if (-not (Test-Path $serverJs)) { throw "Missing $serverJs - run build:node first" }

$stage = Join-Path $Root 'payload\stage'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'app') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'runtime\node') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'service') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'wizard') | Out-Null

# Copy .output contents correctly (avoid app\.output\.output)
Write-Host 'Staging app\.output ...' -ForegroundColor Cyan
$outDest = Join-Path $stage 'app\.output'
New-Item -ItemType Directory -Force -Path $outDest | Out-Null
Copy-Item -Path (Join-Path $AppSource '.output\*') -Destination $outDest -Recurse -Force
if (-not (Test-Path (Join-Path $outDest 'server\index.mjs'))) {
  throw "Stage missing server\index.mjs under $outDest"
}
if (Test-Path (Join-Path $AppSource 'package.json')) {
  Copy-Item (Join-Path $AppSource 'package.json') (Join-Path $stage 'app\package.json') -Force
}
if (Test-Path (Join-Path $AppSource 'public')) {
  Copy-Item (Join-Path $AppSource 'public') (Join-Path $stage 'app\public') -Recurse -Force
}

$nodeDest = Join-Path $stage 'runtime\node'
$nodeExe = Join-Path $nodeDest 'node.exe'
if (-not $SkipNodeDownload -and -not (Test-Path $nodeExe)) {
  Write-Host "Downloading Node v$NodeVersion ..." -ForegroundColor Cyan
  $zipName = "node-v$NodeVersion-win-x64.zip"
  $tmp = Join-Path $env:TEMP $zipName
  Invoke-WebRequest -Uri "https://nodejs.org/dist/v$NodeVersion/$zipName" -OutFile $tmp -UseBasicParsing
  Expand-Archive -LiteralPath $tmp -DestinationPath $env:TEMP -Force
  Copy-Item (Join-Path $env:TEMP "node-v$NodeVersion-win-x64\*") $nodeDest -Recurse -Force
}
Write-Host "Node present: $(Test-Path $nodeExe)"

# WinSW optional
$winswDest = Join-Path $stage 'service\RPMAssure-App.exe'
if (-not $SkipWinSW -and -not (Test-Path $winswDest)) {
  foreach ($u in @(
    'https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW.NET4.exe',
    'https://github.com/winsw/winsw/releases/download/v3.0.0/WinSW-x64.exe'
  )) {
    try {
      Invoke-WebRequest -Uri $u -OutFile $winswDest -UseBasicParsing
      if ((Get-Item $winswDest).Length -gt 10000) { break }
    } catch {}
  }
}
if (Test-Path (Join-Path $Root 'winsw\RPMAssure-App.xml')) {
  Copy-Item (Join-Path $Root 'winsw\RPMAssure-App.xml') (Join-Path $stage 'service\RPMAssure-App.xml') -Force
}
Copy-Item (Join-Path $Root 'service\*.ps1') (Join-Path $stage 'service\') -Force -EA SilentlyContinue
Copy-Item (Join-Path $Root 'wizard\*.ps1') (Join-Path $stage 'wizard\') -Force -EA SilentlyContinue

$zip = Join-Path $Root 'payload\payload.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip, 'Optimal', $false)
Write-Host ("payload.zip = {0:N1} MB" -f ((Get-Item $zip).Length / 1MB)) -ForegroundColor Green

# clean Payload.wxs
$wxsPath = Join-Path $Root 'wix\Payload.wxs'
$lines = @(
  '<?xml version="1.0" encoding="utf-8"?>',
  '<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">',
  '  <Fragment>',
  '    <ComponentGroup Id="PayloadComponents" Directory="INSTALLFOLDER">',
  '      <Component Id="Cmp_PayloadZip" Guid="0A1B2C3D-4E5F-6789-ABCD-EF0123456789">',
  '        <File Id="File_PayloadZip" Source="payload/payload.zip" Name="payload.zip" KeyPath="yes" />',
  '      </Component>',
  '    </ComponentGroup>',
  '  </Fragment>',
  '</Wix>'
)
$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($wxsPath, (($lines -join "`n") + "`n"), $utf8)
Write-Host '=== Payload ready ===' -ForegroundColor Green
