# Run Graph collect for every Csp.Config*.ps1 (except *example*).
# Used by scheduled task RPMAssure-Csp-GraphCollect and the 15-min API runner.
# Exit 0 = at least one tenant collected, or nothing to do (skip).
# Exit 1 = configs found but every tenant failed.
# Exit 2 = no config anywhere (runner treats as skip, not Recheck red).
$ErrorActionPreference = "Continue"
$roots = @(
  "C:\RPM-Assure\Sql\csp",
  "C:\RPM-Assure\sql\csp",
  $PSScriptRoot,
  "C:\RPM-Assure\deploy\ui-pack\Sql\csp",
  "C:\RPM-Assure\deploy\ui-pack\sql\csp",
  "C:\RPM-Assure\Sql\customers",
  "C:\RPM-Assure\config",
  "C:\RPM-Assure\Sql"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

$here = $null
foreach ($dir in $roots) {
  if (Test-Path -LiteralPath (Join-Path $dir "Collect-Csp-Graph-To-RPMAssure.ps1")) { $here = $dir; break }
}
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
  foreach ($dir in $roots) {
    $try = Join-Path $dir "Collect-Csp-Graph-To-RPMAssure.ps1"
    if (Test-Path -LiteralPath $try) { $collect = $try; break }
  }
}
if (-not (Test-Path -LiteralPath $collect)) {
  L "MISSING Collect-Csp-Graph-To-RPMAssure.ps1 - skip (not configured)"
  exit 2
}

$configs = @()
foreach ($dir in $roots) {
  $configs += @(Get-ChildItem -LiteralPath $dir -Filter "Csp.Config*.ps1" -File -Force -EA SilentlyContinue |
    Where-Object { $_.Name -notmatch 'example' })
}
$configs = @($configs | Sort-Object FullName -Unique)
L ("Found " + $configs.Count + " config(s): " + (($configs | ForEach-Object { $_.Name }) -join ', '))

if ($configs.Count -eq 0) {
  L ("No Csp.Config*.ps1 found in: " + ($roots -join '; ') + " - skip (Graph not configured)")
  exit 2
}

$fail = 0
$ok = 0
foreach ($cfg in $configs) {
  L ("--- " + $cfg.FullName + " ---")
  $gp = @(
    (Join-Path $here '..\ops\Get-RpmSqlPassword.ps1'),
    'C:\RPM-Assure\Sql\ops\Get-RpmSqlPassword.ps1'
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  $pwd = $env:RPM_ASSURE_SQL_PASSWORD
  if ($gp) { . $gp; $pwd = Get-RpmSqlPassword -Current $pwd }
  if ([string]::IsNullOrWhiteSpace($pwd)) { throw 'SQL password missing — run Harden-Production.ps1' }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $collect `
    -ConfigPath $cfg.FullName -SkipSchema `
    -SqlServer ".\RPMREPORTS" -SqlDatabase "RPMAssure_App" `
    -SqlUser "Rpm_collect" -SqlPassword $pwd
  $code = $LASTEXITCODE
  L ("exit=" + $code + " config=" + $cfg.Name)
  if ($code -ne 0) { $fail++ } else { $ok++ }
}

L ("=== Done tenants=" + $configs.Count + " ok=" + $ok + " failed=" + $fail + " log=" + $log + " ===")
if ($ok -gt 0) { exit 0 }
if ($fail -gt 0) { exit 1 }
exit 0
