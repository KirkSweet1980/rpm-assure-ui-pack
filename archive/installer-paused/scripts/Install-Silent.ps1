param(
  [Parameter(Mandatory=$true)][string]$MsiPath,
  [Parameter(Mandatory=$true)][string]$SqlServer,
  [string]$SqlDatabase = 'RPMAssure_App',
  [string]$SqlUser = 'Rpm_collect',
  [string]$SqlPassword = '',
  [string]$AppUrl = 'https://assure.rpmresources.co.za',
  [string]$SqlTrustCert = 'true',
  [switch]$Quiet
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $MsiPath)) { throw "MSI not found: $MsiPath" }
$log = Join-Path $env:TEMP ("RPMAssure-install-{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))
$level = if ($Quiet) { '/qn' } else { '/qb' }
$args = @(
  '/i', "`"$MsiPath`""
  $level
  '/l*v', "`"$log`""
  "SQLSERVER=$SqlServer"
  "SQLDATABASE=$SqlDatabase"
  "SQLUSER=$SqlUser"
  "SQLPASSWORD=$SqlPassword"
  "SQLTRUSTCERT=$SqlTrustCert"
  "APPURL=$AppUrl"
)
Write-Host "msiexec $($args -join ' ')"
$p = Start-Process -FilePath 'msiexec.exe' -ArgumentList $args -Wait -PassThru
Write-Host "ExitCode=$($p.ExitCode) log=$log"
if ($p.ExitCode -ne 0) { throw "msiexec failed $($p.ExitCode)" }
Write-Host 'Installed. Service should be starting on :8081'
