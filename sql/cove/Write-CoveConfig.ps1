# Write Cove.Config.ps1 (ASCII only)
param(
  [string]$Username = $env:COVE_USERNAME,
  [string]$Password = $env:COVE_PASSWORD,
  [string]$Partner = $env:COVE_PARTNER,
  [string]$ApiUrl = 'https://api.backup.management/jsonapi'
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($Username)) { throw 'Username required' }
if ([string]::IsNullOrWhiteSpace($Password)) { throw 'Password required' }
# Partner optional for this API user (login works with user/password only)
if ([string]::IsNullOrWhiteSpace($Partner)) { $Partner = '' }

function Esc([string]$s) { return $s.Replace("'", "''") }

$cfg = Join-Path $here 'Cove.Config.ps1'
$lines = @(
  '# Auto-generated - do not commit. ASCII only.'
  ("`$ApiUrl = '{0}'" -f (Esc $ApiUrl))
  ("`$Partner = '{0}'" -f (Esc $Partner))
  ("`$Username = '{0}'" -f (Esc $Username))
  ("`$Password = '{0}'" -f (Esc $Password))
  '$MaxDevicesSample = 50'
  '$OutDir = Join-Path $PSScriptRoot ''out'''
)
[IO.File]::WriteAllLines($cfg, $lines)
Write-Host ("Wrote " + $cfg) -ForegroundColor Green
