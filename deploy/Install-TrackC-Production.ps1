# RPM Assure Track C - Production host install
# Run as Administrator on the app server.
# Pure ASCII - safe for Windows PowerShell 5.
$ErrorActionPreference = 'Stop'

$Root = 'C:\RPM-Assure'
$App = Join-Path $Root 'App'
$Deploy = Join-Path $Root 'deploy'
$Logs = Join-Path $Deploy 'logs'
$Dl = Join-Path $env:USERPROFILE 'Downloads'

Write-Host '=== RPM Assure Track C: Production ===' -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $Root, $App, $Deploy, $Logs | Out-Null

# 1) Unpack this zip if present in Downloads
$zip = Get-ChildItem -LiteralPath $Dl -Filter 'TrackC_Production*.zip' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($zip) {
  $tmp = Join-Path $env:TEMP ('trackc_' + [guid]::NewGuid().ToString('N'))
  Expand-Archive -LiteralPath $zip.FullName -DestinationPath $tmp -Force
  $srcDeploy = Join-Path $tmp 'deploy'
  if (-not (Test-Path $srcDeploy)) {
    $hit = Get-ChildItem $tmp -Recurse -Directory -Filter 'deploy' | Select-Object -First 1
    if ($hit) { $srcDeploy = $hit.FullName }
  }
  if (Test-Path $srcDeploy) {
    Copy-Item (Join-Path $srcDeploy '*') $Deploy -Recurse -Force
    Write-Host ('Deploy scripts -> ' + $Deploy) -ForegroundColor Green
  }
  # copy this installer next to deploy for re-runs
  $self = Join-Path $tmp 'Install-TrackC-Production.ps1'
  if (Test-Path $self) { Copy-Item $self $Deploy -Force }
}

# 2) App exists?
if (-not (Test-Path (Join-Path $App 'package.json'))) {
  throw 'Missing C:\RPM-Assure\App - install the app first (Full Install zip).'
}

# 3) node_modules
if (-not (Test-Path (Join-Path $App 'node_modules\vite'))) {
  Write-Host 'Running npm.cmd install...' -ForegroundColor Yellow
  Push-Location $App
  try { & npm.cmd install } finally { Pop-Location }
}

# 4) Ensure .env.local exists (do not overwrite passwords)
$envLo = Join-Path $App '.env.local'
if (-not (Test-Path $envLo)) {
  $ex = Join-Path $App 'env.local.example'
  if (Test-Path $ex) {
    Copy-Item $ex $envLo
    Write-Host 'Created .env.local from example - EDIT SQL password then re-run if needed.' -ForegroundColor Yellow
  } else {
    @"
RPM_ASSURE_DATA_MODE=auto
RPM_ASSURE_SQL_SERVER=102.222.21.220
RPM_ASSURE_SQL_PORT=14333
RPM_ASSURE_SQL_DATABASE=RPMAssure_App
RPM_ASSURE_SQL_USER=Rpm_collect
RPM_ASSURE_SQL_PASSWORD=
RPM_ASSURE_SQL_TRUST_CERT=true
BETTER_AUTH_URL=http://127.0.0.1:8081
"@ | Set-Content -Path $envLo -Encoding ASCII
    Write-Host 'Created blank .env.local - set SQL password!' -ForegroundColor Yellow
  }
}

# 5) Install app auto-start service / task
$instApp = Join-Path $Deploy 'Install-App-Service.ps1'
if (Test-Path $instApp) {
  Write-Host 'Installing app service / scheduled task...' -ForegroundColor Cyan
  powershell -NoProfile -ExecutionPolicy Bypass -File $instApp
} else {
  Write-Host 'Install-App-Service.ps1 missing - starting vite once...' -ForegroundColor Yellow
  $start = Join-Path $Deploy 'Start-RpmAssure-App.ps1'
  if (Test-Path $start) {
    powershell -NoProfile -ExecutionPolicy Bypass -File $start
  }
}

# 6) HTTPS optional
Write-Host ''
Write-Host '--- HTTPS (optional but recommended) ---' -ForegroundColor Cyan
Write-Host 'Prereqs:'
Write-Host '  DNS A-record: assure.rpmresources.co.za -> this server public IP'
Write-Host '  Firewall: allow TCP 80 and 443 inbound'
Write-Host '  Install Caddy:  winget install CaddyServer.Caddy'
Write-Host 'Then run:'
Write-Host ('  powershell -NoProfile -ExecutionPolicy Bypass -File ' + (Join-Path $Deploy 'Install-Caddy-SSL.ps1'))
Write-Host ('  powershell -NoProfile -ExecutionPolicy Bypass -File ' + (Join-Path $Deploy 'Install-Caddy-Service.ps1'))
Write-Host ('  powershell -NoProfile -ExecutionPolicy Bypass -File ' + (Join-Path $Deploy 'Patch-Env-Https.ps1'))
Write-Host '  Restart-Service RPMAssure-App   (or re-run Install-App-Service.ps1)'
Write-Host ''

# 7) Health check
Start-Sleep -Seconds 2
Write-Host '--- Health ---' -ForegroundColor Cyan
netstat -ano | findstr ':8081'
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8081/' -UseBasicParsing -TimeoutSec 8
  Write-Host ('HTTP ' + $r.StatusCode + ' from http://127.0.0.1:8081/') -ForegroundColor Green
} catch {
  Write-Host ('App not answering yet: ' + $_.Exception.Message) -ForegroundColor Yellow
  Write-Host 'Check logs: C:\RPM-Assure\deploy\logs\'
}

Write-Host ''
Write-Host 'Track C base install done.' -ForegroundColor Green
Write-Host 'Local:  http://127.0.0.1:8081/'
Write-Host 'Public: https://assure.rpmresources.co.za  (after Caddy + DNS)'
Write-Host 'Docs:   C:\RPM-Assure\deploy\TRACK_C_README.txt'
