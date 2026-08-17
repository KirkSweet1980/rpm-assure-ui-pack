# Harden-Https-Only.ps1
# Public entry = HTTPS only (assure.rpmresources.co.za :443).
# Bind the app to 127.0.0.1:8081 so it is NOT reachable from the network.
# Block inbound TCP 8081 on Windows Firewall.
#
# Run elevated on the APP server:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Harden-Https-Only.ps1
$ErrorActionPreference = 'Stop'

$Svc   = 'RPMAssure-App'
$Port  = 8081
$Nssm  = 'C:\RPM-Assure\Tools\nssm.exe'
$App   = 'C:\RPM-Assure\App'
$Vite  = Join-Path $App 'node_modules\vite\bin\vite.js'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }

Write-Host '=== Harden: HTTPS public, 8081 loopback-only ===' -ForegroundColor Cyan

if (-not (Test-Path $Nssm)) {
  foreach ($p in @('C:\Tools\nssm\win64\nssm.exe', 'C:\Tools\nssm\nssm.exe')) {
    if (Test-Path $p) { $Nssm = $p; break }
  }
}
$svc = Get-Service -Name $Svc -ErrorAction SilentlyContinue
if ($svc -and (Test-Path $Nssm) -and (Test-Path $Vite)) {
  $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
  if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
  $args = '"' + $Vite + '" dev --host 127.0.0.1 --port ' + $Port
  Write-Host 'Rebinding service to 127.0.0.1:8081 (not 0.0.0.0)...'
  & $Nssm stop $Svc 2>$null | Out-Null
  Start-Sleep -Seconds 2
  & $Nssm set $Svc Application $node
  & $Nssm set $Svc AppParameters $args
  & $Nssm set $Svc AppDirectory $App
  & $Nssm start $Svc
  Write-Host 'Service rebound to loopback.' -ForegroundColor Green
} else {
  Write-Host 'Service/NSSM not found - firewall rules still applied.' -ForegroundColor Yellow
}

# Firewall: no inbound 8081 from the network. 443 stays the public door.
Write-Host 'Firewall: block inbound 8081...'
netsh advfirewall firewall delete rule name="RPM Assure - block 8081 inbound" 2>$null | Out-Null
netsh advfirewall firewall add rule name="RPM Assure - block 8081 inbound" dir=in action=block protocol=TCP localport=8081 enable=yes profile=any | Out-Null

Write-Host 'Firewall: allow inbound 443 (HTTPS)...'
netsh advfirewall firewall delete rule name="RPM Assure - allow 443 HTTPS" 2>$null | Out-Null
netsh advfirewall firewall add rule name="RPM Assure - allow 443 HTTPS" dir=in action=allow protocol=TCP localport=443 enable=yes profile=any | Out-Null

Write-Host 'Firewall: block inbound 80 (no HTTP site)...'
netsh advfirewall firewall delete rule name="RPM Assure - block 80 HTTP" 2>$null | Out-Null
netsh advfirewall firewall add rule name="RPM Assure - block 80 HTTP" dir=in action=block protocol=TCP localport=80 enable=yes profile=any | Out-Null

Start-Sleep -Seconds 5
$l = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($l) {
  Write-Host ("8081 LISTENING  local={0}  PID={1}" -f $l[0].LocalAddress, $l[0].OwningProcess) -ForegroundColor Green
  if ($l[0].LocalAddress -eq '0.0.0.0' -or $l[0].LocalAddress -eq '::') {
    Write-Host 'WARN: still bound on all interfaces - service rebind may need a second Restart-Service' -ForegroundColor Yellow
  }
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host ' HTTPS-ONLY HARDENED'
Write-Host '  Public  : https://assure.rpmresources.co.za'
Write-Host '  Backend : 127.0.0.1:8081  (this machine only - not a second website)'
Write-Host '  Blocked : inbound TCP 8081 and 80'
Write-Host '  Allowed : inbound TCP 443'
Write-Host '========================================' -ForegroundColor Green
Write-Host '=== Done ==='
