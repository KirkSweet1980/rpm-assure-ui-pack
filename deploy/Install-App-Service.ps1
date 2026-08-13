# Install RPM Assure app as Windows service (NSSM) or Task Scheduler fallback
# Prefers production node-server when .output\server\index.mjs exists; else vite dev.
# Run as Administrator. Pure ASCII.
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$Logs = 'C:\RPM-Assure\deploy\logs'
$Port = 8081
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

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

function Find-Node {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @(
    'C:\Program Files\nodejs\node.exe',
    'C:\Nodejs\node.exe'
  )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

function Install-ScheduledTaskFallback([string]$mode, [string]$entry) {
  $wrapper = Join-Path $Logs 'start-app.cmd'
  $logFile = Join-Path $Logs 'app-task.log'
  if ($mode -eq 'prod') {
    $lines = @(
      '@echo off',
      'cd /d ' + $App,
      'set PORT=8081',
      'set NITRO_PORT=8081',
      'set HOST=0.0.0.0',
      'call node .output\server\index.mjs >> "' + $logFile + '" 2>&1'
    )
  } else {
    $lines = @(
      '@echo off',
      'cd /d ' + $App,
      'call npx.cmd vite dev --host 0.0.0.0 --port ' + $Port + ' >> "' + $logFile + '" 2>&1'
    )
  }
  [IO.File]::WriteAllLines($wrapper, $lines)
  $task = 'RPMAssure-App-OnStart'
  schtasks /Create /F /TN $task /TR $wrapper /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0001:00 | Out-Null
  Write-Host ('Task ' + $task + ' created (ONSTART, mode=' + $mode + ').') -ForegroundColor Green
  schtasks /Run /TN $task | Out-Null
  Start-Sleep -Seconds 8
  netstat -ano | findstr (':' + $Port)
  Write-Host ('Log: ' + $logFile) -ForegroundColor Cyan
}

if (-not (Test-Path -LiteralPath $App)) { throw ('Missing ' + $App) }

$prodEntry = Join-Path $App '.output\server\index.mjs'
$mode = if (Test-Path -LiteralPath $prodEntry) { 'prod' } else { 'dev' }
Write-Host ('Install mode: ' + $mode) -ForegroundColor Cyan

# Stop stray on port
try {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    if ($c.OwningProcess -gt 0) {
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
} catch {}

$nssmExe = Find-Nssm
if (-not $nssmExe) {
  Write-Host 'NSSM not found - using Task Scheduler fallback.' -ForegroundColor Yellow
  Install-ScheduledTaskFallback $mode $prodEntry
  exit 0
}

$node = Find-Node
if (-not $node) { throw 'node not found on PATH' }

$svc = 'RPMAssure-App'
& $nssmExe stop $svc 2>$null
& $nssmExe remove $svc confirm 2>$null
& $nssmExe install $svc $node
& $nssmExe set $svc AppDirectory $App

if ($mode -eq 'prod') {
  & $nssmExe set $svc AppParameters ('"' + $prodEntry + '"')
  & $nssmExe set $svc AppEnvironmentExtra "PORT=8081`nNITRO_PORT=8081`nHOST=0.0.0.0`nRPM_ASSURE_DATA_MODE=auto"
} else {
  $viteJs = Join-Path $App 'node_modules\vite\bin\vite.js'
  if (-not (Test-Path -LiteralPath $viteJs)) {
    throw ('Missing ' + $viteJs + ' - run npm.cmd install in App first')
  }
  & $nssmExe set $svc AppParameters ('"' + $viteJs + '" dev --host 0.0.0.0 --port ' + $Port)
  & $nssmExe set $svc AppEnvironmentExtra 'RPM_ASSURE_DATA_MODE=auto'
}

& $nssmExe set $svc AppStdout (Join-Path $Logs 'app-stdout.log')
& $nssmExe set $svc AppStderr (Join-Path $Logs 'app-stderr.log')
& $nssmExe set $svc AppRotateFiles 1
& $nssmExe set $svc AppRotateBytes 5000000
& $nssmExe set $svc Start SERVICE_AUTO_START
& $nssmExe start $svc

Write-Host ('Service ' + $svc + ' installed via NSSM (mode=' + $mode + ')') -ForegroundColor Green
Start-Sleep -Seconds 5
Get-Service $svc | Format-List Name, Status, StartType
netstat -ano | findstr (':' + $Port)
Write-Host ('Open http://127.0.0.1:' + $Port + '/') -ForegroundColor Cyan
