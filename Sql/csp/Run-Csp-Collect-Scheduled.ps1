# Wrapper for schtasks - runs ALL tenant configs (RPMINT, BHF, ...)
$ErrorActionPreference = "Continue"
$here = "C:\RPM-Assure\Sql\csp"
$all = Join-Path $here "Run-Csp-Collect-All.ps1"
if (Test-Path -LiteralPath $all) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $all
  exit $LASTEXITCODE
}

# Fallback: single default config
$logDir = Join-Path $here "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $logDir ("sched_csp_" + $stamp + ".log")
function L([string]$m) {
  $line = ("{0:u} {1}" -f (Get-Date), $m)
  try { Add-Content -LiteralPath $log -Value $line -ErrorAction SilentlyContinue } catch {}
  Write-Host $line
}
L "=== Scheduled CSP Graph collect (single) ==="
$script = Join-Path $here "Collect-Csp-Graph-To-RPMAssure.ps1"
if (-not (Test-Path -LiteralPath $script)) { L "MISSING collect"; exit 2 }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -WindowsAuth -SkipSchema *>> $log 2>&1
$code = $LASTEXITCODE
L ("collect exit=" + $code)
exit $code
