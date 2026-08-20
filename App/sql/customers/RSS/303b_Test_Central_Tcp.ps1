# From RSS-PROD: can we reach central SQL port?
$ErrorActionPreference = 'Continue'
$ip = '102.222.21.220'
$port = 14333
Write-Host "Testing TCP $ip : $port ..."
try {
  $r = Test-NetConnection -ComputerName $ip -Port $port -WarningAction SilentlyContinue
  $r | Format-List ComputerName, RemoteAddress, RemotePort, TcpTestSucceeded, InterfaceAlias
  if (-not $r.TcpTestSucceeded) {
    Write-Host 'FAIL: port not reachable. Open firewall / route before linked server will work.' -ForegroundColor Red
    exit 1
  }
  Write-Host 'OK: TCP open' -ForegroundColor Green
  exit 0
} catch {
  Write-Host $_
  exit 1
}
