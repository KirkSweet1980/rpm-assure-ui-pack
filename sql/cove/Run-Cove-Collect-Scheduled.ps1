# Scheduled wrapper for Cove collect (central host)
# ASCII only. Logs under C:\RPM-Assure\Sql\cove\logs\
$ErrorActionPreference = 'Stop'
$here = 'C:\RPM-Assure\Sql\cove'
$ps1 = Join-Path $here 'Collect-Cove-To-RPMAssure.ps1'
if (-not (Test-Path -LiteralPath $ps1)) { throw "Missing $ps1" }

$logDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log = Join-Path $logDir ("sched_cove_{0}.log" -f $stamp)

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

Write-Log ('START host=' + $env:COMPUTERNAME)
try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ps1 *>&1 |
    ForEach-Object {
      $t = "$_"
      Add-Content -LiteralPath $log -Value $t
      Write-Host $t
    }
  if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
    throw "Collect exit $LASTEXITCODE"
  }
  $auto = Join-Path $here 'Auto-Map-Cove-Partners.ps1'
  if (Test-Path -LiteralPath $auto) {
    Write-Log 'Auto-map pass...'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $auto *>&1 |
      ForEach-Object {
        $t = "$_"
        Add-Content -LiteralPath $log -Value $t
        Write-Host $t
      }
  }
  Write-Log 'DONE ok'
  exit 0
} catch {
  Write-Log ('FAIL ' + $_.Exception.Message)
  exit 1
}
