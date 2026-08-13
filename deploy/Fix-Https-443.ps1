# Fix HTTPS: copy Caddy out of user profile, start elevated, prove :443 LISTENING
# Run as Administrator. Pure ASCII.
$ErrorActionPreference = 'Continue'
$HostName = 'assure.rpmresources.co.za'
$Deploy = 'C:\RPM-Assure\deploy'
$Logs = Join-Path $Deploy 'logs'
$Bin = Join-Path $Deploy 'bin'
$Caddyfile = Join-Path $Deploy 'Caddyfile'
$LocalCaddy = Join-Path $Bin 'caddy.exe'
New-Item -ItemType Directory -Force -Path $Deploy, $Logs, $Bin | Out-Null

function Ok($m) { Write-Host ('  OK  ' + $m) -ForegroundColor Green }
function Bad($m) { Write-Host ('  FAIL ' + $m) -ForegroundColor Red }
function Warn($m) { Write-Host ('  !!  ' + $m) -ForegroundColor Yellow }

Write-Host '=== Fix HTTPS / port 443 ===' -ForegroundColor Cyan

# 0) Elevation check
$wid = [Security.Principal.WindowsIdentity]::GetCurrent()
$wp = New-Object Security.Principal.WindowsPrincipal($wid)
if (-not $wp.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Bad 'Not running as Administrator. Right-click PowerShell -> Run as administrator.'
  exit 1
}
Ok 'Elevated Administrator'

# 1) App on 8081
$app = netstat -ano | findstr 'LISTENING' | findstr ':8081'
if ($app) { Ok 'App LISTENING on 8081' } else {
  Bad 'Nothing LISTENING on 8081 - start app first'
  Write-Host '  powershell -File C:\RPM-Assure\deploy\Start-RpmAssure-App.ps1'
}

