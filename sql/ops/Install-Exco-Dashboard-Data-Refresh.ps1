# Install-Exco-Dashboard-Data-Refresh.ps1
# Keeps warehouse data that feeds Exco Insight fresh (RMM / Cove / EPP / optional CSP).
# Run as Administrator on the APP host (rpmwinrm / collect host).
# Pure ASCII.

param(
  [string]$Root = "C:\RPM-Assure",
  [int]$EveryMinutes = 15,
  [switch]$RunOnce
)

$ErrorActionPreference = "Stop"
$TaskName = "RPMAssure-Exco-Data-Refresh"
$ScriptDir = Join-Path $Root "Sql\ops"
$Runner = Join-Path $ScriptDir "Run-Exco-Dashboard-Data-Refresh.ps1"
$LogDir = Join-Path $Root "Sql\ops\logs"
New-Item -ItemType Directory -Force -Path $ScriptDir, $LogDir | Out-Null

$runnerBody = @'
# Run-Exco-Dashboard-Data-Refresh.ps1 — soft-fail each leg. Pure ASCII.
param([string]$Root = "C:\RPM-Assure")
$ErrorActionPreference = "Continue"
$LogDir = Join-Path $Root "Sql\ops\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $LogDir ("exco_data_" + $stamp + ".log")
function W([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z " + $m
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}
W "=== Exco data refresh start ==="
$legs = @(
  @{ Name = "Pulseway"; Path = (Join-Path $Root "Sql\rmm\pulseway\Collect-Pulseway-To-RPMAssure.ps1") },
  @{ Name = "Cove"; Path = (Join-Path $Root "Sql\cove\Collect-Cove-To-RPMAssure.ps1") },
  @{ Name = "Bitdefender"; Path = (Join-Path $Root "Sql\bitdefender\Collect-Bitdefender-To-RPMAssure.ps1") }
)
foreach ($leg in $legs) {
  if (-not (Test-Path -LiteralPath $leg.Path)) {
    W ("SKIP " + $leg.Name + " missing " + $leg.Path)
    continue
  }
  W ("RUN " + $leg.Name)
  try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $leg.Path >> $log 2>&1
    W ("DONE " + $leg.Name + " exit=" + $LASTEXITCODE)
  } catch {
    W ("FAIL " + $leg.Name + " " + $_.Exception.Message)
  }
}
W ("=== Exco data refresh done log=" + $log)
'@

[IO.File]::WriteAllText($Runner, $runnerBody, [Text.UTF8Encoding]::new($false))
Write-Host "Wrote $Runner"

if ($RunOnce) {
  Write-Host "Running once..."
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -Root $Root
  exit $LASTEXITCODE
}

$ps = "powershell.exe"
$args = "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`" -Root `"$Root`""
# Remove existing
schtasks /Delete /TN $TaskName /F 2>$null | Out-Null
$create = schtasks /Create /TN $TaskName /SC MINUTE /MO $EveryMinutes /TR "`"$ps`" $args" /RU SYSTEM /RL HIGHEST /F
if ($LASTEXITCODE -ne 0) {
  throw "schtasks create failed exit $LASTEXITCODE (run as Admin). Output: $create"
}
Write-Host "Scheduled task: $TaskName every $EveryMinutes min as SYSTEM"
Write-Host "Manual: powershell -NoProfile -ExecutionPolicy Bypass -File `"$Runner`""
Write-Host "Exco UI still auto-refreshes from SQL on an open browser (Settings > Dashboard > Exco auto-refresh)."
Write-Host "=== Done ==="
