# UVSS — install 15-min + nightly via base direct collect
# Run as Administrator on UVSS-SYSPRO
$ErrorActionPreference = 'Stop'
$cfg = Join-Path $PSScriptRoot 'Customer.Config.ps1'
$base = 'C:\RPM-Assure\Sql\base\syspro-direct\Install-Schedule.ps1'
if (-not (Test-Path -LiteralPath $base)) {
  throw "Missing $base — expand sql\base\syspro-direct first"
}
if (-not (Test-Path -LiteralPath $cfg)) {
  throw "Missing $cfg"
}
& $base -ConfigPath $cfg -TaskPrefix 'RPMAssure' -IntervalMinutes 15 -NightlyTime '03:00'
