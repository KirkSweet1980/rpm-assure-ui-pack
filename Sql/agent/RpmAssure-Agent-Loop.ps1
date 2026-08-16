# Long-running loop for Windows service RPMAssure-Edge.
# Does NOT use Task Scheduler. NSSM / the service keeps this process alive.
param(
  [string]$AgentRoot = "C:\RPM-Assure\Agent",
  [int]$TickSeconds = 120
)

$ErrorActionPreference = "Continue"
$cycle = Join-Path $AgentRoot "RpmAssure-Agent.ps1"
$lib = Join-Path $AgentRoot "Lib-SecureConfig.ps1"
if (Test-Path $lib) {
  . $lib
  $script:RpmaAgentRoot = $AgentRoot
  $st = Get-RpmaAgentSettings
  if ($st.tickSeconds) { $TickSeconds = [int]$st.tickSeconds }
}
$logDir = Join-Path $AgentRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$svcLog = Join-Path $logDir "service.log"

function SL([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z LOOP " + $m
  Add-Content -LiteralPath $svcLog -Value $line -EA SilentlyContinue
  Write-Host $line
}

SL "service start tick=${TickSeconds}s"
while ($true) {
  try {
    if (-not (Test-Path -LiteralPath $cycle)) { throw "Missing $cycle" }
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $cycle -AgentRoot $AgentRoot
    SL "cycle exit $LASTEXITCODE"
  } catch {
    SL ("cycle error " + $_.Exception.Message)
  }
  Start-Sleep -Seconds $TickSeconds
}
