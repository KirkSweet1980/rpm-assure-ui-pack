# Preflight checks before Let's Encrypt
$ErrorActionPreference = 'Continue'
$HostName = 'assure.rpmresources.co.za'
$AppPort = 8081

Write-Host '=== SSL preflight ===' -ForegroundColor Cyan

Write-Host ''
Write-Host '1) DNS for hostname:'
try {
  $dns = Resolve-DnsName -Name $HostName -Type A -ErrorAction Stop
  $dns | Format-Table Name, Type, IPAddress -AutoSize
} catch {
  Write-Host ('  FAIL DNS: ' + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ''
Write-Host '2) This machine IP addresses:'
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } |
  Format-Table InterfaceAlias, IPAddress -AutoSize

Write-Host ''
Write-Host ('3) App port ' + $AppPort + ':')
netstat -ano | findstr (':' + $AppPort)

Write-Host ''
Write-Host '4) Ports 80 / 443:'
netstat -ano | findstr ':80 '
netstat -ano | findstr ':443 '

Write-Host ''
Write-Host '5) Caddy installed?'
$c = Get-Command caddy -ErrorAction SilentlyContinue
if ($c) { Write-Host ('  ' + $c.Source) -ForegroundColor Green } else { Write-Host '  NOT FOUND' -ForegroundColor Yellow }

Write-Host ''
Write-Host '6) Public IP (if outbound works):'
try {
  $pub = (Invoke-RestMethod -Uri 'https://api.ipify.org' -TimeoutSec 8)
  Write-Host ('  Public IP: ' + $pub) -ForegroundColor Green
  Write-Host '  DNS A-record for assure.rpmresources.co.za must match this IP (or the firewall public IP).'
} catch {
  Write-Host '  Could not detect public IP (offline / blocked).'
}

Write-Host ''
Write-Host 'Done. Fix any FAIL/NOT FOUND before Install-SSL-All.ps1'
