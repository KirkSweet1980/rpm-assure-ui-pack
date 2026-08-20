# Prove this host can talk to Assure over HTTPS. SQL 14333 is not required.
param(
  [string]$ConfigPath = "",
  [string]$AgentRoot = "C:\RPM-Assure\Agent"
)
$ErrorActionPreference = "Stop"
function W([string]$m) { Write-Host ((Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z " + $m) }

if ($ConfigPath -and (Test-Path $ConfigPath)) { . $ConfigPath }
elseif (Test-Path (Join-Path $AgentRoot "Agent.Config.ps1")) { . (Join-Path $AgentRoot "Agent.Config.ps1") }
$lib = Join-Path $AgentRoot "Lib-SecureConfig.ps1"
if (Test-Path $lib) {
  . $lib
  $script:RpmaAgentRoot = $AgentRoot
  if (Get-Command Import-RpmaAgentSecrets -EA SilentlyContinue) { try { Import-RpmaAgentSecrets } catch {} }
}
$httpsLib = Join-Path $AgentRoot "Lib-RpmaHttps.ps1"
if (Test-Path $httpsLib) { . $httpsLib }

$appUrl = "https://assure.rpmresources.co.za"
if (Get-Command Get-RpmaAgentSettings -EA SilentlyContinue) {
  try {
    $st = Get-RpmaAgentSettings
    if ($st.appHttpsUrl) { $appUrl = [string]$st.appHttpsUrl }
  } catch {}
}
$appUrl = $appUrl.TrimEnd("/")
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$sw = [Diagnostics.Stopwatch]::StartNew()
$httpOk = 0
$msg = "https fail"
try {
  $wr = Invoke-WebRequest -UseBasicParsing -Uri ($appUrl + "/downloads/VERSION") -TimeoutSec 20
  if ([int]$wr.StatusCode -ge 200 -and [int]$wr.StatusCode -lt 400) {
    $httpOk = 1
    $msg = "https ok " + $wr.StatusCode + " " + (($wr.Content -replace "\s", "").Substring(0, [Math]::Min(12, ($wr.Content -replace "\s", "").Length)))
  } else {
    $msg = "https " + $wr.StatusCode
  }
} catch {
  $msg = "https fail " + $_.Exception.Message
}
$sw.Stop()
W $msg
if ($httpOk -eq 1) { exit 0 }
exit 1
