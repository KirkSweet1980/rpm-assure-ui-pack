# Scheduled runner - Pulseway -> RPMAssure_App
# ASCII only. Respects Collect rate limits (do not overlap runs).
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$logDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("sched_pw_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))
$lock = Join-Path $here 'logs\pulseway_collect.lock'

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

# Prevent overlapping scheduled + manual runs
if (Test-Path -LiteralPath $lock) {
  $age = (Get-Date) - (Get-Item -LiteralPath $lock).LastWriteTime
  if ($age.TotalMinutes -lt 25) {
    Write-Log ("SKIP another collect is running (lock age min=" + [math]::Round($age.TotalMinutes, 1) + ")")
    exit 0
  }
  Write-Log 'Stale lock - removing'
  Remove-Item -LiteralPath $lock -Force -ErrorAction SilentlyContinue
}
Set-Content -LiteralPath $lock -Value ((Get-Date).ToString('o')) -Encoding ascii

try {
  Write-Log 'START Pulseway scheduled collect'
  $ps1 = Join-Path $here 'Collect-Pulseway-To-RPMAssure.ps1'
  if (-not (Test-Path $ps1)) { throw "Missing $ps1" }
  if (-not (Test-Path (Join-Path $here 'Pulseway.Config.ps1'))) {
    throw 'Missing Pulseway.Config.ps1 - run Write-PulsewayConfig.ps1'
  }

  # Safer defaults for unattended (override with env if needed)
  if (-not $env:PULSEWAY_RPS) { $env:PULSEWAY_RPS = '12' }
  if (-not $env:PULSEWAY_MAX_DETAIL) { $env:PULSEWAY_MAX_DETAIL = '400' }

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ps1 *>&1 | ForEach-Object {
    $t = "$_"
    Add-Content -LiteralPath $log -Value $t
    Write-Host $t
  }
  if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
    Write-Log ("FAIL exit=" + $LASTEXITCODE)
    throw "Collect exit $LASTEXITCODE"
  }
  Write-Log 'DONE ok'
  exit 0
}
finally {
  Remove-Item -LiteralPath $lock -Force -ErrorAction SilentlyContinue
}
