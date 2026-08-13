# Restart RPM Assure app (port 8081)
# Pure ASCII. Run elevated if scheduled task needs it.
# Prefer: production node-server if .output exists; else scheduled task / vite.

$ErrorActionPreference = 'Continue'
$App = 'C:\RPM-Assure\App'
$Port = 8081
$Logs = 'C:\RPM-Assure\deploy\logs'
$Task = 'RPMAssure-App-OnStart'
$serverJs = Join-Path $App '.output\server\index.mjs'
$wrapper = Join-Path $Logs 'start-app-prod.cmd'

New-Item -ItemType Directory -Force -Path $Logs | Out-Null

Write-Host '=== Restart RPM Assure app ===' -ForegroundColor Cyan

# 1) Stop scheduled task if present
try {
  $null = schtasks /End /TN $Task 2>&1
  Write-Host "Ended task $Task (if it was running)"
} catch {}

# 2) Free port 8081
try {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -gt 0) {
      Write-Host ("Stopping listener PID {0}" -f $_.OwningProcess)
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
} catch {}

# 3) Stop related node processes
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -and (
      $_.CommandLine -like '*vite*' -or
      $_.CommandLine -like '*.output*server*' -or
      $_.CommandLine -like '*index.mjs*' -or
      $_.CommandLine -like '*RPM-Assure*' -or
      $_.CommandLine -like '*8081*'
    )
  } |
  ForEach-Object {
    Write-Host ("Stopping node PID {0}" -f $_.ProcessId)
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 2

# 4) Start: production wrapper if available, else scheduled task, else vite dev
$started = $false

if ((Test-Path -LiteralPath $serverJs) -and (Test-Path -LiteralPath $wrapper)) {
  Write-Host 'Starting production node-server via wrapper...'
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', ('"{0}"' -f $wrapper)) -WorkingDirectory $App -WindowStyle Minimized
  $started = $true
} elseif (Get-ScheduledTask -TaskName $Task -ErrorAction SilentlyContinue) {
  Write-Host ("Starting scheduled task {0}..." -f $Task)
  schtasks /Run /TN $Task | Out-Null
  $started = $true
} else {
  Write-Host 'No task / production wrapper - starting vite dev on 8081...'
  $stdout = Join-Path $Logs 'app-stdout.log'
  $stderr = Join-Path $Logs 'app-stderr.log'
  $cmd = 'cd /d "' + $App + '" && npx.cmd vite dev --host 0.0.0.0 --port ' + $Port + ' >> "' + $stdout + '" 2>> "' + $stderr + '"'
  Start-Process cmd.exe -ArgumentList '/c', $cmd -WorkingDirectory $App -WindowStyle Minimized
  $started = $true
}

if (-not $started) {
  Write-Host 'Could not start app' -ForegroundColor Red
  exit 1
}

Write-Host ("Waiting for :{0} ..." -f $Port)
for ($n = 1; $n -le 45; $n++) {
  Start-Sleep -Seconds 1
  $l = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  if ($l.Count -lt 1) { continue }
  $own = $l[0].OwningProcess
  try {
    $r = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/login" -f $Port) -UseBasicParsing -TimeoutSec 5
    Write-Host ("HEALTHY status={0} PID={1}" -f $r.StatusCode, $own) -ForegroundColor Green
    Write-Host ("Open http://127.0.0.1:{0}/login  or  https://assure.rpmresources.co.za/login" -f $Port)
    exit 0
  } catch {
    Write-Host ("LISTENING PID={0} (login not ready yet... {1}s)" -f $own, $n)
  }
}

Write-Host 'Not healthy yet - check logs:' -ForegroundColor Yellow
Write-Host "  $Logs\app-stdout.log"
Write-Host "  $Logs\app-stderr.log"
exit 1
