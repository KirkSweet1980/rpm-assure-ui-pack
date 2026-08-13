# Probe one Pulseway device for CPU/memory/disks endpoints (read-only)
# Usage: .\Probe-Pulseway-Device-Metrics.ps1 -DeviceId '5ae76f6b-b28b-49cc-aa80-e390e82f3df1'
param(
  [Parameter(Mandatory = $true)][string]$DeviceId,
  [string]$ConfigPath = ''
)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if (-not $ConfigPath) { $ConfigPath = Join-Path $here 'Pulseway.Config.ps1' }
. $ConfigPath
if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'https://rpmresourcesza.pulseway.com/api/v3' }
$BaseUrl = $BaseUrl.TrimEnd('/')
$outDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$log = Join-Path $outDir ("probe_metrics_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))
function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}
function Get-BasicAuthHeader {
  $pair = '{0}:{1}' -f $TokenId, $TokenSecret
  $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  return @{ Authorization = "Basic $b64"; Accept = 'application/json' }
}
function Invoke-PwGet([string]$Path) {
  $url = if ($Path.StartsWith('http')) { $Path } else { "$BaseUrl/$($Path.TrimStart('/'))" }
  try {
    $resp = Invoke-WebRequest -Uri $url -Headers (Get-BasicAuthHeader) -Method GET -UseBasicParsing -TimeoutSec 120
    return [pscustomobject]@{ Ok = $true; Status = [int]$resp.StatusCode; Url = $url; Raw = $resp.Content }
  } catch {
    $status = $null; $raw = $null
    if ($_.Exception.Response) {
      try { $status = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) { $raw = (New-Object System.IO.StreamReader($stream)).ReadToEnd() }
      } catch {}
    }
    return [pscustomobject]@{ Ok = $false; Status = $status; Url = $url; Raw = $raw; Error = $_.Exception.Message }
  }
}
Write-Log "Probe DeviceId=$DeviceId BaseUrl=$BaseUrl"
$paths = @(
  "devices/$DeviceId",
  "devices/$DeviceId/disks",
  "devices/$DeviceId/drives",
  "devices/$DeviceId/storage",
  "devices/$DeviceId/hardware",
  "devices/$DeviceId/metrics",
  "devices/$DeviceId/performance",
  "devices/$DeviceId/assets",
  "devices/$DeviceId/system",
  "systems/$DeviceId",
  "assets/$DeviceId",
  'systems',
  'assets'
)
foreach ($path in $paths) {
  $r = Invoke-PwGet $path
  $len = 0
  if ($r.Raw) { $len = $r.Raw.Length }
  Write-Log ("GET $path -> ok=$($r.Ok) status=$($r.Status) len=$len")
  if ($r.Ok -and $r.Raw) {
    $snip = $r.Raw
    if ($snip.Length -gt 500) { $snip = $snip.Substring(0, 500) }
    Write-Log ("  body: $snip")
    $safe = ($path -replace '[\\/:*?\"<>|]', '_')
    Set-Content -LiteralPath (Join-Path $outDir ("probe_$safe.json")) -Value $r.Raw -Encoding UTF8
  }
}
Write-Log "Done. log=$log"
Write-Host 'If metrics still empty, paste this log (no secrets).' -ForegroundColor Yellow