# 2) Find any caddy on machine
function Find-Caddy {
  $cmd = Get-Command caddy -ErrorAction SilentlyContinue
  if ($cmd -and (Test-Path -LiteralPath $cmd.Source)) { return $cmd.Source }
  foreach ($p in @(
    $LocalCaddy,
    'C:\Program Files\Caddy\caddy.exe',
    'C:\caddy\caddy.exe',
    'C:\Tools\caddy\caddy.exe'
  )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  # winget shim / user install
  $links = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\caddy.exe'
  if (Test-Path -LiteralPath $links) { return $links }
  $pkg = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages') -Recurse -Filter 'caddy.exe' -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($pkg) { return $pkg.FullName }
  return $null
}

$src = Find-Caddy
if (-not $src) {
  Bad 'caddy.exe not found. Install: winget install CaddyServer.Caddy'
  exit 1
}
Ok ('Found caddy: ' + $src)

# 3) Copy into deploy\bin (SYSTEM-safe path)
if ($src -ne $LocalCaddy) {
  Copy-Item -LiteralPath $src -Destination $LocalCaddy -Force
  Ok ('Copied to ' + $LocalCaddy)
} else {
  Ok ('Using ' + $LocalCaddy)
}
$caddy = $LocalCaddy

if (-not (Test-Path -LiteralPath $Caddyfile)) {
  Bad ('Missing ' + $Caddyfile)
  exit 1
}
Ok $Caddyfile

# 4) Validate
Write-Host ''
Write-Host '--- Validate ---'
& $caddy validate --config $Caddyfile
if ($LASTEXITCODE -ne 0) {
  Bad 'Caddyfile invalid'
  exit 1
}
Ok 'Caddyfile valid'

# 5) Firewall
try {
  $r = Get-NetFirewallRule -DisplayName 'RPMAssure-HTTPS-443' -ErrorAction SilentlyContinue
  if (-not $r) {
    New-NetFirewallRule -DisplayName 'RPMAssure-HTTPS-443' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 | Out-Null
  }
  Ok 'Firewall rule RPMAssure-HTTPS-443'
} catch {
  Warn ('Firewall: ' + $_.Exception.Message)
}

# 6) Stop old caddy
Write-Host ''
Write-Host '--- Restart Caddy ---'
Get-Process -Name caddy -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host ('  Stop PID ' + $_.Id)
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
try { & $caddy stop 2>&1 | Out-Null } catch {}
Start-Sleep -Seconds 1

# 7) Rewrite scheduled task to use local binary
$wrapper = Join-Path $Logs 'start-caddy.cmd'
$logOut = Join-Path $Logs 'caddy-stdout.log'
$logErr = Join-Path $Logs 'caddy-stderr.log'
$lines = @(
  '@echo off',
  'cd /d ' + $Deploy,
  '"' + $caddy + '" run --config "' + $Caddyfile + '" >> "' + $logOut + '" 2>> "' + $logErr + '"'
)
[IO.File]::WriteAllLines($wrapper, $lines)

$task = 'RPMAssure-Caddy-OnStart'
schtasks /Delete /TN $task /F 2>$null | Out-Null
schtasks /Create /F /TN $task /TR $wrapper /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0000:15 | Out-Null
Ok ('Task ' + $task + ' (uses deploy\bin\caddy.exe)')

# 8) Start NOW in THIS elevated session (most reliable)
# Prefer Start-Process so we see errors; keep process alive
$outLog = Join-Path $Logs ('caddy_run_{0:yyyyMMdd_HHmmss}.log' -f (Get-Date))
$arg = 'run --config "' + $Caddyfile + '"'
$p = Start-Process -FilePath $caddy -ArgumentList $arg -WorkingDirectory $Deploy `
  -WindowStyle Hidden -PassThru -RedirectStandardOutput $logOut -RedirectStandardError $logErr
Write-Host ('  Started caddy PID ' + $p.Id)
Start-Sleep -Seconds 6

# Also kick task for reboot persistence path
schtasks /Run /TN $task 2>$null | Out-Null

# 9) Prove LISTENING on 443
Write-Host ''
Write-Host '--- Listeners (need LISTENING on 443) ---'
$listen443 = netstat -ano | findstr 'LISTENING' | findstr ':443'
if ($listen443) {
  Ok 'Port 443 is LISTENING'
  Write-Host $listen443
} else {
  Bad 'Still no LISTENING on 443'
  Write-Host '  caddy process:'
  Get-Process -Name caddy -ErrorAction SilentlyContinue | Format-Table Id, Path -AutoSize
  Write-Host '  Last stderr:'
  if (Test-Path $logErr) { Get-Content $logErr -Tail 40 }
  Write-Host ''
  Write-Host '  Common causes:'
  Write-Host '    - DNS not pointing here (cert obtain blocks start)'
  Write-Host '    - Port 443 blocked by another app'
  Write-Host '    - Cloud NSG does not matter for LISTENING, only for public access'
}

# 10) DNS / public IP
Write-Host ''
Write-Host '--- DNS vs public IP ---'
try {
  $dns = Resolve-DnsName -Name $HostName -Type A -ErrorAction Stop
  $dns | ForEach-Object { Write-Host ('  A ' + $_.IPAddress) }
} catch {
  Bad ('DNS: ' + $_.Exception.Message)
}
try {
  $pub = Invoke-RestMethod -Uri 'https://api.ipify.org' -TimeoutSec 10
  Write-Host ('  This host public IP: ' + $pub)
} catch {
  Warn 'Could not detect public IP'
}

# 11) Local HTTPS test
Write-Host ''
Write-Host '--- Local HTTPS test ---'
if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
  & curl.exe -k -I --max-time 15 --resolve ($HostName + ':443:127.0.0.1') ('https://' + $HostName + '/') 2>&1 |
    Select-Object -First 15
}

Write-Host ''
Write-Host '=== Done ===' -ForegroundColor Cyan
Write-Host 'If 443 LISTENING: open https://assure.rpmresources.co.za from outside'
Write-Host 'If cert errors: fix DNS A-record, then re-run this script'
Write-Host 'Logs: C:\RPM-Assure\deploy\logs\caddy-stderr.log'
