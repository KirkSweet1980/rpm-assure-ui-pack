# Minimal Cove Login test (ASCII only)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Cove.Config.ps1')
if ([string]::IsNullOrWhiteSpace($ApiUrl)) { $ApiUrl = 'https://api.backup.management/jsonapi' }

$body = @{
  jsonrpc = '2.0'
  method  = 'Login'
  params  = @{
    partner  = $Partner
    username = $Username
    password = $Password
  }
  id = '1'
} | ConvertTo-Json -Compress

Write-Host ("POST " + $ApiUrl)
Write-Host ("Partner=" + $Partner + " User=" + $Username)
try {
  $r = Invoke-WebRequest -Uri $ApiUrl -Method POST -Body $body `
    -ContentType 'application/json' -UseBasicParsing -TimeoutSec 60
  Write-Host ("HTTP " + $r.StatusCode)
  $j = $r.Content | ConvertFrom-Json
  if ($j.error) {
    Write-Host ("FAIL: " + $j.error.message) -ForegroundColor Red
    exit 1
  }
  Write-Host 'Login OK' -ForegroundColor Green
  $preview = $r.Content
  if ($preview.Length -gt 400) { $preview = $preview.Substring(0, 400) + '...' }
  Write-Host $preview
} catch {
  Write-Host ("FAIL: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
