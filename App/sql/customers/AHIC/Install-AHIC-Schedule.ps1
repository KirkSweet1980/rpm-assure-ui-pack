# AHIC — install 15-min + nightly via base direct collect (preferred)
# Run as Administrator on AHIC-SSQL-SRV
# Legacy linked-server pack remains under C:\RPM-Assure\Sql\collect as fallback only.
$ErrorActionPreference = 'Stop'
$cfg = Join-Path $PSScriptRoot 'Customer.Config.ps1'
if (-not (Test-Path -LiteralPath $cfg)) {
  # fall back to collect folder config if customer pack incomplete
  $cfg = 'C:\RPM-Assure\Sql\customers\AHIC\Customer.Config.ps1'
}
$base = 'C:\RPM-Assure\Sql\base\syspro-direct\Install-Schedule.ps1'
if (-not (Test-Path -LiteralPath $base)) {
  throw "Missing $base — expand sql\base\syspro-direct first"
}
if (-not (Test-Path -LiteralPath $cfg)) {
  throw "Missing Customer.Config.ps1 for AHIC"
}
& $base -ConfigPath $cfg -TaskPrefix 'RPMAssure' -IntervalMinutes 15 -NightlyTime '02:15'
