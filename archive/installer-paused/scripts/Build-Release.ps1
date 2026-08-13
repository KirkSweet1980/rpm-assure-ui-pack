# Full release: build app (node-server) + MSI
param(
  [Parameter(Mandatory=$false)][string]$Version = '',
  [string]$AppSource = 'C:\RPM-Assure\App',
  [switch]$BumpPatch
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$verFile = Join-Path $Root 'VERSION.txt'
if (-not $Version) {
  $Version = (Get-Content $verFile -Raw).Trim()
}
if ($BumpPatch) {
  $parts = $Version.Split('.')
  $parts[2] = [string]([int]$parts[2] + 1)
  $Version = $parts -join '.'
  Set-Content $verFile $Version -Encoding ASCII
  Write-Host "Bumped version to $Version" -ForegroundColor Cyan
}

Write-Host "=== Release $Version ===" -ForegroundColor Cyan

# 1) App production build
if (-not (Test-Path (Join-Path $AppSource 'package.json'))) {
  throw "App not found at $AppSource"
}
Push-Location $AppSource
try {
  # BOM fix
  $pkg = Join-Path $AppSource 'package.json'
  $b = [IO.File]::ReadAllBytes($pkg)
  if ($b.Length -ge 3 -and $b[0]-eq 0xEF -and $b[1]-eq 0xBB -and $b[2]-eq 0xBF) {
    [IO.File]::WriteAllBytes($pkg, $b[3..($b.Length-1)])
  }
  $env:RPM_ASSURE_NITRO_PRESET = 'node-server'
  $env:NITRO_PRESET = 'node-server'
  [IO.File]::WriteAllText((Join-Path $AppSource '.rpma-nitro-preset'), "node-server`n")
  if (Test-Path 'scripts\build-node.mjs') {
    & node scripts\build-node.mjs
  } else {
    & npm.cmd run build:node
  }
  if ($LASTEXITCODE -ne 0) { throw 'App build failed' }
} finally {
  Pop-Location
}

# 2) MSI
& (Join-Path $PSScriptRoot 'Build-Msi.ps1') -Version $Version -AppSource $AppSource

# 3) Release notes stub
$notes = Join-Path $Root "dist\RELEASE-$Version.txt"
@"
RPM Assure $Version
Built: $(Get-Date -Format u)
MSI: RPMAssure-$Version.msi

Upgrade:
  msiexec /i RPMAssure-$Version.msi /qn

Config is preserved under:
  %ProgramData%\RPM Resources\RPM Assure\config\app.env
"@ | Set-Content $notes -Encoding ASCII

Write-Host "Release notes: $notes" -ForegroundColor Green
Write-Host '=== Release complete ===' -ForegroundColor Green
