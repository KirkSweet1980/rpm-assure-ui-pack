# Finish Redsun on RSR-SQLSRV-DB
param(
  [string]$SaUser = 'SYSPROAdmin',
  [string]$SaPassword = '',
  [switch]$SkipLoginCreate,
  [switch]$SkipLinkedServer,
  [switch]$SkipCollect,
  [switch]$InstallSchedule
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Customer.Config.ps1')
if (-not $SaPassword) { $SaPassword = $BootstrapSqlPassword }
function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($c in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe'
  )) { if (Test-Path $c) { return $c } }
  throw 'sqlcmd not found'
}
$sqlcmd = Find-Sqlcmd
function Run-SqlFile([string]$file, [string]$user, [string]$pass) {
  Write-Host ("RUN " + $file + " as " + $user) -ForegroundColor Cyan
  $out = & $sqlcmd -S '.' -U $user -P $pass -C -b -i $file 2>&1
  $out | ForEach-Object { Write-Host $_ }
  if ($LASTEXITCODE -ne 0) { throw ("sqlcmd failed " + $LASTEXITCODE + " " + $file) }
}
$tcp = Join-Path $PSScriptRoot '303b_Test_Central_Tcp.ps1'
if (Test-Path $tcp) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $tcp
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'WARNING: TCP 14333 may be blocked - linked server will fail.' -ForegroundColor Yellow
  }
}
if (-not $SkipLoginCreate) {
  Run-SqlFile (Join-Path $PSScriptRoot '302_RSR_Create_Collect_Login.sql') $SaUser $SaPassword
}
if (-not $SkipLinkedServer) {
  try {
    Run-SqlFile (Join-Path $PSScriptRoot '303_RSR_LinkedServer_Central.sql') $SaUser $SaPassword
  } catch {
    Write-Host $_ -ForegroundColor Red
    Write-Host 'Re-run 303 after network fixed, then Finish with -SkipLoginCreate' -ForegroundColor Yellow
    throw
  }
}
if (-not $SkipCollect) {
  & (Join-Path $PSScriptRoot 'Run-RSR-Collect-Scheduled.ps1')
}
if ($InstallSchedule) {
  & (Join-Path $PSScriptRoot 'Install-RSR-Schedule.ps1')
}
Write-Host 'Finish complete for RSR-SQLSRV-DB.' -ForegroundColor Green
