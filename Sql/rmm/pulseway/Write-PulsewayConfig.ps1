# Writes Pulseway.Config.ps1 (ASCII only).
#   $env:PW_TOKEN_ID='...'; $env:PW_TOKEN_SECRET='...'
#   powershell -File .\Write-PulsewayConfig.ps1
#
# Or:
#   .\Write-PulsewayConfig.ps1 -TokenId '...' -TokenSecret '...'

param(
  [string]$TokenId = $env:PW_TOKEN_ID,
  [string]$TokenSecret = $env:PW_TOKEN_SECRET,
  [string]$BaseUrl = 'https://rpmresourcesza.pulseway.com/api/v3',
  [string]$SqlServer = '.\RPMREPORTS',
  [string]$SqlDatabase = 'RPMAssure_App',
  [string]$SqlUser = 'Rpm_collect',
  [string]$SqlPassword = ''
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($TokenId)) { throw 'TokenId required (param or $env:PW_TOKEN_ID)' }
if ([string]::IsNullOrWhiteSpace($TokenSecret)) { throw 'TokenSecret required (param or $env:PW_TOKEN_SECRET)' }

function Esc([string]$s) { return $s.Replace("'", "''") }

$cfg = Join-Path $here 'Pulseway.Config.ps1'
$lines = @(
  '# Auto-generated - do not commit. ASCII only.'
  ("`$BaseUrl = '{0}'" -f (Esc $BaseUrl.TrimEnd('/')))
  ("`$TokenId = '{0}'" -f (Esc $TokenId))
  ("`$TokenSecret = '{0}'" -f (Esc $TokenSecret))
  ("`$SqlServer = '{0}'" -f (Esc $SqlServer))
  ("`$SqlDatabase = '{0}'" -f (Esc $SqlDatabase))
  ("`$SqlUser = '{0}'" -f (Esc $SqlUser))
  ("`$SqlPassword = '{0}'" -f (Esc $SqlPassword))
  '$MaxDevicesSample = 25'
  '$MaxNotificationsSample = 50'
  '$OutDir = Join-Path $PSScriptRoot ''out'''
)
[IO.File]::WriteAllLines($cfg, $lines)
Write-Host ("Wrote " + $cfg) -ForegroundColor Green
Write-Host 'Next:'
Write-Host ('  powershell -NoProfile -ExecutionPolicy Bypass -File ' + (Join-Path $here 'Test-PulsewayAuth.ps1'))
Write-Host ('  powershell -NoProfile -ExecutionPolicy Bypass -File ' + (Join-Path $here 'Collect-Pulseway-To-RPMAssure.ps1'))
