# Start-Caddy-Https-443.ps1
# Starts Caddy so https://assure.rpmresources.co.za works (443 -> 127.0.0.1:8081)
# Run as Administrator. Pure ASCII.
$ErrorActionPreference = 'Continue'
$HostName = 'assure.rpmresources.co.za'
$Deploy = 'C:\RPM-Assure\deploy'
$Logs = Join-Path $Deploy 'logs'
$Bin = Join-Path $Deploy 'bin'
$Caddyfile = Join-Path $Deploy 'Caddyfile'
$LocalCaddy = Join-Path $Bin 'caddy.exe'
$AppEnv = 'C:\RPM-Assure\App\.env.local'

function Ok($m) { Write-Host ('  OK  ' + $m) -ForegroundColor Green }
function Bad($m) { Write-Host ('  FAIL ' + $m) -ForegroundColor Red }
function Warn($m) { Write-Host ('  !!  ' + $m) -ForegroundColor Yellow }

Write-Host '=== Start Caddy HTTPS on port 443 ===' -ForegroundColor Cyan
Write-Host ('Host: https://' + $HostName)
Write-Host ('Proxy: 127.0.0.1:8081')
Write-Host ''

# Elevation
$wid = [Security.Principal.WindowsIdentity]::GetCurrent()
$wp = New-Object Security.Principal.WindowsPrincipal($wid)
if (-not $wp.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Bad 'Not Administrator. Right-click PowerShell -> Run as administrator.'
  exit 1
}
Ok 'Elevated Administrator'

New-Item -ItemType Directory -Force -Path $Deploy, $Logs, $Bin | Out-Null

# Write / refresh Caddyfile
$caddyfileBody = @'
# RPM Assure - HTTPS (auto-written by Start-Caddy-Https-443.ps1)
# Host: assure.rpmresources.co.za -> reverse_proxy 127.0.0.1:8081

{
	auto_https disable_redirects
}

https://assure.rpmresources.co.za {
	encode gzip zstd

	tls {
		issuer acme {
			disable_http_challenge
		}
	}

	handle /healthz {
		respond "ok" 200
	}

	reverse_proxy 127.0.0.1:8081 {
		header_up Host {host}
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
	}

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		-Server
	}

	log {
		output file C:\RPM-Assure\deploy\logs\caddy-access.log {
			roll_size 10mb
			roll_keep 5
		}
	}
}

'@
[IO.File]::WriteAllText($Caddyfile, $caddyfileBody.Trim() + "`r`n")
Ok ('Caddyfile -> ' + $Caddyfile)

# App on 8081
$app = netstat -ano | findstr 'LISTENING' | findstr ':8081'
if ($app) { Ok 'App LISTENING on 8081' } else {
  Bad 'Nothing LISTENING on 8081 - start the app first, then re-run this script'
  Write-Host '  Start your RPM Assure app (NSSM / scheduled task / npm) so it binds 0.0.0.0:8081'
}

