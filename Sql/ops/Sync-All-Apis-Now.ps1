# Sync-All-Apis-Now.ps1
# Runs Pulseway, Cove, RPM EPP and Microsoft 365 Graph collect now.
# SYSPRO collect stays on each customer SQL job (not an API).
# Run as Administrator on the APP server:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Sync-All-Apis-Now.ps1

$ErrorActionPreference = 'Continue'
$Root = 'C:\RPM-Assure'
$logDir = Join-Path $Root 'Sql\ops\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log = Join-Path $logDir ("sync_now_" + $stamp + ".log")

function W([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss') + 'Z ' + $m
  Add-Content -LiteralPath $log -Value $line -ErrorAction SilentlyContinue
  Write-Host $line
}

function Run-Leg([string]$Name, [string]$Path, [string[]]$Extra = @()) {
  if (-not (Test-Path -LiteralPath $Path)) {
    W ("SKIP " + $Name + " missing " + $Path)
    return
  }
  W ("=== RUN " + $Name + " ===")
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $arg = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Path) + $Extra
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList $arg -Wait -PassThru -NoNewWindow `
      -RedirectStandardOutput (Join-Path $logDir ("sync_" + $Name + "_" + $stamp + "_out.txt")) `
      -RedirectStandardError  (Join-Path $logDir ("sync_" + $Name + "_" + $stamp + "_err.txt"))
    W ("DONE " + $Name + " exit=" + $p.ExitCode + " sec=" + [int]$sw.Elapsed.TotalSeconds)
  } catch {
    W ("FAIL " + $Name + " " + $_.Exception.Message)
  }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - sync all APIs now'
Write-Host '========================================' -ForegroundColor Cyan
W 'START all API collect'

Run-Leg 'Pulseway'    (Join-Path $Root 'Sql\rmm\pulseway\Collect-Pulseway-To-RPMAssure.ps1')
Run-Leg 'Cove'        (Join-Path $Root 'Sql\cove\Collect-Cove-To-RPMAssure.ps1')
Run-Leg 'RpmEpp' (Join-Path $Root 'Sql\bitdefender\Collect-Bitdefender-To-RPMAssure.ps1')
Run-Leg 'CspGraph'    (Join-Path $Root 'Sql\csp\Collect-Csp-Graph-To-RPMAssure.ps1') @('-WindowsAuth','-SkipSchema')

W ("DONE log=" + $log)
Write-Host 'Hard-refresh Assure after this finishes.' -ForegroundColor Green
Write-Host 'SYSPRO is not in this sync - it runs on each customer SQL collect job.'
