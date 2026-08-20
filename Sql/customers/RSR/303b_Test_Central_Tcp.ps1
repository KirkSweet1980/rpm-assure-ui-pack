$ErrorActionPreference = 'Continue'
$ip = '102.222.21.220'
$port = 14333
Write-Host "Testing TCP $ip : $port ..."
$r = Test-NetConnection -ComputerName $ip -Port $port -WarningAction SilentlyContinue
$r | Format-List ComputerName, RemoteAddress, RemotePort, TcpTestSucceeded
if (-not $r.TcpTestSucceeded) { Write-Host 'FAIL: open firewall to central :14333' -ForegroundColor Red; exit 1 }
Write-Host 'OK: TCP open' -ForegroundColor Green
exit 0
