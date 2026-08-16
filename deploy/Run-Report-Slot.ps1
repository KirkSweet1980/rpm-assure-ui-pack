# Called by scheduled tasks RPMAssure-Reports-Daily / Weekly / Monthly.
# ASCII only. No braces in the schtasks /TR line.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("daily", "weekly", "monthly")]
  [string]$Slot,
  [string]$AppUrl = "http://127.0.0.1:8081",
  [string]$AppDir = "C:\RPM-Assure\App"
)
$ErrorActionPreference = "Continue"
$secret = $env:RPM_ASSURE_CRON_SECRET
if (-not $secret) {
  $secFile = Join-Path $AppDir "data\cron.secret"
  if (Test-Path -LiteralPath $secFile) {
    $secret = (Get-Content -LiteralPath $secFile -Raw).Trim()
  }
}
if (-not $secret) {
  $settings = Join-Path $AppDir "data\rpma-settings.json"
  if (-not (Test-Path -LiteralPath $settings)) { $settings = "C:\RPM-Assure\data\rpma-settings.json" }
  if (Test-Path -LiteralPath $settings) {
    try { $secret = [string]((Get-Content -LiteralPath $settings -Raw | ConvertFrom-Json).cronSecret) } catch {}
  }
}
if (-not $secret) { throw "No cron secret. Save Email / Report Packs once so the app writes cronSecret." }
$url = $AppUrl.TrimEnd("/") + "/api/cron/weekly-report?slot=" + $Slot + "&secret=" + [uri]::EscapeDataString($secret)
try {
  Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 180 | Out-Null
} catch {
  Write-Host ("WARN " + $_.Exception.Message)
  exit 1
}
exit 0
