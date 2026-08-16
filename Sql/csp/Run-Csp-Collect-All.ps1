# Run Graph collect for every Csp.Config*.ps1 (except *example*).
# Used by scheduled task RPMAssure-Csp-GraphCollect.
$ErrorActionPreference = "Continue"
$here = "C:\RPM-Assure\Sql\csp"
if (-not (Test-Path -LiteralPath (Join-Path $here "Collect-Csp-Graph-To-RPMAssure.ps1"))) {
  $here = $PSScriptRoot
}
$logDir = Join-Path $here "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $logDir ("sched_csp_all_" + $stamp + ".log")

function L([string]$m) {
  $line = ("{0:u} {1}" -f (Get-Date), $m)
  try { Add-Content -LiteralPath $log -Value $line -ErrorAction SilentlyContinue } catch {}
  Write-Host $line
}

L "=== Scheduled CSP Graph collect ALL tenants ==="
$collect = Join-Path $here "Collect-Csp-Graph-To-RPMAssure.ps1"
if (-not (Test-Path -LiteralPath $collect)) {
  L "MISSING Collect-Csp-Graph-To-RPMAssure.ps1"
  exit 2
}

$configs = @(Get-ChildItem -LiteralPath $here -Filter "Csp.Config*.ps1" -File -EA SilentlyContinue |
  Where-Object { $_.Name -notmatch 'example' } |
  Sort-Object Name)

if ($configs.Count -eq 0) {
  L "No Csp.Config*.ps1 found (need Csp.Config.ps1 and/or Csp.Config.BHF.ps1)"
  exit 2
}

$fail = 0
foreach ($cfg in $configs) {
  L ("--- " + $cfg.Name + " ---")
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $collect `
    -ConfigPath $cfg.FullName -SkipSchema *>> $log 2>&1
  $code = $LASTEXITCODE
  L ("exit=" + $code + " config=" + $cfg.Name)
  if ($code -ne 0) { $fail++ }
}

L ("=== Done tenants=" + $configs.Count + " failed=" + $fail + " log=" + $log + " ===")
if ($fail -gt 0) { exit 1 }
exit 0
