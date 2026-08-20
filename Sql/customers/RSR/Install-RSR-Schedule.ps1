# Redsun — install 15-min + nightly via base direct collect (no linked server)
# Run as Administrator on RSR-SQLSRV-DB
$ErrorActionPreference = 'Stop'
$cfg = Join-Path $PSScriptRoot 'Customer.Config.ps1'
$base = 'C:\RPM-Assure\Sql\base\syspro-direct\Install-Schedule.ps1'
if (-not (Test-Path -LiteralPath $base)) {
  throw "Missing $base — expand sql\base\syspro-direct first"
}
if (-not (Test-Path -LiteralPath $cfg)) {
  throw "Missing $cfg"
}
& $base -ConfigPath $cfg -TaskPrefix 'RPMAssure' -IntervalMinutes 15 -NightlyTime '02:30'
