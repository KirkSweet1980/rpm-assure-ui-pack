# Read-only hardening check. Prints no passwords.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Verify-Hardening.ps1
$ErrorActionPreference = 'Continue'
$Root = 'C:\RPM-Assure'
$sqlcmd = @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }

function Row([string]$k, [string]$v) { '{0,-36} {1}' -f $k, $v }

Write-Host '=== RPM Assure hardening verify ==='

$sec = Join-Path $Root 'secrets\sql-collect.json'
if (Test-Path $sec) {
  $j = Get-Content $sec -Raw | ConvertFrom-Json
  Write-Host (Row 'secrets sql-collect.json' ('present pwdLength=' + ([string]$j.password).Length))
} else {
  Write-Host (Row 'secrets sql-collect.json' 'MISSING')
}

$bak = Get-ChildItem (Join-Path $Root 'backups') -Directory -EA SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
$off = Get-ChildItem 'C:\RPM-Assure-Backups' -Directory -EA SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
Write-Host (Row 'local backup' $(if ($bak) { $bak.FullName } else { 'none' }))
Write-Host (Row 'C:\RPM-Assure-Backups' $(if ($off) { $off.FullName + ' (same disk)' } else { 'none' }))

$q = @"
SET NOCOUNT ON;
SELECT 'rpmassure=' + ISNULL((SELECT CASE WHEN is_disabled=1 THEN 'disabled' ELSE 'enabled' END FROM sys.server_principals WHERE name=N'rpmassure'),'absent');
SELECT 'Rpm_collect=' + ISNULL((SELECT CASE WHEN is_disabled=1 THEN 'disabled' ELSE 'enabled' END FROM sys.server_principals WHERE name=N'Rpm_collect'),'absent');
"@
$f = Join-Path $env:TEMP 'rpma_vh.sql'
[IO.File]::WriteAllText($f, $q)
$so = & $sqlcmd -S '.\RPMREPORTS' -d master -E -C -h -1 -W -i $f 2>&1 | Out-String
Write-Host (Row 'SQL logins' ($so -replace '\s+',' ').Trim())

Write-Host 'Firewall 14333:'
Get-NetFirewallPortFilter -Protocol TCP -EA SilentlyContinue | Where-Object { $_.LocalPort -eq '14333' } | ForEach-Object {
  $r = $_ | Get-NetFirewallRule -EA SilentlyContinue
  if (-not $r) { return }
  $addr = ($r | Get-NetFirewallAddressFilter).RemoteAddress
  Write-Host ('  ' + $r.Enabled + ' ' + $r.Action + ' remote=' + ($addr -join ',') + '  ' + $r.DisplayName)
}

try {
  $code = [int](Invoke-WebRequest 'https://assure.rpmresources.co.za/api/bootstrap-admin' -UseBasicParsing -TimeoutSec 15).StatusCode
} catch {
  $resp = $_.Exception.Response
  $code = if ($resp) { [int]$resp.StatusCode } else { 0 }
}
Write-Host (Row 'GET /api/bootstrap-admin' $(if ($code -eq 404) { '404 (locked)' } else { "HTTP $code" }))

$ver = $null
try { $ver = (Invoke-WebRequest 'https://assure.rpmresources.co.za/downloads/VERSION' -UseBasicParsing -TimeoutSec 15).Content.Trim() } catch {}
Write-Host (Row 'HTTPS /downloads/VERSION' $(if ($ver) { $ver } else { 'fail' }))

Write-Host (Row 'RPMAssure-App' ((Get-Service RPMAssure-App -EA SilentlyContinue).Status))
Write-Host '=== done ==='
Write-Host 'Still parked: off-box copy of backup (USB/other PC); customer rpmassure logins; single-box HA; git history of old passwords.'
