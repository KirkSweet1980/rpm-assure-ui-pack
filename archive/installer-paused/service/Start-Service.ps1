$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path $here -Parent
$exe = Join-Path $here 'RPMAssure-App.exe'
$cfg = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\config\app.env'
$app = Join-Path $root 'app'
$logs = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

if ((Test-Path $cfg) -and (Test-Path $app)) {
  Copy-Item $cfg (Join-Path $app '.env.local') -Force
}

if (Test-Path $exe) {
  & $exe start 2>$null
  Start-Sleep 2
}

$svc = Get-Service -Name 'RPMAssure-App' -EA SilentlyContinue
if ($svc -and $svc.Status -eq 'Running') {
  Write-Host 'Service running'
  exit 0
}

# Fallback: start node-server directly (no WinSW)
$node = Join-Path $root 'runtime\node\node.exe'
$entry = Join-Path $root 'app\.output\server\index.mjs'
if (-not (Test-Path $node)) { $node = (Get-Command node -EA SilentlyContinue).Source }
if ((Test-Path $node) -and (Test-Path $entry)) {
  # stop anything on 8081
  try {
    Get-NetTCPConnection -LocalPort 8081 -State Listen -EA SilentlyContinue | ForEach-Object {
      if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue }
    }
  } catch {}
  $env:PORT = '8081'
  $env:NITRO_PORT = '8081'
  $env:HOST = '0.0.0.0'
  $stdout = Join-Path $logs 'app-stdout.log'
  $stderr = Join-Path $logs 'app-stderr.log'
  $cmd = "cd /d `"$app`" && set PORT=8081&& set NITRO_PORT=8081&& set HOST=0.0.0.0&& `"$node`" `"$entry`" >> `"$stdout`" 2>> `"$stderr`""
  Start-Process cmd.exe -ArgumentList '/c', $cmd -WorkingDirectory $app -WindowStyle Hidden
  Write-Host 'Started node-server fallback on 8081'
  exit 0
}
Write-Host 'Could not start app (no WinSW and no node payload)'
exit 0
