# RPM Assure - one-shot HTTPS (Caddy + Let's Encrypt)
# Host: assure.rpmresources.co.za
# Run as Administrator on the APP host (the machine that runs Vite/Node).
# Pure ASCII - safe for Windows PowerShell 5.1.

$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$Deploy = Join-Path $Root 'deploy'
$Logs = Join-Path $Deploy 'logs'
$App = Join-Path $Root 'App'
$HostName = 'assure.rpmresources.co.za'
$AppPort = 8081

New-Item -ItemType Directory -Force -Path $Deploy, $Logs | Out-Null

function Write-Step($m) { Write-Host ''; Write-Host ('=== ' + $m + ' ===') -ForegroundColor Cyan }
function Write-Ok($m) { Write-Host ('  OK  ' + $m) -ForegroundColor Green }
function Write-Warn($m) { Write-Host ('  !!  ' + $m) -ForegroundColor Yellow }

Write-Step '1) Place deploy files'
# Prefer files next to this script (from zip extract into deploy)
$here = if ($PSScriptRoot) { $PSScriptRoot } else { $Deploy }
foreach ($name in @('Caddyfile', 'Install-Caddy-Service.ps1', 'Patch-Env-Https.ps1', 'HTTPS_README.txt')) {
  $src = Join-Path $here $name
  $dst = Join-Path $Deploy $name
  if (Test-Path -LiteralPath $src) {
    $sf = [IO.Path]::GetFullPath($src)
    $df = [IO.Path]::GetFullPath($dst)
    if ($sf -ne $df) {
      Copy-Item -LiteralPath $src -Destination $dst -Force
      Write-Ok ('Copied ' + $name)
    } else {
      Write-Ok ($name + ' already in place')
    }
  } elseif (Test-Path -LiteralPath $dst) {
    Write-Ok ($name + ' present at deploy')
  } else {
    Write-Warn ('Missing ' + $name + ' - extract SSL zip into ' + $Deploy)
  }
}

$caddyfile = Join-Path $Deploy 'Caddyfile'
if (-not (Test-Path -LiteralPath $caddyfile)) {
  throw 'Missing Caddyfile. Expand RPMAssure_SSL_Pack.zip into C:\RPM-Assure\deploy first.'
}

Write-Step '2) Prerequisites check'
Write-Host ('  Hostname: ' + $HostName)
Write-Host '  Need: DNS A-record -> this server public IP'
Write-Host '  Need: Windows Firewall allow TCP 443 inbound (HTTPS only — port 80 not used)'
Write-Host ('  Need: App listening on 127.0.0.1:' + $AppPort)

$listen = netstat -ano | findstr (':' + $AppPort)
if ($listen) {
  Write-Ok ('Port ' + $AppPort + ' is listening')
  Write-Host $listen
} else {
  Write-Warn ('Port ' + $AppPort + ' not listening. Start the app first:')
  Write-Host '    cd C:\RPM-Assure\App'
  Write-Host '    npx.cmd vite dev --host 0.0.0.0 --port 8081'
  Write-Host '  Or: powershell -File C:\RPM-Assure\deploy\Start-RpmAssure-App.ps1'
}

Write-Step '3) Install / find Caddy'
function Find-Caddy {
  $cmd = Get-Command caddy -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @(
    'C:\Program Files\Caddy\caddy.exe',
    'C:\caddy\caddy.exe',
    'C:\Tools\caddy\caddy.exe'
  )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

$caddy = Find-Caddy
if (-not $caddy) {
  Write-Warn 'Caddy not found. Trying winget install...'
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    & winget install --id CaddyServer.Caddy -e --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
      [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $caddy = Find-Caddy
  }
}
if (-not $caddy) {
  Write-Host ''
  Write-Host 'Install Caddy manually, then re-run this script:' -ForegroundColor Yellow
  Write-Host '  winget install CaddyServer.Caddy'
  Write-Host '  OR download: https://caddyserver.com/docs/install#windows'
  throw 'Caddy not installed'
}
Write-Ok ('Caddy: ' + $caddy)

Write-Step '4) Open firewall 443 only (HTTPS; no port 80)'
try {
  $rules = @(
    @{ Name = 'RPMAssure-HTTPS-443'; Port = 443 }
  )
  $old80 = Get-NetFirewallRule -DisplayName 'RPMAssure-HTTP-80' -ErrorAction SilentlyContinue
  if ($old80) {
    Remove-NetFirewallRule -DisplayName 'RPMAssure-HTTP-80' -ErrorAction SilentlyContinue
    Write-Ok 'Removed firewall rule RPMAssure-HTTP-80 (HTTPS-only policy)'
  }
  foreach ($r in $rules) {
    $exists = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
    if (-not $exists) {
      New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port | Out-Null
      Write-Ok ('Firewall rule ' + $r.Name)
    } else {
      Write-Ok ('Firewall rule already exists: ' + $r.Name)
    }
  }
} catch {
  Write-Warn ('Could not set firewall automatically: ' + $_.Exception.Message)
  Write-Host '  Open TCP 443 inbound only (Windows Firewall + cloud security group). Do not open 80.'
}

Write-Step '5) Validate Caddyfile'
& $caddy validate --config $caddyfile
Write-Ok 'Caddyfile valid'

Write-Step '6) Install / start Caddy service'
$svcScript = Join-Path $Deploy 'Install-Caddy-Service.ps1'
if (Test-Path -LiteralPath $svcScript) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $svcScript
} else {
  Write-Warn 'Install-Caddy-Service.ps1 missing - starting caddy in background'
  & $caddy start --config $caddyfile
}

Start-Sleep -Seconds 4
Write-Host 'Port 443 (HTTPS only; port 80 not used):'
netstat -ano | findstr ':443 '

Write-Step '7) Patch app env for HTTPS auth'
$patch = Join-Path $Deploy 'Patch-Env-Https.ps1'
if (Test-Path -LiteralPath $patch) {
  if (Test-Path -LiteralPath (Join-Path $App '.env.local')) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $patch
    Write-Ok 'Env patched - RESTART the app process now'
  } else {
    Write-Warn 'No .env.local yet - create it, then run Patch-Env-Https.ps1'
  }
} else {
  Write-Warn 'Patch-Env-Https.ps1 missing - set BETTER_AUTH_URL / VITE_APP_URL manually'
}

Write-Step '8) Verify'
Write-Host '  DNS:   nslookup assure.rpmresources.co.za'
Write-Host '  Local: curl.exe -I http://127.0.0.1:8081/'
Write-Host '  HTTPS: curl.exe -I https://assure.rpmresources.co.za/'
Write-Host ''
Write-Host 'Browser: https://assure.rpmresources.co.za' -ForegroundColor Green
Write-Host ''
Write-Host 'If certificate fails:'
Write-Host '  - DNS must point to THIS server public IP (not private LAN only)'
Write-Host '  - Port 443 must be reachable from the internet (TLS-ALPN for Let''s Encrypt; no port 80)'
Write-Host '  - Check C:\RPM-Assure\deploy\logs\caddy-*.log'
Write-Host ''
Write-Host 'Done. Restart Node/Vite after env patch so sign-in cookies work on HTTPS.' -ForegroundColor Cyan
