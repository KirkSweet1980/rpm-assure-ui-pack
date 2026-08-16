# Sequential API collect every 15 min (or on demand from the UI).
# Pulseway + Cove + Bitdefender + Microsoft Graph. Soft-fail each leg.
# Writes C:\RPM-Assure\Sql\ops\api-sync-status.json for the progress bar.
param([string]$Root = "C:\RPM-Assure")
$ErrorActionPreference = "Continue"
$ops = Join-Path $Root "Sql\ops"
$logDir = Join-Path $ops "logs"
New-Item -ItemType Directory -Force -Path $ops, $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $logDir ("sched_all_api_" + $stamp + ".log")
$statusFile = Join-Path $ops "api-sync-status.json"

$legs = @(
  @{ Name = "Pulseway";    Label = "RMM";     Kind = "rmm";        Path = (Join-Path $Root "Sql\rmm\pulseway\Collect-Pulseway-To-RPMAssure.ps1"); Extra = @() },
  @{ Name = "Cove";        Label = "BACKUP";  Kind = "backup";     Path = (Join-Path $Root "Sql\cove\Collect-Cove-To-RPMAssure.ps1"); Extra = @() },
  @{ Name = "Bitdefender"; Label = "EPP";     Kind = "epp";        Path = (Join-Path $Root "Sql\bitdefender\Collect-Bitdefender-To-RPMAssure.ps1"); Extra = @() },
  @{ Name = "CspGraph";    Label = "CSP";     Kind = "licensing";  Path = (Join-Path $Root "Sql\csp\Collect-Csp-Graph-To-RPMAssure.ps1"); Extra = @("-WindowsAuth", "-SkipSchema") }
)

function W([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z " + $m
  Add-Content -LiteralPath $log -Value $line -ErrorAction SilentlyContinue
  Write-Host $line
}

function Write-Status($obj) {
  try {
    ($obj | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $statusFile -Encoding UTF8
  } catch {}
}

$state = [ordered]@{
  running     = $true
  startedUtc  = (Get-Date).ToUniversalTime().ToString("o")
  finishedUtc = $null
  current     = ""
  pct         = 0
  message     = "Starting API collect"
  log         = $log
  legs        = @()
}
foreach ($l in $legs) {
  $state.legs += [ordered]@{
    name = $l.Name; label = $l.Label; kind = $l.Kind
    status = "queued"; pct = 0; message = "Waiting"
    startedUtc = $null; finishedUtc = $null
  }
}
Write-Status $state
W "=== All API collect start ==="

$i = 0
foreach ($l in $legs) {
  $i++
  $base = [int]((($i - 1) / $legs.Count) * 100)
  $state.current = $l.Name
  $state.pct = $base
  $state.message = "Collecting " + $l.Label
  $state.legs[$i - 1].status = "running"
  $state.legs[$i - 1].startedUtc = (Get-Date).ToUniversalTime().ToString("o")
  $state.legs[$i - 1].message = "Running"
  Write-Status $state

  if (-not (Test-Path -LiteralPath $l.Path)) {
    W ("SKIP " + $l.Name + " missing " + $l.Path)
    $state.legs[$i - 1].status = "skip"
    $state.legs[$i - 1].message = "Script missing"
    $state.legs[$i - 1].finishedUtc = (Get-Date).ToUniversalTime().ToString("o")
    $state.pct = [int](($i / $legs.Count) * 100)
    Write-Status $state
    continue
  }

  W ("=== RUN " + $l.Name + " ===")
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $outF = Join-Path $logDir ("sched_" + $l.Name + "_" + $stamp + "_out.txt")
  $errF = Join-Path $logDir ("sched_" + $l.Name + "_" + $stamp + "_err.txt")
  try {
    $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $l.Path) + $l.Extra
    $p = Start-Process -FilePath "powershell.exe" -ArgumentList $args -Wait -PassThru -NoNewWindow `
      -RedirectStandardOutput $outF -RedirectStandardError $errF
    $code = [int]$p.ExitCode
    W ("DONE " + $l.Name + " exit=" + $code + " sec=" + [int]$sw.Elapsed.TotalSeconds)
    $state.legs[$i - 1].status = $(if ($code -eq 0) { "ok" } else { "error" })
    $state.legs[$i - 1].message = "exit=" + $code + " " + [int]$sw.Elapsed.TotalSeconds + "s"
  } catch {
    W ("FAIL " + $l.Name + " " + $_.Exception.Message)
    $state.legs[$i - 1].status = "error"
    $state.legs[$i - 1].message = $_.Exception.Message
  }
  $state.legs[$i - 1].finishedUtc = (Get-Date).ToUniversalTime().ToString("o")
  $state.pct = [int](($i / $legs.Count) * 100)
  Write-Status $state
  if (Test-Path $outF) {
    Get-Content $outF -Tail 8 -EA SilentlyContinue | ForEach-Object { W ("  | " + $_) }
  }
}

$state.running = $false
$state.current = ""
$state.pct = 100
$state.finishedUtc = (Get-Date).ToUniversalTime().ToString("o")
$state.message = "API collect finished"
Write-Status $state
W ("=== All API collect done log=" + $log)
exit 0
