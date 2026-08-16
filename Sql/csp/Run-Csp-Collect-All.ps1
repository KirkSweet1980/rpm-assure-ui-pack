# Run Graph collect for every Csp.Config*.ps1 (except *example*).
# Used by scheduled task RPMAssure-Csp-GraphCollect and the 15-min API runner.
$ErrorActionPreference = "Continue"
$roots = @(
  "C:\RPM-Assure\Sql\csp",
  $PSScriptRoot,
  "C:\RPM-Assure\deploy\ui-pack\Sql\csp"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

$here = $roots | Where-Object { Test-Path -LiteralPath (Join-Path $_ "Collect-Csp-Graph-To-RPMAssure.ps1") } | Select-Object -First 1
if (-not $here) { $here = "C:\RPM-Assure\Sql\csp" }
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

$configs = @()
foreach ($dir in $roots) {
  $configs += @(Get-ChildItem -LiteralPath $dir -Filter "Csp.Config*.ps1" -File -EA SilentlyContinue |
    Where-Object { $_.Name -notmatch 'example' })
}
$configs = @($configs | Sort-Object FullName -Unique)

if ($configs.Count -eq 0) {
  L "No Csp.Config*.ps1 found in: $($roots -join '; ')"
  exit 2
}

$fail = 0
$ok = 0
foreach ($cfg in $configs) {
  L ("--- " + $cfg.Name + " ---")
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $collect `
    -ConfigPath $cfg.FullName -SkipSchema `
    -SqlServer "102.222.21.220,14333" -SqlDatabase "RPMAssure_App" `
    -SqlUser "Rpm_collect" -SqlPassword "RpmCollect#AHIC2026" *>> $log 2>&1
  $code = $LASTEXITCODE
  L ("exit=" + $code + " config=" + $cfg.Name)
  if ($code -ne 0) { $fail++ } else { $ok++ }
}

L ("=== Done tenants=" + $configs.Count + " ok=" + $ok + " failed=" + $fail + " log=" + $log + " ===")
if ($ok -gt 0) { exit 0 }
if ($fail -gt 0) { exit 1 }
exit 0
