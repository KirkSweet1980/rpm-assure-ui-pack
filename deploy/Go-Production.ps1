# RPM Assure - switch from vite-dev to production node-server on :8081
# Run as Administrator on the app server. Pure ASCII PowerShell 5.
$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$App = Join-Path $Root 'App'
$Deploy = Join-Path $Root 'deploy'
$Logs = Join-Path $Deploy 'logs'
$Port = 8081

Write-Host '=== RPM Assure Go Production ===' -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

if (-not (Test-Path (Join-Path $App 'package.json'))) {
  throw "Missing $App\package.json - install the app first."
}

# 1) Env
$ensure = Join-Path $Deploy 'Ensure-Production-Env.ps1'
if (Test-Path $ensure) {
  powershell -NoProfile -ExecutionPolicy Bypass -File $ensure
} else {
  Write-Host 'Ensure-Production-Env.ps1 missing - skipping env patch' -ForegroundColor Yellow
}


# 2b) Fix package.json UTF-8 BOM (PowerShell Set-Content often writes BOM; Vite rejects it)
$pkgPath = Join-Path $App 'package.json'
if (Test-Path $pkgPath) {
  $bytes = [IO.File]::ReadAllBytes($pkgPath)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $bytes = $bytes[3..($bytes.Length - 1)]
    [IO.File]::WriteAllBytes($pkgPath, $bytes)
    Write-Host 'Stripped UTF-8 BOM from package.json' -ForegroundColor Yellow
  }
}

# 2) Dependencies
Push-Location $App
try {
  if (-not (Test-Path (Join-Path $App 'node_modules\vite'))) {
    Write-Host 'npm install...' -ForegroundColor Yellow
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
  }

  # 3) Typecheck (soft)
  Write-Host 'typecheck...' -ForegroundColor Cyan
  & npm.cmd run typecheck
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'typecheck reported errors - continuing build (fix later)' -ForegroundColor Yellow
  }

  # 4) Production build (node-server)
  Write-Host 'Building production node-server...' -ForegroundColor Cyan
  $env:RPM_ASSURE_NITRO_PRESET = 'node-server'
  $env:NITRO_PRESET = 'node-server'
  # Flag file (most reliable on Windows)
  [IO.File]::WriteAllText((Join-Path $App '.rpma-nitro-preset'), "node-server`n")

  # Prefer scripts\build-node.mjs if present
  $bn = Join-Path $App 'scripts\build-node.mjs'
  if (Test-Path $bn) {
    & node $bn
    if ($LASTEXITCODE -ne 0) { throw 'build-node.mjs failed' }
  } else {
    & npm.cmd run build:node
    if ($LASTEXITCODE -ne 0) { throw 'build:node failed' }
  }

  # Ensure pglite assets
  if (Test-Path (Join-Path $App 'scripts\copy-pglite-assets.mjs')) {
    & node scripts\copy-pglite-assets.mjs
  }

  $serverJs = Join-Path $App '.output\server\index.mjs'
  if (-not (Test-Path $serverJs)) {
    Write-Host '--- Build outputs found ---' -ForegroundColor Yellow
    Get-ChildItem -LiteralPath $App -Force | Where-Object { $_.Name -match 'output|vercel' } | Format-Table Name, Mode
    if (Test-Path (Join-Path $App '.vercel')) {
      Write-Host 'HINT: build used Vercel preset. vite.config.ts may be outdated.' -ForegroundColor Yellow
    }
    throw "Missing $serverJs after build"
  }
  Write-Host "Build OK: $serverJs" -ForegroundColor Green
  try { Remove-Item (Join-Path $App '.rpma-nitro-preset') -Force -EA SilentlyContinue } catch {}
} finally {
  Pop-Location
}

# 5) Stop old processes on 8081
Write-Host 'Stopping old listeners on 8081...' -ForegroundColor Cyan
try {
  Get-NetTCPConnection -LocalPort $Port -State Listen -EA SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -gt 0) {
      Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue
    }
  }
} catch {}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -EA SilentlyContinue |
  Where-Object { $_.CommandLine -match 'vite|RPM-Assure|8081|\.output\\server' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue }
Start-Sleep 2

# 6) Install / reconfigure service for production
function Find-Nssm {
  $cmd = Get-Command nssm -EA SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @('C:\Tools\nssm\nssm.exe','C:\Tools\nssm\win64\nssm.exe','C:\nssm\win64\nssm.exe')) {
    if (Test-Path $p) { return $p }
  }
  return $null
}
function Find-Node {
  $cmd = Get-Command node -EA SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @('C:\Program Files\nodejs\node.exe','C:\Nodejs\node.exe')) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

