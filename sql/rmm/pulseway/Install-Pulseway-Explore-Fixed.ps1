# Write fixed Explore script from Downloads zip OR re-copy if present under Sql\rmm
# Prefer: re-download RPMAssure_Pulseway_Explore.zip then run Install-Pulseway-Explore.ps1
# This helper only rewrites Explore-PulsewayApi.ps1 if the zip is not re-applied.

$ErrorActionPreference = 'Stop'
$pw = 'C:\RPM-Assure\Sql\rmm\pulseway'
if (-not (Test-Path $pw)) { throw "Missing $pw - expand Pulseway explore pack first" }

# If user still has broken file, tell them to re-copy from new zip
$explore = Join-Path $pw 'Explore-PulsewayApi.ps1'
Write-Host "Use the NEW zip RPMAssure_Pulseway_Explore.zip and Install-Pulseway-Explore.ps1"
Write-Host "Then:"
Write-Host "  notepad $pw\Pulseway.Config.ps1"
Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File $pw\Explore-PulsewayApi.ps1"
