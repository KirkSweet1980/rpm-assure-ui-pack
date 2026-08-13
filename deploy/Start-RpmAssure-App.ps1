# Start RPM Assure app on Windows (port 8081)
# Pure ASCII. Run as Administrator preferred.
$ErrorActionPreference = 'Continue'
$App = 'C:\RPM-Assure\App'
$Port = 8081
$Logs = 'C:\RPM-Assure\deploy\logs'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null
$Log = Join-Path $Logs ('start_app_{0:yyyyMMdd_HHmmss}.log' -f (Get-Date))

function L($m) {
  $line = '{0:u} {1}' -f (Get-Date), $m
  Add-Content -LiteralPath $Log -Value $line -ErrorAction SilentlyContinue
  Write-Host $line
}

L 'Start-RpmAssure-App'
if (-not (Test-Path -LiteralPath $App)) { throw "Missing $App" }

# 1) Windows service names we may have installed
$svcNames = @(
  'RPMAssure-App',
  'RPMAssure',
  'RPM-Assure',
  'RpmAssureInsight',
  'RPM Assure'
)
foreach ($n in $svcNames) {
  $svc = Get-Service -Name $n -ErrorAction SilentlyContinue
  if ($null -eq $svc) { continue }
  L ("Found service: $n Status=" + $svc.Status)
  try {
    if ($svc.Status -ne 'Running') {
      Start-Service -Name $n -ErrorAction Stop
      L "Started service $n"
    } else {
      Restart-Service -Name $n -Force -ErrorAction Stop
      L "Restarted service $n"
    }
    Start-Sleep -Seconds 4
    $listen = netstat -ano | findstr (':' + $Port)
    if ($listen) {
      L "Port $Port is listening"
      Write-Host $listen
      Write-Host "OK - open http://127.0.0.1:$Port/" -ForegroundColor Green
      exit 0
    }
    L "Service up but port not listening yet - trying process start"
  } catch {
    L ("Service start failed: " + $_.Exception.Message)
  }
}

# 2) Scheduled task fallback
$tasks = @('RPMAssure-App-OnStart', 'RPMAssure-App')
foreach ($t in $tasks) {
  $info = Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
  if ($null -eq $info) { continue }
  L "Starting scheduled task $t"
  try {
    Start-ScheduledTask -TaskName $t
    Start-Sleep -Seconds 6
    $listen = netstat -ano | findstr (':' + $Port)
    if ($listen) {
      L "Port $Port listening via task"
      Write-Host "OK - open http://127.0.0.1:$Port/" -ForegroundColor Green
      exit 0
    }
  } catch {
    L ("Task failed: " + $_.Exception.Message)
  }
}

# 3) Free port 8081 if something half-dead owns it
try {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    $procId = $c.OwningProcess
    if ($procId -and $procId -gt 0) {
      L "Stopping PID $procId on port $Port"
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
} catch { }

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'RPM-Assure|vite' } |
  ForEach-Object {
    L ("Stopping node PID " + $_.ProcessId)
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 2

# 4) Direct vite start
$nodeModules = Join-Path $App 'node_modules'
if (-not (Test-Path -LiteralPath $nodeModules)) {
  L 'node_modules missing - running npm.cmd install'
  Push-Location $App
  try { & npm.cmd install } finally { Pop-Location }
}

$outLog = Join-Path $Logs 'app-stdout.log'
$errLog = Join-Path $Logs 'app-stderr.log'
L "Starting vite on 0.0.0.0:$Port"
$cmd = "cd /d `"$App`" && set RPM_ASSURE_DATA_MODE=auto && npx.cmd vite dev --host 0.0.0.0 --port $Port >> `"$outLog`" 2>> `"$errLog`""
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WorkingDirectory $App -WindowStyle Minimized

Start-Sleep -Seconds 8
$listen = netstat -ano | findstr (':' + $Port)
if ($listen) {
  L "Port $Port is LISTENING"
  Write-Host $listen
  Write-Host "OK - open http://127.0.0.1:$Port/" -ForegroundColor Green
  Write-Host "Logs: $outLog" -ForegroundColor Cyan
  exit 0
}

L 'Port still not listening - last log lines:'
if (Test-Path $errLog) { Get-Content $errLog -Tail 30 | ForEach-Object { L $_ } }
if (Test-Path $outLog) { Get-Content $outLog -Tail 20 | ForEach-Object { L $_ } }
Write-Host "FAILED - see $Log" -ForegroundColor Red
exit 1
