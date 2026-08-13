# Restart RPM Assure app process (Vite on 8081)
$ErrorActionPreference = 'Continue'
$App = 'C:\RPM-Assure\App'
$Port = 8081
$LogDir = Join-Path $App 'data\logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir ('restart_{0:yyyyMMdd_HHmmss}.log' -f (Get-Date))

function Write-Log($m) {
  $line = '{0:u} {1}' -f (Get-Date), $m
  Add-Content -Path $Log -Value $line
  Write-Host $line
}

Write-Log 'Restart-RpmAssure starting'

# Prefer Windows service if installed
$svcNames = @('RPMAssure', 'RPM-Assure', 'RpmAssureInsight', 'RPM Assure')
foreach ($n in $svcNames) {
  $svc = Get-Service -Name $n -ErrorAction SilentlyContinue
  if ($svc) {
    Write-Log ("Restarting Windows service: " + $n)
    try {
      Restart-Service -Name $n -Force -ErrorAction Stop
      Write-Log 'Service restart OK'
      exit 0
    } catch {
      Write-Log ("Service restart failed: " + $_)
    }
  }
}

# Kill whatever owns the listen port
try {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    $pid = $c.OwningProcess
    if ($pid -and $pid -gt 0) {
      Write-Log ("Stopping PID $pid on port $Port")
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
  }
} catch {
  Write-Log ("Get-NetTCPConnection: " + $_)
}

# Fallback: node processes started from App folder
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'RPM-Assure|vite' } |
  ForEach-Object {
    Write-Log ("Stopping node PID " + $_.ProcessId)
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 2

$startPs1 = Join-Path $App 'Start-Dev.ps1'
$viteCmd = "Set-Location '$App'; npx.cmd vite dev --host 0.0.0.0 --port $Port"
if (Test-Path $startPs1) {
  Write-Log "Starting via Start-Dev.ps1"
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $startPs1
  ) -WorkingDirectory $App -WindowStyle Minimized
} else {
  Write-Log "Starting vite directly"
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $viteCmd
  ) -WorkingDirectory $App -WindowStyle Minimized
}

Write-Log 'Restart requested (new process starting)'
exit 0
