param(
  [string]$InstallDir = ''
)
$ErrorActionPreference = 'Continue'
$logDir = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'expand-payload.log'

function Log([string]$m) {
  $line = "[{0:u}] {1}" -f (Get-Date), $m
  Add-Content -Path $log -Value $line -Encoding UTF8
  Write-Host $line
}

try {
  if (-not $InstallDir) {
    if ($PSScriptRoot -match 'service$') {
      $InstallDir = Split-Path $PSScriptRoot -Parent
    } else {
      $InstallDir = 'C:\Program Files\RPM Resources\RPM Assure'
    }
  }
  Log "InstallDir=$InstallDir"

  $zip = Join-Path $InstallDir 'payload.zip'
  $marker = Join-Path $InstallDir 'app\.output\server\index.mjs'

  if (-not (Test-Path $zip)) {
    if (Test-Path $marker) {
      Log 'Payload already expanded (marker present)'
      exit 0
    }
    Log "ERROR missing $zip"
    exit 1
  }

  Log "Expanding $zip -> $InstallDir"
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $tmp = Join-Path $env:TEMP ('rpma_payload_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  try {
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmp)
    foreach ($child in Get-ChildItem $tmp) {
      $dest = Join-Path $InstallDir $child.Name
      Log "Copy $($child.Name) -> $dest"
      if (Test-Path $dest) {
        # do not delete payload.zip while we still need it; skip deleting zip itself
        if ($child.Name -eq 'payload.zip') { continue }
        Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue
      }
      Copy-Item $child.FullName $dest -Recurse -Force
    }
  } finally {
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  }

  if (-not (Test-Path $marker)) {
    Log "ERROR after expand missing $marker"
    exit 1
  }
  Log 'Payload expanded OK'

  # Service install is OPTIONAL - missing WinSW must NOT fail MSI
  $winsw = Join-Path $InstallDir 'service\RPMAssure-App.exe'
  $installSvc = Join-Path $InstallDir 'service\Install-Service.ps1'
  if ((Test-Path $winsw) -and (Test-Path $installSvc)) {
    Log 'Installing WinSW service...'
    try {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installSvc >> $log 2>&1
      Log "Install-Service exit=$LASTEXITCODE"
    } catch {
      Log "Install-Service soft-fail: $($_.Exception.Message)"
    }
  } else {
    Log 'WinSW not present - skipping service install (OK)'
  }

  # Copy env template location
  $cfgDir = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\config'
  New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
  Log 'Done exit 0'
  exit 0
} catch {
  Log "FATAL: $($_.Exception.Message)"
  # still exit 0? No - expand failure should fail. Only service is soft.
  exit 1
}
