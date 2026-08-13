# Diagnose Pulseway HTTP 500 / regional host issues (ASCII only)
# Run on the same host that will collect:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Diagnose-Pulseway-500.ps1

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
. (Join-Path $here 'Pulseway.Config.ps1')

function EscPair {
  $pair = '{0}:{1}' -f $TokenId, $TokenSecret
  return [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
}

function Try-Get([string]$url) {
  Write-Host ""
  Write-Host ("GET " + $url) -ForegroundColor Cyan
  try {
    $headers = @{
      Authorization = ('Basic ' + (EscPair))
      Accept        = 'application/json'
    }
    $r = Invoke-WebRequest -Uri $url -Headers $headers -Method GET -UseBasicParsing -TimeoutSec 45
    Write-Host ("  HTTP " + [int]$r.StatusCode)
    $body = $r.Content
    if ($body.Length -gt 600) { $body = $body.Substring(0, 600) + '...' }
    Write-Host $body
    return
  } catch {
    $status = $null
    $raw = $null
    if ($_.Exception.Response) {
      try { $status = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $raw = $reader.ReadToEnd()
        }
      } catch {}
    }
    Write-Host ("  FAIL HTTP " + $status + " " + $_.Exception.Message) -ForegroundColor Yellow
    if ($raw) {
      if ($raw.Length -gt 800) { $raw = $raw.Substring(0, 800) + '...' }
      Write-Host ("  BODY: " + $raw)
    }
  }
}

Write-Host '=== DNS ==='
foreach ($h in @('api.pulseway.com', 'ws17.pulseway.com', 'app.pulseway.com')) {
  try {
    $ips = [System.Net.Dns]::GetHostAddresses($h) | ForEach-Object { $_.IPAddressToString }
    Write-Host ("  " + $h + " -> " + ($ips -join ', '))
  } catch {
    Write-Host ("  " + $h + " -> FAIL " + $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host ''
Write-Host '=== Auth header length check ==='
Write-Host ('  TokenId length=' + $TokenId.Length)
Write-Host ('  TokenSecret length=' + $TokenSecret.Length)

$bases = @(
  'https://api.pulseway.com/v3',
  'https://ws17.pulseway.com/api/v3',
  'https://ws17.pulseway.com/v3',
  'https://api.pulseway.com/v2'
)

foreach ($b in $bases) {
  Try-Get ($b.TrimEnd('/') + '/environment')
  Try-Get ($b.TrimEnd('/') + '/devices')
}

Write-Host ''
Write-Host 'If api.pulseway.com returns 500 body mentioning ws17 DNS, but ws17 resolves here,'
Write-Host 'set BaseUrl to https://ws17.pulseway.com/api/v3 in Pulseway.Config.ps1 and re-run Explore.'
Write-Host 'If ws17 does not resolve, open outbound DNS/firewall for *.pulseway.com or ask Pulseway for your API host.'
