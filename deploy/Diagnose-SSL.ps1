# Diagnose why https://assure.rpmresources.co.za is not reachable
# Run on the APP host as Administrator. Pure ASCII.
$ErrorActionPreference = 'Continue'
$HostName = 'assure.rpmresources.co.za'
$AppPort = 8081
$out = Join-Path $env:TEMP ('ssl_diag_' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.txt')
$lines = New-Object System.Collections.Generic.List[string]
function L([string]$m) {
  $lines.Add($m) | Out-Null
  Write-Host $m
}

L '=== RPM Assure SSL diagnose ==='
L ('Time: ' + (Get-Date -Format 'u'))
L ('Host: ' + $env:COMPUTERNAME)

L ''
L '--- 1) DNS A record ---'
try {
  $dns = Resolve-DnsName -Name $HostName -Type A -ErrorAction Stop
  foreach ($d in $dns) {
    L ('  ' + $d.Name + ' Type=' + $d.Type + ' IP=' + $d.IPAddress)
  }
} catch {
  L ('  FAIL: ' + $_.Exception.Message)
}

L ''
L '--- 2) This machine IPv4 ---'
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' } |
  ForEach-Object { L ('  ' + $_.InterfaceAlias + ' ' + $_.IPAddress) }

L ''
L '--- 3) Public IP (outbound) ---'
try {
  $pub = Invoke-RestMethod -Uri 'https://api.ipify.org' -TimeoutSec 10
  L ('  Public IP: ' + $pub)
  L '  DNS A for assure.rpmresources.co.za MUST match this (or your firewall public IP).'
} catch {
  L ('  Could not fetch public IP: ' + $_.Exception.Message)
}

L ''
L ('--- 4) App port ' + $AppPort + ' ---')
$appListen = netstat -ano | findstr (':' + $AppPort)
if ($appListen) { L $appListen } else { L '  FAIL: nothing listening on app port' }

L ''
L '--- 5) Port 443 only (HTTPS; port 80 must NOT be required) ---'
$p80 = netstat -ano | findstr ':80 '
$p443 = netstat -ano | findstr ':443 '
if ($p443) { L $p443 } else { L '  FAIL: nothing on :443 (HTTPS will not work)' }
if ($p80) {
  L '  NOTE: something is listening on :80 — not required for RPM Assure HTTPS-only config'
  L $p80
} else {
  L '  OK: nothing on :80 (expected for HTTPS-only)'
}

L ''
L '--- 6) Caddy process / service ---'
$caddyCmd = Get-Command caddy -ErrorAction SilentlyContinue
if ($caddyCmd) { L ('  caddy: ' + $caddyCmd.Source) } else { L '  caddy.exe not on PATH' }
Get-Process -Name caddy -ErrorAction SilentlyContinue | ForEach-Object {
  L ('  process PID=' + $_.Id + ' path=' + $_.Path)
}
$svc = Get-Service -Name 'RPMAssure-Caddy' -ErrorAction SilentlyContinue
if ($svc) {
  L ('  service RPMAssure-Caddy Status=' + $svc.Status + ' StartType=' + $svc.StartType)
} else {
  L '  service RPMAssure-Caddy not installed'
}
$task = Get-ScheduledTask -TaskName 'RPMAssure-Caddy-OnStart' -ErrorAction SilentlyContinue
if ($task) {
  $ti = Get-ScheduledTaskInfo -TaskName 'RPMAssure-Caddy-OnStart' -ErrorAction SilentlyContinue
  L ('  task RPMAssure-Caddy-OnStart State=' + $task.State + ' LastResult=' + $ti.LastTaskResult)
} else {
  L '  task RPMAssure-Caddy-OnStart not found'
}

L ''
L '--- 7) Firewall rules 80/443 ---'
Get-NetFirewallRule -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -match 'RPMAssure|Caddy|80|443|HTTP|HTTPS' -and $_.Enabled -eq 'True' } |
  Select-Object -First 15 DisplayName, Direction, Action |
  ForEach-Object { L ('  ' + $_.DisplayName + ' ' + $_.Direction + ' ' + $_.Action) }

L ''
L '--- 8) Local HTTP to app ---'
try {
  $r = Invoke-WebRequest -Uri ('http://127.0.0.1:' + $AppPort + '/') -UseBasicParsing -TimeoutSec 8
  L ('  App HTTP ' + $r.StatusCode + ' len=' + $r.RawContentLength)
} catch {
  L ('  App HTTP FAIL: ' + $_.Exception.Message)
}

L ''
L '--- 9) Local HTTPS via hostname (if hosts/DNS resolves here) ---'
try {
  # Skip cert validation for diagnose only
  add-type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAll : ICertificatePolicy {
  public bool CheckValidationResult(ServicePoint s, X509Certificate c, WebRequest r, int p) { return true; }
}
"@
  [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAll
} catch {}
try {
  $r2 = Invoke-WebRequest -Uri ('https://' + $HostName + '/') -UseBasicParsing -TimeoutSec 15
  L ('  HTTPS ' + $r2.StatusCode + ' len=' + $r2.RawContentLength)
} catch {
  L ('  HTTPS FAIL: ' + $_.Exception.Message)
}

L ''
L '--- 10) Caddy logs (last 40 lines) ---'
$logDir = 'C:\RPM-Assure\deploy\logs'
if (Test-Path $logDir) {
  Get-ChildItem $logDir -Filter 'caddy*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 2 |
    ForEach-Object {
      L ('  FILE ' + $_.FullName)
      Get-Content $_.FullName -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object { L ('    ' + $_) }
    }
} else {
  L '  No C:\RPM-Assure\deploy\logs'
}

L ''
L '--- 11) Caddyfile present? ---'
$cf = 'C:\RPM-Assure\deploy\Caddyfile'
if (Test-Path $cf) {
  L ('  OK ' + $cf)
  Get-Content $cf | ForEach-Object { L ('    ' + $_) }
} else {
  L '  MISSING Caddyfile - expand SSL pack to C:\RPM-Assure\deploy'
}

L ''
L '=== DONE ==='
L 'Common fixes:'
L '  A) DNS A-record must equal public IP above'
L '  B) Open TCP 443 only on Windows Firewall AND cloud security group (do not open 80)'
L '  C) App must listen on 8081 before Caddy can proxy'
L '  D) Run Install-SSL-All.ps1 as Administrator'
L '  E) If Caddy never got a cert: fix DNS/80, then restart Caddy'

$lines | Set-Content -LiteralPath $out -Encoding UTF8
Write-Host ''
Write-Host ('Full log: ' + $out) -ForegroundColor Cyan
Write-Host 'Paste this file (or the console output) back if HTTPS still fails.'
