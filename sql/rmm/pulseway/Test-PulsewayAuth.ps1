# Minimal auth check - GET /environment
# ASCII only.
$ErrorActionPreference = 'Stop'
$cfg = Join-Path $PSScriptRoot 'Pulseway.Config.ps1'
if (-not (Test-Path $cfg)) { throw "Missing $cfg - run Write-PulsewayConfig.ps1 first" }
. $cfg
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = 'https://rpmresourcesza.pulseway.com/api/v3'
}
$BaseUrl = $BaseUrl.TrimEnd('/')
$pair = '{0}:{1}' -f $TokenId, $TokenSecret
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{ Authorization = "Basic $b64"; Accept = 'application/json' }
$url = "$BaseUrl/environment"
Write-Host "GET $url"
try {
  $r = Invoke-WebRequest -Uri $url -Headers $headers -Method GET -UseBasicParsing -TimeoutSec 60
  Write-Host ("OK " + $r.StatusCode) -ForegroundColor Green
  $len = [Math]::Min(500, $r.Content.Length)
  Write-Host $r.Content.Substring(0, $len)
} catch {
  Write-Host ("FAIL: " + $_.Exception.Message) -ForegroundColor Red
  if ($_.Exception.Response) {
    try { Write-Host ("Status: " + [int]$_.Exception.Response.StatusCode) } catch {}
  }
  exit 1
}
