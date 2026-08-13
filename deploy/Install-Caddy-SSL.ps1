# Install / start Caddy HTTPS for assure.rpmresources.co.za
# Run as Administrator on the app host
$ErrorActionPreference = 'Stop'
$Deploy = 'C:\RPM-Assure\deploy'
$Logs = Join-Path $Deploy 'logs'
New-Item -ItemType Directory -Force -Path $Deploy, $Logs | Out-Null

# Prefer pack next to this script, else Downloads  never copy onto itself
$here = if ($PSScriptRoot) { $PSScriptRoot } else { $Deploy }
$caddySrc = Join-Path $here 'Caddyfile'
if (-not (Test-Path -LiteralPath $caddySrc)) {
  $caddySrc = Join-Path $env:USERPROFILE 'Downloads\Caddyfile'
}

$caddyfile = Join-Path $Deploy 'Caddyfile'
if (Test-Path -LiteralPath $caddySrc) {
  $srcFull = [IO.Path]::GetFullPath($caddySrc)
  $dstFull = [IO.Path]::GetFullPath($caddyfile)
  if ($srcFull -ne $dstFull) {
    Copy-Item -LiteralPath $caddySrc -Destination $caddyfile -Force
    Write-Host ('Copied Caddyfile -> ' + $caddyfile) -ForegroundColor Green
  } else {
    Write-Host ('Caddyfile already in place: ' + $caddyfile) -ForegroundColor Cyan
  }
}

if (-not (Test-Path -LiteralPath $caddyfile)) {
  throw ('Missing Caddyfile at ' + $caddyfile)
}

$caddyCmd = Get-Command caddy -ErrorAction SilentlyContinue
if (-not $caddyCmd) {
  Write-Host 'Caddy not found. Install with:' -ForegroundColor Yellow
  Write-Host '  winget install CaddyServer.Caddy'
  Write-Host 'Then re-run this script.'
  throw 'Caddy not installed'
}

Write-Host 'Validating Caddyfile...' -ForegroundColor Cyan
& caddy validate --config $caddyfile

Write-Host ''
Write-Host 'Prerequisites:' -ForegroundColor Cyan
Write-Host '  1) DNS: assure.rpmresources.co.za A-record -> this server public IP'
Write-Host '  2) Firewall: allow TCP 443 inbound only (HTTPS; do not open 80)'

Write-Host '  3) App listening: 127.0.0.1:8081 (vite/node)'
Write-Host ''
Write-Host 'Start Caddy (foreground test):' -ForegroundColor Green
Write-Host ('  caddy run --config "' + $caddyfile + '"')
Write-Host 'Or background:'
Write-Host ('  caddy start --config "' + $caddyfile + '"')
Write-Host ''
Write-Host 'Then patch app env for HTTPS auth cookies:' -ForegroundColor Yellow
Write-Host '  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Patch-Env-Https.ps1'
Write-Host 'Restart vite after env change.'
