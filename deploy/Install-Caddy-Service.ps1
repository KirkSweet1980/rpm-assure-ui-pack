# Install Caddy HTTPS reverse proxy - local binary + NSSM or Task Scheduler
# Run as Administrator. Pure ASCII.
$ErrorActionPreference = 'Stop'
$Deploy = 'C:\RPM-Assure\deploy'
$Logs = Join-Path $Deploy 'logs'
$Bin = Join-Path $Deploy 'bin'
$caddyfile = Join-Path $Deploy 'Caddyfile'
$LocalCaddy = Join-Path $Bin 'caddy.exe'
New-Item -ItemType Directory -Force -Path $Deploy, $Logs, $Bin | Out-Null

if (-not (Test-Path -LiteralPath $caddyfile)) {
  throw ('Missing Caddyfile at ' + $caddyfile)
}

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
  $links = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\caddy.exe'
  if (Test-Path -LiteralPath $links) { return $links }
  $pkg = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages') -Recurse -Filter 'caddy.exe' -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($pkg) { return $pkg.FullName }
  return $null
}

function Find-Nssm {
  $cmd = Get-Command nssm -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @(
    'C:\Tools\nssm\nssm.exe',
    'C:\Tools\nssm\win64\nssm.exe',
    'C:\nssm\nssm.exe',
    'C:\nssm\win64\nssm.exe'
  )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

function Remove-TaskQuiet([string]$Name) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $null = & schtasks.exe /Query /TN $Name 2>&1
    if ($LASTEXITCODE -eq 0) {
      $null = & schtasks.exe /Delete /TN $Name /F 2>&1
    }
  } catch {} finally {
    $ErrorActionPreference = $prev
  }
}

function Stop-CaddyAll {
  Write-Host 'Stopping existing Caddy / service...' -ForegroundColor Cyan
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  # NSSM service first (releases lock on deploy\bin\caddy.exe)
  $nssm0 = Find-Nssm
  if ($nssm0) {
    & $nssm0 stop 'RPMAssure-Caddy' 2>&1 | Out-Null
    Start-Sleep -Seconds 1
  }
  try {
    $svc = Get-Service -Name 'RPMAssure-Caddy' -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne 'Stopped') {
      Stop-Service -Name 'RPMAssure-Caddy' -Force -ErrorAction SilentlyContinue
      Start-Sleep -Seconds 1
    }
  } catch {}
  # Caddy admin stop if binary exists
  if (Test-Path -LiteralPath $LocalCaddy) {
    try { & $LocalCaddy stop 2>&1 | Out-Null } catch {}
  }
  Get-Process -Name caddy -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  # If still locked, try taskkill
  $still = Get-Process -Name caddy -ErrorAction SilentlyContinue
  if ($still) {
    foreach ($p in $still) {
      & taskkill.exe /F /PID $p.Id 2>&1 | Out-Null
    }
    Start-Sleep -Seconds 2
  }
  $ErrorActionPreference = $prev
}

$src = Find-Caddy
if (-not $src) {
  Write-Host 'Caddy not found. Install with: winget install CaddyServer.Caddy'
  throw 'caddy not installed'
}

# MUST stop before copy - running caddy locks deploy\bin\caddy.exe
Stop-CaddyAll

# Always run from deploy\bin so SYSTEM task can see the binary
if ($src -ne $LocalCaddy) {
  try {
    Copy-Item -LiteralPath $src -Destination $LocalCaddy -Force
    Write-Host ('Copied caddy -> ' + $LocalCaddy) -ForegroundColor Green
  } catch {
    Write-Host ('Copy skipped (file in use or same): ' + $_.Exception.Message) -ForegroundColor Yellow
    if (-not (Test-Path -LiteralPath $LocalCaddy)) { throw }
    Write-Host ('Using existing ' + $LocalCaddy) -ForegroundColor Yellow
  }
} else {
  Write-Host ('Using existing ' + $LocalCaddy) -ForegroundColor Green
}
$caddy = $LocalCaddy

Write-Host ('Caddy: ' + $caddy) -ForegroundColor Cyan
Write-Host 'Validating Caddyfile...' -ForegroundColor Cyan
& $caddy validate --config $caddyfile

$nssm = Find-Nssm
if ($nssm) {
  Write-Host ('Using NSSM: ' + $nssm) -ForegroundColor Green
  $svc = 'RPMAssure-Caddy'
  $ErrorActionPreference = 'Continue'
  & $nssm stop $svc 2>&1 | Out-Null
  & $nssm remove $svc confirm 2>&1 | Out-Null
  $ErrorActionPreference = 'Stop'
  & $nssm install $svc $caddy
  & $nssm set $svc AppDirectory $Deploy
  & $nssm set $svc AppParameters ('run --config "' + $caddyfile + '"')
  & $nssm set $svc AppStdout (Join-Path $Logs 'caddy-stdout.log')
  & $nssm set $svc AppStderr (Join-Path $Logs 'caddy-stderr.log')
  & $nssm set $svc AppRotateFiles 1
  & $nssm set $svc AppRotateBytes 5000000
  & $nssm set $svc Start SERVICE_AUTO_START
  & $nssm start $svc
  Write-Host ('Service ' + $svc + ' started.') -ForegroundColor Green
  Get-Service $svc | Format-List Name, Status, StartType
} else {
  Write-Host 'NSSM not found - Task Scheduler + elevated Start-Process' -ForegroundColor Yellow
  $wrapper = Join-Path $Logs 'start-caddy.cmd'
  $logOut = Join-Path $Logs 'caddy-stdout.log'
  $logErr = Join-Path $Logs 'caddy-stderr.log'
  $lines = @(
    '@echo off',
    'cd /d ' + $Deploy,
    '"' + $caddy + '" run --config "' + $caddyfile + '" >> "' + $logOut + '" 2>> "' + $logErr + '"'
  )
  [IO.File]::WriteAllLines($wrapper, $lines)

  $task = 'RPMAssure-Caddy-OnStart'
  Remove-TaskQuiet $task
  $createOut = & schtasks.exe /Create /F /TN $task /TR $wrapper /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0000:15 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host $createOut
    throw ('schtasks create failed for ' + $task)
  }
  Write-Host ('Task ' + $task + ' created (ONSTART).') -ForegroundColor Green

  # Immediate start in this elevated session
  $p = Start-Process -FilePath $caddy -ArgumentList ('run --config "' + $caddyfile + '"') `
    -WorkingDirectory $Deploy -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $logOut -RedirectStandardError $logErr
  Write-Host ('Started caddy PID ' + $p.Id + ' now') -ForegroundColor Green
  schtasks /Run /TN $task 2>$null | Out-Null
}

Start-Sleep -Seconds 6
Write-Host 'Port 443 LISTENING (required):' -ForegroundColor Cyan
$listen443 = netstat -ano | findstr 'LISTENING' | findstr ':443'
if ($listen443) {
  Write-Host $listen443 -ForegroundColor Green
} else {
  Write-Host '  FAIL: no LISTENING on 443' -ForegroundColor Red
  $logErr = Join-Path $Logs 'caddy-stderr.log'
  if (Test-Path $logErr) {
    Write-Host '  stderr:'
    Get-Content $logErr -Tail 25
  }
}

Write-Host ''
Write-Host 'Next: Patch-Env-Https.ps1 then restart app'
Write-Host 'Logs: C:\RPM-Assure\deploy\logs\caddy-stderr.log'
