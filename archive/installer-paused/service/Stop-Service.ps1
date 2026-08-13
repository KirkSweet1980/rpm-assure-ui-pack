$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $here 'RPMAssure-App.exe'
if (Test-Path $exe) { & $exe stop 2>$null }
Stop-Service -Name 'RPMAssure-App' -Force -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 8081 -State Listen -EA SilentlyContinue | ForEach-Object {
  if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue }
}
