# Start production node-server on 8081 and show why health failed
$ErrorActionPreference = 'Continue'
Write-Host '=== Start production + diagnose ===' -ForegroundColor Cyan
$App = 'C:\RPM-Assure\App'
$Logs = 'C:\RPM-Assure\deploy\logs'
$Port = 8081
$serverJs = Join-Path $App '.output\server\index.mjs'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

if (-not (Test-Path $serverJs)) {
  throw "Missing $serverJs - run Fix-NodeServer-Build.ps1 first"
}
Write-Host "OK server: $serverJs" -ForegroundColor Green

# 1) Show last log tails if any
foreach ($f in @('app-stdout.log','app-stderr.log','app-task.log')) {
  $p = Join-Path $Logs $f
  if (Test-Path $p) {
    Write-Host "----- $f (tail) -----" -ForegroundColor Yellow
    Get-Content $p -Tail 40 -ErrorAction SilentlyContinue
  }
}

# 2) Kill anything on 8081 + old node
Write-Host 'Stopping old listeners...' -ForegroundColor Cyan
try {
  Get-NetTCPConnection -LocalPort $Port -State Listen -EA SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -gt 0) {
      Write-Host "  kill PID $($_.OwningProcess) on $Port"
      Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue
    }
  }
} catch {}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -EA SilentlyContinue |
  Where-Object { $_.CommandLine -match 'vite|RPM-Assure|\.output\\server|8081' } |
  ForEach-Object {
    Write-Host "  kill node PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue
  }
Start-Sleep 2

# 3) Load .env.local into process
$envFile = Join-Path $App '.env.local'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $i = $_.IndexOf('=')
    $k = $_.Substring(0, $i).Trim()
    $v = $_.Substring($i + 1).Trim()
    if ($k) {
      [Environment]::SetEnvironmentVariable($k, $v, 'Process')
    }
  }
  Write-Host 'Loaded .env.local' -ForegroundColor Green
} else {
  Write-Host 'No .env.local' -ForegroundColor Yellow
}

$env:PORT = "$Port"
$env:NITRO_PORT = "$Port"
$env:HOST = '0.0.0.0'
if (-not $env:RPM_ASSURE_DATA_MODE) { $env:RPM_ASSURE_DATA_MODE = 'auto' }

# 4) Find node
$node = (Get-Command node -EA SilentlyContinue).Source
if (-not $node) {
  foreach ($p in @('C:\Program Files\nodejs\node.exe','C:\Nodejs\node.exe')) {
    if (Test-Path $p) { $node = $p; break }
  }
}
if (-not $node) { throw 'node.exe not found' }
Write-Host "node=$node" -ForegroundColor Cyan

# 5) Start in background via cmd (reliable on Windows)
$stdout = Join-Path $Logs 'app-stdout.log'
$stderr = Join-Path $Logs 'app-stderr.log'
# rotate large logs
foreach ($lf in @($stdout, $stderr)) {
  if ((Test-Path $lf) -and ((Get-Item $lf).Length -gt 2MB)) {
    Move-Item $lf ($lf + '.old') -Force -EA SilentlyContinue
  }
}

$cmd = "cd /d `"$App`" && set PORT=$Port&& set NITRO_PORT=$Port&& set HOST=0.0.0.0&& `"$node`" `".output\server\index.mjs`" >> `"$stdout`" 2>> `"$stderr`""
Write-Host "Starting: $cmd" -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList '/c', $cmd -WorkingDirectory $App -WindowStyle Minimized

# 6) Wait + probe
Write-Host 'Waiting for listen...' -ForegroundColor Cyan
$pidListen = $null
1..40 | ForEach-Object {
  Start-Sleep 1
  $l = Get-NetTCPConnection -LocalPort $Port -State Listen -EA SilentlyContinue
  if ($l) {
    $pidListen = $l[0].OwningProcess
    Write-Host "LISTENING PID $pidListen after ${_}s" -ForegroundColor Green
    break
  }
  if ($_ -in 5,10,20,30) {
    Write-Host "  still waiting ${_}s..."
  }
}

if (-not $pidListen) {
  Write-Host 'NOT LISTENING - recent stderr:' -ForegroundColor Red
  if (Test-Path $stderr) { Get-Content $stderr -Tail 60 }
  if (Test-Path $stdout) {
    Write-Host '----- stdout tail -----' -ForegroundColor Yellow
    Get-Content $stdout -Tail 40
  }
  # Try foreground once for clear error
  Write-Host '----- foreground smoke (12s) -----' -ForegroundColor Yellow
  $env:PORT = "$Port"
  $env:NITRO_PORT = "$Port"
  $p = Start-Process -FilePath $node -ArgumentList '.output\server\index.mjs' -WorkingDirectory $App -PassThru -NoNewWindow -RedirectStandardError (Join-Path $Logs 'fg-stderr.log') -RedirectStandardOutput (Join-Path $Logs 'fg-stdout.log')
  Start-Sleep 12
  if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force -EA SilentlyContinue }
  if (Test-Path (Join-Path $Logs 'fg-stderr.log')) {
    Get-Content (Join-Path $Logs 'fg-stderr.log') -Tail 80
  }
  if (Test-Path (Join-Path $Logs 'fg-stdout.log')) {
    Get-Content (Join-Path $Logs 'fg-stdout.log') -Tail 40
  }
  throw 'Production server did not bind :8081'
}

# 7) HTTP health
Start-Sleep 2
try {
  $r = Invoke-WebRequest "http://127.0.0.1:$Port/login" -UseBasicParsing -TimeoutSec 15
  Write-Host "HEALTHY status=$($r.StatusCode) len=$($r.RawContentLength)" -ForegroundColor Green
  if ($r.Content -match 'RPM') { Write-Host 'Content contains RPM mark' -ForegroundColor Green }
} catch {
  Write-Host "HTTP failed: $($_.Exception.Message)" -ForegroundColor Red
  if (Test-Path $stderr) { Get-Content $stderr -Tail 40 }
  throw 'HTTP health failed'
}

# 8) Refresh scheduled task so reboot works
$wrapper = Join-Path $Logs 'start-app-prod.cmd'
$logFile = Join-Path $Logs 'app-task.log'
@(
  '@echo off',
  'cd /d ' + $App,
  'set PORT=8081',
  'set NITRO_PORT=8081',
  'set HOST=0.0.0.0',
  'if exist .env.local (',
  '  for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (',
  '    if not "%%A"=="" if not "%%A:~0,1"=="#" set "%%A=%%B"',
  '  )',
  ')',
  'set PORT=8081',
  'set NITRO_PORT=8081',
  'set HOST=0.0.0.0',
  '"' + $node + '" .output\server\index.mjs >> "' + $logFile + '" 2>&1'
) | Set-Content -Path $wrapper -Encoding ASCII
schtasks /Create /F /TN RPMAssure-App-OnStart /TR $wrapper /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0001:00 2>$null | Out-Null
Write-Host 'Scheduled task RPMAssure-App-OnStart refreshed' -ForegroundColor Green

Write-Host ''
Write-Host '=== Production is up ===' -ForegroundColor Green
Write-Host 'Local:  http://127.0.0.1:8081/login'
Write-Host 'Public: https://assure.rpmresources.co.za/login  (needs Caddy)'
$caddy = Get-Process caddy -EA SilentlyContinue
if ($caddy) {
  Write-Host 'Caddy: running' -ForegroundColor Green
} else {
  Write-Host 'Caddy: NOT running - start with Start-Caddy-Https-443.ps1' -ForegroundColor Yellow
}
Write-Host '=== Done ==='