$node = Find-Node
if (-not $node) { throw 'node.exe not found' }
$serverJs = Join-Path $App '.output\server\index.mjs'
$nssm = Find-Nssm
$svc = 'RPMAssure-App'

# Load env into process for one-shot start
function Import-EnvLocal {
  $f = Join-Path $App '.env.local'
  if (-not (Test-Path $f)) { return }
  Get-Content $f | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $i = $_.IndexOf('=')
    $k = $_.Substring(0, $i).Trim()
    $v = $_.Substring($i + 1).Trim()
    if ($k) { [Environment]::SetEnvironmentVariable($k, $v, 'Process') }
  }
}
Import-EnvLocal
$env:PORT = "$Port"
$env:NITRO_PORT = "$Port"
$env:HOST = '0.0.0.0'

if ($nssm) {
  Write-Host "Configuring NSSM service $svc for production..." -ForegroundColor Cyan
  & $nssm stop $svc 2>$null
  & $nssm remove $svc confirm 2>$null
  & $nssm install $svc $node
  & $nssm set $svc AppDirectory $App
  & $nssm set $svc AppParameters ('"' + $serverJs + '"')
  & $nssm set $svc AppStdout (Join-Path $Logs 'app-stdout.log')
  & $nssm set $svc AppStderr (Join-Path $Logs 'app-stderr.log')
  & $nssm set $svc AppRotateFiles 1
  & $nssm set $svc AppRotateBytes 8000000
  & $nssm set $svc Start SERVICE_AUTO_START
  # Extra env
  $envExtra = @(
    'PORT=8081',
    'NITRO_PORT=8081',
    'HOST=0.0.0.0',
    'RPM_ASSURE_DATA_MODE=auto'
  ) -join "`n"
  & $nssm set $svc AppEnvironmentExtra $envExtra
  & $nssm start $svc
  Write-Host "Service $svc started (production node-server)" -ForegroundColor Green
} else {
  Write-Host 'NSSM not found - using ONSTART scheduled task' -ForegroundColor Yellow
  $wrapper = Join-Path $Logs 'start-app-prod.cmd'
  $logFile = Join-Path $Logs 'app-task.log'
  @(
    '@echo off',
    'cd /d ' + $App,
    'set PORT=8081',
    'set NITRO_PORT=8081',
    'set HOST=0.0.0.0',
    'call node .output\server\index.mjs >> "' + $logFile + '" 2>&1'
  ) | Set-Content -Path $wrapper -Encoding ASCII
  $task = 'RPMAssure-App-OnStart'
  schtasks /Create /F /TN $task /TR $wrapper /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0001:00 | Out-Null
  schtasks /Run /TN $task | Out-Null
  Write-Host "Task $task started" -ForegroundColor Green
}

# 7) Wait for health
Write-Host 'Waiting for app on 8081...' -ForegroundColor Cyan
$ok = $false
1..40 | ForEach-Object {
  Start-Sleep 1
  try {
    $r = Invoke-WebRequest "http://127.0.0.1:$Port/login" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200 -and $r.Content -match 'RPM') {
      "HEALTHY status=$($r.StatusCode) len=$($r.RawContentLength)"
      $ok = $true
      break
    }
  } catch {}
}
if (-not $ok) {
  Write-Host 'App did not respond with 200 yet. Check logs:' -ForegroundColor Yellow
  Write-Host "  $Logs\app-stdout.log"
  Write-Host "  $Logs\app-stderr.log"
} else {
  Write-Host 'App is healthy on 8081' -ForegroundColor Green
}

# 8) Caddy reminder
$caddy = Get-Process caddy -EA SilentlyContinue
if ($caddy) {
  Write-Host 'Caddy is running (HTTPS front-end)' -ForegroundColor Green
} else {
  Write-Host 'Caddy not running. Start HTTPS with:' -ForegroundColor Yellow
  Write-Host '  powershell -File C:\RPM-Assure\deploy\Start-Caddy-Https-443.ps1'
}

Write-Host ''
Write-Host '=== Production checklist ===' -ForegroundColor Cyan
Write-Host '1. Open https://assure.rpmresources.co.za/login (private window)'
Write-Host '2. Sign in with RPMAdmin'
Write-Host '3. Spot-check EXCO Insight + one customer RMM/Cove/EPP'
Write-Host '4. Confirm SQL collects still scheduled (Pulseway, Cove, Bitdefender, SYSPRO)'
Write-Host '5. Firewall: 443 public; 8081 localhost-only preferred'
Write-Host '=== Done ==='
