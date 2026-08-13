# Ensure production .env.local keys for RPM Assure (does not wipe existing secrets)
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$envFile = Join-Path $App '.env.local'
if (-not (Test-Path $App)) { throw "Missing $App" }

if (-not (Test-Path $envFile)) {
  @"
RPM_ASSURE_DATA_MODE=auto
RPM_ASSURE_SQL_SERVER=102.222.21.220,14333
RPM_ASSURE_SQL_DATABASE=RPMAssure_App
RPM_ASSURE_SQL_USER=Rpm_collect
RPM_ASSURE_SQL_PASSWORD=
RPM_ASSURE_SQL_TRUST_CERT=true
VITE_AUTH_ENABLED=true
BETTER_AUTH_URL=https://assure.rpmresources.co.za
BETTER_AUTH_TRUSTED_ORIGINS=https://assure.rpmresources.co.za
NITRO_PORT=8081
PORT=8081
HOST=0.0.0.0
"@ | Set-Content -Path $envFile -Encoding ASCII
  Write-Host "Created $envFile - SET SQL password and BETTER_AUTH_SECRET then re-run." -ForegroundColor Yellow
} else {
  Write-Host "Found $envFile" -ForegroundColor Green
}

function Ensure-Key([string]$key, [string]$value) {
  $raw = Get-Content -LiteralPath $envFile -Raw -ErrorAction SilentlyContinue
  if ($null -eq $raw) { $raw = '' }
  if ($raw -match "(?m)^\s*$([regex]::Escape($key))\s*=") { return $false }
  Add-Content -LiteralPath $envFile -Value ("{0}={1}" -f $key, $value) -Encoding ASCII
  return $true
}

# Stable auth secret if missing
$needSecret = $true
$lines = Get-Content -LiteralPath $envFile -ErrorAction SilentlyContinue
foreach ($ln in $lines) {
  if ($ln -match '^\s*BETTER_AUTH_SECRET\s*=\s*\S+') { $needSecret = $false }
}
if ($needSecret) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $sec = ([BitConverter]::ToString($bytes) -replace '-','').ToLowerInvariant()
  Ensure-Key 'BETTER_AUTH_SECRET' $sec | Out-Null
  Write-Host 'Generated BETTER_AUTH_SECRET' -ForegroundColor Cyan
}

Ensure-Key 'VITE_AUTH_ENABLED' 'true' | Out-Null
Ensure-Key 'BETTER_AUTH_URL' 'https://assure.rpmresources.co.za' | Out-Null
Ensure-Key 'BETTER_AUTH_TRUSTED_ORIGINS' 'https://assure.rpmresources.co.za' | Out-Null
Ensure-Key 'NITRO_PORT' '8081' | Out-Null
Ensure-Key 'PORT' '8081' | Out-Null
Ensure-Key 'HOST' '0.0.0.0' | Out-Null
Ensure-Key 'RPM_ASSURE_DATA_MODE' 'auto' | Out-Null

Write-Host 'Production env keys checked.' -ForegroundColor Green