# Find caddy
function Find-Caddy {
  $cmd = Get-Command caddy -ErrorAction SilentlyContinue
  if ($cmd -and (Test-Path -LiteralPath $cmd.Source)) { return $cmd.Source }
  foreach ($p in @(
    $LocalCaddy,
    'C:\Program Files\Caddy\caddy.exe',
    'C:\caddy\caddy.exe',
    'C:\Tools\caddy\caddy.exe',
    (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\caddy.exe')
  )) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  $pkgRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
  if (Test-Path $pkgRoot) {
    $pkg = Get-ChildItem $pkgRoot -Recurse -Filter 'caddy.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pkg) { return $pkg.FullName }
  }
  return $null
}

$src = Find-Caddy
if (-not $src) {
  Warn 'caddy.exe not found - trying winget install...'
  try {
    & winget install --id CaddyServer.Caddy -e --accept-package-agreements --accept-source-agreements
  } catch {
    Warn ('winget: ' + $_.Exception.Message)
  }
  Start-Sleep -Seconds 2
  $src = Find-Caddy
}
if (-not $src) {
  Bad 'caddy.exe still not found.'
  Write-Host '  Install manually: winget install CaddyServer.Caddy'
  Write-Host '  Or download from https://caddyserver.com/download and place caddy.exe in C:\RPM-Assure\deploy\bin\'
  exit 1
}
Ok ('Found caddy: ' + $src)

if ($src -ne $LocalCaddy) {
  Copy-Item -LiteralPath $src -Destination $LocalCaddy -Force
  Ok ('Copied to ' + $LocalCaddy)
}
$caddy = $LocalCaddy

# Validate
Write-Host ''
Write-Host '--- Validate Caddyfile ---'
& $caddy validate --config $Caddyfile
if ($LASTEXITCODE -ne 0) {
  Bad 'Caddyfile invalid'
  exit 1
}
Ok 'Caddyfile valid'

# Firewall
try {
  $names = @('RPMAssure-HTTPS-443','RPMAssure-Caddy-HTTPS')
  foreach ($n in $names) {
    $r = Get-NetFirewallRule -DisplayName $n -ErrorAction SilentlyContinue
    if (-not $r) {
      New-NetFirewallRule -DisplayName $n -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 -Profile Any | Out-Null
    }
  }
  Ok 'Firewall inbound TCP 443 allowed'
} catch {
  Warn ('Firewall: ' + $_.Exception.Message)
}

# Auth env for public URL (optional but recommended)
try {
  if (Test-Path (Split-Path $AppEnv -Parent)) {
    $hostUrl = 'https://' + $HostName
    $lines = @()
    if (Test-Path $AppEnv) { $lines = @(Get-Content -LiteralPath $AppEnv) }
    $drop = @('BETTER_AUTH_URL','VITE_APP_URL','BETTER_AUTH_TRUSTED_ORIGINS','RPM_ASSURE_HTTPS')
    $kept = foreach ($line in $lines) {
      $t = $line.Trim()
      if (-not $t -or $t.StartsWith('#')) { $line; continue }
      $k = $t.Split('=')[0].Trim()
      if ($drop -contains $k) { continue }
      $line
    }
    $add = @(
      ('BETTER_AUTH_URL=' + $hostUrl),
      ('VITE_APP_URL=' + $hostUrl),
      ('BETTER_AUTH_TRUSTED_ORIGINS=' + $hostUrl),
      'RPM_ASSURE_HTTPS=1'
    )
    $body = ($kept + '' + $add + '') -join "`n"
    [IO.File]::WriteAllText($AppEnv, $body + "`n", [Text.UTF8Encoding]::new($false))
    Ok ('Patched ' + $AppEnv + ' (restart app after HTTPS works)')
  }
} catch {
  Warn ('Env patch: ' + $_.Exception.Message)
}

# Stop old caddy
Write-Host ''
Write-Host '--- Restart Caddy ---'
Get-Process -Name caddy -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host ('  Stop PID ' + $_.Id)
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
try { & $caddy stop 2>&1 | Out-Null } catch {}
Start-Sleep -Seconds 1

# Scheduled task for reboot
$wrapper = Join-Path $Logs 'start-caddy.cmd'
$logOut = Join-Path $Logs 'caddy-stdout.log'
$logErr = Join-Path $Logs 'caddy-stderr.log'
$cmdLines = @(
  '@echo off',
  'cd /d ' + $Deploy,
  '"' + $caddy + '" run --config "' + $Caddyfile + '" >> "' + $logOut + '" 2>> "' + $logErr + '"'
)
[IO.File]::WriteAllLines($wrapper, $cmdLines)

$task = 'RPMAssure-Caddy-OnStart'
# Quiet delete if missing (Access denied avoided with cmd)
cmd.exe /c ('schtasks /Delete /TN "' + $task + '" /F >nul 2>&1') | Out-Null
$tr = $wrapper
$create = cmd.exe /c ('schtasks /Create /F /TN "' + $task + '" /TR "' + $tr + '" /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0000:15')
if ($LASTEXITCODE -eq 0) { Ok ('Task ' + $task) } else { Warn ('Task create: ' + $create) }

# Start now
$p = Start-Process -FilePath $caddy -ArgumentList ('run --config "' + $Caddyfile + '"') `
  -WorkingDirectory $Deploy -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $logOut -RedirectStandardError $logErr
Write-Host ('  Started caddy PID ' + $p.Id)
Start-Sleep -Seconds 8

# Prove 443
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
  Write-Host '  Last stderr (if any):'
  if (Test-Path $logErr) { Get-Content $logErr -Tail 50 }
  Write-Host ''
  Write-Host '  Common causes:'
  Write-Host '    - Another process holding 443 (check netstat LISTENING :443)'
  Write-Host '    - Let''s Encrypt blocked: DNS A must point to this server public IP'
  Write-Host '    - See logs: ' + $logErr
}

# DNS
Write-Host ''
Write-Host '--- DNS vs public IP ---'
try {
  $dns = Resolve-DnsName -Name $HostName -Type A -ErrorAction Stop
  $dns | ForEach-Object { Write-Host ('  A ' + $_.IPAddress) }
} catch { Bad ('DNS: ' + $_.Exception.Message) }
try {
  $pub = Invoke-RestMethod -Uri 'https://api.ipify.org' -TimeoutSec 10
  Write-Host ('  This host public IP: ' + $pub)
} catch { Warn 'Could not detect public IP' }

# Local HTTPS
Write-Host ''
Write-Host '--- Local HTTPS test ---'
if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
  & curl.exe -k -I --max-time 20 --resolve ($HostName + ':443:127.0.0.1') ('https://' + $HostName + '/login') 2>&1 |
    Select-Object -First 18
}

Write-Host ''
Write-Host '=== Done ===' -ForegroundColor Cyan
Write-Host ('Open: https://' + $HostName + '/login')
Write-Host 'If 443 LISTENING but public still times out: cloud/NSG firewall inbound 443'
Write-Host ('Logs: ' + $logErr)
if ($listen443) { exit 0 } else { exit 1 }
