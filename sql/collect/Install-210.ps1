# Creates/overwrites 210 on this machine (run on AHIC)
$ErrorActionPreference = 'Stop'
$path = 'C:\RPM-Assure\Sql\collect\210_Collect_AHIC_To_RPMAssure_App.sql'
New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
# Caller should copy content - this script just reminds
if (-not (Test-Path $path)) { Write-Host "Place 210 at $path then re-run collect" -ForegroundColor Yellow }
else { Write-Host "Exists: $path Length=$((Get-Item $path).Length)" }
