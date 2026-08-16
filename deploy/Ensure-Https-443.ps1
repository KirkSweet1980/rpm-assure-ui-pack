# Ensure-Https-443.ps1
# Diagnose + restore public HTTPS (Caddy :443 -> app :8081).
# Keeps an existing Caddyfile (own cert / Settings SSL). Writes one only if missing.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Ensure-Https-443.ps1

$ErrorActionPreference = 'Continue'
$HostName = 'assure.rpmresources.co.za'
$Root = 'C:\RPM-Assure'
$Deploy = Join-Path $Root 'deploy'
$Logs = Join-Path $Deploy 'logs'
$Bin = Join-Path $Deploy 'bin'
$Caddyfile = Join-Path $Deploy 'Caddyfile'
$LocalCaddy = Join-Path $Bin 'caddy.exe'
$SvcApp = 'RPMAssure-App'
$SvcCaddy = 'RPMAssure-Caddy'
$AppPort = 8081

function Ok([string]$m) { Write-Host ('  OK  ' + $m) -ForegroundColor Green }
function Bad([string]$m) { Write-Host ('  FAIL ' + $m) -ForegroundColor Red }
function Warn([string]$m) { Write-Host ('  !!  ' + $m) -ForegroundColor Yellow }
function Listening([int]$port) {
  $hit = netstat -ano | findstr 'LISTENING' | findstr (':' + $port)
  return [bool]$hit
}
function ShowListen([int]$port) {
  $rows = netstat -ano | findstr 'LISTENING' | findstr (':' + $port)
  if ($rows) { Write-Host $rows } else { Write-Host ('  (nothing LISTENING on ' + $port + ')') }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - Restore HTTPS :443'
Write-Host '========================================' -ForegroundColor Cyan

$wid = [Security.Principal.WindowsIdentity]::GetCurrent()
$wp = New-Object Security.Principal.WindowsPrincipal($wid)
if (-not $wp.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this in an Administrator PowerShell.'
}
Ok 'Elevated Administrator'
New-Item -ItemType Directory -Force -Path $Deploy, $Logs, $Bin | Out-Null

Write-Host ''
Write-Host '--- Before ---'
Write-Host 'App 8081:'
ShowListen $AppPort
Write-Host 'HTTPS 443:'
ShowListen 443

# 1) App backend
if (-not (Listening $AppPort)) {
  Warn 'App not on 8081 - starting RPMAssure-App'
  $svc = Get-Service -Name $SvcApp -ErrorAction SilentlyContinue
  if ($svc) {
    if ($svc.Status -ne 'Running') { Start-Service -Name $SvcApp -ErrorAction SilentlyContinue }
    else { Restart-Service -Name $SvcApp -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 5
  }
  $startApp = Join-Path $Deploy 'Start-RpmAssure-App.ps1'
  if ((-not (Listening $AppPort)) -and (Test-Path -LiteralPath $startApp)) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startApp
    Start-Sleep -Seconds 3
  }
}
if (Listening $AppPort) { Ok 'App LISTENING on 8081' } else { Bad 'App still not on 8081 - Caddy will start but pages will 502 until the app is up' }

# 2) Already good?
if (Listening 443) {
  Ok 'Port 443 is already LISTENING'
  Get-Process -Name caddy -ErrorAction SilentlyContinue | ForEach-Object { Ok ('caddy PID ' + $_.Id) }
  $svcC = Get-Service -Name $SvcCaddy -ErrorAction SilentlyContinue
  if ($svcC) { Ok ($SvcCaddy + ' = ' + $svcC.Status) }
} else {
  # 3) Firewall
  try {
    $names = @('RPMAssure-HTTPS-443', 'RPM Assure - allow 443 HTTPS')
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

  # 4) Caddyfile - keep existing (Settings / own cert)
  if (Test-Path -LiteralPath $Caddyfile) {
    Ok ('Using existing ' + $Caddyfile)
  } else {
    $body = @"
{
	auto_https disable_redirects
}

https://$HostName {
	encode gzip zstd
	tls {
		issuer acme {
			disable_http_challenge
		}
	}
	handle /healthz {
		respond "ok" 200
	}
	reverse_proxy 127.0.0.1:$AppPort {
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
"@
    [IO.File]::WriteAllText($Caddyfile, $body.Trim() + "`r`n")
    Ok ('Wrote default Caddyfile -> ' + $Caddyfile)
  }

  # 5) Find caddy.exe
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
    Warn 'caddy.exe not found - trying winget'
    try {
      & winget install --id CaddyServer.Caddy -e --accept-package-agreements --accept-source-agreements
    } catch {
      Warn ('winget: ' + $_.Exception.Message)
    }
    Start-Sleep -Seconds 2
    $src = Find-Caddy
  }
  if (-not $src) {
    Bad 'caddy.exe not found. Install Git-side Caddy: winget install CaddyServer.Caddy'
    Bad 'Or place caddy.exe in C:\RPM-Assure\deploy\bin\'
    exit 1
  }
  Ok ('Found caddy: ' + $src)
  if ($src -ne $LocalCaddy) {
    try {
      Copy-Item -LiteralPath $src -Destination $LocalCaddy -Force
      Ok ('Copied to ' + $LocalCaddy)
    } catch {
      Warn ('Copy to deploy\bin skipped: ' + $_.Exception.Message)
    }
  }
  $caddy = $LocalCaddy
  if (-not (Test-Path -LiteralPath $caddy)) { $caddy = $src }

  Write-Host ''
  Write-Host '--- Validate Caddyfile ---'
  & $caddy validate --config $Caddyfile
  if ($LASTEXITCODE -ne 0) {
    Bad 'Caddyfile invalid - not starting (fix Settings -> SSL or the file above)'
    exit 1
  }
  Ok 'Caddyfile valid'

  # 6) Prefer Windows service if installed
  Write-Host ''
  Write-Host '--- Start Caddy ---'
  $svcC = Get-Service -Name $SvcCaddy -ErrorAction SilentlyContinue
  if ($svcC) {
    if ($svcC.Status -eq 'Running') {
      Restart-Service -Name $SvcCaddy -Force -ErrorAction SilentlyContinue
      Ok ('Restarted service ' + $SvcCaddy)
    } else {
      Start-Service -Name $SvcCaddy -ErrorAction SilentlyContinue
      Ok ('Started service ' + $SvcCaddy)
    }
    Start-Sleep -Seconds 6
  } else {
    Get-Process -Name caddy -ErrorAction SilentlyContinue | ForEach-Object {
      Write-Host ('  Stop stray caddy PID ' + $_.Id)
      Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    try { & $caddy stop 2>&1 | Out-Null } catch {}
    Start-Sleep -Seconds 1

    $logOut = Join-Path $Logs 'caddy-stdout.log'
    $logErr = Join-Path $Logs 'caddy-stderr.log'
    $wrapper = Join-Path $Logs 'start-caddy.cmd'
    $cmdLines = @(
      '@echo off',
      'cd /d ' + $Deploy,
      '"' + $caddy + '" run --config "' + $Caddyfile + '" >> "' + $logOut + '" 2>> "' + $logErr + '"'
    )
    [IO.File]::WriteAllLines($wrapper, $cmdLines)
    $task = 'RPMAssure-Caddy-OnStart'
    cmd.exe /c ('schtasks /Delete /TN "' + $task + '" /F >nul 2>&1') | Out-Null
    cmd.exe /c ('schtasks /Create /F /TN "' + $task + '" /TR "' + $wrapper + '" /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0000:15') | Out-Null
    Ok ('Task ' + $task)

    $p = Start-Process -FilePath $caddy -ArgumentList ('run --config "' + $Caddyfile + '"') `
      -WorkingDirectory $Deploy -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput $logOut -RedirectStandardError $logErr
    Write-Host ('  Started caddy PID ' + $p.Id)
    Start-Sleep -Seconds 8
  }
}

Write-Host ''
Write-Host '--- After ---'
Write-Host 'App 8081:'
ShowListen $AppPort
Write-Host 'HTTPS 443:'
ShowListen 443

$ok443 = Listening 443
if ($ok443) { Ok 'Port 443 is LISTENING' } else {
  Bad 'Still no LISTENING on 443'
  Write-Host '  caddy process:'
  Get-Process -Name caddy -ErrorAction SilentlyContinue | Format-Table Id, Path -AutoSize
  $logErr = Join-Path $Logs 'caddy-stderr.log'
  if (Test-Path -LiteralPath $logErr) {
    Write-Host '  Last stderr:'
    Get-Content $logErr -Tail 40
  }
  Write-Host '  Common causes:'
  Write-Host '    - DNS A for assure.rpmresources.co.za must be this public IP (cert obtain)'
  Write-Host '    - Another app already owns 443'
  Write-Host '    - Cloud / NSG does not block LISTENING, only public reach'
}

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

Write-Host ''
Write-Host '--- Local HTTPS test ---'
if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
  & curl.exe -k -I --max-time 20 --resolve ($HostName + ':443:127.0.0.1') ('https://' + $HostName + '/login') 2>&1 |
    Select-Object -First 18
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
if ($ok443) {
  Write-Host ' HTTPS is up. Open https://assure.rpmresources.co.za/login'
} else {
  Write-Host ' HTTPS not listening. Paste the block above (especially stderr) back.'
}
Write-Host (' Logs: ' + (Join-Path $Logs 'caddy-stderr.log'))
Write-Host '========================================' -ForegroundColor Cyan
if ($ok443) { exit 0 } else { exit 1 }
