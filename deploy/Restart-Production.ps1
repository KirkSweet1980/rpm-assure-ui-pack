# Restart production node-server only (no rebuild, no MSI)
$ErrorActionPreference = 'Continue'
$App = 'C:\RPM-Assure\App'
$Logs = 'C:\RPM-Assure\deploy\logs'
$Port = 8081
$wrapper = Join-Path $Logs 'start-app-prod.cmd'
$serverJs = Join-Path $App '.output\server\index.mjs'

if (-not (Test-Path -LiteralPath $serverJs)) {
  Write-Host ("Missing {0} - run Go-Production-NoMsi.ps1 first" -f $serverJs) -ForegroundColor Red
  exit 1
}

Write-Host 'Stopping listeners on 8081...'
try {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -gt 0) {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
} catch {}

Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -and (
      $_.CommandLine -like '*vite*' -or
      $_.CommandLine -like '*.output*server*' -or
      $_.CommandLine -like '*index.mjs*' -or
      $_.CommandLine -like '*RPM-Assure*'
    )
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
Start-Sleep -Seconds 2

if (-not (Test-Path -LiteralPath $wrapper)) {
  Write-Host ("Missing {0} - run Go-Production-NoMsi.ps1 once to create it" -f $wrapper) -ForegroundColor Red
  exit 1
}

Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', ('"{0}"' -f $wrapper)) -WorkingDirectory $App -WindowStyle Minimized
Write-Host 'Started production wrapper. Waiting...'
for ($n = 1; $n -le 40; $n++) {
  Start-Sleep -Seconds 1
  $l = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  if ($l.Count -lt 1) { continue }
  try {
    $r = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/login" -f $Port) -UseBasicParsing -TimeoutSec 5
    Write-Host ("HEALTHY status={0} PID={1}" -f $r.StatusCode, $l[0].OwningProcess) -ForegroundColor Green
    exit 0
  } catch {
    Write-Host ("LISTENING PID={0} (login not ready yet)" -f $l[0].OwningProcess)
  }
}
Write-Host 'Not healthy - check C:\RPM-Assure\deploy\logs\app-stderr.log' -ForegroundColor Yellow
exit 1
