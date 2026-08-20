# Bind SQL RPMREPORTS TCP 14333 to 127.0.0.1 only (not 0.0.0.0).
# Dry-run unless -Apply. -Apply restarts MSSQL$RPMREPORTS (short app blip).
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Bind-Sql-Loopback.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Bind-Sql-Loopback.ps1 -Apply
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
Write-Host '=== Bind SQL TCP to 127.0.0.1 ==='
if (-not $Apply) { Write-Host 'DRY-RUN (pass -Apply to change listen + restart SQL)' }

$tcpRoot = Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server' -EA SilentlyContinue |
  Where-Object { $_.PSChildName -match 'RPMREPORTS$' } |
  ForEach-Object { Join-Path $_.PSPath 'MSSQLServer\SuperSocketNetLib\Tcp' } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1

if (-not $tcpRoot) { throw 'TCP registry for instance RPMREPORTS not found' }
Write-Host ('tcpRoot=' + $tcpRoot)

$ipAll = Join-Path $tcpRoot 'IPAll'
if (Test-Path $ipAll) {
  $a = Get-ItemProperty $ipAll
  Write-Host ('IPAll TcpPort=' + $a.TcpPort + ' TcpDynamicPorts=' + $a.TcpDynamicPorts)
}

Get-ChildItem $tcpRoot | Where-Object { $_.PSChildName -match '^IP\d+$' } | ForEach-Object {
  $p = Get-ItemProperty $_.PSPath
  Write-Host ('  ' + $_.PSChildName + ' Active=' + $p.Active + ' Enabled=' + $p.Enabled + ' IpAddress=' + $p.IpAddress + ' TcpPort=' + $p.TcpPort)
}

Write-Host 'Listen now:'
Get-NetTCPConnection -LocalPort 14333 -State Listen -EA SilentlyContinue |
  ForEach-Object { Write-Host ('  ' + $_.LocalAddress + ':' + $_.LocalPort) }

if (-not $Apply) {
  Write-Host 'Would: IPAll TcpPort blank; enable 127.0.0.1 port 14333; disable other IPs; Restart-Service MSSQL$RPMREPORTS'
  Write-Host '=== dry-run done ==='
  return
}

# IPAll must not publish 14333 on every NIC
if (Test-Path $ipAll) {
  Set-ItemProperty $ipAll -Name TcpPort -Value ''
  Set-ItemProperty $ipAll -Name TcpDynamicPorts -Value ''
  Write-Host 'IPAll ports cleared'
}

$loopSet = $false
Get-ChildItem $tcpRoot | Where-Object { $_.PSChildName -match '^IP\d+$' } | ForEach-Object {
  $p = Get-ItemProperty $_.PSPath
  $ip = [string]$p.IpAddress
  if ($ip -eq '127.0.0.1') {
    Set-ItemProperty $_.PSPath -Name Enabled -Value 1
    Set-ItemProperty $_.PSPath -Name Active -Value 1
    Set-ItemProperty $_.PSPath -Name TcpPort -Value '14333'
    Set-ItemProperty $_.PSPath -Name TcpDynamicPorts -Value ''
    $loopSet = $true
    Write-Host ('enabled ' + $_.PSChildName + ' 127.0.0.1:14333')
  } else {
    Set-ItemProperty $_.PSPath -Name Enabled -Value 0
    Write-Host ('disabled ' + $_.PSChildName + ' ' + $ip)
  }
}
if (-not $loopSet) { throw 'No registry IP entry for 127.0.0.1 - abort, no restart' }

Write-Host 'Restarting MSSQL$RPMREPORTS ...'
Restart-Service 'MSSQL$RPMREPORTS' -Force
Start-Sleep -Seconds 8
$ok = $false
Get-NetTCPConnection -LocalPort 14333 -State Listen -EA SilentlyContinue | ForEach-Object {
  Write-Host ('listen ' + $_.LocalAddress + ':' + $_.LocalPort)
  if ($_.LocalAddress -in @('127.0.0.1', '::1')) { $ok = $true }
}
$sqlcmd = @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }
$saved = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$probe = & $sqlcmd -S '127.0.0.1,14333' -d RPMAssure_App -E -C -Q "SET NOCOUNT ON; SELECT N'loopback-ok';" 2>&1 | Out-String
$ErrorActionPreference = $saved
if ($probe -notmatch 'loopback-ok') { throw ('SQL restarted but loopback probe failed: ' + $probe) }
Write-Host 'Probe 127.0.0.1,14333 = loopback-ok'
Restart-Service RPMAssure-App -Force
Write-Host '=== bind done ==='
Write-Host 'If SQL will not start: set IPAll TcpPort=14333 and Enabled=1 on IPs, then Restart-Service MSSQL$RPMREPORTS'
