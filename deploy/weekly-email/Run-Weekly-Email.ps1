# Calls RPM Assure weekly digest API (portfolio RAG + mandatory HF gaps).
# Pure ASCII. App must be running (vite or production) on BaseUrl.
param(
  [string]$BaseUrl = 'http://127.0.0.1:8081',
  [string]$Secret = '',
  [string]$SecretFile = 'C:\RPM-Assure\App\data\cron.secret',
  [string]$To = '',
  [string]$LogDir = 'C:\RPM-Assure\deploy\logs'
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$log = Join-Path $LogDir ('weekly_email_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.log')

function Write-Log([string]$m) {
  $line = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $m
  Add-Content -LiteralPath $log -Value $line -Encoding ASCII
  Write-Host $line
}

if (-not $Secret) {
  if (Test-Path -LiteralPath $SecretFile) {
    $Secret = (Get-Content -LiteralPath $SecretFile -Raw).Trim()
  }
}
if (-not $Secret) {
  $envSec = $env:RPM_ASSURE_CRON_SECRET
  if ($envSec) { $Secret = $envSec.Trim() }
}
if (-not $Secret) {
  Write-Log 'FAIL: no cron secret. Set Secret param, SecretFile, or RPM_ASSURE_CRON_SECRET.'
  exit 2
}

$url = $BaseUrl.TrimEnd('/') + '/api/cron/weekly-report'
if ($To) {
  $url = $url + '?to=' + [uri]::EscapeDataString($To)
}

Write-Log ('POST ' + $url)
try {
  $headers = @{ 'X-RPMA-Cron-Secret' = $Secret; 'Content-Type' = 'application/json' }
  $body = '{}'
  if ($To) { $body = '{"to":"' + ($To -replace '"','') + '"}' }
  $resp = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 120
  Write-Log ('HTTP ' + [int]$resp.StatusCode)
  Write-Log $resp.Content
  if ([int]$resp.StatusCode -ge 400) { exit 1 }
  if ($resp.Content -notmatch '"ok"\s*:\s*true') {
    Write-Log 'FAIL: response not ok'
    exit 1
  }
  Write-Log 'OK weekly email sent'
  exit 0
} catch {
  Write-Log ('FAIL: ' + $_.Exception.Message)
  if ($_.Exception.Response) {
    try {
      $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      Write-Log $sr.ReadToEnd()
    } catch {}
  }
  exit 1
}
