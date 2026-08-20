# Restrict SQL TCP 14333 to loopback. Dry-run unless -Apply.
# Windows: a Block-all rule would also kill 127.0.0.1 (block beats allow).
# So we disable "allow from Any" rules and add allow from 127.0.0.1 / ::1 only.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Restrict-Sql14333.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Restrict-Sql14333.ps1 -Apply
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$Report = 'C:\RPM-Assure\secrets\hardening-status.txt'
function W([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Write-Host $line
  New-Item -ItemType Directory -Force -Path (Split-Path $Report) | Out-Null
  Add-Content -LiteralPath $Report -Value $line
}

W '=== Restrict SQL 14333 start ==='
if (-not $Apply) { W 'DRY-RUN (pass -Apply to change firewall)' }

W 'Listen:'
Get-NetTCPConnection -LocalPort 14333 -State Listen -EA SilentlyContinue |
  Select-Object LocalAddress, LocalPort | ForEach-Object { W ('  ' + $_.LocalAddress + ':' + $_.LocalPort) }

W 'Current inbound rules touching 14333:'
$filters = Get-NetFirewallPortFilter -Protocol TCP -EA SilentlyContinue | Where-Object {
  $_.LocalPort -eq '14333' -or (@($_.LocalPort) -contains '14333')
}
$rules = @()
foreach ($f in @($filters)) {
  $r = $f | Get-NetFirewallRule -EA SilentlyContinue
  if ($r) { $rules += @($r) }
}
# Also SQL named rules
$rules += @(Get-NetFirewallRule -EA SilentlyContinue | Where-Object {
  $_.DisplayName -match '14333|RPMREPORTS|SQL Server' -and $_.Direction -eq 'Inbound'
})
$rules = $rules | Sort-Object Name -Unique
if (-not $rules) { W '  (none found by port filter - SQL may be allowed by a group rule)' }
foreach ($r in $rules) {
  $addr = ($r | Get-NetFirewallAddressFilter -EA SilentlyContinue).RemoteAddress
  $port = ($r | Get-NetFirewallPortFilter -EA SilentlyContinue).LocalPort
  W ('  ' + $r.Enabled + ' action=' + $r.Action + ' port=' + $port + ' remote=' + ($addr -join ',') + ' name=' + $r.DisplayName)
}

$sqlcmd = @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }
$who = @"
SET NOCOUNT ON;
SELECT TOP 20
  CONVERT(varchar(30), s.login_time, 126) AS LoginTime,
  LEFT(s.login_name, 32) AS LoginName,
  LEFT(ISNULL(s.host_name,''), 32) AS HostName,
  ISNULL(c.client_net_address,'') AS ClientIp
FROM sys.dm_exec_sessions s
JOIN sys.dm_exec_connections c ON c.session_id = s.session_id
WHERE s.is_user_process = 1
ORDER BY s.login_time DESC;
"@
$f = Join-Path $env:TEMP 'rpma_fw_who.sql'
[IO.File]::WriteAllText($f, $who)
W 'Recent SQL clients:'
& $sqlcmd -S '.\RPMREPORTS' -d RPMAssure_App -E -C -h -1 -W -i $f 2>&1 | ForEach-Object { W ('  ' + $_) }

$remote = @()
try {
  $remote = @(Get-NetTCPConnection -LocalPort 14333 -State Established -EA SilentlyContinue |
    Where-Object { $_.RemoteAddress -notin @('127.0.0.1','::1','::','0.0.0.0') -and $_.RemoteAddress -notmatch '^127\.' })
} catch {}
if ($remote.Count -gt 0) {
  W 'WARN established non-loopback 14333 sessions:'
  $remote | ForEach-Object { W ('  ' + $_.RemoteAddress) }
  W 'If those are customer SYSPRO linked servers, -Apply will break them. Agents on HTTPS are fine.'
} else {
  W 'No established non-loopback 14333 sessions right now.'
}

if (-not $Apply) {
  W 'Would: disable ALL inbound Allow rules on 14333 except loopback (including Trusted Sources IP map); add Allow 127.0.0.1 and ::1; keep Public-profile block. Will NOT enable Block-Any (that kills loopback on Windows).'
  W '=== dry-run done ==='
  return
}

$allow4 = 'RPMAssure-SQL-14333-Loopback'
Get-NetFirewallRule -Name $allow4 -EA SilentlyContinue | Remove-NetFirewallRule -EA SilentlyContinue
New-NetFirewallRule -Name $allow4 -DisplayName 'RPM Assure SQL 14333 loopback IPv4' `
  -Direction Inbound -Protocol TCP -LocalPort 14333 -RemoteAddress 127.0.0.1 `
  -Action Allow -Profile Any -Enabled True | Out-Null
W 'Added loopback IPv4 allow (127.0.0.1). IPv6 ::1 skipped (Windows rejects it).'

foreach ($r in $rules) {
  if ($r.Name -in @($allow4)) { continue }
  $addr = @(($r | Get-NetFirewallAddressFilter -EA SilentlyContinue).RemoteAddress)
  $port = @(($r | Get-NetFirewallPortFilter -EA SilentlyContinue).LocalPort)
  $is14333 = ($port -contains '14333') -or ($port -contains 'Any')
  if (-not $is14333) { continue }
  $nonLoop = @($addr | Where-Object { $_ -notin @('127.0.0.1', '::1', 'Localhost') })
  if ($r.Action -eq 'Allow' -and $r.Enabled -eq 'True' -and $nonLoop.Count -gt 0) {
    Disable-NetFirewallRule -Name $r.Name -EA SilentlyContinue
    W ('Disabled remote-allow: ' + $r.DisplayName + ' remote=' + ($addr -join ','))
  }
}

$blk = 'RPMAssure-SQL-14333-BlockPublic'
Get-NetFirewallRule -Name $blk -EA SilentlyContinue | Remove-NetFirewallRule -EA SilentlyContinue
New-NetFirewallRule -Name $blk -DisplayName 'RPM Assure SQL 14333 block Public profile' `
  -Direction Inbound -Protocol TCP -LocalPort 14333 -Action Block -Profile Public -Enabled True | Out-Null
W 'Public-profile block on 14333 enabled'

$savedEa = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$probe = & $sqlcmd -S '127.0.0.1,14333' -d RPMAssure_App -E -C -Q "SET NOCOUNT ON; SELECT N'loopback-ok';" 2>&1 | Out-String
$ErrorActionPreference = $savedEa
if ($probe -notmatch 'loopback-ok') {
  W ('WARN loopback probe: ' + $probe.Trim())
} else {
  W 'Probe 127.0.0.1,14333 = loopback-ok'
}

W '=== restrict done ==='
W 'From another host: Test-NetConnection assure.rpmresources.co.za -Port 14333  (TcpTestSucceeded should be False)'
W 'UI / collectors on this box must still work. If SYSPRO linked-server still used TCP, that site will fail until HTTPS ingest.'