# Run-First-Collect.ps1
# After one-shot onboard: deploy direct collect + first pull + 15-min schedule.
# Run elevated on the customer SQL box (SIRZAAPSQL01).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Run-First-Collect.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Run-First-Collect.ps1 -CustomerCode SIRF
param(
  [string]$CustomerCode = 'SIRF',
  [switch]$SkipSchedule
)
$ErrorActionPreference = 'Stop'

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Here) { $Here = (Get-Location).Path }

$Root   = 'C:\RPM-Assure\Sql'
$Base   = Join-Path $Root 'base\syspro-direct'
$Cfg    = Join-Path $Root ("customers\{0}\Customer.Config.ps1" -f $CustomerCode.ToUpperInvariant())
$SrcBase = Join-Path $Here 'syspro-direct'
if (-not (Test-Path (Join-Path $SrcBase 'Run-Syspro-Collect-Direct.ps1'))) {
  $alt = Get-ChildItem $Here -Recurse -Directory -Filter 'syspro-direct' -EA SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName 'Run-Syspro-Collect-Direct.ps1') } |
    Select-Object -First 1
  if ($alt) { $SrcBase = $alt.FullName }
}
if (-not (Test-Path (Join-Path $SrcBase 'Run-Syspro-Collect-Direct.ps1'))) {
  throw "Missing syspro-direct pack next to this script. Extract the full zip."
}
if (-not (Test-Path $Cfg)) {
  throw "Missing $Cfg - run Install-NewCustomer-OneShot.ps1 first"
}

Write-Host '=== First SYSPRO collect ===' -ForegroundColor Cyan
Write-Host "Customer = $CustomerCode"
Write-Host "Config   = $Cfg"
Write-Host "Base     = $Base"

New-Item -ItemType Directory -Force -Path $Base | Out-Null
Copy-Item (Join-Path $SrcBase '*') $Base -Recurse -Force
Write-Host 'OK deployed syspro-direct'

$runner = Join-Path $Base 'Run-Syspro-Collect-Direct.ps1'
Write-Host '--- Smoke collect (job errors only) ---' -ForegroundColor Yellow
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner -ConfigPath $Cfg -JobsErrorsOnly
$smoke = $LASTEXITCODE
if ($smoke -ne 0) {
  Write-Host "WARN: smoke exit $smoke - check $Root\customers\$CustomerCode\logs" -ForegroundColor Yellow
} else {
  Write-Host 'Smoke collect OK' -ForegroundColor Green
}

if (-not $SkipSchedule) {
  $install = Join-Path $Base 'Install-Schedule.ps1'
  Write-Host '--- Install 15-min + nightly schedule ---' -ForegroundColor Yellow
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install -ConfigPath $Cfg -TaskPrefix 'RPMAssure'
  if ($LASTEXITCODE -ne 0) {
    Write-Host "WARN: schedule install exit $LASTEXITCODE" -ForegroundColor Yellow
  } else {
    Write-Host 'Schedule installed' -ForegroundColor Green
  }
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host " FIRST COLLECT DONE  $CustomerCode"
Write-Host '  Hard-refresh Exco - Sir Fruit should list'
Write-Host "  Logs: $Root\customers\$CustomerCode\logs"
Write-Host '========================================' -ForegroundColor Green
Write-Host '=== Done ==='
exit $smoke
