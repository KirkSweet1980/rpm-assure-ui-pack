# Apply-Cover-Principle.ps1
# Copies the all-pillars Cover / No Cover UI onto the app and restarts the service.
# Run elevated on the APP server.
param()
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Here) { $Here = (Get-Location).Path }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }
if (-not (Test-Path $App)) { throw "Missing $App" }
$src = Join-Path $Here 'src'
if (-not (Test-Path $src)) { throw "Missing src next to this script. Extract the full zip." }

Write-Host '=== Apply Cover / No Cover principle ===' -ForegroundColor Cyan
Copy-Item -Path (Join-Path $src '*') -Destination (Join-Path $App 'src') -Recurse -Force
Write-Host 'Source copied' -ForegroundColor Green

$svc = Get-Service -Name 'RPMAssure-App' -ErrorAction SilentlyContinue
if ($svc) {
  Write-Host 'Restart-Service RPMAssure-App ...'
  Restart-Service -Name RPMAssure-App -Force
  Start-Sleep -Seconds 6
  Get-Service RPMAssure-App | Format-Table Name, Status, StartType -AutoSize
} else {
  Write-Host 'Service RPMAssure-App not found - files copied; start the app yourself.' -ForegroundColor Yellow
}

Write-Host 'PROOF: hard-refresh Exco. Every pillar tab shows Covered or No Cover.' -ForegroundColor Green
Write-Host '=== Done ==='
