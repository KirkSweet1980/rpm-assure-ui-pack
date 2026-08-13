# Install RPMAssure-App via WinSW (optional)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $here 'RPMAssure-App.exe'
if (-not (Test-Path $exe)) {
  Write-Host "Missing WinSW exe: $exe (skip)"
  exit 0
}
& $exe install
& $exe start
Write-Host 'RPMAssure-App service installed and started'
